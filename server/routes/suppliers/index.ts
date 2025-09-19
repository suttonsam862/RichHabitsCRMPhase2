/**
 * Suppliers API Routes
 * RESTful API for supplier management, performance tracking, and capability filtering
 */

import express from 'express';
import { 
  SupplierFiltersDTO,
  SupplierType,
} from '@shared/dtos';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/asyncHandler';
import { supabaseForUser, extractAccessToken } from '../../lib/supabase';
import { sendSuccess, sendOk, sendCreated, sendNoContent, sendErr, HttpErrors, handleDatabaseError } from '../../lib/http';
import { requireAuth, AuthedRequest } from '../../middleware/auth';
import { requireOrgMember } from '../../middleware/orgSecurity';
import { logDatabaseOperation } from '../../lib/log';
import { parsePaginationParams, sendPaginatedResponse } from '../../lib/pagination';
import { trackBusinessEvent } from '../../middleware/metrics';
import { PurchaseOrderService } from '../../services/purchaseOrderService';

const router = express.Router();

// All supplier routes require authentication
router.use(requireAuth);

// Get authenticated Supabase client
async function getSupabaseClient(req: AuthedRequest) {
  const token = extractAccessToken(req);
  if (!token) {
    throw new Error('Missing authentication token');
  }
  return supabaseForUser(token);
}

/**
 * GET /api/suppliers
 * List suppliers with capability filtering and performance metrics
 */
router.get('/',
  requireOrgMember,
  asyncHandler(async (req: AuthedRequest, res) => {
    const sb = await getSupabaseClient(req);
    const orgId = req.query.orgId as string;
    
    if (!orgId) {
      return sendErr(res, HttpErrors.BadRequest('Organization ID is required'));
    }

    // Parse and validate filters
    const filters = SupplierFiltersDTO.parse({
      ...req.query,
      limit: parseInt(req.query.limit as string) || 50,
      offset: parseInt(req.query.offset as string) || 0,
    });

    try {
      const suppliers = await PurchaseOrderService.getSuppliersWithPerformance(
        sb,
        orgId,
        filters
      );

      await logDatabaseOperation('manufacturers', 'SELECT', { 
        count: suppliers.length, 
        filters 
      });

      return sendPaginatedResponse(res, {
        data: suppliers,
        count: suppliers.length,
        limit: filters.limit,
        offset: filters.offset,
      });

    } catch (error) {
      console.error('Error fetching suppliers:', error);
      return handleDatabaseError(res, error as Error);
    }
  })
);

/**
 * GET /api/suppliers/:supplierId
 * Get supplier details with performance metrics
 */
router.get('/:supplierId',
  requireOrgMember,
  asyncHandler(async (req: AuthedRequest, res) => {
    const sb = await getSupabaseClient(req);
    const { supplierId } = req.params;
    const orgId = req.query.orgId as string;

    if (!orgId) {
      return sendErr(res, HttpErrors.BadRequest('Organization ID is required'));
    }

    try {
      const { data: supplier, error } = await sb
        .from('manufacturers')
        .select(`
          *,
          performance_metrics:supplier_performance_metrics!supplier_id (
            period_start,
            period_end,
            total_orders,
            total_amount,
            on_time_deliveries,
            late_deliveries,
            average_delivery_days,
            quality_score,
            quality_issues,
            communication_score,
            overall_rating,
            notes,
            created_at,
            updated_at
          )
        `)
        .eq('id', supplierId)
        .single();

      if (error) {
        throw error;
      }

      if (!supplier) {
        return sendErr(res, HttpErrors.NotFound('Supplier not found'));
      }

      // Get recent purchase orders for additional context
      const { data: recentOrders } = await sb
        .from('purchase_orders')
        .select(`
          id,
          po_number,
          status_code,
          total_amount,
          order_date,
          expected_delivery_date,
          actual_delivery_date
        `)
        .eq('supplier_id', supplierId)
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(10);

      const supplierWithContext = {
        ...supplier,
        recent_orders: recentOrders || [],
      };

      await logDatabaseOperation('manufacturers', 'SELECT', { supplierId, orgId });
      return sendOk(res, supplierWithContext);

    } catch (error) {
      console.error('Error fetching supplier details:', error);
      return handleDatabaseError(res, error as Error);
    }
  })
);

/**
 * GET /api/suppliers/:supplierId/performance
 * Get detailed supplier performance metrics for a specific period
 */
router.get('/:supplierId/performance',
  requireOrgMember,
  asyncHandler(async (req: AuthedRequest, res) => {
    const sb = await getSupabaseClient(req);
    const { supplierId } = req.params;
    const orgId = req.query.orgId as string;
    const periodStart = req.query.periodStart as string;
    const periodEnd = req.query.periodEnd as string;

    if (!orgId) {
      return sendErr(res, HttpErrors.BadRequest('Organization ID is required'));
    }

    try {
      let query = sb
        .from('supplier_performance_metrics')
        .select('*')
        .eq('supplier_id', supplierId)
        .eq('org_id', orgId)
        .order('period_start', { ascending: false });

      if (periodStart && periodEnd) {
        query = query
          .gte('period_start', periodStart)
          .lte('period_end', periodEnd);
      }

      const { data: performanceMetrics, error } = await query;

      if (error) {
        throw error;
      }

      // If no metrics exist for the period, calculate them
      if (!performanceMetrics || performanceMetrics.length === 0) {
        if (periodStart && periodEnd) {
          await PurchaseOrderService.updateSupplierPerformanceMetrics(
            sb,
            supplierId,
            orgId,
            periodStart,
            periodEnd
          );

          // Fetch the newly calculated metrics
          const { data: newMetrics } = await sb
            .from('supplier_performance_metrics')
            .select('*')
            .eq('supplier_id', supplierId)
            .eq('org_id', orgId)
            .eq('period_start', periodStart)
            .eq('period_end', periodEnd)
            .single();

          return sendOk(res, newMetrics);
        }
      }

      await logDatabaseOperation('supplier_performance_metrics', 'SELECT', { 
        supplierId, 
        orgId,
        metricsCount: performanceMetrics?.length 
      });

      return sendOk(res, performanceMetrics || []);

    } catch (error) {
      console.error('Error fetching supplier performance metrics:', error);
      return handleDatabaseError(res, error as Error);
    }
  })
);

/**
 * POST /api/suppliers/:supplierId/performance/calculate
 * Manually trigger supplier performance metrics calculation for a period
 */
router.post('/:supplierId/performance/calculate',
  requireOrgMember,
  trackBusinessEvent('supplier_performance_calculated'),
  asyncHandler(async (req: AuthedRequest, res) => {
    const sb = await getSupabaseClient(req);
    const { supplierId } = req.params;
    const orgId = req.query.orgId as string;
    const { periodStart, periodEnd } = req.body;

    if (!orgId || !periodStart || !periodEnd) {
      return sendErr(res, HttpErrors.BadRequest(
        'Organization ID, periodStart, and periodEnd are required'
      ));
    }

    try {
      await PurchaseOrderService.updateSupplierPerformanceMetrics(
        sb,
        supplierId,
        orgId,
        periodStart,
        periodEnd
      );

      // Fetch the calculated metrics
      const { data: metrics } = await sb
        .from('supplier_performance_metrics')
        .select('*')
        .eq('supplier_id', supplierId)
        .eq('org_id', orgId)
        .eq('period_start', periodStart)
        .eq('period_end', periodEnd)
        .single();

      await logDatabaseOperation('supplier_performance_metrics', 'CALCULATE', {
        supplierId,
        orgId,
        periodStart,
        periodEnd,
      });

      return sendOk(res, metrics, 'Supplier performance metrics calculated successfully');

    } catch (error) {
      console.error('Error calculating supplier performance metrics:', error);
      return handleDatabaseError(res, error as Error);
    }
  })
);

/**
 * GET /api/suppliers/:supplierId/materials
 * Get materials that prefer this supplier
 */
router.get('/:supplierId/materials',
  requireOrgMember,
  asyncHandler(async (req: AuthedRequest, res) => {
    const sb = await getSupabaseClient(req);
    const { supplierId } = req.params;
    const orgId = req.query.orgId as string;

    if (!orgId) {
      return sendErr(res, HttpErrors.BadRequest('Organization ID is required'));
    }

    try {
      const { data: materials, error } = await sb
        .from('materials')
        .select(`
          id,
          name,
          sku,
          description,
          category,
          unit,
          unit_cost,
          reorder_level,
          lead_time_days,
          moq,
          is_active,
          inventory:materials_inventory!material_id (
            quantity_on_hand,
            quantity_reserved,
            quantity_on_order,
            last_updated
          )
        `)
        .eq('preferred_supplier_id', supplierId)
        .eq('org_id', orgId)
        .eq('is_active', true)
        .order('name');

      if (error) {
        throw error;
      }

      await logDatabaseOperation('materials', 'SELECT', {
        supplierId,
        orgId,
        materialsCount: materials?.length,
      });

      return sendOk(res, materials || []);

    } catch (error) {
      console.error('Error fetching supplier materials:', error);
      return handleDatabaseError(res, error as Error);
    }
  })
);

/**
 * GET /api/suppliers/:supplierId/purchase-orders
 * Get purchase orders for this supplier
 */
router.get('/:supplierId/purchase-orders',
  requireOrgMember,
  asyncHandler(async (req: AuthedRequest, res) => {
    const sb = await getSupabaseClient(req);
    const { supplierId } = req.params;
    const orgId = req.query.orgId as string;
    const statusCode = req.query.statusCode as string;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!orgId) {
      return sendErr(res, HttpErrors.BadRequest('Organization ID is required'));
    }

    try {
      let query = sb
        .from('purchase_orders')
        .select(`
          id,
          po_number,
          status_code,
          total_amount,
          order_date,
          expected_delivery_date,
          actual_delivery_date,
          priority,
          notes,
          created_at,
          updated_at,
          items:purchase_order_items (count)
        `)
        .eq('supplier_id', supplierId)
        .eq('org_id', orgId);

      if (statusCode) {
        query = query.eq('status_code', statusCode);
      }

      const { data: purchaseOrders, error, count } = await query
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      await logDatabaseOperation('purchase_orders', 'SELECT', {
        supplierId,
        orgId,
        statusCode,
        count: purchaseOrders?.length,
      });

      return sendPaginatedResponse(res, {
        data: purchaseOrders || [],
        count: count || 0,
        limit,
        offset,
      });

    } catch (error) {
      console.error('Error fetching supplier purchase orders:', error);
      return handleDatabaseError(res, error as Error);
    }
  })
);

export default router;