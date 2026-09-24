import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Response } from 'express';
import { env } from '../config/env';

// ============================================================
// Token Payloads
// ============================================================

export interface AccessTokenPayload {
  id: string;
  roles: string[];
}

export interface RefreshTokenPayload {
  id: string;
  sessionId: string;
}

// ============================================================
// Token Generation
// ============================================================

export function generateAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
}

export function generateRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

// ============================================================
// Token Verification
// ============================================================

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

// ============================================================
// SHA-256 Hashing (for refresh token storage)
// ============================================================

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ============================================================
// Cookie Helpers
// ============================================================

const COOKIE_OPTIONS_BASE = {
  httpOnly: true,
  sameSite: 'strict' as const,
  path: '/',
};

function getCookieOptions(maxAgeMs: number) {
  return {
    ...COOKIE_OPTIONS_BASE,
    secure: env.NODE_ENV === 'production',
    maxAge: maxAgeMs,
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

/** 15 minutes in milliseconds */
const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;

/** 7 days in milliseconds */
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('access_token', accessToken, getCookieOptions(ACCESS_TOKEN_MAX_AGE));
  res.cookie('refresh_token', refreshToken, getCookieOptions(REFRESH_TOKEN_MAX_AGE));
}

export function clearAuthCookies(res: Response) {
  const opts = {
    ...COOKIE_OPTIONS_BASE,
    secure: env.NODE_ENV === 'production',
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
  res.clearCookie('access_token', opts);
  res.clearCookie('refresh_token', opts);
}
