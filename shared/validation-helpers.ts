import { z } from 'zod';

/**
 * Shared Validation Helpers for Frontend and Backend
 * Provides consistent validation patterns and error handling across the application
 */

// Common validation utilities that can be used in both frontend and backend
export const ValidationHelpers = {
  // Email validation with better error messages
  email: (fieldName: string = "email") => 
    z.string()
      .min(1, `${fieldName} is required`)
      .email(`Please enter a valid ${fieldName.toLowerCase()}`)
      .max(255, `${fieldName} cannot exceed 255 characters`)
      .transform(val => val.toLowerCase().trim()),

  // Phone validation with international support
  phone: (fieldName: string = "phone number", required: boolean = false) => {
    const schema = z.string()
      .regex(/^[\+]?[\d\s\-\(\)\.]{10,17}$/, `Please enter a valid ${fieldName.toLowerCase()}`)
      .transform(val => val.replace(/[^\d\+]/g, ''));
    
    return required ? schema : schema.optional();
  },

  // UUID validation with custom error messages
  uuid: (fieldName: string = "ID") =>
    z.string().uuid(`${fieldName} must be a valid identifier`),

  // Non-empty string validation
  nonEmptyString: (fieldName: string, minLength: number = 1, maxLength?: number) => {
    let schema = z.string()
      .min(minLength, `${fieldName} must be at least ${minLength} character${minLength === 1 ? '' : 's'}`);
    
    if (maxLength) {
      schema = schema.max(maxLength, `${fieldName} cannot exceed ${maxLength} characters`);
    }
    
    return schema.transform(val => val.trim());
  },

  // Positive number validation
  positiveNumber: (fieldName: string, maxValue?: number) => {
    let schema = z.number()
      .positive(`${fieldName} must be a positive number`);
    
    if (maxValue) {
      schema = schema.max(maxValue, `${fieldName} cannot exceed ${maxValue}`);
    }
    
    return schema;
  },

  // Positive integer validation
  positiveInteger: (fieldName: string, maxValue?: number) => {
    let schema = z.number()
      .int(`${fieldName} must be a whole number`)
      .positive(`${fieldName} must be a positive number`);
    
    if (maxValue) {
      schema = schema.max(maxValue, `${fieldName} cannot exceed ${maxValue}`);
    }
    
    return schema;
  },

  // Currency amount validation
  currency: (fieldName: string = "amount", maxValue: number = 1000000) =>
    z.number()
      .min(0, `${fieldName} cannot be negative`)
      .max(maxValue, `${fieldName} cannot exceed $${maxValue.toLocaleString()}`)
      .multipleOf(0.01, `${fieldName} can only have up to 2 decimal places`),

  // Percentage validation
  percentage: (fieldName: string = "percentage") =>
    z.number()
      .min(0, `${fieldName} cannot be negative`)
      .max(100, `${fieldName} cannot exceed 100%`),

  // Date validation
  futureDate: (fieldName: string = "date") =>
    z.string()
      .datetime(`${fieldName} must be a valid date`)
      .refine((date) => new Date(date) > new Date(), 
        `${fieldName} must be in the future`),

  pastDate: (fieldName: string = "date") =>
    z.string()
      .datetime(`${fieldName} must be a valid date`)
      .refine((date) => new Date(date) < new Date(), 
        `${fieldName} must be in the past`),

  dateRange: (fromField: string = "start date", toField: string = "end date") =>
    z.object({
      from: z.string().datetime(`${fromField} must be a valid date`),
      to: z.string().datetime(`${toField} must be a valid date`),
    }).refine((data) => new Date(data.from) < new Date(data.to), {
      message: `${fromField} must be before ${toField}`,
      path: ["from"]
    }),

  // URL validation
  url: (fieldName: string = "URL", required: boolean = false) => {
    const schema = z.string()
      .url(`Please enter a valid ${fieldName.toLowerCase()}`);
    
    return required ? schema : schema.optional();
  },

  // File validation schema
  fileUpload: (options: {
    maxSize?: number;
    allowedTypes?: string[];
    required?: boolean;
  } = {}) => {
    const { maxSize = 10 * 1024 * 1024, allowedTypes = [], required = false } = options;
    
    const schema = z.object({
      name: z.string().min(1, "Filename is required"),
      size: z.number().max(maxSize, `File size cannot exceed ${Math.round(maxSize / 1024 / 1024)}MB`),
      type: allowedTypes.length > 0 
        ? z.enum(allowedTypes as [string, ...string[]], {
            errorMap: () => ({ message: `File type must be one of: ${allowedTypes.join(', ')}` })
          })
        : z.string(),
    });

    return required ? schema : schema.optional();
  },

  // Address validation
  address: (required: boolean = true) => {
    const schema = z.object({
      addressLine1: ValidationHelpers.nonEmptyString("Address line 1", 1, 200),
      addressLine2: z.string().max(200, "Address line 2 cannot exceed 200 characters").optional(),
      city: ValidationHelpers.nonEmptyString("City", 1, 100),
      state: ValidationHelpers.nonEmptyString("State", 1, 100),
      postalCode: z.string()
        .min(3, "Postal code must be at least 3 characters")
        .max(20, "Postal code cannot exceed 20 characters")
        .regex(/^[\d\w\s\-]{3,20}$/, "Invalid postal code format"),
      country: ValidationHelpers.nonEmptyString("Country", 1, 100),
    });

    return required ? schema : schema.optional();
  },
};

// Status validation schemas for different entities
export const StatusValidation = {
  order: z.enum([
    'draft', 'pending', 'confirmed', 'processing', 'shipped', 
    'delivered', 'completed', 'cancelled', 'on_hold'
  ], {
    errorMap: () => ({ message: "Invalid order status" })
  }),

  orderItem: z.enum([
    'pending_design', 'design_in_progress', 'design_approved', 
    'pending_manufacturing', 'in_production', 'quality_check', 
    'completed', 'cancelled'
  ], {
    errorMap: () => ({ message: "Invalid order item status" })
  }),

  designJob: z.enum([
    'queued', 'assigned', 'drafting', 'submitted_for_review', 
    'under_review', 'revision_requested', 'review', 'approved', 
    'rejected', 'canceled'
  ], {
    errorMap: () => ({ message: "Invalid design job status" })
  }),

  workOrder: z.enum([
    'pending', 'queued', 'in_production', 'quality_check', 
    'rework', 'packaging', 'completed', 'shipped', 'cancelled', 'on_hold'
  ], {
    errorMap: () => ({ message: "Invalid work order status" })
  }),

  purchaseOrder: z.enum([
    'draft', 'pending_approval', 'approved', 'sent', 'acknowledged', 
    'in_production', 'shipped', 'delivered', 'received', 'completed', 
    'cancelled', 'on_hold'
  ], {
    errorMap: () => ({ message: "Invalid purchase order status" })
  }),
};

// Priority validation
export const PriorityValidation = {
  general: (min: number = 1, max: number = 10) =>
    z.number()
      .int("Priority must be a whole number")
      .min(min, `Priority must be at least ${min}`)
      .max(max, `Priority cannot exceed ${max}`),

  designJob: () => PriorityValidation.general(1, 10)
    .describe("Priority: 1 = Urgent, 10 = Low"),

  workOrder: () => PriorityValidation.general(1, 10)
    .describe("Priority: 1 = Highest, 10 = Lowest"),

  purchaseOrder: () => PriorityValidation.general(1, 5)
    .describe("Priority: 1 = Urgent, 5 = Low"),
};

// Cross-field validation helpers
export const CrossFieldValidation = {
  // Validate that one date is before another
  dateOrder: (fromField: string, toField: string, fromLabel?: string, toLabel?: string) =>
    z.object({
      [fromField]: z.string().datetime(),
      [toField]: z.string().datetime(),
    }).refine(
      (data) => new Date(data[fromField]) < new Date(data[toField]),
      {
        message: `${fromLabel || fromField} must be before ${toLabel || toField}`,
        path: [fromField]
      }
    ),

  // Validate that total equals sum of parts
  sumValidation: (totalField: string, itemsField: string, quantityField: string, priceField: string) =>
    z.object({
      [totalField]: z.number(),
      [itemsField]: z.array(z.object({
        [quantityField]: z.number(),
        [priceField]: z.number(),
      })),
    }).refine(
      (data) => {
        const items = data[itemsField] as Array<Record<string, number>>;
        const calculatedTotal = items.reduce(
          (sum: number, item: Record<string, number>) => sum + (item[quantityField] * item[priceField]), 
          0
        );
        const tolerance = 0.01;
        const totalAmount = data[totalField] as number;
        return Math.abs(totalAmount - calculatedTotal) <= tolerance;
      },
      {
        message: `${totalField} must equal the sum of item totals`,
        path: [totalField]
      }
    ),

  // Validate that one field doesn't exceed another
  notExceed: (field1: string, field2: string, label1?: string, label2?: string) =>
    z.object({
      [field1]: z.number(),
      [field2]: z.number(),
    }).refine(
      (data) => data[field1] <= data[field2],
      {
        message: `${label1 || field1} cannot exceed ${label2 || field2}`,
        path: [field1]
      }
    ),
};

// Business rule validation schemas
export const BusinessRuleValidation = {
  // Order creation business rules
  orderCreation: z.object({
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

  // Status transition validation
  statusTransition: (validTransitions: Record<string, string[]>) =>
    z.object({
      currentStatus: z.string(),
      newStatus: z.string(),
    }).refine(
      (data) => validTransitions[data.currentStatus]?.includes(data.newStatus),
      {
        message: "Invalid status transition",
        path: ["newStatus"]
      }
    ),

  // Material requirement validation
  materialRequirement: z.object({
    materialId: ValidationHelpers.uuid("Material ID"),
    quantityNeeded: ValidationHelpers.positiveNumber("Quantity needed", 1000000),
    neededByDate: ValidationHelpers.futureDate("Needed by date").optional(),
  }),

  // Quality check validation
  qualityCheck: z.object({
    passed: z.boolean(),
    qualityScore: z.number().min(1, "Quality score must be between 1 and 5").max(5, "Quality score must be between 1 and 5").optional(),
    checkItems: z.array(z.object({
      item: ValidationHelpers.nonEmptyString("Check item", 1, 100),
      passed: z.boolean(),
      notes: z.string().max(500, "Check item notes cannot exceed 500 characters").optional(),
    })).min(1, "Must have at least one quality check item"),
    overallNotes: z.string().max(2000, "Overall notes cannot exceed 2000 characters").optional(),
  }),
};

// Error formatting utilities
export const ErrorFormatting = {
  // Format Zod errors for user-friendly display
  formatZodError: (error: z.ZodError) => {
    return error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));
  },

  // Create standardized error response
  createErrorResponse: (
    code: string, 
    message: string, 
    details?: any[], 
    statusCode: number = 400
  ) => ({
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
    },
    statusCode,
  }),

  // Common error responses
  validationError: (details: any[]) => 
    ErrorFormatting.createErrorResponse(
      'VALIDATION_ERROR', 
      'Request validation failed', 
      details, 
      422
    ),

  businessRuleError: (message: string, field?: string) =>
    ErrorFormatting.createErrorResponse(
      'BUSINESS_RULE_VIOLATION',
      message,
      field ? [{ field, message, code: 'BUSINESS_RULE_VIOLATION' }] : undefined,
      409
    ),

  notFoundError: (resource: string) =>
    ErrorFormatting.createErrorResponse(
      'RESOURCE_NOT_FOUND',
      `${resource} not found`,
      undefined,
      404
    ),

  unauthorizedError: (message: string = 'Unauthorized access') =>
    ErrorFormatting.createErrorResponse(
      'UNAUTHORIZED',
      message,
      undefined,
      401
    ),

  forbiddenError: (message: string = 'Access forbidden') =>
    ErrorFormatting.createErrorResponse(
      'FORBIDDEN',
      message,
      undefined,
      403
    ),

  rateLimitError: (retryAfter?: number) =>
    ErrorFormatting.createErrorResponse(
      'RATE_LIMIT_EXCEEDED',
      'Too many requests, please try again later',
      retryAfter ? [{ retryAfter }] : undefined,
      429
    ),
};

// Validation utility functions
export const ValidationUtils = {
  // Check if a value is a valid UUID
  isValidUUID: (value: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  },

  // Check if a value is a valid email
  isValidEmail: (value: string): boolean => {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    return emailRegex.test(value);
  },

  // Sanitize string input
  sanitizeString: (value: string): string => {
    return value.trim().replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  },

  // Parse and validate numeric input
  parseNumber: (value: any, fieldName: string): number => {
    const num = Number(value);
    if (isNaN(num)) {
      throw new Error(`${fieldName} must be a valid number`);
    }
    return num;
  },

  // Validate array length
  validateArrayLength: (array: any[], fieldName: string, min?: number, max?: number): void => {
    if (min !== undefined && array.length < min) {
      throw new Error(`${fieldName} must have at least ${min} item${min === 1 ? '' : 's'}`);
    }
    if (max !== undefined && array.length > max) {
      throw new Error(`${fieldName} cannot have more than ${max} items`);
    }
  },
};