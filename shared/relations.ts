// Schema auto-pulled on 2025-08-20T20:13:53.948Z
// This file was automatically generated from the database

import { relations } from "drizzle-orm/relations";
import { organizations, orders, userRoles, roles } from "./schema";

export const ordersRelations = relations(orders, ({one}) => ({
	organization: one(organizations, {
		fields: [orders.organizationId],
		references: [organizations.id]
	}),
}));

export const organizationsRelations = relations(organizations, ({many}) => ({
	orders: many(orders),
	userRoles: many(userRoles),
}));

export const userRolesRelations = relations(userRoles, ({one}) => ({
	organization: one(organizations, {
		fields: [userRoles.orgId],
		references: [organizations.id]
	}),
	role: one(roles, {
		fields: [userRoles.roleId],
		references: [roles.id]
	}),
}));

export const rolesRelations = relations(roles, ({many}) => ({
	userRoles: many(userRoles),
}));