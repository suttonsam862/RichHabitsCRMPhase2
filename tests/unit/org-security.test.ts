import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { 
  requireOrgRole, 
  OrgRole, 
  addUserToOrganization, 
  getUserOrgRole,
  createInitialOrgMembership,
  requireOrgOwner,
  requireOrgAdmin,
  requireOrgMember,
  requireOrgReadonly
} from '../../server/middleware/orgSecurity';
import { sendErr } from '../../server/lib/http';
import { logSecurityEvent } from '../../server/lib/log';
import { db } from '../../server/db';

// Mock dependencies
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

describe('Organization Security Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      params: { id: 'org-123' },
      body: {},
      query: {},
      path: '/test',
      method: 'GET',
      user: {
        id: 'user-123',
        email: 'test@example.com',
        role: 'member',
        is_super_admin: false
      }
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    next = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('requireOrgRole', () => {
    it('should reject when no organization ID is provided', async () => {
      req.params = {};
      const middleware = requireOrgRole(OrgRole.MEMBER);
      
      await middleware(req as any, res as Response, next);

      expect(logSecurityEvent).toHaveBeenCalledWith(
        req,
        'ORG_ACCESS_NO_ID',
        expect.objectContaining({
          path: '/test',
          method: 'GET'
        })
      );
      expect(sendErr).toHaveBeenCalledWith(
        res,
        'BAD_REQUEST',
        'Organization ID is required',
        undefined,
        400
      );
    });

    it('should reject when user is not authenticated', async () => {
      delete req.user;
      const middleware = requireOrgRole(OrgRole.MEMBER);
      
      await middleware(req as any, res as Response, next);

      expect(logSecurityEvent).toHaveBeenCalledWith(
        req,
        'ORG_ACCESS_NO_AUTH',
        expect.objectContaining({
          orgId: 'org-123',
          path: '/test'
        })
      );
      expect(sendErr).toHaveBeenCalledWith(
        res,
        'UNAUTHORIZED',
        'Authentication required',
        undefined,
        401
      );
    });

    it('should allow super admin access when enabled', async () => {
      req.user!.is_super_admin = true;
      const middleware = requireOrgRole(OrgRole.MEMBER, true);
      
      await middleware(req as any, res as Response, next);

      expect(logSecurityEvent).toHaveBeenCalledWith(
        req,
        'ORG_ACCESS_SUPER_ADMIN',
        expect.objectContaining({
          orgId: 'org-123',
          userId: 'user-123',
          path: '/test'
        })
      );
      expect(next).toHaveBeenCalled();
    });

    it('should reject when organization does not exist', async () => {
      (db.execute as any).mockResolvedValue([]);
      const middleware = requireOrgRole(OrgRole.MEMBER);
      
      await middleware(req as any, res as Response, next);

      expect(logSecurityEvent).toHaveBeenCalledWith(
        req,
        'ORG_ACCESS_NOT_FOUND',
        expect.objectContaining({
          orgId: 'org-123',
          userId: 'user-123',
          path: '/test'
        })
      );
      expect(sendErr).toHaveBeenCalledWith(
        res,
        'NOT_FOUND',
        'Organization not found',
        undefined,
        404
      );
    });

    it('should reject when user is not a member', async () => {
      (db.execute as any).mockResolvedValue([{
        org_exists: 'org-123',
        membership_role: null,
        membership_active: null
      }]);
      const middleware = requireOrgRole(OrgRole.MEMBER);
      
      await middleware(req as any, res as Response, next);

      expect(logSecurityEvent).toHaveBeenCalledWith(
        req,
        'ORG_ACCESS_NOT_MEMBER',
        expect.objectContaining({
          orgId: 'org-123',
          userId: 'user-123',
          path: '/test',
          userRole: 'member'
        })
      );
      expect(sendErr).toHaveBeenCalledWith(
        res,
        'FORBIDDEN',
        'Access denied to this organization',
        undefined,
        403
      );
    });

    it('should reject when user has insufficient role', async () => {
      (db.execute as any).mockResolvedValue([{
        org_exists: 'org-123',
        membership_role: OrgRole.READONLY,
        membership_active: true
      }]);
      const middleware = requireOrgRole(OrgRole.ADMIN);
      
      await middleware(req as any, res as Response, next);

      expect(logSecurityEvent).toHaveBeenCalledWith(
        req,
        'ORG_ACCESS_INSUFFICIENT_ROLE',
        expect.objectContaining({
          orgId: 'org-123',
          userId: 'user-123',
          userRole: OrgRole.READONLY,
          requiredRole: OrgRole.ADMIN,
          path: '/test'
        })
      );
      expect(sendErr).toHaveBeenCalledWith(
        res,
        'FORBIDDEN',
        `Access denied: ${OrgRole.ADMIN} role or higher required`,
        undefined,
        403
      );
    });

    it('should allow access with sufficient role', async () => {
      (db.execute as any).mockResolvedValue([{
        org_exists: 'org-123',
        membership_role: OrgRole.ADMIN,
        membership_active: true
      }]);
      const middleware = requireOrgRole(OrgRole.MEMBER);
      
      await middleware(req as any, res as Response, next);

      expect(logSecurityEvent).toHaveBeenCalledWith(
        req,
        'ORG_ACCESS_GRANTED',
        expect.objectContaining({
          orgId: 'org-123',
          userId: 'user-123',
          userRole: OrgRole.ADMIN,
          requiredRole: OrgRole.MEMBER,
          path: '/test'
        })
      );
      expect(next).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      (db.execute as any).mockRejectedValue(new Error('Database error'));
      const middleware = requireOrgRole(OrgRole.MEMBER);
      
      await middleware(req as any, res as Response, next);

      expect(logSecurityEvent).toHaveBeenCalledWith(
        req,
        'ORG_ACCESS_DB_ERROR',
        expect.objectContaining({
          orgId: 'org-123',
          userId: 'user-123',
          error: 'Database error',
          path: '/test'
        })
      );
      expect(sendErr).toHaveBeenCalledWith(
        res,
        'INTERNAL_SERVER_ERROR',
        'Authorization check failed',
        undefined,
        500
      );
    });

    it('should extract organization ID from body', async () => {
      req.params = {};
      req.body = { organizationId: 'org-456' };
      (db.execute as any).mockResolvedValue([{
        org_exists: 'org-456',
        membership_role: OrgRole.MEMBER,
        membership_active: true
      }]);
      const middleware = requireOrgRole(OrgRole.MEMBER);
      
      await middleware(req as any, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should extract organization ID from query', async () => {
      req.params = {};
      req.query = { organizationId: 'org-789' };
      (db.execute as any).mockResolvedValue([{
        org_exists: 'org-789',
        membership_role: OrgRole.MEMBER,
        membership_active: true
      }]);
      const middleware = requireOrgRole(OrgRole.MEMBER);
      
      await middleware(req as any, res as Response, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Role hierarchy functions', () => {
    it('requireOrgOwner should require owner role', () => {
      const middleware = requireOrgOwner();
      expect(middleware).toBeDefined();
    });

    it('requireOrgAdmin should require admin role', () => {
      const middleware = requireOrgAdmin();
      expect(middleware).toBeDefined();
    });

    it('requireOrgMember should require member role', () => {
      const middleware = requireOrgMember();
      expect(middleware).toBeDefined();
    });

    it('requireOrgReadonly should require readonly role', () => {
      const middleware = requireOrgReadonly();
      expect(middleware).toBeDefined();
    });
  });

  describe('addUserToOrganization', () => {
    it('should reject invalid user ID format', async () => {
      const result = await addUserToOrganization('invalid-id', 'org-123', OrgRole.MEMBER);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('User ID must be a valid UUID');
    });

    it('should reject invalid invitedBy ID format', async () => {
      const result = await addUserToOrganization(
        '00000000-0000-4000-8000-000000000001',
        'org-123',
        OrgRole.MEMBER,
        'invalid-id'
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invited by ID must be a valid UUID');
    });

    it('should reject when organization not found', async () => {
      (db.execute as any).mockResolvedValue([]);
      
      const result = await addUserToOrganization(
        '00000000-0000-4000-8000-000000000001',
        'non-existent-org',
        OrgRole.MEMBER
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Organization not found');
    });

    it('should successfully add user to organization', async () => {
      (db.execute as any)
        .mockResolvedValueOnce([{ id: '00000000-0000-4000-8000-000000000123' }]) // org exists
        .mockResolvedValueOnce([]); // membership insert
      
      const result = await addUserToOrganization(
        '00000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000123',
        OrgRole.MEMBER
      );
      
      expect(result.success).toBe(true);
    });

    it('should handle database errors', async () => {
      (db.execute as any).mockRejectedValue(new Error('Database error'));
      
      const result = await addUserToOrganization(
        '00000000-0000-4000-8000-000000000001',
        'org-123',
        OrgRole.MEMBER
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('getUserOrgRole', () => {
    it('should return null for invalid user ID format', async () => {
      const result = await getUserOrgRole('invalid-id', 'org-123');
      expect(result).toBeNull();
    });

    it('should return user role when found', async () => {
      (db.execute as any).mockResolvedValue([{ role: OrgRole.ADMIN }]);
      
      const result = await getUserOrgRole(
        '00000000-0000-4000-8000-000000000001',
        'org-123'
      );
      
      expect(result).toBe(OrgRole.ADMIN);
    });

    it('should return null when user not found', async () => {
      (db.execute as any).mockResolvedValue([]);
      
      const result = await getUserOrgRole(
        '00000000-0000-4000-8000-000000000001',
        'org-123'
      );
      
      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      (db.execute as any).mockRejectedValue(new Error('Database error'));
      
      const result = await getUserOrgRole(
        '00000000-0000-4000-8000-000000000001',
        'org-123'
      );
      
      expect(result).toBeNull();
    });
  });

  describe('createInitialOrgMembership', () => {
    it('should create owner membership for organization creator', async () => {
      (db.execute as any)
        .mockResolvedValueOnce([{ id: '00000000-0000-4000-8000-000000000123' }])
        .mockResolvedValueOnce([]);
      
      const result = await createInitialOrgMembership(
        '00000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000123'
      );
      
      expect(result.success).toBe(true);
    });
  });
});