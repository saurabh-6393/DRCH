import request from 'supertest';
import app from '../app';
import * as poolModule from '../db/pool';
import { generateAccessToken } from '../shared/tokens';

jest.mock('../db/pool');

describe('Shelters API Proximity & Capacity Tests (Phase 3)', () => {
  let authorityTokenCookie: string;

  beforeEach(() => {
    jest.clearAllMocks();
    const authorityToken = generateAccessToken({ id: 'auth-1', roles: ['AUTHORITY'] });
    authorityTokenCookie = `access_token=${authorityToken}`;
  });

  describe('GET /api/v1/shelters/proximity', () => {
    it('returns operational shelters sorted by PostGIS distance in meters within 50,000m default radius', async () => {
      (poolModule.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          {
            id: 'sh-1',
            name: 'Central Emergency Shelter',
            managing_org_id: 'org-1',
            lat: 12.97,
            lng: 77.59,
            capacity: 500,
            available_capacity: 350,
            status: 'OPERATIONAL',
            distance_meters: 1200,
          },
        ],
      });

      const res = await request(app)
        .get('/api/v1/shelters/proximity?latitude=12.9716&longitude=77.5946');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Central Emergency Shelter');
      expect(res.body.data[0].distanceMeters).toBe(1200);
      expect(poolModule.query).toHaveBeenCalledWith(
        expect.stringContaining('ST_DWithin'),
        [77.5946, 12.9716, 50000] // Default 50,000m radius verified
      );
    });
  });

  describe('POST /api/v1/shelters', () => {
    it('allows Authority to register new shelter record', async () => {
      (poolModule.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          {
            id: 'sh-2',
            name: 'North Relief Shelter',
            capacity: 300,
            available_capacity: 300,
            status: 'OPERATIONAL',
            created_at: new Date(),
          },
        ],
      });

      const res = await request(app)
        .post('/api/v1/shelters')
        .set('Cookie', [authorityTokenCookie])
        .send({
          name: 'North Relief Shelter',
          latitude: 12.98,
          longitude: 77.60,
          capacity: 300,
        });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.name).toBe('North Relief Shelter');
    });
  });

  describe('PUT /api/v1/shelters/:id/capacity', () => {
    it('rejects capacity update when availableCapacity > total capacity with 400 VALIDATION_FAILED', async () => {
      (poolModule.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ capacity: 100 }], // Total capacity = 100
      });

      const res = await request(app)
        .put('/api/v1/shelters/sh-1/capacity')
        .set('Cookie', [authorityTokenCookie])
        .send({
          availableCapacity: 150, // Invalid: exceeds 100
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
      expect(res.body.error.message).toContain('Available capacity cannot exceed total shelter capacity');
    });
  });
});
