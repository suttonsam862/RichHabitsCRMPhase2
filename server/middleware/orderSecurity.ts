import { Request, Response, NextFunction } from 'express';
import { sendErr } from '../lib/http';
import { logSecurityEvent } from '../lib/log';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { AuthedRequest } from './auth';
import { ACTION_PERMISSIONS, hasPermission } from '../lib/permissions';
import { requireOrgMember, OrgRole } from './orgSecurity';

/**
 * Enhanced order-specific permission middleware for granular RBAC
 */

interface OrderPermissionContext {
  orderId?: string;
  orgId?: string;
  operation: string;
  requiresApproval?: boolean;
  sensitiveData?: string[];
}

/**
 * Enhanced order access control with granular permissions
 */
export function requireOrderPermission(permission: string, context?: Partial<OrderPermissionContext>) {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // First check basic org membership
      await new Promise<void>((resolve, reject) => {
        requireOrgMember()(req, res, (err?: any) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const user = req.user;
      if (!user) {
        logSecurityEvent(req, 'ORDER_PERMISSION_NO_AUTH', { 
          permission, 
          context,
          requestId 
        });
        return sendErr(res, 'UNAUTHORIZED', 'Authentication required', undefined, 401);
      }

      // Get user's complete permissions from database
      const userPermissions = await getUserPermissions(user.id, user.organization_id);

      // Check if user has the required permission
      if (!hasPermission(userPermissions, permission)) {
        logSecurityEvent(req, 'ORDER_PERMISSION_DENIED', { 
          userId: user.id,
          permission, 
          context,
          userRole: user.role,
          requestId 
        });
        return sendErr(res, 'FORBIDDEN', `Insufficient permissions: ${permission} required`, undefined, 403);
      }

      // Additional context-based security checks
      if (context?.orderId) {
        const orderAccessValid = await validateOrderAccess(user.id, context.orderId, user.organization_id, permission);
        if (!orderAccessValid) {
          logSecurityEvent(req, 'ORDER_ACCESS_DENIED', { 
            userId: user.id,
            orderId: context.orderId,
            permission,
            requestId 
          });
          return sendErr(res, 'FORBIDDEN', 'Access denied to this order', undefined, 403);
        }
      }

      // Check for sensitive data access restrictions
      if (context?.sensitiveData?.length) {
        const sensitiveAccessValid = await validateSensitiveDataAccess(user.id, user.role, context.sensitiveData);
        if (!sensitiveAccessValid) {
          logSecurityEvent(req, 'ORDER_SENSITIVE_DATA_DENIED', { 
            userId: user.id,
            sensitiveFields: context.sensitiveData,
            permission,
            requestId 
          });
          return sendErr(res, 'FORBIDDEN', 'Access denied to sensitive order data', undefined, 403);
        }
      }

      // Log successful permission check
      logSecurityEvent(req, 'ORDER_PERMISSION_GRANTED', { 
        userId: user.id,
        permission, 
        context,
        requestId 
      });

      next();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logSecurityEvent(req, 'ORDER_PERMISSION_ERROR', { 
        userId: req.user?.id,
        permission,
        context,
        error: errorMessage,
        requestId 
      });
      return sendErr(res, 'INTERNAL_SERVER_ERROR', 'Permission check failed', undefined, 500);
    }
  };
}

/**
 * Get user's complete permissions including role-based and custom permissions
 */
async function getUserPermissions(userId: string, organizationId?: string): Promise<Record<string, boolean>> {
  try {
    // Get user's role and organization membership
    const result = await db.execute(sql`
      SELECT 
        u.role as user_role,
        u.permissions as user_permissions,
        om.role as org_role,
        r.permissions as role_permissions
      FROM users u
      LEFT JOIN organization_memberships om ON (
        om.user_id::text = u.id::text AND 
        om.organization_id::text = ${organizationId}::text AND
        om.is_active = true
      )
      LEFT JOIN roles r ON r.slug = u.role
      WHERE u.id = ${userId}
      LIMIT 1
    `);

    const userData = result[0];
    if (!userData) {
      return {};
    }

    // Merge permissions from multiple sources
    const rolePermissions = userData.role_permissions || {};
    const userPermissions = userData.user_permissions || {};
    
    // Get default permissions for user's role
    const defaultPermissions = getDefaultPermissionsForRole(userData.user_role);

    return {
      ...defaultPermissions,
      ...rolePermissions,
      ...userPermissions
    };
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return {};
  }
}

/**
 * Get default permissions for a role from ROLE_DEFAULTS
 */
function getDefaultPermissionsForRole(role: string): Record<string, boolean> {
  // Import ROLE_DEFAULTS dynamically to avoid circular dependencies
  const { ROLE_DEFAULTS } = require('../lib/permissions');
  
  const roleKey = role?.toUpperCase();
  if (roleKey && ROLE_DEFAULTS[roleKey]) {
    return ROLE_DEFAULTS[roleKey].permissions || {};
  }
  
  return {};
}

/**
 * Validate that user has access to a specific order
 */
async function validateOrderAccess(userId: string, orderId: string, organizationId?: string, permission?: string): Promise<boolean> {
  try {
    // Check if order exists and user has access via organization
    const result = await db.execute(sql`
      SELECT 
        o.id,
        o.org_id,
        o.salesperson_id,
        o.created_by,
        om.role as org_role
      FROM orders o
      LEFT JOIN organization_memberships om ON (
        om.organization_id::text = o.org_id::text AND
        om.user_id::text = ${userId}::text AND
        om.is_active = true
      )
      WHERE o.id::text = ${orderId}::text
      LIMIT 1
    `);

    const orderData = result[0];
    if (!orderData) {
      return false; // Order not found
    }

    // Check organization membership
    if (!orderData.org_role) {
      return false; // User not a member of order's organization
    }

    // Additional checks for sensitive permissions
    if (permission?.includes('financials') || permission?.includes('sensitive')) {
      // Only allow admin/owner roles for financial data
      return ['admin', 'owner'].includes(orderData.org_role);
    }

    // For assigned orders, salesperson gets additional access
    if (orderData.salesperson_id === userId) {
      return true;
    }

    // Order creator gets additional access
    if (orderData.created_by === userId) {
      return true;
    }

    return true; // Basic org membership sufficient for other operations
  } catch (error) {
    console.error('Error validating order access:', error);
    return false;
  }
}

/**
 * Validate access to sensitive data fields
 */
async function validateSensitiveDataAccess(userId: string, userRole?: string, sensitiveFields?: string[]): Promise<boolean> {
  if (!sensitiveFields?.length) {
    return true;
  }

  // Define which roles can access which sensitive fields
  const sensitiveFieldAccess: Record<string, string[]> = {
    'pricing': ['admin', 'owner', 'sales', 'manager'],
    'cost': ['admin', 'owner', 'manager'],
    'profit': ['admin', 'owner'],
    'internal_notes': ['admin', 'owner', 'manager', 'sales'],
    'commission': ['admin', 'owner', 'sales'],
    'supplier_info': ['admin', 'owner', 'manager', 'manufacturing']
  };

  for (const field of sensitiveFields) {
    const allowedRoles = sensitiveFieldAccess[field] || [];
    if (!allowedRoles.includes(userRole || '')) {
      return false;
    }
  }

  return true;
}

/**
 * Convenience middleware functions for common order permissions
 */
export const requireOrderRead = () => requireOrderPermission(ACTION_PERMISSIONS.ORDERS.READ);
export const requireOrderCreate = () => requireOrderPermission(ACTION_PERMISSIONS.ORDERS.CREATE);
export const requireOrderUpdate = () => requireOrderPermission(ACTION_PERMISSIONS.ORDERS.UPDATE);
export const requireOrderSensitiveUpdate = () => requireOrderPermission(ACTION_PERMISSIONS.ORDERS.UPDATE_SENSITIVE);
export const requireOrderDelete = () => requireOrderPermission(ACTION_PERMISSIONS.ORDERS.DELETE);
export const requireOrderStatusChange = () => requireOrderPermission(ACTION_PERMISSIONS.ORDERS.CHANGE_STATUS);
export const requireOrderCancel = () => requireOrderPermission(ACTION_PERMISSIONS.ORDERS.CANCEL);
export const requireOrderFinancials = () => requireOrderPermission(ACTION_PERMISSIONS.ORDERS.VIEW_FINANCIALS);
export const requireOrderBulkOps = () => requireOrderPermission(ACTION_PERMISSIONS.ORDERS.BULK_OPERATIONS);

/**
 * Dynamic permission middleware with context
 */
export function requireOrderPermissionWithContext(permission: string, getContext: (req: AuthedRequest) => Partial<OrderPermissionContext>) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const context = getContext(req);
    return requireOrderPermission(permission, context)(req, res, next);
  };
}

/**
 * Approval workflow middleware for sensitive operations
 */
export function requireApprovalWorkflow(operationType: string, getThreshold?: (req: AuthedRequest) => number) {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return sendErr(res, 'UNAUTHORIZED', 'Authentication required', undefined, 401);
      }

      // Check if operation requires approval based on user role and operation threshold
      const threshold = getThreshold ? getThreshold(req) : 0;
      const requiresApproval = await checkApprovalRequired(user.id, operationType, threshold);

      if (requiresApproval) {
        // For now, block operations that require approval
        // In a full implementation, this would create an approval request
        logSecurityEvent(req, 'ORDER_APPROVAL_REQUIRED', { 
          userId: user.id,
          operationType,
          threshold
        });
        return sendErr(res, 'FORBIDDEN', `Operation requires approval: ${operationType}`, undefined, 403);
      }

      next();
    } catch (error) {
      return sendErr(res, 'INTERNAL_SERVER_ERROR', 'Approval check failed', undefined, 500);
    }
  };
}

/**
 * Check if operation requires approval workflow
 */
async function checkApprovalRequired(userId: string, operationType: string, threshold: number = 0): Promise<boolean> {
  // Define operations that require approval based on role and thresholds
  const approvalRules: Record<string, { roles: string[], threshold?: number }> = {
    'bulk_cancel': { roles: ['sales', 'member'], threshold: 5 },
    'bulk_status_change': { roles: ['sales', 'member'], threshold: 10 },
    'high_value_order': { roles: ['sales', 'member'], threshold: 10000 },
    'force_cancel': { roles: ['sales', 'member'] },
    'financial_edit': { roles: ['sales', 'member'] }
  };

  const rule = approvalRules[operationType];
  if (!rule) {
    return false; // No approval required for unknown operations
  }

  try {
    // Get user's role in organization
    const result = await db.execute(sql`
      SELECT om.role 
      FROM organization_memberships om
      WHERE om.user_id::text = ${userId}::text 
      AND om.is_active = true
      LIMIT 1
    `);

    const userOrgRole = result[0]?.role;
    
    // Check if user's role requires approval for this operation
    if (rule.roles.includes(userOrgRole)) {
      // Check threshold if applicable
      if (rule.threshold && threshold >= rule.threshold) {
        return true;
      }
      if (!rule.threshold) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking approval requirement:', error);
    return true; // Fail safe - require approval if check fails
  }
}

/**
 * Rate limiting middleware for sensitive order operations
 */
export function rateLimitOrderOperations(maxRequests: number = 10, windowMs: number = 60000) {
  const requestCounts = new Map<string, { count: number, resetTime: number }>();

  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return sendErr(res, 'UNAUTHORIZED', 'Authentication required', undefined, 401);
    }

    const key = `${user.id}:${req.path}`;
    const now = Date.now();
    const userLimits = requestCounts.get(key);

    if (!userLimits || now > userLimits.resetTime) {
      // Reset or initialize limits
      requestCounts.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (userLimits.count >= maxRequests) {
      logSecurityEvent(req, 'ORDER_RATE_LIMIT_EXCEEDED', { 
        userId: user.id,
        path: req.path,
        count: userLimits.count,
        maxRequests
      });
      return sendErr(res, 'TOO_MANY_REQUESTS', 'Rate limit exceeded for order operations', undefined, 429);
    }

    userLimits.count++;
    next();
  };
}