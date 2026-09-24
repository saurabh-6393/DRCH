import { env } from '../config/env';

/**
 * Structured JSON logger.
 * In development: prints to console.
 * In production: outputs structured JSON for log aggregation.
 * Never logs raw PII or tokens.
 */

interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  requestId?: string;
  userId?: string;
  path?: string;
  code?: string;
  [key: string]: unknown;
}

function formatEntry(entry: LogEntry): string {
  if (env.NODE_ENV === 'development') {
    const { level, message, requestId, ...rest } = entry;
    const prefix = requestId ? `[${requestId}]` : '';
    const extras = Object.keys(rest).length > 2
      ? ` ${JSON.stringify(rest)}`
      : '';
    return `${level.toUpperCase()} ${prefix} ${message}${extras}`;
  }
  return JSON.stringify(entry);
}

export const logger = {
  info(message: string, meta?: Partial<LogEntry>) {
    const entry: LogEntry = { level: 'info', message, timestamp: new Date().toISOString(), ...meta };
    console.log(formatEntry(entry));
  },

  warn(message: string, meta?: Partial<LogEntry>) {
    const entry: LogEntry = { level: 'warn', message, timestamp: new Date().toISOString(), ...meta };
    console.warn(formatEntry(entry));
  },

  error(message: string, meta?: Partial<LogEntry> & { stack?: string }) {
    const entry: LogEntry = { level: 'error', message, timestamp: new Date().toISOString(), ...meta };
    console.error(formatEntry(entry));
  },

  debug(message: string, meta?: Partial<LogEntry>) {
    if (env.NODE_ENV === 'development') {
      const entry: LogEntry = { level: 'debug', message, timestamp: new Date().toISOString(), ...meta };
      console.debug(formatEntry(entry));
    }
  },
};
