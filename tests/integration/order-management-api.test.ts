import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { supabaseAdmin } from '../../server/lib/supabaseAdmin';
import { 
  createTestUser, 
  createTestOrganization, 
  createTestOrder,
  cleanupTestData,
  getAuthToken 
} from '../helpers/test-setup';

// Import all order management routes
import ordersRouter from '../../server/routes/orders/index';
import designJobsRouter from '../../server/routes/design-jobs/index';
import workOrdersRouter from '../../server/routes/work-orders/index';
import purchaseOrdersRouter from '../../server/routes/purchase-orders/index';
import fulfillmentRouter from '../../server/routes/fulfillment/index';
import catalogRouter from '../../server/routes/catalog/index';

// Import middleware

describe('Order Management API Integration Tests', () => {
  let app: express.Application;
  let testUser: any;
  let testOrg: any;
  let otherUser: any;
  let otherOrg: any;
  let authToken: string;
  let otherAuthToken: string;
  let testOrder: any;
  let testCatalogItem: any;

  beforeAll(async () => {
    // Setup Express app with all routes
    app = express();
    app.use(express.json());
    
    // Add auth middleware mock that uses our test tokens
    app.use((req, res, next) => {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        if (token === authToken && testUser) {
          (req as any).user = {
            id: testUser.id,
            email: testUser.email,
            organization_id: testOrg.id,
            role: testUser.role,
            is_super_admin: false
          };
        } else if (token === otherAuthToken && otherUser) {
          (req as any).user = {
            id: otherUser.id,
            email: otherUser.email,
            organization_id: otherOrg.id,
            role: otherUser.role,
            is_super_admin: false
          };
        }
      }
      next();
    });

    // Mount routes
    app.use('/api/orders', ordersRouter);
    app.use('/api/design-jobs', designJobsRouter);
    app.use('/api/work-orders', workOrdersRouter);
    app.use('/api/purchase-orders', purchaseOrdersRouter);
    app.use('/api/fulfillment', fulfillmentRouter);
    app.use('/api/catalog', catalogRouter);

    // Create test data
    testUser = await createTestUser({
      email: 'test-order-api@example.com',
      fullName: 'Test Order API User',
      role: 'admin'
    });

    testOrg = await createTestOrganization({
      name: 'Test Order API Org',
      ownerId: testUser.id
    });

    otherUser = await createTestUser({
      email: 'other-order-api@example.com',
      fullName: 'Other Order API User',
      role: 'member'
    });

    otherOrg = await createTestOrganization({
      name: 'Other Order API Org',
      ownerId: otherUser.id
    });

    authToken = await getAuthToken(testUser.id);
    otherAuthToken = await getAuthToken(otherUser.id);

    // Create test catalog item
    const { data: catalogItem, error: catalogError } = await supabaseAdmin
      .from('catalog_items')
      .insert({
        id: 'catalog-item-123',
        org_id: testOrg.id,
        name: 'Test Product',
        sport_id: 'sport-123',
        base_price: 25.99,
        turnaround_days: 14,
        moq: 50
      })
      .select()
      .single();

    if (catalogError) {
      throw new Error(`Failed to create catalog item: ${catalogError.message}`);
    }
    testCatalogItem = catalogItem;

    // Create test order
    testOrder = await createTestOrder({
      organizationId: testOrg.id,
      customerName: 'Test Customer',
      totalAmount: 199.99,
      status: 'draft'
    });
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Orders API (/api/orders)', () => {
    describe('GET /api/orders', () => {
      it('should list orders for authenticated user organization', async () => {
        const response = await request(app)
          .get('/api/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBeGreaterThan(0);
        
        // Should only return orders from user's organization
        response.body.data.forEach((order: any) => {
          expect(order.orgId || order.organization_id).toBe(testOrg.id);
        });
      });

      it('should support pagination', async () => {
        const response = await request(app)
          .get('/api/orders?page=1&limit=5')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.pagination).toBeDefined();
        expect(response.body.pagination.page).toBe(1);
        expect(response.body.pagination.limit).toBe(5);
      });

      it('should support filtering by status', async () => {
        const response = await request(app)
          .get('/api/orders?status=draft')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.forEach((order: any) => {
          expect(order.status || order.statusCode).toBe('draft');
        });
      });

      it('should support search by customer name', async () => {
        const response = await request(app)
          .get('/api/orders?search=Test Customer')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
      });

      it('should deny access without authentication', async () => {
        await request(app)
          .get('/api/orders')
          .expect(401);
      });

      it('should not return orders from other organizations', async () => {
        const response = await request(app)
          .get('/api/orders')
          .set('Authorization', `Bearer ${otherAuthToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        // Should not include test organization's orders
        const testOrgOrders = response.body.data.filter((order: any) => 
          (order.orgId || order.organization_id) === testOrg.id
        );
        expect(testOrgOrders).toHaveLength(0);
      });
    });

    describe('GET /api/orders/:id', () => {
      it('should return specific order with details', async () => {
        const response = await request(app)
          .get(`/api/orders/${testOrder.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(testOrder.id);
        expect(response.body.data.customerName).toBe('Test Customer');
        expect(response.body.data.totalAmount).toBe(199.99);
      });

      it('should include order items and related data', async () => {
        const response = await request(app)
          .get(`/api/orders/${testOrder.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.data).toHaveProperty('items');
        expect(response.body.data.items).toBeInstanceOf(Array);
      });

      it('should deny access to orders from other organizations', async () => {
        await request(app)
          .get(`/api/orders/${testOrder.id}`)
          .set('Authorization', `Bearer ${otherAuthToken}`)
          .expect(403);
      });

      it('should return 404 for non-existent orders', async () => {
        await request(app)
          .get('/api/orders/non-existent-id')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);
      });
    });

    describe('POST /api/orders', () => {
      it('should create new order with valid data', async () => {
        const newOrder = {
          customerName: 'New Customer',
          customerEmail: 'customer@example.com',
          customerPhone: '+1234567890',
          totalAmount: 299.99,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          items: [
            {
              productId: testCatalogItem[0].id,
              quantity: 2,
              unitPrice: 149.99,
              totalPrice: 299.98
            }
          ],
          notes: 'Test order creation'
        };

        const response = await request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(newOrder)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.customerName).toBe(newOrder.customerName);
        expect(response.body.data.totalAmount).toBe(newOrder.totalAmount);
        expect(response.body.data.orgId || response.body.data.organization_id).toBe(testOrg.id);
        expect(response.body.data.status || response.body.data.statusCode).toBe('draft');
      });

      it('should validate required fields', async () => {
        const invalidOrder = {
          // Missing customerName
          totalAmount: 100
        };

        const response = await request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidOrder)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('validation');
      });

      it('should validate business rules', async () => {
        const invalidOrder = {
          customerName: 'Test Customer',
          totalAmount: -100, // Negative amount should fail
          dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Past date
        };

        const response = await request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidOrder)
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should generate order number automatically', async () => {
        const order = {
          customerName: 'Auto Number Customer',
          totalAmount: 50.00
        };

        const response = await request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(order)
          .expect(201);

        expect(response.body.data.orderNumber || response.body.data.code).toMatch(/ORD-\d{8}-\d{4}/);
      });
    });

    describe('PATCH /api/orders/:id', () => {
      it('should update order with valid data', async () => {
        const updates = {
          customerName: 'Updated Customer Name',
          totalAmount: 250.00,
          notes: 'Updated notes'
        };

        const response = await request(app)
          .patch(`/api/orders/${testOrder.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updates)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.customerName).toBe(updates.customerName);
        expect(response.body.data.totalAmount).toBe(updates.totalAmount);
      });

      it('should validate status transitions', async () => {
        const invalidUpdate = {
          status: 'completed' // Can't jump directly from draft to completed
        };

        const response = await request(app)
          .patch(`/api/orders/${testOrder.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidUpdate)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('invalid status transition');
      });

      it('should deny updates to orders from other organizations', async () => {
        const updates = { customerName: 'Hacker Update' };

        await request(app)
          .patch(`/api/orders/${testOrder.id}`)
          .set('Authorization', `Bearer ${otherAuthToken}`)
          .send(updates)
          .expect(403);
      });
    });

    describe('DELETE /api/orders/:id', () => {
      it('should soft delete order (change status to cancelled)', async () => {
        // Create order to delete
        const orderToDelete = await createTestOrder({
          organizationId: testOrg.id,
          customerName: 'Delete Test Customer',
          totalAmount: 99.99
        });

        const response = await request(app)
          .delete(`/api/orders/${orderToDelete.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify order is marked as cancelled, not physically deleted
        const checkResponse = await request(app)
          .get(`/api/orders/${orderToDelete.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(checkResponse.body.data.status || checkResponse.body.data.statusCode).toBe('cancelled');
      });

      it('should deny deletion of orders from other organizations', async () => {
        await request(app)
          .delete(`/api/orders/${testOrder.id}`)
          .set('Authorization', `Bearer ${otherAuthToken}`)
          .expect(403);
      });

      it('should prevent deletion of orders in certain statuses', async () => {
        // Create order in shipped status
        const shippedOrder = await createTestOrder({
          organizationId: testOrg.id,
          customerName: 'Shipped Customer',
          totalAmount: 150.00,
          status: 'shipped'
        });

        await request(app)
          .delete(`/api/orders/${shippedOrder.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
      });
    });
  });

  describe('Order Items API (/api/orders/:orderId/items)', () => {
    describe('GET /api/orders/:orderId/items', () => {
      it('should list items for specific order', async () => {
        const response = await request(app)
          .get(`/api/orders/${testOrder.id}/items`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
      });

      it('should deny access to items from other organizations orders', async () => {
        await request(app)
          .get(`/api/orders/${testOrder.id}/items`)
          .set('Authorization', `Bearer ${otherAuthToken}`)
          .expect(403);
      });
    });

    describe('POST /api/orders/:orderId/items', () => {
      it('should add new item to order', async () => {
        const newItem = {
          productId: testCatalogItem[0].id,
          quantity: 3,
          unitPrice: 25.99,
          totalPrice: 77.97,
          notes: 'Additional item'
        };

        const response = await request(app)
          .post(`/api/orders/${testOrder.id}/items`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(newItem)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.quantity).toBe(newItem.quantity);
        expect(response.body.data.orderId).toBe(testOrder.id);
      });

      it('should validate item data', async () => {
        const invalidItem = {
          productId: 'invalid-product-id',
          quantity: -1, // Invalid quantity
          unitPrice: 'invalid' // Invalid price
        };

        await request(app)
          .post(`/api/orders/${testOrder.id}/items`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidItem)
          .expect(400);
      });
    });
  });

  describe('Bulk Operations', () => {
    describe('POST /api/orders/bulk/status-update', () => {
      it('should update multiple orders status', async () => {
        const order1 = await createTestOrder({
          organizationId: testOrg.id,
          customerName: 'Bulk Test 1',
          totalAmount: 100,
          status: 'draft'
        });

        const order2 = await createTestOrder({
          organizationId: testOrg.id,
          customerName: 'Bulk Test 2',
          totalAmount: 200,
          status: 'draft'
        });

        const bulkUpdate = {
          orderIds: [order1.id, order2.id],
          status: 'pending',
          notes: 'Bulk status update'
        };

        const response = await request(app)
          .post('/api/orders/bulk/status-update')
          .set('Authorization', `Bearer ${authToken}`)
          .send(bulkUpdate)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.updated).toBe(2);
      });

      it('should validate bulk operation permissions', async () => {
        const bulkUpdate = {
          orderIds: [testOrder.id],
          status: 'cancelled'
        };

        await request(app)
          .post('/api/orders/bulk/status-update')
          .set('Authorization', `Bearer ${otherAuthToken}`)
          .send(bulkUpdate)
          .expect(403);
      });
    });
  });

  describe('Order Export', () => {
    describe('GET /api/orders/export', () => {
      it('should export orders in CSV format', async () => {
        const response = await request(app)
          .get('/api/orders/export?format=csv')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.headers['content-type']).toContain('text/csv');
        expect(response.text).toContain('Order Number,Customer Name,Total Amount');
      });

      it('should export filtered orders', async () => {
        const response = await request(app)
          .get('/api/orders/export?format=csv&status=draft&startDate=2025-01-01')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.headers['content-type']).toContain('text/csv');
      });

      it('should respect organization boundaries in exports', async () => {
        const response = await request(app)
          .get('/api/orders/export?format=csv')
          .set('Authorization', `Bearer ${otherAuthToken}`)
          .expect(200);

        // Should only export other user's organization orders
        expect(response.text).not.toContain('Test Customer');
      });
    });
  });

  describe('Order Analytics', () => {
    describe('GET /api/orders/analytics/summary', () => {
      it('should return order analytics summary', async () => {
        const response = await request(app)
          .get('/api/orders/analytics/summary')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('totalOrders');
        expect(response.body.data).toHaveProperty('totalRevenue');
        expect(response.body.data).toHaveProperty('statusBreakdown');
        expect(response.body.data).toHaveProperty('monthlyTrends');
      });

      it('should filter analytics by date range', async () => {
        const startDate = '2025-01-01';
        const endDate = '2025-01-31';

        const response = await request(app)
          .get(`/api/orders/analytics/summary?startDate=${startDate}&endDate=${endDate}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.dateRange).toEqual({ startDate, endDate });
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid JSON');
    });

    it('should handle very large payloads', async () => {
      const largeOrder = {
        customerName: 'Large Order Customer',
        totalAmount: 1000.00,
        notes: 'x'.repeat(10000), // Large notes field
        items: Array(100).fill({
          productId: testCatalogItem[0].id,
          quantity: 1,
          unitPrice: 10.00,
          totalPrice: 10.00
        })
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(largeOrder);

      // Should either succeed or fail gracefully with proper error
      expect([200, 201, 400, 413]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
    });

    it('should handle concurrent order creation', async () => {
      const orderData = {
        customerName: 'Concurrent Customer',
        totalAmount: 100.00
      };

      // Create multiple orders concurrently
      const promises = Array(5).fill(null).map(() =>
        request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(orderData)
      );

      const responses = await Promise.all(promises);

      // All should succeed with unique order numbers
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      const orderNumbers = responses.map(r => r.body.data.orderNumber || r.body.data.code);
      const uniqueNumbers = new Set(orderNumbers);
      expect(uniqueNumbers.size).toBe(5); // All should be unique
    });
  });
});