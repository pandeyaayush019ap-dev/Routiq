import { IRoutingProvider, RouteRequestParams, CalculatedRouteAlternative } from '../types';
import { spatialEngine } from '../../gis/spatialEngine';
import { config } from '../../config/env';

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 3500): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export class OsrmRoutingProvider implements IRoutingProvider {
  public name = 'OSRM Road Network Engine + Routiq Spatial GIS';

  public isConfigured(): boolean {
    return true; // Always operational using public or self-hosted OSRM
  }

  public async calculateRoute(params: RouteRequestParams): Promise<CalculatedRouteAlternative[]> {
    const coordsStr = [
      params.originCoordinates.join(','),
      ...(params.waypoints || []).map((w) => w.join(',')),
      params.destinationCoordinates.join(','),
    ].join(';');

    const url = `${config.OSRM_URL}/route/v1/driving/${coordsStr}?overview=full&geometries=geojson&steps=true&alternatives=true`;

    try {
      const response = await fetchWithTimeout(url, {
        headers: { 'User-Agent': 'Routiq-HeavyTruckRouting/1.0 (contact: support@routiq.app)' },
      }, 3500);

      if (!response.ok) return [];

      const data = (await response.json()) as {
        code: string;
        routes: Array<{
          geometry: { coordinates: [number, number][] };
          distance: number; // meters
          duration: number; // seconds
          legs: Array<{
            summary: string;
            steps: Array<{
              maneuver: { instruction?: string; type?: string; location: [number, number] };
              name?: string;
              distance: number;
              duration: number;
            }>;
          }>;
        }>;
      };

      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) return [];

      return data.routes.map((r, index) => {
        const coords = r.geometry.coordinates;
        // Evaluate against heavy vehicle restrictions
        const gisEval = spatialEngine.evaluateRoute(coords, params.vehicle, params.departureTime);

        const distanceKm = Number((r.distance / 1000).toFixed(1));
        // HCVs travel approx 15-20% slower than light vehicles
        const truckDurationMinutes = Math.round((r.duration * 1.2) / 60);

        const highwaySummary =
          r.legs[0]?.summary ||
          (index === 0 ? 'Primary National Highway Corridor' : 'Alternative State Route');

        const steps = (r.legs[0]?.steps || []).map((s) => ({
          instruction: s.maneuver.instruction || `Drive along ${s.name || 'highway'}`,
          distanceMeters: Math.round(s.distance),
          durationSeconds: Math.round(s.duration),
          roadName: s.name,
          coordinates: s.maneuver.location || coords[0],
        }));

        const isAlt = index > 0;

        return {
          id: `osrm_route_${Date.now()}_${index}`,
          name: {
            en: isAlt
              ? `${highwaySummary} (Alternative Route ${index})`
              : `${highwaySummary} (Main Freight Route)`,
            hi: isAlt
              ? `${highwaySummary} (वैकल्पिक मार्ग ${index})`
              : `${highwaySummary} (मुख्य मालवाहक मार्ग)`,
          },
          viaHighway: highwaySummary,
          distanceKm,
          durationMinutes: truckDurationMinutes,
          geometry: {
            type: 'LineString',
            coordinates: coords,
          },
          status: gisEval.status,
          statusReasons: gisEval.statusReasons,
          steps,
          restrictions: gisEval.evaluatedRestrictions,
          roadWidthAssessment: gisEval.roadWidthIntelligence,
          provider: this.name,
        };
      });
    } catch (err) {
      console.warn('[OsrmRoutingProvider] Route calculation failed:', err);
      return [];
    }
  }
}
