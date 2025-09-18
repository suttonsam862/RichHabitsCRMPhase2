
/**
 * Role-based access control system
 * Defines user roles and route access permissions with stackable roles
 */

export enum Role {
  ADMIN = "admin",
  STAFF = "staff",
  SALES = "sales", 
  DESIGNER = "designer",
  MANUFACTURING = "manufacturing",
  CUSTOMER = "customer",
}

export enum SubRole {
  SALESPERSON = "salesperson",
  DESIGNER = "designer", 
  MANUFACTURER = "manufacturer"
}

// Route access matrix - defines which roles can access which routes
export const RoleMap: Record<string, Role[]> = {
  // Admin routes - full access
  "/admin": [Role.ADMIN],
  "/users": [Role.ADMIN],
  
  // Sales routes - accessible to sales role or admin/staff with salesperson subrole
  "/sales": [Role.ADMIN, Role.STAFF, Role.SALES],
  "/sales/:id": [Role.ADMIN, Role.STAFF, Role.SALES],
  
  // Orders routes  
  "/orders": [Role.ADMIN, Role.STAFF, Role.SALES, Role.MANUFACTURING],
  "/orders/:id": [Role.ADMIN, Role.STAFF, Role.SALES, Role.MANUFACTURING],
  
  // Manufacturing routes
  "/manufacturing": [Role.ADMIN, Role.STAFF, Role.MANUFACTURING],
  "/manufacturing/po/:id": [Role.ADMIN, Role.STAFF, Role.MANUFACTURING],
  
  // Catalog routes
  "/catalog": [Role.ADMIN, Role.STAFF, Role.DESIGNER, Role.SALES],
  "/catalog/:id": [Role.ADMIN, Role.STAFF, Role.DESIGNER],
  
  // Quote generator - multiple roles
  "/quotes": [Role.ADMIN, Role.STAFF, Role.SALES, Role.CUSTOMER],
  "/quotes/history": [Role.ADMIN, Role.STAFF, Role.SALES, Role.CUSTOMER],
  
  // Organizations - admin and sales
  "/organizations": [Role.ADMIN, Role.STAFF, Role.SALES],
  
  // Public routes - accessible to all roles
  "/": [Role.ADMIN, Role.STAFF, Role.SALES, Role.DESIGNER, Role.MANUFACTURING, Role.CUSTOMER],
};

// Helper functions
export function hasAccess(userRole: Role, userSubrole: SubRole | null, route: string): boolean {
  // Check exact route match first
  if (RoleMap[route]) {
    const hasRoleAccess = RoleMap[route].includes(userRole);
    
    // Special handling for stackable roles
    if (!hasRoleAccess && (userRole === Role.ADMIN || userRole === Role.STAFF)) {
      // Admin and staff can access sales routes if they have salesperson subrole
      if (route.startsWith('/sales') && userSubrole === SubRole.SALESPERSON) {
        return true;
      }
      // Admin and staff can access manufacturing routes if they have manufacturer subrole
      if (route.startsWith('/manufacturing') && userSubrole === SubRole.MANUFACTURER) {
        return true;
      }
      // Admin and staff can access design routes if they have designer subrole
      if (route.startsWith('/catalog') && userSubrole === SubRole.DESIGNER) {
        return true;
      }
    }
    
    return hasRoleAccess;
  }
  
  // Check pattern matches (for dynamic routes like /sales/:id)
  for (const [routePattern, allowedRoles] of Object.entries(RoleMap)) {
    if (routeMatches(route, routePattern)) {
      const hasRoleAccess = allowedRoles.includes(userRole);
      
      // Special handling for stackable roles on pattern routes
      if (!hasRoleAccess && (userRole === Role.ADMIN || userRole === Role.STAFF)) {
        if (routePattern.startsWith('/sales') && userSubrole === SubRole.SALESPERSON) {
          return true;
        }
        if (routePattern.startsWith('/manufacturing') && userSubrole === SubRole.MANUFACTURER) {
          return true;
        }
        if (routePattern.startsWith('/catalog') && userSubrole === SubRole.DESIGNER) {
          return true;
        }
      }
      
      return hasRoleAccess;
    }
  }
  
  // Default deny if no match found
  return false;
}

function routeMatches(actualRoute: string, pattern: string): boolean {
  // Convert pattern to regex (replace :param with [^/]+)
  const regexPattern = pattern.replace(/:([^/]+)/g, '([^/]+)');
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(actualRoute);
}

export function getUserRoleDisplayName(role: Role, subrole?: SubRole | null): string {
  const baseRole = (() => {
    switch (role) {
      case Role.ADMIN: return "Administrator";
      case Role.STAFF: return "Staff";
      case Role.SALES: return "Sales Representative";
      case Role.DESIGNER: return "Designer";
      case Role.MANUFACTURING: return "Manufacturing";
      case Role.CUSTOMER: return "Customer";
      default: return role;
    }
  })();
  
  if (subrole) {
    const subroleText = (() => {
      switch (subrole) {
        case SubRole.SALESPERSON: return "Sales";
        case SubRole.DESIGNER: return "Design";
        case SubRole.MANUFACTURER: return "Manufacturing";
        default: return subrole;
      }
    })();
    
    return `${baseRole} + ${subroleText}`;
  }
  
  return baseRole;
}

export function getRoleColor(role: Role): string {
  switch (role) {
    case Role.ADMIN: return "bg-red-500";
    case Role.STAFF: return "bg-purple-500"; 
    case Role.SALES: return "bg-blue-500";
    case Role.DESIGNER: return "bg-purple-500";
    case Role.MANUFACTURING: return "bg-orange-500";
    case Role.CUSTOMER: return "bg-green-500";
    default: return "bg-gray-500";
  }
}

export function getSubroleColor(subrole: SubRole): string {
  switch (subrole) {
    case SubRole.SALESPERSON: return "bg-blue-400";
    case SubRole.DESIGNER: return "bg-purple-400"; 
    case SubRole.MANUFACTURER: return "bg-orange-400";
    default: return "bg-gray-400";
  }
}
