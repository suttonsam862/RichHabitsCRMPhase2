import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, ExternalLink, Calendar, DollarSign, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CreateOrderForm } from "@/components/create-order-form";
import type { Order } from "../../../shared/supabase-schema";
// DEPRECATED: Wouter replaced with React Router - see routes.tsx
// import { Link } from "wouter";
import { Link } from "react-router-dom";
import { paths } from "@/lib/paths";

interface OrdersTabProps {
  organizationId: string;
  orders?: Order[];
}

export function OrdersTab({ organizationId, orders = [] }: OrdersTabProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Fetch orders for this organization
  const { data: currentOrders = orders } = useQuery<Order[]>({
    queryKey: ["/api/organizations", organizationId, "orders"],
    select: (data) => data || orders,
  });

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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Orders Management</h3>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-order">
              <Plus className="h-4 w-4 mr-2" />
              Add Order
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-strong max-w-3xl">
            <DialogHeader>
              <DialogTitle>Create New Order</DialogTitle>
            </DialogHeader>
            <CreateOrderForm
              organizationId={organizationId}
              onSuccess={() => setShowCreateDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {currentOrders.length === 0 ? (
        <Card className="glass">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              No orders found for this organization.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {currentOrders.map((order) => (
            <Card key={order.id} className="glass" data-testid={`card-order-${order.id}`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <CardTitle className="flex items-center gap-2">
                      <span data-testid={`text-order-number-${order.id}`}>
                        {order.order_number}
                      </span>
                      <Badge variant={getStatusColor(order.status)} className="text-xs">
                        {formatStatus(order.status)}
                      </Badge>
                    </CardTitle>
                    <p className="text-muted-foreground" data-testid={`text-customer-name-${order.id}`}>
                      {order.customer_name}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Link to={paths.orders(order.id)}>
                      <Button variant="ghost" size="sm" data-testid={`button-view-order-${order.id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-4">
                    {order.total_amount && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium" data-testid={`text-order-total-${order.id}`}>
                          ${order.total_amount}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {order.items && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Items</span>
                    </div>
                    <div className="space-y-1">
                      {Array.isArray(order.items) && order.items.slice(0, 3).map((item: any, index: number) => (
                        <div key={index} className="text-sm text-muted-foreground">
                          {item.quantity}x {item.item} - ${item.price}
                        </div>
                      ))}
                      {Array.isArray(order.items) && order.items.length > 3 && (
                        <div className="text-sm text-muted-foreground">
                          +{order.items.length - 3} more items
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {order.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground" data-testid={`text-order-notes-${order.id}`}>
                      {order.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}