import { z } from "zod";

// Supabase Database Schema Types
export interface Organization {
  id: string;
  name: string;
  logo_url?: string;
  state: string;
  address?: string;
  phone?: string;
  email?: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  universal_discounts?: Record<string, any>;
}

export interface Sport {
  id: string;
  organization_id: string;
  name: string;
  assigned_salesperson?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  organization_id: string;
  order_number: string;
  customer_name: string;
  status: 'pending' | 'in_production' | 'completed' | 'cancelled';
  total_amount?: number;
  items?: Record<string, any>[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
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
export const insertOrganizationSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  logo_url: z.string().url().optional().or(z.literal("")),
  state: z.string().min(1, "State is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
  universal_discounts: z.record(z.any()).optional(),
});

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