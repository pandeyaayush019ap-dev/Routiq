import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/server/app';

describe('Vehicle Profile Management API', () => {
  let createdVehicleId = '';

  it('GET /api/vehicles returns existing fleet profiles', async () => {
    const res = await request(app).get('/api/vehicles');
    expect(res.status).toBe(200);
    expect(res.body.vehicles).toBeDefined();
    expect(Array.isArray(res.body.vehicles)).toBe(true);
    expect(res.body.vehicles.length).toBeGreaterThan(0);
  });

  it('POST /api/vehicles creates a new heavy vehicle profile', async () => {
    const newVeh = {
      name: 'Eicher Pro 6035 Multi-Axle Hauler',
      category: 'truck',
      registrationNumber: 'MH12CD5678',
      height_meters: 3.65,
      width_meters: 2.5,
      length_meters: 10.5,
      loaded_weight_tonnes: 35.0,
      registered_gvw_tonnes: 35.0,
      axle_count: 4,
      cargo_type: 'general',
    };

    const res = await request(app).post('/api/vehicles').send(newVeh);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.vehicle).toBeDefined();
    expect(res.body.vehicle.name).toBe(newVeh.name);
    createdVehicleId = res.body.vehicle.id;
  });

  it('PATCH /api/vehicles/:id updates specifications', async () => {
    const res = await request(app)
      .patch(`/api/vehicles/${createdVehicleId}`)
      .send({ height_meters: 3.75 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.vehicle.height_meters).toBe(3.75);
  });

  it('DELETE /api/vehicles/:id deletes profile', async () => {
    const res = await request(app).delete(`/api/vehicles/${createdVehicleId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
