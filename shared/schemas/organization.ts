import { z } from "zod";

// US States validation
const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
] as const;

// Base organization schema (shared fields)
export const OrgBase = z.object({
  name: z.string().min(1).max(120).trim(),
  logo_url: z.string().url().optional(),
  state: z.enum(US_STATES).optional().or(z.string().regex(/^[A-Z]{2}$/).optional()),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  is_business: z.boolean().default(false),
  notes: z.string().max(2000).optional(),
  universal_discounts: z.record(z.string(), z.number()).default({})
});

// Schema for creating organizations
export const OrgCreate = OrgBase;

// Schema for updating organizations (all fields optional)
export const OrgUpdate = OrgBase.partial();

// Complete organization type (with system fields)
export const Org = OrgBase.extend({
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string()
});

// Export types
export type OrgBase = z.infer<typeof OrgBase>;
export type OrgCreate = z.infer<typeof OrgCreate>;
export type OrgUpdate = z.infer<typeof OrgUpdate>;
export type Org = z.infer<typeof Org>;

// Query parameters schema for listing organizations
export const OrgQueryParams = z.object({
  q: z.string().optional(), // search query
  state: z.enum(US_STATES).optional(),
  type: z.enum(['school', 'business', 'all']).default('all'),
  sort: z.enum(['name', 'created_at']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20)
});

export type OrgQueryParams = z.infer<typeof OrgQueryParams>;

// Helper to transform empty strings to null for database
export function cleanOrgData(data: any) {
  const cleaned = { ...data };
  
  // Convert empty strings to null
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === '') {
      cleaned[key] = null;
    }
  });
  
  // Ensure email is null if empty
  if (cleaned.email === '') {
    cleaned.email = null;
  }
  
  return cleaned;
}