import express from 'express';
import { z } from 'zod';
import { CreateOrderDTO, UpdateOrderDTO, OrderDTO } from '@shared/dtos';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/asyncHandler';
import { db } from '../../db';
import { organizations } from '@shared/schema';
import { sql, eq, and, ilike, desc, inArray } from 'drizzle-orm';
import { sendSuccess, sendOk, sendCreated, sendNoContent, sendErr, HttpErrors, handleDatabaseError, mapDtoToDb, mapDbToDto } from '../../lib/http';
import { requireAuth, AuthedRequest } from '../../middleware/auth';
import { logDatabaseOperation } from '../../lib/log';
import { parsePaginationParams, sendPaginatedResponse } from '../../lib/pagination';
import { idempotent } from '../../lib/idempotency';
import { trackBusinessEvent } from '../../middleware/metrics';

const router = express.Router();

// DTO <-> DB field mappings for camelCase <-> snake_case conversion
const ORDER_DTO_TO_DB_MAPPING = {
  organizationId: 'org_id',
  customerId: 'customer_id',
  orderNumber: 'code',
  customerContactName: 'customer_contact_name',
  customerContactEmail: 'customer_contact_email',
  statusCode: 'status_code',
  dueDate: 'due_date',
  revenueEstimate: 'revenue_estimate',
  createdAt: 'created_at',
  updatedAt: 'updated_at'
};

const ORDER_ITEM_DTO_TO_DB_MAPPING = {
  orderId: 'order_id',
  productId: 'product_id',
  statusCode: 'status_code',
  nameSnapshot: 'name_snapshot',
  priceSnapshot: 'price_snapshot',
  designerId: 'designer_id',
  manufacturerId: 'manufacturer_id',
  variantImageUrl: 'variant_image_url',
  pantoneJson: 'pantone_json',
  buildOverridesText: 'build_overrides_text',
  createdAt: 'created_at',
  updatedAt: 'updated_at'
};

// Helper to map DB order row to DTO
function orderDbRowToDto(row: any): any {
  if (!row) return null;

  const mapped = mapDbToDto(row, ORDER_DTO_TO_DB_MAPPING);
  
  return {
    id: row.id,
    notes: row.notes,
    ...mapped,
    createdAt: row.created_at?.toISOString?.() ?? null,
    updatedAt: row.updated_at?.toISOString?.() ?? null,
    dueDate: row.due_date || null,
  };
}

// Helper to map DB order item row to DTO  
function orderItemDbRowToDto(row: any): any {
  if (!row) return null;

  const mapped = mapDbToDto(row, ORDER_ITEM_DTO_TO_DB_MAPPING);
  
  return {
    id: row.id,
    orgId: row.org_id,
    ...mapped,
    createdAt: row.created_at?.toISOString?.() ?? null,
    updatedAt: row.updated_at?.toISOString?.() ?? null,
  };
}

// Status code constants from status_orders/status_order_items
const ORDER_STATUS_CODES = ['draft', 'submitted', 'production', 'shipped', 'completed', 'cancelled'];
const ITEM_STATUS_CODES = ['pending_design', 'designing', 'approved', 'manufacturing', 'completed', 'shipped'];

// Helper to validate statusCode against status_orders table
async function validateOrderStatusCode(statusCode: string): Promise<boolean> {
  try {
    const result = await db
      .select({ code: statusOrders.code })
      .from(statusOrders)
      .where(eq(statusOrders.code, statusCode))
      .limit(1);
    return result.length > 0;
  } catch {
    return false;
  }
}

// Helper to validate statusCode against status_order_items table
async function validateOrderItemStatusCode(statusCode: string): Promise<boolean> {
  try {
    const result = await db
      .select({ code: statusOrderItems.code })
      .from(statusOrderItems)
      .where(eq(statusOrderItems.code, statusCode))
      .limit(1);
    return result.length > 0;
  } catch {
    return false;
  }
}

// All orders routes require authentication
router.use(requireAuth);

// Get available order status codes
router.get('/status-codes', asyncHandler(async (req: AuthedRequest, res) => {
  try {
    const result = await db
      .select({
        code: statusOrders.code,
        sortOrder: statusOrders.sortOrder,
        isTerminal: statusOrders.isTerminal
      })
      .from(statusOrders)
      .orderBy(statusOrders.sortOrder);

    sendOk(res, result);
  } catch (error) {
    handleDatabaseError(res, error, 'fetch order status codes');
  }
}));

// Get available order item status codes
router.get('/item-status-codes', asyncHandler(async (req: AuthedRequest, res) => {
  try {
    const result = await db
      .select({
        code: statusOrderItems.code,
        sortOrder: statusOrderItems.sortOrder,
        isTerminal: statusOrderItems.isTerminal
      })
      .from(statusOrderItems)
      .orderBy(statusOrderItems.sortOrder);

    sendOk(res, result);
  } catch (error) {
    handleDatabaseError(res, error, 'fetch order item status codes');
  }
}));

// List all orders with filtering, sorting, and pagination
router.get('/', asyncHandler(async (req: AuthedRequest, res) => {
  const {
    q = '',
    orgId,
    statusCode,
    customerId
  } = req.query;

  // Use standard pagination params
  const paginationParams = parsePaginationParams(req.query);

  try {
    // Build where conditions
    const conditions = [];
    
    // Organization filter
    if (orgId) {
      conditions.push(eq(orders.orgId, orgId as string));
    }

    // Status filter
    if (statusCode) {
      conditions.push(eq(orders.statusCode, statusCode as string));
    }

    // Customer filter
    if (customerId) {
      conditions.push(eq(orders.customerId, customerId as string));
    }

    // Search query by order number or customer contact
    if (q && typeof q === 'string' && q.trim()) {
      const searchTerm = `%${q.trim()}%`;
      conditions.push(sql`(${orders.code} ILIKE ${searchTerm} OR ${orders.customerContactName} ILIKE ${searchTerm} OR ${orders.customerContactEmail} ILIKE ${searchTerm})`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const countResult = await db
      .select({ count: sql`count(*)` })
      .from(orders)
      .where(whereClause);

    const total = Number(countResult[0]?.count || 0);

    // Get paginated results with joins
    const results = await db
      .select({
        order: orders,
        customer: customers,
        organization: organizations
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(organizations, eq(orders.orgId, organizations.id))
      .where(whereClause)
      .orderBy(desc(orders.createdAt))
      .limit(paginationParams.limit)
      .offset(paginationParams.offset);

    // Map database rows to DTOs with nested entities
    const data = results.map(row => ({
      ...orderDbRowToDto(row.order),
      customer: row.customer ? { id: row.customer.id, name: row.customer.name } : null,
      organization: row.organization ? { id: row.organization.id, name: row.organization.name } : null
    }));

    // Send paginated response with X-Total-Count header
    sendPaginatedResponse(res, data, total, paginationParams);
  } catch (error) {
    handleDatabaseError(res, error, 'list orders');
  }
}));

// Get order by ID
router.get('/:id', asyncHandler(async (req: AuthedRequest, res) => {
  const { id } = req.params;

  try {
    const result = await db
      .select({
        order: orders,
        customer: customers,
        organization: organizations
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(organizations, eq(orders.orgId, organizations.id))
      .where(eq(orders.id, id))
      .limit(1);

    if (result.length === 0) {
      return HttpErrors.notFound(res, 'Order not found');
    }

    // Get order items
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id));

    const mappedOrder = {
      ...orderDbRowToDto(result[0].order),
      customer: result[0].customer ? { id: result[0].customer.id, name: result[0].customer.name } : null,
      organization: result[0].organization ? { id: result[0].organization.id, name: result[0].organization.name } : null,
      items: items.map(orderItemDbRowToDto)
    };

    sendOk(res, mappedOrder);
  } catch (error) {
    handleDatabaseError(res, error, 'fetch order');
  }
}));

// Create order (with idempotency support)
router.post('/',
  idempotent(), // Add idempotency support
  validateRequest({ body: CreateOrderDTO }),
  asyncHandler(async (req: AuthedRequest, res) => {
    const validatedData = req.body;

    try {
      // Validate status code if provided
      if (validatedData.statusCode) {
        const isValid = await validateOrderStatusCode(validatedData.statusCode);
        if (!isValid) {
          return HttpErrors.validationError(res, `Invalid status code: ${validatedData.statusCode}. Use GET /api/orders/status-codes to see valid options.`);
        }
      }

      // Map DTO to DB
      const dbData = mapDtoToDb(validatedData, ORDER_DTO_TO_DB_MAPPING);
      
      // Set defaults
      if (!dbData.status_code) {
        dbData.status_code = 'draft';
      }
      if (!dbData.code) {
        // Generate order number: ORD-YYYYMMDD-XXXX
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        dbData.code = `ORD-${today}-${random}`;
      }

      // Insert order
      const insertedOrders = await db.insert(orders).values({
        ...dbData
      }).returning();

      if (insertedOrders.length === 0) {
        return HttpErrors.internalError(res, 'Failed to create order');
      }

      const newOrder = insertedOrders[0];
      const mappedOrder = orderDbRowToDto(newOrder);

      // Track business metrics for order creation
      trackBusinessEvent('order_created', req, { 
        status: newOrder.status_code || 'draft',
        order_id: newOrder.id,
        organization_id: newOrder.org_id 
      });

      logDatabaseOperation(req, 'ORDER_CREATED', 'orders', { orderId: newOrder.id });
      sendCreated(res, mappedOrder);
    } catch (error) {
      handleDatabaseError(res, error, 'create order');
    }
  })
);

// PATCH /:id/status - Update order status
router.patch('/:id/status', asyncHandler(async (req: AuthedRequest, res) => {
  const { id } = req.params;
  const { statusCode } = req.body;

  if (!statusCode) {
    return HttpErrors.validationError(res, 'statusCode is required');
  }

  try {
    // Validate status code
    const isValid = await validateOrderStatusCode(statusCode);
    if (!isValid) {
      return HttpErrors.validationError(res, `Invalid status code: ${statusCode}. Use GET /api/orders/status-codes to see valid options.`);
    }

    // Check if order exists
    const existingOrder = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (existingOrder.length === 0) {
      return HttpErrors.notFound(res, 'Order not found');
    }

    // Update status
    const updatedOrders = await db
      .update(orders)
      .set({ 
        statusCode,
        updatedAt: new Date().toISOString()
      })
      .where(eq(orders.id, id))
      .returning();

    if (updatedOrders.length === 0) {
      return HttpErrors.internalError(res, 'Failed to update order status');
    }

    const mappedOrder = orderDbRowToDto(updatedOrders[0]);
    logDatabaseOperation(req, 'ORDER_STATUS_UPDATED', 'orders', { orderId: id, statusCode });
    sendOk(res, mappedOrder);
  } catch (error) {
    handleDatabaseError(res, error, 'update order status');
  }
}));

// Update order
router.patch('/:id',
  validateRequest({ body: UpdateOrderDTO }),
  asyncHandler(async (req: AuthedRequest, res) => {
    const { id } = req.params;
    const validatedData = req.body;

    try {
      // Validate status code if provided
      if (validatedData.statusCode) {
        const isValid = await validateOrderStatusCode(validatedData.statusCode);
        if (!isValid) {
          return HttpErrors.validationError(res, `Invalid status code: ${validatedData.statusCode}. Use GET /api/orders/status-codes to see valid options.`);
        }
      }

      // Check if order exists
      const existingOrder = await db
        .select()
        .from(orders)
        .where(eq(orders.id, id))
        .limit(1);

      if (existingOrder.length === 0) {
        return HttpErrors.notFound(res, 'Order not found');
      }

      // Map DTO to DB
      const dbData = mapDtoToDb(validatedData, ORDER_DTO_TO_DB_MAPPING);

      // Update order
      const updatedOrders = await db
        .update(orders)
        .set({
          ...dbData,
          updatedAt: new Date().toISOString()
        })
        .where(eq(orders.id, id))
        .returning();

      if (updatedOrders.length === 0) {
        return HttpErrors.internalError(res, 'Failed to update order');
      }

      const updatedOrder = updatedOrders[0];
      const mappedOrder = orderDbRowToDto(updatedOrder);
      logDatabaseOperation(req, 'ORDER_UPDATED', 'orders', { orderId: id });
      sendOk(res, mappedOrder);
    } catch (error) {
      handleDatabaseError(res, error, 'update order');
    }
  })
);

// Delete order
router.delete('/:id', asyncHandler(async (req: AuthedRequest, res) => {
  const { id } = req.params;

  try {
    // Check if order exists
    const existingOrder = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (existingOrder.length === 0) {
      return HttpErrors.notFound(res, 'Order not found');
    }

    // Delete order (items will cascade)
    await db.delete(orders).where(eq(orders.id, id));

    logDatabaseOperation(req, 'ORDER_DELETED', 'orders', { orderId: id });
    sendNoContent(res);
  } catch (error) {
    handleDatabaseError(res, error, 'delete order');
  }
}));

// Analytics endpoint - orders by status
router.get('/analytics/summary', asyncHandler(async (req: AuthedRequest, res) => {
  const { orgId } = req.query;

  try {
    const conditions = orgId ? [eq(orders.orgId, orgId as string)] : [];
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get order counts by status
    const statusCounts = await db
      .select({
        statusCode: orders.statusCode,
        count: sql`count(*)::int`
      })
      .from(orders)
      .where(whereClause)
      .groupBy(orders.statusCode);

    // Get total revenue estimate
    const revenueResult = await db
      .select({
        total: sql`COALESCE(SUM(${orders.revenueEstimate}), 0)::float`
      })
      .from(orders)
      .where(whereClause);

    // Get recent orders
    const recentOrders = await db
      .select()
      .from(orders)
      .where(whereClause)
      .orderBy(desc(orders.createdAt))
      .limit(5);

    sendOk(res, {
      statusCounts,
      totalRevenue: revenueResult[0]?.total || 0,
      recentOrders: recentOrders.map(orderDbRowToDto)
    });
  } catch (error) {
    handleDatabaseError(res, error, 'fetch order analytics');
  }
}));

export default router;