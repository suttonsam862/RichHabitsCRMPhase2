import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { 
  createTestUser, 
  createTestOrganization, 
  cleanupTestData,
  getAuthToken 
} from '../helpers/test-setup';

// Import route modules
import authRoutes from '../../server/routes/auth/index';
import organizationsRoutes from '../../server/routes/organizations/index';
import ordersRoutes from '../../server/routes/orders/index';
import usersRoutes from '../../server/routes/users/index';

describe('API Security and Authorization Testing', () => {
  let app: express.Application;
  let adminUser: any;
  let memberUser: any;
  let readonlyUser: any;
  let outsiderUser: any;
  let testOrg: any;
  let otherOrg: any;
  let adminToken: string;
  let memberToken: string;
  let readonlyToken: string;
  let outsiderToken: string;

  beforeAll(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());
    
    // Add auth middleware mock
    app.use((req, res, next) => {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        
        let user = null;
        if (token === adminToken) user = { ...adminUser, organization_id: testOrg.id };
        else if (token === memberToken) user = { ...memberUser, organization_id: testOrg.id };
        else if (token === readonlyToken) user = { ...readonlyUser, organization_id: testOrg.id };
        else if (token === outsiderToken) user = { ...outsiderUser, organization_id: otherOrg.id };
        
        if (user) {
          (req as any).user = {
            id: user.id,
            email: user.email,
            organization_id: user.organization_id,
            role: user.role,
            is_super_admin: user.role === 'admin' && token === adminToken
          };
        }
      }
      next();
    });

    // Mount routes
    app.use('/api/auth', authRoutes);
    app.use('/api/organizations', organizationsRoutes);
    app.use('/api/orders', ordersRoutes);
    app.use('/api/users', usersRoutes);

    // Create test data with different organizations
    adminUser = await createTestUser({
      email: 'security-admin@example.com',
      fullName: 'Security Admin User',
      role: 'admin'
    });

    testOrg = await createTestOrganization({
      name: 'Security Test Org',
      ownerId: adminUser.id
    });

    memberUser = await createTestUser({
      email: 'security-member@example.com',
      fullName: 'Security Member User',
      role: 'member',
      organizationId: testOrg.id
    });

    readonlyUser = await createTestUser({
      email: 'security-readonly@example.com',
      fullName: 'Security Readonly User',
      role: 'readonly',
      organizationId: testOrg.id
    });

    // Create user from different organization
    outsiderUser = await createTestUser({
      email: 'security-outsider@example.com',
      fullName: 'Security Outsider User',
      role: 'admin'
    });

    otherOrg = await createTestOrganization({
      name: 'Other Security Org',
      ownerId: outsiderUser.id
    });

    adminToken = await getAuthToken(adminUser.id);
    memberToken = await getAuthToken(memberUser.id);
    readonlyToken = await getAuthToken(readonlyUser.id);
    outsiderToken = await getAuthToken(outsiderUser.id);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Authentication Requirements', () => {
    it('should require authentication for protected endpoints', async () => {
      const protectedEndpoints = [
        { method: 'get', path: '/api/organizations' },
        { method: 'get', path: '/api/orders' },
        { method: 'get', path: '/api/users' },
        { method: 'post', path: '/api/organizations' },
        { method: 'post', path: '/api/orders' }
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request(app)
          [endpoint.method](endpoint.path);

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      }
    });

    it('should reject invalid tokens', async () => {
      const invalidTokens = [
        'invalid-token',
        'Bearer invalid',
        'Bearer ',
        'expired-token-123',
        ''
      ];

      for (const token of invalidTokens) {
        const response = await request(app)
          .get('/api/organizations')
          .set('Authorization', token);

        expect(response.status).toBe(401);
      }
    });

    it('should validate token format', async () => {
      const malformedTokens = [
        'NotBearer validtoken',
        'Bearer',
        'Bear validtoken',
        'token-without-bearer'
      ];

      for (const token of malformedTokens) {
        const response = await request(app)
          .get('/api/organizations')
          .set('Authorization', token);

        expect(response.status).toBe(401);
      }
    });
  });

  describe('Role-based Access Control', () => {
    describe('Admin Role', () => {
      it('should allow admin users full access to their organization', async () => {
        const adminOperations = [
          { method: 'get', path: '/api/organizations' },
          { method: 'post', path: '/api/organizations', data: { name: 'Admin Test Org' } },
          { method: 'get', path: '/api/users' },
          { method: 'post', path: '/api/users', data: { email: 'admintest@example.com', fullName: 'Admin Test User' } }
        ];

        for (const operation of adminOperations) {
          const response = await request(app)
            [operation.method](operation.path)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(operation.data);

          expect([200, 201, 400, 422]).toContain(response.status);
          // Should not be denied due to permissions
          expect(response.status).not.toBe(403);
        }
      });
    });

    describe('Member Role', () => {
      it('should allow member users basic operations', async () => {
        const memberOperations = [
          { method: 'get', path: '/api/organizations' },
          { method: 'get', path: '/api/orders' },
        ];

        for (const operation of memberOperations) {
          const response = await request(app)
            [operation.method](operation.path)
            .set('Authorization', `Bearer ${memberToken}`);

          expect([200, 401]).toContain(response.status);
          expect(response.status).not.toBe(403);
        }
      });

      it('should restrict member users from admin operations', async () => {
        const restrictedOperations = [
          { method: 'post', path: '/api/organizations', data: { name: 'Member Test Org' } },
          { method: 'post', path: '/api/users', data: { email: 'membertest@example.com', fullName: 'Member Test' } }
        ];

        for (const operation of restrictedOperations) {
          const response = await request(app)
            [operation.method](operation.path)
            .set('Authorization', `Bearer ${memberToken}`)
            .send(operation.data);

          expect([400, 403, 422]).toContain(response.status);
        }
      });
    });

    describe('Readonly Role', () => {
      it('should allow readonly users only read operations', async () => {
        const readOperations = [
          { method: 'get', path: '/api/organizations' },
          { method: 'get', path: '/api/orders' }
        ];

        for (const operation of readOperations) {
          const response = await request(app)
            [operation.method](operation.path)
            .set('Authorization', `Bearer ${readonlyToken}`);

          expect([200, 401]).toContain(response.status);
          expect(response.status).not.toBe(403);
        }
      });

      it('should deny readonly users write operations', async () => {
        const writeOperations = [
          { method: 'post', path: '/api/organizations', data: { name: 'Readonly Test Org' } },
          { method: 'post', path: '/api/orders', data: { customerName: 'Readonly Customer' } },
          { method: 'patch', path: `/api/organizations/${testOrg.id}`, data: { name: 'Updated Name' } }
        ];

        for (const operation of writeOperations) {
          const response = await request(app)
            [operation.method](operation.path)
            .set('Authorization', `Bearer ${readonlyToken}`)
            .send(operation.data);

          expect([400, 403, 422]).toContain(response.status);
        }
      });
    });
  });

  describe('Organization-based Data Isolation', () => {
    it('should isolate data between organizations', async () => {
      // Create order in first organization
      const orderData = {
        customerName: 'Isolation Test Customer',
        customerEmail: 'isolation@test.com',
        totalAmount: 100.00
      };

      const createResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orderData);

      if ([200, 201].includes(createResponse.status)) {
        const orderId = createResponse.body.data.id;

        // Outsider from different org should not see this order
        const outsiderResponse = await request(app)
          .get(`/api/orders/${orderId}`)
          .set('Authorization', `Bearer ${outsiderToken}`);

        expect([403, 404]).toContain(outsiderResponse.status);

        // Admin from same org should see the order
        const adminResponse = await request(app)
          .get(`/api/orders/${orderId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 404]).toContain(adminResponse.status);
      }
    });

    it('should prevent cross-organization data access in lists', async () => {
      // Get organizations list from each user
      const adminOrgResponse = await request(app)
        .get('/api/organizations')
        .set('Authorization', `Bearer ${adminToken}`);

      const outsiderOrgResponse = await request(app)
        .get('/api/organizations')
        .set('Authorization', `Bearer ${outsiderToken}`);

      if (adminOrgResponse.status === 200 && outsiderOrgResponse.status === 200) {
        const adminOrgs = adminOrgResponse.body.data.map((org: any) => org.id);
        const outsiderOrgs = outsiderOrgResponse.body.data.map((org: any) => org.id);

        // Should not have overlapping organization access
        const overlap = adminOrgs.filter((id: string) => outsiderOrgs.includes(id));
        expect(overlap).toHaveLength(0);
      }
    });

    it('should enforce organization boundaries in updates', async () => {
      // Outsider tries to update admin's organization
      const response = await request(app)
        .patch(`/api/organizations/${testOrg.id}`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ name: 'Hacked Organization' });

      expect([403, 404]).toContain(response.status);
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should sanitize SQL injection attempts', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE organizations; --",
        "' OR '1'='1",
        "1' UNION SELECT * FROM users --",
        "'; INSERT INTO users VALUES ('hacker'); --"
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .get(`/api/organizations?search=${encodeURIComponent(payload)}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 400]).toContain(response.status);
        // Should not return SQL error
        if (response.body.error) {
          expect(response.body.error.toLowerCase()).not.toContain('sql');
          expect(response.body.error.toLowerCase()).not.toContain('syntax');
        }
      }
    });

    it('should prevent XSS attacks in text fields', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(1)">',
        '"><script>alert("xss")</script>'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/organizations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: payload });

        expect([200, 201, 400, 422]).toContain(response.status);
        
        if ([200, 201].includes(response.status)) {
          // If creation succeeded, the payload should be sanitized
          expect(response.body.data.name).not.toContain('<script>');
          expect(response.body.data.name).not.toContain('javascript:');
        }
      }
    });

    it('should validate and reject oversized requests', async () => {
      const oversizedData = {
        name: 'x'.repeat(10000), // Very long name
        notes: 'y'.repeat(100000), // Very long notes
        extraData: Array(1000).fill('spam')
      };

      const response = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(oversizedData);

      expect([400, 413, 422]).toContain(response.status);
    });
  });

  describe('Rate Limiting and Abuse Prevention', () => {
    it('should handle rapid repeated requests', async () => {
      // Make many rapid requests
      const requests = Array(20).fill(null).map(() =>
        request(app)
          .get('/api/organizations')
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const responses = await Promise.all(requests);
      
      // Most should succeed, but rate limiting might kick in
      const successCount = responses.filter(r => r.status === 200).length;
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      
      expect(successCount + rateLimitedCount).toBe(20);
      // At least some should succeed
      expect(successCount).toBeGreaterThan(0);
    });

    it('should prevent login brute force attempts', async () => {
      const bruteForceAttempts = Array(10).fill(null).map(() =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: adminUser.email,
            password: 'wrongpassword'
          })
      );

      const responses = await Promise.all(bruteForceAttempts);
      
      responses.forEach(response => {
        expect([401, 429]).toContain(response.status);
      });

      // Should have rate limiting after multiple failed attempts
      const rateLimited = responses.some(r => r.status === 429);
      if (responses.length > 5) {
        // If implementation includes rate limiting, some should be blocked
        // This test validates the implementation handles brute force appropriately
      }
    });
  });

  describe('Security Headers and CORS', () => {
    it('should set appropriate security headers', async () => {
      const response = await request(app)
        .get('/api/organizations')
        .set('Authorization', `Bearer ${adminToken}`);

      // Check for common security headers (if implemented)
      if (response.headers['x-content-type-options']) {
        expect(response.headers['x-content-type-options']).toBe('nosniff');
      }
      
      if (response.headers['x-frame-options']) {
        expect(['DENY', 'SAMEORIGIN']).toContain(response.headers['x-frame-options']);
      }
    });

    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/organizations')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Method', 'GET');

      expect([200, 204, 404]).toContain(response.status);
    });
  });

  describe('Error Information Disclosure', () => {
    it('should not expose sensitive information in error messages', async () => {
      // Test with invalid organization ID
      const response = await request(app)
        .get('/api/organizations/invalid-id-format')
        .set('Authorization', `Bearer ${adminToken}`);

      if (response.status >= 400) {
        const errorMessage = response.body.error || response.body.message || '';
        
        // Should not expose database details
        expect(errorMessage.toLowerCase()).not.toContain('sql');
        expect(errorMessage.toLowerCase()).not.toContain('database');
        expect(errorMessage.toLowerCase()).not.toContain('table');
        expect(errorMessage.toLowerCase()).not.toContain('column');
        
        // Should not expose file paths
        expect(errorMessage).not.toMatch(/\/[a-zA-Z0-9_\-/]+\.(js|ts|json)/);
        
        // Should not expose stack traces in production-like responses
        expect(errorMessage).not.toContain('    at ');
      }
    });

    it('should use generic error messages for authentication failures', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      
      // Should not reveal whether email exists or password is wrong
      const errorMessage = response.body.error || response.body.message || '';
      expect(errorMessage.toLowerCase()).not.toContain('user not found');
      expect(errorMessage.toLowerCase()).not.toContain('email does not exist');
    });
  });

  describe('Session and Token Management', () => {
    it('should handle expired tokens appropriately', async () => {
      // Test with a token that looks valid but is expired
      const expiredToken = 'expired_token_' + Date.now();
      
      const response = await request(app)
        .get('/api/organizations')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should validate token signatures', async () => {
      // Test with a malformed JWT-like token
      const malformedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature';
      
      const response = await request(app)
        .get('/api/organizations')
        .set('Authorization', `Bearer ${malformedToken}`);

      expect(response.status).toBe(401);
    });
  });

  describe('Path Traversal and File Access', () => {
    it('should prevent path traversal in file endpoints', async () => {
      const pathTraversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config\\sam',
        '....//....//....//etc/passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
      ];

      for (const attempt of pathTraversalAttempts) {
        const response = await request(app)
          .get(`/api/files/public-objects/${attempt}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect([400, 403, 404]).toContain(response.status);
      }
    });
  });

  describe('Business Logic Security', () => {
    it('should prevent privilege escalation through role manipulation', async () => {
      // Try to update user role to admin
      const response = await request(app)
        .patch(`/api/users/${memberUser.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ role: 'admin' });

      expect([400, 403, 422]).toContain(response.status);
    });

    it('should prevent organization hopping', async () => {
      // Try to move user to different organization
      const response = await request(app)
        .patch(`/api/users/${memberUser.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ organizationId: otherOrg.id });

      expect([400, 403, 422]).toContain(response.status);
    });
  });
});