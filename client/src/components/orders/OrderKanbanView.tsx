import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
  DollarSign,
  Package,
  Calendar,
  Plus
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

interface OrderKanbanViewProps {
  orders: Order[];
  isLoading?: boolean;
  onBulkAction?: (action: string, orderIds: string[]) => void;
  onStatusChange?: (orderId: string, newStatus: string) => void;
  className?: string;
}

const STATUS_COLUMNS = [
  { key: 'draft', title: 'Draft', color: 'bg-gray-100 dark:bg-gray-800' },
  { key: 'pending', title: 'Pending', color: 'bg-yellow-100 dark:bg-yellow-900/20' },
  { key: 'confirmed', title: 'Confirmed', color: 'bg-blue-100 dark:bg-blue-900/20' },
  { key: 'design', title: 'Design', color: 'bg-indigo-100 dark:bg-indigo-900/20' },
  { key: 'manufacturing', title: 'Manufacturing', color: 'bg-orange-100 dark:bg-orange-900/20' },
  { key: 'fulfillment', title: 'Fulfillment', color: 'bg-cyan-100 dark:bg-cyan-900/20' },
  { key: 'shipped', title: 'Shipped', color: 'bg-blue-100 dark:bg-blue-900/20' },
  { key: 'completed', title: 'Completed', color: 'bg-green-100 dark:bg-green-900/20' },
];

export function OrderKanbanView({
  orders,
  isLoading = false,
  onBulkAction,
  onStatusChange,
  className
}: OrderKanbanViewProps) {
  const [draggedOrder, setDraggedOrder] = useState<Order | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
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

  const getOrdersByStatus = (status: string) => {
    return orders.filter(order => order.status_code === status);
  };

  const handleDragStart = (e: React.DragEvent, order: Order) => {
    setDraggedOrder(order);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnKey);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (draggedOrder && draggedOrder.status_code !== newStatus && onStatusChange) {
      onStatusChange(draggedOrder.id, newStatus);
    }
    
    setDraggedOrder(null);
  };

  const handleBulkAction = (action: string, orderId: string) => {
    if (onBulkAction) {
      onBulkAction(action, [orderId]);
    }
  };

  if (isLoading) {
    return (
      <div className={cn('flex gap-6 h-full', className)}>
        {STATUS_COLUMNS.map((column) => (
          <div key={column.key} className="flex-1 min-w-80">
            <div className="h-full bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-4 animate-pulse"></div>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white dark:bg-gray-700 rounded-lg p-4 animate-pulse">
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-20 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-32 mb-3"></div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-24"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-16"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex gap-6 h-full overflow-x-auto pb-4', className)}>
      {STATUS_COLUMNS.map((column) => {
        const columnOrders = getOrdersByStatus(column.key);
        
        return (
          <div 
            key={column.key} 
            className="flex-shrink-0 w-80"
            onDragOver={(e) => handleDragOver(e, column.key)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.key)}
          >
            <div className={cn(
              'h-full rounded-lg p-4 transition-colors',
              column.color,
              dragOverColumn === column.key && 'ring-2 ring-blue-500'
            )}>
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {column.title}
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {columnOrders.length}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Cards */}
              <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="space-y-3 pr-2">
                  {columnOrders.map((order) => (
                    <Card
                      key={order.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, order)}
                      className={cn(
                        'cursor-move hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-700',
                        draggedOrder?.id === order.id && 'opacity-50'
                      )}
                      data-testid={`kanban-card-${order.id}`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <Link 
                            to={`/orders/${order.id}/details`}
                            className="font-medium text-blue-600 hover:underline"
                            data-testid={`link-order-${order.id}`}
                          >
                            {order.code}
                          </Link>
                          {order.priority && getPriorityBadge(order.priority)}
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0 space-y-3">
                        {/* Customer */}
                        <div className="flex items-center text-sm">
                          <User className="h-3 w-3 text-gray-400 mr-2" />
                          <span className="truncate text-gray-700 dark:text-gray-300">
                            {order.customer_contact_name || 'Unknown'}
                          </span>
                        </div>

                        {/* Items and Amount */}
                        <div className="flex justify-between text-sm">
                          <div className="flex items-center">
                            <Package className="h-3 w-3 text-gray-400 mr-1" />
                            <span className="text-gray-600 dark:text-gray-400">
                              {order.total_items || 0}
                            </span>
                          </div>
                          <div className="flex items-center font-medium">
                            <DollarSign className="h-3 w-3 text-gray-400 mr-1" />
                            <span>
                              {order.total_amount ? formatCurrency(order.total_amount) : 'TBD'}
                            </span>
                          </div>
                        </div>

                        {/* Due Date */}
                        {order.due_date && (
                          <div className="flex items-center text-xs">
                            <Calendar className="h-3 w-3 text-gray-400 mr-2" />
                            <span className={cn(
                              new Date(order.due_date) < new Date() && order.status_code !== 'completed' && order.status_code !== 'delivered'
                                ? 'text-red-600 font-medium'
                                : 'text-gray-500'
                            )}>
                              Due {formatDate(order.due_date)}
                            </span>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2 border-t">
                          <Button
                            asChild
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            data-testid={`button-view-${order.id}`}
                          >
                            <Link to={`/orders/${order.id}/details`}>
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Link>
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                data-testid={`button-menu-${order.id}`}
                              >
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link to={`/orders/${order.id}/edit`}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleBulkAction('duplicate', order.id)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              {order.status_code === 'pending' && (
                                <DropdownMenuItem onClick={() => handleBulkAction('start', order.id)}>
                                  <Play className="h-4 w-4 mr-2" />
                                  Start
                                </DropdownMenuItem>
                              )}
                              {['processing', 'design', 'manufacturing'].includes(order.status_code) && (
                                <DropdownMenuItem onClick={() => handleBulkAction('pause', order.id)}>
                                  <Pause className="h-4 w-4 mr-2" />
                                  Hold
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
                      </CardContent>

                      {/* Overdue indicator */}
                      {order.due_date && 
                       new Date(order.due_date) < new Date() && 
                       order.status_code !== 'completed' && 
                       order.status_code !== 'delivered' && (
                        <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      )}
                    </Card>
                  ))}

                  {columnOrders.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No orders</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        );
      })}
    </div>
  );
}