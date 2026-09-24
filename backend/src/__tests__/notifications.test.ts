import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as pool from '../db/pool';
import {
  subscribePush,
  updatePushLocation,
  getNotifications,
  markNotificationAsRead,
} from '../modules/notifications/notifications.service';
import { AppError } from '../shared/errors';

vi.mock('../db/pool');

describe('Notifications Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers push subscription', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] } as any);

    await expect(
      subscribePush('user-1', {
        endpoint: 'https://push.example.com/sub/123',
        keys: { p256dh: 'mock-p256', auth: 'mock-auth' },
        location: { lat: 12.97, lng: 77.59 },
      })
    ).resolves.not.toThrow();
  });

  it('updates push subscription location', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] } as any);

    await expect(
      updatePushLocation('user-1', { lat: 12.97, lng: 77.59 })
    ).resolves.not.toThrow();
  });

  it('marks in-app notification as read for authorized owner', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({
      rows: [
        {
          id: 'notif-1',
          user_id: 'user-1',
          alert_id: 'alert-1',
          title: 'Flood Alert',
          body: 'Evacuate now',
          data: { alertId: 'alert-1' },
          read_at: new Date(),
          created_at: new Date(),
        },
      ],
    } as any);

    const notif = await markNotificationAsRead('user-1', 'notif-1');
    expect(notif.id).toBe('notif-1');
    expect(notif.readAt).not.toBeNull();
  });

  it('rejects read mark for unauthorized user (returns 404 NOT FOUND)', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] } as any);

    try {
      await markNotificationAsRead('user-OTHER', 'notif-1');
    } catch (err: any) {
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe('Notification not found or access denied.');
    }
  });
});
