import { pgTable, text, timestamp, uuid, varchar, jsonb, integer, boolean, primaryKey, foreignKey, index, numeric } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import { z } from 'zod';

// Comprehensive users table that supports both staff and customers
export const users = pgTable('users', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash'), // null for auto-generated accounts
  full_name: text('full_name').notNull(),
  phone: text('phone'),
  role: text('role').notNull().default('customer'), // admin, sales, designer, manufacturing, customer
  subrole: text('subrole'), // salesperson, designer, manufacturer (for staff roles)
  avatar_url: text('avatar_url'), // profile picture
  is_active: boolean('is_active').default(true).notNull(), // true = active, false = inactive

  // Organization relationship
  organization_id: varchar('organization_id'),

  // Enhanced profile fields
  job_title: text('job_title'),
  department: text('department'),
  hire_date: timestamp('hire_date'),

  // Customer/Contact specific fields
  address_line1: text('address_line1'),
  address_line2: text('address_line2'), 
  city: text('city'),
  state: text('state'),
  postal_code: text('postal_code'),
  country: text('country').default('US'),

  // Authentication and profile
  last_login: timestamp('last_login'),
  password_reset_token: text('password_reset_token'),
  password_reset_expires: timestamp('password_reset_expires'),
  email_verified: boolean('email_verified').default(false), // false = unverified, true = verified
  initial_temp_password: text('initial_temp_password'), // Auto-generated password for admin view (encrypted)

  // Permissions and access
  permissions: jsonb('permissions').default('{}'), // Detailed action-level permissions
  page_access: jsonb('page_access').default('{}'), // Page and subpage access control

  // Metadata
  notes: text('notes'),
  created_by: varchar('created_by'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});
export const organizations = pgTable('organizations', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 255 }).notNull(),

  // Required setup fields (from user requirements)
  address: text('address'), // Full Address field
  city: text('city'), 
  state: text('state'), // State/Province field
  zip: text('zip'), // ZIP/Postal Code field
  phone: text('phone'),
  email: text('email'),
  finance_email: text('finance_email'), // Finance contact email

  // Branding (required setup fields)
  logo_url: text('logo_url'), // Organization Logo
  brand_primary: text('brand_primary'), // Primary Brand Color 
  brand_secondary: text('brand_secondary'), // Secondary Brand Color

  // Optional/legacy fields
  website: text('website'),
  tertiary_color: text('tertiary_color'),
  title_card_url: text('title_card_url'),
  color_palette: jsonb('color_palette').notNull().default('[]'),
  universal_discounts: jsonb('universal_discounts').notNull().default('{}'),
  tags: text('tags').array().notNull().default(sql`ARRAY[]::text[]`),
  gradient_css: text('gradient_css'),

  // Business type and setup status
  is_business: boolean('is_business').default(false).notNull(), // false = school, true = business
  setup_complete: boolean('setup_complete').default(false).notNull(), // false = incomplete, true = complete
  setup_completed_at: timestamp('setup_completed_at'),

  // Audit fields
  is_archived: boolean('is_archived').default(false).notNull(),
  status: text('status').default('active').notNull(),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  created_by: varchar('created_by'),
});
export const sports = pgTable('sports', { id: varchar('id').primaryKey().default(sql`gen_random_uuid()`), name: text('name').notNull().unique() });
export const orgSports = pgTable('org_sports', {
    organization_id: varchar('organization_id').references(() => organizations.id).notNull(),
    sport_id: varchar('sport_id').references(() => sports.id).notNull(),
    team_name: text('team_name').notNull().default('Main Team'), // NEW: Distinguishes multiple teams per sport (Middle School, High School, JV, Varsity, etc.)
    contact_user_id: varchar('contact_user_id').references(() => users.id), // Links to auto-created user
    contact_name: text('contact_name').notNull(),
    contact_email: text('contact_email').notNull(),
    contact_phone: text('contact_phone'),
    // Individual shipping address for this sport
    shipping_address_line1: text('shipping_address_line1'),
    shipping_address_line2: text('shipping_address_line2'),
    shipping_city: text('shipping_city'),
    shipping_state: text('shipping_state'),
    shipping_postal_code: text('shipping_postal_code'),
    shipping_country: text('shipping_country').default('United States'),
    use_org_address: boolean('use_org_address').default(true).notNull(), // true = use org's main address, false = use custom shipping address
    assigned_salesperson_id: varchar('assigned_salesperson_id').references(() => users.id), // Links to assigned salesperson
    is_primary_contact: boolean('is_primary_contact').default(false).notNull(), // false = no, true = yes
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({ pk: primaryKey({ columns: [t.organization_id, t.sport_id, t.team_name] }) })); // Updated primary key to include team_name
export const usersRelations = relations(users, ({ one, many }) => ({ 
  organization: one(organizations, { fields: [users.organization_id], references: [organizations.id] }),
  createdBy: one(users, { fields: [users.created_by], references: [users.id] }),
  orgSports: many(orgSports),
  userRoles: many(userRoles),
  salespersonAssignments: many(salespersonAssignments),
  salespersonProfile: one(salespersonProfiles, { fields: [users.id], references: [salespersonProfiles.user_id] }),
  salespersonMetrics: many(salespersonMetrics),
  orders: many(orders),
  managedSalespeople: many(salespersonProfiles, { relationName: "manager" })
}));
export const organizationsRelations = relations(organizations, ({ one, many }) => ({ 
  createdBy: one(users, { fields: [organizations.created_by], references: [users.id] }), 
  orgSports: many(orgSports),
  users: many(users),
  salespersonAssignments: many(salespersonAssignments),
  orders: many(orders)
}));

// Insert and select types for TypeScript
export type SelectOrganization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;
export const sportsRelations = relations(sports, ({ many }) => ({ orgSports: many(orgSports) }));
export const orgSportsRelations = relations(orgSports, ({ one }) => ({
    organization: one(organizations, { fields: [orgSports.organization_id], references: [organizations.id] }),
    sport: one(sports, { fields: [orgSports.sport_id], references: [sports.id] }),
    contactUser: one(users, { fields: [orgSports.contact_user_id], references: [users.id] }),
    assignedSalesperson: one(users, { fields: [orgSports.assigned_salesperson_id], references: [users.id], relationName: "assignedSalesperson" }),
}));

// KPI metrics table for tracking organization performance
export const organizationMetrics = pgTable('organization_metrics', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  organization_id: varchar('organization_id').references(() => organizations.id).notNull(),
  totalRevenue: integer('total_revenue').default(0),
  totalOrders: integer('total_orders').default(0),
  activeSports: integer('active_sports').default(0),
  yearsWithCompany: integer('years_with_company').default(0),
  averageOrderValue: integer('average_order_value').default(0),
  repeatCustomerRate: integer('repeat_customer_rate').default(0),
  growthRate: integer('growth_rate').default(0),
  satisfactionScore: integer('satisfaction_score').default(0), // stored as 0-50 (divide by 10 for 0-5.0 scale)
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const organizationMetricsRelations = relations(organizationMetrics, ({ one }) => ({
  organization: one(organizations, { fields: [organizationMetrics.organization_id], references: [organizations.id] })
}));

// Permissions and roles tables for enhanced user management
export const permissions = pgTable('permissions', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  category: text('category').notNull(), // 'organizations', 'users', 'orders', etc.
  action: text('action').notNull(), // 'create', 'read', 'update', 'delete', etc.
  resource: text('resource'), // specific resource like 'org_sports', 'user_roles', etc.
  description: text('description').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

export const roles = pgTable('roles', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  is_staff: boolean('is_staff').default(false).notNull(), // true = staff role, false = customer role
  default_permissions: jsonb('default_permissions').default('{}'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

export const userRoles = pgTable('user_roles', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar('user_id').references(() => users.id).notNull(),
  role_id: varchar('role_id').references(() => roles.id).notNull(),
  organization_id: varchar('organization_id'), // null for global roles
  assigned_by: varchar('assigned_by').references(() => users.id),
  assigned_at: timestamp('assigned_at').defaultNow().notNull(),
  expires_at: timestamp('expires_at') // for temporary role assignments
}, (t) => ({ pk: primaryKey({ columns: [t.user_id, t.role_id, t.organization_id] }) }));

// Permission templates for creating reusable permission sets
export const permissionTemplates = pgTable('permission_templates', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  description: text('description'),
  template_type: text('template_type').default('custom').notNull(), // 'system', 'custom', 'role-based'
  permissions: jsonb('permissions').notNull().default('{}'), // Action permissions
  page_access: jsonb('page_access').notNull().default('{}'), // Page access permissions
  is_active: boolean('is_active').default(true).notNull(),
  created_by: varchar('created_by').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Salesperson team assignments
export const salespersonAssignments = pgTable('salesperson_assignments', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  salesperson_id: varchar('salesperson_id').references(() => users.id).notNull(),
  organization_id: varchar('organization_id').references(() => organizations.id).notNull(),
  sport_id: varchar('sport_id').references(() => sports.id).notNull(),
  team_name: text('team_name').notNull(), // Links to specific team in org_sports
  assigned_by: varchar('assigned_by').references(() => users.id),
  assigned_at: timestamp('assigned_at').defaultNow().notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Salesperson extended profile info
export const salespersonProfiles = pgTable('salesperson_profiles', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar('user_id').references(() => users.id).notNull().unique(),
  employee_id: text('employee_id'),
  tax_id: text('tax_id'), // SSN or Tax ID
  commission_rate: integer('commission_rate').default(0), // Percentage * 100
  territory: text('territory').array(), // Array of US state codes
  hire_date: timestamp('hire_date'),
  manager_id: varchar('manager_id').references(() => users.id),
  performance_tier: text('performance_tier').default('standard'), // bronze, silver, gold, platinum
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Salesperson KPI metrics
export const salespersonMetrics = pgTable('salesperson_metrics', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  salesperson_id: varchar('salesperson_id').references(() => users.id).notNull(),
  period_start: timestamp('period_start').notNull(),
  period_end: timestamp('period_end').notNull(),
  total_sales: integer('total_sales').default(0), // Amount in cents
  orders_count: integer('orders_count').default(0),
  conversion_rate: integer('conversion_rate').default(0), // Percentage * 100
  average_deal_size: integer('average_deal_size').default(0), // Amount in cents
  commission_earned: integer('commission_earned').default(0), // Amount in cents
  active_assignments: integer('active_assignments').default(0),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Orders table for salesperson-order relationships
export const orders = pgTable('orders', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  order_number: text('order_number').notNull().unique(),
  organization_id: varchar('organization_id').references(() => organizations.id).notNull(),
  sport_id: varchar('sport_id').references(() => sports.id),
  team_name: text('team_name'),
  salesperson_id: varchar('salesperson_id').references(() => users.id), // Key integration point
  customer_name: text('customer_name').notNull(),
  total_amount: integer('total_amount').notNull(), // Amount in cents
  status: text('status').default('pending').notNull(),
  items: jsonb('items').notNull().default('[]'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Relations for new tables
export const permissionsRelations = relations(permissions, ({ many }) => ({
  // permissions don't have direct relations, they're referenced by role permissions
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles)
}));

export const permissionTemplatesRelations = relations(permissionTemplates, ({ one }) => ({
  createdBy: one(users, { fields: [permissionTemplates.created_by], references: [users.id] })
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.user_id], references: [users.id] }),
  role: one(roles, { fields: [userRoles.role_id], references: [roles.id] }),
  organization: one(organizations, { fields: [userRoles.organization_id], references: [organizations.id] }),
  assignedBy: one(users, { fields: [userRoles.assigned_by], references: [users.id] })
}));

// Salesperson table relations
export const salespersonAssignmentsRelations = relations(salespersonAssignments, ({ one }) => ({
  salesperson: one(users, { fields: [salespersonAssignments.salesperson_id], references: [users.id] }),
  organization: one(organizations, { fields: [salespersonAssignments.organization_id], references: [organizations.id] }),
  sport: one(sports, { fields: [salespersonAssignments.sport_id], references: [sports.id] }),
  assignedBy: one(users, { fields: [salespersonAssignments.assigned_by], references: [users.id], relationName: "assignmentCreator" })
}));

export const salespersonProfilesRelations = relations(salespersonProfiles, ({ one }) => ({
  user: one(users, { fields: [salespersonProfiles.user_id], references: [users.id] }),
  manager: one(users, { fields: [salespersonProfiles.manager_id], references: [users.id], relationName: "manager" })
}));

export const salespersonMetricsRelations = relations(salespersonMetrics, ({ one }) => ({
  salesperson: one(users, { fields: [salespersonMetrics.salesperson_id], references: [users.id] })
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  organization: one(organizations, { fields: [orders.organization_id], references: [organizations.id] }),
  sport: one(sports, { fields: [orders.sport_id], references: [sports.id] }),
  salesperson: one(users, { fields: [orders.salesperson_id], references: [users.id] })
}));

// Export types for TypeScript  
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Create insert and select schemas with validation
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

export const insertOrganizationSchema = createInsertSchema(organizations, {
  name: z.string().min(1, "Organization name is required").max(255),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  brand_primary: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Brand primary must be a valid hex color").optional(),
  brand_secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Brand secondary must be a valid hex color").optional(),
});

export const selectOrganizationSchema = createSelectSchema(organizations);

export type Organization = typeof organizations.$inferSelect;

export type Sport = typeof sports.$inferSelect;
export type InsertSport = typeof sports.$inferInsert;

export type OrgSport = typeof orgSports.$inferSelect;
export type InsertOrgSport = typeof orgSports.$inferInsert;

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = typeof permissions.$inferInsert;

export type Role = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;

export type PermissionTemplate = typeof permissionTemplates.$inferSelect;
export type InsertPermissionTemplate = typeof permissionTemplates.$inferInsert;

export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = typeof userRoles.$inferInsert;

export type SalespersonAssignment = typeof salespersonAssignments.$inferSelect;
export type InsertSalespersonAssignment = typeof salespersonAssignments.$inferInsert;

export type SalespersonProfile = typeof salespersonProfiles.$inferSelect;
export type InsertSalespersonProfile = typeof salespersonProfiles.$inferInsert;

export type SalespersonMetrics = typeof salespersonMetrics.$inferSelect;
export type InsertSalespersonMetrics = typeof salespersonMetrics.$inferInsert;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;