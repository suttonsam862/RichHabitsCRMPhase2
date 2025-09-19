import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Package, Truck, CheckCircle2, Clock, AlertTriangle, MapPin, Phone, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

export default function OrderFulfillmentPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [shippingData, setShippingData] = useState({
    carrier: '',
    trackingNumber: '',
    shippingMethod: '',
    estimatedDelivery: '',
    notes: '',
  });

  // Fetch order fulfillment details
  const { data: order, isLoading, error } = useQuery({
    queryKey: ['/api/orders', orderId, 'fulfillment'],
    enabled: !!orderId,
  });

  // Fetch fulfillment milestones
  const { data: milestones } = useQuery({
    queryKey: ['/api/orders', orderId, 'fulfillment/milestones'],
    enabled: !!orderId,
  });

  // Fetch fulfillment events
  const { data: events } = useQuery({
    queryKey: ['/api/orders', orderId, 'fulfillment/events'],
    enabled: !!orderId,
  });

  // Update fulfillment status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, notes }: { status: string; notes?: string }) => {
      return apiRequest(`/api/orders/${orderId}/fulfillment/status`, {
        method: 'PATCH',
        data: { status, notes },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders', orderId, 'fulfillment'] });
      toast({ title: 'Status updated successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to update status', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Ship order mutation
  const shipOrderMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/orders/${orderId}/ship`, {
        method: 'POST',
        data: shippingData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders', orderId, 'fulfillment'] });
      toast({ title: 'Order marked as shipped successfully' });
      setShippingData({
        carrier: '',
        trackingNumber: '',
        shippingMethod: '',
        estimatedDelivery: '',
        notes: '',
      });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to ship order', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Complete order mutation
  const completeOrderMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/orders/${orderId}/complete`, {
        method: 'POST',
        data: {
          completionType: 'manual',
          verificationMethod: 'user_confirmation',
          notes: 'Order manually completed from fulfillment page',
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders', orderId, 'fulfillment'] });
      toast({ title: 'Order completed successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to complete order', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'yellow', icon: Clock },
      preparing: { color: 'blue', icon: Package },
      packaging: { color: 'blue', icon: Package },
      ready_to_ship: { color: 'purple', icon: Package },
      shipped: { color: 'orange', icon: Truck },
      in_transit: { color: 'orange', icon: Truck },
      delivered: { color: 'green', icon: CheckCircle2 },
      completed: { color: 'green', icon: CheckCircle2 },
      delayed: { color: 'red', icon: AlertTriangle },
      on_hold: { color: 'gray', icon: AlertTriangle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.color as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getMilestoneStatus = (milestone: any) => {
    if (milestone.status === 'completed') return 'text-green-600';
    if (milestone.status === 'in_progress') return 'text-blue-600';
    if (milestone.status === 'blocked') return 'text-red-600';
    return 'text-gray-400';
  };

  const handleStatusUpdate = (status: string, notes?: string) => {
    setIsUpdating(true);
    updateStatusMutation.mutate({ status, notes }, {
      onSettled: () => setIsUpdating(false),
    });
  };

  const handleShipOrder = () => {
    if (!shippingData.carrier || !shippingData.trackingNumber) {
      toast({
        title: 'Missing required information',
        description: 'Please provide carrier and tracking number',
        variant: 'destructive',
      });
      return;
    }
    shipOrderMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Order not found</h2>
          <p className="text-muted-foreground">The requested order could not be found.</p>
          <Link to="/fulfillment">
            <Button className="mt-4">Back to Fulfillment</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/fulfillment">
                <Button variant="ghost" size="sm" data-testid="button-back">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Fulfillment
                </Button>
              </Link>
              <h1 className="ml-4 text-xl font-bold text-gray-900 dark:text-white">
                Order {order.code} - Fulfillment
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {order.fulfillment_status !== 'completed' && (
                <Button 
                  variant="outline"
                  onClick={() => completeOrderMutation.mutate()}
                  disabled={completeOrderMutation.isPending}
                  data-testid="button-complete-order"
                >
                  Complete Order
                </Button>
              )}
              <Link to={`/orders/${orderId}/tracking`}>
                <Button variant="outline" data-testid="button-view-tracking">
                  View Tracking
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Order Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
              <CardDescription>Order #{order.code}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Customer</Label>
                  <p className="text-sm" data-testid="text-customer-name">{order.customer_contact_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(order.fulfillment_status || 'pending')}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Items</Label>
                  <p className="text-sm" data-testid="text-total-items">{order.total_items} items</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Total Value</Label>
                  <p className="text-sm" data-testid="text-total-value">${order.total_amount?.toFixed(2) || '0.00'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Due Date</Label>
                  <p className="text-sm" data-testid="text-due-date">
                    {order.due_date ? new Date(order.due_date).toLocaleDateString() : 'No due date'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Priority</Label>
                  <Badge variant={order.priority >= 8 ? 'destructive' : order.priority >= 5 ? 'default' : 'secondary'}>
                    Priority {order.priority || 5}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm" data-testid="text-customer-email">
                  {order.customer_contact_email || 'No email'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm" data-testid="text-customer-phone">
                  {order.customer_contact_phone || 'No phone'}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  <p data-testid="text-shipping-address">
                    {order.shipping_address || 'No shipping address provided'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Fulfillment Progress</CardTitle>
            <CardDescription>Track the progress of this order through fulfillment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-muted-foreground" data-testid="text-progress-percentage">
                  {order.progress_percentage || 0}% complete
                </span>
              </div>
              <Progress value={order.progress_percentage || 0} className="w-full" />
              
              {/* Milestone Progress */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6">
                {milestones?.map((milestone: any, index: number) => (
                  <div key={milestone.id} className="flex flex-col items-center text-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      milestone.status === 'completed' ? 'bg-green-100 text-green-600' :
                      milestone.status === 'in_progress' ? 'bg-blue-100 text-blue-600' :
                      milestone.status === 'blocked' ? 'bg-red-100 text-red-600' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {index + 1}
                    </div>
                    <p className={`text-xs mt-2 ${getMilestoneStatus(milestone)}`}>
                      {milestone.milestone_code.replace('_', ' ')}
                    </p>
                    {milestone.status === 'completed' && milestone.completed_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(milestone.completed_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fulfillment Actions */}
        <Tabs defaultValue="status" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="status" data-testid="tab-status">Status Updates</TabsTrigger>
            <TabsTrigger value="shipping" data-testid="tab-shipping">Shipping</TabsTrigger>
            <TabsTrigger value="events" data-testid="tab-events">Events Log</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Update Fulfillment Status</CardTitle>
                <CardDescription>Change the current status of this order</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => handleStatusUpdate('preparing')}
                    disabled={isUpdating}
                    data-testid="button-status-preparing"
                  >
                    Start Preparing
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleStatusUpdate('packaging')}
                    disabled={isUpdating}
                    data-testid="button-status-packaging"
                  >
                    Start Packaging
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleStatusUpdate('ready_to_ship')}
                    disabled={isUpdating}
                    data-testid="button-status-ready"
                  >
                    Ready to Ship
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleStatusUpdate('on_hold')}
                    disabled={isUpdating}
                    data-testid="button-status-hold"
                  >
                    Put on Hold
                  </Button>
                </div>
                <Separator />
                <div className="space-y-3">
                  <Label htmlFor="status-notes">Status Update Notes</Label>
                  <Textarea
                    id="status-notes"
                    placeholder="Add notes about the status change..."
                    data-testid="textarea-status-notes"
                  />
                  <Button 
                    className="w-full"
                    disabled={isUpdating}
                    data-testid="button-update-with-notes"
                  >
                    Update Status with Notes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shipping" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Shipping Information</CardTitle>
                <CardDescription>Mark this order as shipped with tracking details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="carrier">Shipping Carrier</Label>
                    <Select 
                      value={shippingData.carrier} 
                      onValueChange={(value) => setShippingData(prev => ({ ...prev, carrier: value }))}
                    >
                      <SelectTrigger data-testid="select-carrier">
                        <SelectValue placeholder="Select carrier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ups">UPS</SelectItem>
                        <SelectItem value="fedex">FedEx</SelectItem>
                        <SelectItem value="usps">USPS</SelectItem>
                        <SelectItem value="dhl">DHL</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tracking">Tracking Number</Label>
                    <Input
                      id="tracking"
                      value={shippingData.trackingNumber}
                      onChange={(e) => setShippingData(prev => ({ ...prev, trackingNumber: e.target.value }))}
                      placeholder="Enter tracking number"
                      data-testid="input-tracking-number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shipping-method">Shipping Method</Label>
                    <Select 
                      value={shippingData.shippingMethod} 
                      onValueChange={(value) => setShippingData(prev => ({ ...prev, shippingMethod: value }))}
                    >
                      <SelectTrigger data-testid="select-shipping-method">
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="expedited">Expedited</SelectItem>
                        <SelectItem value="overnight">Overnight</SelectItem>
                        <SelectItem value="2-day">2-Day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estimated-delivery">Estimated Delivery</Label>
                    <Input
                      id="estimated-delivery"
                      type="date"
                      value={shippingData.estimatedDelivery}
                      onChange={(e) => setShippingData(prev => ({ ...prev, estimatedDelivery: e.target.value }))}
                      data-testid="input-estimated-delivery"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipping-notes">Shipping Notes</Label>
                  <Textarea
                    id="shipping-notes"
                    value={shippingData.notes}
                    onChange={(e) => setShippingData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional shipping notes..."
                    data-testid="textarea-shipping-notes"
                  />
                </div>
                <Button 
                  className="w-full"
                  onClick={handleShipOrder}
                  disabled={shipOrderMutation.isPending}
                  data-testid="button-mark-shipped"
                >
                  Mark as Shipped
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Fulfillment Events Log</CardTitle>
                <CardDescription>Chronological log of all fulfillment activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {events?.map((event: any) => (
                    <div key={event.id} className="flex items-start gap-3 p-3 border rounded-lg" data-testid={`event-${event.id}`}>
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{event.event_code.replace('_', ' ')}</h4>
                          <span className="text-xs text-muted-foreground">
                            {new Date(event.occurred_at).toLocaleString()}
                          </span>
                        </div>
                        {event.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{event.notes}</p>
                        )}
                        {event.actor_user_name && (
                          <p className="text-xs text-muted-foreground mt-1">
                            by {event.actor_user_name}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!events || events.length === 0) && (
                    <p className="text-center text-muted-foreground py-4">
                      No fulfillment events recorded yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}