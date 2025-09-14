
// Schema updated to match actual database structure on 2025-09-11
// Aligned with business database - removed auth enums, added real business tables

import { pgTable, foreignKey, pgEnum, uuid, varchar, text, timestamp, boolean, integer, jsonb, decimal, date, bigint } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Business Tables

export const accountingInvoices = pgTable("accounting_invoices", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: uuid("org_id"),
        orderId: uuid("order_id"),
        qbInvoiceId: text("qb_invoice_id"),
        subtotal: decimal({ precision: 10, scale: 2 }),
        tax: decimal({ precision: 10, scale: 2 }),
        total: decimal({ precision: 10, scale: 2 }),
        status: text(),
});

export const accountingPayments = pgTable("accounting_payments", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: uuid("org_id"),
        orderId: uuid("order_id"),
        qbPaymentId: text("qb_payment_id"),
        amount: decimal({ precision: 10, scale: 2 }),
        date: date(),
});

export const auditLogs = pgTable("audit_logs", {
        id: bigint({ mode: "number" }).primaryKey().notNull(),
        occurredAt: timestamp("occurred_at", { withTimezone: true, mode: 'string' }),
        actor: uuid(),
        orgId: uuid("org_id"),
        entity: text(),
        entityId: uuid("entity_id"),
        action: text(),
        before: jsonb(),
        after: jsonb(),
});

export const catalogItemImages = pgTable("catalog_item_images", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        catalogItemId: uuid("catalog_item_id").notNull(),
        url: text().notNull(),
        position: integer(),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const catalogItemManufacturers = pgTable("catalog_item_manufacturers", {
        catalogItemId: uuid("catalog_item_id").notNull(),
        manufacturerId: uuid("manufacturer_id").notNull(),
});

export const catalogItems = pgTable("catalog_items", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: uuid("org_id"),
        name: text().notNull(),
        sportId: uuid("sport_id"),
        categoryId: uuid("category_id"),
        basePrice: decimal("base_price", { precision: 10, scale: 2 }),
        turnaroundDays: integer("turnaround_days"),
        preferredManufacturerIds: text("preferred_manufacturer_ids").array(),
        fabric: text(),
        buildInstructions: text("build_instructions"),
        moq: integer(),
        embellishmentsJson: jsonb("embellishments_json"),
        colorwaysJson: jsonb("colorways_json"),
        care: text(),
        imageUrls: text("image_urls").array(),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const categories = pgTable("categories", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        name: text().notNull(),
});

export const commissions = pgTable("commissions", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: uuid("org_id"),
        orderId: uuid("order_id"),
        salespersonUserId: uuid("salesperson_user_id"),
        profitAmount: decimal("profit_amount", { precision: 10, scale: 2 }),
        rate: decimal({ precision: 5, scale: 4 }),
        commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }),
        status: text(),
        paidAt: date("paid_at"),
});

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
});

export const designAssets = pgTable("design_assets", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: uuid("org_id"),
        orderItemId: uuid("order_item_id"),
        uploaderId: uuid("uploader_id"),
        version: integer(),
        fileUrl: text("file_url"),
        thumbnailUrl: text("thumbnail_url"),
        approvedByAdmin: boolean("approved_by_admin"),
        approvedAt: timestamp("approved_at", { withTimezone: true, mode: 'string' }),
        signatureFileUrl: text("signature_file_url"),
        signatureHash: text("signature_hash"),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
        storageObjectId: uuid("storage_object_id"),
});

export const designers = pgTable("designers", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        userId: uuid("user_id").notNull(),
        specializations: text().array(),
        portfolioUrl: text("portfolio_url"),
        hourlyRate: decimal("hourly_rate", { precision: 8, scale: 2 }),
        isActive: boolean("is_active").default(true),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const designJobEvents = pgTable("design_job_events", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        designJobId: uuid("design_job_id").notNull(),
        eventCode: text("event_code").notNull(),
        actorUserId: uuid("actor_user_id"),
        payload: jsonb(),
        occurredAt: timestamp("occurred_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const designJobs = pgTable("design_jobs", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: uuid("org_id").notNull(),
        orderItemId: uuid("order_item_id").notNull(),
        title: text(),
        brief: text(),
        priority: integer(),
        statusCode: text("status_code"),
        assigneeDesignerId: uuid("assignee_designer_id"),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const manufacturers = pgTable("manufacturers", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        name: text().notNull(),
        contactEmail: text("contact_email"),
        contactPhone: text("contact_phone"),
        addressLine1: text("address_line1"),
        addressLine2: text("address_line2"),
        city: text(),
        state: text(),
        postalCode: text("postal_code"),
        country: text(),
        specialties: text().array(),
        minimumOrderQuantity: integer("minimum_order_quantity"),
        leadTimeDays: integer("lead_time_days"),
        isActive: boolean("is_active").default(true),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const manufacturingWorkOrders = pgTable("manufacturing_work_orders", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: uuid("org_id").notNull(),
        orderItemId: uuid("order_item_id").notNull(),
        manufacturerId: uuid("manufacturer_id"),
        statusCode: text("status_code"),
        instructions: text(),
        estimatedCompletionDate: date("estimated_completion_date"),
        actualCompletionDate: date("actual_completion_date"),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

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
        createdBy: varchar("created_by"), // Keep as varchar to match existing data
});

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
});

export const orderEvents = pgTable("order_events", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orderId: uuid("order_id").notNull(),
        eventCode: text("event_code").notNull(),
        actorUserId: uuid("actor_user_id"),
        payload: jsonb(),
        occurredAt: timestamp("occurred_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: uuid("org_id"),
        orderId: uuid("order_id"),
        productId: uuid("product_id"),
        nameSnapshot: text("name_snapshot"),
        priceSnapshot: decimal("price_snapshot", { precision: 10, scale: 2 }),
        designerId: uuid("designer_id"),
        manufacturerId: uuid("manufacturer_id"),
        statusCode: text("status_code"),
        variantImageUrl: text("variant_image_url"),
        pantoneJson: jsonb("pantone_json"),
        buildOverridesText: text("build_overrides_text"),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const orderItemSizes = pgTable("order_item_sizes", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orderItemId: uuid("order_item_id").notNull(),
        sizeCode: text("size_code").notNull(),
        quantity: integer().notNull(),
});

export const orders = pgTable("orders", {
        id: varchar().primaryKey().notNull(),
        organizationId: varchar("organization_id").notNull(),
        orderNumber: text("order_number").notNull(),
        customerName: text("customer_name").notNull(),
        totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
        items: jsonb(),
        notes: text(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
        statusCode: text("status_code"),
        salespersonId: varchar("salesperson_id"),
        sportId: varchar("sport_id"),
        teamName: text("team_name"),
});

export const organizationFavorites = pgTable("organization_favorites", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        userId: uuid("user_id").notNull(),
        organizationId: uuid("organization_id").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const organizationMetrics = pgTable("organization_metrics", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: uuid("org_id").notNull(),
        periodStart: date("period_start").notNull(),
        periodEnd: date("period_end").notNull(),
        totalRevenue: decimal("total_revenue", { precision: 12, scale: 2 }).default('0'),
        totalOrders: integer("total_orders").default(0),
        averageOrderValue: decimal("average_order_value", { precision: 10, scale: 2 }).default('0'),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const permissions = pgTable("permissions", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        name: text().notNull(),
        slug: text().notNull(),
        description: text(),
        category: text(),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const permissionTemplates = pgTable("permission_templates", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        name: text().notNull(),
        templateType: text("template_type").notNull(),
        permissions: jsonb(),
        createdBy: varchar("created_by"), // Keep as varchar to match existing data
        isActive: boolean("is_active").default(true),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const productionEvents = pgTable("production_events", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        workOrderId: uuid("work_order_id").notNull(),
        eventCode: text("event_code").notNull(),
        actorUserId: uuid("actor_user_id"),
        payload: jsonb(),
        occurredAt: timestamp("occurred_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const rolePermissions = pgTable("role_permissions", {
        roleId: uuid("role_id").notNull(),
        permissionId: uuid("permission_id").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
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

export const salespeople = pgTable("salespeople", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        userId: uuid("user_id").notNull(),
        employeeId: text("employee_id"),
        territory: text(),
        commissionRate: decimal("commission_rate", { precision: 5, scale: 4 }).default('0.05'),
        isActive: boolean("is_active").default(true),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const sports = pgTable("sports", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        name: varchar({ length: 100 }).notNull(),
        slug: varchar({ length: 100 }).notNull(),
});

export const statusDesignJobs = pgTable("status_design_jobs", {
        code: text().primaryKey().notNull(),
        sortOrder: integer("sort_order").notNull(),
        isTerminal: boolean("is_terminal").default(false).notNull(),
});

export const statusOrderItems = pgTable("status_order_items", {
        code: text().primaryKey().notNull(),
        sortOrder: integer("sort_order").notNull(),
        isTerminal: boolean("is_terminal").default(false).notNull(),
});

export const statusOrders = pgTable("status_orders", {
        code: text().primaryKey().notNull(),
        sortOrder: integer("sort_order").notNull(),
        isTerminal: boolean("is_terminal").default(false).notNull(),
});

export const statusWorkOrders = pgTable("status_work_orders", {
        code: text().primaryKey().notNull(),
        sortOrder: integer("sort_order").notNull(),
        isTerminal: boolean("is_terminal").default(false).notNull(),
});

export const userRoles = pgTable("user_roles", {
        userId: uuid("user_id").notNull(),
        roleId: uuid("role_id").notNull(),
        assignedAt: timestamp("assigned_at", { withTimezone: true, mode: 'string' }).defaultNow(),
        assignedBy: uuid("assigned_by"),
});

export const users = pgTable("users", {
        id: varchar().primaryKey().notNull(),
        email: text().notNull(),
        passwordHash: text("password_hash"),
        fullName: text("full_name").notNull(),
        phone: text(),
        role: text().notNull(),
        avatarUrl: text("avatar_url"),
        isActive: integer("is_active").notNull(),
        organizationId: varchar("organization_id"),
        addressLine1: text("address_line1"),
        addressLine2: text("address_line2"),
        city: text(),
        state: text(),
        postalCode: text("postal_code"),
        country: text(),
        lastLogin: timestamp("last_login", { mode: 'string' }),
        passwordResetToken: text("password_reset_token"),
        passwordResetExpires: timestamp("password_reset_expires", { mode: 'string' }),
        emailVerified: integer("email_verified"),
        notes: text(),
        createdBy: varchar("created_by"), // Keep as varchar to match existing data
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
        initialTempPassword: text("initial_temp_password"),
        subrole: text(),
        jobTitle: text("job_title"),
        department: text(),
        hireDate: timestamp("hire_date", { mode: 'string' }),
        permissions: jsonb(),
        pageAccess: jsonb("page_access"),
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

// All tables are already exported above where they are defined
