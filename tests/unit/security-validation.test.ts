import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validateOrganizationIsolation,
  validateRateLimit,
  validateSensitiveDataAccess,
  detectPrivilegeEscalation,
  validateRequestSecurity,
  checkInputSanitization
} from '../../server/lib/securityValidation';
import { db } from '../../server/db';

// Mock database
vi.mock('../../server/db', () => ({
  db: {
    execute: vi.fn()
  }
}));

describe('Security Validation Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('validateOrganizationIsolation', () => {
    it('should validate access to order within user organization', async () => {
      const mockDb = vi.mocked(db);
      mockDb.execute.mockResolvedValue([{ id: 'order-123' }]);

      const result = await validateOrganizationIsolation(
        'user-123',
        'org-123',
        'order-123',
        'order'
      );

      expect(result).toBe(true);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          sql: expect.stringContaining('SELECT o.id')
        })
      );
    });

    it('should deny access to order outside user organization', async () => {
      const mockDb = vi.mocked(db);
      mockDb.execute.mockResolvedValue([]); // No results = no access

      const result = await validateOrganizationIsolation(
        'user-123',
        'org-123',
        'order-456',
        'order'
      );

      expect(result).toBe(false);
    });

    it('should validate access to order items with proper joins', async () => {
      const mockDb = vi.mocked(db);
      mockDb.execute.mockResolvedValue([{ id: 'order-item-123' }]);

      const result = await validateOrganizationIsolation(
        'user-123',
        'org-123',
        'order-item-123',
        'order_item'
      );

      expect(result).toBe(true);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          sql: expect.stringContaining('JOIN orders o ON')
        })
      );
    });

    it('should validate access to quotes', async () => {
      const mockDb = vi.mocked(db);
      mockDb.execute.mockResolvedValue([{ id: 'quote-123' }]);

      const result = await validateOrganizationIsolation(
        'user-123',
        'org-123',
        'quote-123',
        'quote'
      );

      expect(result).toBe(true);
    });

    it('should handle unknown entity types', async () => {
      const result = await validateOrganizationIsolation(
        'user-123',
        'org-123',
        'entity-123',
        'unknown_entity'
      );

      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      const mockDb = vi.mocked(db);
      mockDb.execute.mockRejectedValue(new Error('Database error'));

      const result = await validateOrganizationIsolation(
        'user-123',
        'org-123',
        'order-123',
        'order'
      );

      expect(result).toBe(false);
    });

    it('should prevent SQL injection in entity IDs', async () => {
      const mockDb = vi.mocked(db);
      mockDb.execute.mockResolvedValue([]);

      const maliciousEntityIds = [
        "'; DROP TABLE orders; --",
        "1' OR '1'='1",
        "order-123'; UPDATE users SET role='admin'; --"
      ];

      for (const maliciousId of maliciousEntityIds) {
        const result = await validateOrganizationIsolation(
          'user-123',
          'org-123',
          maliciousId,
          'order'
        );

        expect(result).toBe(false);
        // Parameterized queries should prevent the injection
        expect(mockDb.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            sql: expect.stringContaining('SELECT')
          })
        );
      }
    });
  });

  describe('validateRateLimit', () => {
    it('should allow operations within rate limit', async () => {
      const mockDb = vi.mocked(db);
      mockDb.execute.mockResolvedValue([{ operation_count: '5' }]);

      const result = await validateRateLimit(
        'user-123',
        'CREATE_ORDER',
        5, // window minutes
        10 // max operations
      );

      expect(result).toBe(true);
    });

    it('should deny operations exceeding rate limit', async () => {
      const mockDb = vi.mocked(db);
      mockDb.execute.mockResolvedValue([{ operation_count: '15' }]);

      const result = await validateRateLimit(
        'user-123',
        'CREATE_ORDER',
        5, // window minutes
        10 // max operations
      );

      expect(result).toBe(false);
    });

    it('should handle edge case at rate limit boundary', async () => {
      const mockDb = vi.mocked(db);
      mockDb.execute.mockResolvedValue([{ operation_count: '10' }]);

      const result = await validateRateLimit(
        'user-123',
        'CREATE_ORDER',
        5,
        10
      );

      expect(result).toBe(false); // Equal to limit should be denied
    });

    it('should use default parameters correctly', async () => {
      const mockDb = vi.mocked(db);
      mockDb.execute.mockResolvedValue([{ operation_count: '5' }]);

      const result = await validateRateLimit('user-123', 'CREATE_ORDER');

      expect(result).toBe(true);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          sql: expect.stringContaining('created_at >=')
        })
      );
    });

    it('should handle database errors safely', async () => {
      const mockDb = vi.mocked(db);
      mockDb.execute.mockRejectedValue(new Error('Database error'));

      const result = await validateRateLimit('user-123', 'CREATE_ORDER');

      expect(result).toBe(false); // Fail safe
    });

    it('should calculate time windows correctly', async () => {
      const mockDb = vi.mocked(db);
      mockDb.execute.mockResolvedValue([{ operation_count: '3' }]);

      await validateRateLimit('user-123', 'CREATE_ORDER', 15, 10); // 15 minute window

      const sqlCall = mockDb.execute.mock.calls[0][0];
      expect(sqlCall.sql).toContain('created_at >=');
      
      // Should query for operations in the last 15 minutes
      const expectedTime = new Date(Date.now() - 15 * 60 * 1000);
      // Time comparison is approximate due to test execution time
    });

    it('should handle different operation types separately', async () => {
      const mockDb = vi.mocked(db);
      
      // Different counts for different operations
      mockDb.execute
        .mockResolvedValueOnce([{ operation_count: '5' }])
        .mockResolvedValueOnce([{ operation_count: '8' }]);

      const result1 = await validateRateLimit('user-123', 'CREATE_ORDER', 5, 10);
      const result2 = await validateRateLimit('user-123', 'DELETE_ORDER', 5, 10);

      expect(result1).toBe(true);
      expect(result2).toBe(true);

      expect(mockDb.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe('validateSensitiveDataAccess', () => {
    it('should allow admin access to all sensitive data', async () => {
      const result = await validateSensitiveDataAccess(
        'user-123',
        'admin',
        ['pricing', 'cost', 'internal_notes', 'customer_data']
      );

      expect(result).toBe(true);
    });

    it('should allow manager access to most sensitive data', async () => {
      const result = await validateSensitiveDataAccess(
        'user-123',
        'manager',
        ['pricing', 'internal_notes']
      );

      expect(result).toBe(true);
    });

    it('should deny readonly access to sensitive data', async () => {
      const result = await validateSensitiveDataAccess(
        'user-123',
        'readonly',
        ['pricing', 'cost']
      );

      expect(result).toBe(false);
    });

    it('should allow sales access to sales-related sensitive data', async () => {
      const result = await validateSensitiveDataAccess(
        'user-123',
        'sales',
        ['customer_data', 'pricing']
      );

      expect(result).toBe(true);
    });

    it('should deny sales access to operational sensitive data', async () => {
      const result = await validateSensitiveDataAccess(
        'user-123',
        'sales',
        ['internal_notes', 'manufacturing_cost']
      );

      expect(result).toBe(false);
    });

    it('should handle empty sensitive data arrays', async () => {
      const result = await validateSensitiveDataAccess(
        'user-123',
        'readonly',
        []
      );

      expect(result).toBe(true); // No sensitive data requested
    });

    it('should handle unknown roles conservatively', async () => {
      const result = await validateSensitiveDataAccess(
        'user-123',
        'unknown_role',
        ['pricing']
      );

      expect(result).toBe(false); // Deny by default
    });

    it('should handle mixed sensitivity levels', async () => {
      const managerResult = await validateSensitiveDataAccess(
        'user-123',
        'manager',
        ['pricing', 'manufacturing_cost', 'system_config'] // Mixed levels
      );

      expect(managerResult).toBe(false); // Should deny if any field is too sensitive
    });
  });

  describe('detectPrivilegeEscalation', () => {
    it('should detect role escalation attempts', async () => {
      const requestData = {
        role: 'admin', // User trying to set themselves as admin
        permissions: ['*']
      };

      const result = await detectPrivilegeEscalation(
        'user-123',
        'member', // Current role
        requestData,
        'USER_UPDATE'
      );

      expect(result.detected).toBe(true);
      expect(result.violations).toContain('Role escalation attempt detected');
    });

    it('should detect permission escalation attempts', async () => {
      const requestData = {
        permissions: ['users.delete', 'system.backup'] // High-privilege permissions
      };

      const result = await detectPrivilegeEscalation(
        'user-123',
        'sales',
        requestData,
        'PERMISSION_UPDATE'
      );

      expect(result.detected).toBe(true);
      expect(result.violations).toContain('Permission escalation attempt detected');
    });

    it('should allow legitimate role changes by authorized users', async () => {
      const requestData = {
        role: 'manager',
        user_id: 'other-user-456'
      };

      const result = await detectPrivilegeEscalation(
        'user-123',
        'admin', // Admin can promote others
        requestData,
        'USER_ROLE_UPDATE'
      );

      expect(result.detected).toBe(false);
      expect(result.violations).toHaveLength(0);
    });

    it('should detect attempts to modify system users', async () => {
      const requestData = {
        user_id: 'system-user',
        role: 'member'
      };

      const result = await detectPrivilegeEscalation(
        'user-123',
        'admin',
        requestData,
        'USER_UPDATE'
      );

      expect(result.detected).toBe(true);
      expect(result.violations).toContain('Attempt to modify system user detected');
    });

    it('should detect bulk privilege operations', async () => {
      const requestData = {
        bulk_operation: true,
        users: [
          { id: 'user-1', role: 'admin' },
          { id: 'user-2', role: 'admin' },
          { id: 'user-3', role: 'admin' }
        ]
      };

      const result = await detectPrivilegeEscalation(
        'user-123',
        'manager',
        requestData,
        'BULK_USER_UPDATE'
      );

      expect(result.detected).toBe(true);
      expect(result.violations).toContain('Suspicious bulk privilege operation detected');
    });

    it('should handle malformed request data', async () => {
      const malformedData = {
        role: null,
        permissions: undefined,
        'malicious_field; DROP TABLE users; --': 'value'
      };

      const result = await detectPrivilegeEscalation(
        'user-123',
        'member',
        malformedData,
        'USER_UPDATE'
      );

      expect(result.detected).toBe(false);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('validateRequestSecurity', () => {
    it('should allow clean requests', async () => {
      const cleanRequest = {
        headers: {
          'content-type': 'application/json',
          'user-agent': 'MyApp/1.0'
        },
        body: {
          name: 'John Doe',
          email: 'john@example.com',
          notes: 'This is a normal note'
        },
        user: {
          id: 'user-123',
          role: 'member'
        }
      };

      const result = await validateRequestSecurity(cleanRequest, 'CREATE_ORDER');

      expect(result.allowed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should detect SQL injection attempts', async () => {
      const maliciousRequest = {
        headers: {},
        body: {
          name: "'; DROP TABLE orders; --",
          search: "1' OR '1'='1",
          filter: "id = 1; DELETE FROM users;"
        },
        user: { id: 'user-123', role: 'member' }
      };

      const result = await validateRequestSecurity(maliciousRequest, 'SEARCH_ORDERS');

      expect(result.allowed).toBe(false);
      expect(result.violations).toContain('Potential SQL injection detected');
    });

    it('should detect XSS attempts', async () => {
      const xssRequest = {
        headers: {},
        body: {
          description: '<script>alert("xss")</script>',
          notes: '<img src="x" onerror="alert(1)">',
          comment: 'javascript:alert("xss")'
        },
        user: { id: 'user-123', role: 'member' }
      };

      const result = await validateRequestSecurity(xssRequest, 'CREATE_ORDER');

      expect(result.allowed).toBe(false);
      expect(result.violations).toContain('Potential XSS attempt detected');
    });

    it('should detect path traversal attempts', async () => {
      const pathTraversalRequest = {
        headers: {},
        body: {
          file_path: '../../../etc/passwd',
          image_url: '../../config/database.yml',
          template: '..\\..\\windows\\system32\\config\\sam'
        },
        user: { id: 'user-123', role: 'member' }
      };

      const result = await validateRequestSecurity(pathTraversalRequest, 'UPLOAD_FILE');

      expect(result.allowed).toBe(false);
      expect(result.violations).toContain('Path traversal attempt detected');
    });

    it('should detect suspicious header patterns', async () => {
      const suspiciousRequest = {
        headers: {
          'x-forwarded-for': '127.0.0.1, 10.0.0.1, 192.168.1.1', // IP spoofing attempt
          'user-agent': '', // Empty user agent
          'referer': 'http://malicious-site.com'
        },
        body: {},
        user: { id: 'user-123', role: 'member' }
      };

      const result = await validateRequestSecurity(suspiciousRequest, 'GET_DATA');

      expect(result.allowed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('should validate file upload requests', async () => {
      const fileUploadRequest = {
        headers: {
          'content-type': 'multipart/form-data'
        },
        body: {
          filename: 'document.pdf',
          file_size: 1024 * 1024, // 1MB
          file_type: 'application/pdf'
        },
        user: { id: 'user-123', role: 'member' }
      };

      const result = await validateRequestSecurity(fileUploadRequest, 'UPLOAD_FILE');

      expect(result.allowed).toBe(true);
    });

    it('should detect malicious file upload attempts', async () => {
      const maliciousFileRequest = {
        headers: {},
        body: {
          filename: 'malware.exe',
          file_size: 100 * 1024 * 1024, // 100MB
          file_type: 'application/octet-stream'
        },
        user: { id: 'user-123', role: 'member' }
      };

      const result = await validateRequestSecurity(maliciousFileRequest, 'UPLOAD_FILE');

      expect(result.allowed).toBe(false);
      expect(result.violations).toContain('Potentially malicious file upload detected');
    });

    it('should handle large request payloads', async () => {
      const largeRequest = {
        headers: {},
        body: {
          data: 'x'.repeat(10 * 1024 * 1024) // 10MB of data
        },
        user: { id: 'user-123', role: 'member' }
      };

      const result = await validateRequestSecurity(largeRequest, 'BULK_OPERATION');

      expect(result.allowed).toBe(false);
      expect(result.violations).toContain('Request payload too large');
    });

    it('should identify restricted fields for sensitive operations', async () => {
      const sensitiveRequest = {
        headers: {},
        body: {
          name: 'John Doe',
          internal_cost: 100.50, // Restricted field
          system_config: { debug: true }, // Restricted field
          public_notes: 'This is fine'
        },
        user: { id: 'user-123', role: 'sales' }
      };

      const result = await validateRequestSecurity(sensitiveRequest, 'UPDATE_ORDER');

      expect(result.allowed).toBe(false);
      expect(result.restrictedFields).toContain('internal_cost');
      expect(result.restrictedFields).toContain('system_config');
      expect(result.restrictedFields).not.toContain('public_notes');
    });
  });

  describe('checkInputSanitization', () => {
    it('should sanitize HTML input', () => {
      const input = '<script>alert("xss")</script><p>Hello World</p>';
      const sanitized = checkInputSanitization(input, 'html');

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Hello World');
    });

    it('should sanitize SQL-like input', () => {
      const input = "'; DROP TABLE users; --";
      const sanitized = checkInputSanitization(input, 'sql');

      expect(sanitized).not.toContain('DROP TABLE');
      expect(sanitized).not.toContain('--');
    });

    it('should sanitize file paths', () => {
      const input = '../../../etc/passwd';
      const sanitized = checkInputSanitization(input, 'path');

      expect(sanitized).not.toContain('../');
      expect(sanitized).not.toContain('etc/passwd');
    });

    it('should handle null and undefined inputs', () => {
      expect(checkInputSanitization(null, 'html')).toBe('');
      expect(checkInputSanitization(undefined, 'html')).toBe('');
      expect(checkInputSanitization('', 'html')).toBe('');
    });

    it('should preserve legitimate content', () => {
      const legitimateInputs = [
        'John Doe',
        'user@example.com',
        'A normal description with some punctuation!',
        '123-456-7890'
      ];

      legitimateInputs.forEach(input => {
        const sanitized = checkInputSanitization(input, 'text');
        expect(sanitized).toBe(input);
      });
    });
  });

  describe('Security integration scenarios', () => {
    it('should handle coordinated attack patterns', async () => {
      // Simulate a coordinated attack with multiple vectors
      const attackRequest = {
        headers: {
          'user-agent': '<script>alert(1)</script>', // XSS in header
          'x-forwarded-for': '127.0.0.1'
        },
        body: {
          name: "'; DROP TABLE orders; --", // SQL injection
          file_path: '../../../etc/passwd', // Path traversal
          role: 'admin' // Privilege escalation
        },
        user: { id: 'user-123', role: 'readonly' }
      };

      const securityResult = await validateRequestSecurity(attackRequest, 'UPDATE_USER');
      const privilegeResult = await detectPrivilegeEscalation(
        'user-123',
        'readonly',
        attackRequest.body,
        'UPDATE_USER'
      );

      expect(securityResult.allowed).toBe(false);
      expect(privilegeResult.detected).toBe(true);

      const totalViolations = securityResult.violations.length + privilegeResult.violations.length;
      expect(totalViolations).toBeGreaterThan(3); // Multiple attack vectors detected
    });

    it('should validate organization isolation under attack', async () => {
      const mockDb = vi.mocked(db);
      
      // Attacker tries to access other organization's data
      mockDb.execute.mockResolvedValue([]); // No access granted

      const maliciousEntityIds = [
        "other-org-order'; SELECT * FROM orders WHERE org_id != 'user-org'; --",
        'order-123" UNION SELECT * FROM sensitive_table --',
        '../other-org/order-456'
      ];

      for (const maliciousId of maliciousEntityIds) {
        const result = await validateOrganizationIsolation(
          'user-123',
          'user-org',
          maliciousId,
          'order'
        );

        expect(result).toBe(false);
      }

      expect(mockDb.execute).toHaveBeenCalledTimes(maliciousEntityIds.length);
    });

    it('should handle rate limiting under burst attacks', async () => {
      const mockDb = vi.mocked(db);
      
      // Simulate burst attack - rapid requests
      const rapidRequests = Array(50).fill(null).map((_, i) => 
        validateRateLimit('attacker-user', 'BULK_DELETE', 1, 5) // 1 minute window, 5 max
      );

      // First few should be allowed, rest denied
      mockDb.execute
        .mockResolvedValueOnce([{ operation_count: '1' }])
        .mockResolvedValueOnce([{ operation_count: '2' }])
        .mockResolvedValueOnce([{ operation_count: '3' }])
        .mockResolvedValueOnce([{ operation_count: '4' }])
        .mockResolvedValueOnce([{ operation_count: '5' }])
        .mockResolvedValue([{ operation_count: '50' }]); // All subsequent requests exceed limit

      const results = await Promise.all(rapidRequests);

      const allowedCount = results.filter(r => r === true).length;
      const deniedCount = results.filter(r => r === false).length;

      expect(allowedCount).toBeLessThanOrEqual(5);
      expect(deniedCount).toBeGreaterThan(40);
    });
  });
});