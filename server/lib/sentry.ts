import * as Sentry from '@sentry/node';

/**
 * Server-side Sentry utilities for error tracking and monitoring
 */

export interface ServerUserContext {
  id?: string;
  email?: string;
  role?: string;
  organizationId?: string;
  sessionId?: string;
}

/**
 * Set user context for server-side error tracking
 */
export const setSentryUser = (user: ServerUserContext) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
    sessionId: user.sessionId,
  });
};

/**
 * Clear user context
 */
export const clearSentryUser = () => {
  Sentry.setUser(null);
};

/**
 * Add breadcrumb for database operations
 */
export const addDatabaseBreadcrumb = (operation: string, table?: string, recordId?: string, duration?: number) => {
  Sentry.addBreadcrumb({
    category: 'db',
    message: `Database ${operation}${table ? ` on ${table}` : ''}`,
    level: 'info',
    data: {
      operation,
      table,
      recordId,
      duration,
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Add breadcrumb for API requests
 */
export const addApiRequestBreadcrumb = (method: string, path: string, userId?: string, statusCode?: number) => {
  Sentry.addBreadcrumb({
    category: 'http',
    message: `${method.toUpperCase()} ${path}`,
    level: statusCode && statusCode >= 400 ? 'error' : 'info',
    data: {
      method: method.toUpperCase(),
      path,
      userId,
      statusCode,
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Add breadcrumb for authentication events
 */
export const addAuthBreadcrumb = (event: 'login' | 'logout' | 'register' | 'password_reset', userId?: string, success?: boolean) => {
  Sentry.addBreadcrumb({
    category: 'auth',
    message: `User ${event}${success !== undefined ? (success ? ' succeeded' : ' failed') : ''}`,
    level: success === false ? 'warning' : 'info',
    data: {
      event,
      userId,
      success,
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Add breadcrumb for external API calls
 */
export const addExternalApiBreadcrumb = (service: string, operation: string, duration?: number, success?: boolean) => {
  Sentry.addBreadcrumb({
    category: 'external_api',
    message: `${service} ${operation}`,
    level: success === false ? 'error' : 'info',
    data: {
      service,
      operation,
      duration,
      success,
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Capture an error with sanitized request context
 */
export const captureErrorWithContext = (error: Error, req?: any, additionalContext?: Record<string, any>) => {
  Sentry.withScope((scope) => {
    scope.setTag('component', 'server');
    
    if (req) {
      // Create sanitized request context without sensitive data
      const sanitizedHeaders = { ...req.headers };
      const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token', 'x-session-token'];
      sensitiveHeaders.forEach(header => {
        if (sanitizedHeaders[header]) sanitizedHeaders[header] = '[Filtered]';
        if (sanitizedHeaders[header.toUpperCase()]) sanitizedHeaders[header.toUpperCase()] = '[Filtered]';
      });
      
      scope.setContext('request', {
        method: req.method,
        url: req.originalUrl || req.url,
        headers: sanitizedHeaders,
        // Never include request body for security
        params: req.params,
        query: req.query,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      
      if (req.user) {
        setSentryUser({
          id: req.user.id,
          email: req.user.email,
          role: req.user.role,
        });
      }
    }
    
    if (additionalContext) {
      // Sanitize additional context
      const sanitizedContext = { ...additionalContext };
      Object.keys(sanitizedContext).forEach(key => {
        if (key.toLowerCase().includes('password') || 
            key.toLowerCase().includes('secret') || 
            key.toLowerCase().includes('token') || 
            key.toLowerCase().includes('key')) {
          sanitizedContext[key] = '[Filtered]';
        }
      });
      scope.setContext('additional', sanitizedContext);
    }
    
    Sentry.captureException(error);
  });
};

/**
 * Capture a message with context
 */
export const captureMessageWithContext = (
  message: string, 
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
) => {
  Sentry.withScope((scope) => {
    scope.setTag('component', 'server');
    scope.setLevel(level);
    
    if (context) {
      scope.setContext('custom', context);
    }
    
    Sentry.captureMessage(message);
  });
};

/**
 * DEPRECATED: This middleware has been replaced with proper Sentry request handling.
 * Use Sentry.expressIntegration().requestHandler() instead for proper request scoping.
 * 
 * This function is kept for backward compatibility but should not be used.
 */
export const sentryContextMiddleware = (req: any, res: any, next: any) => {
  console.warn('sentryContextMiddleware is deprecated. Use Sentry.expressIntegration().requestHandler() instead.');
  next();
};

/**
 * Start a server-side performance transaction
 */
export const startServerTransaction = (name: string, operation: string, description?: string) => {
  return Sentry.startInactiveSpan({
    name,
    op: operation,
  });
};

export default {
  setSentryUser,
  clearSentryUser,
  addDatabaseBreadcrumb,
  addApiRequestBreadcrumb,
  addAuthBreadcrumb,
  addExternalApiBreadcrumb,
  captureErrorWithContext,
  captureMessageWithContext,
  startServerTransaction,
};