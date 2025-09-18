/**
 * Audit logging module for security events
 * Phase 0 SEC-3: Audit trail for security-critical operations
 */

import { supabaseAdmin } from './supabase';

export enum AuditAction {
  // Authentication events
  LOGIN_ATTEMPT = 'LOGIN_ATTEMPT',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  
  // Admin operations
  ADMIN_USER_CREATION_ATTEMPT = 'ADMIN_USER_CREATION_ATTEMPT',
  ADMIN_USER_CREATION_SUCCESS = 'ADMIN_USER_CREATION_SUCCESS',
  ADMIN_USER_CREATION_BLOCKED = 'ADMIN_USER_CREATION_BLOCKED',
  
  // File access
  FILE_ACCESS_DENIED = 'FILE_ACCESS_DENIED',
  FILE_ACCESS_GRANTED = 'FILE_ACCESS_GRANTED',
  FILE_UPLOAD = 'FILE_UPLOAD',
  FILE_DELETE = 'FILE_DELETE',
  
  // Data access
  CROSS_ORG_ACCESS_ATTEMPT = 'CROSS_ORG_ACCESS_ATTEMPT',
  UNAUTHORIZED_DATA_ACCESS = 'UNAUTHORIZED_DATA_ACCESS',
  
  // System
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_SECRET_ACCESS = 'INVALID_SECRET_ACCESS'
}

export interface AuditLogEntry {
  action: AuditAction;
  actor: string | null; // User ID or IP address
  target?: string; // Resource being accessed/modified
  org_id?: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  success: boolean;
  timestamp?: string;
}

/**
 * Log an audit event to the database
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const logEntry = {
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
    };
    
    // Log to console for immediate visibility
    console.log('[AUDIT]', JSON.stringify(logEntry));
    
    // Attempt to log to database (non-blocking)
    supabaseAdmin
      .from('audit_logs')
      .insert(logEntry)
      .then(({ error }) => {
        if (error) {
          console.error('[AUDIT] Failed to write to database:', error);
        }
      })
      .catch((err) => {
        console.error('[AUDIT] Database connection error:', err);
      });
  } catch (error) {
    // Never let audit logging failures break the application
    console.error('[AUDIT] Critical error in audit logging:', error);
  }
}

/**
 * Helper to extract request metadata for audit logging
 */
export function getRequestMetadata(req: any): { ip_address?: string; user_agent?: string } {
  return {
    ip_address: req.ip || req.connection?.remoteAddress || 'unknown',
    user_agent: req.headers?.['user-agent'] || 'unknown'
  };
}