import { z } from "zod";

// Frontend API Schema Types (camelCase to match API service output)
export interface Organization {
  id: string;
  name: string;
  logoUrl?: string;
  titleCardUrl?: string;
  state: string;
  address?: string;
  phone?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  universalDiscounts?: Record<string, any>;
  isBusiness?: boolean;
  brandPrimary?: string;
  brandSecondary?: string;
}

export interface Sport {
  id: string;
  organizationId: string;
  name: string;
  assignedSalesperson?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  organizationId: string;
  orderNumber: string;
  customerName: string;
  status: 'pending' | 'in_production' | 'completed' | 'cancelled';
  totalAmount?: number;
  items?: Record<string, any>[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
}

// Extended types with relationships
export interface OrganizationWithSports extends Organization {
  sports: Sport[];
  orders?: Order[];
}

export interface SportWithOrganization extends Sport {
  organization: Organization;
}

export interface OrderWithOrganization extends Order {
  organization: Organization;
}

// Zod validation schemas for inserts
// US State validation - optional or 2-letter code
const US_STATE = z.string().regex(/^[A-Z]{2}$/).optional().or(z.literal("").transform(() => undefined));

export const CreateOrganizationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional().or(z.literal("").transform(() => undefined)),
  state: US_STATE,
  phone: z.string().optional().or(z.literal("").transform(() => undefined)),
  email: z.string().email("Invalid email").optional().or(z.literal("").transform(() => undefined)),
  notes: z.string().optional().or(z.literal("").transform(() => undefined)),
  logo_url: z.string().url().optional().or(z.literal("").transform(() => undefined)), // unified snake_case
  is_business: z.coerce.boolean().optional().default(false),
  universal_discounts: z.any().default({}).transform(val => val === null || val === undefined ? {} : val), // we store as JSONB; accept object/array/null but transform to {}
  brand_primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().or(z.literal("").transform(() => undefined)), // hex color
  brand_secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().or(z.literal("").transform(() => undefined)), // hex color
  
  // Additional fields from frontend
  colorPalette: z.array(z.string()).optional().default([]),
  emailDomain: z.string().optional(),
  billingEmail: z.string().email().optional().or(z.literal("").transform(() => undefined)),
  tags: z.array(z.string()).optional().default([]),
  sports: z.array(z.object({
    sportId: z.string(),
    contactName: z.string(),
    contactEmail: z.string().email(),
    contactPhone: z.string().optional(),
    teamName: z.string().optional(),
    userId: z.string().optional(),
    saved: z.boolean().optional()
  })).optional().default([])
});

// Keep legacy schema for backward compatibility
export const insertOrganizationSchema = CreateOrganizationSchema;

export const insertSportSchema = z.object({
  organization_id: z.string().uuid("Invalid organization ID"),
  name: z.string().min(1, "Sport name is required"),
  assigned_salesperson: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal("")),
  contact_phone: z.string().optional(),
});

export const insertOrderSchema = z.object({
  organization_id: z.string().uuid("Invalid organization ID"),
  order_number: z.string().min(1, "Order number is required"),
  customer_name: z.string().min(1, "Customer name is required"),
  status: z.enum(['pending', 'in_production', 'completed', 'cancelled']).default('pending'),
  total_amount: z.number().positive().optional(),
  items: z.array(z.record(z.any())).optional(),
  notes: z.string().optional(),
});

export const insertUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(['admin', 'user']).default('user'),
});

// Insert types
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type InsertSport = z.infer<typeof insertSportSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Database table names
export const TABLES = {
  ORGANIZATIONS: 'organizations',
  SPORTS: 'sports',
  ORDERS: 'orders',
  USERS: 'users',
} as const;