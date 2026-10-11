export interface GeocodedPlace {
  id: string;
  name: { en: string; hi: string };
  formattedAddress: string;
  coordinates: [number, number]; // [lon, lat]
  city?: string;
  state?: string;
  country: string;
  type?: string;
}

export class GeocodingService {
  private cache: Map<string, { data: GeocodedPlace[]; expiresAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  /**
   * Search for locations in India using Photon (OSM-based geocoding)
   */
  public async searchPlaces(query: string, limit: number = 8): Promise<GeocodedPlace[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery || cleanQuery.length < 2) return [];

    const cacheKey = `search:${cleanQuery.toLowerCase()}:${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    try {
      // 1. Primary: Photon (OSM Search API optimized for autocomplete)
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&limit=${limit}&lat=20.5937&lon=78.9629`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Routiq-HeavyTruckRouting/1.0 (contact: support@routiq.app)' },
      });

      if (res.ok) {
        const json = (await res.json()) as {
          features: Array<{
            geometry: { coordinates: [number, number] };
            properties: {
              name?: string;
              city?: string;
              state?: string;
              country?: string;
              street?: string;
              osm_value?: string;
            };
          }>;
        };

        if (json.features && json.features.length > 0) {
          const places: GeocodedPlace[] = json.features.map((f, i) => {
            const props = f.properties;
            const nameEn = props.name || props.city || cleanQuery;
            const state = props.state || '';
            const city = props.city || props.name || '';
            const formatted = [props.name, props.city, props.state, props.country]
              .filter(Boolean)
              .join(', ');

            return {
              id: `geo_photon_${Date.now()}_${i}`,
              name: {
                en: nameEn,
                hi: nameEn, // Can be matched against known Indian cities
              },
              formattedAddress: formatted,
              coordinates: f.geometry.coordinates,
              city,
              state,
              country: props.country || 'India',
              type: props.osm_value,
            };
          });

          this.cache.set(cacheKey, { data: places, expiresAt: Date.now() + this.CACHE_TTL_MS });
          return places;
        }
      }
    } catch (err) {
      console.warn('[GeocodingService] Photon search failed, falling back to Nominatim:', err);
    }

    // 2. Fallback: Nominatim (strict 1 req/sec guidelines respected)
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanQuery)}&format=json&countrycodes=in&limit=${limit}&addressdetails=1`;
      const nomRes = await fetch(nomUrl, {
        headers: { 'User-Agent': 'Routiq-HeavyTruckRouting/1.0 (contact: support@routiq.app)' },
      });

      if (nomRes.ok) {
        const nomJson = (await nomRes.json()) as Array<{
          place_id: number;
          display_name: string;
          lat: string;
          lon: string;
          address?: { city?: string; state?: string; country?: string };
        }>;

        const results: GeocodedPlace[] = nomJson.map((item) => ({
          id: `geo_nom_${item.place_id}`,
          name: {
            en: item.display_name.split(',')[0],
            hi: item.display_name.split(',')[0],
          },
          formattedAddress: item.display_name,
          coordinates: [parseFloat(item.lon), parseFloat(item.lat)],
          city: item.address?.city,
          state: item.address?.state,
          country: item.address?.country || 'India',
        }));

        this.cache.set(cacheKey, { data: results, expiresAt: Date.now() + this.CACHE_TTL_MS });
        return results;
      }
    } catch (err) {
      console.error('[GeocodingService] Nominatim fallback failed:', err);
    }

    return [];
  }

  /**
   * Reverse Geocode coordinates to place address
   */
  public async reverseGeocode(lon: number, lat: number): Promise<GeocodedPlace | null> {
    const cacheKey = `rev:${lon.toFixed(4)},${lat.toFixed(4)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() && cached.data[0]) {
      return cached.data[0];
    }

    try {
      const url = `https://photon.komoot.io/reverse?lon=${lon}&lat=${lat}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Routiq-HeavyTruckRouting/1.0' },
      });

      if (res.ok) {
        const json = (await res.json()) as {
          features: Array<{
            geometry: { coordinates: [number, number] };
            properties: { name?: string; city?: string; state?: string; country?: string };
          }>;
        };

        if (json.features && json.features[0]) {
          const props = json.features[0].properties;
          const name = props.name || props.city || 'Selected Location';
          const place: GeocodedPlace = {
            id: `rev_${Date.now()}`,
            name: { en: name, hi: name },
            formattedAddress: [props.name, props.city, props.state, props.country].filter(Boolean).join(', '),
            coordinates: [lon, lat],
            city: props.city,
            state: props.state,
            country: props.country || 'India',
          };
          this.cache.set(cacheKey, { data: [place], expiresAt: Date.now() + this.CACHE_TTL_MS });
          return place;
        }
      }
    } catch (err) {
      console.warn('[GeocodingService] Reverse geocode failed:', err);
    }

    return null;
  }
}

export const geocodingService = new GeocodingService();
