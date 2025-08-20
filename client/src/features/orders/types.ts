import { z } from "zod";

// Order status enum
export enum OrderStatus {
  DRAFT = "draft",
  PENDING = "pending",
  CONFIRMED = "confirmed",
  IN_PRODUCTION = "in_production",
  READY_FOR_DELIVERY = "ready_for_delivery",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
}

// Order schema
export const orderSchema = z.object({
  id: z.string(),
  quoteId: z.string().optional(),
  customerName: z.string(),
  customerEmail: z.string().email(),
  organizationId: z.string().optional(),
  status: z.nativeEnum(OrderStatus),
  items: z.array(z.object({
    id: z.string(),
    productId: z.string(),
    productName: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    totalPrice: z.number(),
  })),
  totals: z.object({
    subtotal: z.number(),
    tax: z.number(),
    shipping: z.number(),
    total: z.number(),
  }),
  notes: z.string().optional(),
  deliveryDate: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Order = z.infer<typeof orderSchema>;

export const createOrderSchema = orderSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateOrderPayload = z.infer<typeof createOrderSchema>;