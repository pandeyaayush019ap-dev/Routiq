import { RouteCalculationResult, VehicleProfile, CityLocation } from '../../types';

export interface RouteSearchParams {
  originName: string;
  destinationName: string;
  vehicle: VehicleProfile;
  departureTime?: string;
}

export interface IRoutingService {
  calculateRoutes(params: RouteSearchParams): Promise<RouteCalculationResult>;
  getAvailableCities(): CityLocation[];
  findCityByName(query: string): CityLocation | undefined;
}
