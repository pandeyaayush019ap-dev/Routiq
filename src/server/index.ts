import { app } from './app';
import { config } from './config/env';

const port = config.PORT;

const server = app.listen(port, () => {
  console.log(`====================================================`);
  console.log(`  ROUTIQ — Heavy Vehicle Routing API Server`);
  console.log(`  Environment: ${config.NODE_ENV}`);
  console.log(`  Listening on: http://localhost:${port}`);
  console.log(`  Health Check: http://localhost:${port}/api/health`);
  console.log(`====================================================`);
});

const handleShutdown = (signal: string) => {
  console.log(`[Routiq] Received ${signal}. Gracefully closing server...`);
  server.close(() => {
    console.log('[Routiq] HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
