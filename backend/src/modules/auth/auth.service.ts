import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query, getClient } from '../../db/pool';
import { AppError } from '../../shared/errors';
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  verifyRefreshToken,
} from '../../shared/tokens';
import { RegisterInput, LoginInput, UserRow } from './auth.types';
import { logAudit } from '../audit/audit.service';

const BCRYPT_ROUNDS = 12;

// ============================================================
// REGISTER
// ============================================================

export async function registerUser(input: RegisterInput, ipAddress?: string) {
  const { email, password, displayName } = input;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Check email uniqueness
    const existing = await client.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    if (existing.rows.length > 0) {
      throw AppError.conflict('An account with this email already exists.');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create user
    const userId = crypto.randomUUID();
    await client.query(
      `INSERT INTO users (id, email, password_hash, display_name)
       VALUES ($1, $2, $3, $4)`,
      [userId, email, passwordHash, displayName || null]
    );

    // Assign CITIZEN role
    const roleResult = await client.query<{ id: string }>(
      `SELECT id FROM roles WHERE name = 'CITIZEN'`,
      []
    );
    if (roleResult.rows.length === 0) {
      throw AppError.internal('CITIZEN role not found. Run db:init first.');
    }
    await client.query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
      [userId, roleResult.rows[0].id]
    );

    // Generate tokens
    const roles = ['CITIZEN'];
    const sessionId = crypto.randomUUID();
    const accessToken = generateAccessToken({ id: userId, roles });
    const refreshToken = generateRefreshToken({ id: userId, sessionId });

    // Store ONLY the SHA-256 hash of the refresh token
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await client.query(
      `INSERT INTO sessions (id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [sessionId, userId, tokenHash, expiresAt]
    );

    await client.query('COMMIT');

    await logAudit({
      action: 'USER_REGISTERED',
      actorId: userId,
      targetType: 'USER',
      targetId: userId,
      metadata: {
        email,
        displayName: displayName || null,
      },
      ipAddress,
    });

    return {
      user: { id: userId, email, displayName: displayName || null, roles },
      accessToken,
      refreshToken,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================
// LOGIN
// ============================================================

export async function loginUser(
  input: LoginInput,
  context?: { ipAddress?: string; userAgent?: string }
) {
  const { email, password } = input;

  // Find user
  const result = await query<UserRow>(
    `SELECT * FROM users WHERE email = $1`,
    [email]
  );
  if (result.rows.length === 0) {
    await logAudit({
      action: 'LOGIN_FAILED',
      actorId: null,
      targetType: 'USER',
      targetId: '00000000-0000-0000-0000-000000000000',
      metadata: {
        attemptedEmail: email,
        reason: 'Invalid email or password.',
      },
      ipAddress: context?.ipAddress,
    });
    throw AppError.unauthenticated('Invalid email or password.');
  }
  const user = result.rows[0];

  // Compare password
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    await logAudit({
      action: 'LOGIN_FAILED',
      actorId: user.id,
      targetType: 'USER',
      targetId: user.id,
      metadata: {
        attemptedEmail: email,
        reason: 'Invalid email or password.',
      },
      ipAddress: context?.ipAddress,
    });
    throw AppError.unauthenticated('Invalid email or password.');
  }

  // Fetch roles
  const rolesResult = await query<{ name: string }>(
    `SELECT r.name FROM roles r
     JOIN user_roles ur ON ur.role_id = r.id
     WHERE ur.user_id = $1`,
    [user.id]
  );
  const roles = rolesResult.rows.map((r) => r.name);

  // Generate tokens
  const sessionId = crypto.randomUUID();
  const accessToken = generateAccessToken({ id: user.id, roles });
  const refreshToken = generateRefreshToken({ id: user.id, sessionId });

  // Store ONLY the SHA-256 hash of the refresh token
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [sessionId, user.id, tokenHash, expiresAt]
  );

  await logAudit({
    action: 'LOGIN_SUCCESS',
    actorId: user.id,
    targetType: 'USER',
    targetId: user.id,
    metadata: {
      email: user.email,
      userAgent: context?.userAgent || null,
    },
    ipAddress: context?.ipAddress,
  });

  return {
    user: { id: user.id, email: user.email, displayName: user.display_name, roles },
    accessToken,
    refreshToken,
  };
}

// ============================================================
// REFRESH TOKEN (Atomic Rotation)
// ============================================================

export async function refreshSession(currentRefreshToken: string) {
  // Verify the JWT refresh token
  let payload;
  try {
    payload = verifyRefreshToken(currentRefreshToken);
  } catch {
    throw AppError.unauthenticated('Invalid or expired refresh token.');
  }

  const currentHash = hashToken(currentRefreshToken);

  // Use a transaction for atomic revoke-old + create-new
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Find matching non-revoked, non-expired session
    const sessionResult = await client.query(
      `SELECT id, user_id FROM sessions
       WHERE token_hash = $1
         AND revoked_at IS NULL
         AND expires_at > NOW()
       FOR UPDATE`,
      [currentHash]
    );

    if (sessionResult.rows.length === 0) {
      throw AppError.unauthenticated('Session not found or already revoked.');
    }

    const session = sessionResult.rows[0];

    // Revoke old session
    await client.query(
      `UPDATE sessions SET revoked_at = NOW() WHERE id = $1`,
      [session.id]
    );

    // Fetch user roles
    const rolesResult = await client.query(
      `SELECT r.name FROM roles r
       JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = $1`,
      [session.user_id]
    );
    const roles = rolesResult.rows.map((r: { name: string }) => r.name);

    // Generate new tokens
    const newSessionId = crypto.randomUUID();
    const newAccessToken = generateAccessToken({ id: session.user_id, roles });
    const newRefreshToken = generateRefreshToken({ id: session.user_id, sessionId: newSessionId });

    // Store ONLY the SHA-256 hash of the new refresh token
    const newTokenHash = hashToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await client.query(
      `INSERT INTO sessions (id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [newSessionId, session.user_id, newTokenHash, expiresAt]
    );

    await client.query('COMMIT');

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================
// LOGOUT (Session Revocation)
// ============================================================

export async function logoutSession(currentRefreshToken: string, ipAddress?: string) {
  const tokenHash = hashToken(currentRefreshToken);

  const sessionRes = await query<{ id: string; user_id: string }>(
    `SELECT id, user_id FROM sessions WHERE token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash]
  );

  await query(
    `UPDATE sessions SET revoked_at = NOW()
     WHERE token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash]
  );

  if (sessionRes.rows.length > 0) {
    const session = sessionRes.rows[0];
    await logAudit({
      action: 'SESSION_REVOKED',
      actorId: session.user_id,
      targetType: 'SESSION',
      targetId: session.id,
      metadata: {
        userId: session.user_id,
      },
      ipAddress,
    });
  }
}

// ============================================================
// GET CURRENT USER
// ============================================================

export async function getCurrentUser(userId: string) {
  const userResult = await query<UserRow>(
    `SELECT id, email, display_name, created_at FROM users WHERE id = $1`,
    [userId]
  );
  if (userResult.rows.length === 0) {
    throw AppError.notFound('User not found.');
  }
  const user = userResult.rows[0];

  const rolesResult = await query<{ name: string }>(
    `SELECT r.name FROM roles r
     JOIN user_roles ur ON ur.role_id = r.id
     WHERE ur.user_id = $1`,
    [userId]
  );
  const roles = rolesResult.rows.map((r) => r.name);

  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    roles,
    createdAt: user.created_at,
  };
}
