import express from 'express';
import { z } from 'zod';
import { CreateOrderDTO, UpdateOrderDTO, OrderDTO } from '@shared/dtos';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/asyncHandler';
import { db } from '../../db';
import { orders, orderItems, statusOrders, statusOrderItems, customers, organizations } from '@shared/schema';
import { sql, eq, and, ilike, desc, inArray } from 'drizzle-orm';
import { sendSuccess, sendOk, sendErr, HttpErrors, handleDatabaseError, mapDtoToDb, mapDbToDto } from '../../lib/http';

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

// Get available order status codes
router.get('/status-codes', asyncHandler(async (req, res) => {
  try {
    const result = await db
      .select({
        code: statusOrders.code,
        sortOrder: statusOrders.sortOrder,
        isTerminal: statusOrders.isTerminal
      })
      .from(statusOrders)
      .orderBy(statusOrders.sortOrder);

    sendSuccess(res, result);
  } catch (error) {
    handleDatabaseError(res, error, 'fetch order status codes');
  }
}));

// Get available order item status codes
router.get('/item-status-codes', asyncHandler(async (req, res) => {
  try {
    const result = await db
      .select({
        code: statusOrderItems.code,
        sortOrder: statusOrderItems.sortOrder,
        isTerminal: statusOrderItems.isTerminal
      })
      .from(statusOrderItems)
      .orderBy(statusOrderItems.sortOrder);

    sendSuccess(res, result);
  } catch (error) {
    handleDatabaseError(res, error, 'fetch order item status codes');
  }
}));

// List all orders with filtering, sorting, and pagination
router.get('/', asyncHandler(async (req, res) => {
  const {
    q = '',
    orgId,
    statusCode,
    customerId,
    page = '1',
    pageSize = '20'
  } = req.query;

  const pageNum = parseInt(page as string) || 1;
  const pageSizeNum = parseInt(pageSize as string) || 20;
  const offset = (pageNum - 1) * pageSizeNum;

  try {
    // Build where conditions
    const conditions = [];

    // Search query by code or customer contact name
    if (q && typeof q === 'string' && q.trim()) {
      const searchTerm = `%${q.trim()}%`;
      conditions.push(sql`(${orders.code} ILIKE ${searchTerm} OR ${orders.customerContactName} ILIKE ${searchTerm})`);
    }

    // Filter by organization
    if (orgId && typeof orgId === 'string') {
      conditions.push(eq(orders.orgId, orgId));
    }

    // Filter by status
    if (statusCode && typeof statusCode === 'string') {
      conditions.push(eq(orders.statusCode, statusCode));
    }

    // Filter by customer
    if (customerId && typeof customerId === 'string') {
      conditions.push(eq(orders.customerId, customerId));
    }

    // Get total count
    const countResult = await db
      .select({ count: sql`count(*)` })
      .from(orders)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = Number(countResult[0]?.count || 0);

    // Get paginated results
    const results = await db
      .select()
      .from(orders)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(orders.createdAt))
      .limit(pageSizeNum)
      .offset(offset);

    // Map database rows to DTOs
    const data = results.map(orderDbRowToDto);

    sendOk(res, data, total);
  } catch (error) {
    handleDatabaseError(res, error, 'list orders');
  }
}));

// Get order by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (result.length === 0) {
      return HttpErrors.notFound(res, 'Order not found');
    }

    const mappedOrder = orderDbRowToDto(result[0]);
    sendOk(res, mappedOrder);
  } catch (error) {
    handleDatabaseError(res, error, 'fetch order');
  }
}));

// Create new order
router.post('/',
  validateRequest({ body: CreateOrderDTO }),
  asyncHandler(async (req, res) => {
    const validatedData = req.body;

    try {
      // Validate statusCode if provided
      if (validatedData.statusCode) {
        const isValidStatus = await validateOrderStatusCode(validatedData.statusCode);
        if (!isValidStatus) {
          return HttpErrors.validationError(res, 'Invalid statusCode: must exist in status_orders table');
        }
      }

      // Map DTO fields to DB fields
      const mappedData = mapDtoToDb(validatedData, ORDER_DTO_TO_DB_MAPPING);
      
      // Generate order number if not provided
      const orderNumber = validatedData.orderNumber || `ORD-${Date.now()}`;
      
      // Prepare order data
      const now = new Date();
      const orderData = {
        code: orderNumber,
        notes: validatedData.notes || null,
        status_code: validatedData.statusCode || 'consultation',
        created_at: now,
        updated_at: now,
        ...mappedData
      };

      const result = await db
        .insert(orders)
        .values(orderData)
        .returning();

      const createdOrder = orderDbRowToDto(result[0]);
      sendOk(res, createdOrder, undefined, 201);
    } catch (error) {
      handleDatabaseError(res, error, 'create order');
    }
  })
);

// Update order status
router.patch('/:id/status',
  validateRequest({
    body: z.object({
      statusCode: z.string().min(1, 'statusCode is required')
    })
  }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { statusCode } = req.body;

    try {
      // Validate statusCode
      const isValidStatus = await validateOrderStatusCode(statusCode);
      if (!isValidStatus) {
        return HttpErrors.validationError(res, 'Invalid statusCode: must exist in status_orders table');
      }

      const result = await db
        .update(orders)
        .set({
          statusCode: statusCode,
          updatedAt: new Date().toISOString()
        })
        .where(eq(orders.id, id))
        .returning();

      if (result.length === 0) {
        return HttpErrors.notFound(res, 'Order not found');
      }

      const mappedResult = orderDbRowToDto(result[0]);
      sendOk(res, mappedResult);
    } catch (error) {
      handleDatabaseError(res, error, 'update order status');
    }
  })
);

// Update order
router.patch('/:id',
  validateRequest({ body: UpdateOrderDTO }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    try {
      // Validate statusCode if provided
      if (updateData.statusCode) {
        const isValidStatus = await validateOrderStatusCode(updateData.statusCode);
        if (!isValidStatus) {
          return HttpErrors.validationError(res, 'Invalid statusCode: must exist in status_orders table');
        }
      }

      // Map DTO fields to DB fields
      const mappedData = mapDtoToDb(updateData, ORDER_DTO_TO_DB_MAPPING);
      
      const result = await db
        .update(orders)
        .set({
          ...mappedData,
          updatedAt: new Date().toISOString()
        })
        .where(eq(orders.id, id))
        .returning();

      if (result.length === 0) {
        return HttpErrors.notFound(res, 'Order not found');
      }

      const mappedResult = orderDbRowToDto(result[0]);
      sendOk(res, mappedResult);
    } catch (error) {
      handleDatabaseError(res, error, 'update order');
    }
  })
);

// Delete order
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db
      .delete(orders)
      .where(eq(orders.id, id))
      .returning();

    if (result.length === 0) {
      return HttpErrors.notFound(res, 'Order not found');
    }

    res.status(204).send();
  } catch (error) {
    handleDatabaseError(res, error, 'delete order');
  }
}));

// Order analytics summary
router.get('/analytics/summary', asyncHandler(async (req, res) => {
  try {
    // Get total orders count
    const totalOrdersResult = await db
      .select({ count: sql`count(*)` })
      .from(orders);
    
    // Get total revenue estimate
    const totalValueResult = await db
      .select({ sum: sql`COALESCE(sum(revenue_estimate), 0)` })
      .from(orders);

    // Get orders by status
    const ordersByStatusResult = await db
      .select({
        statusCode: orders.statusCode,
        count: sql`count(*)`
      })
      .from(orders)
      .groupBy(orders.statusCode);

    // Get recent orders (last 10)
    const recentOrdersResult = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(10);

    const ordersByStatus = ordersByStatusResult.reduce((acc, row) => {
      acc[row.statusCode || 'unknown'] = Number(row.count);
      return acc;
    }, {} as Record<string, number>);

    const analyticsData = {
      totalOrders: Number(totalOrdersResult[0]?.count || 0),
      totalValue: Number(totalValueResult[0]?.sum || 0),
      ordersByStatus,
      recentOrders: recentOrdersResult.map(orderDbRowToDto)
    };

    sendSuccess(res, analyticsData);
  } catch (error) {
    handleDatabaseError(res, error, 'fetch order analytics');
  }
}));

export { router as ordersRouter };