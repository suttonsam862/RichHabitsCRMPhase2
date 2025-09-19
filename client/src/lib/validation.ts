import { useState, useEffect } from 'react';
import { z } from 'zod';
import { ValidationHelpers, StatusValidation, PriorityValidation, BusinessRuleValidation } from '../../../shared/validation-helpers';

/**
 * Frontend Validation Integration
 * Uses shared Zod schemas for consistent validation between frontend and backend
 */

// Re-export shared validation utilities for frontend use
export { ValidationHelpers, StatusValidation, PriorityValidation, BusinessRuleValidation };

// Frontend-specific validation schemas that extend the shared ones
export const FrontendValidationSchemas = {
  // Order creation form schema
  createOrder: z.object({
    // Include all fields from BusinessRuleValidation.orderCreation
    orgId: ValidationHelpers.uuid("Organization ID"),
    customerId: ValidationHelpers.uuid("Customer ID"),
    customerContactName: ValidationHelpers.nonEmptyString("Customer name", 2, 100).optional(),
    customerContactEmail: ValidationHelpers.email("Customer email").optional(),
    customerContactPhone: ValidationHelpers.phone("Customer phone").optional(),
    totalAmount: ValidationHelpers.currency("Total amount", 1000000).optional(),
    revenueEstimate: ValidationHelpers.currency("Revenue estimate").optional(),
    dueDate: ValidationHelpers.futureDate("Due date").optional(),
    items: z.array(z.object({
      productId: ValidationHelpers.uuid("Product ID").optional(),
      nameSnapshot: ValidationHelpers.nonEmptyString("Item name", 1, 200),
      quantity: ValidationHelpers.positiveInteger("Quantity", 10000),
      priceSnapshot: ValidationHelpers.currency("Price", 100000).optional(),
    })).min(1, "Order must have at least one item").max(100, "Order cannot have more than 100 items"),
    // Add frontend-specific validation
    saveAsDraft: z.boolean().default(false),
    notifyCustomer: z.boolean().default(true),
  }).refine(
    (data) => data.customerContactEmail || data.customerContactPhone,
    {
      message: "Either customer email or phone number is required",
      path: ["customerContactEmail"]
    }
  ).refine(
    (data) => !data.revenueEstimate || !data.totalAmount || data.revenueEstimate <= data.totalAmount,
    {
      message: "Revenue estimate cannot exceed total amount",
      path: ["revenueEstimate"]
    }
  ),

  // Order update schema
  updateOrder: z.object({
    customerContactName: ValidationHelpers.nonEmptyString("Customer name", 2, 100).optional(),
    customerContactEmail: ValidationHelpers.email("Customer email").optional(),
    customerContactPhone: ValidationHelpers.phone("Customer phone").optional(),
    totalAmount: ValidationHelpers.currency("Total amount", 1000000).optional(),
    revenueEstimate: ValidationHelpers.currency("Revenue estimate").optional(),
    dueDate: z.string().datetime("Due date must be a valid date").optional(),
    notes: z.string().max(5000, "Notes cannot exceed 5000 characters").optional(),
  }),

  // Order status update schema
  updateOrderStatus: z.object({
    statusCode: StatusValidation.order,
    notes: z.string().max(1000, "Status change notes cannot exceed 1000 characters").optional(),
    notifyCustomer: z.boolean().default(true),
    reason: z.string().max(500, "Reason cannot exceed 500 characters").optional(),
  }),

  // Design job creation schema
  createDesignJob: z.object({
    orgId: ValidationHelpers.uuid("Organization ID"),
    orderItemId: ValidationHelpers.uuid("Order item ID"),
    title: ValidationHelpers.nonEmptyString("Title", 5, 200),
    brief: ValidationHelpers.nonEmptyString("Brief", 20, 5000),
    priority: PriorityValidation.designJob().default(5),
    assigneeDesignerId: ValidationHelpers.uuid("Designer ID").optional(),
    estimatedHours: z.number().positive("Estimated hours must be positive").max(200, "Estimated hours cannot exceed 200").optional(),
    deadline: z.string().datetime("Deadline must be a valid date").refine((date) => {
      return new Date(date) > new Date();
    }, "Deadline must be in the future"),
    maxRevisions: z.number().int("Max revisions must be a whole number").min(1, "Must allow at least 1 revision").max(10, "Cannot exceed 10 max revisions").default(3),
    requiredSpecializations: z.array(z.string()).min(1, "Must specify at least one required specialization").max(5, "Cannot require more than 5 specializations"),
  }),

  // Work order creation schema
  createWorkOrder: z.object({
    orgId: ValidationHelpers.uuid("Organization ID"),
    orderItemId: ValidationHelpers.uuid("Order item ID"),
    quantity: ValidationHelpers.positiveInteger("Quantity", 10000),
    manufacturerId: ValidationHelpers.uuid("Manufacturer ID").optional(),
    priority: PriorityValidation.workOrder().default(5),
    plannedStartDate: z.string().datetime("Planned start date must be a valid date").optional(),
    plannedDueDate: z.string().datetime("Planned due date must be a valid date").optional(),
    instructions: z.string().max(2000, "Instructions cannot exceed 2000 characters").optional(),
    estimatedCompletionDate: z.string().datetime("Estimated completion date must be a valid date").optional(),
  }).refine((data) => {
    if (data.plannedStartDate && data.plannedDueDate) {
      return new Date(data.plannedStartDate) < new Date(data.plannedDueDate);
    }
    return true;
  }, {
    message: "Planned start date must be before planned due date",
    path: ["plannedDueDate"]
  }),

  // Purchase order creation schema
  createPurchaseOrder: z.object({
    orgId: ValidationHelpers.uuid("Organization ID"),
    supplierId: ValidationHelpers.uuid("Supplier ID"),
    orderDate: z.string().datetime("Order date must be a valid date").default(() => new Date().toISOString()),
    expectedDeliveryDate: z.string().datetime("Expected delivery date must be a valid date").optional(),
    priority: PriorityValidation.purchaseOrder().default(3),
    currency: z.enum(['USD', 'CAD', 'EUR', 'GBP']).default('USD'),
    exchangeRate: z.number().positive("Exchange rate must be positive").default(1.0),
    shippingAddress: ValidationHelpers.address(true),
    billingAddress: ValidationHelpers.address(false),
    termsAndConditions: z.string().max(5000, "Terms and conditions cannot exceed 5000 characters").optional(),
    notes: z.string().max(2000, "Notes cannot exceed 2000 characters").optional(),
    budgetCode: z.string().max(50, "Budget code cannot exceed 50 characters").optional(),
    projectCode: z.string().max(50, "Project code cannot exceed 50 characters").optional(),
    items: z.array(z.object({
      materialId: ValidationHelpers.uuid("Material ID").optional(),
      materialName: ValidationHelpers.nonEmptyString("Material name", 1, 200),
      materialSku: z.string().max(50, "Material SKU cannot exceed 50 characters").optional(),
      description: z.string().max(1000, "Description cannot exceed 1000 characters").optional(),
      quantity: ValidationHelpers.positiveNumber("Quantity", 1000000),
      unit: ValidationHelpers.nonEmptyString("Unit", 1, 20),
      unitCost: ValidationHelpers.currency("Unit cost", 100000),
      expectedDeliveryDate: z.string().datetime("Expected delivery date must be a valid date").optional(),
      notes: z.string().max(1000, "Item notes cannot exceed 1000 characters").optional(),
    })).min(1, "Purchase order must have at least one item").max(100, "Purchase order cannot have more than 100 items"),
  }),

  // Customer creation/update schema
  customer: z.object({
    name: ValidationHelpers.nonEmptyString("Customer name", 2, 200),
    email: ValidationHelpers.email("Email").optional(),
    phone: ValidationHelpers.phone("Phone number").optional(),
    companyName: z.string().max(200, "Company name cannot exceed 200 characters").optional(),
    customerType: z.enum(['individual', 'business', 'organization', 'government']).default('individual'),
    preferredContactMethod: z.enum(['email', 'phone', 'mail']).optional(),
    creditLimit: ValidationHelpers.currency("Credit limit", 1000000).optional(),
    addressLine1: z.string().max(200, "Address line 1 cannot exceed 200 characters").optional(),
    addressLine2: z.string().max(200, "Address line 2 cannot exceed 200 characters").optional(),
    city: z.string().max(100, "City cannot exceed 100 characters").optional(),
    state: z.string().max(100, "State cannot exceed 100 characters").optional(),
    postalCode: z.string().max(20, "Postal code cannot exceed 20 characters").optional(),
    country: z.string().max(100, "Country cannot exceed 100 characters").optional(),
    notes: z.string().max(2000, "Notes cannot exceed 2000 characters").optional(),
  }).refine((data) => {
    return data.email || data.phone;
  }, {
    message: "Either email or phone number is required",
    path: ["email"]
  }),

  // Material creation/update schema
  material: z.object({
    name: ValidationHelpers.nonEmptyString("Material name", 1, 200),
    sku: z.string().max(50, "SKU cannot exceed 50 characters").optional(),
    description: z.string().max(1000, "Description cannot exceed 1000 characters").optional(),
    category: z.enum(['fabric', 'thread', 'hardware', 'dye', 'chemicals', 'packaging', 'labels', 'accessories', 'outsourced_service', 'equipment', 'tools', 'maintenance', 'other']),
    unit: ValidationHelpers.nonEmptyString("Unit", 1, 20),
    unitCost: ValidationHelpers.currency("Unit cost", 100000),
    reorderLevel: z.number().int().min(0, "Reorder level cannot be negative").max(100000, "Reorder level cannot exceed 100,000").default(0),
    leadTimeDays: ValidationHelpers.positiveInteger("Lead time days", 365).default(7),
    moq: ValidationHelpers.positiveInteger("Minimum order quantity", 100000).optional(),
    specifications: z.record(z.any()).optional(),
    qualityStandards: z.string().max(1000, "Quality standards cannot exceed 1000 characters").optional(),
    storageRequirements: z.string().max(500, "Storage requirements cannot exceed 500 characters").optional(),
    safetyNotes: z.string().max(1000, "Safety notes cannot exceed 1000 characters").optional(),
  }),

  // User registration/profile schema
  userProfile: z.object({
    fullName: ValidationHelpers.nonEmptyString("Full name", 2, 100),
    email: ValidationHelpers.email("Email"),
    phone: ValidationHelpers.phone("Phone number").optional(),
    jobTitle: z.string().max(100, "Job title cannot exceed 100 characters").optional(),
    department: z.string().max(100, "Department cannot exceed 100 characters").optional(),
    addressLine1: z.string().max(200, "Address line 1 cannot exceed 200 characters").optional(),
    addressLine2: z.string().max(200, "Address line 2 cannot exceed 200 characters").optional(),
    city: z.string().max(100, "City cannot exceed 100 characters").optional(),
    state: z.string().max(100, "State cannot exceed 100 characters").optional(),
    postalCode: z.string().max(20, "Postal code cannot exceed 20 characters").optional(),
    country: z.string().max(100, "Country cannot exceed 100 characters").optional(),
  }),

  // Search/filter schemas
  orderFilters: z.object({
    statusCode: z.array(StatusValidation.order).optional(),
    customerId: ValidationHelpers.uuid("Customer ID").optional(),
    salespersonId: ValidationHelpers.uuid("Salesperson ID").optional(),
    sportId: ValidationHelpers.uuid("Sport ID").optional(),
    dueDateFrom: z.string().datetime().optional(),
    dueDateTo: z.string().datetime().optional(),
    createdFrom: z.string().datetime().optional(),
    createdTo: z.string().datetime().optional(),
    minAmount: z.number().min(0).optional(),
    maxAmount: z.number().min(0).optional(),
    search: z.string().max(100, "Search term cannot exceed 100 characters").optional(),
  }).refine((data) => {
    if (data.dueDateFrom && data.dueDateTo) {
      return new Date(data.dueDateFrom) <= new Date(data.dueDateTo);
    }
    return true;
  }, {
    message: "Due date 'from' must be before 'to'",
    path: ["dueDateFrom"]
  }),

  // File upload schema
  fileUpload: z.object({
    file: z.instanceof(File, { message: "Please select a file" }),
    description: z.string().max(500, "Description cannot exceed 500 characters").optional(),
    category: z.enum(['design', 'document', 'image', 'specification', 'other']).default('other'),
  }).refine((data) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    return data.file.size <= maxSize;
  }, {
    message: "File size cannot exceed 10MB",
    path: ["file"]
  }).refine((data) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'];
    return allowedTypes.includes(data.file.type);
  }, {
    message: "File type not allowed. Allowed types: JPEG, PNG, GIF, PDF, TXT",
    path: ["file"]
  }),
};

// Validation error formatting for frontend
export const formatValidationErrors = (error: z.ZodError) => {
  const formattedErrors: Record<string, string> = {};
  
  error.errors.forEach((err) => {
    const fieldName = err.path.join('.');
    formattedErrors[fieldName] = err.message;
  });
  
  return formattedErrors;
};

// Real-time validation hook
export const useRealtimeValidation = <T>(
  schema: z.ZodSchema<T>,
  value: any,
  enabled: boolean = true
) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const result = schema.safeParse(value);
    
    if (result.success) {
      setErrors({});
      setIsValid(true);
    } else {
      setErrors(formatValidationErrors(result.error));
      setIsValid(false);
    }
  }, [value, schema, enabled]);

  return { errors, isValid };
};

// Form validation utilities
export const FormValidationUtils = {
  // Validate a field on blur
  validateField: <T>(schema: z.ZodSchema<T>, value: any): string | null => {
    const result = schema.safeParse(value);
    
    if (result.success) {
      return null;
    }
    
    return result.error.errors[0]?.message || 'Invalid value';
  },

  // Validate entire form
  validateForm: <T>(schema: z.ZodSchema<T>, values: any): { 
    isValid: boolean; 
    errors: Record<string, string>;
    data?: T;
  } => {
    const result = schema.safeParse(values);
    
    if (result.success) {
      return {
        isValid: true,
        errors: {},
        data: result.data
      };
    }
    
    return {
      isValid: false,
      errors: formatValidationErrors(result.error)
    };
  },

  // Check if a specific field has errors
  hasFieldError: (errors: Record<string, string>, fieldName: string): boolean => {
    return !!errors[fieldName];
  },

  // Get error message for a field
  getFieldError: (errors: Record<string, string>, fieldName: string): string | undefined => {
    return errors[fieldName];
  },

  // Clear errors for specific fields
  clearFieldErrors: (errors: Record<string, string>, fieldNames: string[]): Record<string, string> => {
    const newErrors = { ...errors };
    fieldNames.forEach(field => {
      delete newErrors[field];
    });
    return newErrors;
  },
};

// Type inference helpers
export type CreateOrderFormData = z.infer<typeof FrontendValidationSchemas.createOrder>;
export type UpdateOrderFormData = z.infer<typeof FrontendValidationSchemas.updateOrder>;
export type CreateDesignJobFormData = z.infer<typeof FrontendValidationSchemas.createDesignJob>;
export type CreateWorkOrderFormData = z.infer<typeof FrontendValidationSchemas.createWorkOrder>;
export type CreatePurchaseOrderFormData = z.infer<typeof FrontendValidationSchemas.createPurchaseOrder>;
export type CustomerFormData = z.infer<typeof FrontendValidationSchemas.customer>;
export type MaterialFormData = z.infer<typeof FrontendValidationSchemas.material>;
export type UserProfileFormData = z.infer<typeof FrontendValidationSchemas.userProfile>;
export type OrderFiltersData = z.infer<typeof FrontendValidationSchemas.orderFilters>;
export type FileUploadData = z.infer<typeof FrontendValidationSchemas.fileUpload>;