import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { 
  requireOrgRole, 
  requireOrgMember, 
  requireOrgAdmin, 
  requireOrgOwner,
  OrgRole 
} from '../../server/middleware/orgSecurity';
import { AuthedRequest } from '../../server/middleware/auth';
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
  let mockRequest: Partial<AuthedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockRequest = {
      params: {},
      body: {},
      query: {},
      path: '/api/organizations/test',
      method: 'GET'
    };
    
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    
    mockNext = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('requireOrgRole middleware factory', () => {
    it('should allow access with sufficient role', async () => {
      const middleware = requireOrgRole(OrgRole.MEMBER);
      
      mockRequest.params = { id: 'org-123' };
      mockRequest.user = {
        id: 'user-123',
        organization_id: 'org-123',
        role: 'member',
        is_super_admin: false
      };

      // Mock database response for organization membership
      const mockDb = vi.mocked(db);
      mockDb.execute.mockResolvedValue([{
        membership_role: 'admin',
        membership_active: true,
        org_exists: 'org-123'
      }]);

      await middleware(mockRequest as AuthedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(sendErr).not.toHaveBeenCalled();
    });

    it('should deny access with insufficient role', async () => {
      const middleware = requireOrgRole(OrgRole.ADMIN);
      
      mockRequest.params = { id: 'org-123' };
      mockRequest.user = {
        id: 'user-123',
        organization_id: 'org-123',
        role: 'member',
        is_super_admin: false
      };

      // Mock database response with insufficient role
      const mockDb = vi.mocked(db);
      mockDb.execute.mockResolvedValue([{
        membership_role: 'member',
        membership_active: true,
        org_exists: 'org-123'
      }]);

      await middleware(mockRequest as AuthedRequest, mockResponse as Response, mockNext);

      expect(logSecurityEvent).toHaveBeenCalledWith(
        mockRequest,
        'ORG_ACCESS_INSUFFICIENT_ROLE',
        expect.objectContaining({
          orgId: 'org-123',
          userId: 'user-123',
          userRole: 'member',
          requiredRole: OrgRole.ADMIN
        })
      );

      expect(sendErr).toHaveBeenCalledWith(
        mockResponse,
        'FORBIDDEN',
        expect.stringContaining('Insufficient role'),
        undefined,
        403
      );

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow super admin bypass when enabled', async () => {
      const middleware = requireOrgRole(OrgRole.ADMIN, true); // Allow super admin bypass
      
      mockRequest.params = { id: 'org-123' };
      mockRequest.user = {
        id: 'user-123',
        organization_id: 'different-org',
        role: 'admin',
        is_super_admin: true
      };

      await middleware(mockRequest as AuthedRequest, mockResponse as Response, mockNext);

      expect(logSecurityEvent).toHaveBeenCalledWith(
        mockRequest,
        'ORG_ACCESS_SUPER_ADMIN',
        expect.objectContaining({
          orgId: 'org-123',
          userId: 'user-123'
        })
      );

      expect(mockNext).toHaveBeenCalled();
      expect(sendErr).not.toHaveBeenCalled();
    });

    it('should deny super admin when bypass is disabled', async () => {
      const middleware = requireOrgRole(OrgRole.ADMIN, false); // Disable super admin bypass
      
      mockRequest.params = { id: 'org-123' };
      mockRequest.user = {
        id: 'user-123',
        organization_id: 'different-org',
        role: 'admin',
        is_super_admin: true
      };

      // Mock database response for non-member
      const mockDb = vi.mocked(db);
      mockDb.execute.mockResolvedValue([{
        membership_role: null,
        membership_active: null,
        org_exists: 'org-123'
      }]);

      await middleware(mockRequest as AuthedRequest, mockResponse as Response, mockNext);

      expect(sendErr).toHaveBeenCalledWith(
        mockResponse,
        'FORBIDDEN',
        expect.stringContaining('not a member'),
        undefined,
        403
      );

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should extract organization ID from different sources', async () => {
      const middleware = requireOrgRole(OrgRole.MEMBER);
      
      const testCases = [
        { source: 'params.id', request: { params: { id: 'org-123' } } },
        { source: 'params.organizationId', request: { params: { organizationId: 'org-123' } } },
        { source: 'params.orgId', request: { params: { orgId: 'org-123' } } },
        { source: 'body.organizationId', request: { body: { organizationId: 'org-123' } } },
        { source: 'body.orgId', request: { body: { orgId: 'org-123' } } },
        { source: 'body.organization_id', request: { body: { organization_id: 'org-123' } } },
        { source: 'query.organizationId', request: { query: { organizationId: 'org-123' } } },
        { source: 'query.orgId', request: { query: { orgId: 'org-123' } } },
        { source: 'query.organization_id', request: { query: { organization_id: 'org-123' } } }
      ];

      for (const testCase of testCases) {
        vi.clearAllMocks();

        mockRequest = {
          ...mockRequest,
          ...testCase.request,
          user: {
            id: 'user-123',
            organization_id: 'org-123',
            role: 'member',
            is_super_admin: false
          }
        };

        const mockDb = vi.mocked(db);
        mockDb.execute.mockResolvedValue([{
          membership_role: 'member',
          membership_active: true,
          org_exists: 'org-123'
        }]);

        await middleware(mockRequest as AuthedRequest, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(sendErr).not.toHaveBeenCalled();
      }
    });

    it('should handle missing organization ID', async () => {
      const middleware = requireOrgRole(OrgRole.MEMBER);
      
      mockRequest = {
        params: {},
        body: {},
        query: {},
        path: '/api/test',
        method: 'GET',
        user: {
          id: 'user-123',
          role: 'member'
        }
      };

      await middleware(mockRequest as AuthedRequest, mockResponse as Response, mockNext);

      expect(logSecurityEvent).toHaveBeenCalledWith(
        mockRequest,
        'ORG_ACCESS_NO_ID',
        expect.objectContaining({
          path: '/api/test',
          method: 'GET'
        })
      );

      expect(sendErr).toHaveBeenCalledWith(
        mockResponse,
        'BAD_REQUEST',
        'Organization ID is required',
        undefined,
        400
      );

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle organization not found', async () => {
      const middleware = requireOrgRole(OrgRole.MEMBER);
      
      mockRequest.params = { id: 'nonexistent-org' };
      mockRequest.user = {
        id: 'user-123',
        role: 'member',
        is_super_admin: false
      };

      // Mock database response for non-existent organization
      const mockDb = vi.mocked(db);
      mockDb.execute.mockResolvedValue([]);

      await middleware(mockRequest as AuthedRequest, mockResponse as Response, mockNext);

      expect(logSecurityEvent).toHaveBeenCalledWith(
        mockRequest,
        'ORG_ACCESS_NOT_FOUND',
        expect.objectContaining({
          orgId: 'nonexistent-org',
          userId: 'user-123'
        })
      );

      expect(sendErr).toHaveBeenCalledWith(
        mockResponse,
        'NOT_FOUND',
        'Organization not found',
        undefined,
        404
      );

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle inactive membership', async () => {
      const middleware = requireOrgRole(OrgRole.MEMBER);
      
      mockRequest.params = { id: 'org-123' };
      mockRequest.user = {
        id: 'user-123',
        role: 'member',
        is_super_admin: false
      };

      // Mock database response for inactive membership
      const mockDb = vi.mocked(db);
      mockDb.execute.mockResolvedValue([{
        membership_role: 'member',
        membership_active: false,
        org_exists: 'org-123'
      }]);

      await middleware(mockRequest as AuthedRequest, mockResponse as Response, mockNext);

      expect(logSecurityEvent).toHaveBeenCalledWith(
        mockRequest,
        'ORG_ACCESS_INACTIVE_MEMBERSHIP',
        expect.objectContaining({
          orgId: 'org-123',
          userId: 'user-123'
        })
      );

      expect(sendErr).toHaveBeenCalledWith(
        mockResponse,
        'FORBIDDEN',
        'Organization membership is inactive',
        undefined,
        403
      );

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const middleware = requireOrgRole(OrgRole.MEMBER);
      
      mockRequest.params = { id: 'org-123' };
      mockRequest.user = {
        id: 'user-123',
        role: 'member',
        is_super_admin: false
      };

      // Mock database error
      const mockDb = vi.mocked(db);
      mockDb.execute.mockRejectedValue(new Error('Database connection failed'));

      await middleware(mockRequest as AuthedRequest, mockResponse as Response, mockNext);

      expect(sendErr).toHaveBeenCalledWith(
        mockResponse,
        'INTERNAL_SERVER_ERROR',
        'Authorization check failed',
        undefined,
        500
      );

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Role hierarchy validation', () => {
    it('should enforce correct role hierarchy', async () => {
      const roleTests = [
        { userRole: 'readonly', requiredRole: OrgRole.READONLY, shouldPass: true },
        { userRole: 'readonly', requiredRole: OrgRole.MEMBER, shouldPass: false },
        { userRole: 'member', requiredRole: OrgRole.READONLY, shouldPass: true },
        { userRole: 'member', requiredRole: OrgRole.MEMBER, shouldPass: true },
        { userRole: 'member', requiredRole: OrgRole.ADMIN, shouldPass: false },
        { userRole: 'admin', requiredRole: OrgRole.MEMBER, shouldPass: true },
        { userRole: 'admin', requiredRole: OrgRole.ADMIN, shouldPass: true },
        { userRole: 'admin', requiredRole: OrgRole.OWNER, shouldPass: false },
        { userRole: 'owner', requiredRole: OrgRole.ADMIN, shouldPass: true },
        { userRole: 'owner', requiredRole: OrgRole.OWNER, shouldPass: true }
      ];

      for (const test of roleTests) {
        vi.clearAllMocks();

        const middleware = requireOrgRole(test.requiredRole);
        
        mockRequest.params = { id: 'org-123' };
        mockRequest.user = {
          id: 'user-123',
          role: 'member',
          is_super_admin: false
        };

        const mockDb = vi.mocked(db);
        mockDb.execute.mockResolvedValue([{
          membership_role: test.userRole,
          membership_active: true,
          org_exists: 'org-123'
        }]);

        await middleware(mockRequest as AuthedRequest, mockResponse as Response, mockNext);

        if (test.shouldPass) {
          expect(mockNext).toHaveBeenCalled();
          expect(sendErr).not.toHaveBeenCalled();
        } else {
          expect(sendErr).toHaveBeenCalledWith(
            mockResponse,
            'FORBIDDEN',
            expect.stringContaining('Insufficient role'),
            undefined,
            403
          );
          expect(mockNext).not.toHaveBeenCalled();
        }
      }
    });
  });

  describe('Convenience middleware functions', () => {
    it('should configure requireOrgMember correctly', async () => {
      const middleware = requireOrgMember();
      
      mockRequest.params = { id: 'org-123' };
      mockRequest.user = {
        id: 'user-123',
        role: 'member',
        is_super_admin: false
      };

      const mockDb = vi.mocked(db);
      mockDb.execute.mockResolvedValue([{
        membership_role: 'member',
        membership_active: true,
        org_exists: 'org-123'
      }]);

      await middleware(mockRequest as AuthedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should configure requireOrgAdmin correctly', async () => {
      const middleware = requireOrgAdmin();
      
      mockRequest.params = { id: 'org-123' };
      mockRequest.user = {
        id: 'user-123',
        role: 'member',
        is_super_admin: false
      };

      // Test with insufficient role
      const mockDb = vi.mocked(db);
      mockDb.execute.mockResolvedValue([{
        membership_role: 'member',
        membership_active: true,
        org_exists: 'org-123'
      }]);

      await middleware(mockRequest as AuthedRequest, mockResponse as Response, mockNext);

      expect(sendErr).toHaveBeenCalledWith(
        mockResponse,
        'FORBIDDEN',
        expect.stringContaining('Insufficient role'),
        undefined,
        403
      );
    });

    it('should configure requireOrgOwner correctly', async () => {
      const middleware = requireOrgOwner();
      
      mockRequest.params = { id: 'org-123' };
      mockRequest.user = {
        id: 'user-123',
        role: 'admin',
        is_super_admin: false
      };

      // Test with insufficient role (admin, but not owner)
      const mockDb = vi.mocked(db);
      mockDb.execute.mockResolvedValue([{
        membership_role: 'admin',
        membership_active: true,
        org_exists: 'org-123'
      }]);

      await middleware(mockRequest as AuthedRequest, mockResponse as Response, mockNext);

      expect(sendErr).toHaveBeenCalledWith(
        mockResponse,
        'FORBIDDEN',
        expect.stringContaining('Insufficient role'),
        undefined,
        403
      );
    });
  });

  describe('Security edge cases', () => {
    it('should handle empty or whitespace organization IDs', async () => {
      const middleware = requireOrgRole(OrgRole.MEMBER);
      
      const invalidOrgIds = ['', '   ', '\t', '\n'];

      for (const orgId of invalidOrgIds) {
        vi.clearAllMocks();

        mockRequest.params = { id: orgId };
        mockRequest.user = {
          id: 'user-123',
          role: 'member'
        };

        await middleware(mockRequest as AuthedRequest, mockResponse as Response, mockNext);

        expect(logSecurityEvent).toHaveBeenCalledWith(
          mockRequest,
          'ORG_ACCESS_INVALID_ID',
          expect.objectContaining({ orgId })
        );

        expect(sendErr).toHaveBeenCalledWith(
          mockResponse,
          'BAD_REQUEST',
          'Invalid organization ID',
          undefined,
          400
        );
      }
    });

    it('should handle concurrent organization access checks', async () => {
      const middleware = requireOrgRole(OrgRole.MEMBER);
      
      const requests = Array(5).fill(null).map((_, index) => ({
        params: { id: `org-${index}` },
        body: {},
        query: {},
        path: '/api/test',
        method: 'GET',
        user: {
          id: `user-${index}`,
          role: 'member',
          is_super_admin: false
        }
      }));

      const responses = Array(5).fill(null).map(() => ({
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis()
      }));

      const nextCallbacks = Array(5).fill(null).map(() => vi.fn());

      // Mock successful membership for all
      const mockDb = vi.mocked(db);
      mockDb.execute.mockResolvedValue([{
        membership_role: 'member',
        membership_active: true,
        org_exists: 'org-123'
      }]);

      await Promise.all(
        requests.map((req, index) =>
          middleware(req as AuthedRequest, responses[index] as Response, nextCallbacks[index])
        )
      );

      nextCallbacks.forEach(next => {
        expect(next).toHaveBeenCalled();
      });
    });

    it('should prevent SQL injection in organization ID', async () => {
      const middleware = requireOrgRole(OrgRole.MEMBER);
      
      const maliciousOrgIds = [
        "'; DROP TABLE organizations; --",
        "1' OR '1'='1",
        "org-123'; UPDATE users SET role='admin'; --"
      ];

      for (const maliciousId of maliciousOrgIds) {
        vi.clearAllMocks();

        mockRequest.params = { id: maliciousId };
        mockRequest.user = {
          id: 'user-123',
          role: 'member',
          is_super_admin: false
        };

        const mockDb = vi.mocked(db);
        mockDb.execute.mockResolvedValue([]);

        await middleware(mockRequest as AuthedRequest, mockResponse as Response, mockNext);

        // Should handle as normal (parameterized queries protect against injection)
        // But should still result in organization not found
        expect(sendErr).toHaveBeenCalledWith(
          mockResponse,
          'NOT_FOUND',
          'Organization not found',
          undefined,
          404
        );
      }
    });
  });
});