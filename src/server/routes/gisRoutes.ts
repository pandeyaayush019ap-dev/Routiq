import { Router, Request, Response } from 'express';
import { VERIFIED_FREIGHT_RESTRICTIONS } from '../gis/knownRestrictions';
import { spatialEngine } from '../gis/spatialEngine';

export const gisRouter = Router();

// GET /api/gis/restrictions - List all verified freight restriction hotspots
gisRouter.get('/gis/restrictions', (_req: Request, res: Response) => {
  res.json({
    count: VERIFIED_FREIGHT_RESTRICTIONS.length,
    restrictions: VERIFIED_FREIGHT_RESTRICTIONS,
  });
});

// POST /api/gis/evaluate-line - Evaluate any GeoJSON coordinates against spatial constraints
gisRouter.post('/gis/evaluate-line', (req: Request, res: Response) => {
  const { coordinates, vehicle, departureTime } = req.body;

  if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
    res.status(400).json({ error: 'INVALID_COORDINATES', message: 'GeoJSON coordinates array required.' });
    return;
  }

  if (!vehicle || typeof vehicle.heightMeters !== 'number') {
    res.status(400).json({ error: 'INVALID_VEHICLE', message: 'Vehicle specifications with heightMeters required.' });
    return;
  }

  try {
    const evaluation = spatialEngine.evaluateRoute(coordinates, vehicle, departureTime);
    res.json(evaluation);
  } catch (err) {
    console.error('[GisRouter] Spatial evaluation error:', err);
    res.status(500).json({ error: 'EVALUATION_FAILED', message: 'Spatial evaluation failed.' });
  }
});
