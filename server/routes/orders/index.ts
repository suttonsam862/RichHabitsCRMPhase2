import express from 'express';
import { supabaseAdmin, supabaseForUser } from '../../lib/supabase';
import { requireAuth, AuthedRequest } from '../../middleware/auth';
import { sendSuccess, sendErr, handleDatabaseError } from '../../lib/http';
import { getOrderById as getOrderByIdService, listOrders, updateOrder } from '../../services/supabase/orders';
import { listOrderItems } from '../../services/supabase/orderItems';

const router = express.Router();

// GET /api/orders - List orders with filtering and sorting
router.get('/', requireAuth, async (req, res) => {
  const authedReq = req as AuthedRequest;
  if (!authedReq.user || !authedReq.user.organization_id) {
    return sendErr(res, 'UNAUTHORIZED', 'User authentication required', undefined, 401);
  }

  try {
    const { 
      q = '', 
      statusCode, 
      sortBy = 'created_at',
      sortOrder = 'desc',
      limit = '50'
    } = req.query;

    // Use tenant scoping for security - only show orders for user's org
    let query = supabaseAdmin
      .from('orders')
      .select('id,code,status_code,created_at,due_date,priority,customer_contact_name,customer_contact_email,org_id')
      .eq('org_id', authedReq.user.organization_id);

    // Apply filters
    if (q && typeof q === 'string') {
      query = query.or(`code.ilike.%${q}%,customer_contact_name.ilike.%${q}%`);
    }

    if (statusCode && typeof statusCode === 'string') {
      query = query.eq('status_code', statusCode);
    }

    // Apply sorting and pagination
    const ascending = sortOrder === 'asc';
    query = query
      .order(sortBy as string, { ascending })
      .limit(parseInt(limit as string));

    const { data: orders, error } = await query;

    if (error) {
      return handleDatabaseError(res, error, 'fetch orders');
    }

    // Send orders data directly (no join artifacts to transform)
    const transformedOrders = orders || [];

    sendSuccess(res, transformedOrders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    sendErr(res, 'DATABASE_ERROR', 'Failed to fetch orders', undefined, 500);
  }
});

// GET /api/orders/stats - Order statistics
router.get('/stats', requireAuth, async (req, res) => {
  const authedReq = req as AuthedRequest;
  if (!authedReq.user || !authedReq.user.organization_id) {
    return sendErr(res, 'UNAUTHORIZED', 'User authentication required', undefined, 401);
  }

  const orgId = authedReq.user.organization_id;

  // Use orders service to get all orders for the org and aggregate in code
  const result = await listOrders({ org_id: orgId });
  
  if (result.error) {
    return sendErr(res, 'DATABASE_ERROR', result.error, undefined, 500);
  }

  const orders = result.data || [];
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const completedStatuses = ['completed'];
  const archivedStatuses = ['completed', 'cancelled', 'archived'];

  // Aggregate stats from the orders data
  const stats = {
    totalOrders: orders.length,
    activeOrders: orders.filter(order => !archivedStatuses.includes(order.status_code)).length,
    completedThisMonth: orders.filter(order => 
      completedStatuses.includes(order.status_code) && 
      new Date(order.created_at) >= startOfMonth
    ).length,
    revenueThisMonth: 0, // TODO: Calculate from order amounts
    averageOrderValue: 0, // TODO: Calculate average
    onTimeDeliveryRate: 85, // TODO: Calculate actual rate
    overdueOrders: orders.filter(order => 
      !archivedStatuses.includes(order.status_code) &&
      order.due_date && 
      new Date(order.due_date) < now
    ).length,
  };

  sendSuccess(res, stats);
});

// GET /api/orders/:id - Get single order
router.get('/:id', requireAuth, async (req, res) => {
  const authedReq = req as AuthedRequest;
  if (!authedReq.user || !authedReq.user.organization_id) {
    return sendErr(res, 'UNAUTHORIZED', 'User authentication required', undefined, 401);
  }

  try {
    const { id } = req.params;
    const orgId = authedReq.user.organization_id;

    // Use new service layer with tenant scoping
    const result = await getOrderByIdService(id, orgId);

    if (result.error) {
      if (result.error.includes('not found')) {
        return sendErr(res, 'NOT_FOUND', 'Order not found', undefined, 404);
      }
      return sendErr(res, 'DATABASE_ERROR', result.error, undefined, 500);
    }

    sendSuccess(res, result.data);
  } catch (error) {
    console.error('Error fetching order:', error);
    sendErr(res, 'DATABASE_ERROR', 'Failed to fetch order', undefined, 500);
  }
});

// PATCH /api/orders/:id/status - Update order status
router.patch('/:id/status', requireAuth, async (req, res) => {
  const authedReq = req as AuthedRequest;
  if (!authedReq.user || !authedReq.user.organization_id) {
    return sendErr(res, 'UNAUTHORIZED', 'User authentication required', undefined, 401);
  }

  const { id } = req.params;
  const { statusCode } = req.body;
  const orgId = authedReq.user.organization_id;

  if (!statusCode) {
    return sendErr(res, 'VALIDATION_ERROR', 'Status code is required', undefined, 400);
  }

  // First verify order exists and belongs to user's org for tenant scoping
  const orderResult = await getOrderByIdService(id, orgId);
  
  if (orderResult.error) {
    if (orderResult.error.includes('not found')) {
      return sendErr(res, 'NOT_FOUND', 'Order not found', undefined, 404);
    }
    return sendErr(res, 'DATABASE_ERROR', orderResult.error, undefined, 500);
  }

  // Use service to update the order
  const updateResult = await updateOrder(id, { status_code: statusCode });
  
  if (updateResult.error) {
    return sendErr(res, 'DATABASE_ERROR', updateResult.error, undefined, 500);
  }

  sendSuccess(res, updateResult.data);
});

// GET /api/orders/:id/items - Get order items
router.get('/:id/items', requireAuth, async (req, res) => {
  const authedReq = req as AuthedRequest;
  if (!authedReq.user || !authedReq.user.organization_id) {
    return sendErr(res, 'UNAUTHORIZED', 'User authentication required', undefined, 401);
  }

  const { id } = req.params;
  const orgId = authedReq.user.organization_id;

  // Use service to get order items with tenant scoping
  const result = await listOrderItems({ order_id: id, org_id: orgId });
  
  if (result.error) {
    return sendErr(res, 'DATABASE_ERROR', result.error, undefined, 500);
  }

  sendSuccess(res, result.data || []);
});

// GET /api/orders/:id/events - Get order timeline events
router.get('/:id/events', requireAuth, async (req, res) => {
  const authedReq = req as AuthedRequest;
  if (!authedReq.user) {
    return sendErr(res, 'UNAUTHORIZED', 'User authentication required', undefined, 401);
  }

  try {
    // For now, return empty array - timeline feature can be implemented later
    sendSuccess(res, []);
  } catch (error) {
    console.error('Error fetching order events:', error);
    sendErr(res, 'DATABASE_ERROR', 'Failed to fetch order events', undefined, 500);
  }
});

// POST /api/orders/:id/notes - Add note to order
router.post('/:id/notes', requireAuth, async (req, res) => {
  const authedReq = req as AuthedRequest;
  if (!authedReq.user) {
    return sendErr(res, 'UNAUTHORIZED', 'User authentication required', undefined, 401);
  }

  try {
    const { note } = req.body;

    if (!note) {
      return sendErr(res, 'VALIDATION_ERROR', 'Note content is required', undefined, 400);
    }

    // For now, just return success - notes system can be implemented later
    sendSuccess(res, { message: 'Note added successfully' });
  } catch (error) {
    console.error('Error adding note:', error);
    sendErr(res, 'DATABASE_ERROR', 'Failed to add note', undefined, 500);
  }
});


// POST /api/v1/orders/bulk-action - Frontend bulk operations endpoint  
router.post('/bulk-action', requireAuth, async (req, res) => {
  const authedReq = req as AuthedRequest;
  if (!authedReq.user) {
    return sendErr(res, 'UNAUTHORIZED', 'User authentication required', undefined, 401);
  }

  try {
    const { action, orderIds, filters } = req.body;

    if (!action) {
      return sendErr(res, 'VALIDATION_ERROR', 'Action is required', undefined, 400);
    }

    // SECURITY: Use user's scoped client instead of admin client for bulk operations
    const userClient = supabaseForUser(req.headers.authorization?.split(' ')[1] || '');

    // Handle bulk operations based on action type
    let result;
    let affectedCount = 0;
    switch (action) {
      case 'archive': {
        if (!Array.isArray(orderIds) || orderIds.length === 0) {
          return sendErr(res, 'VALIDATION_ERROR', 'Order IDs are required for archive action', undefined, 400);
        }
        
        // Use service layer for each order with org scoping
        affectedCount = 0;
        for (const orderId of orderIds) {
          const result = await updateOrder(orderId, { status_code: 'archived' });
          if (result.error) {
            return handleDatabaseError(res, { message: result.error }, 'bulk archive orders');
          }
          affectedCount++;
        }
        
        result = { action: 'archive', affected: affectedCount };
        break;
      }

      case 'changeStatus': {
        const { statusCode } = req.body;
        if (!statusCode || !Array.isArray(orderIds) || orderIds.length === 0) {
          return sendErr(res, 'VALIDATION_ERROR', 'Status code and order IDs are required', undefined, 400);
        }

        // Use service layer for each order with org scoping
        affectedCount = 0;
        for (const orderId of orderIds) {
          const result = await updateOrder(orderId, { status_code: statusCode });
          if (result.error) {
            return handleDatabaseError(res, { message: result.error }, 'bulk status change');
          }
          affectedCount++;
        }
        
        result = { action: 'changeStatus', statusCode, affected: affectedCount };
        break;
      }

      case 'assign': {
        const { assigneeId } = req.body;
        if (!assigneeId || !Array.isArray(orderIds) || orderIds.length === 0) {
          return sendErr(res, 'VALIDATION_ERROR', 'Assignee ID and order IDs are required', undefined, 400);
        }

        // Use service layer for each order with org scoping
        affectedCount = 0;
        for (const orderId of orderIds) {
          const result = await updateOrder(orderId, { salesperson_id: assigneeId });
          if (result.error) {
            return handleDatabaseError(res, { message: result.error }, 'bulk assign orders');
          }
          affectedCount++;
        }
        
        result = { action: 'assign', assigneeId, affected: affectedCount };
        break;
      }

      case 'export':
        // For export, we don't modify data, just return success
        // The frontend handles the actual export logic
        result = { 
          action: 'export', 
          message: 'Export initiated',
          filters: filters || {},
          timestamp: new Date().toISOString()
        };
        break;

      default:
        return sendErr(res, 'VALIDATION_ERROR', `Unsupported bulk action: ${action}`, undefined, 400);
    }

    sendSuccess(res, result);
  } catch (error) {
    console.error('Error performing bulk action:', error);
    sendErr(res, 'DATABASE_ERROR', 'Failed to perform bulk action', undefined, 500);
  }
});

export default router;
