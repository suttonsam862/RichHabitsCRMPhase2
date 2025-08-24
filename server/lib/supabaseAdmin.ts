import { createClient } from '@supabase/supabase-js';
import { log } from './log';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  // Don't exit in development to allow other features to work
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const sb = supabaseUrl && supabaseServiceKey ? 
  createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }) : null;

// Export as supabaseAdmin for consistency with CR requirements
export const supabaseAdmin = sb;

/**
 * User management operations using Supabase Admin API
 * These operations bypass RLS and should only be used by Admin users
 */

export interface CreateUserRequest {
  email: string;
  password?: string;
  fullName?: string;
  phone?: string;
  emailConfirm?: boolean;
}

export interface UpdateUserRequest {
  email?: string;
  password?: string;
  fullName?: string;
  phone?: string;
}

/**
 * Create a new user via Supabase Admin API
 */
export async function createUser(userData: CreateUserRequest) {
  if (!sb) {
    throw new Error('Supabase admin client not available');
  }
  
  try {
    const { data, error } = await sb.auth.admin.createUser({
      email: userData.email,
      password: userData.password || generateRandomPassword(),
      email_confirm: userData.emailConfirm ?? true,
      user_metadata: {
        full_name: userData.fullName,
        phone: userData.phone
      }
    });
    
    if (error) {
      log.error({ error: error.message, email: userData.email }, 'Failed to create user via Supabase Admin');
      throw error;
    }
    
    log.info({ userId: data.user?.id, email: userData.email }, 'User created successfully via Supabase Admin');
    return data.user;
  } catch (error) {
    log.error({ error }, 'Error in createUser');
    throw error;
  }
}

/**
 * Update user email via Supabase Admin API
 */
export async function updateUserEmail(userId: string, newEmail: string) {
  if (!sb) {
    throw new Error('Supabase admin client not available');
  }
  
  try {
    const { data, error } = await sb.auth.admin.updateUserById(userId, {
      email: newEmail,
      email_confirm: true
    });
    
    if (error) {
      log.error({ error: error.message, userId, newEmail }, 'Failed to update user email');
      throw error;
    }
    
    log.info({ userId, newEmail }, 'User email updated successfully');
    return data.user;
  } catch (error) {
    log.error({ error, userId }, 'Error in updateUserEmail');
    throw error;
  }
}

/**
 * Reset user password via Supabase Admin API
 */
export async function resetUserPassword(userId: string, newPassword?: string) {
  if (!sb) {
    throw new Error('Supabase admin client not available');
  }
  
  try {
    const password = newPassword || generateRandomPassword();
    
    const { data, error } = await sb.auth.admin.updateUserById(userId, {
      password
    });
    
    if (error) {
      log.error({ error: error.message, userId }, 'Failed to reset user password');
      throw error;
    }
    
    log.info({ userId }, 'User password reset successfully');
    return { user: data.user, temporaryPassword: password };
  } catch (error) {
    log.error({ error, userId }, 'Error in resetUserPassword');
    throw error;
  }
}

/**
 * Delete user via Supabase Admin API
 */
export async function deleteUser(userId: string) {
  if (!sb) {
    throw new Error('Supabase admin client not available');
  }
  
  try {
    const { error } = await sb.auth.admin.deleteUser(userId);
    
    if (error) {
      log.error({ error: error.message, userId }, 'Failed to delete user');
      throw error;
    }
    
    log.info({ userId }, 'User deleted successfully');
  } catch (error) {
    log.error({ error, userId }, 'Error in deleteUser');
    throw error;
  }
}

/**
 * Get user by ID via Supabase Admin API
 */
export async function getUserById(userId: string) {
  if (!sb) {
    throw new Error('Supabase admin client not available');
  }
  
  try {
    const { data, error } = await sb.auth.admin.getUserById(userId);
    
    if (error) {
      log.error({ error: error.message, userId }, 'Failed to get user by ID');
      throw error;
    }
    
    return data.user;
  } catch (error) {
    log.error({ error, userId }, 'Error in getUserById');
    throw error;
  }
}

/**
 * Generate a secure random password
 */
function generateRandomPassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  return password;
}

/**
 * List all users via Supabase Admin API (with pagination)
 */
export async function listUsers(page: number = 1, perPage: number = 50) {
  if (!sb) {
    throw new Error('Supabase admin client not available');
  }
  
  try {
    const { data, error } = await sb.auth.admin.listUsers({
      page,
      perPage
    });
    
    if (error) {
      log.error({ error: error.message }, 'Failed to list users');
      throw error;
    }
    
    return data;
  } catch (error) {
    log.error({ error }, 'Error in listUsers');
    throw error;
  }
}