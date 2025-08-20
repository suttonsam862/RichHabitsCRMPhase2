import { z } from "zod";

// Production order status enum
export enum ProductionStatus {
  PENDING = "pending",
  MATERIALS_ORDERED = "materials_ordered",
  IN_PROGRESS = "in_progress",
  QUALITY_CHECK = "quality_check",
  COMPLETED = "completed",
  SHIPPED = "shipped",
}

// Purchase order schema
export const poSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  vendor: z.string(),
  status: z.nativeEnum(ProductionStatus),
  items: z.array(z.object({
    id: z.string(),
    materialName: z.string(),
    quantity: z.number(),
    unitCost: z.number(),
    totalCost: z.number(),
  })),
  milestones: z.array(z.object({
    id: z.string(),
    name: z.string(),
    dueDate: z.string(),
    completed: z.boolean(),
    completedAt: z.string().optional(),
  })),
  totalCost: z.number(),
  expectedDelivery: z.string(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PurchaseOrder = z.infer<typeof poSchema>;

export const createPoSchema = poSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreatePoPayload = z.infer<typeof createPoSchema>;