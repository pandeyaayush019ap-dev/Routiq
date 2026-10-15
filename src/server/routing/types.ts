import { RoadWidthAssessment, EvaluatedRestriction } from '../gis/types';

export interface RouteRequestParams {
  originCoordinates: [number, number]; // [lon, lat]
  destinationCoordinates: [number, number]; // [lon, lat]
  originName: string;
  destinationName: string;
  waypoints?: [number, number][];
  vehicle: {
    id?: string;
    name?: string;
    category?: string;
    heightMeters: number;
    widthMeters: number;
    lengthMeters: number;
    loadedWeightTonnes: number;
    axleCount?: number;
    axleLoadTonnes?: number;
    fuelType?: string;
    cargoType?: string;
  };
  departureTime?: string; // 'HH:mm'
  preference?: 'fastest' | 'safest' | 'avoid_tolls';
}

export interface RouteTurnStep {
  instruction: string;
  instructionHi?: string;
  distanceMeters: number;
  durationSeconds: number;
  roadName?: string;
  type?: string;
  modifier?: string;
  icon?: string;
  coordinates: [number, number];
}

export interface CalculatedRouteAlternative {
  id: string;
  name: { en: string; hi: string };
  viaHighway: string;
  distanceKm: number;
  durationMinutes: number;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  status: 'RECOMMENDED' | 'WARNING' | 'BLOCKED';
  statusReasons: string[];
  steps: RouteTurnStep[];
  restrictions: EvaluatedRestriction[];
  roadWidthAssessment: RoadWidthAssessment;
  provider: string;
  tollsAvailable?: boolean;
}

export interface RouteResponsePayload {
  routes: CalculatedRouteAlternative[];
  recommendedRouteId?: string;
  origin: {
    name: { en: string; hi: string };
    coordinates: [number, number];
  };
  destination: {
    name: { en: string; hi: string };
    coordinates: [number, number];
  };
  evaluatedVehicle: RouteRequestParams['vehicle'];
  departureTime?: string;
  calculatedAt: string;
  error?: string;
  message?: string;
}

export interface IRoutingProvider {
  name: string;
  isConfigured(): boolean;
  calculateRoute(params: RouteRequestParams): Promise<CalculatedRouteAlternative[]>;
}
