// Comprehensive permissions system for Rich Habits Custom Clothing
// This defines all possible actions and page access permissions in the system

// Action-level permissions - every action that changes, adds, or deletes data
export const ACTION_PERMISSIONS = {
  // Organizations management
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

  // User management  
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

  // Orders management - Enhanced granular permissions
  ORDERS: {
    CREATE: 'orders.create',
    READ: 'orders.read',
    READ_ALL: 'orders.read_all', // View all orders in org vs just assigned
    UPDATE: 'orders.update',
    UPDATE_SENSITIVE: 'orders.update_sensitive', // Update pricing, costs, internal notes
    DELETE: 'orders.delete',
    CHANGE_STATUS: 'orders.change_status',
    APPROVE_STATUS_CHANGE: 'orders.approve_status_change', // Approve critical status changes
    ASSIGN: 'orders.assign',
    FULFILL: 'orders.fulfill', 
    CANCEL: 'orders.cancel',
    FORCE_CANCEL: 'orders.force_cancel', // Cancel without approval workflow
    VIEW_FINANCIALS: 'orders.view_financials',
    EDIT_FINANCIALS: 'orders.edit_financials',
    VIEW_INTERNAL_NOTES: 'orders.view_internal_notes',
    EDIT_INTERNAL_NOTES: 'orders.edit_internal_notes',
    BULK_OPERATIONS: 'orders.bulk_operations',
    EXPORT_DATA: 'orders.export_data',
    OVERRIDE_VALIDATIONS: 'orders.override_validations', // Skip business rule validations
  },

  // Product catalog management
  CATALOG: {
    CREATE: 'catalog.create',
    READ: 'catalog.read',
    UPDATE: 'catalog.update',
    DELETE: 'catalog.delete',
    MANAGE_VARIANTS: 'catalog.manage_variants',
    SET_PRICING: 'catalog.set_pricing',
    MANAGE_INVENTORY: 'catalog.manage_inventory',
  },

  // Sales management
  SALES: {
    CREATE_LEADS: 'sales.create_leads',
    READ_LEADS: 'sales.read_leads',
    UPDATE_LEADS: 'sales.update_leads',
    DELETE_LEADS: 'sales.delete_leads',
    CONVERT_LEADS: 'sales.convert_leads',
    MANAGE_PIPELINE: 'sales.manage_pipeline',
    VIEW_ANALYTICS: 'sales.view_analytics',
  },

  // Manufacturing management
  MANUFACTURING: {
    VIEW_ORDERS: 'manufacturing.view_orders',
    UPDATE_PRODUCTION_STATUS: 'manufacturing.update_production_status', 
    MANAGE_PO: 'manufacturing.manage_po',
    VIEW_MATERIALS: 'manufacturing.view_materials',
    UPDATE_MILESTONES: 'manufacturing.update_milestones',
    MANAGE_SCHEDULE: 'manufacturing.manage_schedule',
  },

  // Quote management
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

  // Reports and analytics
  REPORTS: {
    VIEW_SALES: 'reports.view_sales',
    VIEW_MANUFACTURING: 'reports.view_manufacturing', 
    VIEW_FINANCIAL: 'reports.view_financial',
    EXPORT_DATA: 'reports.export_data',
    VIEW_USER_ACTIVITY: 'reports.view_user_activity',
  },

  // Design job management
  DESIGN: {
    CREATE: 'design.create',
    READ: 'design.read',
    UPDATE: 'design.update',
    DELETE: 'design.delete',
    ASSIGN: 'design.assign',
    SUBMIT: 'design.submit',
    REVIEW: 'design.review',
    APPROVE: 'design.approve',
    REQUEST_REVISIONS: 'design.request_revisions',
    MANAGE_ASSETS: 'design.manage_assets',
    VIEW_ALL: 'design.view_all',
    BULK_ASSIGN: 'design.bulk_assign',
  },

  // System administration
  SYSTEM: {
    MANAGE_SETTINGS: 'system.manage_settings',
    VIEW_LOGS: 'system.view_logs',
    BACKUP_DATA: 'system.backup_data',
    MANAGE_INTEGRATIONS: 'system.manage_integrations',
    MANAGE_ROLES: 'system.manage_roles',
  }
} as const;

// Page access permissions - controls what pages and subpages users can view  
export const PAGE_ACCESS = {
  // Main navigation pages
  DASHBOARD: {
    VIEW: 'page.dashboard.view',
    EDIT: 'page.dashboard.edit',
  },
  
  // Organizations pages
  ORGANIZATIONS: {
    VIEW: 'page.organizations.view',
    EDIT: 'page.organizations.edit',
    CREATE: 'page.organizations.create',
    
    // Organization subpages
    GENERAL: 'page.organizations.general',
    SPORTS: 'page.organizations.sports', 
    BRANDING: 'page.organizations.branding',
    USERS: 'page.organizations.users',
    ORDERS: 'page.organizations.orders',
    METRICS: 'page.organizations.metrics',
  },

  // Users management pages
  USERS: {
    VIEW: 'page.users.view',
    EDIT: 'page.users.edit',
    CREATE: 'page.users.create',
    
    // User subpages  
    STAFF: 'page.users.staff',
    CUSTOMERS: 'page.users.customers',
    PERMISSIONS: 'page.users.permissions',
    ROLES: 'page.users.roles',
  },

  // Sales pages
  SALES: {
    VIEW: 'page.sales.view',
    EDIT: 'page.sales.edit',
    
    // Sales subpages
    PIPELINE: 'page.sales.pipeline',
    LEADS: 'page.sales.leads',
    ANALYTICS: 'page.sales.analytics',
  },

  // Orders pages
  ORDERS: {
    VIEW: 'page.orders.view', 
    EDIT: 'page.orders.edit',
    CREATE: 'page.orders.create',
    
    // Order subpages
    ACTIVE: 'page.orders.active',
    COMPLETED: 'page.orders.completed',
    CANCELLED: 'page.orders.cancelled',
  },

  // Manufacturing pages
  MANUFACTURING: {
    VIEW: 'page.manufacturing.view',
    EDIT: 'page.manufacturing.edit',
    
    // Manufacturing subpages
    PRODUCTION: 'page.manufacturing.production',
    PURCHASE_ORDERS: 'page.manufacturing.purchase_orders',
    MATERIALS: 'page.manufacturing.materials',
    SCHEDULE: 'page.manufacturing.schedule',
  },

  // Catalog pages
  CATALOG: {
    VIEW: 'page.catalog.view',
    EDIT: 'page.catalog.edit',
    CREATE: 'page.catalog.create',
    
    // Catalog subpages
    PRODUCTS: 'page.catalog.products',
    VARIANTS: 'page.catalog.variants',
    PRICING: 'page.catalog.pricing',
    INVENTORY: 'page.catalog.inventory',
  },

  // Quote pages
  QUOTES: {
    VIEW: 'page.quotes.view',
    EDIT: 'page.quotes.edit', 
    CREATE: 'page.quotes.create',
    
    // Quote subpages
    ACTIVE: 'page.quotes.active',
    HISTORY: 'page.quotes.history',
    TEMPLATES: 'page.quotes.templates',
  },

  // Reports pages
  REPORTS: {
    VIEW: 'page.reports.view',
    
    // Report subpages
    SALES: 'page.reports.sales',
    MANUFACTURING: 'page.reports.manufacturing',
    FINANCIAL: 'page.reports.financial',
    USER_ACTIVITY: 'page.reports.user_activity',
  },

  // Admin pages
  ADMIN: {
    VIEW: 'page.admin.view',
    
    // Admin subpages  
    SETTINGS: 'page.admin.settings',
    USERS: 'page.admin.users',
    ROLES: 'page.admin.roles',
    INTEGRATIONS: 'page.admin.integrations',
    LOGS: 'page.admin.logs',
  }
} as const;

// Default permissions for each role
export const ROLE_DEFAULTS = {
  ADMIN: {
    description: 'Full system access',
    is_staff: true,
    permissions: {
      // Admin has access to everything
      ...Object.values(ACTION_PERMISSIONS).reduce((acc, category) => ({
        ...acc,
        ...Object.values(category).reduce((perms, perm) => ({ ...perms, [perm]: true }), {})
      }), {}),
      ...Object.values(PAGE_ACCESS).reduce((acc, category) => ({
        ...acc,
        ...Object.entries(category).reduce((perms, [key, perm]) => ({ ...perms, [perm]: true }), {})
      }), {})
    },
    subroles: []
  },

  SALES: {
    description: 'Sales team access',
    is_staff: true,
    permissions: {
      // Organizations - read and basic management
      [ACTION_PERMISSIONS.ORGANIZATIONS.READ]: true,
      [ACTION_PERMISSIONS.ORGANIZATIONS.UPDATE]: true,
      [ACTION_PERMISSIONS.ORGANIZATIONS.SETUP]: true,
      [ACTION_PERMISSIONS.ORGANIZATIONS.MANAGE_SPORTS]: true,
      [ACTION_PERMISSIONS.ORGANIZATIONS.VIEW_METRICS]: true,
      
      // Users - limited customer management
      [ACTION_PERMISSIONS.USERS.CREATE]: true,
      [ACTION_PERMISSIONS.USERS.READ]: true,
      [ACTION_PERMISSIONS.USERS.UPDATE]: true,
      
      // Orders - full management for sales
      [ACTION_PERMISSIONS.ORDERS.CREATE]: true,
      [ACTION_PERMISSIONS.ORDERS.READ]: true,
      [ACTION_PERMISSIONS.ORDERS.READ_ALL]: true,
      [ACTION_PERMISSIONS.ORDERS.UPDATE]: true,
      [ACTION_PERMISSIONS.ORDERS.UPDATE_SENSITIVE]: false, // Requires manager+ approval
      [ACTION_PERMISSIONS.ORDERS.DELETE]: false, // Requires admin approval
      [ACTION_PERMISSIONS.ORDERS.CHANGE_STATUS]: true,
      [ACTION_PERMISSIONS.ORDERS.APPROVE_STATUS_CHANGE]: false, // Manager+ only
      [ACTION_PERMISSIONS.ORDERS.ASSIGN]: true,
      [ACTION_PERMISSIONS.ORDERS.FULFILL]: true,
      [ACTION_PERMISSIONS.ORDERS.CANCEL]: true,
      [ACTION_PERMISSIONS.ORDERS.FORCE_CANCEL]: false, // Admin only
      [ACTION_PERMISSIONS.ORDERS.VIEW_FINANCIALS]: true,
      [ACTION_PERMISSIONS.ORDERS.EDIT_FINANCIALS]: false, // Manager+ only
      [ACTION_PERMISSIONS.ORDERS.VIEW_INTERNAL_NOTES]: true,
      [ACTION_PERMISSIONS.ORDERS.EDIT_INTERNAL_NOTES]: true,
      [ACTION_PERMISSIONS.ORDERS.BULK_OPERATIONS]: true,
      [ACTION_PERMISSIONS.ORDERS.EXPORT_DATA]: true,
      [ACTION_PERMISSIONS.ORDERS.OVERRIDE_VALIDATIONS]: false, // Admin only
      
      // Sales - full access
      ...Object.values(ACTION_PERMISSIONS.SALES).reduce((acc, perm) => ({ ...acc, [perm]: true }), {}),
      
      // Quotes - full access
      ...Object.values(ACTION_PERMISSIONS.QUOTES).reduce((acc, perm) => ({ ...acc, [perm]: true }), {}),
      
      // Catalog - read access
      [ACTION_PERMISSIONS.CATALOG.READ]: true,
      
      // Page access
      [PAGE_ACCESS.DASHBOARD.VIEW]: true,
      [PAGE_ACCESS.ORGANIZATIONS.VIEW]: true,
      [PAGE_ACCESS.ORGANIZATIONS.GENERAL]: true,
      [PAGE_ACCESS.ORGANIZATIONS.SPORTS]: true,
      [PAGE_ACCESS.ORGANIZATIONS.ORDERS]: true,
      [PAGE_ACCESS.ORGANIZATIONS.METRICS]: true,
      [PAGE_ACCESS.USERS.VIEW]: true,
      [PAGE_ACCESS.USERS.CUSTOMERS]: true,
      [PAGE_ACCESS.SALES.VIEW]: true,
      [PAGE_ACCESS.SALES.EDIT]: true,
      [PAGE_ACCESS.ORDERS.VIEW]: true,
      [PAGE_ACCESS.ORDERS.EDIT]: true,
      [PAGE_ACCESS.QUOTES.VIEW]: true,
      [PAGE_ACCESS.QUOTES.EDIT]: true,
      [PAGE_ACCESS.CATALOG.VIEW]: true,
    },
    subroles: ['salesperson']
  },

  MANAGER: {
    description: 'Management team with elevated permissions',
    is_staff: true,
    permissions: {
      // Organizations - full management except delete
      [ACTION_PERMISSIONS.ORGANIZATIONS.READ]: true,
      [ACTION_PERMISSIONS.ORGANIZATIONS.UPDATE]: true,
      [ACTION_PERMISSIONS.ORGANIZATIONS.SETUP]: true,
      [ACTION_PERMISSIONS.ORGANIZATIONS.MANAGE_SPORTS]: true,
      [ACTION_PERMISSIONS.ORGANIZATIONS.MANAGE_USERS]: true,
      [ACTION_PERMISSIONS.ORGANIZATIONS.MANAGE_BRANDING]: true,
      [ACTION_PERMISSIONS.ORGANIZATIONS.VIEW_METRICS]: true,
      
      // Users - full management
      [ACTION_PERMISSIONS.USERS.CREATE]: true,
      [ACTION_PERMISSIONS.USERS.READ]: true,
      [ACTION_PERMISSIONS.USERS.UPDATE]: true,
      [ACTION_PERMISSIONS.USERS.ASSIGN_ROLES]: true,
      [ACTION_PERMISSIONS.USERS.RESET_PASSWORD]: true,
      [ACTION_PERMISSIONS.USERS.DEACTIVATE]: true,
      [ACTION_PERMISSIONS.USERS.VIEW_PERMISSIONS]: true,
      
      // Orders - elevated management permissions
      [ACTION_PERMISSIONS.ORDERS.CREATE]: true,
      [ACTION_PERMISSIONS.ORDERS.READ]: true,
      [ACTION_PERMISSIONS.ORDERS.READ_ALL]: true,
      [ACTION_PERMISSIONS.ORDERS.UPDATE]: true,
      [ACTION_PERMISSIONS.ORDERS.UPDATE_SENSITIVE]: true, // Manager can update sensitive data
      [ACTION_PERMISSIONS.ORDERS.DELETE]: false, // Still requires admin approval
      [ACTION_PERMISSIONS.ORDERS.CHANGE_STATUS]: true,
      [ACTION_PERMISSIONS.ORDERS.APPROVE_STATUS_CHANGE]: true, // Manager can approve
      [ACTION_PERMISSIONS.ORDERS.ASSIGN]: true,
      [ACTION_PERMISSIONS.ORDERS.FULFILL]: true,
      [ACTION_PERMISSIONS.ORDERS.CANCEL]: true,
      [ACTION_PERMISSIONS.ORDERS.FORCE_CANCEL]: false, // Admin only
      [ACTION_PERMISSIONS.ORDERS.VIEW_FINANCIALS]: true,
      [ACTION_PERMISSIONS.ORDERS.EDIT_FINANCIALS]: true, // Manager can edit financials
      [ACTION_PERMISSIONS.ORDERS.VIEW_INTERNAL_NOTES]: true,
      [ACTION_PERMISSIONS.ORDERS.EDIT_INTERNAL_NOTES]: true,
      [ACTION_PERMISSIONS.ORDERS.BULK_OPERATIONS]: true,
      [ACTION_PERMISSIONS.ORDERS.EXPORT_DATA]: true,
      [ACTION_PERMISSIONS.ORDERS.OVERRIDE_VALIDATIONS]: false, // Admin only
      
      // Sales - full access
      ...Object.values(ACTION_PERMISSIONS.SALES).reduce((acc, perm) => ({ ...acc, [perm]: true }), {}),
      
      // Quotes - full access
      ...Object.values(ACTION_PERMISSIONS.QUOTES).reduce((acc, perm) => ({ ...acc, [perm]: true }), {}),
      
      // Manufacturing - view and basic management
      [ACTION_PERMISSIONS.MANUFACTURING.VIEW_ORDERS]: true,
      [ACTION_PERMISSIONS.MANUFACTURING.UPDATE_PRODUCTION_STATUS]: true,
      [ACTION_PERMISSIONS.MANUFACTURING.MANAGE_PO]: true,
      [ACTION_PERMISSIONS.MANUFACTURING.VIEW_MATERIALS]: true,
      [ACTION_PERMISSIONS.MANUFACTURING.UPDATE_MILESTONES]: true,
      
      // Catalog - full access
      ...Object.values(ACTION_PERMISSIONS.CATALOG).reduce((acc, perm) => ({ ...acc, [perm]: true }), {}),
      
      // Page access
      [PAGE_ACCESS.DASHBOARD.VIEW]: true,
      [PAGE_ACCESS.DASHBOARD.EDIT]: true,
      [PAGE_ACCESS.ORGANIZATIONS.VIEW]: true,
      [PAGE_ACCESS.ORGANIZATIONS.EDIT]: true,
      [PAGE_ACCESS.ORGANIZATIONS.GENERAL]: true,
      [PAGE_ACCESS.ORGANIZATIONS.SPORTS]: true,
      [PAGE_ACCESS.ORGANIZATIONS.BRANDING]: true,
      [PAGE_ACCESS.ORGANIZATIONS.USERS]: true,
      [PAGE_ACCESS.ORGANIZATIONS.ORDERS]: true,
      [PAGE_ACCESS.ORGANIZATIONS.METRICS]: true,
      [PAGE_ACCESS.USERS.VIEW]: true,
      [PAGE_ACCESS.USERS.EDIT]: true,
      [PAGE_ACCESS.USERS.STAFF]: true,
      [PAGE_ACCESS.USERS.CUSTOMERS]: true,
      [PAGE_ACCESS.SALES.VIEW]: true,
      [PAGE_ACCESS.SALES.EDIT]: true,
      [PAGE_ACCESS.ORDERS.VIEW]: true,
      [PAGE_ACCESS.ORDERS.EDIT]: true,
      [PAGE_ACCESS.QUOTES.VIEW]: true,
      [PAGE_ACCESS.QUOTES.EDIT]: true,
      [PAGE_ACCESS.CATALOG.VIEW]: true,
      [PAGE_ACCESS.CATALOG.EDIT]: true,
      [PAGE_ACCESS.MANUFACTURING.VIEW]: true,
    },
    subroles: ['manager', 'team_lead']
  },

  DESIGNER: {
    description: 'Design team access',
    is_staff: true, 
    permissions: {
      // Organizations - read access
      [ACTION_PERMISSIONS.ORGANIZATIONS.READ]: true,
      [ACTION_PERMISSIONS.ORGANIZATIONS.VIEW_METRICS]: true,
      
      // Orders - limited design-related access
      [ACTION_PERMISSIONS.ORDERS.READ]: true,
      [ACTION_PERMISSIONS.ORDERS.READ_ALL]: false, // Only assigned orders
      [ACTION_PERMISSIONS.ORDERS.UPDATE]: true, // Design-related updates only
      [ACTION_PERMISSIONS.ORDERS.UPDATE_SENSITIVE]: false,
      [ACTION_PERMISSIONS.ORDERS.DELETE]: false,
      [ACTION_PERMISSIONS.ORDERS.CHANGE_STATUS]: true, // Design status only
      [ACTION_PERMISSIONS.ORDERS.APPROVE_STATUS_CHANGE]: false,
      [ACTION_PERMISSIONS.ORDERS.ASSIGN]: false,
      [ACTION_PERMISSIONS.ORDERS.FULFILL]: false,
      [ACTION_PERMISSIONS.ORDERS.CANCEL]: false,
      [ACTION_PERMISSIONS.ORDERS.FORCE_CANCEL]: false,
      [ACTION_PERMISSIONS.ORDERS.VIEW_FINANCIALS]: false,
      [ACTION_PERMISSIONS.ORDERS.EDIT_FINANCIALS]: false,
      [ACTION_PERMISSIONS.ORDERS.VIEW_INTERNAL_NOTES]: true,
      [ACTION_PERMISSIONS.ORDERS.EDIT_INTERNAL_NOTES]: false,
      [ACTION_PERMISSIONS.ORDERS.BULK_OPERATIONS]: false,
      [ACTION_PERMISSIONS.ORDERS.EXPORT_DATA]: false,
      [ACTION_PERMISSIONS.ORDERS.OVERRIDE_VALIDATIONS]: false,
      
      // Catalog - full management
      ...Object.values(ACTION_PERMISSIONS.CATALOG).reduce((acc, perm) => ({ ...acc, [perm]: true }), {}),
      
      // Quotes - create and view
      [ACTION_PERMISSIONS.QUOTES.CREATE]: true,
      [ACTION_PERMISSIONS.QUOTES.READ]: true,
      [ACTION_PERMISSIONS.QUOTES.UPDATE]: true,
      
      // Page access  
      [PAGE_ACCESS.DASHBOARD.VIEW]: true,
      [PAGE_ACCESS.ORGANIZATIONS.VIEW]: true,
      [PAGE_ACCESS.ORGANIZATIONS.GENERAL]: true,
      [PAGE_ACCESS.ORDERS.VIEW]: true,
      [PAGE_ACCESS.CATALOG.VIEW]: true,
      [PAGE_ACCESS.CATALOG.EDIT]: true,
      [PAGE_ACCESS.QUOTES.VIEW]: true,
      [PAGE_ACCESS.QUOTES.EDIT]: true,
    },
    subroles: ['designer']
  },

  MANUFACTURING: {
    description: 'Manufacturing team access', 
    is_staff: true,
    permissions: {
      // Organizations - read access
      [ACTION_PERMISSIONS.ORGANIZATIONS.READ]: true,
      [ACTION_PERMISSIONS.ORGANIZATIONS.VIEW_METRICS]: true,
      
      // Orders - manufacturing-related access
      [ACTION_PERMISSIONS.ORDERS.READ]: true,
      [ACTION_PERMISSIONS.ORDERS.READ_ALL]: true,
      [ACTION_PERMISSIONS.ORDERS.UPDATE]: true, // Production-related updates only
      [ACTION_PERMISSIONS.ORDERS.UPDATE_SENSITIVE]: false,
      [ACTION_PERMISSIONS.ORDERS.DELETE]: false,
      [ACTION_PERMISSIONS.ORDERS.CHANGE_STATUS]: true, // Production status only
      [ACTION_PERMISSIONS.ORDERS.APPROVE_STATUS_CHANGE]: false,
      [ACTION_PERMISSIONS.ORDERS.ASSIGN]: false,
      [ACTION_PERMISSIONS.ORDERS.FULFILL]: true,
      [ACTION_PERMISSIONS.ORDERS.CANCEL]: false,
      [ACTION_PERMISSIONS.ORDERS.FORCE_CANCEL]: false,
      [ACTION_PERMISSIONS.ORDERS.VIEW_FINANCIALS]: false,
      [ACTION_PERMISSIONS.ORDERS.EDIT_FINANCIALS]: false,
      [ACTION_PERMISSIONS.ORDERS.VIEW_INTERNAL_NOTES]: true,
      [ACTION_PERMISSIONS.ORDERS.EDIT_INTERNAL_NOTES]: true,
      [ACTION_PERMISSIONS.ORDERS.BULK_OPERATIONS]: false,
      [ACTION_PERMISSIONS.ORDERS.EXPORT_DATA]: true,
      [ACTION_PERMISSIONS.ORDERS.OVERRIDE_VALIDATIONS]: false,
      
      // Manufacturing - full access
      ...Object.values(ACTION_PERMISSIONS.MANUFACTURING).reduce((acc, perm) => ({ ...acc, [perm]: true }), {}),
      
      // Catalog - read access  
      [ACTION_PERMISSIONS.CATALOG.READ]: true,
      [ACTION_PERMISSIONS.CATALOG.MANAGE_INVENTORY]: true,
      
      // Page access
      [PAGE_ACCESS.DASHBOARD.VIEW]: true,
      [PAGE_ACCESS.ORGANIZATIONS.VIEW]: true,
      [PAGE_ACCESS.ORGANIZATIONS.GENERAL]: true,
      [PAGE_ACCESS.ORDERS.VIEW]: true,
      [PAGE_ACCESS.MANUFACTURING.VIEW]: true,
      [PAGE_ACCESS.MANUFACTURING.EDIT]: true,
      [PAGE_ACCESS.CATALOG.VIEW]: true,
    },
    subroles: ['manufacturer']
  },

  CUSTOMER: {
    description: 'Customer access',
    is_staff: false,
    permissions: {
      // Limited organization view of their own organization
      [ACTION_PERMISSIONS.ORGANIZATIONS.READ]: true,
      
      // Limited user management - own profile only
      [ACTION_PERMISSIONS.USERS.MANAGE_PROFILE]: true,
      
      // Orders - very limited customer access
      [ACTION_PERMISSIONS.ORDERS.READ]: true, // Own orders only
      [ACTION_PERMISSIONS.ORDERS.READ_ALL]: false,
      [ACTION_PERMISSIONS.ORDERS.UPDATE]: false,
      [ACTION_PERMISSIONS.ORDERS.UPDATE_SENSITIVE]: false,
      [ACTION_PERMISSIONS.ORDERS.DELETE]: false,
      [ACTION_PERMISSIONS.ORDERS.CHANGE_STATUS]: false,
      [ACTION_PERMISSIONS.ORDERS.APPROVE_STATUS_CHANGE]: false,
      [ACTION_PERMISSIONS.ORDERS.ASSIGN]: false,
      [ACTION_PERMISSIONS.ORDERS.FULFILL]: false,
      [ACTION_PERMISSIONS.ORDERS.CANCEL]: false,
      [ACTION_PERMISSIONS.ORDERS.FORCE_CANCEL]: false,
      [ACTION_PERMISSIONS.ORDERS.VIEW_FINANCIALS]: false,
      [ACTION_PERMISSIONS.ORDERS.EDIT_FINANCIALS]: false,
      [ACTION_PERMISSIONS.ORDERS.VIEW_INTERNAL_NOTES]: false,
      [ACTION_PERMISSIONS.ORDERS.EDIT_INTERNAL_NOTES]: false,
      [ACTION_PERMISSIONS.ORDERS.BULK_OPERATIONS]: false,
      [ACTION_PERMISSIONS.ORDERS.EXPORT_DATA]: false,
      [ACTION_PERMISSIONS.ORDERS.OVERRIDE_VALIDATIONS]: false,
      
      // Quote access
      [ACTION_PERMISSIONS.QUOTES.CREATE]: true,
      [ACTION_PERMISSIONS.QUOTES.READ]: true,
      [ACTION_PERMISSIONS.QUOTES.UPDATE]: true,
      
      // Catalog - view only
      [ACTION_PERMISSIONS.CATALOG.READ]: true,
      
      // Limited page access
      [PAGE_ACCESS.DASHBOARD.VIEW]: true,
      [PAGE_ACCESS.ORDERS.VIEW]: true,
      [PAGE_ACCESS.QUOTES.VIEW]: true,
      [PAGE_ACCESS.CATALOG.VIEW]: true,
    },
    subroles: []
  }
} as const;

// Helper functions for checking permissions
export function hasPermission(userPermissions: Record<string, boolean>, requiredPermission: string): boolean {
  return userPermissions[requiredPermission] === true;
}

export function hasAnyPermission(userPermissions: Record<string, boolean>, requiredPermissions: string[]): boolean {
  return requiredPermissions.some(perm => userPermissions[perm] === true);
}

export function hasAllPermissions(userPermissions: Record<string, boolean>, requiredPermissions: string[]): boolean {
  return requiredPermissions.every(perm => userPermissions[perm] === true);
}

export function getPermissionsByCategory(userPermissions: Record<string, boolean>, category: string): string[] {
  return Object.keys(userPermissions).filter(perm => 
    perm.startsWith(category + '.') && userPermissions[perm] === true
  );
}

// Get all permissions as a flat array
export const ALL_PERMISSIONS = [
  ...Object.values(ACTION_PERMISSIONS).flatMap(category => Object.values(category)),
  ...Object.values(PAGE_ACCESS).flatMap(category => typeof category === 'object' ? Object.values(category) : [category])
];