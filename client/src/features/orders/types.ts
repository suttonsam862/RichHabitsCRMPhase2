import { z } from "zod";

// Order status enum
export enum OrderStatus {
  CONSULTATION = "consultation",
  DESIGN = "design",
  MANUFACTURING = "manufacturing",
  SHIPPED = "shipped",
  COMPLETED = "completed",
}

// Order schema
export const orderSchema = z.object({
  id: z.string(),
  quoteId: z.string().optional(),
  customerName: z.string(),
  customerEmail: z.string().email(),
  organizationId: z.string().optional(),
  status_code: z.enum(['consultation', 'design', 'manufacturing', 'shipped', 'completed']),
  items: z.array(z.object({
    id: z.string(),
    productId: z.string(),
    productName: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    totalPrice: z.number(),
    status_code: z.enum(['pending', 'design', 'approved', 'manufacturing', 'shipped', 'done']),
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