import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate } from '../middleware/authenticate';
import { generateAccessToken } from '../shared/tokens';
import { AppError } from '../shared/errors';
import { env } from '../config/env';

describe('authenticate Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFn: jest.Mock;

  beforeEach(() => {
    mockReq = { cookies: {} };
    mockRes = {};
    nextFn = jest.fn();
  });

  it('accepts valid JWT and attaches payload to req.user', () => {
    const token = generateAccessToken({ id: 'user-123', roles: ['AUTHORITY'] });
    mockReq.cookies = { access_token: token };

    authenticate(mockReq as Request, mockRes as Response, nextFn);

    expect(nextFn).toHaveBeenCalledWith();
    expect(mockReq.user).toBeDefined();
    expect(mockReq.user?.id).toBe('user-123');
    expect(mockReq.user?.roles).toEqual(['AUTHORITY']);
  });

  it('rejects request when access_token cookie is missing', () => {
    mockReq.cookies = {};

    authenticate(mockReq as Request, mockRes as Response, nextFn);

    expect(nextFn).toHaveBeenCalled();
    const err = nextFn.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHENTICATED');
  });

  it('rejects expired JWT token', () => {
    const expiredToken = jwt.sign(
      { id: 'user-123', roles: ['CITIZEN'] },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '-1s' }
    );
    mockReq.cookies = { access_token: expiredToken };

    authenticate(mockReq as Request, mockRes as Response, nextFn);

    expect(nextFn).toHaveBeenCalled();
    const err = nextFn.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHENTICATED');
  });
});
