import { pgTable, uuid, varchar, text, timestamp, boolean, integer, jsonb, decimal, date, bigint, index, unique, foreignKey, check, serial } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Enhanced Database Schema with Comprehensive Constraints
 * This file adds missing constraints, check constraints for business rules,
 * and proper indexes for data integrity and performance
 */

// Import existing schema for references
import * as existingSchema from './schema';

// Enhanced Users table with comprehensive constraints
export const usersEnhanced = pgTable("users", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  email: text().notNull(),
  passwordHash: text("password_hash"),
  fullName: text("full_name").notNull(),
  phone: text(),
  role: text().notNull().default('member'),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").default(true).notNull(),
  organizationId: uuid("organization_id"),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text(),
  state: text(),
  postalCode: text("postal_code"),
  country: text().default('US'),
  lastLogin: timestamp("last_login", { withTimezone: true, mode: 'string' }),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires", { withTimezone: true, mode: 'string' }),
  emailVerified: boolean("email_verified").default(false),
  notes: text(),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  initialTempPassword: text("initial_temp_password"),
  subrole: text(),
  jobTitle: text("job_title"),
  department: text(),
  hireDate: timestamp("hire_date", { withTimezone: true, mode: 'string' }),
  permissions: jsonb().default({}),
  pageAccess: jsonb("page_access").default({}),
}, (table) => ({
  // Unique constraints
  uniqUsersEmail: unique("uniq_users_email").on(table.email),
  uniqUsersPasswordResetToken: unique("uniq_users_password_reset_token").on(table.passwordResetToken),
  
  // Indexes for performance
  idxUsersEmail: index("idx_users_email").on(table.email),
  idxUsersOrganizationId: index("idx_users_organization_id").on(table.organizationId),
  idxUsersRole: index("idx_users_role").on(table.role),
  idxUsersIsActive: index("idx_users_is_active").on(table.isActive),
  idxUsersCreatedAt: index("idx_users_created_at").on(table.createdAt),
  
  // Foreign key constraints
  fkUsersOrganizationId: foreignKey({
    columns: [table.organizationId],
    foreignColumns: [existingSchema.organizations.id],
    name: "fk_users_organization_id"
  }).onDelete("set null"),
  fkUsersCreatedBy: foreignKey({
    columns: [table.createdBy],
    foreignColumns: [table.id],
    name: "fk_users_created_by"
  }).onDelete("set null"),
  
  // Check constraints for business rules
  checkUsersEmailFormat: check("check_users_email_format", sql`email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'`),
  checkUsersPhoneFormat: check("check_users_phone_format", sql`phone IS NULL OR phone ~* '^[\+]?[\d\s\-\(\)\.]{10,17}$'`),
  checkUsersValidRole: check("check_users_valid_role", sql`role IN ('admin', 'member', 'readonly', 'contact')`),
  checkUsersFullNameNotEmpty: check("check_users_full_name_not_empty", sql`length(trim(full_name)) > 0`),
  checkUsersPasswordResetExpiry: check("check_users_password_reset_expiry", 
    sql`password_reset_expires IS NULL OR password_reset_expires > now()`),
}));

// Enhanced Organizations table with comprehensive constraints
export const organizationsEnhanced = pgTable("organizations", {
  id: varchar().primaryKey().notNull(),
  name: text().notNull(),
  logoUrl: text("logo_url"),
  titleCardUrl: text("title_card_url"),
  state: text(),
  address: text(),
  phone: text(),
  email: text(),
  website: text(),
  description: text(),
  industry: text(),
  size: text(),
  foundedYear: integer("founded_year"),
  taxId: text("tax_id"),
  billingAddress: jsonb("billing_address"),
  isActive: boolean("is_active").default(true).notNull(),
  isPremium: boolean("is_premium").default(false).notNull(),
  setupComplete: boolean("setup_complete").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => ({
  // Unique constraints
  uniqOrganizationsName: unique("uniq_organizations_name").on(table.name),
  uniqOrganizationsTaxId: unique("uniq_organizations_tax_id").on(table.taxId),
  
  // Indexes for performance
  idxOrganizationsName: index("idx_organizations_name").on(table.name),
  idxOrganizationsIsActive: index("idx_organizations_is_active").on(table.isActive),
  idxOrganizationsCreatedAt: index("idx_organizations_created_at").on(table.createdAt),
  idxOrganizationsSetupComplete: index("idx_organizations_setup_complete").on(table.setupComplete),
  
  // Check constraints for business rules
  checkOrganizationsNameNotEmpty: check("check_organizations_name_not_empty", sql`length(trim(name)) > 0`),
  checkOrganizationsEmailFormat: check("check_organizations_email_format", 
    sql`email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'`),
  checkOrganizationsPhoneFormat: check("check_organizations_phone_format", 
    sql`phone IS NULL OR phone ~* '^[\+]?[\d\s\-\(\)\.]{10,17}$'`),
  checkOrganizationsWebsiteFormat: check("check_organizations_website_format", 
    sql`website IS NULL OR website ~* '^https?://[^\s]+'`),
  checkOrganizationsValidFoundedYear: check("check_organizations_valid_founded_year", 
    sql`founded_year IS NULL OR (founded_year >= 1800 AND founded_year <= extract(year from now()))`),
  checkOrganizationsValidSize: check("check_organizations_valid_size", 
    sql`size IS NULL OR size IN ('startup', 'small', 'medium', 'large', 'enterprise')`),
}));

// Enhanced Orders table with comprehensive constraints
export const ordersEnhanced = pgTable("orders", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  orgId: uuid("org_id").notNull(),
  customerId: uuid("customer_id").notNull(),
  salespersonId: uuid("salesperson_id"),
  sportId: uuid("sport_id"),
  code: text().notNull(), // Order number (ORD-YYYYMMDD-XXXX)
  customerContactName: text("customer_contact_name"),
  customerContactEmail: text("customer_contact_email"),
  customerContactPhone: text("customer_contact_phone"),
  statusCode: text("status_code").notNull().default("draft"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }),
  revenueEstimate: decimal("revenue_estimate", { precision: 12, scale: 2 }),
  dueDate: timestamp("due_date", { withTimezone: true, mode: 'string' }),
  notes: text(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => ({
  // Unique constraints
  uniqOrdersCode: unique("uniq_orders_code").on(table.orgId, table.code),
  
  // Indexes for performance
  idxOrdersOrgId: index("idx_orders_org_id").on(table.orgId),
  idxOrdersCustomerId: index("idx_orders_customer_id").on(table.customerId),
  idxOrdersSalespersonId: index("idx_orders_salesperson_id").on(table.salespersonId),
  idxOrdersStatusCode: index("idx_orders_status_code").on(table.statusCode),
  idxOrdersCode: index("idx_orders_code").on(table.code),
  idxOrdersDueDate: index("idx_orders_due_date").on(table.dueDate),
  idxOrdersCreatedAt: index("idx_orders_created_at").on(table.createdAt),
  idxOrdersTotalAmount: index("idx_orders_total_amount").on(table.totalAmount),
  
  // Foreign key constraints
  fkOrdersOrgId: foreignKey({
    columns: [table.orgId],
    foreignColumns: [existingSchema.organizations.id],
    name: "fk_orders_org_id"
  }).onDelete("restrict"), // Prevent deletion of org with orders
  fkOrdersCustomerId: foreignKey({
    columns: [table.customerId],
    foreignColumns: [existingSchema.customers.id],
    name: "fk_orders_customer_id"
  }).onDelete("restrict"), // Prevent deletion of customer with orders
  fkOrdersSalespersonId: foreignKey({
    columns: [table.salespersonId],
    foreignColumns: [existingSchema.users.id],
    name: "fk_orders_salesperson_id"
  }).onDelete("set null"),
  fkOrdersSportId: foreignKey({
    columns: [table.sportId],
    foreignColumns: [existingSchema.sports.id],
    name: "fk_orders_sport_id"
  }).onDelete("set null"),
  
  // Check constraints for business rules
  checkOrdersCodeFormat: check("check_orders_code_format", sql`code ~* '^ORD-\d{8}-\d{4}$'`),
  checkOrdersValidStatus: check("check_orders_valid_status", 
    sql`status_code IN ('draft', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'on_hold')`),
  checkOrdersPositiveAmounts: check("check_orders_positive_amounts", 
    sql`total_amount IS NULL OR total_amount >= 0`),
  checkOrdersRevenueConstraint: check("check_orders_revenue_constraint", 
    sql`revenue_estimate IS NULL OR total_amount IS NULL OR revenue_estimate <= total_amount`),
  checkOrdersEmailFormat: check("check_orders_email_format", 
    sql`customer_contact_email IS NULL OR customer_contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'`),
  checkOrdersPhoneFormat: check("check_orders_phone_format", 
    sql`customer_contact_phone IS NULL OR customer_contact_phone ~* '^[\+]?[\d\s\-\(\)\.]{10,17}$'`),
  checkOrdersFutureDueDate: check("check_orders_future_due_date", 
    sql`due_date IS NULL OR status_code IN ('completed', 'cancelled') OR due_date > now()`),
}));

// Enhanced Order Items table with comprehensive constraints
export const orderItemsEnhanced = pgTable("order_items", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  orgId: uuid("org_id").notNull(),
  orderId: uuid("order_id").notNull(),
  productId: uuid("product_id"),
  variantId: uuid("variant_id"),
  nameSnapshot: text("name_snapshot"),
  skuSnapshot: text("sku_snapshot"),
  priceSnapshot: decimal("price_snapshot", { precision: 10, scale: 2 }),
  quantity: integer().notNull(),
  statusCode: text("status_code").notNull().default("pending_design"),
  designerId: uuid("designer_id"),
  manufacturerId: uuid("manufacturer_id"),
  pantoneJson: jsonb("pantone_json"),
  buildOverridesText: text("build_overrides_text"),
  variantImageUrl: text("variant_image_url"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => ({
  // Indexes for performance
  idxOrderItemsOrgId: index("idx_order_items_org_id").on(table.orgId),
  idxOrderItemsOrderId: index("idx_order_items_order_id").on(table.orderId),
  idxOrderItemsProductId: index("idx_order_items_product_id").on(table.productId),
  idxOrderItemsDesignerId: index("idx_order_items_designer_id").on(table.designerId),
  idxOrderItemsManufacturerId: index("idx_order_items_manufacturer_id").on(table.manufacturerId),
  idxOrderItemsStatusCode: index("idx_order_items_status_code").on(table.statusCode),
  idxOrderItemsCreatedAt: index("idx_order_items_created_at").on(table.createdAt),
  
  // Foreign key constraints
  fkOrderItemsOrgId: foreignKey({
    columns: [table.orgId],
    foreignColumns: [existingSchema.organizations.id],
    name: "fk_order_items_org_id"
  }).onDelete("restrict"),
  fkOrderItemsOrderId: foreignKey({
    columns: [table.orderId],
    foreignColumns: [ordersEnhanced.id],
    name: "fk_order_items_order_id"
  }).onDelete("cascade"), // Delete items when order is deleted
  fkOrderItemsDesignerId: foreignKey({
    columns: [table.designerId],
    foreignColumns: [existingSchema.users.id],
    name: "fk_order_items_designer_id"
  }).onDelete("set null"),
  fkOrderItemsManufacturerId: foreignKey({
    columns: [table.manufacturerId],
    foreignColumns: [existingSchema.manufacturers.id],
    name: "fk_order_items_manufacturer_id"
  }).onDelete("set null"),
  
  // Check constraints for business rules
  checkOrderItemsPositiveQuantity: check("check_order_items_positive_quantity", sql`quantity > 0`),
  checkOrderItemsPositivePrice: check("check_order_items_positive_price", 
    sql`price_snapshot IS NULL OR price_snapshot >= 0`),
  checkOrderItemsValidStatus: check("check_order_items_valid_status", 
    sql`status_code IN ('pending_design', 'design_in_progress', 'design_approved', 'pending_manufacturing', 'in_production', 'quality_check', 'completed', 'cancelled')`),
  checkOrderItemsReasonableQuantity: check("check_order_items_reasonable_quantity", sql`quantity <= 10000`),
  checkOrderItemsImageUrlFormat: check("check_order_items_image_url_format", 
    sql`variant_image_url IS NULL OR variant_image_url ~* '^https?://[^\s]+'`),
}));

// Enhanced Design Jobs table with comprehensive constraints
export const designJobsEnhanced = pgTable("design_jobs", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  orgId: uuid("org_id").notNull(),
  orderItemId: uuid("order_item_id").notNull(),
  title: text(),
  brief: text(),
  priority: integer().default(5),
  statusCode: text("status_code").notNull().default("queued"),
  assigneeDesignerId: uuid("assignee_designer_id"),
  estimatedHours: decimal("estimated_hours", { precision: 5, scale: 2 }),
  actualHours: decimal("actual_hours", { precision: 5, scale: 2 }),
  deadline: timestamp("deadline", { withTimezone: true, mode: 'string' }),
  startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
  completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
  revisionCount: integer("revision_count").default(0),
  maxRevisions: integer("max_revisions").default(3),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => ({
  // Indexes for performance
  idxDesignJobsOrgId: index("idx_design_jobs_org_id").on(table.orgId),
  idxDesignJobsOrderItemId: index("idx_design_jobs_order_item_id").on(table.orderItemId),
  idxDesignJobsAssigneeDesignerId: index("idx_design_jobs_assignee_designer_id").on(table.assigneeDesignerId),
  idxDesignJobsStatusCode: index("idx_design_jobs_status_code").on(table.statusCode),
  idxDesignJobsPriority: index("idx_design_jobs_priority").on(table.priority),
  idxDesignJobsDeadline: index("idx_design_jobs_deadline").on(table.deadline),
  idxDesignJobsCreatedAt: index("idx_design_jobs_created_at").on(table.createdAt),
  
  // Foreign key constraints
  fkDesignJobsOrgId: foreignKey({
    columns: [table.orgId],
    foreignColumns: [existingSchema.organizations.id],
    name: "fk_design_jobs_org_id"
  }).onDelete("restrict"),
  fkDesignJobsOrderItemId: foreignKey({
    columns: [table.orderItemId],
    foreignColumns: [orderItemsEnhanced.id],
    name: "fk_design_jobs_order_item_id"
  }).onDelete("cascade"),
  fkDesignJobsAssigneeDesignerId: foreignKey({
    columns: [table.assigneeDesignerId],
    foreignColumns: [existingSchema.users.id],
    name: "fk_design_jobs_assignee_designer_id"
  }).onDelete("set null"),
  
  // Check constraints for business rules
  checkDesignJobsValidStatus: check("check_design_jobs_valid_status", 
    sql`status_code IN ('queued', 'assigned', 'drafting', 'submitted_for_review', 'under_review', 'revision_requested', 'review', 'approved', 'rejected', 'canceled')`),
  checkDesignJobsValidPriority: check("check_design_jobs_valid_priority", sql`priority >= 1 AND priority <= 10`),
  checkDesignJobsPositiveHours: check("check_design_jobs_positive_hours", 
    sql`estimated_hours IS NULL OR estimated_hours > 0`),
  checkDesignJobsActualHoursPositive: check("check_design_jobs_actual_hours_positive", 
    sql`actual_hours IS NULL OR actual_hours >= 0`),
  checkDesignJobsRevisionCount: check("check_design_jobs_revision_count", 
    sql`revision_count >= 0 AND revision_count <= max_revisions`),
  checkDesignJobsMaxRevisions: check("check_design_jobs_max_revisions", 
    sql`max_revisions >= 1 AND max_revisions <= 10`),
  checkDesignJobsDateOrder: check("check_design_jobs_date_order", 
    sql`started_at IS NULL OR completed_at IS NULL OR started_at <= completed_at`),
}));

// Enhanced Customers table with comprehensive constraints
export const customersEnhanced = pgTable("customers", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  orgId: uuid("org_id").notNull(),
  name: text().notNull(),
  email: text(),
  phone: text(),
  companyName: text("company_name"),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text(),
  state: text(),
  postalCode: text("postal_code"),
  country: text(),
  notes: text(),
  isActive: boolean("is_active").default(true).notNull(),
  customerType: text("customer_type").default("individual"),
  preferredContactMethod: text("preferred_contact_method"),
  creditLimit: decimal("credit_limit", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => ({
  // Unique constraints
  uniqCustomersEmailPerOrg: unique("uniq_customers_email_per_org").on(table.orgId, table.email),
  
  // Indexes for performance
  idxCustomersOrgId: index("idx_customers_org_id").on(table.orgId),
  idxCustomersEmail: index("idx_customers_email").on(table.email),
  idxCustomersName: index("idx_customers_name").on(table.name),
  idxCustomersIsActive: index("idx_customers_is_active").on(table.isActive),
  idxCustomersCreatedAt: index("idx_customers_created_at").on(table.createdAt),
  
  // Foreign key constraints
  fkCustomersOrgId: foreignKey({
    columns: [table.orgId],
    foreignColumns: [existingSchema.organizations.id],
    name: "fk_customers_org_id"
  }).onDelete("restrict"),
  
  // Check constraints for business rules
  checkCustomersNameNotEmpty: check("check_customers_name_not_empty", sql`length(trim(name)) > 0`),
  checkCustomersEmailFormat: check("check_customers_email_format", 
    sql`email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'`),
  checkCustomersPhoneFormat: check("check_customers_phone_format", 
    sql`phone IS NULL OR phone ~* '^[\+]?[\d\s\-\(\)\.]{10,17}$'`),
  checkCustomersValidType: check("check_customers_valid_type", 
    sql`customer_type IN ('individual', 'business', 'organization', 'government')`),
  checkCustomersValidContactMethod: check("check_customers_valid_contact_method", 
    sql`preferred_contact_method IS NULL OR preferred_contact_method IN ('email', 'phone', 'mail')`),
  checkCustomersPositiveCreditLimit: check("check_customers_positive_credit_limit", 
    sql`credit_limit IS NULL OR credit_limit >= 0`),
  checkCustomersContactInfo: check("check_customers_contact_info", 
    sql`email IS NOT NULL OR phone IS NOT NULL`),
}));

// Status tables with comprehensive constraints

export const statusOrders = pgTable("status_orders", {
  code: text().primaryKey().notNull(),
  name: text().notNull(),
  description: text(),
  sortOrder: integer("sort_order").notNull(),
  isTerminal: boolean("is_terminal").default(false).notNull(),
  colorCode: text("color_code"),
  iconName: text("icon_name"),
}, (table) => ({
  // Unique constraints
  uniqStatusOrdersSortOrder: unique("uniq_status_orders_sort_order").on(table.sortOrder),
  
  // Check constraints
  checkStatusOrdersCodeFormat: check("check_status_orders_code_format", sql`length(trim(code)) > 0`),
  checkStatusOrdersNameNotEmpty: check("check_status_orders_name_not_empty", sql`length(trim(name)) > 0`),
  checkStatusOrdersPositiveSortOrder: check("check_status_orders_positive_sort_order", sql`sort_order > 0`),
}));

export const statusOrderItems = pgTable("status_order_items", {
  code: text().primaryKey().notNull(),
  name: text().notNull(),
  description: text(),
  sortOrder: integer("sort_order").notNull(),
  isTerminal: boolean("is_terminal").default(false).notNull(),
  colorCode: text("color_code"),
  iconName: text("icon_name"),
}, (table) => ({
  // Unique constraints
  uniqStatusOrderItemsSortOrder: unique("uniq_status_order_items_sort_order").on(table.sortOrder),
  
  // Check constraints
  checkStatusOrderItemsCodeFormat: check("check_status_order_items_code_format", sql`length(trim(code)) > 0`),
  checkStatusOrderItemsNameNotEmpty: check("check_status_order_items_name_not_empty", sql`length(trim(name)) > 0`),
  checkStatusOrderItemsPositiveSortOrder: check("check_status_order_items_positive_sort_order", sql`sort_order > 0`),
}));

export const statusDesignJobs = pgTable("status_design_jobs", {
  code: text().primaryKey().notNull(),
  name: text().notNull(),
  description: text(),
  sortOrder: integer("sort_order").notNull(),
  isTerminal: boolean("is_terminal").default(false).notNull(),
  colorCode: text("color_code"),
  iconName: text("icon_name"),
}, (table) => ({
  // Unique constraints
  uniqStatusDesignJobsSortOrder: unique("uniq_status_design_jobs_sort_order").on(table.sortOrder),
  
  // Check constraints
  checkStatusDesignJobsCodeFormat: check("check_status_design_jobs_code_format", sql`length(trim(code)) > 0`),
  checkStatusDesignJobsNameNotEmpty: check("check_status_design_jobs_name_not_empty", sql`length(trim(name)) > 0`),
  checkStatusDesignJobsPositiveSortOrder: check("check_status_design_jobs_positive_sort_order", sql`sort_order > 0`),
}));

export const statusWorkOrders = pgTable("status_work_orders", {
  code: text().primaryKey().notNull(),
  name: text().notNull(),
  description: text(),
  sortOrder: integer("sort_order").notNull(),
  isTerminal: boolean("is_terminal").default(false).notNull(),
  colorCode: text("color_code"),
  iconName: text("icon_name"),
}, (table) => ({
  // Unique constraints
  uniqStatusWorkOrdersSortOrder: unique("uniq_status_work_orders_sort_order").on(table.sortOrder),
  
  // Check constraints
  checkStatusWorkOrdersCodeFormat: check("check_status_work_orders_code_format", sql`length(trim(code)) > 0`),
  checkStatusWorkOrdersNameNotEmpty: check("check_status_work_orders_name_not_empty", sql`length(trim(name)) > 0`),
  checkStatusWorkOrdersPositiveSortOrder: check("check_status_work_orders_positive_sort_order", sql`sort_order > 0`),
}));

// Add foreign key constraints to reference status tables
export const ordersWithStatusFK = pgTable("orders", ordersEnhanced._.config.columns, (table) => ({
  ...ordersEnhanced._.config.constraints,
  fkOrdersStatusCode: foreignKey({
    columns: [table.statusCode],
    foreignColumns: [statusOrders.code],
    name: "fk_orders_status_code"
  }).onDelete("restrict"),
}));

export const orderItemsWithStatusFK = pgTable("order_items", orderItemsEnhanced._.config.columns, (table) => ({
  ...orderItemsEnhanced._.config.constraints,
  fkOrderItemsStatusCode: foreignKey({
    columns: [table.statusCode],
    foreignColumns: [statusOrderItems.code],
    name: "fk_order_items_status_code"
  }).onDelete("restrict"),
}));

export const designJobsWithStatusFK = pgTable("design_jobs", designJobsEnhanced._.config.columns, (table) => ({
  ...designJobsEnhanced._.config.constraints,
  fkDesignJobsStatusCode: foreignKey({
    columns: [table.statusCode],
    foreignColumns: [statusDesignJobs.code],
    name: "fk_design_jobs_status_code"
  }).onDelete("restrict"),
}));

// Audit and logging tables with constraints

export const auditLogsEnhanced = pgTable("audit_logs", {
  id: bigint({ mode: "number" }).primaryKey(),
  occurredAt: timestamp("occurred_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  actor: uuid(),
  orgId: uuid("org_id"),
  entity: text().notNull(),
  entityId: uuid("entity_id").notNull(),
  action: text().notNull(),
  before: jsonb(),
  after: jsonb(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
}, (table) => ({
  // Indexes for performance
  idxAuditLogsOccurredAt: index("idx_audit_logs_occurred_at").on(table.occurredAt),
  idxAuditLogsActor: index("idx_audit_logs_actor").on(table.actor),
  idxAuditLogsOrgId: index("idx_audit_logs_org_id").on(table.orgId),
  idxAuditLogsEntity: index("idx_audit_logs_entity").on(table.entity),
  idxAuditLogsEntityId: index("idx_audit_logs_entity_id").on(table.entityId),
  idxAuditLogsAction: index("idx_audit_logs_action").on(table.action),
  
  // Foreign key constraints
  fkAuditLogsActor: foreignKey({
    columns: [table.actor],
    foreignColumns: [usersEnhanced.id],
    name: "fk_audit_logs_actor"
  }).onDelete("set null"),
  fkAuditLogsOrgId: foreignKey({
    columns: [table.orgId],
    foreignColumns: [existingSchema.organizations.id],
    name: "fk_audit_logs_org_id"
  }).onDelete("set null"),
  
  // Check constraints
  checkAuditLogsValidAction: check("check_audit_logs_valid_action", 
    sql`action IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT')`),
  checkAuditLogsValidEntity: check("check_audit_logs_valid_entity", sql`length(trim(entity)) > 0`),
  checkAuditLogsValidEntityId: check("check_audit_logs_valid_entity_id", sql`length(trim(entity_id::text)) > 0`),
}));

// Performance and security indexes

export const performanceIndexes = {
  // Composite indexes for common query patterns
  idxOrdersOrgStatusDate: index("idx_orders_org_status_date").on(ordersEnhanced.orgId, ordersEnhanced.statusCode, ordersEnhanced.createdAt),
  idxOrderItemsOrderStatus: index("idx_order_items_order_status").on(orderItemsEnhanced.orderId, orderItemsEnhanced.statusCode),
  idxDesignJobsOrgAssigneeStatus: index("idx_design_jobs_org_assignee_status").on(designJobsEnhanced.orgId, designJobsEnhanced.assigneeDesignerId, designJobsEnhanced.statusCode),
  
  // Partial indexes for active records
  idxActiveOrdersOrgDate: index("idx_active_orders_org_date").on(ordersEnhanced.orgId, ordersEnhanced.createdAt).where(sql`status_code NOT IN ('completed', 'cancelled')`),
  idxActiveDesignJobsDeadline: index("idx_active_design_jobs_deadline").on(designJobsEnhanced.deadline).where(sql`status_code NOT IN ('approved', 'rejected', 'canceled')`),
  
  // Text search indexes for search functionality
  idxCustomersNameSearch: index("idx_customers_name_search").using('gin', sql`to_tsvector('english', name)`),
  idxOrdersCodeSearch: index("idx_orders_code_search").using('gin', sql`to_tsvector('english', code)`),
};

/**
 * Migration SQL for adding missing constraints
 * This should be applied as a database migration
 */
export const constraintMigrationSQL = `
-- Add missing check constraints
ALTER TABLE users ADD CONSTRAINT check_users_email_format 
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$');

ALTER TABLE users ADD CONSTRAINT check_users_valid_role 
  CHECK (role IN ('admin', 'member', 'readonly', 'contact'));

ALTER TABLE orders ADD CONSTRAINT check_orders_code_format 
  CHECK (code ~* '^ORD-\\d{8}-\\d{4}$');

ALTER TABLE orders ADD CONSTRAINT check_orders_positive_amounts 
  CHECK (total_amount IS NULL OR total_amount >= 0);

ALTER TABLE order_items ADD CONSTRAINT check_order_items_positive_quantity 
  CHECK (quantity > 0);

ALTER TABLE order_items ADD CONSTRAINT check_order_items_reasonable_quantity 
  CHECK (quantity <= 10000);

-- Add missing indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_org_status_date 
  ON orders(org_id, status_code, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order_status 
  ON order_items(order_id, status_code);

-- Add missing foreign key constraints
ALTER TABLE orders ADD CONSTRAINT fk_orders_org_id 
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT;

ALTER TABLE order_items ADD CONSTRAINT fk_order_items_order_id 
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- Create status tables if they don't exist
CREATE TABLE IF NOT EXISTS status_orders (
  code TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL UNIQUE,
  is_terminal BOOLEAN DEFAULT FALSE NOT NULL,
  color_code TEXT,
  icon_name TEXT,
  CONSTRAINT check_status_orders_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT check_status_orders_positive_sort_order CHECK (sort_order > 0)
);

-- Insert default order statuses
INSERT INTO status_orders (code, name, description, sort_order, is_terminal) VALUES
  ('draft', 'Draft', 'Order is being created', 1, false),
  ('pending', 'Pending', 'Order is pending approval', 2, false),
  ('confirmed', 'Confirmed', 'Order has been confirmed', 3, false),
  ('processing', 'Processing', 'Order is being processed', 4, false),
  ('shipped', 'Shipped', 'Order has been shipped', 5, false),
  ('delivered', 'Delivered', 'Order has been delivered', 6, false),
  ('completed', 'Completed', 'Order is completed', 7, true),
  ('cancelled', 'Cancelled', 'Order has been cancelled', 8, true)
ON CONFLICT (code) DO NOTHING;
`;