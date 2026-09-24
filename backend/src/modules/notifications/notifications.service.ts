import webPush from 'web-push';
import { query } from '../../db/pool';
import { AppError } from '../../shared/errors';
import { logger } from '../../shared/logger';
import {
  SubscribePushInput,
  UpdateLocationInput,
  NotificationItem,
} from './notifications.types';
import { AlertItem } from '../alerts/alerts.types';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BF7k_MOCK_VAPID_PUBLIC_KEY_1234567890';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'MOCK_VAPID_PRIVATE_KEY_1234567890';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@drch.gov';

try {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (err: any) {
  logger.warn('WebPush VAPID setup warning (using dev fallback keys)', { error: err.message });
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

export async function subscribePush(
  userId: string,
  input: SubscribePushInput
): Promise<void> {
  const subId = crypto.randomUUID();
  const lat = input.location?.lat ?? null;
  const lng = input.location?.lng ?? null;

  const sql = `
    INSERT INTO push_subscriptions (
      id, user_id, endpoint, p256dh, auth, last_location, created_at, updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5,
      CASE WHEN $6::numeric IS NOT NULL AND $7::numeric IS NOT NULL THEN ST_SetSRID(ST_MakePoint($7, $6), 4326) ELSE NULL END,
      NOW(), NOW()
    )
    ON CONFLICT (endpoint) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        last_location = COALESCE(EXCLUDED.last_location, push_subscriptions.last_location),
        updated_at = NOW()
  `;

  await query(sql, [
    subId,
    userId,
    input.endpoint,
    input.keys.p256dh,
    input.keys.auth,
    lat,
    lng,
  ]);

  logger.info('Registered Web Push subscription', { userId, endpoint: input.endpoint.substring(0, 30) + '...' });
}

export async function updatePushLocation(
  userId: string,
  input: UpdateLocationInput
): Promise<void> {
  const sql = `
    UPDATE push_subscriptions
    SET last_location = ST_SetSRID(ST_MakePoint($1, $2), 4326),
        updated_at = NOW()
    WHERE user_id = $3
  `;

  await query(sql, [input.lng, input.lat, userId]);
  logger.debug('Updated push subscription location', { userId, lat: input.lat, lng: input.lng });
}

export async function sendAlertNotifications(alert: AlertItem): Promise<void> {
  const geoJsonStr = JSON.stringify(alert.affectedZone);

  // 1. Query active subscriptions intersecting affectedZone within 7-day location freshness TTL
  const sql = `
    SELECT DISTINCT user_id, endpoint, p256dh, auth
    FROM push_subscriptions
    WHERE last_location IS NOT NULL
      AND ST_Intersects(last_location, ST_SetSRID(ST_GeomFromGeoJSON($1), 4326))
      AND updated_at >= NOW() - INTERVAL '7 days'
  `;

  const res = await query(sql, [geoJsonStr]);
  const targets = res.rows;

  if (targets.length === 0) {
    logger.debug('No active push subscriptions found intersecting alert zone within 7-day TTL.', { alertId: alert.id });
    return;
  }

  const payload = JSON.stringify({
    title: alert.title,
    body: alert.message,
    severity: alert.severity,
    data: { alertId: alert.id, url: '/public-map' },
  });

  // Option A: Targeted Notification History Persistence BEFORE Web Push attempt
  for (const target of targets) {
    const notifId = crypto.randomUUID();
    const notifSql = `
      INSERT INTO notifications (id, user_id, alert_id, title, body, data, created_at)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
    `;

    try {
      await query(notifSql, [
        notifId,
        target.user_id,
        alert.id,
        alert.title,
        alert.message,
        JSON.stringify({ alertId: alert.id, severity: alert.severity }),
      ]);
    } catch (err: any) {
      logger.error('Failed to save in-app notification history record', { userId: target.user_id, error: err.message });
    }

    // 2. Dispatch Web Push payload (Failure does NOT delete notification history row)
    try {
      await webPush.sendNotification(
        {
          endpoint: target.endpoint,
          keys: {
            p256dh: target.p256dh,
            auth: target.auth,
          },
        },
        payload
      );
    } catch (err: any) {
      logger.warn('Web Push delivery failed for endpoint', { endpoint: target.endpoint.substring(0, 30), statusCode: err.statusCode, error: err.message });
      if (err.statusCode === 410 || err.statusCode === 404) {
        // Remove expired subscription
        await query(`DELETE FROM push_subscriptions WHERE endpoint = $1`, [target.endpoint]);
      }
    }
  }

  logger.info('Dispatched alert Web Push notifications to targeted users', { alertId: alert.id, targetCount: targets.length });
}

export async function getNotifications(userId: string): Promise<NotificationItem[]> {
  const sql = `
    SELECT id, user_id, alert_id, title, body, data, read_at, created_at
    FROM notifications
    WHERE user_id = $1
    ORDER BY created_at DESC
  `;
  const res = await query(sql, [userId]);

  return res.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    alertId: row.alert_id,
    title: row.title,
    body: row.body,
    data: row.data,
    readAt: row.read_at ? row.read_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
  }));
}

export async function markNotificationAsRead(
  userId: string,
  notificationId: string
): Promise<NotificationItem> {
  const sql = `
    UPDATE notifications
    SET read_at = NOW()
    WHERE id = $1 AND user_id = $2
    RETURNING id, user_id, alert_id, title, body, data, read_at, created_at
  `;

  const res = await query(sql, [notificationId, userId]);
  if (res.rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Notification not found or access denied.');
  }

  const row = res.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    alertId: row.alert_id,
    title: row.title,
    body: row.body,
    data: row.data,
    readAt: row.read_at.toISOString(),
    createdAt: row.created_at.toISOString(),
  };
}

export async function deleteSubscriptionsForUser(userId: string): Promise<void> {
  await query(`DELETE FROM push_subscriptions WHERE user_id = $1`, [userId]);
}
