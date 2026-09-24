import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors';
import { sendError } from '../shared/response';
import { logger } from '../shared/logger';
import { env } from '../config/env';

/**
 * Centralized error handler middleware.
 * - Logs structured error details.
 * - Strips stack traces in production.
 * - Returns standard error response shape per error-handling.md.
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  // Determine error properties
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const code = isAppError ? err.code : 'INTERNAL_SERVER_ERROR';
  const message =
    isAppError || env.NODE_ENV === 'development'
      ? err.message
      : 'Something went wrong on the server.';
  const details = isAppError ? err.details : [];

  // Log the error
  logger.error(err.message, {
    requestId: req.requestId,
    userId: req.user?.id,
    path: req.path,
    code,
    ...(env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });

  return sendError(res, statusCode, code, message, details);
}
