import { IRoutingProvider, RouteRequestParams, CalculatedRouteAlternative } from '../types';
import { spatialEngine } from '../../gis/spatialEngine';
import { CORRIDOR_ROUTES } from '../../../services/routing/demoData';

export class OfflineCorridorProvider implements IRoutingProvider {
  public name = 'Routiq Verified Freight Corridors (High-Precision Geometry)';

  public isConfigured(): boolean {
    return true;
  }

  public async calculateRoute(params: RouteRequestParams): Promise<CalculatedRouteAlternative[]> {
    const orig = params.originName.toLowerCase();
    const dest = params.destinationName.toLowerCase();

    // Find if a pre-compiled corridor matches
    let matchedKey: string | undefined;
    for (const key of Object.keys(CORRIDOR_ROUTES)) {
      const parts = key.split('|');
      if (
        (orig.includes(parts[0]) && dest.includes(parts[1])) ||
        (orig.includes(parts[1]) && dest.includes(parts[0]))
      ) {
        matchedKey = key;
        break;
      }
    }

    if (!matchedKey) return [];

    const candidates = CORRIDOR_ROUTES[matchedKey] || [];
    const isReversed = matchedKey.split('|')[0] !== orig;

    return candidates.map((c, i) => {
      let coords = c.geometry.coordinates;
      if (isReversed) {
        coords = [...coords].reverse();
      }

      const gisEval = spatialEngine.evaluateRoute(coords, params.vehicle, params.departureTime);

      return {
        id: `corridor_${c.id}_${Date.now()}_${i}`,
        name: c.name,
        viaHighway: c.whyExplanation?.en || c.name.en,
        distanceKm: c.distanceKm,
        durationMinutes: c.durationMinutes,
        geometry: {
          type: 'LineString',
          coordinates: coords,
        },
        status: gisEval.status,
        statusReasons: gisEval.statusReasons,
        steps: (c.turnSteps?.en || []).map((stepText, idx) => ({
          instruction: stepText,
          distanceMeters: Math.round((c.distanceKm / (c.turnSteps?.en?.length || 1)) * 1000),
          durationSeconds: Math.round((c.durationMinutes / (c.turnSteps?.en?.length || 1)) * 60),
          roadName: c.whyExplanation?.en || c.name.en,
          coordinates: coords[idx] || coords[0] || [0, 0],
        })),
        restrictions: gisEval.evaluatedRestrictions,
        roadWidthAssessment: gisEval.roadWidthIntelligence,
        provider: this.name,
      };
    });
  }
}
