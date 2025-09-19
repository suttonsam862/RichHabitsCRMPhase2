import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Package, Truck, CheckCircle2, Clock, AlertTriangle, Search, Filter } from 'lucide-react';

export default function FulfillmentDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch fulfillment overview data
  const { data: overview } = useQuery({
    queryKey: ['/api/fulfillment/overview'],
  });

  // Fetch pending fulfillment orders
  const { data: pendingOrders, isLoading: pendingLoading } = useQuery({
    queryKey: ['/api/fulfillment/pending'],
  });

  // Fetch in-progress fulfillment orders
  const { data: inProgressOrders, isLoading: inProgressLoading } = useQuery({
    queryKey: ['/api/fulfillment/in-progress'],
  });

  // Fetch completed fulfillment orders (recent)
  const { data: completedOrders, isLoading: completedLoading } = useQuery({
    queryKey: ['/api/fulfillment/completed', { limit: 20 }],
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
      <Badge variant={config.color as any} className="flex items-center gap-1" data-testid={`badge-status-${status}`}>
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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
              <h1 className="ml-4 text-xl font-bold text-gray-900 dark:text-white">Fulfillment Dashboard</h1>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" data-testid="button-reports">
                View Reports
              </Button>
              <Button data-testid="button-bulk-actions">
                Bulk Actions
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card data-testid="card-pending-orders">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Fulfillment</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-pending-count">
                {overview?.pendingCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Orders waiting to be processed
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-in-progress-orders">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-progress-count">
                {overview?.inProgressCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Orders being fulfilled
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-shipped-orders">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Shipped Today</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-shipped-count">
                {overview?.shippedTodayCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Orders shipped today
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-completed-orders">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed This Week</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-completed-count">
                {overview?.completedWeekCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Orders completed this week
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48" data-testid="select-status-filter">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="preparing">Preparing</SelectItem>
              <SelectItem value="packaging">Packaging</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Fulfillment Tabs */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pending ({overview?.pendingCount || 0})
            </TabsTrigger>
            <TabsTrigger value="in-progress" data-testid="tab-in-progress">
              In Progress ({overview?.inProgressCount || 0})
            </TabsTrigger>
            <TabsTrigger value="completed" data-testid="tab-completed">
              Completed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Orders Pending Fulfillment</CardTitle>
                <CardDescription>
                  Orders that are ready to be processed and shipped
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingOrders?.map((order: any) => (
                        <TableRow key={order.id} data-testid={`row-pending-order-${order.id}`}>
                          <TableCell>
                            <Link 
                              to={`/orders/${order.id}/fulfillment`}
                              className="font-medium text-blue-600 hover:underline"
                              data-testid={`link-order-${order.id}`}
                            >
                              {order.code}
                            </Link>
                          </TableCell>
                          <TableCell>{order.customer_contact_name}</TableCell>
                          <TableCell>{order.total_items} items</TableCell>
                          <TableCell>
                            <Badge variant={order.priority >= 8 ? 'destructive' : order.priority >= 5 ? 'default' : 'secondary'}>
                              Priority {order.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>{order.due_date ? formatDate(order.due_date) : 'No due date'}</TableCell>
                          <TableCell>
                            <Button 
                              size="sm" 
                              variant="outline"
                              data-testid={`button-start-fulfillment-${order.id}`}
                            >
                              Start Fulfillment
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!pendingOrders || pendingOrders.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            No pending orders found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="in-progress" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Orders In Progress</CardTitle>
                <CardDescription>
                  Orders currently being processed, packaged, or shipped
                </CardDescription>
              </CardHeader>
              <CardContent>
                {inProgressLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inProgressOrders?.map((order: any) => (
                        <TableRow key={order.id} data-testid={`row-progress-order-${order.id}`}>
                          <TableCell>
                            <Link 
                              to={`/orders/${order.id}/fulfillment`}
                              className="font-medium text-blue-600 hover:underline"
                              data-testid={`link-order-${order.id}`}
                            >
                              {order.code}
                            </Link>
                          </TableCell>
                          <TableCell>{order.customer_contact_name}</TableCell>
                          <TableCell>{getStatusBadge(order.fulfillment_status)}</TableCell>
                          <TableCell>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${order.progress_percentage || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-muted-foreground mt-1">
                              {order.progress_percentage || 0}% complete
                            </span>
                          </TableCell>
                          <TableCell>{formatDate(order.updated_at)}</TableCell>
                          <TableCell>
                            <Button 
                              size="sm" 
                              variant="outline"
                              data-testid={`button-update-status-${order.id}`}
                            >
                              Update Status
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!inProgressOrders || inProgressOrders.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            No orders in progress
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recently Completed Orders</CardTitle>
                <CardDescription>
                  Orders that have been successfully completed and delivered
                </CardDescription>
              </CardHeader>
              <CardContent>
                {completedLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Completed Date</TableHead>
                        <TableHead>Total Value</TableHead>
                        <TableHead>Delivery Method</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedOrders?.map((order: any) => (
                        <TableRow key={order.id} data-testid={`row-completed-order-${order.id}`}>
                          <TableCell>
                            <Link 
                              to={`/orders/${order.id}/fulfillment`}
                              className="font-medium text-blue-600 hover:underline"
                              data-testid={`link-order-${order.id}`}
                            >
                              {order.code}
                            </Link>
                          </TableCell>
                          <TableCell>{order.customer_contact_name}</TableCell>
                          <TableCell>{formatDate(order.completed_at)}</TableCell>
                          <TableCell>${order.total_amount?.toFixed(2) || '0.00'}</TableCell>
                          <TableCell>{order.shipping_method || 'Standard'}</TableCell>
                          <TableCell>
                            <Button 
                              size="sm" 
                              variant="outline"
                              data-testid={`button-view-details-${order.id}`}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!completedOrders || completedOrders.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            No completed orders found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}