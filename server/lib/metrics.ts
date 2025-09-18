/**
 * Prometheus Metrics Service
 * Centralized service for managing application monitoring metrics
 */

import promClient from 'prom-client';
import { createHash } from 'crypto';

// Register default Node.js metrics (memory, GC, event loop lag, etc.)
promClient.collectDefaultMetrics({
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5], // seconds
  register: promClient.register,
  eventLoopMonitoringPrecision: 10,
});

// Custom application metrics

// HTTP Request Metrics
export const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'organization', 'user_role'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10], // seconds
});

export const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'organization', 'user_role'],
});

export const httpRequestSize = new promClient.Histogram({
  name: 'http_request_size_bytes',
  help: 'Size of HTTP requests in bytes',
  labelNames: ['method', 'route', 'organization'],
  buckets: [100, 1000, 10000, 100000, 1000000], // bytes
});

export const httpResponseSize = new promClient.Histogram({
  name: 'http_response_size_bytes',
  help: 'Size of HTTP responses in bytes',
  labelNames: ['method', 'route', 'status_code', 'organization'],
  buckets: [100, 1000, 10000, 100000, 1000000], // bytes
});

// Database Metrics
export const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table', 'organization'],
  buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5, 10], // seconds
});

export const dbQueryTotal = new promClient.Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table', 'status', 'organization'],
});

export const dbConnectionPoolActive = new promClient.Gauge({
  name: 'db_connection_pool_active',
  help: 'Number of active database connections',
});

export const dbConnectionPoolIdle = new promClient.Gauge({
  name: 'db_connection_pool_idle',
  help: 'Number of idle database connections',
});

export const dbConnectionPoolTotal = new promClient.Gauge({
  name: 'db_connection_pool_total',
  help: 'Total number of database connections in pool',
});

// Authentication Metrics
export const authAttempts = new promClient.Counter({
  name: 'auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['type', 'status', 'organization'],
});

export const authSessionsActive = new promClient.Gauge({
  name: 'auth_sessions_active_total',
  help: 'Number of currently active user sessions',
  labelNames: ['organization', 'user_role'],
});

export const authTokensIssued = new promClient.Counter({
  name: 'auth_tokens_issued_total',
  help: 'Total number of authentication tokens issued',
  labelNames: ['organization', 'user_role'],
});

export const authPasswordResets = new promClient.Counter({
  name: 'auth_password_resets_total',
  help: 'Total number of password reset requests',
  labelNames: ['status', 'organization'],
});

// Business Metrics
export const businessOrdersCreated = new promClient.Counter({
  name: 'business_orders_created_total',
  help: 'Total number of orders created',
  labelNames: ['organization', 'status', 'user_role'],
});

export const businessUserRegistrations = new promClient.Counter({
  name: 'business_user_registrations_total',
  help: 'Total number of user registrations',
  labelNames: ['organization', 'user_role', 'status'],
});

export const businessFileUploads = new promClient.Counter({
  name: 'business_file_uploads_total',
  help: 'Total number of file uploads',
  labelNames: ['organization', 'file_type', 'status'],
});

export const businessFileUploadSize = new promClient.Histogram({
  name: 'business_file_upload_size_bytes',
  help: 'Size of uploaded files in bytes',
  labelNames: ['organization', 'file_type'],
  buckets: [1000, 10000, 100000, 1000000, 10000000, 100000000], // bytes
});

export const businessOrganizationsCreated = new promClient.Counter({
  name: 'business_organizations_created_total',
  help: 'Total number of organizations created',
  labelNames: ['created_by_role', 'status'],
});

export const businessQuotesGenerated = new promClient.Counter({
  name: 'business_quotes_generated_total',
  help: 'Total number of quotes generated',
  labelNames: ['organization', 'user_role', 'status'],
});

// Health Check Metrics
export const healthCheckStatus = new promClient.Gauge({
  name: 'health_check_status',
  help: 'Health check status (1 = healthy, 0 = unhealthy)',
  labelNames: ['component'],
});

export const healthCheckDuration = new promClient.Histogram({
  name: 'health_check_duration_seconds',
  help: 'Duration of health check operations in seconds',
  labelNames: ['component'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5], // seconds
});

// System Metrics
export const applicationInfo = new promClient.Gauge({
  name: 'application_info',
  help: 'Application information',
  labelNames: ['version', 'environment', 'node_version'],
});

export const rateLimitHits = new promClient.Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['endpoint', 'limit_type', 'organization'],
});

export const errorTotal = new promClient.Counter({
  name: 'errors_total',
  help: 'Total number of application errors',
  labelNames: ['type', 'severity', 'component', 'organization'],
});

// Security Metrics
export const securityEvents = new promClient.Counter({
  name: 'security_events_total',
  help: 'Total number of security events',
  labelNames: ['event_type', 'severity', 'organization'],
});

export const corsViolations = new promClient.Counter({
  name: 'cors_violations_total',
  help: 'Total number of CORS policy violations',
  labelNames: ['origin', 'blocked'],
});

// Cache Metrics (if applicable)
export const cacheHits = new promClient.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type', 'organization'],
});

export const cacheMisses = new promClient.Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type', 'organization'],
});

// Initialize application info metric
const packageJson = process.env.npm_package_version || '1.0.0';
const nodeVersion = process.version;
const environment = process.env.NODE_ENV || 'development';

applicationInfo.labels(packageJson, environment, nodeVersion).set(1);

/**
 * Helper function to safely get organization from request context
 */
export function getOrganizationLabel(req: any): string {
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
  const role = req.user?.role;
  return role || 'anonymous';
}

/**
 * Helper function to normalize route patterns for consistent labeling
 */
export function normalizeRoute(originalUrl: string): string {
  // Replace UUIDs and numeric IDs with placeholder
  let route = originalUrl;
  
  // Replace UUID patterns
  route = route.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id');
  
  // Replace numeric IDs
  route = route.replace(/\/\d+(\?|\/|$)/g, '/:id$1');
  
  // Remove query parameters for route normalization
  route = route.split('?')[0];
  
  return route;
}

/**
 * Helper function to track database operations
 */
export function trackDbQuery(operation: string, table: string, organization?: string): () => void {
  const start = Date.now();
  const orgLabel = organization || 'system';
  
  return () => {
    const duration = (Date.now() - start) / 1000;
    dbQueryDuration.labels(operation, table, orgLabel).observe(duration);
    dbQueryTotal.labels(operation, table, 'success', orgLabel).inc();
  };
}

/**
 * Helper function to track database query errors
 */
export function trackDbQueryError(operation: string, table: string, organization?: string): void {
  const orgLabel = organization || 'system';
  dbQueryTotal.labels(operation, table, 'error', orgLabel).inc();
}

/**
 * Get metrics in Prometheus format
 */
export async function getMetrics(): Promise<string> {
  try {
    return await promClient.register.metrics();
  } catch (error) {
    console.error('Error generating metrics:', error);
    throw error;
  }
}

/**
 * Get metrics content type
 */
export function getMetricsContentType(): string {
  return promClient.register.contentType;
}

/**
 * Clear all metrics (useful for testing)
 */
export function clearMetrics(): void {
  promClient.register.clear();
}

/**
 * Reset all metrics to their initial state
 */
export function resetMetrics(): void {
  promClient.register.resetMetrics();
}