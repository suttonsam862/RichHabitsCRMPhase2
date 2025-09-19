import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, Users, Package, AlertCircle, CheckCircle, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useOrderRealtimeUpdates } from '@/hooks/useWebSocket';
import { ConnectionStatus } from '@/components/ui/connection-status';
import { formatDistanceToNow } from 'date-fns';

interface Order {
  id: string;
  code: string;
  statusCode: string;
  customerContactName: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
}

interface OrderItem {
  id: string;
  nameSnapshot: string;
  quantity: number;
  statusCode: string;
  priceSnapshot: number;
}

interface RealtimeOrderCardProps {
  orderId: string;
  showRealtimeIndicator?: boolean;
  onOrderUpdate?: (order: Order) => void;
}

export function RealtimeOrderCard({ 
  orderId, 
  showRealtimeIndicator = true,
  onOrderUpdate 
}: RealtimeOrderCardProps) {
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [updateAnimation, setUpdateAnimation] = useState(false);

  // Fetch order data
  const { data: order, isLoading, refetch } = useQuery<Order>({
    queryKey: ['orders', orderId],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}`);
      if (!response.ok) throw new Error('Failed to fetch order');
      return response.json();
    },
    refetchInterval: 30000, // Fallback polling every 30 seconds
  });

  // Subscribe to real-time updates for this order
  const lastUpdate = useOrderRealtimeUpdates(orderId);

  // Handle real-time updates
  useEffect(() => {
    if (lastUpdate) {
      setLastUpdateTime(new Date());
      setUpdateAnimation(true);
      
      // Trigger animation reset
      const timer = setTimeout(() => setUpdateAnimation(false), 1000);
      
      // Refetch the order data
      refetch();
      
      // Call parent update callback if provided
      if (onOrderUpdate && order) {
        onOrderUpdate(order);
      }

      return () => clearTimeout(timer);
    }
  }, [lastUpdate, refetch, onOrderUpdate, order]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'processing': return Activity;
      case 'shipped': return Package;
      case 'cancelled': return AlertCircle;
      default: return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'processing': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'shipped': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'cancelled': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getOrderProgress = () => {
    if (!order?.items) return 0;
    
    const completedItems = order.items.filter(item => 
      ['completed', 'shipped'].includes(item.statusCode)
    ).length;
    
    return (completedItems / order.items.length) * 100;
  };

  if (isLoading) {
    return (
      <Card data-testid={`order-card-loading-${orderId}`}>
        <CardHeader className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!order) {
    return (
      <Card data-testid={`order-card-error-${orderId}`}>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Failed to load order</p>
        </CardContent>
      </Card>
    );
  }

  const StatusIcon = getStatusIcon(order.statusCode);
  const progress = getOrderProgress();

  return (
    <Card 
      className={`transition-all duration-300 ${
        updateAnimation ? 'ring-2 ring-blue-500 shadow-lg scale-[1.02]' : 'hover:shadow-md'
      }`}
      data-testid={`order-card-${orderId}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold">
              {order.code}
            </CardTitle>
            {showRealtimeIndicator && (
              <div className="flex items-center gap-1">
                <ConnectionStatus variant="compact" />
                {lastUpdateTime && (
                  <Badge 
                    variant="outline" 
                    className="text-xs animate-pulse"
                    data-testid="badge-last-update"
                  >
                    Updated {formatDistanceToNow(lastUpdateTime, { addSuffix: true })}
                  </Badge>
                )}
              </div>
            )}
          </div>
          
          <Badge 
            className={`${getStatusColor(order.statusCode)} capitalize font-medium`}
            data-testid={`badge-status-${order.statusCode}`}
          >
            <StatusIcon className="h-3 w-3 mr-1" />
            {order.statusCode.replace('_', ' ')}
          </Badge>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{order.customerContactName}</span>
          </div>
          <div className="flex items-center gap-1">
            <Package className="h-4 w-4" />
            <span>{order.items?.length || 0} items</span>
          </div>
          <div className="font-medium text-foreground">
            ${order.totalAmount?.toFixed(2) || '0.00'}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {order.items && order.items.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Order Progress</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            
            <Progress 
              value={progress} 
              className="h-2"
              data-testid="progress-order-completion"
            />
            
            <div className="space-y-2">
              {order.items.slice(0, 3).map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                  data-testid={`order-item-${item.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.nameSnapshot}</p>
                    <p className="text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className="text-xs capitalize"
                    data-testid={`item-status-${item.statusCode}`}
                  >
                    {item.statusCode.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
              
              {order.items.length > 3 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  +{order.items.length - 3} more items
                </p>
              )}
            </div>
          </div>
        )}
        
        <div className="mt-4 pt-3 border-t text-xs text-muted-foreground flex justify-between">
          <span>Created {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}</span>
          {lastUpdate && (
            <span className="text-blue-600 font-medium">
              Live updates active
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Example usage in an order list component:
 * 
 * ```tsx
 * export function OrdersList() {
 *   const [orders, setOrders] = useState<Order[]>([]);
 *   
 *   const handleOrderUpdate = useCallback((updatedOrder: Order) => {
 *     // Handle individual order updates in the list
 *     setOrders(prev => prev.map(order => 
 *       order.id === updatedOrder.id ? updatedOrder : order
 *     ));
 *   }, []);
 *   
 *   return (
 *     <div className="grid gap-4">
 *       {orders.map(order => (
 *         <RealtimeOrderCard 
 *           key={order.id}
 *           orderId={order.id}
 *           onOrderUpdate={handleOrderUpdate}
 *         />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */