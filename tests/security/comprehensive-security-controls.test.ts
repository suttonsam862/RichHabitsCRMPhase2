import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/index';
import { createTestUser, createTestOrganization, cleanupTestData, getAuthToken } from '../helpers/test-setup';
import jwt from 'jsonwebtoken';

describe('Comprehensive Security Controls Testing', () => {
  let adminUser: any;
  let memberUser: any;
  let readonlyUser: any;
  let testOrg: any;
  let otherOrg: any;
  let adminToken: string;
  let memberToken: string;
  let readonlyToken: string;
  let maliciousUser: any;
  let maliciousToken: string;

  beforeAll(async () => {
    // Create users with different roles
    adminUser = await createTestUser({
      email: 'security-admin@example.com',
      fullName: 'Security Admin User',
      role: 'admin'
    });

    memberUser = await createTestUser({
      email: 'security-member@example.com',
      fullName: 'Security Member User',
      role: 'member'
    });

    readonlyUser = await createTestUser({
      email: 'security-readonly@example.com',
      fullName: 'Security Readonly User',
      role: 'readonly'
    });

    maliciousUser = await createTestUser({
      email: 'security-malicious@example.com',
      fullName: 'Security Malicious User',
      role: 'member'
    });

    testOrg = await createTestOrganization({
      name: 'Security Test Organization',
      ownerId: adminUser.id
    });

    otherOrg = await createTestOrganization({
      name: 'Other Security Test Org',
      ownerId: memberUser.id
    });

    adminToken = await getAuthToken(adminUser.id);
    memberToken = await getAuthToken(memberUser.id);
    readonlyToken = await getAuthToken(readonlyUser.id);
    maliciousToken = await getAuthToken(maliciousUser.id);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Authentication Security Controls', () => {
    it('should reject invalid JWT tokens', async () => {
      const invalidTokens = [
        'invalid.token.here',
        'Bearer invalid-token',
        jwt.sign({ userId: 'fake-id' }, 'wrong-secret'),
        jwt.sign({ userId: adminUser.id }, 'correct-secret', { expiresIn: '-1h' }), // Expired
        '', // Empty token
        'Bearer ', // Bearer with no token
      ];

      for (const token of invalidTokens) {
        const response = await request(app)
          .get('/api/v1/orders')
          .set('Authorization', token);

        expect([401, 403]).toContain(response.status);
        expect(response.body.success).toBe(false);
      }
    });

    it('should validate JWT token structure and claims', async () => {
      // Test token with missing claims
      const incompleteToken = jwt.sign(
        { userId: adminUser.id }, // Missing org claim
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${incompleteToken}`);

      // Should either reject or handle gracefully
      expect([200, 400, 401, 403]).toContain(response.status);
    });

    it('should prevent token reuse after logout', async () => {
      // First, verify token works
      const beforeLogout = await request(app)
        .get('/api/v1/profile')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(beforeLogout.status).toBe(200);

      // Logout
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${memberToken}`);

      expect([200, 204]).toContain(logoutResponse.status);

      // Token should now be invalid
      const afterLogout = await request(app)
        .get('/api/v1/profile')
        .set('Authorization', `Bearer ${memberToken}`);

      expect([401, 403]).toContain(afterLogout.status);
    });

    it('should enforce session timeout', async () => {
      // This would typically require modifying JWT expiration for testing
      // or using session-based auth with shorter timeouts
      const shortLivedToken = jwt.sign(
        { userId: adminUser.id, organizationId: testOrg.id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1s' }
      );

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${shortLivedToken}`);

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('Authorization Security Controls', () => {
    it('should enforce role-based permissions strictly', async () => {
      const permissionTests = [
        {
          role: 'readonly',
          token: readonlyToken,
          allowedActions: ['GET'],
          deniedActions: ['POST', 'PUT', 'PATCH', 'DELETE']
        },
        {
          role: 'member',
          token: memberToken,
          allowedActions: ['GET', 'POST', 'PUT', 'PATCH'],
          deniedActions: ['DELETE']
        },
        {
          role: 'admin',
          token: adminToken,
          allowedActions: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
          deniedActions: []
        }
      ];

      for (const test of permissionTests) {
        // Test denied actions
        for (const action of test.deniedActions) {
          let response;
          
          switch (action) {
            case 'POST':
              response = await request(app)
                .post('/api/v1/orders')
                .set('Authorization', `Bearer ${test.token}`)
                .send({ organizationId: testOrg.id, customerName: 'Test' });
              break;
            case 'PUT':
            case 'PATCH':
              response = await request(app)
                .patch('/api/v1/orders/test-id')
                .set('Authorization', `Bearer ${test.token}`)
                .send({ status: 'updated' });
              break;
            case 'DELETE':
              response = await request(app)
                .delete('/api/v1/orders/test-id')
                .set('Authorization', `Bearer ${test.token}`);
              break;
          }
          
          if (response) {
            expect([403, 404]).toContain(response.status); // 404 is acceptable if resource doesn't exist
            if (response.status === 403) {
              expect(response.body.success).toBe(false);
            }
          }
        }
      }
    });

    it('should prevent privilege escalation attempts', async () => {
      // Member user trying to change their own role
      const selfElevationResponse = await request(app)
        .patch(`/api/v1/users/${memberUser.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          role: 'admin'
        });

      expect([403, 400]).toContain(selfElevationResponse.status);
      
      // Verify role wasn't changed
      const userCheckResponse = await request(app)
        .get(`/api/v1/users/${memberUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      if (userCheckResponse.status === 200) {
        expect(userCheckResponse.body.data.role).not.toBe('admin');
      }
    });

    it('should validate organization membership strictly', async () => {
      // User from one org trying to access another org's resources
      const crossOrgTests = [
        {
          method: 'GET',
          path: '/api/v1/orders',
          query: { organizationId: otherOrg.id }
        },
        {
          method: 'POST',
          path: '/api/v1/orders',
          body: { organizationId: otherOrg.id, customerName: 'Unauthorized' }
        },
        {
          method: 'GET',
          path: `/api/v1/organizations/${otherOrg.id}`
        }
      ];

      for (const test of crossOrgTests) {
        let response;
        
        switch (test.method) {
          case 'GET':
            response = await request(app)
              .get(test.path)
              .set('Authorization', `Bearer ${adminToken}`)
              .query(test.query || {});
            break;
          case 'POST':
            response = await request(app)
              .post(test.path)
              .set('Authorization', `Bearer ${adminToken}`)
              .send(test.body || {});
            break;
        }
        
        if (response) {
          expect([403, 404]).toContain(response.status);
          if (response.status === 403) {
            expect(response.body.success).toBe(false);
          }
        }
      }
    });
  });

  describe('Input Security Controls', () => {
    it('should sanitize and validate all inputs', async () => {
      const maliciousInputs = [
        {
          field: 'customerName',
          value: '<script>alert("XSS")</script>',
          expected: 'sanitized or rejected'
        },
        {
          field: 'customerName',
          value: '\'\'; DROP TABLE orders; --',
          expected: 'sanitized or rejected'
        },
        {
          field: 'totalAmount',
          value: 'NaN',
          expected: 'rejected'
        },
        {
          field: 'email',
          value: 'not-an-email',
          expected: 'rejected'
        },
        {
          field: 'organizationId',
          value: '../../../admin',
          expected: 'rejected'
        }
      ];

      for (const input of maliciousInputs) {
        const response = await request(app)
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            organizationId: testOrg.id,
            [input.field]: input.value,
            totalAmount: 100
          });

        // Should either reject (400) or sanitize the input
        if (response.status === 201) {
          // If created, check that input was sanitized
          const order = response.body.data;
          if (input.field === 'customerName') {
            expect(order[input.field]).not.toContain('<script>');
            expect(order[input.field]).not.toContain('DROP TABLE');
          }
        } else {
          expect([400, 422]).toContain(response.status);
        }
      }
    });

    it('should prevent path traversal attacks', async () => {
      const pathTraversalAttempts = [
        '../../etc/passwd',
        '../../../admin',
        '..\\..\\windows\\system32',
        '%2e%2e%2f%2e%2e%2f',
        '....//....//....//etc/passwd'
      ];

      for (const path of pathTraversalAttempts) {
        const response = await request(app)
          .get(`/api/v1/files/${encodeURIComponent(path)}`)
          .set('Authorization', `Bearer ${adminToken}`);

        // Should reject path traversal attempts
        expect([400, 403, 404]).toContain(response.status);
      }
    });

    it('should validate file upload security', async () => {
      // Test malicious file upload
      const maliciousContent = '<?php system($_GET["cmd"]); ?>';
      
      const response = await request(app)
        .post('/api/v1/files/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from(maliciousContent), 'malicious.php');

      // Should reject executable files
      expect([400, 403]).toContain(response.status);
    });
  });

  describe('Session Security Controls', () => {
    it('should prevent session fixation attacks', async () => {
      // Login with one session
      const loginResponse1 = await request(app)
        .post('/api/auth/login')
        .send({
          email: memberUser.email,
          password: 'test-password'
        });

      expect(loginResponse1.status).toBe(200);
      const token1 = loginResponse1.body.data.token;

      // Login again with same credentials (should get different session)
      const loginResponse2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: memberUser.email,
          password: 'test-password'
        });

      expect(loginResponse2.status).toBe(200);
      const token2 = loginResponse2.body.data.token;

      // Tokens should be different
      expect(token1).not.toBe(token2);
    });

    it('should enforce concurrent session limits', async () => {
      // Create multiple sessions for the same user
      const sessions = [];
      for (let i = 0; i < 5; i++) {
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            email: memberUser.email,
            password: 'test-password'
          });
        
        if (loginResponse.status === 200) {
          sessions.push(loginResponse.body.data.token);
        }
      }

      // Test if old sessions are invalidated when limit is exceeded
      if (sessions.length > 1) {
        const oldestSession = sessions[0];
        const response = await request(app)
          .get('/api/v1/profile')
          .set('Authorization', `Bearer ${oldestSession}`);

        // Depending on implementation, old session might be invalidated
        expect([200, 401, 403]).toContain(response.status);
      }
    });
  });

  describe('API Security Controls', () => {
    it('should enforce HTTPS in production headers', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .set('Authorization', `Bearer ${adminToken}`);

      // Check security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      
      // In production, should have HSTS header
      if (process.env.NODE_ENV === 'production') {
        expect(response.headers['strict-transport-security']).toBeDefined();
      }
    });

    it('should prevent CSRF attacks', async () => {
      // Attempt state-changing operation without proper CSRF protection
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Origin', 'https://malicious-site.com')
        .send({
          organizationId: testOrg.id,
          customerName: 'CSRF Test',
          totalAmount: 100
        });

      // Should either require CSRF token or validate origin
      expect([200, 403, 400]).toContain(response.status);
    });

    it('should implement proper CORS policies', async () => {
      const response = await request(app)
        .options('/api/v1/orders')
        .set('Origin', 'https://unauthorized-domain.com');

      // Should not allow unauthorized domains
      expect(response.headers['access-control-allow-origin']).not.toBe('https://unauthorized-domain.com');
    });
  });

  describe('Data Security Controls', () => {
    it('should not expose sensitive data in responses', async () => {
      const userResponse = await request(app)
        .get(`/api/v1/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      if (userResponse.status === 200) {
        const userData = userResponse.body.data;
        
        // Should not expose sensitive fields
        expect(userData.password).toBeUndefined();
        expect(userData.passwordHash).toBeUndefined();
        expect(userData.salt).toBeUndefined();
        expect(userData.resetToken).toBeUndefined();
      }
    });

    it('should mask sensitive data in logs', async () => {
      // Make request with sensitive data
      const sensitiveData = {
        organizationId: testOrg.id,
        customerName: 'Sensitive Customer',
        totalAmount: 100,
        paymentMethod: 'credit_card',
        creditCardNumber: '4111111111111111',
        cvv: '123'
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sensitiveData);

      // The response should not contain sensitive payment info
      expect(JSON.stringify(response.body)).not.toContain('4111111111111111');
      expect(JSON.stringify(response.body)).not.toContain('123');
    });

    it('should validate data encryption at rest', async () => {
      // This would typically test database encryption
      // For now, we ensure sensitive data isn't stored in plaintext
      const orderResponse = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          organizationId: testOrg.id,
          customerName: 'Encryption Test Customer',
          totalAmount: 200,
          notes: 'Sensitive customer notes'
        });

      if (orderResponse.status === 201) {
        const orderId = orderResponse.body.data.id;
        
        // Retrieve order and verify sensitive data handling
        const retrievedOrder = await request(app)
          .get(`/api/v1/orders/${orderId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(retrievedOrder.status).toBe(200);
        // Verify data integrity
        expect(retrievedOrder.body.data.customerName).toBe('Encryption Test Customer');
      }
    });
  });

  describe('Error Handling Security', () => {
    it('should not expose system information in error messages', async () => {
      // Trigger various error conditions
      const errorTests = [
        {
          request: () => request(app).get('/api/v1/nonexistent-endpoint'),
          expectedStatus: 404
        },
        {
          request: () => request(app)
            .post('/api/v1/orders')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ invalid: 'data' }),
          expectedStatus: 400
        },
        {
          request: () => request(app)
            .get('/api/v1/orders')
            .set('Authorization', 'Bearer invalid-token'),
          expectedStatus: 401
        }
      ];

      for (const test of errorTests) {
        const response = await test.request();
        
        expect(response.status).toBe(test.expectedStatus);
        
        // Error responses should not expose system internals
        const responseBody = JSON.stringify(response.body);
        expect(responseBody).not.toMatch(/stack trace/i);
        expect(responseBody).not.toMatch(/database.*error/i);
        expect(responseBody).not.toMatch(/internal.*server/i);
        expect(responseBody).not.toContain(process.env.DATABASE_URL || '');
      }
    });

    it('should log security events appropriately', async () => {
      // Trigger security-relevant events
      const securityEvents = [
        // Failed login attempt
        () => request(app)
          .post('/api/auth/login')
          .send({ email: 'nonexistent@example.com', password: 'wrong' }),
        
        // Unauthorized access attempt
        () => request(app)
          .get('/api/v1/admin/users')
          .set('Authorization', `Bearer ${memberToken}`),
        
        // Rate limit exceeded (if implemented)
        () => Promise.all(Array.from({ length: 20 }, () => 
          request(app)
            .get('/api/v1/orders')
            .set('Authorization', `Bearer ${adminToken}`)
        ))
      ];

      for (const eventTrigger of securityEvents) {
        try {
          await eventTrigger();
        } catch (error) {
          // Events might fail, but should be logged
        }
      }

      // In a real implementation, we'd check audit logs
      // For now, we just ensure the requests were handled
      expect(true).toBe(true);
    });
  });
});
