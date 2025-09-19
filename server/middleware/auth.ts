import { Request, Response, NextFunction } from 'express';
import { supabaseForUser } from '../lib/supabase';
import { sendErr } from '../lib/http';
import { logSecurityEvent } from '../lib/log';
import { db } from '../db';
import { sql } from 'drizzle-orm';

// Keep AuthedRequest as a type alias for backwards compatibility
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
 * Middleware to require authentication for protected routes
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logSecurityEvent(req, 'AUTH_MISSING_TOKEN', { path: req.path });
      return sendErr(res, 'UNAUTHORIZED', 'Missing authorization header', undefined, 401);
    }

    const token = authHeader.slice('Bearer '.length);

    // Verify token with Supabase
    const sb = supabaseForUser(token);
    const { data: { user }, error } = await sb.auth.getUser();

    if (error || !user) {
      logSecurityEvent(req, 'AUTH_INVALID_TOKEN', { path: req.path, error: error?.message });
      return sendErr(res, 'UNAUTHORIZED', 'Invalid or expired token', undefined, 401);
    }

    // Fetch complete user data from database
    try {
      const userData = await db.execute(sql`
        SELECT 
          id::text,
          email,
          full_name,
          phone,
          role,
          organization_id::text,
          COALESCE(is_super_admin, false) as is_super_admin,
          COALESCE(raw_user_meta_data, '{}'::jsonb) as raw_user_meta_data,
          COALESCE(user_metadata, '{}'::jsonb) as user_metadata,
          created_at,
          updated_at
        FROM users 
        WHERE id = ${user.id}
      `);

      const userRecord = userData[0];
      
      if (!userRecord) {
        logSecurityEvent(req, 'AUTH_USER_NOT_FOUND', { userId: user.id });
        return res.status(401).json({ success: false, error: 'User not found in database' });
      }

      // Attach user to request with database data
      req.user = {
        id: user.id,
        email: user.email ?? undefined,
        full_name: userRecord.full_name as string | undefined,
        role: userRecord.role as string | undefined,
        organization_id: userRecord.organization_id as string | undefined,
        is_super_admin: userRecord.is_super_admin as boolean | undefined,
        user_metadata: user.user_metadata
      };
    } catch (dbError) {
      console.error('Failed to fetch user data from database:', dbError);
      logSecurityEvent(req, 'AUTH_DB_ERROR', { error: dbError instanceof Error ? dbError.message : 'Unknown error' });
      return sendErr(res, 'INTERNAL_SERVER_ERROR', 'Authentication system error', undefined, 500);
    }

    next();
  } catch (error) {
    logSecurityEvent(req, 'AUTH_ERROR', { error: error instanceof Error ? error.message : 'Unknown error' });
    return sendErr(res, 'INTERNAL_SERVER_ERROR', 'Authentication error', undefined, 500);
  }
}

/**
 * Optional auth middleware - attaches user if token is present but doesn't require it
 */
export async function optionalAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.slice('Bearer '.length);
    const sb = supabaseForUser(token);
    const { data: { user } } = await sb.auth.getUser();

    if (user) {
      req.user = {
        id: user.id,
        email: user.email ?? undefined
      };
    }

    next();
  } catch (error) {
    // Don't fail on optional auth errors, just continue without user
    next();
  }
}

/**
 * @deprecated This middleware has critical security vulnerabilities. 
 * Use requireOrgRole() from server/middleware/orgSecurity.ts instead.
 * 
 * This legacy function is kept only for backward compatibility during migration.
 * It will be removed once all routes are updated to use the secure middleware.
 */
export function requireOrgAccess(req: AuthedRequest, res: Response, next: NextFunction) {
  console.warn('[SECURITY] Using deprecated requireOrgAccess middleware. Migrate to orgSecurity middleware.');

  const orgId = req.params.id || req.params.organizationId;

  if (!orgId) {
    return sendErr(res, 'BAD_REQUEST', 'Organization ID is required', undefined, 400);
  }

  const user = req.user;
  if (!user) {
    return sendErr(res, 'UNAUTHORIZED', 'User not authenticated', undefined, 401);
  }

  // Check if user has access to this organization
  db.execute(sql`
    SELECT o.id, o.created_by, u.organization_id, u.is_super_admin, u.role
    FROM organizations o
    LEFT JOIN users u ON u.id = ${user.id}::uuid
    WHERE o.id = ${orgId}
    LIMIT 1
  `)
  .then(([result]) => {
    if (!result) {
      logSecurityEvent(req, 'ORG_ACCESS_DENIED', { orgId, userId: user.id, reason: 'org_not_found' });
      return sendErr(res, 'NOT_FOUND', 'Organization not found', undefined, 404);
    }

    const hasAccess = 
      result.is_super_admin ||                           // Super admin access
      result.created_by === user.id ||                   // Created by user
      result.organization_id === orgId ||                // User belongs to org
      user.role === 'admin';                            // Admin role

    if (!hasAccess) {
      logSecurityEvent(req, 'ORG_ACCESS_DENIED', { 
        orgId, 
        userId: user.id, 
        reason: 'insufficient_permissions',
        userRole: user.role,
        userOrgId: user.organization_id
      });
      return sendErr(res, 'FORBIDDEN', 'Access denied to this organization', undefined, 403);
    }

    next();
  })
  .catch(error => {
    logSecurityEvent(req, 'ORG_ACCESS_ERROR', { orgId, userId: user.id, error: error.message });
    return sendErr(res, 'INTERNAL_SERVER_ERROR', 'Error checking organization access', undefined, 500);
  });
}

// Export alias for backward compatibility
export const authenticateToken = requireAuth;