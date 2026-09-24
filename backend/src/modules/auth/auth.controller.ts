import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { registerSchema, loginSchema } from './auth.types';
import {
  registerUser,
  loginUser,
  refreshSession,
  logoutSession,
  getCurrentUser,
} from './auth.service';
import { setAuthCookies, clearAuthCookies } from '../../shared/tokens';
import { sendSuccess } from '../../shared/response';
import { AppError } from '../../shared/errors';

// ============================================================
// POST /api/v1/auth/register
// ============================================================

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const input = registerSchema.parse(req.body);
    const result = await registerUser(input);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return sendSuccess(res, { user: result.user }, 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return next(
        AppError.validationFailed(
          'Please verify your input details and try again.',
          error.issues.map((e) => ({ field: e.path.join('.'), message: e.message }))
        )
      );
    }
    return next(error);
  }
}

// ============================================================
// POST /api/v1/auth/login
// ============================================================

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const input = loginSchema.parse(req.body);
    const result = await loginUser(input);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return sendSuccess(res, { user: result.user });
  } catch (error) {
    if (error instanceof ZodError) {
      return next(
        AppError.validationFailed(
          'Please verify your input details and try again.',
          error.issues.map((e) => ({ field: e.path.join('.'), message: e.message }))
        )
      );
    }
    return next(error);
  }
}

// ============================================================
// POST /api/v1/auth/refresh
// ============================================================

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      throw AppError.unauthenticated('Missing refresh token.');
    }

    const result = await refreshSession(refreshToken);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return sendSuccess(res, { message: 'Token refreshed successfully.' });
  } catch (error) {
    return next(error);
  }
}

// ============================================================
// POST /api/v1/auth/logout
// ============================================================

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      await logoutSession(refreshToken);
    }
    clearAuthCookies(res);
    return sendSuccess(res, { message: 'Logged out successfully.' });
  } catch (error) {
    return next(error);
  }
}

// ============================================================
// GET /api/v1/auth/me
// ============================================================

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw AppError.unauthenticated();
    }
    const user = await getCurrentUser(req.user.id);
    return sendSuccess(res, { user });
  } catch (error) {
    return next(error);
  }
}
