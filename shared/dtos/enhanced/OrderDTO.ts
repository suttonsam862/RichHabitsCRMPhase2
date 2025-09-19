import { z } from "zod";

/**
 * Enhanced Order DTO schemas with comprehensive validation
 * Includes business logic, input sanitization, and detailed error messages
 */

// Common validation utilities
const uuidSchema = z.string().uuid("Must be a valid UUID");
const emailSchema = z.string().email("Must be a valid email address").transform(val => val.toLowerCase().trim());
const phoneSchema = z.string().regex(/^[\+]?[\d\s\-\(\)\.]{10,17}$/, "Must be a valid phone number").transform(val => val.replace(/[^\d\+]/g, ''));
const positiveIntSchema = z.number().int().positive("Must be a positive integer");
const positiveDecimalSchema = z.number().positive("Must be a positive number");
const nonEmptyStringSchema = z.string().min(1, "Cannot be empty").transform(val => val.trim());
const optionalNonEmptyStringSchema = z.string().optional().transform(val => val ? val.trim() : val);

// Order status workflow validation
export const OrderStatusSchema = z.enum([
  "draft",       // Initial state - order being created
  "pending",     // Awaiting approval/processing
  "confirmed",   // Order confirmed and in system
  "processing",  // Order being worked on
  "shipped",     // Order has been shipped
  "delivered",   // Order delivered to customer
  "completed",   // Order fully completed
  "cancelled",   // Order cancelled
  "on_hold"      // Order temporarily paused
], {
  errorMap: () => ({ message: "Invalid order status. Must be one of: draft, pending, confirmed, processing, shipped, delivered, completed, cancelled, on_hold" })
});

// Order item status validation  
export const OrderItemStatusSchema = z.enum([
  "pending_design",    // Waiting for design work
  "design_in_progress", // Design work underway
  "design_approved",   // Design completed and approved
  "pending_manufacturing", // Ready for manufacturing
  "in_production",     // Being manufactured
  "quality_check",     // In quality control
  "completed",         // Item completed
  "cancelled"          // Item cancelled
], {
  errorMap: () => ({ message: "Invalid order item status" })
});

// Status transition validation
const STATUS_TRANSITIONS = {
  'draft': ['pending', 'cancelled'],
  'pending': ['confirmed', 'cancelled'],
  'confirmed': ['processing', 'cancelled'],
  'processing': ['shipped', 'cancelled', 'on_hold'],
  'shipped': ['delivered'],
  'delivered': ['completed'],
  'completed': [], // Terminal state
  'cancelled': [], // Terminal state
  'on_hold': ['processing', 'cancelled']
};

export function validateStatusTransition(from: string, to: string): boolean {
  if (from === to) return true; // Same status is always valid
  const validTransitions = STATUS_TRANSITIONS[from] || [];
  return validTransitions.includes(to);
}

// Enhanced Order Item DTO with comprehensive validation
export const OrderItemDTO = z.object({
  id: uuidSchema,
  orgId: uuidSchema,
  orderId: uuidSchema,
  productId: uuidSchema.optional(),
  variantId: uuidSchema.optional(),
  nameSnapshot: optionalNonEmptyStringSchema,
  skuSnapshot: optionalNonEmptyStringSchema,
  priceSnapshot: z.number().min(0, "Price cannot be negative").optional(),
  quantity: positiveIntSchema.max(10000, "Quantity cannot exceed 10,000 units"),
  statusCode: OrderItemStatusSchema.default("pending_design"),
  designerId: uuidSchema.optional(),
  manufacturerId: uuidSchema.optional(),
  pantoneJson: z.record(z.any()).optional(),
  buildOverridesText: z.string().max(2000, "Build overrides cannot exceed 2000 characters").optional(),
  variantImageUrl: z.string().url("Must be a valid URL").optional(),
  createdAt: z.string().datetime("Must be a valid ISO datetime"),
  updatedAt: z.string().datetime("Must be a valid ISO datetime"),
}).refine((data) => {
  // Business rule: If item has a designer, it should be in design status
  if (data.designerId && !['pending_design', 'design_in_progress', 'design_approved'].includes(data.statusCode)) {
    return false;
  }
  return true;
}, {
  message: "Order item with assigned designer must be in design phase status",
  path: ["statusCode"]
}).refine((data) => {
  // Business rule: Completed items must have positive quantity and price
  if (data.statusCode === 'completed' && (!data.quantity || !data.priceSnapshot || data.priceSnapshot <= 0)) {
    return false;
  }
  return true;
}, {
  message: "Completed order items must have valid quantity and price",
  path: ["quantity", "priceSnapshot"]
});

// Enhanced Order DTO with comprehensive validation
export const OrderDTO = z.object({
  id: uuidSchema,
  orgId: uuidSchema,
  customerId: uuidSchema,
  salespersonId: uuidSchema.optional(),
  sportId: uuidSchema.optional(),
  code: z.string().regex(/^ORD-\d{8}-\d{4}$/, "Order code must follow format ORD-YYYYMMDD-XXXX"),
  customerContactName: z.string().min(2, "Customer name must be at least 2 characters").max(100, "Customer name cannot exceed 100 characters").optional(),
  customerContactEmail: emailSchema.optional(),
  customerContactPhone: phoneSchema.optional(),
  statusCode: OrderStatusSchema.default("draft"),
  totalAmount: z.number().min(0, "Total amount cannot be negative").max(1000000, "Total amount cannot exceed $1,000,000").optional(),
  revenueEstimate: z.number().min(0, "Revenue estimate cannot be negative").optional(),
  dueDate: z.string().datetime("Due date must be a valid ISO datetime").optional(),
  notes: z.string().max(5000, "Notes cannot exceed 5000 characters").optional(),
  createdAt: z.string().datetime("Must be a valid ISO datetime"),
  updatedAt: z.string().datetime("Must be a valid ISO datetime"),
  // Legacy fields for backwards compatibility
  organizationId: uuidSchema.optional(),
  orderNumber: z.string().optional(),
  customerName: z.string().optional(),
  items: z.array(OrderItemDTO).max(100, "Order cannot have more than 100 items").optional(),
}).refine((data) => {
  // Business rule: Due date must be in the future for non-completed orders
  if (data.dueDate && !['completed', 'cancelled'].includes(data.statusCode)) {
    const dueDate = new Date(data.dueDate);
    const now = new Date();
    if (dueDate <= now) {
      return false;
    }
  }
  return true;
}, {
  message: "Due date must be in the future for active orders",
  path: ["dueDate"]
}).refine((data) => {
  // Business rule: Revenue estimate should not exceed total amount
  if (data.revenueEstimate && data.totalAmount && data.revenueEstimate > data.totalAmount) {
    return false;
  }
  return true;
}, {
  message: "Revenue estimate cannot exceed total amount",
  path: ["revenueEstimate"]
}).refine((data) => {
  // Business rule: Completed orders must have contact information
  if (data.statusCode === 'completed' && (!data.customerContactName && !data.customerContactEmail)) {
    return false;
  }
  return true;
}, {
  message: "Completed orders must have customer contact information",
  path: ["customerContactName", "customerContactEmail"]
});

// Enhanced Create Order DTO with validation
export const CreateOrderDTO = OrderDTO.omit({
  id: true,
  code: true,
  createdAt: true,
  updatedAt: true,
  orderNumber: true,
}).extend({
  orgId: uuidSchema,
  customerId: uuidSchema,
  customerContactName: z.string().min(2, "Customer name must be at least 2 characters").max(100, "Customer name cannot exceed 100 characters"),
  customerContactEmail: emailSchema.optional(),
  customerContactPhone: phoneSchema.optional(),
  totalAmount: z.number().min(0, "Total amount cannot be negative").optional(),
  dueDate: z.string().datetime("Due date must be a valid ISO datetime").refine((date) => {
    return new Date(date) > new Date();
  }, "Due date must be in the future").optional(),
  notes: z.string().max(5000, "Notes cannot exceed 5000 characters").optional(),
  items: z.array(OrderItemDTO.omit({ 
    id: true, 
    orderId: true, 
    createdAt: true, 
    updatedAt: true 
  })).min(1, "Order must have at least one item").max(100, "Order cannot have more than 100 items").optional(),
}).refine((data) => {
  // Business rule: Either email or phone required for new orders
  if (!data.customerContactEmail && !data.customerContactPhone) {
    return false;
  }
  return true;
}, {
  message: "Either customer email or phone number is required",
  path: ["customerContactEmail", "customerContactPhone"]
});

// Enhanced Update Order DTO with partial validation
export const UpdateOrderDTO = z.object({
  customerId: uuidSchema.optional(),
  salespersonId: uuidSchema.optional(),
  sportId: uuidSchema.optional(),
  customerContactName: z.string().min(2, "Customer name must be at least 2 characters").max(100, "Customer name cannot exceed 100 characters").optional(),
  customerContactEmail: emailSchema.optional(),
  customerContactPhone: phoneSchema.optional(),
  statusCode: OrderStatusSchema.optional(),
  totalAmount: z.number().min(0, "Total amount cannot be negative").max(1000000, "Total amount cannot exceed $1,000,000").optional(),
  revenueEstimate: z.number().min(0, "Revenue estimate cannot be negative").optional(),
  dueDate: z.string().datetime("Due date must be a valid ISO datetime").optional(),
  notes: z.string().max(5000, "Notes cannot exceed 5000 characters").optional(),
}).refine((data) => {
  // Business rule: Revenue estimate should not exceed total amount
  if (data.revenueEstimate && data.totalAmount && data.revenueEstimate > data.totalAmount) {
    return false;
  }
  return true;
}, {
  message: "Revenue estimate cannot exceed total amount",
  path: ["revenueEstimate"]
});

// Enhanced Order Item DTOs
export const CreateOrderItemDTO = OrderItemDTO.omit({
  id: true,
  orderId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  orgId: uuidSchema,
  productId: uuidSchema.optional(),
  nameSnapshot: nonEmptyStringSchema,
  quantity: positiveIntSchema.max(10000, "Quantity cannot exceed 10,000 units"),
  priceSnapshot: positiveDecimalSchema.max(100000, "Price cannot exceed $100,000 per item"),
});

export const UpdateOrderItemDTO = z.object({
  productId: uuidSchema.optional(),
  variantId: uuidSchema.optional(),
  nameSnapshot: z.string().min(1, "Name cannot be empty").max(200, "Name cannot exceed 200 characters").optional(),
  skuSnapshot: z.string().max(50, "SKU cannot exceed 50 characters").optional(),
  priceSnapshot: z.number().min(0, "Price cannot be negative").max(100000, "Price cannot exceed $100,000 per item").optional(),
  quantity: positiveIntSchema.max(10000, "Quantity cannot exceed 10,000 units").optional(),
  statusCode: OrderItemStatusSchema.optional(),
  designerId: uuidSchema.optional(),
  manufacturerId: uuidSchema.optional(),
  buildOverridesText: z.string().max(2000, "Build overrides cannot exceed 2000 characters").optional(),
  variantImageUrl: z.string().url("Must be a valid URL").optional(),
});

// Status transition DTO with validation
export const UpdateOrderStatusDTO = z.object({
  statusCode: OrderStatusSchema,
  notes: z.string().max(1000, "Status change notes cannot exceed 1000 characters").optional(),
  reason: z.string().max(500, "Reason cannot exceed 500 characters").optional(),
});

// Order cancellation with enhanced validation
export const CancelOrderDTO = z.object({
  reason: z.string().min(10, "Cancellation reason must be at least 10 characters").max(1000, "Cancellation reason cannot exceed 1000 characters"),
  refundAmount: z.number().min(0, "Refund amount cannot be negative").optional(),
  notifyCustomer: z.boolean().default(true),
});

// Order totals calculation DTO
export const OrderTotalsDTO = z.object({
  subtotal: z.number().min(0, "Subtotal cannot be negative"),
  taxAmount: z.number().min(0, "Tax amount cannot be negative"),
  shippingAmount: z.number().min(0, "Shipping amount cannot be negative"),
  discountAmount: z.number().min(0, "Discount amount cannot be negative"),
  totalAmount: z.number().min(0, "Total amount cannot be negative"),
  revenueEstimate: z.number().min(0, "Revenue estimate cannot be negative"),
}).refine((data) => {
  // Business rule: Total should equal subtotal + tax + shipping - discount
  const calculatedTotal = data.subtotal + data.taxAmount + data.shippingAmount - data.discountAmount;
  const tolerance = 0.01; // Allow for rounding differences
  return Math.abs(data.totalAmount - calculatedTotal) <= tolerance;
}, {
  message: "Total amount must equal subtotal + tax + shipping - discount",
  path: ["totalAmount"]
});

// Search/filter DTOs with validation
export const OrderFiltersDTO = z.object({
  statusCode: z.array(OrderStatusSchema).optional(),
  customerId: uuidSchema.optional(),
  salespersonId: uuidSchema.optional(),
  sportId: uuidSchema.optional(),
  dueDateFrom: z.string().datetime().optional(),
  dueDateTo: z.string().datetime().optional(),
  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional(),
  minAmount: z.number().min(0).optional(),
  maxAmount: z.number().min(0).optional(),
  search: z.string().max(100, "Search term cannot exceed 100 characters").optional(),
}).refine((data) => {
  // Date range validation
  if (data.dueDateFrom && data.dueDateTo) {
    return new Date(data.dueDateFrom) <= new Date(data.dueDateTo);
  }
  return true;
}, {
  message: "Due date 'from' must be before 'to'",
  path: ["dueDateFrom", "dueDateTo"]
}).refine((data) => {
  // Amount range validation
  if (data.minAmount && data.maxAmount) {
    return data.minAmount <= data.maxAmount;
  }
  return true;
}, {
  message: "Minimum amount must be less than or equal to maximum amount",
  path: ["minAmount", "maxAmount"]
});

// Bulk operations DTOs
export const BulkUpdateOrdersDTO = z.object({
  orderIds: z.array(uuidSchema).min(1, "Must specify at least one order").max(100, "Cannot update more than 100 orders at once"),
  statusCode: OrderStatusSchema.optional(),
  salespersonId: uuidSchema.optional(),
  notes: z.string().max(1000, "Notes cannot exceed 1000 characters").optional(),
});

// TypeScript types
export type OrderType = z.infer<typeof OrderDTO>;
export type OrderItemType = z.infer<typeof OrderItemDTO>;
export type CreateOrderType = z.infer<typeof CreateOrderDTO>;
export type UpdateOrderType = z.infer<typeof UpdateOrderDTO>;
export type CreateOrderItemType = z.infer<typeof CreateOrderItemDTO>;
export type UpdateOrderItemType = z.infer<typeof UpdateOrderItemDTO>;
export type UpdateOrderStatusType = z.infer<typeof UpdateOrderStatusDTO>;
export type CancelOrderType = z.infer<typeof CancelOrderDTO>;
export type OrderTotalsType = z.infer<typeof OrderTotalsDTO>;
export type OrderFiltersType = z.infer<typeof OrderFiltersDTO>;
export type BulkUpdateOrdersType = z.infer<typeof BulkUpdateOrdersDTO>;