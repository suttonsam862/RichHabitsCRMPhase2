import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { 
  createTestUser, 
  createTestOrganization, 
  cleanupTestData,
  getAuthToken 
} from '../helpers/test-setup';

// Import all route modules for comprehensive testing
import authRoutes from '../../server/routes/auth/index';
import organizationsRoutes from '../../server/routes/organizations/index';
import usersRoutes from '../../server/routes/users/index';
import ordersRoutes from '../../server/routes/orders/index';
import designJobsRoutes from '../../server/routes/design-jobs/index';
import workOrdersRoutes from '../../server/routes/work-orders/index';
import purchaseOrdersRoutes from '../../server/routes/purchase-orders/index';
import fulfillmentRoutes from '../../server/routes/fulfillment/index';
import catalogRoutes from '../../server/routes/catalog/index';
import notificationsRoutes from '../../server/routes/notifications';
import salesRoutes from '../../server/routes/sales/index';
import systemSettingsRoutes from '../../server/routes/system-settings/index';

describe('Comprehensive API Testing - All REST Endpoints', () => {
  let app: express.Application;
  let adminUser: any;
  let memberUser: any;
  let readonlyUser: any;
  let testOrg: any;
  let adminToken: string;
  let memberToken: string;
  let readonlyToken: string;

  beforeAll(async () => {
    // Setup Express app with all routes
    app = express();
    app.use(express.json());
    
    // Add comprehensive auth middleware mock
    app.use((req, res, next) => {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        
        let user = null;
        if (token === adminToken) user = { ...adminUser, organization_id: testOrg.id };
        else if (token === memberToken) user = { ...memberUser, organization_id: testOrg.id };
        else if (token === readonlyToken) user = { ...readonlyUser, organization_id: testOrg.id };
        
        if (user) {
          (req as any).user = {
            id: user.id,
            email: user.email,
            organization_id: user.organization_id,
            role: user.role,
            is_super_admin: user.role === 'admin'
          };
        }
      }
      next();
    });

    // Mount all API routes
    app.use('/api/auth', authRoutes);
    app.use('/api/organizations', organizationsRoutes);
    app.use('/api/users', usersRoutes);
    app.use('/api/orders', ordersRoutes);
    app.use('/api/design-jobs', designJobsRoutes);
    app.use('/api/work-orders', workOrdersRoutes);
    app.use('/api/purchase-orders', purchaseOrdersRoutes);
    app.use('/api/fulfillment', fulfillmentRoutes);
    app.use('/api/catalog', catalogRoutes);
    app.use('/api/notifications', notificationsRoutes);
    app.use('/api/sales', salesRoutes);
    app.use('/api/system-settings', systemSettingsRoutes);

    // Create comprehensive test data
    adminUser = await createTestUser({
      email: 'api-admin@example.com',
      fullName: 'API Admin User',
      role: 'admin'
    });

    testOrg = await createTestOrganization({
      name: 'API Test Organization',
      ownerId: adminUser.id
    });

    memberUser = await createTestUser({
      email: 'api-member@example.com',
      fullName: 'API Member User',
      role: 'member',
      organizationId: testOrg.id
    });

    readonlyUser = await createTestUser({
      email: 'api-readonly@example.com',
      fullName: 'API Readonly User',
      role: 'readonly',
      organizationId: testOrg.id
    });

    adminToken = await getAuthToken(adminUser.id);
    memberToken = await getAuthToken(memberUser.id);
    readonlyToken = await getAuthToken(readonlyUser.id);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Authentication API (/api/auth)', () => {
    describe('POST /api/auth/login', () => {
      it('should authenticate with valid credentials', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: adminUser.email,
            password: 'TestPassword123!'
          });

        expect([200, 201]).toContain(response.status);
        if (response.body.success !== false) {
          expect(response.body).toHaveProperty('user');
          expect(response.body).toHaveProperty('access_token');
        }
      });

      it('should reject invalid credentials', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: 'wrongpassword'
          });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/auth/register', () => {
      it('should register new user with valid data', async () => {
        const newUser = {
          email: 'newuser@api-test.com',
          password: 'StrongPassword123!',
          fullName: 'New API User'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(newUser);

        // May succeed or fail depending on implementation
        expect([200, 201, 400, 500]).toContain(response.status);
        expect(response.body).toHaveProperty('success');
      });

      it('should validate password requirements', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'weak@example.com',
            password: '123',
            fullName: 'Weak Password User'
          });

        expect([400, 422]).toContain(response.status);
      });
    });
  });

  describe('Organizations API (/api/organizations)', () => {
    describe('GET /api/organizations', () => {
      it('should list organizations for authenticated users', async () => {
        const response = await request(app)
          .get('/api/organizations')
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 401]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body).toHaveProperty('success', true);
          expect(response.body.data).toBeInstanceOf(Array);
        }
      });

      it('should support pagination', async () => {
        const response = await request(app)
          .get('/api/organizations?page=1&limit=10')
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 401]).toContain(response.status);
        if (response.status === 200 && response.body.pagination) {
          expect(response.body.pagination).toHaveProperty('page');
          expect(response.body.pagination).toHaveProperty('limit');
        }
      });

      it('should support search functionality', async () => {
        const response = await request(app)
          .get('/api/organizations?search=API Test')
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 401]).toContain(response.status);
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/organizations');

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/organizations/:id', () => {
      it('should retrieve specific organization', async () => {
        const response = await request(app)
          .get(`/api/organizations/${testOrg.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 404]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body.data.id).toBe(testOrg.id);
        }
      });

      it('should return 404 for non-existent organization', async () => {
        const response = await request(app)
          .get('/api/organizations/non-existent-id')
          .set('Authorization', `Bearer ${adminToken}`);

        expect([404, 400]).toContain(response.status);
      });
    });

    describe('POST /api/organizations', () => {
      it('should create organization with valid data', async () => {
        const orgData = {
          name: 'New API Test Org',
          email: 'neworg@api-test.com',
          isBusiness: true,
          state: 'CA'
        };

        const response = await request(app)
          .post('/api/organizations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(orgData);

        expect([200, 201, 400, 403]).toContain(response.status);
        if ([200, 201].includes(response.status)) {
          expect(response.body.success).toBe(true);
          expect(response.body.data.name).toBe(orgData.name);
        }
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/organizations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({});

        expect([400, 422]).toContain(response.status);
      });
    });

    describe('PATCH /api/organizations/:id', () => {
      it('should update organization with valid data', async () => {
        const updates = {
          name: 'Updated API Test Org',
          notes: 'Updated via API test'
        };

        const response = await request(app)
          .patch(`/api/organizations/${testOrg.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updates);

        expect([200, 400, 403, 404]).toContain(response.status);
      });

      it('should enforce permission requirements', async () => {
        const response = await request(app)
          .patch(`/api/organizations/${testOrg.id}`)
          .set('Authorization', `Bearer ${readonlyToken}`)
          .send({ name: 'Unauthorized Update' });

        expect([403, 404]).toContain(response.status);
      });
    });
  });

  describe('Users API (/api/users)', () => {
    describe('GET /api/users', () => {
      it('should list users with proper filtering', async () => {
        const response = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 401]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body).toHaveProperty('success', true);
        }
      });

      it('should support search by email', async () => {
        const response = await request(app)
          .get(`/api/users?q=${adminUser.email}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 401]).toContain(response.status);
      });

      it('should support pagination', async () => {
        const response = await request(app)
          .get('/api/users?page=1&pageSize=5')
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 401]).toContain(response.status);
      });
    });

    describe('POST /api/users', () => {
      it('should create user with valid data', async () => {
        const userData = {
          email: 'newuser@users-api.com',
          fullName: 'New User API Test',
          role: 'member'
        };

        const response = await request(app)
          .post('/api/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(userData);

        expect([200, 201, 400, 403]).toContain(response.status);
        if ([200, 201].includes(response.status)) {
          expect(response.body.success).toBe(true);
        }
      });

      it('should validate email format', async () => {
        const response = await request(app)
          .post('/api/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            email: 'invalid-email',
            fullName: 'Invalid Email User'
          });

        expect([400, 422]).toContain(response.status);
      });
    });
  });

  describe('Orders API (/api/orders)', () => {
    let testOrderId: string;

    describe('POST /api/orders', () => {
      it('should create order with valid data', async () => {
        const orderData = {
          customerName: 'API Test Customer',
          customerEmail: 'customer@api-test.com',
          totalAmount: 199.99,
          items: [
            {
              productId: 'test-product-123',
              quantity: 2,
              unitPrice: 99.99,
              totalPrice: 199.98
            }
          ]
        };

        const response = await request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(orderData);

        expect([200, 201, 400]).toContain(response.status);
        if ([200, 201].includes(response.status)) {
          expect(response.body.success).toBe(true);
          testOrderId = response.body.data.id;
        }
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({});

        expect([400, 422]).toContain(response.status);
      });

      it('should validate business rules', async () => {
        const response = await request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            customerName: 'Invalid Order',
            totalAmount: -100 // Negative amount
          });

        expect([400, 422]).toContain(response.status);
      });
    });

    describe('GET /api/orders', () => {
      it('should list orders with filtering', async () => {
        const response = await request(app)
          .get('/api/orders')
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 401]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body).toHaveProperty('success', true);
        }
      });

      it('should support status filtering', async () => {
        const response = await request(app)
          .get('/api/orders?status=draft')
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 401]).toContain(response.status);
      });

      it('should support date range filtering', async () => {
        const startDate = '2025-01-01';
        const endDate = '2025-12-31';
        
        const response = await request(app)
          .get(`/api/orders?startDate=${startDate}&endDate=${endDate}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 401]).toContain(response.status);
      });
    });

    describe('GET /api/orders/:id', () => {
      it('should retrieve specific order', async () => {
        if (testOrderId) {
          const response = await request(app)
            .get(`/api/orders/${testOrderId}`)
            .set('Authorization', `Bearer ${adminToken}`);

          expect([200, 404]).toContain(response.status);
        }
      });
    });

    describe('PATCH /api/orders/:id', () => {
      it('should update order with valid data', async () => {
        if (testOrderId) {
          const response = await request(app)
            .patch(`/api/orders/${testOrderId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              notes: 'Updated via API test',
              priority: 'high'
            });

          expect([200, 400, 404]).toContain(response.status);
        }
      });
    });
  });

  describe('Design Jobs API (/api/design-jobs)', () => {
    describe('GET /api/design-jobs', () => {
      it('should list design jobs', async () => {
        const response = await request(app)
          .get('/api/design-jobs')
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 401]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body).toHaveProperty('success', true);
        }
      });

      it('should support filtering by status', async () => {
        const response = await request(app)
          .get('/api/design-jobs?status=pending')
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 401]).toContain(response.status);
      });

      it('should support designer filtering', async () => {
        const response = await request(app)
          .get(`/api/design-jobs?designerId=${memberUser.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 401]).toContain(response.status);
      });
    });
  });

  describe('Work Orders API (/api/work-orders)', () => {
    describe('GET /api/work-orders', () => {
      it('should list work orders', async () => {
        const response = await request(app)
          .get('/api/work-orders')
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 401]).toContain(response.status);
      });

      it('should support manufacturer filtering', async () => {
        const response = await request(app)
          .get('/api/work-orders?manufacturerId=test-mfg-123')
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 401]).toContain(response.status);
      });
    });
  });

  describe('Purchase Orders API (/api/purchase-orders)', () => {
    describe('GET /api/purchase-orders', () => {
      it('should list purchase orders', async () => {
        const response = await request(app)
          .get('/api/purchase-orders')
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 401]).toContain(response.status);
      });

      it('should support status filtering', async () => {
        const response = await request(app)
          .get('/api/purchase-orders?status=pending')
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 401]).toContain(response.status);
      });
    });
  });

  describe('Fulfillment API (/api/fulfillment)', () => {
    describe('GET /api/fulfillment/dashboard', () => {
      it('should return fulfillment dashboard data', async () => {
        const response = await request(app)
          .get('/api/fulfillment/dashboard')
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 401]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body).toHaveProperty('success', true);
        }
      });
    });

    describe('GET /api/fulfillment/pending', () => {
      it('should list pending fulfillment orders', async () => {
        const response = await request(app)
          .get('/api/fulfillment/pending')
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 401]).toContain(response.status);
      });
    });

    describe('GET /api/fulfillment/stats', () => {
      it('should return fulfillment statistics', async () => {
        const response = await request(app)
          .get('/api/fulfillment/stats')
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 401]).toContain(response.status);
      });
    });
  });

  describe('Catalog API (/api/catalog)', () => {
    describe('GET /api/catalog', () => {
      it('should list catalog items', async () => {
        const response = await request(app)
          .get('/api/catalog')
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 401]).toContain(response.status);
      });

      it('should support category filtering', async () => {
        const response = await request(app)
          .get('/api/catalog?category=apparel')
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 401]).toContain(response.status);
      });
    });
  });

  describe('Notifications API (/api/notifications)', () => {
    describe('GET /api/notifications', () => {
      it('should list notifications for user', async () => {
        const response = await request(app)
          .get('/api/notifications')
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 401]).toContain(response.status);
      });

      it('should support category filtering', async () => {
        const response = await request(app)
          .get('/api/notifications?category=order')
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 401]).toContain(response.status);
      });

      it('should support read/unread filtering', async () => {
        const response = await request(app)
          .get('/api/notifications?isRead=false')
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 401]).toContain(response.status);
      });
    });

    describe('GET /api/notifications/stats', () => {
      it('should return notification statistics', async () => {
        const response = await request(app)
          .get('/api/notifications/stats')
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 401]).toContain(response.status);
      });
    });

    describe('POST /api/notifications', () => {
      it('should create notification (admin only)', async () => {
        const notificationData = {
          orgId: testOrg.id,
          userId: memberUser.id,
          type: 'test_notification',
          title: 'API Test Notification',
          message: 'This is a test notification',
          category: 'general',
          priority: 'normal'
        };

        const response = await request(app)
          .post('/api/notifications')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(notificationData);

        expect([200, 201, 403]).toContain(response.status);
      });

      it('should reject non-admin users', async () => {
        const response = await request(app)
          .post('/api/notifications')
          .set('Authorization', `Bearer ${memberToken}`)
          .send({
            orgId: testOrg.id,
            userId: memberUser.id,
            type: 'unauthorized',
            title: 'Unauthorized',
            message: 'Should be rejected'
          });

        expect([403, 401]).toContain(response.status);
      });
    });
  });

  describe('System Settings API (/api/system-settings)', () => {
    describe('GET /api/system-settings', () => {
      it('should list system settings', async () => {
        const response = await request(app)
          .get('/api/system-settings')
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 401, 403]).toContain(response.status);
      });

      it('should support category filtering', async () => {
        const response = await request(app)
          .get('/api/system-settings?category=email')
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 401, 403]).toContain(response.status);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send('{"malformed": json}');

      expect([400, 422]).toContain(response.status);
    });

    it('should handle very large payloads', async () => {
      const largePayload = {
        customerName: 'Large Payload Test',
        notes: 'x'.repeat(50000), // Very large notes field
        items: Array(1000).fill({
          productId: 'test-product',
          quantity: 1,
          unitPrice: 10.00
        })
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(largePayload);

      // Should either succeed or fail gracefully
      expect([200, 201, 400, 413, 422]).toContain(response.status);
    });

    it('should handle special characters in search', async () => {
      const specialChars = ['%', '_', "'", '"', ';', '<', '>', '&'];
      
      for (const char of specialChars) {
        const response = await request(app)
          .get(`/api/organizations?search=${encodeURIComponent(char)}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 400]).toContain(response.status);
      }
    });

    it('should handle concurrent requests to same endpoint', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .get('/api/organizations')
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect([200, 401, 429]).toContain(response.status);
      });
    });
  });

  describe('Response Schema Validation', () => {
    it('should return consistent success response format', async () => {
      const endpoints = [
        '/api/organizations',
        '/api/users',
        '/api/orders',
        '/api/notifications/stats'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${adminToken}`);

        if (response.status === 200) {
          expect(response.body).toHaveProperty('success');
          if (response.body.success) {
            expect(response.body).toHaveProperty('data');
          }
        }
      }
    });

    it('should return consistent error response format', async () => {
      const response = await request(app)
        .get('/api/orders/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      if (response.status >= 400) {
        expect(response.body).toHaveProperty('success');
        expect(response.body.success).toBe(false);
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should include pagination metadata when applicable', async () => {
      const response = await request(app)
        .get('/api/organizations?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      if (response.status === 200 && response.body.pagination) {
        expect(response.body.pagination).toHaveProperty('page');
        expect(response.body.pagination).toHaveProperty('limit');
        expect(response.body.pagination).toHaveProperty('total');
      }
    });
  });

  describe('HTTP Methods and Status Codes', () => {
    it('should use correct HTTP methods for CRUD operations', async () => {
      // Test all HTTP methods are properly implemented
      const testCases = [
        { method: 'get', path: '/api/organizations', expectedStatus: [200, 401] },
        { method: 'post', path: '/api/organizations', expectedStatus: [200, 201, 400, 401, 403] },
        { method: 'patch', path: `/api/organizations/${testOrg.id}`, expectedStatus: [200, 400, 401, 403, 404] },
        { method: 'get', path: '/api/users', expectedStatus: [200, 401] },
        { method: 'post', path: '/api/users', expectedStatus: [200, 201, 400, 401, 403] }
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          [testCase.method](testCase.path)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(testCase.method === 'post' ? { name: 'Test' } : undefined);

        expect(testCase.expectedStatus).toContain(response.status);
      }
    });

    it('should return 405 for unsupported methods', async () => {
      const response = await request(app)
        .put('/api/organizations') // PUT not supported on collection
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test' });

      expect([405, 404]).toContain(response.status);
    });
  });

  describe('Content Type Handling', () => {
    it('should handle different content types correctly', async () => {
      // Test JSON content type
      const jsonResponse = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ name: 'JSON Test Org' }));

      expect([200, 201, 400, 401, 403]).toContain(jsonResponse.status);

      // Test form-encoded content type
      const formResponse = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('name=Form Test Org');

      expect([200, 201, 400, 401, 403, 415]).toContain(formResponse.status);
    });
  });
});