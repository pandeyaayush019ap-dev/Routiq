import { IRoutingService, RouteSearchParams } from './types';
import { RouteCalculationResult, RouteCandidate, CityLocation, RoadRestriction } from '../../types';
import { CITIES, CITY_ALIASES, CORRIDOR_ROUTES } from './demoData';

export class ProductionRoutingService implements IRoutingService {
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
    return CITIES.find(
      (c) =>
        c.name.en.toLowerCase().includes(clean) ||
        c.name.hi.includes(clean) ||
        c.id.includes(clean)
    );
  }

  /**
   * Search real Indian locations using the backend geocoder
   */
  public async searchPlaces(query: string): Promise<Array<{ name: string; coordinates: [number, number]; address: string }>> {
    try {
      const res = await fetch(`/api/geocoding/search?q=${encodeURIComponent(query)}&limit=6`);
      if (res.ok) {
        const data = await res.json();
        return (data.places || []).map((p: { name: { en: string }; coordinates: [number, number]; formattedAddress: string }) => ({
          name: p.name.en,
          coordinates: p.coordinates,
          address: p.formattedAddress,
        }));
      }
    } catch {
      // offline
    }
    return [];
  }

  /**
   * Fetch commercial points of interest along the planned route
   */
  public async getPlacesAlongRoute(
    routeCoordinates: [number, number][],
    categories: string[] = ['fuel', 'parking_rest', 'repair', 'weighbridge']
  ) {
    try {
      const res = await fetch('/api/places/along-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coordinates: routeCoordinates,
          bufferKm: 15,
          categories,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.places || [];
      }
    } catch {
      // fallback
    }
    return [];
  }

  public async calculateRoutes(params: RouteSearchParams): Promise<RouteCalculationResult> {
    const { originName, destinationName, vehicle, departureTime } = params;

    // 1. Try real backend API endpoint /api/routes
    try {
      const originMatch = this.findCityByName(originName);
      const destMatch = this.findCityByName(destinationName);

      const requestPayload = {
        originName,
        destinationName,
        originCoordinates: originMatch?.coordinates || [0, 0],
        destinationCoordinates: destMatch?.coordinates || [0, 0],
        vehicle: {
          id: vehicle.id,
          name: vehicle.name,
          category: vehicle.category,
          heightMeters: vehicle.heightMeters,
          widthMeters: vehicle.widthMeters,
          lengthMeters: vehicle.lengthMeters,
          loadedWeightTonnes: vehicle.loadedWeightTonnes,
          axleCount: vehicle.axles,
          cargoType: vehicle.cargoType,
        },
        departureTime: departureTime || undefined,
      };

      const response = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          const mappedRoutes: RouteCandidate[] = data.routes.map(
            (r: {
              id: string;
              name: { en: string; hi: string };
              viaHighway: string;
              distanceKm: number;
              durationMinutes: number;
              geometry: { type: 'LineString'; coordinates: [number, number][] };
              status: 'RECOMMENDED' | 'WARNING' | 'BLOCKED';
              statusReasons: string[];
              steps: Array<{ instruction: string }>;
              restrictions: Array<{
                id: string;
                type: 'height' | 'weight' | 'axle' | 'time' | 'width';
                name: { en: string; hi: string };
                description: { en: string; hi: string };
                coordinates: [number, number];
                limitValue?: number;
                evaluationStatus: 'OK' | 'WARNING' | 'BLOCKED';
                driverAdvisory: { en: string; hi: string };
              }>;
            }) => ({
              id: r.id,
              name: r.name,
              distanceKm: r.distanceKm,
              durationMinutes: r.durationMinutes,
              whyExplanation: {
                en: r.statusReasons?.[0] || `Routed via ${r.viaHighway}`,
                hi: r.statusReasons?.[0] || `${r.viaHighway} के माध्यम से रूट`,
              },
              geometry: r.geometry,
              restrictions: (r.restrictions || []).map((res) => ({
                id: res.id,
                kind: res.type === 'height' ? 'bridge' : res.type === 'weight' ? 'weight' : res.type === 'time' ? 'time_ban' : 'axle',
                name: res.name,
                coordinates: res.coordinates,
                limitType: res.type,
                limitValue: res.limitValue,
                roadName: { en: 'Indian National Highway', hi: 'भारतीय राष्ट्रीय राजमार्ग' },
                actionGuidance: res.driverAdvisory,
                verificationStatus: 'verified',
                status: res.evaluationStatus,
              })),
              turnSteps: {
                en: (r.steps || []).map((s) => s.instruction),
                hi: (r.steps || []).map((s) => s.instruction),
              },
              status: r.status,
              statusReasons: r.statusReasons,
            })
          );

          return {
            routes: mappedRoutes,
            recommendedRouteId: data.recommendedRouteId,
            origin: {
              id: 'origin_pt',
              name: data.origin.name,
              coordinates: data.origin.coordinates,
              state: '',
            },
            destination: {
              id: 'dest_pt',
              name: data.destination.name,
              coordinates: data.destination.coordinates,
              state: '',
            },
            departureTime: data.departureTime,
            calculatedAt: data.calculatedAt,
            evaluatedVehicle: vehicle,
          };
        }
      }
    } catch (err) {
      console.warn('[RoutingService] API call failed, using client fallback:', err);
    }

    // 2. Resilient Fallback to local verified freight corridors
    return this.calculateLocalFallback(params);
  }

  private calculateLocalFallback(params: RouteSearchParams): RouteCalculationResult {
    const { originName, destinationName, vehicle, departureTime } = params;
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

    const evaluatedRoutes: RouteCandidate[] = rawRoutes.map((route) => {
      const evaluatedRestrictions: RoadRestriction[] = route.restrictions.map((restr) => {
        let status: 'OK' | 'WARNING' | 'BLOCKED' = 'OK';

        if (restr.limitType === 'height' && typeof restr.limitValue === 'number') {
          if (vehicle.heightMeters > restr.limitValue) {
            status = 'BLOCKED';
          } else if (vehicle.heightMeters >= restr.limitValue - 0.15) {
            status = 'WARNING';
          }
        }

        if (restr.limitType === 'weight' && typeof restr.limitValue === 'number') {
          if (vehicle.loadedWeightTonnes > restr.limitValue) {
            status = 'BLOCKED';
          } else if (vehicle.loadedWeightTonnes >= restr.limitValue * 0.9) {
            status = 'WARNING';
          }
        }

        if (restr.limitType === 'time' && restr.timeWindow && departureTime) {
          const isWithin = this.isTimeInWindow(departureTime, restr.timeWindow.start, restr.timeWindow.end);
          if (isWithin) status = 'WARNING';
        }

        if (restr.limitType === 'axle') {
          status = 'WARNING';
        }

        return { ...restr, status };
      });

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
    return tMin >= sMin || tMin <= eMin;
  }
}

export const routingService = new ProductionRoutingService();
