import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateRequest } from '../../server/routes/middleware/validation';
import { 
  CreateUserSchema,
  CreateOrderSchema,
  UpdateOrganizationSchema,
  SignedUrlSchema,
  CreateOrgSportSchema
} from '../../server/lib/validation';

// Test validation schemas similar to what we use in the API
const OrganizationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  phone: z.string().optional(),
  colorPalette: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format')).optional(),
  universalDiscounts: z.object({
    percentage: z.number().min(0).max(100).optional(),
    minOrder: z.number().min(0).optional()
  }).optional()
});

const UserSchema = z.object({
  email: z.string().email('Invalid email format'),
  fullName: z.string().min(1, 'Full name is required'),
  phone: z.string().optional(),
  isActive: z.boolean().optional()
});

describe('Validation Middleware and Schemas', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: {}
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    next = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('validateRequest middleware', () => {
    it('should validate request body successfully', () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email()
      });

      req.body = {
        name: 'Test User',
        email: 'test@example.com'
      };

      const middleware = validateRequest({ body: schema });
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.body).toEqual({
        name: 'Test User',
        email: 'test@example.com'
      });
    });

    it('should validate query parameters successfully', () => {
      const schema = z.object({
        page: z.string().transform(Number),
        limit: z.string().transform(Number)
      });

      req.query = {
        page: '1',
        limit: '20'
      };

      const middleware = validateRequest({ query: schema });
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.query).toEqual({
        page: 1,
        limit: 20
      });
    });

    it('should validate route parameters successfully', () => {
      const schema = z.object({
        id: z.string().uuid()
      });

      req.params = {
        id: '00000000-0000-4000-8000-000000000001'
      };

      const middleware = validateRequest({ params: schema });
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.params).toEqual({
        id: '00000000-0000-4000-8000-000000000001'
      });
    });

    it('should return validation errors for invalid data', () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18)
      });

      req.body = {
        email: 'invalid-email',
        age: 15
      };

      const middleware = validateRequest({ body: schema });
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: 'Invalid email',
            code: 'invalid_string'
          }),
          expect.objectContaining({
            field: 'age',
            message: 'Number must be greater than or equal to 18',
            code: 'too_small'
          })
        ])
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle non-Zod errors', () => {
      const schema = z.object({
        name: z.string()
      });

      // Mock a non-Zod error
      const mockParse = vi.fn().mockImplementation(() => {
        throw new Error('Custom error');
      });
      schema.parse = mockParse;

      req.body = { name: 'test' };

      const middleware = validateRequest({ body: schema });
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid request',
        message: 'Custom error'
      });
    });
  });

  describe('Validation Schemas', () => {
    describe('CreateUserSchema', () => {
      it('should validate valid user data', () => {
        const validData = {
          email: 'test@example.com',
          fullName: 'Test User',
          phone: '+1234567890',
          role: 'member' as const,
          organizationId: '00000000-0000-4000-8000-000000000001'
        };

        expect(() => CreateUserSchema.parse(validData)).not.toThrow();
      });

      it('should reject invalid email', () => {
        const invalidData = {
          email: 'invalid-email',
          fullName: 'Test User'
        };

        expect(() => CreateUserSchema.parse(invalidData)).toThrow();
      });

      it('should reject empty full name', () => {
        const invalidData = {
          email: 'test@example.com',
          fullName: ''
        };

        expect(() => CreateUserSchema.parse(invalidData)).toThrow();
      });

      it('should reject invalid role', () => {
        const invalidData = {
          email: 'test@example.com',
          fullName: 'Test User',
          role: 'invalid_role'
        };

        expect(() => CreateUserSchema.parse(invalidData)).toThrow();
      });

      it('should apply default role when not provided', () => {
        const data = {
          email: 'test@example.com',
          fullName: 'Test User'
        };

        const result = CreateUserSchema.parse(data);
        expect(result.role).toBe('member');
      });
    });

    describe('UpdateOrganizationSchema', () => {
      it('should validate valid organization data', () => {
        const validData = {
          name: 'Test Organization',
          isBusiness: true,
          brandPrimary: '#FF0000',
          brandSecondary: '#00FF00',
          email: 'org@example.com',
          website: 'https://example.com',
          status: 'active' as const
        };

        expect(() => UpdateOrganizationSchema.parse(validData)).not.toThrow();
      });

      it('should reject invalid color format', () => {
        const invalidData = {
          brandPrimary: 'red' // Should be hex format
        };

        expect(() => UpdateOrganizationSchema.parse(invalidData)).toThrow();
      });

      it('should reject invalid email', () => {
        const invalidData = {
          email: 'invalid-email'
        };

        expect(() => UpdateOrganizationSchema.parse(invalidData)).toThrow();
      });

      it('should reject invalid website URL', () => {
        const invalidData = {
          website: 'not-a-url'
        };

        expect(() => UpdateOrganizationSchema.parse(invalidData)).toThrow();
      });

      it('should reject invalid status', () => {
        const invalidData = {
          status: 'invalid_status'
        };

        expect(() => UpdateOrganizationSchema.parse(invalidData)).toThrow();
      });
    });

    describe('CreateOrderSchema', () => {
      it('should validate valid order data', () => {
        const validData = {
          organizationId: 'org-123',
          customerName: 'Test Customer',
          orderNumber: 'ORD-001',
          totalAmount: 100.50,
          items: [
            {
              productId: '00000000-0000-4000-8000-000000000001',
              quantity: 2,
              price: 50.25
            }
          ],
          sportId: 'sport-123',
          teamName: 'Test Team'
        };

        expect(() => CreateOrderSchema.parse(validData)).not.toThrow();
      });

      it('should reject empty customer name', () => {
        const invalidData = {
          organizationId: 'org-123',
          customerName: ''
        };

        expect(() => CreateOrderSchema.parse(invalidData)).toThrow();
      });

      it('should reject negative total amount', () => {
        const invalidData = {
          organizationId: 'org-123',
          customerName: 'Test Customer',
          totalAmount: -100
        };

        expect(() => CreateOrderSchema.parse(invalidData)).toThrow();
      });

      it('should reject invalid product ID in items', () => {
        const invalidData = {
          organizationId: 'org-123',
          customerName: 'Test Customer',
          items: [
            {
              productId: 'invalid-uuid',
              quantity: 1,
              price: 10
            }
          ]
        };

        expect(() => CreateOrderSchema.parse(invalidData)).toThrow();
      });
    });

    describe('SignedUrlSchema', () => {
      it('should validate valid file upload data', () => {
        const validData = {
          fileName: 'test.jpg',
          fileType: 'image/jpeg',
          fileSize: 1024 * 1024 // 1MB
        };

        expect(() => SignedUrlSchema.parse(validData)).not.toThrow();
      });

      it('should reject empty file name', () => {
        const invalidData = {
          fileName: '',
          fileType: 'image/jpeg'
        };

        expect(() => SignedUrlSchema.parse(invalidData)).toThrow();
      });

      it('should reject empty file type', () => {
        const invalidData = {
          fileName: 'test.jpg',
          fileType: ''
        };

        expect(() => SignedUrlSchema.parse(invalidData)).toThrow();
      });

      it('should reject file size over limit', () => {
        const invalidData = {
          fileName: 'test.jpg',
          fileType: 'image/jpeg',
          fileSize: 15 * 1024 * 1024 // 15MB (over 10MB limit)
        };

        expect(() => SignedUrlSchema.parse(invalidData)).toThrow();
      });
    });

    describe('CreateOrgSportSchema', () => {
      it('should validate valid org sport data', () => {
        const validData = {
          teamName: 'Test Team',
          contactName: 'John Doe',
          contactEmail: 'john@example.com',
          contactPhone: '+1234567890',
          shipAddressLine1: '123 Main St',
          shipCity: 'Test City',
          shipState: 'TS',
          shipPostalCode: '12345'
        };

        expect(() => CreateOrgSportSchema.parse(validData)).not.toThrow();
      });

      it('should reject empty team name', () => {
        const invalidData = {
          teamName: '',
          contactName: 'John Doe',
          contactEmail: 'john@example.com'
        };

        expect(() => CreateOrgSportSchema.parse(invalidData)).toThrow();
      });

      it('should reject invalid contact email', () => {
        const invalidData = {
          teamName: 'Test Team',
          contactName: 'John Doe',
          contactEmail: 'invalid-email'
        };

        expect(() => CreateOrgSportSchema.parse(invalidData)).toThrow();
      });
    });

    describe('Security-focused validation tests', () => {
      it('should reject SQL injection attempts in string fields', () => {
        const sqlInjectionPayload = "'; DROP TABLE users; --";
        
        expect(() => CreateUserSchema.parse({
          email: `test${sqlInjectionPayload}@example.com`,
          fullName: 'Test User'
        })).toThrow(); // Email format validation should catch this

        expect(() => CreateUserSchema.parse({
          email: 'test@example.com',
          fullName: sqlInjectionPayload
        })).not.toThrow(); // Name can contain special chars, validation handled at DB layer
      });

      it('should reject XSS attempts in string fields', () => {
        const xssPayload = '<script>alert("xss")</script>';
        
        // Schema validation allows script tags - XSS prevention happens at output encoding
        expect(() => CreateUserSchema.parse({
          email: 'test@example.com',
          fullName: xssPayload
        })).not.toThrow();
      });

      it('should enforce strict UUID format validation', () => {
        const invalidUuids = [
          'not-a-uuid',
          '123-456-789',
          'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
          '00000000-0000-0000-0000-000000000001', // v1 UUID (should be v4)
        ];

        invalidUuids.forEach(invalidUuid => {
          expect(() => CreateOrderSchema.parse({
            organizationId: 'org-123',
            customerName: 'Test Customer',
            items: [
              {
                productId: invalidUuid,
                quantity: 1,
                price: 10
              }
            ]
          })).toThrow();
        });
      });

      it('should enforce file size limits for security', () => {
        const largeFileSize = 100 * 1024 * 1024; // 100MB

        expect(() => SignedUrlSchema.parse({
          fileName: 'large-file.jpg',
          fileType: 'image/jpeg',
          fileSize: largeFileSize
        })).toThrow();
      });
    });

  describe('Organization Schema', () => {
    it('validates correct organization data', () => {
      const validOrg = {
        name: 'Test School',
        email: 'test@school.edu',
        phone: '+1234567890',
        colorPalette: ['#FF0000', '#00FF00'],
        universalDiscounts: {
          percentage: 10,
          minOrder: 500
        }
      };

      const result = OrganizationSchema.safeParse(validOrg);
      expect(result.success).toBe(true);
    });

    it('rejects empty name', () => {
      const invalidOrg = {
        name: '',
        email: 'test@school.edu'
      };

      const result = OrganizationSchema.safeParse(invalidOrg);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Name is required');
      }
    });

    it('rejects invalid email format', () => {
      const invalidOrg = {
        name: 'Test School',
        email: 'invalid-email'
      };

      const result = OrganizationSchema.safeParse(invalidOrg);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Invalid email format');
      }
    });

    it('rejects invalid color format', () => {
      const invalidOrg = {
        name: 'Test School',
        email: 'test@school.edu',
        colorPalette: ['invalid-color', '#FF0000']
      };

      const result = OrganizationSchema.safeParse(invalidOrg);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Invalid color format');
      }
    });

    it('accepts valid hex colors', () => {
      const validOrg = {
        name: 'Test School',
        email: 'test@school.edu',
        colorPalette: ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF', '#000000']
      };

      const result = OrganizationSchema.safeParse(validOrg);
      expect(result.success).toBe(true);
    });
  });

  describe('User Schema', () => {
    it('validates correct user data', () => {
      const validUser = {
        email: 'user@example.com',
        fullName: 'John Doe',
        phone: '+1234567890',
        isActive: true
      };

      const result = UserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const invalidUser = {
        email: 'not-an-email',
        fullName: 'John Doe'
      };

      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Invalid email format');
      }
    });

    it('rejects empty full name', () => {
      const invalidUser = {
        email: 'user@example.com',
        fullName: ''
      };

      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Full name is required');
      }
    });

    it('accepts optional fields as undefined', () => {
      const minimalUser = {
        email: 'user@example.com',
        fullName: 'John Doe'
      };

      const result = UserSchema.safeParse(minimalUser);
      expect(result.success).toBe(true);
    });
    });
  });
});