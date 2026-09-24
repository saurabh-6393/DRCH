import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Attaches a unique request ID to every incoming request.
 * Used for structured logging and error tracing.
 */
export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.requestId = crypto.randomUUID();
  next();
}

// Extend Express Request to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}
