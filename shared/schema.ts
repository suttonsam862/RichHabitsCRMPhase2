import { pgTable, foreignKey, varchar, text, timestamp, unique, jsonb, numeric, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const sports = pgTable("sports", {
        id: varchar().default(sql`gen_random_uuid()`).primaryKey().notNull(),
        name: text().notNull(),
        description: text(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        unique("sports_name_unique").on(table.name),
]);

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
        is_business: boolean().default(false).notNull(),
        email_domain: text(),
        state: text().notNull(),
        address: text(),
        address_line1: text(),
        address_line2: text(),
        city: text(),
        postal_code: text(),
        country: text(),
        phone: text(),
        email: text(),
        brand_primary: text(),
        brand_secondary: text(),
        universalDiscounts: jsonb("universal_discounts"),
        notes: text(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const org_sports = pgTable("org_sports", {
        id: varchar().default(sql`gen_random_uuid()`).primaryKey().notNull(),
        organizationId: varchar("organization_id").notNull(),
        sportId: varchar("sport_id").notNull(),
        contact_name: text().notNull(),
        contact_email: text().notNull(),
        contact_phone: text(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        foreignKey({
                        columns: [table.organizationId],
                        foreignColumns: [organizations.id],
                        name: "org_sports_organization_id_organizations_id_fk"
                }).onDelete("cascade"),
        foreignKey({
                        columns: [table.sportId],
                        foreignColumns: [sports.id],
                        name: "org_sports_sport_id_sports_id_fk"
                }).onDelete("cascade"),
        unique("org_sports_org_sport_unique").on(table.organizationId, table.sportId),
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
