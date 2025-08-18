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
        logo_url: text("logo_url"),
        title_card_url: text("title_card_url"),
        brand_primary: text("brand_primary"),
        brand_secondary: text("brand_secondary"),
        email_domain: text("email_domain"),
        billing_email: text("billing_email"),
        created_at: timestamp("created_at", { withTimezone: true }),
        updated_at: timestamp("updated_at", { withTimezone: true }),
        is_business: boolean().notNull(),
        state: text(),
        address_line1: text("address_line1"),
        address_line2: text("address_line2"),
        city: text(),
        postal_code: text("postal_code"),
        phone: text(),
        contact_email: text("contact_email"),
        notes: text(),
        country: text(),
        status: text().notNull(),
        website: text(),
        universal_discounts: jsonb("universal_discounts").notNull(),
        address: text(),
        email: text(),
});

// Export proper types
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type Sport = typeof sports.$inferSelect;
export type InsertSport = typeof sports.$inferInsert;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

export type OrganizationWithSports = Organization & {
  sports: Sport[];
};

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