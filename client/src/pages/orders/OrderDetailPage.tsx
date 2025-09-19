import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Import order detail components
import { OrderDetailHeader } from '@/components/orders/OrderDetailHeader';
import { OrderItemsTable } from '@/components/orders/OrderItemsTable';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { OrderStatusTransitions } from '@/components/orders/OrderStatusTransitions';

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

interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  name_snapshot: string;
  sku_snapshot?: string;
  price_snapshot: number;
  quantity: number;
  status_code: string;
  designer_id?: string;
  designer_name?: string;
  manufacturer_id?: string;
  manufacturer_name?: string;
  pantone_json?: any;
  build_overrides_text?: string;
  variant_image_url?: string;
  created_at: string;
  updated_at: string;
}

interface TimelineEvent {
  id: string;
  event_code: string;
  actor_user_id?: string;
  actor_name?: string;
  actor_avatar?: string;
  payload?: any;
  occurred_at: string;
  event_type?: string;
}

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch order details
  const { data: order, isLoading: orderLoading } = useQuery<Order>({
    queryKey: ['/api/v1/orders', orderId],
    enabled: !!orderId,
  });

  // Fetch order items
  const { data: orderItems = [], isLoading: itemsLoading } = useQuery<OrderItem[]>({
    queryKey: ['/api/v1/orders', orderId, 'items'],
    enabled: !!orderId,
  });

  // Fetch order timeline/events
  const { data: timelineEvents = [], isLoading: timelineLoading } = useQuery<TimelineEvent[]>({
    queryKey: ['/api/v1/orders', orderId, 'events'],
    enabled: !!orderId,
  });

  // Mutations for order management
  const updateOrderMutation = useMutation({
    mutationFn: async (updates: Partial<Order>) => {
      return apiRequest(`/api/v1/orders/${orderId}`, {
        method: 'PATCH',
        data: updates,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/orders', orderId] });
      toast({
        title: 'Order updated',
        description: 'Order has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Failed to update order.',
        variant: 'destructive',
      });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, updates }: { itemId: string; updates: Partial<OrderItem> }) => {
      return apiRequest(`/api/v1/orders/${orderId}/items/${itemId}`, {
        method: 'PATCH',
        data: updates,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/orders', orderId, 'items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/orders', orderId, 'events'] });
      toast({
        title: 'Item updated',
        description: 'Order item has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Failed to update item.',
        variant: 'destructive',
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return apiRequest(`/api/v1/orders/${orderId}/items/${itemId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/orders', orderId, 'items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/orders', orderId, 'events'] });
      toast({
        title: 'Item removed',
        description: 'Order item has been removed successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Failed to remove item.',
        variant: 'destructive',
      });
    },
  });

  const statusChangeMutation = useMutation({
    mutationFn: async ({ newStatus, note }: { newStatus: string; note?: string }) => {
      return apiRequest(`/api/v1/orders/${orderId}/status`, {
        method: 'PATCH',
        data: { statusCode: newStatus, note },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/orders', orderId] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/orders', orderId, 'events'] });
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

  const addNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      return apiRequest(`/api/v1/orders/${orderId}/notes`, {
        method: 'POST',
        data: { note },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/orders', orderId, 'events'] });
      toast({
        title: 'Note added',
        description: 'Note has been added to the order.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to add note',
        description: error instanceof Error ? error.message : 'Failed to add note.',
        variant: 'destructive',
      });
    },
  });

  // Event handlers
  const handleOrderEdit = () => {
    // TODO: Open order edit modal/form
    toast({
      title: 'Edit Order',
      description: 'Order editing interface will be implemented.',
    });
  };

  const handleOrderDuplicate = () => {
    if (order) {
      // TODO: Implement order duplication
      toast({
        title: 'Duplicate Order',
        description: 'Order duplication will be implemented.',
      });
    }
  };

  const handleOrderArchive = () => {
    if (order) {
      updateOrderMutation.mutate({ statusCode: 'archived' });
    }
  };

  const handleOrderDelete = () => {
    // TODO: Implement order deletion with confirmation
    toast({
      title: 'Delete Order',
      description: 'Order deletion will be implemented.',
    });
  };

  const handleStatusChange = (newStatus: string, note?: string) => {
    statusChangeMutation.mutate({ newStatus, note });
  };

  const handleAddItem = () => {
    // TODO: Open add item modal/form
    toast({
      title: 'Add Item',
      description: 'Add item interface will be implemented.',
    });
  };

  const handleEditItem = (item: OrderItem) => {
    // TODO: Open edit item modal/form
    toast({
      title: 'Edit Item',
      description: `Edit item interface for ${item.name_snapshot} will be implemented.`,
    });
  };

  const handleDeleteItem = (itemId: string) => {
    deleteItemMutation.mutate(itemId);
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    updateItemMutation.mutate({ itemId, updates: { quantity } });
  };

  const handleUpdateItemStatus = (itemId: string, status: string) => {
    updateItemMutation.mutate({ itemId, updates: { statusCode: status } });
  };

  const handleAddNote = () => {
    // TODO: Open add note modal
    const note = prompt('Enter your note:');
    if (note?.trim()) {
      addNoteMutation.mutate(note.trim());
    }
  };

  if (!orderId) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Order not found</h2>
          <p className="text-gray-500">The requested order could not be found.</p>
        </div>
      </div>
    );
  }

  if (orderLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Order not found</h2>
          <p className="text-gray-500">The requested order could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Order Header */}
        <OrderDetailHeader
          order={order}
          onEdit={handleOrderEdit}
          onDuplicate={handleOrderDuplicate}
          onArchive={handleOrderArchive}
          onDelete={handleOrderDelete}
          onStatusChange={handleStatusChange}
          className="mb-8"
        />

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" data-testid="tab-overview">
              Overview
            </TabsTrigger>
            <TabsTrigger value="items" data-testid="tab-items">
              Items ({orderItems.length})
            </TabsTrigger>
            <TabsTrigger value="workflow" data-testid="tab-workflow">
              Workflow
            </TabsTrigger>
            <TabsTrigger value="timeline" data-testid="tab-timeline">
              Timeline ({timelineEvents.length})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Order Items Summary */}
              <div className="lg:col-span-2">
                <OrderItemsTable
                  orderId={orderId}
                  items={orderItems}
                  isLoading={itemsLoading}
                  onAddItem={handleAddItem}
                  onEditItem={handleEditItem}
                  onDeleteItem={handleDeleteItem}
                  onUpdateQuantity={handleUpdateQuantity}
                  onUpdateStatus={handleUpdateItemStatus}
                />
              </div>

              {/* Status Transitions */}
              <div>
                <OrderStatusTransitions
                  currentStatus={order.status_code}
                  onStatusChange={handleStatusChange}
                  isLoading={statusChangeMutation.isPending}
                />
              </div>
            </div>
          </TabsContent>

          {/* Items Tab */}
          <TabsContent value="items">
            <OrderItemsTable
              orderId={orderId}
              items={orderItems}
              isLoading={itemsLoading}
              onAddItem={handleAddItem}
              onEditItem={handleEditItem}
              onDeleteItem={handleDeleteItem}
              onUpdateQuantity={handleUpdateQuantity}
              onUpdateStatus={handleUpdateItemStatus}
            />
          </TabsContent>

          {/* Workflow Tab */}
          <TabsContent value="workflow">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <OrderStatusTransitions
                currentStatus={order.status_code}
                onStatusChange={handleStatusChange}
                isLoading={statusChangeMutation.isPending}
              />
              
              {/* Additional workflow components can go here */}
              <div className="space-y-6">
                {/* Placeholder for future workflow components */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
                  <h3 className="text-lg font-semibold mb-4">Design & Manufacturing</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Design job assignment and manufacturing work order tracking will be implemented here.
                  </p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
                  <h3 className="text-lg font-semibold mb-4">Fulfillment & Shipping</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Fulfillment and shipping management interface will be implemented here.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline">
            <OrderTimeline
              orderId={orderId}
              events={timelineEvents}
              isLoading={timelineLoading}
              onAddNote={handleAddNote}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}