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
import { requireOrgMember, requireOrgAdmin } from '../../middleware/orgSecurity';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/asyncHandler';
import { sendOk, sendCreated, sendNoContent, HttpErrors, handleDatabaseError } from '../../lib/http';
import { logDatabaseOperation } from '../../lib/log';
import { trackBusinessEvent } from '../../middleware/metrics';
import { DesignJobService } from '../../services/designJobService';
import { supabaseForUser, extractAccessToken } from '../../lib/supabase';
import { createAssetUploadUrl, getAssetDownloadUrl } from '../../lib/unified-storage';
import {
  CreateDesignJobDTO,
  UpdateDesignJobDTO,
  UpdateDesignJobStatusDTO,
  BulkCreateDesignJobsDTO,
  AssignDesignerDTO,
  DesignJobFiltersDTO,
  DesignJobWithDetailsDTO,
  SubmitDesignDTO,
  ReviewDesignDTO,
  CreateDesignJobCommentDTO,
  BulkAssignDesignJobsDTO,
  SmartAssignDesignerDTO,
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

// Asset upload validation schemas
const AssetUploadRequestSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  contentType: z.string().optional(),
  size: z.number().optional(),
  version: z.number().min(1).optional().default(1),
});

const CommentsPaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  eventTypes: z.array(z.string()).optional(),
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

      // Format response to match DesignJobWithDetailsDTO structure
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
        orderItem: job.order_items ? {
          id: job.order_items.id,
          nameSnapshot: job.order_items.name_snapshot,
          quantity: job.order_items.quantity,
          statusCode: job.order_items.status_code,
        } : undefined,
        assignedDesigner: job.designers ? {
          id: job.designers.id,
          name: job.designers.users?.full_name || job.designers.user_name || 'Unknown Designer',
          specializations: job.designers.specializations || [],
          hourlyRate: job.designers.hourly_rate,
        } : undefined,
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

      // Format response to match DesignJobWithDetailsDTO structure
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
        orderItem: jobResult.order_items ? {
          id: jobResult.order_items.id,
          nameSnapshot: jobResult.order_items.name_snapshot,
          quantity: jobResult.order_items.quantity,
          statusCode: jobResult.order_items.status_code,
        } : undefined,
        assignedDesigner: jobResult.designers ? {
          id: jobResult.designers.id,
          name: jobResult.designers.users?.full_name || 'Unknown Designer',
          specializations: jobResult.designers.specializations || [],
          hourlyRate: jobResult.designers.hourly_rate,
        } : undefined,
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

// POST /api/design-jobs/:jobId/submit - Designer submits design for review
router.post('/:jobId/submit',
  requireOrgMember() as any,
  validateRequest({ 
    params: jobIdParamSchema,
    body: SubmitDesignDTO
  }) as any,
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const { jobId } = req.params;
    const { assetIds, notes, submissionType } = req.body;

    try {
      const sb = getAuthenticatedClient(req);
      
      // Verify design job access and get current state
      const verifiedJob = await verifyDesignJobAccess(jobId, req, sb);
      
      // Validate that current user is the assigned designer or admin/owner
      if (verifiedJob.assignee_designer_id) {
        const { data: designer, error: designerError } = await sb
          .from('designers')
          .select('user_id')
          .eq('id', verifiedJob.assignee_designer_id)
          .single();
        
        if (designerError || !designer) {
          return HttpErrors.forbidden(res, 'Invalid designer assignment');
        }
        
        // Allow submission by assigned designer OR admin/owner
        const isAssignedDesigner = designer.user_id === req.user?.id;
        const isAdmin = req.user?.role && ['admin', 'owner'].includes(req.user.role);
        
        if (!isAssignedDesigner && !isAdmin) {
          return HttpErrors.forbidden(res, 'Only the assigned designer or organization admin can submit designs');
        }
      }
      
      // Submit design for review using service
      const updatedJob = await DesignJobService.submitDesignForReview(
        sb,
        jobId,
        verifiedJob.org_id,
        req.user?.id,
        {
          assetIds,
          notes,
          submissionType
        }
      );
      
      trackBusinessEvent('design_submitted', req, {
        design_job_id: jobId,
        submission_type: submissionType,
        asset_count: assetIds?.length || 0
      });

      sendOk(res, updatedJob);
    } catch (error) {
      if (error instanceof Error && error.message === 'Missing authentication token') {
        return HttpErrors.unauthorized(res, 'Authentication required');
      }
      console.error('Error submitting design:', error);
      handleDatabaseError(res, error, 'submit design');
    }
  })
);

// PUT /api/design-jobs/:jobId/review - Submit review with approval/rejection
router.put('/:jobId/review',
  requireOrgAdmin() as any,
  validateRequest({ 
    params: jobIdParamSchema,
    body: ReviewDesignDTO
  }) as any,
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const { jobId } = req.params;
    const { approved, feedback, requestRevisions, revisionNotes } = req.body;

    try {
      const sb = getAuthenticatedClient(req);
      
      // Verify design job access
      const verifiedJob = await verifyDesignJobAccess(jobId, req, sb);
      
      // Additional authorization check - only admins can review designs
      if (!req.user?.role || !['admin', 'owner'].includes(req.user.role)) {
        return HttpErrors.forbidden(res, 'Only organization admins can review and approve designs');
      }
      
      // Submit review using service
      const updatedJob = await DesignJobService.reviewDesign(
        sb,
        jobId,
        verifiedJob.org_id,
        req.user?.id,
        {
          approved,
          feedback,
          requestRevisions,
          revisionNotes
        }
      );
      
      trackBusinessEvent('design_reviewed', req, {
        design_job_id: jobId,
        approved,
        revisions_requested: requestRevisions
      });

      sendOk(res, updatedJob);
    } catch (error) {
      if (error instanceof Error && error.message === 'Missing authentication token') {
        return HttpErrors.unauthorized(res, 'Authentication required');
      }
      console.error('Error reviewing design:', error);
      handleDatabaseError(res, error, 'review design');
    }
  })
);

// POST /api/design-jobs/:jobId/comments - Add comments to design job
router.post('/:jobId/comments',
  requireOrgMember() as any,
  validateRequest({ 
    params: jobIdParamSchema,
    body: CreateDesignJobCommentDTO
  }) as any,
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const { jobId } = req.params;
    const { content, attachmentUrls } = req.body;

    try {
      const sb = getAuthenticatedClient(req);
      
      // Verify design job access
      await verifyDesignJobAccess(jobId, req, sb);
      
      // Create comment using design job events
      await DesignJobService.createDesignJobEvent(sb, {
        designJobId: jobId,
        eventCode: 'COMMENT_ADDED',
        actorUserId: req.user?.id,
        payload: {
          content,
          attachmentUrls,
          timestamp: new Date().toISOString()
        }
      });
      
      trackBusinessEvent('design_comment_added', req, {
        design_job_id: jobId,
        has_attachments: !!attachmentUrls?.length
      });

      sendCreated(res, { message: 'Comment added successfully' });
    } catch (error) {
      if (error instanceof Error && error.message === 'Missing authentication token') {
        return HttpErrors.unauthorized(res, 'Authentication required');
      }
      console.error('Error adding comment:', error);
      handleDatabaseError(res, error, 'add comment');
    }
  })
);

// GET /api/design-jobs/:jobId/comments - Get paginated comments and events
router.get('/:jobId/comments',
  requireOrgMember() as any,
  validateRequest({ 
    params: jobIdParamSchema,
    query: CommentsPaginationSchema
  }) as any,
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const { jobId } = req.params;
    const { page, limit, eventTypes } = req.query;

    try {
      const sb = getAuthenticatedClient(req);
      
      // Verify design job access
      await verifyDesignJobAccess(jobId, req, sb);
      
      // Build query for events
      let query = sb
        .from('design_job_events')
        .select(`
          *,
          users:actor_user_id(id, full_name, email)
        `)
        .eq('design_job_id', jobId);

      // Filter by event types if specified
      if (eventTypes && eventTypes.length > 0) {
        query = query.in('event_code', eventTypes);
      } else {
        // Default to comment and collaboration events
        query = query.in('event_code', [
          'COMMENT_ADDED',
          'DESIGN_SUBMITTED',
          'DESIGN_APPROVED', 
          'REVISIONS_REQUESTED',
          'ASSET_UPLOADED',
          'DESIGN_REVIEWED'
        ]);
      }

      // Add pagination
      const offset = (page - 1) * limit;
      query = query
        .order('occurred_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: events, error, count } = await query;

      if (error) {
        throw error;
      }

      // Get total count for pagination metadata
      const { count: totalCount, error: countError } = await sb
        .from('design_job_events')
        .select('*', { count: 'exact', head: true })
        .eq('design_job_id', jobId)
        .in('event_code', eventTypes || [
          'COMMENT_ADDED',
          'DESIGN_SUBMITTED',
          'DESIGN_APPROVED',
          'REVISIONS_REQUESTED', 
          'ASSET_UPLOADED',
          'DESIGN_REVIEWED'
        ]);

      if (countError) {
        throw countError;
      }

      // Format events for display
      const formattedEvents = (events || []).map(event => ({
        id: event.id,
        designJobId: event.design_job_id,
        eventCode: event.event_code,
        actorUserId: event.actor_user_id,
        actorName: event.users?.full_name || 'Unknown User',
        actorEmail: event.users?.email,
        payload: event.payload,
        occurredAt: event.occurred_at,
        // Extract common fields for easy access
        content: event.payload?.content,
        attachmentUrls: event.payload?.attachmentUrls,
        feedback: event.payload?.feedback,
        notes: event.payload?.notes,
        assetId: event.payload?.assetId,
        version: event.payload?.version
      }));

      const totalPages = Math.ceil((totalCount || 0) / limit);

      sendOk(res, {
        events: formattedEvents,
        pagination: {
          page,
          limit,
          totalCount: totalCount || 0,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Missing authentication token') {
        return HttpErrors.unauthorized(res, 'Authentication required');
      }
      console.error('Error fetching comments:', error);
      handleDatabaseError(res, error, 'fetch comments');
    }
  })
);


// POST /api/design-jobs/:jobId/assets/upload - Create signed upload URL for design assets
router.post('/:jobId/assets/upload',
  requireOrgMember() as any,
  validateRequest({ 
    params: jobIdParamSchema,
    body: AssetUploadRequestSchema
  }) as any,
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const { jobId } = req.params;
    const { filename, contentType, size, version } = req.body;

    try {
      const sb = getAuthenticatedClient(req);
      
      // Verify design job access and get org context
      const verifiedJob = await verifyDesignJobAccess(jobId, req, sb);
      
      // Create signed upload URL with organization scoping
      const uploadResponse = await createAssetUploadUrl(
        verifiedJob.org_id, 
        filename, 
        contentType, 
        'design-assets'
      );
      
      // Create design_assets record for tracking
      const { data: assetRecord, error: assetError } = await sb
        .from('design_assets')
        .insert({
          org_id: verifiedJob.org_id,
          order_item_id: verifiedJob.order_item_id,
          uploader_id: req.user?.id,
          version: version,
          file_url: uploadResponse.storageKey,
          approved_by_admin: false,
        })
        .select('id, version, created_at')
        .single();

      if (assetError) {
        throw assetError;
      }

      // Log asset upload event
      await DesignJobService.createDesignJobEvent(sb, {
        designJobId: jobId,
        eventCode: 'ASSET_UPLOADED',
        actorUserId: req.user?.id,
        payload: {
          assetId: assetRecord.id,
          filename,
          version,
          storageKey: uploadResponse.storageKey,
          timestamp: new Date().toISOString()
        }
      });
      
      trackBusinessEvent('design_asset_upload_url_created', req, {
        design_job_id: jobId,
        asset_id: assetRecord.id,
        version
      });

      sendCreated(res, {
        assetId: assetRecord.id,
        uploadUrl: uploadResponse.uploadUrl,
        storageKey: uploadResponse.storageKey,
        version: assetRecord.version,
        createdAt: assetRecord.created_at
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Missing authentication token') {
        return HttpErrors.unauthorized(res, 'Authentication required');
      }
      console.error('Error creating asset upload URL:', error);
      handleDatabaseError(res, error, 'create asset upload URL');
    }
  })
);

// GET /api/design-jobs/:jobId/assets/:assetId - Get secure download URL for design asset
router.get('/:jobId/assets/:assetId',
  requireOrgMember() as any,
  validateRequest({ params: jobIdParamSchema.extend({ assetId: z.string().uuid() }) }) as any,
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const { jobId, assetId } = req.params;

    try {
      const sb = getAuthenticatedClient(req);
      
      // Verify design job access
      const verifiedJob = await verifyDesignJobAccess(jobId, req, sb);
      
      // Get asset record with org validation
      const { data: asset, error: assetError } = await sb
        .from('design_assets')
        .select('id, org_id, file_url, version, approved_by_admin, created_at')
        .eq('id', assetId)
        .eq('org_id', verifiedJob.org_id) // Ensure org boundary
        .single();

      if (assetError || !asset) {
        return HttpErrors.notFound(res, 'Design asset not found');
      }
      
      // Generate secure download URL with org validation
      const downloadUrl = await getAssetDownloadUrl(asset.file_url, 3600, verifiedJob.org_id);
      
      // Log asset access event
      await DesignJobService.createDesignJobEvent(sb, {
        designJobId: jobId,
        eventCode: 'ASSET_ACCESSED',
        actorUserId: req.user?.id,
        payload: {
          assetId: asset.id,
          version: asset.version,
          timestamp: new Date().toISOString()
        }
      });

      sendOk(res, {
        assetId: asset.id,
        downloadUrl,
        version: asset.version,
        approved: asset.approved_by_admin,
        createdAt: asset.created_at,
        expiresIn: 3600 // 1 hour
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Missing authentication token') {
        return HttpErrors.unauthorized(res, 'Authentication required');
      }
      console.error('Error getting asset download URL:', error);
      handleDatabaseError(res, error, 'get asset download URL');
    }
  })
);

// GET /api/design-jobs/:jobId/assets - List all assets for design job
router.get('/:jobId/assets',
  requireOrgMember() as any,
  validateRequest({ params: jobIdParamSchema }) as any,
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const { jobId } = req.params;

    try {
      const sb = getAuthenticatedClient(req);
      
      // Verify design job access
      const verifiedJob = await verifyDesignJobAccess(jobId, req, sb);
      
      // Get all assets for this design job with org validation
      const { data: assets, error: assetsError } = await sb
        .from('design_assets')
        .select(`
          id,
          version,
          file_url,
          thumbnail_url,
          approved_by_admin,
          approved_at,
          created_at,
          users:uploader_id(id, full_name)
        `)
        .eq('order_item_id', verifiedJob.order_item_id)
        .eq('org_id', verifiedJob.org_id)
        .order('version', { ascending: false })
        .order('created_at', { ascending: false });

      if (assetsError) {
        throw assetsError;
      }

      sendOk(res, assets || []);
    } catch (error) {
      if (error instanceof Error && error.message === 'Missing authentication token') {
        return HttpErrors.unauthorized(res, 'Authentication required');
      }
      console.error('Error listing design assets:', error);
      handleDatabaseError(res, error, 'list design assets');
    }
  })
);

// GET /api/design-jobs/:jobId/revisions - Get design revision history
router.get('/:jobId/revisions',
  requireOrgMember() as any,
  validateRequest({ params: jobIdParamSchema }) as any,
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const { jobId } = req.params;

    try {
      const sb = getAuthenticatedClient(req);
      
      // Verify design job access
      await verifyDesignJobAccess(jobId, req, sb);
      
      // Get revision history from events
      const { data: events, error } = await sb
        .from('design_job_events')
        .select(`
          *,
          users:actor_user_id(id, full_name)
        `)
        .eq('design_job_id', jobId)
        .in('event_code', [
          'DESIGN_SUBMITTED',
          'DESIGN_APPROVED',
          'REVISIONS_REQUESTED',
          'REVISIONS_SUBMITTED'
        ])
        .order('occurred_at', { ascending: false });

      if (error) {
        return handleDatabaseError(res, error, 'get revisions');
      }

      // Format revision history
      const revisions = (events || []).map((event, index) => ({
        id: event.id,
        designJobId: event.design_job_id,
        version: (events?.length || 0) - index, // Reverse index for version numbering
        status: event.event_code,
        submittedAt: event.occurred_at,
        actorId: event.actor_user_id,
        actorName: event.users?.full_name || 'Unknown User',
        feedback: event.payload?.feedback || event.payload?.notes,
        assetIds: event.payload?.assetIds || [],
        createdAt: event.occurred_at,
      }));

      sendOk(res, revisions);
    } catch (error) {
      if (error instanceof Error && error.message === 'Missing authentication token') {
        return HttpErrors.unauthorized(res, 'Authentication required');
      }
      console.error('Error fetching revisions:', error);
      handleDatabaseError(res, error, 'fetch revisions');
    }
  })
);

// POST /api/design-jobs/bulk-assign - Bulk assignment with workload balancing
router.post('/bulk-assign',
  requireOrgMember() as any,
  validateRequest({ body: BulkAssignDesignJobsDTO }) as any,
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const assignmentData = req.body;

    try {
      const sb = getAuthenticatedClient(req);
      
      // Bulk assign using service
      const results = await DesignJobService.bulkAssignDesignJobs(
        sb,
        assignmentData,
        req.user?.id
      );
      
      trackBusinessEvent('design_jobs_bulk_assigned', req, {
        job_count: assignmentData.designJobIds.length,
        use_workload_balancing: assignmentData.useWorkloadBalancing,
        use_skill_matching: assignmentData.useSkillMatching
      });

      sendOk(res, results);
    } catch (error) {
      if (error instanceof Error && error.message === 'Missing authentication token') {
        return HttpErrors.unauthorized(res, 'Authentication required');
      }
      console.error('Error in bulk assignment:', error);
      handleDatabaseError(res, error, 'bulk assign');
    }
  })
);

export default router;