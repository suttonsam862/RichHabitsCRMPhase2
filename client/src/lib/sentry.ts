import * as Sentry from "@sentry/react";

/**
 * Utility functions for Sentry error tracking and monitoring
 */

export interface UserContext {
  id?: string;
  email?: string;
  username?: string;
  role?: string;
  organizationId?: string;
}

/**
 * Set user context for error tracking
 */
export const setSentryUser = (user: UserContext) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    organizationId: user.organizationId,
  });
};

/**
 * Clear user context (e.g., on logout)
 */
export const clearSentryUser = () => {
  Sentry.setUser(null);
};

/**
 * Add breadcrumb for navigation events
 */
export const addNavigationBreadcrumb = (to: string, from?: string) => {
  Sentry.addBreadcrumb({
    category: 'navigation',
    message: `Navigated to ${to}`,
    level: 'info',
    data: {
      to,
      from,
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Add breadcrumb for user actions
 */
export const addUserActionBreadcrumb = (action: string, target?: string, data?: Record<string, any>) => {
  Sentry.addBreadcrumb({
    category: 'user',
    message: `User ${action}${target ? ` on ${target}` : ''}`,
    level: 'info',
    data: {
      action,
      target,
      timestamp: new Date().toISOString(),
      ...data,
    },
  });
};

/**
 * Add breadcrumb for API calls
 */
export const addApiCallBreadcrumb = (method: string, url: string, status?: number, duration?: number) => {
  Sentry.addBreadcrumb({
    category: 'http',
    message: `${method.toUpperCase()} ${url}`,
    level: status && status >= 400 ? 'error' : 'info',
    data: {
      method: method.toUpperCase(),
      url,
      status_code: status,
      duration,
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Add breadcrumb for form submissions
 */
export const addFormBreadcrumb = (formName: string, action: 'submit' | 'validate' | 'error', data?: Record<string, any>) => {
  Sentry.addBreadcrumb({
    category: 'form',
    message: `Form ${formName} ${action}`,
    level: action === 'error' ? 'error' : 'info',
    data: {
      form: formName,
      action,
      timestamp: new Date().toISOString(),
      ...data,
    },
  });
};

/**
 * Add breadcrumb for database operations
 */
export const addDatabaseBreadcrumb = (operation: string, table?: string, recordId?: string) => {
  Sentry.addBreadcrumb({
    category: 'db',
    message: `Database ${operation}${table ? ` on ${table}` : ''}`,
    level: 'info',
    data: {
      operation,
      table,
      recordId,
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Capture a custom error with additional context
 */
export const captureError = (error: Error, context?: Record<string, any>, tags?: Record<string, string>) => {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext('custom', context);
    }
    if (tags) {
      Object.entries(tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    Sentry.captureException(error);
  });
};

/**
 * Capture a custom message with additional context
 */
export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) => {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext('custom', context);
    }
    scope.setLevel(level);
    Sentry.captureMessage(message);
  });
};

/**
 * Start a performance transaction
 */
export const startTransaction = (name: string, operation: string) => {
  return Sentry.startInactiveSpan({
    name,
    op: operation,
  });
};

/**
 * Create a performance span
 */
export const startSpan = (operation: string, description?: string) => {
  return Sentry.startInactiveSpan({
    op: operation,
    name: description || operation,
  });
};

export default {
  setSentryUser,
  clearSentryUser,
  addNavigationBreadcrumb,
  addUserActionBreadcrumb,
  addApiCallBreadcrumb,
  addFormBreadcrumb,
  addDatabaseBreadcrumb,
  captureError,
  captureMessage,
  startTransaction,
  startSpan,
};