import { getClient, query } from '../../db/pool';
import { AppError } from '../../shared/errors';
import { logger } from '../../shared/logger';
import {
  SubmitReviewInput,
  SubmitVerifyInput,
  QueueIncidentItem,
} from './verifications.types';
import { getIOServer } from '../../socket/socket.server';
import { logAudit } from '../audit/audit.service';

/**
 * Retrieves the verification backlog queue of incidents in UNDER_REVIEW status.
 * Sorted by AI priority: EXPEDITED (1) > NORMAL (2) > AI_UNAVAILABLE (3) > LOW (4) then created_at ASC.
 */
export async function getVerificationQueue(priorityFilter?: string): Promise<QueueIncidentItem[]> {
  let priorityWhere = '';
  const params: any[] = [];

  if (priorityFilter && priorityFilter.trim() !== '') {
    params.push(priorityFilter.toUpperCase());
    priorityWhere = `AND a.verification_priority = $1`;
  }

  const sql = `
    SELECT 
      i.id,
      i.category,
      i.description,
      ST_X(i.location::geometry) AS lng,
      ST_Y(i.location::geometry) AS lat,
      i.status,
      i.severity,
      i.created_at,
      a.verification_priority,
      a.advisory_severity,
      a.confidence_score,
      a.explanation,
      COUNT(r.id)::int AS review_count
    FROM incidents i
    LEFT JOIN ai_verifications a ON i.id = a.incident_id
    LEFT JOIN human_reviews r ON i.id = r.incident_id
    WHERE i.status = 'UNDER_REVIEW' ${priorityWhere}
    GROUP BY i.id, a.id
    ORDER BY 
      CASE a.verification_priority
        WHEN 'EXPEDITED' THEN 1
        WHEN 'NORMAL' THEN 2
        WHEN 'AI_UNAVAILABLE' THEN 3
        WHEN 'LOW' THEN 4
        ELSE 5
      END ASC,
      i.created_at ASC;
  `;

  const result = await query(sql, params);

  return result.rows.map((row) => ({
    id: row.id,
    category: row.category,
    description: row.description,
    location: {
      lat: Number(row.lat),
      lng: Number(row.lng),
    },
    status: row.status,
    severity: row.severity,
    createdAt: row.created_at.toISOString(),
    aiVerification: {
      verificationPriority: row.verification_priority || 'NORMAL',
      advisorySeverity: row.advisory_severity || null,
      confidenceScore: Number(row.confidence_score || 0),
      explanation: row.explanation || '',
    },
    reviewCount: Number(row.review_count || 0),
  }));
}

/**
 * Stage 2: Submits a human review recommendation (VERIFY/REJECT).
 * Transaction-safe: verifies target incident currently has status = 'UNDER_REVIEW'.
 * If incident is finalized (VERIFIED or REJECTED), rolls back and throws 409 CONFLICT.
 */
export async function submitReviewRecommendation(
  incidentId: string,
  reviewerId: string,
  input: SubmitReviewInput
) {
  const client = await getClient();
  const reviewId = crypto.randomUUID();

  try {
    await client.query('BEGIN');

    // Row lock check: verify incident exists and is currently in UNDER_REVIEW status
    const checkSql = `SELECT status FROM incidents WHERE id = $1 FOR UPDATE`;
    const checkRes = await client.query(checkSql, [incidentId]);

    if (checkRes.rows.length === 0 || checkRes.rows[0].status !== 'UNDER_REVIEW') {
      await client.query('ROLLBACK');
      throw new AppError(
        409,
        'CONFLICT',
        'Incident is no longer available for human review.'
      );
    }

    const reviewSql = `
      INSERT INTO human_reviews (id, incident_id, reviewer_id, recommendation, review_notes, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id, incident_id, reviewer_id, recommendation, review_notes, created_at
    `;
    const reviewRes = await client.query(reviewSql, [
      reviewId,
      incidentId,
      reviewerId,
      input.recommendation,
      input.reviewNotes,
    ]);

    await client.query('COMMIT');

    logger.info('Logged Stage 2 review recommendation', { incidentId, reviewerId, recommendation: input.recommendation });

    return reviewRes.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, 'INTERNAL_SERVER_ERROR', 'Database transaction failed during review submission.');
  } finally {
    client.release();
  }
}

/**
 * Stage 3: Executes final Authority verification gate sign-off (VERIFIED/REJECTED + severity).
 * Atomic concurrency update: WHERE id = $3 AND status = 'UNDER_REVIEW'.
 * If rowCount === 0 (already verified or rejected by another dispatcher), rolls back and throws 409 CONFLICT.
 */
export async function submitAuthorityVerification(
  incidentId: string,
  authorityUserId: string,
  input: SubmitVerifyInput,
  ipAddress?: string
) {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const updateSql = `
      UPDATE incidents
      SET status = $1, severity = $2, updated_at = NOW()
      WHERE id = $3 AND status = 'UNDER_REVIEW'
      RETURNING id, category, description, status, severity, updated_at
    `;
    const result = await client.query(updateSql, [
      input.decision,
      input.severity,
      incidentId,
    ]);

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      throw new AppError(
        409,
        'CONFLICT',
        'Incident has already been verified or rejected by another dispatcher.'
      );
    }

    const action = input.decision === 'VERIFIED' ? 'INCIDENT_VERIFIED' : 'INCIDENT_REJECTED';
    await logAudit(
      {
        action,
        actorId: authorityUserId,
        targetType: 'INCIDENT',
        targetId: incidentId,
        metadata: {
          decision: input.decision,
          severity: input.severity,
          previousStatus: 'UNDER_REVIEW',
        },
        ipAddress,
      },
      client
    );

    await client.query('COMMIT');

    logger.info('Committed Stage 3 Authority verification sign-off', {
      incidentId,
      decision: input.decision,
      severity: input.severity,
    });

    // Emit INCIDENT_STATUS_UPDATED to dispatchers namespace (Phase 4 contract)
    const updatedRow = result.rows[0];
    const io = getIOServer();
    if (io) {
      io.of('/live/dispatchers').to('dispatchers_room').emit('INCIDENT_STATUS_UPDATED', {
        incidentId: updatedRow.id,
        status: updatedRow.status,
        severity: updatedRow.severity,
        updatedAt: updatedRow.updated_at?.toISOString?.() || new Date().toISOString(),
      });
    }

    return updatedRow;
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, 'INTERNAL_SERVER_ERROR', 'Database transaction failed during Authority verification.');
  } finally {
    client.release();
  }
}
