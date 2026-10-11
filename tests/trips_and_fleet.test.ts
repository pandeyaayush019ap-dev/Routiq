import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server/app';
import { Express } from 'express';

describe('Driver Trips & Fleet GPS Tracking API', () => {
  let app: Express;
  let activeTripId: string;

  beforeAll(() => {
    app = createApp();
  });

  it('POST /api/trips/start starts a navigation trip session', async () => {
    const res = await request(app)
      .post('/api/trips/start')
      .send({
        vehicleId: 'veh_default_01',
        originName: 'Pune',
        destinationName: 'Mumbai',
        routeId: 'route_pune_mumbai_expressway',
        distanceKm: 148.5,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.trip).toBeDefined();
    expect(res.body.trip.status).toBe('IN_PROGRESS');
    expect(res.body.trip.vehicle_id).toBe('veh_default_01');

    activeTripId = res.body.trip.id;
  });

  it('POST /api/trips/track successfully ingests valid driver GPS telemetry', async () => {
    const res = await request(app)
      .post('/api/trips/track')
      .send({
        tripId: activeTripId,
        vehicleId: 'veh_default_01',
        latitude: 18.7510,
        longitude: 73.4010,
        accuracy: 5.2,
        heading: 140,
        speed: 48.5, // moving
        timestamp: new Date().toISOString(),
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.telemetryId).toBeDefined();
  });

  it('POST /api/trips/track rejects invalid coordinates', async () => {
    const res = await request(app)
      .post('/api/trips/track')
      .send({
        tripId: activeTripId,
        vehicleId: 'veh_default_01',
        latitude: 120.0, // Invalid latitude
        longitude: 73.4010,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_TELEMETRY_DATA');
  });

  it('GET /api/fleet/vehicles returns live fleet assets and status summary', async () => {
    const res = await request(app).get('/api/fleet/vehicles');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary).toBeDefined();
    expect(res.body.summary.total).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(res.body.vehicles)).toBe(true);

    const vehicle1 = res.body.vehicles.find((v: any) => v.vehicle_id === 'veh_default_01');
    expect(vehicle1).toBeDefined();
    expect(vehicle1.status).toBe('MOVING'); // speed was 48.5 km/h
  });

  it('GET /api/fleet/vehicles/:vehicleId/history returns breadcrumb coordinates', async () => {
    const res = await request(app).get('/api/fleet/vehicles/veh_default_01/history');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.history)).toBe(true);
    expect(res.body.history.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /api/trips/end successfully completes navigation trip', async () => {
    const res = await request(app)
      .post('/api/trips/end')
      .send({ tripId: activeTripId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.trip.status).toBe('COMPLETED');
    expect(res.body.trip.ended_at).toBeDefined();
  });
});
