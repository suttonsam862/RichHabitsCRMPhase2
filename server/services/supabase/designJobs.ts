import { getSupabaseClient } from './client';
import { ServiceResult, success, failure, validateId, asText, asUuid } from '../../lib/id';
import pino from 'pino';

const logger = pino({ name: 'design-jobs-service' });

// Minimal inline types - no shared/schema imports
export interface DesignJob {
  id: string;
  org_id: string;
  order_item_id: string;
  title: string | null;
  brief: string | null;
  priority: number | null;
  status_code: string | null;
  assignee_designer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDesignJobInput {
  org_id: string;
  order_item_id: string;
  title?: string;
  brief?: string;
  priority?: number;
  status_code?: string;
  assignee_designer_id?: string;
}

export interface UpdateDesignJobInput {
  title?: string;
  brief?: string;
  priority?: number;
  status_code?: string;
  assignee_designer_id?: string;
}

export interface ListDesignJobsOptions {
  org_id?: string;
  status_code?: string;
  assignee_designer_id?: string;
  limit?: number;
  offset?: number;
}

/**
 * List design jobs with optional filtering
 */
export async function listDesignJobs(options: ListDesignJobsOptions = {}): Promise<ServiceResult<DesignJob[]>> {
  try {
    const supabase = getSupabaseClient();
    
    let query = supabase
      .from('design_jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (options.org_id) {
      query = query.eq('org_id', asText(options.org_id));
    }

    if (options.status_code) {
      query = query.eq('status_code', asText(options.status_code));
    }

    if (options.assignee_designer_id) {
      query = query.eq('assignee_designer_id', asUuid(options.assignee_designer_id));
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      logger.debug({ error, options }, 'Error listing design jobs');
      return failure(`Failed to list design jobs: ${error.message}`);
    }

    logger.debug({ count: data?.length }, 'Successfully listed design jobs');
    return success(data as DesignJob[]);
  } catch (error) {
    logger.debug({ error, options }, 'Exception in listDesignJobs');
    return failure(`Unexpected error listing design jobs: ${error}`);
  }
}

/**
 * Get design job by ID
 */
export async function getDesignJobById(id: string): Promise<ServiceResult<DesignJob>> {
  try {
    const validId = asUuid(id); // Design jobs use UUID
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('design_jobs')
      .select('*')
      .eq('id', validId)
      .single();

    if (error) {
      logger.debug({ error, id: validId }, 'Error getting design job by ID');
      return failure(`Failed to get design job: ${error.message}`);
    }

    logger.debug({ id: validId }, 'Successfully retrieved design job');
    return success(data as DesignJob);
  } catch (error) {
    logger.debug({ error, id }, 'Exception in getDesignJobById');
    return failure(`Unexpected error getting design job: ${error}`);
  }
}

/**
 * Create new design job
 */
export async function createDesignJob(input: CreateDesignJobInput): Promise<ServiceResult<DesignJob>> {
  try {
    const supabase = getSupabaseClient();

    const designJobData = {
      org_id: asText(input.org_id),
      order_item_id: asUuid(input.order_item_id),
      title: input.title || null,
      brief: input.brief || null,
      priority: input.priority || 5,
      status_code: input.status_code || 'pending',
      assignee_designer_id: input.assignee_designer_id ? asUuid(input.assignee_designer_id) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('design_jobs')
      .insert(designJobData)
      .select()
      .single();

    if (error) {
      logger.debug({ error, input }, 'Error creating design job');
      return failure(`Failed to create design job: ${error.message}`);
    }

    logger.debug({ id: data.id }, 'Successfully created design job');
    return success(data as DesignJob);
  } catch (error) {
    logger.debug({ error, input }, 'Exception in createDesignJob');
    return failure(`Unexpected error creating design job: ${error}`);
  }
}

/**
 * Update existing design job
 */
export async function updateDesignJob(id: string, input: UpdateDesignJobInput): Promise<ServiceResult<DesignJob>> {
  try {
    const validId = asUuid(id);
    const supabase = getSupabaseClient();

    const updateData = {
      ...input,
      assignee_designer_id: input.assignee_designer_id ? asUuid(input.assignee_designer_id) : undefined,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('design_jobs')
      .update(updateData)
      .eq('id', validId)
      .select()
      .single();

    if (error) {
      logger.debug({ error, id: validId, input }, 'Error updating design job');
      return failure(`Failed to update design job: ${error.message}`);
    }

    logger.debug({ id: validId }, 'Successfully updated design job');
    return success(data as DesignJob);
  } catch (error) {
    logger.debug({ error, id, input }, 'Exception in updateDesignJob');
    return failure(`Unexpected error updating design job: ${error}`);
  }
}

/**
 * Archive design job (soft delete)
 */
export async function archiveDesignJob(id: string): Promise<ServiceResult<DesignJob>> {
  try {
    const validId = asUuid(id);
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('design_jobs')
      .update({ 
        status_code: 'archived',
        updated_at: new Date().toISOString()
      })
      .eq('id', validId)
      .select()
      .single();

    if (error) {
      logger.debug({ error, id: validId }, 'Error archiving design job');
      return failure(`Failed to archive design job: ${error.message}`);
    }

    logger.debug({ id: validId }, 'Successfully archived design job');
    return success(data as DesignJob);
  } catch (error) {
    logger.debug({ error, id }, 'Exception in archiveDesignJob');
    return failure(`Unexpected error archiving design job: ${error}`);
  }
}