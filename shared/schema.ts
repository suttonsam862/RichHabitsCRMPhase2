// Schema auto-pulled on 2025-08-24T07:49:38.122Z
// This file was automatically generated from the database

import { pgTable, index, varchar, text, jsonb, timestamp, boolean, foreignKey, numeric, unique, uuid, bigserial, integer, check, date, primaryKey, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const orderItemStatus = pgEnum("order_item_status", ['pending', 'design', 'approved', 'manufacturing', 'shipped', 'done'])
export const orderStatus = pgEnum("order_status", ['consultation', 'design', 'manufacturing', 'shipped', 'completed'])
export const sizeEnum = pgEnum("size_enum", ['YS', 'YM', 'YL', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'])


export const organizations = pgTable("organizations", {
        id: varchar().default(sql`gen_random_uuid()`).primaryKey().notNull(),
        name: text().notNull(),
        logoUrl: text("logo_url"),
        state: text(),
        address: text(),
        phone: text(),
        email: text(),
        universalDiscounts: jsonb("universal_discounts").default({}).notNull(),
        notes: text(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
        isBusiness: boolean("is_business").default(false),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        titleCardUrl: text("title_card_url"),
        brandPrimary: text("brand_primary"),
        brandSecondary: text("brand_secondary"),
        status: text().default('active').notNull(),
        colorPalette: jsonb("color_palette").default([]),
        tags: text().array().default([""]).notNull(),
        isArchived: boolean("is_archived").default(false).notNull(),
        gradientCss: text("gradient_css"),
}, (table) => [
        index("idx_orgs_archived").using("btree", table.isArchived.asc().nullsLast().op("bool_ops")),
        index("idx_orgs_name").using("btree", table.name.asc().nullsLast().op("text_ops")),
        index("idx_orgs_state").using("btree", table.state.asc().nullsLast().op("text_ops")),
        index("idx_orgs_tags_gin").using("gin", table.tags.asc().nullsLast().op("array_ops")),
]);

export const orders = pgTable("orders", {
        id: varchar().default(sql`gen_random_uuid()`).primaryKey().notNull(),
        organizationId: varchar("organization_id").notNull(),
        orderNumber: text("order_number").notNull(),
        customerName: text("customer_name").notNull(),
        totalAmount: numeric("total_amount", { precision: 10, scale:  2 }),
        items: jsonb(),
        notes: text(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
        statusCode: text("status_code"),
}, (table) => [
        index("idx_orders_customer_id").using("btree", table.customerName.asc().nullsLast().op("text_ops")),
        index("idx_orders_org_id").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
        index("idx_orders_organization_id").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
        index("idx_orders_status_code").using("btree", table.statusCode.asc().nullsLast().op("text_ops")),
        foreignKey({
                        columns: [table.statusCode],
                        foreignColumns: [statusOrders.code],
                        name: "orders_status_code_fkey"
                }),
]);

export const userRoles = pgTable("user_roles", {
        id: varchar().default(sql`gen_random_uuid()`).primaryKey().notNull(),
        userId: varchar("user_id"),
        orgId: varchar("org_id").notNull(),
        roleId: varchar("role_id").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        index("idx_user_roles_org_user").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("text_ops")),
        foreignKey({
                        columns: [table.orgId],
                        foreignColumns: [organizations.id],
                        name: "user_roles_org_id_fkey"
                }).onDelete("cascade"),
        foreignKey({
                        columns: [table.roleId],
                        foreignColumns: [roles.id],
                        name: "user_roles_role_id_fkey"
                }).onDelete("cascade"),
]);

export const orgSports = pgTable("org_sports", {
        id: varchar().default(sql`gen_random_uuid()`).primaryKey().notNull(),
        organizationId: varchar("organization_id").notNull(),
        sportId: varchar("sport_id").notNull(),
        contactName: text("contact_name").notNull(),
        contactEmail: text("contact_email").notNull(),
        contactPhone: text("contact_phone"),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
        contactUserId: varchar("contact_user_id"),
}, (table) => [
        unique("org_sports_organization_id_sport_id_key").on(table.organizationId, table.sportId),
]);

export const sports = pgTable("sports", {
        id: varchar().default(sql`gen_random_uuid()`).primaryKey().notNull(),
        name: text().notNull(),
        description: text(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
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

export const categories = pgTable("categories", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        name: text().notNull(),
});

export const catalogItemImages = pgTable("catalog_item_images", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        catalogItemId: uuid("catalog_item_id").notNull(),
        url: text().notNull(),
        position: integer().default(1),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
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
}, (table) => [
        check("commissions_rate_0_1", sql`(rate IS NULL) OR ((rate >= (0)::numeric) AND (rate <= (1)::numeric))`),
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
});

export const accountingPayments = pgTable("accounting_payments", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: uuid("org_id"),
        orderId: uuid("order_id"),
        qbPaymentId: text("qb_payment_id"),
        amount: numeric({ precision: 12, scale:  2 }),
        date: date(),
});

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
});

export const manufacturers = pgTable("manufacturers", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: uuid("org_id"),
        name: text(),
        specialtiesJson: jsonb("specialties_json"),
        wireInfoJson: jsonb("wire_info_json"),
        contactEmail: text("contact_email"),
        notes: text(),
});

export const orderItemSizes = pgTable("order_item_sizes", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orderItemId: uuid("order_item_id"),
        size: sizeEnum(),
        qty: integer(),
});

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

export const permissions = pgTable("permissions", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        key: text().notNull(),
        description: text(),
}, (table) => [
        unique("permissions_key_key").on(table.key),
]);

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
        index("idx_order_items_order").using("btree", table.orderId.asc().nullsLast().op("uuid_ops")),
        index("idx_order_items_org").using("btree", table.orgId.asc().nullsLast().op("uuid_ops")),
        index("idx_order_items_status").using("btree", table.statusCode.asc().nullsLast().op("text_ops")),
        foreignKey({
                        columns: [table.statusCode],
                        foreignColumns: [statusOrderItems.code],
                        name: "order_items_status_code_fkey"
                }),
]);

export const statusDesignJobs = pgTable("status_design_jobs", {
        code: text().primaryKey().notNull(),
        sortOrder: integer("sort_order").notNull(),
        isTerminal: boolean("is_terminal").default(false).notNull(),
});

export const designers = pgTable("designers", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: uuid("org_id"),
        userId: uuid("user_id"),
        payRatePerDesign: numeric("pay_rate_per_design", { precision: 10, scale:  2 }),
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

export const roles = pgTable("roles", {
        id: varchar().default(sql`gen_random_uuid()`).primaryKey().notNull(),
        slug: text().notNull(),
        name: text().notNull(),
        description: text(),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        unique("roles_slug_unique").on(table.slug),
        unique("roles_name_key").on(table.name),
]);

export const catalogItemManufacturers = pgTable("catalog_item_manufacturers", {
        catalogItemId: uuid("catalog_item_id").notNull(),
        manufacturerId: uuid("manufacturer_id").notNull(),
}, (table) => [
        primaryKey({ columns: [table.catalogItemId, table.manufacturerId], name: "catalog_item_manufacturers_pkey"}),
]);

export const rolePermissions = pgTable("role_permissions", {
        roleId: uuid("role_id").notNull(),
        permissionId: uuid("permission_id").notNull(),
}, (table) => [
        primaryKey({ columns: [table.roleId, table.permissionId], name: "role_permissions_pkey"}),
]);

export const organizationFavorites = pgTable("organization_favorites", {
        userId: varchar("user_id").notNull(),
        orgId: varchar("org_id").notNull(),
}, (table) => [
        index("idx_org_favorites_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
        foreignKey({
                        columns: [table.orgId],
                        foreignColumns: [organizations.id],
                        name: "organization_favorites_org_id_fkey"
                }).onDelete("cascade"),
        primaryKey({ columns: [table.userId, table.orgId], name: "organization_favorites_pkey"}),
]);
