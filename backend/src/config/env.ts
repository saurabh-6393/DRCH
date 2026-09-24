import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env file in non-production environments
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  COOKIE_DOMAIN: z.string().optional().default(''),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  S3_ENDPOINT: z.string().optional().default('http://127.0.0.1:9000'),
  S3_REGION: z.string().optional().default('us-east-1'),
  S3_ACCESS_KEY: z.string().optional().default('minioadmin'),
  S3_SECRET_KEY: z.string().optional().default('change_me_locally'),
  S3_BUCKET_NAME: z.string().optional().default('drch-media'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = Object.freeze(parsed.data);

export type Env = z.infer<typeof envSchema>;
