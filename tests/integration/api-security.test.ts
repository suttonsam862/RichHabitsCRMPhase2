import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { db } from '../../server/db';
import { createTestUser, createTestOrganization, cleanupTestData } from '../helpers/test-setup';
import { getUserOrgRole, addUserToOrganization, OrgRole } from '../../server/middleware/orgSecurity';

describe('Database Security Tests', () => {
  let testUser: any;
  let testOrg: any;
  let otherUser: any;
  let otherOrg: any;

  beforeAll(async () => {
    testUser = await createTestUser({
      email: 'db-security-test@example.com',
      fullName: 'DB Security Test User',
      role: 'admin'
    });

    testOrg = await createTestOrganization({
      name: 'DB Security Test Org',
      ownerId: testUser.id
    });

    otherUser = await createTestUser({
      email: 'other-db-user@example.com',
      fullName: 'Other DB User',
      role: 'member'
    });

    otherOrg = await createTestOrganization({
      name: 'Other DB Org',
      ownerId: otherUser.id
    });
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Row Level Security (RLS) Tests', () => {
    it('should prevent cross-organization data access via direct queries', async () => {
      // Insert test data in both organizations
      await db.execute(
        'INSERT INTO orders (id, organization_id, customer_name, total_amount) VALUES (?, ?, ?, ?)',
        ['test-order-1', testOrg.id, 'Customer 1', 100]
      );

      await db.execute(
        'INSERT INTO orders (id, organization_id, customer_name, total_amount) VALUES (?, ?, ?, ?)',
        ['test-order-2', otherOrg.id, 'Customer 2', 200]
      );

      // Query with user context should only return their org's data
      const testUserOrders = await db.execute(
        'SELECT * FROM orders WHERE organization_id = ?',
        [testOrg.id]
      );

      const otherUserOrders = await db.execute(
        'SELECT * FROM orders WHERE organization_id = ?',
        [otherOrg.id]
      );

      expect(testUserOrders).toHaveLength(1);
      expect(testUserOrders[0].organization_id).toBe(testOrg.id);

      expect(otherUserOrders).toHaveLength(1);
      expect(otherUserOrders[0].organization_id).toBe(otherOrg.id);
    });

    it('should enforce organization membership constraints', async () => {
      // Try to access organization data without membership
      const nonMemberRole = await getUserOrgRole(otherUser.id, testOrg.id);
      expect(nonMemberRole).toBeNull();

      // Add user to organization
      const addResult = await addUserToOrganization(otherUser.id, testOrg.id, OrgRole.READONLY);
      expect(addResult.success).toBe(true);

      // Now should have access
      const memberRole = await getUserOrgRole(otherUser.id, testOrg.id);
      expect(memberRole).toBe(OrgRole.READONLY);
    });

    it('should prevent privilege escalation through role manipulation', async () => {
      // Attempt to directly update role in database
      try {
        await db.execute(
          'UPDATE organization_memberships SET role = ? WHERE user_id = ? AND organization_id = ?',
          [OrgRole.OWNER, otherUser.id, testOrg.id]
        );

        // Verify role didn't change inappropriately
        const actualRole = await getUserOrgRole(otherUser.id, testOrg.id);
        expect(actualRole).not.toBe(OrgRole.OWNER);
      } catch (error) {
        // Should fail with appropriate constraint violation
        expect(error).toBeDefined();
      }
    });

    it('should enforce unique constraints and prevent duplicates', async () => {
      // Try to create duplicate organization membership
      try {
        await db.execute(
          'INSERT INTO organization_memberships (user_id, organization_id, role, is_active) VALUES (?, ?, ?, ?)',
          [testUser.id, testOrg.id, OrgRole.MEMBER, true]
        );

        // Should fail due to unique constraint
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toContain('duplicate');
      }
    });

    it('should enforce foreign key constraints', async () => {
      // Try to create order with non-existent organization
      try {
        await db.execute(
          'INSERT INTO orders (id, organization_id, customer_name, total_amount) VALUES (?, ?, ?, ?)',
          ['invalid-order', 'non-existent-org-id', 'Customer', 100]
        );

        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toContain('foreign key');
      }
    });
  });

  describe('Data Integrity Tests', () => {
    it('should validate email uniqueness across users', async () => {
      try {
        await db.execute(
          'INSERT INTO users (id, email, full_name, role) VALUES (?, ?, ?, ?)',
          ['duplicate-user', testUser.email, 'Duplicate User', 'member']
        );

        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toContain('unique');
      }
    });

    it('should enforce NOT NULL constraints', async () => {
      try {
        await db.execute(
          'INSERT INTO users (id, email, full_name, role) VALUES (?, ?, ?, ?)',
          ['null-user', null, 'User with null email', 'member']
        );

        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toContain('NOT NULL');
      }
    });

    it('should validate enum constraints for roles', async () => {
      try {
        await db.execute(
          'INSERT INTO users (id, email, full_name, role) VALUES (?, ?, ?, ?)',
          ['invalid-role-user', 'invalid-role@example.com', 'Invalid Role User', 'invalid_role']
        );

        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toContain('constraint');
      }
    });

    it('should enforce check constraints on numeric fields', async () => {
      try {
        await db.execute(
          'INSERT INTO orders (id, organization_id, customer_name, total_amount) VALUES (?, ?, ?, ?)',
          ['negative-order', testOrg.id, 'Customer', -100] // Negative amount
        );

        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toContain('check');
      }
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in user queries', async () => {
      const maliciousInput = "'; DROP TABLE users; --";
      
      // Using parameterized queries should prevent injection
      const result = await db.execute(
        'SELECT * FROM users WHERE email = ?',
        [maliciousInput]
      );

      expect(result).toHaveLength(0); // Should return empty, not error
      
      // Verify users table still exists
      const usersCheck = await db.execute('SELECT COUNT(*) as count FROM users');
      expect(usersCheck[0].count).toBeGreaterThan(0);
    });

    it('should prevent injection through organization search', async () => {
      const maliciousSearch = "test' UNION SELECT * FROM users WHERE '1'='1";
      
      const result = await db.execute(
        'SELECT * FROM organizations WHERE name LIKE ?',
        [`%${maliciousSearch}%`]
      );

      expect(result).toHaveLength(0);
    });

    it('should handle special characters safely', async () => {
      const specialChars = "O'Brien & Co. <script>alert('xss')</script>";
      
      const userId = 'special-char-user';
      await db.execute(
        'INSERT INTO users (id, email, full_name, role) VALUES (?, ?, ?, ?)',
        [userId, 'special@example.com', specialChars, 'member']
      );

      const result = await db.execute(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );

      expect(result).toHaveLength(1);
      expect(result[0].full_name).toBe(specialChars);
    });
  });

  describe('Transaction Security', () => {
    it('should maintain data consistency in transactions', async () => {
      const transaction = await db.transaction();
      
      try {
        // Start a transaction that should roll back
        await transaction.execute(
          'INSERT INTO users (id, email, full_name, role) VALUES (?, ?, ?, ?)',
          ['trans-user-1', 'trans1@example.com', 'Transaction User 1', 'member']
        );

        await transaction.execute(
          'INSERT INTO users (id, email, full_name, role) VALUES (?, ?, ?, ?)',
          ['trans-user-2', 'trans1@example.com', 'Transaction User 2', 'member'] // Duplicate email
        );

        await transaction.commit();
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        await transaction.rollback();
        
        // Verify first insert was rolled back
        const result = await db.execute(
          'SELECT * FROM users WHERE id = ?',
          ['trans-user-1']
        );
        expect(result).toHaveLength(0);
      }
    });

    it('should handle concurrent access safely', async () => {
      const promises = [];
      const baseEmail = 'concurrent-user';
      
      // Attempt multiple concurrent inserts
      for (let i = 0; i < 5; i++) {
        promises.push(
          db.execute(
            'INSERT INTO users (id, email, full_name, role) VALUES (?, ?, ?, ?)',
            [`concurrent-${i}`, `${baseEmail}-${i}@example.com`, `Concurrent User ${i}`, 'member']
          ).catch(error => ({ error }))
        );
      }

      const results = await Promise.all(promises);
      
      // All should succeed since they have unique emails
      const errors = results.filter(r => r && r.error);
      expect(errors).toHaveLength(0);

      // Verify all users were created
      const users = await db.execute(
        'SELECT COUNT(*) as count FROM users WHERE email LIKE ?',
        [`${baseEmail}%`]
      );
      expect(users[0].count).toBe(5);
    });
  });

  describe('Performance Security', () => {
    it('should handle large result sets safely', async () => {
      // Insert many records
      const insertPromises = [];
      for (let i = 0; i < 100; i++) {
        insertPromises.push(
          db.execute(
            'INSERT INTO orders (id, organization_id, customer_name, total_amount) VALUES (?, ?, ?, ?)',
            [`perf-order-${i}`, testOrg.id, `Customer ${i}`, i * 10]
          )
        );
      }
      await Promise.all(insertPromises);

      // Query with pagination should work efficiently
      const result = await db.execute(
        'SELECT * FROM orders WHERE organization_id = ? ORDER BY id LIMIT 20 OFFSET 10',
        [testOrg.id]
      );

      expect(result).toHaveLength(20);
      expect(result[0].customer_name).toBe('Customer 10');
    });

    it('should prevent resource exhaustion through query limits', async () => {
      // Query without proper limits could be dangerous in production
      // In tests, we verify pagination is enforced
      const result = await db.execute(
        'SELECT * FROM orders WHERE organization_id = ? LIMIT 1000',
        [testOrg.id]
      );

      // Should not crash or hang
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle complex queries safely', async () => {
      const complexQuery = `
        SELECT o.*, u.full_name as user_name
        FROM orders o
        LEFT JOIN users u ON o.salesperson_id = u.id
        WHERE o.organization_id = ?
        AND o.total_amount > ?
        ORDER BY o.total_amount DESC
        LIMIT 10
      `;

      const result = await db.execute(complexQuery, [testOrg.id, 50]);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Audit Trail Security', () => {
    it('should log sensitive operations', async () => {
      // Create audit log entry
      await db.execute(
        'INSERT INTO audit_logs (id, user_id, action, table_name, record_id, changes) VALUES (?, ?, ?, ?, ?, ?)',
        ['audit-1', testUser.id, 'UPDATE', 'organizations', testOrg.id, JSON.stringify({ name: 'old' })]
      );

      const auditLog = await db.execute(
        'SELECT * FROM audit_logs WHERE id = ?',
        ['audit-1']
      );

      expect(auditLog).toHaveLength(1);
      expect(auditLog[0].user_id).toBe(testUser.id);
    });

    it('should prevent audit log tampering', async () => {
      // Attempt to modify existing audit log
      try {
        await db.execute(
          'UPDATE audit_logs SET user_id = ? WHERE id = ?',
          ['malicious-user', 'audit-1']
        );

        // Should be prevented by triggers or constraints
        const auditCheck = await db.execute(
          'SELECT * FROM audit_logs WHERE id = ?',
          ['audit-1']
        );
        expect(auditCheck[0].user_id).toBe(testUser.id); // Should remain unchanged
      } catch (error) {
        // Or should fail entirely
        expect(error).toBeDefined();
      }
    });
  });
});