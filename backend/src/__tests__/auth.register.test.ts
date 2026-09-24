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

describe('POST /api/v1/auth/register', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('registers a user successfully and sets HttpOnly cookies', async () => {
    const mockUser = {
      user: {
        id: 'mock-user-uuid',
        email: 'test@example.com',
        displayName: 'Test User',
        roles: ['CITIZEN'],
      },
      accessToken: 'mock.access.token',
      refreshToken: 'mock.refresh.token',
    };

    (authService.registerUser as jest.Mock).mockResolvedValue(mockUser);

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.user.email).toBe('test@example.com');
    expect(res.headers['set-cookie']).toBeDefined();
    const cookiesArray = Array.isArray(res.headers['set-cookie'])
      ? res.headers['set-cookie']
      : [res.headers['set-cookie']];
    const cookiesStr = cookiesArray.join(';');
    expect(cookiesStr).toContain('access_token=');
    expect(cookiesStr).toContain('HttpOnly');
  });

  it('returns 400 VALIDATION_FAILED when email is invalid', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'not-an-email',
        password: 'password123',
      });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('returns 409 CONFLICT when email already exists', async () => {
    (authService.registerUser as jest.Mock).mockRejectedValue(
      AppError.conflict('An account with this email already exists.')
    );

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'existing@example.com',
        password: 'password123',
      });

    expect(res.status).toBe(409);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('CONFLICT');
  });
});
