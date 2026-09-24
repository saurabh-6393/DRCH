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

describe('POST /api/v1/auth/login', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('logs in successfully and sets HttpOnly cookies', async () => {
    const mockUser = {
      user: {
        id: 'mock-user-uuid',
        email: 'citizen@example.com',
        displayName: 'Citizen',
        roles: ['CITIZEN'],
      },
      accessToken: 'mock.access.token',
      refreshToken: 'mock.refresh.token',
    };

    (authService.loginUser as jest.Mock).mockResolvedValue(mockUser);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'citizen@example.com',
        password: 'password123',
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.user.email).toBe('citizen@example.com');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('returns 401 UNAUTHENTICATED on invalid credentials', async () => {
    (authService.loginUser as jest.Mock).mockRejectedValue(
      AppError.unauthenticated('Invalid email or password.')
    );

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'wrong@example.com',
        password: 'wrongpassword',
      });

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });
});
