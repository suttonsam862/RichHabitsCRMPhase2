import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  ArrowUpDown,
  ArrowUp,
  ArrowDown
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

interface OrderListViewProps {
  orders: Order[];
  isLoading?: boolean;
  selectedOrders: string[];
  onOrderSelect: (orderId: string) => void;
  onSelectAll: (selected: boolean) => void;
  onBulkAction?: (action: string, orderIds: string[]) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  className?: string;
}

type SortableColumn = 'code' | 'customer_contact_name' | 'status_code' | 'total_amount' | 'created_at' | 'due_date';

export function OrderListView({
  orders,
  isLoading = false,
  selectedOrders,
  onOrderSelect,
  onSelectAll,
  onBulkAction,
  sortBy,
  sortOrder,
  onSort,
  className
}: OrderListViewProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

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
      low: { color: 'bg-gray-100 text-gray-800', label: 'Low' },
      medium: { color: 'bg-blue-100 text-blue-800', label: 'Medium' },
      high: { color: 'bg-orange-100 text-orange-800', label: 'High' },
      urgent: { color: 'bg-red-100 text-red-800', label: 'Urgent' },
    };

    const config = configs[priority as keyof typeof configs];
    if (!config) return null;

    return (
      <Badge variant="outline" className={cn('text-xs', config.color)}>
        {config.label}
      </Badge>
    );
  };

  const getSortIcon = (column: SortableColumn) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortOrder === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const handleSort = (column: SortableColumn) => {
    if (onSort) {
      onSort(column);
    }
  };

  const handleBulkAction = (action: string) => {
    if (onBulkAction && selectedOrders.length > 0) {
      onBulkAction(action, selectedOrders);
    }
  };

  const allSelected = orders.length > 0 && selectedOrders.length === orders.length;
  const someSelected = selectedOrders.length > 0 && selectedOrders.length < orders.length;

  if (isLoading) {
    return (
      <div className={cn('border rounded-lg', className)}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </TableHead>
              <TableHead>Order Code</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onCheckedChange={onSelectAll}
                data-testid="checkbox-select-all"
              />
            </TableHead>
            <TableHead className="cursor-pointer group" onClick={() => handleSort('code')}>
              <div className="flex items-center">
                Order Code
                {getSortIcon('code')}
              </div>
            </TableHead>
            <TableHead className="cursor-pointer group" onClick={() => handleSort('customer_contact_name')}>
              <div className="flex items-center">
                Customer
                {getSortIcon('customer_contact_name')}
              </div>
            </TableHead>
            <TableHead className="cursor-pointer group" onClick={() => handleSort('status_code')}>
              <div className="flex items-center">
                Status
                {getSortIcon('status_code')}
              </div>
            </TableHead>
            <TableHead>Items</TableHead>
            <TableHead className="cursor-pointer group" onClick={() => handleSort('total_amount')}>
              <div className="flex items-center">
                Total
                {getSortIcon('total_amount')}
              </div>
            </TableHead>
            <TableHead className="cursor-pointer group" onClick={() => handleSort('created_at')}>
              <div className="flex items-center">
                Created
                {getSortIcon('created_at')}
              </div>
            </TableHead>
            <TableHead className="cursor-pointer group" onClick={() => handleSort('due_date')}>
              <div className="flex items-center">
                Due Date
                {getSortIcon('due_date')}
              </div>
            </TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow
              key={order.id}
              className={cn(
                'hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
                selectedOrders.includes(order.id) && 'bg-blue-50 dark:bg-blue-900/20'
              )}
              onMouseEnter={() => setHoveredRow(order.id)}
              onMouseLeave={() => setHoveredRow(null)}
              data-testid={`row-order-${order.id}`}
            >
              <TableCell>
                <Checkbox
                  checked={selectedOrders.includes(order.id)}
                  onCheckedChange={() => onOrderSelect(order.id)}
                  data-testid={`checkbox-order-${order.id}`}
                />
              </TableCell>
              <TableCell>
                <Link 
                  to={`/orders/${order.id}/details`}
                  className="font-medium text-blue-600 hover:underline"
                  data-testid={`link-order-${order.id}`}
                >
                  {order.code}
                </Link>
                {order.priority && (
                  <div className="mt-1">
                    {getPriorityBadge(order.priority)}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{order.customer_contact_name || 'Unknown'}</div>
                  {order.customer_contact_email && (
                    <div className="text-sm text-muted-foreground">{order.customer_contact_email}</div>
                  )}
                  {order.salesperson_name && (
                    <div className="text-xs text-muted-foreground">Sales: {order.salesperson_name}</div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <OrderStatusBadge status={order.status_code} />
              </TableCell>
              <TableCell>{order.total_items || 0} items</TableCell>
              <TableCell>
                <div className="font-medium">
                  {order.total_amount ? formatCurrency(order.total_amount) : 'TBD'}
                </div>
              </TableCell>
              <TableCell>{formatDate(order.created_at)}</TableCell>
              <TableCell>
                {order.due_date ? (
                  <div className={cn(
                    'font-medium',
                    new Date(order.due_date) < new Date() && order.status_code !== 'completed' && order.status_code !== 'delivered'
                      ? 'text-red-600'
                      : 'text-gray-900 dark:text-gray-100'
                  )}>
                    {formatDate(order.due_date)}
                  </div>
                ) : (
                  <span className="text-muted-foreground">No due date</span>
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'h-8 w-8 p-0 transition-opacity',
                        hoveredRow === order.id ? 'opacity-100' : 'opacity-0'
                      )}
                      data-testid={`button-menu-${order.id}`}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to={`/orders/${order.id}/details`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={`/orders/${order.id}/edit`}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Order
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction('duplicate')}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    {order.status_code === 'pending' && (
                      <DropdownMenuItem onClick={() => handleBulkAction('start')}>
                        <Play className="h-4 w-4 mr-2" />
                        Start Processing
                      </DropdownMenuItem>
                    )}
                    {['processing', 'design', 'manufacturing'].includes(order.status_code) && (
                      <DropdownMenuItem onClick={() => handleBulkAction('pause')}>
                        <Pause className="h-4 w-4 mr-2" />
                        Put On Hold
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => handleBulkAction('archive')}>
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                    {order.status_code === 'draft' && (
                      <DropdownMenuItem 
                        onClick={() => handleBulkAction('delete')}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
          {orders.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                No orders found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}