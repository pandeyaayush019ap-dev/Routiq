import { Router, Request, Response } from 'express';
import { placesService, PoiCategory } from '../places/placesService';

export const placesRouter = Router();

// GET /api/places/nearby
placesRouter.get('/places/nearby', async (req: Request, res: Response) => {
  const lat = parseFloat(String(req.query.lat));
  const lon = parseFloat(String(req.query.lon || req.query.lng));
  const radiusKm = parseFloat(String(req.query.radiusKm || req.query.radius || '25'));
  const categoriesQuery = req.query.categories || req.query.category;

  if (isNaN(lat) || isNaN(lon)) {
    res.status(400).json({ error: 'INVALID_COORDINATES', message: 'Valid "lat" and "lon" required.' });
    return;
  }

  let categories: PoiCategory[] = ['fuel', 'parking_rest', 'repair', 'weighbridge'];
  if (typeof categoriesQuery === 'string') {
    categories = categoriesQuery.split(',') as PoiCategory[];
  }

  try {
    const places = await placesService.searchNearby(lon, lat, radiusKm, categories);
    res.json({ count: places.length, places });
  } catch (err) {
    console.error('[PlacesRouter] Nearby places error:', err);
    res.status(500).json({ error: 'POI_SEARCH_FAILED', message: 'Failed to search nearby commercial facilities.' });
  }
});

// POST /api/places/along-route
placesRouter.post('/places/along-route', async (req: Request, res: Response) => {
  const { coordinates, bufferKm, categories } = req.body;

  if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
    res.status(400).json({ error: 'INVALID_COORDINATES', message: 'Route LineString coordinates required.' });
    return;
  }

  const buf = typeof bufferKm === 'number' ? bufferKm : 10;
  const cats: PoiCategory[] = Array.isArray(categories) && categories.length > 0
    ? categories
    : ['fuel', 'parking_rest', 'repair', 'weighbridge', 'food_dhaba'];

  try {
    const places = await placesService.searchAlongRoute(coordinates, buf, cats);
    res.json({ count: places.length, places });
  } catch (err) {
    console.error('[PlacesRouter] Along route places error:', err);
    res.status(500).json({ error: 'ROUTE_POI_FAILED', message: 'Failed to search places along route.' });
  }
});
