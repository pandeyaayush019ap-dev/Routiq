/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as turf from '@turf/turf';
import { RouteCandidate } from '../../types';
import { GpsPosition } from './geolocationService';
import { authService } from '../auth/authService';

export interface ManeuverInfo {
  icon: string;
  instructionEn: string;
  instructionHi: string;
  subsequentInstructionEn?: string;
  subsequentInstructionHi?: string;
  subsequentIcon?: string;
  roadName?: string;
  distanceToManeuverMeters: number;
  formattedDistance: string;
  isDestination: boolean;
  arrivalTimeFormatted?: string;
}

export interface NavigationStatus {
  isNavigating: boolean;
  tripId?: string;
  currentPosition: GpsPosition | null;
  currentSpeedKmh: number;
  remainingDistanceKm: number;
  remainingDurationMinutes: number;
  isOffRoute: boolean;
  isApproachingOrigin?: boolean;
  offRouteDistanceMeters: number;
  currentManeuver: ManeuverInfo | null;
  activeStepIndex: number;
  shouldReroute?: boolean;
  error: string | null;
}

export class NavigationEngine {
  private lastConfirmedStepIndex: number = 0;
  private consecutiveOffRouteCount: number = 0;
  private static readonly OFF_ROUTE_CONFIRMATION_THRESHOLD = 3;

  /**
   * Resets internal tracking counters (e.g. at navigation start or route change)
   */
  public reset(): void {
    this.lastConfirmedStepIndex = 0;
    this.consecutiveOffRouteCount = 0;
  }

  /**
   * Evaluates navigation state from current GPS position and active route
   */
  public evaluateState(
    position: GpsPosition,
    route: RouteCandidate,
    isHindi: boolean = false
  ): {
    remainingDistanceKm: number;
    remainingDurationMinutes: number;
    isOffRoute: boolean;
    isApproachingOrigin: boolean;
    offRouteDistanceMeters: number;
    currentManeuver: ManeuverInfo;
    activeStepIndex: number;
    shouldReroute: boolean;
  } {
    const rawCoords = route.geometry?.coordinates || [];
    const coords = rawCoords.filter(
      (c) => Array.isArray(c) && c.length >= 2 && !isNaN(c[0]) && !isNaN(c[1])
    );

    const now = new Date();

    if (coords.length < 2) {
      return {
        remainingDistanceKm: route.distanceKm || 0,
        remainingDurationMinutes: route.durationMinutes || 0,
        isOffRoute: false,
        isApproachingOrigin: false,
        offRouteDistanceMeters: 0,
        activeStepIndex: 0,
        shouldReroute: false,
        currentManeuver: {
          icon: '⬆',
          instructionEn: route.turnSteps?.en?.[0] || 'Proceed on route',
          instructionHi: route.turnSteps?.hi?.[0] || 'मार्ग पर आगे बढ़ें',
          distanceToManeuverMeters: 500,
          formattedDistance: '500 m',
          isDestination: false,
        },
      };
    }

    const pt = turf.point([position.longitude, position.latitude]);
    const line = turf.lineString(coords);

    // 1. Project driver position onto the route line
    const snapped = turf.nearestPointOnLine(line, pt);
    const distToLineKm = snapped.properties.dist ?? 0;
    const offRouteDistanceMeters = Math.round(distToLineKm * 1000);
    const locationAlongLineKm = snapped.properties.location ?? 0;
    const totalLineLengthKm = turf.length(line, { units: 'kilometers' });

    // 2. Proximity to route origin and destination
    const destCoord = coords[coords.length - 1];
    const destPt = turf.point(destCoord);
    const originCoord = coords[0];
    const originPt = turf.point(originCoord);
    const distToOriginKm = turf.distance(pt, originPt, { units: 'kilometers' });
    const distToDestKm = turf.distance(pt, destPt, { units: 'kilometers' });

    // 3. Dynamic GPS tolerance accounting for browser/phone GPS accuracy noise
    const accuracyNoise = Math.max(25, position.accuracy || 25);
    const dynamicToleranceMeters = Math.max(120, Math.round(accuracyNoise * 1.5));

    // Approaching Corridor: At trip start, driver is within 3.5 km of origin and moving toward route
    const isApproachingOrigin = distToOriginKm <= 3.5 && offRouteDistanceMeters > dynamicToleranceMeters;

    // 4. Adaptive Off-Route Detection:
    // - Major deviations (>200m, e.g. turning onto a completely different road): immediate off-route
    // - Borderline deviations (120m-200m, e.g. urban canyoning/multipath): debounced over consecutive pings
    let isOffRoute = false;
    let shouldReroute = false;

    if (!isApproachingOrigin && offRouteDistanceMeters > dynamicToleranceMeters) {
      this.consecutiveOffRouteCount += 1;
      const isSubstantialDeviation = offRouteDistanceMeters > 200;
      const isConfirmedDeviation = this.consecutiveOffRouteCount >= NavigationEngine.OFF_ROUTE_CONFIRMATION_THRESHOLD;

      if (isSubstantialDeviation || isConfirmedDeviation) {
        isOffRoute = true;
        // Trigger auto-reroute recommendation if off-route exceeds 250m or has been confirmed 3+ times
        if (offRouteDistanceMeters > 250 || this.consecutiveOffRouteCount >= 3) {
          shouldReroute = true;
        }
      }
    } else {
      this.consecutiveOffRouteCount = Math.max(0, this.consecutiveOffRouteCount - 1);
    }

    // 5. Remaining Distance & Duration Calculation
    let remainingDistanceKm: number;
    if (distToLineKm > 5.0) {
      remainingDistanceKm = Math.round((route.distanceKm + distToOriginKm) * 10) / 10;
    } else {
      remainingDistanceKm = Math.max(0, Math.round((totalLineLengthKm - locationAlongLineKm) * 10) / 10);
    }

    // Average effective heavy vehicle speed (50 km/h baseline, or current speed if moving)
    const effectiveSpeed = position.speedKmh > 15 ? position.speedKmh : 50;
    const remainingDurationMinutes = Math.max(1, Math.round((remainingDistanceKm / effectiveSpeed) * 60));

    // Estimated Time of Arrival (ETA)
    const etaDate = new Date(now.getTime() + remainingDurationMinutes * 60000);
    const etaHours = String(etaDate.getHours()).padStart(2, '0');
    const etaMins = String(etaDate.getMinutes()).padStart(2, '0');
    const arrivalTimeFormatted = `${etaHours}:${etaMins}`;

    // 6. Destination Check (within 45 meters of destination)
    const isDestination = distToDestKm < 0.045 || remainingDistanceKm < 0.045;
    if (isDestination) {
      return {
        remainingDistanceKm: 0,
        remainingDurationMinutes: 0,
        isOffRoute: false,
        isApproachingOrigin: false,
        offRouteDistanceMeters: 0,
        activeStepIndex: (route.detailedSteps?.length || 1) - 1,
        shouldReroute: false,
        currentManeuver: {
          icon: '🏁',
          instructionEn: 'You have arrived at your destination',
          instructionHi: 'आप अपने गंतव्य पर पहुंच गए हैं',
          distanceToManeuverMeters: 0,
          formattedDistance: '0 m',
          isDestination: true,
          arrivalTimeFormatted,
        },
      };
    }

    // 7. High-Precision Maneuver Tracking
    const detailedSteps = route.detailedSteps || [];
    const stepCount = detailedSteps.length;
    let activeStepIndex = this.lastConfirmedStepIndex;

    let instructionEn = '';
    let instructionHi = '';
    let roadName: string | undefined;
    let distanceToManeuverMeters = 500;
    let icon = '⬆';
    let subsequentInstructionEn: string | undefined;
    let subsequentInstructionHi: string | undefined;
    let subsequentIcon: string | undefined;

    if (stepCount > 0) {
      // Find the first upcoming maneuver step along the route geometry
      let foundStepIdx = activeStepIndex;

      for (let i = activeStepIndex; i < stepCount; i++) {
        const step = detailedSteps[i];
        const stepPt = turf.point(step.coordinates);
        const stepSnapped = turf.nearestPointOnLine(line, stepPt);
        const stepLocationKm = stepSnapped.properties.location ?? 0;

        // Has driver passed this step by more than 30 meters?
        const deltaKm = stepLocationKm - locationAlongLineKm;
        if (deltaKm > -0.030) {
          foundStepIdx = i;
          distanceToManeuverMeters = Math.max(0, Math.round(deltaKm * 1000));
          break;
        }
      }

      // Monotonic step advance: never go backwards due to GPS jitter
      if (foundStepIdx > activeStepIndex) {
        activeStepIndex = foundStepIdx;
        this.lastConfirmedStepIndex = activeStepIndex;
      }

      const currentStep = detailedSteps[activeStepIndex];
      if (currentStep) {
        instructionEn = currentStep.instructionEn;
        instructionHi = currentStep.instructionHi;
        roadName = currentStep.roadName;
        icon = currentStep.icon || this.resolveManeuverIcon(currentStep.instructionEn, remainingDistanceKm);
      }

      // Lookahead: Subsequent maneuver step preview (Google Maps "Then..." bar)
      if (activeStepIndex + 1 < stepCount) {
        const nextStep = detailedSteps[activeStepIndex + 1];
        subsequentInstructionEn = nextStep.instructionEn;
        subsequentInstructionHi = nextStep.instructionHi;
        subsequentIcon = nextStep.icon || this.resolveManeuverIcon(nextStep.instructionEn, remainingDistanceKm);
      }
    } else {
      // Fallback for simple turnSteps strings
      const stepsEn = route.turnSteps?.en || [];
      const stepsHi = route.turnSteps?.hi || [];
      const totalDistance = route.distanceKm || 1;
      const progressFraction = Math.min(1, Math.max(0, 1 - remainingDistanceKm / totalDistance));
      activeStepIndex = Math.min(stepsEn.length - 1, Math.floor(progressFraction * stepsEn.length));
      instructionEn = stepsEn[activeStepIndex] || 'Continue on route';
      instructionHi = stepsHi[activeStepIndex] || 'मार्ग पर आगे बढ़ते रहें';
      icon = this.resolveManeuverIcon(instructionEn, remainingDistanceKm);
      distanceToManeuverMeters = Math.round((remainingDistanceKm / Math.max(1, stepsEn.length - activeStepIndex)) * 1000);
    }

    if (isApproachingOrigin) {
      instructionEn = `Head towards route start (${offRouteDistanceMeters}m away)`;
      instructionHi = `मार्ग के प्रारंभ बिंदु की ओर बढ़ें (${offRouteDistanceMeters} मी दूर)`;
      icon = '⬆';
    } else if (distToLineKm > 5.0) {
      instructionEn = `Head towards route corridor (${distToOriginKm.toFixed(1)} km away)`;
      instructionHi = `मार्ग के प्रारंभ बिंदु की ओर बढ़ें (${distToOriginKm.toFixed(1)} किमी दूर)`;
      icon = '⬆';
    }

    // Format human-friendly distance
    const formattedDistance =
      distanceToManeuverMeters < 1000
        ? `${Math.round(distanceToManeuverMeters / 10) * 10} m`
        : `${(distanceToManeuverMeters / 1000).toFixed(1)} km`;

    return {
      remainingDistanceKm,
      remainingDurationMinutes,
      isOffRoute,
      isApproachingOrigin,
      offRouteDistanceMeters,
      activeStepIndex,
      shouldReroute,
      currentManeuver: {
        icon,
        instructionEn,
        instructionHi,
        subsequentInstructionEn,
        subsequentInstructionHi,
        subsequentIcon,
        roadName,
        distanceToManeuverMeters,
        formattedDistance,
        isDestination: false,
        arrivalTimeFormatted,
      },
    };
  }

  /**
   * Starts a trip on the backend
   */
  public async startTrip(params: {
    vehicleId: string;
    originName: string;
    destinationName: string;
    routeId?: string;
    distanceKm: number;
  }): Promise<string> {
    this.reset();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = authService.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch('/api/trips/start', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to initialize navigation trip on server.');
    }

    const data = await res.json();
    return data.trip.id;
  }

  /**
   * Ends active trip on backend
   */
  public async endTrip(tripId: string): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = authService.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    await fetch('/api/trips/end', {
      method: 'POST',
      headers,
      body: JSON.stringify({ tripId }),
    }).catch((e) => console.warn('[Navigation] End trip error:', e));
  }

  private resolveManeuverIcon(instruction: string, remainingKm: number): string {
    if (remainingKm < 0.05) return '🏁';
    const lower = instruction.toLowerCase();
    if (lower.includes('u-turn') || lower.includes('यू-टर्न')) return '⮌';
    if (lower.includes('sharp left') || lower.includes('तीखा बायां')) return '↰';
    if (lower.includes('sharp right') || lower.includes('तीखा दायां')) return '↱';
    if (lower.includes('slight left') || lower.includes('हल्का बायां')) return '↖';
    if (lower.includes('slight right') || lower.includes('हल्का दायां')) return '↗';
    if (lower.includes('left') || lower.includes('बाएं')) return '↰';
    if (lower.includes('right') || lower.includes('दाएं')) return '↱';
    if (lower.includes('roundabout') || lower.includes('गोलचक्कर')) return '🔄';
    return '⬆';
  }
}

export const navigationEngine = new NavigationEngine();
