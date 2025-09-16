import express from 'express';
import { z } from 'zod';
import { db } from '../../db';
import { statusOrders, statusOrderItems, statusDesignJobs, statusWorkOrders } from '../../../shared/schema';
import { eq, like, and, desc } from 'drizzle-orm';
import { requireAuth, AuthedRequest } from '../../middleware/auth';
import { sendSuccess, sendOk, sendCreated, sendNoContent, sendErr } from '../../lib/http';

const router = express.Router();

// Validation schemas
const updateOrderStatusSchema = z.object({
  sortOrder: z.number().int().min(0).optional(),
  isTerminal: z.boolean().optional()
});

// GET /api/v1/order-status/orders - List all order statuses
router.get('/orders', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const statuses = await db.select()
      .from(statusOrders)
      .orderBy(statusOrders.sortOrder);

    return sendOk(res, statuses);
  } catch (error) {
    console.error('Error listing order statuses:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to fetch order statuses', undefined, 500);
  }
});

// GET /api/v1/order-status/order-items - List all order item statuses
router.get('/order-items', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const statuses = await db.select()
      .from(statusOrderItems)
      .orderBy(statusOrderItems.sortOrder);

    return sendOk(res, statuses);
  } catch (error) {
    console.error('Error listing order item statuses:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to fetch order item statuses', undefined, 500);
  }
});

// GET /api/v1/order-status/design-jobs - List all design job statuses
router.get('/design-jobs', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const statuses = await db.select()
      .from(statusDesignJobs)
      .orderBy(statusDesignJobs.sortOrder);

    return sendOk(res, statuses);
  } catch (error) {
    console.error('Error listing design job statuses:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to fetch design job statuses', undefined, 500);
  }
});

// GET /api/v1/order-status/work-orders - List all work order statuses
router.get('/work-orders', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const statuses = await db.select()
      .from(statusWorkOrders)
      .orderBy(statusWorkOrders.sortOrder);

    return sendOk(res, statuses);
  } catch (error) {
    console.error('Error listing work order statuses:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to fetch work order statuses', undefined, 500);
  }
});

// PATCH /api/v1/order-status/orders/:code - Update order status
router.patch('/orders/:code', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { code } = req.params;
    const validation = updateOrderStatusSchema.safeParse(req.body);

    if (!validation.success) {
      return sendErr(res, 'VALIDATION_ERROR', 'Invalid status data', validation.error.errors, 400);
    }

    const updateData = validation.data;

    // Check if status exists
    const [existingStatus] = await db.select()
      .from(statusOrders)
      .where(eq(statusOrders.code, code))
      .limit(1);

    if (!existingStatus) {
      return sendErr(res, 'NOT_FOUND', 'Order status not found', undefined, 404);
    }

    const [updatedStatus] = await db.update(statusOrders)
      .set(updateData)
      .where(eq(statusOrders.code, code))
      .returning();

    return sendOk(res, updatedStatus);
  } catch (error) {
    console.error('Error updating order status:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to update order status', undefined, 500);
  }
});

// PATCH /api/v1/order-status/order-items/:code - Update order item status
router.patch('/order-items/:code', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { code } = req.params;
    const validation = updateOrderStatusSchema.safeParse(req.body);

    if (!validation.success) {
      return sendErr(res, 'VALIDATION_ERROR', 'Invalid status data', validation.error.errors, 400);
    }

    const updateData = validation.data;

    // Check if status exists
    const [existingStatus] = await db.select()
      .from(statusOrderItems)
      .where(eq(statusOrderItems.code, code))
      .limit(1);

    if (!existingStatus) {
      return sendErr(res, 'NOT_FOUND', 'Order item status not found', undefined, 404);
    }

    const [updatedStatus] = await db.update(statusOrderItems)
      .set(updateData)
      .where(eq(statusOrderItems.code, code))
      .returning();

    return sendOk(res, updatedStatus);
  } catch (error) {
    console.error('Error updating order item status:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to update order item status', undefined, 500);
  }
});

// PATCH /api/v1/order-status/design-jobs/:code - Update design job status
router.patch('/design-jobs/:code', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { code } = req.params;
    const validation = updateOrderStatusSchema.safeParse(req.body);

    if (!validation.success) {
      return sendErr(res, 'VALIDATION_ERROR', 'Invalid status data', validation.error.errors, 400);
    }

    const updateData = validation.data;

    // Check if status exists
    const [existingStatus] = await db.select()
      .from(statusDesignJobs)
      .where(eq(statusDesignJobs.code, code))
      .limit(1);

    if (!existingStatus) {
      return sendErr(res, 'NOT_FOUND', 'Design job status not found', undefined, 404);
    }

    const [updatedStatus] = await db.update(statusDesignJobs)
      .set(updateData)
      .where(eq(statusDesignJobs.code, code))
      .returning();

    return sendOk(res, updatedStatus);
  } catch (error) {
    console.error('Error updating design job status:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to update design job status', undefined, 500);
  }
});

// PATCH /api/v1/order-status/work-orders/:code - Update work order status
router.patch('/work-orders/:code', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { code } = req.params;
    const validation = updateOrderStatusSchema.safeParse(req.body);

    if (!validation.success) {
      return sendErr(res, 'VALIDATION_ERROR', 'Invalid status data', validation.error.errors, 400);
    }

    const updateData = validation.data;

    // Check if status exists
    const [existingStatus] = await db.select()
      .from(statusWorkOrders)
      .where(eq(statusWorkOrders.code, code))
      .limit(1);

    if (!existingStatus) {
      return sendErr(res, 'NOT_FOUND', 'Work order status not found', undefined, 404);
    }

    const [updatedStatus] = await db.update(statusWorkOrders)
      .set(updateData)
      .where(eq(statusWorkOrders.code, code))
      .returning();

    return sendOk(res, updatedStatus);
  } catch (error) {
    console.error('Error updating work order status:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to update work order status', undefined, 500);
  }
});

// POST /api/v1/order-status/orders/reorder - Reorder order statuses
router.post('/orders/reorder', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const reorderSchema = z.object({
      statusCodes: z.array(z.string())
    });

    const validation = reorderSchema.safeParse(req.body);

    if (!validation.success) {
      return sendErr(res, 'VALIDATION_ERROR', 'Invalid reorder data', validation.error.errors, 400);
    }

    const { statusCodes } = validation.data;

    // Use transaction to ensure atomicity
    const updatedStatuses = await db.transaction(async (tx) => {
      // Update sort order for each status
      const updates = statusCodes.map(async (statusCode, index) => {
        return tx.update(statusOrders)
          .set({ sortOrder: index })
          .where(eq(statusOrders.code, statusCode));
      });

      await Promise.all(updates);

      // Return updated statuses in new order
      return tx.select()
        .from(statusOrders)
        .orderBy(statusOrders.sortOrder);
    });

    return sendOk(res, updatedStatuses);
  } catch (error) {
    console.error('Error reordering order statuses:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to reorder order statuses', undefined, 500);
  }
});

// POST /api/v1/order-status/order-items/reorder - Reorder order item statuses
router.post('/order-items/reorder', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const reorderSchema = z.object({
      statusCodes: z.array(z.string())
    });

    const validation = reorderSchema.safeParse(req.body);

    if (!validation.success) {
      return sendErr(res, 'VALIDATION_ERROR', 'Invalid reorder data', validation.error.errors, 400);
    }

    const { statusCodes } = validation.data;

    // Use transaction to ensure atomicity
    const updatedStatuses = await db.transaction(async (tx) => {
      // Update sort order for each status
      const updates = statusCodes.map(async (statusCode, index) => {
        return tx.update(statusOrderItems)
          .set({ sortOrder: index })
          .where(eq(statusOrderItems.code, statusCode));
      });

      await Promise.all(updates);

      // Return updated statuses in new order
      return tx.select()
        .from(statusOrderItems)
        .orderBy(statusOrderItems.sortOrder);
    });

    return sendOk(res, updatedStatuses);
  } catch (error) {
    console.error('Error reordering order item statuses:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to reorder order item statuses', undefined, 500);
  }
});

// GET /api/v1/order-status/summary - Get status summary with counts
router.get('/summary', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const [orderStatuses, orderItemStatuses, designJobStatuses, workOrderStatuses] = await Promise.all([
      db.select().from(statusOrders).orderBy(statusOrders.sortOrder),
      db.select().from(statusOrderItems).orderBy(statusOrderItems.sortOrder),
      db.select().from(statusDesignJobs).orderBy(statusDesignJobs.sortOrder),
      db.select().from(statusWorkOrders).orderBy(statusWorkOrders.sortOrder)
    ]);

    return sendOk(res, {
      orders: orderStatuses,
      orderItems: orderItemStatuses,
      designJobs: designJobStatuses,
      workOrders: workOrderStatuses
    });
  } catch (error) {
    console.error('Error fetching status summary:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to fetch status summary', undefined, 500);
  }
});

export default router;