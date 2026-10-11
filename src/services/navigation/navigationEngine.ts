import * as turf from '@turf/turf';
import { RouteCandidate } from '../../types';
import { GpsPosition } from './geolocationService';
import { authService } from '../auth/authService';

export interface ManeuverInfo {
  icon: string;
  instructionEn: string;
  instructionHi: string;
  distanceToManeuverMeters: number;
  formattedDistance: string;
  isDestination: boolean;
}

export interface NavigationStatus {
  isNavigating: boolean;
  tripId?: string;
  currentPosition: GpsPosition | null;
  currentSpeedKmh: number;
  remainingDistanceKm: number;
  remainingDurationMinutes: number;
  isOffRoute: boolean;
  offRouteDistanceMeters: number;
  currentManeuver: ManeuverInfo | null;
  activeStepIndex: number;
  error: string | null;
}

export class NavigationEngine {
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
    offRouteDistanceMeters: number;
    currentManeuver: ManeuverInfo;
    activeStepIndex: number;
  } {
    const coords = route.geometry.coordinates;
    const pt = turf.point([position.longitude, position.latitude]);
    const line = turf.lineString(coords);

    // 1. Off-Route Check using Turf point-to-line distance
    const distToLineKm = turf.pointToLineDistance(pt, line, { units: 'kilometers' });
    const offRouteDistanceMeters = Math.round(distToLineKm * 1000);
    // Flag off-route if driver is more than 85 meters away from route polyline
    const isOffRoute = offRouteDistanceMeters > 85;

    // 2. Distance from current point to destination (last coordinate)
    const destCoord = coords[coords.length - 1];
    const destPt = turf.point(destCoord);
    const distToDestKm = turf.distance(pt, destPt, { units: 'kilometers' });
    const remainingDistanceKm = Math.max(0, Math.round(distToDestKm * 10) / 10);

    // Calculate remaining duration based on average truck speed (50 km/h) or current speed
    const effectiveSpeed = position.speedKmh > 15 ? position.speedKmh : 50;
    const remainingDurationMinutes = Math.max(1, Math.round((remainingDistanceKm / effectiveSpeed) * 60));

    // 3. Step & Maneuver Tracking
    const stepsEn = route.turnSteps.en;
    const stepsHi = route.turnSteps.hi;
    const stepCount = stepsEn.length;

    // Estimate active step index proportionally by progress along route
    const totalDistance = route.distanceKm || 1;
    const progressFraction = Math.min(1, Math.max(0, 1 - remainingDistanceKm / totalDistance));
    const activeStepIndex = Math.min(stepCount - 1, Math.floor(progressFraction * stepCount));

    const instructionEn = stepsEn[activeStepIndex] || 'Continue on route';
    const instructionHi = stepsHi[activeStepIndex] || 'मार्ग पर आगे बढ़ते रहें';

    // Maneuver icon heuristic
    const icon = this.resolveManeuverIcon(instructionEn, remainingDistanceKm);

    // Distance to next step
    const distanceToManeuverMeters = Math.round((remainingDistanceKm / Math.max(1, stepCount - activeStepIndex)) * 1000);
    const formattedDistance =
      distanceToManeuverMeters < 1000
        ? `${distanceToManeuverMeters} m`
        : `${(distanceToManeuverMeters / 1000).toFixed(1)} km`;

    const isDestination = remainingDistanceKm < 0.1 || activeStepIndex === stepCount - 1;

    return {
      remainingDistanceKm,
      remainingDurationMinutes,
      isOffRoute,
      offRouteDistanceMeters,
      activeStepIndex,
      currentManeuver: {
        icon,
        instructionEn,
        instructionHi,
        distanceToManeuverMeters,
        formattedDistance,
        isDestination,
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
    if (remainingKm < 0.1) return '🏁';
    const lower = instruction.toLowerCase();
    if (lower.includes('u-turn') || lower.includes('यू-टर्न')) return '⮌';
    if (lower.includes('slight left') || lower.includes('हल्का बायां')) return '↖';
    if (lower.includes('slight right') || lower.includes('हल्का दायां')) return '↗';
    if (lower.includes('left') || lower.includes('बाएं')) return '↰';
    if (lower.includes('right') || lower.includes('दाएं')) return '↱';
    if (lower.includes('roundabout') || lower.includes('गोलचक्कर')) return '🔄';
    return '⬆';
  }
}

export const navigationEngine = new NavigationEngine();
