// Schema auto-pulled on 2025-08-20T20:39:43.821Z
// This file was automatically generated from the database

import { pgTable, uniqueIndex, unique, pgPolicy, uuid, text, foreignKey, integer, boolean, timestamp, jsonb, numeric, bigserial, date, check, index, primaryKey, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const orderItemStatus = pgEnum("order_item_status", ['pending', 'design', 'approved', 'manufacturing', 'shipped', 'done'])
export const orderStatus = pgEnum("order_status", ['consultation', 'design', 'manufacturing', 'shipped', 'completed'])
export const sizeEnum = pgEnum("size_enum", ['YS', 'YM', 'YL', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'])


export const roles = pgTable("roles", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        name: text().notNull(),
        slug: text().notNull(),
}, (table) => [
        uniqueIndex("roles_slug_idx").using("btree", table.slug.asc().nullsLast().op("text_ops")),
        unique("roles_name_key").on(table.name),
        pgPolicy("roles_read", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
]);

export const categories = pgTable("categories", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        name: text().notNull(),
}, (table) => [
        pgPolicy("categories_read", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
]);

export const sports = pgTable("sports", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        name: text().notNull(),
}, (table) => [
        pgPolicy("sports_read", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
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
        foreignKey({
                        columns: [table.orderItemId],
                        foreignColumns: [orderItems.id],
                        name: "design_assets_order_item_id_fkey"
                }).onDelete("cascade"),
        foreignKey({
                        columns: [table.orgId],
                        foreignColumns: [organizations.id],
                        name: "design_assets_org_id_fkey"
                }).onDelete("cascade"),
        
        pgPolicy("design_assets_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`has_role(auth.uid(), org_id, 'Admin'::text)` }),
        pgPolicy("design_assets_insert_update", { as: "permissive", for: "insert", to: ["authenticated"] }),
        pgPolicy("design_assets_select", { as: "permissive", for: "select", to: ["authenticated"] }),
        pgPolicy("design_assets_update", { as: "permissive", for: "update", to: ["authenticated"] }),
]);

export const manufacturers = pgTable("manufacturers", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: uuid("org_id"),
        name: text(),
        specialtiesJson: jsonb("specialties_json"),
        wireInfoJson: jsonb("wire_info_json"),
        contactEmail: text("contact_email"),
        notes: text(),
}, (table) => [
        foreignKey({
                        columns: [table.orgId],
                        foreignColumns: [organizations.id],
                        name: "manufacturers_org_id_fkey"
                }).onDelete("cascade"),
        pgPolicy("manufacturers_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`is_org_member(auth.uid(), org_id)` }),
        pgPolicy("manufacturers_write", { as: "permissive", for: "all", to: ["authenticated"] }),
]);

export const designers = pgTable("designers", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: uuid("org_id"),
        userId: uuid("user_id"),
        payRatePerDesign: numeric("pay_rate_per_design", { precision: 10, scale:  2 }),
}, (table) => [
        foreignKey({
                        columns: [table.orgId],
                        foreignColumns: [organizations.id],
                        name: "designers_org_id_fkey"
                }).onDelete("cascade"),
        
        pgPolicy("designers_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`is_org_member(auth.uid(), org_id)` }),
        pgPolicy("designers_write", { as: "permissive", for: "all", to: ["authenticated"] }),
]);

export const orderItemSizes = pgTable("order_item_sizes", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orderItemId: uuid("order_item_id"),
        size: sizeEnum(),
        qty: integer(),
}, (table) => [
        foreignKey({
                        columns: [table.orderItemId],
                        foreignColumns: [orderItems.id],
                        name: "order_item_sizes_order_item_id_fkey"
                }).onDelete("cascade"),
        pgPolicy("order_item_sizes_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM order_items oi
  WHERE ((oi.id = order_item_sizes.order_item_id) AND is_org_member(auth.uid(), oi.org_id))))` }),
        pgPolicy("order_item_sizes_write", { as: "permissive", for: "all", to: ["authenticated"] }),
]);

export const salespeople = pgTable("salespeople", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: uuid("org_id"),
        userId: uuid("user_id"),
        commissionRateDefault: numeric("commission_rate_default", { precision: 5, scale:  4 }).default('0.15'),
}, (table) => [
        foreignKey({
                        columns: [table.orgId],
                        foreignColumns: [organizations.id],
                        name: "salespeople_org_id_fkey"
                }).onDelete("cascade"),
        
        pgPolicy("salespeople_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`is_org_member(auth.uid(), org_id)` }),
        pgPolicy("salespeople_write", { as: "permissive", for: "all", to: ["authenticated"] }),
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
        pgPolicy("audit_logs_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(((org_id IS NULL) AND (EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.name = ANY (ARRAY['Admin'::text, 'Accounting'::text])))))) OR ((org_id IS NOT NULL) AND (has_role(auth.uid(), org_id, 'Admin'::text) OR has_role(auth.uid(), org_id, 'Accounting'::text))))` }),
]);

export const orders = pgTable("orders", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: uuid("org_id"),
        customerId: uuid("customer_id"),
        code: text(),
        customerContactName: text("customer_contact_name"),
        customerContactEmail: text("customer_contact_email"),
        dueDate: date("due_date"),
        notes: text(),
        revenueEstimate: numeric("revenue_estimate", { precision: 12, scale:  2 }),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
        statusCode: text("status_code").default('consultation'),
}, (table) => [
        foreignKey({
                        columns: [table.customerId],
                        foreignColumns: [customers.id],
                        name: "orders_customer_id_fkey"
                }).onDelete("cascade"),
        foreignKey({
                        columns: [table.orgId],
                        foreignColumns: [organizations.id],
                        name: "orders_org_id_fkey"
                }).onDelete("cascade"),
        foreignKey({
                        columns: [table.statusCode],
                        foreignColumns: [statusOrders.code],
                        name: "orders_status_code_fkey"
                }),
        unique("orders_code_key").on(table.code),
        pgPolicy("orders_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`has_role(auth.uid(), org_id, 'Admin'::text)` }),
        pgPolicy("orders_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
        pgPolicy("orders_select", { as: "permissive", for: "select", to: ["authenticated"] }),
        pgPolicy("orders_update", { as: "permissive", for: "update", to: ["authenticated"] }),
]);

export const accountingInvoices = pgTable("accounting_invoices", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: uuid("org_id"),
        orderId: uuid("order_id"),
        qbInvoiceId: text("qb_invoice_id"),
        subtotal: numeric({ precision: 12, scale:  2 }),
        tax: numeric({ precision: 12, scale:  2 }),
        total: numeric({ precision: 12, scale:  2 }),
        status: text(),
}, (table) => [
        foreignKey({
                        columns: [table.orderId],
                        foreignColumns: [orders.id],
                        name: "accounting_invoices_order_id_fkey"
                }).onDelete("cascade"),
        foreignKey({
                        columns: [table.orgId],
                        foreignColumns: [organizations.id],
                        name: "accounting_invoices_org_id_fkey"
                }).onDelete("cascade"),
        pgPolicy("accounting_invoices_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(has_role(auth.uid(), org_id, 'Admin'::text) OR has_role(auth.uid(), org_id, 'Accounting'::text))` }),
        pgPolicy("accounting_invoices_write", { as: "permissive", for: "all", to: ["authenticated"] }),
]);

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
        foreignKey({
                        columns: [table.orderId],
                        foreignColumns: [orders.id],
                        name: "commissions_order_id_fkey"
                }).onDelete("cascade"),
        foreignKey({
                        columns: [table.orgId],
                        foreignColumns: [organizations.id],
                        name: "commissions_org_id_fkey"
                }).onDelete("cascade"),
        pgPolicy("commissions_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(has_role(auth.uid(), org_id, 'Admin'::text) OR has_role(auth.uid(), org_id, 'Accounting'::text))` }),
        pgPolicy("commissions_write", { as: "permissive", for: "all", to: ["authenticated"] }),
        check("commissions_rate_0_1", sql`(rate IS NULL) OR ((rate >= (0)::numeric) AND (rate <= (1)::numeric))`),
]);

export const accountingPayments = pgTable("accounting_payments", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: uuid("org_id"),
        orderId: uuid("order_id"),
        qbPaymentId: text("qb_payment_id"),
        amount: numeric({ precision: 12, scale:  2 }),
        date: date(),
}, (table) => [
        foreignKey({
                        columns: [table.orderId],
                        foreignColumns: [orders.id],
                        name: "accounting_payments_order_id_fkey"
                }).onDelete("cascade"),
        foreignKey({
                        columns: [table.orgId],
                        foreignColumns: [organizations.id],
                        name: "accounting_payments_org_id_fkey"
                }).onDelete("cascade"),
        pgPolicy("accounting_payments_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(has_role(auth.uid(), org_id, 'Admin'::text) OR has_role(auth.uid(), org_id, 'Accounting'::text))` }),
        pgPolicy("accounting_payments_write", { as: "permissive", for: "all", to: ["authenticated"] }),
]);

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
        foreignKey({
                        columns: [table.orderId],
                        foreignColumns: [orders.id],
                        name: "order_items_order_id_fkey"
                }).onDelete("cascade"),
        foreignKey({
                        columns: [table.orgId],
                        foreignColumns: [organizations.id],
                        name: "order_items_org_id_fkey"
                }).onDelete("cascade"),
        foreignKey({
                        columns: [table.productId],
                        foreignColumns: [catalogItems.id],
                        name: "order_items_product_id_fkey"
                }),
        foreignKey({
                        columns: [table.statusCode],
                        foreignColumns: [statusOrderItems.code],
                        name: "order_items_status_code_fkey"
                }),
        pgPolicy("order_items_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`is_org_member(auth.uid(), org_id)` }),
        pgPolicy("order_items_write", { as: "permissive", for: "all", to: ["authenticated"] }),
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
        foreignKey({
                        columns: [table.orgId],
                        foreignColumns: [organizations.id],
                        name: "customers_org_id_fkey"
                }).onDelete("cascade"),
        pgPolicy("customers_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`is_org_member(auth.uid(), org_id)` }),
        pgPolicy("customers_write", { as: "permissive", for: "all", to: ["authenticated"] }),
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
        foreignKey({
                        columns: [table.categoryId],
                        foreignColumns: [categories.id],
                        name: "catalog_items_category_id_fkey"
                }),
        foreignKey({
                        columns: [table.orgId],
                        foreignColumns: [organizations.id],
                        name: "catalog_items_org_id_fkey"
                }).onDelete("cascade"),
        foreignKey({
                        columns: [table.sportId],
                        foreignColumns: [sports.id],
                        name: "catalog_items_sport_id_fkey"
                }),
        pgPolicy("catalog_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`((org_id IS NULL) OR is_org_member(auth.uid(), org_id))` }),
]);

export const permissions = pgTable("permissions", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        key: text().notNull(),
        description: text(),
}, (table) => [
        unique("permissions_key_key").on(table.key),
        pgPolicy("permissions_read", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
]);

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
}, (table) => [
        index("idx_order_events_order").using("btree", table.orderId.asc().nullsLast().op("uuid_ops")),
        index("idx_order_events_org").using("btree", table.orgId.asc().nullsLast().op("uuid_ops")),
        
        foreignKey({
                        columns: [table.orderId],
                        foreignColumns: [orders.id],
                        name: "order_events_order_id_fkey"
                }).onDelete("cascade"),
        foreignKey({
                        columns: [table.orgId],
                        foreignColumns: [organizations.id],
                        name: "order_events_org_id_fkey"
                }),
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
        index("idx_design_jobs_item").using("btree", table.orderItemId.asc().nullsLast().op("uuid_ops")),
        index("idx_design_jobs_org").using("btree", table.orgId.asc().nullsLast().op("uuid_ops")),
        index("idx_design_jobs_status").using("btree", table.statusCode.asc().nullsLast().op("text_ops")),
        foreignKey({
                        columns: [table.assigneeDesignerId],
                        foreignColumns: [designers.id],
                        name: "design_jobs_assignee_designer_id_fkey"
                }),
        
        foreignKey({
                        columns: [table.orderItemId],
                        foreignColumns: [orderItems.id],
                        name: "design_jobs_order_item_id_fkey"
                }).onDelete("cascade"),
        foreignKey({
                        columns: [table.orgId],
                        foreignColumns: [organizations.id],
                        name: "design_jobs_org_id_fkey"
                }),
        foreignKey({
                        columns: [table.statusCode],
                        foreignColumns: [statusDesignJobs.code],
                        name: "design_jobs_status_code_fkey"
                }),
]);

export const statusDesignJobs = pgTable("status_design_jobs", {
        code: text().primaryKey().notNull(),
        sortOrder: integer("sort_order").notNull(),
        isTerminal: boolean("is_terminal").default(false).notNull(),
});

export const designJobEvents = pgTable("design_job_events", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        designJobId: uuid("design_job_id").notNull(),
        eventCode: text("event_code").notNull(),
        actorUserId: uuid("actor_user_id"),
        payload: jsonb(),
        occurredAt: timestamp("occurred_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        index("idx_design_job_events_job").using("btree", table.designJobId.asc().nullsLast().op("uuid_ops")),
        
        foreignKey({
                        columns: [table.designJobId],
                        foreignColumns: [designJobs.id],
                        name: "design_job_events_design_job_id_fkey"
                }).onDelete("cascade"),
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
        index("idx_mwo_order").using("btree", table.orderId.asc().nullsLast().op("uuid_ops")),
        index("idx_mwo_org").using("btree", table.orgId.asc().nullsLast().op("uuid_ops")),
        index("idx_mwo_status").using("btree", table.statusCode.asc().nullsLast().op("text_ops")),
        foreignKey({
                        columns: [table.manufacturerId],
                        foreignColumns: [manufacturers.id],
                        name: "manufacturing_work_orders_manufacturer_id_fkey"
                }),
        foreignKey({
                        columns: [table.orderId],
                        foreignColumns: [orders.id],
                        name: "manufacturing_work_orders_order_id_fkey"
                }).onDelete("cascade"),
        foreignKey({
                        columns: [table.orgId],
                        foreignColumns: [organizations.id],
                        name: "manufacturing_work_orders_org_id_fkey"
                }),
        foreignKey({
                        columns: [table.statusCode],
                        foreignColumns: [statusWorkOrders.code],
                        name: "manufacturing_work_orders_status_code_fkey"
                }),
]);

export const statusWorkOrders = pgTable("status_work_orders", {
        code: text().primaryKey().notNull(),
        sortOrder: integer("sort_order").notNull(),
        isTerminal: boolean("is_terminal").default(false).notNull(),
});

export const productionEvents = pgTable("production_events", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        workOrderId: uuid("work_order_id").notNull(),
        eventCode: text("event_code").notNull(),
        actorUserId: uuid("actor_user_id"),
        payload: jsonb(),
        occurredAt: timestamp("occurred_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        index("idx_production_events_wo").using("btree", table.workOrderId.asc().nullsLast().op("uuid_ops")),
        
        foreignKey({
                        columns: [table.workOrderId],
                        foreignColumns: [manufacturingWorkOrders.id],
                        name: "production_events_work_order_id_fkey"
                }).onDelete("cascade"),
]);

export const catalogItemImages = pgTable("catalog_item_images", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        catalogItemId: uuid("catalog_item_id").notNull(),
        url: text().notNull(),
        position: integer().default(1),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        uniqueIndex("catalog_item_images_pos_uniq").using("btree", table.catalogItemId.asc().nullsLast().op("int4_ops"), table.position.asc().nullsLast().op("int4_ops")),
        foreignKey({
                        columns: [table.catalogItemId],
                        foreignColumns: [catalogItems.id],
                        name: "catalog_item_images_catalog_item_id_fkey"
                }).onDelete("cascade"),
]);

export const organizations = pgTable("organizations", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        name: text().notNull(),
        logoUrl: text("logo_url"),
        brandPrimary: text("brand_primary"),
        brandSecondary: text("brand_secondary"),
        emailDomain: text("email_domain"),
        billingEmail: text("billing_email"),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
        isBusiness: boolean("is_business").default(false).notNull(),
        state: text(),
        addressLine1: text("address_line1"),
        addressLine2: text("address_line2"),
        city: text(),
        postalCode: text("postal_code"),
        phone: text(),
        contactEmail: text("contact_email"),
        notes: text(),
        country: text(),
        status: text().default('active').notNull(),
        website: text(),
        universalDiscounts: jsonb("universal_discounts").default({}).notNull(),
        address: text(),
        email: text(),
        titleCardUrl: text("title_card_url"),
}, (table) => [
        index("organizations_created_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
        index("organizations_name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
        index("organizations_state_idx").using("btree", table.state.asc().nullsLast().op("text_ops")),
        pgPolicy("org_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`is_org_member(auth.uid(), id)` }),
        pgPolicy("organizations_delete", { as: "permissive", for: "delete", to: ["authenticated"] }),
        pgPolicy("organizations_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
        pgPolicy("organizations_update", { as: "permissive", for: "update", to: ["authenticated"] }),
]);

export const orgSports = pgTable("org_sports", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        organizationId: uuid("organization_id").notNull(),
        sportId: uuid("sport_id").notNull(),
        contactName: text("contact_name").notNull(),
        contactEmail: text("contact_email").notNull(),
        contactPhone: text("contact_phone"),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
        foreignKey({
                        columns: [table.organizationId],
                        foreignColumns: [organizations.id],
                        name: "org_sports_organization_id_fkey"
                }).onDelete("cascade"),
        foreignKey({
                        columns: [table.sportId],
                        foreignColumns: [sports.id],
                        name: "org_sports_sport_id_fkey"
                }).onDelete("cascade"),
        unique("org_sports_organization_id_sport_id_key").on(table.organizationId, table.sportId),
]);

export const rolePermissions = pgTable("role_permissions", {
        roleId: uuid("role_id").notNull(),
        permissionId: uuid("permission_id").notNull(),
}, (table) => [
        foreignKey({
                        columns: [table.permissionId],
                        foreignColumns: [permissions.id],
                        name: "role_permissions_permission_id_fkey"
                }).onDelete("cascade"),
        foreignKey({
                        columns: [table.roleId],
                        foreignColumns: [roles.id],
                        name: "role_permissions_role_id_fkey"
                }).onDelete("cascade"),
        primaryKey({ columns: [table.roleId, table.permissionId], name: "role_permissions_pkey"}),
        pgPolicy("role_permissions_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.name = 'Admin'::text))))` }),
        pgPolicy("role_permissions_read", { as: "permissive", for: "select", to: ["authenticated"] }),
        pgPolicy("role_permissions_write", { as: "permissive", for: "insert", to: ["authenticated"] }),
]);

export const catalogItemManufacturers = pgTable("catalog_item_manufacturers", {
        catalogItemId: uuid("catalog_item_id").notNull(),
        manufacturerId: uuid("manufacturer_id").notNull(),
}, (table) => [
        foreignKey({
                        columns: [table.catalogItemId],
                        foreignColumns: [catalogItems.id],
                        name: "catalog_item_manufacturers_catalog_item_id_fkey"
                }).onDelete("cascade"),
        foreignKey({
                        columns: [table.manufacturerId],
                        foreignColumns: [manufacturers.id],
                        name: "catalog_item_manufacturers_manufacturer_id_fkey"
                }),
        primaryKey({ columns: [table.catalogItemId, table.manufacturerId], name: "catalog_item_manufacturers_pkey"}),
]);

export const users = pgTable("users", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        email: text().notNull(),
        fullName: text("full_name").notNull(),
        phone: text(),
        avatarUrl: text("avatar_url"),
        isActive: boolean("is_active").default(true).notNull(),
        lastLogin: timestamp("last_login", { withTimezone: true, mode: 'string' }),
        preferences: jsonb().default({}).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        unique("users_email_key").on(table.email),
        index("users_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
        pgPolicy("users_select", { as: "permissive", for: "select", to: ["authenticated"] }),
        pgPolicy("users_write", { as: "permissive", for: "all", to: ["authenticated"] }),
]);

export const userRoles = pgTable("user_roles", {
        userId: uuid("user_id").default(sql`auth.uid()`).notNull(),
        orgId: uuid("org_id").notNull(),
        roleId: uuid("role_id").notNull(),
}, (table) => [
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
        primaryKey({ columns: [table.userId, table.orgId, table.roleId], name: "user_roles_pkey"}),
        pgPolicy("user_roles_select", { as: "permissive", for: "select", to: ["public"], using: sql`((auth.uid() = user_id) OR is_org_admin(auth.uid(), org_id))` }),
        pgPolicy("user_roles_write", { as: "permissive", for: "all", to: ["public"] }),
]);
