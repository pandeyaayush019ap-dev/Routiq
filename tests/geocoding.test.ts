import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/server/app';

describe('Geocoding API', () => {
  it('GET /api/geocoding/search returns locations for valid query', async () => {
    const res = await request(app).get('/api/geocoding/search?q=Pune&limit=3');
    expect(res.status).toBe(200);
    expect(res.body.places).toBeDefined();
    expect(Array.isArray(res.body.places)).toBe(true);
    if (res.body.places.length > 0) {
      const first = res.body.places[0];
      expect(first.coordinates).toBeDefined();
      expect(first.coordinates.length).toBe(2);
      expect(typeof first.coordinates[0]).toBe('number');
      expect(typeof first.coordinates[1]).toBe('number');
    }
  });

  it('GET /api/geocoding/search rejects empty query', async () => {
    const res = await request(app).get('/api/geocoding/search?q=');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('QUERY_REQUIRED');
  });

  it('GET /api/geocoding/reverse returns address for valid coordinates', async () => {
    // Coordinates near Pune Gateway (73.8567, 18.5204)
    const res = await request(app).get('/api/geocoding/reverse?lat=18.5204&lon=73.8567');
    expect(res.status).toBe(200);
    expect(res.body.formattedAddress).toBeDefined();
  });
});
