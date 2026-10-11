import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { healthRouter } from './routes/healthRoutes';
import { geocodingRouter } from './routes/geocodingRoutes';
import { routingRouter } from './routes/routingRoutes';
import { placesRouter } from './routes/placesRoutes';
import { vehicleRouter } from './routes/vehicleRoutes';
import { authRouter } from './routes/authRoutes';
import { gisRouter } from './routes/gisRoutes';

export function createApp(): Express {
  const app = express();

  // CORS configuration
  app.use(
    cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Auth-Token', 'X-Request-Id'],
    })
  );

  // Body parsers
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request ID & Logging Middleware with sensitive data redaction
  app.use((req: Request, res: Response, next: NextFunction) => {
    const reqId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    res.setHeader('X-Request-Id', reqId);

    // Logging only in development or non-test
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[Routiq API] ${req.method} ${req.url} - RequestId: ${reqId}`);
    }
    next();
  });

  // Mount API Subsystems
  app.use('/api', healthRouter);
  app.use('/api', geocodingRouter);
  app.use('/api', routingRouter);
  app.use('/api', placesRouter);
  app.use('/api', vehicleRouter);
  app.use('/api', authRouter);
  app.use('/api', gisRouter);

  // 404 Handler for /api routes
  app.use('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      error: 'ENDPOINT_NOT_FOUND',
      message: `The API endpoint ${req.method} ${req.baseUrl} was not found.`,
    });
  });

  // Global Error Handler (Sanitizes internal server errors)
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Routiq Server Error]:', err);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred on the routing server.',
    });
  });

  return app;
}

export const app = createApp();
