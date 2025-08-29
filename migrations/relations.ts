import { relations } from "drizzle-orm/relations";
import { organizations, userRoles, roles, statusOrders, orders, statusOrderItems, orderItems, organizationMetrics, users, organizationFavorites } from "./schema";

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
	organizationMetrics: many(organizationMetrics),
	users: many(users),
	organizationFavorites: many(organizationFavorites),
}));

export const rolesRelations = relations(roles, ({many}) => ({
	userRoles: many(userRoles),
}));

export const ordersRelations = relations(orders, ({one}) => ({
	statusOrder: one(statusOrders, {
		fields: [orders.statusCode],
		references: [statusOrders.code]
	}),
}));

export const statusOrdersRelations = relations(statusOrders, ({many}) => ({
	orders: many(orders),
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

export const organizationMetricsRelations = relations(organizationMetrics, ({one}) => ({
	organization: one(organizations, {
		fields: [organizationMetrics.organizationId],
		references: [organizations.id]
	}),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	organization: one(organizations, {
		fields: [users.organizationId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [users.createdBy],
		references: [users.id],
		relationName: "users_createdBy_users_id"
	}),
	users: many(users, {
		relationName: "users_createdBy_users_id"
	}),
}));

export const organizationFavoritesRelations = relations(organizationFavorites, ({one}) => ({
	organization: one(organizations, {
		fields: [organizationFavorites.orgId],
		references: [organizations.id]
	}),
}));