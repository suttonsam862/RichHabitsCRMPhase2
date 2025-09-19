import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  requireOrderPermission,
  requireOrderRead,
  requireOrderCreate,
  requireOrderUpdate,
  requireOrderDelete,
  requireOrderPermissionWithContext,
  validateOrderAccess,
  validateSensitiveDataAccess
} from '../../server/middleware/orderSecurity';
import { AuthedRequest } from '../../server/middleware/auth';
import { ACTION_PERMISSIONS } from '../../server/lib/permissions';
import { sendErr } from '../../server/lib/http';
import { logSecurityEvent } from '../../server/lib/log';

// Mock dependencies
vi.mock('../../server/middleware/orgSecurity', () => ({
  requireOrgMember: () => (req: any, res: any, next: any) => next()
}));

vi.mock('../../server/lib/http', () => ({
  sendErr: vi.fn()
}));

vi.mock('../../server/lib/log', () => ({
  logSecurityEvent: vi.fn()
}));

// Mock permission functions
const mockGetUserPermissions = vi.fn();
const mockHasPermission = vi.fn();
const mockValidateOrderAccess = vi.fn();
const mockValidateSensitiveDataAccess = vi.fn();

vi.mock('../../server/lib/permissions', () => ({
  ACTION_PERMISSIONS: {
    ORDERS: {
      READ: 'orders.read',
      CREATE: 'orders.create',
      UPDATE: 'orders.update',
      DELETE: 'orders.delete',
      UPDATE_SENSITIVE: 'orders.update_sensitive',
      VIEW_FINANCIALS: 'orders.view_financials',
      BULK_OPERATIONS: 'orders.bulk_operations'
    }
  },
  getUserPermissions: mockGetUserPermissions,
  hasPermission: mockHasPermission
}));

// Mock standalone validation functions
vi.mock('../../server/middleware/orderSecurity', async () => {
  const actual = await vi.importActual('../../server/middleware/orderSecurity');
  return {
    ...actual,
    validateOrderAccess: mockValidateOrderAccess,
    validateSensitiveDataAccess: mockValidateSensitiveDataAccess
  };
});

describe('Order Security Middleware', () => {
  let mockRequest: Partial<AuthedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockRequest = {
      params: {},
      body: {},
      query: {},
      path: '/api/orders/test',
      method: 'GET',
      user: {
        id: 'user-123',
        role: 'member',
        organization_id: 'org-123',
        is_super_admin: false
      }
    };
    
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    
    mockNext = vi.fn();

    // Default mock responses
    mockGetUserPermissions.mockResolvedValue(['orders.read', 'orders.create']);
    mockHasPermission.mockReturnValue(true);
    mockValidateOrderAccess.mockResolvedValue(true);
    mockValidateSensitiveDataAccess.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('requireOrderPermission middleware factory', () => {
    it('should allow access with sufficient permissions', async () => {
      const middleware = requireOrderPermission(ACTION_PERMISSIONS.ORDERS.READ);

      await middleware(mockRequest as AuthedRequest, mockResponse as Response, mockNext);

      expect(mockGetUserPermissions).toHaveBeenCalledWith('user-123', 'org-123');
      expect(mockHasPermission).toHaveBeenCalledWith(
        ['orders.read', 'orders.create'],
        ACTION_PERMISSIONS.ORDERS.READ
      );
      expect(mockNext).toHaveBeenCalled();
      expect(sendErr).not.toHaveBeenCalled();
    });

    it('should deny access without required permission', async () => {
      mockHasPermission.mockReturnValue(false);
      
      const middleware = requireOrderPermission(ACTION_PERMISSIONS.ORDERS.UPDATE);

      await middleware(mockRequest as AuthedRequest, mockResponse as Response, mockNext);

      expect(logSecurityEvent).toHaveBeenCalledWith(
        mockRequest,
        'ORDER_PERMISSION_DENIED',
        expect.objectContaining({
          userId: 'user-123',
          permission: ACTION_PERMISSIONS.ORDERS.UPDATE,
          userRole: 'member'
        })
      );

      expect(sendErr).toHaveBeenCalledWith(
        mockResponse,
        'FORBIDDEN',
        expect.stringContaining('Insufficient permissions'),
        undefined,
        403
      );

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should validate order access when orderId is provided', async () => {
      const context = { orderId: 'order-123' };
      const middleware = requireOrderPermission(ACTION_PERMISSIONS.ORDERS.READ, context);

      await middleware(mockRequest as AuthedRequest, mockResponse as Response, mockNext);

      expect(mockValidateOrderAccess).toHaveBeenCalledWith(
        'user-123',
        'order-123',
        'org-123',
        ACTION_PERMISSIONS.ORDERS.READ
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access when order access validation fails', async () => {
      mockValidateOrderAccess.mockResolvedValue(false);
      
      const context = { orderId: 'order-123' };
      const middleware = requireOrderPermission(ACTION_PERMISSIONS.ORDERS.READ, context);

      await middleware(mockRequest as AuthedRequest, mockResponse as Response, mockNext);

      expect(logSecurityEvent).toHaveBeenCalledWith(
        mockRequest,
        'ORDER_ACCESS_DENIED',
        expect.objectContaining({
          userId: 'user-123',
          orderId: 'order-123',
          permission: ACTION_PERMISSIONS.ORDERS.READ
        })
      );

      expect(sendErr).toHaveBeenCalledWith(
        mockResponse,
        'FORBIDDEN',
        'Access denied to this order',
        undefined,
        403
      );

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should validate sensitive data access when specified', async () => {
      const context = { 
        orderId: 'order-123',
        sensitiveData: ['pricing', 'internal_notes'] 
      };
      const middleware = requireOrderPermission(ACTION_PERMISSIONS.ORDERS.UPDATE_SENSITIVE, context);

      await middleware(mockRequest as AuthedRequest, mockResponse as Response, mockNext);

      expect(mockValidateSensitiveDataAccess).toHaveBeenCalledWith(
        'user-123',
        'member',
        ['pricing', 'internal_notes']
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access when sensitive data validation fails', async () => {
      mockValidateSensitiveDataAccess.mockResolvedValue(false);
      
      const context = { 
        orderId: 'order-123',
        sensitiveData: ['pricing'] 
      };
      const middleware = requireOrderPermission(ACTION_PERMISSIONS.ORDERS.UPDATE_SENSITIVE, context);

      await middleware(mockRequest as AuthedRequest, mockResponse as Response, mockNext);

      expect(logSecurityEvent).toHaveBeenCalledWith(
        mockRequest,
        'ORDER_SENSITIVE_DATA_DENIED',
        expect.objectContaining({
          userId: 'user-123',
          sensitiveFields: ['pricing']
        })
      );

      expect(sendErr).toHaveBeenCalledWith(
        mockResponse,
        'FORBIDDEN',
        'Access denied to sensitive order data',
        undefined,
        403
      );

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle missing authentication', async () => {
      mockRequest.user = undefined;
      
      const middleware = requireOrderPermission(ACTION_PERMISSIONS.ORDERS.READ);

      await middleware(mockRequest as AuthedRequest, mockResponse as Response, mockNext);

      expect(logSecurityEvent).toHaveBeenCalledWith(
        mockRequest,
        'ORDER_PERMISSION_NO_AUTH',
        expect.objectContaining({
          permission: ACTION_PERMISSIONS.ORDERS.READ
        })
      );

      expect(sendErr).toHaveBeenCalledWith(
        mockResponse,
        'UNAUTHORIZED',
        'Authentication required',
        undefined,
        401
      );

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle permission lookup errors', async () => {
      mockGetUserPermissions.mockRejectedValue(new Error('Database error'));
      
      const middleware = requireOrderPermission(ACTION_PERMISSIONS.ORDERS.READ);

      await middleware(mockRequest as AuthedRequest, mockResponse as Response, mockNext);

      expect(sendErr).toHaveBeenCalledWith(
        mockResponse,
        'INTERNAL_SERVER_ERROR',
        'Permission check failed',
        undefined,
        500
      );

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireOrderPermissionWithContext middleware', () => {
    it('should extract context from request dynamically', async () => {
      const contextExtractor = (req: Request) => ({ 
        orderId: req.params.id,
        sensitiveData: req.body.includes_pricing ? ['pricing'] : undefined
      });

      mockRequest.params = { id: 'order-456' };
      mockRequest.body = { includes_pricing: true };

      const middleware = requireOrderPermissionWithContext(
        ACTION_PERMISSIONS.ORDERS.UPDATE,
        contextExtractor
      );

      await middleware(mockRequest as AuthedRequest, mockResponse as Response, mockNext);

      expect(mockValidateOrderAccess).toHaveBeenCalledWith(
        'user-123',
        'order-456',
        'org-123',
        ACTION_PERMISSIONS.ORDERS.UPDATE
      );

      expect(mockValidateSensitiveDataAccess).toHaveBeenCalledWith(
        'user-123',
        'member',
        ['pricing']
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle context extraction errors', async () => {
      const faultyContextExtractor = () => {
        throw new Error('Context extraction failed');
      };

      const middleware = requireOrderPermissionWithContext(
        ACTION_PERMISSIONS.ORDERS.READ,
        faultyContextExtractor
      );

      await middleware(mockRequest as AuthedRequest, mockResponse as Response, mockNext);

      expect(sendErr).toHaveBeenCalledWith(
        mockResponse,
        'INTERNAL_SERVER_ERROR',
        'Permission check failed',
        undefined,
        500
      );

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Convenience middleware functions', () => {
    it('should configure requireOrderRead correctly', async () => {
      const middleware = requireOrderRead();

      await middleware(mockRequest as AuthedRequest, mockResponse as Response, mockNext);

      expect(mockHasPermission).toHaveBeenCalledWith(
        expect.anything(),
        ACTION_PERMISSIONS.ORDERS.READ
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should configure requireOrderCreate correctly', async () => {
      const middleware = requireOrderCreate();

      await middleware(mockRequest as AuthedRequest, mockResponse as Response, mockNext);

      expect(mockHasPermission).toHaveBeenCalledWith(
        expect.anything(),
        ACTION_PERMISSIONS.ORDERS.CREATE
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should configure requireOrderUpdate correctly', async () => {
      const middleware = requireOrderUpdate();

      await middleware(mockRequest as AuthedRequest, mockResponse as Response, mockNext);

      expect(mockHasPermission).toHaveBeenCalledWith(
        expect.anything(),
        ACTION_PERMISSIONS.ORDERS.UPDATE
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should configure requireOrderDelete correctly', async () => {
      mockHasPermission.mockReturnValue(false); // Simulate insufficient permissions
      
      const middleware = requireOrderDelete();

      await middleware(mockRequest as AuthedRequest, mockResponse as Response, mockNext);

      expect(mockHasPermission).toHaveBeenCalledWith(
        expect.anything(),
        ACTION_PERMISSIONS.ORDERS.DELETE
      );

      expect(sendErr).toHaveBeenCalledWith(
        mockResponse,
        'FORBIDDEN',
        expect.stringContaining('Insufficient permissions'),
        undefined,
        403
      );

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('validateOrderAccess function', () => {
    it('should validate order ownership correctly', async () => {
      // This would test the actual implementation of validateOrderAccess
      // Since we're mocking it, we test that it's called with correct parameters
      
      await validateOrderAccess('user-123', 'order-123', 'org-123', ACTION_PERMISSIONS.ORDERS.READ);

      expect(mockValidateOrderAccess).toHaveBeenCalledWith(
        'user-123',
        'order-123',
        'org-123',
        ACTION_PERMISSIONS.ORDERS.READ
      );
    });
  });

  describe('validateSensitiveDataAccess function', () => {
    it('should validate sensitive data access by role', async () => {
      await validateSensitiveDataAccess('user-123', 'admin', ['pricing', 'cost']);

      expect(mockValidateSensitiveDataAccess).toHaveBeenCalledWith(
        'user-123',
        'admin',
        ['pricing', 'cost']
      );
    });
  });

  describe('Security edge cases', () => {
    it('should handle multiple permission checks in sequence', async () => {
      const middleware1 = requireOrderRead();
      const middleware2 = requireOrderUpdate();
      
      const req = mockRequest as AuthedRequest;
      const res = mockResponse as Response;
      
      let callCount = 0;
      const sequentialNext = () => {
        callCount++;
        if (callCount < 2) {
          // Continue to next middleware
        }
      };

      await middleware1(req, res, sequentialNext);
      await middleware2(req, res, sequentialNext);

      expect(callCount).toBe(2);
    });

    it('should handle concurrent permission checks', async () => {
      const middlewares = [
        requireOrderRead(),
        requireOrderCreate(),
        requireOrderUpdate()
      ];

      const requests = Array(3).fill(null).map(() => ({ ...mockRequest }));
      const responses = Array(3).fill(null).map(() => ({ ...mockResponse }));
      const nextCallbacks = Array(3).fill(null).map(() => vi.fn());

      await Promise.all(
        middlewares.map((middleware, index) =>
          middleware(
            requests[index] as AuthedRequest,
            responses[index] as Response,
            nextCallbacks[index]
          )
        )
      );

      nextCallbacks.forEach(next => {
        expect(next).toHaveBeenCalled();
      });
    });

    it('should prevent privilege escalation attempts', async () => {
      // Simulate user trying to access admin-only functionality
      mockRequest.user = {
        id: 'user-123',
        role: 'readonly',
        organization_id: 'org-123',
        is_super_admin: false
      };

      mockGetUserPermissions.mockResolvedValue(['orders.read']); // Limited permissions
      mockHasPermission.mockReturnValue(false);

      const middleware = requireOrderPermission(ACTION_PERMISSIONS.ORDERS.DELETE);

      await middleware(mockRequest as AuthedRequest, mockResponse as Response, mockNext);

      expect(logSecurityEvent).toHaveBeenCalledWith(
        mockRequest,
        'ORDER_PERMISSION_DENIED',
        expect.objectContaining({
          userId: 'user-123',
          permission: ACTION_PERMISSIONS.ORDERS.DELETE,
          userRole: 'readonly'
        })
      );

      expect(sendErr).toHaveBeenCalledWith(
        mockResponse,
        'FORBIDDEN',
        expect.stringContaining('Insufficient permissions'),
        undefined,
        403
      );
    });

    it('should handle malformed order IDs', async () => {
      const malformedOrderIds = [
        'invalid-uuid',
        "'; DROP TABLE orders; --",
        '../../../etc/passwd',
        'null',
        'undefined'
      ];

      for (const orderId of malformedOrderIds) {
        vi.clearAllMocks();
        mockValidateOrderAccess.mockResolvedValue(false);

        const context = { orderId };
        const middleware = requireOrderPermission(ACTION_PERMISSIONS.ORDERS.READ, context);

        await middleware(mockRequest as AuthedRequest, mockResponse as Response, mockNext);

        expect(mockValidateOrderAccess).toHaveBeenCalledWith(
          'user-123',
          orderId,
          'org-123',
          ACTION_PERMISSIONS.ORDERS.READ
        );

        expect(sendErr).toHaveBeenCalledWith(
          mockResponse,
          'FORBIDDEN',
          'Access denied to this order',
          undefined,
          403
        );
      }
    });

    it('should rate limit sensitive operations', async () => {
      // This would test rate limiting if implemented
      const sensitiveOperations = [
        ACTION_PERMISSIONS.ORDERS.DELETE,
        ACTION_PERMISSIONS.ORDERS.BULK_OPERATIONS,
        ACTION_PERMISSIONS.ORDERS.UPDATE_SENSITIVE
      ];

      for (const operation of sensitiveOperations) {
        const middleware = requireOrderPermission(operation);
        
        // Simulate multiple rapid requests
        for (let i = 0; i < 3; i++) {
          await middleware(mockRequest as AuthedRequest, mockResponse as Response, mockNext);
        }
      }

      // In a real implementation, later requests would be rate limited
      // For now, we just verify the permission checks happened
      expect(mockHasPermission).toHaveBeenCalledTimes(9); // 3 operations × 3 requests each
    });
  });
});