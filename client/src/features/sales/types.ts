import { z } from "zod";

// Lead stages enum
export enum LeadStage {
  NEW = "new",
  QUALIFIED = "qualified", 
  PROPOSAL = "proposal",
  NEGOTIATION = "negotiation",
  CLOSED_WON = "closed_won",
  CLOSED_LOST = "closed_lost",
}

// Lead schema
export const leadSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  contact: z.object({
    name: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
  }),
  stage: z.nativeEnum(LeadStage),
  value: z.number().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Lead = z.infer<typeof leadSchema>;

export const createLeadSchema = leadSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateLeadPayload = z.infer<typeof createLeadSchema>;