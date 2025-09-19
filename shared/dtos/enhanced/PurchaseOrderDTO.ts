import { z } from "zod";

/**
 * Enhanced Purchase Order DTO schemas with comprehensive validation
 * Includes procurement workflow validation, financial controls, and supplier management
 */

// Common validation utilities
const uuidSchema = z.string().uuid("Must be a valid UUID");
const positiveIntSchema = z.number().int().positive("Must be a positive integer");
const positiveDecimalSchema = z.number().positive("Must be a positive number");
const nonEmptyStringSchema = z.string().min(1, "Cannot be empty").transform(val => val.trim());
const optionalNonEmptyStringSchema = z.string().optional().transform(val => val ? val.trim() : val);
const emailSchema = z.string().email("Must be a valid email address").transform(val => val.toLowerCase().trim());
const phoneSchema = z.string().regex(/^[\+]?[\d\s\-\(\)\.]{10,17}$/, "Must be a valid phone number").transform(val => val.replace(/[^\d\+]/g, ''));

// Enhanced Purchase Order Status with workflow validation
export const PurchaseOrderStatusSchema = z.enum([
  "draft",             // PO created but not finalized
  "pending_approval",  // Waiting for approval (high value orders)
  "approved",          // Approved and ready to send
  "sent",              // Sent to supplier
  "acknowledged",      // Supplier has acknowledged the PO
  "in_production",     // Supplier is producing/fulfilling order
  "shipped",           // Items shipped from supplier
  "delivered",         // Items delivered to our facility
  "received",          // Items received and checked in
  "completed",         // PO fully completed and closed
  "cancelled",         // PO cancelled
  "on_hold",           // Temporarily paused
], {
  errorMap: () => ({ message: "Invalid purchase order status" })
});

// Purchase Order Event codes for comprehensive audit trail
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
  "PAYMENT_PROCESSED",
], {
  errorMap: () => ({ message: "Invalid purchase order event code" })
});

// Material categories with expanded validation
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
  "equipment",
  "tools",
  "maintenance",
  "other"
], {
  errorMap: () => ({ message: "Invalid material category" })
});

// Status transition validation for purchase orders
const PO_STATUS_TRANSITIONS = {
  'draft': ['pending_approval', 'approved', 'cancelled'],
  'pending_approval': ['approved', 'rejected', 'cancelled'],
  'approved': ['sent', 'cancelled'],
  'sent': ['acknowledged', 'cancelled', 'on_hold'],
  'acknowledged': ['in_production', 'cancelled', 'on_hold'],
  'in_production': ['shipped', 'cancelled', 'on_hold'],
  'shipped': ['delivered', 'on_hold'],
  'delivered': ['received'],
  'received': ['completed'],
  'completed': [], // Terminal state
  'cancelled': [], // Terminal state
  'on_hold': ['approved', 'sent', 'acknowledged', 'in_production', 'shipped', 'cancelled'],
  'rejected': ['draft', 'cancelled']
};

export function validatePurchaseOrderStatusTransition(from: string, to: string): boolean {
  if (from === to) return true;
  const validTransitions = PO_STATUS_TRANSITIONS[from] || [];
  return validTransitions.includes(to);
}

// Priority validation for purchase orders
const prioritySchema = z.number().int().min(1, "Priority must be between 1 (urgent) and 5 (low)").max(5, "Priority must be between 1 (urgent) and 5 (low)");

// Currency validation
const currencySchema = z.enum(['USD', 'CAD', 'EUR', 'GBP'], {
  errorMap: () => ({ message: "Currency must be one of: USD, CAD, EUR, GBP" })
});

// PO Number validation
const poNumberSchema = z.string().regex(/^PO-\d{8}-\d{4}$/, "Purchase order number must follow format PO-YYYYMMDD-XXXX");

// Enhanced Material DTO with comprehensive validation
export const MaterialDTO = z.object({
  id: uuidSchema,
  orgId: uuidSchema,
  name: nonEmptyStringSchema.max(200, "Material name cannot exceed 200 characters"),
  sku: z.string().max(50, "SKU cannot exceed 50 characters").optional(),
  description: z.string().max(1000, "Description cannot exceed 1000 characters").optional(),
  category: MaterialCategorySchema,
  unit: nonEmptyStringSchema.max(20, "Unit cannot exceed 20 characters"),
  unitCost: positiveDecimalSchema.max(100000, "Unit cost cannot exceed $100,000"),
  reorderLevel: z.number().int().min(0, "Reorder level cannot be negative").max(100000, "Reorder level cannot exceed 100,000").default(0),
  preferredSupplierId: uuidSchema.optional(),
  leadTimeDays: positiveIntSchema.max(365, "Lead time cannot exceed 365 days").default(7),
  moq: positiveIntSchema.max(100000, "MOQ cannot exceed 100,000").optional(),
  specifications: z.record(z.any()).optional(),
  isActive: z.boolean().default(true),
  isCritical: z.boolean().default(false), // Flag for critical materials
  qualityStandards: z.string().max(1000, "Quality standards cannot exceed 1000 characters").optional(),
  storageRequirements: z.string().max(500, "Storage requirements cannot exceed 500 characters").optional(),
  safetyNotes: z.string().max(1000, "Safety notes cannot exceed 1000 characters").optional(),
  createdAt: z.string().datetime("Must be a valid ISO datetime"),
  updatedAt: z.string().datetime("Must be a valid ISO datetime"),
}).refine((data) => {
  // Business rule: Critical materials should have quality standards
  if (data.isCritical && !data.qualityStandards) {
    return false;
  }
  return true;
}, {
  message: "Critical materials must have quality standards defined",
  path: ["qualityStandards"]
});

// Enhanced Supplier DTO with performance tracking
export const SupplierDTO = z.object({
  id: uuidSchema,
  name: nonEmptyStringSchema.max(200, "Supplier name cannot exceed 200 characters"),
  contactEmail: emailSchema,
  contactPhone: phoneSchema.optional(),
  addressLine1: nonEmptyStringSchema.max(200, "Address line 1 cannot exceed 200 characters"),
  addressLine2: z.string().max(200, "Address line 2 cannot exceed 200 characters").optional(),
  city: nonEmptyStringSchema.max(100, "City cannot exceed 100 characters"),
  state: nonEmptyStringSchema.max(100, "State cannot exceed 100 characters"),
  postalCode: z.string().regex(/^[\d\w\s\-]{3,20}$/, "Invalid postal code format").optional(),
  country: nonEmptyStringSchema.max(100, "Country cannot exceed 100 characters"),
  taxId: z.string().max(50, "Tax ID cannot exceed 50 characters").optional(),
  specialties: z.array(z.string().min(1).max(100)).max(20, "Cannot have more than 20 specialties").optional(),
  minimumOrderQuantity: positiveIntSchema.max(100000, "MOQ cannot exceed 100,000").optional(),
  leadTimeDays: positiveIntSchema.max(365, "Lead time cannot exceed 365 days").optional(),
  paymentTerms: z.string().max(200, "Payment terms cannot exceed 200 characters").optional(),
  creditLimit: positiveDecimalSchema.max(1000000, "Credit limit cannot exceed $1,000,000").optional(),
  isActive: z.boolean().default(true),
  isApproved: z.boolean().default(false),
  certifications: z.array(z.string().max(100)).max(10, "Cannot have more than 10 certifications").optional(),
  insuranceInfo: z.string().max(500, "Insurance info cannot exceed 500 characters").optional(),
  // Performance metrics
  performanceScore: z.number().min(1, "Performance score must be between 1 and 5").max(5, "Performance score must be between 1 and 5").optional(),
  onTimeDeliveryRate: z.number().min(0, "Delivery rate must be between 0 and 1").max(1, "Delivery rate must be between 0 and 1").optional(),
  qualityScore: z.number().min(1, "Quality score must be between 1 and 5").max(5, "Quality score must be between 1 and 5").optional(),
  communicationScore: z.number().min(1, "Communication score must be between 1 and 5").max(5, "Communication score must be between 1 and 5").optional(),
  createdAt: z.string().datetime("Must be a valid ISO datetime"),
  updatedAt: z.string().datetime("Must be a valid ISO datetime"),
}).refine((data) => {
  // Business rule: Approved suppliers should have performance data
  if (data.isApproved && (!data.performanceScore || !data.onTimeDeliveryRate)) {
    return false;
  }
  return true;
}, {
  message: "Approved suppliers must have performance metrics",
  path: ["performanceScore", "onTimeDeliveryRate"]
});

// Enhanced Purchase Order Item DTO
export const PurchaseOrderItemDTO = z.object({
  id: uuidSchema,
  orgId: uuidSchema,
  purchaseOrderId: uuidSchema,
  materialId: uuidSchema.optional(),
  materialName: nonEmptyStringSchema.max(200, "Material name cannot exceed 200 characters"),
  materialSku: z.string().max(50, "Material SKU cannot exceed 50 characters").optional(),
  description: z.string().max(1000, "Description cannot exceed 1000 characters").optional(),
  quantity: positiveDecimalSchema.max(1000000, "Quantity cannot exceed 1,000,000"),
  unit: nonEmptyStringSchema.max(20, "Unit cannot exceed 20 characters"),
  unitCost: positiveDecimalSchema.max(100000, "Unit cost cannot exceed $100,000"),
  totalCost: positiveDecimalSchema.max(100000000, "Total cost cannot exceed $100,000,000"),
  quantityReceived: z.number().min(0, "Quantity received cannot be negative").max(1000000, "Quantity received cannot exceed 1,000,000").default(0),
  dateReceived: z.string().datetime("Must be a valid ISO datetime").optional(),
  receivedBy: uuidSchema.optional(),
  qualityCheckPassed: z.boolean().optional(),
  qualityNotes: z.string().max(2000, "Quality notes cannot exceed 2000 characters").optional(),
  lineNumber: positiveIntSchema.max(1000, "Line number cannot exceed 1000"),
  notes: z.string().max(1000, "Notes cannot exceed 1000 characters").optional(),
  expectedDeliveryDate: z.string().datetime("Must be a valid ISO datetime").optional(),
  actualDeliveryDate: z.string().datetime("Must be a valid ISO datetime").optional(),
  createdAt: z.string().datetime("Must be a valid ISO datetime"),
  updatedAt: z.string().datetime("Must be a valid ISO datetime"),
}).refine((data) => {
  // Business rule: Total cost should equal quantity * unit cost
  const calculatedTotal = data.quantity * data.unitCost;
  const tolerance = 0.01; // Allow for rounding differences
  return Math.abs(data.totalCost - calculatedTotal) <= tolerance;
}, {
  message: "Total cost must equal quantity multiplied by unit cost",
  path: ["totalCost"]
}).refine((data) => {
  // Business rule: Quantity received cannot exceed ordered quantity
  if (data.quantityReceived > data.quantity) {
    return false;
  }
  return true;
}, {
  message: "Quantity received cannot exceed ordered quantity",
  path: ["quantityReceived"]
}).refine((data) => {
  // Business rule: Quality check results should have notes
  if (data.qualityCheckPassed === false && !data.qualityNotes) {
    return false;
  }
  return true;
}, {
  message: "Failed quality checks must include quality notes",
  path: ["qualityNotes"]
});

// Enhanced Purchase Order DTO with financial controls
export const PurchaseOrderDTO = z.object({
  id: uuidSchema,
  orgId: uuidSchema,
  poNumber: poNumberSchema,
  supplierId: uuidSchema,
  supplierName: nonEmptyStringSchema.max(200, "Supplier name cannot exceed 200 characters"),
  supplierContactEmail: emailSchema.optional(),
  supplierContactPhone: phoneSchema.optional(),
  statusCode: PurchaseOrderStatusSchema.default("draft"),
  totalAmount: z.number().min(0, "Total amount cannot be negative").max(10000000, "Total amount cannot exceed $10,000,000"),
  subtotal: z.number().min(0, "Subtotal cannot be negative"),
  taxAmount: z.number().min(0, "Tax amount cannot be negative"),
  shippingAmount: z.number().min(0, "Shipping amount cannot be negative"),
  discountAmount: z.number().min(0, "Discount amount cannot be negative"),
  approvalThreshold: positiveDecimalSchema.max(1000000, "Approval threshold cannot exceed $1,000,000").default(1000),
  approvedBy: uuidSchema.optional(),
  approvedAt: z.string().datetime("Must be a valid ISO datetime").optional(),
  rejectedBy: uuidSchema.optional(),
  rejectedAt: z.string().datetime("Must be a valid ISO datetime").optional(),
  rejectionReason: z.string().max(1000, "Rejection reason cannot exceed 1000 characters").optional(),
  orderDate: z.string().datetime("Must be a valid ISO datetime"),
  expectedDeliveryDate: z.string().datetime("Must be a valid ISO datetime").optional(),
  actualDeliveryDate: z.string().datetime("Must be a valid ISO datetime").optional(),
  requestedBy: uuidSchema,
  assignedTo: uuidSchema.optional(),
  priority: prioritySchema.default(3),
  currency: currencySchema.default("USD"),
  exchangeRate: z.number().positive("Exchange rate must be positive").default(1.0),
  termsAndConditions: z.string().max(5000, "Terms and conditions cannot exceed 5000 characters").optional(),
  shippingAddress: z.object({
    addressLine1: nonEmptyStringSchema.max(200),
    addressLine2: z.string().max(200).optional(),
    city: nonEmptyStringSchema.max(100),
    state: nonEmptyStringSchema.max(100),
    postalCode: z.string().max(20),
    country: nonEmptyStringSchema.max(100),
  }),
  billingAddress: z.object({
    addressLine1: nonEmptyStringSchema.max(200),
    addressLine2: z.string().max(200).optional(),
    city: nonEmptyStringSchema.max(100),
    state: nonEmptyStringSchema.max(100),
    postalCode: z.string().max(20),
    country: nonEmptyStringSchema.max(100),
  }).optional(),
  notes: z.string().max(2000, "Notes cannot exceed 2000 characters").optional(),
  internalNotes: z.string().max(2000, "Internal notes cannot exceed 2000 characters").optional(),
  budgetCode: z.string().max(50, "Budget code cannot exceed 50 characters").optional(),
  projectCode: z.string().max(50, "Project code cannot exceed 50 characters").optional(),
  createdAt: z.string().datetime("Must be a valid ISO datetime"),
  updatedAt: z.string().datetime("Must be a valid ISO datetime"),
}).refine((data) => {
  // Business rule: Total amount should equal subtotal + tax + shipping - discount
  const calculatedTotal = data.subtotal + data.taxAmount + data.shippingAmount - data.discountAmount;
  const tolerance = 0.01; // Allow for rounding differences
  return Math.abs(data.totalAmount - calculatedTotal) <= tolerance;
}, {
  message: "Total amount must equal subtotal + tax + shipping - discount",
  path: ["totalAmount"]
}).refine((data) => {
  // Business rule: Orders above threshold require approval
  if (data.totalAmount > data.approvalThreshold && !['draft', 'pending_approval'].includes(data.statusCode) && !data.approvedBy) {
    return false;
  }
  return true;
}, {
  message: "Orders above approval threshold must be approved before processing",
  path: ["approvedBy"]
}).refine((data) => {
  // Business rule: Expected delivery date should be reasonable
  if (data.expectedDeliveryDate && data.orderDate) {
    const daysDiff = (new Date(data.expectedDeliveryDate).getTime() - new Date(data.orderDate).getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff < 1 || daysDiff > 365) {
      return false;
    }
  }
  return true;
}, {
  message: "Expected delivery date must be between 1 and 365 days from order date",
  path: ["expectedDeliveryDate"]
}).refine((data) => {
  // Business rule: Rejected orders must have rejection reason
  if (data.rejectedBy && !data.rejectionReason) {
    return false;
  }
  return true;
}, {
  message: "Rejected purchase orders must include a rejection reason",
  path: ["rejectionReason"]
});

// Enhanced Create Purchase Order DTO
export const CreatePurchaseOrderDTO = z.object({
  orgId: uuidSchema,
  supplierId: uuidSchema,
  orderDate: z.string().datetime("Must be a valid ISO datetime").refine((date) => {
    const orderDate = new Date(date);
    const now = new Date();
    const daysDiff = Math.abs(orderDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 30; // Order date should be within 30 days of today
  }, "Order date must be within 30 days of today"),
  expectedDeliveryDate: z.string().datetime("Must be a valid ISO datetime").optional(),
  requestedBy: uuidSchema,
  assignedTo: uuidSchema.optional(),
  priority: prioritySchema.default(3),
  currency: currencySchema.default("USD"),
  exchangeRate: z.number().positive("Exchange rate must be positive").default(1.0),
  termsAndConditions: z.string().max(5000, "Terms and conditions cannot exceed 5000 characters").optional(),
  shippingAddress: z.object({
    addressLine1: nonEmptyStringSchema.max(200),
    addressLine2: z.string().max(200).optional(),
    city: nonEmptyStringSchema.max(100),
    state: nonEmptyStringSchema.max(100),
    postalCode: z.string().max(20),
    country: nonEmptyStringSchema.max(100),
  }),
  notes: z.string().max(2000, "Notes cannot exceed 2000 characters").optional(),
  budgetCode: z.string().max(50, "Budget code cannot exceed 50 characters").optional(),
  projectCode: z.string().max(50, "Project code cannot exceed 50 characters").optional(),
  items: z.array(z.object({
    materialId: uuidSchema.optional(),
    materialName: nonEmptyStringSchema.max(200),
    materialSku: z.string().max(50).optional(),
    description: z.string().max(1000).optional(),
    quantity: positiveDecimalSchema.max(1000000),
    unit: nonEmptyStringSchema.max(20),
    unitCost: positiveDecimalSchema.max(100000),
    expectedDeliveryDate: z.string().datetime().optional(),
    notes: z.string().max(1000).optional(),
  })).min(1, "Purchase order must have at least one item").max(100, "Purchase order cannot have more than 100 items"),
}).refine((data) => {
  if (data.expectedDeliveryDate && data.orderDate) {
    return new Date(data.expectedDeliveryDate) > new Date(data.orderDate);
  }
  return true;
}, {
  message: "Expected delivery date must be after order date",
  path: ["expectedDeliveryDate"]
});

// Enhanced approval DTO
export const ApprovePurchaseOrderDTO = z.object({
  approved: z.boolean(),
  notes: z.string().max(1000, "Approval notes cannot exceed 1000 characters").optional(),
  rejectionReason: z.string().min(10, "Rejection reason must be at least 10 characters").max(1000, "Rejection reason cannot exceed 1000 characters").optional(),
  modifyTerms: z.boolean().default(false),
  newExpectedDeliveryDate: z.string().datetime("Must be a valid ISO datetime").optional(),
  budgetApproval: z.boolean().default(true),
  complianceCheck: z.boolean().default(true),
}).refine((data) => {
  // Business rule: Rejected orders must have rejection reason
  if (!data.approved && !data.rejectionReason) {
    return false;
  }
  return true;
}, {
  message: "Rejected purchase orders must include a rejection reason",
  path: ["rejectionReason"]
});

// Receiving items DTO with quality control
export const ReceivePurchaseOrderItemsDTO = z.object({
  items: z.array(z.object({
    itemId: uuidSchema,
    quantityReceived: positiveDecimalSchema,
    qualityCheckPassed: z.boolean(),
    qualityNotes: z.string().max(2000, "Quality notes cannot exceed 2000 characters").optional(),
    damageNotes: z.string().max(1000, "Damage notes cannot exceed 1000 characters").optional(),
    expirationDate: z.string().datetime("Must be a valid ISO datetime").optional(),
    batchNumber: z.string().max(50, "Batch number cannot exceed 50 characters").optional(),
    storageLocation: z.string().max(100, "Storage location cannot exceed 100 characters").optional(),
  })).min(1, "Must receive at least one item"),
  receivedBy: uuidSchema,
  receivedDate: z.string().datetime("Must be a valid ISO datetime").default(() => new Date().toISOString()),
  overallQualityScore: z.number().min(1, "Quality score must be between 1 and 5").max(5, "Quality score must be between 1 and 5"),
  notes: z.string().max(2000, "Receiving notes cannot exceed 2000 characters").optional(),
  documentsReceived: z.array(z.string()).max(20, "Cannot have more than 20 document references").optional(),
}).refine((data) => {
  // Business rule: Failed quality checks must have quality notes
  const failedItems = data.items.filter(item => !item.qualityCheckPassed);
  const allFailedHaveNotes = failedItems.every(item => item.qualityNotes);
  return allFailedHaveNotes;
}, {
  message: "Items that fail quality check must have quality notes",
  path: ["items"]
});

// Search and filtering DTOs
export const PurchaseOrderFiltersDTO = z.object({
  statusCode: z.array(PurchaseOrderStatusSchema).optional(),
  supplierId: uuidSchema.optional(),
  requestedBy: uuidSchema.optional(),
  assignedTo: uuidSchema.optional(),
  priority: z.array(prioritySchema).optional(),
  orderDateFrom: z.string().datetime().optional(),
  orderDateTo: z.string().datetime().optional(),
  expectedDeliveryFrom: z.string().datetime().optional(),
  expectedDeliveryTo: z.string().datetime().optional(),
  minAmount: z.number().min(0).optional(),
  maxAmount: z.number().min(0).optional(),
  currency: currencySchema.optional(),
  budgetCode: z.string().max(50).optional(),
  projectCode: z.string().max(50).optional(),
  overdue: z.boolean().optional(),
  needsApproval: z.boolean().optional(),
  search: z.string().max(100, "Search term cannot exceed 100 characters").optional(),
}).refine((data) => {
  if (data.orderDateFrom && data.orderDateTo) {
    return new Date(data.orderDateFrom) <= new Date(data.orderDateTo);
  }
  return true;
}, {
  message: "Order date 'from' must be before 'to'",
  path: ["orderDateFrom", "orderDateTo"]
}).refine((data) => {
  if (data.minAmount && data.maxAmount) {
    return data.minAmount <= data.maxAmount;
  }
  return true;
}, {
  message: "Minimum amount must be less than or equal to maximum amount",
  path: ["minAmount", "maxAmount"]
});

// Bulk operations
export const BulkGeneratePurchaseOrdersDTO = z.object({
  materialRequirementIds: z.array(uuidSchema).min(1, "Must specify at least one material requirement").max(50, "Cannot generate more than 50 purchase orders at once"),
  consolidateBySupplier: z.boolean().default(true),
  expectedDeliveryDate: z.string().datetime("Must be a valid ISO datetime").optional(),
  priority: prioritySchema.default(3),
  requestedBy: uuidSchema,
  assignedTo: uuidSchema.optional(),
  budgetCode: z.string().max(50).optional(),
  projectCode: z.string().max(50).optional(),
  notes: z.string().max(2000, "Notes cannot exceed 2000 characters").optional(),
});

// TypeScript types
export type PurchaseOrderType = z.infer<typeof PurchaseOrderDTO>;
export type CreatePurchaseOrderType = z.infer<typeof CreatePurchaseOrderDTO>;
export type ApprovePurchaseOrderType = z.infer<typeof ApprovePurchaseOrderDTO>;
export type ReceivePurchaseOrderItemsType = z.infer<typeof ReceivePurchaseOrderItemsDTO>;
export type PurchaseOrderFiltersType = z.infer<typeof PurchaseOrderFiltersDTO>;
export type BulkGeneratePurchaseOrdersType = z.infer<typeof BulkGeneratePurchaseOrdersDTO>;
export type MaterialType = z.infer<typeof MaterialDTO>;
export type SupplierType = z.infer<typeof SupplierDTO>;
export type PurchaseOrderItemType = z.infer<typeof PurchaseOrderItemDTO>;