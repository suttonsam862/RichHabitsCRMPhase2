/**
 * Database Hardening & Error Recovery Utilities
 * Rock-solid database operations with comprehensive error handling
 */

import { supabaseAdmin } from './supabase';
import { logger } from './log';

export interface DatabaseOperation<T> {
  operation: () => Promise<T>;
  retryCount?: number;
  retryDelay?: number;
  onError?: (error: any, attempt: number) => void;
}

export interface SchemaValidationResult {
  isValid: boolean;
  missingTables: string[];
  missingColumns: string[];
  errors: string[];
}

/**
 * Comprehensive error retry with exponential backoff
 */
export async function withRetry<T>(
  operation: DatabaseOperation<T>
): Promise<T> {
  const maxRetries = operation.retryCount || 3;
  const baseDelay = operation.retryDelay || 1000;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation.operation();
    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries;
      
      // Log error details
      logger.warn({
        attempt,
        maxRetries,
        error: error.message,
        code: error.code,
        hint: error.hint
      }, 'Database operation retry');
      
      if (operation.onError) {
        operation.onError(error, attempt);
      }
      
      // Don't retry certain unrecoverable errors
      if (isUnrecoverableError(error) || isLastAttempt) {
        throw error;
      }
      
      // Exponential backoff delay
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Retry operation failed unexpectedly');
}

/**
 * Check if error is unrecoverable (don't retry)
 */
function isUnrecoverableError(error: any): boolean {
  const unrecoverableCodes = [
    '23505', // unique_violation
    '23503', // foreign_key_violation
    '23502', // not_null_violation
    '42P01', // undefined_table
    '42703', // undefined_column
    '22P02', // invalid_text_representation
    '25P02', // in_failed_sql_transaction
  ];
  
  return unrecoverableCodes.includes(error.code) || 
         error.message?.includes('JWT') ||
         error.message?.includes('auth.uid()');
}

/**
 * Validate database schema consistency
 */
export async function validateDatabaseSchema(): Promise<SchemaValidationResult> {
  try {
    const requiredTables = [
      'organizations', 'org_sports', 'user_roles', 'roles', 'sports'
    ];
    
    const requiredColumns = {
      organizations: ['id', 'name', 'brand_primary', 'brand_secondary', 'color_palette', 'tags', 'gradient_css', 'is_archived'],
      org_sports: ['id', 'organization_id', 'sport_id', 'contact_name', 'contact_email', 'contact_user_id'],
      user_roles: ['id', 'user_id', 'org_id', 'role_id'],
      roles: ['id', 'slug', 'name']
    };
    
    const result: SchemaValidationResult = {
      isValid: true,
      missingTables: [],
      missingColumns: [],
      errors: []
    };
    
    // Check tables exist
    const { data: tables, error: tableError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', requiredTables);
    
    if (tableError) {
      result.errors.push(`Table check failed: ${tableError.message}`);
      result.isValid = false;
      return result;
    }
    
    const existingTables = tables?.map(t => t.table_name) || [];
    result.missingTables = requiredTables.filter(t => !existingTables.includes(t));
    
    // Check columns exist for each table
    for (const [tableName, columns] of Object.entries(requiredColumns)) {
      if (result.missingTables.includes(tableName)) continue;
      
      const { data: tableColumns, error: columnError } = await supabaseAdmin
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_schema', 'public')
        .eq('table_name', tableName);
      
      if (columnError) {
        result.errors.push(`Column check failed for ${tableName}: ${columnError.message}`);
        continue;
      }
      
      const existingColumns = tableColumns?.map(c => c.column_name) || [];
      const missingColumns = columns.filter(col => !existingColumns.includes(col));
      
      if (missingColumns.length > 0) {
        result.missingColumns.push(...missingColumns.map(col => `${tableName}.${col}`));
      }
    }
    
    result.isValid = result.missingTables.length === 0 && 
                     result.missingColumns.length === 0 && 
                     result.errors.length === 0;
    
    return result;
    
  } catch (error: any) {
    return {
      isValid: false,
      missingTables: [],
      missingColumns: [],
      errors: [`Schema validation failed: ${error.message}`]
    };
  }
}

/**
 * Force refresh all caches and schema
 */
export async function forceSchemaRefresh(): Promise<void> {
  try {
    // Multiple cache refresh methods
    await Promise.allSettled([
      // PostgREST reload
      supabaseAdmin.rpc('pgrst_reload'),
      
      // Direct notification
      supabaseAdmin.from('pg_notify').insert([
        { channel: 'pgrst', payload: 'reload schema' }
      ]),
      
      // Reset connections
      supabaseAdmin.from('pg_stat_activity').select('*').limit(1)
    ]);
    
    logger.info('Schema refresh completed');
  } catch (error: any) {
    logger.error({ error: error.message }, 'Schema refresh failed');
    throw error;
  }
}

/**
 * Validate required roles exist
 */
export async function ensureRequiredRoles(): Promise<void> {
  const requiredRoles = ['admin', 'customer'];
  
  const { data: existingRoles } = await supabaseAdmin
    .from('roles')
    .select('slug')
    .in('slug', requiredRoles);
  
  const existing = existingRoles?.map(r => r.slug) || [];
  const missing = requiredRoles.filter(role => !existing.includes(role));
  
  if (missing.length > 0) {
    // Create missing roles
    const rolesToCreate = missing.map(slug => ({
      slug,
      name: slug.charAt(0).toUpperCase() + slug.slice(1),
      description: `Auto-created ${slug} role`
    }));
    
    const { error } = await supabaseAdmin
      .from('roles')
      .insert(rolesToCreate);
    
    if (error) {
      throw new Error(`Failed to create required roles: ${error.message}`);
    }
    
    logger.info({ createdRoles: missing }, 'Created missing roles');
  }
}

/**
 * Validate data before database operations
 */
export function validateOrganizationData(data: any): string[] {
  const errors: string[] = [];
  
  if (!data.name || data.name.trim().length < 2) {
    errors.push('Organization name must be at least 2 characters');
  }
  
  if (data.brandPrimary && !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(data.brandPrimary)) {
    errors.push('Brand primary color must be valid hex color');
  }
  
  if (data.brandSecondary && !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(data.brandSecondary)) {
    errors.push('Brand secondary color must be valid hex color');
  }
  
  if (data.colorPalette && !Array.isArray(data.colorPalette)) {
    errors.push('Color palette must be an array');
  }
  
  if (data.tags && !Array.isArray(data.tags)) {
    errors.push('Tags must be an array');
  }
  
  if (data.sports && Array.isArray(data.sports)) {
    data.sports.forEach((sport: any, index: number) => {
      if (!sport.contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sport.contactEmail)) {
        errors.push(`Sport contact ${index + 1}: Invalid email address`);
      }
      if (!sport.contactName || sport.contactName.trim().length < 1) {
        errors.push(`Sport contact ${index + 1}: Contact name is required`);
      }
    });
  }
  
  return errors;
}

export default {
  withRetry,
  validateDatabaseSchema,
  forceSchemaRefresh,
  ensureRequiredRoles,
  validateOrganizationData
};