import { Router, Request, Response } from 'express';
import { geocodingService } from '../geocoding/geocodingService';

export const geocodingRouter = Router();

// GET or POST /api/geocoding/search
geocodingRouter.get('/geocoding/search', async (req: Request, res: Response) => {
  const q = String(req.query.q || req.query.query || '').trim();
  const limit = parseInt(String(req.query.limit || '8'), 10);

  if (!q) {
    res.status(400).json({ error: 'QUERY_REQUIRED', message: 'Query parameter "q" is required.' });
    return;
  }

  try {
    const places = await geocodingService.searchPlaces(q, limit);
    res.json({ query: q, count: places.length, places });
  } catch (err) {
    console.error('[GeocodingRouter] Search error:', err);
    res.status(500).json({ error: 'GEOCODING_FAILED', message: 'Geocoding search failed.' });
  }
});

geocodingRouter.post('/geocoding/search', async (req: Request, res: Response) => {
  const q = String(req.body.q || req.body.query || '').trim();
  const limit = parseInt(String(req.body.limit || '8'), 10);

  if (!q) {
    res.status(400).json({ error: 'QUERY_REQUIRED', message: 'Search query "q" is required.' });
    return;
  }

  try {
    const places = await geocodingService.searchPlaces(q, limit);
    res.json({ query: q, count: places.length, places });
  } catch (err) {
    console.error('[GeocodingRouter] Search error:', err);
    res.status(500).json({ error: 'GEOCODING_FAILED', message: 'Geocoding search failed.' });
  }
});

// GET /api/geocoding/reverse
geocodingRouter.get('/geocoding/reverse', async (req: Request, res: Response) => {
  const lat = parseFloat(String(req.query.lat));
  const lon = parseFloat(String(req.query.lon || req.query.lng));

  if (isNaN(lat) || isNaN(lon)) {
    res.status(400).json({ error: 'INVALID_COORDINATES', message: 'Valid "lat" and "lon" are required.' });
    return;
  }

  try {
    const place = await geocodingService.reverseGeocode(lon, lat);
    if (!place) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'No location found for given coordinates.' });
      return;
    }
    res.json(place);
  } catch (err) {
    console.error('[GeocodingRouter] Reverse geocode error:', err);
    res.status(500).json({ error: 'REVERSE_GEOCODING_FAILED', message: 'Reverse geocoding failed.' });
  }
});
