import { z } from "zod";

/**
 * Purchase Order DTO schemas for materials procurement API
 * Comprehensive schemas aligned with purchase_orders, purchase_order_items, 
 * purchase_order_milestones, materials, and supplier management tables
 */

// Purchase Order Status codes (from status_purchase_orders table)
export const PurchaseOrderStatusSchema = z.enum([
  "draft",           // PO created but not finalized
  "pending_approval", // Waiting for approval (high value orders)
  "approved",        // Approved and ready to send
  "sent",            // Sent to supplier
  "acknowledged",    // Supplier has acknowledged the PO
  "in_production",   // Supplier is producing/fulfilling order
  "shipped",         // Items shipped from supplier
  "delivered",       // Items delivered to our facility
  "received",        // Items received and checked in
  "completed",       // PO fully completed and closed
  "cancelled",       // PO cancelled
  "on_hold",         // Temporarily paused
]);

// Purchase Order Event codes for audit trail
export const PurchaseOrderEventCodeSchema = z.enum([
  "PO_CREATED",
  "PO_DRAFT_SAVED",
  "PO_SUBMITTED_FOR_APPROVAL",
  "PO_APPROVED",
  "PO_REJECTED",
  "PO_SENT_TO_SUPPLIER",
  "PO_ACKNOWLEDGED_BY_SUPPLIER",
  "PO_MODIFIED",
  "PO_CANCELLED",
  "PO_ITEMS_SHIPPED",
  "PO_ITEMS_DELIVERED",
  "PO_ITEMS_RECEIVED",
  "PO_COMPLETED",
  "PO_PUT_ON_HOLD",
  "PO_RESUMED",
  "MILESTONE_COMPLETED",
  "DELIVERY_DELAYED",
  "QUALITY_ISSUE_REPORTED",
]);

// Material categories for procurement tracking
export const MaterialCategorySchema = z.enum([
  "fabric",
  "thread",
  "hardware", 
  "dye",
  "chemicals",
  "packaging",
  "labels",
  "accessories",
  "outsourced_service",
  "other"
]);

// Core Material DTO
export const MaterialDTO = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string().min(1, "Material name is required"),
  sku: z.string().optional(),
  description: z.string().optional(),
  category: MaterialCategorySchema.optional(),
  unit: z.string().min(1, "Unit is required"), // e.g., "yards", "pieces", "lbs", "gallons"
  unitCost: z.number().positive("Unit cost must be positive").optional(),
  reorderLevel: z.number().int().min(0).default(0),
  preferredSupplierId: z.string().optional(),
  leadTimeDays: z.number().int().min(1).default(7),
  moq: z.number().int().positive("MOQ must be positive").optional(),
  specifications: z.record(z.any()).optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateMaterialDTO = MaterialDTO.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateMaterialDTO = CreateMaterialDTO.partial();

// Materials Inventory DTO
export const MaterialsInventoryDTO = z.object({
  id: z.string(),
  orgId: z.string(),
  materialId: z.string(),
  quantityOnHand: z.number().min(0).default(0),
  quantityReserved: z.number().min(0).default(0),
  quantityOnOrder: z.number().min(0).default(0),
  lastUpdated: z.string(),
  notes: z.string().optional(),
});

// Material Requirements DTO (links work orders to needed materials)
export const MaterialRequirementDTO = z.object({
  id: z.string(),
  orgId: z.string(),
  workOrderId: z.string(),
  materialId: z.string(),
  quantityNeeded: z.number().positive("Quantity needed must be positive"),
  quantityFulfilled: z.number().min(0).default(0),
  neededByDate: z.string().optional(),
  status: z.enum(["pending", "ordered", "received", "fulfilled"]).default("pending"),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateMaterialRequirementDTO = MaterialRequirementDTO.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Supplier DTO (extends manufacturers table)
export const SupplierDTO = z.object({
  id: z.string(),
  name: z.string().min(1, "Supplier name is required"),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  minimumOrderQuantity: z.number().int().positive().optional(),
  leadTimeDays: z.number().int().positive().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
  // Performance metrics (computed)
  performanceScore: z.number().min(1).max(5).optional(),
  onTimeDeliveryRate: z.number().min(0).max(1).optional(),
  qualityScore: z.number().min(1).max(5).optional(),
});

// Purchase Order Item DTO
export const PurchaseOrderItemDTO = z.object({
  id: z.string(),
  orgId: z.string(),
  purchaseOrderId: z.string(),
  materialId: z.string().optional(), // null for one-off items
  materialName: z.string().min(1, "Material name is required"),
  materialSku: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number().positive("Quantity must be positive"),
  unit: z.string().min(1, "Unit is required"),
  unitCost: z.number().positive("Unit cost must be positive"),
  totalCost: z.number().positive("Total cost must be positive"),
  quantityReceived: z.number().min(0).default(0),
  dateReceived: z.string().optional(),
  receivedBy: z.string().optional(),
  qualityCheckPassed: z.boolean().optional(),
  qualityNotes: z.string().optional(),
  lineNumber: z.number().int().positive(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreatePurchaseOrderItemDTO = PurchaseOrderItemDTO.omit({
  id: true,
  purchaseOrderId: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdatePurchaseOrderItemDTO = CreatePurchaseOrderItemDTO.partial();

// Purchase Order Milestone DTO
export const PurchaseOrderMilestoneDTO = z.object({
  id: z.string(),
  orgId: z.string(),
  purchaseOrderId: z.string(),
  milestoneCode: z.string().min(1, "Milestone code is required"),
  milestoneName: z.string().min(1, "Milestone name is required"),
  expectedDate: z.string().optional(),
  actualDate: z.string().optional(),
  status: z.enum(["pending", "completed", "skipped", "overdue"]).default("pending"),
  completedBy: z.string().optional(),
  notes: z.string().optional(),
  automaticallyTracked: z.boolean().default(false),
  notificationSent: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreatePurchaseOrderMilestoneDTO = PurchaseOrderMilestoneDTO.omit({
  id: true,
  purchaseOrderId: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdatePurchaseOrderMilestoneDTO = CreatePurchaseOrderMilestoneDTO.partial();

// Purchase Order Event DTO (for audit trail)
export const PurchaseOrderEventDTO = z.object({
  id: z.string(),
  orgId: z.string(),
  purchaseOrderId: z.string(),
  eventCode: PurchaseOrderEventCodeSchema,
  actorUserId: z.string().optional(),
  payload: z.record(z.any()).optional(),
  occurredAt: z.string(),
});

export const CreatePurchaseOrderEventDTO = PurchaseOrderEventDTO.omit({
  id: true,
  occurredAt: true,
});

// Main Purchase Order DTO
export const PurchaseOrderDTO = z.object({
  id: z.string(),
  orgId: z.string(),
  poNumber: z.string().min(1, "PO number is required"),
  supplierId: z.string().min(1, "Supplier is required"),
  supplierName: z.string().min(1, "Supplier name is required"),
  supplierContactEmail: z.string().email().optional(),
  supplierContactPhone: z.string().optional(),
  statusCode: PurchaseOrderStatusSchema.default("draft"),
  totalAmount: z.number().min(0).default(0),
  approvalThreshold: z.number().min(0).default(1000),
  approvedBy: z.string().optional(),
  approvedAt: z.string().optional(),
  orderDate: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
  actualDeliveryDate: z.string().optional(),
  requestedBy: z.string().min(1, "Requester is required"),
  assignedTo: z.string().optional(),
  priority: z.number().int().min(1).max(5).default(3),
  currency: z.string().default("USD"),
  termsAndConditions: z.string().optional(),
  shippingAddress: z.object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  
  // Related data (populated in responses)
  items: z.array(PurchaseOrderItemDTO).optional(),
  milestones: z.array(PurchaseOrderMilestoneDTO).optional(),
  supplier: SupplierDTO.optional(),
  events: z.array(PurchaseOrderEventDTO).optional(),
});

export const CreatePurchaseOrderDTO = PurchaseOrderDTO.omit({
  id: true,
  poNumber: true,
  supplierName: true, // Will be populated from supplier
  totalAmount: true, // Will be calculated from items
  createdAt: true,
  updatedAt: true,
  items: true,
  milestones: true,
  supplier: true,
  events: true,
}).extend({
  // Allow items to be provided during creation
  items: z.array(CreatePurchaseOrderItemDTO).min(1, "At least one item is required"),
  // Allow milestones to be provided during creation
  milestones: z.array(CreatePurchaseOrderMilestoneDTO).optional(),
});

export const UpdatePurchaseOrderDTO = CreatePurchaseOrderDTO.partial();

// Specialized DTOs for specific operations
export const ApprovePurchaseOrderDTO = z.object({
  notes: z.string().optional(),
});

export const BulkGeneratePurchaseOrdersDTO = z.object({
  workOrderIds: z.array(z.string()).min(1, "At least one work order ID is required"),
  groupBySupplierId: z.boolean().default(true),
  priority: z.number().int().min(1).max(5).default(3),
  requestedDeliveryDate: z.string().optional(),
  notes: z.string().optional(),
});

export const ReceivePurchaseOrderItemsDTO = z.object({
  items: z.array(z.object({
    itemId: z.string(),
    quantityReceived: z.number().positive("Quantity received must be positive"),
    qualityCheckPassed: z.boolean().default(true),
    qualityNotes: z.string().optional(),
    dateReceived: z.string().optional(), // If not provided, uses current date
  })).min(1, "At least one item must be received"),
  notes: z.string().optional(),
});

export const UpdatePurchaseOrderStatusDTO = z.object({
  statusCode: PurchaseOrderStatusSchema,
  notes: z.string().optional(),
  notifySupplier: z.boolean().default(false),
});

// Filtering and pagination DTOs
export const PurchaseOrderFiltersDTO = z.object({
  orgId: z.string(),
  supplierId: z.string().optional(),
  statusCode: PurchaseOrderStatusSchema.optional(),
  requestedBy: z.string().optional(),
  assignedTo: z.string().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  createdAfter: z.string().optional(),
  createdBefore: z.string().optional(),
  orderDateAfter: z.string().optional(),
  orderDateBefore: z.string().optional(),
  expectedDeliveryBefore: z.string().optional(),
  expectedDeliveryAfter: z.string().optional(),
  search: z.string().optional(), // Search in PO number, supplier name, notes
  limit: z.number().int().positive().max(1000).default(50),
  offset: z.number().int().min(0).default(0),
});

export const SupplierFiltersDTO = z.object({
  specialties: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  minimumPerformanceScore: z.number().min(1).max(5).optional(),
  search: z.string().optional(),
  limit: z.number().int().positive().max(1000).default(50),
  offset: z.number().int().min(0).default(0),
});

export const MaterialFiltersDTO = z.object({
  orgId: z.string(),
  category: MaterialCategorySchema.optional(),
  supplierId: z.string().optional(),
  belowReorderLevel: z.boolean().optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
  limit: z.number().int().positive().max(1000).default(50),
  offset: z.number().int().min(0).default(0),
});

// Supplier Performance Metrics DTO
export const SupplierPerformanceMetricsDTO = z.object({
  id: z.string(),
  orgId: z.string(),
  supplierId: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  totalOrders: z.number().int().min(0).default(0),
  totalAmount: z.number().min(0).default(0),
  onTimeDeliveries: z.number().int().min(0).default(0),
  lateDeliveries: z.number().int().min(0).default(0),
  averageDeliveryDays: z.number().min(0).optional(),
  qualityScore: z.number().min(1).max(5).optional(),
  qualityIssues: z.number().int().min(0).default(0),
  communicationScore: z.number().min(1).max(5).optional(),
  overallRating: z.number().min(1).max(5).optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// TypeScript types
export type PurchaseOrderStatusType = z.infer<typeof PurchaseOrderStatusSchema>;
export type PurchaseOrderEventCodeType = z.infer<typeof PurchaseOrderEventCodeSchema>;
export type MaterialCategoryType = z.infer<typeof MaterialCategorySchema>;

export type MaterialType = z.infer<typeof MaterialDTO>;
export type CreateMaterialType = z.infer<typeof CreateMaterialDTO>;
export type UpdateMaterialType = z.infer<typeof UpdateMaterialDTO>;

export type MaterialsInventoryType = z.infer<typeof MaterialsInventoryDTO>;

export type MaterialRequirementType = z.infer<typeof MaterialRequirementDTO>;
export type CreateMaterialRequirementType = z.infer<typeof CreateMaterialRequirementDTO>;

export type SupplierType = z.infer<typeof SupplierDTO>;

export type PurchaseOrderItemType = z.infer<typeof PurchaseOrderItemDTO>;
export type CreatePurchaseOrderItemType = z.infer<typeof CreatePurchaseOrderItemDTO>;
export type UpdatePurchaseOrderItemType = z.infer<typeof UpdatePurchaseOrderItemDTO>;

export type PurchaseOrderMilestoneType = z.infer<typeof PurchaseOrderMilestoneDTO>;
export type CreatePurchaseOrderMilestoneType = z.infer<typeof CreatePurchaseOrderMilestoneDTO>;
export type UpdatePurchaseOrderMilestoneType = z.infer<typeof UpdatePurchaseOrderMilestoneDTO>;

export type PurchaseOrderEventType = z.infer<typeof PurchaseOrderEventDTO>;
export type CreatePurchaseOrderEventType = z.infer<typeof CreatePurchaseOrderEventDTO>;

export type PurchaseOrderType = z.infer<typeof PurchaseOrderDTO>;
export type CreatePurchaseOrderType = z.infer<typeof CreatePurchaseOrderDTO>;
export type UpdatePurchaseOrderType = z.infer<typeof UpdatePurchaseOrderDTO>;

export type ApprovePurchaseOrderType = z.infer<typeof ApprovePurchaseOrderDTO>;
export type BulkGeneratePurchaseOrdersType = z.infer<typeof BulkGeneratePurchaseOrdersDTO>;
export type ReceivePurchaseOrderItemsType = z.infer<typeof ReceivePurchaseOrderItemsDTO>;
export type UpdatePurchaseOrderStatusType = z.infer<typeof UpdatePurchaseOrderStatusDTO>;

export type PurchaseOrderFiltersType = z.infer<typeof PurchaseOrderFiltersDTO>;
export type SupplierFiltersType = z.infer<typeof SupplierFiltersDTO>;
export type MaterialFiltersType = z.infer<typeof MaterialFiltersDTO>;

export type SupplierPerformanceMetricsType = z.infer<typeof SupplierPerformanceMetricsDTO>;

// Status validation helpers
export const isTerminalPurchaseOrderStatus = (status: PurchaseOrderStatusType): boolean => {
  return ["completed", "cancelled"].includes(status);
};

export const requiresApproval = (totalAmount: number, approvalThreshold: number): boolean => {
  return totalAmount >= approvalThreshold;
};

export const canTransitionToStatus = (fromStatus: PurchaseOrderStatusType, toStatus: PurchaseOrderStatusType): boolean => {
  const transitions: Record<PurchaseOrderStatusType, PurchaseOrderStatusType[]> = {
    "draft": ["pending_approval", "approved", "cancelled"],
    "pending_approval": ["approved", "draft", "cancelled"],
    "approved": ["sent", "cancelled"],
    "sent": ["acknowledged", "on_hold", "cancelled"],
    "acknowledged": ["in_production", "on_hold", "cancelled"],
    "in_production": ["shipped", "on_hold", "cancelled"],
    "shipped": ["delivered", "cancelled"],
    "delivered": ["received", "cancelled"],
    "received": ["completed"],
    "completed": [], // Terminal
    "cancelled": [], // Terminal
    "on_hold": ["approved", "sent", "acknowledged", "in_production", "cancelled"],
  };

  return transitions[fromStatus]?.includes(toStatus) || false;
};