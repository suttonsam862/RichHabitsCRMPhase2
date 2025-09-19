/**
 * Security validation utilities for comprehensive permission and data protection
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

/**
 * Validate organization-level data isolation
 */
export async function validateOrganizationIsolation(userId: string, organizationId: string, entityId: string, entityType: string): Promise<boolean> {
  try {
    let query;
    
    switch (entityType) {
      case 'order':
        query = sql`
          SELECT o.id 
          FROM orders o
          JOIN organization_memberships om ON om.organization_id::text = o.org_id::text
          WHERE o.id::text = ${entityId}::text 
          AND om.user_id::text = ${userId}::text 
          AND om.is_active = true
        `;
        break;
        
      case 'order_item':
        query = sql`
          SELECT oi.id 
          FROM order_items oi
          JOIN orders o ON o.id::text = oi.order_id::text
          JOIN organization_memberships om ON om.organization_id::text = o.org_id::text
          WHERE oi.id::text = ${entityId}::text 
          AND om.user_id::text = ${userId}::text 
          AND om.is_active = true
        `;
        break;
        
      case 'quote':
        query = sql`
          SELECT q.id 
          FROM quotes q
          JOIN organization_memberships om ON om.organization_id::text = q.org_id::text
          WHERE q.id::text = ${entityId}::text 
          AND om.user_id::text = ${userId}::text 
          AND om.is_active = true
        `;
        break;
        
      default:
        console.warn(`Unknown entity type for isolation validation: ${entityType}`);
        return false;
    }
    
    const result = await db.execute(query);
    return result.length > 0;
  } catch (error) {
    console.error('Organization isolation validation failed:', error);
    return false;
  }
}

/**
 * Validate that user has not exceeded rate limits
 */
export async function validateRateLimit(userId: string, operation: string, windowMinutes: number = 5, maxOperations: number = 10): Promise<boolean> {
  try {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
    
    const result = await db.execute(sql`
      SELECT COUNT(*) as operation_count
      FROM audit_logs 
      WHERE user_id::text = ${userId}::text 
      AND operation = ${operation}
      AND created_at >= ${windowStart}::timestamp
      AND success = true
    `);
    
    const count = parseInt((result[0]?.operation_count as string) || '0');
    return count < maxOperations;
  } catch (error) {
    console.error('Rate limit validation failed:', error);
    return false; // Fail safe - deny if we can't validate
  }
}

/**
 * Validate sensitive data access permissions
 */
export async function validateSensitiveDataAccess(userId: string, dataFields: string[], context: { entityType: string, entityId?: string }): Promise<{ allowed: boolean, restrictedFields: string[] }> {
  try {
    // Get user's role and permissions
    const userResult = await db.execute(sql`
      SELECT u.role, u.permissions, om.role as org_role
      FROM users u
      LEFT JOIN organization_memberships om ON (
        om.user_id::text = u.id::text AND om.is_active = true
      )
      WHERE u.id::text = ${userId}::text
      LIMIT 1
    `);
    
    if (!userResult.length) {
      return { allowed: false, restrictedFields: dataFields };
    }
    
    const user = userResult[0] as { role?: string; org_role?: string; permissions?: any };
    const userRole = (user.role as string)?.toLowerCase();
    const orgRole = (user.org_role as string)?.toLowerCase();
    
    // Define sensitive field access rules
    const sensitiveFieldAccess: Record<string, string[]> = {
      'pricing': ['admin', 'owner', 'manager', 'sales'],
      'cost': ['admin', 'owner', 'manager'],
      'profit': ['admin', 'owner'],
      'commission': ['admin', 'owner', 'sales'],
      'internal_notes': ['admin', 'owner', 'manager', 'sales'],
      'supplier_info': ['admin', 'owner', 'manager', 'manufacturing'],
      'financial_data': ['admin', 'owner', 'manager'],
      'customer_pii': ['admin', 'owner', 'manager', 'sales'],
    };
    
    const restrictedFields: string[] = [];
    
    for (const field of dataFields) {
      const allowedRoles = sensitiveFieldAccess[field] || [];
      const hasRoleAccess = allowedRoles.includes(userRole) || allowedRoles.includes(orgRole);
      
      if (!hasRoleAccess) {
        restrictedFields.push(field);
      }
    }
    
    return {
      allowed: restrictedFields.length === 0,
      restrictedFields
    };
  } catch (error) {
    console.error('Sensitive data access validation failed:', error);
    return { allowed: false, restrictedFields: dataFields };
  }
}

/**
 * Check for potential privilege escalation attempts
 */
export async function detectPrivilegeEscalation(userId: string, requestedAction: string, targetResource: string): Promise<{ suspicious: boolean, reason?: string }> {
  try {
    // Get user's recent activity
    const recentActivity = await db.execute(sql`
      SELECT operation, entity_type, created_at, success, metadata
      FROM audit_logs 
      WHERE user_id::text = ${userId}::text 
      AND created_at >= NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC
      LIMIT 50
    `);
    
    // Check for suspicious patterns
    const failedAttempts = recentActivity.filter(a => !a.success).length;
    const privilegedAttempts = recentActivity.filter(a => 
      ['DELETE', 'FORCE_CANCEL', 'OVERRIDE_VALIDATIONS', 'ASSIGN_ROLES'].includes(a.operation as string)
    ).length;
    
    // Flag suspicious activity
    if (failedAttempts > 5) {
      return { suspicious: true, reason: 'Multiple failed operations detected' };
    }
    
    if (privilegedAttempts > 3) {
      return { suspicious: true, reason: 'Unusual privileged operation pattern' };
    }
    
    // Check for role-inconsistent actions
    const userResult = await db.execute(sql`
      SELECT role FROM users WHERE id::text = ${userId}::text
    `);
    
    const userRole = (userResult[0]?.role as string)?.toLowerCase();
    
    if (userRole === 'customer' && ['DELETE', 'BULK_OPERATIONS', 'ASSIGN'].includes(requestedAction)) {
      return { suspicious: true, reason: 'Customer attempting privileged operations' };
    }
    
    return { suspicious: false };
  } catch (error) {
    console.error('Privilege escalation detection failed:', error);
    return { suspicious: true, reason: 'Unable to validate request' };
  }
}

/**
 * Validate cross-organization data access attempts
 */
export async function validateCrossOrgAccess(userId: string, targetOrgId: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT om.organization_id
      FROM organization_memberships om
      WHERE om.user_id::text = ${userId}::text 
      AND om.organization_id::text = ${targetOrgId}::text
      AND om.is_active = true
    `);
    
    return result.length > 0;
  } catch (error) {
    console.error('Cross-organization access validation failed:', error);
    return false;
  }
}

/**
 * Comprehensive security validation for API requests
 */
export async function validateRequestSecurity(params: {
  userId: string;
  organizationId?: string;
  operation: string;
  entityType: string;
  entityId?: string;
  sensitiveFields?: string[];
  targetOrgId?: string;
}): Promise<{
  allowed: boolean;
  violations: string[];
  restrictedFields?: string[];
}> {
  const violations: string[] = [];
  let restrictedFields: string[] = [];
  
  try {
    // 1. Check organization isolation
    if (params.entityId && params.organizationId) {
      const isolationValid = await validateOrganizationIsolation(
        params.userId, 
        params.organizationId, 
        params.entityId, 
        params.entityType
      );
      if (!isolationValid) {
        violations.push('Organization isolation violation');
      }
    }
    
    // 2. Check rate limits
    const rateLimitValid = await validateRateLimit(params.userId, params.operation);
    if (!rateLimitValid) {
      violations.push('Rate limit exceeded');
    }
    
    // 3. Check sensitive data access
    if (params.sensitiveFields?.length) {
      const sensitiveValidation = await validateSensitiveDataAccess(
        params.userId, 
        params.sensitiveFields, 
        { entityType: params.entityType, entityId: params.entityId }
      );
      if (!sensitiveValidation.allowed) {
        violations.push('Sensitive data access denied');
        restrictedFields = sensitiveValidation.restrictedFields;
      }
    }
    
    // 4. Check for privilege escalation
    const escalationCheck = await detectPrivilegeEscalation(
      params.userId, 
      params.operation, 
      params.entityId || ''
    );
    if (escalationCheck.suspicious) {
      violations.push(`Privilege escalation detected: ${escalationCheck.reason}`);
    }
    
    // 5. Check cross-organization access
    if (params.targetOrgId && params.organizationId !== params.targetOrgId) {
      const crossOrgValid = await validateCrossOrgAccess(params.userId, params.targetOrgId);
      if (!crossOrgValid) {
        violations.push('Cross-organization access denied');
      }
    }
    
    return {
      allowed: violations.length === 0,
      violations,
      restrictedFields: restrictedFields.length > 0 ? restrictedFields : undefined
    };
  } catch (error) {
    console.error('Request security validation failed:', error);
    return {
      allowed: false,
      violations: ['Security validation failed'],
    };
  }
}