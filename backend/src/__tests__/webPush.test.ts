import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import webPush from 'web-push';
import fs from 'fs';
import path from 'path';
import app from '../app';
import * as pool from '../db/pool';
import { env, envSchema } from '../config/env';
import { generateAccessToken } from '../shared/tokens';
import {
  SubscribePushSchema,
  isValidBase64OfLength,
} from '../modules/notifications/notifications.types';
import {
  sendAlertNotifications,
  getVapidPublicKey,
} from '../modules/notifications/notifications.service';
import { AlertItem } from '../alerts/alerts.types';

vi.mock('../db/pool', () => ({
  pool: {
    query: vi.fn(),
    end: vi.fn().mockResolvedValue(undefined),
  },
  query: vi.fn(),
  getClient: vi.fn(),
}));

describe('Phase 5 Step 4 — Web Push Hardening Test Suite', () => {
  const validP256dh = Buffer.alloc(65, 4).toString('base64');
  const validAuth = Buffer.alloc(16, 1).toString('base64');

  const generatedVapid = webPush.generateVAPIDKeys();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // A. Production VAPID Configuration & Validation (Contract §8.2)
  // ============================================================
  describe('A. VAPID Configuration & Validation', () => {
    it('accepts valid production VAPID configuration with generated keys', () => {
      const result = envSchema.safeParse({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://drch:secret@localhost:5432/drch',
        JWT_ACCESS_SECRET: 'super_secret_access_key_123456789012',
        JWT_REFRESH_SECRET: 'super_secret_refresh_key_123456789012',
        FRONTEND_URL: 'https://drch.example.com',
        VAPID_PUBLIC_KEY: generatedVapid.publicKey,
        VAPID_PRIVATE_KEY: generatedVapid.privateKey,
        VAPID_SUBJECT: 'mailto:admin@drch.gov',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.VAPID_PUBLIC_KEY).toBe(generatedVapid.publicKey);
        expect(result.data.VAPID_PRIVATE_KEY).toBe(generatedVapid.privateKey);
        expect(result.data.VAPID_SUBJECT).toBe('mailto:admin@drch.gov');
      }
    });

    it('rejects default mock public key in production environment', () => {
      const result = envSchema.safeParse({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://drch:secret@localhost:5432/drch',
        JWT_ACCESS_SECRET: 'super_secret_access_key_123456789012',
        JWT_REFRESH_SECRET: 'super_secret_refresh_key_123456789012',
        FRONTEND_URL: 'https://drch.example.com',
        VAPID_PUBLIC_KEY: 'BF7k_MOCK_VAPID_PUBLIC_KEY_1234567890',
        VAPID_PRIVATE_KEY: generatedVapid.privateKey,
        VAPID_SUBJECT: 'mailto:admin@drch.gov',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.format();
        expect(errors.VAPID_PUBLIC_KEY?._errors[0]).toContain(
          'cannot use development fallback/mock values'
        );
      }
    });

    it('rejects default mock private key in production environment', () => {
      const result = envSchema.safeParse({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://drch:secret@localhost:5432/drch',
        JWT_ACCESS_SECRET: 'super_secret_access_key_123456789012',
        JWT_REFRESH_SECRET: 'super_secret_refresh_key_123456789012',
        FRONTEND_URL: 'https://drch.example.com',
        VAPID_PUBLIC_KEY: generatedVapid.publicKey,
        VAPID_PRIVATE_KEY: 'MOCK_VAPID_PRIVATE_KEY_1234567890',
        VAPID_SUBJECT: 'mailto:admin@drch.gov',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.format();
        expect(errors.VAPID_PRIVATE_KEY?._errors[0]).toContain(
          'cannot use development fallback/mock values'
        );
      }
    });

    it('rejects public key with invalid byte length (not 65 bytes decoded)', () => {
      const invalidPub = Buffer.alloc(32).toString('base64url');
      const result = envSchema.safeParse({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://drch:secret@localhost:5432/drch',
        JWT_ACCESS_SECRET: 'super_secret_access_key_123456789012',
        JWT_REFRESH_SECRET: 'super_secret_refresh_key_123456789012',
        FRONTEND_URL: 'https://drch.example.com',
        VAPID_PUBLIC_KEY: invalidPub,
        VAPID_PRIVATE_KEY: generatedVapid.privateKey,
        VAPID_SUBJECT: 'mailto:admin@drch.gov',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.format();
        expect(errors.VAPID_PUBLIC_KEY?._errors[0]).toContain(
          'must be a 65-byte uncompressed P-256 public key'
        );
      }
    });

    it('rejects private key with invalid byte length (not 32 bytes decoded)', () => {
      const invalidPriv = Buffer.alloc(16).toString('base64url');
      const result = envSchema.safeParse({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://drch:secret@localhost:5432/drch',
        JWT_ACCESS_SECRET: 'super_secret_access_key_123456789012',
        JWT_REFRESH_SECRET: 'super_secret_refresh_key_123456789012',
        FRONTEND_URL: 'https://drch.example.com',
        VAPID_PUBLIC_KEY: generatedVapid.publicKey,
        VAPID_PRIVATE_KEY: invalidPriv,
        VAPID_SUBJECT: 'mailto:admin@drch.gov',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.format();
        expect(errors.VAPID_PRIVATE_KEY?._errors[0]).toContain(
          'must be a 32-byte P-256 private key'
        );
      }
    });

    it('rejects invalid VAPID subject format (must be mailto: or URL)', () => {
      const result = envSchema.safeParse({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://drch:secret@localhost:5432/drch',
        JWT_ACCESS_SECRET: 'super_secret_access_key_123456789012',
        JWT_REFRESH_SECRET: 'super_secret_refresh_key_123456789012',
        FRONTEND_URL: 'https://drch.example.com',
        VAPID_PUBLIC_KEY: generatedVapid.publicKey,
        VAPID_PRIVATE_KEY: generatedVapid.privateKey,
        VAPID_SUBJECT: 'invalid_subject_string',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.format();
        expect(errors.VAPID_SUBJECT?._errors[0]).toContain(
          'must be a valid mailto: URI or URL'
        );
      }
    });

    it('permits fallback mock VAPID keys in development/test environment', () => {
      const result = envSchema.safeParse({
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://drch:secret@localhost:5432/drch',
        JWT_ACCESS_SECRET: 'super_secret_access_key_123456789012',
        JWT_REFRESH_SECRET: 'super_secret_refresh_key_123456789012',
        VAPID_PUBLIC_KEY: 'BF7k_MOCK_VAPID_PUBLIC_KEY_1234567890',
        VAPID_PRIVATE_KEY: 'MOCK_VAPID_PRIVATE_KEY_1234567890',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.VAPID_PUBLIC_KEY).toContain('MOCK');
      }
    });
  });

  // ============================================================
  // B. Push Subscription Payload Validation (Contract §8.3)
  // ============================================================
  describe('B. Push Subscription Payload Validation', () => {
    it('accepts valid push subscription payload with 65-byte p256dh and 16-byte auth', () => {
      const result = SubscribePushSchema.safeParse({
        endpoint: 'https://fcm.googleapis.com/fcm/send/token123',
        keys: {
          p256dh: validP256dh,
          auth: validAuth,
        },
        location: { lat: 12.9716, lng: 77.5946 },
      });

      expect(result.success).toBe(true);
    });

    it('rejects malformed endpoint URLs (non-URL or unsupported protocols)', () => {
      const res1 = SubscribePushSchema.safeParse({
        endpoint: 'not-a-valid-url',
        keys: { p256dh: validP256dh, auth: validAuth },
      });
      expect(res1.success).toBe(false);

      const res2 = SubscribePushSchema.safeParse({
        endpoint: 'ftp://push.server.com/endpoint',
        keys: { p256dh: validP256dh, auth: validAuth },
      });
      expect(res2.success).toBe(false);
    });

    it('rejects p256dh key if decoded length is not 65 bytes', () => {
      const shortKey = Buffer.alloc(32).toString('base64');
      const result = SubscribePushSchema.safeParse({
        endpoint: 'https://push.example.com/endpoint',
        keys: {
          p256dh: shortKey,
          auth: validAuth,
        },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('65 bytes decoded');
      }
    });

    it('rejects auth key if decoded length is not 16 bytes', () => {
      const shortAuth = Buffer.alloc(8).toString('base64');
      const result = SubscribePushSchema.safeParse({
        endpoint: 'https://push.example.com/endpoint',
        keys: {
          p256dh: validP256dh,
          auth: shortAuth,
        },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('16 bytes decoded');
      }
    });

    it('rejects keys containing non-base64 characters', () => {
      const result = SubscribePushSchema.safeParse({
        endpoint: 'https://push.example.com/endpoint',
        keys: {
          p256dh: 'invalid!characters@in#base64$',
          auth: validAuth,
        },
      });

      expect(result.success).toBe(false);
    });

    it('isValidBase64OfLength helper verifies byte lengths correctly', () => {
      expect(isValidBase64OfLength(validP256dh, 65)).toBe(true);
      expect(isValidBase64OfLength(validP256dh, 32)).toBe(false);
      expect(isValidBase64OfLength(validAuth, 16)).toBe(true);
      expect(isValidBase64OfLength(validAuth, 65)).toBe(false);
      expect(isValidBase64OfLength('', 16)).toBe(false);
      expect(isValidBase64OfLength('???notbase64???', 16)).toBe(false);
    });
  });

  // ============================================================
  // C. Subscription Endpoint & Ownership Security (Contract §8.3 & §8.4)
  // ============================================================
  describe('C. Subscription Endpoint & Ownership Security', () => {
    it('requires authentication for POST /api/v1/notifications/subscribe', async () => {
      const res = await request(app)
        .post('/api/v1/notifications/subscribe')
        .send({
          endpoint: 'https://push.example.com/endpoint',
          keys: { p256dh: validP256dh, auth: validAuth },
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects malformed push subscription via API with 400 VALIDATION_FAILED', async () => {
      const token = generateAccessToken({
        id: 'user-valid',
        email: 'user@example.com',
        roles: ['CITIZEN'],
      });

      const res = await request(app)
        .post('/api/v1/notifications/subscribe')
        .set('Cookie', [`access_token=${token}`])
        .send({
          endpoint: 'not-a-valid-url',
          keys: { p256dh: 'short', auth: 'short' },
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
      expect(res.body.error.details.length).toBeGreaterThan(0);
    });

    it('accepts valid subscription and stores for authenticated user', async () => {
      const token = generateAccessToken({
        id: 'user-valid-owner',
        email: 'owner@example.com',
        roles: ['CITIZEN'],
      });

      vi.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [] } as any);

      const res = await request(app)
        .post('/api/v1/notifications/subscribe')
        .set('Cookie', [`access_token=${token}`])
        .send({
          endpoint: 'https://fcm.googleapis.com/fcm/send/valid-device-token',
          keys: { p256dh: validP256dh, auth: validAuth },
          location: { lat: 12.9716, lng: 77.5946 },
        });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.message).toBe('Web Push subscription registered.');

      // Verify user_id in SQL query parameter was bound to authenticated user
      const queryCalls = (pool.query as any).mock.calls;
      expect(queryCalls.length).toBe(1);
      const [, params] = queryCalls[0];
      expect(params[1]).toBe('user-valid-owner');
    });

    it('GET /api/v1/notifications/vapid-public-key returns public key and never leaks private key', async () => {
      const res = await request(app).get('/api/v1/notifications/vapid-public-key');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.publicKey).toBe(getVapidPublicKey());
      expect(res.body.data.privateKey).toBeUndefined();
      expect(res.text).not.toContain(env.VAPID_PRIVATE_KEY);
    });
  });

  // ============================================================
  // D. Push Delivery Error Handling & Cleanup (Contract §8.1.3 & §8.1.4)
  // ============================================================
  describe('D. Push Delivery Error Handling & Invalid Subscription Cleanup', () => {
    const mockAlert: AlertItem = {
      id: 'alert-zone-1',
      authorId: 'auth-user-1',
      title: 'Severe Cyclone Warning',
      message: 'Immediate evacuation required for Zone A',
      severity: 'CRITICAL',
      affectedZone: {
        type: 'Polygon',
        coordinates: [
          [
            [77.5, 12.9],
            [77.6, 12.9],
            [77.6, 13.0],
            [77.5, 13.0],
            [77.5, 12.9],
          ],
        ],
      },
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      cancelledAt: null,
      createdAt: new Date().toISOString(),
    };

    it('purges invalid/expired subscription on HTTP 410 or 404 from push service', async () => {
      // 1. Mock DB query returning 1 active subscription in affected zone
      vi.spyOn(pool, 'query')
        .mockResolvedValueOnce({
          rows: [
            {
              user_id: 'user-target-1',
              endpoint: 'https://push.expired.service.com/sub/dead-endpoint',
              p256dh: validP256dh,
              auth: validAuth,
            },
          ],
        } as any) // Target query
        .mockResolvedValueOnce({ rows: [] } as any) // In-app notification insert
        .mockResolvedValueOnce({ rows: [] } as any); // Dead subscription delete

      // 2. Mock webPush.sendNotification to reject with 410 Gone
      const sendSpy = vi
        .spyOn(webPush, 'sendNotification')
        .mockRejectedValueOnce({ statusCode: 410, message: 'Subscription expired' });

      // 3. Execute alert notification workflow
      await expect(sendAlertNotifications(mockAlert)).resolves.not.toThrow();

      expect(sendSpy).toHaveBeenCalledTimes(1);

      // Verify DELETE query was issued for the dead endpoint
      const queryCalls = (pool.query as any).mock.calls;
      const deleteCall = queryCalls.find((call: any[]) =>
        call[0]?.includes('DELETE FROM push_subscriptions WHERE endpoint = $1')
      );
      expect(deleteCall).toBeDefined();
      expect(deleteCall[1]).toEqual(['https://push.expired.service.com/sub/dead-endpoint']);
    });

    it('preserves notification history row even if push delivery fails', async () => {
      vi.spyOn(pool, 'query')
        .mockResolvedValueOnce({
          rows: [
            {
              user_id: 'user-history-test',
              endpoint: 'https://push.failing.service.com/sub/1',
              p256dh: validP256dh,
              auth: validAuth,
            },
          ],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any); // Insert notification history

      vi.spyOn(webPush, 'sendNotification').mockRejectedValueOnce({
        statusCode: 500,
        message: 'Push service temporarily unavailable',
      });

      await expect(sendAlertNotifications(mockAlert)).resolves.not.toThrow();

      // Verify that notification history row was inserted BEFORE the push attempt
      const queryCalls = (pool.query as any).mock.calls;
      const insertHistoryCall = queryCalls.find((call: any[]) =>
        call[0]?.includes('INSERT INTO notifications')
      );
      expect(insertHistoryCall).toBeDefined();
      expect(insertHistoryCall[1][1]).toBe('user-history-test');
      expect(insertHistoryCall[1][2]).toBe('alert-zone-1');
    });

    it('does not crash workflow on temporary provider failure (e.g. 503 or network error)', async () => {
      vi.spyOn(pool, 'query')
        .mockResolvedValueOnce({
          rows: [
            {
              user_id: 'user-temp-fail',
              endpoint: 'https://push.temp.service.com/sub/2',
              p256dh: validP256dh,
              auth: validAuth,
            },
          ],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      vi.spyOn(webPush, 'sendNotification').mockRejectedValueOnce(
        new Error('Network connection timeout to push service')
      );

      // Must resolve cleanly without throwing
      await expect(sendAlertNotifications(mockAlert)).resolves.not.toThrow();
    });
  });

  // ============================================================
  // E. Service Worker Asset Verification (Contract §8.4)
  // ============================================================
  describe('E. Service Worker Asset Verification', () => {
    it('verifies production-ready public/sw.js exists with required event handlers', () => {
      const swPath = path.resolve(__dirname, '../../../frontend/public/sw.js');
      expect(fs.existsSync(swPath)).toBe(true);

      const swContent = fs.readFileSync(swPath, 'utf-8');

      // Verify push event handler
      expect(swContent).toContain("self.addEventListener('push'");
      expect(swContent).toContain('showNotification');

      // Verify notification click event handler
      expect(swContent).toContain("self.addEventListener('notificationclick'");
      expect(swContent).toContain('notification.close()');

      // Verify safe URL navigation logic (relative path verification)
      expect(swContent).toContain("rawUrl.startsWith('/')");
      expect(swContent).toContain("!rawUrl.startsWith('//')");
    });
  });
});
