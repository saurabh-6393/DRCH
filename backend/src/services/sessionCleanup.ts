import { pool } from '../db/pool';
import { logger } from '../shared/logger';

let cleanupTimer: NodeJS.Timeout | null = null;

/**
 * Purges expired or revoked sessions older than retentionDays (default: 30 days per Contract §6.8).
 * Active valid sessions (expires_at > NOW() and revoked_at IS NULL) are NEVER touched.
 */
export async function purgeExpiredSessions(retentionDays = 30): Promise<number> {
  try {
    const queryText = `
      DELETE FROM sessions
      WHERE expires_at < NOW() - ($1 || ' days')::INTERVAL
         OR (revoked_at IS NOT NULL AND revoked_at < NOW() - ($1 || ' days')::INTERVAL)
      RETURNING id;
    `;
    const result = await pool.query(queryText, [retentionDays]);
    const purgedCount = result.rowCount ?? 0;
    if (purgedCount > 0) {
      logger.info('Expired session cleanup completed', { purgedCount, retentionDays });
    }
    return purgedCount;
  } catch (error) {
    logger.error('Failed to purge expired sessions', {
      error: (error as Error).message,
    });
    throw error;
  }
}

/**
 * Starts scheduled cleanup interval (default: once every 24 hours).
 * The timer is unref'd so it does not block the Node.js event loop from exiting naturally.
 */
export function startSessionCleanup(
  intervalMs = 24 * 60 * 60 * 1000,
  retentionDays = 30
): NodeJS.Timeout {
  if (cleanupTimer) {
    return cleanupTimer;
  }

  cleanupTimer = setInterval(async () => {
    try {
      await purgeExpiredSessions(retentionDays);
    } catch {
      // Error already logged in purgeExpiredSessions
    }
  }, intervalMs);

  if (typeof cleanupTimer.unref === 'function') {
    cleanupTimer.unref();
  }

  logger.info('Scheduled session cleanup service initialized', {
    intervalMs,
    retentionDays,
  });

  return cleanupTimer;
}

/**
 * Stops scheduled session cleanup timer during graceful shutdown.
 */
export function stopSessionCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
    logger.info('Scheduled session cleanup service stopped.');
  }
}

export function isSessionCleanupRunning(): boolean {
  return cleanupTimer !== null;
}
