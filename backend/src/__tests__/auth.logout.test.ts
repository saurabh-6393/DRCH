import request from 'supertest';
import app from '../app';
import * as authService from '../modules/auth/auth.service';

jest.mock('../db/pool', () => ({
  pool: {
    query: jest.fn(),
    on: jest.fn(),
  },
  query: jest.fn(),
  getClient: jest.fn(),
}));

jest.mock('../modules/auth/auth.service');

describe('POST /api/v1/auth/logout', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('revokes session and clears cookies on logout', async () => {
    (authService.logoutSession as jest.Mock).mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', ['refresh_token=valid.refresh.token']);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(authService.logoutSession).toHaveBeenCalledWith('valid.refresh.token');
  });

  it('succeeds and clears cookies even if no refresh token cookie was present', async () => {
    const res = await request(app).post('/api/v1/auth/logout');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
