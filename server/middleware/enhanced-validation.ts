import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import rateLimit from 'express-rate-limit';
import { AuthedRequest } from './auth';

/**
 * Enhanced validation middleware with comprehensive security and business logic
 * Includes input sanitization, rate limiting, size constraints, and organization validation
 */

// Types for validation schemas
interface ValidationSchemas {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
  files?: {
    maxSize?: number;
    allowedTypes?: string[];
    maxCount?: number;
  };
}

interface ValidationOptions {
  sanitizeInput?: boolean;
  checkOrgOwnership?: boolean;
  requireAuth?: boolean;
  customBusinessRules?: (data: any, req: AuthedRequest) => Promise<ValidationResult>;
}

interface ValidationResult {
  success: boolean;
  errors?: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

// Input sanitization utilities
class InputSanitizer {
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') return input;
    
    // Remove null bytes and control characters
    let sanitized = input.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Sanitize HTML content
    sanitized = DOMPurify.sanitize(sanitized, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      STRIP_COMMENTS: true,
      STRIP_CDATA_SECTIONS: true
    });
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    return sanitized;
  }

  static sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    
    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }
    
    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[this.sanitizeString(key)] = this.sanitizeObject(value);
      }
      return sanitized;
    }
    
    return obj;
  }

  static validateFileUpload(file: Express.Multer.File, options: NonNullable<ValidationSchemas['files']>): ValidationResult {
    const errors: Array<{ field: string; message: string; code: string }> = [];

    // Check file size
    if (options.maxSize && file.size > options.maxSize) {
      errors.push({
        field: 'file',
        message: `File size exceeds maximum allowed size of ${options.maxSize} bytes`,
        code: 'FILE_TOO_LARGE'
      });
    }

    // Check file type
    if (options.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
      errors.push({
        field: 'file',
        message: `File type ${file.mimetype} is not allowed. Allowed types: ${options.allowedTypes.join(', ')}`,
        code: 'INVALID_FILE_TYPE'
      });
    }

    // Security checks
    const filename = this.sanitizeString(file.originalname);
    if (filename !== file.originalname) {
      errors.push({
        field: 'filename',
        message: 'Filename contains invalid characters',
        code: 'INVALID_FILENAME'
      });
    }

    // Check for potentially dangerous file extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.com', '.pif', '.js', '.jar', '.php'];
    const fileExtension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    if (dangerousExtensions.includes(fileExtension)) {
      errors.push({
        field: 'file',
        message: `File extension ${fileExtension} is not allowed for security reasons`,
        code: 'DANGEROUS_FILE_TYPE'
      });
    }

    return {
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

// Business rule validation utilities
class BusinessRuleValidator {
  static async validateOrderStatusTransition(
    currentStatus: string, 
    newStatus: string, 
    orderId: string,
    req: AuthedRequest
  ): Promise<ValidationResult> {
    const validTransitions: Record<string, string[]> = {
      'draft': ['pending', 'cancelled'],
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['processing', 'cancelled'],
      'processing': ['shipped', 'cancelled', 'on_hold'],
      'shipped': ['delivered'],
      'delivered': ['completed'],
      'completed': [],
      'cancelled': [],
      'on_hold': ['processing', 'cancelled']
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      return {
        success: false,
        errors: [{
          field: 'statusCode',
          message: `Invalid status transition from '${currentStatus}' to '${newStatus}'`,
          code: 'INVALID_STATUS_TRANSITION'
        }]
      };
    }

    return { success: true };
  }

  static async validateOrderTotals(orderData: any): Promise<ValidationResult> {
    const errors: Array<{ field: string; message: string; code: string }> = [];

    if (orderData.revenueEstimate && orderData.totalAmount) {
      if (orderData.revenueEstimate > orderData.totalAmount) {
        errors.push({
          field: 'revenueEstimate',
          message: 'Revenue estimate cannot exceed total amount',
          code: 'INVALID_REVENUE_ESTIMATE'
        });
      }
    }

    if (orderData.items && Array.isArray(orderData.items)) {
      let calculatedTotal = 0;
      for (const item of orderData.items) {
        if (item.quantity && item.priceSnapshot) {
          calculatedTotal += item.quantity * item.priceSnapshot;
        }
      }

      const tolerance = 0.01;
      if (orderData.totalAmount && Math.abs(orderData.totalAmount - calculatedTotal) > tolerance) {
        errors.push({
          field: 'totalAmount',
          message: 'Total amount does not match sum of item totals',
          code: 'INVALID_TOTAL_CALCULATION'
        });
      }
    }

    return {
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  static async validateInventoryAvailability(orderItems: any[]): Promise<ValidationResult> {
    // Placeholder for inventory validation logic
    // In a real implementation, this would check against inventory levels
    const errors: Array<{ field: string; message: string; code: string }> = [];

    for (let i = 0; i < orderItems.length; i++) {
      const item = orderItems[i];
      if (item.quantity > 10000) {
        errors.push({
          field: `items[${i}].quantity`,
          message: 'Quantity exceeds maximum allowed per item (10,000)',
          code: 'QUANTITY_EXCEEDS_LIMIT'
        });
      }
    }

    return {
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  static async validateOrganizationOwnership(
    orgId: string, 
    userId: string
  ): Promise<ValidationResult> {
    // Placeholder for organization ownership validation
    // In a real implementation, this would check user's access to the organization
    if (!orgId || !userId) {
      return {
        success: false,
        errors: [{
          field: 'orgId',
          message: 'Organization ID and User ID are required for ownership validation',
          code: 'MISSING_OWNERSHIP_DATA'
        }]
      };
    }

    return { success: true };
  }
}

// Rate limiting configurations
export const createRateLimit = (
  windowMs: number = 15 * 60 * 1000, // 15 minutes
  max: number = 100, // requests per window
  message: string = 'Too many requests, please try again later'
) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message,
        retryAfter: Math.ceil(windowMs / 1000)
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Enhanced validation middleware factory
export function validateRequestEnhanced(schemas: ValidationSchemas, options: ValidationOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors: Array<{ field: string; message: string; code: string }> = [];

      // Sanitize input if requested
      if (options.sanitizeInput !== false) {
        if (req.body) {
          req.body = InputSanitizer.sanitizeObject(req.body);
        }
        if (req.query) {
          req.query = InputSanitizer.sanitizeObject(req.query);
        }
        if (req.params) {
          req.params = InputSanitizer.sanitizeObject(req.params);
        }
      }

      // Validate request body
      if (schemas.body && req.body) {
        try {
          req.body = schemas.body.parse(req.body);
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push(...error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code.toUpperCase(),
            })));
          }
        }
      }

      // Validate query parameters
      if (schemas.query && req.query) {
        try {
          req.query = schemas.query.parse(req.query);
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push(...error.errors.map(err => ({
              field: `query.${err.path.join('.')}`,
              message: err.message,
              code: err.code.toUpperCase(),
            })));
          }
        }
      }

      // Validate route parameters
      if (schemas.params && req.params) {
        try {
          req.params = schemas.params.parse(req.params);
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push(...error.errors.map(err => ({
              field: `params.${err.path.join('.')}`,
              message: err.message,
              code: err.code.toUpperCase(),
            })));
          }
        }
      }

      // Validate file uploads
      if (schemas.files && req.files) {
        const files = Array.isArray(req.files) ? req.files : [req.files].flat();
        
        if (schemas.files.maxCount && files.length > schemas.files.maxCount) {
          errors.push({
            field: 'files',
            message: `Too many files. Maximum allowed: ${schemas.files.maxCount}`,
            code: 'TOO_MANY_FILES'
          });
        }

        for (const file of files) {
          const fileValidation = InputSanitizer.validateFileUpload(file, schemas.files);
          if (!fileValidation.success && fileValidation.errors) {
            errors.push(...fileValidation.errors);
          }
        }
      }

      // Check organization ownership if requested
      if (options.checkOrgOwnership && req.body?.orgId) {
        const authedReq = req as AuthedRequest;
        if (authedReq.user?.id) {
          const ownershipValidation = await BusinessRuleValidator.validateOrganizationOwnership(
            req.body.orgId,
            authedReq.user.id
          );
          if (!ownershipValidation.success && ownershipValidation.errors) {
            errors.push(...ownershipValidation.errors);
          }
        }
      }

      // Run custom business rules if provided
      if (options.customBusinessRules) {
        const businessRuleValidation = await options.customBusinessRules(req.body, req as AuthedRequest);
        if (!businessRuleValidation.success && businessRuleValidation.errors) {
          errors.push(...businessRuleValidation.errors);
        }
      }

      // Return validation errors if any
      if (errors.length > 0) {
        return res.status(422).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: errors,
            timestamp: new Date().toISOString()
          }
        });
      }

      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_SYSTEM_ERROR',
          message: 'Internal validation error',
          timestamp: new Date().toISOString()
        }
      });
    }
  };
}

// Specialized validation middleware for common patterns
export const validateOrderCreation = validateRequestEnhanced(
  {
    body: z.object({
      orgId: z.string().uuid('Invalid organization ID'),
      customerId: z.string().uuid('Invalid customer ID'),
      items: z.array(z.object({
        productId: z.string().uuid().optional(),
        nameSnapshot: z.string().min(1, 'Item name is required'),
        quantity: z.number().int().positive('Quantity must be positive').max(10000, 'Quantity too large'),
        priceSnapshot: z.number().positive('Price must be positive').optional(),
      })).min(1, 'Order must have at least one item'),
      totalAmount: z.number().min(0, 'Total amount cannot be negative').optional(),
      dueDate: z.string().datetime().optional(),
    })
  },
  {
    sanitizeInput: true,
    checkOrgOwnership: true,
    customBusinessRules: async (data, req) => {
      // Validate order totals
      const totalsValidation = await BusinessRuleValidator.validateOrderTotals(data);
      if (!totalsValidation.success) return totalsValidation;

      // Validate inventory availability
      const inventoryValidation = await BusinessRuleValidator.validateInventoryAvailability(data.items || []);
      if (!inventoryValidation.success) return inventoryValidation;

      return { success: true };
    }
  }
);

export const validateOrderStatusUpdate = validateRequestEnhanced(
  {
    body: z.object({
      statusCode: z.string().min(1, 'Status code is required'),
      notes: z.string().optional(),
    }),
    params: z.object({
      id: z.string().uuid('Invalid order ID'),
    })
  },
  {
    sanitizeInput: true,
    checkOrgOwnership: true,
    customBusinessRules: async (data, req) => {
      // This would need to fetch current order status and validate transition
      // For now, return success - implement based on your database access patterns
      return { success: true };
    }
  }
);

export const validateDesignJobCreation = validateRequestEnhanced(
  {
    body: z.object({
      orgId: z.string().uuid('Invalid organization ID'),
      orderItemId: z.string().uuid('Invalid order item ID'),
      title: z.string().min(5, 'Title must be at least 5 characters'),
      brief: z.string().min(20, 'Brief must be at least 20 characters'),
      priority: z.number().int().min(1).max(10).default(5),
      deadline: z.string().datetime().optional(),
      requiredSpecializations: z.array(z.string()).min(1).optional(),
    })
  },
  {
    sanitizeInput: true,
    checkOrgOwnership: true,
  }
);

export const validateWorkOrderCreation = validateRequestEnhanced(
  {
    body: z.object({
      orgId: z.string().uuid('Invalid organization ID'),
      orderItemId: z.string().uuid('Invalid order item ID'),
      quantity: z.number().int().positive('Quantity must be positive').max(10000),
      manufacturerId: z.string().uuid().optional(),
      priority: z.number().int().min(1).max(10).default(5),
      plannedStartDate: z.string().datetime().optional(),
      plannedDueDate: z.string().datetime().optional(),
      instructions: z.string().max(2000).optional(),
    })
  },
  {
    sanitizeInput: true,
    checkOrgOwnership: true,
    customBusinessRules: async (data, req) => {
      const errors: Array<{ field: string; message: string; code: string }> = [];

      // Validate date order
      if (data.plannedStartDate && data.plannedDueDate) {
        if (new Date(data.plannedStartDate) >= new Date(data.plannedDueDate)) {
          errors.push({
            field: 'plannedDueDate',
            message: 'Planned due date must be after planned start date',
            code: 'INVALID_DATE_ORDER'
          });
        }
      }

      return {
        success: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
      };
    }
  }
);

export const validatePurchaseOrderCreation = validateRequestEnhanced(
  {
    body: z.object({
      orgId: z.string().uuid('Invalid organization ID'),
      supplierId: z.string().uuid('Invalid supplier ID'),
      orderDate: z.string().datetime(),
      expectedDeliveryDate: z.string().datetime().optional(),
      priority: z.number().int().min(1).max(5).default(3),
      currency: z.enum(['USD', 'CAD', 'EUR', 'GBP']).default('USD'),
      shippingAddress: z.object({
        addressLine1: z.string().min(1),
        city: z.string().min(1),
        state: z.string().min(1),
        postalCode: z.string().min(1),
        country: z.string().min(1),
      }),
      items: z.array(z.object({
        materialId: z.string().uuid().optional(),
        materialName: z.string().min(1),
        quantity: z.number().positive(),
        unit: z.string().min(1),
        unitCost: z.number().positive(),
      })).min(1, 'Purchase order must have at least one item'),
    })
  },
  {
    sanitizeInput: true,
    checkOrgOwnership: true,
  }
);

// Rate limiting presets for different endpoint types
export const rateLimits = {
  // Strict limits for creation endpoints
  creation: createRateLimit(15 * 60 * 1000, 50, 'Too many creation requests'),
  
  // Medium limits for update endpoints
  updates: createRateLimit(15 * 60 * 1000, 100, 'Too many update requests'),
  
  // Relaxed limits for read endpoints
  reads: createRateLimit(15 * 60 * 1000, 500, 'Too many read requests'),
  
  // Very strict limits for sensitive operations
  sensitive: createRateLimit(60 * 60 * 1000, 10, 'Too many sensitive operation requests'),
  
  // File upload limits
  uploads: createRateLimit(60 * 60 * 1000, 20, 'Too many file upload requests'),
};

// Export utilities for use in other middleware
export { InputSanitizer, BusinessRuleValidator };