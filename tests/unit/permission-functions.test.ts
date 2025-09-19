import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  ACTION_PERMISSIONS, 
  PAGE_ACCESS, 
  ROLE_PERMISSIONS,
  getUserPermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canAccessPage,
  getRoleHierarchy,
  isHigherRole
} from '../../server/lib/permissions';

// Mock database
const mockDb = {
  execute: vi.fn()
};

vi.mock('../../server/db', () => ({
  db: mockDb
}));

describe('Permission System Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Permission Constants', () => {
    it('should define comprehensive action permissions', () => {
      expect(ACTION_PERMISSIONS).toBeDefined();
      expect(ACTION_PERMISSIONS.ORDERS).toBeDefined();
      expect(ACTION_PERMISSIONS.ORDERS.READ).toBe('orders.read');
      expect(ACTION_PERMISSIONS.ORDERS.CREATE).toBe('orders.create');
      expect(ACTION_PERMISSIONS.ORDERS.UPDATE).toBe('orders.update');
      expect(ACTION_PERMISSIONS.ORDERS.DELETE).toBe('orders.delete');
      expect(ACTION_PERMISSIONS.ORDERS.UPDATE_SENSITIVE).toBe('orders.update_sensitive');
      expect(ACTION_PERMISSIONS.ORDERS.VIEW_FINANCIALS).toBe('orders.view_financials');
      expect(ACTION_PERMISSIONS.ORDERS.BULK_OPERATIONS).toBe('orders.bulk_operations');
    });

    it('should define organization permissions', () => {
      expect(ACTION_PERMISSIONS.ORGANIZATIONS).toBeDefined();
      expect(ACTION_PERMISSIONS.ORGANIZATIONS.CREATE).toBe('organizations.create');
      expect(ACTION_PERMISSIONS.ORGANIZATIONS.UPDATE).toBe('organizations.update');
      expect(ACTION_PERMISSIONS.ORGANIZATIONS.MANAGE_USERS).toBe('organizations.manage_users');
      expect(ACTION_PERMISSIONS.ORGANIZATIONS.VIEW_METRICS).toBe('organizations.view_metrics');
    });

    it('should define user management permissions', () => {
      expect(ACTION_PERMISSIONS.USERS).toBeDefined();
      expect(ACTION_PERMISSIONS.USERS.CREATE).toBe('users.create');
      expect(ACTION_PERMISSIONS.USERS.ASSIGN_ROLES).toBe('users.assign_roles');
      expect(ACTION_PERMISSIONS.USERS.RESET_PASSWORD).toBe('users.reset_password');
      expect(ACTION_PERMISSIONS.USERS.VIEW_PERMISSIONS).toBe('users.view_permissions');
    });

    it('should define catalog and sales permissions', () => {
      expect(ACTION_PERMISSIONS.CATALOG).toBeDefined();
      expect(ACTION_PERMISSIONS.SALES).toBeDefined();
      expect(ACTION_PERMISSIONS.MANUFACTURING).toBeDefined();
      expect(ACTION_PERMISSIONS.SYSTEM).toBeDefined();
    });

    it('should define page access permissions', () => {
      expect(PAGE_ACCESS).toBeDefined();
      expect(PAGE_ACCESS.DASHBOARD).toBeDefined();
      expect(PAGE_ACCESS.ORDERS_LIST).toBeDefined();
      expect(PAGE_ACCESS.USER_MANAGEMENT).toBeDefined();
      expect(PAGE_ACCESS.SYSTEM_SETTINGS).toBeDefined();
    });

    it('should define role-based permission mappings', () => {
      expect(ROLE_PERMISSIONS).toBeDefined();
      expect(ROLE_PERMISSIONS.ADMIN).toBeInstanceOf(Array);
      expect(ROLE_PERMISSIONS.MANAGER).toBeInstanceOf(Array);
      expect(ROLE_PERMISSIONS.SALES).toBeInstanceOf(Array);
      expect(ROLE_PERMISSIONS.READONLY).toBeInstanceOf(Array);
    });
  });

  describe('getUserPermissions function', () => {
    it('should fetch user permissions from database', async () => {
      const mockPermissions = [
        { permission: 'orders.read' },
        { permission: 'orders.create' },
        { permission: 'catalog.read' }
      ];

      mockDb.execute.mockResolvedValue(mockPermissions);

      const permissions = await getUserPermissions('user-123', 'org-123');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          sql: expect.stringContaining('SELECT')
        })
      );

      expect(permissions).toEqual(['orders.read', 'orders.create', 'catalog.read']);
    });

    it('should handle database errors gracefully', async () => {
      mockDb.execute.mockRejectedValue(new Error('Database error'));

      const permissions = await getUserPermissions('user-123', 'org-123');

      expect(permissions).toEqual([]);
    });

    it('should return empty array for non-existent user', async () => {
      mockDb.execute.mockResolvedValue([]);

      const permissions = await getUserPermissions('nonexistent-user', 'org-123');

      expect(permissions).toEqual([]);
    });

    it('should filter permissions by organization', async () => {
      const mockPermissions = [
        { permission: 'orders.read', organization_id: 'org-123' },
        { permission: 'orders.read', organization_id: 'org-456' }
      ];

      mockDb.execute.mockResolvedValue([mockPermissions[0]]);

      const permissions = await getUserPermissions('user-123', 'org-123');

      expect(permissions).toEqual(['orders.read']);
    });
  });

  describe('hasPermission function', () => {
    it('should return true when user has required permission', () => {
      const userPermissions = ['orders.read', 'orders.create', 'catalog.read'];
      
      expect(hasPermission(userPermissions, 'orders.read')).toBe(true);
      expect(hasPermission(userPermissions, 'orders.create')).toBe(true);
      expect(hasPermission(userPermissions, 'catalog.read')).toBe(true);
    });

    it('should return false when user lacks required permission', () => {
      const userPermissions = ['orders.read', 'catalog.read'];
      
      expect(hasPermission(userPermissions, 'orders.update')).toBe(false);
      expect(hasPermission(userPermissions, 'orders.delete')).toBe(false);
      expect(hasPermission(userPermissions, 'users.create')).toBe(false);
    });

    it('should handle empty permission arrays', () => {
      expect(hasPermission([], 'orders.read')).toBe(false);
      expect(hasPermission(['orders.read'], '')).toBe(false);
    });

    it('should be case sensitive', () => {
      const userPermissions = ['orders.read'];
      
      expect(hasPermission(userPermissions, 'ORDERS.READ')).toBe(false);
      expect(hasPermission(userPermissions, 'Orders.Read')).toBe(false);
    });

    it('should handle wildcard permissions', () => {
      const userPermissions = ['orders.*', 'catalog.read'];
      
      expect(hasPermission(userPermissions, 'orders.read')).toBe(true);
      expect(hasPermission(userPermissions, 'orders.create')).toBe(true);
      expect(hasPermission(userPermissions, 'orders.delete')).toBe(true);
      expect(hasPermission(userPermissions, 'users.create')).toBe(false);
    });

    it('should handle super admin permissions', () => {
      const superAdminPermissions = ['*'];
      
      expect(hasPermission(superAdminPermissions, 'orders.read')).toBe(true);
      expect(hasPermission(superAdminPermissions, 'users.delete')).toBe(true);
      expect(hasPermission(superAdminPermissions, 'system.backup')).toBe(true);
    });
  });

  describe('hasAnyPermission function', () => {
    it('should return true when user has any of the required permissions', () => {
      const userPermissions = ['orders.read', 'catalog.read'];
      const requiredPermissions = ['orders.update', 'orders.read', 'users.create'];
      
      expect(hasAnyPermission(userPermissions, requiredPermissions)).toBe(true);
    });

    it('should return false when user has none of the required permissions', () => {
      const userPermissions = ['orders.read', 'catalog.read'];
      const requiredPermissions = ['orders.update', 'orders.delete', 'users.create'];
      
      expect(hasAnyPermission(userPermissions, requiredPermissions)).toBe(false);
    });

    it('should handle empty arrays', () => {
      expect(hasAnyPermission([], ['orders.read'])).toBe(false);
      expect(hasAnyPermission(['orders.read'], [])).toBe(false);
      expect(hasAnyPermission([], [])).toBe(false);
    });

    it('should work with single permission', () => {
      const userPermissions = ['orders.read'];
      
      expect(hasAnyPermission(userPermissions, ['orders.read'])).toBe(true);
      expect(hasAnyPermission(userPermissions, ['orders.update'])).toBe(false);
    });
  });

  describe('hasAllPermissions function', () => {
    it('should return true when user has all required permissions', () => {
      const userPermissions = ['orders.read', 'orders.create', 'orders.update', 'catalog.read'];
      const requiredPermissions = ['orders.read', 'orders.create'];
      
      expect(hasAllPermissions(userPermissions, requiredPermissions)).toBe(true);
    });

    it('should return false when user lacks any required permission', () => {
      const userPermissions = ['orders.read', 'catalog.read'];
      const requiredPermissions = ['orders.read', 'orders.update'];
      
      expect(hasAllPermissions(userPermissions, requiredPermissions)).toBe(false);
    });

    it('should handle empty arrays', () => {
      expect(hasAllPermissions([], ['orders.read'])).toBe(false);
      expect(hasAllPermissions(['orders.read'], [])).toBe(true); // Vacuous truth
      expect(hasAllPermissions([], [])).toBe(true);
    });

    it('should work with complex permission sets', () => {
      const userPermissions = [
        'orders.read', 'orders.create', 'orders.update',
        'catalog.read', 'catalog.create',
        'users.read'
      ];
      
      const validRequiredPermissions = [
        ['orders.read', 'orders.create'],
        ['catalog.read'],
        ['orders.read', 'catalog.read', 'users.read']
      ];
      
      const invalidRequiredPermissions = [
        ['orders.read', 'orders.delete'],
        ['users.create'],
        ['orders.read', 'system.backup']
      ];
      
      validRequiredPermissions.forEach(required => {
        expect(hasAllPermissions(userPermissions, required)).toBe(true);
      });
      
      invalidRequiredPermissions.forEach(required => {
        expect(hasAllPermissions(userPermissions, required)).toBe(false);
      });
    });
  });

  describe('canAccessPage function', () => {
    it('should allow page access with sufficient permissions', () => {
      const userPermissions = ['orders.read', 'orders.create'];
      
      expect(canAccessPage(userPermissions, PAGE_ACCESS.ORDERS_LIST)).toBe(true);
      expect(canAccessPage(userPermissions, PAGE_ACCESS.DASHBOARD)).toBe(true);
    });

    it('should deny page access without sufficient permissions', () => {
      const userPermissions = ['orders.read'];
      
      expect(canAccessPage(userPermissions, PAGE_ACCESS.USER_MANAGEMENT)).toBe(false);
      expect(canAccessPage(userPermissions, PAGE_ACCESS.SYSTEM_SETTINGS)).toBe(false);
    });

    it('should handle undefined page access definitions', () => {
      const userPermissions = ['orders.read'];
      
      expect(canAccessPage(userPermissions, 'nonexistent_page')).toBe(false);
    });

    it('should allow super admin access to all pages', () => {
      const superAdminPermissions = ['*'];
      
      expect(canAccessPage(superAdminPermissions, PAGE_ACCESS.ORDERS_LIST)).toBe(true);
      expect(canAccessPage(superAdminPermissions, PAGE_ACCESS.USER_MANAGEMENT)).toBe(true);
      expect(canAccessPage(superAdminPermissions, PAGE_ACCESS.SYSTEM_SETTINGS)).toBe(true);
    });
  });

  describe('Role Hierarchy Functions', () => {
    describe('getRoleHierarchy', () => {
      it('should return correct hierarchy levels', () => {
        expect(getRoleHierarchy('readonly')).toBe(1);
        expect(getRoleHierarchy('member')).toBe(2);
        expect(getRoleHierarchy('sales')).toBe(3);
        expect(getRoleHierarchy('manager')).toBe(4);
        expect(getRoleHierarchy('admin')).toBe(5);
        expect(getRoleHierarchy('super_admin')).toBe(6);
      });

      it('should handle unknown roles', () => {
        expect(getRoleHierarchy('unknown_role')).toBe(0);
        expect(getRoleHierarchy('')).toBe(0);
        expect(getRoleHierarchy(null)).toBe(0);
        expect(getRoleHierarchy(undefined)).toBe(0);
      });
    });

    describe('isHigherRole', () => {
      it('should correctly compare role hierarchies', () => {
        expect(isHigherRole('admin', 'member')).toBe(true);
        expect(isHigherRole('manager', 'sales')).toBe(true);
        expect(isHigherRole('sales', 'readonly')).toBe(true);
        expect(isHigherRole('super_admin', 'admin')).toBe(true);
      });

      it('should return false for equal or lower roles', () => {
        expect(isHigherRole('member', 'admin')).toBe(false);
        expect(isHigherRole('readonly', 'sales')).toBe(false);
        expect(isHigherRole('admin', 'admin')).toBe(false);
        expect(isHigherRole('member', 'member')).toBe(false);
      });

      it('should handle unknown roles', () => {
        expect(isHigherRole('unknown', 'member')).toBe(false);
        expect(isHigherRole('admin', 'unknown')).toBe(true);
        expect(isHigherRole('unknown1', 'unknown2')).toBe(false);
      });
    });
  });

  describe('Role-based Permission Defaults', () => {
    it('should define appropriate permissions for each role', () => {
      // Admin should have most permissions
      expect(ROLE_PERMISSIONS.ADMIN).toContain('orders.read');
      expect(ROLE_PERMISSIONS.ADMIN).toContain('orders.create');
      expect(ROLE_PERMISSIONS.ADMIN).toContain('orders.update');
      expect(ROLE_PERMISSIONS.ADMIN).toContain('users.create');
      expect(ROLE_PERMISSIONS.ADMIN).toContain('organizations.update');

      // Manager should have management permissions
      expect(ROLE_PERMISSIONS.MANAGER).toContain('orders.read');
      expect(ROLE_PERMISSIONS.MANAGER).toContain('orders.create');
      expect(ROLE_PERMISSIONS.MANAGER).toContain('orders.assign');

      // Sales should have sales-related permissions
      expect(ROLE_PERMISSIONS.SALES).toContain('orders.read');
      expect(ROLE_PERMISSIONS.SALES).toContain('orders.create');
      expect(ROLE_PERMISSIONS.SALES).toContain('sales.create_leads');

      // Readonly should have minimal permissions
      expect(ROLE_PERMISSIONS.READONLY).toContain('orders.read');
      expect(ROLE_PERMISSIONS.READONLY).not.toContain('orders.create');
      expect(ROLE_PERMISSIONS.READONLY).not.toContain('orders.update');
    });

    it('should maintain role hierarchy in permissions', () => {
      // Higher roles should have at least the permissions of lower roles
      const readonlyPerms = new Set(ROLE_PERMISSIONS.READONLY);
      const salesPerms = new Set(ROLE_PERMISSIONS.SALES);
      const managerPerms = new Set(ROLE_PERMISSIONS.MANAGER);
      const adminPerms = new Set(ROLE_PERMISSIONS.ADMIN);

      // Sales should include all readonly permissions
      ROLE_PERMISSIONS.READONLY.forEach(perm => {
        expect(salesPerms.has(perm) || managerPerms.has(perm) || adminPerms.has(perm)).toBe(true);
      });

      // Manager should include key sales permissions
      expect(managerPerms.has('orders.read')).toBe(true);
      expect(managerPerms.has('orders.create')).toBe(true);

      // Admin should include key manager permissions
      expect(adminPerms.has('orders.read')).toBe(true);
      expect(adminPerms.has('orders.update')).toBe(true);
    });
  });

  describe('Permission Security Edge Cases', () => {
    it('should handle malformed permission strings', () => {
      const userPermissions = ['orders.read', null, undefined, '', 'invalid..permission'];
      
      expect(hasPermission(userPermissions, 'orders.read')).toBe(true);
      expect(hasPermission(userPermissions, null)).toBe(false);
      expect(hasPermission(userPermissions, undefined)).toBe(false);
    });

    it('should prevent permission injection attacks', () => {
      const maliciousPermissions = [
        'orders.*; DROP TABLE permissions; --',
        'orders.read\'); DROP TABLE users; --',
        '../../../etc/passwd',
        'orders.read OR 1=1'
      ];

      maliciousPermissions.forEach(maliciousPerm => {
        expect(hasPermission(['orders.read'], maliciousPerm)).toBe(false);
      });
    });

    it('should handle concurrent permission checks', async () => {
      const userIds = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'];
      const orgId = 'org-123';

      mockDb.execute.mockResolvedValue([
        { permission: 'orders.read' },
        { permission: 'orders.create' }
      ]);

      const permissionPromises = userIds.map(userId => 
        getUserPermissions(userId, orgId)
      );

      const results = await Promise.all(permissionPromises);

      results.forEach(permissions => {
        expect(permissions).toEqual(['orders.read', 'orders.create']);
      });

      expect(mockDb.execute).toHaveBeenCalledTimes(5);
    });

    it('should handle large permission sets efficiently', () => {
      const largePermissionSet = Array(1000).fill(null).map((_, i) => `permission.${i}`);
      const requiredPermissions = ['permission.500', 'permission.750'];

      const start = performance.now();
      const result = hasAllPermissions(largePermissionSet, requiredPermissions);
      const end = performance.now();

      expect(result).toBe(true);
      expect(end - start).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should maintain permission immutability', () => {
      const originalPermissions = ['orders.read', 'orders.create'];
      const userPermissions = [...originalPermissions];

      // Test functions shouldn't modify the original array
      hasPermission(userPermissions, 'orders.update');
      hasAnyPermission(userPermissions, ['orders.delete']);
      hasAllPermissions(userPermissions, ['orders.read']);

      expect(userPermissions).toEqual(originalPermissions);
    });
  });
});