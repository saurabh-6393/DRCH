import path from 'path';
import { getClient, query } from '../../db/pool';
import { storageService } from '../../services/storage.service';
import { aiService } from '../ai/ai.service';
import { AppError } from '../../shared/errors';
import { logger } from '../../shared/logger';
import { CreateIncidentInput, IncidentResponseData } from './incidents.types';

export async function createIncident(
  reporterId: string,
  input: CreateIncidentInput,
  file: Express.Multer.File,
  requestId?: string
): Promise<IncidentResponseData> {
  const incidentId = crypto.randomUUID();
  const mediaId = crypto.randomUUID();
  const aiVerificationId = crypto.randomUUID();

  // Sanitize file extension and build S3 storage key
  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const storageKey = `incidents/${incidentId}/${crypto.randomUUID()}${ext}`;

  // 1. Backend-mediated S3/MinIO upload
  // If S3 upload fails, throws STORAGE_PROVIDER_ERROR (502) and stops before DB transaction or AI analysis.
  await storageService.uploadFile(storageKey, file.buffer, file.mimetype);

  // 2. Database transaction & AI verification
  const client = await getClient();
  let aiResult;

  try {
    await client.query('BEGIN');

    // Insert incident record (initial status SUBMITTED)
    const incidentSql = `
      INSERT INTO incidents (id, reporter_id, category, description, location, status, severity, created_at, updated_at)
      VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), 'SUBMITTED', 'LOW', NOW(), NOW())
      RETURNING id, category, description, status, severity, created_at
    `;
    const incidentRes = await client.query(incidentSql, [
      incidentId,
      reporterId,
      input.category,
      input.description,
      input.longitude,
      input.latitude,
    ]);

    // Insert incident_media record
    const mediaSql = `
      INSERT INTO incident_media (id, incident_id, storage_key, mime_type, size_bytes, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id, mime_type, size_bytes
    `;
    const mediaRes = await client.query(mediaSql, [
      mediaId,
      incidentId,
      storageKey,
      file.mimetype,
      file.size,
    ]);

    // Transition incident status to UNDER_REVIEW
    await client.query(
      `UPDATE incidents SET status = 'UNDER_REVIEW', updated_at = NOW() WHERE id = $1`,
      [incidentId]
    );

    // 3. Multimodal AI Analysis via Gemini 2.5 Flash
    // If Gemini API call fails, returns fallback object with verificationPriority: 'AI_UNAVAILABLE'
    aiResult = await aiService.evaluateIncident(
      input.category,
      input.description,
      file.buffer,
      file.mimetype
    );

    // Insert ai_verifications record
    const aiSql = `
      INSERT INTO ai_verifications (
        id, incident_id, confidence_score, consistency_result, detected_anomalies, explanation, verification_priority, advisory_severity, created_at
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, NOW())
    `;
    await client.query(aiSql, [
      aiVerificationId,
      incidentId,
      aiResult.confidenceScore,
      aiResult.consistencyResult,
      JSON.stringify(aiResult.detectedAnomalies),
      aiResult.explanation,
      aiResult.verificationPriority,
      aiResult.advisorySeverity,
    ]);

    // Commit database transaction
    await client.query('COMMIT');

    const createdIncident = incidentRes.rows[0];
    const createdMedia = mediaRes.rows[0];

    // Return sanitized response (NO storage_key, NO bucket details exposed)
    return {
      id: createdIncident.id,
      category: createdIncident.category,
      description: createdIncident.description,
      location: {
        lat: Number(input.latitude),
        lng: Number(input.longitude),
      },
      status: 'UNDER_REVIEW',
      severity: createdIncident.severity,
      createdAt: createdIncident.created_at.toISOString(),
      media: {
        id: createdMedia.id,
        mimeType: createdMedia.mime_type,
        sizeBytes: Number(createdMedia.size_bytes),
      },
      aiVerification: {
        confidenceScore: aiResult.confidenceScore,
        consistencyResult: aiResult.consistencyResult,
        detectedAnomalies: aiResult.detectedAnomalies,
        explanation: aiResult.explanation,
        verificationPriority: aiResult.verificationPriority,
        advisorySeverity: aiResult.advisorySeverity,
      },
    };
  } catch (error: any) {
    // Database or insertion error occurred (whether for incident, media, or ai_verifications row)
    await client.query('ROLLBACK');

    // Execute best-effort S3 object cleanup so orphaned media is not left behind
    await storageService.deleteFile(storageKey, requestId);

    logger.error('Incident creation failed; rolled back DB and cleaned up S3 media object', {
      incidentId,
      error: error.message,
    });

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      500,
      'INTERNAL_SERVER_ERROR',
      'Database transaction failed during incident persistence.'
    );
  } finally {
    client.release();
  }
}

export async function getCitizenReports(reporterId: string): Promise<IncidentResponseData[]> {
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
      m.id AS media_id,
      m.mime_type AS media_mime_type,
      m.size_bytes AS media_size_bytes,
      a.confidence_score,
      a.consistency_result,
      a.detected_anomalies,
      a.explanation,
      a.verification_priority,
      a.advisory_severity
    FROM incidents i
    LEFT JOIN incident_media m ON i.id = m.incident_id
    LEFT JOIN ai_verifications a ON i.id = a.incident_id
    WHERE i.reporter_id = $1
    ORDER BY i.created_at DESC
  `;

  const result = await query(sql, [reporterId]);

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
    media: {
      id: row.media_id,
      mimeType: row.media_mime_type,
      sizeBytes: Number(row.media_size_bytes),
    },
    aiVerification: {
      confidenceScore: Number(row.confidence_score || 0),
      consistencyResult: Boolean(row.consistency_result),
      detectedAnomalies: row.detected_anomalies || [],
      explanation: row.explanation || '',
      verificationPriority: row.verification_priority || 'NORMAL',
      advisorySeverity: row.advisory_severity || null,
    },
  }));
}

/**
 * Public endpoint fetching verified incidents only.
 * Coordinates are rounded to 2 decimal places (~1.1km precision).
 * Reporter PII, raw AI scores, anomalies, S3 storage keys, and review notes are stripped.
 */
export async function getPublicVerifiedIncidents(category?: string) {
  let categoryFilter = '';
  const params: any[] = [];

  if (category && category.trim() !== '') {
    params.push(category.toUpperCase());
    categoryFilter = `AND category = $1`;
  }

  const sql = `
    SELECT 
      id,
      category,
      description,
      ROUND(ST_Y(location::geometry)::numeric, 2) AS lat,
      ROUND(ST_X(location::geometry)::numeric, 2) AS lng,
      status,
      severity,
      created_at
    FROM incidents
    WHERE status = 'VERIFIED' ${categoryFilter}
    ORDER BY created_at DESC
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
  }));
}

