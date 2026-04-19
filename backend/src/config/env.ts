import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGIN: z.string().default('http://localhost:8080'),

  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  BAILEYS_AUTH_DIR: z.string().default('./data/sessions'),
  BAILEYS_BROWSER_NAME: z.string().default('KS CSM'),
  BAILEYS_BROWSER_VERSION: z.string().default('1.0.0'),

  ANTIBAN_MIN_DELAY_MS: z.coerce.number().default(3000),
  ANTIBAN_MAX_DELAY_MS: z.coerce.number().default(8000),
  ANTIBAN_PAUSE_AFTER: z.coerce.number().default(80),
  ANTIBAN_LONG_PAUSE_MS: z.coerce.number().default(300_000),
  ANTIBAN_RATE_PER_MINUTE: z.coerce.number().default(8),
  ANTIBAN_RATE_PER_HOUR: z.coerce.number().default(200),
  ANTIBAN_RATE_PER_DAY: z.coerce.number().default(1500),
  ANTIBAN_TYPING_MS_MIN: z.coerce.number().default(800),
  ANTIBAN_TYPING_MS_MAX: z.coerce.number().default(2500),
  ANTIBAN_WARMUP_DAYS: z.coerce.number().default(3),

  UPLOAD_DIR: z.string().default('./data/uploads'),
  UPLOAD_MAX_MB: z.coerce.number().default(50),

  SEED_ADMIN_EMAIL: z.string().email().default('admin@kscsm.com'),
  SEED_ADMIN_PASSWORD: z.string().default('admin123'),
  SEED_ADMIN_NAME: z.string().default('Admin'),
});

export const env = schema.parse(process.env);
export type Env = z.infer<typeof schema>;
