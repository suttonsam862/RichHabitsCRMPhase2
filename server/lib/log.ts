import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

// Create logger instance with redaction for sensitive data
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: [
    'req.headers.authorization',
    'res.headers.authorization',
    'process.env',
    'config.db.password',
    'config.supabase.serviceKey',
    'password',
    'token',
    'access_token',
    'refresh_token',
    'JWT_SECRET',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_ANON_KEY'
  ],
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    }
  } : undefined,
});

// Extend Request type to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

/**
 * Middleware to add request ID to all requests
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  req.requestId = req.headers['x-request-id'] as string || uuidv4();
  res.setHeader('x-request-id', req.requestId);
  next();
}

/**
 * Create child logger with request context
 */
export function createRequestLogger(req: Request) {
  return logger.child({
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent']
  });
}

/**
 * Log request start
 */
export function logRequest(req: Request) {
  const reqLogger = createRequestLogger(req);
  reqLogger.info('Request started');
}

/**
 * Log request completion
 */
export function logRequestComplete(req: Request, res: Response, responseTime?: number) {
  const reqLogger = createRequestLogger(req);
  reqLogger.info({
    statusCode: res.statusCode,
    responseTime
  }, 'Request completed');
}

/**
 * Log errors with full context
 */
export function logError(req: Request, error: Error, context?: any) {
  const reqLogger = createRequestLogger(req);
  reqLogger.error({
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    context
  }, 'Request error');
}

/**
 * Log database operations
 */
export function logDatabaseOperation(req: Request, operation: string, table: string, data?: any) {
  const reqLogger = createRequestLogger(req);
  reqLogger.debug({
    operation,
    table,
    data
  }, 'Database operation');
}

/**
 * Log security events (role checks, auth failures, etc.)
 */
export function logSecurityEvent(req: Request, event: string, details?: any) {
  const reqLogger = createRequestLogger(req);
  reqLogger.warn({
    event,
    details,
    userAgent: req.headers['user-agent'],
    ip: req.ip
  }, 'Security event');
}

// Export base logger
export { logger };

// Export common log methods for convenience
export const log = {
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  debug: logger.debug.bind(logger)
};