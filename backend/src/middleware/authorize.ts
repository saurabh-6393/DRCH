import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors';

/**
 * RBAC role-checking middleware guard.
 * Usage: authorize(['AUTHORITY', 'ADMIN'])
 * Verifies that the authenticated user has at least one of the allowed roles.
 * Must be placed after the authenticate middleware.
 */
export function authorize(allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(AppError.unauthenticated('Authentication required before authorization check.'));
    }

    const userRoles = req.user.roles || [];
    const hasRole = userRoles.some((role) => allowedRoles.includes(role));

    if (!hasRole) {
      return next(AppError.forbidden('You do not have the required role to access this resource.'));
    }

    next();
  };
}

export const checkRole = authorize;

