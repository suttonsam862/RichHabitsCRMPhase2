import { Response, NextFunction } from 'express';
import { AuthedRequest } from './auth';
import { logSecurityEvent } from '../lib/log';
import { db } from '../db';
import { sql } from 'drizzle-orm';

/**
 * Enhanced audit trail middleware for permission-sensitive operations
 */

interface AuditContext {
  operation: string;
  entityType: string;
  entityId?: string;
  previousState?: any;
  newState?: any;
  sensitive?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Enhanced audit logging for sensitive operations
 */
export function auditSensitiveOperation(context: AuditContext) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    // Capture request details for audit
    const auditData = {
      userId: req.user?.id,
      userRole: req.user?.role,
      organizationId: req.user?.organization_id,
      operation: context.operation,
      entityType: context.entityType,
      entityId: context.entityId || req.params.id,
      requestMethod: req.method,
      requestPath: req.path,
      requestQuery: req.query,
      requestBody: context.sensitive ? '[REDACTED]' : req.body,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      metadata: context.metadata,
    };

    // Log the operation attempt
    logSecurityEvent(req, 'AUDIT_OPERATION_ATTEMPT', auditData);

    // Store original res.json to capture response
    const originalJson = res.json;
    let responseData: any;
    
    res.json = function(body: any) {
      responseData = body;
      return originalJson.call(this, body);
    };

    // Store original res.end to capture final status
    const originalEnd = res.end;
    res.end = function(...args: any[]) {
      // Log the operation result
      const resultAuditData = {
        ...auditData,
        statusCode: res.statusCode,
        success: res.statusCode >= 200 && res.statusCode < 300,
        responseBody: context.sensitive ? '[REDACTED]' : responseData,
        newState: context.newState,
      };

      logSecurityEvent(req, 'AUDIT_OPERATION_RESULT', resultAuditData);

      // Store in database audit log for critical operations
      if (context.sensitive || ['CREATE', 'UPDATE', 'DELETE', 'CANCEL'].includes(context.operation)) {
        storeAuditRecord(resultAuditData).catch(console.error);
      }

      return originalEnd.apply(this, args);
    };

    next();
  };
}

/**
 * Store critical audit records in database
 */
async function storeAuditRecord(auditData: any): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO audit_logs (
        user_id,
        organization_id,
        operation,
        entity_type,
        entity_id,
        request_method,
        request_path,
        status_code,
        success,
        ip_address,
        user_agent,
        metadata,
        created_at
      ) VALUES (
        ${auditData.userId}::varchar,
        ${auditData.organizationId}::varchar,
        ${auditData.operation},
        ${auditData.entityType},
        ${auditData.entityId}::varchar,
        ${auditData.requestMethod},
        ${auditData.requestPath},
        ${auditData.statusCode}::integer,
        ${auditData.success}::boolean,
        ${auditData.ipAddress},
        ${auditData.userAgent},
        ${JSON.stringify(auditData.metadata)}::jsonb,
        ${auditData.timestamp}::timestamp
      )
    `);
  } catch (error) {
    console.error('Failed to store audit record:', error);
    // Don't throw - audit failure shouldn't break the operation
  }
}

/**
 * Audit trail for order operations
 */
export const auditOrderCreate = () => auditSensitiveOperation({
  operation: 'CREATE',
  entityType: 'order',
  sensitive: true,
  metadata: { category: 'order_management' }
});

export const auditOrderUpdate = () => auditSensitiveOperation({
  operation: 'UPDATE',
  entityType: 'order',
  sensitive: true,
  metadata: { category: 'order_management' }
});

export const auditOrderStatusChange = () => auditSensitiveOperation({
  operation: 'STATUS_CHANGE',
  entityType: 'order',
  sensitive: true,
  metadata: { category: 'order_status' }
});

export const auditOrderCancel = () => auditSensitiveOperation({
  operation: 'CANCEL',
  entityType: 'order',
  sensitive: true,
  metadata: { category: 'order_cancellation' }
});

export const auditOrderDelete = () => auditSensitiveOperation({
  operation: 'DELETE',
  entityType: 'order',
  sensitive: true,
  metadata: { category: 'order_deletion' }
});

export const auditOrderFinancialAccess = () => auditSensitiveOperation({
  operation: 'FINANCIAL_ACCESS',
  entityType: 'order',
  sensitive: true,
  metadata: { category: 'financial_data' }
});

export const auditBulkOperation = () => auditSensitiveOperation({
  operation: 'BULK_OPERATION',
  entityType: 'order',
  sensitive: true,
  metadata: { category: 'bulk_operations' }
});

/**
 * Security event audit for authentication and authorization
 */
export function auditSecurityEvent(eventType: string, additionalData?: any) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const auditData = {
      eventType,
      userId: req.user?.id,
      userRole: req.user?.role,
      organizationId: req.user?.organization_id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      requestPath: req.path,
      timestamp: new Date().toISOString(),
      ...additionalData,
    };

    logSecurityEvent(req, eventType, auditData);

    // Store critical security events
    if (['PERMISSION_DENIED', 'UNAUTHORIZED_ACCESS', 'RATE_LIMIT_EXCEEDED'].includes(eventType)) {
      storeAuditRecord({
        ...auditData,
        operation: eventType,
        entityType: 'security_event',
        statusCode: res.statusCode,
        success: false,
      }).catch(console.error);
    }

    next();
  };
}

/**
 * Middleware to track data access patterns for anomaly detection
 */
export function trackDataAccess(dataType: string) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const accessData = {
      userId: req.user?.id,
      dataType,
      accessTime: new Date().toISOString(),
      ipAddress: req.ip,
      method: req.method,
      path: req.path,
      query: req.query,
    };

    // Log for analytics and anomaly detection
    logSecurityEvent(req, 'DATA_ACCESS', accessData);

    // TODO: Implement anomaly detection logic
    // - Track unusual access patterns
    // - Flag suspicious bulk data access
    // - Monitor after-hours access
    // - Alert on cross-organization data attempts

    next();
  };
}