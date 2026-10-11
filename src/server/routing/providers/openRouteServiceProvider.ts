import { IRoutingProvider, RouteRequestParams, CalculatedRouteAlternative } from '../types';
import { spatialEngine } from '../../gis/spatialEngine';
import { config } from '../../config/env';

export class OpenRouteServiceProvider implements IRoutingProvider {
  public name = 'OpenRouteService HGV Engine';

  public isConfigured(): boolean {
    return Boolean(config.OPENROUTESERVICE_API_KEY);
  }

  public async calculateRoute(params: RouteRequestParams): Promise<CalculatedRouteAlternative[]> {
    if (!this.isConfigured()) return [];

    const coordinates = [
      params.originCoordinates,
      ...(params.waypoints || []),
      params.destinationCoordinates,
    ];

    const body = {
      coordinates,
      profile: 'driving-hgv',
      options: {
        vehicle_type: 'hgv',
        profile_params: {
          restrictions: {
            max_height: params.vehicle.heightMeters,
            max_width: params.vehicle.widthMeters,
            max_weight: params.vehicle.loadedWeightTonnes,
          },
        },
      },
    };

    try {
      const response = await fetch(
        `${config.OPENROUTESERVICE_URL}/v2/directions/driving-hgv/geojson`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: config.OPENROUTESERVICE_API_KEY || '',
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) return [];

      const geojson = (await response.json()) as {
        features: Array<{
          geometry: { coordinates: [number, number][] };
          properties: {
            summary: { distance: number; duration: number };
            segments: Array<{
              steps: Array<{
                instruction: string;
                distance: number;
                duration: number;
                name: string;
              }>;
            }>;
          };
        }>;
      };

      if (!geojson.features || geojson.features.length === 0) return [];

      const feat = geojson.features[0];
      const coords = feat.geometry.coordinates;
      const distanceKm = Number((feat.properties.summary.distance / 1000).toFixed(1));
      const durationMinutes = Math.round(feat.properties.summary.duration / 60);

      const gisEval = spatialEngine.evaluateRoute(coords, params.vehicle, params.departureTime);

      const steps = (feat.properties.segments?.[0]?.steps || []).map((s) => ({
        instruction: s.instruction,
        distanceMeters: Math.round(s.distance),
        durationSeconds: Math.round(s.duration),
        roadName: s.name,
        coordinates: coords[0] || [0, 0],
      }));

      const route: CalculatedRouteAlternative = {
        id: `ors_hgv_route_${Date.now()}`,
        name: {
          en: `${params.originName} to ${params.destinationName} (ORS HGV Route)`,
          hi: `${params.originName} से ${params.destinationName} (ORS भारी वाहन रूट)`,
        },
        viaHighway: 'Designated Freight Corridor',
        distanceKm,
        durationMinutes,
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

      return [route];
    } catch (err) {
      console.warn('[OpenRouteServiceProvider] Failed to calculate route:', err);
      return [];
    }
  }
}
