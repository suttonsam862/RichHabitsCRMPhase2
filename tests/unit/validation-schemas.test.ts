import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  OrderStatusSchema,
  OrderItemStatusSchema,
  validateStatusTransition,
  OrderDTO,
  CreateOrderDTO,
  UpdateOrderDTO,
  OrderItemDTO
} from '../../shared/dtos/enhanced/OrderDTO';

describe('Order Validation Schemas', () => {
  
  describe('OrderStatusSchema', () => {
    it('should accept valid order statuses', () => {
      const validStatuses = [
        'draft', 'pending', 'confirmed', 'processing', 
        'shipped', 'delivered', 'completed', 'cancelled', 'on_hold'
      ];

      validStatuses.forEach(status => {
        expect(() => OrderStatusSchema.parse(status)).not.toThrow();
      });
    });

    it('should reject invalid order statuses', () => {
      const invalidStatuses = [
        'invalid', 'DRAFT', 'Pending', '', null, undefined, 123, {}
      ];

      invalidStatuses.forEach(status => {
        expect(() => OrderStatusSchema.parse(status)).toThrow();
      });
    });

    it('should provide descriptive error messages for invalid statuses', () => {
      try {
        OrderStatusSchema.parse('invalid_status');
      } catch (error) {
        if (error instanceof z.ZodError) {
          expect(error.errors[0].message).toContain('Invalid order status');
          expect(error.errors[0].message).toContain('draft, pending, confirmed');
        }
      }
    });
  });

  describe('OrderItemStatusSchema', () => {
    it('should accept valid order item statuses', () => {
      const validStatuses = [
        'pending_design', 'design_in_progress', 'design_approved',
        'pending_manufacturing', 'in_production', 'quality_check',
        'completed', 'cancelled'
      ];

      validStatuses.forEach(status => {
        expect(() => OrderItemStatusSchema.parse(status)).not.toThrow();
      });
    });

    it('should reject invalid order item statuses', () => {
      const invalidStatuses = ['invalid', 'COMPLETED', '', null, 123];

      invalidStatuses.forEach(status => {
        expect(() => OrderItemStatusSchema.parse(status)).toThrow();
      });
    });
  });

  describe('validateStatusTransition', () => {
    it('should allow valid status transitions', () => {
      // Test all valid transitions
      expect(validateStatusTransition('draft', 'pending')).toBe(true);
      expect(validateStatusTransition('draft', 'cancelled')).toBe(true);
      expect(validateStatusTransition('pending', 'confirmed')).toBe(true);
      expect(validateStatusTransition('pending', 'cancelled')).toBe(true);
      expect(validateStatusTransition('confirmed', 'processing')).toBe(true);
      expect(validateStatusTransition('processing', 'shipped')).toBe(true);
      expect(validateStatusTransition('processing', 'on_hold')).toBe(true);
      expect(validateStatusTransition('shipped', 'delivered')).toBe(true);
      expect(validateStatusTransition('delivered', 'completed')).toBe(true);
      expect(validateStatusTransition('on_hold', 'processing')).toBe(true);
    });

    it('should reject invalid status transitions', () => {
      // Test invalid transitions
      expect(validateStatusTransition('draft', 'shipped')).toBe(false);
      expect(validateStatusTransition('completed', 'pending')).toBe(false);
      expect(validateStatusTransition('cancelled', 'draft')).toBe(false);
      expect(validateStatusTransition('delivered', 'shipped')).toBe(false);
      expect(validateStatusTransition('shipped', 'confirmed')).toBe(false);
    });

    it('should allow same status transitions', () => {
      const allStatuses = [
        'draft', 'pending', 'confirmed', 'processing',
        'shipped', 'delivered', 'completed', 'cancelled', 'on_hold'
      ];

      allStatuses.forEach(status => {
        expect(validateStatusTransition(status, status)).toBe(true);
      });
    });

    it('should handle unknown statuses gracefully', () => {
      expect(validateStatusTransition('unknown_status', 'draft')).toBe(false);
      expect(validateStatusTransition('draft', 'unknown_status')).toBe(false);
      expect(validateStatusTransition('unknown1', 'unknown2')).toBe(false);
    });

    it('should respect terminal state rules', () => {
      // Completed and cancelled are terminal states
      expect(validateStatusTransition('completed', 'draft')).toBe(false);
      expect(validateStatusTransition('completed', 'pending')).toBe(false);
      expect(validateStatusTransition('cancelled', 'draft')).toBe(false);
      expect(validateStatusTransition('cancelled', 'pending')).toBe(false);
    });
  });

  describe('OrderItemDTO validation', () => {
    const validOrderItem = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      orgId: '123e4567-e89b-12d3-a456-426614174001',
      orderId: '123e4567-e89b-12d3-a456-426614174002',
      quantity: 10,
      statusCode: 'pending_design',
      priceSnapshot: 25.99,
      createdAt: '2025-01-20T10:00:00Z',
      updatedAt: '2025-01-20T10:00:00Z'
    };

    it('should validate a complete order item', () => {
      expect(() => OrderItemDTO.parse(validOrderItem)).not.toThrow();
    });

    it('should enforce business rule: designer assignment status constraint', () => {
      const itemWithDesignerInWrongStatus = {
        ...validOrderItem,
        designerId: '123e4567-e89b-12d3-a456-426614174003',
        statusCode: 'in_production'
      };

      expect(() => OrderItemDTO.parse(itemWithDesignerInWrongStatus)).toThrow();
    });

    it('should allow designer assignment in design statuses', () => {
      const designStatuses = ['pending_design', 'design_in_progress', 'design_approved'];
      
      designStatuses.forEach(status => {
        const item = {
          ...validOrderItem,
          designerId: '123e4567-e89b-12d3-a456-426614174003',
          statusCode: status
        };
        
        expect(() => OrderItemDTO.parse(item)).not.toThrow();
      });
    });

    it('should enforce business rule: completed items must have valid quantity and price', () => {
      const completedItemWithoutPrice = {
        ...validOrderItem,
        statusCode: 'completed',
        priceSnapshot: undefined
      };

      expect(() => OrderItemDTO.parse(completedItemWithoutPrice)).toThrow();

      const completedItemWithZeroPrice = {
        ...validOrderItem,
        statusCode: 'completed',
        priceSnapshot: 0
      };

      expect(() => OrderItemDTO.parse(completedItemWithZeroPrice)).toThrow();
    });

    it('should validate quantity constraints', () => {
      const negativeQuantity = { ...validOrderItem, quantity: -1 };
      expect(() => OrderItemDTO.parse(negativeQuantity)).toThrow();

      const zeroQuantity = { ...validOrderItem, quantity: 0 };
      expect(() => OrderItemDTO.parse(zeroQuantity)).toThrow();

      const excessiveQuantity = { ...validOrderItem, quantity: 50000 };
      expect(() => OrderItemDTO.parse(excessiveQuantity)).toThrow();

      const validQuantity = { ...validOrderItem, quantity: 100 };
      expect(() => OrderItemDTO.parse(validQuantity)).not.toThrow();
    });

    it('should validate UUID fields', () => {
      const invalidUUID = { ...validOrderItem, id: 'invalid-uuid' };
      expect(() => OrderItemDTO.parse(invalidUUID)).toThrow();

      const invalidOrgId = { ...validOrderItem, orgId: 'not-a-uuid' };
      expect(() => OrderItemDTO.parse(invalidOrgId)).toThrow();
    });

    it('should validate optional URL fields', () => {
      const invalidURL = { ...validOrderItem, variantImageUrl: 'not-a-url' };
      expect(() => OrderItemDTO.parse(invalidURL)).toThrow();

      const validURL = { ...validOrderItem, variantImageUrl: 'https://example.com/image.jpg' };
      expect(() => OrderItemDTO.parse(validURL)).not.toThrow();
    });

    it('should validate build overrides text length', () => {
      const longText = 'a'.repeat(2001);
      const excessiveOverrides = { ...validOrderItem, buildOverridesText: longText };
      expect(() => OrderItemDTO.parse(excessiveOverrides)).toThrow();

      const validOverrides = { ...validOrderItem, buildOverridesText: 'Custom build instructions' };
      expect(() => OrderItemDTO.parse(validOverrides)).not.toThrow();
    });
  });

  describe('OrderDTO validation', () => {
    const validOrder = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      orgId: '123e4567-e89b-12d3-a456-426614174001',
      customerId: '123e4567-e89b-12d3-a456-426614174002',
      code: 'ORD-20250120-0001',
      statusCode: 'draft',
      customerContactName: 'John Doe',
      customerContactEmail: 'john@example.com',
      customerContactPhone: '+1234567890',
      totalAmount: 499.99,
      revenueEstimate: 299.99,
      dueDate: '2025-02-20T10:00:00Z',
      notes: 'Test order notes',
      createdAt: '2025-01-20T10:00:00Z',
      updatedAt: '2025-01-20T10:00:00Z'
    };

    it('should validate a complete order', () => {
      expect(() => OrderDTO.parse(validOrder)).not.toThrow();
    });

    it('should validate order code format', () => {
      const invalidFormats = [
        'ORD-2025-0001',
        'ORDER-20250120-0001', 
        'ORD-20250120-001',
        'ORD-2025012-0001',
        'ORD-20250120-ABCD'
      ];

      invalidFormats.forEach(code => {
        const order = { ...validOrder, code };
        expect(() => OrderDTO.parse(order)).toThrow();
      });

      const validCodes = [
        'ORD-20250120-0001',
        'ORD-20251231-9999',
        'ORD-20250101-0000'
      ];

      validCodes.forEach(code => {
        const order = { ...validOrder, code };
        expect(() => OrderDTO.parse(order)).not.toThrow();
      });
    });

    it('should validate email format and transformation', () => {
      const emailTests = [
        { input: 'JOHN@EXAMPLE.COM', expected: 'john@example.com' },
        { input: '  user@domain.org  ', expected: 'user@domain.org' },
        { input: 'Test.Email@Gmail.COM', expected: 'test.email@gmail.com' }
      ];

      emailTests.forEach(({ input, expected }) => {
        const order = { ...validOrder, customerContactEmail: input };
        const result = OrderDTO.parse(order);
        expect(result.customerContactEmail).toBe(expected);
      });

      const invalidEmails = ['invalid-email', 'user@', '@domain.com', 'user..double@domain.com'];
      invalidEmails.forEach(email => {
        const order = { ...validOrder, customerContactEmail: email };
        expect(() => OrderDTO.parse(order)).toThrow();
      });
    });

    it('should validate phone number format and transformation', () => {
      const phoneTests = [
        { input: '+1 (555) 123-4567', expected: '+15551234567' },
        { input: '555.123.4567', expected: '5551234567' },
        { input: '(555) 123 4567', expected: '5551234567' },
        { input: '+44 20 7946 0958', expected: '+442079460958' }
      ];

      phoneTests.forEach(({ input, expected }) => {
        const order = { ...validOrder, customerContactPhone: input };
        const result = OrderDTO.parse(order);
        expect(result.customerContactPhone).toBe(expected);
      });

      const invalidPhones = ['123', '12345678901234567890', 'abc-def-ghij'];
      invalidPhones.forEach(phone => {
        const order = { ...validOrder, customerContactPhone: phone };
        expect(() => OrderDTO.parse(order)).toThrow();
      });
    });

    it('should enforce business rule: due date must be in future for active orders', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const orderWithPastDue = {
        ...validOrder,
        statusCode: 'pending',
        dueDate: pastDate.toISOString()
      };

      expect(() => OrderDTO.parse(orderWithPastDue)).toThrow();

      // Should allow past due date for completed/cancelled orders
      const completedOrderWithPastDue = {
        ...validOrder,
        statusCode: 'completed',
        dueDate: pastDate.toISOString()
      };

      expect(() => OrderDTO.parse(completedOrderWithPastDue)).not.toThrow();
    });

    it('should enforce business rule: revenue estimate cannot exceed total amount', () => {
      const orderWithExcessiveRevenue = {
        ...validOrder,
        totalAmount: 100.00,
        revenueEstimate: 150.00
      };

      expect(() => OrderDTO.parse(orderWithExcessiveRevenue)).toThrow();

      const validRevenueOrder = {
        ...validOrder,
        totalAmount: 100.00,
        revenueEstimate: 80.00
      };

      expect(() => OrderDTO.parse(validRevenueOrder)).not.toThrow();
    });

    it('should enforce business rule: completed orders must have contact information', () => {
      const completedOrderWithoutContact = {
        ...validOrder,
        statusCode: 'completed',
        customerContactName: undefined,
        customerContactEmail: undefined
      };

      expect(() => OrderDTO.parse(completedOrderWithoutContact)).toThrow();

      const completedOrderWithName = {
        ...validOrder,
        statusCode: 'completed',
        customerContactName: 'John Doe',
        customerContactEmail: undefined
      };

      expect(() => OrderDTO.parse(completedOrderWithName)).not.toThrow();

      const completedOrderWithEmail = {
        ...validOrder,
        statusCode: 'completed',
        customerContactName: undefined,
        customerContactEmail: 'john@example.com'
      };

      expect(() => OrderDTO.parse(completedOrderWithEmail)).not.toThrow();
    });

    it('should validate monetary amounts', () => {
      const negativeAmount = { ...validOrder, totalAmount: -100 };
      expect(() => OrderDTO.parse(negativeAmount)).toThrow();

      const excessiveAmount = { ...validOrder, totalAmount: 2000000 };
      expect(() => OrderDTO.parse(excessiveAmount)).toThrow();

      const validAmounts = [0, 0.01, 999999.99];
      validAmounts.forEach(amount => {
        const order = { ...validOrder, totalAmount: amount };
        expect(() => OrderDTO.parse(order)).not.toThrow();
      });
    });

    it('should validate string length constraints', () => {
      const longNotes = 'x'.repeat(5001);
      const orderWithLongNotes = { ...validOrder, notes: longNotes };
      expect(() => OrderDTO.parse(orderWithLongNotes)).toThrow();

      const shortName = 'A';
      const orderWithShortName = { ...validOrder, customerContactName: shortName };
      expect(() => OrderDTO.parse(orderWithShortName)).toThrow();

      const longName = 'x'.repeat(101);
      const orderWithLongName = { ...validOrder, customerContactName: longName };
      expect(() => OrderDTO.parse(orderWithLongName)).toThrow();
    });

    it('should validate item count constraints', () => {
      const tooManyItems = Array(101).fill(null).map((_, i) => ({
        id: `123e4567-e89b-12d3-a456-42661417400${i}`,
        orgId: validOrder.orgId,
        orderId: validOrder.id,
        quantity: 1,
        statusCode: 'pending_design',
        createdAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-01-20T10:00:00Z'
      }));

      const orderWithTooManyItems = { ...validOrder, items: tooManyItems };
      expect(() => OrderDTO.parse(orderWithTooManyItems)).toThrow();
    });
  });

  describe('CreateOrderDTO validation', () => {
    const validCreateOrder = {
      orgId: '123e4567-e89b-12d3-a456-426614174001',
      customerId: '123e4567-e89b-12d3-a456-426614174002',
      customerContactName: 'John Doe',
      customerContactEmail: 'john@example.com',
      dueDate: '2025-02-20T10:00:00Z'
    };

    it('should validate a valid create order request', () => {
      expect(() => CreateOrderDTO.parse(validCreateOrder)).not.toThrow();
    });

    it('should enforce business rule: either email or phone required', () => {
      const orderWithoutContact = {
        orgId: '123e4567-e89b-12d3-a456-426614174001',
        customerId: '123e4567-e89b-12d3-a456-426614174002',
        customerContactName: 'John Doe'
      };

      expect(() => CreateOrderDTO.parse(orderWithoutContact)).toThrow();

      const orderWithEmail = {
        ...orderWithoutContact,
        customerContactEmail: 'john@example.com'
      };

      expect(() => CreateOrderDTO.parse(orderWithEmail)).not.toThrow();

      const orderWithPhone = {
        ...orderWithoutContact,
        customerContactPhone: '+1234567890'
      };

      expect(() => CreateOrderDTO.parse(orderWithPhone)).not.toThrow();
    });

    it('should enforce due date must be in future', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const orderWithPastDue = {
        ...validCreateOrder,
        dueDate: pastDate.toISOString()
      };

      expect(() => CreateOrderDTO.parse(orderWithPastDue)).toThrow();
    });

    it('should require minimum 1 item if items provided', () => {
      const orderWithNoItems = {
        ...validCreateOrder,
        items: []
      };

      expect(() => CreateOrderDTO.parse(orderWithNoItems)).toThrow();
    });

    it('should validate required fields', () => {
      const requiredFields = ['orgId', 'customerId', 'customerContactName'];
      
      requiredFields.forEach(field => {
        const incompleteOrder = { ...validCreateOrder };
        delete incompleteOrder[field];
        expect(() => CreateOrderDTO.parse(incompleteOrder)).toThrow();
      });
    });
  });

  describe('UpdateOrderDTO validation', () => {
    it('should allow partial updates', () => {
      const partialUpdates = [
        { totalAmount: 299.99 },
        { customerContactName: 'Jane Doe' },
        { statusCode: 'pending' },
        { notes: 'Updated notes' }
      ];

      partialUpdates.forEach(update => {
        expect(() => UpdateOrderDTO.parse(update)).not.toThrow();
      });
    });

    it('should validate updated fields follow same rules', () => {
      const invalidUpdates = [
        { totalAmount: -100 }, // Negative amount
        { customerContactName: 'A' }, // Too short
        { customerContactEmail: 'invalid-email' }, // Invalid email
        { revenueEstimate: -50 } // Negative revenue
      ];

      invalidUpdates.forEach(update => {
        expect(() => UpdateOrderDTO.parse(update)).toThrow();
      });
    });

    it('should enforce revenue estimate vs total amount business rule', () => {
      const invalidUpdate = {
        totalAmount: 100.00,
        revenueEstimate: 150.00
      };

      expect(() => UpdateOrderDTO.parse(invalidUpdate)).toThrow();

      const validUpdate = {
        totalAmount: 150.00,
        revenueEstimate: 100.00
      };

      expect(() => UpdateOrderDTO.parse(validUpdate)).not.toThrow();
    });
  });
});