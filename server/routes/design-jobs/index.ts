/**
 * Design Jobs API Routes
 * Handles CRUD operations for design jobs and their workflow
 * SECURITY: Uses authenticated Supabase clients to enforce RLS
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import type { AuthedRequest } from '../../middleware/auth';
import { requireOrgMember } from '../../middleware/orgSecurity';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/asyncHandler';
import { sendOk, sendCreated, sendNoContent, HttpErrors, handleDatabaseError } from '../../lib/http';
import { logDatabaseOperation } from '../../lib/log';
import { trackBusinessEvent } from '../../middleware/metrics';
import { DesignJobService } from '../../services/designJobService';
import { supabaseForUser, extractAccessToken } from '../../lib/supabase';
import {
  CreateDesignJobDTO,
  UpdateDesignJobDTO,
  UpdateDesignJobStatusDTO,
  BulkCreateDesignJobsDTO,
  AssignDesignerDTO,
  DesignJobFiltersDTO,
  DesignJobWithDetailsDTO,
} from '../../../shared/dtos';

const router = Router();

// All design job routes require authentication
router.use(requireAuth as any);

// Helper to get authenticated database client
function getAuthenticatedClient(req: AuthedRequest) {
  const token = extractAccessToken(req.headers.authorization);
  if (!token) {
    throw new Error('Missing authentication token');
  }
  return supabaseForUser(token);
}

// Helper to verify design job access and get job info
async function verifyDesignJobAccess(jobId: string, req: AuthedRequest, sb: any): Promise<any> {
  const { data: job, error } = await sb
    .from('design_jobs')
    .select('id, org_id, status_code, order_item_id')
    .eq('id', jobId)
    .single();
    
  if (error || !job) {
    throw new Error('Design job not found');
  }
  
  return job;
}

// Helper to validate design job status codes
async function validateDesignJobStatusCode(statusCode: string, sb: any): Promise<boolean> {
  try {
    const { data, error } = await sb
      .from('status_design_jobs')
      .select('code')
      .eq('code', statusCode)
      .single();
    return !error && !!data;
  } catch {
    return false;
  }
}

// Validation schemas
const jobIdParamSchema = z.object({
  jobId: z.string().uuid(),
});

const orderItemParamsSchema = z.object({
  orderId: z.string(),
  itemId: z.string().uuid(),
});

// GET /api/design-jobs - List design jobs with filtering
router.get('/', 
  requireOrgMember() as any,
  validateRequest({ query: DesignJobFiltersDTO }) as any,
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const filters = req.query as any;
    
    try {
      const sb = getAuthenticatedClient(req);
      
      // Build query with explicit org scoping for RLS compliance
      let query = sb.from('design_jobs').select(`
        *,
        order_items:order_item_id(id, name_snapshot, quantity, status_code),
        designers:assignee_designer_id(id, users(full_name), specializations, hourly_rate)
      `, { count: 'exact' });

      // Apply filters with explicit organization scoping
      if (filters.orgId) {
        query = query.eq('org_id', filters.orgId);
      }

      if (filters.statusCode) {
        query = query.eq('status_code', filters.statusCode);
      }

      if (filters.assigneeDesignerId) {
        query = query.eq('assignee_designer_id', filters.assigneeDesignerId);
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

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,brief.ilike.%${filters.search}%`);
      }

      // Apply pagination and ordering
      const limit = Math.min(filters.limit || 50, 100); // Cap at 100
      const offset = Math.max(filters.offset || 0, 0);
      
      query = query
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      const { data: designJobs, error, count } = await query;

      if (error) {
        return handleDatabaseError(res, error, 'list design jobs');
      }

      // Set pagination headers
      if (count !== null) {
        res.set('X-Total-Count', count.toString());
      }

      // Format response
      const formattedResults = (designJobs || []).map(job => ({
        id: job.id,
        orgId: job.org_id,
        orderItemId: job.order_item_id,
        title: job.title,
        brief: job.brief,
        priority: job.priority,
        statusCode: job.status_code,
        assigneeDesignerId: job.assignee_designer_id,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        orderItem: job.order_items || undefined,
        assignedDesigner: job.designers || undefined,
      }));

      sendOk(res, formattedResults);
    } catch (error) {
      if (error instanceof Error && error.message === 'Missing authentication token') {
        return HttpErrors.unauthorized(res, 'Authentication required');
      }
      console.error('Error listing design jobs:', error);
      handleDatabaseError(res, error, 'list design jobs');
    }
  })
);

// GET /api/design-jobs/:jobId - Get design job details
router.get('/:jobId',
  requireOrgMember() as any,
  validateRequest({ params: jobIdParamSchema }) as any,
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const { jobId } = req.params;

    try {
      const sb = getAuthenticatedClient(req);
      
      // Verify design job access and get job with related data
      const { data: jobResult, error: jobError } = await sb
        .from('design_jobs')
        .select(`
          *,
          order_items:order_item_id(id, name_snapshot, quantity, status_code),
          designers:assignee_designer_id(id, users(full_name), specializations, hourly_rate)
        `)
        .eq('id', jobId)
        .single();

      if (jobError || !jobResult) {
        return HttpErrors.notFound(res, 'Design job not found');
      }

      // Get recent events
      const { data: events, error: eventsError } = await sb
        .from('design_job_events')
        .select('*')
        .eq('design_job_id', jobId)
        .order('occurred_at', { ascending: false })
        .limit(10);

      if (eventsError) {
        console.error('Error fetching design job events:', eventsError);
      }

      // Format response
      const response = {
        id: jobResult.id,
        orgId: jobResult.org_id,
        orderItemId: jobResult.order_item_id,
        title: jobResult.title,
        brief: jobResult.brief,
        priority: jobResult.priority,
        statusCode: jobResult.status_code,
        assigneeDesignerId: jobResult.assignee_designer_id,
        createdAt: jobResult.created_at,
        updatedAt: jobResult.updated_at,
        orderItem: jobResult.order_items || undefined,
        assignedDesigner: jobResult.designers || undefined,
        events: (events || []).map(event => ({
          id: event.id,
          designJobId: event.design_job_id,
          eventCode: event.event_code,
          actorUserId: event.actor_user_id,
          payload: event.payload,
          occurredAt: event.occurred_at,
        })),
      };

      sendOk(res, response);
    } catch (error) {
      if (error instanceof Error && error.message === 'Missing authentication token') {
        return HttpErrors.unauthorized(res, 'Authentication required');
      }
      console.error('Error fetching design job:', error);
      handleDatabaseError(res, error, 'fetch design job');
    }
  })
);

// Note: create-design-job endpoint moved to /api/orders/:orderId/items/:itemId/create-design-job
// for proper REST hierarchy and to be consistent with order item operations

// PUT /api/design-jobs/:jobId/status - Update design job status
router.put('/:jobId/status',
  requireOrgMember() as any,
  validateRequest({ 
    params: jobIdParamSchema,
    body: UpdateDesignJobStatusDTO
  }) as any,
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const { jobId } = req.params;
    const { statusCode, notes, assigneeDesignerId } = req.body;

    try {
      const sb = getAuthenticatedClient(req);
      
      // Verify design job access first and get org context
      const verifiedJob = await verifyDesignJobAccess(jobId, req, sb);
      
      // Validate status code
      const isValidStatus = await validateDesignJobStatusCode(statusCode, sb);
      if (!isValidStatus) {
        return HttpErrors.validationError(res, `Invalid status code: ${statusCode}. Use GET /api/design-jobs/status-codes to see valid options.`);
      }

      // If assigning designer, use assign method
      if (assigneeDesignerId && statusCode === 'assigned') {
        const designJob = await DesignJobService.assignDesigner(
          sb,
          jobId,
          assigneeDesignerId,
          req.user?.id,
          notes
        );
        
        trackBusinessEvent('design_job_assigned', req, {
          design_job_id: jobId,
          designer_id: assigneeDesignerId,
        });

        sendOk(res, designJob);
        return;
      }

      // Otherwise, update status with org validation (SECURITY FIX ORD-5)
      const designJob = await DesignJobService.updateDesignJobStatus(
        sb,
        jobId,
        statusCode,
        verifiedJob.org_id,
        req.user?.id,
        notes
      );

      trackBusinessEvent('design_job_status_updated', req, {
        design_job_id: jobId,
        new_status: statusCode,
      });

      logDatabaseOperation(req, 'DESIGN_JOB_STATUS_UPDATED', 'design_jobs', { designJobId: jobId });
      sendOk(res, designJob);
    } catch (error) {
      if (error instanceof Error && error.message === 'Missing authentication token') {
        return HttpErrors.unauthorized(res, 'Authentication required');
      }
      if (error instanceof Error && (error.message === 'Design job not found' || error.message.includes('not found'))) {
        return HttpErrors.notFound(res, error.message);
      }
      if (error instanceof Error && error.message.includes('Invalid status transition')) {
        return HttpErrors.validationError(res, error.message);
      }
      if (error instanceof Error && error.message.includes('Access denied')) {
        return HttpErrors.forbidden(res, error.message);
      }
      console.error('Error updating design job status:', error);
      handleDatabaseError(res, error, 'update design job status');
    }
  })
);

// PUT /api/design-jobs/:jobId/assign - Assign designer to design job
router.put('/:jobId/assign',
  requireOrgMember() as any,
  validateRequest({ 
    params: jobIdParamSchema,
    body: AssignDesignerDTO
  }) as any,
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const { jobId } = req.params;
    const { designerId, notes } = req.body;

    try {
      const sb = getAuthenticatedClient(req);
      
      // Verify design job access first
      await verifyDesignJobAccess(jobId, req, sb);
      
      // Verify designer exists and is active
      const { data: designer, error: designerError } = await sb
        .from('designers')
        .select('id, is_active')
        .eq('id', designerId)
        .single();

      if (designerError || !designer) {
        return HttpErrors.notFound(res, `Designer not found: ${designerId}`);
      }

      if (!designer.is_active) {
        return HttpErrors.validationError(res, `Designer is inactive: ${designerId}`);
      }

      const designJob = await DesignJobService.assignDesigner(
        sb,
        jobId,
        designerId,
        req.user?.id,
        notes
      );

      trackBusinessEvent('design_job_assigned', req, {
        design_job_id: jobId,
        designer_id: designerId,
      });

      logDatabaseOperation(req, 'DESIGN_JOB_ASSIGNED', 'design_jobs', { designJobId: jobId });
      sendOk(res, designJob);
    } catch (error) {
      if (error instanceof Error && error.message === 'Missing authentication token') {
        return HttpErrors.unauthorized(res, 'Authentication required');
      }
      if (error instanceof Error && (error.message === 'Design job not found' || error.message.includes('not found'))) {
        return HttpErrors.notFound(res, error.message);
      }
      if (error instanceof Error && error.message.includes('inactive')) {
        return HttpErrors.validationError(res, error.message);
      }
      console.error('Error assigning designer:', error);
      handleDatabaseError(res, error, 'assign designer');
    }
  })
);

// POST /api/design-jobs/bulk-create - Create multiple design jobs from order items
router.post('/bulk-create',
  requireOrgMember() as any,
  validateRequest({ body: BulkCreateDesignJobsDTO }) as any,
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const { orderItemIds, ...options } = req.body;

    try {
      const sb = getAuthenticatedClient(req);
      
      // Verify all order items exist and get org ID using authenticated client
      const { data: orderItems, error } = await sb
        .from('order_items')
        .select('id, org_id')
        .in('id', orderItemIds);

      if (error || !orderItems || orderItems.length === 0) {
        return HttpErrors.notFound(res, 'No valid order items found');
      }

      if (orderItems.length !== orderItemIds.length) {
        return HttpErrors.validationError(res, 'Some order items were not found');
      }

      // Verify all items belong to same organization
      const orgIds = [...new Set(orderItems.map(item => item.org_id))];
      if (orgIds.length > 1) {
        return HttpErrors.validationError(res, 'All order items must belong to the same organization');
      }

      const orgId = orgIds[0];

      // Create design jobs
      const designJobs = await DesignJobService.bulkCreateDesignJobs(
        sb,
        orderItemIds,
        orgId,
        req.user?.id,
        options
      );

      trackBusinessEvent('design_jobs_bulk_created', req, {
        organization_id: orgId,
        count: designJobs.length,
        order_item_ids: orderItemIds,
      });

      logDatabaseOperation(req, 'DESIGN_JOBS_BULK_CREATED', 'design_jobs', { 
        count: designJobs.length,
        orgId 
      });

      sendCreated(res, {
        created: designJobs,
        count: designJobs.length,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Missing authentication token') {
        return HttpErrors.unauthorized(res, 'Authentication required');
      }
      console.error('Error bulk creating design jobs:', error);
      handleDatabaseError(res, error, 'bulk create design jobs');
    }
  })
);

// GET /api/design-jobs/status-codes - Get available design job status codes
router.get('/status-codes', asyncHandler(async (req: AuthedRequest, res) => {
  try {
    const sb = getAuthenticatedClient(req);
    
    const { data: statuses, error } = await sb
      .from('status_design_jobs')
      .select('*')
      .order('sort_order');

    if (error) {
      return handleDatabaseError(res, error, 'fetch design job status codes');
    }

    sendOk(res, statuses || []);
  } catch (error) {
    if (error instanceof Error && error.message === 'Missing authentication token') {
      return HttpErrors.unauthorized(res, 'Authentication required');
    }
    console.error('Error fetching design job status codes:', error);
    handleDatabaseError(res, error, 'fetch design job status codes');
  }
}));

export default router;