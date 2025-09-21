import { createClient, SupabaseClient } from '@supabase/supabase-js';
import pino from 'pino';

const logger = pino({ name: 'supabase-client' });

// Singleton Supabase client instance
let supabaseClient: SupabaseClient | null = null;

/**
 * Creates a Supabase client using DEV environment variables ONLY
 * No fallbacks to production - will throw if dev env vars are missing
 */
function createSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    const error = 'SUPABASE_URL environment variable is required for dev environment';
    logger.error(error);
    throw new Error(error);
  }

  if (!serviceKey) {
    const error = 'SUPABASE_SERVICE_ROLE_KEY environment variable is required for dev environment';
    logger.error(error);
    throw new Error(error);
  }

  logger.debug({ url: url.substring(0, 30) + '...' }, 'Creating Supabase client for dev environment');

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Returns the singleton Supabase client instance
 * Creates it on first access
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createSupabaseClient();
  }
  return supabaseClient;
}

/**
 * Type-safe Supabase client with proper typing
 */
export type TypedSupabaseClient = SupabaseClient;