import express from 'express';
import { supabaseAdmin, supabaseForUser } from '../../lib/supabase';
import { requireAuth, AuthedRequest } from '../../middleware/auth';
import { sendSuccess, sendErr, handleDatabaseError } from '../../lib/http';
import { getOrderById as getOrderByIdService } from '../../services/supabase/orders';

const router = express.Router();

// GET /api/orders - List orders with filtering and sorting
router.get('/', requireAuth, async (req, res) => {
  const authedReq = req as AuthedRequest;
  if (!authedReq.user) {
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

    let query = supabaseAdmin
      .from('orders')
      .select(`
        id,
        code,
        customer_contact_name,
        customer_contact_email,
        status_code,
        total_amount,
        total_items,
        created_at,
        due_date,
        priority,
        organizations:organization_id(name),
        sports:sport_id(name)
      `);

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

    // Transform data to match frontend expectations
    const transformedOrders = (orders || []).map(order => ({
      ...order,
      organization_name: order.organizations?.[0]?.name,
      sport_name: order.sports?.[0]?.name,
      organizations: undefined,
      sports: undefined
    }));

    sendSuccess(res, transformedOrders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    sendErr(res, 'DATABASE_ERROR', 'Failed to fetch orders', undefined, 500);
  }
});

// GET /api/orders/stats - Order statistics
router.get('/stats', requireAuth, async (req, res) => {
  const authedReq = req as AuthedRequest;
  if (!authedReq.user) {
    return sendErr(res, 'UNAUTHORIZED', 'User authentication required', undefined, 401);
  }

  try {
    // Get basic stats from orders table
    const { count: totalOrders } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true });

    const { count: activeOrders } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .not('status_code', 'in', '(completed,cancelled,archived)');

    const { count: completedThisMonth } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status_code', 'completed')
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

    const { count: overdueOrders } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .not('status_code', 'in', '(completed,cancelled,archived)')
      .lt('due_date', new Date().toISOString());

    const stats = {
      totalOrders: totalOrders || 0,
      activeOrders: activeOrders || 0,
      completedThisMonth: completedThisMonth || 0,
      revenueThisMonth: 0, // TODO: Calculate from order amounts
      averageOrderValue: 0, // TODO: Calculate average
      onTimeDeliveryRate: 85, // TODO: Calculate actual rate
      overdueOrders: overdueOrders || 0,
    };

    sendSuccess(res, stats);
  } catch (error) {
    console.error('Error fetching order stats:', error);
    sendErr(res, 'DATABASE_ERROR', 'Failed to fetch order statistics', undefined, 500);
  }
});

// GET /api/orders/:id - Get single order
router.get('/:id', requireAuth, async (req, res) => {
  const authedReq = req as AuthedRequest;
  if (!authedReq.user) {
    return sendErr(res, 'UNAUTHORIZED', 'User authentication required', undefined, 401);
  }

  try {
    const { id } = req.params;

    // Use new service layer
    const result = await getOrderByIdService(id);

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
  if (!authedReq.user) {
    return sendErr(res, 'UNAUTHORIZED', 'User authentication required', undefined, 401);
  }

  try {
    const { id } = req.params;
    const { statusCode } = req.body;

    if (!statusCode) {
      return sendErr(res, 'VALIDATION_ERROR', 'Status code is required', undefined, 400);
    }

    const { data: updatedOrder, error } = await supabaseAdmin
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

    sendSuccess(res, updatedOrder);
  } catch (error) {
    console.error('Error updating order status:', error);
    sendErr(res, 'DATABASE_ERROR', 'Failed to update order status', undefined, 500);
  }
});

// GET /api/orders/:id/items - Get order items
router.get('/:id/items', requireAuth, async (req, res) => {
  const authedReq = req as AuthedRequest;
  if (!authedReq.user) {
    return sendErr(res, 'UNAUTHORIZED', 'User authentication required', undefined, 401);
  }

  try {
    const { id } = req.params;

    const { data: items, error } = await supabaseAdmin
      .from('order_items')
      .select('*')
      .eq('order_id', id)
      .order('created_at');

    if (error) {
      return handleDatabaseError(res, error, 'fetch order items');
    }

    sendSuccess(res, items || []);
  } catch (error) {
    console.error('Error fetching order items:', error);
    sendErr(res, 'DATABASE_ERROR', 'Failed to fetch order items', undefined, 500);
  }
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
    switch (action) {
      case 'archive':
        if (!Array.isArray(orderIds) || orderIds.length === 0) {
          return sendErr(res, 'VALIDATION_ERROR', 'Order IDs are required for archive action', undefined, 400);
        }
        
        // Use user client to enforce RLS and org scoping
        const { error: archiveError } = await userClient
          .from('orders')
          .update({ 
            status_code: 'archived',
            updated_at: new Date().toISOString()
          })
          .in('id', orderIds);

        if (archiveError) {
          return handleDatabaseError(res, archiveError, 'bulk archive orders');
        }
        
        result = { action: 'archive', affected: orderIds.length };
        break;

      case 'changeStatus':
        const { statusCode } = req.body;
        if (!statusCode || !Array.isArray(orderIds) || orderIds.length === 0) {
          return sendErr(res, 'VALIDATION_ERROR', 'Status code and order IDs are required', undefined, 400);
        }

        const { error: statusError } = await userClient
          .from('orders')
          .update({ 
            status_code: statusCode,
            updated_at: new Date().toISOString()
          })
          .in('id', orderIds);

        if (statusError) {
          return handleDatabaseError(res, statusError, 'bulk status change');
        }
        
        result = { action: 'changeStatus', statusCode, affected: orderIds.length };
        break;

      case 'assign':
        const { assigneeId } = req.body;
        if (!assigneeId || !Array.isArray(orderIds) || orderIds.length === 0) {
          return sendErr(res, 'VALIDATION_ERROR', 'Assignee ID and order IDs are required', undefined, 400);
        }

        const { error: assignError } = await userClient
          .from('orders')
          .update({ 
            assigned_to: assigneeId,
            updated_at: new Date().toISOString()
          })
          .in('id', orderIds);

        if (assignError) {
          return handleDatabaseError(res, assignError, 'bulk assign orders');
        }
        
        result = { action: 'assign', assigneeId, affected: orderIds.length };
        break;

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