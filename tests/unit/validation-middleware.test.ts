import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateRequest } from '../../server/lib/validation';
import {
  CreateSalespersonProfileSchema,
  UpdateSalespersonProfileSchema,
  CreateAdminUserSchema,
  CreateUserSchema,
  UpdateUserSchema,
  CreateCatalogItemSchema,
  CreateOrderSchema,
  UpdateOrderStatusSchema,
  CreateManufacturerSchema,
  CreateDesignerSchema,
  SignedUrlSchema,
  AssetUploadSchema,
  UpdateOrganizationSchema
} from '../../server/lib/validation';

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {}
    };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    mockNext = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('validateRequest middleware factory', () => {
    it('should pass validation with valid data', async () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email()
      });

      const middleware = validateRequest(schema);
      mockRequest.body = {
        name: 'John Doe',
        email: 'john@example.com'
      };

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockRequest.body).toEqual({
        name: 'John Doe',
        email: 'john@example.com'
      });
    });

    it('should return 400 with validation errors for invalid data', async () => {
      const schema = z.object({
        name: z.string().min(2, 'Name must be at least 2 characters'),
        email: z.string().email('Invalid email address'),
        age: z.number().min(18, 'Must be at least 18 years old')
      });

      const middleware = validateRequest(schema);
      mockRequest.body = {
        name: 'A',
        email: 'invalid-email',
        age: 16
      };

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              path: 'name',
              message: 'Name must be at least 2 characters'
            }),
            expect.objectContaining({
              path: 'email',
              message: 'Invalid email address'
            }),
            expect.objectContaining({
              path: 'age',
              message: 'Must be at least 18 years old'
            })
          ])
        }
      });
    });

    it('should handle nested validation errors', async () => {
      const schema = z.object({
        user: z.object({
          profile: z.object({
            firstName: z.string().min(1),
            lastName: z.string().min(1)
          })
        }),
        items: z.array(z.object({
          name: z.string().min(1),
          price: z.number().positive()
        }))
      });

      const middleware = validateRequest(schema);
      mockRequest.body = {
        user: {
          profile: {
            firstName: '',
            lastName: 'Doe'
          }
        },
        items: [
          { name: 'Item 1', price: 10 },
          { name: '', price: -5 }
        ]
      };

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.arrayContaining([
              expect.objectContaining({
                path: 'user.profile.firstName'
              }),
              expect.objectContaining({
                path: 'items.1.name'
              }),
              expect.objectContaining({
                path: 'items.1.price'
              })
            ])
          })
        })
      );
    });

    it('should transform data according to schema transforms', async () => {
      const schema = z.object({
        email: z.string().email().transform(val => val.toLowerCase()),
        name: z.string().transform(val => val.trim()),
        tags: z.array(z.string()).optional().default([])
      });

      const middleware = validateRequest(schema);
      mockRequest.body = {
        email: 'USER@EXAMPLE.COM',
        name: '  John Doe  '
      };

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.body).toEqual({
        email: 'user@example.com',
        name: 'John Doe',
        tags: []
      });
    });

    it('should handle internal errors gracefully', async () => {
      const schema = z.object({
        name: z.string()
      });

      // Mock parseAsync to throw a non-ZodError
      const originalParseAsync = schema.parseAsync;
      schema.parseAsync = vi.fn().mockRejectedValue(new Error('Internal parsing error'));

      const middleware = validateRequest(schema);
      mockRequest.body = { name: 'Test' };

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Validation error'
        }
      });

      // Restore original method
      schema.parseAsync = originalParseAsync;
    });
  });

  describe('Salesperson Validation Schemas', () => {
    describe('CreateSalespersonProfileSchema', () => {
      it('should validate valid salesperson profile creation', () => {
        const validData = {
          commission_rate: 0.08,
          territory: ['North', 'East'],
          hire_date: '2025-01-15T10:00:00Z',
          performance_tier: 'gold'
        };

        expect(() => CreateSalespersonProfileSchema.parse(validData)).not.toThrow();
      });

      it('should apply defaults for optional fields', () => {
        const minimalData = {};
        const result = CreateSalespersonProfileSchema.parse(minimalData);

        expect(result.commission_rate).toBe(0.05);
        expect(result.performance_tier).toBe('standard');
      });

      it('should validate commission rate bounds', () => {
        const invalidRates = [-0.1, 1.5, 2.0];
        invalidRates.forEach(rate => {
          expect(() => CreateSalespersonProfileSchema.parse({ commission_rate: rate })).toThrow();
        });

        const validRates = [0, 0.05, 0.15, 1.0];
        validRates.forEach(rate => {
          expect(() => CreateSalespersonProfileSchema.parse({ commission_rate: rate })).not.toThrow();
        });
      });

      it('should validate performance tier values', () => {
        const validTiers = ['standard', 'silver', 'gold', 'platinum'];
        validTiers.forEach(tier => {
          expect(() => CreateSalespersonProfileSchema.parse({ performance_tier: tier })).not.toThrow();
        });

        const invalidTiers = ['bronze', 'diamond', 'premium'];
        invalidTiers.forEach(tier => {
          expect(() => CreateSalespersonProfileSchema.parse({ performance_tier: tier })).toThrow();
        });
      });

      it('should accept territory as string or array', () => {
        const stringTerritory = { territory: 'Northwest' };
        const arrayTerritory = { territory: ['North', 'West'] };

        expect(() => CreateSalespersonProfileSchema.parse(stringTerritory)).not.toThrow();
        expect(() => CreateSalespersonProfileSchema.parse(arrayTerritory)).not.toThrow();
      });
    });

    describe('UpdateSalespersonProfileSchema', () => {
      it('should allow partial updates', () => {
        const partialUpdates = [
          { commission_rate: 0.1 },
          { territory: 'South' },
          { performance_tier: 'platinum' },
          { is_active: false }
        ];

        partialUpdates.forEach(update => {
          expect(() => UpdateSalespersonProfileSchema.parse(update)).not.toThrow();
        });
      });

      it('should validate updated fields follow same rules as create', () => {
        const invalidUpdates = [
          { commission_rate: -0.5 },
          { performance_tier: 'invalid_tier' }
        ];

        invalidUpdates.forEach(update => {
          expect(() => UpdateSalespersonProfileSchema.parse(update)).toThrow();
        });
      });
    });
  });

  describe('User Validation Schemas', () => {
    describe('CreateAdminUserSchema', () => {
      it('should validate admin user creation', () => {
        const validData = {
          email: 'admin@example.com',
          password: 'SecurePassword123!',
          fullName: 'Admin User',
          role: 'super_admin'
        };

        expect(() => CreateAdminUserSchema.parse(validData)).not.toThrow();
      });

      it('should enforce password minimum length', () => {
        const shortPassword = {
          email: 'admin@example.com',
          password: '1234567',
          fullName: 'Admin User'
        };

        expect(() => CreateAdminUserSchema.parse(shortPassword)).toThrow();
      });

      it('should apply default role', () => {
        const userData = {
          email: 'admin@example.com',
          password: 'SecurePassword123!',
          fullName: 'Admin User'
        };

        const result = CreateAdminUserSchema.parse(userData);
        expect(result.role).toBe('admin');
      });

      it('should validate role values', () => {
        const validRoles = ['admin', 'super_admin'];
        const invalidRoles = ['user', 'moderator', 'guest'];

        validRoles.forEach(role => {
          const data = {
            email: 'test@example.com',
            password: 'password123',
            fullName: 'Test User',
            role
          };
          expect(() => CreateAdminUserSchema.parse(data)).not.toThrow();
        });

        invalidRoles.forEach(role => {
          const data = {
            email: 'test@example.com',
            password: 'password123',
            fullName: 'Test User',
            role
          };
          expect(() => CreateAdminUserSchema.parse(data)).toThrow();
        });
      });
    });

    describe('CreateUserSchema', () => {
      it('should validate user creation with all fields', () => {
        const validData = {
          email: 'user@example.com',
          password: 'userpassword',
          fullName: 'Regular User',
          phone: '+1234567890',
          role: 'member',
          organizationId: '123e4567-e89b-12d3-a456-426614174000',
          department: 'Sales',
          jobTitle: 'Account Manager'
        };

        expect(() => CreateUserSchema.parse(validData)).not.toThrow();
      });

      it('should apply default role', () => {
        const minimalData = {
          email: 'user@example.com',
          fullName: 'User Name'
        };

        const result = CreateUserSchema.parse(minimalData);
        expect(result.role).toBe('member');
      });

      it('should validate user role values', () => {
        const validRoles = ['admin', 'member', 'readonly', 'contact'];
        validRoles.forEach(role => {
          const data = {
            email: 'test@example.com',
            fullName: 'Test User',
            role
          };
          expect(() => CreateUserSchema.parse(data)).not.toThrow();
        });
      });

      it('should require email and fullName', () => {
        const missingEmail = { fullName: 'Test User' };
        expect(() => CreateUserSchema.parse(missingEmail)).toThrow();

        const missingName = { email: 'test@example.com' };
        expect(() => CreateUserSchema.parse(missingName)).toThrow();
      });
    });
  });

  describe('Catalog Item Validation Schemas', () => {
    describe('CreateCatalogItemSchema', () => {
      it('should validate catalog item creation', () => {
        const validData = {
          orgId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Product',
          sportId: '123e4567-e89b-12d3-a456-426614174001',
          basePrice: 29.99,
          turnaroundDays: 14,
          moq: 50,
          fabric: 'Cotton blend',
          imageUrls: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']
        };

        expect(() => CreateCatalogItemSchema.parse(validData)).not.toThrow();
      });

      it('should require valid UUID for orgId', () => {
        const invalidOrgId = {
          orgId: 'invalid-uuid',
          name: 'Test Product'
        };

        expect(() => CreateCatalogItemSchema.parse(invalidOrgId)).toThrow();
      });

      it('should require positive values for numeric fields', () => {
        const negativePrice = {
          orgId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Product',
          basePrice: -10.00
        };

        expect(() => CreateCatalogItemSchema.parse(negativePrice)).toThrow();

        const negativeTurnaround = {
          orgId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Product',
          turnaroundDays: -5
        };

        expect(() => CreateCatalogItemSchema.parse(negativeTurnaround)).toThrow();
      });

      it('should validate image URLs', () => {
        const invalidUrls = {
          orgId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Product',
          imageUrls: ['not-a-url', 'also-invalid']
        };

        expect(() => CreateCatalogItemSchema.parse(invalidUrls)).toThrow();
      });
    });
  });

  describe('Order Validation Schemas', () => {
    describe('CreateOrderSchema', () => {
      it('should validate order creation', () => {
        const validData = {
          organizationId: '123e4567-e89b-12d3-a456-426614174000',
          customerName: 'Customer Name',
          totalAmount: 199.99,
          items: [
            {
              productId: '123e4567-e89b-12d3-a456-426614174001',
              quantity: 2,
              price: 99.99
            }
          ],
          notes: 'Order notes',
          salespersonId: '123e4567-e89b-12d3-a456-426614174002'
        };

        expect(() => CreateOrderSchema.parse(validData)).not.toThrow();
      });

      it('should require positive quantities and prices', () => {
        const invalidItem = {
          organizationId: '123e4567-e89b-12d3-a456-426614174000',
          customerName: 'Customer Name',
          items: [
            {
              productId: '123e4567-e89b-12d3-a456-426614174001',
              quantity: -1,
              price: -10.00
            }
          ]
        };

        expect(() => CreateOrderSchema.parse(invalidItem)).toThrow();
      });

      it('should require valid UUIDs for product IDs', () => {
        const invalidProductId = {
          organizationId: '123e4567-e89b-12d3-a456-426614174000',
          customerName: 'Customer Name',
          items: [
            {
              productId: 'invalid-uuid',
              quantity: 1,
              price: 10.00
            }
          ]
        };

        expect(() => CreateOrderSchema.parse(invalidProductId)).toThrow();
      });
    });

    describe('UpdateOrderStatusSchema', () => {
      it('should validate status updates', () => {
        const validStatuses = ['draft', 'pending', 'confirmed', 'in_production', 'shipped', 'delivered', 'cancelled'];

        validStatuses.forEach(status => {
          expect(() => UpdateOrderStatusSchema.parse({ statusCode: status })).not.toThrow();
        });
      });

      it('should reject invalid statuses', () => {
        const invalidStatuses = ['unknown', 'processing', 'completed'];

        invalidStatuses.forEach(status => {
          expect(() => UpdateOrderStatusSchema.parse({ statusCode: status })).toThrow();
        });
      });
    });
  });

  describe('File Upload Validation Schemas', () => {
    describe('SignedUrlSchema', () => {
      it('should validate signed URL requests', () => {
        const validData = {
          fileName: 'document.pdf',
          fileType: 'application/pdf',
          fileSize: 1024 * 1024 // 1MB
        };

        expect(() => SignedUrlSchema.parse(validData)).not.toThrow();
      });

      it('should enforce file size limits', () => {
        const largeFile = {
          fileName: 'large.pdf',
          fileType: 'application/pdf',
          fileSize: 15 * 1024 * 1024 // 15MB - exceeds 10MB limit
        };

        expect(() => SignedUrlSchema.parse(largeFile)).toThrow();
      });

      it('should require fileName and fileType', () => {
        expect(() => SignedUrlSchema.parse({ fileName: 'test.pdf' })).toThrow();
        expect(() => SignedUrlSchema.parse({ fileType: 'application/pdf' })).toThrow();
      });
    });

    describe('AssetUploadSchema', () => {
      it('should validate asset uploads', () => {
        const validAssets = [
          { assetType: 'logo' },
          { assetType: 'titleCard', fileName: 'card.jpg' },
          { assetType: 'branding', fileType: 'image/png' }
        ];

        validAssets.forEach(asset => {
          expect(() => AssetUploadSchema.parse(asset)).not.toThrow();
        });
      });

      it('should enforce valid asset types', () => {
        const invalidAssetType = { assetType: 'invalid' };
        expect(() => AssetUploadSchema.parse(invalidAssetType)).toThrow();
      });
    });
  });

  describe('Organization Validation Schema', () => {
    describe('UpdateOrganizationSchema', () => {
      it('should validate organization updates', () => {
        const validData = {
          name: 'Updated Organization Name',
          isBusiness: true,
          brandPrimary: '#FF5733',
          brandSecondary: '#33C3FF',
          email: 'contact@organization.com',
          website: 'https://organization.com',
          phone: '+1234567890',
          status: 'active'
        };

        expect(() => UpdateOrganizationSchema.parse(validData)).not.toThrow();
      });

      it('should validate color format', () => {
        const invalidColors = [
          { brandPrimary: 'red' },
          { brandPrimary: '#GGG' },
          { brandPrimary: '#12345' },
          { brandSecondary: 'rgb(255,0,0)' }
        ];

        invalidColors.forEach(data => {
          expect(() => UpdateOrganizationSchema.parse(data)).toThrow();
        });

        const validColors = ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF', '#000000'];
        validColors.forEach(color => {
          expect(() => UpdateOrganizationSchema.parse({ brandPrimary: color })).not.toThrow();
        });
      });

      it('should validate email and URL formats', () => {
        const invalidEmail = { email: 'not-an-email' };
        expect(() => UpdateOrganizationSchema.parse(invalidEmail)).toThrow();

        const invalidUrl = { website: 'not-a-url' };
        expect(() => UpdateOrganizationSchema.parse(invalidUrl)).toThrow();

        const validData = {
          email: 'valid@example.com',
          website: 'https://valid-url.com'
        };
        expect(() => UpdateOrganizationSchema.parse(validData)).not.toThrow();
      });

      it('should validate status values', () => {
        const validStatuses = ['active', 'inactive', 'suspended'];
        const invalidStatuses = ['pending', 'disabled', 'archived'];

        validStatuses.forEach(status => {
          expect(() => UpdateOrganizationSchema.parse({ status })).not.toThrow();
        });

        invalidStatuses.forEach(status => {
          expect(() => UpdateOrganizationSchema.parse({ status })).toThrow();
        });
      });

      it('should validate name length constraints', () => {
        const tooShort = { name: '' };
        const tooLong = { name: 'x'.repeat(121) };
        const validLength = { name: 'Valid Organization Name' };

        expect(() => UpdateOrganizationSchema.parse(tooShort)).toThrow();
        expect(() => UpdateOrganizationSchema.parse(tooLong)).toThrow();
        expect(() => UpdateOrganizationSchema.parse(validLength)).not.toThrow();
      });
    });
  });
});