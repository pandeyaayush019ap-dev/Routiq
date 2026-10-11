import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/server/app';

describe('Truck Routing and Restriction Engine API', () => {
  it('POST /api/routes rejects missing vehicle height with clear guidance', async () => {
    const res = await request(app).post('/api/routes').send({
      originName: 'Pune',
      destinationName: 'Mumbai',
      vehicle: {
        heightMeters: 0, // Invalid/missing height
        loadedWeightTonnes: 30,
        widthMeters: 2.5,
        lengthMeters: 10,
      },
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('MISSING_VEHICLE_HEIGHT');
    expect(res.body.message).toContain('height is mandatory');
  });

  it('POST /api/routes rejects identical origin and destination', async () => {
    const res = await request(app).post('/api/routes').send({
      originName: 'Mumbai',
      destinationName: 'Mumbai',
      vehicle: {
        heightMeters: 3.5,
        loadedWeightTonnes: 25,
        widthMeters: 2.5,
        lengthMeters: 10,
      },
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('SAME_ORIGIN_DESTINATION');
  });

  it('POST /api/routes detects low clearance bridge violation for 4.3m high-cube container', async () => {
    const res = await request(app).post('/api/routes').send({
      originName: 'Pune',
      destinationName: 'Mumbai',
      departureTime: '08:30',
      vehicle: {
        heightMeters: 4.3, // Over 4.1m clearance at Lonavala overbridge!
        loadedWeightTonnes: 32,
        widthMeters: 2.5,
        lengthMeters: 14.5,
        axleCount: 3,
      },
    });

    expect(res.status).toBe(200);
    expect(res.body.routes).toBeDefined();
    expect(res.body.routes.length).toBeGreaterThan(0);

    // Find route traversing Old NH-48 with Lonavala underpass
    const oldNhRoute = res.body.routes.find((r: { viaHighway?: string; name?: { en?: string } }) =>
      (r.viaHighway || '').toLowerCase().includes('nh-48') ||
      (r.viaHighway || '').toLowerCase().includes('old') ||
      (r.name?.en || '').toLowerCase().includes('old')
    );

    if (oldNhRoute) {
      expect(oldNhRoute.status).toBe('BLOCKED');
      expect(oldNhRoute.statusReasons[0]).toContain('clearance');
    }

    // Recommended route should NOT be blocked
    const recRoute = res.body.routes.find((r: { id: string }) => r.id === res.body.recommendedRouteId);
    if (recRoute) {
      expect(recRoute.status).not.toBe('BLOCKED');
    }
  });

  it('POST /api/routes includes road-width intelligence with honest unverified disclaimer', async () => {
    const res = await request(app).post('/api/routes').send({
      originName: 'Pune',
      destinationName: 'Mumbai',
      vehicle: {
        heightMeters: 3.4,
        loadedWeightTonnes: 24,
        widthMeters: 2.5,
        lengthMeters: 9.5,
      },
    });

    expect(res.status).toBe(200);
    expect(res.body.routes.length).toBeGreaterThan(0);
    const firstRoute = res.body.routes[0];
    expect(firstRoute.roadWidthAssessment).toBeDefined();
    expect(firstRoute.roadWidthAssessment.confidence).toBe('UNVERIFIED');
    expect(firstRoute.roadWidthAssessment.honestDisclaimer).toContain('DO NOT ASSUME ROAD WIDTH IS SAFE');
  });
});
