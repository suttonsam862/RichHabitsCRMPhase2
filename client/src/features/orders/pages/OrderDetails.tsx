import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Edit, Package, Truck, CheckCircle } from "lucide-react";
import { OrderStatus } from "../types";

const getStatusColor = (status: OrderStatus) => {
  switch (status) {
    case OrderStatus.DRAFT: return "bg-gray-500";
    case OrderStatus.PENDING: return "bg-yellow-500";
    case OrderStatus.CONFIRMED: return "bg-blue-500";
    case OrderStatus.IN_PRODUCTION: return "bg-purple-500";
    case OrderStatus.READY_FOR_DELIVERY: return "bg-orange-500";
    case OrderStatus.DELIVERED: return "bg-green-500";
    case OrderStatus.CANCELLED: return "bg-red-500";
    default: return "bg-gray-500";
  }
};

const formatStatus = (status: OrderStatus) => {
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export default function OrderDetails() {
  const { id } = useParams<{ id: string }>();

  // Mock order data
  const mockOrder = {
    id: "ORD-001",
    quoteId: "QUO-001",
    customerName: "Acme Corporation",
    customerEmail: "orders@acme.com",
    status: OrderStatus.IN_PRODUCTION,
    items: [
      {
        id: "1",
        productName: "Custom T-Shirt - Navy Blue",
        productId: "PROD-001",
        quantity: 50,
        unitPrice: 15.00,
        totalPrice: 750.00,
      },
      {
        id: "2", 
        productName: "Custom T-Shirt - White",
        productId: "PROD-002",
        quantity: 50,
        unitPrice: 15.00,
        totalPrice: 750.00,
      }
    ],
    totals: {
      subtotal: 1500.00,
      tax: 120.00,
      shipping: 50.00,
      total: 1670.00,
    },
    notes: "Rush order - needed by end of month",
    deliveryDate: "2024-02-01",
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-16T14:20:00Z",
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="sm">
            <Link to="/orders" data-testid="link-back-to-orders">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Orders
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Order {mockOrder.id}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">{mockOrder.customerName}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge className={`${getStatusColor(mockOrder.status)} text-white`}>
            {formatStatus(mockOrder.status)}
          </Badge>
          <Button data-testid="button-edit-order">
            <Edit className="w-4 h-4 mr-2" />
            Edit Order
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockOrder.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0 last:pb-0">
                    <div className="flex-1">
                      <h4 className="font-semibold">{item.productName}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        ${item.unitPrice.toFixed(2)} × {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">${item.totalPrice.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>${mockOrder.totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax:</span>
                  <span>${mockOrder.totals.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Shipping:</span>
                  <span>${mockOrder.totals.shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                  <span>Total:</span>
                  <span>${mockOrder.totals.total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Order Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 dark:text-gray-300">
                {mockOrder.notes || "No special notes for this order."}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Company</label>
                <p className="font-semibold">{mockOrder.customerName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p>{mockOrder.customerEmail}</p>
              </div>
              {mockOrder.quoteId && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Quote ID</label>
                  <p className="font-mono text-sm">{mockOrder.quoteId}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Order Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.values(OrderStatus).filter(s => s !== OrderStatus.CANCELLED).map((status, index) => {
                  const isCompleted = Object.values(OrderStatus).indexOf(mockOrder.status) >= index;
                  const isCurrent = mockOrder.status === status;
                  
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        isCompleted ? 'bg-green-500' : isCurrent ? 'bg-blue-500' : 'bg-gray-300'
                      }`} />
                      <span className={`text-sm capitalize ${
                        isCompleted || isCurrent ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500'
                      }`}>
                        {formatStatus(status)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="outline" data-testid="button-update-status">
                <Package className="w-4 h-4 mr-2" />
                Update Status
              </Button>
              <Button className="w-full" variant="outline" data-testid="button-print-order">
                Print Order
              </Button>
              <Button className="w-full" variant="outline" data-testid="button-send-update">
                Send Update to Customer
              </Button>
            </CardContent>
          </Card>

          {/* Delivery Info */}
          {mockOrder.deliveryDate && (
            <Card>
              <CardHeader>
                <CardTitle>Delivery Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm">
                  <Truck className="w-4 h-4 text-gray-400" />
                  <span>Expected: {new Date(mockOrder.deliveryDate).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}