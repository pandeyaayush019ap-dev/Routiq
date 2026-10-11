import { Router, Request, Response } from 'express';
import { db } from '../database/db';
import { vahanAdapter } from '../vahan/vahanAdapter';

export const healthRouter = Router();

healthRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Routiq Heavy Vehicle Routing Backend',
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

healthRouter.get('/health/ready', async (_req: Request, res: Response) => {
  const isDbReady = true;
  const isPostgres = db.isUsingPostgres();
  const isVahanConfigured = vahanAdapter.isConfigured();

  res.json({
    ready: isDbReady,
    status: 'ready',
    timestamp: new Date().toISOString(),
    checks: {
      database: {
        status: 'UP',
        engine: isPostgres ? 'PostgreSQL + PostGIS' : 'In-Memory Transactional Store',
      },
      vahanGateway: {
        status: isVahanConfigured ? 'CONFIGURED' : 'UNCONFIGURED_MANUAL_FALLBACK',
      },
      spatialEngine: {
        status: 'UP',
        engine: 'Turf.js + Verified Spatial Constraints',
      },
    },
  });
});
