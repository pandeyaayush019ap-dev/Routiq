import * as turf from '@turf/turf';
import { config } from '../config/env';

export type PoiCategory =
  | 'fuel'
  | 'parking_rest'
  | 'repair'
  | 'tyres'
  | 'weighbridge'
  | 'food_dhaba'
  | 'lodging'
  | 'emergency'
  | 'toll';

export interface CommercialPoi {
  id: string;
  name: string;
  category: PoiCategory;
  coordinates: [number, number]; // [lon, lat]
  address?: string;
  distanceKm?: number;
  tags?: Record<string, string>;
  openingHours?: string;
  phone?: string;
}

export class PlacesService {
  private cache: Map<string, { data: CommercialPoi[]; expiresAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes cache

  /**
   * Search POIs within a bounding box or around a point
   */
  public async searchNearby(
    lon: number,
    lat: number,
    radiusKm: number = 25,
    categories: PoiCategory[] = ['fuel', 'parking_rest', 'repair', 'weighbridge']
  ): Promise<CommercialPoi[]> {
    const cacheKey = `nearby:${lon.toFixed(3)},${lat.toFixed(3)}:${radiusKm}:${categories.sort().join(',')}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const radiusMeters = radiusKm * 1000;
    // Build Overpass QL query
    const tagQueries: string[] = [];
    if (categories.includes('fuel')) {
      tagQueries.push(`node["amenity"="fuel"](around:${radiusMeters},${lat},${lon});`);
    }
    if (categories.includes('parking_rest')) {
      tagQueries.push(`node["highway"~"rest_area|services"](around:${radiusMeters},${lat},${lon});`);
      tagQueries.push(`node["amenity"="parking"]["hgv"="yes"](around:${radiusMeters},${lat},${lon});`);
    }
    if (categories.includes('repair')) {
      tagQueries.push(`node["shop"~"car_repair|truck_repair"](around:${radiusMeters},${lat},${lon});`);
      tagQueries.push(`node["craft"="mechanic"](around:${radiusMeters},${lat},${lon});`);
    }
    if (categories.includes('tyres')) {
      tagQueries.push(`node["shop"="tyres"](around:${radiusMeters},${lat},${lon});`);
    }
    if (categories.includes('weighbridge')) {
      tagQueries.push(`node["amenity"="weighbridge"](around:${radiusMeters},${lat},${lon});`);
    }
    if (categories.includes('food_dhaba')) {
      tagQueries.push(`node["amenity"~"restaurant|cafe|fast_food"](around:${radiusMeters},${lat},${lon});`);
    }
    if (categories.includes('lodging')) {
      tagQueries.push(`node["tourism"~"hotel|motel"](around:${radiusMeters},${lat},${lon});`);
    }
    if (categories.includes('emergency')) {
      tagQueries.push(`node["amenity"~"hospital|pharmacy"](around:${radiusMeters},${lat},${lon});`);
    }
    if (categories.includes('toll')) {
      tagQueries.push(`node["barrier"="toll_booth"](around:${radiusMeters},${lat},${lon});`);
    }

    const query = `[out:json][timeout:15];(${tagQueries.join('')});out body 40;`;

    try {
      const response = await fetch(config.OVERPASS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (response.ok) {
        const json = (await response.json()) as {
          elements: Array<{
            id: number;
            lat: number;
            lon: number;
            tags?: Record<string, string>;
          }>;
        };

        const originPoint = turf.point([lon, lat]);
        const results: CommercialPoi[] = (json.elements || []).map((el) => {
          const pt = turf.point([el.lon, el.lat]);
          const dist = turf.distance(originPoint, pt, { units: 'kilometers' });
          const cat = this.mapOsmTagsToCategory(el.tags || {});

          return {
            id: `osm_node_${el.id}`,
            name: el.tags?.name || el.tags?.brand || el.tags?.operator || `${this.formatCategoryName(cat)} Facility`,
            category: cat,
            coordinates: [el.lon, el.lat],
            address: [el.tags?.['addr:street'], el.tags?.['addr:city'], el.tags?.['addr:state']].filter(Boolean).join(', ') || undefined,
            distanceKm: Number(dist.toFixed(1)),
            openingHours: el.tags?.opening_hours,
            phone: el.tags?.phone || el.tags?.['contact:phone'],
            tags: el.tags,
          };
        });

        // Sort by closest distance
        results.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));

        this.cache.set(cacheKey, { data: results, expiresAt: Date.now() + this.CACHE_TTL_MS });
        return results;
      }
    } catch (err) {
      console.warn('[PlacesService] Overpass query failed:', err);
    }

    return [];
  }

  /**
   * Search POIs along a planned route LineString (within buffer)
   */
  public async searchAlongRoute(
    routeCoordinates: [number, number][],
    bufferKm: number = 10,
    categories: PoiCategory[] = ['fuel', 'parking_rest', 'repair', 'weighbridge']
  ): Promise<CommercialPoi[]> {
    if (!routeCoordinates || routeCoordinates.length < 2) return [];

    // Sample representative points along the route (e.g. start, midpoint, quarter-points, end)
    const step = Math.max(1, Math.floor(routeCoordinates.length / 4));
    const sampleIndices = [0, step, step * 2, step * 3, routeCoordinates.length - 1];

    const allPoisMap: Map<string, CommercialPoi> = new Map();
    const routeLine = turf.lineString(routeCoordinates);

    for (const idx of sampleIndices) {
      if (idx < routeCoordinates.length) {
        const [lon, lat] = routeCoordinates[idx];
        const pois = await this.searchNearby(lon, lat, bufferKm, categories);
        for (const poi of pois) {
          if (!allPoisMap.has(poi.id)) {
            // Calculate perpendicular distance to the actual route line
            const poiPt = turf.point(poi.coordinates);
            const distFromRouteKm = turf.pointToLineDistance(poiPt, routeLine, { units: 'kilometers' });
            if (distFromRouteKm <= bufferKm) {
              allPoisMap.set(poi.id, {
                ...poi,
                distanceKm: Number(distFromRouteKm.toFixed(1)),
              });
            }
          }
        }
      }
    }

    const finalResults = Array.from(allPoisMap.values());
    finalResults.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
    return finalResults.slice(0, 50); // Limit to top 50
  }

  private mapOsmTagsToCategory(tags: Record<string, string>): PoiCategory {
    if (tags.amenity === 'fuel') return 'fuel';
    if (tags.amenity === 'weighbridge') return 'weighbridge';
    if (tags.barrier === 'toll_booth') return 'toll';
    if (tags.shop === 'tyres') return 'tyres';
    if (tags.shop === 'truck_repair' || tags.shop === 'car_repair' || tags.craft === 'mechanic') return 'repair';
    if (tags.highway === 'rest_area' || tags.highway === 'services' || tags.amenity === 'parking') return 'parking_rest';
    if (tags.tourism === 'hotel' || tags.tourism === 'motel') return 'lodging';
    if (tags.amenity === 'hospital' || tags.amenity === 'pharmacy') return 'emergency';
    if (tags.amenity === 'restaurant' || tags.amenity === 'cafe' || tags.amenity === 'fast_food') return 'food_dhaba';
    return 'parking_rest';
  }

  private formatCategoryName(cat: PoiCategory): string {
    switch (cat) {
      case 'fuel': return 'Fuel & Diesel Station';
      case 'parking_rest': return 'Truck Rest Area';
      case 'repair': return 'Truck Repair Workshop';
      case 'tyres': return 'Tyre Repair & Puncture Shop';
      case 'weighbridge': return 'Weighbridge / Dharam Kanta';
      case 'food_dhaba': return 'Dhaba & Restaurant';
      case 'lodging': return 'Driver Lodge / Hotel';
      case 'emergency': return 'Medical Emergency / Hospital';
      case 'toll': return 'Toll Plaza';
    }
  }
}

export const placesService = new PlacesService();
