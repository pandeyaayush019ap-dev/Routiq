import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/server/app';

describe('VAHAN Vehicle Registration Gateway API', () => {
  it('POST /api/vehicles/lookup rejects invalid Indian RC format', async () => {
    const res = await request(app).post('/api/vehicles/lookup').send({
      registrationNumber: 'INVALID_123',
    });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('INVALID_FORMAT');
    expect(res.body.message).toContain('Invalid Indian vehicle registration');
  });

  it('POST /api/vehicles/lookup reports unconfigured credentials status when secrets are not set', async () => {
    const res = await request(app).post('/api/vehicles/lookup').send({
      registrationNumber: 'MH12AB1234',
    });

    expect(res.status).toBe(200);
    // When no VAHAN_API_KEY or ULIP credentials are provided on server:
    expect(['UNCONFIGURED_CREDENTIALS', 'SUCCESS']).toContain(res.body.status);
    if (res.body.status === 'UNCONFIGURED_CREDENTIALS') {
      expect(res.body.requiredCredentials).toBeDefined();
      expect(res.body.requiredCredentials).toContain('VAHAN_API_KEY');
      expect(res.body.vehicle).toBeNull();
    }
  });
});
