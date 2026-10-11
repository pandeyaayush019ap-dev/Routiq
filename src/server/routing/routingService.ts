import {
  RouteRequestParams,
  RouteResponsePayload,
  CalculatedRouteAlternative,
  IRoutingProvider,
} from './types';
import { ValhallaProvider } from './providers/valhallaProvider';
import { OpenRouteServiceProvider } from './providers/openRouteServiceProvider';
import { OsrmRoutingProvider } from './providers/osrmProvider';
import { OfflineCorridorProvider } from './providers/offlineCorridorProvider';
import { geocodingService } from '../geocoding/geocodingService';

export class RoutingService {
  private providers: IRoutingProvider[];

  constructor() {
    this.providers = [
      new ValhallaProvider(),
      new OpenRouteServiceProvider(),
      new OfflineCorridorProvider(),
      new OsrmRoutingProvider(),
    ];
  }

  public async calculateRoutes(params: RouteRequestParams): Promise<RouteResponsePayload> {
    const { vehicle, originName, destinationName, departureTime } = params;

    // 1. Strict Input Validation (Rule 1.1)
    if (!originName || !originName.trim()) {
      return this.errorResponse('ORIGIN_REQUIRED', 'Origin location is required.', params);
    }
    if (!destinationName || !destinationName.trim()) {
      return this.errorResponse('DESTINATION_REQUIRED', 'Destination location is required.', params);
    }
    if (originName.trim().toLowerCase() === destinationName.trim().toLowerCase()) {
      return this.errorResponse(
        'SAME_ORIGIN_DESTINATION',
        'Origin and destination cannot be identical.',
        params
      );
    }
    if (!vehicle || !vehicle.heightMeters || vehicle.heightMeters <= 0) {
      return this.errorResponse(
        'MISSING_VEHICLE_HEIGHT',
        'Vehicle height is mandatory for truck-safe route planning. Cannot determine bridge clearances without height.',
        params
      );
    }
    if (!vehicle.loadedWeightTonnes || vehicle.loadedWeightTonnes <= 0) {
      return this.errorResponse(
        'MISSING_VEHICLE_WEIGHT',
        'Vehicle loaded gross weight is mandatory for bridge weight limit validation.',
        params
      );
    }

    // 2. Resolve Coordinates if not supplied
    let originCoords = params.originCoordinates;
    let destCoords = params.destinationCoordinates;

    if (!originCoords || originCoords[0] === 0) {
      const places = await geocodingService.searchPlaces(originName, 1);
      if (places.length > 0) {
        originCoords = places[0].coordinates;
      } else {
        return this.errorResponse(
          'LOCATION_NOT_FOUND',
          `Could not geocode origin location: "${originName}".`,
          params
        );
      }
    }

    if (!destCoords || destCoords[0] === 0) {
      const places = await geocodingService.searchPlaces(destinationName, 1);
      if (places.length > 0) {
        destCoords = places[0].coordinates;
      } else {
        return this.errorResponse(
          'LOCATION_NOT_FOUND',
          `Could not geocode destination location: "${destinationName}".`,
          params
        );
      }
    }

    const resolvedParams: RouteRequestParams = {
      ...params,
      originCoordinates: originCoords,
      destinationCoordinates: destCoords,
    };

    // 3. Query Providers sequentially until viable route alternatives are returned
    let candidateRoutes: CalculatedRouteAlternative[] = [];

    for (const provider of this.providers) {
      if (!provider.isConfigured()) continue;
      try {
        const routes = await provider.calculateRoute(resolvedParams);
        if (routes && routes.length > 0) {
          candidateRoutes = routes;
          break;
        }
      } catch (err) {
        console.warn(`[RoutingService] Provider ${provider.name} error:`, err);
      }
    }

    if (candidateRoutes.length === 0) {
      return this.errorResponse(
        'NO_ROUTE_FOUND',
        `No navigable road route found between "${originName}" and "${destinationName}". Check location inputs.`,
        resolvedParams
      );
    }

    // 4. Rank and sort routes
    // Priority: RECOMMENDED first, then WARNING, then BLOCKED.
    // Within same status, lowest duration first.
    const sorted = [...candidateRoutes].sort((a, b) => {
      const rank = (s: string) => (s === 'RECOMMENDED' ? 0 : s === 'WARNING' ? 1 : 2);
      const diff = rank(a.status) - rank(b.status);
      if (diff !== 0) return diff;
      return a.durationMinutes - b.durationMinutes;
    });

    const recommended = sorted.find((r) => r.status !== 'BLOCKED');

    return {
      routes: sorted,
      recommendedRouteId: recommended ? recommended.id : undefined,
      message: recommended
        ? undefined
        : 'No verified compliant route found: all candidate routes conflict with vehicle physical or timing restrictions.',
      origin: {
        name: { en: originName, hi: originName },
        coordinates: originCoords,
      },
      destination: {
        name: { en: destinationName, hi: destinationName },
        coordinates: destCoords,
      },
      evaluatedVehicle: vehicle,
      departureTime,
      calculatedAt: new Date().toISOString(),
    };
  }

  private errorResponse(
    code: string,
    message: string,
    params: Partial<RouteRequestParams>
  ): RouteResponsePayload {
    return {
      routes: [],
      origin: {
        name: { en: params.originName || '', hi: params.originName || '' },
        coordinates: params.originCoordinates || [0, 0],
      },
      destination: {
        name: { en: params.destinationName || '', hi: params.destinationName || '' },
        coordinates: params.destinationCoordinates || [0, 0],
      },
      evaluatedVehicle: params.vehicle || {
        heightMeters: 0,
        widthMeters: 0,
        lengthMeters: 0,
        loadedWeightTonnes: 0,
      },
      calculatedAt: new Date().toISOString(),
      error: code,
      message,
    };
  }
}

export const routingService = new RoutingService();
