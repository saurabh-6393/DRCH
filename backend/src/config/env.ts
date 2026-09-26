import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env file in non-production environments
if (process.env.NODE_ENV !== 'production') {
  // Load backend-specific .env first (takes precedence)
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
  // Also load root .env as fallback for shared local Docker services (MinIO, Postgres)
  dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
}

const envSchema = z
  .object({
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
    S3_ACCESS_KEY: z.string().optional().default(process.env.MINIO_ROOT_USER || 'minioadmin'),
    S3_SECRET_KEY: z.string().optional().default(process.env.MINIO_ROOT_PASSWORD || 'change_me_locally'),
    S3_BUCKET_NAME: z.string().optional().default('drch-media'),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(1),
    VAPID_PUBLIC_KEY: z.string().optional(),
    VAPID_PRIVATE_KEY: z.string().optional(),
    VAPID_SUBJECT: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      if (!data.FRONTEND_URL || data.FRONTEND_URL === '*' || !data.FRONTEND_URL.startsWith('http')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['FRONTEND_URL'],
          message: 'In production, FRONTEND_URL must be an explicit HTTP/HTTPS origin and cannot be wildcard (*)',
        });
      }

      // Production VAPID validation (Contract §8.2)
      // If VAPID keys are explicitly passed or present in production
      if (data.VAPID_PUBLIC_KEY !== undefined || data.VAPID_PRIVATE_KEY !== undefined) {
        const pubKey = data.VAPID_PUBLIC_KEY || '';
        const privKey = data.VAPID_PRIVATE_KEY || '';

        const isMockPub = !pubKey || pubKey.includes('MOCK');
        const isMockPriv = !privKey || privKey.includes('MOCK');

        if (isMockPub) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['VAPID_PUBLIC_KEY'],
            message: 'In production, VAPID_PUBLIC_KEY must be a valid generated key and cannot use development fallback/mock values',
          });
        } else {
          try {
            const pubBuf = Buffer.from(pubKey, 'base64url');
            if (pubBuf.length !== 65) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['VAPID_PUBLIC_KEY'],
                message: 'In production, VAPID_PUBLIC_KEY must be a 65-byte uncompressed P-256 public key (base64url encoded)',
              });
            }
          } catch {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['VAPID_PUBLIC_KEY'],
              message: 'Invalid base64url encoding for VAPID_PUBLIC_KEY',
            });
          }
        }

        if (isMockPriv) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['VAPID_PRIVATE_KEY'],
            message: 'In production, VAPID_PRIVATE_KEY must be a valid generated key and cannot use development fallback/mock values',
          });
        } else {
          try {
            const privBuf = Buffer.from(privKey, 'base64url');
            if (privBuf.length !== 32) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['VAPID_PRIVATE_KEY'],
                message: 'In production, VAPID_PRIVATE_KEY must be a 32-byte P-256 private key (base64url encoded)',
              });
            }
          } catch {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['VAPID_PRIVATE_KEY'],
              message: 'Invalid base64url encoding for VAPID_PRIVATE_KEY',
            });
          }
        }

        if (
          !data.VAPID_SUBJECT ||
          (!data.VAPID_SUBJECT.startsWith('mailto:') &&
            !data.VAPID_SUBJECT.startsWith('https://') &&
            !data.VAPID_SUBJECT.startsWith('http://'))
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['VAPID_SUBJECT'],
            message: 'In production, VAPID_SUBJECT must be a valid mailto: URI or URL',
          });
        }
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.format());
  process.exit(1);
}

export { envSchema };
export const env = Object.freeze(parsed.data);

export type Env = z.infer<typeof envSchema>;
