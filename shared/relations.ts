// Schema auto-pulled on 2025-08-24T07:35:03.309Z
// This file was automatically generated from the database

import { relations } from "drizzle-orm/relations";
import { statusOrders, orders, organizations, userRoles, roles, statusOrderItems, orderItems, organizationFavorites } from "./schema";

export const ordersRelations = relations(orders, ({one}) => ({
	statusOrder: one(statusOrders, {
		fields: [orders.statusCode],
		references: [statusOrders.code]
	}),
}));

export const statusOrdersRelations = relations(statusOrders, ({many}) => ({
	orders: many(orders),
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

export const organizationsRelations = relations(organizations, ({many}) => ({
	userRoles: many(userRoles),
	organizationFavorites: many(organizationFavorites),
}));

export const rolesRelations = relations(roles, ({many}) => ({
	userRoles: many(userRoles),
}));

export const orderItemsRelations = relations(orderItems, ({one}) => ({
	statusOrderItem: one(statusOrderItems, {
		fields: [orderItems.statusCode],
		references: [statusOrderItems.code]
	}),
}));

export const statusOrderItemsRelations = relations(statusOrderItems, ({many}) => ({
	orderItems: many(orderItems),
}));

export const organizationFavoritesRelations = relations(organizationFavorites, ({one}) => ({
	organization: one(organizations, {
		fields: [organizationFavorites.orgId],
		references: [organizations.id]
	}),
}));