import { supabaseAdmin, supabaseForUser } from '../../lib/supabase';

/** Return a Supabase client; tests may mock this module. */
export function getSupabaseClient(token?: string) {
  if (token) return supabaseForUser(token);
  return supabaseAdmin;
}

export const getAdminClient = () => supabaseAdmin;
