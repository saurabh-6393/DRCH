import { Request, Response, NextFunction } from 'express';
import { rateLimit, ipKeyGenerator, MemoryStore } from 'express-rate-limit';
import { sendError } from '../shared/response';

/**
 * Standard 429 response handler matching the DRCH error envelope.
 */
const rateLimitHandler = (
  _req: Request,
  res: Response,
  _next: NextFunction,
  _options: any
) => {
  return sendError(
    res,
    429,
    'RATE_LIMITED',
    'Too many requests. Please try again in 15 minutes.',
    []
  );
};

// Dedicated memory stores for each limiter group (Contract §7.1)
export const authStore = new MemoryStore();
export const incidentStore = new MemoryStore();
export const refreshStore = new MemoryStore();
export const publicStore = new MemoryStore();

/**
 * Reset all rate limiters (useful for deterministic testing).
 */
export function resetRateLimiters(): void {
  authStore.resetAll();
  incidentStore.resetAll();
  refreshStore.resetAll();
  publicStore.resetAll();
}

/**
 * A. authLimiter (Contract §7.2)
 * Protected routes: POST /api/v1/auth/login, POST /api/v1/auth/register
 * 5 requests per 15 minutes, keyed by client IP (req.ip)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-6',
  legacyHeaders: false,
  store: authStore,
  handler: rateLimitHandler,
});

/**
 * B. incidentSubmissionLimiter (Contract §7.2)
 * Protected route: POST /api/v1/incidents
 * 10 requests per 15 minutes, keyed by authenticated user ID (req.user.id)
 */
export const incidentSubmissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-6',
  legacyHeaders: false,
  store: incidentStore,
  keyGenerator: (req: Request) => {
    return req.user?.id || ipKeyGenerator(req.ip || '127.0.0.1');
  },
  handler: rateLimitHandler,
});

/**
 * C. refreshLimiter (Contract §7.2)
 * Protected route: POST /api/v1/auth/refresh
 * 10 requests per 15 minutes, keyed by client IP (req.ip)
 */
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-6',
  legacyHeaders: false,
  store: refreshStore,
  handler: rateLimitHandler,
});

/**
 * D. generalPublicLimiter (Contract §7.2)
 * Applied ONLY to explicitly defined public read endpoints:
 * - GET /api/v1/incidents/public
 * - GET /api/v1/shelters
 * - GET /api/v1/alerts
 * 100 requests per 15 minutes, keyed by client IP (req.ip)
 */
export const generalPublicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-6',
  legacyHeaders: false,
  store: publicStore,
  handler: rateLimitHandler,
});
