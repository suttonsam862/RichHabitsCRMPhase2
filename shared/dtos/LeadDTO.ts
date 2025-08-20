import { z } from "zod";

/**
 * Lead DTO schemas for sales pipeline API
 */

export enum LeadStage {
  NEW = "new",
  QUALIFIED = "qualified",
  PROPOSAL = "proposal", 
  NEGOTIATION = "negotiation",
  CLOSED_WON = "closed_won",
  CLOSED_LOST = "closed_lost",
}

export const LeadContactDTO = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  title: z.string().optional(),
});

export const LeadDTO = z.object({
  id: z.string(),
  orgId: z.string(),
  contact: LeadContactDTO,
  stage: z.nativeEnum(LeadStage),
  value: z.number().optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  assignedTo: z.string().optional(), // User ID
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateLeadDTO = LeadDTO.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateLeadDTO = CreateLeadDTO.partial();

// TypeScript types
export type LeadDTO = z.infer<typeof LeadDTO>;
export type LeadContactDTO = z.infer<typeof LeadContactDTO>;
export type CreateLeadDTO = z.infer<typeof CreateLeadDTO>;
export type UpdateLeadDTO = z.infer<typeof UpdateLeadDTO>;