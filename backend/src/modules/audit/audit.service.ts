import crypto from 'crypto';
import { PoolClient } from 'pg';
import { query } from '../../db/pool';
import { logger } from '../../shared/logger';
import {
  AuditAction,
  AuditTargetType,
  CreateAuditLogInput,
  AuditLogItem,
  AuditQueryParams,
  PaginatedAuditLogs,
} from './audit.types';

const PROHIBITED_KEYS = [
  'password',
  'password_hash',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'access_token',
  'refresh_token',
  'tokenhash',
  'token_hash',
  'secret',
  'jwt_secret',
  'jwt_access_secret',
  'jwt_refresh_secret',
  'vapid_private_key',
  's3_secret_key',
  'gemini_api_key',
  'authorization',
  'cookie',
];

/**
 * Strips prohibited credentials and sensitive secrets from metadata.
 */
function sanitizeMetadata(metadata?: Record<string, any> | null): Record<string, any> | null {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();
    const isProhibited = PROHIBITED_KEYS.some((prohibited) => lowerKey.includes(prohibited));

    if (!isProhibited) {
      if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        clean[key] = sanitizeMetadata(val);
      } else {
        clean[key] = val;
      }
    }
  }

  return clean;
}

/**
 * Records an audit log entry.
 * - If `client` (PoolClient) is provided: executes inside caller's active transaction.
 *   Errors are rethrown to trigger transaction rollback.
 * - If `client` is omitted: executes via connection pool for non-transactional actions.
 *   Errors are logged via logger.error() and suppressed so primary auth flows do not fail.
 */
export async function logAudit(
  input: CreateAuditLogInput,
  client?: PoolClient
): Promise<AuditLogItem | null> {
  const id = crypto.randomUUID();
  const sanitizedMeta = sanitizeMetadata(input.metadata);
  const metadataJson = sanitizedMeta ? JSON.stringify(sanitizedMeta) : null;

  const sql = `
    INSERT INTO audit_logs (
      id, action, actor_id, target_type, target_id, metadata, ip_address, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, NOW())
    RETURNING id, action, actor_id, target_type, target_id, metadata, ip_address, created_at
  `;
  const params = [
    id,
    input.action,
    input.actorId || null,
    input.targetType,
    input.targetId,
    metadataJson,
    input.ipAddress || null,
  ];

  if (client) {
    // Transactional mode: write using active client, let error throw on failure
    const res = await client.query(sql, params);
    const row = res.rows?.[0];
    const createdAtStr = row?.created_at
      ? row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString()
      : new Date().toISOString();

    return {
      id: row?.id || id,
      action: (row?.action as AuditAction) || input.action,
      actorId: row?.actor_id !== undefined ? row.actor_id : input.actorId || null,
      targetType: (row?.target_type as AuditTargetType) || input.targetType,
      targetId: row?.target_id !== undefined ? row.target_id : input.targetId,
      metadata: row?.metadata || sanitizedMeta,
      ipAddress: row?.ip_address !== undefined ? row.ip_address : input.ipAddress || null,
      createdAt: createdAtStr,
    };
  }

  // Non-transactional mode: write with pool, best-effort without failing caller
  try {
    const res = await query(sql, params);
    const row = res.rows?.[0];
    const createdAtStr = row?.created_at
      ? row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString()
      : new Date().toISOString();

    return {
      id: row?.id || id,
      action: (row?.action as AuditAction) || input.action,
      actorId: row?.actor_id !== undefined ? row.actor_id : input.actorId || null,
      targetType: (row?.target_type as AuditTargetType) || input.targetType,
      targetId: row?.target_id !== undefined ? row.target_id : input.targetId,
      metadata: row?.metadata || sanitizedMeta,
      ipAddress: row?.ip_address !== undefined ? row.ip_address : input.ipAddress || null,
      createdAt: createdAtStr,
    };
  } catch (err: any) {
    logger.error('Failed to persist non-transactional audit log entry', {
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      error: err.message,
    });
    return null;
  }
}

/**
 * Retrieves paginated audit logs with optional filters.
 * Restricted to ADMIN and AUTHORITY roles.
 */
export async function getAuditLogs(
  params: AuditQueryParams
): Promise<PaginatedAuditLogs> {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const queryParams: any[] = [];
  let paramIdx = 1;

  if (params.action) {
    conditions.push(`action = $${paramIdx++}`);
    queryParams.push(params.action);
  }

  if (params.targetType) {
    conditions.push(`target_type = $${paramIdx++}`);
    queryParams.push(params.targetType);
  }

  if (params.actorId) {
    conditions.push(`actor_id = $${paramIdx++}`);
    queryParams.push(params.actorId);
  }

  if (params.startDate) {
    const start = new Date(params.startDate);
    if (!isNaN(start.getTime())) {
      conditions.push(`created_at >= $${paramIdx++}`);
      queryParams.push(start);
    }
  }

  if (params.endDate) {
    const end = new Date(params.endDate);
    if (!isNaN(end.getTime())) {
      conditions.push(`created_at <= $${paramIdx++}`);
      queryParams.push(end);
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count total matching records
  const countSql = `SELECT COUNT(*)::int AS total FROM audit_logs ${whereClause}`;
  const countRes = await query<{ total: number }>(countSql, queryParams);
  const total = Number(countRes.rows[0]?.total || 0);

  // Fetch paginated rows with deterministic ordering
  const fetchParams = [...queryParams, limit, offset];
  const fetchSql = `
    SELECT id, action, actor_id, target_type, target_id, metadata, ip_address, created_at
    FROM audit_logs
    ${whereClause}
    ORDER BY created_at DESC, id DESC
    LIMIT $${paramIdx++} OFFSET $${paramIdx++}
  `;
  const fetchRes = await query(fetchSql, fetchParams);

  const logs: AuditLogItem[] = fetchRes.rows.map((row) => ({
    id: row.id,
    action: row.action,
    actorId: row.actor_id,
    targetType: row.target_type,
    targetId: row.target_id,
    metadata: row.metadata,
    ipAddress: row.ip_address,
    createdAt: row.created_at instanceof Date
      ? row.created_at.toISOString()
      : row.created_at
      ? new Date(row.created_at).toISOString()
      : new Date().toISOString(),
  }));

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    logs,
    total,
    page,
    limit,
    totalPages,
  };
}
