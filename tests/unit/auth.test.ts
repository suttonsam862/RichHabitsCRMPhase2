import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../server/middleware/auth';
import jwt from 'jsonwebtoken';

// Mock dependencies
vi.mock('jsonwebtoken');
vi.mock('../../server/lib/supabase', () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn()
    }
  }
}));

describe('Auth Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      headers: {},
      user: undefined
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    next = vi.fn();
    vi.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('should reject request without authorization header', async () => {
      await requireAuth(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token format', async () => {
      req.headers = { authorization: 'InvalidFormat' };

      await requireAuth(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid token format'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid JWT', async () => {
      req.headers = { authorization: 'Bearer invalid-token' };
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await requireAuth(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired token'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept valid token and set user', async () => {
      const mockUser = { 
        sub: 'user-123',
        email: 'test@example.com' 
      };
      
      req.headers = { authorization: 'Bearer valid-token' };
      vi.mocked(jwt.verify).mockReturnValue(mockUser as any);

      await requireAuth(req as Request, res as Response, next);

      expect(req.user).toEqual({
        id: 'user-123',
        email: 'test@example.com'
      });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});