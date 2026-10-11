import * as turf from '@turf/turf';
import {
  RouteGisEvaluation,
  EvaluatedRestriction,
  RoadWidthAssessment,
  SpatialRestriction,
} from './types';
import { VERIFIED_FREIGHT_RESTRICTIONS } from './knownRestrictions';

export interface VehicleSpecsForGis {
  heightMeters: number;
  widthMeters: number;
  lengthMeters: number;
  loadedWeightTonnes: number;
  axleCount?: number;
  axleLoadTonnes?: number;
  cargoType?: string;
}

export class SpatialEngine {
  private restrictions: SpatialRestriction[];

  constructor(customRestrictions?: SpatialRestriction[]) {
    this.restrictions = customRestrictions || VERIFIED_FREIGHT_RESTRICTIONS;
  }

  /**
   * Evaluates a full GeoJSON LineString route against all spatial restrictions and road constraints
   */
  public evaluateRoute(
    routeCoordinates: [number, number][],
    vehicle: VehicleSpecsForGis,
    departureTime?: string
  ): RouteGisEvaluation {
    if (!routeCoordinates || routeCoordinates.length < 2) {
      return {
        status: 'WARNING',
        evaluatedRestrictions: [],
        statusReasons: ['Insufficient route geometry coordinates for spatial evaluation'],
        roadWidthIntelligence: this.evaluateRoadWidth(vehicle),
        spatialIntersectionsCount: 0,
      };
    }

    const routeLine = turf.lineString(routeCoordinates);
    const evaluatedList: EvaluatedRestriction[] = [];
    const statusReasons: string[] = [];
    let overallStatus: 'RECOMMENDED' | 'WARNING' | 'BLOCKED' = 'RECOMMENDED';

    for (const restr of this.restrictions) {
      const pt = turf.point(restr.coordinates);
      // Calculate perpendicular / closest distance in meters from route to restriction point
      const distKm = turf.pointToLineDistance(pt, routeLine, { units: 'kilometers' });
      const distMeters = distKm * 1000;

      // If within buffer zone radius of the restriction point
      if (distMeters <= restr.bufferRadiusMeters) {
        let evalStatus: 'OK' | 'WARNING' | 'BLOCKED' = 'OK';
        let advisoryEn = '';
        let advisoryHi = '';

        // 1. Height restriction evaluation
        if (restr.type === 'height' && typeof restr.limitValue === 'number') {
          if (vehicle.heightMeters > restr.limitValue) {
            evalStatus = 'BLOCKED';
            advisoryEn = `CRITICAL: Vehicle height (${vehicle.heightMeters.toFixed(2)}m) exceeds clearance (${restr.limitValue.toFixed(2)}m) by ${(vehicle.heightMeters - restr.limitValue).toFixed(2)}m!`;
            advisoryHi = `गंभीर खतरा: गाड़ी की ऊँचाई (${vehicle.heightMeters.toFixed(2)}m) पुल की अधिकतम सीमा (${restr.limitValue.toFixed(2)}m) से अधिक है!`;
          } else if (vehicle.heightMeters >= restr.limitValue - 0.15) {
            evalStatus = 'WARNING';
            advisoryEn = `Tight clearance warning: Only ${((restr.limitValue - vehicle.heightMeters) * 100).toFixed(0)}cm margin under structure. Slow down.`;
            advisoryHi = `कम फासला: पुल के नीचे मात्र ${((restr.limitValue - vehicle.heightMeters) * 100).toFixed(0)} सेमी की जगह है। गति धीमी रखें।`;
          } else {
            advisoryEn = `Clearance verified: Vehicle height is within structure limit (${restr.limitValue.toFixed(2)}m).`;
            advisoryHi = `ऊँचाई सुरक्षित: गाड़ी की ऊँचाई पुल की सीमा के भीतर है।`;
          }
        }

        // 2. Weight restriction evaluation
        else if (restr.type === 'weight' && typeof restr.limitValue === 'number') {
          if (vehicle.loadedWeightTonnes > restr.limitValue) {
            evalStatus = 'BLOCKED';
            advisoryEn = `CRITICAL: Loaded weight (${vehicle.loadedWeightTonnes.toFixed(1)}t) exceeds structure GVW rating (${restr.limitValue.toFixed(1)}t)!`;
            advisoryHi = `गंभीर खतरा: गाड़ी का भार (${vehicle.loadedWeightTonnes.toFixed(1)} टन) पुल की क्षमता (${restr.limitValue.toFixed(1)} टन) से अधिक है!`;
          } else if (vehicle.loadedWeightTonnes >= restr.limitValue * 0.9) {
            evalStatus = 'WARNING';
            advisoryEn = `Weight caution: Vehicle weight is close to structure rating (${restr.limitValue.toFixed(1)}t).`;
            advisoryHi = `भार चेतावनी: गाड़ी का भार पुल की सीमा के करीब है।`;
          } else {
            advisoryEn = `Weight within structure limits.`;
            advisoryHi = `भार क्षमता के भीतर है।`;
          }
        }

        // 3. Width restriction evaluation
        else if (restr.type === 'width' && typeof restr.limitValue === 'number') {
          if (vehicle.widthMeters > restr.limitValue) {
            evalStatus = 'BLOCKED';
            advisoryEn = `CRITICAL: Vehicle width (${vehicle.widthMeters.toFixed(2)}m) exceeds corridor width limit (${restr.limitValue.toFixed(2)}m)!`;
            advisoryHi = `गंभीर खतरा: गाड़ी की चौड़ाई (${vehicle.widthMeters.toFixed(2)}m) रास्ते की सीमा (${restr.limitValue.toFixed(2)}m) से अधिक है!`;
          } else {
            evalStatus = 'WARNING';
            advisoryEn = `Narrow corridor width: Exercise extreme caution on narrow approach.`;
            advisoryHi = `सकरा रास्ता: संकरे मार्ग पर विशेष सावधानी बरतें।`;
          }
        }

        // 4. Time window ban evaluation
        else if (restr.type === 'time' && restr.timeWindow) {
          if (departureTime) {
            const isWithinBan = this.isTimeInWindow(
              departureTime,
              restr.timeWindow.start,
              restr.timeWindow.end
            );
            if (isWithinBan) {
              evalStatus = 'WARNING';
              advisoryEn = `Time Ban Active: Heavy commercial vehicles prohibited between ${restr.timeWindow.start} and ${restr.timeWindow.end}.`;
              advisoryHi = `समय प्रतिबंध सक्रिय: भारी व्यावसायिक वाहनों का आवागमन ${restr.timeWindow.start} से ${restr.timeWindow.end} तक प्रतिबंधित है।`;
            } else {
              advisoryEn = `Outside restriction window (${restr.timeWindow.start}-${restr.timeWindow.end}). Check for travel delays.`;
              advisoryHi = `प्रतिबंधित समय (${restr.timeWindow.start}-${restr.timeWindow.end}) से बाहर है।`;
            }
          } else {
            evalStatus = 'WARNING';
            advisoryEn = `Time-dependent ban exists (${restr.timeWindow.start}-${restr.timeWindow.end}). Verify arrival time at restriction zone.`;
            advisoryHi = `समय सीमा लागू है (${restr.timeWindow.start}-${restr.timeWindow.end})। पहुँचने के समय की पुष्टि करें।`;
          }
        }

        // 5. Axle load check
        else if (restr.type === 'axle' && typeof restr.limitValue === 'number') {
          if (vehicle.axleLoadTonnes && vehicle.axleLoadTonnes > restr.limitValue) {
            evalStatus = 'WARNING';
            advisoryEn = `Axle load warning: Estimated axle load (${vehicle.axleLoadTonnes.toFixed(1)}t) exceeds advisory limit (${restr.limitValue.toFixed(1)}t).`;
            advisoryHi = `एक्सल भार चेतावनी: अनुमानित एक्सल भार (${vehicle.axleLoadTonnes.toFixed(1)} टन) सीमा से अधिक है।`;
          } else {
            evalStatus = 'WARNING';
            advisoryEn = `Axle inspection zone: Confirm weight slip at weighbridge before crossing.`;
            advisoryHi = `एक्सल जांच क्षेत्र: आगे बढ़ने से पहले धर्मकांटे की पर्ची तैयार रखें।`;
          }
        }

        evaluatedList.push({
          ...restr,
          evaluationStatus: evalStatus,
          distanceFromRouteMeters: Math.round(distMeters),
          driverAdvisory: {
            en: advisoryEn,
            hi: advisoryHi,
          },
        });

        if (evalStatus === 'BLOCKED') {
          overallStatus = 'BLOCKED';
          statusReasons.push(`Blocked: ${restr.name.en} (${advisoryEn})`);
        } else if (evalStatus === 'WARNING' && overallStatus !== 'BLOCKED') {
          overallStatus = 'WARNING';
          statusReasons.push(`Advisory: ${restr.name.en} (${advisoryEn})`);
        }
      }
    }

    const roadWidthInfo = this.evaluateRoadWidth(vehicle);

    return {
      status: overallStatus,
      evaluatedRestrictions: evaluatedList,
      statusReasons:
        statusReasons.length > 0
          ? statusReasons
          : ['No known commercial vehicle conflicts identified along route corridors.'],
      roadWidthIntelligence: roadWidthInfo,
      spatialIntersectionsCount: evaluatedList.length,
    };
  }

  /**
   * Road width evaluation adhering strictly to Rule 1.1 (The Unknown Data Law)
   */
  public evaluateRoadWidth(vehicle: VehicleSpecsForGis): RoadWidthAssessment {
    const minRequired = vehicle.widthMeters + 0.6; // Standard clearance buffer

    return {
      status: 'DATA_UNAVAILABLE',
      minimumRequiredWidthMeters: Number(minRequired.toFixed(2)),
      confidence: 'UNVERIFIED',
      explanation: {
        en: `Road width survey data is unverified on this corridor. A minimum usable carriageway width of ${minRequired.toFixed(2)}m is recommended for your vehicle width (${vehicle.widthMeters.toFixed(2)}m).`,
        hi: `इस मार्ग पर सड़क की चौड़ाई का आधिकारिक सर्वेक्षण डेटा उपलब्ध नहीं है। आपकी गाड़ी की चौड़ाई (${vehicle.widthMeters.toFixed(2)}m) के लिए कम से कम ${minRequired.toFixed(2)}m चौड़ी सड़क की आवश्यकता है।`,
      },
      honestDisclaimer:
        'DO NOT ASSUME ROAD WIDTH IS SAFE: Route thickness or map line styles do not reflect actual physical asphalt width. Always verify local signage.',
    };
  }

  private isTimeInWindow(time: string, start: string, end: string): boolean {
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    const tMin = toMin(time);
    const sMin = toMin(start);
    const eMin = toMin(end);

    if (sMin <= eMin) {
      return tMin >= sMin && tMin <= eMin;
    }
    // Overnight window (e.g. 22:00 to 06:00)
    return tMin >= sMin || tMin <= eMin;
  }
}

export const spatialEngine = new SpatialEngine();
