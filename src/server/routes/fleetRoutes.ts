import { Router, Response } from 'express';
import { db } from '../database/db';
import { optionalAuth, AuthenticatedRequest } from '../middleware/authMiddleware';

export const fleetRouter = Router();

/**
 * GET /api/fleet/vehicles
 * Returns live status and coordinates of fleet vehicles
 */
fleetRouter.get('/fleet/vehicles', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const fleet = await db.getFleetVehicles(userId);

    // Compute fleet-level status breakdown
    const summary = {
      total: fleet.length,
      moving: fleet.filter((v) => v.status === 'MOVING').length,
      stationary: fleet.filter((v) => v.status === 'STATIONARY').length,
      stale: fleet.filter((v) => v.status === 'STALE').length,
      offline: fleet.filter((v) => v.status === 'OFFLINE').length,
    };

    res.status(200).json({
      success: true,
      summary,
      vehicles: fleet,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Fleet API] vehicles error:', err);
    res.status(500).json({
      error: 'FLEET_FETCH_FAILED',
      message: 'Failed to retrieve fleet vehicle states.',
    });
  }
});

/**
 * GET /api/fleet/vehicles/:vehicleId/history
 * Returns GPS telemetry history for a specific fleet vehicle (for breadcrumb mapping)
 */
fleetRouter.get('/fleet/vehicles/:vehicleId/history', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const vehicleId = req.params.vehicleId;
    const limit = parseInt(req.query.limit as string, 10) || 50;

    const vehicle = await db.getVehicleLiveState(vehicleId);
    if (!vehicle) {
      res.status(404).json({
        error: 'VEHICLE_NOT_FOUND',
        message: `Vehicle ${vehicleId} not found in fleet.`,
      });
      return;
    }

    const history = await db.getTelemetryByVehicle(vehicleId, limit);

    res.status(200).json({
      success: true,
      vehicle,
      history,
      count: history.length,
    });
  } catch (err) {
    console.error('[Fleet API] history error:', err);
    res.status(500).json({
      error: 'HISTORY_FETCH_FAILED',
      message: 'Failed to fetch vehicle telemetry history.',
    });
  }
});
