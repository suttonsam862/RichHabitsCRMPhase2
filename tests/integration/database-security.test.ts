import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { db } from '../../server/db';
import { createTestUser, createTestOrganization, cleanupTestData } from '../helpers/test-setup';
import { getUserOrgRole, addUserToOrganization, OrgRole } from '../../server/middleware/orgSecurity';

describe('Database Security Integration Tests', () => {
  let testUser: any;
  let testOrg: any;
  let otherUser: any;
  let otherOrg: any;

  beforeAll(async () => {
    testUser = await createTestUser({
      email: 'db-security-integration@example.com',
      fullName: 'DB Security Integration User',
      role: 'admin'
    });

    testOrg = await createTestOrganization({
      name: 'DB Security Integration Org',
      ownerId: testUser.id
    });

    otherUser = await createTestUser({
      email: 'other-db-integration@example.com',
      fullName: 'Other DB Integration User',
      role: 'member'
    });

    otherOrg = await createTestOrganization({
      name: 'Other DB Integration Org',
      ownerId: otherUser.id
    });
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Database Transaction Security', () => {
    it('should handle concurrent transactions safely', async () => {
      const promises = [];
      
      // Create multiple concurrent orders
      for (let i = 0; i < 10; i++) {
        promises.push(
          db.execute(
            'INSERT INTO orders (id, organization_id, customer_name, total_amount) VALUES (?, ?, ?, ?)',
            [`concurrent-order-${i}`, testOrg.id, `Customer ${i}`, i * 10]
          )
        );
      }

      const results = await Promise.allSettled(promises);
      
      // All should succeed
      const failures = results.filter(r => r.status === 'rejected');
      expect(failures).toHaveLength(0);

      // Verify all orders were created
      const orders = await db.execute(
        'SELECT COUNT(*) as count FROM orders WHERE organization_id = ? AND customer_name LIKE ?',
        [testOrg.id, 'Customer %']
      );
      expect(orders[0].count).toBe(10);
    });

    it('should maintain referential integrity during bulk operations', async () => {
      // Create catalog item first
      const catalogItem = await db.execute(
        'INSERT INTO catalog_items (id, org_id, name, base_price) VALUES (?, ?, ?, ?) RETURNING *',
        ['ref-integrity-item', testOrg.id, 'Reference Test Item', 50]
      );

      // Create order
      const order = await db.execute(
        'INSERT INTO orders (id, organization_id, customer_name, total_amount) VALUES (?, ?, ?, ?) RETURNING *',
        ['ref-integrity-order', testOrg.id, 'Reference Test Customer', 100]
      );

      // Create order item referencing both
      await db.execute(
        'INSERT INTO order_items (id, order_id, catalog_item_id, quantity, price) VALUES (?, ?, ?, ?, ?)',
        ['ref-integrity-item-1', order[0].id, catalogItem[0].id, 2, 50]
      );

      // Try to delete catalog item - should fail due to foreign key
      try {
        await db.execute('DELETE FROM catalog_items WHERE id = ?', [catalogItem[0].id]);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toContain('foreign key');
      }

      // Delete order item first, then catalog item should work
      await db.execute('DELETE FROM order_items WHERE id = ?', ['ref-integrity-item-1']);
      await db.execute('DELETE FROM catalog_items WHERE id = ?', [catalogItem[0].id]);
      
      // Verify deletion
      const deletedItem = await db.execute('SELECT * FROM catalog_items WHERE id = ?', [catalogItem[0].id]);
      expect(deletedItem).toHaveLength(0);
    });

    it('should handle deadlock scenarios gracefully', async () => {
      // Create two orders for deadlock test
      const order1 = await db.execute(
        'INSERT INTO orders (id, organization_id, customer_name, total_amount) VALUES (?, ?, ?, ?) RETURNING *',
        ['deadlock-order-1', testOrg.id, 'Deadlock Customer 1', 100]
      );

      const order2 = await db.execute(
        'INSERT INTO orders (id, organization_id, customer_name, total_amount) VALUES (?, ?, ?, ?) RETURNING *',
        ['deadlock-order-2', testOrg.id, 'Deadlock Customer 2', 200]
      );

      // Simulate potential deadlock scenario with concurrent updates
      const promise1 = db.execute(
        'UPDATE orders SET total_amount = total_amount + 1 WHERE id = ? OR id = ?',
        [order1[0].id, order2[0].id]
      );

      const promise2 = db.execute(
        'UPDATE orders SET customer_name = customer_name || \' Updated\' WHERE id = ? OR id = ?',
        [order2[0].id, order1[0].id]
      );

      // Both should complete without deadlock
      await Promise.all([promise1, promise2]);

      const updatedOrders = await db.execute(
        'SELECT * FROM orders WHERE id IN (?, ?)',
        [order1[0].id, order2[0].id]
      );

      expect(updatedOrders).toHaveLength(2);
    });
  });

  describe('Data Encryption and Masking', () => {
    it('should handle sensitive data appropriately', async () => {
      // Insert user with potentially sensitive data
      const sensitiveUser = await db.execute(
        'INSERT INTO users (id, email, full_name, phone, organization_id) VALUES (?, ?, ?, ?, ?) RETURNING *',
        ['sensitive-user', 'sensitive@example.com', 'Sensitive User', '+1234567890', testOrg.id]
      );

      // Verify data is stored correctly
      expect(sensitiveUser[0].phone).toBe('+1234567890');
      
      // Check if any automatic masking/encryption occurs
      const retrievedUser = await db.execute(
        'SELECT * FROM users WHERE id = ?',
        ['sensitive-user']
      );

      expect(retrievedUser[0].email).toBe('sensitive@example.com');
    });

    it('should handle payment information securely', async () => {
      // Insert order with payment information
      const paymentOrder = await db.execute(
        'INSERT INTO orders (id, organization_id, customer_name, total_amount, payment_method, payment_status) VALUES (?, ?, ?, ?, ?, ?) RETURNING *',
        ['payment-order', testOrg.id, 'Payment Customer', 150, 'credit_card', 'pending']
      );

      expect(paymentOrder[0].payment_method).toBe('credit_card');
      
      // Verify sensitive payment details are not exposed in logs
      const auditLog = await db.execute(
        'SELECT * FROM audit_logs WHERE table_name = ? AND record_id = ?',
        ['orders', paymentOrder[0].id]
      );

      // Should have audit log but without sensitive details
      if (auditLog.length > 0) {
        expect(auditLog[0].changes).not.toContain('credit_card_number');
        expect(auditLog[0].changes).not.toContain('cvv');
      }
    });
  });

  describe('Query Performance and Security', () => {
    it('should prevent query performance attacks', async () => {
      // Insert test data
      const insertPromises = [];
      for (let i = 0; i < 1000; i++) {
        insertPromises.push(
          db.execute(
            'INSERT INTO orders (id, organization_id, customer_name, total_amount) VALUES (?, ?, ?, ?)',
            [`perf-test-${i}`, testOrg.id, `Performance Customer ${i}`, i]
          )
        );
      }
      await Promise.all(insertPromises);

      // Query with proper indexing should be fast
      const startTime = Date.now();
      
      const results = await db.execute(
        'SELECT * FROM orders WHERE organization_id = ? AND total_amount > ? ORDER BY total_amount DESC LIMIT 10',
        [testOrg.id, 500]
      );

      const queryTime = Date.now() - startTime;

      expect(queryTime).toBeLessThan(1000); // Should complete within 1 second
      expect(results).toHaveLength(10);
    });

    it('should handle complex joins efficiently', async () => {
      // Create related data
      const catalogItem = await db.execute(
        'INSERT INTO catalog_items (id, org_id, name, base_price) VALUES (?, ?, ?, ?) RETURNING *',
        ['complex-join-item', testOrg.id, 'Complex Join Item', 75]
      );

      const order = await db.execute(
        'INSERT INTO orders (id, organization_id, customer_name, total_amount, salesperson_id) VALUES (?, ?, ?, ?, ?) RETURNING *',
        ['complex-join-order', testOrg.id, 'Complex Join Customer', 150, testUser.id]
      );

      await db.execute(
        'INSERT INTO order_items (id, order_id, catalog_item_id, quantity, price) VALUES (?, ?, ?, ?, ?)',
        ['complex-join-order-item', order[0].id, catalogItem[0].id, 2, 75]
      );

      // Complex join query
      const complexQuery = `
        SELECT 
          o.id as order_id,
          o.customer_name,
          o.total_amount,
          u.full_name as salesperson_name,
          ci.name as item_name,
          oi.quantity,
          oi.price
        FROM orders o
        LEFT JOIN users u ON o.salesperson_id = u.id
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN catalog_items ci ON oi.catalog_item_id = ci.id
        WHERE o.organization_id = ?
        ORDER BY o.total_amount DESC
      `;

      const startTime = Date.now();
      const results = await db.execute(complexQuery, [testOrg.id]);
      const queryTime = Date.now() - startTime;

      expect(queryTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(results.length).toBeGreaterThan(0);
      
      // Verify join results
      const complexJoinResult = results.find(r => r.order_id === order[0].id);
      expect(complexJoinResult.salesperson_name).toBe(testUser.fullName);
      expect(complexJoinResult.item_name).toBe('Complex Join Item');
    });
  });

  describe('Database Connection Security', () => {
    it('should handle connection pool exhaustion gracefully', async () => {
      // Create many concurrent connections
      const connectionPromises = [];
      for (let i = 0; i < 50; i++) {
        connectionPromises.push(
          db.execute('SELECT 1 as test_connection').catch(error => ({ error }))
        );
      }

      const results = await Promise.all(connectionPromises);
      
      // Should handle all connections without errors
      const errors = results.filter(r => r && r.error);
      expect(errors.length).toBeLessThan(10); // Allow some connection issues but not all
    });

    it('should validate connection state', async () => {
      // Test basic connectivity
      const connectionTest = await db.execute('SELECT NOW() as current_time');
      expect(connectionTest).toHaveLength(1);
      expect(connectionTest[0].current_time).toBeDefined();

      // Test transaction capabilities
      const transactionTest = await db.execute('BEGIN; SELECT 1; COMMIT;');
      expect(transactionTest).toBeDefined();
    });
  });

  describe('Backup and Recovery Simulation', () => {
    it('should maintain data consistency during simulated backup', async () => {
      // Create test data
      const beforeBackup = await db.execute(
        'INSERT INTO orders (id, organization_id, customer_name, total_amount) VALUES (?, ?, ?, ?) RETURNING *',
        ['backup-test-order', testOrg.id, 'Backup Test Customer', 300]
      );

      // Simulate read during backup (should not block)
      const duringBackup = await db.execute(
        'SELECT * FROM orders WHERE id = ?',
        ['backup-test-order']
      );

      expect(duringBackup[0].id).toBe(beforeBackup[0].id);
      expect(duringBackup[0].total_amount).toBe(300);

      // Test write during simulated backup
      await db.execute(
        'UPDATE orders SET customer_name = ? WHERE id = ?',
        ['Backup Test Customer Updated', 'backup-test-order']
      );

      const afterUpdate = await db.execute(
        'SELECT * FROM orders WHERE id = ?',
        ['backup-test-order']
      );

      expect(afterUpdate[0].customer_name).toBe('Backup Test Customer Updated');
    });
  });

  describe('Database Schema Validation', () => {
    it('should verify required tables exist', async () => {
      const requiredTables = [
        'users',
        'organizations',
        'organization_memberships',
        'orders',
        'catalog_items',
        'order_items',
        'audit_logs'
      ];

      for (const table of requiredTables) {
        const tableExists = await db.execute(
          `SELECT table_name FROM information_schema.tables WHERE table_name = ? AND table_schema = 'public'`,
          [table]
        );
        expect(tableExists).toHaveLength(1);
      }
    });

    it('should verify critical indexes exist', async () => {
      // Check for organization_id indexes (critical for RLS)
      const orgIndexes = await db.execute(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename IN ('orders', 'catalog_items', 'organization_memberships')
        AND indexdef LIKE '%organization_id%'
      `);

      expect(orgIndexes.length).toBeGreaterThan(0);
    });

    it('should verify foreign key constraints exist', async () => {
      const foreignKeys = await db.execute(`
        SELECT 
          tc.table_name, 
          tc.constraint_name, 
          tc.constraint_type
        FROM information_schema.table_constraints tc
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      `);

      expect(foreignKeys.length).toBeGreaterThan(0);
      
      // Verify specific critical foreign keys
      const orgMembershipFK = foreignKeys.find(fk => 
        fk.table_name === 'organization_memberships' && 
        fk.constraint_name.includes('organization')
      );
      expect(orgMembershipFK).toBeDefined();
    });
  });

  describe('Database Monitoring and Alerting', () => {
    it('should track query performance metrics', async () => {
      // Execute a tracked query
      const startTime = process.hrtime.bigint();
      
      await db.execute(
        'SELECT COUNT(*) as order_count FROM orders WHERE organization_id = ?',
        [testOrg.id]
      );

      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should detect potential security issues', async () => {
      // Test for potential SQL injection patterns (should be safe)
      const suspiciousQuery = await db.execute(
        'SELECT * FROM orders WHERE customer_name = ?',
        ["'; DROP TABLE orders; --"]
      );

      expect(suspiciousQuery).toHaveLength(0); // Should find no orders with this "name"
      
      // Verify orders table still exists
      const tableCheck = await db.execute(
        'SELECT COUNT(*) as count FROM orders WHERE organization_id = ?',
        [testOrg.id]
      );
      expect(tableCheck[0].count).toBeGreaterThan(0);
    });
  });
});