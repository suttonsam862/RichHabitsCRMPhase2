/**
 * Service Layer Exports
 * All service modules with proper authenticated client patterns
 */

import { DesignJobService } from './designJobService';
import { WorkOrderService } from './workOrderService';

// Export the classes
export { DesignJobService, WorkOrderService };

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