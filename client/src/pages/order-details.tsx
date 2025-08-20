import { useQuery } from "@tanstack/react-query";
// DEPRECATED: Wouter replaced with React Router - see routes.tsx
// import { useParams, Link } from "wouter";
import { useParams, Link } from "react-router-dom";
import { paths } from "@/lib/paths";
import { ArrowLeft, Calendar, DollarSign, Package, User, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { orders } from "@shared/schema";
type Order = typeof orders.$inferSelect;

export default function OrderDetails() {
  const { id } = useParams<{ id: string }>();

  const { data: order, isLoading, error } = useQuery<Order>({
    queryKey: ["/api/orders", id],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <Card className="glass">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Loading order details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto py-8">
        <Card className="glass">
          <CardContent className="p-8 text-center">
            <p className="text-destructive">Order not found or error loading details.</p>
            <Link to={paths.organizations}>
              <Button className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Organizations
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'secondary';
      case 'in_production':
        return 'default';
      case 'completed':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={paths.organizations}>
          <Button variant="ghost" size="sm" data-testid="button-back-to-organizations">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Organizations
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-order-number">
            {order.orderNumber}
          </h1>
          <p className="text-muted-foreground">Order Details</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Order Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Order Information
                <Badge variant={getStatusColor(order.status)}>
                  {formatStatus(order.status)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Customer</p>
                    <p className="text-muted-foreground" data-testid="text-customer-name">
                      {order.customerName}
                    </p>
                  </div>
                </div>

                {order.totalAmount && (
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Total Amount</p>
                      <p className="text-2xl font-bold text-primary" data-testid="text-total-amount">
                        ${order.totalAmount}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Created:</span>
                  <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Updated:</span>
                  <span>{new Date(order.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>

              {order.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="font-medium mb-2">Notes</p>
                    <p className="text-muted-foreground whitespace-pre-wrap" data-testid="text-order-notes">
                      {order.notes}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Order Items */}
          {order.items && (
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.isArray(order.items) ? order.items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-4 glass rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium" data-testid={`text-item-name-${index}`}>
                          {item.item}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Quantity: <span data-testid={`text-item-quantity-${index}`}>{item.quantity}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium" data-testid={`text-item-price-${index}`}>
                          ${item.price}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Total: ${(item.quantity * item.price).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-muted-foreground text-center py-8">
                      No item details available
                    </p>
                  )}
                </div>

                {Array.isArray(order.items) && order.totalAmount && (
                  <>
                    <Separator className="my-4" />
                    <div className="flex justify-between items-center text-lg font-semibold">
                      <span>Total</span>
                      <span className="text-primary">${order.totalAmount}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Additional order management features coming soon.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}