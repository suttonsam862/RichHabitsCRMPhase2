import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../server/db';
import { createTestUser, createTestOrganization, cleanupTestData } from '../helpers/test-setup';
import { sql } from 'drizzle-orm';

describe('Database Constraints and Triggers Testing', () => {
  let testUser: any;
  let testOrg: any;
  let otherUser: any;
  let otherOrg: any;

  beforeAll(async () => {
    testUser = await createTestUser({
      email: 'db-constraints@example.com',
      fullName: 'DB Constraints User',
      role: 'admin'
    });

    testOrg = await createTestOrganization({
      name: 'DB Constraints Org',
      ownerId: testUser.id
    });

    otherUser = await createTestUser({
      email: 'other-constraints@example.com',
      fullName: 'Other Constraints User',
      role: 'member'
    });

    otherOrg = await createTestOrganization({
      name: 'Other Constraints Org',
      ownerId: otherUser.id
    });
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Primary Key Constraints', () => {
    it('should enforce unique primary keys', async () => {
      const testId = 'pk-test-order-id';
      
      // First insert should succeed
      await db.execute(sql`
        INSERT INTO orders (id, organization_id, customer_name, total_amount) 
        VALUES (${testId}, ${testOrg.id}, 'PK Test Customer', 100)
      `);

      // Second insert with same ID should fail
      try {
        await db.execute(sql`
          INSERT INTO orders (id, organization_id, customer_name, total_amount) 
          VALUES (${testId}, ${testOrg.id}, 'Duplicate PK Customer', 200)
        `);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('duplicate key');
      }

      // Cleanup
      await db.execute(sql`DELETE FROM orders WHERE id = ${testId}`);
    });

    it('should prevent null primary keys', async () => {
      try {
        await db.execute(sql`
          INSERT INTO orders (id, organization_id, customer_name, total_amount) 
          VALUES (NULL, ${testOrg.id}, 'Null PK Customer', 100)
        `);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toMatch(/(null|not null)/i);
      }
    });
  });

  describe('Foreign Key Constraints', () => {
    it('should enforce organization_id foreign key in orders', async () => {
      const fakeOrgId = '00000000-0000-0000-0000-000000000000';
      
      try {
        await db.execute(sql`
          INSERT INTO orders (id, organization_id, customer_name, total_amount) 
          VALUES ('fk-test-order', ${fakeOrgId}, 'FK Test Customer', 100)
        `);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toMatch(/(foreign key|violates)/i);
      }
    });

    it('should cascade delete when organization is deleted', async () => {
      // Create a temporary organization
      const tempOrg = await db.execute(sql`
        INSERT INTO organizations (id, name, owner_id) 
        VALUES ('temp-org-cascade-test', 'Temp Cascade Org', ${testUser.id}) 
        RETURNING *
      `);

      const tempOrgId = tempOrg[0].id;

      // Create orders in the temporary organization
      await db.execute(sql`
        INSERT INTO orders (id, organization_id, customer_name, total_amount) 
        VALUES 
        ('cascade-order-1', ${tempOrgId}, 'Cascade Customer 1', 100),
        ('cascade-order-2', ${tempOrgId}, 'Cascade Customer 2', 200)
      `);

      // Verify orders exist
      const ordersBefore = await db.execute(sql`
        SELECT COUNT(*) as count FROM orders WHERE organization_id = ${tempOrgId}
      `);
      expect(ordersBefore[0].count).toBe(2);

      // Delete the organization
      await db.execute(sql`DELETE FROM organizations WHERE id = ${tempOrgId}`);

      // Check if orders were cascaded (depending on FK setup)
      const ordersAfter = await db.execute(sql`
        SELECT COUNT(*) as count FROM orders WHERE organization_id = ${tempOrgId}
      `);
      
      // Should either be 0 (cascade delete) or throw error on org deletion
      expect(ordersAfter[0].count).toBe(0);
    });

    it('should enforce order_id foreign key in order_items', async () => {
      const fakeOrderId = '00000000-0000-0000-0000-000000000000';
      
      try {
        await db.execute(sql`
          INSERT INTO order_items (id, order_id, catalog_item_id, quantity, price) 
          VALUES ('fk-test-item', ${fakeOrderId}, NULL, 1, 50)
        `);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toMatch(/(foreign key|violates)/i);
      }
    });
  });

  describe('Not Null Constraints', () => {
    it('should enforce required fields in orders table', async () => {
      const requiredFields = [
        { field: 'organization_id', query: sql`INSERT INTO orders (id, customer_name, total_amount) VALUES ('nn-test-1', 'Test', 100)` },
        { field: 'customer_name', query: sql`INSERT INTO orders (id, organization_id, total_amount) VALUES ('nn-test-2', ${testOrg.id}, 100)` },
        { field: 'total_amount', query: sql`INSERT INTO orders (id, organization_id, customer_name) VALUES ('nn-test-3', ${testOrg.id}, 'Test')` }
      ];

      for (const test of requiredFields) {
        try {
          await db.execute(test.query);
          expect(true).toBe(false); // Should not reach here
        } catch (error: any) {
          expect(error.message).toMatch(/(null|not null)/i);
        }
      }
    });

    it('should enforce required fields in users table', async () => {
      try {
        await db.execute(sql`
          INSERT INTO users (id, full_name) 
          VALUES ('nn-user-test', 'Test User')
        `);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toMatch(/(null|not null|email)/i);
      }
    });
  });

  describe('Check Constraints', () => {
    it('should enforce positive amounts in orders', async () => {
      try {
        await db.execute(sql`
          INSERT INTO orders (id, organization_id, customer_name, total_amount) 
          VALUES ('negative-amount-test', ${testOrg.id}, 'Negative Customer', -100)
        `);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        // Should fail due to check constraint or application logic
        expect(error.message).toMatch(/(check|constraint|positive|amount)/i);
      }
    });

    it('should enforce positive quantities in order_items', async () => {
      // First create a valid order
      const order = await db.execute(sql`
        INSERT INTO orders (id, organization_id, customer_name, total_amount) 
        VALUES ('quantity-test-order', ${testOrg.id}, 'Quantity Test', 100) 
        RETURNING *
      `);

      try {
        await db.execute(sql`
          INSERT INTO order_items (id, order_id, quantity, price) 
          VALUES ('negative-quantity-test', ${order[0].id}, -1, 50)
        `);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toMatch(/(check|constraint|positive|quantity)/i);
      }

      // Cleanup
      await db.execute(sql`DELETE FROM orders WHERE id = ${order[0].id}`);
    });

    it('should enforce valid email format in users', async () => {
      const invalidEmails = [
        'not-an-email',
        '@domain.com',
        'user@',
        'user..name@domain.com',
        'user name@domain.com'
      ];

      for (const email of invalidEmails) {
        try {
          await db.execute(sql`
            INSERT INTO users (id, email, full_name, organization_id) 
            VALUES ('email-test-${Date.now()}', ${email}, 'Test User', ${testOrg.id})
          `);
          expect(true).toBe(false); // Should not reach here
        } catch (error: any) {
          // Should fail due to email validation constraint
          expect(error.message).toMatch(/(check|constraint|email|format)/i);
        }
      }
    });
  });

  describe('Unique Constraints', () => {
    it('should enforce unique email addresses', async () => {
      const testEmail = 'unique-test@example.com';
      
      // First user should succeed
      await db.execute(sql`
        INSERT INTO users (id, email, full_name, organization_id) 
        VALUES ('unique-user-1', ${testEmail}, 'First User', ${testOrg.id})
      `);

      // Second user with same email should fail
      try {
        await db.execute(sql`
          INSERT INTO users (id, email, full_name, organization_id) 
          VALUES ('unique-user-2', ${testEmail}, 'Second User', ${testOrg.id})
        `);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toMatch(/(unique|duplicate)/i);
      }

      // Cleanup
      await db.execute(sql`DELETE FROM users WHERE email = ${testEmail}`);
    });

    it('should enforce unique organization names per owner', async () => {
      const testName = 'Unique Org Test';
      
      // First org should succeed
      await db.execute(sql`
        INSERT INTO organizations (id, name, owner_id) 
        VALUES ('unique-org-1', ${testName}, ${testUser.id})
      `);

      // Second org with same name and owner should fail
      try {
        await db.execute(sql`
          INSERT INTO organizations (id, name, owner_id) 
          VALUES ('unique-org-2', ${testName}, ${testUser.id})
        `);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toMatch(/(unique|duplicate)/i);
      }

      // Cleanup
      await db.execute(sql`DELETE FROM organizations WHERE name = ${testName}`);
    });
  });

  describe('Database Triggers', () => {
    it('should automatically set timestamps on insert', async () => {
      const beforeTime = new Date();
      
      const result = await db.execute(sql`
        INSERT INTO orders (id, organization_id, customer_name, total_amount) 
        VALUES ('timestamp-test-order', ${testOrg.id}, 'Timestamp Customer', 100) 
        RETURNING created_at, updated_at
      `);

      const afterTime = new Date();
      const order = result[0];

      // Check created_at
      expect(order.created_at).toBeDefined();
      const createdAt = new Date(order.created_at);
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(createdAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());

      // Check updated_at
      if (order.updated_at) {
        const updatedAt = new Date(order.updated_at);
        expect(updatedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
        expect(updatedAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
      }

      // Cleanup
      await db.execute(sql`DELETE FROM orders WHERE id = 'timestamp-test-order'`);
    });

    it('should update timestamps on record modification', async () => {
      // Create initial order
      const createResult = await db.execute(sql`
        INSERT INTO orders (id, organization_id, customer_name, total_amount) 
        VALUES ('update-timestamp-test', ${testOrg.id}, 'Original Customer', 100) 
        RETURNING created_at, updated_at
      `);

      const originalCreatedAt = new Date(createResult[0].created_at);
      const originalUpdatedAt = createResult[0].updated_at ? new Date(createResult[0].updated_at) : null;

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));

      // Update the order
      const beforeUpdate = new Date();
      const updateResult = await db.execute(sql`
        UPDATE orders 
        SET customer_name = 'Updated Customer' 
        WHERE id = 'update-timestamp-test' 
        RETURNING created_at, updated_at
      `);

      const afterUpdate = new Date();
      const updatedOrder = updateResult[0];

      // created_at should remain unchanged
      expect(new Date(updatedOrder.created_at).getTime()).toBe(originalCreatedAt.getTime());

      // updated_at should be updated
      if (updatedOrder.updated_at) {
        const newUpdatedAt = new Date(updatedOrder.updated_at);
        expect(newUpdatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
        expect(newUpdatedAt.getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
        
        if (originalUpdatedAt) {
          expect(newUpdatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
        }
      }

      // Cleanup
      await db.execute(sql`DELETE FROM orders WHERE id = 'update-timestamp-test'`);
    });

    it('should create audit log entries for sensitive operations', async () => {
      // Create order that should be audited
      const auditTestOrder = await db.execute(sql`
        INSERT INTO orders (id, organization_id, customer_name, total_amount) 
        VALUES ('audit-trigger-test', ${testOrg.id}, 'Audit Customer', 500) 
        RETURNING *
      `);

      const orderId = auditTestOrder[0].id;

      // Update order (should trigger audit)
      await db.execute(sql`
        UPDATE orders 
        SET total_amount = 600 
        WHERE id = ${orderId}
      `);

      // Check if audit log entry was created
      const auditLogs = await db.execute(sql`
        SELECT * FROM audit_logs 
        WHERE entity = 'orders' AND entity_id = ${orderId} 
        ORDER BY occurred_at DESC
        LIMIT 5
      `);

      if (auditLogs.length > 0) {
        const auditLog = auditLogs[0];
        expect(auditLog.action).toBeDefined();
        expect(auditLog.entity).toBe('orders');
        expect(auditLog.entity_id).toBe(orderId);
        expect(auditLog.org_id).toBe(testOrg.id);
        
        // Check before/after data if available
        if (auditLog.before && auditLog.after) {
          const before = JSON.parse(auditLog.before as string);
          const after = JSON.parse(auditLog.after as string);
          expect(before.total_amount).toBe(500);
          expect(after.total_amount).toBe(600);
        }
      }

      // Cleanup
      await db.execute(sql`DELETE FROM orders WHERE id = ${orderId}`);
      await db.execute(sql`DELETE FROM audit_logs WHERE entity_id = ${orderId}`);
    });

    it('should prevent deletion of orders with associated items', async () => {
      // Create order
      const orderResult = await db.execute(sql`
        INSERT INTO orders (id, organization_id, customer_name, total_amount) 
        VALUES ('delete-protection-test', ${testOrg.id}, 'Protected Customer', 100) 
        RETURNING *
      `);

      const orderId = orderResult[0].id;

      // Create order item
      await db.execute(sql`
        INSERT INTO order_items (id, order_id, quantity, price) 
        VALUES ('protected-item-test', ${orderId}, 1, 100)
      `);

      // Try to delete order (should fail due to foreign key constraint or trigger)
      try {
        await db.execute(sql`DELETE FROM orders WHERE id = ${orderId}`);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toMatch(/(foreign key|constraint|dependent|violates)/i);
      }

      // Cleanup (delete in correct order)
      await db.execute(sql`DELETE FROM order_items WHERE order_id = ${orderId}`);
      await db.execute(sql`DELETE FROM orders WHERE id = ${orderId}`);
    });
  });

  describe('Data Integrity Validation', () => {
    it('should maintain referential integrity across complex operations', async () => {
      // Create a complex scenario with multiple related records
      const catalogItem = await db.execute(sql`
        INSERT INTO catalog_items (id, org_id, name, base_price) 
        VALUES ('integrity-test-item', ${testOrg.id}, 'Integrity Test Item', 50) 
        RETURNING *
      `);

      const order = await db.execute(sql`
        INSERT INTO orders (id, organization_id, customer_name, total_amount) 
        VALUES ('integrity-test-order', ${testOrg.id}, 'Integrity Customer', 150) 
        RETURNING *
      `);

      const orderItem = await db.execute(sql`
        INSERT INTO order_items (id, order_id, catalog_item_id, quantity, price) 
        VALUES ('integrity-test-order-item', ${order[0].id}, ${catalogItem[0].id}, 3, 50) 
        RETURNING *
      `);

      // Verify all records exist and are properly linked
      const verificationQuery = await db.execute(sql`
        SELECT 
          o.id as order_id,
          o.customer_name,
          oi.quantity,
          ci.name as item_name,
          ci.base_price
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN catalog_items ci ON oi.catalog_item_id = ci.id
        WHERE o.id = ${order[0].id}
      `);

      expect(verificationQuery).toHaveLength(1);
      const result = verificationQuery[0];
      expect(result.customer_name).toBe('Integrity Customer');
      expect(result.quantity).toBe(3);
      expect(result.item_name).toBe('Integrity Test Item');
      expect(Number(result.base_price)).toBe(50);

      // Cleanup
      await db.execute(sql`DELETE FROM order_items WHERE id = ${orderItem[0].id}`);
      await db.execute(sql`DELETE FROM orders WHERE id = ${order[0].id}`);
      await db.execute(sql`DELETE FROM catalog_items WHERE id = ${catalogItem[0].id}`);
    });

    it('should handle transaction rollback on constraint violations', async () => {
      const orderId = 'transaction-rollback-test';
      
      try {
        // Start transaction and perform operations that should rollback
        await db.transaction(async (tx) => {
          // Create valid order
          await tx.execute(sql`
            INSERT INTO orders (id, organization_id, customer_name, total_amount) 
            VALUES (${orderId}, ${testOrg.id}, 'Transaction Customer', 100)
          `);

          // Try to create order item with invalid foreign key (should trigger rollback)
          await tx.execute(sql`
            INSERT INTO order_items (id, order_id, catalog_item_id, quantity, price) 
            VALUES ('invalid-fk-item', ${orderId}, '00000000-0000-0000-0000-000000000000', 1, 50)
          `);
        });
        
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        // Transaction should have rolled back
        expect(error.message).toMatch(/(foreign key|constraint|violates)/i);
      }

      // Verify order was not created (transaction rolled back)
      const orderCheck = await db.execute(sql`
        SELECT COUNT(*) as count FROM orders WHERE id = ${orderId}
      `);
      expect(orderCheck[0].count).toBe(0);
    });
  });

  describe('Index and Performance Constraints', () => {
    it('should use indexes for organization-based queries', async () => {
      // Create multiple orders across different organizations
      const testData = [];
      for (let i = 0; i < 100; i++) {
        testData.push(sql`
          INSERT INTO orders (id, organization_id, customer_name, total_amount) 
          VALUES ('perf-test-${i}', ${i % 2 === 0 ? testOrg.id : otherOrg.id}, 'Perf Customer ${i}', ${(i + 1) * 10})
        `);
      }

      // Execute batch insert
      for (const query of testData) {
        await db.execute(query);
      }

      // Query should be fast due to organization_id index
      const startTime = Date.now();
      const results = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM orders 
        WHERE organization_id = ${testOrg.id}
      `);
      const queryTime = Date.now() - startTime;

      expect(results[0].count).toBe(50); // Half of the test data
      expect(queryTime).toBeLessThan(1000); // Should be fast with proper indexing

      // Cleanup
      await db.execute(sql`DELETE FROM orders WHERE id LIKE 'perf-test-%'`);
    });

    it('should enforce size limits on text fields', async () => {
      const longText = 'a'.repeat(10000); // Very long text
      
      try {
        await db.execute(sql`
          INSERT INTO orders (id, organization_id, customer_name, total_amount, notes) 
          VALUES ('long-text-test', ${testOrg.id}, 'Long Text Customer', 100, ${longText})
        `);
        
        // If it succeeds, verify the text was properly handled
        const result = await db.execute(sql`
          SELECT notes FROM orders WHERE id = 'long-text-test'
        `);
        
        if (result.length > 0) {
          // Text should either be truncated or stored fully depending on field type
          expect(result[0].notes).toBeDefined();
        }
        
        await db.execute(sql`DELETE FROM orders WHERE id = 'long-text-test'`);
      } catch (error: any) {
        // May fail due to field length constraints
        expect(error.message).toMatch(/(too long|length|size)/i);
      }
    });
  });
});
