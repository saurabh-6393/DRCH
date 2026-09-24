import request from 'supertest';
import app from '../app';
import * as poolModule from '../db/pool';
import { storageService } from '../services/storage.service';
import { aiService } from '../modules/ai/ai.service';
import { generateAccessToken } from '../shared/tokens';
import { AppError } from '../shared/errors';

jest.mock('../db/pool');
jest.mock('../services/storage.service');
jest.mock('../modules/ai/ai.service');

describe('Incidents API Integration & Failure Tests', () => {
  let mockClient: {
    query: jest.Mock;
    release: jest.Mock;
  };
  let validTokenCookie: string;

  // Valid JPEG header magic bytes (FF D8 FF E0)
  const validJpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    (poolModule.getClient as jest.Mock).mockResolvedValue(mockClient);

    const token = generateAccessToken({ id: 'user-citizen-1', roles: ['CITIZEN'] });
    validTokenCookie = `access_token=${token}`;
  });

  describe('POST /api/v1/incidents', () => {
    it('returns 201 Created and sanitized payload on valid incident report submission', async () => {
      (storageService.uploadFile as jest.Mock).mockResolvedValue(undefined);
      (aiService.evaluateIncident as jest.Mock).mockResolvedValue({
        confidenceScore: 0.95,
        consistencyResult: true,
        detectedAnomalies: [],
        explanation: 'Valid flood photo.',
        verificationPriority: 'EXPEDITED',
        advisorySeverity: 'HIGH',
      });

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'inc-123',
              category: 'FLOOD',
              description: 'Heavy flooding',
              status: 'SUBMITTED',
              severity: 'LOW',
              created_at: new Date('2026-09-24T12:00:00Z'),
            },
          ],
        }) // INSERT incidents
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'med-123',
              mime_type: 'image/jpeg',
              size_bytes: 10,
            },
          ],
        }) // INSERT incident_media
        .mockResolvedValueOnce({}) // UPDATE status UNDER_REVIEW
        .mockResolvedValueOnce({}) // INSERT ai_verifications
        .mockResolvedValueOnce({}); // COMMIT

      const res = await request(app)
        .post('/api/v1/incidents')
        .set('Cookie', [validTokenCookie])
        .field('category', 'FLOOD')
        .field('description', 'Heavy flooding')
        .field('latitude', '12.9716')
        .field('longitude', '77.5946')
        .attach('media', validJpegBuffer, 'evidence.jpg');

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.id).toBe('inc-123');
      expect(res.body.data.status).toBe('UNDER_REVIEW');
      expect(res.body.data.media).toEqual({
        id: 'med-123',
        mimeType: 'image/jpeg',
        sizeBytes: 10,
      });
      expect(res.body.data.media.storageKey).toBeUndefined(); // Storage key strictly sanitized
      expect(res.body.data.aiVerification.verificationPriority).toBe('EXPEDITED');
      expect(storageService.uploadFile).toHaveBeenCalled();
    });

    it('returns 400 VALIDATION_FAILED when file has invalid magic bytes', async () => {
      const badBuffer = Buffer.from('PLAIN TEXT FILE DATA NOT IMAGE');

      const res = await request(app)
        .post('/api/v1/incidents')
        .set('Cookie', [validTokenCookie])
        .field('category', 'FLOOD')
        .field('description', 'Heavy flooding')
        .field('latitude', '12.9716')
        .field('longitude', '77.5946')
        .attach('media', badBuffer, 'fake.jpg');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
      expect(storageService.uploadFile).not.toHaveBeenCalled();
    });

    it('returns 502 STORAGE_PROVIDER_ERROR when S3 upload fails', async () => {
      (storageService.uploadFile as jest.Mock).mockRejectedValue(
        new AppError(502, 'STORAGE_PROVIDER_ERROR', 'Storage provider error')
      );

      const res = await request(app)
        .post('/api/v1/incidents')
        .set('Cookie', [validTokenCookie])
        .field('category', 'FLOOD')
        .field('description', 'Heavy flooding')
        .field('latitude', '12.9716')
        .field('longitude', '77.5946')
        .attach('media', validJpegBuffer, 'evidence.jpg');

      expect(res.status).toBe(502);
      expect(res.body.error.code).toBe('STORAGE_PROVIDER_ERROR');
      expect(mockClient.query).not.toHaveBeenCalled(); // No DB queries executed if S3 upload fails
    });

    it('returns 500 INTERNAL_SERVER_ERROR and cleans up S3 media when DB transaction fails on incident insert', async () => {
      (storageService.uploadFile as jest.Mock).mockResolvedValue(undefined);
      (storageService.deleteFile as jest.Mock).mockResolvedValue(undefined);

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('DB write failure')); // INSERT incidents fails

      const res = await request(app)
        .post('/api/v1/incidents')
        .set('Cookie', [validTokenCookie])
        .field('category', 'FLOOD')
        .field('description', 'Heavy flooding')
        .field('latitude', '12.9716')
        .field('longitude', '77.5946')
        .attach('media', validJpegBuffer, 'evidence.jpg');

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(storageService.deleteFile).toHaveBeenCalled(); // Best-effort S3 cleanup verified
    });

    it('returns 500 INTERNAL_SERVER_ERROR and cleans up S3 media when Gemini succeeds but ai_verifications DB insert fails', async () => {
      (storageService.uploadFile as jest.Mock).mockResolvedValue(undefined);
      (storageService.deleteFile as jest.Mock).mockResolvedValue(undefined);
      (aiService.evaluateIncident as jest.Mock).mockResolvedValue({
        confidenceScore: 0.9,
        consistencyResult: true,
        detectedAnomalies: [],
        explanation: 'Good',
        verificationPriority: 'NORMAL',
        advisorySeverity: 'MEDIUM',
      });

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: 'inc-123', category: 'FLOOD', description: 'Desc', status: 'SUBMITTED', severity: 'LOW', created_at: new Date() }],
        }) // INSERT incidents
        .mockResolvedValueOnce({ rows: [{ id: 'med-123', mime_type: 'image/jpeg', size_bytes: 10 }] }) // INSERT media
        .mockResolvedValueOnce({}) // UPDATE status
        .mockRejectedValueOnce(new Error('AI verifications DB insert failed')); // INSERT ai_verifications fails

      const res = await request(app)
        .post('/api/v1/incidents')
        .set('Cookie', [validTokenCookie])
        .field('category', 'FLOOD')
        .field('description', 'Heavy flooding')
        .field('latitude', '12.9716')
        .field('longitude', '77.5946')
        .attach('media', validJpegBuffer, 'evidence.jpg');

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(storageService.deleteFile).toHaveBeenCalled();
    });

    it('returns 500 INTERNAL_SERVER_ERROR and cleans up S3 media when Gemini fails AND fallback DB insert fails', async () => {
      (storageService.uploadFile as jest.Mock).mockResolvedValue(undefined);
      (storageService.deleteFile as jest.Mock).mockResolvedValue(undefined);
      (aiService.evaluateIncident as jest.Mock).mockResolvedValue({
        confidenceScore: 0,
        consistencyResult: false,
        detectedAnomalies: ['AI_SERVICE_UNAVAILABLE'],
        explanation: 'AI evaluation unavailable',
        verificationPriority: 'AI_UNAVAILABLE',
        advisorySeverity: null,
      });

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: 'inc-123', category: 'FLOOD', description: 'Desc', status: 'SUBMITTED', severity: 'LOW', created_at: new Date() }],
        }) // INSERT incidents
        .mockResolvedValueOnce({ rows: [{ id: 'med-123', mime_type: 'image/jpeg', size_bytes: 10 }] }) // INSERT media
        .mockResolvedValueOnce({}) // UPDATE status
        .mockRejectedValueOnce(new Error('Fallback DB insert failed')); // INSERT ai_verifications fallback fails

      const res = await request(app)
        .post('/api/v1/incidents')
        .set('Cookie', [validTokenCookie])
        .field('category', 'FLOOD')
        .field('description', 'Heavy flooding')
        .field('latitude', '12.9716')
        .field('longitude', '77.5946')
        .attach('media', validJpegBuffer, 'evidence.jpg');

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(storageService.deleteFile).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/incidents/my-reports', () => {
    it('returns citizen report history with sanitized media metadata', async () => {
      (poolModule.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          {
            id: 'inc-1',
            category: 'FIRE',
            description: 'Smoke visible',
            lat: 12.97,
            lng: 77.59,
            status: 'UNDER_REVIEW',
            severity: 'LOW',
            created_at: new Date('2026-09-24T10:00:00Z'),
            media_id: 'med-1',
            media_mime_type: 'image/jpeg',
            media_size_bytes: 5000,
            confidence_score: 0.8,
            consistency_result: true,
            detected_anomalies: [],
            explanation: 'Smoke matches category.',
            verification_priority: 'NORMAL',
            advisory_severity: 'MEDIUM',
          },
        ],
      });

      const res = await request(app)
        .get('/api/v1/incidents/my-reports')
        .set('Cookie', [validTokenCookie]);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe('inc-1');
      expect(res.body.data[0].media.storageKey).toBeUndefined();
    });
  });
});
