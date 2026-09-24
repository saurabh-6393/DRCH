import request from 'supertest';
import app from '../app';
import * as poolModule from '../db/pool';

jest.mock('../db/pool');

describe('Location Sanitization & Public API Tests (Phase 3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/incidents/public', () => {
    it('returns only VERIFIED incidents with coordinates rounded to 2 decimal places and PII stripped', async () => {
      (poolModule.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          {
            id: 'inc-verified',
            category: 'FLOOD',
            description: 'Street flooded',
            lat: 12.97, // Rounded to 2 decimals
            lng: 77.59, // Rounded to 2 decimals
            status: 'VERIFIED',
            severity: 'HIGH',
            created_at: new Date('2026-09-24T12:00:00Z'),
          },
        ],
      });

      const res = await request(app).get('/api/v1/incidents/public');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe('inc-verified');
      expect(res.body.data[0].location).toEqual({ lat: 12.97, lng: 77.59 });
      expect(res.body.data[0].reporter_id).toBeUndefined();
      expect(res.body.data[0].aiVerification).toBeUndefined();
      expect(res.body.data[0].media).toBeUndefined();
      expect(poolModule.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE status = 'VERIFIED'"),
        []
      );
    });
  });
});
