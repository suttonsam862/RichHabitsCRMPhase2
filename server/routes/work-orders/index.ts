/**
 * Work Orders API Routes
 * Comprehensive manufacturing workflow management endpoints
 * SECURITY: Uses authenticated Supabase clients to enforce RLS, follows existing patterns
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import type { AuthedRequest } from '../../middleware/auth';
import { requireOrgMember, requireOrgAdmin } from '../../middleware/orgSecurity';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/asyncHandler';
import { sendOk, sendCreated, sendNoContent, HttpErrors, handleDatabaseError } from '../../lib/http';
import { logDatabaseOperation } from '../../lib/log';
import { trackBusinessEvent } from '../../middleware/metrics';
import { WorkOrderService } from '../../services/workOrderService';
import { supabaseForUser, extractAccessToken } from '../../lib/supabase';
import { parsePaginationParams, sendPaginatedResponse } from '../../lib/pagination';
import {
  CreateWorkOrderDTO,
  UpdateWorkOrderDTO,
  UpdateWorkOrderStatusDTO,
  BulkGenerateWorkOrdersDTO,
  BulkAssignWorkOrdersDTO,
  AssignManufacturerDTO,
  SmartAssignManufacturerDTO,
  WorkOrderFiltersDTO,
  CreateMilestoneDTO,
  UpdateMilestoneDTO,
  CreateProductionEventDTO,
  ProductionDelayDTO,
  CreateQualityCheckDTO,
} from '../../../shared/dtos';

const router = Router();

// All work order routes require authentication
router.use(requireAuth as any);

// Helper to get authenticated database client
function getAuthenticatedClient(req: AuthedRequest) {
  const token = extractAccessToken(req.headers.authorization);
  if (!token) {
    throw new Error('Missing authentication token');
  }
  return supabaseForUser(token);
}

// Helper to verify work order access and get work order info
async function verifyWorkOrderAccess(workOrderId: string, req: AuthedRequest, sb: any): Promise<any> {
  const { data: workOrder, error } = await sb
    .from('manufacturing_work_orders')
    .select('id, org_id, status_code, order_item_id')
    .eq('id', workOrderId)
    .single();
    
  if (error || !workOrder) {
    throw new Error('Work order not found');
  }
  
  return workOrder;
}

// Helper to validate work order status codes
async function validateWorkOrderStatusCode(statusCode: string, sb: any): Promise<boolean> {
  try {
    const { data, error } = await sb
      .from('status_work_orders')
      .select('code')
      .eq('code', statusCode)
      .single();
    return !error && !!data;
  } catch {
    return false;
  }
}

/**
 * GET /api/work-orders
 * List work orders with filtering and pagination
 */
router.get('/', requireOrgMember as any, asyncHandler(async (req: Request, res: Response) => {
  const sb = getAuthenticatedClient(req as AuthedRequest);
  const { limit, offset } = parsePaginationParams(req);
  const orgId = req.query.orgId as string;

  if (!orgId) {
    return HttpErrors.badRequest(res, 'Organization ID is required');
  }

  try {
    // Parse filters
    const filters = WorkOrderFiltersDTO.parse({
      orgId,
      statusCode: req.query.statusCode,
      manufacturerId: req.query.manufacturerId,
      orderItemId: req.query.orderItemId,
      orderId: req.query.orderId,
      priority: req.query.priority ? parseInt(req.query.priority as string) : undefined,
      createdAfter: req.query.createdAfter,
      createdBefore: req.query.createdBefore,
      dueBefore: req.query.dueBefore,
      dueAfter: req.query.dueAfter,
      search: req.query.search,
      limit,
      offset,
    });

    // Build query with count: 'exact' for proper pagination
    let query = sb
      .from('manufacturing_work_orders')
      .select(`
        *,
        order_items:order_item_id(id, name_snapshot, quantity, status_code, orders(id, code, customer_contact_name, due_date)),
        manufacturers:manufacturer_id(id, name, contact_email, lead_time_days)
      `, { count: 'exact' })
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.statusCode) {
      query = query.eq('status_code', filters.statusCode);
    }
    if (filters.manufacturerId) {
      query = query.eq('manufacturer_id', filters.manufacturerId);
    }
    if (filters.orderItemId) {
      query = query.eq('order_item_id', filters.orderItemId);
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
    if (filters.dueBefore) {
      query = query.lte('planned_due_date', filters.dueBefore);
    }
    if (filters.dueAfter) {
      query = query.gte('planned_due_date', filters.dueAfter);
    }

    // Apply search
    if (filters.search) {
      query = query.or(`
        instructions.ilike.%${filters.search}%,
        order_items.name_snapshot.ilike.%${filters.search}%,
        manufacturers.name.ilike.%${filters.search}%
      `);
    }

    // Execute query with pagination - CRITICAL: Use count: 'exact' for proper pagination
    const { data: workOrders, error, count } = await query
      .range(filters.offset, filters.offset + filters.limit - 1);

    if (error) {
      throw error;
    }

    await logDatabaseOperation(req as AuthedRequest, 'work_orders_list', 'manufacturing_work_orders');
    await trackBusinessEvent('work_orders_accessed', req as AuthedRequest, { org_id: orgId, count: (workOrders?.length || 0).toString() });

    return sendPaginatedResponse(res, workOrders || [], count || 0, { page: Math.floor(filters.offset / filters.limit) + 1, limit: filters.limit, offset: filters.offset });
  } catch (error) {
    console.error('Error listing work orders:', error);
    return handleDatabaseError(res, error, 'list work orders');
  }
}));

/**
 * GET /api/work-orders/:workOrderId
 * Get work order details with production progress
 */
router.get('/:workOrderId', requireOrgMember as any, asyncHandler(async (req: Request, res: Response) => {
  const { workOrderId } = req.params;
  const orgId = req.query.orgId as string;
  
  if (!orgId) {
    return HttpErrors.badRequest(res, 'Organization ID is required');
  }

  try {
    const sb = getAuthenticatedClient(req as AuthedRequest);
    const workOrderDetails = await WorkOrderService.getWorkOrderWithDetails(sb, workOrderId, orgId);
    
    if (!workOrderDetails) {
      return HttpErrors.notFound(res, 'Work order not found');
    }

    await logDatabaseOperation(req as AuthedRequest, 'work_order_view', 'manufacturing_work_orders', { workOrderId });
    await trackBusinessEvent('work_order_viewed', req as AuthedRequest, { work_order_id: workOrderId, org_id: orgId });

    return sendOk(res, workOrderDetails);
  } catch (error) {
    console.error('Error fetching work order details:', error);
    if (error instanceof Error && error.message === 'Work order not found') {
      return HttpErrors.notFound(res, 'Work order not found');
    }
    return handleDatabaseError(res, error, 'fetch work order details');
  }
}));

/**
 * POST /api/work-orders
 * Create work order for order items (manual creation)
 */
router.post('/', requireOrgMember as any, validateRequest({ body: CreateWorkOrderDTO }), asyncHandler(async (req: Request, res: Response) => {
  const workOrderData = req.body;
  const sb = getAuthenticatedClient(req as AuthedRequest);

  try {
    const workOrder = await WorkOrderService.createWorkOrder(sb, workOrderData, (req as AuthedRequest).user?.id);

    await logDatabaseOperation(req as AuthedRequest, 'work_order_create', 'manufacturing_work_orders', { 
      workOrderId: workOrder.id,
      orderItemId: workOrderData.orderItemId,
    });
    await trackBusinessEvent('work_order_created', req as AuthedRequest, { 
      work_order_id: workOrder.id,
      org_id: workOrderData.orgId,
      quantity: workOrderData.quantity,
      priority: workOrderData.priority,
    });

    return sendCreated(res, workOrder);
  } catch (error) {
    console.error('Error creating work order:', error);
    if (error instanceof Error) {
      const message = error.message;
      if (message.includes('Order item not found')) {
        return HttpErrors.badRequest(res, 'Order item not found');
      }
      if (message.includes('Work order already exists')) {
        return HttpErrors.conflict(res, 'Work order already exists for this order item');
      }
      if (message.includes('Organization access')) {
        return HttpErrors.forbidden(res, 'Invalid organization access');
      }
      if (message.includes('Manufacturer not found')) {
        return HttpErrors.badRequest(res, 'Invalid manufacturer');
      }
    }
    return handleDatabaseError(res, error, 'create work order');
  }
}));

/**
 * PUT /api/work-orders/:workOrderId/status
 * Update manufacturing status
 */
router.put('/:workOrderId/status', requireOrgMember as any, validateRequest({ body: UpdateWorkOrderStatusDTO }), asyncHandler(async (req: Request, res: Response) => {
  const { workOrderId } = req.params;
  const { statusCode, notes, qualityNotes, delayReason, actualDate } = req.body;
  const orgId = req.query.orgId as string;

  if (!orgId) {
    return HttpErrors.badRequest(res, 'Organization ID is required');
  }

  try {
    const sb = getAuthenticatedClient(req as AuthedRequest);
    
    // Validate status code exists
    const isValidStatus = await validateWorkOrderStatusCode(statusCode, sb);
    if (!isValidStatus) {
      return HttpErrors.badRequest(res, `Invalid status code: ${statusCode}`);
    }

    const additionalData = {
      qualityNotes,
      delayReason,
      actualDate,
    };

    const updatedWorkOrder = await WorkOrderService.updateWorkOrderStatus(
      sb,
      workOrderId,
      statusCode,
      orgId,
      (req as AuthedRequest).user?.id,
      notes,
      additionalData
    );

    await logDatabaseOperation(req as AuthedRequest, 'work_order_status_update', 'manufacturing_work_orders', { 
      workOrderId,
      newStatus: statusCode,
    });
    await trackBusinessEvent('work_order_status_updated', req as AuthedRequest, { 
      work_order_id: workOrderId,
      new_status: statusCode,
      org_id: orgId,
    });

    return sendOk(res, updatedWorkOrder);
  } catch (error) {
    console.error('Error updating work order status:', error);
    if (error instanceof Error) {
      const message = error.message;
      if (message.includes('Work order not found')) {
        return HttpErrors.notFound(res, 'Work order not found');
      }
      if (message.includes('Invalid status transition')) {
        return HttpErrors.badRequest(res, message);
      }
    }
    return handleDatabaseError(res, error, 'update work order status');
  }
}));

/**
 * POST /api/work-orders/bulk-generate
 * Generate work orders from approved design jobs
 */
router.post('/bulk-generate', requireOrgMember as any, validateRequest({ body: BulkGenerateWorkOrdersDTO }), asyncHandler(async (req: Request, res: Response) => {
  const { designJobIds, manufacturerId, priority, plannedStartDate, plannedDueDate, instructions } = req.body;
  const sb = getAuthenticatedClient(req as AuthedRequest);

  try {
    const options = {
      manufacturerId,
      priority,
      plannedStartDate,
      plannedDueDate,
      instructions,
    };

    const workOrders = await WorkOrderService.bulkGenerateWorkOrders(sb, designJobIds, (req as AuthedRequest).user?.id, options);

    await logDatabaseOperation(req as AuthedRequest, 'work_orders_bulk_generate', 'manufacturing_work_orders', { 
      designJobIds,
      generatedCount: workOrders.length,
    });
    await trackBusinessEvent('work_orders_bulk_generated', req as AuthedRequest, { 
      design_job_count: designJobIds.length.toString(),
      work_order_count: workOrders.length.toString(),
      manufacturer_id: manufacturerId || '',
    });

    return sendCreated(res, {
      workOrders,
      summary: {
        generated: workOrders.length,
        designJobs: designJobIds.length,
      },
    });
  } catch (error) {
    console.error('Error bulk generating work orders:', error);
    if (error instanceof Error) {
      const message = error.message;
      if (message.includes('No approved design jobs found')) {
        return HttpErrors.badRequest(res, 'No approved design jobs found');
      }
      if (message.includes('Work orders already exist')) {
        return HttpErrors.conflict(res, message);
      }
      if (message.includes('same organization')) {
        return HttpErrors.badRequest(res, 'All design jobs must belong to the same organization');
      }
    }
    return handleDatabaseError(res, error, 'bulk generate work orders');
  }
}));

/**
 * PUT /api/work-orders/:workOrderId/assign
 * Assign to manufacturer
 */
router.put('/:workOrderId/assign', requireOrgMember as any, validateRequest({ body: AssignManufacturerDTO }), asyncHandler(async (req: Request, res: Response) => {
  const { workOrderId } = req.params;
  const { manufacturerId, notes, skipCapacityCheck, skipSpecialtyCheck, plannedStartDate, plannedDueDate } = req.body;
  const orgId = req.query.orgId as string;

  if (!orgId) {
    return HttpErrors.badRequest(res, 'Organization ID is required');
  }

  try {
    const sb = getAuthenticatedClient(req as AuthedRequest);

    const options = {
      skipCapacityCheck,
      skipSpecialtyCheck,
      plannedStartDate,
      plannedDueDate,
      notes,
    };

    const updatedWorkOrder = await WorkOrderService.assignManufacturer(
      sb,
      workOrderId,
      manufacturerId,
      orgId,
      (req as AuthedRequest).user?.id,
      options
    );

    await logDatabaseOperation(req as AuthedRequest, 'work_order_assign', 'manufacturing_work_orders', { 
      workOrderId,
      manufacturerId,
    });
    await trackBusinessEvent('work_order_assigned', req as AuthedRequest, { 
      work_order_id: workOrderId,
      manufacturer_id: manufacturerId,
      org_id: orgId,
    });

    return sendOk(res, updatedWorkOrder);
  } catch (error) {
    console.error('Error assigning manufacturer:', error);
    if (error instanceof Error) {
      const message = error.message;
      if (message.includes('Work order not found')) {
        return HttpErrors.notFound(res, 'Work order not found');
      }
      if (message.includes('Manufacturer not found')) {
        return HttpErrors.badRequest(res, 'Manufacturer not found');
      }
      if (message.includes('not active')) {
        return HttpErrors.badRequest(res, message);
      }
      if (message.includes('minimum')) {
        return HttpErrors.badRequest(res, message);
      }
      if (message.includes('capacity')) {
        return HttpErrors.badRequest(res, message);
      }
    }
    return handleDatabaseError(res, error, 'assign manufacturer');
  }
}));

/**
 * GET /api/work-orders/:workOrderId/milestones
 * Get production milestones for work order
 */
router.get('/:workOrderId/milestones', requireOrgMember as any, asyncHandler(async (req: Request, res: Response) => {
  const { workOrderId } = req.params;
  const orgId = req.query.orgId as string;

  if (!orgId) {
    return HttpErrors.badRequest(res, 'Organization ID is required');
  }

  try {
    const sb = getAuthenticatedClient(req as AuthedRequest);
    
    // Verify work order access
    await verifyWorkOrderAccess(workOrderId, req as AuthedRequest, sb);

    const { data: milestones, error } = await sb
      .from('production_milestones')
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    await logDatabaseOperation(req as AuthedRequest, 'work_order_milestones_view', 'production_milestones', { workOrderId });

    return sendOk(res, milestones || []);
  } catch (error) {
    console.error('Error fetching work order milestones:', error);
    if (error instanceof Error && error.message === 'Work order not found') {
      return HttpErrors.notFound(res, 'Work order not found');
    }
    return handleDatabaseError(res, error, 'fetch work order milestones');
  }
}));

/**
 * POST /api/work-orders/:workOrderId/milestones
 * Create production milestone
 */
router.post('/:workOrderId/milestones', requireOrgMember as any, validateRequest({ body: CreateMilestoneDTO }), asyncHandler(async (req: Request, res: Response) => {
  const { workOrderId } = req.params;
  const milestoneData = { ...req.body, workOrderId };
  const orgId = req.query.orgId as string;

  if (!orgId) {
    return HttpErrors.badRequest(res, 'Organization ID is required');
  }

  try {
    const sb = getAuthenticatedClient(req as AuthedRequest);
    
    // CRITICAL: Get org_id from work order for RLS compliance
    const workOrder = await verifyWorkOrderAccess(workOrderId, req as AuthedRequest, sb);

    const { data: milestone, error } = await sb
      .from('production_milestones')
      .insert({
        org_id: workOrder.org_id, // CRITICAL: Add org_id for RLS and tenancy
        work_order_id: milestoneData.workOrderId,
        milestone_code: milestoneData.milestoneCode,
        milestone_name: milestoneData.milestoneName,
        target_date: milestoneData.targetDate || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    await logDatabaseOperation(req as AuthedRequest, 'milestone_create', 'production_milestones', { 
      workOrderId,
      milestoneId: milestone.id,
    });
    await trackBusinessEvent('milestone_created', req as AuthedRequest, { 
      work_order_id: workOrderId,
      milestone_id: milestone.id,
      org_id: orgId,
    });

    return sendCreated(res, milestone);
  } catch (error) {
    console.error('Error creating milestone:', error);
    if (error instanceof Error && error.message === 'Work order not found') {
      return HttpErrors.notFound(res, 'Work order not found');
    }
    return handleDatabaseError(res, error, 'create milestone');
  }
}));

/**
 * PUT /api/work-orders/:workOrderId/milestones/:milestoneId
 * Update production milestone
 */
router.put('/:workOrderId/milestones/:milestoneId', requireOrgMember as any, validateRequest({ body: UpdateMilestoneDTO }), asyncHandler(async (req: Request, res: Response) => {
  const { workOrderId, milestoneId } = req.params;
  const updateData = req.body;
  const orgId = req.query.orgId as string;

  if (!orgId) {
    return HttpErrors.badRequest(res, 'Organization ID is required');
  }

  try {
    const sb = getAuthenticatedClient(req as AuthedRequest);
    
    // Verify work order access
    await verifyWorkOrderAccess(workOrderId, req as AuthedRequest, sb);

    const updatedMilestone = await WorkOrderService.updateMilestone(sb, milestoneId, updateData, (req as AuthedRequest).user?.id);

    await logDatabaseOperation(req as AuthedRequest, 'milestone_update', 'production_milestones', { 
      workOrderId,
      milestoneId,
      newStatus: updateData.status,
    });
    await trackBusinessEvent('milestone_updated', req as AuthedRequest, { 
      work_order_id: workOrderId,
      milestone_id: milestoneId,
      status: updateData.status,
      org_id: orgId,
    });

    return sendOk(res, updatedMilestone);
  } catch (error) {
    console.error('Error updating milestone:', error);
    if (error instanceof Error && error.message === 'Work order not found') {
      return HttpErrors.notFound(res, 'Work order not found');
    }
    return handleDatabaseError(res, error, 'update milestone');
  }
}));

/**
 * POST /api/work-orders/:workOrderId/events
 * Create production event for audit trail
 */
router.post('/:workOrderId/events', requireOrgMember as any, validateRequest({ body: CreateProductionEventDTO }), asyncHandler(async (req: Request, res: Response) => {
  const { workOrderId } = req.params;
  const eventData = { ...req.body, workOrderId };
  const orgId = req.query.orgId as string;

  if (!orgId) {
    return HttpErrors.badRequest(res, 'Organization ID is required');
  }

  try {
    const sb = getAuthenticatedClient(req as AuthedRequest);
    
    // Verify work order access
    await verifyWorkOrderAccess(workOrderId, req as AuthedRequest, sb);

    const event = await WorkOrderService.createProductionEvent(sb, {
      ...eventData,
      actorUserId: (req as AuthedRequest).user?.id,
    });

    await logDatabaseOperation(req as AuthedRequest, 'production_event_create', 'production_events', { 
      workOrderId,
      eventCode: eventData.eventCode,
    });

    return sendCreated(res, event);
  } catch (error) {
    console.error('Error creating production event:', error);
    if (error instanceof Error && error.message === 'Work order not found') {
      return HttpErrors.notFound(res, 'Work order not found');
    }
    return handleDatabaseError(res, error, 'create production event');
  }
}));

/**
 * POST /api/work-orders/:workOrderId/delay
 * Report production delay
 */
router.post('/:workOrderId/delay', requireOrgMember as any, validateRequest({ body: ProductionDelayDTO }), asyncHandler(async (req: Request, res: Response) => {
  const { workOrderId } = req.params;
  const { delayReason, estimatedDelay, newEstimatedCompletion } = req.body;
  const orgId = req.query.orgId as string;

  if (!orgId) {
    return HttpErrors.badRequest(res, 'Organization ID is required');
  }

  try {
    const sb = getAuthenticatedClient(req as AuthedRequest);

    const updatedWorkOrder = await WorkOrderService.reportDelay(
      sb,
      workOrderId,
      delayReason,
      estimatedDelay,
      orgId,
      (req as AuthedRequest).user?.id
    );

    await logDatabaseOperation(req as AuthedRequest, 'work_order_delay_report', 'manufacturing_work_orders', { 
      workOrderId,
      delayReason,
      estimatedDelay,
    });
    await trackBusinessEvent('work_order_delayed', req as AuthedRequest, { 
      work_order_id: workOrderId,
      delay_days: estimatedDelay,
      org_id: orgId,
    });

    return sendOk(res, updatedWorkOrder);
  } catch (error) {
    console.error('Error reporting work order delay:', error);
    if (error instanceof Error && error.message === 'Work order not found') {
      return HttpErrors.notFound(res, 'Work order not found');
    }
    return handleDatabaseError(res, error, 'report work order delay');
  }
}));

/**
 * GET /api/work-orders/manufacturer/:manufacturerId/capacity
 * Get manufacturer capacity and workload
 */
router.get('/manufacturer/:manufacturerId/capacity', requireOrgMember as any, asyncHandler(async (req: Request, res: Response) => {
  const { manufacturerId } = req.params;

  try {
    const sb = getAuthenticatedClient(req as AuthedRequest);
    
    const capacity = await WorkOrderService.getManufacturerCapacity(sb, manufacturerId);

    await logDatabaseOperation(req as AuthedRequest, 'manufacturer_capacity_view', 'manufacturers', { manufacturerId });

    return sendOk(res, capacity);
  } catch (error) {
    console.error('Error fetching manufacturer capacity:', error);
    if (error instanceof Error && error.message === 'Manufacturer not found') {
      return HttpErrors.notFound(res, 'Manufacturer not found');
    }
    return handleDatabaseError(res, error, 'fetch manufacturer capacity');
  }
}));

/**
 * DELETE /api/work-orders/:workOrderId
 * Cancel/delete work order (admin only)
 */
router.delete('/:workOrderId', requireOrgAdmin as any, asyncHandler(async (req: Request, res: Response) => {
  const { workOrderId } = req.params;
  const orgId = req.query.orgId as string;

  if (!orgId) {
    return HttpErrors.badRequest(res, 'Organization ID is required');
  }

  try {
    const sb = getAuthenticatedClient(req as AuthedRequest);
    
    // Verify work order exists and get status
    const workOrder = await verifyWorkOrderAccess(workOrderId, req as AuthedRequest, sb);

    // Check if work order can be cancelled
    if (['completed', 'shipped', 'cancelled'].includes(workOrder.status_code)) {
      return HttpErrors.badRequest(res, `Cannot cancel work order in '${workOrder.status_code}' status`);
    }

    // Update status to cancelled instead of deleting
    const updatedWorkOrder = await WorkOrderService.updateWorkOrderStatus(
      sb,
      workOrderId,
      'cancelled',
      orgId,
      (req as AuthedRequest).user?.id,
      'Work order cancelled by admin'
    );

    await logDatabaseOperation(req as AuthedRequest, 'work_order_cancel', 'manufacturing_work_orders', { workOrderId });
    await trackBusinessEvent('work_order_cancelled', req as AuthedRequest, { 
      work_order_id: workOrderId,
      org_id: orgId,
    });

    return sendOk(res, updatedWorkOrder);
  } catch (error) {
    console.error('Error cancelling work order:', error);
    if (error instanceof Error && error.message === 'Work order not found') {
      return HttpErrors.notFound(res, 'Work order not found');
    }
    return handleDatabaseError(res, error, 'cancel work order');
  }
}));

export default router;