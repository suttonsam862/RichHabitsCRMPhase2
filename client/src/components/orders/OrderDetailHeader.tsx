import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { OrderStatusBadge } from './OrderStatusBadge';
import { cn } from '@/lib/utils';
import { 
  ArrowLeft, 
  Edit, 
  Copy, 
  Archive, 
  Trash2, 
  MoreHorizontal,
  Calendar,
  User,
  Mail,
  Phone,
  DollarSign,
  Package,
  Clock,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

interface Order {
  id: string;
  code: string;
  customer_contact_name?: string;
  customer_contact_email?: string;
  customer_contact_phone?: string;
  status_code: string;
  total_amount?: number;
  revenue_estimate?: number;
  total_items?: number;
  created_at: string;
  updated_at: string;
  due_date?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  salesperson_name?: string;
  notes?: string;
  organization_name?: string;
  sport_name?: string;
}

interface OrderDetailHeaderProps {
  order: Order;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onStatusChange?: (newStatus: string) => void;
  className?: string;
}

export function OrderDetailHeader({
  order,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  onStatusChange,
  className
}: OrderDetailHeaderProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getPriorityConfig = (priority?: string) => {
    const configs = {
      low: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300', label: 'Low', icon: CheckCircle2 },
      medium: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300', label: 'Medium', icon: Clock },
      high: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300', label: 'High', icon: AlertTriangle },
      urgent: { color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300', label: 'Urgent', icon: AlertTriangle },
    };
    return configs[priority as keyof typeof configs] || configs.medium;
  };

  const isOverdue = order.due_date && 
    new Date(order.due_date) < new Date() && 
    !['completed', 'delivered', 'cancelled'].includes(order.status_code);

  const priorityConfig = getPriorityConfig(order.priority);
  const PriorityIcon = priorityConfig.icon;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Navigation and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/orders">
            <Button variant="ghost" size="sm" data-testid="button-back-to-orders">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
          </Link>
          
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="text-order-code">
              {order.code}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Created {formatDate(order.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={onEdit}
            data-testid="button-edit-order"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Order
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" data-testid="button-order-actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate Order
              </DropdownMenuItem>
              
              <DropdownMenuItem>
                <Mail className="h-4 w-4 mr-2" />
                Send Email Update
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={onArchive}>
                <Archive className="h-4 w-4 mr-2" />
                Archive Order
              </DropdownMenuItem>
              
              {order.status_code === 'draft' && (
                <DropdownMenuItem 
                  onClick={onDelete}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Order
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Order Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Status Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Order Status
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <OrderStatusBadge status={order.status_code} size="lg" />
              {isOverdue && (
                <Badge variant="destructive" className="text-xs">
                  Overdue
                </Badge>
              )}
            </div>
            {order.priority && (
              <div className="mt-3 flex items-center gap-2">
                <PriorityIcon className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {priorityConfig.label} Priority
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span className="font-medium" data-testid="text-customer-name">
                  {order.customer_contact_name || 'Unknown Customer'}
                </span>
              </div>
              {order.customer_contact_email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {order.customer_contact_email}
                  </span>
                </div>
              )}
              {order.customer_contact_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {order.customer_contact_phone}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Financial Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Order Value
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-400" />
                <div>
                  <div className="font-bold text-lg" data-testid="text-total-amount">
                    {order.total_amount ? formatCurrency(order.total_amount) : 'TBD'}
                  </div>
                  <div className="text-xs text-gray-500">Total Amount</div>
                </div>
              </div>
              {order.revenue_estimate && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Est. Revenue: {formatCurrency(order.revenue_estimate)}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-400" />
                <span className="text-sm">
                  {order.total_items || 0} items
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm font-medium">Created</div>
                  <div className="text-xs text-gray-500">
                    {formatDate(order.created_at)}
                  </div>
                </div>
              </div>
              {order.due_date && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium">Due Date</div>
                    <div className={cn(
                      'text-xs',
                      isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'
                    )}>
                      {formatDate(order.due_date)}
                    </div>
                  </div>
                </div>
              )}
              <div className="text-xs text-gray-500">
                Updated {formatDate(order.updated_at)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Info Bar */}
      {(order.salesperson_name || order.organization_name || order.sport_name || order.notes) && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {order.salesperson_name && (
                <div>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Salesperson
                  </div>
                  <div className="text-sm">{order.salesperson_name}</div>
                </div>
              )}
              
              {order.organization_name && (
                <div>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Organization
                  </div>
                  <div className="text-sm">{order.organization_name}</div>
                </div>
              )}
              
              {order.sport_name && (
                <div>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Sport/Team
                  </div>
                  <div className="text-sm">{order.sport_name}</div>
                </div>
              )}
              
              {order.notes && (
                <div className="md:col-span-3">
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Notes
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    {order.notes}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}