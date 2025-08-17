import { z } from "zod";

// US States validation
const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
] as const;

// Strict organization validation schema (enhanced)
export const OrgBase = z.object({
  name: z.string()
    .min(1, "Organization name is required")
    .max(120, "Organization name cannot exceed 120 characters")
    .trim()
    .refine(name => name.length > 0, "Organization name cannot be empty after trimming"),
  
  logo_url: z.string()
    .url("Logo URL must be a valid URL")
    .optional()
    .or(z.literal(""))
    .transform(val => val === "" ? undefined : val),
  
  state: z.enum(US_STATES, {
    errorMap: () => ({ message: "State must be a valid 2-letter US state code" })
  }).optional()
    .or(z.string().regex(/^[A-Z]{2}$/, "State must be a 2-letter uppercase code").optional())
    .or(z.literal(""))
    .transform(val => val === "" ? undefined : val),
  
  phone: z.string()
    .regex(/^[\d\s\-\(\)\+\.x]+$/, "Phone number contains invalid characters")
    .min(10, "Phone number must be at least 10 digits")
    .max(20, "Phone number cannot exceed 20 characters")
    .optional()
    .or(z.literal(""))
    .transform(val => val === "" ? undefined : val),
  
  email: z.string()
    .email("Invalid email format")
    .max(255, "Email cannot exceed 255 characters")
    .optional()
    .or(z.literal(""))
    .transform(val => val === "" ? undefined : val),
  
  is_business: z.boolean()
    .default(false),
  
  notes: z.string()
    .max(2000, "Notes cannot exceed 2000 characters")
    .optional()
    .or(z.literal(""))
    .transform(val => val === "" ? undefined : val),
  
  universal_discounts: z.record(
    z.string().min(1, "Discount key cannot be empty"), 
    z.number().min(0, "Discount value must be non-negative").max(100, "Discount cannot exceed 100%")
  ).default({}).catch({})
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