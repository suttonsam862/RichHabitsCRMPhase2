import { relations } from "drizzle-orm/relations";
import { orderItems, designAssets, organizations, objectsInStorage, manufacturers, designers, usersInAuth, orderItemSizes, salespeople, customers, orders, statusOrders, accountingInvoices, commissions, accountingPayments, catalogItems, categories, sports, orderEvents, designJobs, statusDesignJobs, designJobEvents, manufacturingWorkOrders, statusWorkOrders, productionEvents, catalogItemImages, orgSports, permissions, rolePermissions, roles, catalogItemManufacturers, userRoles } from "./schema";

export const designAssetsRelations = relations(designAssets, ({one}) => ({
	orderItem: one(orderItems, {
		fields: [designAssets.orderItemId],
		references: [orderItems.id]
	}),
	organization: one(organizations, {
		fields: [designAssets.orgId],
		references: [organizations.id]
	}),
	objectsInStorage: one(objectsInStorage, {
		fields: [designAssets.storageObjectId],
		references: [objectsInStorage.id]
	}),
}));

export const orderItemsRelations = relations(orderItems, ({one, many}) => ({
	designAssets: many(designAssets),
	orderItemSizes: many(orderItemSizes),
	order: one(orders, {
		fields: [orderItems.orderId],
		references: [orders.id]
	}),
	organization: one(organizations, {
		fields: [orderItems.orgId],
		references: [organizations.id]
	}),
	catalogItem: one(catalogItems, {
		fields: [orderItems.productId],
		references: [catalogItems.id]
	}),
	designJobs: many(designJobs),
}));

export const organizationsRelations = relations(organizations, ({many}) => ({
	designAssets: many(designAssets),
	manufacturers: many(manufacturers),
	designers: many(designers),
	salespeople: many(salespeople),
	orders: many(orders),
	accountingInvoices: many(accountingInvoices),
	commissions: many(commissions),
	accountingPayments: many(accountingPayments),
	orderItems: many(orderItems),
	customers: many(customers),
	catalogItems: many(catalogItems),
	orderEvents: many(orderEvents),
	designJobs: many(designJobs),
	manufacturingWorkOrders: many(manufacturingWorkOrders),
	orgSports: many(orgSports),
	userRoles: many(userRoles),
}));

export const objectsInStorageRelations = relations(objectsInStorage, ({many}) => ({
	designAssets: many(designAssets),
}));

export const manufacturersRelations = relations(manufacturers, ({one, many}) => ({
	organization: one(organizations, {
		fields: [manufacturers.orgId],
		references: [organizations.id]
	}),
	manufacturingWorkOrders: many(manufacturingWorkOrders),
	catalogItemManufacturers: many(catalogItemManufacturers),
}));

export const designersRelations = relations(designers, ({one, many}) => ({
	organization: one(organizations, {
		fields: [designers.orgId],
		references: [organizations.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [designers.userId],
		references: [usersInAuth.id]
	}),
	designJobs: many(designJobs),
}));

export const usersInAuthRelations = relations(usersInAuth, ({many}) => ({
	designers: many(designers),
	salespeople: many(salespeople),
	orderEvents: many(orderEvents),
	designJobs: many(designJobs),
	designJobEvents: many(designJobEvents),
	productionEvents: many(productionEvents),
}));

export const orderItemSizesRelations = relations(orderItemSizes, ({one}) => ({
	orderItem: one(orderItems, {
		fields: [orderItemSizes.orderItemId],
		references: [orderItems.id]
	}),
}));

export const salespeopleRelations = relations(salespeople, ({one}) => ({
	organization: one(organizations, {
		fields: [salespeople.orgId],
		references: [organizations.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [salespeople.userId],
		references: [usersInAuth.id]
	}),
}));

export const ordersRelations = relations(orders, ({one, many}) => ({
	customer: one(customers, {
		fields: [orders.customerId],
		references: [customers.id]
	}),
	organization: one(organizations, {
		fields: [orders.orgId],
		references: [organizations.id]
	}),
	statusOrder: one(statusOrders, {
		fields: [orders.statusCode],
		references: [statusOrders.code]
	}),
	accountingInvoices: many(accountingInvoices),
	commissions: many(commissions),
	accountingPayments: many(accountingPayments),
	orderItems: many(orderItems),
	orderEvents: many(orderEvents),
	manufacturingWorkOrders: many(manufacturingWorkOrders),
}));

export const customersRelations = relations(customers, ({one, many}) => ({
	orders: many(orders),
	organization: one(organizations, {
		fields: [customers.orgId],
		references: [organizations.id]
	}),
}));

export const statusOrdersRelations = relations(statusOrders, ({many}) => ({
	orders: many(orders),
}));

export const accountingInvoicesRelations = relations(accountingInvoices, ({one}) => ({
	order: one(orders, {
		fields: [accountingInvoices.orderId],
		references: [orders.id]
	}),
	organization: one(organizations, {
		fields: [accountingInvoices.orgId],
		references: [organizations.id]
	}),
}));

export const commissionsRelations = relations(commissions, ({one}) => ({
	order: one(orders, {
		fields: [commissions.orderId],
		references: [orders.id]
	}),
	organization: one(organizations, {
		fields: [commissions.orgId],
		references: [organizations.id]
	}),
}));

export const accountingPaymentsRelations = relations(accountingPayments, ({one}) => ({
	order: one(orders, {
		fields: [accountingPayments.orderId],
		references: [orders.id]
	}),
	organization: one(organizations, {
		fields: [accountingPayments.orgId],
		references: [organizations.id]
	}),
}));

export const catalogItemsRelations = relations(catalogItems, ({one, many}) => ({
	orderItems: many(orderItems),
	category: one(categories, {
		fields: [catalogItems.categoryId],
		references: [categories.id]
	}),
	organization: one(organizations, {
		fields: [catalogItems.orgId],
		references: [organizations.id]
	}),
	sport: one(sports, {
		fields: [catalogItems.sportId],
		references: [sports.id]
	}),
	catalogItemImages: many(catalogItemImages),
	catalogItemManufacturers: many(catalogItemManufacturers),
}));

export const categoriesRelations = relations(categories, ({many}) => ({
	catalogItems: many(catalogItems),
}));

export const sportsRelations = relations(sports, ({many}) => ({
	catalogItems: many(catalogItems),
	orgSports: many(orgSports),
}));

export const orderEventsRelations = relations(orderEvents, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [orderEvents.actorUserId],
		references: [usersInAuth.id]
	}),
	order: one(orders, {
		fields: [orderEvents.orderId],
		references: [orders.id]
	}),
	organization: one(organizations, {
		fields: [orderEvents.orgId],
		references: [organizations.id]
	}),
}));

export const designJobsRelations = relations(designJobs, ({one, many}) => ({
	designer: one(designers, {
		fields: [designJobs.assigneeDesignerId],
		references: [designers.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [designJobs.createdByUserId],
		references: [usersInAuth.id]
	}),
	orderItem: one(orderItems, {
		fields: [designJobs.orderItemId],
		references: [orderItems.id]
	}),
	organization: one(organizations, {
		fields: [designJobs.orgId],
		references: [organizations.id]
	}),
	statusDesignJob: one(statusDesignJobs, {
		fields: [designJobs.statusCode],
		references: [statusDesignJobs.code]
	}),
	designJobEvents: many(designJobEvents),
}));

export const statusDesignJobsRelations = relations(statusDesignJobs, ({many}) => ({
	designJobs: many(designJobs),
}));

export const designJobEventsRelations = relations(designJobEvents, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [designJobEvents.actorUserId],
		references: [usersInAuth.id]
	}),
	designJob: one(designJobs, {
		fields: [designJobEvents.designJobId],
		references: [designJobs.id]
	}),
}));

export const manufacturingWorkOrdersRelations = relations(manufacturingWorkOrders, ({one, many}) => ({
	manufacturer: one(manufacturers, {
		fields: [manufacturingWorkOrders.manufacturerId],
		references: [manufacturers.id]
	}),
	order: one(orders, {
		fields: [manufacturingWorkOrders.orderId],
		references: [orders.id]
	}),
	organization: one(organizations, {
		fields: [manufacturingWorkOrders.orgId],
		references: [organizations.id]
	}),
	statusWorkOrder: one(statusWorkOrders, {
		fields: [manufacturingWorkOrders.statusCode],
		references: [statusWorkOrders.code]
	}),
	productionEvents: many(productionEvents),
}));

export const statusWorkOrdersRelations = relations(statusWorkOrders, ({many}) => ({
	manufacturingWorkOrders: many(manufacturingWorkOrders),
}));

export const productionEventsRelations = relations(productionEvents, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [productionEvents.actorUserId],
		references: [usersInAuth.id]
	}),
	manufacturingWorkOrder: one(manufacturingWorkOrders, {
		fields: [productionEvents.workOrderId],
		references: [manufacturingWorkOrders.id]
	}),
}));

export const catalogItemImagesRelations = relations(catalogItemImages, ({one}) => ({
	catalogItem: one(catalogItems, {
		fields: [catalogItemImages.catalogItemId],
		references: [catalogItems.id]
	}),
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

export const rolePermissionsRelations = relations(rolePermissions, ({one}) => ({
	permission: one(permissions, {
		fields: [rolePermissions.permissionId],
		references: [permissions.id]
	}),
	role: one(roles, {
		fields: [rolePermissions.roleId],
		references: [roles.id]
	}),
}));

export const permissionsRelations = relations(permissions, ({many}) => ({
	rolePermissions: many(rolePermissions),
}));

export const rolesRelations = relations(roles, ({many}) => ({
	rolePermissions: many(rolePermissions),
	userRoles: many(userRoles),
}));

export const catalogItemManufacturersRelations = relations(catalogItemManufacturers, ({one}) => ({
	catalogItem: one(catalogItems, {
		fields: [catalogItemManufacturers.catalogItemId],
		references: [catalogItems.id]
	}),
	manufacturer: one(manufacturers, {
		fields: [catalogItemManufacturers.manufacturerId],
		references: [manufacturers.id]
	}),
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