import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { OrderStatusBadge } from './OrderStatusBadge';
import { cn } from '@/lib/utils';
import { 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Copy, 
  Archive, 
  Trash2, 
  Play, 
  Pause,
  User,
  Calendar,
  DollarSign,
  Package
} from 'lucide-react';

interface Order {
  id: string;
  code: string;
  customer_contact_name?: string;
  customer_contact_email?: string;
  status_code: string;
  total_amount?: number;
  total_items?: number;
  created_at: string;
  due_date?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  salesperson_name?: string;
}

interface OrderGridViewProps {
  orders: Order[];
  isLoading?: boolean;
  selectedOrders: string[];
  onOrderSelect: (orderId: string) => void;
  onSelectAll: (selected: boolean) => void;
  onBulkAction?: (action: string, orderIds: string[]) => void;
  className?: string;
}

export function OrderGridView({
  orders,
  isLoading = false,
  selectedOrders,
  onOrderSelect,
  onSelectAll,
  onBulkAction,
  className
}: OrderGridViewProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getPriorityBadge = (priority?: string) => {
    if (!priority) return null;

    const configs = {
      low: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300', label: 'Low' },
      medium: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300', label: 'Medium' },
      high: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300', label: 'High' },
      urgent: { color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300', label: 'Urgent' },
    };

    const config = configs[priority as keyof typeof configs];
    if (!config) return null;

    return (
      <Badge variant="outline" className={cn('text-xs border-0', config.color)}>
        {config.label}
      </Badge>
    );
  };

  const handleBulkAction = (action: string, orderId: string) => {
    if (onBulkAction) {
      onBulkAction(action, [orderId]);
    }
  };

  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6', className)}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
              </div>
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-24 mt-2"></div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                <div className="flex gap-2 mt-4">
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
                  <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
        <Package className="h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No orders found</h3>
        <p className="text-gray-500 dark:text-gray-400">Try adjusting your filters or create a new order.</p>
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6', className)}>
      {orders.map((order) => (
        <Card
          key={order.id}
          className={cn(
            'relative transition-all duration-200 hover:shadow-lg cursor-pointer',
            selectedOrders.includes(order.id) && 'ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-900/10',
            hoveredCard === order.id && 'shadow-md'
          )}
          onMouseEnter={() => setHoveredCard(order.id)}
          onMouseLeave={() => setHoveredCard(null)}
          data-testid={`card-order-${order.id}`}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Checkbox
                checked={selectedOrders.includes(order.id)}
                onCheckedChange={() => onOrderSelect(order.id)}
                data-testid={`checkbox-order-${order.id}`}
              />
              <OrderStatusBadge status={order.status_code} size="sm" />
            </div>
            <div className="flex items-center justify-between mt-2">
              <Link 
                to={`/orders/${order.id}/details`}
                className="font-semibold text-lg text-blue-600 hover:underline"
                data-testid={`link-order-${order.id}`}
              >
                {order.code}
              </Link>
              {order.priority && getPriorityBadge(order.priority)}
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="space-y-3">
              {/* Customer Info */}
              <div className="flex items-center text-sm">
                <User className="h-4 w-4 text-gray-400 mr-2" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {order.customer_contact_name || 'Unknown Customer'}
                  </div>
                  {order.customer_contact_email && (
                    <div className="text-gray-500 text-xs truncate">
                      {order.customer_contact_email}
                    </div>
                  )}
                </div>
              </div>

              {/* Order Details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center">
                  <Package className="h-4 w-4 text-gray-400 mr-2" />
                  <span>{order.total_items || 0} items</span>
                </div>
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="font-medium">
                    {order.total_amount ? formatCurrency(order.total_amount) : 'TBD'}
                  </span>
                </div>
              </div>

              {/* Dates */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Created:</span>
                  <span>{formatDate(order.created_at)}</span>
                </div>
                {order.due_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Due:</span>
                    <span className={cn(
                      'font-medium',
                      new Date(order.due_date) < new Date() && order.status_code !== 'completed' && order.status_code !== 'delivered'
                        ? 'text-red-600'
                        : 'text-gray-900 dark:text-gray-100'
                    )}>
                      {formatDate(order.due_date)}
                    </span>
                  </div>
                )}
              </div>

              {/* Salesperson */}
              {order.salesperson_name && (
                <div className="text-xs text-gray-500 border-t pt-2">
                  Sales: {order.salesperson_name}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  asChild
                  size="sm"
                  className="flex-1"
                  data-testid={`button-view-${order.id}`}
                >
                  <Link to={`/orders/${order.id}/details`}>
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Link>
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-2"
                      data-testid={`button-menu-${order.id}`}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to={`/orders/${order.id}/edit`}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Order
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction('duplicate', order.id)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    {order.status_code === 'pending' && (
                      <DropdownMenuItem onClick={() => handleBulkAction('start', order.id)}>
                        <Play className="h-4 w-4 mr-2" />
                        Start Processing
                      </DropdownMenuItem>
                    )}
                    {['processing', 'design', 'manufacturing'].includes(order.status_code) && (
                      <DropdownMenuItem onClick={() => handleBulkAction('pause', order.id)}>
                        <Pause className="h-4 w-4 mr-2" />
                        Put On Hold
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => handleBulkAction('archive', order.id)}>
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                    {order.status_code === 'draft' && (
                      <DropdownMenuItem 
                        onClick={() => handleBulkAction('delete', order.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>

          {/* Overdue indicator */}
          {order.due_date && 
           new Date(order.due_date) < new Date() && 
           order.status_code !== 'completed' && 
           order.status_code !== 'delivered' && (
            <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          )}
        </Card>
      ))}
    </div>
  );
}