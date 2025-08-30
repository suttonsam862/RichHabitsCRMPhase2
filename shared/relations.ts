// Schema auto-pulled on 2025-08-24T07:49:38.122Z
// This file was automatically generated from the database

import { relations } from "drizzle-orm/relations";
import { organizations, userRoles, roles } from "./schema";

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