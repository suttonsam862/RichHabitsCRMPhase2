import { z } from "zod";

/**
 * Purchase Order DTO schemas for manufacturing API
 */

export enum ProductionStatus {
  PENDING = "pending",
  MATERIALS_ORDERED = "materials_ordered",
  IN_PROGRESS = "in_progress",
  QUALITY_CHECK = "quality_check", 
  COMPLETED = "completed",
  SHIPPED = "shipped",
}

export const PoItemDTO = z.object({
  id: z.string(),
  materialName: z.string(),
  materialSku: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number(),
  unit: z.string(), // e.g., "yards", "pieces", "lbs"
  unitCost: z.number(),
  totalCost: z.number(),
});

export const PoMilestoneDTO = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  dueDate: z.string(),
  completed: z.boolean(),
  completedAt: z.string().optional(),
  completedBy: z.string().optional(), // User ID
});

export const PoDTO = z.object({
  id: z.string(),
  poNumber: z.string(),
  orderId: z.string(),
  vendor: z.object({
    id: z.string().optional(),
    name: z.string(),
    contact: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }),
  status: z.nativeEnum(ProductionStatus),
  items: z.array(PoItemDTO),
  milestones: z.array(PoMilestoneDTO),
  totalCost: z.number(),
  expectedDelivery: z.string(),
  actualDelivery: z.string().optional(),
  notes: z.string().optional(),
  assignedTo: z.string().optional(), // User ID
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreatePoDTO = PoDTO.omit({
  id: true,
  poNumber: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdatePoDTO = CreatePoDTO.partial();

// TypeScript types
export type PoDTO = z.infer<typeof PoDTO>;
export type PoItemDTO = z.infer<typeof PoItemDTO>;
export type PoMilestoneDTO = z.infer<typeof PoMilestoneDTO>;
export type CreatePoDTO = z.infer<typeof CreatePoDTO>;
export type UpdatePoDTO = z.infer<typeof UpdatePoDTO>;