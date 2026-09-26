import http from 'http';
import app from './app';
import { env } from './config/env';
import { pool } from './db/pool';
import { logger } from './shared/logger';
import { initSocketServer } from './socket/socket.server';
import { startSessionCleanup } from './services/sessionCleanup';
import { initGracefulShutdown } from './services/shutdown.service';

async function bootstrap() {
  // Verify database connection
  try {
    const result = await pool.query('SELECT NOW() AS now');
    logger.info(`Database connected at ${result.rows[0].now}`);
  } catch (error) {
    logger.error('Failed to connect to the database. Is PostgreSQL running?', {
      stack: (error as Error).message,
    });
    process.exit(1);
  }

  // Create HTTP & Socket.IO server
  const server = http.createServer(app);
  initSocketServer(server);

  // Start scheduled session cleanup (Contract §6.8)
  startSessionCleanup();

  // Register graceful shutdown handlers (Contract §6.7)
  initGracefulShutdown(server);

  server.listen(env.PORT, () => {
    logger.info(`🚀 Backend server running on port ${env.PORT} (${env.NODE_ENV})`);
  });
}

bootstrap();
