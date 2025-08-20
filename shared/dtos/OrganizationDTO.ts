import { z } from "zod";

/**
 * Organization DTO schemas for API communication
 * Based on existing database schema
 */

export const OrganizationDTO = z.object({
  id: z.string(),
  name: z.string(),
  logoUrl: z.string().nullable().optional(),
  brandPrimary: z.string().nullable().optional(),
  brandSecondary: z.string().nullable().optional(),
  emailDomain: z.string().nullable().optional(),
  billingEmail: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
  isBusiness: z.boolean().optional(),
  state: z.string().nullable().optional(),
  addressLine1: z.string().nullable().optional(),
  addressLine2: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  contactEmail: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  status: z.string().optional(),
  website: z.string().nullable().optional(),
  universalDiscounts: z.any().optional(),
  address: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  titleCardUrl: z.string().nullable().optional(),
});

export const CreateOrganizationDTO = OrganizationDTO.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateOrganizationDTO = CreateOrganizationDTO.partial();

// TypeScript types
export type OrganizationDTO = z.infer<typeof OrganizationDTO>;
export type CreateOrganizationDTO = z.infer<typeof CreateOrganizationDTO>;
export type UpdateOrganizationDTO = z.infer<typeof UpdateOrganizationDTO>;