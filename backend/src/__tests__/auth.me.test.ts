import request from 'supertest';
import app from '../app';
import * as authService from '../modules/auth/auth.service';
import { generateAccessToken } from '../shared/tokens';

jest.mock('../db/pool', () => ({
  pool: {
    query: jest.fn(),
    on: jest.fn(),
  },
  query: jest.fn(),
  getClient: jest.fn(),
}));

jest.mock('../modules/auth/auth.service');

describe('GET /api/v1/auth/me', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns current user profile and roles when valid access token cookie is provided', async () => {
    const validToken = generateAccessToken({ id: 'user-uuid-123', roles: ['CITIZEN'] });

    const mockProfile = {
      id: 'user-uuid-123',
      email: 'citizen@example.com',
      displayName: 'Jane Doe',
      roles: ['CITIZEN'],
      createdAt: new Date(),
    };

    (authService.getCurrentUser as jest.Mock).mockResolvedValue(mockProfile);

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', [`access_token=${validToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.user.email).toBe('citizen@example.com');
    expect(res.body.data.user.roles).toEqual(['CITIZEN']);
    expect(authService.getCurrentUser).toHaveBeenCalledWith('user-uuid-123');
  });

  it('returns 401 UNAUTHENTICATED when access token cookie is missing', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('returns 401 UNAUTHENTICATED when access token cookie is invalid', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', ['access_token=invalid-token']);

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });
});
