export type RestrictionType = 'height' | 'weight' | 'axle' | 'time' | 'width' | 'tunnel' | 'ghat';

export interface SpatialRestriction {
  id: string;
  type: RestrictionType;
  name: { en: string; hi: string };
  description: { en: string; hi: string };
  coordinates: [number, number]; // [lon, lat]
  limitValue?: number; // meters, tonnes, etc.
  unit?: string;
  highwayName?: string;
  timeWindow?: { start: string; end: string }; // e.g., '07:00', '11:00'
  state?: string;
  confidence: 'VERIFIED_OFFICIAL' | 'POLICE_ADVISORY' | 'NHAI_CIRCULAR' | 'SURVEYED';
  source: string;
  bufferRadiusMeters: number; // Proximity threshold for route collision detection
}

export interface RouteGisEvaluation {
  status: 'RECOMMENDED' | 'WARNING' | 'BLOCKED';
  evaluatedRestrictions: EvaluatedRestriction[];
  statusReasons: string[];
  roadWidthIntelligence: RoadWidthAssessment;
  spatialIntersectionsCount: number;
}

export interface EvaluatedRestriction extends SpatialRestriction {
  evaluationStatus: 'OK' | 'WARNING' | 'BLOCKED';
  distanceFromRouteMeters: number;
  driverAdvisory: { en: string; hi: string };
}

export interface RoadWidthAssessment {
  status: 'DATA_UNAVAILABLE' | 'SUFFICIENT' | 'NARROW_ROAD_WARNING' | 'BLOCKED';
  reportedWidthMeters?: number;
  minimumRequiredWidthMeters: number;
  confidence: 'HIGH' | 'ESTIMATED' | 'UNVERIFIED';
  explanation: { en: string; hi: string };
  honestDisclaimer: string;
}
