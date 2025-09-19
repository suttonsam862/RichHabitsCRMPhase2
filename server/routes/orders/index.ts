import express from 'express';
import { z } from 'zod';
import { CreateOrderDTO, UpdateOrderDTO, OrderDTO, CancelOrderDTO } from '@shared/dtos';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/asyncHandler';
import { supabaseForUser, extractAccessToken } from '../../lib/supabase';
import { sendSuccess, sendOk, sendCreated, sendNoContent, sendErr, HttpErrors, handleDatabaseError } from '../../lib/http';
import { requireAuth, AuthedRequest } from '../../middleware/auth';
import { requireOrgMember } from '../../middleware/orgSecurity';
import { logDatabaseOperation } from '../../lib/log';
import { parsePaginationParams, sendPaginatedResponse } from '../../lib/pagination';
import { idempotent } from '../../lib/idempotency';
import { trackBusinessEvent } from '../../middleware/metrics';

const router = express.Router();

// All orders routes require authentication
router.use(requireAuth);

// Helper function to generate order code with collision retry
function generateOrderCode(): string {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${today}-${random}`;
}

// Status transition state machine
const STATUS_TRANSITIONS = {
  'draft': ['pending', 'cancelled'],
  'pending': ['confirmed', 'cancelled'],
  'confirmed': ['processing', 'cancelled'],
  'processing': ['shipped', 'cancelled'],
  'shipped': ['delivered'],
  'delivered': ['completed'],
  'completed': [], // Terminal state
  'cancelled': [] // Terminal state
};

// Helper to validate status transition
function isValidStatusTransition(from: string, to: string): boolean {
  if (from === to) return true; // Same status is always valid
  const validTransitions = STATUS_TRANSITIONS[from] || [];
  return validTransitions.includes(to);
}

// Helper to get authenticated database client
function getAuthenticatedClient(req: AuthedRequest) {
  const token = extractAccessToken(req.headers.authorization);
  if (!token) {
    throw new Error('Missing authentication token');
  }
  return supabaseForUser(token);
}

// Helper to validate status codes against status tables
async function validateOrderStatusCode(statusCode: string, sb: any): Promise<boolean> {
  try {
    const { data, error } = await sb
      .from('status_orders')
      .select('code')
      .eq('code', statusCode)
      .single();
    return !error && !!data;
  } catch {
    return false;
  }
}

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

// Helper to verify order belongs to user's organization
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

// Get available order status codes
router.get('/status-codes', asyncHandler(async (req: AuthedRequest, res) => {
  try {
    const sb = getAuthenticatedClient(req);
    
    const { data, error } = await sb
      .from('status_orders')
      .select('code, sort_order, is_terminal')
      .order('sort_order');

    if (error) {
      return handleDatabaseError(res, error, 'fetch order status codes');
    }

    sendOk(res, data || []);
  } catch (error) {
    handleDatabaseError(res, error, 'fetch order status codes');
  }
}));

// Get available order item status codes
router.get('/item-status-codes', asyncHandler(async (req: AuthedRequest, res) => {
  try {
    const sb = getAuthenticatedClient(req);
    
    const { data, error } = await sb
      .from('status_order_items')
      .select('code, sort_order, is_terminal')
      .order('sort_order');

    if (error) {
      return handleDatabaseError(res, error, 'fetch order item status codes');
    }

    sendOk(res, data || []);
  } catch (error) {
    handleDatabaseError(res, error, 'fetch order item status codes');
  }
}));

// List all orders with filtering, sorting, and pagination
router.get('/', requireOrgMember(), asyncHandler(async (req: AuthedRequest, res) => {
  const {
    q = '',
    orgId,
    statusCode,
    customerId
  } = req.query;

  const paginationParams = parsePaginationParams(req.query);

  try {
    const sb = getAuthenticatedClient(req);
    
    // Build query with explicit org scoping
    let query = sb.from('orders').select(`
      *,
      customers:customer_id(id, name),
      organizations:org_id(id, name)
    `, { count: 'exact' });

    // Apply org filter - this ensures RLS compliance
    if (orgId) {
      query = query.eq('org_id', orgId as string);
    } else {
      // If no orgId specified, still ensure proper org scoping via RLS
      // The authenticated client will automatically enforce RLS policies
    }

    if (statusCode) {
      query = query.eq('status_code', statusCode as string);
    }

    if (customerId) {
      query = query.eq('customer_id', customerId as string);
    }

    // Search query
    if (q && typeof q === 'string' && q.trim()) {
      const searchTerm = q.trim();
      query = query.or(`code.ilike.%${searchTerm}%,customer_contact_name.ilike.%${searchTerm}%,customer_contact_email.ilike.%${searchTerm}%`);
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(paginationParams.offset, paginationParams.offset + paginationParams.limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return handleDatabaseError(res, error, 'list orders');
    }

    sendPaginatedResponse(res, data || [], count || 0, paginationParams);
  } catch (error) {
    handleDatabaseError(res, error, 'list orders');
  }
}));

// Get order by ID
router.get('/:id', requireOrgMember(), asyncHandler(async (req: AuthedRequest, res) => {
  const { id } = req.params;

  try {
    const sb = getAuthenticatedClient(req);
    
    // First verify order access and get basic info
    const order = await verifyOrderAccess(id, req, sb);
    
    // Get order with related data using authenticated client
    const { data: fullOrder, error: orderError } = await sb
      .from('orders')
      .select(`
        *,
        customers:customer_id(id, name, email, phone),
        organizations:org_id(id, name)
      `)
      .eq('id', id)
      .single();

    if (orderError || !fullOrder) {
      return HttpErrors.notFound(res, 'Order not found');
    }

    // Get order items using authenticated client
    const { data: items, error: itemsError } = await sb
      .from('order_items')
      .select('*')
      .eq('order_id', id);

    if (itemsError) {
      return handleDatabaseError(res, itemsError, 'fetch order items');
    }

    const response = {
      ...fullOrder,
      items: items || []
    };

    sendOk(res, response);
  } catch (error) {
    if (error instanceof Error && error.message === 'Order not found') {
      return HttpErrors.notFound(res, 'Order not found');
    }
    handleDatabaseError(res, error, 'fetch order');
  }
}));

// Create order (with idempotency support)
router.post('/',
  requireOrgMember(),
  idempotent(),
  validateRequest({ body: CreateOrderDTO }),
  asyncHandler(async (req: AuthedRequest, res) => {
    const validatedData = req.body;

    try {
      const sb = getAuthenticatedClient(req);
      
      // Validate status code if provided
      if (validatedData.statusCode) {
        const isValid = await validateOrderStatusCode(validatedData.statusCode, sb);
        if (!isValid) {
          return HttpErrors.validationError(res, `Invalid status code: ${validatedData.statusCode}. Use GET /api/orders/status-codes to see valid options.`);
        }
      }

      // Validate order item status codes if items provided
      if (validatedData.items && validatedData.items.length > 0) {
        for (const item of validatedData.items) {
          if (item.statusCode) {
            const isValid = await validateOrderItemStatusCode(item.statusCode, sb);
            if (!isValid) {
              return HttpErrors.validationError(res, `Invalid order item status code: ${item.statusCode}. Use GET /api/orders/item-status-codes to see valid options.`);
            }
          }
        }
      }

      // Prepare order data with collision retry logic
      let orderCode = validatedData.code || generateOrderCode();
      let attempts = 0;
      const maxAttempts = 3;
      let newOrder = null;

      while (attempts < maxAttempts) {
        const orderData = {
          org_id: validatedData.orgId,
          customer_id: validatedData.customerId,
          salesperson_id: validatedData.salespersonId || null,
          sport_id: validatedData.sportId || null,
          code: orderCode,
          customer_contact_name: validatedData.customerContactName || null,
          customer_contact_email: validatedData.customerContactEmail || null,
          customer_contact_phone: validatedData.customerContactPhone || null,
          status_code: validatedData.statusCode || 'draft',
          total_amount: validatedData.totalAmount || null,
          revenue_estimate: validatedData.revenueEstimate || null,
          due_date: validatedData.dueDate || null,
          notes: validatedData.notes || null
        };

        const { data, error } = await sb
          .from('orders')
          .insert(orderData)
          .select()
          .single();

        if (error) {
          // Check for unique constraint violation on order code
          if (error.code === '23505' && error.message.includes('code')) {
            attempts++;
            if (attempts >= maxAttempts) {
              return HttpErrors.conflict(res, 'Unable to generate unique order code after multiple attempts');
            }
            // Generate new code and retry
            orderCode = generateOrderCode();
            continue;
          }
          return handleDatabaseError(res, error, 'create order');
        }

        newOrder = data;
        break;
      }

      if (!newOrder) {
        return HttpErrors.internalError(res, 'Failed to create order');
      }

      // Insert order items if provided
      if (validatedData.items && validatedData.items.length > 0) {
        const itemsData = validatedData.items.map(item => ({
          org_id: validatedData.orgId,
          order_id: newOrder.id,
          product_id: item.productId || null,
          variant_id: item.variantId || null,
          name_snapshot: item.nameSnapshot || null,
          sku_snapshot: item.skuSnapshot || null,
          price_snapshot: item.priceSnapshot || null,
          quantity: item.quantity,
          status_code: item.statusCode || 'pending_design',
          designer_id: item.designerId || null,
          manufacturer_id: item.manufacturerId || null,
          pantone_json: item.pantoneJson || null,
          build_overrides_text: item.buildOverridesText || null,
          variant_image_url: item.variantImageUrl || null
        }));

        const { error: itemsError } = await sb
          .from('order_items')
          .insert(itemsData);

        if (itemsError) {
          // Try to rollback order creation
          await sb.from('orders').delete().eq('id', newOrder.id);
          return handleDatabaseError(res, itemsError, 'create order items');
        }
      }

      // Track business metrics
      trackBusinessEvent('order_created', req, { 
        status: newOrder.status_code || 'draft',
        order_id: newOrder.id,
        organization_id: newOrder.org_id 
      });

      logDatabaseOperation(req, 'ORDER_CREATED', 'orders', { orderId: newOrder.id });
      sendCreated(res, newOrder);
    } catch (error) {
      if (error instanceof Error && error.message === 'Missing authentication token') {
        return HttpErrors.unauthorized(res, 'Authentication required');
      }
      handleDatabaseError(res, error, 'create order');
    }
  })
);

// Update order status
router.patch('/:id/status', requireOrgMember(), asyncHandler(async (req: AuthedRequest, res) => {
  const { id } = req.params;
  const { statusCode } = req.body;

  if (!statusCode) {
    return HttpErrors.validationError(res, 'statusCode is required');
  }

  try {
    const sb = getAuthenticatedClient(req);
    
    // First verify order access and get current status
    const order = await verifyOrderAccess(id, req, sb);
    const currentStatus = order.status_code;
    
    // Validate status code exists
    const isValid = await validateOrderStatusCode(statusCode, sb);
    if (!isValid) {
      return HttpErrors.validationError(res, `Invalid status code: ${statusCode}. Use GET /api/orders/status-codes to see valid options.`);
    }
    
    // Validate status transition
    if (!isValidStatusTransition(currentStatus, statusCode)) {
      const validTransitions = STATUS_TRANSITIONS[currentStatus] || [];
      return HttpErrors.validationError(res, 
        `Invalid status transition from '${currentStatus}' to '${statusCode}'. Valid transitions: ${validTransitions.length ? validTransitions.join(', ') : 'none (terminal state)'}`);
    }

    // Update status
    const { data, error } = await sb
      .from('orders')
      .update({ 
        status_code: statusCode,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return handleDatabaseError(res, error, 'update order status');
    }

    if (!data) {
      return HttpErrors.notFound(res, 'Order not found');
    }

    logDatabaseOperation(req, 'ORDER_STATUS_UPDATED', 'orders', { orderId: id, statusCode, previousStatus: currentStatus });
    sendOk(res, data);
  } catch (error) {
    if (error instanceof Error && error.message === 'Order not found') {
      return HttpErrors.notFound(res, 'Order not found');
    }
    if (error instanceof Error && error.message === 'Missing authentication token') {
      return HttpErrors.unauthorized(res, 'Authentication required');
    }
    handleDatabaseError(res, error, 'update order status');
  }
}));

// Update order
router.patch('/:id',
  requireOrgMember(),
  validateRequest({ body: UpdateOrderDTO }),
  asyncHandler(async (req: AuthedRequest, res) => {
    const { id } = req.params;
    const validatedData = req.body;

    try {
      const sb = getAuthenticatedClient(req);
      
      // First verify order access and get current status
      const order = await verifyOrderAccess(id, req, sb);
      const currentStatus = order.status_code;
      
      // Validate status code if provided and check transition
      if (validatedData.statusCode) {
        const isValid = await validateOrderStatusCode(validatedData.statusCode, sb);
        if (!isValid) {
          return HttpErrors.validationError(res, `Invalid status code: ${validatedData.statusCode}. Use GET /api/orders/status-codes to see valid options.`);
        }
        
        // Validate status transition
        if (!isValidStatusTransition(currentStatus, validatedData.statusCode)) {
          const validTransitions = STATUS_TRANSITIONS[currentStatus] || [];
          return HttpErrors.validationError(res, 
            `Invalid status transition from '${currentStatus}' to '${validatedData.statusCode}'. Valid transitions: ${validTransitions.length ? validTransitions.join(', ') : 'none (terminal state)'}`);
        }
      }

      // Prepare update data (only include provided fields)
      const updateData: any = { updated_at: new Date().toISOString() };
      
      if (validatedData.customerId !== undefined) updateData.customer_id = validatedData.customerId;
      if (validatedData.salespersonId !== undefined) updateData.salesperson_id = validatedData.salespersonId;
      if (validatedData.sportId !== undefined) updateData.sport_id = validatedData.sportId;
      if (validatedData.customerContactName !== undefined) updateData.customer_contact_name = validatedData.customerContactName;
      if (validatedData.customerContactEmail !== undefined) updateData.customer_contact_email = validatedData.customerContactEmail;
      if (validatedData.customerContactPhone !== undefined) updateData.customer_contact_phone = validatedData.customerContactPhone;
      if (validatedData.statusCode !== undefined) updateData.status_code = validatedData.statusCode;
      if (validatedData.totalAmount !== undefined) updateData.total_amount = validatedData.totalAmount;
      if (validatedData.revenueEstimate !== undefined) updateData.revenue_estimate = validatedData.revenueEstimate;
      if (validatedData.dueDate !== undefined) updateData.due_date = validatedData.dueDate;
      if (validatedData.notes !== undefined) updateData.notes = validatedData.notes;

      // Update order
      const { data, error } = await sb
        .from('orders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return handleDatabaseError(res, error, 'update order');
      }

      if (!data) {
        return HttpErrors.notFound(res, 'Order not found');
      }

      logDatabaseOperation(req, 'ORDER_UPDATED', 'orders', { 
        orderId: id, 
        updatedFields: Object.keys(updateData),
        statusChanged: validatedData.statusCode ? { from: currentStatus, to: validatedData.statusCode } : undefined
      });
      sendOk(res, data);
    } catch (error) {
      if (error instanceof Error && error.message === 'Order not found') {
        return HttpErrors.notFound(res, 'Order not found');
      }
      if (error instanceof Error && error.message === 'Missing authentication token') {
        return HttpErrors.unauthorized(res, 'Authentication required');
      }
      handleDatabaseError(res, error, 'update order');
    }
  })
);

// Cancel order - specialized status change endpoint
router.post('/:id/cancel', 
  requireOrgMember(), 
  validateRequest({ body: CancelOrderDTO }),
  asyncHandler(async (req: AuthedRequest, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const sb = getAuthenticatedClient(req);
    
    // First verify order access and get current status
    const order = await verifyOrderAccess(id, req, sb);
    const currentStatus = order.status_code;
    
    // Check if order can be cancelled (business rules)
    if (currentStatus === 'cancelled') {
      return HttpErrors.validationError(res, 'Order is already cancelled');
    }
    
    if (currentStatus === 'completed' || currentStatus === 'delivered') {
      return HttpErrors.validationError(res, 'Cannot cancel a completed or delivered order');
    }
    
    // Validate status transition to cancelled
    if (!isValidStatusTransition(currentStatus, 'cancelled')) {
      return HttpErrors.validationError(res, `Cannot cancel order in '${currentStatus}' status. Order is too far along in processing.`);
    }

    // Validate that 'cancelled' is a valid status code
    const isValidStatus = await validateOrderStatusCode('cancelled', sb);
    if (!isValidStatus) {
      return HttpErrors.internalError(res, 'Cancel status not configured in system');
    }

    // Get full order details for notes update
    const { data: fullOrder, error: fetchError } = await sb
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !fullOrder) {
      return HttpErrors.notFound(res, 'Order not found');
    }

    // Update order status to cancelled
    const updatedNotes = reason 
      ? `${fullOrder.notes || ''}\n\nCancellation reason: ${reason}`.trim()
      : fullOrder.notes;

    const { data: cancelledOrder, error: updateError } = await sb
      .from('orders')
      .update({ 
        status_code: 'cancelled',
        notes: updatedNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return handleDatabaseError(res, updateError, 'cancel order');
    }

    if (!cancelledOrder) {
      return HttpErrors.internalError(res, 'Failed to cancel order');
    }
    
    // Track business event
    trackBusinessEvent('order_cancelled', req, { 
      order_id: id,
      organization_id: cancelledOrder.org_id,
      reason: reason || 'No reason provided',
      previous_status: currentStatus
    });
    
    logDatabaseOperation(req, 'ORDER_CANCELLED', 'orders', { orderId: id, reason, previousStatus: currentStatus });
    sendOk(res, cancelledOrder);
  } catch (error) {
    if (error instanceof Error && error.message === 'Order not found') {
      return HttpErrors.notFound(res, 'Order not found');
    }
    if (error instanceof Error && error.message === 'Missing authentication token') {
      return HttpErrors.unauthorized(res, 'Authentication required');
    }
    handleDatabaseError(res, error, 'cancel order');
  }
}));

// Delete order
router.delete('/:id', requireOrgMember(), asyncHandler(async (req: AuthedRequest, res) => {
  const { id } = req.params;

  try {
    const sb = getAuthenticatedClient(req);
    
    // First verify order access and get current status
    const order = await verifyOrderAccess(id, req, sb);
    const currentStatus = order.status_code;
    
    // Business constraint: Only allow deletion of draft or pending orders
    const deletableStatuses = ['draft', 'pending'];
    if (!deletableStatuses.includes(currentStatus)) {
      return HttpErrors.validationError(res, `Cannot delete order in '${currentStatus}' status. Only orders in 'draft' or 'pending' status can be deleted.`);
    }

    // Delete order (items will cascade due to FK constraints)
    const { error } = await sb
      .from('orders')
      .delete()
      .eq('id', id);

    if (error) {
      return handleDatabaseError(res, error, 'delete order');
    }

    // Track business event
    trackBusinessEvent('order_deleted', req, {
      order_id: id,
      organization_id: order.org_id,
      status_when_deleted: currentStatus
    });

    logDatabaseOperation(req, 'ORDER_DELETED', 'orders', { orderId: id, statusWhenDeleted: currentStatus });
    sendNoContent(res);
  } catch (error) {
    if (error instanceof Error && error.message === 'Order not found') {
      return HttpErrors.notFound(res, 'Order not found');
    }
    if (error instanceof Error && error.message === 'Missing authentication token') {
      return HttpErrors.unauthorized(res, 'Authentication required');
    }
    handleDatabaseError(res, error, 'delete order');
  }
}));

// Analytics endpoint - orders by status
router.get('/analytics/summary', requireOrgMember(), asyncHandler(async (req: AuthedRequest, res) => {
  const { orgId } = req.query;

  try {
    const sb = getAuthenticatedClient(req);
    
    // Base query with authenticated client and explicit org filter
    let baseQuery = sb.from('orders').select('*');
    if (orgId) {
      baseQuery = baseQuery.eq('org_id', orgId as string);
    }
    // If no orgId specified, RLS will automatically filter by user's accessible orgs

    // Try RPC function first, fallback to manual grouping
    const { data: statusCounts, error: statusError } = await sb
      .rpc('get_order_status_counts', orgId ? { org_filter: orgId as string } : {});

    if (statusError) {
      console.warn('RPC function not found, using fallback query');
      // Fallback to manual grouping
      const { data: orders } = await baseQuery;
      const statusMap = {};
      orders?.forEach(order => {
        const status = order.status_code || 'unknown';
        statusMap[status] = (statusMap[status] || 0) + 1;
      });
      
      const fallbackStatusCounts = Object.entries(statusMap).map(([status, count]) => ({
        status_code: status,
        count
      }));
      
      const { data: revenueData } = await baseQuery
        .select('revenue_estimate')
        .not('revenue_estimate', 'is', null);
      
      const totalRevenue = revenueData?.reduce((sum, order) => sum + (order.revenue_estimate || 0), 0) || 0;
      
      const { data: recentOrders } = await baseQuery
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      return sendOk(res, {
        statusCounts: fallbackStatusCounts,
        totalRevenue,
        recentOrders: recentOrders || []
      });
    }

    // Get total revenue estimate
    const { data: revenueData } = await baseQuery
      .select('revenue_estimate')
      .not('revenue_estimate', 'is', null);

    const totalRevenue = revenueData?.reduce((sum, order) => sum + (order.revenue_estimate || 0), 0) || 0;

    // Get recent orders
    const { data: recentOrders } = await baseQuery
      .order('created_at', { ascending: false })
      .limit(5);

    sendOk(res, {
      statusCounts: statusCounts || [],
      totalRevenue,
      recentOrders: recentOrders || []
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Missing authentication token') {
      return HttpErrors.unauthorized(res, 'Authentication required');
    }
    handleDatabaseError(res, error, 'fetch order analytics');
  }
}));

export default router;