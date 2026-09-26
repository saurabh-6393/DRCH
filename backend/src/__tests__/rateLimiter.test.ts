import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import * as pool from '../db/pool';
import { env } from '../config/env';
import { generateAccessToken } from '../shared/tokens';
import {
  authLimiter,
  incidentSubmissionLimiter,
  refreshLimiter,
  generalPublicLimiter,
  resetRateLimiters,
  authStore,
  incidentStore,
  refreshStore,
  publicStore,
} from '../middleware/rateLimiter';

vi.mock('../db/pool');
vi.mock('../socket/socket.server', () => ({
  getIOServer: vi.fn(() => null),
}));
vi.mock('../modules/notifications/notifications.service', () => ({
  sendAlertNotifications: vi.fn(() => Promise.resolve()),
}));

describe('Rate Limiting Middleware (Phase 5 Step 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimiters();

    // Default mock response for DB queries
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] } as any);
  });

  describe('1. authLimiter (POST /api/v1/auth/login and /register)', () => {
    it('1. auth login is limited to 5 requests / 15 minutes', async () => {
      // Send 5 requests
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'user@example.com', password: 'wrong' });
        // The first 5 should reach auth controller (401 invalid credentials or 400 validation)
        expect(res.status).not.toBe(429);
      }

      // 6th request must be rate limited to 429
      const limitedRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'user@example.com', password: 'wrong' });

      expect(limitedRes.status).toBe(429);
      expect(limitedRes.body).toEqual({
        ok: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again in 15 minutes.',
          details: [],
        },
      });
    });

    it('2. auth register is limited to 5 requests / 15 minutes', async () => {
      // Send 5 requests
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post('/api/v1/auth/register')
          .send({ email: `reg${i}@example.com`, password: 'pwd', displayName: 'User' });
        expect(res.status).not.toBe(429);
      }

      // 6th request must be rate limited to 429
      const limitedRes = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'reg6@example.com', password: 'pwd', displayName: 'User' });

      expect(limitedRes.status).toBe(429);
      expect(limitedRes.body.error.code).toBe('RATE_LIMITED');
    });

    it('13, 14, 15, 16, 17, 18. rate-limited responses include standard headers and DRCH envelope', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app).post('/api/v1/auth/login').send({});
      }

      const res = await request(app).post('/api/v1/auth/login').send({});

      expect(res.status).toBe(429);
      expect(res.body.ok).toBe(false);
      expect(res.body.error.code).toBe('RATE_LIMITED');
      expect(res.body.error.message).toBe('Too many requests. Please try again in 15 minutes.');
      expect(Array.isArray(res.body.error.details)).toBe(true);

      // Verify standard rate-limit headers
      expect(res.headers['ratelimit-limit']).toBe('5');
      expect(res.headers['ratelimit-remaining']).toBe('0');
      expect(res.headers['ratelimit-reset']).toBeDefined();
    });
  });

  describe('2. refreshLimiter (POST /api/v1/auth/refresh)', () => {
    it('3. refresh is limited to 10 requests / 15 minutes', async () => {
      for (let i = 0; i < 10; i++) {
        const res = await request(app)
          .post('/api/v1/auth/refresh')
          .send({});
        expect(res.status).not.toBe(429);
      }

      const limitedRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({});

      expect(limitedRes.status).toBe(429);
      expect(limitedRes.body.error.code).toBe('RATE_LIMITED');
      expect(limitedRes.headers['ratelimit-limit']).toBe('10');
      expect(limitedRes.headers['ratelimit-remaining']).toBe('0');
    });
  });

  describe('3. incidentSubmissionLimiter (POST /api/v1/incidents)', () => {
    it('4. incident submission is limited to 10 requests / 15 minutes per user', async () => {
      const userToken = generateAccessToken({ id: 'user-sub-1', roles: ['CITIZEN'] });
      const cookie = `access_token=${userToken}`;

      // Mock client for transaction in createIncident
      const mockClient = {
        query: vi.fn().mockResolvedValue({
          rows: [
            {
              id: 'inc-1',
              category: 'FLOOD',
              description: 'Flood alert test description at least twenty chars',
              lat: 12.97,
              lng: 77.59,
              status: 'REPORTED',
              severity: 'LOW',
              ai_status: 'NOT_EVALUATED',
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        }),
        release: vi.fn(),
      };
      vi.spyOn(pool, 'getClient').mockResolvedValue(mockClient as any);

      // Send 10 incident submissions for user-sub-1
      for (let i = 0; i < 10; i++) {
        const res = await request(app)
          .post('/api/v1/incidents')
          .set('Cookie', cookie)
          .field('category', 'FLOOD')
          .field('description', 'Flood alert test description at least twenty chars')
          .field('latitude', '12.97')
          .field('longitude', '77.59');
        expect(res.status).not.toBe(429);
      }

      // 11th request for user-sub-1 is 429
      const limitedRes = await request(app)
        .post('/api/v1/incidents')
        .set('Cookie', cookie)
        .field('category', 'FLOOD')
        .field('description', 'Flood alert test description at least twenty chars')
        .field('latitude', '12.97')
        .field('longitude', '77.59');

      expect(limitedRes.status).toBe(429);
      expect(limitedRes.body.error.code).toBe('RATE_LIMITED');
      expect(limitedRes.headers['ratelimit-limit']).toBe('10');
      expect(limitedRes.headers['ratelimit-remaining']).toBe('0');
    });

    it('5. incident submission limiter keys by authenticated user ID (different user is not throttled)', async () => {
      const user1Token = generateAccessToken({ id: 'user-A', roles: ['CITIZEN'] });
      const user2Token = generateAccessToken({ id: 'user-B', roles: ['CITIZEN'] });

      // Max out user-A (10 requests)
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/v1/incidents')
          .set('Cookie', `access_token=${user1Token}`)
          .field('category', 'FLOOD');
      }

      // user-A 11th request is throttled
      const user1Res = await request(app)
        .post('/api/v1/incidents')
        .set('Cookie', `access_token=${user1Token}`)
        .field('category', 'FLOOD');
      expect(user1Res.status).toBe(429);

      // user-B (same client IP) is NOT throttled because keying is by user ID
      const user2Res = await request(app)
        .post('/api/v1/incidents')
        .set('Cookie', `access_token=${user2Token}`)
        .field('category', 'FLOOD');
      expect(user2Res.status).not.toBe(429);
    });

    it('6. incident submission limiter runs after authentication (unauthenticated is 401, not 429)', async () => {
      const res = await request(app)
        .post('/api/v1/incidents')
        .field('category', 'FLOOD');
      // Should be rejected by authenticate middleware with 401 UNAUTHENTICATED
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('7. incident submission limiter runs before upload middleware (throttled user rejected before upload)', async () => {
      const userToken = generateAccessToken({ id: 'user-upload-test', roles: ['CITIZEN'] });
      const cookie = `access_token=${userToken}`;

      // Exhaust limit
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/v1/incidents')
          .set('Cookie', cookie)
          .field('category', 'FLOOD');
      }

      // Now send request with file upload
      const limitedRes = await request(app)
        .post('/api/v1/incidents')
        .set('Cookie', cookie)
        .attach('media', Buffer.from('fake image content'), 'test.jpg')
        .field('category', 'FLOOD');

      expect(limitedRes.status).toBe(429);
      expect(limitedRes.body.error.code).toBe('RATE_LIMITED');
    });
  });

  describe('4. generalPublicLimiter (Public Read Endpoints)', () => {
    it('8. public incidents route (GET /api/v1/incidents/public) is limited to 100 requests / 15 minutes', async () => {
      vi.spyOn(pool, 'query').mockResolvedValue({
        rows: [
          {
            id: 'inc-pub-1',
            category: 'FLOOD',
            description: 'Public report',
            rounded_lat: 12.97,
            rounded_lng: 77.59,
            status: 'VERIFIED',
            severity: 'MEDIUM',
            created_at: new Date(),
          },
        ],
      } as any);

      // Hit 100 times
      for (let i = 0; i < 100; i++) {
        const res = await request(app).get('/api/v1/incidents/public');
        expect(res.status).toBe(200);
      }

      // 101st request throttled
      const limitedRes = await request(app).get('/api/v1/incidents/public');
      expect(limitedRes.status).toBe(429);
      expect(limitedRes.body.error.code).toBe('RATE_LIMITED');
      expect(limitedRes.headers['ratelimit-limit']).toBe('100');
    });

    it('9. shelters public route (GET /api/v1/shelters) is limited to 100 requests / 15 minutes', async () => {
      // Hit 100 times
      for (let i = 0; i < 100; i++) {
        await request(app).get('/api/v1/shelters?latitude=12.97&longitude=77.59');
      }

      const limitedRes = await request(app).get('/api/v1/shelters?latitude=12.97&longitude=77.59');
      expect(limitedRes.status).toBe(429);
      expect(limitedRes.body.error.code).toBe('RATE_LIMITED');
    });

    it('10. alerts public route (GET /api/v1/alerts) is limited to 100 requests / 15 minutes', async () => {
      for (let i = 0; i < 100; i++) {
        await request(app).get('/api/v1/alerts');
      }

      const limitedRes = await request(app).get('/api/v1/alerts');
      expect(limitedRes.status).toBe(429);
      expect(limitedRes.body.error.code).toBe('RATE_LIMITED');
    });

    it('11. authenticated operator routes are NOT accidentally throttled by the public limiter', async () => {
      const authorityToken = generateAccessToken({ id: 'auth-op-1', roles: ['AUTHORITY'] });
      const cookie = `access_token=${authorityToken}`;

      // Max out public limiter (100 requests)
      for (let i = 0; i < 100; i++) {
        await request(app).get('/api/v1/alerts');
      }

      // Public endpoint is now 429
      const publicRes = await request(app).get('/api/v1/alerts');
      expect(publicRes.status).toBe(429);

      // Authenticated operator route (POST /api/v1/alerts or PUT /api/v1/shelters/:id/capacity) is NOT throttled
      // Mock client for transaction in createAlert
      const mockClient = {
        query: vi.fn().mockImplementation((sql: string) => {
          if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return Promise.resolve();
          if (sql.includes('SELECT status, severity FROM incidents')) {
            return Promise.resolve({ rows: [{ status: 'VERIFIED', severity: 'HIGH' }] });
          }
          if (sql.includes('ST_IsValid')) {
            return Promise.resolve({ rows: [{ is_valid: true, area_deg: 0.001 }] });
          }
          return Promise.resolve({
            rows: [
              {
                id: 'alert-op-1',
                incident_id: 'inc-1',
                title: 'Op Alert',
                message: 'Evacuate',
                severity: 'HIGH',
                affected_zone: { type: 'Polygon', coordinates: [] },
                status: 'ACTIVE',
                created_by: 'auth-op-1',
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
          });
        }),
        release: vi.fn(),
      };
      vi.spyOn(pool, 'getClient').mockResolvedValue(mockClient as any);

      const opRes = await request(app)
        .post('/api/v1/alerts')
        .set('Cookie', cookie)
        .send({
          incidentId: 'inc-1',
          title: 'Flood Alert',
          message: 'Evacuate now immediately',
          affectedZone: {
            type: 'Polygon',
            coordinates: [[[80.0, 13.0], [80.01, 13.0], [80.01, 13.01], [80.0, 13.01], [80.0, 13.0]]],
          },
        });

      // Operator route must NOT be 429
      expect(opRes.status).not.toBe(429);
    });

    it('12. /health is never rate-limited', async () => {
      // Max out public limiter
      for (let i = 0; i < 100; i++) {
        await request(app).get('/api/v1/alerts');
      }

      // /health is not affected
      const healthRes = await request(app).get('/health');
      expect(healthRes.status).toBe(200);
      expect(healthRes.body).toEqual({
        ok: true,
        data: expect.objectContaining({ status: 'healthy' }),
      });
    });
  });

  describe('5. Trust Proxy Configuration', () => {
    it('19 & 20. trust proxy configuration is environment-driven and not true', () => {
      expect(env.TRUST_PROXY_HOPS).toBeDefined();
      expect(typeof env.TRUST_PROXY_HOPS).toBe('number');
      expect(env.TRUST_PROXY_HOPS).toBe(1);

      // Verify app.get('trust proxy') is NOT true and matches env.TRUST_PROXY_HOPS
      const trustProxySetting = app.get('trust proxy');
      expect(trustProxySetting).not.toBe(true);
      expect(trustProxySetting).toBe(env.TRUST_PROXY_HOPS);
    });
  });

  describe('6. Store Reset & Window Behavior', () => {
    it('21. limiter behavior resets cleanly when resetRateLimiters() is called', async () => {
      // Exhaust auth limit (5 requests)
      for (let i = 0; i < 5; i++) {
        await request(app).post('/api/v1/auth/login').send({});
      }

      // Verify rate limited
      const limitedRes = await request(app).post('/api/v1/auth/login').send({});
      expect(limitedRes.status).toBe(429);

      // Reset store
      resetRateLimiters();

      // Next request succeeds and is not rate limited
      const freshRes = await request(app).post('/api/v1/auth/login').send({});
      expect(freshRes.status).not.toBe(429);
    });
  });
});
