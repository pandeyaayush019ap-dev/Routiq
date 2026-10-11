import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().default('routiq-default-development-jwt-secret-key-32chars!'),
  
  // Routing Providers
  VALHALLA_URL: z.string().optional(),
  OPENROUTESERVICE_API_KEY: z.string().optional(),
  OPENROUTESERVICE_URL: z.string().default('https://api.openrouteservice.org'),
  OSRM_URL: z.string().default('https://router.project-osrm.org'),
  MAPPLS_CLIENT_ID: z.string().optional(),
  MAPPLS_CLIENT_SECRET: z.string().optional(),

  // VAHAN / ULIP Credentials
  VAHAN_API_KEY: z.string().optional(),
  VAHAN_API_SECRET: z.string().optional(),
  VAHAN_API_ENDPOINT: z.string().default('https://api.gateway.gov.in/vahan'),
  ULIP_USERNAME: z.string().optional(),
  ULIP_PASSWORD: z.string().optional(),

  // GIS / MapArc
  ARCGIS_API_KEY: z.string().optional(),
  OVERPASS_URL: z.string().default('https://overpass-api.de/api/interpreter'),

  // Rate Limiting
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

export const config: EnvConfig = EnvSchema.parse(process.env);
