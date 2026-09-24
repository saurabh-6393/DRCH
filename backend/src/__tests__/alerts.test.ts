import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as pool from '../db/pool';
import { createAlert, getActiveAlerts, cancelAlert } from '../modules/alerts/alerts.service';
import { AppError } from '../shared/errors';

vi.mock('../db/pool');
vi.mock('../socket/socket.server', () => ({
  getIOServer: vi.fn(() => null),
}));
vi.mock('../modules/notifications/notifications.service', () => ({
  sendAlertNotifications: vi.fn(() => Promise.resolve()),
}));

describe('Alerts Service', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };
    vi.spyOn(pool, 'getClient').mockResolvedValue(mockClient);
  });

  const validPolygon = {
    type: 'Polygon' as const,
    coordinates: [
      [
        [77.58, 12.96],
        [77.60, 12.96],
        [77.60, 12.98],
        [77.58, 12.98],
        [77.58, 12.96],
      ],
    ],
  };

  it('rejects alert creation if referenced incident is NOT VERIFIED (returns 409 CONFLICT)', async () => {
    mockClient.query.mockImplementation((sql: string) => {
      if (sql === 'BEGIN') return Promise.resolve();
      if (sql === 'ROLLBACK') return Promise.resolve();
      if (sql.includes('SELECT status, severity FROM incidents')) {
        return Promise.resolve({ rows: [{ status: 'UNDER_REVIEW', severity: 'HIGH' }] });
      }
      return Promise.resolve({ rows: [] });
    });

    await expect(
      createAlert('user-1', {
        incidentId: 'inc-123',
        title: 'Flood Alert',
        message: 'Evacuation required',
        affectedZone: validPolygon,
      })
    ).rejects.toThrowError(AppError);

    try {
      await createAlert('user-1', {
        incidentId: 'inc-123',
        title: 'Flood Alert',
        message: 'Evacuation required',
        affectedZone: validPolygon,
      });
    } catch (err: any) {
      expect(err.statusCode).toBe(409);
      expect(err.message).toBe('Alerts can only be generated for verified incidents.');
    }
  });

  it('creates alert and snapshots incident severity when incident is VERIFIED', async () => {
    const now = new Date();

    mockClient.query.mockImplementation((sql: string) => {
      if (sql === 'BEGIN') return Promise.resolve();
      if (sql === 'COMMIT') return Promise.resolve();
      if (sql === 'ROLLBACK') return Promise.resolve();
      if (sql.includes('SELECT status, severity FROM incidents')) {
        return Promise.resolve({ rows: [{ status: 'VERIFIED', severity: 'CRITICAL' }] });
      }
      if (sql.includes('ST_IsValid')) {
        return Promise.resolve({ rows: [{ is_valid: true, area_deg: 0.04 }] });
      }
      if (sql.includes('INSERT INTO alerts')) {
        return Promise.resolve({
          rows: [
            {
              id: 'alert-1',
              incident_id: 'inc-123',
              title: 'Flood Alert',
              message: 'Evacuation required',
              severity: 'CRITICAL',
              affected_zone: validPolygon,
              status: 'ACTIVE',
              expires_at: new Date(now.getTime() + 86400000),
              created_by: 'user-1',
              created_at: now,
              updated_at: now,
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    // Mock pool.query for grid intersection checks (non-transactional)
    vi.spyOn(pool, 'query').mockResolvedValue({
      rows: [{ intersects: true }],
    } as any);

    const alert = await createAlert('user-1', {
      incidentId: 'inc-123',
      title: 'Flood Alert',
      message: 'Evacuation required',
      affectedZone: validPolygon,
    });

    expect(alert.id).toBe('alert-1');
    expect(alert.severity).toBe('CRITICAL');
    expect(alert.status).toBe('ACTIVE');
  });

  it('rejects invalid polygon geometry (returns 400 VALIDATION_FAILED)', async () => {
    mockClient.query.mockImplementation((sql: string) => {
      if (sql === 'BEGIN') return Promise.resolve();
      if (sql === 'ROLLBACK') return Promise.resolve();
      if (sql.includes('SELECT status, severity FROM incidents')) {
        return Promise.resolve({ rows: [{ status: 'VERIFIED', severity: 'HIGH' }] });
      }
      if (sql.includes('ST_IsValid')) {
        return Promise.resolve({ rows: [{ is_valid: false, area_deg: 0.01 }] });
      }
      return Promise.resolve({ rows: [] });
    });

    try {
      await createAlert('user-1', {
        incidentId: 'inc-123',
        title: 'Invalid Polygon',
        message: 'Bad shape',
        affectedZone: validPolygon,
      });
    } catch (err: any) {
      expect(err.statusCode).toBe(400);
      expect(err.message).toContain('Invalid polygon geometry');
    }
  });

  it('cancels active alert', async () => {
    const now = new Date();

    vi.spyOn(pool, 'query').mockResolvedValue({
      rows: [
        {
          id: 'alert-1',
          incident_id: 'inc-123',
          title: 'Flood Alert',
          message: 'Evacuation required',
          severity: 'HIGH',
          affected_zone: validPolygon,
          status: 'CANCELLED',
          expires_at: now,
          created_by: 'user-1',
          created_at: now,
          updated_at: now,
        },
      ],
    } as any);

    const alert = await cancelAlert('alert-1');
    expect(alert.status).toBe('CANCELLED');
  });
});
