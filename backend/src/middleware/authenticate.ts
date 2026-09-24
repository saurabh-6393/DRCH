import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, AccessTokenPayload } from '../shared/tokens';
import { AppError } from '../shared/errors';

/**
 * Middleware that verifies the JWT access token from the cookie.
 * On success, attaches the decoded user payload to req.user.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.access_token;

  if (!token) {
    return next(AppError.unauthenticated('Missing authentication token.'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    return next(AppError.unauthenticated('Invalid or expired authentication token.'));
  }
}

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}
