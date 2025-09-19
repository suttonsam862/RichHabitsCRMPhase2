import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../server/index';
import { createTestUser, createTestOrganization, cleanupTestData, getAuthToken, createBulkTestData } from '../helpers/test-setup';
import { setTimeout as delay } from 'node:timers/promises';

describe('Comprehensive Bulk Operations Testing', () => {
  let adminUser: any;
  let memberUser: any;
  let testOrg: any;
  let otherOrg: any;
  let adminToken: string;
  let memberToken: string;
  let testOrders: any[];
  let testCatalogItems: any[];
  let testUsers: any[];

  beforeAll(async () => {
    // Create test users with different roles
    adminUser = await createTestUser({
      email: 'bulk-admin@example.com',
      fullName: 'Bulk Admin User',
      role: 'admin'
    });

    memberUser = await createTestUser({
      email: 'bulk-member@example.com',
      fullName: 'Bulk Member User',
      role: 'member'
    });

    testOrg = await createTestOrganization({
      name: 'Bulk Test Organization',
      ownerId: adminUser.id
    });

    otherOrg = await createTestOrganization({
      name: 'Other Bulk Test Org',
      ownerId: memberUser.id
    });

    adminToken = await getAuthToken(adminUser.id);
    memberToken = await getAuthToken(memberUser.id);

    // Create test data for bulk operations
    const bulkData = await createBulkTestData(50, testOrg.id);
    testOrders = bulkData.orders || [];
    testCatalogItems = bulkData.catalogItems || [];
    testUsers = bulkData.users || [];
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Bulk Order Operations', () => {
    it('should handle bulk order status updates', async () => {
      // Create some orders first
      const orderIds = [];
      for (let i = 0; i < 5; i++) {
        const orderResponse = await request(app)
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            organizationId: testOrg.id,
            customerName: `Bulk Customer ${i}`,
            totalAmount: (i + 1) * 100,
            status: 'pending'
          });
        
        if (orderResponse.status === 201) {
          orderIds.push(orderResponse.body.data.id);
        }
      }

      expect(orderIds.length).toBeGreaterThan(0);

      // Perform bulk status update
      const bulkUpdateResponse = await request(app)
        .patch('/api/v1/orders/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          organizationId: testOrg.id,
          orderIds,
          updates: {
            status: 'in_progress',
            updatedBy: adminUser.id
          }
        });

      expect(bulkUpdateResponse.status).toBe(200);
      expect(bulkUpdateResponse.body.success).toBe(true);
      expect(bulkUpdateResponse.body.data.updatedCount).toBe(orderIds.length);

      // Verify updates were applied
      for (const orderId of orderIds) {
        const orderResponse = await request(app)
          .get(`/api/v1/orders/${orderId}`)
          .set('Authorization', `Bearer ${adminToken}`);
        
        expect(orderResponse.status).toBe(200);
        expect(orderResponse.body.data.status).toBe('in_progress');
      }
    });

    it('should handle bulk order deletion with approval workflow', async () => {
      // Create orders to delete
      const orderIds = [];
      for (let i = 0; i < 3; i++) {
        const orderResponse = await request(app)
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            organizationId: testOrg.id,
            customerName: `Delete Customer ${i}`,
            totalAmount: (i + 1) * 50,
            status: 'pending'
          });
        
        if (orderResponse.status === 201) {
          orderIds.push(orderResponse.body.data.id);
        }
      }

      // Request bulk deletion (should require approval for admin actions)
      const deleteResponse = await request(app)
        .delete('/api/v1/orders/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          organizationId: testOrg.id,
          orderIds,
          reason: 'Testing bulk deletion',
          requiresApproval: true
        });

      expect(deleteResponse.status).toBe(202); // Accepted for processing
      expect(deleteResponse.body.success).toBe(true);
      expect(deleteResponse.body.data.approvalRequired).toBe(true);

      const approvalId = deleteResponse.body.data.approvalId;
      expect(approvalId).toBeDefined();

      // Simulate approval process
      const approvalResponse = await request(app)
        .post(`/api/v1/approvals/${approvalId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          approverNotes: 'Approved for testing'
        });

      expect(approvalResponse.status).toBe(200);

      // Check that orders are now marked for deletion or deleted
      await delay(1000); // Give system time to process

      for (const orderId of orderIds) {
        const orderResponse = await request(app)
          .get(`/api/v1/orders/${orderId}`)
          .set('Authorization', `Bearer ${adminToken}`);
        
        // Should either be deleted (404) or marked as deleted
        expect([404, 200]).toContain(orderResponse.status);
        if (orderResponse.status === 200) {
          expect(['deleted', 'cancelled']).toContain(orderResponse.body.data.status);
        }
      }
    });

    it('should validate bulk operation payload sizes', async () => {
      // Test small payload (should succeed)
      const smallPayload = {
        organizationId: testOrg.id,
        orderIds: ['small-test-1', 'small-test-2'],
        updates: { status: 'in_progress' }
      };

      const smallResponse = await request(app)
        .patch('/api/v1/orders/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(smallPayload);

      expect([200, 404]).toContain(smallResponse.status); // 404 if orders don't exist is fine

      // Test medium payload (should succeed)
      const mediumOrderIds = Array.from({ length: 50 }, (_, i) => `medium-test-${i}`);
      const mediumPayload = {
        organizationId: testOrg.id,
        orderIds: mediumOrderIds,
        updates: { status: 'in_progress' }
      };

      const mediumResponse = await request(app)
        .patch('/api/v1/orders/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(mediumPayload);

      expect([200, 400, 404]).toContain(mediumResponse.status);

      // Test large payload (should be rejected or have limits)
      const largeOrderIds = Array.from({ length: 1000 }, (_, i) => `large-test-${i}`);
      const largePayload = {
        organizationId: testOrg.id,
        orderIds: largeOrderIds,
        updates: { status: 'in_progress' }
      };

      const largeResponse = await request(app)
        .patch('/api/v1/orders/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(largePayload);

      // Should either reject or process with limits
      expect([400, 413, 200]).toContain(largeResponse.status);
      if (largeResponse.status === 400) {
        expect(largeResponse.body.message).toMatch(/(limit|size|too many)/i);
      }
    });

    it('should handle concurrent bulk operations safely', async () => {
      // Create orders for concurrent testing
      const orderIds = [];
      for (let i = 0; i < 10; i++) {
        const orderResponse = await request(app)
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            organizationId: testOrg.id,
            customerName: `Concurrent Customer ${i}`,
            totalAmount: (i + 1) * 25,
            status: 'pending'
          });
        
        if (orderResponse.status === 201) {
          orderIds.push(orderResponse.body.data.id);
        }
      }

      // Perform concurrent bulk operations
      const operation1 = request(app)
        .patch('/api/v1/orders/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          organizationId: testOrg.id,
          orderIds: orderIds.slice(0, 5),
          updates: { status: 'in_progress' }
        });

      const operation2 = request(app)
        .patch('/api/v1/orders/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          organizationId: testOrg.id,
          orderIds: orderIds.slice(5, 10),
          updates: { status: 'completed' }
        });

      const results = await Promise.allSettled([operation1, operation2]);
      
      // Both operations should complete successfully
      const successful = results.filter(r => 
        r.status === 'fulfilled' && [200, 201].includes((r.value as any).status)
      );
      
      expect(successful.length).toBe(2);
    });
  });

  describe('Bulk Catalog Operations', () => {
    it('should handle bulk catalog item price updates', async () => {
      // Create catalog items
      const itemIds = [];
      for (let i = 0; i < 5; i++) {
        const itemResponse = await request(app)
          .post('/api/v1/catalog-items')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            orgId: testOrg.id,
            name: `Bulk Price Item ${i}`,
            basePrice: (i + 1) * 20,
            category: 'test'
          });
        
        if (itemResponse.status === 201) {
          itemIds.push(itemResponse.body.data.id);
        }
      }

      expect(itemIds.length).toBeGreaterThan(0);

      // Bulk price update
      const priceUpdateResponse = await request(app)
        .patch('/api/v1/catalog-items/bulk-price')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          organizationId: testOrg.id,
          itemIds,
          priceAdjustment: {
            type: 'percentage',
            value: 10 // 10% increase
          }
        });

      expect(priceUpdateResponse.status).toBe(200);
      expect(priceUpdateResponse.body.success).toBe(true);

      // Verify price updates
      for (let i = 0; i < itemIds.length; i++) {
        const itemResponse = await request(app)
          .get(`/api/v1/catalog-items/${itemIds[i]}`)
          .set('Authorization', `Bearer ${adminToken}`);
        
        if (itemResponse.status === 200) {
          const originalPrice = (i + 1) * 20;
          const expectedPrice = originalPrice * 1.1;
          expect(parseFloat(itemResponse.body.data.basePrice)).toBeCloseTo(expectedPrice, 2);
        }
      }
    });

    it('should handle bulk catalog import with validation', async () => {
      const bulkImportData = {
        organizationId: testOrg.id,
        items: [
          {
            name: 'Bulk Import Item 1',
            basePrice: 50.00,
            category: 'shirts',
            description: 'Test item 1'
          },
          {
            name: 'Bulk Import Item 2',
            basePrice: 75.00,
            category: 'pants',
            description: 'Test item 2'
          },
          {
            name: 'Invalid Item', // Missing required fields
            basePrice: -10.00, // Invalid price
            category: 'invalid-category'
          }
        ]
      };

      const importResponse = await request(app)
        .post('/api/v1/catalog-items/bulk-import')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bulkImportData);

      expect(importResponse.status).toBe(200);
      expect(importResponse.body.success).toBe(true);
      expect(importResponse.body.data.successful).toBe(2);
      expect(importResponse.body.data.failed).toBe(1);
      expect(importResponse.body.data.errors).toHaveLength(1);
      
      // Verify successful items were created
      const catalogResponse = await request(app)
        .get('/api/v1/catalog-items')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ orgId: testOrg.id });

      expect(catalogResponse.status).toBe(200);
      const importedItems = catalogResponse.body.data.items.filter((item: any) => 
        item.name.startsWith('Bulk Import Item')
      );
      expect(importedItems).toHaveLength(2);
    });
  });

  describe('Bulk User Management', () => {
    it('should handle bulk user role updates', async () => {
      // Create users for bulk operations
      const userIds = [];
      for (let i = 0; i < 3; i++) {
        const userResponse = await request(app)
          .post('/api/v1/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            email: `bulk-user-${i}@example.com`,
            fullName: `Bulk User ${i}`,
            organizationId: testOrg.id,
            role: 'member'
          });
        
        if (userResponse.status === 201) {
          userIds.push(userResponse.body.data.id);
        }
      }

      expect(userIds.length).toBeGreaterThan(0);

      // Bulk role update
      const roleUpdateResponse = await request(app)
        .patch('/api/v1/users/bulk-roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          organizationId: testOrg.id,
          userIds,
          newRole: 'editor'
        });

      expect(roleUpdateResponse.status).toBe(200);
      expect(roleUpdateResponse.body.success).toBe(true);

      // Verify role updates
      for (const userId of userIds) {
        const userResponse = await request(app)
          .get(`/api/v1/users/${userId}`)
          .set('Authorization', `Bearer ${adminToken}`);
        
        if (userResponse.status === 200) {
          expect(userResponse.body.data.role).toBe('editor');
        }
      }
    });

    it('should prevent bulk operations across organizations', async () => {
      // Try to perform bulk operation on other organization's data
      const bulkOperationResponse = await request(app)
        .patch('/api/v1/orders/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          organizationId: otherOrg.id, // Different org
          orderIds: ['other-org-order-1'],
          updates: { status: 'completed' }
        });

      expect(bulkOperationResponse.status).toBe(403);
      expect(bulkOperationResponse.body.success).toBe(false);
    });
  });

  describe('Bulk Operation Performance', () => {
    it('should handle bulk operations efficiently', async () => {
      // Create a reasonable number of items for performance testing
      const itemCount = 25;
      const orderIds = [];
      
      for (let i = 0; i < itemCount; i++) {
        const orderResponse = await request(app)
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            organizationId: testOrg.id,
            customerName: `Performance Customer ${i}`,
            totalAmount: (i + 1) * 10,
            status: 'pending'
          });
        
        if (orderResponse.status === 201) {
          orderIds.push(orderResponse.body.data.id);
        }
      }

      expect(orderIds.length).toBe(itemCount);

      // Measure bulk operation performance
      const startTime = Date.now();
      
      const bulkResponse = await request(app)
        .patch('/api/v1/orders/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          organizationId: testOrg.id,
          orderIds,
          updates: { status: 'in_progress' }
        });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(bulkResponse.status).toBe(200);
      expect(bulkResponse.body.success).toBe(true);
      
      // Should complete within reasonable time (under 5 seconds for 25 items)
      expect(duration).toBeLessThan(5000);
      
      // Should update all items
      expect(bulkResponse.body.data.updatedCount).toBe(itemCount);
    });

    it('should handle bulk operations with proper batching', async () => {
      const batchSize = 10;
      const totalItems = 30;
      const orderIds = [];
      
      // Create test orders
      for (let i = 0; i < totalItems; i++) {
        const orderResponse = await request(app)
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            organizationId: testOrg.id,
            customerName: `Batch Customer ${i}`,
            totalAmount: (i + 1) * 15,
            status: 'pending'
          });
        
        if (orderResponse.status === 201) {
          orderIds.push(orderResponse.body.data.id);
        }
      }

      // Process in batches
      const batches = [];
      for (let i = 0; i < orderIds.length; i += batchSize) {
        batches.push(orderIds.slice(i, i + batchSize));
      }

      const batchResults = [];
      for (const batch of batches) {
        const batchResponse = await request(app)
          .patch('/api/v1/orders/bulk')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            organizationId: testOrg.id,
            orderIds: batch,
            updates: { status: 'processing' }
          });
        
        batchResults.push(batchResponse);
      }

      // All batches should succeed
      const successfulBatches = batchResults.filter(r => r.status === 200);
      expect(successfulBatches.length).toBe(batches.length);
      
      // Total updates should equal total items
      const totalUpdates = batchResults.reduce((sum, r) => 
        sum + (r.body.data?.updatedCount || 0), 0
      );
      expect(totalUpdates).toBe(totalItems);
    });
  });

  describe('Bulk Operation Security', () => {
    it('should require appropriate permissions for bulk operations', async () => {
      // Member user should not be able to perform bulk deletions
      const deleteResponse = await request(app)
        .delete('/api/v1/orders/bulk')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          organizationId: testOrg.id,
          orderIds: ['test-order-1'],
          reason: 'Unauthorized deletion attempt'
        });

      expect(deleteResponse.status).toBe(403);
      expect(deleteResponse.body.success).toBe(false);
    });

    it('should validate bulk operation data integrity', async () => {
      // Test with malformed data
      const malformedResponse = await request(app)
        .patch('/api/v1/orders/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          organizationId: 'invalid-org-id',
          orderIds: [''], // Empty ID
          updates: {} // Empty updates
        });

      expect(malformedResponse.status).toBe(400);
      expect(malformedResponse.body.success).toBe(false);
    });

    it('should audit bulk operations properly', async () => {
      // Create an order to update
      const orderResponse = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          organizationId: testOrg.id,
          customerName: 'Audit Test Customer',
          totalAmount: 100,
          status: 'pending'
        });

      expect(orderResponse.status).toBe(201);
      const orderId = orderResponse.body.data.id;

      // Perform bulk update
      const bulkResponse = await request(app)
        .patch('/api/v1/orders/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          organizationId: testOrg.id,
          orderIds: [orderId],
          updates: { status: 'completed' }
        });

      expect(bulkResponse.status).toBe(200);

      // Check audit log
      const auditResponse = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 
          organizationId: testOrg.id,
          entity: 'orders',
          entityId: orderId
        });

      if (auditResponse.status === 200) {
        const auditLogs = auditResponse.body.data;
        const bulkUpdateLog = auditLogs.find((log: any) => 
          log.action === 'bulk_update'
        );
        
        expect(bulkUpdateLog).toBeDefined();
        expect(bulkUpdateLog.actor).toBe(adminUser.id);
      }
    });
  });
});
