import { z } from "zod";

/**
 * Order DTO schemas for order management API
 * Aligned with actual database schema (orders & order_items tables)
 */

export const OrderItemDTO = z.object({
  id: z.string(),
  orgId: z.string(),
  orderId: z.string(),
  productId: z.string().optional(),
  variantId: z.string().optional(),
  nameSnapshot: z.string().optional(),
  skuSnapshot: z.string().optional(),
  priceSnapshot: z.number().optional(),
  quantity: z.number(),
  statusCode: z.string().default("pending_design"),
  designerId: z.string().optional(),
  manufacturerId: z.string().optional(),
  pantoneJson: z.record(z.any()).optional(),
  buildOverridesText: z.string().optional(),
  variantImageUrl: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const OrderTotalsDTO = z.object({
  totalAmount: z.number().optional(),
  revenueEstimate: z.number().optional(),
});

export const OrderDTO = z.object({
  id: z.string(),
  orgId: z.string(),
  customerId: z.string(),
  salespersonId: z.string().optional(),
  sportId: z.string().optional(),
  code: z.string(), // Order number (ORD-YYYYMMDD-XXXX)
  customerContactName: z.string().optional(),
  customerContactEmail: z.string().optional(),
  customerContactPhone: z.string().optional(),
  statusCode: z.string().default("draft"),
  totalAmount: z.number().optional(),
  revenueEstimate: z.number().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  // Legacy fields for backwards compatibility
  organizationId: z.string().optional(),
  orderNumber: z.string().optional(),
  customerName: z.string().optional(),
  items: z.array(OrderItemDTO).optional(),
});

export const CreateOrderDTO = OrderDTO.omit({
  id: true,
  code: true,
  createdAt: true,
  updatedAt: true,
  orderNumber: true,
}).extend({
  // Allow items to be provided during order creation
  items: z.array(OrderItemDTO.omit({ id: true, orderId: true, createdAt: true, updatedAt: true })).optional(),
});

export const UpdateOrderDTO = CreateOrderDTO.partial();

// Additional specialized DTOs
export const CreateOrderItemDTO = OrderItemDTO.omit({
  id: true,
  orderId: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateOrderItemDTO = CreateOrderItemDTO.partial();

export const CancelOrderDTO = z.object({
  reason: z.string().optional(),
});

// TypeScript types
export type OrderType = z.infer<typeof OrderDTO>;
export type OrderItemType = z.infer<typeof OrderItemDTO>;
export type OrderTotalsType = z.infer<typeof OrderTotalsDTO>;
export type CreateOrderType = z.infer<typeof CreateOrderDTO>;
export type UpdateOrderType = z.infer<typeof UpdateOrderDTO>;
export type CreateOrderItemType = z.infer<typeof CreateOrderItemDTO>;
export type UpdateOrderItemType = z.infer<typeof UpdateOrderItemDTO>;
export type CancelOrderType = z.infer<typeof CancelOrderDTO>;