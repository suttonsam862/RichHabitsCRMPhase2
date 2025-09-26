import { getSupabaseClient } from './client';
import { ServiceResult, success, failure, asText, asUuid } from '../../lib/id';
import pino from 'pino';

const logger = pino({ name: 'order-items-service' });

// Minimal inline types - no shared/schema imports
export interface OrderItem {
  id: string;
  org_id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  status_code: string;
  created_at: string;
  updated_at: string;
  customizations_json: any;
  size_chart_json: any;
}

export interface CreateOrderItemInput {
  org_id: string;
  order_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  product_id?: string;
  variant_id?: string;
  description?: string;
  status_code?: string;
  customizations_json?: any;
  size_chart_json?: any;
}

export interface UpdateOrderItemInput {
  name?: string;
  description?: string;
  quantity?: number;
  unit_price?: number;
  status_code?: string;
  customizations_json?: any;
  size_chart_json?: any;
}

export interface ListOrderItemsOptions {
  org_id?: string;
  order_id?: string;
  status_code?: string;
  limit?: number;
  offset?: number;
}

/**
 * List order items with optional filtering
 */
export async function listOrderItems(options: ListOrderItemsOptions = {}): Promise<ServiceResult<OrderItem[]>> {
  try {
    const supabase = getSupabaseClient();
    
    let query = supabase
      .from('order_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (options.org_id) {
      query = query.eq('org_id', asText(options.org_id));
    }

    if (options.order_id) {
      query = query.eq('order_id', asText(options.order_id));
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
      logger.debug({ error, options }, 'Error listing order items');
      return failure(`Failed to list order items: ${error.message}`);
    }

    logger.debug({ count: data?.length }, 'Successfully listed order items');
    return success(data as OrderItem[]);
  } catch (error) {
    logger.debug({ error, options }, 'Exception in listOrderItems');
    return failure(`Unexpected error listing order items: ${error}`);
  }
}

/**
 * Get order item by ID
 */
export async function getOrderItemById(id: string): Promise<ServiceResult<OrderItem>> {
  try {
    const validId = asUuid(id); // Order items use UUID
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('id', validId)
      .single();

    if (error) {
      logger.debug({ error, id: validId }, 'Error getting order item by ID');
      return failure(`Failed to get order item: ${error.message}`);
    }

    logger.debug({ id: validId }, 'Successfully retrieved order item');
    return success(data as OrderItem);
  } catch (error) {
    logger.debug({ error, id }, 'Exception in getOrderItemById');
    return failure(`Unexpected error getting order item: ${error}`);
  }
}

/**
 * Create new order item
 */
export async function createOrderItem(input: CreateOrderItemInput): Promise<ServiceResult<OrderItem>> {
  try {
    const supabase = getSupabaseClient();

    // Calculate total price
    const totalPrice = input.quantity * input.unit_price;

    const orderItemData = {
      org_id: asText(input.org_id),
      order_id: asText(input.order_id),
      product_id: input.product_id ? asUuid(input.product_id) : null,
      variant_id: input.variant_id ? asUuid(input.variant_id) : null,
      name: asText(input.name),
      description: input.description || null,
      quantity: input.quantity,
      unit_price: input.unit_price,
      total_price: totalPrice,
      status_code: input.status_code || 'pending',
      customizations_json: input.customizations_json || null,
      size_chart_json: input.size_chart_json || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('order_items')
      .insert(orderItemData)
      .select()
      .single();

    if (error) {
      logger.debug({ error, input }, 'Error creating order item');
      return failure(`Failed to create order item: ${error.message}`);
    }

    logger.debug({ id: data.id }, 'Successfully created order item');
    return success(data as OrderItem);
  } catch (error) {
    logger.debug({ error, input }, 'Exception in createOrderItem');
    return failure(`Unexpected error creating order item: ${error}`);
  }
}

/**
 * Update existing order item
 */
export async function updateOrderItem(id: string, input: UpdateOrderItemInput): Promise<ServiceResult<OrderItem>> {
  try {
    const validId = asUuid(id);
    const supabase = getSupabaseClient();

    // Recalculate total price if quantity or unit_price changed
    const updateData: any = {
      ...input,
      updated_at: new Date().toISOString()
    };

    if (input.quantity !== undefined && input.unit_price !== undefined) {
      updateData.total_price = input.quantity * input.unit_price;
    }

    const { data, error } = await supabase
      .from('order_items')
      .update(updateData)
      .eq('id', validId)
      .select()
      .single();

    if (error) {
      logger.debug({ error, id: validId, input }, 'Error updating order item');
      return failure(`Failed to update order item: ${error.message}`);
    }

    logger.debug({ id: validId }, 'Successfully updated order item');
    return success(data as OrderItem);
  } catch (error) {
    logger.debug({ error, id, input }, 'Exception in updateOrderItem');
    return failure(`Unexpected error updating order item: ${error}`);
  }
}

/**
 * Archive order item (soft delete)
 */
export async function archiveOrderItem(id: string): Promise<ServiceResult<OrderItem>> {
  try {
    const validId = asUuid(id);
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('order_items')
      .update({ 
        status_code: 'archived',
        updated_at: new Date().toISOString()
      })
      .eq('id', validId)
      .select()
      .single();

    if (error) {
      logger.debug({ error, id: validId }, 'Error archiving order item');
      return failure(`Failed to archive order item: ${error.message}`);
    }

    logger.debug({ id: validId }, 'Successfully archived order item');
    return success(data as OrderItem);
  } catch (error) {
    logger.debug({ error, id }, 'Exception in archiveOrderItem');
    return failure(`Unexpected error archiving order item: ${error}`);
  }
}