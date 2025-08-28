import { pgTable, text, timestamp, uuid, varchar, jsonb, integer, primaryKey } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';

// Comprehensive users table that supports both staff and customers
export const users = pgTable('users', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash'), // null for auto-generated accounts
  full_name: text('full_name').notNull(),
  phone: text('phone'),
  role: text('role').notNull().default('customer'), // customer, contact, admin, etc
  avatar_url: text('avatar_url'),
  is_active: integer('is_active').default(1).notNull(), // 1 = active, 0 = inactive
  
  // Organization relationship
  organization_id: varchar('organization_id').references(() => organizations.id),
  
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
  email_verified: integer('email_verified').default(0), // 0 = unverified, 1 = verified
  
  // Metadata
  notes: text('notes'),
  created_by: varchar('created_by').references(() => users.id),
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
  is_business: integer('is_business').default(0).notNull(), // 0 = school, 1 = business
  setup_complete: integer('setup_complete').default(0).notNull(), // 0 = incomplete, 1 = complete
  setup_completed_at: timestamp('setup_completed_at'),
  
  // Audit fields
  is_archived: integer('is_archived').default(0).notNull(),
  status: text('status').default('active').notNull(),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  created_by: varchar('created_by').references(() => users.id),
});
export const sports = pgTable('sports', { id: varchar('id').primaryKey().default(sql`gen_random_uuid()`), name: text('name').notNull().unique() });
export const orgSports = pgTable('org_sports', {
    organization_id: varchar('organization_id').references(() => organizations.id).notNull(),
    sport_id: varchar('sport_id').references(() => sports.id).notNull(),
    contact_user_id: varchar('contact_user_id').references(() => users.id), // Links to auto-created user
    contact_name: text('contact_name').notNull(),
    contact_email: text('contact_email').notNull(),
    contact_phone: text('contact_phone'),
    is_primary_contact: integer('is_primary_contact').default(0).notNull(), // 0 = no, 1 = yes
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({ pk: primaryKey({ columns: [t.organization_id, t.sport_id] }) }));
export const usersRelations = relations(users, ({ one, many }) => ({ 
  organization: one(organizations, { fields: [users.organization_id], references: [organizations.id] }),
  createdBy: one(users, { fields: [users.created_by], references: [users.id] }),
  orgSports: many(orgSports)
}));
export const organizationsRelations = relations(organizations, ({ one, many }) => ({ 
  createdBy: one(users, { fields: [organizations.created_by], references: [users.id] }), 
  orgSports: many(orgSports),
  users: many(users)
}));
export const sportsRelations = relations(sports, ({ many }) => ({ orgSports: many(orgSports) }));
export const orgSportsRelations = relations(orgSports, ({ one }) => ({
    organization: one(organizations, { fields: [orgSports.organization_id], references: [organizations.id] }),
    sport: one(sports, { fields: [orgSports.sport_id], references: [sports.id] }),
    contactUser: one(users, { fields: [orgSports.contact_user_id], references: [users.id] }),
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

// Export types for TypeScript
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

export type Sport = typeof sports.$inferSelect;
export type InsertSport = typeof sports.$inferInsert;

export type OrgSport = typeof orgSports.$inferSelect;
export type InsertOrgSport = typeof orgSports.$inferInsert;