/**
 * Sales Lead Data Transfer Objects
 * Temporary stubs for sales functionality
 */

import { z } from 'zod';

export const LeadDTOSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'proposal', 'closed', 'lost']),
  source: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateLeadDTOSchema = LeadDTOSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateLeadDTOSchema = CreateLeadDTOSchema.partial();

export type LeadDTO = z.infer<typeof LeadDTOSchema>;
export type CreateLeadDTO = z.infer<typeof CreateLeadDTOSchema>;
export type UpdateLeadDTO = z.infer<typeof UpdateLeadDTOSchema>;