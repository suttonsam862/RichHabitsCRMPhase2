
import { supabaseAdmin } from './supabaseAdmin.js';
import { logger } from './log.js';

export async function reloadPostgrestSchemaCache() {
  try {
    // Method 1: Try using NOTIFY
    const { error: notifyError } = await supabaseAdmin
      .rpc('notify_schema_reload');
    
    if (notifyError) {
      // Method 2: Try direct SQL
      const { error: sqlError } = await supabaseAdmin
        .from('pg_notify')
        .insert([{ channel: 'pgrst', payload: 'reload schema' }]);
      
      if (sqlError) {
        return { success: false, error: sqlError };
      }
    }
    
    return { success: true };
    
  } catch (error: any) {
    return { success: false, error };
  }
}

export async function checkSchemaCache() {
  try {
    
    // Test if we can access the organizations table with expected columns
    const testColumns = [
      'id', 'name', 'brand_primary', 'brand_secondary', 
      'color_palette', 'universal_discounts', 'is_business'
    ];
    
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select(testColumns.join(', '))
      .limit(1);
    
    if (error) {
      logger.error('❌ SCHEMA CACHE CHECK FAILED:', error);
      
      // Analyze which columns are missing
      const missingColumns = [];
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        const missingColumn = error.message.match(/column "([^"]+)" does not exist/)?.[1];
        if (missingColumn) {
          missingColumns.push(missingColumn);
        }
      }
      
      return { 
        isValid: false, 
        error, 
        missingColumns,
        suggestion: 'Schema cache may be stale. Try reloading it.'
      };
    }
    
    logger.info('✅ SCHEMA CACHE CHECK PASSED');
    return { isValid: true, data };
    
  } catch (error: any) {
    logger.error('💥 SCHEMA CACHE CHECK FAILED:', error);
    return { isValid: false, error };
  }
}
