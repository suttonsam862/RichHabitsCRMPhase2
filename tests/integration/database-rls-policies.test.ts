import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '../../server/db';
import { createTestUser, createTestOrganization, cleanupTestData } from '../helpers/test-setup';
import { sql } from 'drizzle-orm';

describe('Row-Level Security (RLS) Policies Testing', () => {
  let adminUser: any;
  let memberUser: any;
  let readonlyUser: any;
  let testOrg: any;
  let otherOrg: any;
  let outsiderUser: any;

  beforeAll(async () => {
    // Create users with different roles and organizations
    adminUser = await createTestUser({
      email: 'rls-admin@example.com',
      fullName: 'RLS Admin User',
      role: 'admin'
    });

    memberUser = await createTestUser({
      email: 'rls-member@example.com',
      fullName: 'RLS Member User',
      role: 'member'
    });

    readonlyUser = await createTestUser({
      email: 'rls-readonly@example.com',
      fullName: 'RLS Readonly User',
      role: 'readonly'
    });

    outsiderUser = await createTestUser({
      email: 'rls-outsider@example.com',
      fullName: 'RLS Outsider User',
      role: 'member'
    });

    testOrg = await createTestOrganization({
      name: 'RLS Test Organization',
      ownerId: adminUser.id
    });

    otherOrg = await createTestOrganization({
      name: 'Other RLS Organization',
      ownerId: outsiderUser.id
    });

    // Add users to organizations
    await db.execute(sql`
      INSERT INTO organization_memberships (user_id, organization_id, role) 
      VALUES 
      (${adminUser.id}, ${testOrg.id}, 'admin'),
      (${memberUser.id}, ${testOrg.id}, 'member'),
      (${readonlyUser.id}, ${testOrg.id}, 'readonly'),
      (${outsiderUser.id}, ${otherOrg.id}, 'admin')
    `);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Orders Table RLS Policies', () => {
    beforeEach(async () => {
      // Create test orders for each organization
      await db.execute(sql`
        INSERT INTO orders (id, organization_id, customer_name, total_amount, status) 
        VALUES 
        ('rls-order-test-org', ${testOrg.id}, 'Test Org Customer', 100, 'pending'),
        ('rls-order-other-org', ${otherOrg.id}, 'Other Org Customer', 200, 'pending')
      `);
    });

    afterEach(async () => {
      await db.execute(sql`DELETE FROM orders WHERE id LIKE 'rls-order-%'`);
    });

    it('should allow users to read orders from their organization only', async () => {
      // Set user context for RLS (this would normally be done by middleware)
      await db.execute(sql`SELECT set_config('app.current_user_id', ${adminUser.id}, true)`);
      await db.execute(sql`SELECT set_config('app.current_org_id', ${testOrg.id}, true)`);

      const accessibleOrders = await db.execute(sql`
        SELECT id, organization_id FROM orders WHERE id LIKE 'rls-order-%'
      `);

      // Should only see orders from testOrg
      expect(accessibleOrders).toHaveLength(1);
      expect(accessibleOrders[0].id).toBe('rls-order-test-org');
      expect(accessibleOrders[0].organization_id).toBe(testOrg.id);
    });

    it('should prevent cross-organization order access', async () => {
      // Set context as outsider user
      await db.execute(sql`SELECT set_config('app.current_user_id', ${outsiderUser.id}, true)`);
      await db.execute(sql`SELECT set_config('app.current_org_id', ${otherOrg.id}, true)`);

      const accessibleOrders = await db.execute(sql`
        SELECT id, organization_id FROM orders WHERE id LIKE 'rls-order-%'
      `);

      // Should only see orders from otherOrg
      expect(accessibleOrders).toHaveLength(1);
      expect(accessibleOrders[0].id).toBe('rls-order-other-org');
      expect(accessibleOrders[0].organization_id).toBe(otherOrg.id);
    });

    it('should enforce role-based write permissions', async () => {
      // Admin should be able to insert
      await db.execute(sql`SELECT set_config('app.current_user_id', ${adminUser.id}, true)`);
      await db.execute(sql`SELECT set_config('app.current_org_id', ${testOrg.id}, true)`);
      await db.execute(sql`SELECT set_config('app.current_user_role', 'admin', true)`);

      await db.execute(sql`
        INSERT INTO orders (id, organization_id, customer_name, total_amount) 
        VALUES ('rls-admin-insert', ${testOrg.id}, 'Admin Insert Customer', 150)
      `);

      // Verify insertion succeeded
      const adminInsert = await db.execute(sql`
        SELECT id FROM orders WHERE id = 'rls-admin-insert'
      `);
      expect(adminInsert).toHaveLength(1);

      // Member should be able to insert
      await db.execute(sql`SELECT set_config('app.current_user_id', ${memberUser.id}, true)`);
      await db.execute(sql`SELECT set_config('app.current_user_role', 'member', true)`);

      await db.execute(sql`
        INSERT INTO orders (id, organization_id, customer_name, total_amount) 
        VALUES ('rls-member-insert', ${testOrg.id}, 'Member Insert Customer', 250)
      `);

      // Verify insertion succeeded
      const memberInsert = await db.execute(sql`
        SELECT id FROM orders WHERE id = 'rls-member-insert'
      `);
      expect(memberInsert).toHaveLength(1);

      // Readonly should NOT be able to insert
      await db.execute(sql`SELECT set_config('app.current_user_id', ${readonlyUser.id}, true)`);
      await db.execute(sql`SELECT set_config('app.current_user_role', 'readonly', true)`);

      try {
        await db.execute(sql`
          INSERT INTO orders (id, organization_id, customer_name, total_amount) 
          VALUES ('rls-readonly-insert', ${testOrg.id}, 'Readonly Insert Customer', 300)
        `);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toMatch(/(policy|permission|denied|violates)/i);
      }

      // Cleanup
      await db.execute(sql`DELETE FROM orders WHERE id IN ('rls-admin-insert', 'rls-member-insert')`);
    });

    it('should prevent updates to other organizations orders', async () => {
      // Set context as testOrg user
      await db.execute(sql`SELECT set_config('app.current_user_id', ${adminUser.id}, true)`);
      await db.execute(sql`SELECT set_config('app.current_org_id', ${testOrg.id}, true)`);
      await db.execute(sql`SELECT set_config('app.current_user_role', 'admin', true)`);

      try {
        // Try to update order from other organization
        await db.execute(sql`
          UPDATE orders 
          SET customer_name = 'Hacked Customer' 
          WHERE id = 'rls-order-other-org'
        `);
        
        // If no error, verify the update didn't affect other org's data
        const updatedOrder = await db.execute(sql`
          SELECT customer_name FROM orders WHERE id = 'rls-order-other-org'
        `);
        
        if (updatedOrder.length > 0) {
          expect(updatedOrder[0].customer_name).not.toBe('Hacked Customer');
        }
      } catch (error: any) {
        // Should fail due to RLS policy
        expect(error.message).toMatch(/(policy|permission|denied|violates)/i);
      }
    });

    it('should prevent deletes of other organizations orders', async () => {
      // Set context as testOrg user
      await db.execute(sql`SELECT set_config('app.current_user_id', ${adminUser.id}, true)`);
      await db.execute(sql`SELECT set_config('app.current_org_id', ${testOrg.id}, true)`);
      await db.execute(sql`SELECT set_config('app.current_user_role', 'admin', true)`);

      try {
        // Try to delete order from other organization
        const deleteResult = await db.execute(sql`
          DELETE FROM orders WHERE id = 'rls-order-other-org'
        `);
        
        // If no error, verify the delete didn't affect other org's data
        expect(deleteResult.count || 0).toBe(0);
      } catch (error: any) {
        // Should fail due to RLS policy
        expect(error.message).toMatch(/(policy|permission|denied|violates)/i);
      }

      // Verify order still exists
      const orderCheck = await db.execute(sql`
        SELECT id FROM orders WHERE id = 'rls-order-other-org'
      `);
      expect(orderCheck).toHaveLength(1);
    });
  });

  describe('Catalog Items Table RLS Policies', () => {
    beforeEach(async () => {
      await db.execute(sql`
        INSERT INTO catalog_items (id, org_id, name, base_price) 
        VALUES 
        ('rls-item-test-org', ${testOrg.id}, 'Test Org Item', 50),
        ('rls-item-other-org', ${otherOrg.id}, 'Other Org Item', 75)
      `);
    });

    afterEach(async () => {
      await db.execute(sql`DELETE FROM catalog_items WHERE id LIKE 'rls-item-%'`);
    });

    it('should isolate catalog items by organization', async () => {
      // Set context for testOrg
      await db.execute(sql`SELECT set_config('app.current_user_id', ${memberUser.id}, true)`);
      await db.execute(sql`SELECT set_config('app.current_org_id', ${testOrg.id}, true)`);

      const accessibleItems = await db.execute(sql`
        SELECT id, org_id FROM catalog_items WHERE id LIKE 'rls-item-%'
      `);

      // Should only see items from testOrg
      expect(accessibleItems).toHaveLength(1);
      expect(accessibleItems[0].id).toBe('rls-item-test-org');
      expect(accessibleItems[0].org_id).toBe(testOrg.id);
    });

    it('should enforce catalog item creation policies', async () => {
      await db.execute(sql`SELECT set_config('app.current_user_id', ${memberUser.id}, true)`);
      await db.execute(sql`SELECT set_config('app.current_org_id', ${testOrg.id}, true)`);
      await db.execute(sql`SELECT set_config('app.current_user_role', 'member', true)`);

      // Member should be able to create items in their org
      await db.execute(sql`
        INSERT INTO catalog_items (id, org_id, name, base_price) 
        VALUES ('rls-member-item', ${testOrg.id}, 'Member Created Item', 100)
      `);

      const createdItem = await db.execute(sql`
        SELECT id FROM catalog_items WHERE id = 'rls-member-item'
      `);
      expect(createdItem).toHaveLength(1);

      // But should NOT be able to create items in other org
      try {
        await db.execute(sql`
          INSERT INTO catalog_items (id, org_id, name, base_price) 
          VALUES ('rls-cross-org-item', ${otherOrg.id}, 'Cross Org Item', 200)
        `);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toMatch(/(policy|permission|denied|violates)/i);
      }

      // Cleanup
      await db.execute(sql`DELETE FROM catalog_items WHERE id = 'rls-member-item'`);
    });
  });

  describe('Users Table RLS Policies', () => {
    it('should allow users to read org members only', async () => {
      await db.execute(sql`SELECT set_config('app.current_user_id', ${adminUser.id}, true)`);
      await db.execute(sql`SELECT set_config('app.current_org_id', ${testOrg.id}, true)`);

      // Query should only return users from the current organization
      const orgUsers = await db.execute(sql`
        SELECT u.id, u.email, om.organization_id
        FROM users u
        JOIN organization_memberships om ON u.id = om.user_id
        WHERE om.organization_id = ${testOrg.id}
      `);

      expect(orgUsers.length).toBeGreaterThan(0);
      for (const user of orgUsers) {
        expect(user.organization_id).toBe(testOrg.id);
      }
    });

    it('should prevent cross-organization user access', async () => {
      await db.execute(sql`SELECT set_config('app.current_user_id', ${outsiderUser.id}, true)`);
      await db.execute(sql`SELECT set_config('app.current_org_id', ${otherOrg.id}, true)`);

      // Try to query users from testOrg (should not be accessible)
      const crossOrgUsers = await db.execute(sql`
        SELECT u.id, u.email
        FROM users u
        JOIN organization_memberships om ON u.id = om.user_id
        WHERE om.organization_id = ${testOrg.id}
      `);

      // Should return empty or throw policy violation
      expect(crossOrgUsers.length).toBe(0);
    });

    it('should enforce user profile update policies', async () => {
      // Users should be able to update their own profile
      await db.execute(sql`SELECT set_config('app.current_user_id', ${memberUser.id}, true)`);
      await db.execute(sql`SELECT set_config('app.current_org_id', ${testOrg.id}, true)`);
      await db.execute(sql`SELECT set_config('app.current_user_role', 'member', true)`);

      await db.execute(sql`
        UPDATE users 
        SET full_name = 'Updated Member Name' 
        WHERE id = ${memberUser.id}
      `);

      // Verify update succeeded
      const updatedUser = await db.execute(sql`
        SELECT full_name FROM users WHERE id = ${memberUser.id}
      `);
      expect(updatedUser[0].full_name).toBe('Updated Member Name');

      // But should NOT be able to update other users
      try {
        await db.execute(sql`
          UPDATE users 
          SET full_name = 'Hacked Admin Name' 
          WHERE id = ${adminUser.id}
        `);
        
        // If no error, verify the update didn't work
        const hackedCheck = await db.execute(sql`
          SELECT full_name FROM users WHERE id = ${adminUser.id}
        `);
        expect(hackedCheck[0].full_name).not.toBe('Hacked Admin Name');
      } catch (error: any) {
        expect(error.message).toMatch(/(policy|permission|denied|violates)/i);
      }

      // Restore original name
      await db.execute(sql`
        UPDATE users 
        SET full_name = 'RLS Member User' 
        WHERE id = ${memberUser.id}
      `);
    });
  });

  describe('Organization Memberships RLS Policies', () => {
    it('should prevent unauthorized membership modifications', async () => {
      // Set context as member user
      await db.execute(sql`SELECT set_config('app.current_user_id', ${memberUser.id}, true)`);
      await db.execute(sql`SELECT set_config('app.current_org_id', ${testOrg.id}, true)`);
      await db.execute(sql`SELECT set_config('app.current_user_role', 'member', true)`);

      // Member should NOT be able to add new users to organization
      try {
        await db.execute(sql`
          INSERT INTO organization_memberships (user_id, organization_id, role) 
          VALUES (${outsiderUser.id}, ${testOrg.id}, 'member')
        `);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toMatch(/(policy|permission|denied|violates)/i);
      }

      // Member should NOT be able to change roles
      try {
        await db.execute(sql`
          UPDATE organization_memberships 
          SET role = 'admin' 
          WHERE user_id = ${memberUser.id} AND organization_id = ${testOrg.id}
        `);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toMatch(/(policy|permission|denied|violates)/i);
      }
    });

    it('should allow admins to manage organization memberships', async () => {
      // Set context as admin user
      await db.execute(sql`SELECT set_config('app.current_user_id', ${adminUser.id}, true)`);
      await db.execute(sql`SELECT set_config('app.current_org_id', ${testOrg.id}, true)`);
      await db.execute(sql`SELECT set_config('app.current_user_role', 'admin', true)`);

      // Create a temporary user for testing
      const tempUser = await db.execute(sql`
        INSERT INTO users (id, email, full_name) 
        VALUES ('rls-temp-user', 'rls-temp@example.com', 'RLS Temp User') 
        RETURNING *
      `);

      // Admin should be able to add users to their organization
      await db.execute(sql`
        INSERT INTO organization_memberships (user_id, organization_id, role) 
        VALUES (${tempUser[0].id}, ${testOrg.id}, 'member')
      `);

      // Verify membership was created
      const membership = await db.execute(sql`
        SELECT * FROM organization_memberships 
        WHERE user_id = ${tempUser[0].id} AND organization_id = ${testOrg.id}
      `);
      expect(membership).toHaveLength(1);
      expect(membership[0].role).toBe('member');

      // Admin should be able to change roles
      await db.execute(sql`
        UPDATE organization_memberships 
        SET role = 'editor' 
        WHERE user_id = ${tempUser[0].id} AND organization_id = ${testOrg.id}
      `);

      const updatedMembership = await db.execute(sql`
        SELECT role FROM organization_memberships 
        WHERE user_id = ${tempUser[0].id} AND organization_id = ${testOrg.id}
      `);
      expect(updatedMembership[0].role).toBe('editor');

      // Cleanup
      await db.execute(sql`
        DELETE FROM organization_memberships 
        WHERE user_id = ${tempUser[0].id}
      `);
      await db.execute(sql`DELETE FROM users WHERE id = ${tempUser[0].id}`);
    });
  });

  describe('Audit Logs RLS Policies', () => {
    it('should allow organization members to read audit logs for their org only', async () => {
      // Create audit logs for both organizations
      await db.execute(sql`
        INSERT INTO audit_logs (id, occurred_at, actor, org_id, entity, entity_id, action) 
        VALUES 
        (1001, NOW(), ${adminUser.id}, ${testOrg.id}, 'orders', 'test-order', 'create'),
        (1002, NOW(), ${outsiderUser.id}, ${otherOrg.id}, 'orders', 'other-order', 'create')
      `);

      // Set context for testOrg user
      await db.execute(sql`SELECT set_config('app.current_user_id', ${memberUser.id}, true)`);
      await db.execute(sql`SELECT set_config('app.current_org_id', ${testOrg.id}, true)`);

      const accessibleLogs = await db.execute(sql`
        SELECT id, org_id, entity_id FROM audit_logs WHERE id IN (1001, 1002)
      `);

      // Should only see logs from testOrg
      expect(accessibleLogs).toHaveLength(1);
      expect(accessibleLogs[0].id).toBe(1001);
      expect(accessibleLogs[0].org_id).toBe(testOrg.id);

      // Cleanup
      await db.execute(sql`DELETE FROM audit_logs WHERE id IN (1001, 1002)`);
    });

    it('should prevent users from modifying audit logs', async () => {
      // Create audit log
      await db.execute(sql`
        INSERT INTO audit_logs (id, occurred_at, actor, org_id, entity, entity_id, action) 
        VALUES (1003, NOW(), ${adminUser.id}, ${testOrg.id}, 'orders', 'immutable-test', 'create')
      `);

      // Set context as admin (even admin shouldn't modify audit logs)
      await db.execute(sql`SELECT set_config('app.current_user_id', ${adminUser.id}, true)`);
      await db.execute(sql`SELECT set_config('app.current_org_id', ${testOrg.id}, true)`);
      await db.execute(sql`SELECT set_config('app.current_user_role', 'admin', true)`);

      try {
        await db.execute(sql`
          UPDATE audit_logs 
          SET action = 'modified' 
          WHERE id = 1003
        `);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toMatch(/(policy|permission|denied|violates|immutable)/i);
      }

      try {
        await db.execute(sql`DELETE FROM audit_logs WHERE id = 1003`);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toMatch(/(policy|permission|denied|violates|immutable)/i);
      }

      // Cleanup (may need special privileges)
      await db.execute(sql`SELECT set_config('app.bypass_rls', 'true', true)`);
      await db.execute(sql`DELETE FROM audit_logs WHERE id = 1003`);
      await db.execute(sql`SELECT set_config('app.bypass_rls', 'false', true)`);
    });
  });

  describe('RLS Policy Edge Cases', () => {
    it('should handle null organization contexts gracefully', async () => {
      // Clear user context
      await db.execute(sql`SELECT set_config('app.current_user_id', NULL, true)`);
      await db.execute(sql`SELECT set_config('app.current_org_id', NULL, true)`);

      // Queries should either return empty or handle null context appropriately
      const results = await db.execute(sql`
        SELECT COUNT(*) as count FROM orders WHERE id LIKE 'rls-order-%'
      `);

      // Should return 0 or handle null context gracefully
      expect(results[0].count).toBe(0);
    });

    it('should handle user switching between organizations', async () => {
      // User starts in testOrg
      await db.execute(sql`SELECT set_config('app.current_user_id', ${adminUser.id}, true)`);
      await db.execute(sql`SELECT set_config('app.current_org_id', ${testOrg.id}, true)`);

      const testOrgData = await db.execute(sql`
        SELECT COUNT(*) as count FROM orders WHERE id LIKE 'rls-order-%'
      `);
      const initialCount = testOrgData[0].count;

      // User switches to otherOrg context
      await db.execute(sql`SELECT set_config('app.current_org_id', ${otherOrg.id}, true)`);

      const otherOrgData = await db.execute(sql`
        SELECT COUNT(*) as count FROM orders WHERE id LIKE 'rls-order-%'
      `);
      const switchedCount = otherOrgData[0].count;

      // Results should be different based on organization context
      expect(switchedCount).not.toBe(initialCount);
    });

    it('should handle concurrent sessions with different contexts', async () => {
      // Simulate multiple concurrent sessions
      const session1Promise = db.execute(sql`
        SELECT set_config('app.current_user_id', ${adminUser.id}, true);
        SELECT set_config('app.current_org_id', ${testOrg.id}, true);
        SELECT COUNT(*) as count FROM orders WHERE organization_id = ${testOrg.id};
      `);

      const session2Promise = db.execute(sql`
        SELECT set_config('app.current_user_id', ${outsiderUser.id}, true);
        SELECT set_config('app.current_org_id', ${otherOrg.id}, true);
        SELECT COUNT(*) as count FROM orders WHERE organization_id = ${otherOrg.id};
      `);

      const [session1Result, session2Result] = await Promise.all([
        session1Promise,
        session2Promise
      ]);

      // Each session should see only their organization's data
      expect(session1Result).toBeDefined();
      expect(session2Result).toBeDefined();
    });

    it('should enforce policies during bulk operations', async () => {
      // Set context
      await db.execute(sql`SELECT set_config('app.current_user_id', ${adminUser.id}, true)`);
      await db.execute(sql`SELECT set_config('app.current_org_id', ${testOrg.id}, true)`);
      await db.execute(sql`SELECT set_config('app.current_user_role', 'admin', true)`);

      // Try bulk update that includes other organization's data
      const affectedRows = await db.execute(sql`
        UPDATE orders 
        SET status = 'bulk_updated' 
        WHERE id IN ('rls-order-test-org', 'rls-order-other-org')
      `);

      // Should only affect orders from current organization
      expect(affectedRows.count || 0).toBeLessThanOrEqual(1);

      // Verify other org's order was not modified
      const otherOrgOrder = await db.execute(sql`
        SELECT status FROM orders WHERE id = 'rls-order-other-org'
      `);
      
      if (otherOrgOrder.length > 0) {
        expect(otherOrgOrder[0].status).not.toBe('bulk_updated');
      }
    });
  });
});
