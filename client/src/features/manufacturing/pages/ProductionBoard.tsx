import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Clock, CheckCircle } from "lucide-react";
import { ProductionStatus } from "../types";

// Production status colors
const getStatusColor = (status: ProductionStatus) => {
  switch (status) {
    case ProductionStatus.PENDING: return "bg-gray-500";
    case ProductionStatus.MATERIALS_ORDERED: return "bg-blue-500";
    case ProductionStatus.IN_PROGRESS: return "bg-yellow-500";
    case ProductionStatus.QUALITY_CHECK: return "bg-orange-500";
    case ProductionStatus.COMPLETED: return "bg-green-500";
    case ProductionStatus.SHIPPED: return "bg-purple-500";
    default: return "bg-gray-500";
  }
};

const formatStatus = (status: ProductionStatus) => {
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export default function ProductionBoard() {
  // Mock production orders data
  const mockProduction = [
    {
      id: "PO-001",
      orderId: "ORD-001",
      vendor: "Textile Solutions Inc",
      status: ProductionStatus.IN_PROGRESS,
      totalCost: 850.00,
      expectedDelivery: "2024-02-01",
      progress: 65
    },
    {
      id: "PO-002", 
      orderId: "ORD-002",
      vendor: "Premium Fabrics Ltd",
      status: ProductionStatus.MATERIALS_ORDERED,
      totalCost: 420.00,
      expectedDelivery: "2024-01-25",
      progress: 20
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Production Board
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor manufacturing progress and vendor orders
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" data-testid="button-filter-production">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button data-testid="button-create-po">
            <Plus className="w-4 h-4 mr-2" />
            New Purchase Order
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by PO number, order ID, or vendor..."
            className="pl-10"
            data-testid="input-search-production"
          />
        </div>
      </div>

      {/* Production Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {mockProduction.length}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Orders</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {mockProduction.filter(p => p.status === ProductionStatus.IN_PROGRESS).length}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
              </div>
              <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
                ⚡
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {mockProduction.filter(p => p.status === ProductionStatus.COMPLETED).length}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  ${mockProduction.reduce((sum, p) => sum + p.totalCost, 0).toFixed(2)}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Value</p>
              </div>
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                💰
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Production Orders List */}
      <div className="space-y-4">
        {mockProduction.map((po) => (
          <Card key={po.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{po.id}</h3>
                    <Badge className={`${getStatusColor(po.status)} text-white`}>
                      {formatStatus(po.status)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Order ID</label>
                      <p className="font-mono">{po.orderId}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Vendor</label>
                      <p>{po.vendor}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Expected Delivery</label>
                      <p>{new Date(po.expectedDelivery).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Progress</span>
                      <span className="font-semibold">{po.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${po.progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-semibold text-lg">${po.totalCost.toFixed(2)}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Cost</div>
                  </div>
                  <Button variant="outline" size="sm" data-testid={`button-view-po-${po.id}`}>
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {mockProduction.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500 dark:text-gray-400 mb-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                🏭
              </div>
              <h3 className="text-lg font-semibold mb-2">No production orders</h3>
              <p>Create your first purchase order to start manufacturing</p>
            </div>
            <Button data-testid="button-create-first-po">
              <Plus className="w-4 h-4 mr-2" />
              Create First Purchase Order
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}