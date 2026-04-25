import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGIN: z.string().default('http://localhost:8080'),

  DATABASE_URL: z.string(),

  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  BAILEYS_AUTH_DIR: z.string().default('./data/sessions'),
  BAILEYS_BROWSER_NAME: z.string().default('KS CSM'),
  BAILEYS_BROWSER_VERSION: z.string().default('1.0.0'),

  UPLOAD_DIR: z.string().default('./data/uploads'),
  UPLOAD_MAX_MB: z.coerce.number().default(100),

  SEED_ADMIN_EMAIL: z.string().email().default('admin@kscsm.com'),
  SEED_ADMIN_PASSWORD: z.string().min(8, 'SEED_ADMIN_PASSWORD must be at least 8 characters').default('changeme!'),
  SEED_ADMIN_NAME: z.string().default('Admin'),
});

export const env = schema.parse(process.env);
export type Env = z.infer<typeof schema>;
