import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/server/app';

describe('Commercial Points of Interest (POI) API', () => {
  it('GET /api/places/nearby returns facilities for coordinates in Maharashtra freight corridor', async () => {
    // Coordinates near Panvel / Navi Mumbai freight hub (73.11, 18.99)
    const res = await request(app).get('/api/places/nearby?lat=18.99&lon=73.11&radiusKm=20&categories=fuel,weighbridge');
    expect(res.status).toBe(200);
    expect(res.body.places).toBeDefined();
    expect(Array.isArray(res.body.places)).toBe(true);
  }, 15000);

  it('GET /api/places/nearby rejects missing or invalid coordinates', async () => {
    const res = await request(app).get('/api/places/nearby');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_COORDINATES');
  });

  it('POST /api/places/along-route evaluates freight facilities along route LineString', async () => {
    const routeCoords = [
      [73.8567, 18.5204],
      [73.4072, 18.7548],
      [72.8777, 19.0760],
    ];

    const res = await request(app)
      .post('/api/places/along-route')
      .send({
        coordinates: routeCoords,
        bufferKm: 15,
        categories: ['fuel', 'repair'],
      });

    expect(res.status).toBe(200);
    expect(res.body.places).toBeDefined();
    expect(Array.isArray(res.body.places)).toBe(true);
  }, 15000);
});
