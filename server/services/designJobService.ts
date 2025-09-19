/**
 * Design Job Service
 * Handles creation, updates, and lifecycle management of design jobs
 * SECURITY: All methods require authenticated Supabase clients passed from callers to enforce RLS
 * NO ADMIN CLIENT USAGE - All operations use user-scoped clients with proper org validation
 */

import type { 
  CreateDesignJobType, 
  UpdateDesignJobType,
  CreateDesignJobEventType,
  DesignJobType 
} from '../../shared/dtos';
import type { SupabaseClient } from '@supabase/supabase-js';

export class DesignJobService {
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
      if (!result.success) {
        const errorMessage = result.error_message || 'Unknown error in atomic status update';
        
        // Handle access denied errors specifically for better error reporting
        if (errorMessage.includes('Access denied') || 
            errorMessage.includes('not a member') || 
            errorMessage.includes('Organization mismatch')) {
          throw new Error(`Access denied: ${errorMessage}`);
        }
        
        throw new Error(errorMessage);
      }

      // Return the updated design job data
      return {
        id: result.id,
        orgId: result.org_id,
        orderItemId: result.order_item_id,
        title: result.title,
        brief: result.brief,
        priority: result.priority,
        statusCode: result.status_code,
        assigneeDesignerId: result.assignee_designer_id,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
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
      'drafting': ['review', 'assigned', 'canceled'],
      'review': ['approved', 'rejected', 'drafting'],
      'approved': [], // terminal
      'rejected': ['drafting', 'canceled'],
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