import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Role, hasAccess } from "./roles";

interface RequireRoleProps {
  roles: Role[];
  children: ReactNode;
  fallbackPath?: string;
}

// Mock current user - in production this would come from auth context
const getCurrentUser = (): { role: Role } | null => {
  // TODO: Replace with actual authentication system
  // For development, return admin role
  return { role: Role.ADMIN };
};

export function RequireRole({ 
  roles, 
  children, 
  fallbackPath = "/" 
}: RequireRoleProps) {
  const location = useLocation();
  const currentUser = getCurrentUser();
  
  // If no user is logged in, redirect to login (when implemented)
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Check if user's role is in the allowed roles list
  if (!roles.includes(currentUser.role)) {
    console.warn(
      `Access denied: User role '${currentUser.role}' not in allowed roles [${roles.join(', ')}] for route '${location.pathname}'`
    );
    return <Navigate to={fallbackPath} replace />;
  }
  
  return <>{children}</>;
}

// Hook to get current user info
export function useCurrentUser() {
  return getCurrentUser();
}

// Hook to check if current user has access to a route
export function useHasAccess(route: string): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  return hasAccess(user.role, route);
}

// Component to conditionally render based on role access
interface RoleGateProps {
  roles: Role[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGate({ roles, children, fallback = null }: RoleGateProps) {
  const user = getCurrentUser();
  
  if (!user || !roles.includes(user.role)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}