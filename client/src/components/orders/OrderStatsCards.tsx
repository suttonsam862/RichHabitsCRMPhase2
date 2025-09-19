import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { 
  Package, 
  Truck, 
  CheckCircle2, 
  DollarSign, 
  Clock, 
  TrendingUp,
  AlertTriangle,
  Target
} from 'lucide-react';

interface OrderStats {
  totalOrders: number;
  activeOrders: number;
  completedThisMonth: number;
  revenueThisMonth: number;
  averageOrderValue: number;
  onTimeDeliveryRate: number;
  overdueOrders: number;
  monthlyTarget?: number;
  trends?: {
    orders: number;
    revenue: number;
  };
}

interface OrderStatsCardsProps {
  stats: OrderStats;
  isLoading?: boolean;
  className?: string;
}

export function OrderStatsCards({ stats, isLoading = false, className }: OrderStatsCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const cards = [
    {
      title: 'Total Orders',
      value: stats.totalOrders || 0,
      icon: Package,
      description: 'All time orders',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      testId: 'card-total-orders',
    },
    {
      title: 'Active Orders',
      value: stats.activeOrders || 0,
      icon: Truck,
      description: 'In progress or pending',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      testId: 'card-active-orders',
      badge: stats.overdueOrders > 0 ? { text: `${stats.overdueOrders} overdue`, variant: 'destructive' as const } : undefined,
    },
    {
      title: 'Completed This Month',
      value: stats.completedThisMonth || 0,
      icon: CheckCircle2,
      description: 'Successfully delivered',
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      testId: 'card-completed-orders',
      trend: stats.trends?.orders,
    },
    {
      title: 'Revenue This Month',
      value: formatCurrency(stats.revenueThisMonth || 0),
      icon: DollarSign,
      description: 'From completed orders',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      testId: 'card-revenue',
      trend: stats.trends?.revenue,
      progress: stats.monthlyTarget ? (stats.revenueThisMonth / stats.monthlyTarget) * 100 : undefined,
    },
    {
      title: 'Average Order Value',
      value: formatCurrency(stats.averageOrderValue || 0),
      icon: Target,
      description: 'Per order this month',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      testId: 'card-avg-order-value',
    },
    {
      title: 'On-Time Delivery',
      value: formatPercentage(stats.onTimeDeliveryRate || 0),
      icon: Clock,
      description: 'Delivered by due date',
      color: stats.onTimeDeliveryRate >= 90 ? 'text-green-600' : stats.onTimeDeliveryRate >= 80 ? 'text-yellow-600' : 'text-red-600',
      bgColor: stats.onTimeDeliveryRate >= 90 ? 'bg-green-50 dark:bg-green-900/20' : stats.onTimeDeliveryRate >= 80 ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-red-50 dark:bg-red-900/20',
      testId: 'card-delivery-rate',
      progress: stats.onTimeDeliveryRate,
    },
  ];

  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6', className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
              <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6', className)}>
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.testId} data-testid={card.testId} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={cn('p-2 rounded-md', card.bgColor)}>
                <Icon className={cn('h-4 w-4', card.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-2xl font-bold" data-testid={`text-${card.testId.replace('card-', '')}`}>
                    {card.value}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {card.description}
                  </p>
                </div>
                
                {/* Trend Indicator */}
                {card.trend !== undefined && (
                  <div className={cn(
                    'flex items-center text-xs font-medium',
                    card.trend > 0 ? 'text-green-600' : card.trend < 0 ? 'text-red-600' : 'text-gray-500'
                  )}>
                    <TrendingUp className={cn('h-3 w-3 mr-1', card.trend < 0 && 'rotate-180')} />
                    {Math.abs(card.trend)}%
                  </div>
                )}

                {/* Badge */}
                {card.badge && (
                  <Badge variant={card.badge.variant} className="text-xs">
                    {card.badge.text}
                  </Badge>
                )}
              </div>

              {/* Progress Bar */}
              {card.progress !== undefined && (
                <div className="mt-3">
                  <Progress 
                    value={Math.min(card.progress, 100)} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Progress</span>
                    <span>{formatPercentage(card.progress)}</span>
                  </div>
                </div>
              )}
            </CardContent>

            {/* Warning indicator for overdue orders */}
            {card.testId === 'card-active-orders' && stats.overdueOrders > 0 && (
              <div className="absolute top-2 right-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}