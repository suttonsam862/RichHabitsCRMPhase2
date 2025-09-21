import { getSupabaseClient } from './client';
import { ServiceResult, success, failure, validateId, asText } from '../../lib/id';
import pino from 'pino';

const logger = pino({ name: 'organizations-service' });

// Minimal inline types - no shared/schema imports
export interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  state: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  contact_email: string | null;
  phone: string | null;
}

export interface CreateOrganizationInput {
  name: string;
  state?: string;
  address?: string;
  contact_email?: string;
  phone?: string;
  logo_url?: string;
  is_active?: boolean;
}

export interface UpdateOrganizationInput {
  name?: string;
  state?: string;
  address?: string;
  contact_email?: string;
  phone?: string;
  logo_url?: string;
  is_active?: boolean;
}

export interface ListOrganizationsOptions {
  is_active?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * List organizations with optional filtering
 */
export async function listOrganizations(options: ListOrganizationsOptions = {}): Promise<ServiceResult<Organization[]>> {
  try {
    const supabase = getSupabaseClient();
    
    let query = supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (options.is_active !== undefined) {
      query = query.eq('is_active', options.is_active);
    }

    if (options.search) {
      const searchTerm = asText(options.search);
      query = query.or(`name.ilike.%${searchTerm}%,state.ilike.%${searchTerm}%`);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      logger.debug({ error, options }, 'Error listing organizations');
      return failure(`Failed to list organizations: ${error.message}`);
    }

    logger.debug({ count: data?.length }, 'Successfully listed organizations');
    return success(data as Organization[]);
  } catch (error) {
    logger.debug({ error, options }, 'Exception in listOrganizations');
    return failure(`Unexpected error listing organizations: ${error}`);
  }
}

/**
 * Get organization by ID
 */
export async function getOrganizationById(id: string): Promise<ServiceResult<Organization>> {
  try {
    const validId = validateId(id);
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', validId)
      .single();

    if (error) {
      logger.debug({ error, id: validId }, 'Error getting organization by ID');
      return failure(`Failed to get organization: ${error.message}`);
    }

    logger.debug({ id: validId }, 'Successfully retrieved organization');
    return success(data as Organization);
  } catch (error) {
    logger.debug({ error, id }, 'Exception in getOrganizationById');
    return failure(`Unexpected error getting organization: ${error}`);
  }
}

/**
 * Create new organization
 */
export async function createOrganization(input: CreateOrganizationInput): Promise<ServiceResult<Organization>> {
  try {
    const supabase = getSupabaseClient();

    const organizationData = {
      name: asText(input.name),
      state: input.state || null,
      address: input.address || null,
      contact_email: input.contact_email || null,
      phone: input.phone || null,
      logo_url: input.logo_url || null,
      is_active: input.is_active !== undefined ? input.is_active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('organizations')
      .insert(organizationData)
      .select()
      .single();

    if (error) {
      logger.debug({ error, input }, 'Error creating organization');
      return failure(`Failed to create organization: ${error.message}`);
    }

    logger.debug({ id: data.id }, 'Successfully created organization');
    return success(data as Organization);
  } catch (error) {
    logger.debug({ error, input }, 'Exception in createOrganization');
    return failure(`Unexpected error creating organization: ${error}`);
  }
}

/**
 * Update existing organization
 */
export async function updateOrganization(id: string, input: UpdateOrganizationInput): Promise<ServiceResult<Organization>> {
  try {
    const validId = validateId(id);
    const supabase = getSupabaseClient();

    const updateData = {
      ...input,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', validId)
      .select()
      .single();

    if (error) {
      logger.debug({ error, id: validId, input }, 'Error updating organization');
      return failure(`Failed to update organization: ${error.message}`);
    }

    logger.debug({ id: validId }, 'Successfully updated organization');
    return success(data as Organization);
  } catch (error) {
    logger.debug({ error, id, input }, 'Exception in updateOrganization');
    return failure(`Unexpected error updating organization: ${error}`);
  }
}

/**
 * Archive organization (soft delete)
 */
export async function archiveOrganization(id: string): Promise<ServiceResult<Organization>> {
  try {
    const validId = validateId(id);
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('organizations')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', validId)
      .select()
      .single();

    if (error) {
      logger.debug({ error, id: validId }, 'Error archiving organization');
      return failure(`Failed to archive organization: ${error.message}`);
    }

    logger.debug({ id: validId }, 'Successfully archived organization');
    return success(data as Organization);
  } catch (error) {
    logger.debug({ error, id }, 'Exception in archiveOrganization');
    return failure(`Unexpected error archiving organization: ${error}`);
  }
}