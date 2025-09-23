/**
 * Metrics Middleware
 * Tracks HTTP requests, responses, and performance metrics
 */

import type { Request, Response, NextFunction } from 'express';
import {
  httpRequestDuration,
  httpRequestTotal,
  httpRequestSize,
  httpResponseSize,
  normalizeRoute,
  rateLimitHits,
  corsViolations
} from '../lib/metrics';
import { createHash } from 'crypto'; // Import createHash here

export interface MetricsRequest extends Request {
  startTime?: number;
  user?: {
    id: string;
    email?: string;
    full_name?: string;
    role?: string;
    organization_id?: string;
    is_super_admin?: boolean;
  };
}

/**
 * Metrics collection middleware
 * Should be added early in the middleware stack
 */
export function metricsMiddleware(req: MetricsRequest, res: Response, next: NextFunction) {
  const startTime = Date.now();
  req.startTime = startTime;

  // Skip metrics collection for the metrics endpoint itself to avoid recursion
  if (req.path === '/metrics') {
    return next();
  }

  // Track request size if available
  const contentLength = req.get('content-length');
  if (contentLength) {
    // Use req.route?.path to prevent cardinality explosion, fallback to normalized route
    const route = req.route?.path || normalizeRoute(req.originalUrl || req.url);
    const orgLabel = getOrganizationLabel(req);
    httpRequestSize.labels(req.method, route, orgLabel).observe(parseInt(contentLength, 10));
  }

  // Hook into response finish event
  res.on('finish', () => {
    try {
      // Calculate request duration
      const duration = (Date.now() - startTime) / 1000;

      // Use req.route?.path to prevent cardinality explosion, fallback to normalized route
      const route = req.route?.path || normalizeRoute(req.originalUrl || req.url);
      const statusCode = res.statusCode.toString();
      const orgLabel = getOrganizationLabel(req);
      const roleLabel = getUserRoleLabel(req);

      // Record metrics
      httpRequestDuration.labels(req.method, route, statusCode, orgLabel, roleLabel).observe(duration);
      httpRequestTotal.labels(req.method, route, statusCode, orgLabel, roleLabel).inc();

      // Track response size
      const responseLength = res.get('content-length');
      if (responseLength) {
        httpResponseSize.labels(req.method, route, statusCode, orgLabel).observe(parseInt(responseLength, 10));
      }
    } catch (error) {
      console.error('Error recording metrics:', error);
      // Don't let metrics errors break the response
    }
  });

  // Track errors
  res.on('error', (error) => {
    console.error('Response error tracked by metrics:', error);
    // Additional error tracking could be added here
  });

  next();
}

/**
 * Rate limit tracking middleware
 * Should be added after rate limiting middleware
 */
export function rateLimitMetricsMiddleware(req: MetricsRequest, res: Response, next: NextFunction) {
  // Check if request was rate limited by examining response headers or status
  res.on('finish', () => {
    if (res.statusCode === 429) {
      const route = req.route?.path || normalizeRoute(req.originalUrl || req.url);
      const orgLabel = getOrganizationLabel(req);

      // Determine limit type based on endpoint
      let limitType = 'general';
      if (route.includes('/auth/')) {
        limitType = 'auth';
      } else if (route.includes('/api/')) {
        limitType = 'api';
      }

      rateLimitHits.labels(route, limitType, orgLabel).inc();
    }
  });

  next();
}

/**
 * CORS violation tracking middleware
 */
export function corsMetricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.get('origin');

  res.on('finish', () => {
    // Check for CORS-related errors
    if (res.statusCode === 403 && origin) {
      // This is a simplified check - in reality, you'd need more sophisticated CORS violation detection
      corsViolations.labels(origin, 'true').inc();
    }
  });

  next();
}

/**
 * Business metrics tracking helper
 * Call this from business logic to track business-specific events
 */
export async function trackBusinessEvent(event: string, req: MetricsRequest, additionalLabels: Record<string, string> = {}) {
  const orgLabel = getOrganizationLabel(req);
  const roleLabel = getUserRoleLabel(req);

  try {
    // Import business metrics here to avoid circular dependencies
    const { 
      businessOrdersCreated, 
      businessUserRegistrations, 
      businessFileUploads, 
      businessOrganizationsCreated, 
      businessQuotesGenerated 
    } = await import('../lib/metrics.js');

    // Track specific business events with dedicated counters
    switch (event) {
      case 'order_created': {
        const orderStatus = additionalLabels.status || 'pending';
        businessOrdersCreated.labels(orgLabel, orderStatus, roleLabel).inc();
        break;
      }

      case 'user_registered': {
        const regStatus = additionalLabels.status || 'success';
        businessUserRegistrations.labels(orgLabel, roleLabel, regStatus).inc();
        break;
      }

      case 'file_uploaded': {
        const fileType = additionalLabels.file_type || 'unknown';
        const uploadStatus = additionalLabels.status || 'success';
        businessFileUploads.labels(orgLabel, fileType, uploadStatus).inc();
        break;
      }

      case 'organization_created': {
        const createdByRole = additionalLabels.created_by_role || roleLabel;
        const orgStatus = additionalLabels.status || 'success';
        businessOrganizationsCreated.labels(createdByRole, orgStatus).inc();
        break;
      }

      case 'quote_generated': {
        const quoteStatus = additionalLabels.status || 'success';
        businessQuotesGenerated.labels(orgLabel, roleLabel, quoteStatus).inc();
        break;
      }

      default:
        // For unknown events, log them for visibility
        console.log(`Business event tracked: ${event}`, {
          organization: orgLabel,
          role: roleLabel,
          ...additionalLabels
        });
    }
  } catch (error) {
    console.error('Error tracking business event:', error);
    // Don't let metrics errors break the business logic
  }
}

/**
 * Error tracking middleware
 * Should be added near the error handling middleware
 */
export async function errorMetricsMiddleware(error: any, req: MetricsRequest, res: Response, next: NextFunction) {
  try {
    const orgLabel = getOrganizationLabel(req);

    // Import the error counter here to avoid circular dependencies
    const { errorTotal } = await import('../lib/metrics.js');

    // Determine error type and severity
    let errorType = 'unknown';
    let severity = 'error';

    if (error.name) {
      errorType = error.name.toLowerCase();
    }

    if (error.status || error.statusCode) {
      const status = error.status || error.statusCode;
      if (status >= 400 && status < 500) {
        severity = 'warning';
      } else if (status >= 500) {
        severity = 'error';
      }
    }

    // Determine component based on the request path
    let component = 'unknown';
    const path = req.originalUrl || req.url;
    if (path.includes('/api/v1/auth/')) {
      component = 'auth';
    } else if (path.includes('/api/v1/organizations/')) {
      component = 'organizations';
    } else if (path.includes('/api/v1/users/')) {
      component = 'users';
    } else if (path.includes('/api/v1/orders/')) {
      component = 'orders';
    } else if (path.includes('/api/')) {
      component = 'api';
    } else {
      component = 'frontend';
    }

    errorTotal.labels(errorType, severity, component, orgLabel).inc();
  } catch (metricsError) {
    console.error('Error in error metrics middleware:', metricsError);
  }

  // Always continue to the next error handler
  next(error);
}

/**
 * Security event tracker
 * Use this to track security-related events
 */
export async function trackSecurityEvent(eventType: string, req: MetricsRequest, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium') {
  try {
    const { securityEvents } = await import('../lib/metrics.js');
    const orgLabel = getOrganizationLabel(req);

    securityEvents.labels(eventType, severity, orgLabel).inc();
  } catch (error) {
    console.error('Error tracking security event:', error);
  }
}

/**
 * Helper function to safely get organization from request context
 */
export function getOrganizationLabel(req: any): string {
  // Handle case where req is undefined (during module import)
  if (!req || !req.user) return 'none';

  const orgId = req.user?.organization_id;
  if (!orgId) return 'none';

  // Hash organization ID for privacy - don't expose actual org IDs in metrics
  const hash = createHash('sha256').update(orgId).digest('hex').substring(0, 8);
  return `org_${hash}`;
}

/**
 * Helper function to safely get user role from request context
 */
export function getUserRoleLabel(req: any): string {
  // Handle case where req is undefined (during module import)
  if (!req || !req.user) return 'anonymous';

  const role = req.user?.role;
  return role || 'anonymous';
}