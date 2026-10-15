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

const KNOWN_INDIAN_LOCATIONS: Array<{
  names: string[];
  en: string;
  hi: string;
  coordinates: [number, number];
  city: string;
  state: string;
}> = [
  { names: ['pune', 'poona', 'पुणे'], en: 'Pune', hi: 'पुणे', coordinates: [73.8567, 18.5204], city: 'Pune', state: 'Maharashtra' },
  { names: ['mumbai', 'bombay', 'मुंबई'], en: 'Mumbai', hi: 'मुंबई', coordinates: [72.8777, 19.0760], city: 'Mumbai', state: 'Maharashtra' },
  { names: ['navi mumbai', 'vashi', 'वाशी', 'नवी मुंबई'], en: 'Navi Mumbai', hi: 'नवी मुंबई', coordinates: [72.9982, 19.0771], city: 'Navi Mumbai', state: 'Maharashtra' },
  { names: ['thane', 'ठाणे'], en: 'Thane', hi: 'ठाणे', coordinates: [72.9781, 19.2183], city: 'Thane', state: 'Maharashtra' },
  { names: ['dahisar', 'दहिसर'], en: 'Dahisar', hi: 'दहिसर', coordinates: [72.8599, 19.2496], city: 'Mumbai Suburban', state: 'Maharashtra' },
  { names: ['kalyan', 'कल्याण'], en: 'Kalyan', hi: 'कल्याण', coordinates: [73.1305, 19.2403], city: 'Thane', state: 'Maharashtra' },
  { names: ['panvel', 'पनवेल'], en: 'Panvel', hi: 'पनवेल', coordinates: [73.1099, 18.9894], city: 'Raigad', state: 'Maharashtra' },
  { names: ['lonavala', 'लोनावला'], en: 'Lonavala', hi: 'लोनावला', coordinates: [73.4072, 18.7557], city: 'Pune', state: 'Maharashtra' },
  { names: ['khopoli', 'खोपोली'], en: 'Khopoli', hi: 'खोपोली', coordinates: [73.3421, 18.7845], city: 'Raigad', state: 'Maharashtra' },
  { names: ['nashik', 'nasik', 'नासिक', 'नाशिक'], en: 'Nashik', hi: 'नासिक', coordinates: [73.7898, 19.9975], city: 'Nashik', state: 'Maharashtra' },
  { names: ['delhi', 'new delhi', 'दिल्ली', 'नई दिल्ली'], en: 'Delhi', hi: 'दिल्ली', coordinates: [77.1025, 28.7041], city: 'New Delhi', state: 'Delhi NCR' },
  { names: ['jaipur', 'जयपुर'], en: 'Jaipur', hi: 'जयपुर', coordinates: [75.7873, 26.9124], city: 'Jaipur', state: 'Rajasthan' },
  { names: ['ahmedabad', 'अहमदाबाद'], en: 'Ahmedabad', hi: 'अहमदाबाद', coordinates: [72.5714, 23.0225], city: 'Ahmedabad', state: 'Gujarat' },
  { names: ['surat', 'सूरत'], en: 'Surat', hi: 'सूरत', coordinates: [72.8311, 21.1702], city: 'Surat', state: 'Gujarat' },
  { names: ['vadodara', 'बड़ौदा', 'वडोदरा'], en: 'Vadodara', hi: 'वडोदरा', coordinates: [73.1812, 22.3072], city: 'Vadodara', state: 'Gujarat' },
  { names: ['nagpur', 'नागपुर'], en: 'Nagpur', hi: 'नागपुर', coordinates: [79.0882, 21.1458], city: 'Nagpur', state: 'Maharashtra' },
  { names: ['bengaluru', 'bangalore', 'बेंगलुरु'], en: 'Bengaluru', hi: 'बेंगलुरु', coordinates: [77.5946, 12.9716], city: 'Bengaluru', state: 'Karnataka' },
  { names: ['hyderabad', 'हैदराबाद'], en: 'Hyderabad', hi: 'हैदराबाद', coordinates: [78.4867, 17.3850], city: 'Hyderabad', state: 'Telangana' },
  { names: ['chennai', 'मद्रास', 'चेन्नई'], en: 'Chennai', hi: 'चेन्नई', coordinates: [80.2707, 13.0827], city: 'Chennai', state: 'Tamil Nadu' },
  { names: ['kolkata', 'calcutta', 'कोलकाता'], en: 'Kolkata', hi: 'कोलकाता', coordinates: [88.3639, 22.5726], city: 'Kolkata', state: 'West Bengal' },
  { names: ['indore', 'इंदौर'], en: 'Indore', hi: 'इंदौर', coordinates: [75.8577, 22.7196], city: 'Indore', state: 'Madhya Pradesh' },
  { names: ['bhopal', 'भोपाल'], en: 'Bhopal', hi: 'भोपाल', coordinates: [77.4126, 23.2599], city: 'Bhopal', state: 'Madhya Pradesh' },
  { names: ['lucknow', 'लखनऊ'], en: 'Lucknow', hi: 'लखनऊ', coordinates: [80.9462, 26.8467], city: 'Lucknow', state: 'Uttar Pradesh' },
  { names: ['kanpur', 'कानपुर'], en: 'Kanpur', hi: 'कानपुर', coordinates: [80.3319, 26.4499], city: 'Kanpur', state: 'Uttar Pradesh' },
  { names: ['agra', 'आगरा'], en: 'Agra', hi: 'आगरा', coordinates: [78.0081, 27.1767], city: 'Agra', state: 'Uttar Pradesh' },
  { names: ['chandigarh', 'चंडीगढ़'], en: 'Chandigarh', hi: 'चंडीगढ़', coordinates: [76.7794, 30.7333], city: 'Chandigarh', state: 'Punjab / Haryana' },
  { names: ['ludhiana', 'लुधियाना'], en: 'Ludhiana', hi: 'लुधियाना', coordinates: [75.8573, 30.9010], city: 'Ludhiana', state: 'Punjab' },
  { names: ['varanasi', 'बनारस', 'वाराणसी'], en: 'Varanasi', hi: 'वाराणसी', coordinates: [82.9739, 25.3176], city: 'Varanasi', state: 'Uttar Pradesh' },
  { names: ['patna', 'पटना'], en: 'Patna', hi: 'पटना', coordinates: [85.1376, 25.5941], city: 'Patna', state: 'Bihar' },
  { names: ['jnpt', 'nhava sheva', 'न्हावा शेवा'], en: 'JNPT Port (Nhava Sheva)', hi: 'जेएनपीटी बंदरगाह', coordinates: [72.9511, 18.9496], city: 'Navi Mumbai', state: 'Maharashtra' },
];

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 2500): Promise<Response> {
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

export class GeocodingService {
  private cache: Map<string, { data: GeocodedPlace[]; expiresAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  /**
   * Search for locations in India using Photon (OSM-based geocoding) with fast local dictionary & Nominatim fallback
   */
  public async searchPlaces(query: string, limit: number = 8): Promise<GeocodedPlace[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery || cleanQuery.length < 2) return [];

    const cacheKey = `search:${cleanQuery.toLowerCase()}:${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const lowerQuery = cleanQuery.toLowerCase();

    // 1. Fast Local Match for major Indian freight cities/transport hubs
    const matchedKnown = KNOWN_INDIAN_LOCATIONS.filter((k) =>
      k.names.some((alias) => lowerQuery.includes(alias) || alias.includes(lowerQuery))
    );

    if (matchedKnown.length > 0) {
      const directPlaces: GeocodedPlace[] = matchedKnown.slice(0, limit).map((k, idx) => ({
        id: `known_${k.en.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${idx}`,
        name: { en: k.en, hi: k.hi },
        formattedAddress: `${k.en}, ${k.city}, ${k.state}, India`,
        coordinates: k.coordinates,
        city: k.city,
        state: k.state,
        country: 'India',
        type: 'city',
      }));

      // Cache and return known matches immediately
      this.cache.set(cacheKey, { data: directPlaces, expiresAt: Date.now() + this.CACHE_TTL_MS });
      return directPlaces;
    }

    // 2. Primary Remote: Photon (OSM Search API optimized for autocomplete)
    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&limit=${limit}&lat=20.5937&lon=78.9629`;
      const res = await fetchWithTimeout(url, {
        headers: { 'User-Agent': 'Routiq-HeavyTruckRouting/1.0 (contact: support@routiq.app)' },
      }, 2500);

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
                hi: nameEn,
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
      console.warn('[GeocodingService] Photon search timed out/failed, trying Nominatim:', err);
    }

    // 3. Fallback Remote: Nominatim
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanQuery)}&format=json&countrycodes=in&limit=${limit}&addressdetails=1`;
      const nomRes = await fetchWithTimeout(nomUrl, {
        headers: { 'User-Agent': 'Routiq-HeavyTruckRouting/1.0 (contact: support@routiq.app)' },
      }, 2500);

      if (nomRes.ok) {
        const nomJson = (await nomRes.json()) as Array<{
          place_id: number;
          display_name: string;
          lat: string;
          lon: string;
          address?: { city?: string; state?: string; country?: string };
        }>;

        if (nomJson && nomJson.length > 0) {
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
      }
    } catch (err) {
      console.warn('[GeocodingService] Nominatim fallback timed out/failed:', err);
    }

    // 4. Fallback: Return best effort from known locations if any substring matches
    const fuzzyMatches = KNOWN_INDIAN_LOCATIONS.filter((k) =>
      cleanQuery.split(' ').some((word) => word.length >= 3 && k.en.toLowerCase().includes(word.toLowerCase()))
    );

    if (fuzzyMatches.length > 0) {
      return fuzzyMatches.slice(0, limit).map((k, idx) => ({
        id: `fuzzy_${k.en.toLowerCase()}_${idx}`,
        name: { en: k.en, hi: k.hi },
        formattedAddress: `${k.en}, ${k.state}, India`,
        coordinates: k.coordinates,
        city: k.city,
        state: k.state,
        country: 'India',
        type: 'city',
      }));
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

    // 1. Check known locations within ~20km (approx 0.2 deg lat/lon)
    const nearbyKnown = KNOWN_INDIAN_LOCATIONS.find((k) => {
      const dLon = Math.abs(k.coordinates[0] - lon);
      const dLat = Math.abs(k.coordinates[1] - lat);
      return dLon < 0.2 && dLat < 0.2;
    });

    if (nearbyKnown) {
      const place: GeocodedPlace = {
        id: `known_rev_${nearbyKnown.en.toLowerCase()}`,
        name: { en: nearbyKnown.en, hi: nearbyKnown.hi },
        formattedAddress: `${nearbyKnown.en}, ${nearbyKnown.state}, India`,
        coordinates: [lon, lat],
        city: nearbyKnown.city,
        state: nearbyKnown.state,
        country: 'India',
      };
      this.cache.set(cacheKey, { data: [place], expiresAt: Date.now() + this.CACHE_TTL_MS });
      return place;
    }

    // 2. Query Photon with timeout
    try {
      const url = `https://photon.komoot.io/reverse?lon=${lon}&lat=${lat}`;
      const res = await fetchWithTimeout(url, {
        headers: { 'User-Agent': 'Routiq-HeavyTruckRouting/1.0 (contact: support@routiq.app)' },
      }, 2500);

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
      console.warn('[GeocodingService] Reverse geocode remote query timed out/failed:', err);
    }

    // 3. Fallback coordinate address
    const defaultPlace: GeocodedPlace = {
      id: `coord_${lon.toFixed(4)}_${lat.toFixed(4)}`,
      name: { en: `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`, hi: `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E` },
      formattedAddress: `Location at ${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E, India`,
      coordinates: [lon, lat],
      country: 'India',
    };
    return defaultPlace;
  }
}

export const geocodingService = new GeocodingService();
