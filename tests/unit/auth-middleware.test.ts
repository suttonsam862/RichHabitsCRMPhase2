import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireAuth, optionalAuth } from '../../server/middleware/auth';
import { sendErr } from '../../server/lib/http';
import { logSecurityEvent } from '../../server/lib/log';
import { db } from '../../server/db';

// Mock dependencies
vi.mock('../../server/lib/supabase', () => ({
  supabaseForUser: vi.fn()
}));

vi.mock('../../server/lib/http', () => ({
  sendErr: vi.fn()
}));

vi.mock('../../server/lib/log', () => ({
  logSecurityEvent: vi.fn()
}));

vi.mock('../../server/db', () => ({
  db: {
    execute: vi.fn()
  }
}));

describe('Auth Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let mockSupabaseForUser: any;

  beforeEach(() => {
    req = {
      headers: {},
      path: '/test',
      ip: '127.0.0.1'
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    next = vi.fn();

    mockSupabaseForUser = {
      auth: {
        getUser: vi.fn()
      }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('should reject requests without authorization header', async () => {
      await requireAuth(req as any, res as Response, next);

      expect(logSecurityEvent).toHaveBeenCalledWith(
        req,
        'AUTH_MISSING_TOKEN',
        { path: req.path }
      );
      expect(sendErr).toHaveBeenCalledWith(
        res,
        'UNAUTHORIZED',
        'Missing authorization header',
        undefined,
        401
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject requests with invalid authorization header format', async () => {
      req.headers!['authorization'] = 'InvalidFormat token123';

      await requireAuth(req as any, res as Response, next);

      expect(logSecurityEvent).toHaveBeenCalledWith(
        req,
        'AUTH_MISSING_TOKEN',
        { path: req.path }
      );
      expect(sendErr).toHaveBeenCalledWith(
        res,
        'UNAUTHORIZED',
        'Missing authorization header',
        undefined,
        401
      );
    });

    it('should reject requests with invalid token', async () => {
      const { supabaseForUser } = await import('../../server/lib/supabase');
      
      req.headers!['authorization'] = 'Bearer invalid_token';
      mockSupabaseForUser.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' }
      });
      (supabaseForUser as any).mockReturnValue(mockSupabaseForUser);

      await requireAuth(req as any, res as Response, next);

      expect(logSecurityEvent).toHaveBeenCalledWith(
        req,
        'AUTH_INVALID_TOKEN',
        { path: req.path, error: 'Invalid token' }
      );
      expect(sendErr).toHaveBeenCalledWith(
        res,
        'UNAUTHORIZED',
        'Invalid or expired token',
        undefined,
        401
      );
    });

    it('should reject when user not found in database', async () => {
      const { supabaseForUser } = await import('../../server/lib/supabase');
      
      req.headers!['authorization'] = 'Bearer valid_token';
      mockSupabaseForUser.auth.getUser.mockResolvedValue({
        data: { 
          user: { 
            id: 'user-123', 
            email: 'test@example.com' 
          } 
        },
        error: null
      });
      (supabaseForUser as any).mockReturnValue(mockSupabaseForUser);
      (db.execute as any).mockResolvedValue([]);

      await requireAuth(req as any, res as Response, next);

      expect(logSecurityEvent).toHaveBeenCalledWith(
        req,
        'AUTH_USER_NOT_FOUND',
        { userId: 'user-123' }
      );
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should authenticate valid user successfully', async () => {
      const { supabaseForUser } = await import('../../server/lib/supabase');
      
      req.headers!['authorization'] = 'Bearer valid_token';
      mockSupabaseForUser.auth.getUser.mockResolvedValue({
        data: { 
          user: { 
            id: 'user-123', 
            email: 'test@example.com',
            user_metadata: { role: 'user' }
          } 
        },
        error: null
      });
      (supabaseForUser as any).mockReturnValue(mockSupabaseForUser);
      (db.execute as any).mockResolvedValue([{
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'member',
        organization_id: 'org-123',
        is_super_admin: false
      }]);

      await requireAuth(req as any, res as Response, next);

      expect((req as any).user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'member',
        organization_id: 'org-123',
        is_super_admin: false,
        user_metadata: { role: 'user' }
      });
      expect(next).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const { supabaseForUser } = await import('../../server/lib/supabase');
      
      req.headers!['authorization'] = 'Bearer valid_token';
      mockSupabaseForUser.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });
      (supabaseForUser as any).mockReturnValue(mockSupabaseForUser);
      (db.execute as any).mockRejectedValue(new Error('Database error'));

      await requireAuth(req as any, res as Response, next);

      expect(logSecurityEvent).toHaveBeenCalledWith(
        req,
        'AUTH_DB_ERROR',
        { error: 'Database error' }
      );
      expect(sendErr).toHaveBeenCalledWith(
        res,
        'INTERNAL_SERVER_ERROR',
        'Authentication system error',
        undefined,
        500
      );
    });
  });

  describe('optionalAuth', () => {
    it('should continue without user when no auth header provided', async () => {
      await optionalAuth(req as any, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect((req as any).user).toBeUndefined();
    });

    it('should continue without user when auth fails', async () => {
      const { supabaseForUser } = await import('../../server/lib/supabase');
      
      req.headers!['authorization'] = 'Bearer invalid_token';
      mockSupabaseForUser.auth.getUser.mockRejectedValue(new Error('Auth error'));
      (supabaseForUser as any).mockReturnValue(mockSupabaseForUser);

      await optionalAuth(req as any, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect((req as any).user).toBeUndefined();
    });

    it('should attach user when valid token provided', async () => {
      const { supabaseForUser } = await import('../../server/lib/supabase');
      
      req.headers!['authorization'] = 'Bearer valid_token';
      mockSupabaseForUser.auth.getUser.mockResolvedValue({
        data: { 
          user: { 
            id: 'user-123', 
            email: 'test@example.com' 
          } 
        }
      });
      (supabaseForUser as any).mockReturnValue(mockSupabaseForUser);

      await optionalAuth(req as any, res as Response, next);

      expect((req as any).user).toEqual({
        id: 'user-123',
        email: 'test@example.com'
      });
      expect(next).toHaveBeenCalled();
    });
  });
});