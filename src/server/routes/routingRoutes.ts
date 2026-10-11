import { Router, Response } from 'express';
import { routingService } from '../routing/routingService';
import { RouteRequestParams } from '../routing/types';
import { spatialEngine } from '../gis/spatialEngine';
import { optionalAuth, AuthenticatedRequest } from '../middleware/authMiddleware';
import { db } from '../database/db';

export const routingRouter = Router();

// POST /api/routes
routingRouter.post('/routes', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const params: RouteRequestParams = req.body;
    const result = await routingService.calculateRoutes(params);

    if (result.error) {
      res.status(400).json(result);
      return;
    }

    // If user is authenticated, optionally auto-log or allow saving
    res.json(result);
  } catch (err) {
    console.error('[RoutingRouter] Route calculation failed:', err);
    res.status(500).json({
      error: 'SERVER_ROUTING_ERROR',
      message: 'Unexpected error during route calculation. Please verify inputs.',
    });
  }
});

// POST /api/routes/alternatives
routingRouter.post('/routes/alternatives', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const params: RouteRequestParams = req.body;
    const result = await routingService.calculateRoutes(params);
    res.json(result);
  } catch (err) {
    console.error('[RoutingRouter] Alternatives calculation failed:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to compute route alternatives.' });
  }
});

// POST /api/routes/analyze - Analyze arbitrary route geometry against vehicle constraints
routingRouter.post('/routes/analyze', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { coordinates, vehicle, departureTime } = req.body;
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
      res.status(400).json({ error: 'INVALID_GEOMETRY', message: 'Valid GeoJSON coordinates array is required.' });
      return;
    }
    if (!vehicle) {
      res.status(400).json({ error: 'VEHICLE_REQUIRED', message: 'Vehicle specifications required for analysis.' });
      return;
    }

    const evaluation = spatialEngine.evaluateRoute(coordinates, vehicle, departureTime);
    res.json(evaluation);
  } catch (err) {
    console.error('[RoutingRouter] Route analysis failed:', err);
    res.status(500).json({ error: 'ANALYSIS_FAILED', message: 'Failed to perform spatial analysis on route.' });
  }
});

// POST /api/routes/save - Save calculated route to user account
routingRouter.post('/routes/save', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Sign in to save routes to your profile.' });
    return;
  }

  try {
    const { originName, originCoords, destinationName, destinationCoords, vehicleId, distanceKm, durationMinutes, status, geometry } = req.body;
    const saved = await db.saveRoute({
      id: `saved_rt_${Date.now()}`,
      user_id: req.user.userId,
      origin_name: originName,
      origin_lon: originCoords[0],
      origin_lat: originCoords[1],
      destination_name: destinationName,
      destination_lon: destinationCoords[0],
      destination_lat: destinationCoords[1],
      vehicle_id: vehicleId,
      distance_km: distanceKm,
      duration_minutes: durationMinutes,
      status: status || 'RECOMMENDED',
      geometry_geojson: geometry,
    });

    res.json({ success: true, savedRoute: saved });
  } catch (err) {
    console.error('[RoutingRouter] Save route failed:', err);
    res.status(500).json({ error: 'SAVE_FAILED', message: 'Could not save route.' });
  }
});

// GET /api/routes/saved - Get user's saved routes
routingRouter.get('/routes/saved', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Sign in to retrieve saved routes.' });
    return;
  }

  try {
    const routes = await db.getSavedRoutes(req.user.userId);
    res.json({ routes });
  } catch (err) {
    console.error('[RoutingRouter] Get saved routes failed:', err);
    res.status(500).json({ error: 'FETCH_FAILED', message: 'Could not fetch saved routes.' });
  }
});
