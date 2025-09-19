import { ReactNode } from 'react';
import { usePermissions } from '../hooks/usePermissions';

interface PermissionGateProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  role?: string | string[];
  hideOnNoAccess?: boolean;
}

/**
 * Component that conditionally renders children based on user permissions
 */
export function PermissionGate({
  children,
  permission,
  permissions = [],
  requireAll = false,
  fallback = null,
  role,
  hideOnNoAccess = false,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, getUserRole } = usePermissions();

  // Check role-based access
  if (role) {
    const userRole = getUserRole();
    const allowedRoles = Array.isArray(role) ? role : [role];
    if (!allowedRoles.includes(userRole)) {
      return hideOnNoAccess ? null : <>{fallback}</>;
    }
  }

  // Check permission-based access
  let hasAccess = true;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions.length > 0) {
    hasAccess = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  }

  if (!hasAccess) {
    return hideOnNoAccess ? null : <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Hook for conditional rendering based on permissions
 */
export function usePermissionGate() {
  const permissions = usePermissions();

  const canRender = (config: Omit<PermissionGateProps, 'children' | 'fallback' | 'hideOnNoAccess'>): boolean => {
    const { permission, permissions: perms = [], requireAll = false, role } = config;

    // Check role-based access
    if (role) {
      const userRole = permissions.getUserRole();
      const allowedRoles = Array.isArray(role) ? role : [role];
      if (!allowedRoles.includes(userRole)) {
        return false;
      }
    }

    // Check permission-based access
    if (permission) {
      return permissions.hasPermission(permission);
    } else if (perms.length > 0) {
      return requireAll 
        ? permissions.hasAllPermissions(perms)
        : permissions.hasAnyPermission(perms);
    }

    return true;
  };

  return { canRender, ...permissions };
}