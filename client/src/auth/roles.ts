/**
 * Role-based access control system
 * Defines user roles and route access permissions
 */

export enum Role {
  ADMIN = "admin",
  SALES = "sales", 
  DESIGNER = "designer",
  MANUFACTURING = "manufacturing",
  CUSTOMER = "customer",
}

// Route access matrix - defines which roles can access which routes
export const RoleMap: Record<string, Role[]> = {
  // Admin routes - full access
  "/admin": [Role.ADMIN],
  "/users": [Role.ADMIN],
  
  // Sales routes
  "/sales": [Role.ADMIN, Role.SALES],
  "/sales/:id": [Role.ADMIN, Role.SALES],
  
  // Orders routes  
  "/orders": [Role.ADMIN, Role.SALES, Role.MANUFACTURING],
  "/orders/:id": [Role.ADMIN, Role.SALES, Role.MANUFACTURING],
  
  // Manufacturing routes
  "/manufacturing": [Role.ADMIN, Role.MANUFACTURING],
  "/manufacturing/po/:id": [Role.ADMIN, Role.MANUFACTURING],
  
  // Catalog routes
  "/catalog": [Role.ADMIN, Role.DESIGNER, Role.SALES],
  "/catalog/:id": [Role.ADMIN, Role.DESIGNER],
  
  // Quote generator - multiple roles
  "/quotes": [Role.ADMIN, Role.SALES, Role.CUSTOMER],
  "/quotes/history": [Role.ADMIN, Role.SALES, Role.CUSTOMER],
  
  // Organizations - admin and sales
  "/organizations": [Role.ADMIN, Role.SALES],
  
  // Public routes - accessible to all roles
  "/": [Role.ADMIN, Role.SALES, Role.DESIGNER, Role.MANUFACTURING, Role.CUSTOMER],
};

// Helper functions
export function hasAccess(userRole: Role, route: string): boolean {
  // Check exact route match first
  if (RoleMap[route]) {
    return RoleMap[route].includes(userRole);
  }
  
  // Check pattern matches (for dynamic routes like /sales/:id)
  for (const [routePattern, allowedRoles] of Object.entries(RoleMap)) {
    if (routeMatches(route, routePattern)) {
      return allowedRoles.includes(userRole);
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

export function getUserRoleDisplayName(role: Role): string {
  switch (role) {
    case Role.ADMIN: return "Administrator";
    case Role.SALES: return "Sales Representative";
    case Role.DESIGNER: return "Designer";
    case Role.MANUFACTURING: return "Manufacturing";
    case Role.CUSTOMER: return "Customer";
    default: return role;
  }
}

export function getRoleColor(role: Role): string {
  switch (role) {
    case Role.ADMIN: return "bg-red-500";
    case Role.SALES: return "bg-blue-500";
    case Role.DESIGNER: return "bg-purple-500";
    case Role.MANUFACTURING: return "bg-orange-500";
    case Role.CUSTOMER: return "bg-green-500";
    default: return "bg-gray-500";
  }
}