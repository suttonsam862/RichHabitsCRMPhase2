import express from 'express';
import { z } from 'zod';
import { CreateOrderItemDTO, UpdateOrderItemDTO, OrderItemDTO, CreateDesignJobDTO } from '../../../shared/dtos';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/asyncHandler';
import { supabaseForUser, extractAccessToken } from '../../lib/supabase';
import { sendOk, sendCreated, sendNoContent, HttpErrors, handleDatabaseError } from '../../lib/http';
import { requireAuth, AuthedRequest } from '../../middleware/auth';
import { requireOrgMember } from '../../middleware/orgSecurity';
import { logDatabaseOperation } from '../../lib/log';
import { trackBusinessEvent } from '../../middleware/metrics';
import { DesignJobService } from '../../services/designJobService';
import { notificationService } from '../../services/notificationService';

const router = express.Router({ mergeParams: true });

// All order items routes require authentication
router.use(requireAuth as any);

// Helper to get authenticated database client
function getAuthenticatedClient(req: AuthedRequest) {
  const token = extractAccessToken(req.headers.authorization);
  if (!token) {
    throw new Error('Missing authentication token');
  }
  return supabaseForUser(token);
}

// Helper to verify order access and get order info
async function verifyOrderAccess(orderId: string, req: AuthedRequest, sb: any): Promise<any> {
  const { data: order, error } = await sb
    .from('orders')
    .select('id, org_id, status_code')
    .eq('id', orderId)
    .single();
    
  if (error || !order) {
    throw new Error('Order not found');
  }
  
  return order;
}

// Helper to verify order item access and get item info
async function verifyOrderItemAccess(orderId: string, itemId: string, req: AuthedRequest, sb: any): Promise<any> {
  // First verify order access
  const order = await verifyOrderAccess(orderId, req, sb);
  
  // Then verify item belongs to this order
  const { data: item, error } = await sb
    .from('order_items')
    .select('*')
    .eq('id', itemId)
    .eq('order_id', orderId)
    .single();
    
  if (error || !item) {
    throw new Error('Order item not found');
  }
  
  return { order, item };
}

// Helper to validate order item status codes
async function validateOrderItemStatusCode(statusCode: string, sb: any): Promise<boolean> {
  try {
    const { data, error } = await sb
      .from('status_order_items')
      .select('code')
      .eq('code', statusCode)
      .single();
    return !error && !!data;
  } catch {
    return false;
  }
}

// Helper to recalculate order totals
async function recalculateOrderTotals(orderId: string, sb: any): Promise<void> {
  try {
    // Get all items for this order
    const { data: items, error: itemsError } = await sb
      .from('order_items')
      .select('quantity, price_snapshot')
      .eq('order_id', orderId);

    if (itemsError) {
      console.error('Error fetching order items for total calculation:', itemsError);
      return;
    }

    // Calculate new totals
    let totalAmount = 0;
    let revenueEstimate = 0;

    if (items && items.length > 0) {
      for (const item of items) {
        const itemTotal = (item.quantity || 0) * (item.price_snapshot || 0);
        totalAmount += itemTotal;
        // For now, revenue estimate is same as total amount
        // This can be enhanced with margin calculations later
        revenueEstimate += itemTotal;
      }
    }

    // Update order with new totals
    const { error: updateError } = await sb
      .from('orders')
      .update({ 
        total_amount: totalAmount,
        revenue_estimate: revenueEstimate,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Error updating order totals:', updateError);
    }
  } catch (error) {
    console.error('Error in recalculateOrderTotals:', error);
  }
}

// GET /api/orders/:orderId/items - List all items for an order
router.get('/', requireOrgMember() as any, asyncHandler(async (req: any, res) => {
  const { orderId } = req.params;

  try {
    const sb = getAuthenticatedClient(req);
    
    // Verify order access first
    await verifyOrderAccess(orderId, req, sb);
    
    // Get order items with related data
    const { data: items, error } = await sb
      .from('order_items')
      .select(`
        *,
        designers:designer_id(id, user_id, users(name)),
        manufacturers:manufacturer_id(id, name),
        catalog_items:product_id(id, name)
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) {
      return handleDatabaseError(res, error, 'list order items');
    }

    sendOk(res, items || []);
  } catch (error) {
    if (error instanceof Error && error.message === 'Order not found') {
      return HttpErrors.notFound(res, 'Order not found');
    }
    if (error instanceof Error && error.message === 'Missing authentication token') {
      return HttpErrors.unauthorized(res, 'Authentication required');
    }
    handleDatabaseError(res, error, 'list order items');
  }
}));

// POST /api/orders/:orderId/items - Add new item to order
router.post('/',
  requireOrgMember() as any,
  validateRequest({ body: CreateOrderItemDTO }) as any,
  asyncHandler(async (req: any, res) => {
    const { orderId } = req.params;
    const validatedData = req.body;

    try {
      const sb = getAuthenticatedClient(req);
      
      // Verify order access and get order info
      const order = await verifyOrderAccess(orderId, req, sb);
      
      // Check if order is in a state that allows item additions
      if (order.status_code === 'completed' || order.status_code === 'cancelled') {
        return HttpErrors.validationError(res, `Cannot add items to ${order.status_code} order`);
      }
      
      // Validate status code if provided
      if (validatedData.statusCode) {
        const isValid = await validateOrderItemStatusCode(validatedData.statusCode, sb);
        if (!isValid) {
          return HttpErrors.validationError(res, `Invalid status code: ${validatedData.statusCode}. Use GET /api/orders/item-status-codes to see valid options.`);
        }
      }

      // Prepare item data
      const itemData = {
        org_id: order.org_id,
        order_id: orderId,
        product_id: validatedData.productId || null,
        variant_id: validatedData.variantId || null,
        name_snapshot: validatedData.nameSnapshot || null,
        sku_snapshot: validatedData.skuSnapshot || null,
        price_snapshot: validatedData.priceSnapshot || null,
        quantity: validatedData.quantity,
        status_code: validatedData.statusCode || 'pending_design',
        designer_id: validatedData.designerId || null,
        manufacturer_id: validatedData.manufacturerId || null,
        pantone_json: validatedData.pantoneJson || null,
        build_overrides_text: validatedData.buildOverridesText || null,
        variant_image_url: validatedData.variantImageUrl || null
      };

      // Insert the new item
      const { data: newItem, error } = await sb
        .from('order_items')
        .insert(itemData)
        .select()
        .single();

      if (error) {
        return handleDatabaseError(res, error, 'create order item');
      }

      // Recalculate order totals
      await recalculateOrderTotals(orderId, sb);

      // Track business event
      trackBusinessEvent('order_item_added', req, { 
        order_id: orderId,
        item_id: newItem.id,
        organization_id: order.org_id,
        quantity: validatedData.quantity
      });

      logDatabaseOperation(req, 'ORDER_ITEM_CREATED', 'order_items', { orderId, itemId: newItem.id });

      // Broadcast real-time event for order item creation
      try {
        await notificationService.broadcastEvent({
          orgId: order.org_id,
          eventType: 'order_item_created',
          entityType: 'order_item',
          entityId: newItem.id,
          actorUserId: req.user?.id,
          eventData: {
            orderId: orderId,
            itemId: newItem.id,
            nameSnapshot: newItem.name_snapshot,
            quantity: newItem.quantity,
            statusCode: newItem.status_code,
            priceSnapshot: newItem.price_snapshot
          },
          broadcastToRoles: ['admin', 'sales', 'manager'],
          isBroadcast: true
        });
      } catch (wsError) {
        console.error('Error broadcasting order item creation event:', wsError);
      }

      sendCreated(res, newItem);
    } catch (error) {
      if (error instanceof Error && error.message === 'Order not found') {
        return HttpErrors.notFound(res, 'Order not found');
      }
      if (error instanceof Error && error.message === 'Missing authentication token') {
        return HttpErrors.unauthorized(res, 'Authentication required');
      }
      handleDatabaseError(res, error, 'create order item');
    }
  })
);

// GET /api/orders/:orderId/items/:itemId - Get specific order item details
router.get('/:itemId', requireOrgMember() as any, asyncHandler(async (req: any, res) => {
  const { orderId, itemId } = req.params;

  try {
    const sb = getAuthenticatedClient(req);
    
    // Verify order and item access
    const { item } = await verifyOrderItemAccess(orderId, itemId, req, sb);
    
    // Get item with related data
    const { data: fullItem, error } = await sb
      .from('order_items')
      .select(`
        *,
        designers:designer_id(id, user_id, users(name)),
        manufacturers:manufacturer_id(id, name),
        catalog_items:product_id(id, name)
      `)
      .eq('id', itemId)
      .single();

    if (error || !fullItem) {
      return HttpErrors.notFound(res, 'Order item not found');
    }

    sendOk(res, fullItem);
  } catch (error) {
    if (error instanceof Error && (error.message === 'Order not found' || error.message === 'Order item not found')) {
      return HttpErrors.notFound(res, error.message);
    }
    if (error instanceof Error && error.message === 'Missing authentication token') {
      return HttpErrors.unauthorized(res, 'Authentication required');
    }
    handleDatabaseError(res, error, 'fetch order item');
  }
}));

// PUT /api/orders/:orderId/items/:itemId - Update existing order item
router.put('/:itemId',
  requireOrgMember() as any,
  validateRequest({ body: UpdateOrderItemDTO }) as any,
  asyncHandler(async (req: any, res) => {
    const { orderId, itemId } = req.params;
    const validatedData = req.body;

    try {
      const sb = getAuthenticatedClient(req);
      
      // Verify order and item access
      const { order, item } = await verifyOrderItemAccess(orderId, itemId, req, sb);
      
      // Check if order is in a state that allows item updates
      if (order.status_code === 'completed' || order.status_code === 'cancelled') {
        return HttpErrors.validationError(res, `Cannot update items in ${order.status_code} order`);
      }
      
      // Validate status code if provided
      if (validatedData.statusCode) {
        const isValid = await validateOrderItemStatusCode(validatedData.statusCode, sb);
        if (!isValid) {
          return HttpErrors.validationError(res, `Invalid status code: ${validatedData.statusCode}. Use GET /api/orders/item-status-codes to see valid options.`);
        }
      }

      // Prepare update data (only include provided fields)
      const updateData: any = { updated_at: new Date().toISOString() };
      
      if (validatedData.productId !== undefined) updateData.product_id = validatedData.productId;
      if (validatedData.variantId !== undefined) updateData.variant_id = validatedData.variantId;
      if (validatedData.nameSnapshot !== undefined) updateData.name_snapshot = validatedData.nameSnapshot;
      if (validatedData.skuSnapshot !== undefined) updateData.sku_snapshot = validatedData.skuSnapshot;
      if (validatedData.priceSnapshot !== undefined) updateData.price_snapshot = validatedData.priceSnapshot;
      if (validatedData.quantity !== undefined) updateData.quantity = validatedData.quantity;
      if (validatedData.statusCode !== undefined) updateData.status_code = validatedData.statusCode;
      if (validatedData.designerId !== undefined) updateData.designer_id = validatedData.designerId;
      if (validatedData.manufacturerId !== undefined) updateData.manufacturer_id = validatedData.manufacturerId;
      if (validatedData.pantoneJson !== undefined) updateData.pantone_json = validatedData.pantoneJson;
      if (validatedData.buildOverridesText !== undefined) updateData.build_overrides_text = validatedData.buildOverridesText;
      if (validatedData.variantImageUrl !== undefined) updateData.variant_image_url = validatedData.variantImageUrl;

      // Update the item
      const { data: updatedItem, error } = await sb
        .from('order_items')
        .update(updateData)
        .eq('id', itemId)
        .select()
        .single();

      if (error) {
        return handleDatabaseError(res, error, 'update order item');
      }

      if (!updatedItem) {
        return HttpErrors.notFound(res, 'Order item not found');
      }

      // Handle design job creation/updates if status changed
      if (validatedData.statusCode && validatedData.statusCode !== item.status_code) {
        try {
          await DesignJobService.handleOrderItemStatusChange(
            sb,
            itemId,
            validatedData.statusCode,
            item.status_code,
            req.user?.id
          );
        } catch (designJobError) {
          // Log error but don't fail the order item update
          console.error('Error handling design job for order item status change:', designJobError);
        }
      }

      // Recalculate order totals if quantity or price changed
      if (validatedData.quantity !== undefined || validatedData.priceSnapshot !== undefined) {
        await recalculateOrderTotals(orderId, sb);
      }

      // Track business event
      trackBusinessEvent('order_item_updated', req, { 
        order_id: orderId,
        item_id: itemId,
        organization_id: order.org_id,
        changes: Object.keys(updateData).filter(key => key !== 'updated_at').join(', ')
      });

      logDatabaseOperation(req, 'ORDER_ITEM_UPDATED', 'order_items', { orderId, itemId });

      // Broadcast real-time event for order item update
      try {
        const eventType = validatedData.statusCode && validatedData.statusCode !== item.status_code
          ? 'order_item_status_updated'
          : 'order_item_updated';

        await notificationService.broadcastEvent({
          orgId: order.org_id,
          eventType,
          entityType: 'order_item',
          entityId: itemId,
          actorUserId: req.user?.id,
          eventData: {
            orderId: orderId,
            itemId: itemId,
            updatedFields: Object.keys(updateData).filter(key => key !== 'updated_at'),
            previousStatus: validatedData.statusCode ? item.status_code : undefined,
            newStatus: validatedData.statusCode || updatedItem.status_code,
            nameSnapshot: updatedItem.name_snapshot,
            quantity: updatedItem.quantity,
            priceSnapshot: updatedItem.price_snapshot
          },
          broadcastToRoles: ['admin', 'sales', 'manager'],
          isBroadcast: true
        });
      } catch (wsError) {
        console.error('Error broadcasting order item update:', wsError);
      }

      sendOk(res, updatedItem);
    } catch (error) {
      if (error instanceof Error && (error.message === 'Order not found' || error.message === 'Order item not found')) {
        return HttpErrors.notFound(res, error.message);
      }
      if (error instanceof Error && error.message === 'Missing authentication token') {
        return HttpErrors.unauthorized(res, 'Authentication required');
      }
      handleDatabaseError(res, error, 'update order item');
    }
  })
);

// DELETE /api/orders/:orderId/items/:itemId - Remove item from order
router.delete('/:itemId', requireOrgMember() as any, asyncHandler(async (req: any, res) => {
  const { orderId, itemId } = req.params;

  try {
    const sb = getAuthenticatedClient(req);
    
    // Verify order and item access
    const { order, item } = await verifyOrderItemAccess(orderId, itemId, req, sb);
    
    // Check if order is in a state that allows item deletion
    if (order.status_code === 'completed' || order.status_code === 'cancelled') {
      return HttpErrors.validationError(res, `Cannot remove items from ${order.status_code} order`);
    }

    // Delete the item
    const { error } = await sb
      .from('order_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      return handleDatabaseError(res, error, 'delete order item');
    }

    // Recalculate order totals
    await recalculateOrderTotals(orderId, sb);

    // Track business event
    trackBusinessEvent('order_item_removed', req, { 
      order_id: orderId,
      item_id: itemId,
      organization_id: order.org_id,
      removed_quantity: item.quantity
    });

    logDatabaseOperation(req, 'ORDER_ITEM_DELETED', 'order_items', { orderId, itemId });
    sendNoContent(res);
  } catch (error) {
    if (error instanceof Error && (error.message === 'Order not found' || error.message === 'Order item not found')) {
      return HttpErrors.notFound(res, error.message);
    }
    if (error instanceof Error && error.message === 'Missing authentication token') {
      return HttpErrors.unauthorized(res, 'Authentication required');
    }
    handleDatabaseError(res, error, 'delete order item');
  }
}));

// POST /api/orders/:orderId/items/:itemId/create-design-job - Create design job for order item
const createDesignJobParamsSchema = z.object({
  orderId: z.string(),
  itemId: z.string().uuid(),
});

router.post('/:itemId/create-design-job',
  requireOrgMember() as any,
  validateRequest({ 
    params: createDesignJobParamsSchema,
    body: CreateDesignJobDTO.omit({ orgId: true, orderItemId: true }).optional()
  }) as any,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { orderId, itemId } = req.params;
    const designJobData = req.body || {};

    try {
      const sb = getAuthenticatedClient(req);
      
      // Verify order item access and get order info
      const { order, item } = await verifyOrderItemAccess(orderId, itemId, req, sb);
      
      // Check if order is in a state that allows design job creation
      if (order.status_code === 'completed' || order.status_code === 'cancelled') {
        return HttpErrors.validationError(res, `Cannot create design job for ${order.status_code} order`);
      }
      
      // Check if order item is in a design-requiring status
      const designStatuses = ['design', 'pending_design', 'design_in_progress'];
      if (!designStatuses.includes(item.status_code)) {
        return HttpErrors.validationError(res, `Order item status '${item.status_code}' does not require design work`);
      }

      // Check if design job already exists for this order item
      const { data: existingJob } = await sb
        .from('design_jobs')
        .select('id')
        .eq('order_item_id', itemId)
        .single();

      if (existingJob) {
        return HttpErrors.conflict(res, `Design job already exists for order item: ${itemId}`);
      }

      // Create design job using the service with authenticated client
      const designJob = await DesignJobService.createDesignJob(
        sb,
        itemId,
        order.org_id,
        req.user?.id,
        {
          title: designJobData.title || `Design for ${item.name_snapshot || 'Order Item'}`,
          brief: designJobData.brief,
          priority: designJobData.priority || 5,
          statusCode: designJobData.statusCode || 'queued',
          assigneeDesignerId: designJobData.assigneeDesignerId,
        }
      );

      // Track business event
      trackBusinessEvent('design_job_created', req, {
        design_job_id: designJob.id,
        order_item_id: itemId,
        order_id: orderId,
        organization_id: order.org_id,
      });

      logDatabaseOperation(req, 'DESIGN_JOB_CREATED', 'design_jobs', { 
        designJobId: designJob.id, 
        orderId, 
        itemId 
      });
      
      sendCreated(res, designJob);
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        return HttpErrors.conflict(res, error.message);
      }
      if (error instanceof Error && (error.message === 'Order not found' || error.message === 'Order item not found')) {
        return HttpErrors.notFound(res, error.message);
      }
      if (error instanceof Error && error.message === 'Missing authentication token') {
        return HttpErrors.unauthorized(res, 'Authentication required');
      }
      console.error('Error creating design job:', error);
      handleDatabaseError(res, error, 'create design job');
    }
  })
);

export default router;