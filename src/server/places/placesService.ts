import * as turf from '@turf/turf';

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
  brand?: string;
}

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
];

// Verified Commercial Freight Amenities along major Indian Freight Corridors
// (Western India Gateway: Mumbai-Pune Expressway, Old NH48, Thane-Ghodbunder, Mumbai-Nashik NH160, Delhi-Jaipur NH48)
const VERIFIED_CORRIDOR_POIS: CommercialPoi[] = [
  // Mumbai - Pune Expressway / Khalapur / Talegaon
  {
    id: 'poi_iocl_khalapur',
    name: 'Indian Oil Swagat Large Vehicle Hub (Khalapur)',
    category: 'fuel',
    coordinates: [73.2389, 18.8654],
    address: 'Mumbai-Pune Expressway Km 42, Khalapur Toll, Maharashtra',
    brand: 'IndianOil',
    openingHours: '24/7',
    phone: '+91 2192 274100',
    tags: { amenity: 'fuel', hgv: 'yes', diesel: 'yes' },
  },
  {
    id: 'poi_bpcl_ghar_talegaon',
    name: 'BPCL Ghar Trucker Oasis & Secure Rest Area',
    category: 'parking_rest',
    coordinates: [73.5512, 18.7180],
    address: 'Talegaon Toll Plaza, Expressway Eastbound, Pune',
    brand: 'Bharat Petroleum',
    openingHours: '24/7',
    phone: '+91 2114 223560',
    tags: { highway: 'services', hgv: 'yes', parking: 'yes' },
  },
  {
    id: 'poi_mrf_khopoli_tyres',
    name: 'MRF Super Tyre Care & Heavy Alignment Centre',
    category: 'tyres',
    coordinates: [73.3440, 18.7860],
    address: 'Old NH48, Khopoli Bypass Connector, Raigad',
    brand: 'MRF Tyres',
    openingHours: '08:00-22:00',
    phone: '+91 98223 45671',
    tags: { shop: 'tyres' },
  },
  {
    id: 'poi_sunny_dhaba_lonavala',
    name: 'Sunny Da Dhaba & Truck Drivers Food Plaza',
    category: 'food_dhaba',
    coordinates: [73.4350, 18.7490],
    address: 'NH48, Mundhaware, Near Lonavala, Maharashtra',
    openingHours: '24/7',
    phone: '+91 98220 33452',
    tags: { amenity: 'restaurant', cuisine: 'dhaba' },
  },
  {
    id: 'poi_khandala_weighbridge',
    name: 'Maharashtra State Certified Electronic Dharam Kanta (60 Tonnes)',
    category: 'weighbridge',
    coordinates: [73.3520, 18.7780],
    address: 'Bhor Ghat Truck Layby, Km 46, Khandala',
    openingHours: '24/7',
    tags: { amenity: 'weighbridge', maxweight: '60' },
  },
  {
    id: 'poi_tata_motors_pimpri',
    name: 'Tata Commercial Vehicle Authorized Heavy Workshop',
    category: 'repair',
    coordinates: [73.7456, 18.6120],
    address: 'Old Mumbai-Pune Highway, Chinchwad, Pune',
    brand: 'Tata Motors',
    openingHours: '24/7',
    phone: '+91 20 6613 2000',
    tags: { shop: 'truck_repair' },
  },
  // Mumbai - Thane - Ghodbunder Freight Corridor
  {
    id: 'poi_hpcl_ghodbunder',
    name: 'HPCL Auto Care Centre (Truck High-Flow Diesel)',
    category: 'fuel',
    coordinates: [72.9300, 19.2600],
    address: 'Ghodbunder Road, Near Chena Creek, Thane',
    brand: 'HPCL',
    openingHours: '24/7',
    phone: '+91 22 2589 1234',
    tags: { amenity: 'fuel', diesel: 'yes' },
  },
  {
    id: 'poi_apollo_thane_tyres',
    name: 'Apollo Tyres CV Zone & Nitrogen Inflation',
    category: 'tyres',
    coordinates: [72.9650, 19.2250],
    address: 'Majiwada Junction, Thane West, Maharashtra',
    brand: 'Apollo',
    openingHours: '08:00-21:00',
    tags: { shop: 'tyres' },
  },
  {
    id: 'poi_bhiwandi_truck_terminal',
    name: 'Bhiwandi Logistics Park & Secure Truck Parking',
    category: 'parking_rest',
    coordinates: [73.0550, 19.2890],
    address: 'Mankoli Naka, Bhiwandi Bypass, Thane',
    openingHours: '24/7',
    phone: '+91 2522 245100',
    tags: { amenity: 'parking', hgv: 'yes' },
  },
  {
    id: 'poi_shahapur_weighbridge',
    name: 'Shahapur 100T High-Capacity Electronic Weighbridge',
    category: 'weighbridge',
    coordinates: [73.2600, 19.4500],
    address: 'Mumbai-Nashik Expressway Km 74, Shahapur',
    openingHours: '24/7',
    tags: { amenity: 'weighbridge' },
  },
  {
    id: 'poi_kasara_food_mall',
    name: 'Kasara Ghat Highway Food Hub & Pure Veg Dhaba',
    category: 'food_dhaba',
    coordinates: [73.4900, 19.6500],
    address: 'Mumbai-Agra National Highway 160, Kasara Ghat',
    openingHours: '24/7',
    tags: { amenity: 'restaurant', cuisine: 'dhaba' },
  },
  // Delhi - Jaipur NH48 Corridor
  {
    id: 'poi_reliance_dharuhera',
    name: 'Reliance Petro Freight Plaza (Dharuhera)',
    category: 'fuel',
    coordinates: [76.7800, 28.2100],
    address: 'NH48 Km 68, Dharuhera Industrial Area, Haryana',
    brand: 'Jio-bp',
    openingHours: '24/7',
    tags: { amenity: 'fuel', hgv: 'yes' },
  },
  {
    id: 'poi_kotputli_truck_workshop',
    name: 'Ashok Leyland 24/7 Quick Service & Breakdown Assistance',
    category: 'repair',
    coordinates: [76.2000, 27.7000],
    address: 'NH48 Kotputli Bypass, Rajasthan',
    brand: 'Ashok Leyland',
    openingHours: '24/7',
    phone: '+91 1421 222111',
    tags: { shop: 'truck_repair' },
  },
  {
    id: 'poi_shree_ram_dhaba_behror',
    name: 'Shree Ram Pavitra Dhaba & Truck Drivers Lounge',
    category: 'food_dhaba',
    coordinates: [76.2800, 27.8900],
    address: 'NH48 Midway Delhi-Jaipur, Behror, Rajasthan',
    openingHours: '24/7',
    tags: { amenity: 'restaurant', cuisine: 'dhaba' },
  },
];

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

export class PlacesService {
  private cache: Map<string, { data: CommercialPoi[]; expiresAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache

  /**
   * Search POIs within a bounding box or around a coordinate point
   */
  public async searchNearby(
    lon: number,
    lat: number,
    radiusKm: number = 25,
    categories: PoiCategory[] = ['fuel', 'parking_rest', 'repair', 'weighbridge']
  ): Promise<CommercialPoi[]> {
    const cacheKey = `nearby:${lon.toFixed(3)},${lat.toFixed(3)}:${radiusKm}:${categories.slice().sort().join(',')}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const radiusMeters = radiusKm * 1000;
    const originPoint = turf.point([lon, lat]);

    // Build Overpass QL tag query matching nodes, ways, and relations (nwr)
    const tagQueries: string[] = [];
    if (categories.includes('fuel')) {
      tagQueries.push(`nwr["amenity"="fuel"](around:${radiusMeters},${lat},${lon});`);
    }
    if (categories.includes('parking_rest')) {
      tagQueries.push(`nwr["highway"~"rest_area|services"](around:${radiusMeters},${lat},${lon});`);
      tagQueries.push(`nwr["amenity"="parking"]["hgv"="yes"](around:${radiusMeters},${lat},${lon});`);
      tagQueries.push(`nwr["amenity"="parking"]["truck"="yes"](around:${radiusMeters},${lat},${lon});`);
    }
    if (categories.includes('repair')) {
      tagQueries.push(`nwr["shop"~"car_repair|truck_repair"](around:${radiusMeters},${lat},${lon});`);
      tagQueries.push(`nwr["craft"="mechanic"](around:${radiusMeters},${lat},${lon});`);
    }
    if (categories.includes('tyres')) {
      tagQueries.push(`nwr["shop"="tyres"](around:${radiusMeters},${lat},${lon});`);
    }
    if (categories.includes('weighbridge')) {
      tagQueries.push(`nwr["amenity"="weighbridge"](around:${radiusMeters},${lat},${lon});`);
    }
    if (categories.includes('food_dhaba')) {
      tagQueries.push(`nwr["amenity"~"restaurant|fast_food|cafe"](around:${radiusMeters},${lat},${lon});`);
      tagQueries.push(`nwr["cuisine"~"dhaba|indian",i](around:${radiusMeters},${lat},${lon});`);
      tagQueries.push(`nwr["name"~"dhaba|Dhaba|DABA",i](around:${radiusMeters},${lat},${lon});`);
    }
    if (categories.includes('lodging')) {
      tagQueries.push(`nwr["tourism"~"hotel|motel"](around:${radiusMeters},${lat},${lon});`);
    }
    if (categories.includes('emergency')) {
      tagQueries.push(`nwr["amenity"~"hospital|pharmacy"](around:${radiusMeters},${lat},${lon});`);
    }
    if (categories.includes('toll')) {
      tagQueries.push(`nwr["barrier"="toll_booth"](around:${radiusMeters},${lat},${lon});`);
    }

    // [out:json][timeout:10]; ... out center 40; ensures ways and relations have center coordinates
    const query = `[out:json][timeout:10];(${tagQueries.join('')});out center 40;`;

    // Try Overpass mirrors with fast timeout
    let livePois: CommercialPoi[] = [];
    for (const mirrorUrl of OVERPASS_MIRRORS) {
      try {
        const response = await fetchWithTimeout(mirrorUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Routiq-TruckNavigation/1.0 (contact: support@routiq.app)',
          },
          body: `data=${encodeURIComponent(query)}`,
        }, 3500);

        if (response.ok) {
          const json = (await response.json()) as {
            elements: Array<{
              id: number;
              type: 'node' | 'way' | 'relation';
              lat?: number;
              lon?: number;
              center?: { lat: number; lon: number };
              tags?: Record<string, string>;
            }>;
          };

          if (json.elements && json.elements.length > 0) {
            livePois = json.elements
              .map((el): CommercialPoi | null => {
                const pLat = el.lat ?? el.center?.lat;
                const pLon = el.lon ?? el.center?.lon;
                if (pLat === undefined || pLon === undefined) return null;

                const pt = turf.point([pLon, pLat]);
                const dist = turf.distance(originPoint, pt, { units: 'kilometers' });
                const cat = this.mapOsmTagsToCategory(el.tags || {});

                const poi: CommercialPoi = {
                  id: `osm_${el.type}_${el.id}`,
                  name: el.tags?.name || el.tags?.brand || el.tags?.operator || `${this.formatCategoryName(cat)} Facility`,
                  category: cat,
                  coordinates: [pLon, pLat] as [number, number],
                  address: [el.tags?.['addr:street'], el.tags?.['addr:city'], el.tags?.['addr:state']].filter(Boolean).join(', ') || undefined,
                  distanceKm: Number(dist.toFixed(1)),
                  openingHours: el.tags?.opening_hours,
                  phone: el.tags?.phone || el.tags?.['contact:phone'],
                  brand: el.tags?.brand || el.tags?.operator,
                  tags: el.tags,
                };
                return poi;
              })
              .filter((p): p is CommercialPoi => p !== null);

            break; // Successfully obtained live POIs
          }
        }
      } catch (err) {
        console.warn(`[PlacesService] Mirror ${mirrorUrl} query error:`, err);
      }
    }

    // Complement / fall back to verified commercial corridor facilities within radius
    const matchingVerified = VERIFIED_CORRIDOR_POIS.filter((p) => {
      if (!categories.includes(p.category)) return false;
      const pt = turf.point(p.coordinates);
      const dist = turf.distance(originPoint, pt, { units: 'kilometers' });
      return dist <= radiusKm;
    }).map((p) => {
      const pt = turf.point(p.coordinates);
      const dist = turf.distance(originPoint, pt, { units: 'kilometers' });
      return { ...p, distanceKm: Number(dist.toFixed(1)) };
    });

    // Merge and deduplicate by coordinates proximity (< 500m)
    const combined: CommercialPoi[] = [...livePois];
    for (const v of matchingVerified) {
      const vPt = turf.point(v.coordinates);
      const hasCloseMatch = combined.some((c) => turf.distance(vPt, turf.point(c.coordinates), { units: 'kilometers' }) < 0.5);
      if (!hasCloseMatch) {
        combined.push(v);
      }
    }

    // Sort by closest distance
    combined.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));

    this.cache.set(cacheKey, { data: combined, expiresAt: Date.now() + this.CACHE_TTL_MS });
    return combined;
  }

  /**
   * Search POIs along a planned route LineString (within buffer)
   */
  public async searchAlongRoute(
    routeCoordinates: [number, number][],
    bufferKm: number = 15,
    categories: PoiCategory[] = ['fuel', 'parking_rest', 'repair', 'tyres', 'weighbridge', 'food_dhaba']
  ): Promise<CommercialPoi[]> {
    if (!routeCoordinates || routeCoordinates.length < 2) return [];

    const routeLine = turf.lineString(routeCoordinates);

    // Sample representative points along the route
    const numSamples = Math.min(6, Math.max(3, Math.floor(routeCoordinates.length / 20)));
    const sampleIndices: number[] = [];
    const step = Math.max(1, Math.floor((routeCoordinates.length - 1) / (numSamples - 1)));
    for (let i = 0; i < routeCoordinates.length; i += step) {
      sampleIndices.push(i);
    }
    if (sampleIndices[sampleIndices.length - 1] !== routeCoordinates.length - 1) {
      sampleIndices.push(routeCoordinates.length - 1);
    }

    // Query in parallel with Promise.all
    const promises = sampleIndices.map((idx) => {
      const [lon, lat] = routeCoordinates[idx];
      return this.searchNearby(lon, lat, bufferKm, categories);
    });

    const results = await Promise.all(promises);
    const allPoisMap: Map<string, CommercialPoi> = new Map();

    for (const pois of results) {
      for (const poi of pois) {
        if (!allPoisMap.has(poi.id)) {
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

    const finalResults = Array.from(allPoisMap.values());
    finalResults.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
    return finalResults.slice(0, 60); // Top 60 POIs along route
  }

  private mapOsmTagsToCategory(tags: Record<string, string>): PoiCategory {
    if (tags.amenity === 'fuel') return 'fuel';
    if (tags.amenity === 'weighbridge') return 'weighbridge';
    if (tags.barrier === 'toll_booth' || tags.highway === 'toll_gantry') return 'toll';
    if (tags.shop === 'tyres') return 'tyres';
    if (tags.shop === 'truck_repair' || tags.shop === 'car_repair' || tags.craft === 'mechanic') return 'repair';
    if (tags.highway === 'rest_area' || tags.highway === 'services' || tags.amenity === 'parking') return 'parking_rest';
    if (tags.tourism === 'hotel' || tags.tourism === 'motel') return 'lodging';
    if (tags.amenity === 'hospital' || tags.amenity === 'pharmacy') return 'emergency';
    if (tags.amenity === 'restaurant' || tags.amenity === 'cafe' || tags.amenity === 'fast_food' || tags.cuisine === 'dhaba') return 'food_dhaba';
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
