/**
 * Custom application error class with HTTP status and application error codes.
 * Follows the error code map from error-handling.md.
 */

export type AppErrorCode =
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_SERVER_ERROR'
  | 'AI_PROVIDER_ERROR'
  | 'STORAGE_PROVIDER_ERROR'
  | 'MAP_PROVIDER_ERROR';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: AppErrorCode;
  public readonly details: unknown[];

  constructor(statusCode: number, code: AppErrorCode, message: string, details: unknown[] = []) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static validationFailed(message: string, details: unknown[] = []) {
    return new AppError(400, 'VALIDATION_FAILED', message, details);
  }

  static unauthenticated(message = 'Authentication required.') {
    return new AppError(401, 'UNAUTHENTICATED', message);
  }

  static forbidden(message = 'You do not have permission to access this resource.') {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Resource not found.') {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static conflict(message: string) {
    return new AppError(409, 'CONFLICT', message);
  }

  static internal(message = 'An unexpected error occurred.') {
    return new AppError(500, 'INTERNAL_SERVER_ERROR', message);
  }
}
