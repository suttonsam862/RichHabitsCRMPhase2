import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface OrderStatusBadgeProps {
  status: string;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}

export function OrderStatusBadge({ status, className, size = 'default' }: OrderStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    const configs = {
      draft: { 
        color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300', 
        label: 'Draft',
        dotColor: 'bg-gray-400' 
      },
      pending: { 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300', 
        label: 'Pending',
        dotColor: 'bg-yellow-500' 
      },
      confirmed: { 
        color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300', 
        label: 'Confirmed',
        dotColor: 'bg-blue-500' 
      },
      processing: { 
        color: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300', 
        label: 'Processing',
        dotColor: 'bg-purple-500' 
      },
      design: { 
        color: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300', 
        label: 'Design',
        dotColor: 'bg-indigo-500' 
      },
      manufacturing: { 
        color: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300', 
        label: 'Manufacturing',
        dotColor: 'bg-orange-500' 
      },
      fulfillment: { 
        color: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-300', 
        label: 'Fulfillment',
        dotColor: 'bg-cyan-500' 
      },
      shipped: { 
        color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300', 
        label: 'Shipped',
        dotColor: 'bg-blue-600' 
      },
      delivered: { 
        color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300', 
        label: 'Delivered',
        dotColor: 'bg-green-500' 
      },
      completed: { 
        color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300', 
        label: 'Completed',
        dotColor: 'bg-green-600' 
      },
      cancelled: { 
        color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300', 
        label: 'Cancelled',
        dotColor: 'bg-red-500' 
      },
      on_hold: { 
        color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300', 
        label: 'On Hold',
        dotColor: 'bg-gray-500' 
      },
    };

    return configs[status as keyof typeof configs] || configs.pending;
  };

  const config = getStatusConfig(status);

  return (
    <Badge 
      variant="outline" 
      className={cn(
        config.color,
        size === 'sm' && 'text-xs px-2 py-0.5',
        size === 'lg' && 'text-sm px-3 py-1',
        'font-medium border',
        className
      )}
      data-testid={`badge-status-${status}`}
    >
      <div className={cn('w-2 h-2 rounded-full mr-2', config.dotColor)} />
      {config.label}
    </Badge>
  );
}