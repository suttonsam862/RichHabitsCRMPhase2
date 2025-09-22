import { getSupabaseClient } from './supabase/client';

type Result<T> = { data: T | null; error: string | null };

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

export async function getOrderById(id: string, orgId: string): Promise<Result<any>> {
  try {
    const sb: any = getSupabaseClient();
    if (!sb || typeof sb.from !== 'function') {
      return { data: null, error: 'Failed to get order: database unavailable' };
    }

    const { data, error } = await sb
      .from('orders')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (error) {
      return { data: null, error: `Failed to get order: ${error.message ?? String(error)}` };
    }
    return { data, error: null };
  } catch (e: any) {
    return { data: null, error: `Failed to get order: ${e?.message ?? String(e)}` };
  }
}