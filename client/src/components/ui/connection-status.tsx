import { Wifi, WifiOff, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWebSocket } from '@/hooks/useWebSocket';

export interface ConnectionStatusProps {
  className?: string;
  showText?: boolean;
  variant?: 'indicator' | 'banner' | 'compact';
}

export function ConnectionStatus({ className, showText = false, variant = 'indicator' }: ConnectionStatusProps) {
  const { status } = useWebSocket();

  const getStatusInfo = () => {
    if (!status.isConnected) {
      return {
        icon: WifiOff,
        text: 'Disconnected',
        color: 'text-red-500',
        bgColor: 'bg-red-50 dark:bg-red-950',
        borderColor: 'border-red-200 dark:border-red-800',
      };
    }

    if (status.isReconnecting) {
      return {
        icon: Loader2,
        text: 'Reconnecting...',
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-50 dark:bg-yellow-950',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
        spin: true,
      };
    }

    if (!status.isAuthenticated) {
      return {
        icon: AlertTriangle,
        text: 'Authenticating...',
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-50 dark:bg-yellow-950',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
      };
    }

    return {
      icon: Wifi,
      text: 'Connected',
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950',
      borderColor: 'border-green-200 dark:border-green-800',
    };
  };

  const statusInfo = getStatusInfo();
  const Icon = statusInfo.icon;

  if (variant === 'indicator') {
    return (
      <div 
        className={cn(
          'flex items-center gap-2',
          className
        )}
        data-testid="connection-status-indicator"
      >
        <Icon 
          className={cn(
            'h-4 w-4',
            statusInfo.color,
            statusInfo.spin && 'animate-spin'
          )} 
        />
        {showText && (
          <span className={cn('text-sm', statusInfo.color)}>
            {statusInfo.text}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div 
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border',
          statusInfo.bgColor,
          statusInfo.borderColor,
          statusInfo.color,
          className
        )}
        data-testid="connection-status-compact"
      >
        <Icon 
          className={cn(
            'h-3 w-3',
            statusInfo.spin && 'animate-spin'
          )} 
        />
        {statusInfo.text}
      </div>
    );
  }

  if (variant === 'banner' && (!status.isConnected || status.isReconnecting)) {
    return (
      <div 
        className={cn(
          'flex items-center justify-center gap-2 px-4 py-2 border-b',
          statusInfo.bgColor,
          statusInfo.borderColor,
          statusInfo.color,
          className
        )}
        data-testid="connection-status-banner"
      >
        <Icon 
          className={cn(
            'h-4 w-4',
            statusInfo.spin && 'animate-spin'
          )} 
        />
        <span className="text-sm font-medium">
          {statusInfo.text}
        </span>
        {status.lastError && (
          <span className="text-xs opacity-70">
            - {status.lastError}
          </span>
        )}
      </div>
    );
  }

  return null;
}

/**
 * Hook to get connection status for custom components
 */
export function useConnectionStatus() {
  const { status } = useWebSocket();
  
  const getStatusLevel = () => {
    if (!status.isConnected) return 'error';
    if (status.isReconnecting || !status.isAuthenticated) return 'warning';
    return 'success';
  };

  return {
    ...status,
    level: getStatusLevel(),
  };
}