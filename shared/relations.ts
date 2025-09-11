// Schema auto-pulled on 2025-08-24T07:49:38.122Z
// This file was automatically generated from the database

import { relations } from "drizzle-orm/relations";
import { organizations, userRoles, roles, statusOrders, orders, statusOrderItems, orderItems, organizationMetrics, users, organizationFavorites, salespeople, salespersonAssignments } from "./schema";

export const userRolesRelations = relations(userRoles, ({one}) => ({
        organization: one(organizations, {
                fields: [userRoles.organization_id],
                references: [organizations.id]
        }),
        role: one(roles, {
                fields: [userRoles.role_id],
                references: [roles.id]
        }),
}));

export const organizationsRelations = relations(organizations, ({many}) => ({
        userRoles: many(userRoles),
}));

export const rolesRelations = relations(roles, ({many}) => ({
        userRoles: many(userRoles),
}));

export const organizationFavoritesRelations = relations(organizationFavorites, ({one}) => ({
	organization: one(organizations, {
		fields: [organizationFavorites.orgId],
		references: [organizations.id]
	}),
}));

export const salespersonAssignmentsRelations = relations(salespersonAssignments, ({one}) => ({
	salesperson: one(salespeople, {
		fields: [salespersonAssignments.salespersonId],
		references: [salespeople.id]
	}),
	organization: one(organizations, {
		fields: [salespersonAssignments.organizationId],
		references: [organizations.id]
	}),
}));

export const salespeopleRelations = relations(salespeople, ({many}) => ({
	assignments: many(salespersonAssignments),
}));