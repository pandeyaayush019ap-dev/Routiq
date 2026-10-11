import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../database/db';
import { optionalAuth, requireAuth, AuthenticatedRequest } from '../middleware/authMiddleware';

export const tripRouter = Router();

// Validation Schemas
const StartTripSchema = z.object({
  vehicleId: z.string().min(1, 'vehicleId is required'),
  originName: z.string().min(1, 'originName is required'),
  destinationName: z.string().min(1, 'destinationName is required'),
  routeId: z.string().optional(),
  distanceKm: z.number().positive('distanceKm must be positive'),
});

const TelemetrySchema = z.object({
  tripId: z.string().optional(),
  vehicleId: z.string().min(1, 'vehicleId is required'),
  latitude: z.number().min(-90).max(90, 'Invalid latitude coordinate'),
  longitude: z.number().min(-180).max(180, 'Invalid longitude coordinate'),
  accuracy: z.number().nonnegative().optional(),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().nonnegative().optional(), // speed in km/h or m/s
  timestamp: z.string().optional(),
});

const EndTripSchema = z.object({
  tripId: z.string().min(1, 'tripId is required'),
});

/**
 * POST /api/trips/start
 * Initializes a live driver navigation trip
 */
tripRouter.post('/trips/start', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseRes = StartTripSchema.safeParse(req.body);
    if (!parseRes.success) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        details: parseRes.error.format(),
      });
      return;
    }

    const { vehicleId, originName, destinationName, routeId, distanceKm } = parseRes.data;
    const userId = req.user?.userId;

    // Check if vehicle exists
    const vehicle = await db.getVehicleById(vehicleId);
    if (!vehicle) {
      res.status(404).json({
        error: 'VEHICLE_NOT_FOUND',
        message: `Vehicle ${vehicleId} not found.`,
      });
      return;
    }

    // Verify driver authorization if user is logged in and vehicle has an owner
    if (userId && vehicle.user_id && vehicle.user_id !== userId) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: 'You are not authorized to start a trip with this vehicle.',
      });
      return;
    }

    const tripId = `trip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const trip = await db.createTrip({
      id: tripId,
      user_id: userId,
      vehicle_id: vehicleId,
      origin_name: originName,
      destination_name: destinationName,
      route_id: routeId,
      distance_km: distanceKm,
      status: 'IN_PROGRESS',
    });

    // Update vehicle live state to link active trip
    await db.updateVehicleLiveState({
      vehicle_id: vehicleId,
      user_id: userId,
      active_trip_id: tripId,
      status: 'STATIONARY',
    });

    res.status(201).json({
      success: true,
      trip,
      message: 'Driver trip started successfully.',
    });
  } catch (err) {
    console.error('[Trip API] start error:', err);
    res.status(500).json({
      error: 'TRIP_START_FAILED',
      message: 'Failed to start navigation trip.',
    });
  }
});

/**
 * POST /api/trips/track
 * Ingests real-time GPS telemetry from active driver app
 */
tripRouter.post('/trips/track', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseRes = TelemetrySchema.safeParse(req.body);
    if (!parseRes.success) {
      res.status(400).json({
        error: 'INVALID_TELEMETRY_DATA',
        details: parseRes.error.format(),
      });
      return;
    }

    const { tripId, vehicleId, latitude, longitude, accuracy, heading, speed, timestamp } = parseRes.data;
    const userId = req.user?.userId;

    // Validate coordinates are realistic geographic coordinates
    if (latitude === 0 && longitude === 0) {
      res.status(400).json({
        error: 'NULL_ISLAND_COORDINATE',
        message: 'Invalid coordinate (0, 0) received.',
      });
      return;
    }

    // Ingest telemetry into database
    const point = await db.recordTelemetry({
      trip_id: tripId,
      vehicle_id: vehicleId,
      user_id: userId,
      latitude,
      longitude,
      accuracy,
      heading,
      speed,
      timestamp: timestamp || new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      telemetryId: point.id,
      timestamp: point.timestamp,
    });
  } catch (err) {
    console.error('[Trip API] track error:', err);
    res.status(500).json({
      error: 'TELEMETRY_RECORD_FAILED',
      message: 'Failed to process driver GPS telemetry.',
    });
  }
});

/**
 * POST /api/trips/end
 * Ends the active driver navigation trip
 */
tripRouter.post('/trips/end', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseRes = EndTripSchema.safeParse(req.body);
    if (!parseRes.success) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        details: parseRes.error.format(),
      });
      return;
    }

    const { tripId } = parseRes.data;
    const userId = req.user?.userId;

    const updated = await db.endTrip(tripId, userId);
    if (!updated) {
      res.status(404).json({
        error: 'TRIP_NOT_FOUND',
        message: `Active trip ${tripId} not found or you are not authorized to end it.`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      trip: updated,
      message: 'Driver trip ended successfully.',
    });
  } catch (err) {
    console.error('[Trip API] end error:', err);
    res.status(500).json({
      error: 'TRIP_END_FAILED',
      message: 'Failed to end navigation trip.',
    });
  }
});

/**
 * GET /api/trips/:tripId/history
 * Returns telemetry history breadcrumb trail for a specific trip
 */
tripRouter.get('/trips/:tripId/history', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tripId = req.params.tripId;
    const trip = await db.getTripById(tripId);
    if (!trip) {
      res.status(404).json({
        error: 'TRIP_NOT_FOUND',
        message: `Trip ${tripId} not found.`,
      });
      return;
    }

    const history = await db.getTelemetryByTrip(tripId);
    res.status(200).json({
      trip,
      history,
      count: history.length,
    });
  } catch (err) {
    console.error('[Trip API] history error:', err);
    res.status(500).json({
      error: 'HISTORY_FETCH_FAILED',
      message: 'Failed to fetch trip telemetry history.',
    });
  }
});
