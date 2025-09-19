/**
 * Comprehensive security tests for order management permissions
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { db } from '../db';
import { validateRequestSecurity, validateOrganizationIsolation } from '../lib/securityValidation';

describe('Order Management Security Tests', () => {
  let adminToken: string;
  let salesToken: string;
  let customerToken: string;
  let managerToken: string;
  let testOrgId: string;
  let testOrderId: string;

  beforeAll(async () => {
    // Setup test data
    // Note: In a real test, you'd use test database with seed data
    
    // Mock tokens for different user types
    adminToken = 'mock-admin-token';
    salesToken = 'mock-sales-token';
    customerToken = 'mock-customer-token';
    managerToken = 'mock-manager-token';
    
    testOrgId = 'test-org-123';
    testOrderId = 'test-order-456';
  });

  afterAll(async () => {
    // Cleanup test data
  });

  describe('Permission Boundary Tests', () => {
    it('should deny customer access to admin operations', async () => {
      const response = await request(app)
        .delete(`/api/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${customerToken}`);
      
      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should deny sales access to force cancel operations', async () => {
      const response = await request(app)
        .post(`/api/orders/${testOrderId}/force-cancel`)
        .set('Authorization', `Bearer ${salesToken}`)
        .send({ reason: 'Force cancel test' });
      
      expect(response.status).toBe(403);
    });

    it('should allow manager access to sensitive operations', async () => {
      const response = await request(app)
        .patch(`/api/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ internalNotes: 'Manager update' });
      
      expect(response.status).not.toBe(403);
    });

    it('should enforce rate limiting on bulk operations', async () => {
      // Make multiple rapid requests
      const promises = Array(10).fill(0).map(() =>
        request(app)
          .post('/api/orders/bulk-action')
          .set('Authorization', `Bearer ${salesToken}`)
          .send({ action: 'status_change', orderIds: [testOrderId] })
      );
      
      const responses = await Promise.all(promises);
      
      // Should get rate limited after a few requests
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Cross-Organization Data Isolation', () => {
    it('should prevent access to orders from different organizations', async () => {
      // Try to access order from different org
      const response = await request(app)
        .get(`/api/orders/different-org-order-id`)
        .set('Authorization', `Bearer ${salesToken}`);
      
      expect(response.status).toBe(404);
    });

    it('should validate organization isolation in database queries', async () => {
      const isValid = await validateOrganizationIsolation(
        'user-123',
        'org-456',
        'order-from-different-org',
        'order'
      );
      
      expect(isValid).toBe(false);
    });
  });

  describe('Sensitive Data Protection', () => {
    it('should hide financial data from non-authorized roles', async () => {
      const response = await request(app)
        .get(`/api/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${customerToken}`);
      
      if (response.status === 200) {
        expect(response.body.pricing).toBeUndefined();
        expect(response.body.cost).toBeUndefined();
        expect(response.body.profit).toBeUndefined();
      }
    });

    it('should show financial data to authorized roles', async () => {
      const response = await request(app)
        .get(`/api/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${managerToken}`);
      
      if (response.status === 200) {
        // Manager should see financial data
        expect(response.body).toHaveProperty('pricing');
      }
    });

    it('should prevent sensitive field updates by unauthorized users', async () => {
      const response = await request(app)
        .patch(`/api/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ 
          pricing: { total: 5000 },
          cost: { materials: 2000 }
        });
      
      expect(response.status).toBe(403);
    });
  });

  describe('Privilege Escalation Prevention', () => {
    it('should detect and prevent privilege escalation attempts', async () => {
      // Customer trying to perform admin actions repeatedly
      const responses = await Promise.all([
        request(app)
          .delete(`/api/orders/${testOrderId}`)
          .set('Authorization', `Bearer ${customerToken}`),
        request(app)
          .post('/api/orders/bulk-action')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ action: 'cancel', orderIds: [testOrderId] }),
        request(app)
          .patch(`/api/orders/${testOrderId}/status`)
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ statusCode: 'completed' })
      ]);
      
      // All should be denied
      responses.forEach(response => {
        expect(response.status).toBe(403);
      });
    });

    it('should validate request security comprehensively', async () => {
      const validation = await validateRequestSecurity({
        userId: 'customer-user-123',
        organizationId: 'org-456',
        operation: 'DELETE',
        entityType: 'order',
        entityId: testOrderId,
        sensitiveFields: ['pricing', 'cost']
      });
      
      expect(validation.allowed).toBe(false);
      expect(validation.violations).toContain('Sensitive data access denied');
    });
  });

  describe('Approval Workflow Security', () => {
    it('should require approval for high-value operations', async () => {
      const response = await request(app)
        .post('/api/orders/bulk-action')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({ 
          action: 'cancel',
          orderIds: Array(20).fill(0).map((_, i) => `order-${i}`) // Large bulk operation
        });
      
      // Should be blocked pending approval
      expect(response.status).toBe(403);
      expect(response.body.error).toContain('requires approval');
    });

    it('should allow operations within limits without approval', async () => {
      const response = await request(app)
        .post('/api/orders/bulk-action')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ 
          action: 'status_change',
          orderIds: ['order-1', 'order-2'] // Small operation
        });
      
      // Manager should be able to perform small bulk operations
      expect(response.status).not.toBe(403);
    });
  });

  describe('API Security Headers and Middleware', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });

    it('should validate authentication tokens', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', 'Bearer invalid-token');
      
      expect(response.status).toBe(401);
    });

    it('should reject requests without organization context', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .set('X-Organization-ID', 'wrong-org-id');
      
      expect(response.status).toBe(403);
    });
  });

  describe('Audit Trail Verification', () => {
    it('should log sensitive operations in audit trail', async () => {
      await request(app)
        .patch(`/api/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ statusCode: 'completed' });
      
      // Verify audit log was created
      // Note: In real test, query audit_logs table
      const auditLogs = await db.execute(`
        SELECT * FROM audit_logs 
        WHERE entity_id = '${testOrderId}' 
        AND operation = 'UPDATE'
        ORDER BY created_at DESC
        LIMIT 1
      `);
      
      expect(auditLogs.length).toBeGreaterThan(0);
    });

    it('should log failed permission attempts', async () => {
      await request(app)
        .delete(`/api/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${customerToken}`);
      
      // Verify security event was logged
      const securityLogs = await db.execute(`
        SELECT * FROM audit_logs 
        WHERE operation = 'PERMISSION_DENIED'
        AND metadata->>'entityId' = '${testOrderId}'
        ORDER BY created_at DESC
        LIMIT 1
      `);
      
      expect(securityLogs.length).toBeGreaterThan(0);
    });
  });

  describe('Field-Level Permission Tests', () => {
    it('should mask sensitive fields based on user role', async () => {
      const customerResponse = await request(app)
        .get(`/api/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${customerToken}`);
      
      const managerResponse = await request(app)
        .get(`/api/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${managerToken}`);
      
      if (customerResponse.status === 200 && managerResponse.status === 200) {
        // Customer should not see internal notes
        expect(customerResponse.body.internalNotes).toBeUndefined();
        
        // Manager should see internal notes
        expect(managerResponse.body).toHaveProperty('internalNotes');
      }
    });

    it('should prevent unauthorized field updates', async () => {
      const response = await request(app)
        .patch(`/api/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${salesToken}`)
        .send({ 
          pricing: { total: 1000 },
          cost: { materials: 500 },
          profit: { margin: 50 }
        });
      
      // Sales should not be able to update cost/profit
      expect(response.status).toBe(403);
    });
  });
});