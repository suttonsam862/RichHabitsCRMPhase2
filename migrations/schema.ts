import { pgTable, foreignKey, pgPolicy, uuid, text, integer, timestamp, jsonb, varchar, boolean, numeric, date, bigserial, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const orderItemStatus = pgEnum("order_item_status", ['pending', 'design', 'approved', 'manufacturing', 'shipped', 'done'])
export const orderStatus = pgEnum("order_status", ['consultation', 'design', 'manufacturing', 'shipped', 'completed'])
export const sizeEnum = pgEnum("size_enum", ['YS', 'YM', 'YL', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'])


export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: text().notNull(),
	passwordHash: text("password_hash"),
	fullName: text("full_name").notNull(),
	phone: text(),
	role: text().default('customer').notNull(),
	avatarUrl: text("avatar_url"),
	isActive: integer("is_active").default(1).notNull(),
	organizationId: uuid("organization_id"),
	addressLine1: text("address_line1"),
	addressLine2: text("address_line2"),
	city: text(),
	state: text(),
	postalCode: text("postal_code"),
	country: text().default('US'),
	lastLogin: timestamp("last_login", { mode: 'string' }),
	passwordResetToken: text("password_reset_token"),
	passwordResetExpires: timestamp("password_reset_expires", { mode: 'string' }),
	emailVerified: integer("email_verified").default(0),
	notes: text(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	initialTempPassword: text("initial_temp_password"),
	subrole: text(),
	jobTitle: text("job_title"),
	department: text(),
	hireDate: timestamp("hire_date", { mode: 'string' }),
	permissions: jsonb().default({}),
	pageAccess: jsonb("page_access").default({}),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [table.id],
			name: "users_created_by_fkey"
		}).onDelete("set null"),
	pgPolicy("users_dev_access", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
]);

export const organizations = pgTable("organizations", {
	id: varchar().primaryKey().notNull(),
	name: text().notNull(),
	logoUrl: text("logo_url"),
	state: text(),
	address: text(),
	phone: text(),
	email: text(),
	universalDiscounts: jsonb("universal_discounts").notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	isBusiness: boolean("is_business"),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	titleCardUrl: text("title_card_url"),
	brandPrimary: text("brand_primary"),
	brandSecondary: text("brand_secondary"),
	status: text().notNull(),
	colorPalette: jsonb("color_palette"),
	tags: text().array().notNull(),
	isArchived: boolean("is_archived").notNull(),
	gradientCss: text("gradient_css"),
	zip: text(),
	financeEmail: text("finance_email"),
	taxExemptDocKey: text("tax_exempt_doc_key"),
	setupComplete: boolean("setup_complete").notNull(),
	setupCompletedAt: timestamp("setup_completed_at", { withTimezone: true, mode: 'string' }),
	tertiaryColor: text("tertiary_color"),
	city: text(),
	website: text(),
	createdBy: uuid("created_by"),
}, (table) => [
	pgPolicy("organizations_dev_access", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
]);

export const userRoles = pgTable("user_roles", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: uuid("user_id"),
	orgId: varchar("org_id").notNull(),
	roleId: varchar("role_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	organizationId: varchar("organization_id"),
	assignedBy: varchar("assigned_by"),
	assignedAt: timestamp("assigned_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_roles_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("user_roles_dev_access", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
]);

export const orgSports = pgTable("org_sports", {
	id: varchar().primaryKey().notNull(),
	organizationId: varchar("organization_id").notNull(),
	sportId: varchar("sport_id").notNull(),
	contactName: text("contact_name"),
	contactEmail: text("contact_email"),
	contactPhone: text("contact_phone"),
	createdAt: timestamp("created_at", { mode: 'string' }),
	contactUserId: uuid("contact_user_id"),
	shipAddressLine1: text("ship_address_line1"),
	shipAddressLine2: text("ship_address_line2"),
	shipCity: text("ship_city"),
	shipState: text("ship_state"),
	shipPostalCode: text("ship_postal_code"),
	shipCountry: text("ship_country"),
	isPrimaryContact: integer("is_primary_contact"),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	assignedSalespersonId: varchar("assigned_salesperson_id"),
	teamName: text("team_name"),
}, (table) => [
	pgPolicy("org_sports_dev_access", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
]);

export const orders = pgTable("orders", {
	id: varchar().primaryKey().notNull(),
	organizationId: varchar("organization_id").notNull(),
	orderNumber: text("order_number").notNull(),
	customerName: text("customer_name").notNull(),
	totalAmount: numeric("total_amount", { precision: 10, scale:  2 }),
	items: jsonb(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	statusCode: text("status_code"),
	salespersonId: varchar("salesperson_id"),
	sportId: varchar("sport_id"),
	teamName: text("team_name"),
}, (table) => [
	pgPolicy("orders_dev_access", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
]);

export const sports = pgTable("sports", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const orderItems = pgTable("order_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orgId: uuid("org_id"),
	orderId: uuid("order_id"),
	productId: uuid("product_id"),
	nameSnapshot: text("name_snapshot"),
	priceSnapshot: numeric("price_snapshot", { precision: 10, scale:  2 }),
	designerId: uuid("designer_id"),
	manufacturerId: uuid("manufacturer_id"),
	statusCode: text("status_code").default('pending'),
	variantImageUrl: text("variant_image_url"),
	pantoneJson: jsonb("pantone_json"),
	buildOverridesText: text("build_overrides_text"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	pgPolicy("order_items_dev_access", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
]);

export const categories = pgTable("categories", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
});

export const commissions = pgTable("commissions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orgId: uuid("org_id"),
	orderId: uuid("order_id"),
	salespersonUserId: uuid("salesperson_user_id"),
	profitAmount: numeric("profit_amount", { precision: 12, scale:  2 }),
	rate: numeric({ precision: 5, scale:  4 }),
	commissionAmount: numeric("commission_amount", { precision: 12, scale:  2 }),
	status: text(),
	paidAt: date("paid_at"),
});

export const accountingInvoices = pgTable("accounting_invoices", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orgId: uuid("org_id"),
	orderId: uuid("order_id"),
	qbInvoiceId: text("qb_invoice_id"),
	subtotal: numeric({ precision: 12, scale:  2 }),
	tax: numeric({ precision: 12, scale:  2 }),
	total: numeric({ precision: 12, scale:  2 }),
	status: text(),
});

export const catalogItemImages = pgTable("catalog_item_images", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	catalogItemId: uuid("catalog_item_id").notNull(),
	url: text().notNull(),
	position: integer().default(1),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const catalogItemManufacturers = pgTable("catalog_item_manufacturers", {
	catalogItemId: uuid("catalog_item_id").notNull(),
	manufacturerId: uuid("manufacturer_id").notNull(),
});

export const rolePermissions = pgTable("role_permissions", {
	roleId: uuid("role_id").notNull(),
	permissionId: uuid("permission_id").notNull(),
}, (table) => [
	pgPolicy("role_permissions_dev_access", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
]);

export const auditLogs = pgTable("audit_logs", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	occurredAt: timestamp("occurred_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	actor: uuid(),
	orgId: uuid("org_id"),
	entity: text(),
	entityId: uuid("entity_id"),
	action: text(),
	before: jsonb(),
	after: jsonb(),
}, (table) => [
	pgPolicy("audit_logs_dev_access", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
]);

export const accountingPayments = pgTable("accounting_payments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orgId: uuid("org_id"),
	orderId: uuid("order_id"),
	qbPaymentId: text("qb_payment_id"),
	amount: numeric({ precision: 12, scale:  2 }),
	date: date(),
});

export const designJobEvents = pgTable("design_job_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	designJobId: uuid("design_job_id").notNull(),
	eventCode: text("event_code").notNull(),
	actorUserId: uuid("actor_user_id"),
	payload: jsonb(),
	occurredAt: timestamp("occurred_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const orderEvents = pgTable("order_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orgId: uuid("org_id").notNull(),
	orderId: uuid("order_id").notNull(),
	eventCode: text("event_code").notNull(),
	actorUserId: uuid("actor_user_id"),
	fromStatus: text("from_status"),
	toStatus: text("to_status"),
	payload: jsonb(),
	occurredAt: timestamp("occurred_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const productionEvents = pgTable("production_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	workOrderId: uuid("work_order_id").notNull(),
	eventCode: text("event_code").notNull(),
	actorUserId: uuid("actor_user_id"),
	payload: jsonb(),
	occurredAt: timestamp("occurred_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const salespeople = pgTable("salespeople", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orgId: uuid("org_id"),
	userId: uuid("user_id"),
	commissionRateDefault: numeric("commission_rate_default", { precision: 5, scale:  4 }).default('0.15'),
});

export const statusDesignJobs = pgTable("status_design_jobs", {
	code: text().primaryKey().notNull(),
	sortOrder: integer("sort_order").notNull(),
	isTerminal: boolean("is_terminal").default(false).notNull(),
});

export const orderItemSizes = pgTable("order_item_sizes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderItemId: uuid("order_item_id"),
	size: sizeEnum(),
	qty: integer(),
});

export const statusWorkOrders = pgTable("status_work_orders", {
	code: text().primaryKey().notNull(),
	sortOrder: integer("sort_order").notNull(),
	isTerminal: boolean("is_terminal").default(false).notNull(),
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

export const organizationFavorites = pgTable("organization_favorites", {
	userId: uuid("user_id").notNull(),
	orgId: varchar("org_id").notNull(),
}, (table) => [
	pgPolicy("organization_favorites_dev_access", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
]);

export const organizationMetrics = pgTable("organization_metrics", {
	id: varchar().default((gen_random_uuid())).primaryKey().notNull(),
	organizationId: varchar("organization_id").notNull(),
	totalRevenue: integer("total_revenue").default(0),
	totalOrders: integer("total_orders").default(0),
	activeSports: integer("active_sports").default(0),
	yearsWithCompany: integer("years_with_company").default(0),
	averageOrderValue: integer("average_order_value").default(0),
	repeatCustomerRate: integer("repeat_customer_rate").default(0),
	growthRate: integer("growth_rate").default(0),
	satisfactionScore: integer("satisfaction_score").default(0),
	lastUpdated: timestamp("last_updated", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	pgPolicy("organization_metrics_dev_access", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
]);

export const roles = pgTable("roles", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	slug: text().notNull(),
	name: text().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	pgPolicy("roles_dev_access", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
]);

export const customers = pgTable("customers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orgId: uuid("org_id"),
	name: text().notNull(),
	email: text(),
	phone: text(),
	addressLine1: text("address_line1"),
	addressLine2: text("address_line2"),
	city: text(),
	state: text(),
	postalCode: text("postal_code"),
	country: text(),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	pgPolicy("customers_dev_access", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
]);

export const designJobs = pgTable("design_jobs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orgId: uuid("org_id").notNull(),
	orderItemId: uuid("order_item_id").notNull(),
	title: text(),
	brief: text(),
	priority: integer().default(3),
	statusCode: text("status_code"),
	assigneeDesignerId: uuid("assignee_designer_id"),
	createdByUserId: uuid("created_by_user_id"),
	firstDraftDueAt: timestamp("first_draft_due_at", { withTimezone: true, mode: 'string' }),
	dueAt: timestamp("due_at", { withTimezone: true, mode: 'string' }),
	approvedAt: timestamp("approved_at", { withTimezone: true, mode: 'string' }),
	canceledAt: timestamp("canceled_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	pgPolicy("design_jobs_dev_access", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
]);

export const designAssets = pgTable("design_assets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orgId: uuid("org_id"),
	orderItemId: uuid("order_item_id"),
	uploaderId: uuid("uploader_id"),
	version: integer(),
	fileUrl: text("file_url"),
	thumbnailUrl: text("thumbnail_url"),
	approvedByAdmin: boolean("approved_by_admin").default(false),
	approvedAt: timestamp("approved_at", { withTimezone: true, mode: 'string' }),
	signatureFileUrl: text("signature_file_url"),
	signatureHash: text("signature_hash"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	storageObjectId: uuid("storage_object_id"),
}, (table) => [
	pgPolicy("design_assets_dev_access", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
]);

export const manufacturingWorkOrders = pgTable("manufacturing_work_orders", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orgId: uuid("org_id").notNull(),
	orderId: uuid("order_id").notNull(),
	manufacturerId: uuid("manufacturer_id").notNull(),
	statusCode: text("status_code"),
	poNumber: text("po_number"),
	plannedStartDate: date("planned_start_date"),
	plannedDueDate: date("planned_due_date"),
	actualStartAt: timestamp("actual_start_at", { withTimezone: true, mode: 'string' }),
	actualEndAt: timestamp("actual_end_at", { withTimezone: true, mode: 'string' }),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	pgPolicy("manufacturing_work_orders_dev_access", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
]);

export const catalogItems = pgTable("catalog_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orgId: uuid("org_id"),
	name: text().notNull(),
	sportId: uuid("sport_id"),
	categoryId: uuid("category_id"),
	basePrice: numeric("base_price", { precision: 10, scale:  2 }),
	turnaroundDays: integer("turnaround_days"),
	preferredManufacturerIds: uuid("preferred_manufacturer_ids").array(),
	fabric: text(),
	buildInstructions: text("build_instructions"),
	moq: integer(),
	embellishmentsJson: jsonb("embellishments_json"),
	colorwaysJson: jsonb("colorways_json"),
	care: text(),
	imageUrls: text("image_urls").array(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	pgPolicy("catalog_items_dev_access", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
]);

export const designers = pgTable("designers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orgId: uuid("org_id"),
	userId: uuid("user_id"),
	specializations: text().array(), // Missing from schema but used in route
	portfolioUrl: text("portfolio_url"),
	hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }),
	payRatePerDesign: numeric("pay_rate_per_design", { precision: 10, scale: 2 }),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	pgPolicy("designers_dev_access", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
]);

export const manufacturers = pgTable("manufacturers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orgId: uuid("org_id"),
	name: text().notNull(), // Made required to match route validation
	contactEmail: text("contact_email"),
	contactPhone: text("contact_phone"),
	addressLine1: text("address_line1"),
	addressLine2: text("address_line2"),
	city: text(),
	state: text(),
	postalCode: text("postal_code"),
	country: text(),
	specialties: text().array(), // Changed from specialtiesJson to match route
	minimumOrderQuantity: integer("minimum_order_quantity"),
	leadTimeDays: integer("lead_time_days"),
	isActive: boolean("is_active").default(true).notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	pgPolicy("manufacturers_dev_access", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
]);

export const salespersonProfiles = pgTable("salesperson_profiles", {
	id: varchar().default(sql`gen_random_uuid()::varchar`).primaryKey().notNull(),
	userId: varchar("user_id").notNull(), // Changed to match database varchar type
	employeeId: text("employee_id"),
	taxId: text("tax_id"),
	commissionRate: numeric("commission_rate", { precision: 5, scale: 4 }).default('0.05'), // Fixed to match migration
	territory: text(),
	hireDate: timestamp("hire_date", { mode: 'string' }),
	managerId: varchar("manager_id"),
	performanceTier: text("performance_tier").default('standard'),
	isActive: boolean("is_active").default(true).notNull(), // Missing field
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	pgPolicy("salesperson_profiles_dev_access", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
]);

export const salespersonAssignments = pgTable("salesperson_assignments", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	salespersonId: varchar("salesperson_id").notNull(),
	organizationId: varchar("organization_id").notNull(),
	sportId: varchar("sport_id").notNull(),
	teamName: text("team_name").notNull(),
	assignedBy: varchar("assigned_by"),
	assignedAt: timestamp("assigned_at", { mode: 'string' }).defaultNow().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	pgPolicy("salesperson_assignments_dev_access", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
]);

export const salespersonMetrics = pgTable("salesperson_metrics", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	salespersonId: varchar("salesperson_id").notNull(),
	periodStart: timestamp("period_start", { mode: 'string' }).notNull(),
	periodEnd: timestamp("period_end", { mode: 'string' }).notNull(),
	totalSales: integer("total_sales").default(0),
	ordersCount: integer("orders_count").default(0),
	conversionRate: integer("conversion_rate").default(0),
	averageDealSize: integer("average_deal_size").default(0),
	commissionEarned: integer("commission_earned").default(0),
	activeAssignments: integer("active_assignments").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	pgPolicy("salesperson_metrics_dev_access", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
]);

export const permissions = pgTable("permissions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	key: text().notNull(),
	description: text(),
	category: text().default('general').notNull(),
	action: text().default('read').notNull(),
	resource: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	pgPolicy("permissions_dev_access", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
]);

export const permissionTemplates = pgTable("permission_templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	templateType: varchar("template_type", { length: 50 }).default('custom'),
	permissions: jsonb().default({}),
	pageAccess: jsonb("page_access").default({}),
	isActive: boolean("is_active").default(true),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});
