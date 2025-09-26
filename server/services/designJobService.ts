/**
 * Design Job Service
 * Handles creation, updates, and lifecycle management of design jobs
 * SECURITY: All methods require authenticated Supabase clients passed from callers to enforce RLS
 * NO ADMIN CLIENT USAGE - All operations use user-scoped clients with proper org validation
 */

import type { 
  CreateDesignJobType,
  CreateDesignJobEventType,
  DesignJobType,
  SubmitDesignType,
  ReviewDesignType,
  BulkAssignDesignJobsType,
  DesignerWorkloadType
} from '../../shared/dtos';
import type { SupabaseClient } from '@supabase/supabase-js';
import { WorkOrderService } from './workOrderService';

export class DesignJobService {
  
  /**
   * Submit design for review - transitions job to review workflow
   * SECURITY: Uses authenticated client with org validation
   */
  static async submitDesignForReview(
    sb: SupabaseClient,
    designJobId: string,
    orgId: string,
    actorUserId?: string,
    submissionData: SubmitDesignType = { submissionType: 'initial' }
  ): Promise<DesignJobType> {
    try {
      const { assetIds, notes, submissionType } = submissionData;
      
      // Update design job status to submitted_for_review
      const updatedJob = await this.updateDesignJobStatus(
        sb,
        designJobId,
        'submitted_for_review',
        orgId,
        actorUserId,
        notes
      );
      
      // Create submission event
      await this.createDesignJobEvent(sb, {
        designJobId,
        eventCode: 'DESIGN_SUBMITTED',
        actorUserId,
        payload: {
          submission_type: submissionType,
          asset_ids: assetIds || [],
          notes,
          timestamp: new Date().toISOString()
        }
      });
      
      return updatedJob;
    } catch (error) {
      console.error('Error submitting design for review:', error);
      throw error;
    }
  }
  
  /**
   * Review design - approve or request revisions
   * SECURITY: Uses authenticated client with org validation
   */
  static async reviewDesign(
    sb: SupabaseClient,
    designJobId: string,
    orgId: string,
    reviewData: ReviewDesignType,
    actorUserId?: string
  ): Promise<DesignJobType> {
    try {
      const { approved, feedback, requestRevisions, revisionNotes } = reviewData;
      
      let newStatus: string;
      let eventCode: string;
      
      if (approved && !requestRevisions) {
        newStatus = 'approved';
        eventCode = 'DESIGN_APPROVED';
      } else if (requestRevisions) {
        newStatus = 'revision_requested';
        eventCode = 'REVISIONS_REQUESTED';
      } else {
        newStatus = 'under_review';
        eventCode = 'DESIGN_UNDER_REVIEW';
      }
      
      // Update design job status
      const updatedJob = await this.updateDesignJobStatus(
        sb,
        designJobId,
        newStatus,
        orgId,
        actorUserId,
        feedback
      );
      
      // Create review event
      await this.createDesignJobEvent(sb, {
        designJobId,
        eventCode,
        actorUserId,
        payload: {
          approved,
          feedback,
          request_revisions: requestRevisions,
          revision_notes: revisionNotes,
          timestamp: new Date().toISOString()
        }
      });
      
      // AUTO-GENERATE WORK ORDER: When design is approved, automatically create work order
      if (approved && !requestRevisions && newStatus === 'approved') {
        try {
          await this.autoGenerateWorkOrderFromApprovedDesign(sb, updatedJob, actorUserId);
        } catch (workOrderError) {
          console.error('Failed to auto-generate work order for approved design:', workOrderError);
          // Don't fail the design approval if work order generation fails
          // Log the error but continue - work orders can be created manually later
        }
      }
      
      return updatedJob;
    } catch (error) {
      console.error('Error reviewing design:', error);
      throw error;
    }
  }

  /**
   * Auto-generate work order when design job is approved
   * SECURITY: Uses authenticated client with org validation
   * INTEGRATION: Links design approval to manufacturing workflow
   */
  static async autoGenerateWorkOrderFromApprovedDesign(
    sb: SupabaseClient,
    approvedDesignJob: DesignJobType,
    actorUserId?: string
  ): Promise<void> {
    try {
      console.log(`Auto-generating work order for approved design job: ${approvedDesignJob.id}`);

      // Get order item details
      const { data: orderItem, error: orderItemError } = await sb
        .from('order_items')
        .select('id, org_id, order_id, quantity, name_snapshot, status_code')
        .eq('id', approvedDesignJob.orderItemId)
        .single();

      if (orderItemError || !orderItem) {
        throw new Error(`Failed to get order item for design job ${approvedDesignJob.id}: ${orderItemError?.message || 'Not found'}`);
      }

      // Validate organization access
      if (orderItem.org_id !== approvedDesignJob.orgId) {
        throw new Error('Organization mismatch between design job and order item');
      }

      // Check if work order already exists for this order item
      const { data: existingWorkOrder } = await sb
        .from('manufacturing_work_orders')
        .select('id, status_code')
        .eq('order_item_id', orderItem.id)
        .single();

      if (existingWorkOrder) {
        console.log(`Work order already exists for order item ${orderItem.id}: ${existingWorkOrder.id}`);
        return; // Don't create duplicate work order
      }

      // Prepare work order data with smart defaults
      const workOrderData = {
        orgId: orderItem.org_id,
        orderItemId: orderItem.id,
        quantity: orderItem.quantity,
        priority: 5, // Medium priority for auto-generated orders
        statusCode: 'pending' as const,
        instructions: `Auto-generated from approved design job: ${approvedDesignJob.title || 'Untitled'}`,
        // Could add planned dates based on business rules
        plannedStartDate: undefined,
        plannedDueDate: undefined,
      };

      // Create the work order using WorkOrderService
      const workOrder = await WorkOrderService.createWorkOrder(sb, workOrderData);

      console.log(`Successfully created work order ${workOrder.id} for approved design job ${approvedDesignJob.id}`);

      // Update order item status to manufacturing
      const { error: updateError } = await sb
        .from('order_items')
        .update({ 
          status_code: 'manufacturing',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderItem.id);

      if (updateError) {
        console.error('Failed to update order item status to manufacturing:', updateError);
        // Don't throw error - work order was created successfully
      } else {
        console.log(`Updated order item ${orderItem.id} status to 'manufacturing'`);
      }

      // Create design job event for the connection
      await this.createDesignJobEvent(sb, {
        designJobId: approvedDesignJob.id,
        eventCode: 'WORK_ORDER_AUTO_GENERATED',
        actorUserId,
        payload: {
          work_order_id: workOrder.id,
          order_item_id: orderItem.id,
          quantity: orderItem.quantity,
          auto_generated: true,
          timestamp: new Date().toISOString(),
        }
      });

    } catch (error) {
      console.error('Error in autoGenerateWorkOrderFromApprovedDesign:', error);
      throw error; // Re-throw to be caught by caller
    }
  }
  
  /**
   * Bulk assign design jobs with workload balancing and skill matching
   * SECURITY: Uses authenticated client with org validation
   */
  static async bulkAssignDesignJobs(
    sb: SupabaseClient,
    assignmentData: BulkAssignDesignJobsType,
    actorUserId?: string
  ): Promise<{ successful: DesignJobType[], failed: { jobId: string, error: string }[] }> {
    try {
      const {
        designJobIds,
        designerId,
        useWorkloadBalancing,
        useSkillMatching,
        requiredSpecializations,
        maxJobsPerDesigner
      } = assignmentData;
      
      const successful: DesignJobType[] = [];
      const failed: { jobId: string, error: string }[] = [];
      
      // If specific designer provided, assign all to them
      if (designerId) {
        for (const jobId of designJobIds) {
          try {
            const assignedJob = await this.assignDesigner(
              sb,
              jobId,
              designerId,
              actorUserId,
              'Bulk assignment'
            );
            successful.push(assignedJob);
          } catch (error) {
            failed.push({
              jobId,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      } else if (useWorkloadBalancing || useSkillMatching) {
        // Smart assignment with balancing and skill matching
        const assignments = await this.smartAssignDesignJobs(
          sb,
          designJobIds,
          {
            useWorkloadBalancing,
            useSkillMatching,
            requiredSpecializations,
            maxJobsPerDesigner
          }
        );
        
        // Execute assignments
        for (const assignment of assignments) {
          try {
            const assignedJob = await this.assignDesigner(
              sb,
              assignment.jobId,
              assignment.designerId,
              actorUserId,
              `Smart assignment (score: ${assignment.score})`
            );
            successful.push(assignedJob);
          } catch (error) {
            failed.push({
              jobId: assignment.jobId,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      } else {
        // No smart assignment - need designer ID
        for (const jobId of designJobIds) {
          failed.push({
            jobId,
            error: 'No designer specified and smart assignment disabled'
          });
        }
      }
      
      return { successful, failed };
    } catch (error) {
      console.error('Error in bulk assignment:', error);
      throw error;
    }
  }
  
  /**
   * Smart assignment algorithm with workload balancing and skill matching
   * SECURITY: Uses authenticated client with org validation
   */
  static async smartAssignDesignJobs(
    sb: SupabaseClient,
    designJobIds: string[],
    options: {
      useWorkloadBalancing?: boolean;
      useSkillMatching?: boolean;
      requiredSpecializations?: string[];
      maxJobsPerDesigner?: number;
    }
  ): Promise<{ jobId: string, designerId: string, score: number }[]> {
    try {
      // Get designer workloads
      const designerWorkloads = await this.getDesignerWorkloads(sb);
      
      // Get design job details for skill matching
      const { data: designJobs, error: jobsError } = await sb
        .from('design_jobs')
        .select('id, title, brief, priority')
        .in('id', designJobIds);
      
      if (jobsError || !designJobs) {
        throw new Error(`Failed to fetch design jobs: ${jobsError?.message}`);
      }
      
      const assignments: { jobId: string, designerId: string, score: number }[] = [];
      
      for (const job of designJobs) {
        let bestMatch: { designerId: string, score: number } | null = null;
        
        for (const designer of designerWorkloads) {
          // Skip if designer is at capacity (use provided limit or designer's capacity limit)
          const maxJobs = options.maxJobsPerDesigner || designer.capacityLimit || 10;
          if (designer.currentJobs >= maxJobs) {
            continue;
          }
          
          // Skip if designer is not available
          if (!designer.isAvailable) {
            continue;
          }
          
          let score = 0;
          
          // Skill matching score (0-50 points)
          if (options.useSkillMatching && options.requiredSpecializations) {
            const matchingSkills = designer.specializations.filter(
              skill => options.requiredSpecializations!.includes(skill)
            ).length;
            const skillScore = options.requiredSpecializations.length > 0 
              ? (matchingSkills / options.requiredSpecializations.length) * 50
              : 25; // Default if no required skills
            score += skillScore;
          } else {
            score += 25; // Base skill score
          }
          
          // Workload balancing score (0-50 points)
          if (options.useWorkloadBalancing) {
            const workloadScore = Math.max(0, 50 - designer.workloadScore);
            score += workloadScore;
          } else {
            score += 25; // Base workload score
          }
          
          // Update best match
          if (!bestMatch || score > bestMatch.score) {
            bestMatch = { designerId: designer.designerId, score };
          }
        }
        
        if (bestMatch) {
          assignments.push({
            jobId: job.id,
            designerId: bestMatch.designerId,
            score: bestMatch.score
          });
          
          // Update designer workload for next iteration
          const designer = designerWorkloads.find(d => d.designerId === bestMatch!.designerId);
          if (designer) {
            designer.currentJobs++;
            designer.workloadScore = Math.min(100, designer.workloadScore + 10);
          }
        }
      }
      
      return assignments;
    } catch (error) {
      console.error('Error in smart assignment:', error);
      throw error;
    }
  }
  
  /**
   * Get current workload for all designers
   * SECURITY: Uses authenticated client with org validation
   */
  static async getDesignerWorkloads(sb: SupabaseClient): Promise<DesignerWorkloadType[]> {
    try {
      // Get designers with their current job counts
      const { data: designers, error: designersError } = await sb
        .from('designers')
        .select(`
          id,
          user_id,
          specializations,
          hourly_rate,
          is_active,
          users!inner(full_name)
        `)
        .eq('is_active', true);
      
      if (designersError) {
        throw new Error(`Failed to fetch designers: ${designersError.message}`);
      }
      
      const workloads: DesignerWorkloadType[] = [];
      
      for (const designer of designers || []) {
        // Count current active jobs
        const { count: currentJobs, error: countError } = await sb
          .from('design_jobs')
          .select('id', { count: 'exact', head: true })
          .eq('assignee_designer_id', designer.id)
          .not('status_code', 'in', '(approved,canceled)');
        
        if (countError) {
          console.warn(`Failed to count jobs for designer ${designer.id}:`, countError);
        }
        
        const jobCount = currentJobs || 0;
        
        // Use consistent capacity limit configuration
        const defaultMaxJobs = 10; // Default capacity limit (should be configurable)
        const capacityLimit = defaultMaxJobs;
        
        // Calculate workload score (0-100, where higher = busier)
        const workloadScore = Math.min(100, (jobCount / capacityLimit) * 100);
        
        workloads.push({
          designerId: designer.id,
          name: (designer.users as any)?.full_name || 'Unknown Designer',
          specializations: designer.specializations || [],
          currentJobs: jobCount,
          capacityLimit,
          hourlyRate: designer.hourly_rate,
          isAvailable: designer.is_active && jobCount < capacityLimit,
          workloadScore
        });
      }
      
      return workloads;
    } catch (error) {
      console.error('Error getting designer workloads:', error);
      throw error;
    }
  }

  /**
   * Create a design job for an order item
   * SECURITY: Uses authenticated client passed from caller to enforce RLS
   */
  static async createDesignJob(
    sb: SupabaseClient,
    orderItemId: string,
    orgId: string,
    actorUserId?: string,
    options: Partial<CreateDesignJobType> = {}
  ): Promise<DesignJobType> {
    try {
      // Get order item details for context with explicit org validation
      const { data: orderItem, error: orderItemError } = await sb
        .from('order_items')
        .select('id, name_snapshot, status_code, org_id, order_id')
        .eq('id', orderItemId)
        .eq('org_id', orgId) // Double verification for security
        .single();

      if (orderItemError || !orderItem) {
        throw new Error(`Order item not found or access denied: ${orderItemId}`);
      }

      // Additional security check - ensure org_id matches
      if (orderItem.org_id !== orgId) {
        throw new Error(`Organization mismatch for order item: ${orderItemId}`);
      }

      // Validate organization exists and user has access via RLS
      const { data: org, error: orgError } = await sb
        .from('organizations')
        .select('id')
        .eq('id', orgId)
        .single();

      if (orgError || !org) {
        throw new Error(`Invalid organization or access denied: ${orgId}`);
      }

      // Check if design job already exists for this order item (idempotency check)
      const { data: existingJob } = await sb
        .from('design_jobs')
        .select('*')
        .eq('order_item_id', orderItemId)
        .eq('org_id', orgId) // Explicit org validation
        .single();

      if (existingJob) {
        // Return existing design job for idempotency - don't create duplicate
        console.log(`Design job already exists for order item: ${orderItemId}, returning existing job`);
        return {
          id: existingJob.id,
          orgId: existingJob.org_id,
          orderItemId: existingJob.order_item_id,
          title: existingJob.title,
          brief: existingJob.brief,
          priority: existingJob.priority,
          statusCode: existingJob.status_code,
          assigneeDesignerId: existingJob.assignee_designer_id,
          createdAt: existingJob.created_at,
          updatedAt: existingJob.updated_at,
        };
      }

      // Create design job with auto-generated title if not provided
      const designJobData = {
        org_id: orgId,
        order_item_id: orderItemId,
        title: options.title || `Design for ${orderItem.name_snapshot || 'Item'}`,
        brief: options.brief || null,
        priority: options.priority || 5,
        status_code: options.statusCode || 'queued',
        assignee_designer_id: options.assigneeDesignerId || null,
      };

      const { data: newDesignJob, error: createError } = await sb
        .from('design_jobs')
        .insert(designJobData)
        .select()
        .single();

      if (createError) {
        // Handle unique constraint violation gracefully (race condition protection)
        if (createError.code === '23505' && createError.message.includes('uniq_design_jobs_order_item_id')) {
          console.log(`Unique constraint violation for order item: ${orderItemId}, fetching existing job`);
          // Another process created the design job, fetch and return it
          const { data: raceConditionJob, error: fetchError } = await sb
            .from('design_jobs')
            .select('*')
            .eq('order_item_id', orderItemId)
            .eq('org_id', orgId)
            .single();
          
          if (fetchError || !raceConditionJob) {
            throw new Error(`Failed to fetch design job after race condition: ${fetchError?.message}`);
          }
          
          return {
            id: raceConditionJob.id,
            orgId: raceConditionJob.org_id,
            orderItemId: raceConditionJob.order_item_id,
            title: raceConditionJob.title,
            brief: raceConditionJob.brief,
            priority: raceConditionJob.priority,
            statusCode: raceConditionJob.status_code,
            assigneeDesignerId: raceConditionJob.assignee_designer_id,
            createdAt: raceConditionJob.created_at,
            updatedAt: raceConditionJob.updated_at,
          };
        }
        throw new Error(`Failed to create design job: ${createError.message}`);
      }

      if (!newDesignJob) {
        throw new Error('Failed to create design job: No data returned');
      }

      // Create initial event using authenticated client
      await this.createDesignJobEvent(sb, {
        designJobId: newDesignJob.id,
        eventCode: 'DESIGN_JOB_CREATED',
        actorUserId,
        payload: {
          initial_status: newDesignJob.status_code,
          order_item_id: orderItemId,
          auto_created: true
        }
      });

      return {
        id: newDesignJob.id,
        orgId: newDesignJob.org_id,
        orderItemId: newDesignJob.order_item_id,
        title: newDesignJob.title,
        brief: newDesignJob.brief,
        priority: newDesignJob.priority,
        statusCode: newDesignJob.status_code,
        assigneeDesignerId: newDesignJob.assignee_designer_id,
        createdAt: newDesignJob.created_at,
        updatedAt: newDesignJob.updated_at,
      };
    } catch (error) {
      console.error('Error creating design job:', error);
      throw error;
    }
  }

  /**
   * Create multiple design jobs for order items
   * SECURITY: Uses authenticated client for all operations
   */
  static async bulkCreateDesignJobs(
    sb: SupabaseClient,
    orderItemIds: string[],
    orgId: string,
    actorUserId?: string,
    options: Partial<CreateDesignJobType> = {}
  ): Promise<DesignJobType[]> {
    const results: DesignJobType[] = [];
    const errors: string[] = [];

    for (const orderItemId of orderItemIds) {
      try {
        const designJob = await this.createDesignJob(sb, orderItemId, orgId, actorUserId, options);
        results.push(designJob);
      } catch (error) {
        errors.push(`${orderItemId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (errors.length > 0 && results.length === 0) {
      throw new Error(`Failed to create any design jobs: ${errors.join(', ')}`);
    }

    return results;
  }

  /**
   * Update design job status with validation using atomic RPC
   * SECURITY: Uses authenticated client with atomic operations via RPC function
   * SECURITY FIX ORD-5: Now requires org_id parameter to prevent RLS bypass
   * ATOMICITY: All operations (update, event creation, order sync) happen in single transaction
   */
  static async updateDesignJobStatus(
    sb: SupabaseClient,
    designJobId: string,
    newStatus: string,
    orgId: string,
    actorUserId?: string,
    notes?: string
  ): Promise<DesignJobType> {
    try {
      // Call the atomic RPC function that handles all operations in a single transaction
      // SECURITY FIX ORD-5: Pass org_id parameter for strict validation
      const { data: result, error: rpcError } = await sb
        .rpc('atomic_update_design_job_status', {
          p_design_job_id: designJobId,
          p_new_status: newStatus,
          p_actor_user_id: actorUserId || null,
          p_notes: notes || null,
          p_org_id: orgId // Required for security validation
        })
        .single();

      if (rpcError) {
        console.error('RPC error updating design job status:', rpcError);
        throw new Error(`Failed to update design job status: ${rpcError.message}`);
      }

      if (!result) {
        throw new Error('No result returned from atomic status update operation');
      }

      // Check if the operation was successful
      if (!(result as any).success) {
        const errorMessage = (result as any).error_message || 'Unknown error in atomic status update';
        
        // Handle access denied errors specifically for better error reporting
        if (errorMessage.includes('Access denied') || 
            errorMessage.includes('not a member') || 
            errorMessage.includes('Organization mismatch')) {
          throw new Error(`Access denied: ${errorMessage}`);
        }
        
        throw new Error(errorMessage);
      }

      // Return the updated design job data
      const resultData = result as any;
      return {
        id: resultData.id,
        orgId: resultData.org_id,
        orderItemId: resultData.order_item_id,
        title: resultData.title,
        brief: resultData.brief,
        priority: resultData.priority,
        statusCode: resultData.status_code,
        assigneeDesignerId: resultData.assignee_designer_id,
        createdAt: resultData.created_at,
        updatedAt: resultData.updated_at,
      };
    } catch (error) {
      console.error('Error updating design job status:', error);
      throw error;
    }
  }

  /**
   * Assign designer to design job
   * SECURITY: Uses authenticated client with organization membership validation
   */
  static async assignDesigner(
    sb: SupabaseClient,
    designJobId: string,
    designerId: string,
    actorUserId?: string,
    notes?: string
  ): Promise<DesignJobType> {
    try {
      // First get the design job to validate org access
      const { data: designJob, error: jobError } = await sb
        .from('design_jobs')
        .select('id, org_id')
        .eq('id', designJobId)
        .single();

      if (jobError || !designJob) {
        throw new Error(`Design job not found or access denied: ${designJobId}`);
      }

      // Validate designer exists, is active, and belongs to the same organization
      const { data: designer, error: designerError } = await sb
        .from('designers')
        .select('id, is_active, org_id')
        .eq('id', designerId)
        .eq('org_id', designJob.org_id) // Ensure designer belongs to same org
        .single();

      if (designerError || !designer) {
        throw new Error(`Designer not found or not in organization: ${designerId}`);
      }

      if (!designer.is_active) {
        throw new Error(`Designer is inactive: ${designerId}`);
      }

      // Update design job assignment atomically
      const { data: updatedJob, error: updateError } = await sb
        .from('design_jobs')
        .update({
          assignee_designer_id: designerId,
          status_code: 'assigned', // Auto-transition to assigned
          updated_at: new Date().toISOString(),
        })
        .eq('id', designJobId)
        .eq('org_id', designJob.org_id) // Additional security check
        .select()
        .single();

      if (updateError || !updatedJob) {
        throw new Error(`Failed to assign designer: ${updateError?.message}`);
      }

      // Create assignment event using authenticated client
      await this.createDesignJobEvent(sb, {
        designJobId,
        eventCode: 'DESIGNER_ASSIGNED',
        actorUserId,
        payload: {
          designer_id: designerId,
          notes,
        }
      });

      return {
        id: updatedJob.id,
        orgId: updatedJob.org_id,
        orderItemId: updatedJob.order_item_id,
        title: updatedJob.title,
        brief: updatedJob.brief,
        priority: updatedJob.priority,
        statusCode: updatedJob.status_code,
        assigneeDesignerId: updatedJob.assignee_designer_id,
        createdAt: updatedJob.created_at,
        updatedAt: updatedJob.updated_at,
      };
    } catch (error) {
      console.error('Error assigning designer:', error);
      throw error;
    }
  }

  /**
   * Create design job event for tracking
   * SECURITY: Uses authenticated client passed from caller to enforce RLS
   */
  static async createDesignJobEvent(sb: SupabaseClient, event: CreateDesignJobEventType): Promise<void> {
    try {
      const { error } = await sb
        .from('design_job_events')
        .insert({
          design_job_id: event.designJobId,
          event_code: event.eventCode,
          actor_user_id: event.actorUserId || null,
          payload: event.payload || null,
        });

      if (error) {
        console.error('Failed to create design job event:', error);
      }
    } catch (error) {
      console.error('Error creating design job event:', error);
    }
  }


  /**
   * Validate status transitions
   */
  static isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
    const validTransitions = this.getValidTransitions(currentStatus);
    return validTransitions.includes(newStatus);
  }

  /**
   * Get valid status transitions for current status
   */
  static getValidTransitions(currentStatus: string): string[] {
    const transitions: Record<string, string[]> = {
      'queued': ['assigned', 'canceled'],
      'assigned': ['drafting', 'queued', 'canceled'],
      'drafting': ['submitted_for_review', 'assigned', 'canceled'],
      'submitted_for_review': ['under_review', 'revision_requested', 'approved', 'drafting', 'canceled'],
      'under_review': ['approved', 'revision_requested', 'rejected', 'canceled'],
      'revision_requested': ['drafting', 'submitted_for_review', 'canceled'],
      'review': ['approved', 'rejected', 'drafting'], // Legacy support
      'approved': [], // terminal
      'rejected': ['drafting', 'revision_requested', 'canceled'],
      'canceled': [], // terminal
    };
    return transitions[currentStatus] || [];
  }

  /**
   * Auto-create design jobs when order items transition to design status
   * SECURITY: Uses authenticated client passed from caller to enforce RLS
   */
  static async handleOrderItemStatusChange(
    sb: SupabaseClient,
    orderItemId: string,
    newStatus: string,
    previousStatus: string,
    actorUserId?: string
  ): Promise<void> {
    try {
      // Create design job when transitioning TO design status
      if (newStatus === 'design' && previousStatus !== 'design') {
        // Get order item details using authenticated client for security
        const { data: orderItem, error } = await sb
          .from('order_items')
          .select('org_id, order_id, name_snapshot')
          .eq('id', orderItemId)
          .single();

        if (error) {
          console.error('Failed to fetch order item for design job creation:', error);
          return;
        }

        if (!orderItem) {
          console.error(`Order item not found or access denied: ${orderItemId}`);
          return;
        }

        // Validate organization exists and user has access via RLS
        const { data: org, error: orgError } = await sb
          .from('organizations')
          .select('id')
          .eq('id', orderItem.org_id)
          .single();

        if (orgError || !org) {
          console.error(`Organization not found or access denied: ${orderItem.org_id}`);
          return;
        }

        // Check if design job already exists for this order item
        const { data: existingJob } = await sb
          .from('design_jobs')
          .select('id')
          .eq('order_item_id', orderItemId)
          .eq('org_id', orderItem.org_id) // Explicit org validation
          .single();

        if (existingJob) {
          console.log(`Design job already exists for order item: ${orderItemId}`);
          return;
        }

        // Create design job with proper validation using authenticated client
        try {
          await this.createDesignJob(
            sb,
            orderItemId,
            orderItem.org_id,
            actorUserId,
            {
              title: `Auto-created design for ${orderItem.name_snapshot || 'Order Item'}`,
              statusCode: 'queued',
              priority: 5,
            }
          );
          console.log(`Auto-created design job for order item: ${orderItemId}`);
        } catch (createError) {
          console.error('Failed to auto-create design job:', createError);
        }
      }
    } catch (error) {
      // Log error but don't throw - this is a background operation
      console.error('Error handling order item status change for design jobs:', error);
    }
  }
}