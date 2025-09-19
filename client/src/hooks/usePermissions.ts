// Note: UserContext would need to be implemented or imported from the appropriate location
// For now, we'll create a mock interface
interface User {
  id: string;
  role: string;
  is_super_admin?: boolean;
  permissions?: Record<string, boolean>;
}

// Mock useUser hook - replace with actual implementation
const useUser = () => {
  // This would normally come from your auth context
  return {
    user: null as User | null
  };
};
import { useMemo } from 'react';

/**
 * Frontend permissions system for role-based access control
 */

// Permission constants matching backend ACTION_PERMISSIONS
export const PERMISSIONS = {
  ORGANIZATIONS: {
    CREATE: 'organizations.create',
    READ: 'organizations.read',
    UPDATE: 'organizations.update',
    DELETE: 'organizations.delete',
    SETUP: 'organizations.setup',
    MANAGE_SPORTS: 'organizations.manage_sports',
    MANAGE_USERS: 'organizations.manage_users',
    MANAGE_BRANDING: 'organizations.manage_branding',
    VIEW_METRICS: 'organizations.view_metrics',
  },
  USERS: {
    CREATE: 'users.create',
    READ: 'users.read',
    UPDATE: 'users.update',
    DELETE: 'users.delete',
    ASSIGN_ROLES: 'users.assign_roles',
    RESET_PASSWORD: 'users.reset_password',
    MANAGE_PROFILE: 'users.manage_profile',
    DEACTIVATE: 'users.deactivate',
    VIEW_PERMISSIONS: 'users.view_permissions',
    EDIT_PERMISSIONS: 'users.edit_permissions',
  },
  ORDERS: {
    CREATE: 'orders.create',
    READ: 'orders.read',
    READ_ALL: 'orders.read_all',
    UPDATE: 'orders.update',
    UPDATE_SENSITIVE: 'orders.update_sensitive',
    DELETE: 'orders.delete',
    CHANGE_STATUS: 'orders.change_status',
    APPROVE_STATUS_CHANGE: 'orders.approve_status_change',
    ASSIGN: 'orders.assign',
    FULFILL: 'orders.fulfill',
    CANCEL: 'orders.cancel',
    FORCE_CANCEL: 'orders.force_cancel',
    VIEW_FINANCIALS: 'orders.view_financials',
    EDIT_FINANCIALS: 'orders.edit_financials',
    VIEW_INTERNAL_NOTES: 'orders.view_internal_notes',
    EDIT_INTERNAL_NOTES: 'orders.edit_internal_notes',
    BULK_OPERATIONS: 'orders.bulk_operations',
    EXPORT_DATA: 'orders.export_data',
    OVERRIDE_VALIDATIONS: 'orders.override_validations',
  },
  CATALOG: {
    CREATE: 'catalog.create',
    READ: 'catalog.read',
    UPDATE: 'catalog.update',
    DELETE: 'catalog.delete',
    MANAGE_VARIANTS: 'catalog.manage_variants',
    SET_PRICING: 'catalog.set_pricing',
    MANAGE_INVENTORY: 'catalog.manage_inventory',
  },
  SALES: {
    CREATE_LEADS: 'sales.create_leads',
    READ_LEADS: 'sales.read_leads',
    UPDATE_LEADS: 'sales.update_leads',
    DELETE_LEADS: 'sales.delete_leads',
    CONVERT_LEADS: 'sales.convert_leads',
    MANAGE_PIPELINE: 'sales.manage_pipeline',
    VIEW_ANALYTICS: 'sales.view_analytics',
  },
  MANUFACTURING: {
    VIEW_ORDERS: 'manufacturing.view_orders',
    UPDATE_PRODUCTION_STATUS: 'manufacturing.update_production_status',
    MANAGE_PO: 'manufacturing.manage_po',
    VIEW_MATERIALS: 'manufacturing.view_materials',
    UPDATE_MILESTONES: 'manufacturing.update_milestones',
    MANAGE_SCHEDULE: 'manufacturing.manage_schedule',
  },
  QUOTES: {
    CREATE: 'quotes.create',
    READ: 'quotes.read',
    UPDATE: 'quotes.update',
    DELETE: 'quotes.delete',
    APPROVE: 'quotes.approve',
    SEND: 'quotes.send',
    DOWNLOAD: 'quotes.download',
    CONVERT_TO_ORDER: 'quotes.convert_to_order',
  },
} as const;

// Page access permissions
export const PAGE_ACCESS = {
  DASHBOARD: {
    VIEW: 'page.dashboard.view',
    EDIT: 'page.dashboard.edit',
  },
  ORGANIZATIONS: {
    VIEW: 'page.organizations.view',
    EDIT: 'page.organizations.edit',
    CREATE: 'page.organizations.create',
    GENERAL: 'page.organizations.general',
    SPORTS: 'page.organizations.sports',
    BRANDING: 'page.organizations.branding',
    USERS: 'page.organizations.users',
    ORDERS: 'page.organizations.orders',
    METRICS: 'page.organizations.metrics',
  },
  USERS: {
    VIEW: 'page.users.view',
    EDIT: 'page.users.edit',
    CREATE: 'page.users.create',
    STAFF: 'page.users.staff',
    CUSTOMERS: 'page.users.customers',
    PERMISSIONS: 'page.users.permissions',
    ROLES: 'page.users.roles',
  },
  SALES: {
    VIEW: 'page.sales.view',
    EDIT: 'page.sales.edit',
    PIPELINE: 'page.sales.pipeline',
    LEADS: 'page.sales.leads',
    ANALYTICS: 'page.sales.analytics',
  },
  ORDERS: {
    VIEW: 'page.orders.view',
    EDIT: 'page.orders.edit',
    CREATE: 'page.orders.create',
    ACTIVE: 'page.orders.active',
    COMPLETED: 'page.orders.completed',
    CANCELLED: 'page.orders.cancelled',
  },
  MANUFACTURING: {
    VIEW: 'page.manufacturing.view',
    EDIT: 'page.manufacturing.edit',
    PRODUCTION: 'page.manufacturing.production',
    PURCHASE_ORDERS: 'page.manufacturing.purchase_orders',
    MATERIALS: 'page.manufacturing.materials',
    SCHEDULE: 'page.manufacturing.schedule',
  },
  CATALOG: {
    VIEW: 'page.catalog.view',
    EDIT: 'page.catalog.edit',
    CREATE: 'page.catalog.create',
    PRODUCTS: 'page.catalog.products',
    VARIANTS: 'page.catalog.variants',
    PRICING: 'page.catalog.pricing',
    INVENTORY: 'page.catalog.inventory',
  },
  QUOTES: {
    VIEW: 'page.quotes.view',
    EDIT: 'page.quotes.edit',
    CREATE: 'page.quotes.create',
    ACTIVE: 'page.quotes.active',
    SENT: 'page.quotes.sent',
    EXPIRED: 'page.quotes.expired',
  },
} as const;

// Role-based permission defaults
const ROLE_PERMISSIONS = {
  ADMIN: {
    // Admin has all permissions
    description: 'Full system access',
    permissions: {
      ...Object.values(PERMISSIONS).reduce((acc, category) => ({
        ...acc,
        ...Object.values(category).reduce((perms, perm) => ({ ...perms, [perm]: true }), {})
      }), {}),
      ...Object.values(PAGE_ACCESS).reduce((acc, category) => ({
        ...acc,
        ...Object.entries(category).reduce((perms, [_, perm]) => ({ ...perms, [perm]: true }), {})
      }), {})
    }
  },
  MANAGER: {
    description: 'Management team with elevated permissions',
    permissions: {
      // Organizations
      [PERMISSIONS.ORGANIZATIONS.READ]: true,
      [PERMISSIONS.ORGANIZATIONS.UPDATE]: true,
      [PERMISSIONS.ORGANIZATIONS.MANAGE_USERS]: true,
      [PERMISSIONS.ORGANIZATIONS.VIEW_METRICS]: true,
      
      // Users
      [PERMISSIONS.USERS.CREATE]: true,
      [PERMISSIONS.USERS.READ]: true,
      [PERMISSIONS.USERS.UPDATE]: true,
      [PERMISSIONS.USERS.ASSIGN_ROLES]: true,
      
      // Orders - elevated management
      [PERMISSIONS.ORDERS.CREATE]: true,
      [PERMISSIONS.ORDERS.READ]: true,
      [PERMISSIONS.ORDERS.READ_ALL]: true,
      [PERMISSIONS.ORDERS.UPDATE]: true,
      [PERMISSIONS.ORDERS.UPDATE_SENSITIVE]: true,
      [PERMISSIONS.ORDERS.CHANGE_STATUS]: true,
      [PERMISSIONS.ORDERS.APPROVE_STATUS_CHANGE]: true,
      [PERMISSIONS.ORDERS.ASSIGN]: true,
      [PERMISSIONS.ORDERS.FULFILL]: true,
      [PERMISSIONS.ORDERS.CANCEL]: true,
      [PERMISSIONS.ORDERS.VIEW_FINANCIALS]: true,
      [PERMISSIONS.ORDERS.EDIT_FINANCIALS]: true,
      [PERMISSIONS.ORDERS.VIEW_INTERNAL_NOTES]: true,
      [PERMISSIONS.ORDERS.EDIT_INTERNAL_NOTES]: true,
      [PERMISSIONS.ORDERS.BULK_OPERATIONS]: true,
      [PERMISSIONS.ORDERS.EXPORT_DATA]: true,
      
      // Page access
      [PAGE_ACCESS.DASHBOARD.VIEW]: true,
      [PAGE_ACCESS.ORGANIZATIONS.VIEW]: true,
      [PAGE_ACCESS.USERS.VIEW]: true,
      [PAGE_ACCESS.ORDERS.VIEW]: true,
      [PAGE_ACCESS.ORDERS.EDIT]: true,
      [PAGE_ACCESS.SALES.VIEW]: true,
      [PAGE_ACCESS.CATALOG.VIEW]: true,
    }
  },
  SALES: {
    description: 'Sales team access',
    permissions: {
      // Organizations
      [PERMISSIONS.ORGANIZATIONS.READ]: true,
      [PERMISSIONS.ORGANIZATIONS.VIEW_METRICS]: true,
      
      // Users
      [PERMISSIONS.USERS.CREATE]: true,
      [PERMISSIONS.USERS.READ]: true,
      [PERMISSIONS.USERS.UPDATE]: true,
      
      // Orders - sales management
      [PERMISSIONS.ORDERS.CREATE]: true,
      [PERMISSIONS.ORDERS.READ]: true,
      [PERMISSIONS.ORDERS.READ_ALL]: true,
      [PERMISSIONS.ORDERS.UPDATE]: true,
      [PERMISSIONS.ORDERS.CHANGE_STATUS]: true,
      [PERMISSIONS.ORDERS.ASSIGN]: true,
      [PERMISSIONS.ORDERS.FULFILL]: true,
      [PERMISSIONS.ORDERS.CANCEL]: true,
      [PERMISSIONS.ORDERS.VIEW_FINANCIALS]: true,
      [PERMISSIONS.ORDERS.VIEW_INTERNAL_NOTES]: true,
      [PERMISSIONS.ORDERS.EDIT_INTERNAL_NOTES]: true,
      [PERMISSIONS.ORDERS.BULK_OPERATIONS]: true,
      [PERMISSIONS.ORDERS.EXPORT_DATA]: true,
      
      // Sales
      ...Object.values(PERMISSIONS.SALES).reduce((acc, perm) => ({ ...acc, [perm]: true }), {}),
      
      // Quotes
      ...Object.values(PERMISSIONS.QUOTES).reduce((acc, perm) => ({ ...acc, [perm]: true }), {}),
      
      // Page access
      [PAGE_ACCESS.DASHBOARD.VIEW]: true,
      [PAGE_ACCESS.ORGANIZATIONS.VIEW]: true,
      [PAGE_ACCESS.USERS.VIEW]: true,
      [PAGE_ACCESS.ORDERS.VIEW]: true,
      [PAGE_ACCESS.ORDERS.EDIT]: true,
      [PAGE_ACCESS.SALES.VIEW]: true,
      [PAGE_ACCESS.SALES.EDIT]: true,
      [PAGE_ACCESS.QUOTES.VIEW]: true,
      [PAGE_ACCESS.QUOTES.EDIT]: true,
      [PAGE_ACCESS.CATALOG.VIEW]: true,
    }
  },
  DESIGNER: {
    description: 'Design team access',
    permissions: {
      // Organizations
      [PERMISSIONS.ORGANIZATIONS.READ]: true,
      
      // Orders - design-related only
      [PERMISSIONS.ORDERS.READ]: true,
      [PERMISSIONS.ORDERS.UPDATE]: true,
      [PERMISSIONS.ORDERS.CHANGE_STATUS]: true,
      [PERMISSIONS.ORDERS.VIEW_INTERNAL_NOTES]: true,
      
      // Catalog
      ...Object.values(PERMISSIONS.CATALOG).reduce((acc, perm) => ({ ...acc, [perm]: true }), {}),
      
      // Quotes
      [PERMISSIONS.QUOTES.CREATE]: true,
      [PERMISSIONS.QUOTES.READ]: true,
      [PERMISSIONS.QUOTES.UPDATE]: true,
      
      // Page access
      [PAGE_ACCESS.DASHBOARD.VIEW]: true,
      [PAGE_ACCESS.ORDERS.VIEW]: true,
      [PAGE_ACCESS.CATALOG.VIEW]: true,
      [PAGE_ACCESS.CATALOG.EDIT]: true,
      [PAGE_ACCESS.QUOTES.VIEW]: true,
      [PAGE_ACCESS.QUOTES.EDIT]: true,
    }
  },
  MANUFACTURING: {
    description: 'Manufacturing team access',
    permissions: {
      // Organizations
      [PERMISSIONS.ORGANIZATIONS.READ]: true,
      
      // Orders - manufacturing-related
      [PERMISSIONS.ORDERS.READ]: true,
      [PERMISSIONS.ORDERS.READ_ALL]: true,
      [PERMISSIONS.ORDERS.UPDATE]: true,
      [PERMISSIONS.ORDERS.CHANGE_STATUS]: true,
      [PERMISSIONS.ORDERS.FULFILL]: true,
      [PERMISSIONS.ORDERS.VIEW_INTERNAL_NOTES]: true,
      [PERMISSIONS.ORDERS.EDIT_INTERNAL_NOTES]: true,
      [PERMISSIONS.ORDERS.EXPORT_DATA]: true,
      
      // Manufacturing
      ...Object.values(PERMISSIONS.MANUFACTURING).reduce((acc, perm) => ({ ...acc, [perm]: true }), {}),
      
      // Catalog
      [PERMISSIONS.CATALOG.READ]: true,
      [PERMISSIONS.CATALOG.MANAGE_INVENTORY]: true,
      
      // Page access
      [PAGE_ACCESS.DASHBOARD.VIEW]: true,
      [PAGE_ACCESS.ORDERS.VIEW]: true,
      [PAGE_ACCESS.MANUFACTURING.VIEW]: true,
      [PAGE_ACCESS.MANUFACTURING.EDIT]: true,
      [PAGE_ACCESS.CATALOG.VIEW]: true,
    }
  },
  CUSTOMER: {
    description: 'Customer access',
    permissions: {
      // Organizations
      [PERMISSIONS.ORGANIZATIONS.READ]: true,
      
      // Users
      [PERMISSIONS.USERS.MANAGE_PROFILE]: true,
      
      // Orders - view own only
      [PERMISSIONS.ORDERS.READ]: true,
      
      // Quotes
      [PERMISSIONS.QUOTES.CREATE]: true,
      [PERMISSIONS.QUOTES.READ]: true,
      [PERMISSIONS.QUOTES.UPDATE]: true,
      
      // Catalog
      [PERMISSIONS.CATALOG.READ]: true,
      
      // Page access
      [PAGE_ACCESS.DASHBOARD.VIEW]: true,
      [PAGE_ACCESS.ORDERS.VIEW]: true,
      [PAGE_ACCESS.QUOTES.VIEW]: true,
      [PAGE_ACCESS.CATALOG.VIEW]: true,
    }
  }
};

/**
 * Custom hook for checking user permissions
 */
export function usePermissions() {
  const { user } = useUser();

  const userPermissions = useMemo((): Record<string, boolean> => {
    if (!user) {
      return {};
    }

    // Get role-based permissions
    const roleKey = user.role?.toUpperCase() as keyof typeof ROLE_PERMISSIONS;
    const rolePermissions = ROLE_PERMISSIONS[roleKey]?.permissions || {};

    // Merge with any custom user permissions
    const customPermissions = user.permissions || {};

    return {
      ...rolePermissions,
      ...customPermissions
    };
  }, [user]);

  const hasPermission = (permission: string): boolean => {
    return userPermissions[permission] === true;
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => userPermissions[permission] === true);
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(permission => userPermissions[permission] === true);
  };

  const canAccessPage = (pagePermission: string): boolean => {
    return hasPermission(pagePermission);
  };

  const getUserRole = (): string => {
    return user?.role || 'CUSTOMER';
  };

  const isAdmin = (): boolean => {
    return user?.role === 'ADMIN' || user?.is_super_admin === true;
  };

  const isManager = (): boolean => {
    return user?.role === 'MANAGER';
  };

  const isStaff = (): boolean => {
    return ['ADMIN', 'MANAGER', 'SALES', 'DESIGNER', 'MANUFACTURING'].includes(user?.role || '');
  };

  const canEditOrder = (_orderId?: string): boolean => {
    // Basic permission check
    if (!hasPermission(PERMISSIONS.ORDERS.UPDATE)) {
      return false;
    }

    // Additional checks could be added here for specific order context
    // For example, checking if user is assigned to the order
    return true;
  };

  const canViewFinancials = (): boolean => {
    return hasPermission(PERMISSIONS.ORDERS.VIEW_FINANCIALS);
  };

  const canEditFinancials = (): boolean => {
    return hasPermission(PERMISSIONS.ORDERS.EDIT_FINANCIALS);
  };

  const canApproveStatusChanges = (): boolean => {
    return hasPermission(PERMISSIONS.ORDERS.APPROVE_STATUS_CHANGE);
  };

  const canPerformBulkOperations = (): boolean => {
    return hasPermission(PERMISSIONS.ORDERS.BULK_OPERATIONS);
  };

  return {
    userPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessPage,
    getUserRole,
    isAdmin,
    isManager,
    isStaff,
    canEditOrder,
    canViewFinancials,
    canEditFinancials,
    canApproveStatusChanges,
    canPerformBulkOperations,
    user,
  };
}