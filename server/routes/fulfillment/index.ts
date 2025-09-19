import express from 'express';
import { z } from 'zod';
import { 
  StartFulfillmentDTO, 
  ShipOrderDTO, 
  DeliverOrderDTO, 
  CompleteOrderDTO,
  CreateQualityCheckDTO,
  UpdateFulfillmentMilestoneDTO 
} from '@shared/dtos/FulfillmentDTO';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/asyncHandler';
import { sendSuccess, sendOk, sendCreated, sendNoContent, sendErr, HttpErrors, handleDatabaseError } from '../../lib/http';
import { requireAuth, AuthedRequest } from '../../middleware/auth';
import { requireOrgMember } from '../../middleware/orgSecurity';
import { logDatabaseOperation } from '../../lib/log';
import { parsePaginationParams, sendPaginatedResponse } from '../../lib/pagination';
import { trackBusinessEvent } from '../../middleware/metrics';
import { fulfillmentService } from '../../services/fulfillmentService';

const router = express.Router();

// All fulfillment routes require authentication
router.use(requireAuth);

/**
 * GET /api/fulfillment/dashboard
 * Get fulfillment dashboard with summary and order list
 */
router.get('/dashboard', requireOrgMember(), asyncHandler(async (req: AuthedRequest, res) => {
  const { 
    statusCode,
    isOverdue,
    limit = 50,
    offset = 0 
  } = req.query;

  try {
    const orgId = req.user.organizationId;
    if (!orgId) {
      return HttpErrors.badRequest(res, 'Organization ID required');
    }

    const dashboard = await fulfillmentService.getFulfillmentDashboard(orgId, {
      statusCode: statusCode as string,
      isOverdue: isOverdue === 'true',
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });

    sendOk(res, dashboard);
  } catch (error) {
    handleDatabaseError(res, error, 'fetch fulfillment dashboard');
  }
}));

/**
 * GET /api/fulfillment/pending
 * List orders pending fulfillment
 */
router.get('/pending', requireOrgMember(), asyncHandler(async (req: AuthedRequest, res) => {
  const paginationParams = parsePaginationParams(req.query);

  try {
    const orgId = req.user.organizationId;
    if (!orgId) {
      return HttpErrors.badRequest(res, 'Organization ID required');
    }

    const dashboard = await fulfillmentService.getFulfillmentDashboard(orgId, {
      statusCode: 'confirmed', // Orders ready for fulfillment
      limit: paginationParams.limit,
      offset: paginationParams.offset
    });

    sendPaginatedResponse(res, dashboard.orders, dashboard.orders.length, paginationParams);
  } catch (error) {
    handleDatabaseError(res, error, 'fetch pending fulfillment orders');
  }
}));

/**
 * POST /api/fulfillment/bulk-ship
 * Bulk shipping operations for multiple orders
 */
router.post('/bulk-ship', 
  requireOrgMember(),
  validateRequest({ 
    body: z.object({
      orders: z.array(z.object({
        orderId: z.string(),
        carrier: z.string(),
        service: z.string().optional(),
        trackingNumber: z.string().optional(),
        shippingCost: z.number().optional(),
        estimatedDeliveryDate: z.string().optional()
      })),
      notes: z.string().optional()
    })
  }),
  asyncHandler(async (req: AuthedRequest, res) => {
    const { orders, notes } = req.body;

    try {
      const orgId = req.user.organizationId;
      const userId = req.user.id;
      
      if (!orgId) {
        return HttpErrors.badRequest(res, 'Organization ID required');
      }

      const results = [];
      
      for (const orderShipping of orders) {
        try {
          const result = await fulfillmentService.shipOrder(
            orderShipping.orderId,
            orgId,
            {
              carrier: orderShipping.carrier,
              service: orderShipping.service,
              trackingNumber: orderShipping.trackingNumber,
              shippingCost: orderShipping.shippingCost,
              estimatedDeliveryDate: orderShipping.estimatedDeliveryDate,
              notes
            },
            userId
          );

          results.push({
            orderId: orderShipping.orderId,
            success: result.success,
            error: result.error,
            shippingInfo: result.shippingInfo
          });
        } catch (error) {
          results.push({
            orderId: orderShipping.orderId,
            success: false,
            error: 'Failed to process shipping'
          });
        }
      }

      // Track business event
      trackBusinessEvent('bulk_ship_orders', req, {
        organization_id: orgId,
        orders_count: orders.length,
        successful_count: results.filter(r => r.success).length
      });

      sendOk(res, { results });
    } catch (error) {
      handleDatabaseError(res, error, 'bulk ship orders');
    }
  })
);

/**
 * POST /api/fulfillment/quality-check
 * Create a quality check record
 */
router.post('/quality-check',
  requireOrgMember(),
  validateRequest({ body: CreateQualityCheckDTO }),
  asyncHandler(async (req: AuthedRequest, res) => {
    const qualityCheckData = req.body;

    try {
      const orgId = req.user.organizationId;
      if (!orgId) {
        return HttpErrors.badRequest(res, 'Organization ID required');
      }

      // Ensure org_id matches user's organization
      qualityCheckData.orgId = orgId;
      qualityCheckData.checkedBy = req.user.id;

      const result = await fulfillmentService.createQualityCheck(qualityCheckData);

      if (!result.success) {
        return HttpErrors.internalError(res, result.error || 'Failed to create quality check');
      }

      trackBusinessEvent('quality_check_created', req, {
        organization_id: orgId,
        order_id: qualityCheckData.orderId,
        check_type: qualityCheckData.checkType,
        result: qualityCheckData.overallResult
      });

      sendCreated(res, result.qualityCheck);
    } catch (error) {
      handleDatabaseError(res, error, 'create quality check');
    }
  })
);

/**
 * GET /api/fulfillment/stats
 * Get fulfillment statistics and metrics
 */
router.get('/stats', requireOrgMember(), asyncHandler(async (req: AuthedRequest, res) => {
  const { 
    period = '30d',
    startDate,
    endDate 
  } = req.query;

  try {
    const orgId = req.user.organizationId;
    if (!orgId) {
      return HttpErrors.badRequest(res, 'Organization ID required');
    }

    // Get dashboard data which includes summary stats
    const dashboard = await fulfillmentService.getFulfillmentDashboard(orgId);

    // TODO: Add more detailed analytics here
    // - Average fulfillment time
    // - Quality metrics
    // - Shipping performance
    // - Completion rates by period

    const stats = {
      summary: dashboard.summary,
      period,
      // Additional metrics would go here
      fulfillmentMetrics: {
        avgDaysToCompletion: 0, // Calculate from data
        qualityScore: 0, // Calculate from quality checks
        onTimeDeliveryRate: 0, // Calculate from shipping data
        customerSatisfactionScore: 0 // Calculate from completion records
      }
    };

    sendOk(res, stats);
  } catch (error) {
    handleDatabaseError(res, error, 'fetch fulfillment stats');
  }
}));

export default router;