import { createClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * Create Supabase client for user requests with specific access token
 */
export function supabaseForUser(accessToken?: string) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
    }
  });
}

/**
 * Supabase admin client for server-side operations
 */
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

/**
 * Helper to extract access token from Authorization header
 */
export function extractAccessToken(authHeader?: string): string | undefined {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return undefined;
  }
  return authHeader.slice('Bearer '.length);
}