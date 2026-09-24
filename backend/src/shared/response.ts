import { Response } from 'express';

/**
 * Standard API response helpers following error-handling.md.
 *
 * Success: { ok: true, data: { ... } }
 * Error:   { ok: false, error: { code, message, details } }
 */

export function sendSuccess(res: Response, data: unknown, statusCode = 200) {
  return res.status(statusCode).json({ ok: true, data });
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details: unknown[] = []
) {
  return res.status(statusCode).json({
    ok: false,
    error: { code, message, details },
  });
}
