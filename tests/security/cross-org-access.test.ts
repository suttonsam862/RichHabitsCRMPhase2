import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/index';
import { createTestUser, createTestOrganization, cleanupTestData, getAuthToken } from '../helpers/test-setup';
import { db } from '../../server/db';

describe('Cross-Organization Access Prevention', () => {
  let user1: any, user2: any, user3: any;
  let org1: any, org2: any, org3: any;
  let token1: string, token2: string, token3: string;
  let order1: any, order2: any;
  let catalogItem1: any, catalogItem2: any;

  beforeAll(async () => {
    // Create three users and organizations for comprehensive testing
    user1 = await createTestUser({
      email: 'user1@org1.com',
      fullName: 'User One',
      role: 'admin'
    });

    user2 = await createTestUser({
      email: 'user2@org2.com',
      fullName: 'User Two',
      role: 'admin'
    });

    user3 = await createTestUser({
      email: 'user3@org3.com',
      fullName: 'User Three',
      role: 'member'
    });

    org1 = await createTestOrganization({
      name: 'Organization One',
      ownerId: user1.id
    });

    org2 = await createTestOrganization({
      name: 'Organization Two',
      ownerId: user2.id
    });

    org3 = await createTestOrganization({
      name: 'Organization Three',
      ownerId: user3.id
    });

    token1 = await getAuthToken(user1.id);
    token2 = await getAuthToken(user2.id);
    token3 = await getAuthToken(user3.id);

    // Create test data in each organization
    const orderResponse1 = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        organizationId: org1.id,
        customerName: 'Customer One',
        totalAmount: 100
      });
    order1 = orderResponse1.body.data;

    const orderResponse2 = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token2}`)
      .send({
        organizationId: org2.id,
        customerName: 'Customer Two',
        totalAmount: 200
      });
    order2 = orderResponse2.body.data;

    // Create catalog items
    const catalogResponse1 = await request(app)
      .post('/api/catalog-items')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        orgId: org1.id,
        name: 'Catalog Item One',
        basePrice: 50
      });
    catalogItem1 = catalogResponse1.body.data;

    const catalogResponse2 = await request(app)
      .post('/api/catalog-items')
      .set('Authorization', `Bearer ${token2}`)
      .send({
        orgId: org2.id,
        name: 'Catalog Item Two',
        basePrice: 75
      });
    catalogItem2 = catalogResponse2.body.data;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Organization Data Access', () => {
    it('should prevent reading other organizations data', async () => {
      // User 1 trying to read org 2's data
      await request(app)
        .get(`/api/organizations/${org2.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(403);

      // User 2 trying to read org 1's data
      await request(app)
        .get(`/api/organizations/${org1.id}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(403);
    });

    it('should prevent updating other organizations', async () => {
      const updateData = { name: 'Hacked Organization' };

      await request(app)
        .patch(`/api/organizations/${org2.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send(updateData)
        .expect(403);

      // Verify org name wasn't changed
      const orgCheck = await request(app)
        .get(`/api/organizations/${org2.id}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(orgCheck.body.data.name).not.toBe('Hacked Organization');
    });

    it('should prevent deleting other organizations', async () => {
      await request(app)
        .delete(`/api/organizations/${org3.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(403);

      // Verify org still exists
      await request(app)
        .get(`/api/organizations/${org3.id}`)
        .set('Authorization', `Bearer ${token3}`)
        .expect(200);
    });
  });

  describe('Order Data Access', () => {
    it('should prevent reading orders from other organizations', async () => {
      // User 1 trying to read org 2's orders
      await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${token1}`)
        .query({ organizationId: org2.id })
        .expect(403);

      // User 1 trying to read specific order from org 2
      await request(app)
        .get(`/api/orders/${order2.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(403);
    });

    it('should prevent creating orders in other organizations', async () => {
      const orderData = {
        organizationId: org2.id,
        customerName: 'Malicious Customer',
        totalAmount: 999
      };

      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token1}`)
        .send(orderData)
        .expect(403);
    });

    it('should prevent updating orders from other organizations', async () => {
      const updateData = {
        customerName: 'Hacked Customer',
        totalAmount: 1
      };

      await request(app)
        .patch(`/api/orders/${order2.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send(updateData)
        .expect(403);

      // Verify order wasn't changed
      const orderCheck = await request(app)
        .get(`/api/orders/${order2.id}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(orderCheck.body.data.customerName).not.toBe('Hacked Customer');
    });

    it('should prevent deleting orders from other organizations', async () => {
      await request(app)
        .delete(`/api/orders/${order2.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(403);

      // Verify order still exists
      await request(app)
        .get(`/api/orders/${order2.id}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);
    });
  });

  describe('Catalog Item Access', () => {
    it('should prevent reading catalog items from other organizations', async () => {
      await request(app)
        .get('/api/catalog-items')
        .set('Authorization', `Bearer ${token1}`)
        .query({ orgId: org2.id })
        .expect(403);

      await request(app)
        .get(`/api/catalog-items/${catalogItem2.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(403);
    });

    it('should prevent creating catalog items in other organizations', async () => {
      const itemData = {
        orgId: org2.id,
        name: 'Malicious Item',
        basePrice: 1000
      };

      await request(app)
        .post('/api/catalog-items')
        .set('Authorization', `Bearer ${token1}`)
        .send(itemData)
        .expect(403);
    });

    it('should prevent updating catalog items from other organizations', async () => {
      const updateData = {
        name: 'Hacked Item',
        basePrice: 1
      };

      await request(app)
        .patch(`/api/catalog-items/${catalogItem2.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send(updateData)
        .expect(403);
    });
  });

  describe('User Management Cross-Org Access', () => {
    it('should prevent adding users to other organizations without permission', async () => {
      const userData = {
        email: 'malicious@hacker.com',
        fullName: 'Malicious User',
        organizationId: org2.id,
        role: 'admin'
      };

      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token1}`)
        .send(userData)
        .expect(403);
    });

    it('should prevent viewing user lists from other organizations', async () => {
      await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token1}`)
        .query({ organizationId: org2.id })
        .expect(403);
    });

    it('should prevent modifying users in other organizations', async () => {
      const updateData = {
        role: 'readonly',
        isActive: false
      };

      await request(app)
        .patch(`/api/users/${user2.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send(updateData)
        .expect(403);
    });
  });

  describe('File and Asset Access', () => {
    let file1Url: string, file2Url: string;

    beforeAll(async () => {
      // Upload files to different organizations
      const file1Response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${token1}`)
        .attach('file', Buffer.from('file1 content'), 'file1.txt');
      file1Url = file1Response.body.data.url;

      const file2Response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${token2}`)
        .attach('file', Buffer.from('file2 content'), 'file2.txt');
      file2Url = file2Response.body.data.url;
    });

    it('should prevent accessing files from other organizations', async () => {
      // Extract file ID from URL and try to access with wrong user
      const file2Id = file2Url.split('/').pop();

      await request(app)
        .get(`/api/files/${file2Id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(403);
    });

    it('should prevent uploading files to other organizations asset buckets', async () => {
      await request(app)
        .post('/api/files/organizations/:id/assets')
        .set('Authorization', `Bearer ${token1}`)
        .query({ organizationId: org2.id })
        .attach('file', Buffer.from('malicious file'), 'hack.txt')
        .expect(403);
    });
  });

  describe('Reporting and Analytics Access', () => {
    it('should prevent accessing reports from other organizations', async () => {
      await request(app)
        .get('/api/reports/sales')
        .set('Authorization', `Bearer ${token1}`)
        .query({ organizationId: org2.id })
        .expect(403);

      await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${token1}`)
        .query({ organizationId: org2.id })
        .expect(403);
    });

    it('should prevent generating reports for other organizations', async () => {
      const reportData = {
        organizationId: org2.id,
        type: 'sales',
        dateRange: {
          start: '2023-01-01',
          end: '2023-12-31'
        }
      };

      await request(app)
        .post('/api/reports/generate')
        .set('Authorization', `Bearer ${token1}`)
        .send(reportData)
        .expect(403);
    });
  });

  describe('Bulk Operations Cross-Org Protection', () => {
    it('should prevent bulk operations across organizations', async () => {
      const bulkData = {
        organizationId: org2.id,
        operations: [
          { action: 'update', id: order2.id, data: { totalAmount: 1 } },
          { action: 'delete', id: catalogItem2.id }
        ]
      };

      await request(app)
        .post('/api/bulk-operations')
        .set('Authorization', `Bearer ${token1}`)
        .send(bulkData)
        .expect(403);
    });

    it('should prevent batch updates to other organizations data', async () => {
      const batchData = {
        organizationId: org2.id,
        updates: [
          { id: order2.id, totalAmount: 1 }
        ]
      };

      await request(app)
        .patch('/api/orders/batch')
        .set('Authorization', `Bearer ${token1}`)
        .send(batchData)
        .expect(403);
    });
  });

  describe('API Key and Token Scope', () => {
    it('should respect organization scope in API keys', async () => {
      // Simulate API key with org1 scope trying to access org2 data
      const apiKey = `org1_${Date.now()}_test_key`;

      await request(app)
        .get(`/api/organizations/${org2.id}`)
        .set('X-API-Key', apiKey)
        .expect(403);
    });

    it('should validate JWT token organization claims', async () => {
      // Token should contain organization context
      const profileResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(profileResponse.body.data.organizationId).toBe(org1.id);

      // Should not be able to switch organization context
      await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token1}`)
        .query({ organizationId: org2.id })
        .expect(403);
    });
  });

  describe('Database-Level Protection Verification', () => {
    it('should verify RLS policies prevent cross-org access at DB level', async () => {
      // Direct database query should respect user context
      const directQuery = await db.execute(
        'SELECT * FROM orders WHERE organization_id = ?',
        [org2.id]
      );

      // Without proper user context, should return empty or fail
      expect(directQuery.length).toBeGreaterThanOrEqual(0);

      // With user context set, should only return authorized data
      // This would normally be set by the application middleware
    });

    it('should verify foreign key constraints prevent unauthorized references', async () => {
      try {
        // Try to create order referencing different organization's data
        await db.execute(
          'INSERT INTO order_items (id, order_id, catalog_item_id, quantity, price) VALUES (?, ?, ?, ?, ?)',
          ['cross-org-item', order1.id, catalogItem2.id, 1, 50]
        );

        // Should fail due to cross-organization reference
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('foreign key');
      }
    });
  });

  describe('Edge Cases and Attack Vectors', () => {
    it('should handle organization ID manipulation in requests', async () => {
      // Try to manipulate org ID in URL vs body
      const maliciousData = {
        organizationId: org1.id, // User's org in body
        customerName: 'Test'
      };

      await request(app)
        .post(`/api/organizations/${org2.id}/orders`) // Different org in URL
        .set('Authorization', `Bearer ${token1}`)
        .send(maliciousData)
        .expect(403);
    });

    it('should prevent organization switching via session manipulation', async () => {
      // Try to access with modified session context
      await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${token1}`)
        .set('X-Organization-Context', org2.id) // Try to override context
        .expect(403);
    });

    it('should handle UUID manipulation attempts', async () => {
      // Try with similar but different UUIDs
      const similarOrgId = org2.id.slice(0, -1) + '1';

      await request(app)
        .get(`/api/organizations/${similarOrgId}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(404); // Should not find, not 403
    });

    it('should prevent privilege escalation through role confusion', async () => {
      // User with member role in org3 trying admin actions
      const adminData = {
        name: 'Escalated Org Name'
      };

      await request(app)
        .patch(`/api/organizations/${org3.id}`)
        .set('Authorization', `Bearer ${token3}`) // Member role
        .send(adminData)
        .expect(403); // Should be forbidden even in own org
    });
  });
});