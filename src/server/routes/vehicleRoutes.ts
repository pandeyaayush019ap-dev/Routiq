import { Router, Response } from 'express';
import { vahanAdapter } from '../vahan/vahanAdapter';
import { db, DbVehicle } from '../database/db';
import { optionalAuth, AuthenticatedRequest } from '../middleware/authMiddleware';

export const vehicleRouter = Router();

// POST /api/vehicles/lookup - VAHAN Vehicle Registration Lookup
vehicleRouter.post('/vehicles/lookup', async (req: AuthenticatedRequest, res: Response) => {
  const regNumber = req.body.registrationNumber || req.body.regNumber;

  if (!regNumber || typeof regNumber !== 'string') {
    res.status(400).json({
      status: 'INVALID_FORMAT',
      vehicle: null,
      requiresDriverConfirmation: false,
      message: 'Vehicle registration number is required (e.g. MH12AB1234).',
    });
    return;
  }

  try {
    const result = await vahanAdapter.lookupVehicle(regNumber);
    if (result.status === 'INVALID_FORMAT') {
      res.status(400).json(result);
      return;
    }
    // Return structured response
    res.json(result);
  } catch (err) {
    console.error('[VehicleRouter] VAHAN lookup error:', err);
    res.status(500).json({
      status: 'PROVIDER_ERROR',
      vehicle: null,
      requiresDriverConfirmation: false,
      message: 'Unexpected server error during vehicle lookup.',
    });
  }
});

// GET /api/vehicles - List vehicles
vehicleRouter.get('/vehicles', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const vehicles = await db.getVehicles(req.user?.userId);
    res.json({ vehicles });
  } catch (err) {
    console.error('[VehicleRouter] Get vehicles error:', err);
    res.status(500).json({ error: 'FETCH_FAILED', message: 'Could not fetch vehicles.' });
  }
});

// POST /api/vehicles - Create or save vehicle profile
vehicleRouter.post('/vehicles', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = req.body;
    if (!data.name || !data.height_meters || !data.loaded_weight_tonnes) {
      res.status(400).json({
        error: 'MISSING_FIELDS',
        message: 'Name, height_meters, and loaded_weight_tonnes are required.',
      });
      return;
    }

    const newVehicle: DbVehicle = await db.createVehicle({
      id: data.id || `veh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: req.user?.userId,
      name: data.name,
      registration_number: data.registration_number,
      category: data.category || 'truck',
      height_meters: Number(data.height_meters),
      width_meters: Number(data.width_meters || 2.5),
      length_meters: Number(data.length_meters || 10.0),
      loaded_weight_tonnes: Number(data.loaded_weight_tonnes),
      registered_gvw_tonnes: Number(data.registered_gvw_tonnes || data.loaded_weight_tonnes),
      axle_count: Number(data.axle_count || 2),
      axle_load_tonnes: data.axle_load_tonnes ? Number(data.axle_load_tonnes) : undefined,
      fuel_type: data.fuel_type || 'Diesel',
      cargo_type: data.cargo_type || 'general',
      source: data.source || 'MANUAL',
    });

    res.status(201).json({ success: true, vehicle: newVehicle });
  } catch (err) {
    console.error('[VehicleRouter] Create vehicle error:', err);
    res.status(500).json({ error: 'SAVE_FAILED', message: 'Could not save vehicle profile.' });
  }
});

// PATCH /api/vehicles/:id - Update vehicle profile
vehicleRouter.patch('/vehicles/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const updated = await db.updateVehicle(id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Vehicle not found.' });
      return;
    }
    res.json({ success: true, vehicle: updated });
  } catch (err) {
    console.error('[VehicleRouter] Update vehicle error:', err);
    res.status(500).json({ error: 'UPDATE_FAILED', message: 'Could not update vehicle.' });
  }
});

// DELETE /api/vehicles/:id - Delete vehicle profile
vehicleRouter.delete('/vehicles/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const success = await db.deleteVehicle(id);
    if (!success) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Vehicle not found.' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[VehicleRouter] Delete vehicle error:', err);
    res.status(500).json({ error: 'DELETE_FAILED', message: 'Could not delete vehicle.' });
  }
});
