import { getClient, query } from '../../db/pool';
import { AppError } from '../../shared/errors';
import { logger } from '../../shared/logger';
import { CreateAlertInput, AlertItem } from './alerts.types';
import { getIOServer } from '../../socket/socket.server';
import { sendAlertNotifications } from '../notifications/notifications.service';
import { logAudit } from '../audit/audit.service';

export async function createAlert(
  userId: string,
  input: CreateAlertInput,
  ipAddress?: string
): Promise<AlertItem> {
  const client = await getClient();
  const alertId = crypto.randomUUID();

  try {
    await client.query('BEGIN');

    // 1. Check target incident status and severity
    const incidentSql = `SELECT status, severity FROM incidents WHERE id = $1 FOR UPDATE`;
    const incidentRes = await client.query(incidentSql, [input.incidentId]);

    if (incidentRes.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new AppError(404, 'NOT_FOUND', 'Target incident report not found.');
    }

    const incident = incidentRes.rows[0];
    if (incident.status !== 'VERIFIED') {
      await client.query('ROLLBACK');
      throw new AppError(
        409,
        'CONFLICT',
        'Alerts can only be generated for verified incidents.'
      );
    }

    const snapshotSeverity = incident.severity;
    const geoJsonStr = JSON.stringify(input.affectedZone);

    // 2. Validate polygon geometry with PostGIS ST_IsValid and area check
    const validSql = `
      SELECT 
        ST_IsValid(ST_GeomFromGeoJSON($1)) AS is_valid,
        ST_Area(ST_GeomFromGeoJSON($1)::geometry) AS area_deg
    `;
    const validRes = await client.query(validSql, [geoJsonStr]);
    const { is_valid, area_deg } = validRes.rows[0];

    if (!is_valid) {
      await client.query('ROLLBACK');
      throw new AppError(
        400,
        'VALIDATION_FAILED',
        'Invalid polygon geometry: self-intersection or structure error detected.'
      );
    }

    if (Number(area_deg) > 10.0) {
      await client.query('ROLLBACK');
      throw new AppError(
        400,
        'VALIDATION_FAILED',
        'Alert polygon area exceeds maximum allowed threshold (10.0 sq deg).'
      );
    }

    // 3. Determine expiration time (Default 24 hours if omitted)
    const expiresAt = input.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // 4. Insert alert record
    const insertSql = `
      INSERT INTO alerts (
        id, incident_id, title, message, severity, affected_zone, status, expires_at, created_by, created_at, updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, ST_SetSRID(ST_GeomFromGeoJSON($6), 4326), 'ACTIVE', $7, $8, NOW(), NOW()
      )
      RETURNING 
        id, incident_id, title, message, severity, 
        ST_AsGeoJSON(affected_zone)::json AS affected_zone,
        status, expires_at, created_by, created_at, updated_at
    `;

    const alertRes = await client.query(insertSql, [
      alertId,
      input.incidentId,
      input.title,
      input.message,
      snapshotSeverity,
      geoJsonStr,
      expiresAt,
      userId,
    ]);

    await logAudit(
      {
        action: 'ALERT_CREATED',
        actorId: userId,
        targetType: 'ALERT',
        targetId: alertId,
        metadata: {
          incidentId: input.incidentId,
          severity: snapshotSeverity,
          title: input.title,
        },
        ipAddress,
      },
      client
    );

    await client.query('COMMIT');

    const createdAlertRow = alertRes.rows[0];
    const alertItem: AlertItem = {
      id: createdAlertRow.id,
      incidentId: createdAlertRow.incident_id,
      title: createdAlertRow.title,
      message: createdAlertRow.message,
      severity: createdAlertRow.severity,
      affectedZone: createdAlertRow.affected_zone,
      status: createdAlertRow.status,
      expiresAt: createdAlertRow.expires_at ? createdAlertRow.expires_at.toISOString() : null,
      createdBy: createdAlertRow.created_by,
      createdAt: createdAlertRow.created_at.toISOString(),
      updatedAt: createdAlertRow.updated_at.toISOString(),
    };

    logger.info('Created geofenced warning alert', { alertId, incidentId: input.incidentId, severity: snapshotSeverity });

    // 5. Calculate intersecting deterministic 0.01-degree grid rooms for Socket.IO broadcast
    const coords = input.affectedZone.coordinates[0];
    let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;
    for (const [lng, lat] of coords) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }

    const minCellX = Math.floor(minLng / 0.01);
    const maxCellX = Math.floor(maxLng / 0.01);
    const minCellY = Math.floor(minLat / 0.01);
    const maxCellY = Math.floor(maxLat / 0.01);

    const checkGridSql = `
      SELECT ST_Intersects(
        ST_SetSRID(ST_GeomFromGeoJSON($1), 4326),
        ST_MakeEnvelope($2, $3, $4, $5, 4326)
      ) AS intersects
    `;

    const targetGridRooms: string[] = [];
    for (let x = minCellX; x <= maxCellX; x++) {
      for (let y = minCellY; y <= maxCellY; y++) {
        const envMinLng = x * 0.01;
        const envMinLat = y * 0.01;
        const envMaxLng = (x + 1) * 0.01;
        const envMaxLat = (y + 1) * 0.01;

        const intersectRes = await query(checkGridSql, [
          geoJsonStr,
          envMinLng,
          envMinLat,
          envMaxLng,
          envMaxLat,
        ]);

        if (intersectRes.rows[0]?.intersects) {
          targetGridRooms.push(`geo:${x}:${y}`);
        }
      }
    }

    // 6. Broadcast live alert via Socket.IO
    const io = getIOServer();
    if (io) {
      targetGridRooms.forEach((room) => {
        io.of('/live/citizens').to(room).emit('ALERT_BROADCAST', alertItem);
      });
      io.of('/live/dispatchers').to('dispatchers_room').emit('ALERT_BROADCAST', alertItem);
    }

    // 7. Dispatch Web Push & persistent notification history asynchronously
    sendAlertNotifications(alertItem).catch((err) => {
      logger.error('Failed to dispatch alert push notifications', { alertId, error: err.message });
    });

    return alertItem;
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_SERVER_ERROR', 'Database transaction failed during alert creation.');
  } finally {
    client.release();
  }
}

export async function getActiveAlerts(): Promise<AlertItem[]> {
  const sql = `
    SELECT 
      id, incident_id, title, message, severity,
      ST_AsGeoJSON(affected_zone)::json AS affected_zone,
      status, expires_at, created_by, created_at, updated_at
    FROM alerts
    WHERE status = 'ACTIVE' AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY created_at DESC
  `;
  const res = await query(sql);

  return res.rows.map((row) => ({
    id: row.id,
    incidentId: row.incident_id,
    title: row.title,
    message: row.message,
    severity: row.severity,
    affectedZone: row.affected_zone,
    status: row.status,
    expiresAt: row.expires_at ? row.expires_at.toISOString() : null,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }));
}

export async function cancelAlert(
  alertId: string,
  actorId?: string,
  ipAddress?: string
): Promise<AlertItem> {
  const sql = `
    UPDATE alerts
    SET status = 'CANCELLED', updated_at = NOW()
    WHERE id = $1
    RETURNING 
      id, incident_id, title, message, severity,
      ST_AsGeoJSON(affected_zone)::json AS affected_zone,
      status, expires_at, created_by, created_at, updated_at
  `;
  const res = await query(sql, [alertId]);

  if (res.rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Alert not found.');
  }

  await logAudit({
    action: 'ALERT_CANCELLED',
    actorId: actorId || null,
    targetType: 'ALERT',
    targetId: alertId,
    metadata: {
      cancellationReason: null,
    },
    ipAddress,
  });

  const row = res.rows[0];
  const alertItem: AlertItem = {
    id: row.id,
    incidentId: row.incident_id,
    title: row.title,
    message: row.message,
    severity: row.severity,
    affectedZone: row.affected_zone,
    status: row.status,
    expiresAt: row.expires_at ? row.expires_at.toISOString() : null,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };

  logger.info('Cancelled warning alert', { alertId });
  return alertItem;
}
