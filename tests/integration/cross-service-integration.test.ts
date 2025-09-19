import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { db } from '../../server/db';
import { 
  createTestUser, 
  createTestOrganization, 
  createTestOrder,
  cleanupTestData,
  getAuthToken 
} from '../helpers/test-setup';

// Import all relevant routes
import ordersRouter from '../../server/routes/orders/index';
import designJobsRouter from '../../server/routes/design-jobs/index';
import workOrdersRouter from '../../server/routes/work-orders/index';
import purchaseOrdersRouter from '../../server/routes/purchase-orders/index';
import fulfillmentRouter from '../../server/routes/fulfillment/index';
import catalogRouter from '../../server/routes/catalog/index';
import notificationsRouter from '../../server/routes/notifications';

describe('Cross-Service Integration Tests', () => {
  let app: express.Application;
  let adminUser: any;
  let memberUser: any;
  let readonlyUser: any;
  let testOrg1: any;
  let testOrg2: any;
  let adminToken: string;
  let memberToken: string;
  let readonlyToken: string;

  beforeAll(async () => {
    // Setup Express app with all routes
    app = express();
    app.use(express.json());
    
    // Add auth middleware mock
    app.use((req, res, next) => {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        
        let user = null;
        if (token === adminToken) user = adminUser;
        else if (token === memberToken) user = memberUser;
        else if (token === readonlyToken) user = readonlyUser;
        
        if (user) {
          (req as any).user = {
            id: user.id,
            email: user.email,
            organization_id: user.organizationId,
            role: user.role,
            is_super_admin: user.role === 'admin' && user.id === adminUser.id
          };
        }
      }
      next();
    });

    // Mount all routes
    app.use('/api/orders', ordersRouter);
    app.use('/api/design-jobs', designJobsRouter);
    app.use('/api/work-orders', workOrdersRouter);
    app.use('/api/purchase-orders', purchaseOrdersRouter);
    app.use('/api/fulfillment', fulfillmentRouter);
    app.use('/api/catalog', catalogRouter);
    app.use('/api/notifications', notificationsRouter);

    // Create test organizations
    adminUser = await createTestUser({
      email: 'cross-admin@example.com',
      fullName: 'Cross Admin User',
      role: 'admin'
    });

    testOrg1 = await createTestOrganization({
      name: 'Cross Test Org 1',
      ownerId: adminUser.id
    });

    memberUser = await createTestUser({
      email: 'cross-member@example.com',
      fullName: 'Cross Member User',
      role: 'member',
      organizationId: testOrg1.id
    });

    readonlyUser = await createTestUser({
      email: 'cross-readonly@example.com',
      fullName: 'Cross Readonly User',
      role: 'readonly',
      organizationId: testOrg1.id
    });

    // Create second organization for isolation testing
    const otherOwner = await createTestUser({
      email: 'other-owner@example.com',
      fullName: 'Other Org Owner',
      role: 'admin'
    });

    testOrg2 = await createTestOrganization({
      name: 'Cross Test Org 2',
      ownerId: otherOwner.id
    });

    // Update admin user to belong to testOrg1
    adminUser.organizationId = testOrg1.id;

    adminToken = await getAuthToken(adminUser.id);
    memberToken = await getAuthToken(memberUser.id);
    readonlyToken = await getAuthToken(readonlyUser.id);

    // Create test data
    await db.execute(`
      INSERT INTO catalog_items (id, org_id, name, sport_id, base_price, turnaround_days, moq)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, ['cross-catalog-1', testOrg1.id, 'Cross Test Product', 'sport-123', 75.00, 10, 25]);

    await db.execute(`
      INSERT INTO manufacturers (id, org_id, name, email, specialties, capabilities)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      'cross-mfg-1',
      testOrg1.id,
      'Cross Test Manufacturer',
      'mfg@cross-test.com',
      JSON.stringify(['apparel']),
      JSON.stringify(['embroidery', 'screen_printing'])
    ]);

    await db.execute(`
      INSERT INTO suppliers (id, org_id, name, email, contact_info, categories)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      'cross-supplier-1',
      testOrg1.id,
      'Cross Test Supplier',
      'supplier@cross-test.com',
      JSON.stringify({ phone: '+1234567890' }),
      JSON.stringify(['materials', 'accessories'])
    ]);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Organization-based Data Isolation', () => {
    it('should isolate orders between organizations', async () => {
      // Create orders in both organizations
      const org1Order = await createTestOrder({
        organizationId: testOrg1.id,
        customerName: 'Org1 Customer',
        totalAmount: 150.00
      });

      const org2Order = await createTestOrder({
        organizationId: testOrg2.id,
        customerName: 'Org2 Customer',
        totalAmount: 250.00
      });

      // User from org1 should only see org1 orders
      const org1Response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(org1Response.body.success).toBe(true);
      
      const org1OrderIds = org1Response.body.data.map((order: any) => order.id);
      expect(org1OrderIds).toContain(org1Order.id);
      expect(org1OrderIds).not.toContain(org2Order.id);

      // User from org1 should not be able to access org2 order directly
      await request(app)
        .get(`/api/orders/${org2Order.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('should isolate catalog items between organizations', async () => {
      // Create catalog item in org2
      await db.execute(`
        INSERT INTO catalog_items (id, org_id, name, sport_id, base_price, turnaround_days, moq)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, ['cross-catalog-2', testOrg2.id, 'Org2 Product', 'sport-456', 100.00, 14, 50]);

      // User from org1 should only see org1 catalog items
      const catalogResponse = await request(app)
        .get('/api/catalog')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(catalogResponse.body.success).toBe(true);
      
      const catalogItemIds = catalogResponse.body.data.map((item: any) => item.id);
      expect(catalogItemIds).toContain('cross-catalog-1');
      expect(catalogItemIds).not.toContain('cross-catalog-2');
    });

    it('should prevent cross-organization data access in complex queries', async () => {
      // Create interlinked data across organizations
      const org1Order = await createTestOrder({
        organizationId: testOrg1.id,
        customerName: 'Complex Test Customer',
        totalAmount: 300.00
      });

      // Try to access org1 order with crafted query that might bypass isolation
      const maliciousQueries = [
        `/api/orders?orgId=${testOrg2.id}`,
        `/api/orders/${org1Order.id}?organization_id=${testOrg2.id}`,
        `/api/orders?filter[organization_id]=${testOrg1.id}` // Assuming URL is vulnerable
      ];

      for (const query of maliciousQueries) {
        const response = await request(app)
          .get(query)
          .set('Authorization', `Bearer ${adminToken}`);
        
        // Should either return only org1 data or fail entirely
        if (response.status === 200) {
          if (response.body.data) {
            // If data is returned, ensure it's only for the user's organization
            const returnedOrders = Array.isArray(response.body.data) ? 
              response.body.data : [response.body.data];
            
            returnedOrders.forEach((order: any) => {
              expect(order.orgId || order.organization_id).toBe(testOrg1.id);
            });
          }
        }
      }
    });
  });

  describe('Role-based Access Control Integration', () => {
    it('should enforce read permissions across all services', async () => {
      // Create test data
      const testOrder = await createTestOrder({
        organizationId: testOrg1.id,
        customerName: 'RBAC Test Customer',
        totalAmount: 200.00
      });

      // All users should be able to read basic order data
      const endpoints = [
        `/api/orders/${testOrder.id}`,
        '/api/catalog',
        '/api/notifications/stats'
      ];

      for (const endpoint of endpoints) {
        // Admin access
        const adminResponse = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
        expect(adminResponse.body.success).toBe(true);

        // Member access
        const memberResponse = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);
        expect(memberResponse.body.success).toBe(true);

        // Readonly access
        const readonlyResponse = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${readonlyToken}`)
          .expect(200);
        expect(readonlyResponse.body.success).toBe(true);
      }
    });

    it('should enforce write permissions across all services', async () => {
      const testOrder = await createTestOrder({
        organizationId: testOrg1.id,
        customerName: 'Write Test Customer',
        totalAmount: 100.00
      });

      // Define write operations that should be restricted by role
      const writeOperations = [
        {
          method: 'patch',
          endpoint: `/api/orders/${testOrder.id}`,
          data: { notes: 'Updated by test' },
          requiredRole: 'member' // Members and above can update orders
        },
        {
          method: 'post',
          endpoint: '/api/design-jobs',
          data: {
            orderId: testOrder.id,
            designerId: memberUser.id,
            requirements: { designType: 'logo' },
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          },
          requiredRole: 'member'
        },
        {
          method: 'post',
          endpoint: '/api/notifications',
          data: {
            orgId: testOrg1.id,
            userId: memberUser.id,
            type: 'test_notification',
            title: 'Test Notification',
            message: 'RBAC test message',
            category: 'general',
            priority: 'normal'
          },
          requiredRole: 'admin' // Only admins can create notifications
        }
      ];

      for (const operation of writeOperations) {
        // Test with readonly user (should fail)
        const readonlyRequest = request(app)
          [operation.method](operation.endpoint)
          .set('Authorization', `Bearer ${readonlyToken}`)
          .send(operation.data);

        const readonlyResponse = await readonlyRequest;
        expect([400, 403]).toContain(readonlyResponse.status);

        // Test with member user
        const memberRequest = request(app)
          [operation.method](operation.endpoint)
          .set('Authorization', `Bearer ${memberToken}`)
          .send(operation.data);

        const memberResponse = await memberRequest;
        
        if (operation.requiredRole === 'member') {
          expect([200, 201]).toContain(memberResponse.status);
        } else {
          expect([400, 403]).toContain(memberResponse.status);
        }

        // Test with admin user (should always succeed)
        const adminRequest = request(app)
          [operation.method](operation.endpoint)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(operation.data);

        const adminResponse = await adminRequest;
        expect([200, 201]).toContain(adminResponse.status);
      }
    });

    it('should validate permissions for sensitive operations', async () => {
      const testOrder = await createTestOrder({
        organizationId: testOrg1.id,
        customerName: 'Sensitive Test Customer',
        totalAmount: 500.00
      });

      // Operations that should require elevated permissions
      const sensitiveOperations = [
        {
          method: 'delete',
          endpoint: `/api/orders/${testOrder.id}`,
          requiredRole: 'admin'
        },
        {
          method: 'post',
          endpoint: '/api/orders/bulk/status-update',
          data: {
            orderIds: [testOrder.id],
            status: 'cancelled',
            notes: 'Bulk cancellation test'
          },
          requiredRole: 'admin'
        }
      ];

      for (const operation of sensitiveOperations) {
        // Member should not be able to perform sensitive operations
        const memberRequest = request(app)
          [operation.method](operation.endpoint)
          .set('Authorization', `Bearer ${memberToken}`)
          .send(operation.data);

        const memberResponse = await memberRequest;
        expect([400, 403]).toContain(memberResponse.status);

        // Admin should be able to perform sensitive operations
        const adminRequest = request(app)
          [operation.method](operation.endpoint)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(operation.data);

        const adminResponse = await adminRequest;
        expect([200, 201]).toContain(adminResponse.status);
      }
    });
  });

  describe('Service Interdependency Validation', () => {
    it('should maintain referential integrity across services', async () => {
      // Create order
      const order = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerName: 'Integrity Test Customer',
          totalAmount: 400.00,
          items: [{
            productId: 'cross-catalog-1',
            quantity: 5,
            unitPrice: 80.00,
            totalPrice: 400.00
          }]
        })
        .expect(201);

      const orderId = order.body.data.id;

      // Create design job for the order
      const designJob = await request(app)
        .post('/api/design-jobs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: orderId,
          designerId: memberUser.id,
          requirements: { designType: 'custom_logo' },
          dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
        })
        .expect(201);

      const designJobId = designJob.body.data.id;

      // Create work order linked to both order and design job
      const workOrder = await request(app)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: orderId,
          designJobId: designJobId,
          manufacturerId: 'cross-mfg-1',
          targetQuantity: 5,
          unitCost: 40.00,
          totalCost: 200.00,
          estimatedCompletionDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString()
        })
        .expect(201);

      const workOrderId = workOrder.body.data.id;

      // Verify relationships are maintained
      const orderCheck = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(orderCheck.body.data.id).toBe(orderId);

      const designJobCheck = await request(app)
        .get(`/api/design-jobs/${designJobId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(designJobCheck.body.data.orderId).toBe(orderId);

      const workOrderCheck = await request(app)
        .get(`/api/work-orders/${workOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(workOrderCheck.body.data.orderId).toBe(orderId);
      expect(workOrderCheck.body.data.designJobId).toBe(designJobId);
    });

    it('should handle cascading updates across services', async () => {
      // Create order and related entities
      const order = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerName: 'Cascade Test Customer',
          totalAmount: 300.00
        })
        .expect(201);

      const orderId = order.body.data.id;

      // Create design job
      const designJob = await request(app)
        .post('/api/design-jobs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: orderId,
          designerId: memberUser.id,
          requirements: { designType: 'text_only' },
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .expect(201);

      // Update order priority - should potentially affect related entities
      await request(app)
        .patch(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          priority: 'urgent',
          notes: 'Rush order - please expedite all related work'
        })
        .expect(200);

      // Verify design job can be updated to reflect urgent priority
      await request(app)
        .patch(`/api/design-jobs/${designJob.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          priority: 'high',
          notes: 'Updated to reflect urgent order priority'
        })
        .expect(200);

      // Verify changes are persisted correctly
      const updatedOrder = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(updatedOrder.body.data.priority).toBe('urgent');

      const updatedDesignJob = await request(app)
        .get(`/api/design-jobs/${designJob.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(updatedDesignJob.body.data.priority).toBe('high');
    });

    it('should prevent orphaned records across services', async () => {
      // Create order with design job
      const order = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerName: 'Orphan Test Customer',
          totalAmount: 150.00
        })
        .expect(201);

      const orderId = order.body.data.id;

      const designJob = await request(app)
        .post('/api/design-jobs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: orderId,
          designerId: memberUser.id,
          requirements: { designType: 'simple' },
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
        })
        .expect(201);

      // Try to delete order while design job exists
      // This should either:
      // 1. Prevent deletion due to foreign key constraints
      // 2. Cascade delete related entities
      // 3. Mark as cancelled instead of deleting
      const deleteResponse = await request(app)
        .delete(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Verify appropriate handling based on business rules
      if (deleteResponse.status === 200) {
        // If deletion succeeded, verify design job handling
        const designJobCheck = await request(app)
          .get(`/api/design-jobs/${designJob.body.data.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        // Should either be deleted or marked as cancelled
        if (designJobCheck.status === 200) {
          expect(['cancelled', 'void'].includes(designJobCheck.body.data.status)).toBe(true);
        } else {
          expect(designJobCheck.status).toBe(404);
        }
      } else {
        // If deletion was prevented, both should still exist
        expect([400, 409]).toContain(deleteResponse.status);
        
        await request(app)
          .get(`/api/orders/${orderId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        await request(app)
          .get(`/api/design-jobs/${designJob.body.data.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      }
    });
  });

  describe('Data Consistency Across Services', () => {
    it('should maintain consistent timestamps across related entities', async () => {
      const startTime = new Date();

      // Create order and immediately related entities
      const order = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerName: 'Timestamp Test Customer',
          totalAmount: 250.00
        })
        .expect(201);

      const designJob = await request(app)
        .post('/api/design-jobs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: order.body.data.id,
          designerId: memberUser.id,
          requirements: { designType: 'branding' },
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        })
        .expect(201);

      const endTime = new Date();

      // Verify timestamps are reasonable and consistent
      const orderCreatedAt = new Date(order.body.data.createdAt);
      const designJobCreatedAt = new Date(designJob.body.data.createdAt);

      expect(orderCreatedAt.getTime()).toBeGreaterThanOrEqual(startTime.getTime());
      expect(orderCreatedAt.getTime()).toBeLessThanOrEqual(endTime.getTime());
      expect(designJobCreatedAt.getTime()).toBeGreaterThanOrEqual(orderCreatedAt.getTime());
      expect(designJobCreatedAt.getTime()).toBeLessThanOrEqual(endTime.getTime());
    });

    it('should validate business rule consistency across services', async () => {
      // Create order with specific requirements
      const order = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerName: 'Business Rules Test',
          totalAmount: 1000.00,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'high'
        })
        .expect(201);

      // Create design job with due date that should be before order due date
      const designJobDueDate = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);
      
      await request(app)
        .post('/api/design-jobs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: order.body.data.id,
          designerId: memberUser.id,
          requirements: { designType: 'complex_artwork' },
          dueDate: designJobDueDate.toISOString(),
          priority: 'high' // Should match or be compatible with order priority
        })
        .expect(201);

      // Try to create design job with due date AFTER order due date (should fail or warn)
      const invalidDesignJobResponse = await request(app)
        .post('/api/design-jobs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: order.body.data.id,
          designerId: memberUser.id,
          requirements: { designType: 'additional_design' },
          dueDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString() // After order due date
        });

      // Should either fail validation or succeed with warnings
      if (invalidDesignJobResponse.status >= 400) {
        expect(invalidDesignJobResponse.body.error).toContain('due date');
      }
    });
  });

  describe('Error Propagation Across Services', () => {
    it('should handle service failures gracefully', async () => {
      const order = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerName: 'Error Test Customer',
          totalAmount: 100.00
        })
        .expect(201);

      // Try to create design job with invalid data
      const invalidDesignJobResponse = await request(app)
        .post('/api/design-jobs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: order.body.data.id,
          designerId: 'invalid-designer-id', // Non-existent designer
          requirements: { designType: 'test' },
          dueDate: 'invalid-date' // Invalid date format
        });

      expect(invalidDesignJobResponse.status).toBeGreaterThanOrEqual(400);
      expect(invalidDesignJobResponse.body.success).toBe(false);

      // Original order should still be accessible and unchanged
      const orderCheck = await request(app)
        .get(`/api/orders/${order.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(orderCheck.body.data.status).toBe(order.body.data.status);
    });

    it('should validate dependencies before allowing operations', async () => {
      // Try to create work order without existing order
      const invalidWorkOrderResponse = await request(app)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: 'non-existent-order-id',
          manufacturerId: 'cross-mfg-1',
          targetQuantity: 10,
          unitCost: 20.00,
          totalCost: 200.00
        });

      expect(invalidWorkOrderResponse.status).toBeGreaterThanOrEqual(400);
      expect(invalidWorkOrderResponse.body.success).toBe(false);

      // Try to create fulfillment record without existing order
      const invalidFulfillmentResponse = await request(app)
        .post('/api/fulfillment')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: 'non-existent-order-id',
          assignedTo: memberUser.id,
          shippingAddress: {
            name: 'Test Customer',
            addressLine1: '123 Test St',
            city: 'Test City',
            state: 'TS',
            postalCode: '12345',
            country: 'US'
          }
        });

      expect(invalidFulfillmentResponse.status).toBeGreaterThanOrEqual(400);
      expect(invalidFulfillmentResponse.body.success).toBe(false);
    });
  });
});