import { z } from "zod";

/**
 * Enhanced Work Order DTO schemas with comprehensive validation
 * Includes manufacturing workflow validation, capacity constraints, and business rules
 */

// Common validation utilities
const uuidSchema = z.string().uuid("Must be a valid UUID");
const positiveIntSchema = z.number().int().positive("Must be a positive integer");
const positiveDecimalSchema = z.number().positive("Must be a positive number");
const nonEmptyStringSchema = z.string().min(1, "Cannot be empty").transform(val => val.trim());
const optionalNonEmptyStringSchema = z.string().optional().transform(val => val ? val.trim() : val);

// Enhanced Work Order Status with business logic
export const WorkOrderStatusSchema = z.enum([
  "pending",        // Work order created but not yet scheduled
  "queued",         // Scheduled but manufacturing not started
  "in_production",  // Currently being manufactured
  "quality_check",  // In quality control phase
  "rework",         // Needs to be reworked due to quality issues
  "packaging",      // Quality passed, being packaged
  "completed",      // Finished and ready to ship
  "shipped",        // Shipped to customer
  "cancelled",      // Work order cancelled
  "on_hold",        // Temporarily paused
], {
  errorMap: () => ({ message: "Invalid work order status" })
});

// Production Event codes with enhanced validation
export const ProductionEventCodeSchema = z.enum([
  "WORK_ORDER_CREATED",
  "WORK_ORDER_AUTO_GENERATED",
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
], {
  errorMap: () => ({ message: "Invalid production event code" })
});

// Status transition validation for work orders
const WORK_ORDER_STATUS_TRANSITIONS = {
  'pending': ['queued', 'cancelled'],
  'queued': ['in_production', 'on_hold', 'cancelled'],
  'in_production': ['quality_check', 'rework', 'on_hold', 'cancelled'],
  'quality_check': ['packaging', 'rework', 'completed', 'cancelled'],
  'rework': ['quality_check', 'cancelled'],
  'packaging': ['completed', 'cancelled'],
  'completed': ['shipped'],
  'shipped': [], // Terminal state
  'cancelled': [], // Terminal state
  'on_hold': ['queued', 'in_production', 'cancelled']
};

export function validateWorkOrderStatusTransition(from: string, to: string): boolean {
  if (from === to) return true;
  const validTransitions = WORK_ORDER_STATUS_TRANSITIONS[from] || [];
  return validTransitions.includes(to);
}

// Priority validation with business rules
const prioritySchema = z.number().int().min(1, "Priority must be between 1 (highest) and 10 (lowest)").max(10, "Priority must be between 1 (highest) and 10 (lowest)");

// Enhanced Manufacturer DTO with validation
export const ManufacturerDTO = z.object({
  id: uuidSchema,
  name: nonEmptyStringSchema.max(100, "Manufacturer name cannot exceed 100 characters"),
  contactEmail: z.string().email("Must be a valid email address").optional(),
  contactPhone: z.string().regex(/^[\+]?[\d\s\-\(\)\.]{10,17}$/, "Must be a valid phone number").optional(),
  specialties: z.array(z.string().min(1).max(50)).max(20, "Cannot have more than 20 specialties").optional(),
  minimumOrderQuantity: positiveIntSchema.max(10000, "MOQ cannot exceed 10,000").optional(),
  leadTimeDays: positiveIntSchema.max(365, "Lead time cannot exceed 365 days").optional(),
  isActive: z.boolean().default(true),
  capacity: z.object({
    dailyCapacity: positiveIntSchema.optional(),
    currentWorkload: z.number().int().min(0).optional(),
    availableCapacity: z.number().int().min(0).optional(),
  }).optional(),
}).refine((data) => {
  // Business rule: Must have either email or phone contact
  if (!data.contactEmail && !data.contactPhone) {
    return false;
  }
  return true;
}, {
  message: "Manufacturer must have either email or phone contact information",
  path: ["contactEmail", "contactPhone"]
});

// Enhanced Work Order DTO with comprehensive validation
export const WorkOrderDTO = z.object({
  id: uuidSchema,
  orgId: uuidSchema,
  orderItemId: uuidSchema,
  manufacturerId: uuidSchema.optional(),
  statusCode: WorkOrderStatusSchema.default("pending"),
  priority: prioritySchema.default(5),
  quantity: positiveIntSchema.max(10000, "Quantity cannot exceed 10,000 units"),
  instructions: z.string().max(2000, "Instructions cannot exceed 2000 characters").optional(),
  estimatedCompletionDate: z.string().datetime("Must be a valid ISO datetime").optional(),
  actualCompletionDate: z.string().datetime("Must be a valid ISO datetime").optional(),
  plannedStartDate: z.string().datetime("Must be a valid ISO datetime").optional(),
  plannedDueDate: z.string().datetime("Must be a valid ISO datetime").optional(),
  actualStartDate: z.string().datetime("Must be a valid ISO datetime").optional(),
  actualEndDate: z.string().datetime("Must be a valid ISO datetime").optional(),
  delayReason: z.string().max(1000, "Delay reason cannot exceed 1000 characters").optional(),
  qualityNotes: z.string().max(2000, "Quality notes cannot exceed 2000 characters").optional(),
  createdAt: z.string().datetime("Must be a valid ISO datetime"),
  updatedAt: z.string().datetime("Must be a valid ISO datetime"),
}).refine((data) => {
  // Business rule: Planned start date must be before planned due date
  if (data.plannedStartDate && data.plannedDueDate) {
    return new Date(data.plannedStartDate) < new Date(data.plannedDueDate);
  }
  return true;
}, {
  message: "Planned start date must be before planned due date",
  path: ["plannedStartDate", "plannedDueDate"]
}).refine((data) => {
  // Business rule: Actual start date must be before actual end date
  if (data.actualStartDate && data.actualEndDate) {
    return new Date(data.actualStartDate) < new Date(data.actualEndDate);
  }
  return true;
}, {
  message: "Actual start date must be before actual end date",
  path: ["actualStartDate", "actualEndDate"]
}).refine((data) => {
  // Business rule: Completed work orders must have actual completion date
  if (['completed', 'shipped'].includes(data.statusCode) && !data.actualCompletionDate) {
    return false;
  }
  return true;
}, {
  message: "Completed work orders must have an actual completion date",
  path: ["actualCompletionDate"]
}).refine((data) => {
  // Business rule: Delayed work orders should have delay reason
  if (data.statusCode === 'on_hold' && !data.delayReason) {
    return false;
  }
  return true;
}, {
  message: "Work orders on hold must have a delay reason",
  path: ["delayReason"]
}).refine((data) => {
  // Business rule: Work orders in production should have a manufacturer assigned
  if (['in_production', 'quality_check', 'packaging', 'completed'].includes(data.statusCode) && !data.manufacturerId) {
    return false;
  }
  return true;
}, {
  message: "Work orders in production phase must have a manufacturer assigned",
  path: ["manufacturerId"]
});

// Enhanced Production Event DTO
export const ProductionEventDTO = z.object({
  id: uuidSchema,
  workOrderId: uuidSchema,
  eventCode: ProductionEventCodeSchema,
  actorUserId: uuidSchema.optional(),
  payload: z.record(z.any()).optional(),
  notes: z.string().max(1000, "Event notes cannot exceed 1000 characters").optional(),
  occurredAt: z.string().datetime("Must be a valid ISO datetime"),
}).refine((data) => {
  // Business rule: Quality check events should have quality notes in payload
  if (['QUALITY_CHECK_PASSED', 'QUALITY_CHECK_FAILED'].includes(data.eventCode) && 
      (!data.payload || !data.payload.qualityNotes)) {
    return false;
  }
  return true;
}, {
  message: "Quality check events must include quality notes in payload",
  path: ["payload"]
});

// Enhanced Create Work Order DTO
export const CreateWorkOrderDTO = z.object({
  orgId: uuidSchema,
  orderItemId: uuidSchema,
  quantity: positiveIntSchema.max(10000, "Quantity cannot exceed 10,000 units"),
  priority: prioritySchema.default(5),
  statusCode: WorkOrderStatusSchema.default("pending"),
  manufacturerId: uuidSchema.optional(),
  instructions: z.string().max(2000, "Instructions cannot exceed 2000 characters").optional(),
  plannedStartDate: z.string().datetime("Must be a valid ISO datetime").optional(),
  plannedDueDate: z.string().datetime("Must be a valid ISO datetime").optional(),
  estimatedCompletionDate: z.string().datetime("Must be a valid ISO datetime").optional(),
}).refine((data) => {
  // Business rule: Planned dates must be in the future
  const now = new Date();
  if (data.plannedStartDate && new Date(data.plannedStartDate) <= now) {
    return false;
  }
  if (data.plannedDueDate && new Date(data.plannedDueDate) <= now) {
    return false;
  }
  return true;
}, {
  message: "Planned dates must be in the future",
  path: ["plannedStartDate", "plannedDueDate"]
}).refine((data) => {
  // Business rule: Start date before due date
  if (data.plannedStartDate && data.plannedDueDate) {
    return new Date(data.plannedStartDate) < new Date(data.plannedDueDate);
  }
  return true;
}, {
  message: "Planned start date must be before planned due date",
  path: ["plannedStartDate", "plannedDueDate"]
});

// Enhanced Update Work Order DTO
export const UpdateWorkOrderDTO = z.object({
  manufacturerId: uuidSchema.optional(),
  priority: prioritySchema.optional(),
  quantity: positiveIntSchema.max(10000, "Quantity cannot exceed 10,000 units").optional(),
  instructions: z.string().max(2000, "Instructions cannot exceed 2000 characters").optional(),
  plannedStartDate: z.string().datetime("Must be a valid ISO datetime").optional(),
  plannedDueDate: z.string().datetime("Must be a valid ISO datetime").optional(),
  estimatedCompletionDate: z.string().datetime("Must be a valid ISO datetime").optional(),
  actualStartDate: z.string().datetime("Must be a valid ISO datetime").optional(),
  actualEndDate: z.string().datetime("Must be a valid ISO datetime").optional(),
  actualCompletionDate: z.string().datetime("Must be a valid ISO datetime").optional(),
  delayReason: z.string().max(1000, "Delay reason cannot exceed 1000 characters").optional(),
  qualityNotes: z.string().max(2000, "Quality notes cannot exceed 2000 characters").optional(),
}).refine((data) => {
  // Validate date relationships
  if (data.plannedStartDate && data.plannedDueDate) {
    return new Date(data.plannedStartDate) < new Date(data.plannedDueDate);
  }
  return true;
}, {
  message: "Planned start date must be before planned due date",
  path: ["plannedStartDate", "plannedDueDate"]
});

// Status transition DTO with validation
export const UpdateWorkOrderStatusDTO = z.object({
  statusCode: WorkOrderStatusSchema,
  notes: z.string().max(1000, "Status change notes cannot exceed 1000 characters").optional(),
  qualityNotes: z.string().max(2000, "Quality notes cannot exceed 2000 characters").optional(),
  delayReason: z.string().max(1000, "Delay reason cannot exceed 1000 characters").optional(),
  actualDate: z.string().datetime("Must be a valid ISO datetime").optional(),
  manufacturerId: uuidSchema.optional(),
}).refine((data) => {
  // Business rule: Quality check status requires quality notes
  if (data.statusCode === 'quality_check' && !data.qualityNotes) {
    return false;
  }
  return true;
}, {
  message: "Quality check status requires quality notes",
  path: ["qualityNotes"]
}).refine((data) => {
  // Business rule: On hold status requires delay reason
  if (data.statusCode === 'on_hold' && !data.delayReason) {
    return false;
  }
  return true;
}, {
  message: "On hold status requires a delay reason",
  path: ["delayReason"]
});

// Bulk operations with enhanced validation
export const BulkGenerateWorkOrdersDTO = z.object({
  designJobIds: z.array(uuidSchema).min(1, "Must specify at least one design job").max(100, "Cannot generate more than 100 work orders at once"),
  manufacturerId: uuidSchema.optional(),
  priority: prioritySchema.default(5),
  plannedStartDate: z.string().datetime("Must be a valid ISO datetime").optional(),
  plannedDueDate: z.string().datetime("Must be a valid ISO datetime").optional(),
  instructions: z.string().max(2000, "Instructions cannot exceed 2000 characters").optional(),
  useManufacturerMatching: z.boolean().default(true),
  useCapacityBalancing: z.boolean().default(true),
}).refine((data) => {
  if (data.plannedStartDate && data.plannedDueDate) {
    return new Date(data.plannedStartDate) < new Date(data.plannedDueDate);
  }
  return true;
}, {
  message: "Planned start date must be before planned due date",
  path: ["plannedStartDate", "plannedDueDate"]
});

export const BulkAssignWorkOrdersDTO = z.object({
  workOrderIds: z.array(uuidSchema).min(1, "Must specify at least one work order").max(100, "Cannot assign more than 100 work orders at once"),
  manufacturerId: uuidSchema.optional(),
  useCapacityBalancing: z.boolean().default(true),
  useSpecialtyMatching: z.boolean().default(true),
  maxOrdersPerManufacturer: positiveIntSchema.max(50, "Cannot assign more than 50 orders per manufacturer").optional(),
  priority: prioritySchema.optional(),
});

// Manufacturer assignment with validation
export const AssignManufacturerDTO = z.object({
  manufacturerId: uuidSchema,
  plannedStartDate: z.string().datetime("Must be a valid ISO datetime").optional(),
  plannedDueDate: z.string().datetime("Must be a valid ISO datetime").optional(),
  instructions: z.string().max(2000, "Instructions cannot exceed 2000 characters").optional(),
  skipCapacityCheck: z.boolean().default(false),
  notes: z.string().max(1000, "Assignment notes cannot exceed 1000 characters").optional(),
}).refine((data) => {
  if (data.plannedStartDate && data.plannedDueDate) {
    return new Date(data.plannedStartDate) < new Date(data.plannedDueDate);
  }
  return true;
}, {
  message: "Planned start date must be before planned due date",
  path: ["plannedStartDate", "plannedDueDate"]
});

// Smart assignment with enhanced criteria
export const SmartAssignManufacturerDTO = z.object({
  requiredSpecialties: z.array(z.string().min(1).max(50)).max(10, "Cannot specify more than 10 required specialties").optional(),
  preferredSpecialties: z.array(z.string().min(1).max(50)).max(10, "Cannot specify more than 10 preferred specialties").optional(),
  maxLeadTimeDays: positiveIntSchema.max(365, "Lead time cannot exceed 365 days").optional(),
  minCapacityScore: z.number().min(0).max(100, "Capacity score must be between 0 and 100").default(20),
  prioritizeExperience: z.boolean().default(false),
  prioritizeCapacity: z.boolean().default(true),
  maxDistanceKm: z.number().positive("Distance must be positive").optional(),
  notes: z.string().max(1000, "Assignment notes cannot exceed 1000 characters").optional(),
});

// Quality check DTO
export const CreateQualityCheckDTO = z.object({
  passed: z.boolean(),
  inspector: uuidSchema,
  checkItems: z.array(z.object({
    item: nonEmptyStringSchema.max(100),
    passed: z.boolean(),
    notes: z.string().max(500).optional(),
  })).min(1, "Must have at least one quality check item"),
  overallNotes: z.string().max(2000, "Overall notes cannot exceed 2000 characters").optional(),
  images: z.array(z.string().url("Must be valid image URLs")).max(10, "Cannot have more than 10 quality check images").optional(),
});

// Production delay DTO
export const ProductionDelayDTO = z.object({
  reason: nonEmptyStringSchema.max(500, "Delay reason cannot exceed 500 characters"),
  expectedDelayDays: positiveIntSchema.max(90, "Expected delay cannot exceed 90 days"),
  newEstimatedCompletion: z.string().datetime("Must be a valid ISO datetime"),
  notifyCustomer: z.boolean().default(true),
  escalate: z.boolean().default(false),
});

// Work order filters for search/reporting
export const WorkOrderFiltersDTO = z.object({
  statusCode: z.array(WorkOrderStatusSchema).optional(),
  manufacturerId: uuidSchema.optional(),
  priority: z.array(prioritySchema).optional(),
  dueDateFrom: z.string().datetime().optional(),
  dueDateTo: z.string().datetime().optional(),
  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional(),
  search: z.string().max(100, "Search term cannot exceed 100 characters").optional(),
}).refine((data) => {
  if (data.dueDateFrom && data.dueDateTo) {
    return new Date(data.dueDateFrom) <= new Date(data.dueDateTo);
  }
  return true;
}, {
  message: "Due date 'from' must be before 'to'",
  path: ["dueDateFrom", "dueDateTo"]
});

// TypeScript types
export type WorkOrderType = z.infer<typeof WorkOrderDTO>;
export type CreateWorkOrderType = z.infer<typeof CreateWorkOrderDTO>;
export type UpdateWorkOrderType = z.infer<typeof UpdateWorkOrderDTO>;
export type UpdateWorkOrderStatusType = z.infer<typeof UpdateWorkOrderStatusDTO>;
export type BulkGenerateWorkOrdersType = z.infer<typeof BulkGenerateWorkOrdersDTO>;
export type BulkAssignWorkOrdersType = z.infer<typeof BulkAssignWorkOrdersDTO>;
export type AssignManufacturerType = z.infer<typeof AssignManufacturerDTO>;
export type SmartAssignManufacturerType = z.infer<typeof SmartAssignManufacturerDTO>;
export type CreateQualityCheckType = z.infer<typeof CreateQualityCheckDTO>;
export type ProductionDelayType = z.infer<typeof ProductionDelayDTO>;
export type WorkOrderFiltersType = z.infer<typeof WorkOrderFiltersDTO>;