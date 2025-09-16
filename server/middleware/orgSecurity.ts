import { Request, Response, NextFunction } from 'express';
import { sendErr } from '../lib/http';
import { logSecurityEvent } from '../lib/log';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { organizationMemberships } from '../../shared/schema';

export interface AuthedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    full_name?: string;
    role?: string;
    organization_id?: string;
    is_super_admin?: boolean;
    raw_user_meta_data?: any;
    user_metadata?: any;
  };
}

/**
 * Organization roles in order of privilege level
 */
export enum OrgRole {
  READONLY = 'readonly',
  MEMBER = 'member', 
  ADMIN = 'admin',
  OWNER = 'owner'
}

const ROLE_HIERARCHY: Record<OrgRole, number> = {
  [OrgRole.READONLY]: 1,
  [OrgRole.MEMBER]: 2,
  [OrgRole.ADMIN]: 3,
  [OrgRole.OWNER]: 4
};

/**
 * Extract organization ID from all possible sources: params, body, query
 */
function extractOrgId(req: Request): string | null {
  // Check route parameters first (most common)
  const paramId = req.params.id || req.params.organizationId || req.params.orgId;
  if (paramId) return paramId;

  // Check request body
  const bodyId = req.body?.organizationId || req.body?.orgId || req.body?.organization_id;
  if (bodyId) return bodyId;

  // Check query parameters
  const queryId = req.query?.organizationId || req.query?.orgId || req.query?.organization_id;
  if (typeof queryId === 'string') return queryId;

  return null;
}

/**
 * Check if user has required role or higher for organization
 */
function hasRequiredRole(userRole: OrgRole, requiredRole: OrgRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Secure organization access middleware that verifies membership via database
 * @param requiredRole - Minimum role required (defaults to MEMBER)
 * @param allowSuperAdmin - Whether super admins bypass role checks (defaults to true)
 */
export function requireOrgRole(requiredRole: OrgRole = OrgRole.MEMBER, allowSuperAdmin: boolean = true) {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Extract organization ID from any source
      const orgId = extractOrgId(req);
      
      if (!orgId) {
        logSecurityEvent(req, 'ORG_ACCESS_NO_ID', { 
          path: req.path, 
          method: req.method,
          requestId 
        });
        return sendErr(res, 'BAD_REQUEST', 'Organization ID is required', undefined, 400);
      }

      // Note: organization.id is varchar, may not always be UUID format
      // Remove strict UUID validation to allow non-UUID varchar IDs
      if (!orgId || orgId.trim() === '') {
        logSecurityEvent(req, 'ORG_ACCESS_INVALID_ID', { 
          orgId, 
          path: req.path,
          requestId 
        });
        return sendErr(res, 'BAD_REQUEST', 'Invalid organization ID', undefined, 400);
      }

      const user = req.user;
      if (!user) {
        logSecurityEvent(req, 'ORG_ACCESS_NO_AUTH', { 
          orgId, 
          path: req.path,
          requestId 
        });
        return sendErr(res, 'UNAUTHORIZED', 'Authentication required', undefined, 401);
      }

      // Super admin bypass (if allowed)
      if (allowSuperAdmin && user.is_super_admin) {
        logSecurityEvent(req, 'ORG_ACCESS_SUPER_ADMIN', { 
          orgId, 
          userId: user.id, 
          path: req.path,
          requestId 
        });
        return next();
      }

      // Verify organization exists and get membership
      const membershipQuery = await db.execute(sql`
        SELECT 
          om.role as membership_role,
          om.is_active as membership_active,
          o.id as org_exists
        FROM organizations o
        LEFT JOIN organization_memberships om ON (
          om.organization_id::text = o.id::text AND 
          om.user_id::text = ${user.id}::text AND 
          om.is_active = true
        )
        WHERE o.id::text = ${orgId}::text
        LIMIT 1
      `);

      const result = membershipQuery[0];

      // Organization doesn't exist
      if (!result?.org_exists) {
        logSecurityEvent(req, 'ORG_ACCESS_NOT_FOUND', { 
          orgId, 
          userId: user.id, 
          path: req.path,
          requestId 
        });
        return sendErr(res, 'NOT_FOUND', 'Organization not found', undefined, 404);
      }

      // User is not a member of this organization
      if (!result.membership_role || !result.membership_active) {
        logSecurityEvent(req, 'ORG_ACCESS_NOT_MEMBER', { 
          orgId, 
          userId: user.id, 
          path: req.path,
          userRole: user.role,
          requestId 
        });
        return sendErr(res, 'FORBIDDEN', 'Access denied to this organization', undefined, 403);
      }

      // Check role hierarchy
      const userOrgRole = result.membership_role as OrgRole;
      if (!hasRequiredRole(userOrgRole, requiredRole)) {
        logSecurityEvent(req, 'ORG_ACCESS_INSUFFICIENT_ROLE', { 
          orgId, 
          userId: user.id, 
          userRole: userOrgRole,
          requiredRole,
          path: req.path,
          requestId 
        });
        return sendErr(res, 'FORBIDDEN', `Access denied: ${requiredRole} role or higher required`, undefined, 403);
      }

      // Access granted - log success
      logSecurityEvent(req, 'ORG_ACCESS_GRANTED', { 
        orgId, 
        userId: user.id, 
        userRole: userOrgRole,
        requiredRole,
        path: req.path,
        requestId 
      });

      next();

    } catch (error) {
      // CRITICAL: Fail closed on any database errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logSecurityEvent(req, 'ORG_ACCESS_DB_ERROR', { 
        orgId: extractOrgId(req), 
        userId: req.user?.id, 
        error: errorMessage,
        path: req.path,
        requestId 
      });
      return sendErr(res, 'INTERNAL_SERVER_ERROR', 'Authorization check failed', undefined, 500);
    }
  };
}

/**
 * Convenience function for owner-only access
 */
export const requireOrgOwner = () => requireOrgRole(OrgRole.OWNER);

/**
 * Convenience function for admin or owner access  
 */
export const requireOrgAdmin = () => requireOrgRole(OrgRole.ADMIN);

/**
 * Convenience function for member access (default)
 */
export const requireOrgMember = () => requireOrgRole(OrgRole.MEMBER);

/**
 * Convenience function for read-only access
 */
export const requireOrgReadonly = () => requireOrgRole(OrgRole.READONLY);

/**
 * Legacy compatibility - maps to requireOrgMember
 * @deprecated Use requireOrgMember() instead
 */
export const requireOrgAccess = requireOrgMember;

/**
 * Add user to organization with specified role
 */
export async function addUserToOrganization(
  userId: string, 
  organizationId: string, 
  role: OrgRole, 
  invitedBy?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    // Validate userId is UUID format (required for user_id foreign key)
    if (!uuidRegex.test(userId)) {
      return { 
        success: false, 
        error: 'User ID must be a valid UUID' 
      };
    }
    
    // Validate invitedBy if provided
    if (invitedBy && !uuidRegex.test(invitedBy)) {
      return { 
        success: false, 
        error: 'Invited by ID must be a valid UUID' 
      };
    }
    
    // First, verify the organization exists and get its canonical ID
    const orgResult = await db.execute(sql`
      SELECT id FROM organizations 
      WHERE id::text = ${organizationId}::text 
      LIMIT 1
    `);
    
    if (!orgResult || orgResult.length === 0) {
      return { 
        success: false, 
        error: 'Organization not found' 
      };
    }
    
    const canonicalOrgId = orgResult[0].id;
    
    // Check if the canonical org ID is UUID-formatted
    if (!uuidRegex.test(canonicalOrgId)) {
      return { 
        success: false, 
        error: 'Cannot create membership for non-UUID organization ID with current schema' 
      };
    }
    
    // Now safe to cast since we validated UUID format
    await db.execute(sql`
      INSERT INTO organization_memberships 
      (user_id, organization_id, role, invited_by) 
      VALUES 
      (${userId}::uuid, ${canonicalOrgId}::uuid, ${role}, ${invitedBy ? sql`${invitedBy}::uuid` : sql`NULL`})
      ON CONFLICT (user_id, organization_id) 
      DO UPDATE SET 
        role = EXCLUDED.role,
        is_active = true,
        updated_at = NOW()
    `);
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get user's role in organization
 */
export async function getUserOrgRole(userId: string, organizationId: string): Promise<OrgRole | null> {
  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    // Validate userId for performance (use uuid comparison for indexes)
    if (!uuidRegex.test(userId)) {
      return null; // Invalid user ID format
    }
    
    // Use text comparison for org via join to handle varchar/uuid mismatches
    // Keep user_id as uuid for better index usage
    const result = await db.execute(sql`
      SELECT om.role 
      FROM organization_memberships om
      JOIN organizations o ON om.organization_id::text = o.id::text
      WHERE o.id::text = ${organizationId}::text
      AND om.user_id = ${userId}::uuid
      AND om.is_active = true
      LIMIT 1
    `);
    
    return result[0]?.role as OrgRole || null;
  } catch (error) {
    return null;
  }
}

/**
 * Create initial organization membership for owner
 */
export async function createInitialOrgMembership(
  ownerId: string, 
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  return addUserToOrganization(ownerId, organizationId, OrgRole.OWNER);
}