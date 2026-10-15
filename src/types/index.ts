/**
 * Routiq Core Domain Types
 */

export type VehicleCategory = 'truck' | 'tipper' | 'container' | 'tanker' | 'trailer';
export type CargoType = 'general' | 'hazardous' | 'perishable' | 'heavy_machinery';

export interface VehicleProfile {
  id: string;
  name: string;
  category: VehicleCategory;
  registrationNumber?: string;
  gvwTonnes: number;            // Gross legal vehicle weight
  loadedWeightTonnes: number;   // Current gross weight including freight
  heightMeters: number;         // Overall height from ground
  widthMeters: number;          // Overall width including mirrors
  lengthMeters: number;         // Overall bumper-to-bumper length
  axles: number;                // Axle count (2, 3, 4, 6+)
  cargoType: CargoType;
  isVahanVerified?: boolean;
}

export type RestrictionKind = 'bridge' | 'axle' | 'weight' | 'time_ban' | 'width';

export interface RoadRestriction {
  id: string;
  kind: RestrictionKind;
  name: {
    en: string;
    hi: string;
  };
  coordinates: [number, number]; // [lng, lat] GeoJSON format
  limitType: 'height' | 'axle' | 'weight' | 'time' | 'width';
  limitValue?: number;           // e.g. 4.0 meters, 25 tonnes
  timeWindow?: {
    start: string;               // e.g. "07:00"
    end: string;                 // e.g. "11:00"
  };
  roadName: {
    en: string;
    hi: string;
  };
  actionGuidance: {
    en: string;
    hi: string;
  };
  sourceAuthority?: string;
  verificationStatus: 'verified' | 'unverified_demo';
  status?: 'OK' | 'WARNING' | 'BLOCKED';
  distanceAlongRouteKm?: number;
}

export type RouteStatus = 'RECOMMENDED' | 'WARNING' | 'BLOCKED';

export interface RouteCandidate {
  id: string;
  name: {
    en: string;
    hi: string;
  };
  distanceKm: number;
  durationMinutes: number;
  tollEstimateInr?: number;
  whyExplanation: {
    en: string;
    hi: string;
  };
  geometry: {
    type: 'LineString';
    coordinates: [number, number][]; // [lng, lat][]
  };
  restrictions: RoadRestriction[];
  turnSteps: {
    en: string[];
    hi: string[];
  };
  status?: RouteStatus;
  statusReasons?: string[];
}

export interface CityLocation {
  id: string;
  name: {
    en: string;
    hi: string;
  };
  coordinates: [number, number]; // [lng, lat]
  state: string;
}

export interface RouteCalculationResult {
  routes: RouteCandidate[];
  recommendedRouteId?: string;
  origin: CityLocation;
  destination: CityLocation;
  calculatedAt: string;
  departureTime?: string;
  evaluatedVehicle: VehicleProfile;
  error?: 'LOCATION_NOT_FOUND' | 'SAME_ORIGIN_DESTINATION' | 'NO_ROUTE_FOUND' | 'MISSING_VEHICLE_SPECS' | 'NETWORK_ERROR';
}
