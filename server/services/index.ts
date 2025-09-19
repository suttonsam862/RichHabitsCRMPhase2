/**
 * Service Layer Exports
 * All service modules with proper authenticated client patterns
 */

import { DesignJobService } from './designJobService';
import { WorkOrderService } from './workOrderService';
import { PurchaseOrderService } from './purchaseOrderService';

// Export the classes
export { DesignJobService, WorkOrderService, PurchaseOrderService };

// Export specific functions for convenience
export const {
  createDesignJob,
  bulkCreateDesignJobs,
  updateDesignJobStatus,
  assignDesigner,
  createDesignJobEvent,
  handleOrderItemStatusChange,
  isValidStatusTransition,
  getValidTransitions
} = DesignJobService;

export const {
  createWorkOrder,
  updateWorkOrderStatus,
  assignManufacturer,
  bulkGenerateWorkOrders,
  getWorkOrderWithDetails,
  createProductionEvent,
  updateMilestone,
  getManufacturerCapacity,
  reportDelay
} = WorkOrderService;

export const {
  createPurchaseOrder,
  bulkGeneratePurchaseOrders,
  approvePurchaseOrder,
  updatePurchaseOrderStatus,
  receivePurchaseOrderItems,
  getPurchaseOrderWithDetails,
  createMaterialRequirements,
  calculateEstimatedDeliveryDate,
  getSuppliersWithPerformance,
  updateSupplierPerformanceMetrics
} = PurchaseOrderService;