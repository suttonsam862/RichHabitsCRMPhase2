// Schema updated to match actual database structure on 2025-09-11
// Aligned with business database - removed auth enums, added real business tables

import { pgTable, uuid, varchar, text, timestamp, boolean, integer, jsonb, decimal, date, index, unique, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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

// NOTE: audit_logs table is defined later as auditLogsDetailed with comprehensive schema

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
        actorUserId: varchar("actor_user_id"),
        payload: jsonb(),
        occurredAt: timestamp("occurred_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const designJobs = pgTable("design_jobs", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: varchar("org_id").notNull(),
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
        orgId: varchar("org_id").notNull(),
        orderItemId: uuid("order_item_id").notNull(),
        manufacturerId: uuid("manufacturer_id"),
        statusCode: text("status_code").default("pending"),
        priority: integer().default(5), // 1=highest, 10=lowest
        quantity: integer().notNull(),
        instructions: text(),
        estimatedCompletionDate: date("estimated_completion_date"),
        actualCompletionDate: date("actual_completion_date"),
        plannedStartDate: date("planned_start_date"),
        plannedDueDate: date("planned_due_date"),
        actualStartDate: timestamp("actual_start_date", { withTimezone: true, mode: 'string' }),
        actualEndDate: timestamp("actual_end_date", { withTimezone: true, mode: 'string' }),
        delayReason: text("delay_reason"),
        qualityNotes: text("quality_notes"),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => ({
        // Indexes for efficient filtering and RLS queries
        idxWorkOrdersOrgId: index("idx_work_orders_org_id").on(table.orgId),
        idxWorkOrdersOrderItemId: index("idx_work_orders_order_item_id").on(table.orderItemId),
        idxWorkOrdersManufacturerId: index("idx_work_orders_manufacturer_id").on(table.manufacturerId),
        idxWorkOrdersStatusCode: index("idx_work_orders_status_code").on(table.statusCode),
        idxWorkOrdersPlannedDue: index("idx_work_orders_planned_due").on(table.plannedDueDate),
        // Foreign key constraints
        fkWorkOrdersOrgId: foreignKey({
                columns: [table.orgId],
                foreignColumns: [organizations.id],
                name: "fk_work_orders_org_id"
        }),
        fkWorkOrdersOrderItemId: foreignKey({
                columns: [table.orderItemId],
                foreignColumns: [orderItems.id],
                name: "fk_work_orders_order_item_id"
        }).onDelete("cascade"),
        fkWorkOrdersManufacturerId: foreignKey({
                columns: [table.manufacturerId],
                foreignColumns: [manufacturers.id],
                name: "fk_work_orders_manufacturer_id"
        }).onDelete("set null"),
}));

// Materials and Supply Chain Tables

export const materials = pgTable("materials", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: varchar("org_id").notNull(),
        name: text().notNull(),
        sku: text(),
        description: text(),
        category: text(), // e.g., "fabric", "thread", "hardware", "dye"
        unit: text().notNull(), // e.g., "yards", "pieces", "lbs", "gallons"
        unitCost: decimal("unit_cost", { precision: 10, scale: 4 }), // Cost per unit
        reorderLevel: integer("reorder_level").default(0), // Minimum stock before reorder
        preferredSupplierId: uuid("preferred_supplier_id"), // FK to manufacturers (suppliers)
        leadTimeDays: integer("lead_time_days").default(7),
        moq: integer(), // Minimum order quantity
        specifications: jsonb(), // Material specs, color options, etc.
        isActive: boolean("is_active").default(true),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => ({
        idxMaterialsOrgId: index("idx_materials_org_id").on(table.orgId),
        idxMaterialsCategory: index("idx_materials_category").on(table.category),
        idxMaterialsSupplierId: index("idx_materials_supplier_id").on(table.preferredSupplierId),
        uniqMaterialsSku: unique("uniq_materials_sku").on(table.orgId, table.sku),
        fkMaterialsOrgId: foreignKey({
                columns: [table.orgId],
                foreignColumns: [organizations.id],
                name: "fk_materials_org_id"
        }),
        fkMaterialsSupplierId: foreignKey({
                columns: [table.preferredSupplierId],
                foreignColumns: [manufacturers.id],
                name: "fk_materials_supplier_id"
        }).onDelete("set null"),
}));

export const materialsInventory = pgTable("materials_inventory", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: varchar("org_id").notNull(),
        materialId: uuid("material_id").notNull(),
        quantityOnHand: decimal("quantity_on_hand", { precision: 12, scale: 4 }).default('0'),
        quantityReserved: decimal("quantity_reserved", { precision: 12, scale: 4 }).default('0'), // Allocated to orders
        quantityOnOrder: decimal("quantity_on_order", { precision: 12, scale: 4 }).default('0'), // In purchase orders
        lastUpdated: timestamp("last_updated", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        notes: text(),
}, (table) => ({
        idxInventoryOrgId: index("idx_inventory_org_id").on(table.orgId),
        idxInventoryMaterialId: index("idx_inventory_material_id").on(table.materialId),
        uniqInventoryMaterial: unique("uniq_inventory_material").on(table.orgId, table.materialId),
        fkInventoryOrgId: foreignKey({
                columns: [table.orgId],
                foreignColumns: [organizations.id],
                name: "fk_inventory_org_id"
        }),
        fkInventoryMaterialId: foreignKey({
                columns: [table.materialId],
                foreignColumns: [materials.id],
                name: "fk_inventory_material_id"
        }).onDelete("cascade"),
}));

export const materialRequirements = pgTable("material_requirements", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: varchar("org_id").notNull(),
        workOrderId: uuid("work_order_id").notNull(),
        materialId: uuid("material_id").notNull(),
        quantityNeeded: decimal("quantity_needed", { precision: 12, scale: 4 }).notNull(),
        quantityFulfilled: decimal("quantity_fulfilled", { precision: 12, scale: 4 }).default('0'),
        neededByDate: date("needed_by_date"),
        status: text().default("pending"), // pending, ordered, received, fulfilled
        notes: text(),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => ({
        idxRequirementsWorkOrderId: index("idx_requirements_work_order_id").on(table.workOrderId),
        idxRequirementsMaterialId: index("idx_requirements_material_id").on(table.materialId),
        idxRequirementsStatus: index("idx_requirements_status").on(table.status),
        fkRequirementsOrgId: foreignKey({
                columns: [table.orgId],
                foreignColumns: [organizations.id],
                name: "fk_requirements_org_id"
        }),
        fkRequirementsWorkOrderId: foreignKey({
                columns: [table.workOrderId],
                foreignColumns: [manufacturingWorkOrders.id],
                name: "fk_requirements_work_order_id"
        }).onDelete("cascade"),
        fkRequirementsMaterialId: foreignKey({
                columns: [table.materialId],
                foreignColumns: [materials.id],
                name: "fk_requirements_material_id"
        }).onDelete("cascade"),
}));

export const purchaseOrders = pgTable("purchase_orders", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: varchar("org_id").notNull(),
        poNumber: text("po_number").notNull(), // Human-friendly PO number (PO-YYYYMMDD-XXXX)
        supplierId: uuid("supplier_id").notNull(), // FK to manufacturers (acting as suppliers)
        supplierName: text("supplier_name").notNull(), // Snapshot for history
        supplierContactEmail: text("supplier_contact_email"),
        supplierContactPhone: text("supplier_contact_phone"),
        statusCode: text("status_code").default("draft"), // FK to status_purchase_orders
        totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).default('0'),
        approvalThreshold: decimal("approval_threshold", { precision: 10, scale: 2 }).default('1000'), // Amount requiring approval
        approvedBy: varchar("approved_by"), // User ID who approved
        approvedAt: timestamp("approved_at", { withTimezone: true, mode: 'string' }),
        orderDate: date("order_date"),
        expectedDeliveryDate: date("expected_delivery_date"),
        actualDeliveryDate: date("actual_delivery_date"),
        requestedBy: varchar("requested_by").notNull(), // User who created the PO
        assignedTo: varchar("assigned_to"), // User responsible for managing this PO
        priority: integer().default(3), // 1=urgent, 5=low
        currency: text().default("USD"),
        termsAndConditions: text("terms_and_conditions"),
        shippingAddress: jsonb("shipping_address"), // Address where items should be delivered
        notes: text(),
        internalNotes: text("internal_notes"), // Notes not visible to supplier
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => ({
        idxPurchaseOrdersOrgId: index("idx_purchase_orders_org_id").on(table.orgId),
        idxPurchaseOrdersSupplierId: index("idx_purchase_orders_supplier_id").on(table.supplierId),
        idxPurchaseOrdersStatusCode: index("idx_purchase_orders_status_code").on(table.statusCode),
        idxPurchaseOrdersRequestedBy: index("idx_purchase_orders_requested_by").on(table.requestedBy),
        idxPurchaseOrdersExpectedDelivery: index("idx_purchase_orders_expected_delivery").on(table.expectedDeliveryDate),
        uniqPurchaseOrdersNumber: unique("uniq_purchase_orders_number").on(table.orgId, table.poNumber),
        fkPurchaseOrdersOrgId: foreignKey({
                columns: [table.orgId],
                foreignColumns: [organizations.id],
                name: "fk_purchase_orders_org_id"
        }),
        fkPurchaseOrdersSupplierId: foreignKey({
                columns: [table.supplierId],
                foreignColumns: [manufacturers.id],
                name: "fk_purchase_orders_supplier_id"
        }).onDelete("restrict"), // Don't allow supplier deletion if active POs exist
        fkPurchaseOrdersRequestedBy: foreignKey({
                columns: [table.requestedBy],
                foreignColumns: [users.id],
                name: "fk_purchase_orders_requested_by"
        }).onDelete("set null"),
        fkPurchaseOrdersApprovedBy: foreignKey({
                columns: [table.approvedBy],
                foreignColumns: [users.id],
                name: "fk_purchase_orders_approved_by"
        }).onDelete("set null"),
        fkPurchaseOrdersAssignedTo: foreignKey({
                columns: [table.assignedTo],
                foreignColumns: [users.id],
                name: "fk_purchase_orders_assigned_to"
        }).onDelete("set null"),
}));

export const purchaseOrderItems = pgTable("purchase_order_items", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: varchar("org_id").notNull(),
        purchaseOrderId: uuid("purchase_order_id").notNull(),
        materialId: uuid("material_id"), // FK to materials, null for one-off items
        materialName: text("material_name").notNull(), // Snapshot for history
        materialSku: text("material_sku"), // Snapshot for history  
        description: text(),
        quantity: decimal({ precision: 12, scale: 4 }).notNull(),
        unit: text().notNull(), // e.g., "yards", "pieces", "lbs"
        unitCost: decimal("unit_cost", { precision: 10, scale: 4 }).notNull(),
        totalCost: decimal("total_cost", { precision: 10, scale: 2 }).notNull(), // quantity * unitCost
        quantityReceived: decimal("quantity_received", { precision: 12, scale: 4 }).default('0'),
        dateReceived: date("date_received"),
        receivedBy: varchar("received_by"), // User who marked as received
        qualityCheckPassed: boolean("quality_check_passed"),
        qualityNotes: text("quality_notes"),
        lineNumber: integer("line_number").notNull(), // Order of items in PO
        notes: text(),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => ({
        idxPurchaseOrderItemsPOId: index("idx_purchase_order_items_po_id").on(table.purchaseOrderId),
        idxPurchaseOrderItemsMaterialId: index("idx_purchase_order_items_material_id").on(table.materialId),
        idxPurchaseOrderItemsOrgId: index("idx_purchase_order_items_org_id").on(table.orgId),
        uniqPurchaseOrderItemsLine: unique("uniq_purchase_order_items_line").on(table.purchaseOrderId, table.lineNumber),
        fkPurchaseOrderItemsOrgId: foreignKey({
                columns: [table.orgId],
                foreignColumns: [organizations.id],
                name: "fk_purchase_order_items_org_id"
        }),
        fkPurchaseOrderItemsPOId: foreignKey({
                columns: [table.purchaseOrderId],
                foreignColumns: [purchaseOrders.id],
                name: "fk_purchase_order_items_po_id"
        }).onDelete("cascade"),
        fkPurchaseOrderItemsMaterialId: foreignKey({
                columns: [table.materialId],
                foreignColumns: [materials.id],
                name: "fk_purchase_order_items_material_id"
        }).onDelete("set null"),
        fkPurchaseOrderItemsReceivedBy: foreignKey({
                columns: [table.receivedBy],
                foreignColumns: [users.id],
                name: "fk_purchase_order_items_received_by"
        }).onDelete("set null"),
}));

export const purchaseOrderMilestones = pgTable("purchase_order_milestones", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: varchar("org_id").notNull(),
        purchaseOrderId: uuid("purchase_order_id").notNull(),
        milestoneCode: text("milestone_code").notNull(), // e.g., "order_placed", "acknowledged", "shipped", "delivered", "received"
        milestoneName: text("milestone_name").notNull(), // Human-readable name
        expectedDate: date("expected_date"),
        actualDate: timestamp("actual_date", { withTimezone: true, mode: 'string' }),
        status: text().default("pending"), // pending, completed, skipped, overdue
        completedBy: varchar("completed_by"), // User who marked milestone complete
        notes: text(),
        automaticallyTracked: boolean("automatically_tracked").default(false), // True if system sets this milestone
        notificationSent: boolean("notification_sent").default(false), // Track if reminder emails sent
        sortOrder: integer("sort_order").default(0), // Display order of milestones
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => ({
        idxPOMilestonesPOId: index("idx_po_milestones_po_id").on(table.purchaseOrderId),
        idxPOMilestonesStatus: index("idx_po_milestones_status").on(table.status),
        idxPOMilestonesExpectedDate: index("idx_po_milestones_expected_date").on(table.expectedDate),
        idxPOMilestonesCode: index("idx_po_milestones_code").on(table.milestoneCode),
        fkPOMilestonesOrgId: foreignKey({
                columns: [table.orgId],
                foreignColumns: [organizations.id],
                name: "fk_po_milestones_org_id"
        }),
        fkPOMilestonesPOId: foreignKey({
                columns: [table.purchaseOrderId],
                foreignColumns: [purchaseOrders.id],
                name: "fk_po_milestones_po_id"
        }).onDelete("cascade"),
        fkPOMilestonesCompletedBy: foreignKey({
                columns: [table.completedBy],
                foreignColumns: [users.id],
                name: "fk_po_milestones_completed_by"
        }).onDelete("set null"),
}));

export const purchaseOrderEvents = pgTable("purchase_order_events", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: varchar("org_id").notNull(),
        purchaseOrderId: uuid("purchase_order_id").notNull(),
        eventCode: text("event_code").notNull(), // e.g., "PO_CREATED", "PO_APPROVED", "PO_SENT", "PO_RECEIVED"
        actorUserId: varchar("actor_user_id"), // Who performed the action
        payload: jsonb(), // Event-specific data
        occurredAt: timestamp("occurred_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => ({
        idxPOEventsPOId: index("idx_po_events_po_id").on(table.purchaseOrderId),
        idxPOEventsEventCode: index("idx_po_events_event_code").on(table.eventCode),
        idxPOEventsOccurredAt: index("idx_po_events_occurred_at").on(table.occurredAt),
        fkPOEventsOrgId: foreignKey({
                columns: [table.orgId],
                foreignColumns: [organizations.id],
                name: "fk_po_events_org_id"
        }),
        fkPOEventsPOId: foreignKey({
                columns: [table.purchaseOrderId],
                foreignColumns: [purchaseOrders.id],
                name: "fk_po_events_po_id"
        }).onDelete("cascade"),
        fkPOEventsActorUserId: foreignKey({
                columns: [table.actorUserId],
                foreignColumns: [users.id],
                name: "fk_po_events_actor_user_id"
        }).onDelete("set null"),
}));

// Status lookup tables for purchase orders
export const statusPurchaseOrders = pgTable("status_purchase_orders", {
        code: text().primaryKey().notNull(),
        sortOrder: integer("sort_order").notNull(),
        isTerminal: boolean("is_terminal").default(false).notNull(),
        requiresApproval: boolean("requires_approval").default(false).notNull(), // If true, PO cannot progress until approved
});

export const supplierPerformanceMetrics = pgTable("supplier_performance_metrics", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: varchar("org_id").notNull(),
        supplierId: uuid("supplier_id").notNull(),
        periodStart: date("period_start").notNull(),
        periodEnd: date("period_end").notNull(),
        totalOrders: integer("total_orders").default(0),
        totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).default('0'),
        onTimeDeliveries: integer("on_time_deliveries").default(0),
        lateDeliveries: integer("late_deliveries").default(0),
        averageDeliveryDays: decimal("average_delivery_days", { precision: 5, scale: 2 }),
        qualityScore: decimal("quality_score", { precision: 3, scale: 2 }), // 1.00 to 5.00 rating
        qualityIssues: integer("quality_issues").default(0),
        communicationScore: decimal("communication_score", { precision: 3, scale: 2 }), // 1.00 to 5.00 rating
        overallRating: decimal("overall_rating", { precision: 3, scale: 2 }), // 1.00 to 5.00 rating
        notes: text(),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => ({
        idxSupplierMetricsOrgId: index("idx_supplier_metrics_org_id").on(table.orgId),
        idxSupplierMetricsSupplierId: index("idx_supplier_metrics_supplier_id").on(table.supplierId),
        idxSupplierMetricsPeriod: index("idx_supplier_metrics_period").on(table.periodStart, table.periodEnd),
        uniqSupplierMetricsPeriod: unique("uniq_supplier_metrics_period").on(table.orgId, table.supplierId, table.periodStart, table.periodEnd),
        fkSupplierMetricsOrgId: foreignKey({
                columns: [table.orgId],
                foreignColumns: [organizations.id],
                name: "fk_supplier_metrics_org_id"
        }),
        fkSupplierMetricsSupplierId: foreignKey({
                columns: [table.supplierId],
                foreignColumns: [manufacturers.id],
                name: "fk_supplier_metrics_supplier_id"
        }).onDelete("cascade"),
}));

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
        orderId: varchar("order_id").notNull(), // FK to orders.id (varchar)
        eventCode: text("event_code").notNull(),
        actorUserId: varchar("actor_user_id"),
        payload: jsonb(),
        occurredAt: timestamp("occurred_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => ({
        // Foreign key constraints
        fkOrderEventsOrderId: foreignKey({
                columns: [table.orderId],
                foreignColumns: [orders.id],
                name: "fk_order_events_order_id"
        }).onDelete("cascade"),
}));

export const orderItems = pgTable("order_items", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: varchar("org_id").notNull(), // FK to organizations.id (varchar)
        orderId: varchar("order_id").notNull(), // FK to orders.id (varchar)
        productId: uuid("product_id"), // FK to catalog_items.id
        variantId: uuid("variant_id"), // FK to product variant if applicable
        nameSnapshot: text("name_snapshot"), // Product name at time of order
        skuSnapshot: text("sku_snapshot"), // Product SKU at time of order
        priceSnapshot: decimal("price_snapshot", { precision: 10, scale: 2 }), // Unit price at order time
        quantity: integer().notNull(), // Quantity of this item ordered
        statusCode: text("status_code").default("pending_design"), // FK to status_order_items.code
        designerId: uuid("designer_id"), // FK to designers.id
        manufacturerId: uuid("manufacturer_id"), // FK to manufacturers.id
        pantoneJson: jsonb("pantone_json"), // Color codes and design data
        buildOverridesText: text("build_overrides_text"), // Special manufacturing instructions
        variantImageUrl: text("variant_image_url"), // Legacy field
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => ({
        // Indexes for efficient filtering and RLS queries
        idxOrderItemsOrderId: index("idx_order_items_order_id").on(table.orderId),
        idxOrderItemsStatusCode: index("idx_order_items_status_code").on(table.statusCode),
        idxOrderItemsProductId: index("idx_order_items_product_id").on(table.productId),
        idxOrderItemsOrgId: index("idx_order_items_org_id").on(table.orgId),
        // Foreign key constraints
        fkOrderItemsOrderId: foreignKey({
                columns: [table.orderId],
                foreignColumns: [orders.id],
                name: "fk_order_items_order_id"
        }).onDelete("cascade"),
        fkOrderItemsOrgId: foreignKey({
                columns: [table.orgId],
                foreignColumns: [organizations.id],
                name: "fk_order_items_org_id"
        }),
        fkOrderItemsDesignerId: foreignKey({
                columns: [table.designerId],
                foreignColumns: [designers.id],
                name: "fk_order_items_designer_id"
        }).onDelete("set null"),
        fkOrderItemsManufacturerId: foreignKey({
                columns: [table.manufacturerId],
                foreignColumns: [manufacturers.id],
                name: "fk_order_items_manufacturer_id"
        }).onDelete("set null"),
}));

export const orderItemSizes = pgTable("order_item_sizes", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orderItemId: uuid("order_item_id").notNull(),
        sizeCode: text("size_code").notNull(),
        quantity: integer().notNull(),
});

export const orders = pgTable("orders", {
        id: varchar().primaryKey().notNull(),
        orgId: varchar("org_id").notNull(), // FK to organizations.id (varchar)
        customerId: uuid("customer_id").notNull(), // FK to customers.id (uuid) - REQUIRED
        salespersonId: varchar("salesperson_id"), // FK to users.id (varchar)
        sportId: uuid("sport_id"), // FK to sports.id (uuid)
        code: text().notNull(), // Unique order number (ORD-YYYYMMDD-XXXX format)
        customerContactName: text("customer_contact_name"),
        customerContactEmail: text("customer_contact_email"),
        customerContactPhone: text("customer_contact_phone"),
        statusCode: text("status_code").default("draft"), // FK to status_orders.code
        totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
        revenueEstimate: decimal("revenue_estimate", { precision: 10, scale: 2 }),
        dueDate: date("due_date"),
        notes: text(),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        // Legacy fields - keep for backwards compatibility
        organizationId: varchar("organization_id").notNull(), // Legacy alias for org_id
        orderNumber: text("order_number").notNull(), // Legacy alias for code
        customerName: text("customer_name").notNull(), // Legacy field
        items: jsonb(), // Legacy field
        teamName: text("team_name"), // Legacy field
}, (table) => ({
        // Indexes for efficient filtering and RLS queries
        idxOrdersOrgId: index("idx_orders_org_id").on(table.orgId),
        idxOrdersCustomerId: index("idx_orders_customer_id").on(table.customerId),
        idxOrdersStatusCode: index("idx_orders_status_code").on(table.statusCode),
        idxOrdersSalespersonId: index("idx_orders_salesperson_id").on(table.salespersonId),
        // Unique constraint on order code (order number)
        uniqOrdersCode: unique("uniq_orders_code").on(table.code),
        // Foreign key constraints
        fkOrdersOrgId: foreignKey({
                columns: [table.orgId],
                foreignColumns: [organizations.id],
                name: "fk_orders_org_id"
        }),
        fkOrdersCustomerId: foreignKey({
                columns: [table.customerId],
                foreignColumns: [customers.id],
                name: "fk_orders_customer_id"
        }),
        fkOrdersSalespersonId: foreignKey({
                columns: [table.salespersonId],
                foreignColumns: [users.id],
                name: "fk_orders_salesperson_id"
        }).onDelete("set null"),
}));

export const organizationFavorites = pgTable("organization_favorites", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        userId: uuid("user_id").notNull(), // FK to users.id (varchar) - type mismatch!
        organizationId: uuid("organization_id").notNull(), // FK to organizations.id (varchar) - type mismatch!
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const organizationMetrics = pgTable("organization_metrics", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: varchar("org_id").notNull(),
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
        createdBy: uuid("created_by"),
        isActive: boolean("is_active").default(true),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const productionEvents = pgTable("production_events", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: varchar("org_id").notNull(), // CRITICAL: Added for RLS and tenancy
        workOrderId: uuid("work_order_id").notNull(),
        eventCode: text("event_code").notNull(),
        actorUserId: varchar("actor_user_id"),
        payload: jsonb(),
        occurredAt: timestamp("occurred_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => ({
        // Indexes for efficient event queries
        idxProductionEventsWorkOrderId: index("idx_production_events_work_order_id").on(table.workOrderId),
        idxProductionEventsEventCode: index("idx_production_events_event_code").on(table.eventCode),
        idxProductionEventsOccurredAt: index("idx_production_events_occurred_at").on(table.occurredAt),
        // Foreign key constraints
        fkProductionEventsWorkOrderId: foreignKey({
                columns: [table.workOrderId],
                foreignColumns: [manufacturingWorkOrders.id],
                name: "fk_production_events_work_order_id"
        }).onDelete("cascade"),
}));

export const productionMilestones = pgTable("production_milestones", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: varchar("org_id").notNull(), // CRITICAL: Added for RLS and tenancy
        workOrderId: uuid("work_order_id").notNull(),
        milestoneCode: text("milestone_code").notNull(),
        milestoneName: text("milestone_name").notNull(),
        targetDate: date("target_date"),
        actualDate: timestamp("actual_date", { withTimezone: true, mode: 'string' }),
        status: text().default("pending"), // pending, in_progress, completed, skipped
        notes: text(),
        completedBy: varchar("completed_by"),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => ({
        // Indexes for milestone tracking
        idxMilestonesWorkOrderId: index("idx_milestones_work_order_id").on(table.workOrderId),
        idxMilestonesStatus: index("idx_milestones_status").on(table.status),
        idxMilestonesTargetDate: index("idx_milestones_target_date").on(table.targetDate),
        // Foreign key constraints
        fkMilestonesWorkOrderId: foreignKey({
                columns: [table.workOrderId],
                foreignColumns: [manufacturingWorkOrders.id],
                name: "fk_milestones_work_order_id"
        }).onDelete("cascade"),
        // TODO: Re-enable after users.id type is standardized
        // fkMilestonesCompletedBy: foreignKey({
        //         columns: [table.completedBy],
        //         foreignColumns: [users.id],
        //         name: "fk_milestones_completed_by"
        // }).onDelete("set null"),
}));

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
        userId: uuid("user_id").notNull(), // FK to users.id (varchar) - type mismatch!
        roleId: uuid("role_id").notNull(),
        orgId: varchar("org_id"), // FK to organizations.id (varchar) - fixed!
        assignedAt: timestamp("assigned_at", { withTimezone: true, mode: 'string' }).defaultNow(),
        assignedBy: uuid("assigned_by"),
});

// Organization membership table for proper access control
export const organizationMemberships = pgTable("organization_memberships", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        userId: uuid("user_id").notNull(), // FK to users.id (varchar) - type mismatch!
        organizationId: uuid("organization_id").notNull(), // FK to organizations.id (varchar) - type mismatch!
        role: varchar({ length: 50 }).notNull().default('member'), // owner, admin, member, readonly
        isActive: boolean("is_active").notNull().default(true),
        joinedAt: timestamp("joined_at", { withTimezone: true, mode: 'string' }).defaultNow(),
        invitedBy: uuid("invited_by"),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
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
        createdBy: uuid("created_by"),
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

// Settings Management Tables

export const systemRegions = pgTable("system_regions", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        name: varchar({ length: 100 }).notNull(),
        code: varchar({ length: 10 }).notNull(),
        country: varchar({ length: 100 }).default('US'),
        isActive: boolean("is_active").default(true),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const performanceTiers = pgTable("performance_tiers", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        name: varchar({ length: 100 }).notNull(),
        slug: varchar({ length: 100 }).notNull(),
        description: text(),
        commissionMultiplier: decimal("commission_multiplier", { precision: 3, scale: 2 }).default('1.00'),
        isActive: boolean("is_active").default(true),
        sortOrder: integer("sort_order").default(0),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const systemSettings = pgTable("system_settings", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        category: varchar({ length: 50 }).notNull(),
        key: varchar({ length: 100 }).notNull(),
        value: jsonb(),
        dataType: varchar("data_type", { length: 20 }).default('string'),
        description: text(),
        isActive: boolean("is_active").default(true),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

// Fulfillment & Order Completion Tables

export const fulfillmentEvents = pgTable("fulfillment_events", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: varchar("org_id").notNull(),
        orderId: varchar("order_id").notNull(),
        orderItemId: uuid("order_item_id"), // Optional - for item-specific events
        workOrderId: uuid("work_order_id"), // Optional - link to manufacturing
        eventCode: text("event_code").notNull(), // e.g., 'FULFILL_STARTED', 'PACKED', 'SHIPPED', 'DELIVERED', 'COMPLETED'
        eventType: text("event_type").notNull().default('status_change'), // status_change, milestone, quality_check, notification
        statusBefore: text("status_before"),
        statusAfter: text("status_after"),
        actorUserId: varchar("actor_user_id"), // Who performed the action
        notes: text(),
        metadata: jsonb(), // Additional event data (tracking numbers, quality scores, etc.)
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => ({
        idxFulfillmentEventsOrgId: index("idx_fulfillment_events_org_id").on(table.orgId),
        idxFulfillmentEventsOrderId: index("idx_fulfillment_events_order_id").on(table.orderId),
        idxFulfillmentEventsEventCode: index("idx_fulfillment_events_event_code").on(table.eventCode),
        idxFulfillmentEventsCreatedAt: index("idx_fulfillment_events_created_at").on(table.createdAt),
        fkFulfillmentEventsOrgId: foreignKey({
                columns: [table.orgId],
                foreignColumns: [organizations.id],
                name: "fk_fulfillment_events_org_id"
        }),
        fkFulfillmentEventsOrderId: foreignKey({
                columns: [table.orderId],
                foreignColumns: [orders.id],
                name: "fk_fulfillment_events_order_id"
        }).onDelete("cascade"),
}));

export const shippingInfo = pgTable("shipping_info", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: varchar("org_id").notNull(),
        orderId: varchar("order_id").notNull(),
        shipmentNumber: text("shipment_number"), // Internal shipment identifier
        carrier: text().notNull(), // e.g., 'UPS', 'FedEx', 'USPS', 'DHL'
        service: text(), // e.g., 'Ground', 'Express', 'Overnight'
        trackingNumber: text("tracking_number"),
        trackingUrl: text("tracking_url"),
        labelUrl: text("label_url"), // URL to shipping label PDF
        shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }),
        weight: decimal({ precision: 10, scale: 3 }), // Package weight
        dimensions: jsonb(), // { length, width, height, unit }
        shippingAddress: jsonb("shipping_address"), // Complete shipping address
        originAddress: jsonb("origin_address"), // Warehouse/shipping origin
        estimatedDeliveryDate: date("estimated_delivery_date"),
        actualDeliveryDate: date("actual_delivery_date"),
        deliveryInstructions: text("delivery_instructions"),
        requiresSignature: boolean("requires_signature").default(false),
        isInsured: boolean("is_insured").default(false),
        insuranceAmount: decimal("insurance_amount", { precision: 10, scale: 2 }),
        statusCode: text("status_code").default('preparing'), // preparing, shipped, in_transit, delivered, exception
        deliveryAttempts: integer("delivery_attempts").default(0),
        lastStatusUpdate: timestamp("last_status_update", { withTimezone: true, mode: 'string' }),
        notes: text(),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => ({
        idxShippingInfoOrgId: index("idx_shipping_info_org_id").on(table.orgId),
        idxShippingInfoOrderId: index("idx_shipping_info_order_id").on(table.orderId),
        idxShippingInfoTrackingNumber: index("idx_shipping_info_tracking_number").on(table.trackingNumber),
        idxShippingInfoStatusCode: index("idx_shipping_info_status_code").on(table.statusCode),
        uniqShippingInfoTrackingNumber: unique("uniq_shipping_info_tracking_number").on(table.trackingNumber),
        fkShippingInfoOrgId: foreignKey({
                columns: [table.orgId],
                foreignColumns: [organizations.id],
                name: "fk_shipping_info_org_id"
        }),
        fkShippingInfoOrderId: foreignKey({
                columns: [table.orderId],
                foreignColumns: [orders.id],
                name: "fk_shipping_info_order_id"
        }).onDelete("cascade"),
}));

export const completionRecords = pgTable("completion_records", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: varchar("org_id").notNull(),
        orderId: varchar("order_id").notNull(),
        completionType: text("completion_type").notNull(), // 'automatic', 'manual', 'exception'
        completedBy: varchar("completed_by"), // User who marked as completed
        completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }).notNull(),
        verificationMethod: text("verification_method"), // 'delivery_confirmation', 'customer_feedback', 'manual_verification'
        deliveryConfirmed: boolean("delivery_confirmed").default(false),
        customerSatisfactionScore: integer("customer_satisfaction_score"), // 1-5 rating
        customerFeedback: text("customer_feedback"),
        qualityScore: decimal("quality_score", { precision: 3, scale: 2 }), // Overall quality score
        defectsReported: integer("defects_reported").default(0),
        reworkRequired: boolean("rework_required").default(false),
        reworkNotes: text("rework_notes"),
        completionCertificateUrl: text("completion_certificate_url"), // PDF certificate
        invoiceGenerated: boolean("invoice_generated").default(false),
        invoiceId: uuid("invoice_id"), // FK to accounting_invoices.id
        finalPaymentCaptured: boolean("final_payment_captured").default(false),
        archivedAt: timestamp("archived_at", { withTimezone: true, mode: 'string' }),
        metadata: jsonb(), // Additional completion data
        notes: text(),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => ({
        idxCompletionRecordsOrgId: index("idx_completion_records_org_id").on(table.orgId),
        idxCompletionRecordsOrderId: index("idx_completion_records_order_id").on(table.orderId),
        idxCompletionRecordsCompletedAt: index("idx_completion_records_completed_at").on(table.completedAt),
        idxCompletionRecordsCompletionType: index("idx_completion_records_completion_type").on(table.completionType),
        uniqCompletionRecordsOrderId: unique("uniq_completion_records_order_id").on(table.orderId),
        fkCompletionRecordsOrgId: foreignKey({
                columns: [table.orgId],
                foreignColumns: [organizations.id],
                name: "fk_completion_records_org_id"
        }),
        fkCompletionRecordsOrderId: foreignKey({
                columns: [table.orderId],
                foreignColumns: [orders.id],
                name: "fk_completion_records_order_id"
        }).onDelete("cascade"),
        fkCompletionRecordsInvoiceId: foreignKey({
                columns: [table.invoiceId],
                foreignColumns: [accountingInvoices.id],
                name: "fk_completion_records_invoice_id"
        }).onDelete("set null"),
}));

export const qualityChecks = pgTable("quality_checks", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: varchar("org_id").notNull(),
        orderId: varchar("order_id").notNull(),
        orderItemId: uuid("order_item_id"), // Optional - for item-specific checks
        workOrderId: uuid("work_order_id"), // Link to manufacturing work order
        checkType: text("check_type").notNull(), // 'pre_production', 'in_production', 'final_inspection', 'pre_shipment'
        checklistId: uuid("checklist_id"), // FK to quality checklist template
        checkedBy: varchar("checked_by").notNull(), // User who performed quality check
        checkedAt: timestamp("checked_at", { withTimezone: true, mode: 'string' }).notNull(),
        overallResult: text("overall_result").notNull(), // 'pass', 'fail', 'conditional'
        qualityScore: decimal("quality_score", { precision: 3, scale: 2 }), // 0.00 to 5.00
        defectsFound: integer("defects_found").default(0),
        criticalDefects: integer("critical_defects").default(0),
        minorDefects: integer("minor_defects").default(0),
        checkResults: jsonb("check_results"), // Detailed checklist results
        defectDetails: jsonb("defect_details"), // Array of defect descriptions
        correctionRequired: boolean("correction_required").default(false),
        correctionInstructions: text("correction_instructions"),
        correctedBy: varchar("corrected_by"),
        correctedAt: timestamp("corrected_at", { withTimezone: true, mode: 'string' }),
        reworkRequired: boolean("rework_required").default(false),
        reworkInstructions: text("rework_instructions"),
        photoUrls: text("photo_urls").array(), // Quality check photos
        approvedBy: varchar("approved_by"),
        approvedAt: timestamp("approved_at", { withTimezone: true, mode: 'string' }),
        notes: text(),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => ({
        idxQualityChecksOrgId: index("idx_quality_checks_org_id").on(table.orgId),
        idxQualityChecksOrderId: index("idx_quality_checks_order_id").on(table.orderId),
        idxQualityChecksWorkOrderId: index("idx_quality_checks_work_order_id").on(table.workOrderId),
        idxQualityChecksCheckType: index("idx_quality_checks_check_type").on(table.checkType),
        idxQualityChecksResult: index("idx_quality_checks_result").on(table.overallResult),
        idxQualityChecksCheckedAt: index("idx_quality_checks_checked_at").on(table.checkedAt),
        fkQualityChecksOrgId: foreignKey({
                columns: [table.orgId],
                foreignColumns: [organizations.id],
                name: "fk_quality_checks_org_id"
        }),
        fkQualityChecksOrderId: foreignKey({
                columns: [table.orderId],
                foreignColumns: [orders.id],
                name: "fk_quality_checks_order_id"
        }).onDelete("cascade"),
        fkQualityChecksWorkOrderId: foreignKey({
                columns: [table.workOrderId],
                foreignColumns: [manufacturingWorkOrders.id],
                name: "fk_quality_checks_work_order_id"
        }).onDelete("cascade"),
}));

export const fulfillmentMilestones = pgTable("fulfillment_milestones", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: varchar("org_id").notNull(),
        orderId: varchar("order_id").notNull(),
        milestoneCode: text("milestone_code").notNull(), // 'ORDER_CONFIRMED', 'DESIGN_APPROVED', 'MANUFACTURING_STARTED', 'QUALITY_PASSED', 'SHIPPED', 'DELIVERED', 'COMPLETED'
        milestoneName: text("milestone_name").notNull(),
        milestoneType: text("milestone_type").notNull().default('standard'), // standard, quality_gate, approval_gate, notification
        status: text().notNull().default('pending'), // pending, in_progress, completed, skipped, blocked
        dependsOn: text("depends_on").array(), // Array of milestone codes this depends on
        plannedDate: date("planned_date"),
        startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
        completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
        completedBy: varchar("completed_by"),
        durationMinutes: integer("duration_minutes"), // Actual duration to complete
        blockedReason: text("blocked_reason"),
        notes: text(),
        metadata: jsonb(), // Additional milestone data
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => ({
        idxFulfillmentMilestonesOrgId: index("idx_fulfillment_milestones_org_id").on(table.orgId),
        idxFulfillmentMilestonesOrderId: index("idx_fulfillment_milestones_order_id").on(table.orderId),
        idxFulfillmentMilestonesMilestoneCode: index("idx_fulfillment_milestones_milestone_code").on(table.milestoneCode),
        idxFulfillmentMilestonesStatus: index("idx_fulfillment_milestones_status").on(table.status),
        idxFulfillmentMilestonesPlannedDate: index("idx_fulfillment_milestones_planned_date").on(table.plannedDate),
        uniqFulfillmentMilestonesOrderMilestone: unique("uniq_fulfillment_milestones_order_milestone").on(table.orderId, table.milestoneCode),
        fkFulfillmentMilestonesOrgId: foreignKey({
                columns: [table.orgId],
                foreignColumns: [organizations.id],
                name: "fk_fulfillment_milestones_org_id"
        }),
        fkFulfillmentMilestonesOrderId: foreignKey({
                columns: [table.orderId],
                foreignColumns: [orders.id],
                name: "fk_fulfillment_milestones_order_id"
        }).onDelete("cascade"),
}));

// Shipment tables for partial fulfillment support
export const shipments = pgTable("shipments", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: varchar("org_id").notNull(),
        orderId: varchar("order_id").notNull(),
        shipmentNumber: text("shipment_number").notNull(), // Human-readable shipment ID
        carrier: text().notNull(),
        service: text(),
        trackingNumber: text("tracking_number"),
        trackingUrl: text("tracking_url"),
        labelUrl: text("label_url"),
        shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }),
        weight: decimal({ precision: 10, scale: 3 }),
        dimensions: jsonb(),
        shippingAddress: jsonb("shipping_address").notNull(),
        originAddress: jsonb("origin_address"),
        estimatedDeliveryDate: date("estimated_delivery_date"),
        actualDeliveryDate: date("actual_delivery_date"),
        deliveryInstructions: text("delivery_instructions"),
        requiresSignature: boolean("requires_signature").default(false),
        isInsured: boolean("is_insured").default(false),
        insuranceAmount: decimal("insurance_amount", { precision: 10, scale: 2 }),
        statusCode: text("status_code").default('preparing'),
        deliveryAttempts: integer("delivery_attempts").default(0),
        lastStatusUpdate: timestamp("last_status_update", { withTimezone: true, mode: 'string' }),
        shippedAt: timestamp("shipped_at", { withTimezone: true, mode: 'string' }),
        deliveredAt: timestamp("delivered_at", { withTimezone: true, mode: 'string' }),
        notes: text(),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => ({
        idxShipmentsOrgId: index("idx_shipments_org_id").on(table.orgId),
        idxShipmentsOrderId: index("idx_shipments_order_id").on(table.orderId),
        idxShipmentsTrackingNumber: index("idx_shipments_tracking_number").on(table.trackingNumber),
        idxShipmentsStatusCode: index("idx_shipments_status_code").on(table.statusCode),
        uniqShipmentsTrackingNumber: unique("uniq_shipments_tracking_number").on(table.trackingNumber),
        uniqShipmentsNumber: unique("uniq_shipments_number").on(table.orgId, table.shipmentNumber),
        fkShipmentsOrgId: foreignKey({
                columns: [table.orgId],
                foreignColumns: [organizations.id],
                name: "fk_shipments_org_id"
        }),
        fkShipmentsOrderId: foreignKey({
                columns: [table.orderId],
                foreignColumns: [orders.id],
                name: "fk_shipments_order_id"
        }).onDelete("cascade"),
}));

export const shipmentItems = pgTable("shipment_items", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: varchar("org_id").notNull(),
        shipmentId: uuid("shipment_id").notNull(),
        orderItemId: uuid("order_item_id").notNull(),
        quantity: integer().notNull(),
        notes: text(),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => ({
        idxShipmentItemsOrgId: index("idx_shipment_items_org_id").on(table.orgId),
        idxShipmentItemsShipmentId: index("idx_shipment_items_shipment_id").on(table.shipmentId),
        idxShipmentItemsOrderItemId: index("idx_shipment_items_order_item_id").on(table.orderItemId),
        uniqShipmentItemsOrderItem: unique("uniq_shipment_items_order_item").on(table.shipmentId, table.orderItemId),
        fkShipmentItemsOrgId: foreignKey({
                columns: [table.orgId],
                foreignColumns: [organizations.id],
                name: "fk_shipment_items_org_id"
        }),
        fkShipmentItemsShipmentId: foreignKey({
                columns: [table.shipmentId],
                foreignColumns: [shipments.id],
                name: "fk_shipment_items_shipment_id"
        }).onDelete("cascade"),
        fkShipmentItemsOrderItemId: foreignKey({
                columns: [table.orderItemId],
                foreignColumns: [orderItems.id],
                name: "fk_shipment_items_order_item_id"
        }).onDelete("cascade"),
}));

export const statusFulfillment = pgTable("status_fulfillment", {
        code: text().primaryKey().notNull(),
        name: text().notNull(),
        description: text(),
        sortOrder: integer("sort_order").notNull(),
        isTerminal: boolean("is_terminal").default(false).notNull(),
        colorCode: text("color_code"), // For UI display
        iconName: text("icon_name"), // For UI display
});

export const statusShipping = pgTable("status_shipping", {
        code: text().primaryKey().notNull(),
        name: text().notNull(),
        description: text(),
        sortOrder: integer("sort_order").notNull(),
        isTerminal: boolean("is_terminal").default(false).notNull(),
        colorCode: text("color_code"), // For UI display
        iconName: text("icon_name"), // For UI display
});

// Notifications and Real-Time System Tables

export const notifications = pgTable("notifications", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: varchar("org_id").notNull(),
        userId: varchar("user_id").notNull(),
        type: varchar({ length: 50 }).notNull(), // info, success, warning, error, order_update, design_update, etc.
        title: varchar({ length: 255 }).notNull(),
        message: text().notNull(),
        data: jsonb(), // Additional structured data (order_id, item_id, etc.)
        isRead: boolean("is_read").default(false),
        readAt: timestamp("read_at", { withTimezone: true, mode: 'string' }),
        category: varchar({ length: 50 }).default('general'), // order, design, manufacturing, fulfillment, system, etc.
        priority: varchar({ length: 20 }).default('normal'), // low, normal, high, urgent
        actionUrl: varchar("action_url"), // URL to navigate to when notification is clicked
        expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
        metadata: jsonb(), // Additional metadata for real-time events
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => ({
        idxNotificationsOrgId: index("idx_notifications_org_id").on(table.orgId),
        idxNotificationsUserId: index("idx_notifications_user_id").on(table.userId),
        idxNotificationsType: index("idx_notifications_type").on(table.type),
        idxNotificationsIsRead: index("idx_notifications_is_read").on(table.isRead),
        idxNotificationsCreatedAt: index("idx_notifications_created_at").on(table.createdAt),
        idxNotificationsCategory: index("idx_notifications_category").on(table.category),
        fkNotificationsOrgId: foreignKey({
                columns: [table.orgId],
                foreignColumns: [organizations.id],
                name: "fk_notifications_org_id"
        }),
        fkNotificationsUserId: foreignKey({
                columns: [table.userId],
                foreignColumns: [users.id],
                name: "fk_notifications_user_id"
        }).onDelete("cascade"),
}));

export const notificationPreferences = pgTable("notification_preferences", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        userId: varchar("user_id").notNull(),
        category: varchar({ length: 50 }).notNull(), // order, design, manufacturing, fulfillment, system
        channel: varchar({ length: 20 }).notNull(), // real_time, email, sms, push
        isEnabled: boolean("is_enabled").default(true),
        settings: jsonb(), // Additional channel-specific settings
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => ({
        idxNotificationPrefsUserId: index("idx_notification_prefs_user_id").on(table.userId),
        idxNotificationPrefsCategory: index("idx_notification_prefs_category").on(table.category),
        uniqNotificationPrefs: unique("uniq_notification_prefs").on(table.userId, table.category, table.channel),
        fkNotificationPrefsUserId: foreignKey({
                columns: [table.userId],
                foreignColumns: [users.id],
                name: "fk_notification_prefs_user_id"
        }).onDelete("cascade"),
}));

export const realtimeEvents = pgTable("realtime_events", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        orgId: varchar("org_id").notNull(),
        eventType: varchar("event_type", { length: 100 }).notNull(), // order_created, order_updated, design_job_assigned, etc.
        entityType: varchar("entity_type", { length: 50 }).notNull(), // order, order_item, design_job, work_order, etc.
        entityId: varchar("entity_id").notNull(),
        actorUserId: varchar("actor_user_id"), // User who triggered the event
        eventData: jsonb(), // Event payload data
        broadcastToUsers: text("broadcast_to_users").array(), // Specific user IDs to broadcast to
        broadcastToRoles: text("broadcast_to_roles").array(), // Roles to broadcast to
        isBroadcast: boolean("is_broadcast").default(true),
        processedAt: timestamp("processed_at", { withTimezone: true, mode: 'string' }),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => ({
        idxRealtimeEventsOrgId: index("idx_realtime_events_org_id").on(table.orgId),
        idxRealtimeEventsEventType: index("idx_realtime_events_event_type").on(table.eventType),
        idxRealtimeEventsEntityType: index("idx_realtime_events_entity_type").on(table.entityType),
        idxRealtimeEventsEntityId: index("idx_realtime_events_entity_id").on(table.entityId),
        idxRealtimeEventsCreatedAt: index("idx_realtime_events_created_at").on(table.createdAt),
        fkRealtimeEventsOrgId: foreignKey({
                columns: [table.orgId],
                foreignColumns: [organizations.id],
                name: "fk_realtime_events_org_id"
        }),
        fkRealtimeEventsActorUserId: foreignKey({
                columns: [table.actorUserId],
                foreignColumns: [users.id],
                name: "fk_realtime_events_actor_user_id"
        }).onDelete("set null"),
}));

// Security and Audit Tables

export const auditLogsDetailed = pgTable("audit_logs", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        userId: varchar("user_id"), // User who performed the action
        organizationId: varchar("organization_id"), // Organization context
        operation: varchar({ length: 100 }).notNull(), // CREATE, UPDATE, DELETE, etc.
        entityType: varchar("entity_type", { length: 50 }).notNull(), // order, user, etc.
        entityId: varchar("entity_id"), // ID of the affected entity
        previousState: jsonb("previous_state"), // State before the operation
        newState: jsonb("new_state"), // State after the operation
        requestMethod: varchar("request_method", { length: 10 }), // GET, POST, etc.
        requestPath: varchar("request_path", { length: 500 }), // API endpoint path
        statusCode: integer("status_code"), // HTTP response code
        success: boolean().notNull().default(false), // Whether operation succeeded
        ipAddress: varchar("ip_address", { length: 45 }), // IPv4/IPv6 address
        userAgent: text("user_agent"), // Browser/client info
        sessionId: varchar("session_id", { length: 100 }), // Session identifier
        metadata: jsonb(), // Additional context data
        riskScore: integer("risk_score"), // Computed risk score (1-100)
        flagged: boolean().default(false), // Flagged for review
        reviewedBy: varchar("reviewed_by"), // Admin who reviewed
        reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: 'string' }),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => ({
        idxAuditLogsUserId: index("idx_audit_logs_user_id").on(table.userId),
        idxAuditLogsOrgId: index("idx_audit_logs_org_id").on(table.organizationId),
        idxAuditLogsOperation: index("idx_audit_logs_operation").on(table.operation),
        idxAuditLogsEntityType: index("idx_audit_logs_entity_type").on(table.entityType),
        idxAuditLogsEntityId: index("idx_audit_logs_entity_id").on(table.entityId),
        idxAuditLogsCreatedAt: index("idx_audit_logs_created_at").on(table.createdAt),
        idxAuditLogsSuccess: index("idx_audit_logs_success").on(table.success),
        idxAuditLogsFlagged: index("idx_audit_logs_flagged").on(table.flagged),
        idxAuditLogsRiskScore: index("idx_audit_logs_risk_score").on(table.riskScore),
        fkAuditLogsUserId: foreignKey({
                columns: [table.userId],
                foreignColumns: [users.id],
                name: "fk_audit_logs_user_id"
        }).onDelete("set null"),
        fkAuditLogsOrgId: foreignKey({
                columns: [table.organizationId],
                foreignColumns: [organizations.id],
                name: "fk_audit_logs_org_id"
        }).onDelete("cascade"),
}));

export const securityEvents = pgTable("security_events", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        eventType: varchar("event_type", { length: 50 }).notNull(), // PERMISSION_DENIED, RATE_LIMIT_EXCEEDED, etc.
        severity: varchar({ length: 20 }).notNull().default('medium'), // low, medium, high, critical
        userId: varchar("user_id"), // User involved in the event
        organizationId: varchar("organization_id"), // Organization context
        ipAddress: varchar("ip_address", { length: 45 }),
        userAgent: text("user_agent"),
        requestPath: varchar("request_path", { length: 500 }),
        details: jsonb(), // Event-specific details
        resolved: boolean().default(false),
        resolvedBy: varchar("resolved_by"),
        resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: 'string' }),
        resolution: text(), // Resolution notes
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => ({
        idxSecurityEventsType: index("idx_security_events_type").on(table.eventType),
        idxSecurityEventsSeverity: index("idx_security_events_severity").on(table.severity),
        idxSecurityEventsUserId: index("idx_security_events_user_id").on(table.userId),
        idxSecurityEventsOrgId: index("idx_security_events_org_id").on(table.organizationId),
        idxSecurityEventsCreatedAt: index("idx_security_events_created_at").on(table.createdAt),
        idxSecurityEventsResolved: index("idx_security_events_resolved").on(table.resolved),
        fkSecurityEventsUserId: foreignKey({
                columns: [table.userId],
                foreignColumns: [users.id],
                name: "fk_security_events_user_id"
        }).onDelete("set null"),
        fkSecurityEventsOrgId: foreignKey({
                columns: [table.organizationId],
                foreignColumns: [organizations.id],
                name: "fk_security_events_org_id"
        }).onDelete("cascade"),
}));


// Zod schemas for new tables
export const insertAuditLogSchema = createInsertSchema(auditLogsDetailed);
export const insertSecurityEventSchema = createInsertSchema(securityEvents);

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type InsertSecurityEvent = z.infer<typeof insertSecurityEventSchema>;
export type SelectAuditLog = typeof auditLogsDetailed.$inferSelect;
export type SelectAuditLogDetailed = typeof auditLogsDetailed.$inferSelect;
// Alias for backward compatibility
export const auditLogs = auditLogsDetailed;
export type SelectSecurityEvent = typeof securityEvents.$inferSelect;

// All tables are already exported above where they are defined