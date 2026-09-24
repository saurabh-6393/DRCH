import { registerUser, refreshSession } from '../modules/auth/auth.service';
import * as poolModule from '../db/pool';
import { generateRefreshToken, hashToken } from '../shared/tokens';

jest.mock('../db/pool');

describe('auth.service unit tests', () => {
  let mockClient: {
    query: jest.Mock;
    release: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    (poolModule.getClient as jest.Mock).mockResolvedValue(mockClient);
  });

  describe('registerUser atomic transaction', () => {
    it('executes BEGIN, queries, and COMMIT on success', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // SELECT email check
        .mockResolvedValueOnce({}) // INSERT users
        .mockResolvedValueOnce({ rows: [{ id: 'role-id-1' }] }) // SELECT role
        .mockResolvedValueOnce({}) // INSERT user_roles
        .mockResolvedValueOnce({}) // INSERT sessions
        .mockResolvedValueOnce({}); // COMMIT

      const result = await registerUser({
        email: 'newcitizen@example.com',
        password: 'password123',
        displayName: 'New Citizen',
      });

      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenLastCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result.user.email).toBe('newcitizen@example.com');
    });

    it('executes ROLLBACK when an error occurs during registration', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // SELECT email check
        .mockRejectedValueOnce(new Error('DB write error')); // INSERT users fails

      await expect(
        registerUser({
          email: 'failed@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('DB write error');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('refreshSession atomic rotation', () => {
    it('executes BEGIN, UPDATE, INSERT, and COMMIT on valid refresh token', async () => {
      const validRefreshToken = generateRefreshToken({ id: 'user-1', sessionId: 'sess-1' });
      const hashed = hashToken(validRefreshToken);

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'sess-1', user_id: 'user-1' }] }) // SELECT session
        .mockResolvedValueOnce({}) // UPDATE sessions (revoke)
        .mockResolvedValueOnce({ rows: [{ name: 'CITIZEN' }] }) // SELECT roles
        .mockResolvedValueOnce({}) // INSERT new session
        .mockResolvedValueOnce({}); // COMMIT

      const result = await refreshSession(validRefreshToken);

      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenLastCalledWith('COMMIT');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('rolls back cleanly without double rollback when session is revoked', async () => {
      const validRefreshToken = generateRefreshToken({ id: 'user-1', sessionId: 'sess-1' });

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // SELECT session returns empty (revoked)

      await expect(refreshSession(validRefreshToken)).rejects.toThrow(
        'Session not found or already revoked.'
      );

      // Verify ROLLBACK was called exactly once
      const rollbackCalls = mockClient.query.mock.calls.filter(
        (call) => call[0] === 'ROLLBACK'
      );
      expect(rollbackCalls.length).toBe(1);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
