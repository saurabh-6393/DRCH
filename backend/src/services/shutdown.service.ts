import { Server as HttpServer } from 'http';
import { pool } from '../db/pool';
import { logger } from '../shared/logger';
import { getIOServer } from '../socket/socket.server';
import { stopSessionCleanup } from './sessionCleanup';

export interface ShutdownOptions {
  timeoutMs?: number;
  exitFn?: (code: number) => void;
}

let isShuttingDown = false;

export function resetShutdownStateForTesting(): void {
  isShuttingDown = false;
}

export function isShutdownInProgress(): boolean {
  return isShuttingDown;
}

export async function performShutdown(
  server?: HttpServer,
  signal: string = 'SIGTERM',
  options: ShutdownOptions = {}
): Promise<void> {
  if (isShuttingDown) {
    logger.warn(`Shutdown already in progress. Ignoring duplicate signal: ${signal}`);
    return;
  }
  isShuttingDown = true;
  logger.info(`Received ${signal}. Initiating graceful shutdown...`);

  const { timeoutMs = 10000, exitFn = (code) => process.exit(code) } = options;

  // Force termination timer (unref'd so it does not prevent natural exit if all succeeds)
  const forceExitTimer = setTimeout(() => {
    logger.error(`Graceful shutdown timed out after ${timeoutMs}ms. Forcing process exit.`);
    exitFn(1);
  }, timeoutMs);
  if (typeof forceExitTimer.unref === 'function') {
    forceExitTimer.unref();
  }

  try {
    // 1. Stop session cleanup scheduler
    stopSessionCleanup();

    // 2. Stop accepting new HTTP connections & drain active connections
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) return reject(err);
          resolve();
        });
      });
      logger.info('HTTP server closed successfully.');
    }

    // 3. Disconnect Socket.IO server if initialized
    const io = getIOServer();
    if (io) {
      await new Promise<void>((resolve) => {
        io.close(() => {
          resolve();
        });
      });
      logger.info('Socket.IO server closed successfully.');
    }

    // 4. Drain and close the PostgreSQL pool
    await pool.end();
    logger.info('Database pool drained and closed successfully.');

    clearTimeout(forceExitTimer);
    logger.info('Graceful shutdown completed successfully.');
    exitFn(0);
  } catch (error) {
    clearTimeout(forceExitTimer);
    logger.error('Error during graceful shutdown:', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    exitFn(1);
  }
}

export function initGracefulShutdown(server: HttpServer): void {
  const handleSignal = (signal: string) => {
    performShutdown(server, signal).catch((err) => {
      logger.error(`Unhandled error during shutdown on ${signal}:`, {
        error: (err as Error).message,
      });
      process.exit(1);
    });
  };

  process.on('SIGTERM', () => handleSignal('SIGTERM'));
  process.on('SIGINT', () => handleSignal('SIGINT'));
}
