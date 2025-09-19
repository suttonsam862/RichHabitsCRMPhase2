import { ReactNode, ButtonHTMLAttributes } from 'react';
import { Button } from './ui/button';
import { usePermissions } from '../hooks/usePermissions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface ProtectedButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'role'> {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  role?: string | string[];
  hideOnNoAccess?: boolean;
  disableOnNoAccess?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  tooltip?: string;
  noAccessTooltip?: string;
  'data-testid'?: string;
}

/**
 * Button component that respects user permissions
 */
export function ProtectedButton({
  children,
  permission,
  permissions = [],
  requireAll = false,
  role,
  hideOnNoAccess = false,
  disableOnNoAccess = true,
  variant = 'default',
  size = 'default',
  tooltip,
  noAccessTooltip = 'You do not have permission to perform this action',
  disabled,
  onClick,
  ...props
}: ProtectedButtonProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, getUserRole } = usePermissions();

  // Check role-based access
  let hasRoleAccess = true;
  if (role) {
    const userRole = getUserRole();
    const allowedRoles = Array.isArray(role) ? role : [role];
    hasRoleAccess = allowedRoles.includes(userRole);
  }

  // Check permission-based access
  let hasPermissionAccess = true;
  if (permission) {
    hasPermissionAccess = hasPermission(permission);
  } else if (permissions.length > 0) {
    hasPermissionAccess = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  }

  const hasAccess = hasRoleAccess && hasPermissionAccess;

  // Hide completely if no access and hideOnNoAccess is true
  if (!hasAccess && hideOnNoAccess) {
    return null;
  }

  // Determine if button should be disabled
  const isDisabled = disabled || (!hasAccess && disableOnNoAccess);

  // Handle click events with permission checking
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!hasAccess) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onClick?.(event);
  };

  const button = (
    <Button
      variant={variant}
      size={size}
      disabled={isDisabled}
      onClick={handleClick}
      {...props}
      data-testid={props['data-testid']}
    >
      {children}
    </Button>
  );

  // Show tooltip for disabled buttons or when access is restricted
  const shouldShowTooltip = (tooltip && !isDisabled) || (!hasAccess && noAccessTooltip);
  const tooltipContent = !hasAccess ? noAccessTooltip : tooltip;

  if (shouldShowTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipContent}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}