import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/server/app';

describe('Health and Readiness Endpoints', () => {
  it('GET /api/health returns 200 and server status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toContain('Routiq');
    expect(res.body.version).toBe('1.0.0');
  });

  it('GET /api/health/ready returns 200 and subsystem checks', async () => {
    const res = await request(app).get('/api/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.ready).toBe(true);
    expect(res.body.checks).toBeDefined();
    expect(res.body.checks.database.status).toBe('UP');
    expect(res.body.checks.spatialEngine.status).toBe('UP');
  });

  it('GET /api/nonexistent returns 404 with structured error', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('ENDPOINT_NOT_FOUND');
  });
});
