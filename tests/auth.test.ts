import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/server/app';

describe('Authentication and Authorization API', () => {
  const testUser = {
    identifier: `testdriver_${Date.now()}@routiq.app`,
    password: 'SecurePassword123!',
    name: 'Suresh Patil',
    role: 'driver',
    companyName: 'Sahyadri Logistics',
  };

  let authToken = '';

  it('POST /api/auth/register creates a new user and returns JWT token', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.name).toBe(testUser.name);
    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe('string');
    authToken = res.body.token;
  });

  it('POST /api/auth/register rejects duplicate identifier', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('REGISTRATION_FAILED');
  });

  it('POST /api/auth/login succeeds with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      identifier: testUser.identifier,
      password: testUser.password,
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  it('POST /api/auth/login rejects incorrect password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      identifier: testUser.identifier,
      password: 'WrongPassword!',
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('INVALID_CREDENTIALS');
  });

  it('GET /api/auth/me returns profile for authenticated user', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe(testUser.name);
  });

  it('GET /api/auth/me rejects unauthenticated request', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHORIZED');
  });
});
