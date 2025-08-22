import { describe, it, expect } from 'vitest';
import { z } from 'zod';

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

describe('Validation Schemas', () => {
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