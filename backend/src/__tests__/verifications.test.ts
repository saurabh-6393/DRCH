import request from 'supertest';
import app from '../app';
import * as poolModule from '../db/pool';
import { generateAccessToken } from '../shared/tokens';

jest.mock('../db/pool');

describe('Verifications API Integration Tests (Phase 3)', () => {
  let mockClient: {
    query: jest.Mock;
    release: jest.Mock;
  };
  let volunteerTokenCookie: string;
  let authorityTokenCookie: string;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    (poolModule.getClient as jest.Mock).mockResolvedValue(mockClient);

    const volunteerToken = generateAccessToken({ id: 'vol-1', roles: ['VOLUNTEER'] });
    volunteerTokenCookie = `access_token=${volunteerToken}`;

    const authorityToken = generateAccessToken({ id: 'auth-1', roles: ['AUTHORITY'] });
    authorityTokenCookie = `access_token=${authorityToken}`;
  });

  describe('GET /api/v1/verifications/queue', () => {
    it('returns backlog queue sorted by AI priority (EXPEDITED > NORMAL > AI_UNAVAILABLE > LOW)', async () => {
      (poolModule.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          {
            id: 'inc-expedited',
            category: 'FIRE',
            description: 'Major fire',
            lat: 12.97,
            lng: 77.59,
            status: 'UNDER_REVIEW',
            severity: 'LOW',
            created_at: new Date('2026-09-24T10:00:00Z'),
            verification_priority: 'EXPEDITED',
            advisory_severity: 'HIGH',
            confidence_score: 0.95,
            explanation: 'Critical match',
            review_count: 0,
          },
          {
            id: 'inc-unavailable',
            category: 'FLOOD',
            description: 'Water rising',
            lat: 12.98,
            lng: 77.60,
            status: 'UNDER_REVIEW',
            severity: 'LOW',
            created_at: new Date('2026-09-24T10:05:00Z'),
            verification_priority: 'AI_UNAVAILABLE',
            advisory_severity: null,
            confidence_score: 0.0,
            explanation: 'AI offline',
            review_count: 1,
          },
        ],
      });

      const res = await request(app)
        .get('/api/v1/verifications/queue')
        .set('Cookie', [volunteerTokenCookie]);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].aiVerification.verificationPriority).toBe('EXPEDITED');
      expect(res.body.data[1].aiVerification.verificationPriority).toBe('AI_UNAVAILABLE');
    });
  });

  describe('POST /api/v1/verifications/:id/review (Stage 2 Recommendation)', () => {
    it('allows Volunteer to log Stage 2 review recommendation on active UNDER_REVIEW incident', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ status: 'UNDER_REVIEW' }] }) // SELECT status FOR UPDATE
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'rev-1',
              incident_id: 'inc-1',
              reviewer_id: 'vol-1',
              recommendation: 'VERIFY',
              review_notes: 'Photo verified by field worker.',
              created_at: new Date(),
            },
          ],
        }) // INSERT human_reviews
        .mockResolvedValueOnce({}); // COMMIT

      const res = await request(app)
        .post('/api/v1/verifications/inc-1/review')
        .set('Cookie', [volunteerTokenCookie])
        .send({
          recommendation: 'VERIFY',
          reviewNotes: 'Photo verified by field worker.',
        });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.recommendation).toBe('VERIFY');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('returns 409 CONFLICT when trying to submit Stage 2 review on an incident already VERIFIED or REJECTED', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ status: 'VERIFIED' }] }); // SELECT status returns VERIFIED

      const res = await request(app)
        .post('/api/v1/verifications/inc-1/review')
        .set('Cookie', [volunteerTokenCookie])
        .send({
          recommendation: 'VERIFY',
          reviewNotes: 'Late review attempt',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
      expect(res.body.error.message).toContain('no longer available for human review');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('POST /api/v1/verifications/:id/verify (Stage 3 Authority Gate)', () => {
    it('allows Authority to execute final verification sign-off and set authoritative severity', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 'inc-1',
              category: 'FLOOD',
              description: 'Flooding',
              status: 'VERIFIED',
              severity: 'CRITICAL',
              updated_at: new Date(),
            },
          ],
        }) // UPDATE incidents
        .mockResolvedValueOnce({}); // COMMIT

      const res = await request(app)
        .post('/api/v1/verifications/inc-1/verify')
        .set('Cookie', [authorityTokenCookie])
        .send({
          decision: 'VERIFIED',
          severity: 'CRITICAL',
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.status).toBe('VERIFIED');
      expect(res.body.data.severity).toBe('CRITICAL');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('blocks Volunteer from executing Stage 3 Authority verification with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .post('/api/v1/verifications/inc-1/verify')
        .set('Cookie', [volunteerTokenCookie])
        .send({
          decision: 'VERIFIED',
          severity: 'HIGH',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('returns 409 CONFLICT on concurrent Authority verification if incident is already finalized', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }); // UPDATE returned rowCount 0 (already verified)

      const res = await request(app)
        .post('/api/v1/verifications/inc-1/verify')
        .set('Cookie', [authorityTokenCookie])
        .send({
          decision: 'VERIFIED',
          severity: 'HIGH',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
      expect(res.body.error.message).toContain('already been verified or rejected');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });
});
