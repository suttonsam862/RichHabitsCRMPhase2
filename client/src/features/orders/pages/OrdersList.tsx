import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Eye } from "lucide-react";
import { OrderStatus } from "../types";

// Status badge colors
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

export default function OrdersList() {
  // Mock data for development
  const mockOrders = [
    {
      id: "ORD-001",
      customerName: "Acme Corp",
      status: OrderStatus.IN_PRODUCTION,
      total: 1500.00,
      createdAt: "2024-01-15",
      items: [{ productName: "Custom T-Shirt", quantity: 50 }]
    },
    {
      id: "ORD-002", 
      customerName: "Tech Startup",
      status: OrderStatus.CONFIRMED,
      total: 750.00,
      createdAt: "2024-01-14",
      items: [{ productName: "Polo Shirts", quantity: 25 }]
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Orders
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage and track customer orders
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" data-testid="button-filter-orders">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button data-testid="button-create-order">
            <Plus className="w-4 h-4 mr-2" />
            New Order
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search orders by ID, customer, or product..."
            className="pl-10"
            data-testid="input-search-orders"
          />
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {mockOrders.map((order) => (
          <Card key={order.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="font-semibold text-lg">{order.id}</h3>
                    <p className="text-gray-600 dark:text-gray-400">{order.customerName}</p>
                  </div>
                  
                  <Badge className={`${getStatusColor(order.status)} text-white`}>
                    {formatStatus(order.status)}
                  </Badge>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-semibold text-lg">${order.total.toFixed(2)}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  <Button variant="outline" size="sm" data-testid={`button-view-order-${order.id}`}>
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Created: {new Date(order.createdAt).toLocaleDateString()}</span>
                  <span>{order.items[0]?.productName} {order.items[0]?.quantity > 1 ? `+ ${order.items.length - 1} more` : ''}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {mockOrders.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500 dark:text-gray-400 mb-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                📋
              </div>
              <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
              <p>Create your first order to get started</p>
            </div>
            <Button data-testid="button-create-first-order">
              <Plus className="w-4 h-4 mr-2" />
              Create First Order
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {mockOrders.length}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              ${mockOrders.reduce((sum, order) => sum + order.total, 0).toFixed(2)}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Value</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {mockOrders.filter(o => o.status === OrderStatus.IN_PRODUCTION).length}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">In Production</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {mockOrders.filter(o => o.status === OrderStatus.DELIVERED).length}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Delivered</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}