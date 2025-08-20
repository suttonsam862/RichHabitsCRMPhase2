// Schema auto-pulled on 2025-08-20T20:13:53.948Z
// This file was automatically generated from the database

import { pgTable, unique, varchar, text, timestamp, index, check, jsonb, boolean, foreignKey, numeric, uuid, date } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const users = pgTable("users", {
        id: varchar().default(sql`gen_random_uuid()`).primaryKey().notNull(),
        username: text().notNull(),
        password: text().notNull(),
        role: text().default('admin').notNull(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        unique("users_username_unique").on(table.username),
]);

export const organizations = pgTable("organizations", {
        id: varchar().default(sql`gen_random_uuid()`).primaryKey().notNull(),
        name: text().notNull(),
        logoUrl: text("logo_url"),
        state: text(),
        address: text(),
        phone: text(),
        email: text(),
        universalDiscounts: jsonb("universal_discounts"),
        notes: text(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
        isBusiness: boolean("is_business").default(false),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        titleCardUrl: text("title_card_url"),
        brandPrimary: text("brand_primary"),
        brandSecondary: text("brand_secondary"),
        status: text().default('active').notNull(),
}, (table) => [
        index("idx_orgs_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
        index("idx_orgs_is_business").using("btree", table.isBusiness.asc().nullsLast().op("bool_ops")),
        index("idx_orgs_name").using("btree", sql`lower(name)`),
        index("idx_orgs_name_lower").using("btree", sql`lower(name)`),
        index("idx_orgs_state").using("btree", table.state.asc().nullsLast().op("text_ops")).where(sql`(state IS NOT NULL)`),
        index("idx_orgs_updated_at").using("btree", table.updatedAt.desc().nullsFirst().op("timestamptz_ops")),
        index("ix_organizations_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
        index("ix_organizations_name").using("btree", sql`lower(name)`),
        check("check_state_format", sql`(state IS NULL) OR (state ~ '^[A-Z]{2}$'::text)`),
]);

export const orders = pgTable("orders", {
        id: varchar().default(sql`gen_random_uuid()`).primaryKey().notNull(),
        organizationId: varchar("organization_id").notNull(),
        orderNumber: text("order_number").notNull(),
        customerName: text("customer_name").notNull(),
        status: text().default('pending').notNull(),
        totalAmount: numeric("total_amount", { precision: 10, scale:  2 }),
        items: jsonb(),
        notes: text(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        foreignKey({
                        columns: [table.organizationId],
                        foreignColumns: [organizations.id],
                        name: "orders_organization_id_organizations_id_fk"
                }),
        unique("orders_order_number_unique").on(table.orderNumber),
]);

export const userRoles = pgTable("user_roles", {
        id: varchar().default(sql`gen_random_uuid()`).primaryKey().notNull(),
        userId: varchar("user_id"),
        orgId: varchar("org_id").notNull(),
        roleId: varchar("role_id").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        index("idx_user_roles_org_id").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
        index("idx_user_roles_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
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
        unique("user_roles_user_id_org_id_key").on(table.userId, table.orgId),
]);

export const roles = pgTable("roles", {
        id: varchar().default(sql`gen_random_uuid()`).primaryKey().notNull(),
        slug: text().notNull(),
        name: text().notNull(),
        description: text(),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        unique("roles_slug_key").on(table.slug),
        unique("roles_slug_unique").on(table.slug),
]);

export const sports = pgTable("sports", {
        id: varchar().default(sql`gen_random_uuid()`).primaryKey().notNull(),
        name: text().notNull(),
        description: text(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
        unique("sports_name_key").on(table.name),
        unique("sports_name_unique").on(table.name),
]);

export const orgSports = pgTable("org_sports", {
        id: varchar().default(sql`gen_random_uuid()`).primaryKey().notNull(),
        organizationId: varchar("organization_id").notNull(),
        sportId: varchar("sport_id").notNull(),
        contactName: text("contact_name").notNull(),
        contactEmail: text("contact_email").notNull(),
        contactPhone: text("contact_phone"),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
        unique("org_sports_organization_id_sport_id_key").on(table.organizationId, table.sportId),
]);

export const quotes = pgTable("quotes", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        quoteNumber: text("quote_number").notNull(),
        date: date().notNull(),
        organizationName: text("organization_name").notNull(),
        contactPerson: text("contact_person"),
        contactEmail: text("contact_email"),
        contactPhone: text("contact_phone"),
        contactAddress: text("contact_address"),
        taxPercent: numeric("tax_percent", { precision: 5, scale:  2 }).default('0'),
        discount: numeric({ precision: 10, scale:  2 }).default('0'),
        notes: text(),
        items: jsonb().default([]).notNull(),
        subtotal: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
        total: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
        logoUrl: text("logo_url"),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
        salesperson: text(),
}, (table) => [
        index("idx_quotes_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
        index("idx_quotes_date").using("btree", table.date.asc().nullsLast().op("date_ops")),
        index("idx_quotes_quote_number").using("btree", table.quoteNumber.asc().nullsLast().op("text_ops")),
        unique("quotes_quote_number_key").on(table.quoteNumber),
]);
