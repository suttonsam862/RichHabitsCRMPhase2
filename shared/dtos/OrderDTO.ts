import { z } from "zod";

/**
 * Order DTO schemas for order management API
 */


export const OrderItemDTO = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  productSku: z.string(),
  variantId: z.string().optional(),
  variantName: z.string().optional(),
  quantity: z.number(),
  unitPrice: z.number(),
  totalPrice: z.number(),
  status_code: z.enum(['pending', 'design', 'approved', 'manufacturing', 'shipped', 'done']),
  customizations: z.record(z.string(), z.string()).optional(),
});

export const OrderTotalsDTO = z.object({
  subtotal: z.number(),
  tax: z.number(),
  shipping: z.number(),
  discount: z.number().optional(),
  total: z.number(),
});

export const OrderDTO = z.object({
  id: z.string(),
  orderNumber: z.string(),
  quoteId: z.string().optional(),
  organizationId: z.string().optional(),
  customerName: z.string(),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  status_code: z.enum(['consultation', 'design', 'manufacturing', 'shipped', 'completed']),
  items: z.array(OrderItemDTO),
  totals: OrderTotalsDTO,
  shippingAddress: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string().default("US"),
  }).optional(),
  deliveryDate: z.string().optional(),
  notes: z.string().optional(),
  assignedTo: z.string().optional(), // User ID
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateOrderDTO = OrderDTO.omit({
  id: true,
  orderNumber: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateOrderDTO = CreateOrderDTO.partial();

// TypeScript types
export type OrderDTO = z.infer<typeof OrderDTO>;
export type OrderItemDTO = z.infer<typeof OrderItemDTO>;
export type OrderTotalsDTO = z.infer<typeof OrderTotalsDTO>;
export type CreateOrderDTO = z.infer<typeof CreateOrderDTO>;
export type UpdateOrderDTO = z.infer<typeof UpdateOrderDTO>;