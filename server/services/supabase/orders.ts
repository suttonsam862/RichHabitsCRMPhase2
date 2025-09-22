import { getSupabaseClient } from './client';
import { ServiceResult, success, failure, validateId, asText } from '../../lib/id';
import pino from 'pino';

const logger = pino({ name: 'orders-service' });

// Type for test-compatible API
type Result<T> = { data: T | null; error: string | null };

// Minimal inline types - no shared/schema imports
export interface Order {
  id: string;
  org_id: string;
  customer_id: string;
  salesperson_id: string | null;
  sport_id: string | null;
  code: string;
  customer_contact_name: string;
  customer_contact_email: string | null;
  status_code: string;
  total_amount: number;
  total_items: number;
  created_at: string;
  updated_at: string;
  due_date: string | null;
  priority: number;
}

export interface CreateOrderInput {
  org_id: string;
  customer_id: string;
  code: string;
  customer_contact_name: string;
  customer_contact_email?: string;
  status_code?: string;
  total_amount?: number;
  total_items?: number;
  due_date?: string;
  priority?: number;
  salesperson_id?: string;
  sport_id?: string;
}

export interface UpdateOrderInput {
  customer_contact_name?: string;
  customer_contact_email?: string;
  status_code?: string;
  total_amount?: number;
  total_items?: number;
  due_date?: string;
  priority?: number;
  salesperson_id?: string;
  sport_id?: string;
}

export interface ListOrdersOptions {
  org_id?: string;
  status_code?: string;
  limit?: number;
  offset?: number;
}

/**
 * List orders with optional filtering
 */
export async function listOrders(options: ListOrdersOptions = {}): Promise<ServiceResult<Order[]>> {
  try {
    const supabase = getSupabaseClient();
    
    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (options.org_id) {
      query = query.eq('org_id', asText(options.org_id));
    }

    if (options.status_code) {
      query = query.eq('status_code', asText(options.status_code));
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      logger.debug({ error, options }, 'Error listing orders');
      return failure(`Failed to list orders: ${error.message}`);
    }

    logger.debug({ count: data?.length }, 'Successfully listed orders');
    return success(data as Order[]);
  } catch (error) {
    logger.debug({ error, options }, 'Exception in listOrders');
    return failure(`Unexpected error listing orders: ${error}`);
  }
}

/**
 * Get order by ID with tenant scoping for security
 * REQUIRED: org_id must be provided to prevent cross-tenant access
 */
export async function getOrderById(id: string, org_id: string): Promise<Result<any>> {
  try {
    const sb: any = getSupabaseClient();
    if (!sb || typeof sb.from !== 'function') {
      return { data: null, error: 'Failed to get order: database unavailable' };
    }

    const { data, error } = await sb
      .from('orders')
      .select('*')
      .eq('id', id)
      .eq('org_id', org_id)
      .single();

    if (error) {
      return { data: null, error: `Failed to get order: ${error.message ?? String(error)}` };
    }
    return { data, error: null };
  } catch (e: any) {
    return { data: null, error: `Failed to get order: ${e?.message ?? String(e)}` };
  }
}

/**
 * Create new order
 */
export async function createOrder(input: any): Promise<Result<any>> {
  try {
    const sb: any = getSupabaseClient();
    if (!sb || typeof sb.from !== 'function') {
      return { data: null, error: 'Failed to create order: database unavailable' };
    }

    const { data, error } = await sb
      .from('orders')
      .insert(input)
      .select('*')
      .single();

    if (error) {
      return { data: null, error: `Failed to create order: ${error.message ?? String(error)}` };
    }
    return { data, error: null };
  } catch (e: any) {
    return { data: null, error: `Failed to create order: ${e?.message ?? String(e)}` };
  }
}

/**
 * Update existing order
 */
export async function updateOrder(id: string, input: UpdateOrderInput): Promise<ServiceResult<Order>> {
  try {
    const validId = validateId(id);
    const supabase = getSupabaseClient();

    const updateData = {
      ...input,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', validId)
      .select()
      .single();

    if (error) {
      logger.debug({ error, id: validId, input }, 'Error updating order');
      return failure(`Failed to update order: ${error.message}`);
    }

    logger.debug({ id: validId }, 'Successfully updated order');
    return success(data as Order);
  } catch (error) {
    logger.debug({ error, id, input }, 'Exception in updateOrder');
    return failure(`Unexpected error updating order: ${error}`);
  }
}

/**
 * Archive order (soft delete)
 */
export async function archiveOrder(id: string): Promise<ServiceResult<Order>> {
  try {
    const validId = validateId(id);
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('orders')
      .update({ 
        status_code: 'archived',
        updated_at: new Date().toISOString()
      })
      .eq('id', validId)
      .select()
      .single();

    if (error) {
      logger.debug({ error, id: validId }, 'Error archiving order');
      return failure(`Failed to archive order: ${error.message}`);
    }

    logger.debug({ id: validId }, 'Successfully archived order');
    return success(data as Order);
  } catch (error) {
    logger.debug({ error, id }, 'Exception in archiveOrder');
    return failure(`Unexpected error archiving order: ${error}`);
  }
}