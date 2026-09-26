import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import * as pool from '../db/pool';
import { logAudit, getAuditLogs } from '../modules/audit/audit.service';
import * as auditService from '../modules/audit/audit.service';
import { registerUser, loginUser, logoutSession } from '../modules/auth/auth.service';
import { submitAuthorityVerification } from '../modules/verifications/verifications.service';
import { createAlert, cancelAlert } from '../modules/alerts/alerts.service';
import { updateShelterCapacity } from '../modules/shelters/shelters.service';
import { allocateResource, deleteAllocation } from '../modules/resources/resources.service';
import bcrypt from 'bcryptjs';
import { generateAccessToken } from '../shared/tokens';

vi.mock('../db/pool');
vi.mock('../socket/socket.server', () => ({
  getIOServer: vi.fn(() => null),
}));
vi.mock('../modules/notifications/notifications.service', () => ({
  sendAlertNotifications: vi.fn(() => Promise.resolve()),
}));

describe('Audit Logging Module (Phase 5)', () => {
  let adminTokenCookie: string;
  let authorityTokenCookie: string;
  let citizenTokenCookie: string;
  let volunteerTokenCookie: string;
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };
    vi.spyOn(pool, 'getClient').mockResolvedValue(mockClient);

    const adminToken = generateAccessToken({ id: 'admin-1', roles: ['ADMIN'] });
    adminTokenCookie = `access_token=${adminToken}`;

    const authorityToken = generateAccessToken({ id: 'auth-1', roles: ['AUTHORITY'] });
    authorityTokenCookie = `access_token=${authorityToken}`;

    const citizenToken = generateAccessToken({ id: 'citizen-1', roles: ['CITIZEN'] });
    citizenTokenCookie = `access_token=${citizenToken}`;

    const volunteerToken = generateAccessToken({ id: 'volunteer-1', roles: ['VOLUNTEER'] });
    volunteerTokenCookie = `access_token=${volunteerToken}`;
  });

  describe('1. audit_logs record creation & properties', () => {
    it('creates an audit record with correct actor_id, target_type, target_id, and ip_address', async () => {
      const mockRow = {
        id: 'audit-123',
        action: 'ALERT_CREATED',
        actor_id: 'user-456',
        target_type: 'ALERT',
        target_id: 'alert-789',
        metadata: { title: 'Flood Alert' },
        ip_address: '192.168.1.1',
        created_at: new Date('2026-09-25T10:00:00Z'),
      };
      vi.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [mockRow] } as any);

      const result = await logAudit({
        action: 'ALERT_CREATED',
        actorId: 'user-456',
        targetType: 'ALERT',
        targetId: 'alert-789',
        metadata: { title: 'Flood Alert' },
        ipAddress: '192.168.1.1',
      });

      expect(result).not.toBeNull();
      expect(result?.id).toBe('audit-123');
      expect(result?.action).toBe('ALERT_CREATED');
      expect(result?.actorId).toBe('user-456');
      expect(result?.targetType).toBe('ALERT');
      expect(result?.targetId).toBe('alert-789');
      expect(result?.metadata).toEqual({ title: 'Flood Alert' });
      expect(result?.ipAddress).toBe('192.168.1.1');
    });

    it('prohibits and strips sensitive secrets from metadata (passwords, tokens, keys)', async () => {
      let capturedParams: any[] = [];
      vi.spyOn(pool, 'query').mockImplementationOnce((_sql: any, params: any) => {
        capturedParams = params;
        return Promise.resolve({
          rows: [
            {
              id: 'audit-strip',
              action: 'USER_REGISTERED',
              actor_id: 'u-1',
              target_type: 'USER',
              target_id: 'u-1',
              metadata: JSON.parse(params[5]),
              ip_address: null,
              created_at: new Date(),
            },
          ],
        } as any);
      });

      await logAudit({
        action: 'USER_REGISTERED',
        actorId: 'u-1',
        targetType: 'USER',
        targetId: 'u-1',
        metadata: {
          email: 'citizen@example.com',
          password: 'supersecretpassword',
          password_hash: '$2a$12$abcdef...',
          access_token: 'jwt.token.here',
          refresh_token: 'refresh.token.here',
          s3_secret_key: 'minio_secret',
          gemini_api_key: 'ai_key',
          nested: {
            auth_token: 'nested_secret',
            safeField: 'allowedValue',
          },
        },
      });

      const parsedMeta = JSON.parse(capturedParams[5]);
      expect(parsedMeta.email).toBe('citizen@example.com');
      expect(parsedMeta.password).toBeUndefined();
      expect(parsedMeta.password_hash).toBeUndefined();
      expect(parsedMeta.access_token).toBeUndefined();
      expect(parsedMeta.refresh_token).toBeUndefined();
      expect(parsedMeta.s3_secret_key).toBeUndefined();
      expect(parsedMeta.gemini_api_key).toBeUndefined();
      expect(parsedMeta.nested.safeField).toBe('allowedValue');
      expect(parsedMeta.nested.auth_token).toBeUndefined();
    });
  });

  describe('2. Transactional vs Non-Transactional Failure Handling', () => {
    it('transactional audit failure throws error to cause transaction rollback', async () => {
      const mockTransactionalClient = {
        query: vi.fn().mockRejectedValueOnce(new Error('DB constraint error on audit')),
      };

      await expect(
        logAudit(
          {
            action: 'INCIDENT_VERIFIED',
            actorId: 'auth-1',
            targetType: 'INCIDENT',
            targetId: 'inc-1',
          },
          mockTransactionalClient as any
        )
      ).rejects.toThrow('DB constraint error on audit');
    });

    it('non-transactional audit failure does not throw and allows primary flow to continue', async () => {
      vi.spyOn(pool, 'query').mockRejectedValueOnce(new Error('Connection lost'));

      const result = await logAudit({
        action: 'LOGIN_SUCCESS',
        actorId: 'u-1',
        targetType: 'USER',
        targetId: 'u-1',
      });

      expect(result).toBeNull(); // handled gracefully without throwing
    });
  });

  describe('3. GET /api/v1/audit Endpoint Access Control', () => {
    it('returns 401 UNAUTHENTICATED if request is unauthenticated', async () => {
      const res = await request(app).get('/api/v1/audit');
      expect(res.status).toBe(401);
      expect(res.body.ok).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('returns 403 FORBIDDEN if user has CITIZEN role', async () => {
      const res = await request(app)
        .get('/api/v1/audit')
        .set('Cookie', citizenTokenCookie);
      expect(res.status).toBe(403);
      expect(res.body.ok).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 403 FORBIDDEN if user has VOLUNTEER role', async () => {
      const res = await request(app)
        .get('/api/v1/audit')
        .set('Cookie', volunteerTokenCookie);
      expect(res.status).toBe(403);
      expect(res.body.ok).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows ADMIN to query audit logs', async () => {
      vi.spyOn(pool, 'query')
        .mockResolvedValueOnce({ rows: [{ total: 1 }] } as any) // count query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'a-1',
              action: 'LOGIN_SUCCESS',
              actor_id: 'admin-1',
              target_type: 'USER',
              target_id: 'admin-1',
              metadata: {},
              ip_address: '127.0.0.1',
              created_at: new Date(),
            },
          ],
        } as any);

      const res = await request(app)
        .get('/api/v1/audit')
        .set('Cookie', adminTokenCookie);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.logs).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
    });

    it('allows AUTHORITY to query audit logs', async () => {
      vi.spyOn(pool, 'query')
        .mockResolvedValueOnce({ rows: [{ total: 0 }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const res = await request(app)
        .get('/api/v1/audit')
        .set('Cookie', authorityTokenCookie);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.logs).toEqual([]);
    });
  });

  describe('4. GET /api/v1/audit Filtering and Pagination', () => {
    it('applies pagination parameters (page and limit)', async () => {
      let capturedSql = '';
      let capturedParams: any[] = [];

      vi.spyOn(pool, 'query').mockImplementation((sql: any, params: any) => {
        if (typeof sql === 'string' && sql.includes('COUNT(')) {
          return Promise.resolve({ rows: [{ total: 50 }] } as any);
        }
        capturedSql = sql;
        capturedParams = params;
        return Promise.resolve({ rows: [] } as any);
      });

      const res = await request(app)
        .get('/api/v1/audit?page=2&limit=15')
        .set('Cookie', adminTokenCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.page).toBe(2);
      expect(res.body.data.limit).toBe(15);
      expect(res.body.data.totalPages).toBe(4);
      expect(capturedSql).toContain('LIMIT $1 OFFSET $2');
      expect(capturedParams).toEqual([15, 15]);
    });

    it('caps limit to maximum of 100', async () => {
      let capturedParams: any[] = [];
      vi.spyOn(pool, 'query').mockImplementation((sql: any, params: any) => {
        if (typeof sql === 'string' && sql.includes('COUNT(')) {
          return Promise.resolve({ rows: [{ total: 200 }] } as any);
        }
        capturedParams = params;
        return Promise.resolve({ rows: [] } as any);
      });

      const res = await request(app)
        .get('/api/v1/audit?limit=250')
        .set('Cookie', adminTokenCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.limit).toBe(100);
      expect(capturedParams[0]).toBe(100);
    });

    it('filters by action, targetType, and actorId', async () => {
      let capturedConditions: string[] = [];

      vi.spyOn(pool, 'query').mockImplementation((sql: any, params: any) => {
        if (typeof sql === 'string') {
          capturedConditions.push(sql);
          if (sql.includes('COUNT(')) {
            return Promise.resolve({ rows: [{ total: 0 }] } as any);
          }
        }
        return Promise.resolve({ rows: [] } as any);
      });

      const testActorId = '00000000-0000-0000-0000-000000000001';
      const res = await request(app)
        .get(`/api/v1/audit?action=ALERT_CREATED&targetType=ALERT&actorId=${testActorId}`)
        .set('Cookie', adminTokenCookie);

      expect(res.status).toBe(200);
      const querySql = capturedConditions.find((s) => s.includes('SELECT id, action'));
      expect(querySql).toContain('action = $1');
      expect(querySql).toContain('target_type = $2');
      expect(querySql).toContain('actor_id = $3');
    });

    it('filters by date range (startDate and endDate)', async () => {
      let capturedSql = '';

      vi.spyOn(pool, 'query').mockImplementation((sql: any) => {
        if (typeof sql === 'string') {
          capturedSql += sql;
          if (sql.includes('COUNT(')) {
            return Promise.resolve({ rows: [{ total: 0 }] } as any);
          }
        }
        return Promise.resolve({ rows: [] } as any);
      });

      const res = await request(app)
        .get('/api/v1/audit?startDate=2026-09-01&endDate=2026-09-30')
        .set('Cookie', adminTokenCookie);

      expect(res.status).toBe(200);
      expect(capturedSql).toContain('created_at >=');
      expect(capturedSql).toContain('created_at <=');
    });
  });

  describe('5. Append-Only Immutability Guarantee', () => {
    it('rejects POST /api/v1/audit (no mutation endpoints exist)', async () => {
      const res = await request(app)
        .post('/api/v1/audit')
        .set('Cookie', adminTokenCookie)
        .send({ action: 'FORGED_ENTRY' });
      expect(res.status).toBe(404);
    });

    it('rejects PUT /api/v1/audit', async () => {
      const res = await request(app)
        .put('/api/v1/audit/123')
        .set('Cookie', adminTokenCookie)
        .send({ action: 'MUTATE' });
      expect(res.status).toBe(404);
    });

    it('rejects PATCH /api/v1/audit', async () => {
      const res = await request(app)
        .patch('/api/v1/audit/123')
        .set('Cookie', adminTokenCookie)
        .send({ action: 'MUTATE' });
      expect(res.status).toBe(404);
    });

    it('rejects DELETE /api/v1/audit', async () => {
      const res = await request(app)
        .delete('/api/v1/audit/123')
        .set('Cookie', adminTokenCookie);
      expect(res.status).toBe(404);
    });
  });

  describe('6. Mandatory 11 Audit Action Integration Points', () => {
    it('wires action 1: USER_REGISTERED', async () => {
      const logAuditSpy = vi.spyOn(auditService, 'logAudit');
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // check email
        .mockResolvedValueOnce({ rows: [] }) // insert user
        .mockResolvedValueOnce({ rows: [{ id: 'role-citizen' }] }) // role
        .mockResolvedValueOnce({ rows: [] }) // user_roles
        .mockResolvedValueOnce({ rows: [] }) // sessions
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      await registerUser({
        email: 'newcitizen@example.com',
        password: 'password123',
        displayName: 'New Citizen',
      }, '10.0.0.1');

      expect(logAuditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_REGISTERED',
          targetType: 'USER',
          metadata: expect.objectContaining({
            email: 'newcitizen@example.com',
            displayName: 'New Citizen',
          }),
          ipAddress: '10.0.0.1',
        })
      );
    });

    it('wires action 2: LOGIN_SUCCESS', async () => {
      const logAuditSpy = vi.spyOn(auditService, 'logAudit');
      vi.spyOn(pool, 'query')
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'user-login-1',
              email: 'login@example.com',
              password_hash: '$2a$12$e8YkYgD4...',
              display_name: 'Logged User',
            },
          ],
        } as any)
        .mockResolvedValueOnce({ rows: [{ name: 'CITIZEN' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any) // insert session
        .mockResolvedValueOnce({ rows: [] } as any); // logAudit

      vi.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never);

      await loginUser(
        { email: 'login@example.com', password: 'password123' },
        { ipAddress: '10.0.0.2', userAgent: 'TestBrowser' }
      );

      expect(logAuditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGIN_SUCCESS',
          actorId: 'user-login-1',
          targetType: 'USER',
          targetId: 'user-login-1',
          metadata: expect.objectContaining({
            email: 'login@example.com',
            userAgent: 'TestBrowser',
          }),
          ipAddress: '10.0.0.2',
        })
      );
    });

    it('wires action 3: LOGIN_FAILED (user not found and wrong password)', async () => {
      const logAuditSpy = vi.spyOn(auditService, 'logAudit');

      // 3A: User not found
      vi.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [] } as any);
      await expect(
        loginUser({ email: 'missing@example.com', password: 'pwd' })
      ).rejects.toThrow();

      expect(logAuditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGIN_FAILED',
          actorId: null,
          targetType: 'USER',
          targetId: '00000000-0000-0000-0000-000000000000',
          metadata: expect.objectContaining({
            attemptedEmail: 'missing@example.com',
          }),
        })
      );

      // 3B: Wrong password
      vi.spyOn(pool, 'query').mockResolvedValueOnce({
        rows: [
          {
            id: 'user-found',
            email: 'found@example.com',
            password_hash: 'hash',
          },
        ],
      } as any);
      vi.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false as never);

      await expect(
        loginUser({ email: 'found@example.com', password: 'wrong' })
      ).rejects.toThrow();

      expect(logAuditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGIN_FAILED',
          actorId: 'user-found',
          targetType: 'USER',
          targetId: 'user-found',
        })
      );
    });

    it('wires action 4: SESSION_REVOKED', async () => {
      const logAuditSpy = vi.spyOn(auditService, 'logAudit');
      vi.spyOn(pool, 'query')
        .mockResolvedValueOnce({
          rows: [{ id: 'sess-123', user_id: 'user-revoked-1' }],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any) // update
        .mockResolvedValueOnce({ rows: [] } as any); // audit

      await logoutSession('dummy-refresh-token', '10.0.0.4');

      expect(logAuditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SESSION_REVOKED',
          actorId: 'user-revoked-1',
          targetType: 'SESSION',
          targetId: 'sess-123',
          metadata: { userId: 'user-revoked-1' },
          ipAddress: '10.0.0.4',
        })
      );
    });

    it('wires action 5: INCIDENT_VERIFIED and action 6: INCIDENT_REJECTED', async () => {
      const logAuditSpy = vi.spyOn(auditService, 'logAudit');

      // 5: VERIFIED
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 'inc-100',
              status: 'VERIFIED',
              severity: 'HIGH',
              updated_at: new Date(),
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] }) // audit insert
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      await submitAuthorityVerification(
        'inc-100',
        'auth-dispatcher-1',
        { decision: 'VERIFIED', severity: 'HIGH' },
        '10.0.0.5'
      );

      expect(logAuditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'INCIDENT_VERIFIED',
          actorId: 'auth-dispatcher-1',
          targetType: 'INCIDENT',
          targetId: 'inc-100',
          metadata: {
            decision: 'VERIFIED',
            severity: 'HIGH',
            previousStatus: 'UNDER_REVIEW',
          },
          ipAddress: '10.0.0.5',
        }),
        mockClient
      );

      // 6: REJECTED
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 'inc-101',
              status: 'REJECTED',
              severity: 'LOW',
              updated_at: new Date(),
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] }) // audit insert
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      await submitAuthorityVerification(
        'inc-101',
        'auth-dispatcher-1',
        { decision: 'REJECTED', severity: 'LOW' },
        '10.0.0.6'
      );

      expect(logAuditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'INCIDENT_REJECTED',
          actorId: 'auth-dispatcher-1',
          targetType: 'INCIDENT',
          targetId: 'inc-101',
          metadata: {
            decision: 'REJECTED',
            severity: 'LOW',
            previousStatus: 'UNDER_REVIEW',
          },
          ipAddress: '10.0.0.6',
        }),
        mockClient
      );
    });

    it('wires action 7: ALERT_CREATED and action 8: ALERT_CANCELLED', async () => {
      const logAuditSpy = vi.spyOn(auditService, 'logAudit');

      vi.spyOn(pool, 'query').mockResolvedValue({ rows: [{ intersects: false }] } as any);

      // 7: ALERT_CREATED
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ status: 'VERIFIED', severity: 'CRITICAL' }],
        }) // check incident
        .mockResolvedValueOnce({
          rows: [{ is_valid: true, area_deg: 0.0001 }],
        }) // ST_IsValid
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'alert-new-1',
              incident_id: 'inc-verified',
              title: 'Tsunami Warning',
              message: 'Immediate evacuation',
              severity: 'CRITICAL',
              affected_zone: { type: 'Polygon', coordinates: [[[80.0, 13.0], [80.005, 13.0], [80.005, 13.005], [80.0, 13.005], [80.0, 13.0]]] },
              status: 'ACTIVE',
              created_by: 'authority-1',
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        }) // insert alert
        .mockResolvedValueOnce({ rows: [] }) // audit insert
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      await createAlert(
        'authority-1',
        {
          incidentId: 'inc-verified',
          title: 'Tsunami Warning',
          message: 'Immediate evacuation',
          affectedZone: {
            type: 'Polygon',
            coordinates: [[[80.0, 13.0], [80.005, 13.0], [80.005, 13.005], [80.0, 13.005], [80.0, 13.0]]],
          },
        },
        '10.0.0.7'
      );

      expect(logAuditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ALERT_CREATED',
          actorId: 'authority-1',
          targetType: 'ALERT',
          targetId: expect.any(String),
          metadata: expect.objectContaining({
            incidentId: 'inc-verified',
            severity: 'CRITICAL',
            title: 'Tsunami Warning',
          }),
          ipAddress: '10.0.0.7',
        }),
        mockClient
      );

      // 8: ALERT_CANCELLED
      vi.spyOn(pool, 'query')
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'alert-cancel-1',
              incident_id: 'inc-verified',
              title: 'Tsunami Warning',
              message: 'Immediate evacuation',
              severity: 'CRITICAL',
              affected_zone: { type: 'Polygon', coordinates: [] },
              status: 'CANCELLED',
              created_by: 'authority-1',
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        } as any) // update alert
        .mockResolvedValueOnce({ rows: [] } as any); // audit insert

      await cancelAlert('alert-cancel-1', 'authority-1', '10.0.0.8');

      expect(logAuditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ALERT_CANCELLED',
          actorId: 'authority-1',
          targetType: 'ALERT',
          targetId: 'alert-cancel-1',
          metadata: { cancellationReason: null },
          ipAddress: '10.0.0.8',
        })
      );
    });

    it('wires action 9: SHELTER_CAPACITY_UPDATED', async () => {
      const logAuditSpy = vi.spyOn(auditService, 'logAudit');

      vi.spyOn(pool, 'query')
        .mockResolvedValueOnce({
          rows: [{ capacity: 500, available_capacity: 250 }],
        } as any) // checkRes
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'shelter-1',
              name: 'Central Shelter',
              capacity: 500,
              available_capacity: 100,
              status: 'OPERATIONAL',
            },
          ],
        } as any) // updateSql
        .mockResolvedValueOnce({ rows: [] } as any); // logAudit

      await updateShelterCapacity(
        'shelter-1',
        { availableCapacity: 100 },
        'shelter-manager-1',
        '10.0.0.9'
      );

      expect(logAuditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SHELTER_CAPACITY_UPDATED',
          actorId: 'shelter-manager-1',
          targetType: 'SHELTER',
          targetId: 'shelter-1',
          metadata: {
            previousAvailable: 250,
            newAvailable: 100,
            totalCapacity: 500,
          },
          ipAddress: '10.0.0.9',
        })
      );
    });

    it('wires action 10: RESOURCE_ALLOCATED and action 11: RESOURCE_ALLOCATION_DELETED', async () => {
      const logAuditSpy = vi.spyOn(auditService, 'logAudit');

      // 10: RESOURCE_ALLOCATED
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'res-1',
              owner_org_id: 'org-1',
              item_name: 'Water Blankets',
              total_quantity: 1000,
            },
          ],
        }) // lock resource
        .mockResolvedValueOnce({ rows: [{ id: 'inc-1' }] }) // check incident target
        .mockResolvedValueOnce({ rows: [{ total_allocated: 200 }] }) // alloc sum
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'alloc-1',
              resource_id: 'res-1',
              allocated_quantity: 150,
              target_type: 'INCIDENT',
              target_id: 'inc-1',
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        }) // insert allocation
        .mockResolvedValueOnce({ rows: [] }) // audit insert
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      await allocateResource(
        ['ADMIN'],
        'org-1',
        'res-1',
        {
          allocatedQuantity: 150,
          targetType: 'INCIDENT',
          targetId: 'inc-1',
        },
        'admin-user-1',
        '10.0.0.10'
      );

      expect(logAuditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'RESOURCE_ALLOCATED',
          actorId: 'admin-user-1',
          targetType: 'RESOURCE_ALLOCATION',
          targetId: expect.any(String),
          metadata: {
            resourceId: 'res-1',
            quantity: 150,
            targetType: 'INCIDENT',
            targetId: 'inc-1',
          },
          ipAddress: '10.0.0.10',
        }),
        mockClient
      );

      // 11: RESOURCE_ALLOCATION_DELETED
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'alloc-1',
              resource_id: 'res-1',
              allocated_quantity: 150,
              owner_org_id: 'org-1',
              item_name: 'Water Blankets',
              total_quantity: 1000,
            },
          ],
        }) // fetch allocation
        .mockResolvedValueOnce({ rows: [] }) // delete query
        .mockResolvedValueOnce({ rows: [] }) // audit insert
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      await deleteAllocation(
        ['ADMIN'],
        'org-1',
        'alloc-1',
        'admin-user-1',
        '10.0.0.11'
      );

      expect(logAuditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'RESOURCE_ALLOCATION_DELETED',
          actorId: 'admin-user-1',
          targetType: 'RESOURCE_ALLOCATION',
          targetId: 'alloc-1',
          metadata: {
            resourceId: 'res-1',
            releasedQuantity: 150,
          },
          ipAddress: '10.0.0.11',
        }),
        mockClient
      );
    });
  });
});
