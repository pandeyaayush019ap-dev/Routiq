import { RouteCalculationResult, VehicleProfile, CityLocation } from '../../types';

export interface RouteSearchParams {
  originName: string;
  destinationName: string;
  originCoordinates?: [number, number];
  destinationCoordinates?: [number, number];
  waypoints?: Array<{ name: string; coordinates: [number, number] }>;
  vehicle: VehicleProfile;
  departureTime?: string;
}

export interface IRoutingService {
  calculateRoutes(params: RouteSearchParams): Promise<RouteCalculationResult>;
  getAvailableCities(): CityLocation[];
  findCityByName(query: string): CityLocation | undefined;
}
