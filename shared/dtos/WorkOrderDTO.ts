import { z } from "zod";

/**
 * Work Order DTO schemas for manufacturing workflow API
 * Aligned with manufacturing_work_orders, production_events, and manufacturers tables
 */

// Work Order Status codes (from status_work_orders table)
export const WorkOrderStatusSchema = z.enum([
  "pending",        // Work order created but not yet scheduled
  "queued",        // Scheduled but manufacturing not started
  "in_production", // Currently being manufactured
  "quality_check", // In quality control phase
  "rework",        // Needs to be reworked due to quality issues
  "packaging",     // Quality passed, being packaged
  "completed",     // Finished and ready to ship
  "shipped",       // Shipped to customer
  "cancelled",     // Work order cancelled
  "on_hold",       // Temporarily paused
]);

// Production Event codes for tracking work order progress
export const ProductionEventCodeSchema = z.enum([
  "WORK_ORDER_CREATED",
  "WORK_ORDER_AUTO_GENERATED", // Added for design job integration
  "WORK_ORDER_ASSIGNED",
  "PRODUCTION_STARTED",
  "MILESTONE_REACHED",
  "QUALITY_CHECK_PASSED",
  "QUALITY_CHECK_FAILED",
  "REWORK_STARTED",
  "REWORK_COMPLETED",
  "PACKAGING_STARTED",
  "WORK_ORDER_COMPLETED",
  "WORK_ORDER_SHIPPED",
  "WORK_ORDER_CANCELLED",
  "PRODUCTION_DELAYED",
  "ISSUE_REPORTED",
  "ISSUE_RESOLVED",
  "STATUS_UPDATED",
  "ASSIGNED_TO_MANUFACTURER",
  "NOTES_UPDATED",
]);

// Manufacturer DTO for work order assignments
export const ManufacturerDTO = z.object({
  id: z.string(),
  name: z.string(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  minimumOrderQuantity: z.number().optional(),
  leadTimeDays: z.number().optional(),
  isActive: z.boolean().default(true),
});

// Work Order main entity
export const WorkOrderDTO = z.object({
  id: z.string(),
  orgId: z.string(),
  orderItemId: z.string(),
  manufacturerId: z.string().optional(),
  statusCode: WorkOrderStatusSchema.default("pending"),
  priority: z.number().min(1).max(10).default(5), // 1=highest, 10=lowest
  quantity: z.number().min(1),
  instructions: z.string().optional(),
  estimatedCompletionDate: z.string().optional(),
  actualCompletionDate: z.string().optional(),
  plannedStartDate: z.string().optional(),
  plannedDueDate: z.string().optional(),
  actualStartDate: z.string().optional(),
  actualEndDate: z.string().optional(),
  delayReason: z.string().optional(),
  qualityNotes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Production Event for tracking workflow progress
export const ProductionEventDTO = z.object({
  id: z.string(),
  workOrderId: z.string(),
  eventCode: ProductionEventCodeSchema,
  actorUserId: z.string().optional(),
  payload: z.record(z.any()).optional(),
  occurredAt: z.string(),
});

// Work Order with related data
export const WorkOrderWithDetailsDTO = WorkOrderDTO.extend({
  orderItem: z.object({
    id: z.string(),
    nameSnapshot: z.string().optional(),
    quantity: z.number(),
    statusCode: z.string(),
    pantoneJson: z.record(z.any()).optional(),
    buildOverridesText: z.string().optional(),
  }).optional(),
  manufacturer: ManufacturerDTO.optional(),
  productionEvents: z.array(ProductionEventDTO).optional(),
  designJob: z.object({
    id: z.string(),
    title: z.string().optional(),
    statusCode: z.string(),
    assigneeDesignerId: z.string().optional(),
  }).optional(),
  order: z.object({
    id: z.string(),
    code: z.string(),
    customerContactName: z.string().optional(),
    dueDate: z.string().optional(),
  }).optional(),
});

// Create Work Order DTOs
export const CreateWorkOrderDTO = WorkOrderDTO.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Make required fields explicit
  orgId: z.string(),
  orderItemId: z.string(),
  quantity: z.number().min(1),
  priority: z.number().min(1).max(10).default(5),
  statusCode: WorkOrderStatusSchema.default("pending"),
  // Optional fields for initial creation
  manufacturerId: z.string().optional(),
  instructions: z.string().optional(),
  plannedStartDate: z.string().optional(),
  plannedDueDate: z.string().optional(),
});

export const UpdateWorkOrderDTO = CreateWorkOrderDTO.partial().extend({
  // Status transitions should be explicit
  statusCode: WorkOrderStatusSchema.optional(),
  // Track actual dates
  actualStartDate: z.string().optional(),
  actualEndDate: z.string().optional(),
  actualCompletionDate: z.string().optional(),
  delayReason: z.string().optional(),
  qualityNotes: z.string().optional(),
});

// Status transition specific DTOs
export const UpdateWorkOrderStatusDTO = z.object({
  statusCode: WorkOrderStatusSchema,
  notes: z.string().optional(),
  qualityNotes: z.string().optional(),
  delayReason: z.string().optional(),
  actualDate: z.string().optional(), // For tracking when status change occurred
});

// Bulk operations for work order generation
export const BulkGenerateWorkOrdersDTO = z.object({
  designJobIds: z.array(z.string()).min(1),
  manufacturerId: z.string().optional(), // If specified, assign all to this manufacturer
  priority: z.number().min(1).max(10).default(5),
  plannedStartDate: z.string().optional(),
  plannedDueDate: z.string().optional(),
  instructions: z.string().optional(),
  useManufacturerMatching: z.boolean().default(true), // Auto-match based on specialties
});

// Bulk assignment with capacity balancing
export const BulkAssignWorkOrdersDTO = z.object({
  workOrderIds: z.array(z.string()).min(1),
  manufacturerId: z.string().optional(), // If specified, assign all to this manufacturer
  useCapacityBalancing: z.boolean().default(true),
  useSpecialtyMatching: z.boolean().default(true),
  maxOrdersPerManufacturer: z.number().optional(),
});

// Manufacturer capacity and workload
export const ManufacturerCapacityDTO = z.object({
  manufacturerId: z.string(),
  name: z.string(),
  specialties: z.array(z.string()).optional(),
  currentWorkOrders: z.number(),
  capacityLimit: z.number().optional(),
  leadTimeDays: z.number().optional(),
  averageCompletionTime: z.number().optional(), // in days
  isAvailable: z.boolean(),
  workloadScore: z.number(), // 0-100, lower is less busy
  nextAvailableDate: z.string().optional(),
});

// Manufacturer assignment
export const AssignManufacturerDTO = z.object({
  manufacturerId: z.string(),
  notes: z.string().optional(),
  skipCapacityCheck: z.boolean().default(false),
  skipSpecialtyCheck: z.boolean().default(false),
  plannedStartDate: z.string().optional(),
  plannedDueDate: z.string().optional(),
});

// Smart assignment with preferences
export const SmartAssignManufacturerDTO = z.object({
  requiredSpecialties: z.array(z.string()).optional(),
  preferredSpecialties: z.array(z.string()).optional(),
  maxWorkloadScore: z.number().min(0).max(100).default(80),
  prioritizeExperience: z.boolean().default(false),
  preferredLeadTime: z.number().optional(), // in days
  notes: z.string().optional(),
});

// Production milestone tracking
export const ProductionMilestoneDTO = z.object({
  id: z.string(),
  workOrderId: z.string(),
  milestoneCode: z.string(), // e.g., "cutting_completed", "printing_done", "assembly_started"
  milestoneName: z.string(),
  targetDate: z.string().optional(),
  actualDate: z.string().optional(),
  status: z.enum(["pending", "in_progress", "completed", "skipped"]),
  notes: z.string().optional(),
  completedBy: z.string().optional(), // User ID
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateMilestoneDTO = ProductionMilestoneDTO.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  workOrderId: z.string(),
  milestoneCode: z.string(),
  milestoneName: z.string(),
  targetDate: z.string().optional(),
});

export const UpdateMilestoneDTO = z.object({
  status: z.enum(["pending", "in_progress", "completed", "skipped"]),
  actualDate: z.string().optional(),
  notes: z.string().optional(),
  completedBy: z.string().optional(),
});

// Work Order filters for listing
export const WorkOrderFiltersDTO = z.object({
  orgId: z.string().optional(),
  statusCode: WorkOrderStatusSchema.optional(),
  manufacturerId: z.string().optional(),
  orderItemId: z.string().optional(),
  orderId: z.string().optional(),
  priority: z.number().optional(),
  createdAfter: z.string().optional(),
  createdBefore: z.string().optional(),
  dueBefore: z.string().optional(),
  dueAfter: z.string().optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

// Production delay tracking
export const ProductionDelayDTO = z.object({
  workOrderId: z.string(),
  delayReason: z.string(),
  estimatedDelay: z.number(), // in days
  newEstimatedCompletion: z.string(),
  notificationSent: z.boolean().default(false),
  notes: z.string().optional(),
  reportedBy: z.string().optional(),
  reportedAt: z.string(),
});

// Quality control tracking
export const QualityCheckDTO = z.object({
  id: z.string(),
  workOrderId: z.string(),
  checkType: z.enum(["initial", "final", "rework"]),
  passed: z.boolean(),
  checkedBy: z.string().optional(),
  checkedAt: z.string(),
  notes: z.string().optional(),
  defects: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(), // URLs to quality check photos
});

export const CreateQualityCheckDTO = QualityCheckDTO.omit({
  id: true,
  checkedAt: true,
}).extend({
  workOrderId: z.string(),
  checkType: z.enum(["initial", "final", "rework"]),
  passed: z.boolean(),
  notes: z.string().optional(),
  defects: z.array(z.string()).optional(),
});

// Event creation
export const CreateProductionEventDTO = ProductionEventDTO.omit({
  id: true,
  occurredAt: true,
}).extend({
  workOrderId: z.string(),
  eventCode: ProductionEventCodeSchema,
  actorUserId: z.string().optional(),
  payload: z.record(z.any()).optional(),
});

// Work order workflow transition validation
export const WorkOrderTransitionDTO = z.object({
  fromStatus: WorkOrderStatusSchema,
  toStatus: WorkOrderStatusSchema,
  isValidTransition: z.boolean(),
  requiresApproval: z.boolean().optional(),
  allowedRoles: z.array(z.string()).optional(),
});

// Manufacturing capacity planning
export const ProductionScheduleDTO = z.object({
  workOrderId: z.string(),
  manufacturerId: z.string(),
  scheduledStartDate: z.string(),
  scheduledEndDate: z.string(),
  estimatedDuration: z.number(), // in hours
  priority: z.number(),
  dependencies: z.array(z.string()).optional(), // Other work order IDs that must complete first
});

// Manufacturer performance metrics
export const ManufacturerMetricsDTO = z.object({
  manufacturerId: z.string(),
  period: z.string(), // ISO date range
  completedOrders: z.number(),
  averageLeadTime: z.number(), // in days
  onTimeDeliveryRate: z.number(), // percentage
  qualityScoreAverage: z.number(), // 0-100
  totalRevenue: z.number().optional(),
});

// TypeScript types
export type WorkOrderType = z.infer<typeof WorkOrderDTO>;
export type ProductionEventType = z.infer<typeof ProductionEventDTO>;
export type ManufacturerType = z.infer<typeof ManufacturerDTO>;
export type WorkOrderWithDetailsType = z.infer<typeof WorkOrderWithDetailsDTO>;
export type CreateWorkOrderType = z.infer<typeof CreateWorkOrderDTO>;
export type UpdateWorkOrderType = z.infer<typeof UpdateWorkOrderDTO>;
export type UpdateWorkOrderStatusType = z.infer<typeof UpdateWorkOrderStatusDTO>;
export type BulkGenerateWorkOrdersType = z.infer<typeof BulkGenerateWorkOrdersDTO>;
export type BulkAssignWorkOrdersType = z.infer<typeof BulkAssignWorkOrdersDTO>;
export type AssignManufacturerType = z.infer<typeof AssignManufacturerDTO>;
export type WorkOrderFiltersType = z.infer<typeof WorkOrderFiltersDTO>;
export type ProductionMilestoneType = z.infer<typeof ProductionMilestoneDTO>;
export type CreateMilestoneType = z.infer<typeof CreateMilestoneDTO>;
export type UpdateMilestoneType = z.infer<typeof UpdateMilestoneDTO>;
export type ProductionDelayType = z.infer<typeof ProductionDelayDTO>;
export type QualityCheckType = z.infer<typeof QualityCheckDTO>;
export type CreateQualityCheckType = z.infer<typeof CreateQualityCheckDTO>;
export type CreateProductionEventType = z.infer<typeof CreateProductionEventDTO>;
export type WorkOrderTransitionType = z.infer<typeof WorkOrderTransitionDTO>;
export type ManufacturerCapacityType = z.infer<typeof ManufacturerCapacityDTO>;
export type SmartAssignManufacturerType = z.infer<typeof SmartAssignManufacturerDTO>;
export type ProductionScheduleType = z.infer<typeof ProductionScheduleDTO>;
export type ManufacturerMetricsType = z.infer<typeof ManufacturerMetricsDTO>;

// Work order status validation helpers
export const isTerminalStatus = (status: string): boolean => {
  return ["completed", "shipped", "cancelled"].includes(status);
};

// Check if status requires quality control
export const requiresQualityCheck = (status: string): boolean => {
  return ["quality_check", "rework"].includes(status);
};

// Check if status allows production updates
export const allowsProductionUpdates = (status: string): boolean => {
  return ["in_production", "quality_check", "rework", "packaging"].includes(status);
};

// Valid status transitions for manufacturing workflow
export const getValidTransitions = (currentStatus: string): string[] => {
  const transitions: Record<string, string[]> = {
    "pending": ["queued", "cancelled"],
    "queued": ["in_production", "on_hold", "cancelled"],
    "in_production": ["quality_check", "completed", "on_hold", "cancelled"],
    "quality_check": ["packaging", "rework", "completed", "on_hold"],
    "rework": ["quality_check", "in_production", "cancelled"],
    "packaging": ["completed", "shipped"],
    "completed": ["shipped"],
    "shipped": [], // terminal
    "cancelled": [], // terminal
    "on_hold": ["queued", "in_production", "cancelled"],
  };
  return transitions[currentStatus] || [];
};

export const canTransition = (from: string, to: string): boolean => {
  return getValidTransitions(from).includes(to);
};

// Priority level helpers
export const getPriorityLabel = (priority: number): string => {
  if (priority <= 2) return "Critical";
  if (priority <= 4) return "High";
  if (priority <= 6) return "Medium";
  if (priority <= 8) return "Low";
  return "Lowest";
};

// Manufacturing workflow stage helpers
export const getWorkflowStage = (status: string): string => {
  const stages: Record<string, string> = {
    "pending": "Planning",
    "queued": "Planning", 
    "in_production": "Manufacturing",
    "quality_check": "Quality Control",
    "rework": "Quality Control",
    "packaging": "Fulfillment",
    "completed": "Fulfillment",
    "shipped": "Complete",
    "cancelled": "Cancelled",
    "on_hold": "Paused",
  };
  return stages[status] || "Unknown";
};

// Calculate estimated completion based on manufacturer lead time
export const calculateEstimatedCompletion = (
  startDate: string, 
  leadTimeDays: number
): string => {
  const start = new Date(startDate);
  const completion = new Date(start);
  completion.setDate(completion.getDate() + leadTimeDays);
  return completion.toISOString().split('T')[0];
};

// Check if work order is overdue
export const isOverdue = (workOrder: WorkOrderType): boolean => {
  if (!workOrder.plannedDueDate || isTerminalStatus(workOrder.statusCode)) {
    return false;
  }
  const now = new Date();
  const dueDate = new Date(workOrder.plannedDueDate);
  return now > dueDate;
};

// Calculate work order progress percentage
export const calculateProgress = (status: string): number => {
  const progressMap: Record<string, number> = {
    "pending": 0,
    "queued": 10,
    "in_production": 50,
    "quality_check": 80,
    "rework": 70,
    "packaging": 90,
    "completed": 100,
    "shipped": 100,
    "cancelled": 0,
    "on_hold": 0,
  };
  return progressMap[status] || 0;
};

// Manufacturing workflow event helpers
export const getMilestoneEvents = (): string[] => {
  return [
    "PRODUCTION_STARTED",
    "MILESTONE_REACHED", 
    "QUALITY_CHECK_PASSED",
    "QUALITY_CHECK_FAILED",
    "WORK_ORDER_COMPLETED",
  ];
};

// Default milestones for different manufacturing processes
export const getDefaultMilestones = (productType?: string): Array<{code: string, name: string}> => {
  const defaultMilestones = [
    { code: "materials_prepared", name: "Materials Prepared" },
    { code: "cutting_completed", name: "Cutting Completed" },
    { code: "printing_done", name: "Printing/Decoration Done" },
    { code: "assembly_started", name: "Assembly Started" },
    { code: "assembly_completed", name: "Assembly Completed" },
    { code: "quality_check_initial", name: "Initial Quality Check" },
    { code: "packaging_ready", name: "Ready for Packaging" },
  ];
  
  // Could customize based on product type in the future
  return defaultMilestones;
};