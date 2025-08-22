// Simplified relations - only including existing tables
import { relations } from "drizzle-orm/relations";
import { 
  organizations, 
  orgSports, 
  sports, 
  roles, 
  userRoles, 
  users,
  categories,
  permissions,
  rolePermissions
} from "./schema";

export const organizationsRelations = relations(organizations, ({many}) => ({
  orgSports: many(orgSports),
  userRoles: many(userRoles),
}));

export const orgSportsRelations = relations(orgSports, ({one}) => ({
  organization: one(organizations, {
    fields: [orgSports.organizationId],
    references: [organizations.id]
  }),
  sport: one(sports, {
    fields: [orgSports.sportId],
    references: [sports.id]
  }),
}));

export const sportsRelations = relations(sports, ({many}) => ({
  orgSports: many(orgSports),
}));

export const userRolesRelations = relations(userRoles, ({one}) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id]
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id]
  }),
  organization: one(organizations, {
    fields: [userRoles.orgId],
    references: [organizations.id]
  }),
}));

export const usersRelations = relations(users, ({many}) => ({
  userRoles: many(userRoles),
}));

export const rolesRelations = relations(roles, ({many}) => ({
  userRoles: many(userRoles),
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({one}) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id]
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id]
  }),
}));

export const permissionsRelations = relations(permissions, ({many}) => ({
  rolePermissions: many(rolePermissions),
}));