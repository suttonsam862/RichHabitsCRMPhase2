import { Request, Response, NextFunction } from 'express';
import { supabaseForUser } from '../lib/supabase';
import { sendErr } from '../lib/http';
import { logSecurityEvent } from '../lib/log';

export interface AuthedRequest extends Request {
  user?: {
    id: string;
    email?: string;
  };
}

/**
 * Middleware to require authentication for protected routes
 */
export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
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
    
    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email ?? undefined
    };
    
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

// Export alias for backward compatibility
export const authenticateToken = requireAuth;