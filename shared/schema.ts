
// Schema auto-pulled on 2025-01-30T17:11:39.000Z
// This file was automatically generated from the database

import { pgTable, foreignKey, pgEnum, uuid, varchar, text, timestamp, boolean, integer, jsonb, decimal, date, uniqueIndex, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const keyStatus = pgEnum("key_status", ['default', 'valid', 'invalid', 'expired']);
export const keyType = pgEnum("key_type", ['aead-ietf', 'aead-det', 'hmac', 'stream_xchacha20']);
export const factorType = pgEnum("factor_type", ['totp', 'webauthn']);
export const factorStatus = pgEnum("factor_status", ['unverified', 'verified']);
export const aalLevel = pgEnum("aal_level", ['aal1', 'aal2', 'aal3']);
export const codeChallengeMethod = pgEnum("code_challenge_method", ['s256', 'plain']);
export const oneTimeTokenType = pgEnum("one_time_token_type", ['confirmation_token', 'reauthentication_token', 'recovery_token', 'email_change_token_new', 'email_change_token_current', 'phone_change_token']);

export const customers = pgTable("customers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	firstName: varchar("first_name", { length: 255 }),
	lastName: varchar("last_name", { length: 255 }),
	email: varchar({ length: 320 }),
	phone: varchar({ length: 20 }),
	addressLine1: varchar("address_line1", { length: 255 }),
	addressLine2: varchar("address_line2", { length: 255 }),
	city: varchar({ length: 100 }),
	state: varchar({ length: 2 }),
	postalCode: varchar("postal_code", { length: 10 }),
	country: varchar({ length: 2 }).default('US'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const designAssets = pgTable("design_assets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orgId: uuid("org_id"),
	orderItemId: uuid("order_item_id"),
	uploaderId: uuid("uploader_id"),
	version: integer(),
	fileUrl: text("file_url"),
	fileName: text("file_name"),
	fileSize: integer("file_size"),
	mimeType: varchar("mime_type", { length: 100 }),
	isApproved: boolean("is_approved").default(false),
	approvedAt: timestamp("approved_at", { withTimezone: true, mode: 'string' }),
	approvedBy: uuid("approved_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const organizations = pgTable("organizations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	slug: varchar({ length: 100 }),
	description: text(),
	logoUrl: text("logo_url"),
	brandPrimary: varchar("brand_primary", { length: 7 }),
	brandSecondary: varchar("brand_secondary", { length: 7 }),
	brandTertiary: varchar("brand_tertiary", { length: 7 }),
	titleCardUrl: text("title_card_url"),
	addressLine1: varchar("address_line1", { length: 255 }),
	addressLine2: varchar("address_line2", { length: 255 }),
	city: varchar({ length: 100 }),
	state: varchar({ length: 2 }),
	postalCode: varchar("postal_code", { length: 10 }),
	country: varchar({ length: 2 }).default('US'),
	phone: varchar({ length: 20 }),
	email: varchar({ length: 320 }),
	website: varchar({ length: 255 }),
	isActive: boolean("is_active").default(true),
	setupCompletedAt: timestamp("setup_completed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const orgSports = pgTable("org_sports", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orgId: uuid("org_id").notNull(),
	sport: varchar({ length: 100 }).notNull(),
	contactUserId: uuid("contact_user_id"),
	teamName: varchar("team_name", { length: 255 }),
	isPrimaryContact: boolean("is_primary_contact").default(false),
	useOrgAddress: boolean("use_org_address").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const orders = pgTable("orders", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orgId: uuid("org_id").notNull(),
	customerId: uuid("customer_id"),
	orderNumber: varchar("order_number", { length: 50 }).notNull(),
	status: varchar({ length: 50 }).default('pending'),
	totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
	shippingAddressLine1: varchar("shipping_address_line1", { length: 255 }),
	shippingAddressLine2: varchar("shipping_address_line2", { length: 255 }),
	shippingCity: varchar("shipping_city", { length: 100 }),
	shippingState: varchar("shipping_state", { length: 2 }),
	shippingPostalCode: varchar("shipping_postal_code", { length: 10 }),
	shippingCountry: varchar("shipping_country", { length: 2 }).default('US'),
	useOrgAddress: boolean("use_org_address").default(false),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const permissionTemplates = pgTable("permission_templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	templateType: text("template_type").notNull(),
	permissions: jsonb(),
	createdBy: uuid("created_by"),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const roles = pgTable("roles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	slug: varchar({ length: 100 }).notNull(),
	description: text(),
	permissions: jsonb(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const sports = pgTable("sports", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	slug: varchar({ length: 100 }).notNull(),
});

export const statusOrders = pgTable("status_orders", {
	code: text().primaryKey().notNull(),
	sortOrder: integer("sort_order").notNull(),
	isTerminal: boolean("is_terminal").default(false).notNull(),
});

export const statusOrderItems = pgTable("status_order_items", {
	code: text().primaryKey().notNull(),
	sortOrder: integer("sort_order").notNull(),
	isTerminal: boolean("is_terminal").default(false).notNull(),
});

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: varchar({ length: 320 }).notNull(),
	firstName: varchar("first_name", { length: 255 }),
	lastName: varchar("last_name", { length: 255 }),
	phone: varchar({ length: 20 }),
	role: varchar({ length: 50 }).default('customer'),
	isActive: boolean("is_active").default(true),
	emailVerified: boolean("email_verified").default(false),
	profilePictureUrl: text("profile_picture_url"),
	lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const salespersonAssignments = pgTable("salesperson_assignments", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	salespersonId: varchar("salesperson_id", { length: 255 }).notNull(),
	organizationId: varchar("organization_id", { length: 255 }).notNull(),
	territory: varchar({ length: 255 }),
	commissionRate: decimal("commission_rate", { precision: 5, scale: 4 }).default('0.05'),
	isActive: boolean("is_active").default(true),
	assignedAt: timestamp("assigned_at", { mode: 'string' }).defaultNow(),
	assignedBy: varchar("assigned_by", { length: 255 }),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const salespersonProfiles = pgTable("salesperson_profiles", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	employeeId: varchar("employee_id", { length: 100 }),
	taxId: varchar("tax_id", { length: 50 }),
	commissionRate: decimal("commission_rate", { precision: 5, scale: 4 }).default('0.05'),
	territory: varchar({ length: 255 }),
	hireDate: date("hire_date"),
	managerId: varchar("manager_id", { length: 255 }),
	performanceTier: varchar("performance_tier", { length: 50 }).default('standard'),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const salespersonMetrics = pgTable("salesperson_metrics", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	salespersonId: varchar("salesperson_id", { length: 255 }).notNull(),
	periodStart: date("period_start").notNull(),
	periodEnd: date("period_end").notNull(),
	totalSales: decimal("total_sales", { precision: 12, scale: 2 }).default('0'),
	totalOrders: integer("total_orders").default(0),
	commissionEarned: decimal("commission_earned", { precision: 12, scale: 2 }).default('0'),
	targetSales: decimal("target_sales", { precision: 12, scale: 2 }).default('0'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});
