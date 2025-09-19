/**
 * Purchase Orders API Routes
 * Comprehensive RESTful API for purchase order management, materials procurement, and supplier integration
 */

import express from 'express';
import { 
  CreatePurchaseOrderDTO,
  UpdatePurchaseOrderDTO,
  PurchaseOrderFiltersDTO,
  BulkGeneratePurchaseOrdersDTO,
  ApprovePurchaseOrderDTO,
  UpdatePurchaseOrderStatusDTO,
  ReceivePurchaseOrderItemsDTO,
  CreatePurchaseOrderItemDTO,
  UpdatePurchaseOrderItemDTO,
  PurchaseOrderType,
} from '@shared/dtos';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/asyncHandler';
import { supabaseForUser, extractAccessToken } from '../../lib/supabase';
import { sendSuccess, sendOk, sendCreated, sendNoContent, sendErr, HttpErrors, handleDatabaseError } from '../../lib/http';
import { requireAuth, AuthedRequest } from '../../middleware/auth';
import { requireOrgMember } from '../../middleware/orgSecurity';
import { logDatabaseOperation } from '../../lib/log';
import { parsePaginationParams, sendPaginatedResponse } from '../../lib/pagination';
import { idempotent } from '../../lib/idempotency';
import { trackBusinessEvent, MetricsRequest } from '../../middleware/metrics';
import { PurchaseOrderService } from '../../services/purchaseOrderService';

const router = express.Router();

// All purchase order routes require authentication
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
 * GET /api/purchase-orders
 * List purchase orders with filtering, pagination, and search
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
    const filters = PurchaseOrderFiltersDTO.parse({
      orgId,
      ...req.query,
      limit: parseInt(req.query.limit as string) || 50,
      offset: parseInt(req.query.offset as string) || 0,
    });

    try {
      // Build base query with filters (for both data and count)
      const buildBaseQuery = (sb: any) => {
        let query = sb
          .from('purchase_orders')
          .eq('org_id', filters.orgId);

        // Apply filters
        if (filters.supplierId) {
          query = query.eq('supplier_id', filters.supplierId);
        }
        if (filters.statusCode) {
          query = query.eq('status_code', filters.statusCode);
        }
        if (filters.requestedBy) {
          query = query.eq('requested_by', filters.requestedBy);
        }
        if (filters.assignedTo) {
          query = query.eq('assigned_to', filters.assignedTo);
        }
        if (filters.priority) {
          query = query.eq('priority', filters.priority);
        }
        if (filters.createdAfter) {
          query = query.gte('created_at', filters.createdAfter);
        }
        if (filters.createdBefore) {
          query = query.lte('created_at', filters.createdBefore);
        }
        if (filters.orderDateAfter) {
          query = query.gte('order_date', filters.orderDateAfter);
        }
        if (filters.orderDateBefore) {
          query = query.lte('order_date', filters.orderDateBefore);
        }
        if (filters.expectedDeliveryBefore) {
          query = query.lte('expected_delivery_date', filters.expectedDeliveryBefore);
        }
        if (filters.expectedDeliveryAfter) {
          query = query.gte('expected_delivery_date', filters.expectedDeliveryAfter);
        }

        // Search functionality
        if (filters.search) {
          query = query.or(`po_number.ilike.%${filters.search}%,supplier_name.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
        }

        return query;
      };

      // Get accurate total count first
      const countQuery = buildBaseQuery(sb).select('id', { count: 'exact', head: true });
      const { count: totalCount, error: countError } = await countQuery;

      if (countError) {
        throw countError;
      }

      // Get paginated data with proper relationships
      const dataQuery = buildBaseQuery(sb)
        .select(`
          *,
          supplier:manufacturers (
            id,
            name,
            contact_email,
            contact_phone,
            specialties,
            is_active
          )
        `)
        .range(filters.offset, filters.offset + filters.limit - 1)
        .order('created_at', { ascending: false });

      const { data: purchaseOrders, error } = await dataQuery;

      if (error) {
        throw error;
      }

      // Add aggregate counts for individual purchase orders if needed for display
      const enhancedPurchaseOrders = await Promise.all(
        (purchaseOrders || []).map(async (po) => {
          // Get item count for this PO
          const { count: itemsCount } = await sb
            .from('purchase_order_items')
            .select('id', { count: 'exact', head: true })
            .eq('purchase_order_id', po.id)
            .eq('org_id', filters.orgId);

          // Get completed milestones count for this PO
          const { count: milestonesCompleted } = await sb
            .from('purchase_order_milestones')
            .select('id', { count: 'exact', head: true })
            .eq('purchase_order_id', po.id)
            .eq('org_id', filters.orgId)
            .eq('status', 'completed');

          return {
            ...po,
            items_count: itemsCount || 0,
            milestones_completed: milestonesCompleted || 0,
          };
        })
      );

      await logDatabaseOperation('purchase_orders', 'SELECT', { 
        count: enhancedPurchaseOrders?.length, 
        totalCount,
        filters 
      });

      return sendPaginatedResponse(res, {
        data: enhancedPurchaseOrders,
        count: totalCount || 0,
        limit: filters.limit,
        offset: filters.offset,
      });

    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      return handleDatabaseError(res, error as Error);
    }
  })
);

/**
 * GET /api/purchase-orders/:poId
 * Get purchase order details with line items, milestones, and events
 */
router.get('/:poId',
  requireOrgMember,
  asyncHandler(async (req: AuthedRequest, res) => {
    const sb = await getSupabaseClient(req);
    const { poId } = req.params;
    const orgId = req.query.orgId as string;

    if (!orgId) {
      return sendErr(res, HttpErrors.BadRequest('Organization ID is required'));
    }

    try {
      const purchaseOrder = await PurchaseOrderService.getPurchaseOrderWithDetails(
        sb,
        poId,
        orgId
      );

      await logDatabaseOperation('purchase_orders', 'SELECT', { poId, orgId });
      return sendOk(res, purchaseOrder);

    } catch (error) {
      console.error('Error fetching purchase order details:', error);
      if (error instanceof Error && error.message === 'Purchase order not found') {
        return sendErr(res, HttpErrors.NotFound('Purchase order not found'));
      }
      return handleDatabaseError(res, error as Error);
    }
  })
);

/**
 * POST /api/purchase-orders
 * Create a new purchase order manually
 */
router.post('/',
  requireOrgMember,
  validateRequest(CreatePurchaseOrderDTO),
  idempotent,
  asyncHandler(async (req: AuthedRequest, res) => {
    const sb = await getSupabaseClient(req);
    const purchaseOrderData = req.body;
    const actorUserId = req.user?.id;

    try {
      const purchaseOrder = await PurchaseOrderService.createPurchaseOrder(
        sb,
        purchaseOrderData,
        actorUserId
      );

      await logDatabaseOperation('purchase_orders', 'INSERT', {
        poId: purchaseOrder.id,
        orgId: purchaseOrderData.orgId,
        totalAmount: purchaseOrder.totalAmount,
      });

      // Track business event
      await trackBusinessEvent('purchase_order_created', req as MetricsRequest, {
        status: 'success',
        orgId: purchaseOrderData.orgId
      });

      return sendCreated(res, purchaseOrder, 'Purchase order created successfully');

    } catch (error) {
      console.error('Error creating purchase order:', error);
      return handleDatabaseError(res, error as Error);
    }
  })
);

/**
 * POST /api/purchase-orders/bulk-generate
 * Generate purchase orders from work order material requirements
 */
router.post('/bulk-generate',
  requireOrgMember,
  validateRequest(BulkGeneratePurchaseOrdersDTO),
  idempotent,
  asyncHandler(async (req: AuthedRequest, res) => {
    const sb = await getSupabaseClient(req);
    const bulkData = req.body;
    const orgId = req.query.orgId as string;
    const actorUserId = req.user?.id;

    if (!orgId) {
      return sendErr(res, HttpErrors.BadRequest('Organization ID is required'));
    }

    try {
      const purchaseOrders = await PurchaseOrderService.bulkGeneratePurchaseOrders(
        sb,
        bulkData,
        orgId,
        actorUserId
      );

      if (purchaseOrders.length === 0) {
        return sendOk(res, { purchaseOrders: [], message: 'No purchase orders were generated' });
      }

      await logDatabaseOperation('purchase_orders', 'BULK_INSERT', {
        count: purchaseOrders.length,
        workOrderIds: bulkData.workOrderIds,
        orgId,
      });

      // Track business event
      await trackBusinessEvent('purchase_orders_bulk_generated', req as MetricsRequest, {
        status: 'success',
        count: purchaseOrders.length.toString(),
        orgId
      });

      return sendCreated(res, { purchaseOrders }, `${purchaseOrders.length} purchase orders generated successfully`);

    } catch (error) {
      console.error('Error bulk generating purchase orders:', error);
      return handleDatabaseError(res, error as Error);
    }
  })
);

/**
 * PUT /api/purchase-orders/:poId/approve
 * Approve a purchase order
 */
router.put('/:poId/approve',
  requireOrgMember,
  validateRequest(ApprovePurchaseOrderDTO),
  asyncHandler(async (req: AuthedRequest, res) => {
    const sb = await getSupabaseClient(req);
    const { poId } = req.params;
    const approvalData = req.body;
    const orgId = req.query.orgId as string;
    const actorUserId = req.user?.id;

    if (!orgId) {
      return sendErr(res, HttpErrors.BadRequest('Organization ID is required'));
    }

    try {
      const purchaseOrder = await PurchaseOrderService.approvePurchaseOrder(
        sb,
        poId,
        orgId,
        approvalData,
        actorUserId
      );

      await logDatabaseOperation('purchase_orders', 'UPDATE', {
        poId,
        orgId,
        action: 'approval',
        approvedBy: actorUserId,
      });

      return sendOk(res, purchaseOrder, 'Purchase order approved successfully');

    } catch (error) {
      console.error('Error approving purchase order:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        return sendErr(res, HttpErrors.NotFound('Purchase order not found'));
      }
      if (error instanceof Error && error.message.includes('Cannot approve')) {
        return sendErr(res, HttpErrors.BadRequest(error.message));
      }
      return handleDatabaseError(res, error as Error);
    }
  })
);

/**
 * PUT /api/purchase-orders/:poId/status
 * Update purchase order status
 */
router.put('/:poId/status',
  requireOrgMember,
  validateRequest(UpdatePurchaseOrderStatusDTO),
  asyncHandler(async (req: AuthedRequest, res) => {
    const sb = await getSupabaseClient(req);
    const { poId } = req.params;
    const statusData = req.body;
    const orgId = req.query.orgId as string;
    const actorUserId = req.user?.id;

    if (!orgId) {
      return sendErr(res, HttpErrors.BadRequest('Organization ID is required'));
    }

    try {
      const purchaseOrder = await PurchaseOrderService.updatePurchaseOrderStatus(
        sb,
        poId,
        orgId,
        statusData,
        actorUserId
      );

      await logDatabaseOperation('purchase_orders', 'UPDATE', {
        poId,
        orgId,
        newStatus: statusData.statusCode,
        actorUserId,
      });

      // Track business event
      await trackBusinessEvent('purchase_order_status_updated', req as MetricsRequest, {
        status: 'success',
        newStatus: statusData.statusCode,
        orgId
      });

      return sendOk(res, purchaseOrder, 'Purchase order status updated successfully');

    } catch (error) {
      console.error('Error updating purchase order status:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        return sendErr(res, HttpErrors.NotFound('Purchase order not found'));
      }
      if (error instanceof Error && error.message.includes('Cannot transition')) {
        return sendErr(res, HttpErrors.BadRequest(error.message));
      }
      return handleDatabaseError(res, error as Error);
    }
  })
);

/**
 * POST /api/purchase-orders/:poId/receive
 * Record receipt of purchase order items and update inventory
 */
router.post('/:poId/receive',
  requireOrgMember,
  validateRequest(ReceivePurchaseOrderItemsDTO),
  asyncHandler(async (req: AuthedRequest, res) => {
    const sb = await getSupabaseClient(req);
    const { poId } = req.params;
    const receiptData = req.body;
    const orgId = req.query.orgId as string;
    const actorUserId = req.user?.id;

    if (!orgId) {
      return sendErr(res, HttpErrors.BadRequest('Organization ID is required'));
    }

    try {
      const purchaseOrder = await PurchaseOrderService.receivePurchaseOrderItems(
        sb,
        poId,
        orgId,
        receiptData,
        actorUserId
      );

      await logDatabaseOperation('purchase_orders', 'UPDATE', {
        poId,
        orgId,
        action: 'items_received',
        itemsReceived: receiptData.items.length,
        receivedBy: actorUserId,
      });

      // Track business event
      await trackBusinessEvent('purchase_order_items_received', req as MetricsRequest, {
        status: 'success',
        itemsReceived: receiptData.items.length.toString(),
        orgId
      });

      return sendOk(res, purchaseOrder, 'Purchase order items received successfully');

    } catch (error) {
      console.error('Error receiving purchase order items:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        return sendErr(res, HttpErrors.NotFound('Purchase order not found'));
      }
      if (error instanceof Error && error.message.includes('Cannot receive')) {
        return sendErr(res, HttpErrors.BadRequest(error.message));
      }
      return handleDatabaseError(res, error as Error);
    }
  })
);

/**
 * PUT /api/purchase-orders/:poId
 * Update purchase order details
 */
router.put('/:poId',
  requireOrgMember,
  validateRequest(UpdatePurchaseOrderDTO),
  asyncHandler(async (req: AuthedRequest, res) => {
    const sb = await getSupabaseClient(req);
    const { poId } = req.params;
    const updateData = req.body;
    const orgId = req.query.orgId as string;

    if (!orgId) {
      return sendErr(res, HttpErrors.BadRequest('Organization ID is required'));
    }

    try {
      const { data: updatedPO, error } = await sb
        .from('purchase_orders')
        .update({
          expected_delivery_date: updateData.expectedDeliveryDate,
          priority: updateData.priority,
          terms_and_conditions: updateData.termsAndConditions,
          shipping_address: updateData.shippingAddress,
          notes: updateData.notes,
          internal_notes: updateData.internalNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', poId)
        .eq('org_id', orgId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!updatedPO) {
        return sendErr(res, HttpErrors.NotFound('Purchase order not found'));
      }

      await logDatabaseOperation('purchase_orders', 'UPDATE', { poId, orgId });

      const purchaseOrder = await PurchaseOrderService.getPurchaseOrderWithDetails(
        sb,
        poId,
        orgId
      );

      // Track business event
      await trackBusinessEvent('purchase_order_updated', req as MetricsRequest, {
        status: 'success',
        orgId
      });

      return sendOk(res, purchaseOrder, 'Purchase order updated successfully');

    } catch (error) {
      console.error('Error updating purchase order:', error);
      return handleDatabaseError(res, error as Error);
    }
  })
);

/**
 * DELETE /api/purchase-orders/:poId
 * Cancel/delete purchase order (only if in draft status)
 */
router.delete('/:poId',
  requireOrgMember,
  asyncHandler(async (req: AuthedRequest, res) => {
    const sb = await getSupabaseClient(req);
    const { poId } = req.params;
    const orgId = req.query.orgId as string;
    const actorUserId = req.user?.id;

    if (!orgId) {
      return sendErr(res, HttpErrors.BadRequest('Organization ID is required'));
    }

    try {
      // Check current status
      const { data: po, error: statusError } = await sb
        .from('purchase_orders')
        .select('id, status_code, po_number')
        .eq('id', poId)
        .eq('org_id', orgId)
        .single();

      if (statusError || !po) {
        return sendErr(res, HttpErrors.NotFound('Purchase order not found'));
      }

      if (!['draft', 'pending_approval'].includes(po.status_code)) {
        return sendErr(res, HttpErrors.BadRequest(
          `Cannot cancel purchase order with status: ${po.status_code}`
        ));
      }

      // Update status to cancelled instead of deleting
      const { error: cancelError } = await sb
        .from('purchase_orders')
        .update({ 
          status_code: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', poId)
        .eq('org_id', orgId);

      if (cancelError) {
        throw cancelError;
      }

      // Create cancellation event
      await sb
        .from('purchase_order_events')
        .insert({
          org_id: orgId,
          purchase_order_id: poId,
          event_code: 'PO_CANCELLED',
          actor_user_id: actorUserId,
          payload: {
            po_number: po.po_number,
            cancelled_at: new Date().toISOString(),
            reason: 'Cancelled via API',
          },
        });

      await logDatabaseOperation('purchase_orders', 'UPDATE', {
        poId,
        orgId,
        action: 'cancelled',
        cancelledBy: actorUserId,
      });

      return sendNoContent(res, 'Purchase order cancelled successfully');

    } catch (error) {
      console.error('Error cancelling purchase order:', error);
      return handleDatabaseError(res, error as Error);
    }
  })
);

/**
 * POST /api/purchase-orders/:poId/items
 * Add line items to purchase order
 */
router.post('/:poId/items',
  requireOrgMember,
  validateRequest(CreatePurchaseOrderItemDTO),
  asyncHandler(async (req: AuthedRequest, res) => {
    const sb = await getSupabaseClient(req);
    const { poId } = req.params;
    const itemData = req.body;
    const orgId = req.query.orgId as string;

    if (!orgId) {
      return sendErr(res, HttpErrors.BadRequest('Organization ID is required'));
    }

    try {
      // Validate PO exists and is editable
      const { data: po, error: poError } = await sb
        .from('purchase_orders')
        .select('id, status_code, total_amount')
        .eq('id', poId)
        .eq('org_id', orgId)
        .single();

      if (poError || !po) {
        return sendErr(res, HttpErrors.NotFound('Purchase order not found'));
      }

      if (!['draft', 'pending_approval'].includes(po.status_code)) {
        return sendErr(res, HttpErrors.BadRequest(
          `Cannot add items to purchase order with status: ${po.status_code}`
        ));
      }

      // Get next line number
      const { data: lastItem } = await sb
        .from('purchase_order_items')
        .select('line_number')
        .eq('purchase_order_id', poId)
        .order('line_number', { ascending: false })
        .limit(1)
        .single();

      const nextLineNumber = (lastItem?.line_number || 0) + 1;

      // Create item
      const { data: newItem, error: itemError } = await sb
        .from('purchase_order_items')
        .insert({
          org_id: orgId,
          purchase_order_id: poId,
          material_id: itemData.materialId,
          material_name: itemData.materialName,
          material_sku: itemData.materialSku,
          description: itemData.description,
          quantity: itemData.quantity,
          unit: itemData.unit,
          unit_cost: itemData.unitCost,
          total_cost: itemData.quantity * itemData.unitCost,
          line_number: nextLineNumber,
          notes: itemData.notes,
        })
        .select()
        .single();

      if (itemError) {
        throw itemError;
      }

      // Update PO total amount
      const newTotalAmount = po.total_amount + (itemData.quantity * itemData.unitCost);
      await sb
        .from('purchase_orders')
        .update({ 
          total_amount: newTotalAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', poId);

      await logDatabaseOperation('purchase_order_items', 'INSERT', {
        poId,
        itemId: newItem.id,
        orgId,
      });

      return sendCreated(res, newItem, 'Purchase order item added successfully');

    } catch (error) {
      console.error('Error adding purchase order item:', error);
      return handleDatabaseError(res, error as Error);
    }
  })
);

export default router;