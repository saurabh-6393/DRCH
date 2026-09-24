import { Pool, QueryResultRow } from 'pg';
import { env } from '../config/env';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  min: 2,
  max: 10,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

/**
 * Execute a query using the shared connection pool.
 * All queries use parameterized values to prevent SQL injection.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) {
  return pool.query<T>(text, params);
}

/**
 * Acquire a client from the pool for use in transactions.
 * Caller is responsible for releasing the client.
 */
export async function getClient() {
  return pool.connect();
}
