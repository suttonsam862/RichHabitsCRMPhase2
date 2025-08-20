import { z } from "zod";

/**
 * Organization DTO schemas for API communication
 * Based on existing database schema
 */

export const OrganizationDTO = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  logo_url: z.string().nullable().optional(),
  title_card_url: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateOrganizationDTO = OrganizationDTO.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const UpdateOrganizationDTO = CreateOrganizationDTO.partial();

// TypeScript types
export type OrganizationDTO = z.infer<typeof OrganizationDTO>;
export type CreateOrganizationDTO = z.infer<typeof CreateOrganizationDTO>;
export type UpdateOrganizationDTO = z.infer<typeof UpdateOrganizationDTO>;