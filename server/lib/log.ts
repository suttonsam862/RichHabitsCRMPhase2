import pino from 'pino';
import type { Request } from 'express';

const pretty = (process.env.LOG_PRETTY ?? '1') === '1';
const level  = process.env.LOG_LEVEL ?? 'info';

export const logger = pino(
  pretty
    ? { level, transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l' } } }
    : { level }
);

export function shortRid() {
  // Small collision-safe-ish token for log lines
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Log security events (role checks, auth failures, etc.)
 */
export function logSecurityEvent(req: Request, event: string, details?: any) {
  const rid = (req as any)?.res?.locals?.rid || shortRid();
  logger.warn({
    rid,
    event,
    details,
    userAgent: req.headers['user-agent'],
    ip: req.ip
  }, 'Security event');
}

/**
 * Log database operations
 */
export function logDatabaseOperation(req: Request, operation: string, table: string, data?: any) {
  const rid = (req as any)?.res?.locals?.rid || shortRid();
  logger.debug({
    rid,
    operation,
    table,
    data
  }, 'Database operation');
}

/**
 * Create child logger with request context
 */
export function createRequestLogger(req: Request) {
  const rid = (req as any)?.res?.locals?.rid || shortRid();
  return logger.child({
    rid,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent']
  });
}

// Export common log methods for convenience
export const log = {
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  debug: logger.debug.bind(logger)
};