import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Package, Truck, MapPin, Clock, CheckCircle2, ExternalLink } from 'lucide-react';

export default function OrderTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();

  // Fetch order tracking data
  const { data: tracking, isLoading, error } = useQuery({
    queryKey: ['/api/orders', orderId, 'tracking'],
    enabled: !!orderId,
  });

  // Fetch order basic info
  const { data: order } = useQuery({
    queryKey: ['/api/orders', orderId],
    enabled: !!orderId,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
      case 'preparing':
        return <Clock className="h-5 w-5" />;
      case 'packaging':
      case 'ready_to_ship':
        return <Package className="h-5 w-5" />;
      case 'shipped':
      case 'in_transit':
        return <Truck className="h-5 w-5" />;
      case 'delivered':
      case 'completed':
        return <CheckCircle2 className="h-5 w-5" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'shipped':
      case 'in_transit':
        return 'text-blue-600 bg-blue-100';
      case 'packaging':
      case 'ready_to_ship':
        return 'text-purple-600 bg-purple-100';
      case 'preparing':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !tracking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Tracking information not found</h2>
          <p className="text-muted-foreground">Unable to load tracking details for this order.</p>
          <Link to="/orders">
            <Button className="mt-4">Back to Orders</Button>
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
              <Link to={`/orders/${orderId}/fulfillment`}>
                <Button variant="ghost" size="sm" data-testid="button-back">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Fulfillment
                </Button>
              </Link>
              <h1 className="ml-4 text-xl font-bold text-gray-900 dark:text-white">
                Order Tracking - {order?.code}
              </h1>
            </div>
            {tracking.trackingNumber && (
              <Button variant="outline" asChild data-testid="button-carrier-tracking">
                <a 
                  href={tracking.carrierTrackingUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Track with {tracking.carrier}
                </a>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Current Status Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Current Status</CardTitle>
            <CardDescription>
              Real-time tracking information for order {order?.code}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className={`p-3 rounded-full ${getStatusColor(tracking.currentStatus)}`}>
                {getStatusIcon(tracking.currentStatus)}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold capitalize" data-testid="text-current-status">
                  {tracking.currentStatus.replace('_', ' ')}
                </h3>
                <p className="text-muted-foreground" data-testid="text-status-description">
                  {tracking.statusDescription || 'Order is progressing through fulfillment'}
                </p>
                {tracking.lastUpdated && (
                  <p className="text-sm text-muted-foreground mt-1" data-testid="text-last-updated">
                    Last updated: {formatDate(tracking.lastUpdated)}
                  </p>
                )}
              </div>
              {tracking.estimatedDelivery && (
                <div className="text-right">
                  <p className="text-sm font-medium">Estimated Delivery</p>
                  <p className="text-lg font-semibold text-green-600" data-testid="text-estimated-delivery">
                    {new Date(tracking.estimatedDelivery).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Shipping Information */}
        {tracking.shippingInfo && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Shipping Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Carrier Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Carrier:</span>
                        <span data-testid="text-carrier">{tracking.shippingInfo.carrier}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Service:</span>
                        <span data-testid="text-service">{tracking.shippingInfo.service || 'Standard'}</span>
                      </div>
                      {tracking.shippingInfo.trackingNumber && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tracking #:</span>
                          <span className="font-mono" data-testid="text-tracking-number">
                            {tracking.shippingInfo.trackingNumber}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Delivery Address</h4>
                    <div className="text-sm text-muted-foreground" data-testid="text-delivery-address">
                      {tracking.shippingInfo.deliveryAddress || order?.shipping_address || 'Address not available'}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tracking Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Tracking Timeline</CardTitle>
            <CardDescription>
              Detailed progress of your order through fulfillment and delivery
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {tracking.timeline?.map((event: any, index: number) => (
                <div key={event.id || index} className="flex items-start gap-4" data-testid={`timeline-event-${index}`}>
                  <div className={`p-2 rounded-full flex-shrink-0 ${
                    event.status === 'completed' ? 'bg-green-100 text-green-600' :
                    event.status === 'in_progress' ? 'bg-blue-100 text-blue-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {getStatusIcon(event.eventType || 'pending')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm" data-testid={`event-title-${index}`}>
                        {event.title || event.eventCode?.replace('_', ' ') || 'Unknown Event'}
                      </h4>
                      <span className="text-xs text-muted-foreground" data-testid={`event-time-${index}`}>
                        {formatDate(event.timestamp || event.occurred_at)}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-1" data-testid={`event-description-${index}`}>
                        {event.description}
                      </p>
                    )}
                    {event.location && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span data-testid={`event-location-${index}`}>{event.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {(!tracking.timeline || tracking.timeline.length === 0) && (
                <div className="text-center py-8">
                  <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No tracking events available yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tracking information will appear here as your order progresses
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        {tracking.additionalInfo && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {tracking.additionalInfo}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}