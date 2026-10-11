import { IRoutingProvider, RouteRequestParams, CalculatedRouteAlternative } from '../types';
import { spatialEngine } from '../../gis/spatialEngine';
import { config } from '../../config/env';

export class ValhallaProvider implements IRoutingProvider {
  public name = 'Valhalla Truck Engine';

  public isConfigured(): boolean {
    return Boolean(config.VALHALLA_URL);
  }

  public async calculateRoute(params: RouteRequestParams): Promise<CalculatedRouteAlternative[]> {
    if (!this.isConfigured()) return [];

    const url = `${config.VALHALLA_URL}/route`;
    const payload = {
      locations: [
        { lon: params.originCoordinates[0], lat: params.originCoordinates[1], type: 'break' },
        ...(params.waypoints || []).map(([lon, lat]) => ({ lon, lat, type: 'through' })),
        { lon: params.destinationCoordinates[0], lat: params.destinationCoordinates[1], type: 'break' },
      ],
      costing: 'truck',
      costing_options: {
        truck: {
          height: params.vehicle.heightMeters,
          width: params.vehicle.widthMeters,
          length: params.vehicle.lengthMeters,
          weight: params.vehicle.loadedWeightTonnes,
          axle_load: params.vehicle.axleLoadTonnes || 10.0,
          axle_count: params.vehicle.axleCount || 2,
          hazmat: params.vehicle.cargoType === 'hazmat',
        },
      },
      directions_options: {
        units: 'kilometers',
        language: 'en-US',
      },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) return [];

      const data = (await response.json()) as {
        trip: {
          legs: Array<{
            shape: string;
            summary: { length: number; time: number };
            maneuvers: Array<{ instruction: string; length: number; time: number }>;
          }>;
        };
      };

      if (!data.trip || !data.trip.legs || data.trip.legs.length === 0) return [];

      const leg = data.trip.legs[0];
      // Note: Valhalla shape is encoded polyline6 - decode into [lon, lat][]
      const coords = this.decodePolyline6(leg.shape);

      // Perform GIS truck restriction analysis on the geometry
      const gisEval = spatialEngine.evaluateRoute(coords, params.vehicle, params.departureTime);

      const distanceKm = Number(leg.summary.length.toFixed(1));
      const durationMinutes = Math.round(leg.summary.time / 60);

      const route: CalculatedRouteAlternative = {
        id: `valhalla_route_${Date.now()}`,
        name: {
          en: `${params.originName} to ${params.destinationName} (Valhalla Truck)`,
          hi: `${params.originName} से ${params.destinationName} (वाल्हाल्ला ट्रक रूट)`,
        },
        viaHighway: 'Truck Authorized Highway Route',
        distanceKm,
        durationMinutes,
        geometry: {
          type: 'LineString',
          coordinates: coords,
        },
        status: gisEval.status,
        statusReasons: gisEval.statusReasons,
        steps: leg.maneuvers.map((m) => ({
          instruction: m.instruction,
          distanceMeters: Math.round(m.length * 1000),
          durationSeconds: m.time,
          coordinates: coords[0] || [0, 0],
        })),
        restrictions: gisEval.evaluatedRestrictions,
        roadWidthAssessment: gisEval.roadWidthIntelligence,
        provider: this.name,
      };

      return [route];
    } catch (err) {
      console.warn('[ValhallaProvider] Query failed:', err);
      return [];
    }
  }

  private decodePolyline6(str: string): [number, number][] {
    let index = 0,
      lat = 0,
      lng = 0;
    const coordinates: [number, number][] = [];
    const factor = 1e6;

    while (index < str.length) {
      let b,
        shift = 0,
        result = 0;
      do {
        b = str.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = str.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      coordinates.push([lng / factor, lat / factor]);
    }
    return coordinates;
  }
}
