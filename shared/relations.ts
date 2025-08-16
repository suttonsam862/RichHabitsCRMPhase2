import { relations } from "drizzle-orm/relations";
import { organizations, sports, orders } from "./schema";

export const sportsRelations = relations(sports, ({one}) => ({
	organization: one(organizations, {
		fields: [sports.organizationId],
		references: [organizations.id]
	}),
}));

export const organizationsRelations = relations(organizations, ({many}) => ({
	sports: many(sports),
	orders: many(orders),
}));

export const ordersRelations = relations(orders, ({one}) => ({
	organization: one(organizations, {
		fields: [orders.organizationId],
		references: [organizations.id]
	}),
}));