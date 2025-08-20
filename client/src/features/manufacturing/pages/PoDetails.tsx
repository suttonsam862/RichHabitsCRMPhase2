import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Edit, Truck, CheckCircle, Clock } from "lucide-react";
import { ProductionStatus } from "../types";

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

export default function PoDetails() {
  const { id } = useParams<{ id: string }>();

  // Mock PO data
  const mockPo = {
    id: "PO-001",
    orderId: "ORD-001",
    vendor: "Textile Solutions Inc",
    status: ProductionStatus.IN_PROGRESS,
    items: [
      {
        id: "1",
        materialName: "100% Cotton Fabric - Navy Blue",
        quantity: 50,
        unitCost: 8.50,
        totalCost: 425.00,
      },
      {
        id: "2", 
        materialName: "Cotton Thread - Navy",
        quantity: 10,
        unitCost: 3.00,
        totalCost: 30.00,
      },
      {
        id: "3",
        materialName: "Custom Labels",
        quantity: 100,
        unitCost: 0.25,
        totalCost: 25.00,
      }
    ],
    milestones: [
      {
        id: "1",
        name: "Materials Ordered",
        dueDate: "2024-01-10",
        completed: true,
        completedAt: "2024-01-08T10:00:00Z"
      },
      {
        id: "2",
        name: "Production Started",
        dueDate: "2024-01-15",
        completed: true,
        completedAt: "2024-01-14T09:30:00Z"
      },
      {
        id: "3",
        name: "Quality Check",
        dueDate: "2024-01-25",
        completed: false,
      },
      {
        id: "4",
        name: "Shipping",
        dueDate: "2024-02-01",
        completed: false,
      }
    ],
    totalCost: 480.00,
    expectedDelivery: "2024-02-01",
    notes: "Rush order - priority production",
    createdAt: "2024-01-05T14:20:00Z",
    updatedAt: "2024-01-16T11:45:00Z",
  };

  const completedMilestones = mockPo.milestones.filter(m => m.completed).length;
  const progressPercent = (completedMilestones / mockPo.milestones.length) * 100;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="sm">
            <Link to="/manufacturing" data-testid="link-back-to-manufacturing">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Production
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Purchase Order {mockPo.id}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">{mockPo.vendor}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge className={`${getStatusColor(mockPo.status)} text-white`}>
            {formatStatus(mockPo.status)}
          </Badge>
          <Button data-testid="button-edit-po">
            <Edit className="w-4 h-4 mr-2" />
            Edit PO
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Materials List */}
          <Card>
            <CardHeader>
              <CardTitle>Materials & Components</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockPo.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0 last:pb-0">
                    <div className="flex-1">
                      <h4 className="font-semibold">{item.materialName}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        ${item.unitCost.toFixed(2)} × {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">${item.totalCost.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              <Separator className="my-4" />
              
              <div className="flex justify-between font-semibold text-lg">
                <span>Total Cost:</span>
                <span>${mockPo.totalCost.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Production Milestones */}
          <Card>
            <CardHeader>
              <CardTitle>Production Milestones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockPo.milestones.map((milestone) => (
                  <div key={milestone.id} className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {milestone.completed ? (
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      ) : (
                        <Clock className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-semibold ${milestone.completed ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-gray-100'}`}>
                        {milestone.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Due: {new Date(milestone.dueDate).toLocaleDateString()}
                        {milestone.completedAt && (
                          <span className="ml-2 text-green-600">
                            (Completed {new Date(milestone.completedAt).toLocaleDateString()})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall Progress</span>
                  <span>{Math.round(progressPercent)}%</span>
                </div>
                <Progress value={progressPercent} className="w-full" />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Production Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 dark:text-gray-300">
                {mockPo.notes || "No special notes for this purchase order."}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Info */}
          <Card>
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Related Order</label>
                <p className="font-mono text-sm">{mockPo.orderId}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Vendor</label>
                <p className="font-semibold">{mockPo.vendor}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Expected Delivery</label>
                <p className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-gray-400" />
                  {new Date(mockPo.expectedDelivery).toLocaleDateString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-sm">{new Date(mockPo.createdAt).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="outline" data-testid="button-update-milestone">
                <CheckCircle className="w-4 h-4 mr-2" />
                Update Milestone
              </Button>
              <Button className="w-full" variant="outline" data-testid="button-contact-vendor">
                Contact Vendor
              </Button>
              <Button className="w-full" variant="outline" data-testid="button-print-po">
                Print PO
              </Button>
              <Button className="w-full" variant="outline" data-testid="button-clone-po">
                Clone PO
              </Button>
            </CardContent>
          </Card>

          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Status History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-600">In Progress</span>
                  <span className="text-gray-500">Jan 14, 2024</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-600">Materials Ordered</span>
                  <span className="text-gray-500">Jan 8, 2024</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created</span>
                  <span className="text-gray-500">Jan 5, 2024</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}