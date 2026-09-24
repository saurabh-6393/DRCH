import { Request, Response, NextFunction } from 'express';
import { authorize } from '../middleware/authorize';
import { AppError } from '../shared/errors';

describe('RBAC Middleware (authorize)', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFn: jest.Mock;

  beforeEach(() => {
    mockReq = {};
    mockRes = {};
    nextFn = jest.fn();
  });

  it('allows access when user has an allowed role', () => {
    mockReq.user = { id: 'user-1', roles: ['AUTHORITY', 'CITIZEN'] };
    const middleware = authorize(['AUTHORITY', 'ADMIN']);

    middleware(mockReq as Request, mockRes as Response, nextFn);

    expect(nextFn).toHaveBeenCalledWith();
  });

  it('denies access (403 FORBIDDEN) when user lacks allowed roles', () => {
    mockReq.user = { id: 'user-1', roles: ['CITIZEN'] };
    const middleware = authorize(['AUTHORITY', 'ADMIN']);

    middleware(mockReq as Request, mockRes as Response, nextFn);

    expect(nextFn).toHaveBeenCalled();
    const err = nextFn.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('denies access (401 UNAUTHENTICATED) when req.user is missing', () => {
    const middleware = authorize(['CITIZEN']);

    middleware(mockReq as Request, mockRes as Response, nextFn);

    expect(nextFn).toHaveBeenCalled();
    const err = nextFn.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
  });
});
