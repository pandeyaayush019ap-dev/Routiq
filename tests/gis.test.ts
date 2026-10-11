import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/server/app';

describe('GIS and Spatial Restriction Knowledge Base API', () => {
  it('GET /api/gis/restrictions returns verified commercial restriction hotspots', async () => {
    const res = await request(app).get('/api/gis/restrictions');
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThan(0);
    expect(Array.isArray(res.body.restrictions)).toBe(true);

    const lonavala = res.body.restrictions.find((r: { id: string }) => r.id === 'res_lonavala_bridge');
    expect(lonavala).toBeDefined();
    expect(lonavala.type).toBe('height');
    expect(lonavala.limitValue).toBe(4.1);
  });

  it('POST /api/gis/evaluate-line identifies collision with restriction zone', async () => {
    // Line passing through Lonavala overbridge ([73.4072, 18.7548])
    const linePassingLonavala = [
      [73.39, 18.74],
      [73.4072, 18.7548],
      [73.42, 18.76],
    ];

    const res = await request(app)
      .post('/api/gis/evaluate-line')
      .send({
        coordinates: linePassingLonavala,
        vehicle: {
          heightMeters: 4.3, // Over 4.1m
          loadedWeightTonnes: 30,
          widthMeters: 2.5,
          lengthMeters: 12,
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('BLOCKED');
    expect(res.body.spatialIntersectionsCount).toBeGreaterThan(0);
    expect(res.body.roadWidthIntelligence).toBeDefined();
  });
});
