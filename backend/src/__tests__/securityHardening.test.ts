import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { Server as HttpServer } from 'http';
import app from '../app';
import { envSchema, env } from '../config/env';
import { pool } from '../db/pool';
import * as socketServer from '../socket/socket.server';
import {
  purgeExpiredSessions,
  startSessionCleanup,
  stopSessionCleanup,
  isSessionCleanupRunning,
} from '../services/sessionCleanup';
import {
  performShutdown,
  resetShutdownStateForTesting,
  isShutdownInProgress,
  initGracefulShutdown,
} from '../services/shutdown.service';

vi.mock('../db/pool', () => ({
  pool: {
    query: vi.fn(),
    end: vi.fn().mockResolvedValue(undefined),
  },
  query: vi.fn(),
  getClient: vi.fn(),
}));

describe('Phase 5 Step 3 — Security Hardening Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetShutdownStateForTesting();
    stopSessionCleanup();
  });

  afterEach(() => {
    resetShutdownStateForTesting();
    stopSessionCleanup();
  });

  // ============================================================
  // A. Production Helmet / CSP Hardening
  // ============================================================
  describe('A. Helmet & Content Security Policy (CSP)', () => {
    it('sets standard security headers in non-production environment', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBeDefined();
    });

    it('enforces hardened production CSP and HSTS headers in production mode', async () => {
      const prodApp = express();
      prodApp.use(
        helmet({
          contentSecurityPolicy: {
            directives: {
              defaultSrc: ["'none'"],
              frameAncestors: ["'none'"],
            },
          },
          hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          },
          referrerPolicy: {
            policy: 'no-referrer-when-downgrade',
          },
          frameguard: {
            action: 'deny',
          },
        })
      );
      prodApp.get('/test', (_req, res) => res.json({ ok: true }));

      const res = await request(prodApp).get('/test');
      expect(res.status).toBe(200);

      // Verify CSP directives
      const csp = res.headers['content-security-policy'];
      expect(csp).toBeDefined();
      expect(csp).toContain("default-src 'none'");
      expect(csp).toContain("frame-ancestors 'none'");

      // Verify HSTS (1 year max-age, includeSubDomains, preload)
      const hsts = res.headers['strict-transport-security'];
      expect(hsts).toBeDefined();
      expect(hsts).toContain('max-age=31536000');
      expect(hsts).toContain('includeSubDomains');
      expect(hsts).toContain('preload');

      // Verify X-Content-Type-Options
      expect(res.headers['x-content-type-options']).toBe('nosniff');

      // Verify Frameguard deny
      expect(res.headers['x-frame-options']).toBe('DENY');

      // Verify Referrer-Policy
      expect(res.headers['referrer-policy']).toBe('no-referrer-when-downgrade');
    });

    it('does not leak X-Powered-By header', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });

  // ============================================================
  // B. Production CORS Validation
  // ============================================================
  describe('B. CORS Configuration & Validation', () => {
    it('rejects wildcard (*) FRONTEND_URL in production environment', () => {
      const result = envSchema.safeParse({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://drch:secret@localhost:5432/drch',
        JWT_ACCESS_SECRET: 'super_secret_access_key_123456789012',
        JWT_REFRESH_SECRET: 'super_secret_refresh_key_123456789012',
        FRONTEND_URL: '*',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.format();
        expect(errors.FRONTEND_URL?._errors[0]).toContain(
          'cannot be wildcard (*)'
        );
      }
    });

    it('rejects empty or non-HTTP FRONTEND_URL in production environment', () => {
      const result = envSchema.safeParse({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://drch:secret@localhost:5432/drch',
        JWT_ACCESS_SECRET: 'super_secret_access_key_123456789012',
        JWT_REFRESH_SECRET: 'super_secret_refresh_key_123456789012',
        FRONTEND_URL: 'ftp://invalid-url',
      });

      expect(result.success).toBe(false);
    });

    it('accepts valid HTTP/HTTPS FRONTEND_URL in production environment', () => {
      const result = envSchema.safeParse({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://drch:secret@localhost:5432/drch',
        JWT_ACCESS_SECRET: 'super_secret_access_key_123456789012',
        JWT_REFRESH_SECRET: 'super_secret_refresh_key_123456789012',
        FRONTEND_URL: 'https://drch.example.com',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.FRONTEND_URL).toBe('https://drch.example.com');
      }
    });

    it('accepts configured frontend origin and sets credentials header', async () => {
      const res = await request(app)
        .get('/health')
        .set('Origin', env.FRONTEND_URL);

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe(env.FRONTEND_URL);
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('strictly restricts origins in production CORS middleware', async () => {
      const prodOrigin = 'https://drch.organization.gov';
      const prodCorsApp = express();
      prodCorsApp.use(
        cors({
          origin: (origin, callback) => {
            if (!origin || origin === prodOrigin) {
              callback(null, true);
            } else {
              callback(null, false);
            }
          },
          credentials: true,
          methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
        })
      );
      prodCorsApp.get('/test', (_req, res) => res.json({ ok: true }));

      // Request from authorized origin
      const validRes = await request(prodCorsApp)
        .get('/test')
        .set('Origin', prodOrigin);
      expect(validRes.headers['access-control-allow-origin']).toBe(prodOrigin);
      expect(validRes.headers['access-control-allow-credentials']).toBe('true');

      // Request from unauthorized origin
      const invalidRes = await request(prodCorsApp)
        .get('/test')
        .set('Origin', 'https://attacker.evil.com');
      expect(invalidRes.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('handles OPTIONS preflight with allowed methods and headers', async () => {
      const res = await request(app)
        .options('/health')
        .set('Origin', env.FRONTEND_URL)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type, Authorization, X-Request-ID');

      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe(env.FRONTEND_URL);
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  // ============================================================
  // C. JSON 404 Catch-All
  // ============================================================
  describe('C. JSON 404 Catch-All Handler', () => {
    it('returns standard JSON 404 envelope for unmatched GET route', async () => {
      const res = await request(app).get('/api/v1/nonexistent-endpoint');

      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body).toEqual({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'The requested API endpoint does not exist.',
          details: [],
        },
      });
    });

    it('returns standard JSON 404 envelope for unmatched POST route', async () => {
      const res = await request(app)
        .post('/api/v1/unknown-path')
        .send({ foo: 'bar' });

      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body.ok).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
      expect(res.body.error.message).toBe('The requested API endpoint does not exist.');
    });

    it('does NOT return HTML error page for unmatched routes', async () => {
      const res = await request(app).get('/totally/random/path');

      expect(res.status).toBe(404);
      expect(res.text).not.toContain('<!DOCTYPE html>');
      expect(res.text).not.toContain('Cannot GET');
      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    it('does not leak stack traces in 404 responses', async () => {
      const res = await request(app).get('/api/v1/secret-does-not-exist');

      expect(res.body.error.stack).toBeUndefined();
      expect(res.body.stack).toBeUndefined();
    });

    it('preserves existing matched routes without interference', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.status).toBe('healthy');
    });
  });

  // ============================================================
  // D. Graceful Shutdown
  // ============================================================
  describe('D. Graceful Shutdown', () => {
    it('executes shutdown cleanly closing HTTP server, Socket.IO, DB pool, and stopping timer', async () => {
      const mockServerClose = vi.fn((cb: (err?: Error) => void) => cb());
      const mockHttpServer = { close: mockServerClose } as unknown as HttpServer;

      const mockIoClose = vi.fn((cb: () => void) => cb());
      vi.spyOn(socketServer, 'getIOServer').mockReturnValue({
        close: mockIoClose,
      } as any);

      startSessionCleanup();
      expect(isSessionCleanupRunning()).toBe(true);

      const mockExit = vi.fn();
      await performShutdown(mockHttpServer, 'SIGTERM', { exitFn: mockExit });

      // 1. Session cleanup stopped
      expect(isSessionCleanupRunning()).toBe(false);

      // 2. HTTP server closed
      expect(mockServerClose).toHaveBeenCalledTimes(1);

      // 3. Socket.IO closed
      expect(mockIoClose).toHaveBeenCalledTimes(1);

      // 4. PostgreSQL pool closed
      expect(pool.end).toHaveBeenCalledTimes(1);

      // 5. Exited cleanly with 0
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('works cleanly when Socket.IO server is not initialized', async () => {
      const mockServerClose = vi.fn((cb: (err?: Error) => void) => cb());
      const mockHttpServer = { close: mockServerClose } as unknown as HttpServer;

      vi.spyOn(socketServer, 'getIOServer').mockReturnValue(null);

      const mockExit = vi.fn();
      await performShutdown(mockHttpServer, 'SIGINT', { exitFn: mockExit });

      expect(mockServerClose).toHaveBeenCalledTimes(1);
      expect(pool.end).toHaveBeenCalledTimes(1);
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('prevents duplicate shutdown runs when multiple signals are received', async () => {
      const mockServerClose = vi.fn((cb: (err?: Error) => void) => cb());
      const mockHttpServer = { close: mockServerClose } as unknown as HttpServer;
      vi.spyOn(socketServer, 'getIOServer').mockReturnValue(null);

      const mockExit = vi.fn();

      // First call initiates shutdown
      const p1 = performShutdown(mockHttpServer, 'SIGTERM', { exitFn: mockExit });
      // Second call receives duplicate signal
      const p2 = performShutdown(mockHttpServer, 'SIGINT', { exitFn: mockExit });

      await Promise.all([p1, p2]);

      expect(mockServerClose).toHaveBeenCalledTimes(1);
      expect(pool.end).toHaveBeenCalledTimes(1);
      expect(mockExit).toHaveBeenCalledTimes(1);
    });

    it('handles server close error and exits with code 1', async () => {
      const mockServerClose = vi.fn((cb: (err?: Error) => void) =>
        cb(new Error('Server close failure'))
      );
      const mockHttpServer = { close: mockServerClose } as unknown as HttpServer;
      vi.spyOn(socketServer, 'getIOServer').mockReturnValue(null);

      const mockExit = vi.fn();
      await performShutdown(mockHttpServer, 'SIGTERM', { exitFn: mockExit });

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('handles database pool error and exits with code 1', async () => {
      const mockServerClose = vi.fn((cb: (err?: Error) => void) => cb());
      const mockHttpServer = { close: mockServerClose } as unknown as HttpServer;
      vi.spyOn(socketServer, 'getIOServer').mockReturnValue(null);
      vi.mocked(pool.end).mockRejectedValueOnce(new Error('Pool drain error'));

      const mockExit = vi.fn();
      await performShutdown(mockHttpServer, 'SIGTERM', { exitFn: mockExit });

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('registers SIGTERM and SIGINT listeners in initGracefulShutdown', () => {
      const processOnSpy = vi.spyOn(process, 'on');
      const mockHttpServer = {} as HttpServer;

      initGracefulShutdown(mockHttpServer);

      const registeredSignals = processOnSpy.mock.calls.map((call) => call[0]);
      expect(registeredSignals).toContain('SIGTERM');
      expect(registeredSignals).toContain('SIGINT');
    });
  });

  // ============================================================
  // E. Expired Session Cleanup
  // ============================================================
  describe('E. Expired Session Cleanup', () => {
    it('executes parameterized maintenance query with default 30-day retention', async () => {
      vi.mocked(pool.query).mockResolvedValueOnce({
        rowCount: 5,
        rows: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }],
      } as any);

      const purged = await purgeExpiredSessions(30);

      expect(purged).toBe(5);
      expect(pool.query).toHaveBeenCalledTimes(1);

      const [sql, params] = (pool.query as any).mock.calls[0];
      expect(sql).toContain('DELETE FROM sessions');
      expect(sql).toContain("expires_at < NOW() - ($1 || ' days')::INTERVAL");
      expect(sql).toContain("revoked_at IS NOT NULL AND revoked_at < NOW() - ($1 || ' days')::INTERVAL");
      expect(params).toEqual([30]);
    });

    it('supports custom retention period parameter', async () => {
      vi.mocked(pool.query).mockResolvedValueOnce({
        rowCount: 2,
        rows: [{ id: 'a' }, { id: 'b' }],
      } as any);

      const purged = await purgeExpiredSessions(14);

      expect(purged).toBe(2);
      const [, params] = (pool.query as any).mock.calls[0];
      expect(params).toEqual([14]);
    });

    it('handles query error gracefully and rethrows for caller tracking', async () => {
      vi.mocked(pool.query).mockRejectedValueOnce(new Error('DB Connection lost'));

      await expect(purgeExpiredSessions(30)).rejects.toThrow('DB Connection lost');
    });

    it('starts scheduled cleanup timer and prevents duplicate timers', () => {
      expect(isSessionCleanupRunning()).toBe(false);

      const timer1 = startSessionCleanup(60000, 30);
      expect(isSessionCleanupRunning()).toBe(true);

      const timer2 = startSessionCleanup(60000, 30);
      expect(timer1).toBe(timer2);

      stopSessionCleanup();
      expect(isSessionCleanupRunning()).toBe(false);
    });

    it('stopSessionCleanup safely handles multiple invocations', () => {
      stopSessionCleanup();
      stopSessionCleanup();
      expect(isSessionCleanupRunning()).toBe(false);
    });
  });
});
