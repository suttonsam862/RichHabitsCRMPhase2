import { pgTable, foreignKey, varchar, text, timestamp, unique, jsonb, numeric } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const sports = pgTable("sports", {
	id: varchar().default(sql`gen_random_uuid()`).primaryKey().notNull(),
	organizationId: varchar("organization_id").notNull(),
	name: text().notNull(),
	salesperson: text(),
	contactName: text("contact_name"),
	contactEmail: text("contact_email"),
	contactPhone: text("contact_phone"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "sports_organization_id_organizations_id_fk"
		}).onDelete("cascade"),
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
	state: text().notNull(),
	address: text(),
	phone: text(),
	email: text(),
	universalDiscounts: jsonb("universal_discounts"),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

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
