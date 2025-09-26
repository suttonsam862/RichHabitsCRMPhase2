import { Request, Response, NextFunction } from 'express';
import { AuthedRequest } from './auth';
import { db } from '../db';
import { ErrorFormatting } from '../../shared/validation-helpers';

/**
 * Business Rules Validation Middleware
 * Implements complex business logic validation that requires database access
 */

interface BusinessRuleViolation {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

class BusinessRulesValidator {
  // Order validation rules
  static async validateOrderBusinessRules(orderData: any, req: AuthedRequest): Promise<BusinessRuleViolation[]> {
    const violations: BusinessRuleViolation[] = [];

    try {
      // 1. Validate customer belongs to organization
      if (orderData.customerId && orderData.orgId) {
        const customer = await db.query.customers.findFirst({
          where: (customers, { eq, and }) => and(
            eq(customers.id, orderData.customerId),
            eq(customers.orgId, orderData.orgId)
          )
        });

        if (!customer) {
          violations.push({
            field: 'customerId',
            message: 'Customer does not belong to this organization',
            code: 'INVALID_CUSTOMER_ORG',
            severity: 'error'
          });
        }
      }

      // 2. Validate order totals calculation
      if (orderData.items && orderData.totalAmount) {
        const calculatedTotal = orderData.items.reduce((sum: number, item: any) => {
          return sum + ((item.quantity || 0) * (item.priceSnapshot || 0));
        }, 0);

        const tolerance = 0.01;
        if (Math.abs(orderData.totalAmount - calculatedTotal) > tolerance) {
          violations.push({
            field: 'totalAmount',
            message: `Total amount ${orderData.totalAmount} does not match calculated total ${calculatedTotal.toFixed(2)}`,
            code: 'INVALID_TOTAL_CALCULATION',
            severity: 'error'
          });
        }
      }

      // 3. Validate due date is reasonable
      if (orderData.dueDate) {
        const dueDate = new Date(orderData.dueDate);
        const now = new Date();
        const daysDiff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff < 1) {
          violations.push({
            field: 'dueDate',
            message: 'Due date must be at least 1 day in the future',
            code: 'DUE_DATE_TOO_SOON',
            severity: 'error'
          });
        } else if (daysDiff > 365) {
          violations.push({
            field: 'dueDate',
            message: 'Due date cannot be more than 1 year in the future',
            code: 'DUE_DATE_TOO_FAR',
            severity: 'warning'
          });
        }
      }

      // 4. Validate revenue estimate
      if (orderData.revenueEstimate && orderData.totalAmount) {
        const profitMargin = (orderData.revenueEstimate / orderData.totalAmount) * 100;
        if (profitMargin < 10) {
          violations.push({
            field: 'revenueEstimate',
            message: 'Profit margin is below 10% - please review pricing',
            code: 'LOW_PROFIT_MARGIN',
            severity: 'warning'
          });
        }
      }

      // 5. Validate item quantities are reasonable
      if (orderData.items) {
        for (let i = 0; i < orderData.items.length; i++) {
          const item = orderData.items[i];
          if (item.quantity > 1000) {
            violations.push({
              field: `items[${i}].quantity`,
              message: `Quantity ${item.quantity} is unusually high - please verify`,
              code: 'HIGH_QUANTITY_WARNING',
              severity: 'warning'
            });
          }
        }
      }

    } catch (error) {
      console.error('Error validating order business rules:', error);
      violations.push({
        field: 'general',
        message: 'Unable to validate business rules',
        code: 'VALIDATION_SYSTEM_ERROR',
        severity: 'error'
      });
    }

    return violations;
  }

  // Order status transition validation
  static async validateOrderStatusTransition(
    orderId: string, 
    currentStatus: string, 
    newStatus: string, 
    req: AuthedRequest
  ): Promise<BusinessRuleViolation[]> {
    const violations: BusinessRuleViolation[] = [];

    // Define valid status transitions
    const validTransitions: Record<string, string[]> = {
      'draft': ['pending', 'cancelled'],
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['processing', 'cancelled'],
      'processing': ['shipped', 'cancelled', 'on_hold'],
      'shipped': ['delivered'],
      'delivered': ['completed'],
      'completed': [], // Terminal state
      'cancelled': [], // Terminal state
      'on_hold': ['processing', 'cancelled']
    };

    // Check if transition is valid
    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      violations.push({
        field: 'statusCode',
        message: `Cannot transition from '${currentStatus}' to '${newStatus}'`,
        code: 'INVALID_STATUS_TRANSITION',
        severity: 'error'
      });
      return violations;
    }

    try {
      // Business rule: Can't ship without all items being completed
      if (newStatus === 'shipped') {
        const orderItems = await db.query.orderItems.findMany({
          where: (orderItems, { eq }) => eq(orderItems.orderId, orderId)
        });

        const incompleteItems = orderItems.filter(item => 
          !['completed', 'cancelled'].includes(item.statusCode || '')
        );

        if (incompleteItems.length > 0) {
          violations.push({
            field: 'statusCode',
            message: `Cannot ship order - ${incompleteItems.length} items are not completed`,
            code: 'INCOMPLETE_ITEMS_CANNOT_SHIP',
            severity: 'error'
          });
        }
      }

      // Business rule: Can't complete without payment verification
      if (newStatus === 'completed') {
        // Check for payment records (placeholder - implement based on your payment system)
        violations.push({
          field: 'statusCode',
          message: 'Payment verification required before marking as completed',
          code: 'PAYMENT_VERIFICATION_REQUIRED',
          severity: 'warning'
        });
      }

    } catch (error) {
      console.error('Error validating status transition:', error);
      violations.push({
        field: 'statusCode',
        message: 'Unable to validate status transition',
        code: 'VALIDATION_SYSTEM_ERROR',
        severity: 'error'
      });
    }

    return violations;
  }

  // Design job validation rules
  static async validateDesignJobBusinessRules(designJobData: any, req: AuthedRequest): Promise<BusinessRuleViolation[]> {
    const violations: BusinessRuleViolation[] = [];

    try {
      // 1. Validate order item belongs to organization
      if (designJobData.orderItemId && designJobData.orgId) {
        const orderItem = await db.query.orderItems.findFirst({
          where: (orderItems, { eq }) => eq(orderItems.id, designJobData.orderItemId),
          with: {
            order: true
          }
        });

        if (!orderItem || orderItem.orgId !== designJobData.orgId) {
          violations.push({
            field: 'orderItemId',
            message: 'Order item does not belong to this organization',
            code: 'INVALID_ORDER_ITEM_ORG',
            severity: 'error'
          });
        }
      }

      // 2. Validate deadline is reasonable based on complexity
      if (designJobData.deadline && designJobData.estimatedHours) {
        const deadline = new Date(designJobData.deadline);
        const now = new Date();
        const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntilDeadline < designJobData.estimatedHours * 2) {
          violations.push({
            field: 'deadline',
            message: 'Deadline may not provide sufficient time for estimated work',
            code: 'TIGHT_DEADLINE_WARNING',
            severity: 'warning'
          });
        }
      }

      // 3. Validate designer workload if assigned
      if (designJobData.assigneeDesignerId) {
        const activeJobs = await db.query.designJobs.findMany({
          where: (designJobs, { eq, and, notInArray }) => and(
            eq(designJobs.assigneeDesignerId, designJobData.assigneeDesignerId),
            notInArray(designJobs.statusCode, ['approved', 'rejected', 'canceled'])
          )
        });

        if (activeJobs.length >= 10) {
          violations.push({
            field: 'assigneeDesignerId',
            message: 'Designer has high workload - consider redistributing',
            code: 'HIGH_DESIGNER_WORKLOAD',
            severity: 'warning'
          });
        }
      }

    } catch (error) {
      console.error('Error validating design job business rules:', error);
      violations.push({
        field: 'general',
        message: 'Unable to validate design job business rules',
        code: 'VALIDATION_SYSTEM_ERROR',
        severity: 'error'
      });
    }

    return violations;
  }

  // Work order validation rules
  static async validateWorkOrderBusinessRules(workOrderData: any, req: AuthedRequest): Promise<BusinessRuleViolation[]> {
    const violations: BusinessRuleViolation[] = [];

    try {
      // 1. Validate order item exists and has approved design
      if (workOrderData.orderItemId) {
        const orderItem = await db.query.orderItems.findFirst({
          where: (orderItems, { eq }) => eq(orderItems.id, workOrderData.orderItemId),
          with: {
            designJobs: true
          }
        });

        if (!orderItem) {
          violations.push({
            field: 'orderItemId',
            message: 'Order item not found',
            code: 'ORDER_ITEM_NOT_FOUND',
            severity: 'error'
          });
        } else {
          // Check if design is approved
          const designJobs = (orderItem.designJobs as any[]) || [];
          const approvedDesign = designJobs.find((job: any) => job.statusCode === 'approved');
          if (!approvedDesign) {
            violations.push({
              field: 'orderItemId',
              message: 'Cannot create work order - design not yet approved',
              code: 'DESIGN_NOT_APPROVED',
              severity: 'error'
            });
          }
        }
      }

      // 2. Validate manufacturer capacity if assigned
      if (workOrderData.manufacturerId) {
        const activeWorkOrders = await db.query.manufacturingWorkOrders.findMany({
          where: (workOrders, { eq, and, notInArray }) => and(
            eq(workOrders.manufacturerId, workOrderData.manufacturerId),
            notInArray(workOrders.statusCode, ['completed', 'shipped', 'cancelled'])
          )
        });

        if (activeWorkOrders.length >= 20) {
          violations.push({
            field: 'manufacturerId',
            message: 'Manufacturer has high workload - may cause delays',
            code: 'HIGH_MANUFACTURER_WORKLOAD',
            severity: 'warning'
          });
        }
      }

      // 3. Validate planned dates
      if (workOrderData.plannedStartDate && workOrderData.plannedDueDate) {
        const startDate = new Date(workOrderData.plannedStartDate);
        const dueDate = new Date(workOrderData.plannedDueDate);
        const daysDiff = (dueDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

        if (daysDiff < 1) {
          violations.push({
            field: 'plannedDueDate',
            message: 'Manufacturing period is too short',
            code: 'INSUFFICIENT_MANUFACTURING_TIME',
            severity: 'error'
          });
        }
      }

    } catch (error) {
      console.error('Error validating work order business rules:', error);
      violations.push({
        field: 'general',
        message: 'Unable to validate work order business rules',
        code: 'VALIDATION_SYSTEM_ERROR',
        severity: 'error'
      });
    }

    return violations;
  }

  // Purchase order validation rules
  static async validatePurchaseOrderBusinessRules(poData: any, req: AuthedRequest): Promise<BusinessRuleViolation[]> {
    const violations: BusinessRuleViolation[] = [];

    try {
      // 1. Validate supplier is active
      if (poData.supplierId) {
        const supplier = await db.query.manufacturers.findFirst({
          where: (manufacturers, { eq }) => eq(manufacturers.id, poData.supplierId)
        });

        if (!supplier || !supplier.isActive) {
          violations.push({
            field: 'supplierId',
            message: 'Supplier is not active or not found',
            code: 'INACTIVE_SUPPLIER',
            severity: 'error'
          });
        }
      }

      // 2. Validate total amount requires approval if over threshold
      if (poData.totalAmount > (poData.approvalThreshold || 1000)) {
        violations.push({
          field: 'totalAmount',
          message: 'Purchase order requires approval due to amount',
          code: 'APPROVAL_REQUIRED',
          severity: 'warning'
        });
      }

      // 3. Validate item quantities against MOQ
      if (poData.items) {
        for (let i = 0; i < poData.items.length; i++) {
          const item = poData.items[i];
          if (item.materialId) {
            const material = await db.query.materials.findFirst({
              where: (materials, { eq }) => eq(materials.id, item.materialId)
            });

            if (material?.moq && item.quantity < material.moq) {
              violations.push({
                field: `items[${i}].quantity`,
                message: `Quantity ${item.quantity} is below minimum order quantity ${material.moq}`,
                code: 'BELOW_MOQ',
                severity: 'warning'
              });
            }
          }
        }
      }

      // 4. Validate delivery date is reasonable
      if (poData.expectedDeliveryDate && poData.orderDate) {
        const orderDate = new Date(poData.orderDate);
        const deliveryDate = new Date(poData.expectedDeliveryDate);
        const daysDiff = (deliveryDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);

        if (daysDiff < 1) {
          violations.push({
            field: 'expectedDeliveryDate',
            message: 'Expected delivery date must be after order date',
            code: 'INVALID_DELIVERY_DATE',
            severity: 'error'
          });
        } else if (daysDiff < 7) {
          violations.push({
            field: 'expectedDeliveryDate',
            message: 'Very short lead time - confirm with supplier',
            code: 'SHORT_LEAD_TIME',
            severity: 'warning'
          });
        }
      }

    } catch (error) {
      console.error('Error validating purchase order business rules:', error);
      violations.push({
        field: 'general',
        message: 'Unable to validate purchase order business rules',
        code: 'VALIDATION_SYSTEM_ERROR',
        severity: 'error'
      });
    }

    return violations;
  }

  // Inventory validation rules
  static async validateInventoryBusinessRules(inventoryData: any, req: AuthedRequest): Promise<BusinessRuleViolation[]> {
    const violations: BusinessRuleViolation[] = [];

    try {
      // 1. Validate material exists
      if (inventoryData.materialId) {
        const material = await db.query.materials.findFirst({
          where: (materials, { eq }) => eq(materials.id, inventoryData.materialId)
        });

        if (!material) {
          violations.push({
            field: 'materialId',
            message: 'Material not found',
            code: 'MATERIAL_NOT_FOUND',
            severity: 'error'
          });
        }
      }

      // 2. Validate quantity changes
      if (inventoryData.quantityOnHand < 0) {
        violations.push({
          field: 'quantityOnHand',
          message: 'Quantity on hand cannot be negative',
          code: 'NEGATIVE_INVENTORY',
          severity: 'error'
        });
      }

      // 3. Check for low stock warning
      if (inventoryData.materialId && inventoryData.quantityOnHand !== undefined) {
        const material = await db.query.materials.findFirst({
          where: (materials, { eq }) => eq(materials.id, inventoryData.materialId)
        });

        if (material?.reorderLevel && inventoryData.quantityOnHand <= material.reorderLevel) {
          violations.push({
            field: 'quantityOnHand',
            message: `Inventory below reorder level (${material.reorderLevel})`,
            code: 'LOW_STOCK_WARNING',
            severity: 'warning'
          });
        }
      }

    } catch (error) {
      console.error('Error validating inventory business rules:', error);
      violations.push({
        field: 'general',
        message: 'Unable to validate inventory business rules',
        code: 'VALIDATION_SYSTEM_ERROR',
        severity: 'error'
      });
    }

    return violations;
  }
}

// Middleware factory for business rules validation
export function validateBusinessRules(
  validator: (data: any, req: AuthedRequest) => Promise<BusinessRuleViolation[]>,
  options: {
    blockOnErrors?: boolean;
    blockOnWarnings?: boolean;
  } = {}
) {
  const { blockOnErrors = true, blockOnWarnings = false } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const violations = await validator(req.body, req as AuthedRequest);
      
      const errors = violations.filter(v => v.severity === 'error');
      const warnings = violations.filter(v => v.severity === 'warning');

      // Add violations to request for logging/audit purposes
      (req as any).businessRuleViolations = violations;

      // Block request if there are errors and blockOnErrors is true
      if (errors.length > 0 && blockOnErrors) {
        return res.status(409).json(ErrorFormatting.businessRuleError(
          `Business rule violations: ${errors.map(e => e.message).join(', ')}`,
          errors[0]?.field
        ));
      }

      // Block request if there are warnings and blockOnWarnings is true
      if (warnings.length > 0 && blockOnWarnings) {
        return res.status(409).json(ErrorFormatting.businessRuleError(
          `Business rule warnings require attention: ${warnings.map(w => w.message).join(', ')}`,
          warnings[0]?.field
        ));
      }

      // If there are warnings but not blocking, add them to response headers
      if (warnings.length > 0) {
        res.setHeader('X-Business-Rule-Warnings', JSON.stringify(warnings));
      }

      next();
    } catch (error) {
      console.error('Business rules validation error:', error);
      return res.status(500).json(ErrorFormatting.createErrorResponse(
        'BUSINESS_RULE_VALIDATION_ERROR',
        'Unable to validate business rules',
        undefined,
        500
      ));
    }
  };
}

// Pre-configured business rule middleware
export const businessRuleMiddleware = {
  validateOrderCreation: validateBusinessRules(BusinessRulesValidator.validateOrderBusinessRules),
  
  validateDesignJobCreation: validateBusinessRules(BusinessRulesValidator.validateDesignJobBusinessRules),
  
  validateWorkOrderCreation: validateBusinessRules(BusinessRulesValidator.validateWorkOrderBusinessRules),
  
  validatePurchaseOrderCreation: validateBusinessRules(BusinessRulesValidator.validatePurchaseOrderBusinessRules),
  
  validateInventoryUpdate: validateBusinessRules(BusinessRulesValidator.validateInventoryBusinessRules),

  // Status transition validation
  validateOrderStatusTransition: (req: Request, res: Response, next: NextFunction) => {
    // This would need to be implemented with current status fetching
    // For now, just pass through
    next();
  },
};

export { BusinessRulesValidator };