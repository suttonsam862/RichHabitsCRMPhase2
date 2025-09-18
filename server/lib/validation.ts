// Phase 3 API-1: Comprehensive Zod validation schemas for API endpoints
import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Generic validation middleware factory
export function validateRequest(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: error.errors.map(e => ({
              path: e.path.join('.'),
              message: e.message
            }))
          }
        });
      }
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Validation error'
        }
      });
    }
  };
}

// Salesperson schemas
export const CreateSalespersonProfileSchema = z.object({
  commission_rate: z.number().min(0).max(1).default(0.05),
  territory: z.union([z.string(), z.array(z.string())]).optional(),
  hire_date: z.string().datetime().optional(),
  performance_tier: z.enum(['standard', 'silver', 'gold', 'platinum']).default('standard')
});

export const UpdateSalespersonProfileSchema = z.object({
  commission_rate: z.number().min(0).max(1).optional(),
  territory: z.union([z.string(), z.array(z.string())]).optional(),
  hire_date: z.string().datetime().optional(),
  performance_tier: z.enum(['standard', 'silver', 'gold', 'platinum']).optional(),
  is_active: z.boolean().optional()
});

// Admin user creation schema
export const CreateAdminUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(1, 'Full name is required'),
  role: z.enum(['admin', 'super_admin']).optional().default('admin')
});

// User schemas
export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8).optional(),
  fullName: z.string().min(1, 'Full name is required'),
  phone: z.string().optional(),
  role: z.enum(['admin', 'member', 'readonly', 'contact']).default('member'),
  organizationId: z.string().optional(),
  department: z.string().optional(),
  jobTitle: z.string().optional()
});

export const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  fullName: z.string().min(1).optional(),
  phone: z.string().optional(),
  role: z.enum(['admin', 'member', 'readonly', 'contact']).optional(),
  isActive: z.boolean().optional(),
  department: z.string().optional(),
  jobTitle: z.string().optional()
});

// Catalog item schemas
export const CreateCatalogItemSchema = z.object({
  orgId: z.string().uuid('Invalid organization ID'),
  name: z.string().min(1, 'Name is required'),
  sportId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  basePrice: z.number().positive('Base price must be positive').optional(),
  turnaroundDays: z.number().int().positive().optional(),
  moq: z.number().int().positive().optional(),
  fabric: z.string().optional(),
  buildInstructions: z.string().optional(),
  care: z.string().optional(),
  imageUrls: z.array(z.string().url()).optional(),
  embellishmentsJson: z.record(z.any()).optional(),
  colorwaysJson: z.record(z.any()).optional()
});

export const UpdateCatalogItemSchema = CreateCatalogItemSchema.partial();

// Order schemas
export const CreateOrderSchema = z.object({
  organizationId: z.string(),
  customerName: z.string().min(1, 'Customer name is required'),
  orderNumber: z.string().optional(),
  totalAmount: z.number().positive().optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
    price: z.number().positive()
  })).optional(),
  notes: z.string().optional(),
  sportId: z.string().optional(),
  teamName: z.string().optional(),
  salespersonId: z.string().optional()
});

export const UpdateOrderStatusSchema = z.object({
  statusCode: z.enum(['draft', 'pending', 'confirmed', 'in_production', 'shipped', 'delivered', 'cancelled'])
});

export const UpdateOrderSchema = z.object({
  customerName: z.string().min(1).optional(),
  totalAmount: z.number().positive().optional(),
  notes: z.string().optional(),
  statusCode: z.string().optional()
});

// Manufacturer schemas
export const CreateManufacturerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  minimumOrderQuantity: z.number().int().positive().optional(),
  leadTimeDays: z.number().int().positive().optional(),
  isActive: z.boolean().default(true)
});

export const UpdateManufacturerSchema = CreateManufacturerSchema.partial();

// Designer schemas
export const CreateDesignerSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  specializations: z.array(z.string()).optional(),
  portfolioUrl: z.string().url().optional(),
  hourlyRate: z.number().positive().optional(),
  isActive: z.boolean().default(true)
});

export const UpdateDesignerSchema = CreateDesignerSchema.partial();

// Performance tier schemas
export const CreatePerformanceTierSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: z.string().min(1).max(100),
  description: z.string().optional(),
  commissionMultiplier: z.number().min(0).max(10).default(1.00),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0)
});

export const UpdatePerformanceTierSchema = CreatePerformanceTierSchema.partial();

// Region schemas
export const CreateRegionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  code: z.string().min(1).max(10),
  country: z.string().max(100).default('US'),
  isActive: z.boolean().default(true)
});

export const UpdateRegionSchema = CreateRegionSchema.partial();

// System settings schemas
export const CreateSystemSettingSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  key: z.string().min(1, 'Key is required'),
  value: z.any(),
  description: z.string().optional(),
  isActive: z.boolean().default(true)
});

export const UpdateSystemSettingSchema = CreateSystemSettingSchema.partial();

export const BulkUpdateSystemSettingsSchema = z.object({
  settings: z.array(z.object({
    id: z.string().uuid(),
    value: z.any()
  }))
});

// File upload schemas
export const SignedUrlSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  fileType: z.string().min(1, 'File type is required'),
  fileSize: z.number().int().positive().max(10 * 1024 * 1024, 'File size must be less than 10MB').optional()
});

export const UploadObjectSchema = z.object({
  bucket: z.string().min(1, 'Bucket name is required'),
  path: z.string().min(1, 'Path is required'),
  file: z.any() // File validation handled by multer
});

// Order status reorder schemas
export const ReorderStatusSchema = z.object({
  statuses: z.array(z.object({
    code: z.string(),
    sortOrder: z.number().int()
  }))
});

// Asset upload schema
export const AssetUploadSchema = z.object({
  assetType: z.enum(['logo', 'titleCard', 'branding']),
  fileName: z.string().optional(),
  fileType: z.string().optional()
});

// Sport association schema
export const CreateOrgSportSchema = z.object({
  teamName: z.string().min(1, 'Team name is required'),
  contactName: z.string().min(1, 'Contact name is required'),
  contactEmail: z.string().email('Invalid email address'),
  contactPhone: z.string().optional(),
  shipAddressLine1: z.string().optional(),
  shipAddressLine2: z.string().optional(),
  shipCity: z.string().optional(),
  shipState: z.string().optional(),
  shipPostalCode: z.string().optional(),
  shipCountry: z.string().optional()
});

// Organization update schema
export const UpdateOrganizationSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  isBusiness: z.boolean().optional(),
  brandPrimary: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  brandSecondary: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  tertiaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  colorPalette: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  zip: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  financeEmail: z.string().email().optional(),
  website: z.string().url().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  logoUrl: z.string().url().optional(),
  titleCardUrl: z.string().url().optional(),
  universalDiscounts: z.record(z.any()).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  setupComplete: z.boolean().optional()
});