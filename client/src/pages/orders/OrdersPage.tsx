import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, LayoutDashboard } from 'lucide-react';

// Import the new order components
import { OrderStatsCards } from '@/components/orders/OrderStatsCards';
import { OrderFilters, type OrderFilters as OrderFiltersType } from '@/components/orders/OrderFilters';
import { OrderViewSelector, type OrderViewType } from '@/components/orders/OrderViewSelector';
import { OrderListView } from '@/components/orders/OrderListView';
import { OrderGridView } from '@/components/orders/OrderGridView';
import { OrderKanbanView } from '@/components/orders/OrderKanbanView';
import { OrderBulkActions } from '@/components/orders/OrderBulkActions';
import { apiRequest } from '@/lib/queryClient';

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

export function OrdersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // View and filter state
  const [currentView, setCurrentView] = useState<OrderViewType>('list');
  const [filters, setFilters] = useState<OrderFiltersType>({
    search: '',
    status: 'all',
    customer: 'all',
    salesperson: 'all',
    sport: 'all',
    dateRange: {},
    amountRange: {},
  });

  // Selection and sorting state
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Build query parameters
  const queryParams = useMemo(() => {
    const params: any = {};
    
    if (filters.search) params.q = filters.search;
    if (filters.status && filters.status !== 'all') params.statusCode = filters.status;
    if (filters.customer && filters.customer !== 'all') params.customerId = filters.customer;
    if (filters.salesperson && filters.salesperson !== 'all') params.salespersonId = filters.salesperson;
    if (filters.sport && filters.sport !== 'all') params.sportId = filters.sport;
    if (filters.dateRange.from) params.dateFrom = filters.dateRange.from.toISOString();
    if (filters.dateRange.to) params.dateTo = filters.dateRange.to.toISOString();
    if (filters.amountRange.min) params.amountMin = filters.amountRange.min;
    if (filters.amountRange.max) params.amountMax = filters.amountRange.max;
    
    params.sortBy = sortBy;
    params.sortOrder = sortOrder;
    
    return params;
  }, [filters, sortBy, sortOrder]);

  // Fetch orders list
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['/api/v1/orders', queryParams],
  });

  // Fetch order statistics
  const { data: stats, isLoading: statsLoading } = useQuery<OrderStats>({
    queryKey: ['/api/v1/orders/stats'],
  });

  // Bulk action mutations
  const bulkActionMutation = useMutation({
    mutationFn: async ({ action, orderIds }: { action: string; orderIds: string[] }) => {
      return apiRequest(`/api/v1/orders/bulk-action`, {
        method: 'POST',
        data: { action, orderIds },
      });
    },
    onSuccess: (_, { action, orderIds }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/orders/stats'] });
      setSelectedOrders([]);
      
      const orderText = orderIds.length === 1 ? 'order' : 'orders';
      toast({
        title: 'Action completed',
        description: `Successfully performed ${action} on ${orderIds.length} ${orderText}.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Action failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });

  const statusChangeMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: string; newStatus: string }) => {
      return apiRequest(`/api/v1/orders/${orderId}/status`, {
        method: 'PATCH',
        data: { statusCode: newStatus },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/orders/stats'] });
      toast({
        title: 'Status updated',
        description: 'Order status has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Status update failed',
        description: error instanceof Error ? error.message : 'Failed to update order status.',
        variant: 'destructive',
      });
    },
  });

  // Event handlers
  const handleOrderSelect = (orderId: string) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectedOrders(selected ? orders.map(order => order.id) : []);
  };

  const handleBulkAction = (action: string, orderIds?: string[]) => {
    const ids = orderIds || selectedOrders;
    bulkActionMutation.mutate({ action, orderIds: ids });
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleStatusChange = (orderId: string, newStatus: string) => {
    statusChangeMutation.mutate({ orderId, newStatus });
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    toast({
      title: 'Export started',
      description: 'Your order export will be ready shortly.',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/">
                <Button variant="ghost" size="sm" data-testid="button-back">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div className="ml-4 flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Order Management</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/fulfillment">
                <Button variant="outline" data-testid="button-fulfillment">
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Fulfillment
                </Button>
              </Link>
              <Link to="/orders/create">
                <Button data-testid="button-create-order">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Order
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Order Statistics */}
        <OrderStatsCards
          stats={stats || {
            totalOrders: 0,
            activeOrders: 0,
            completedThisMonth: 0,
            revenueThisMonth: 0,
            averageOrderValue: 0,
            onTimeDeliveryRate: 0,
            overdueOrders: 0,
          }}
          isLoading={statsLoading}
        />

        {/* Filters */}
        <OrderFilters
          filters={filters}
          onFiltersChange={setFilters}
          onExport={handleExport}
        />

        {/* View Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <OrderViewSelector
              currentView={currentView}
              onViewChange={setCurrentView}
            />
            {selectedOrders.length > 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {selectedOrders.length} order{selectedOrders.length > 1 ? 's' : ''} selected
              </div>
            )}
          </div>
        </div>

        {/* Orders Display */}
        <div className="relative">
          {currentView === 'list' && (
            <OrderListView
              orders={orders}
              isLoading={ordersLoading}
              selectedOrders={selectedOrders}
              onOrderSelect={handleOrderSelect}
              onSelectAll={handleSelectAll}
              onBulkAction={handleBulkAction}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
            />
          )}

          {currentView === 'grid' && (
            <OrderGridView
              orders={orders}
              isLoading={ordersLoading}
              selectedOrders={selectedOrders}
              onOrderSelect={handleOrderSelect}
              onSelectAll={handleSelectAll}
              onBulkAction={handleBulkAction}
            />
          )}

          {currentView === 'kanban' && (
            <OrderKanbanView
              orders={orders}
              isLoading={ordersLoading}
              onBulkAction={handleBulkAction}
              onStatusChange={handleStatusChange}
            />
          )}
        </div>

        {/* Bulk Actions */}
        <OrderBulkActions
          selectedCount={selectedOrders.length}
          onAction={handleBulkAction}
          onClear={() => setSelectedOrders([])}
        />
      </main>
    </div>
  );
}