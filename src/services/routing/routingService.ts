import { IRoutingService, RouteSearchParams } from './types';
import { RouteCalculationResult, RouteCandidate, CityLocation, RoadRestriction } from '../../types';
import { CITIES, CITY_ALIASES, CORRIDOR_ROUTES } from './demoData';

export class DemoRoutingService implements IRoutingService {
  public getAvailableCities(): CityLocation[] {
    return CITIES;
  }

  public findCityByName(query: string): CityLocation | undefined {
    if (!query) return undefined;
    const clean = query.trim().toLowerCase();
    const cityId = CITY_ALIASES[clean];
    if (cityId) {
      return CITIES.find((c) => c.id === cityId);
    }
    // Partial search match
    return CITIES.find(
      (c) =>
        c.name.en.toLowerCase().includes(clean) ||
        c.name.hi.includes(clean) ||
        c.id.includes(clean)
    );
  }

  public async calculateRoutes(params: RouteSearchParams): Promise<RouteCalculationResult> {
    const { originName, destinationName, vehicle, departureTime } = params;

    // Simulate realistic calculation latency
    await new Promise((resolve) => setTimeout(resolve, 350));

    const origin = this.findCityByName(originName);
    const destination = this.findCityByName(destinationName);

    if (!origin || !destination) {
      return {
        routes: [],
        origin: origin || { id: 'unknown', name: { en: originName, hi: originName }, coordinates: [0, 0], state: '' },
        destination: destination || { id: 'unknown', name: { en: destinationName, hi: destinationName }, coordinates: [0, 0], state: '' },
        calculatedAt: new Date().toISOString(),
        evaluatedVehicle: vehicle,
        error: 'LOCATION_NOT_FOUND',
      };
    }

    if (origin.id === destination.id) {
      return {
        routes: [],
        origin,
        destination,
        calculatedAt: new Date().toISOString(),
        evaluatedVehicle: vehicle,
        error: 'SAME_ORIGIN_DESTINATION',
      };
    }

    if (!vehicle.heightMeters || vehicle.heightMeters <= 0) {
      return {
        routes: [],
        origin,
        destination,
        calculatedAt: new Date().toISOString(),
        evaluatedVehicle: vehicle,
        error: 'MISSING_VEHICLE_SPECS',
      };
    }

    // Lookup corridor
    const corridorKey = [origin.id, destination.id].sort().join('|');
    const rawRoutes = CORRIDOR_ROUTES[corridorKey];

    if (!rawRoutes || rawRoutes.length === 0) {
      return {
        routes: [],
        origin,
        destination,
        calculatedAt: new Date().toISOString(),
        evaluatedVehicle: vehicle,
        error: 'NO_ROUTE_FOUND',
      };
    }

    // Evaluate constraints for each route
    const evaluatedRoutes: RouteCandidate[] = rawRoutes.map((route) => {
      const evaluatedRestrictions: RoadRestriction[] = route.restrictions.map((restr) => {
        let status: 'OK' | 'WARNING' | 'BLOCKED' = 'OK';

        // Check height clearance
        if (restr.limitType === 'height' && typeof restr.limitValue === 'number') {
          if (vehicle.heightMeters > restr.limitValue) {
            status = 'BLOCKED';
          } else if (vehicle.heightMeters >= restr.limitValue - 0.15) {
            status = 'WARNING'; // Close margin caution (< 15cm margin)
          }
        }

        // Check weight limit
        if (restr.limitType === 'weight' && typeof restr.limitValue === 'number') {
          if (vehicle.loadedWeightTonnes > restr.limitValue) {
            status = 'BLOCKED';
          } else if (vehicle.loadedWeightTonnes >= restr.limitValue * 0.9) {
            status = 'WARNING';
          }
        }

        // Check time-based restrictions
        if (restr.limitType === 'time' && restr.timeWindow && departureTime) {
          const isWithinTimeBan = this.isTimeInWindow(departureTime, restr.timeWindow.start, restr.timeWindow.end);
          if (isWithinTimeBan) {
            status = 'WARNING';
          }
        }

        // Axle rating checks
        if (restr.limitType === 'axle') {
          status = 'WARNING'; // Axle weight checks require driver verification
        }

        return {
          ...restr,
          status,
        };
      });

      // Overall route status
      let routeStatus: 'RECOMMENDED' | 'WARNING' | 'BLOCKED' = 'RECOMMENDED';
      const reasons: string[] = [];

      const hasBlocked = evaluatedRestrictions.some((r) => r.status === 'BLOCKED');
      const hasWarning = evaluatedRestrictions.some((r) => r.status === 'WARNING');

      if (hasBlocked) {
        routeStatus = 'BLOCKED';
        reasons.push('Violates vehicle physical height or weight clearance limits');
      } else if (hasWarning) {
        routeStatus = 'WARNING';
        reasons.push('Contains operational advisories (time-ban window or axle check)');
      }

      // If heading in reverse order, reverse geometry coordinates for accurate display
      let displayGeometry = route.geometry;
      if (corridorKey.split('|')[0] !== origin.id) {
        displayGeometry = {
          type: 'LineString',
          coordinates: [...route.geometry.coordinates].reverse(),
        };
      }

      return {
        ...route,
        geometry: displayGeometry,
        restrictions: evaluatedRestrictions,
        status: routeStatus,
        statusReasons: reasons,
      };
    });

    // Select recommended route: cleanest route without BLOCKED, preferably with lowest duration
    const sorted = [...evaluatedRoutes].sort((a, b) => {
      const rank = (s?: string) => (s === 'RECOMMENDED' ? 0 : s === 'WARNING' ? 1 : 2);
      const diff = rank(a.status) - rank(b.status);
      if (diff !== 0) return diff;
      return a.durationMinutes - b.durationMinutes;
    });

    const recommended = sorted.find((r) => r.status !== 'BLOCKED');

    return {
      routes: sorted,
      recommendedRouteId: recommended ? recommended.id : sorted[0]?.id,
      origin,
      destination,
      departureTime,
      calculatedAt: new Date().toISOString(),
      evaluatedVehicle: vehicle,
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

export const routingService = new DemoRoutingService();
