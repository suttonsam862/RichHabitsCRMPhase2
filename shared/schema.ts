import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, decimal, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("admin"), // Currently only admin role
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Organizations table - core business entities
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  state: text("state").notNull(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  universalDiscounts: jsonb("universal_discounts"), // JSON object for discount rules
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Sports table - sports offered by organizations
export const sports = pgTable("sports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  salesperson: text("salesperson"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Orders table - customer orders and production tracking
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  orderNumber: text("order_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  status: text("status").notNull().default("pending"), // pending, in_production, completed, cancelled
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  items: jsonb("items"), // JSON array of order items
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Create insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
});

export const insertSportSchema = createInsertSchema(sports).omit({
  id: true,
  createdAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;

export type InsertSport = z.infer<typeof insertSportSchema>;
export type Sport = typeof sports.$inferSelect;

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// Extended types for frontend use
export type OrganizationWithSports = Organization & {
  sports: Sport[];
};

export type OrganizationWithOrders = Organization & {
  orders: Order[];
};
