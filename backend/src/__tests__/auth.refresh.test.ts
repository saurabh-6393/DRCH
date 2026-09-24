import request from 'supertest';
import app from '../app';
import * as authService from '../modules/auth/auth.service';
import { AppError } from '../shared/errors';

jest.mock('../db/pool', () => ({
  pool: {
    query: jest.fn(),
    on: jest.fn(),
  },
  query: jest.fn(),
  getClient: jest.fn(),
}));

jest.mock('../modules/auth/auth.service');

describe('POST /api/v1/auth/refresh', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('rotates session tokens successfully when valid refresh_token cookie is provided', async () => {
    (authService.refreshSession as jest.Mock).mockResolvedValue({
      accessToken: 'new.access.token',
      refreshToken: 'new.refresh.token',
    });

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', ['refresh_token=valid.refresh.token']);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('returns 401 UNAUTHENTICATED when refresh_token cookie is missing', async () => {
    const res = await request(app).post('/api/v1/auth/refresh');

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('returns 401 UNAUTHENTICATED when session is revoked or invalid', async () => {
    (authService.refreshSession as jest.Mock).mockRejectedValue(
      AppError.unauthenticated('Session not found or already revoked.')
    );

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', ['refresh_token=revoked.refresh.token']);

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });
});
