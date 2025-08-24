
import { Router } from 'express';
import { supabaseAdmin } from '../../lib/supabaseAdmin.js';
import { createRequestLogger } from '../../lib/log.js';

const router = Router();

// Expected frontend schema fields
const EXPECTED_FRONTEND_FIELDS = {
  name: 'string',
  isBusiness: 'boolean', 
  brandPrimary: 'string',
  brandSecondary: 'string',
  colorPalette: 'array',
  tags: 'array',
  universalDiscounts: 'object',
  state: 'string',
  phone: 'string',
  email: 'string',
  address: 'string',
  notes: 'string'
};

// Expected database column mappings
const FIELD_TO_COLUMN_MAPPING = {
  name: 'name',
  isBusiness: 'is_business',
  brandPrimary: 'brand_primary',
  brandSecondary: 'brand_secondary', 
  colorPalette: 'color_palette',
  tags: 'tags',
  universalDiscounts: 'universal_discounts',
  state: 'state',
  phone: 'phone',
  email: 'email',
  address: 'address',
  notes: 'notes'
};

router.get('/schema-diagnostics', async (req, res) => {
  const logger = createRequestLogger(req);
  
  try {
    logger.info('🔍 STARTING COMPREHENSIVE SCHEMA DIAGNOSTICS');
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      frontend_fields: EXPECTED_FRONTEND_FIELDS,
      field_mappings: FIELD_TO_COLUMN_MAPPING,
      database_checks: {
        organizations: null,
        org_sports: null
      },
      missing_columns: [],
      compatibility_issues: [],
      recommendations: []
    };
    
    // Check organizations table structure
    logger.info('📋 CHECKING ORGANIZATIONS TABLE...');
    
    try {
      // Try to get table info using information_schema
      const { data: orgColumns, error: orgColumnsError } = await supabaseAdmin
        .rpc('get_table_columns', { table_name: 'organizations' })
        .select();
      
      if (orgColumnsError) {
        logger.warn('⚠️ Could not fetch column info via RPC, trying direct query...');
        
        // Fallback: try a simple select to see what columns exist
        const { data: sampleData, error: sampleError } = await supabaseAdmin
          .from('organizations')
          .select('*')
          .limit(1);
        
        if (sampleError) {
          logger.error('❌ ORGANIZATIONS TABLE ACCESS FAILED:', sampleError);
          diagnostics.database_checks.organizations = {
            accessible: false,
            error: sampleError.message
          };
        } else {
          const availableColumns = sampleData && sampleData.length > 0 ? Object.keys(sampleData[0]) : [];
          logger.info('✅ ORGANIZATIONS TABLE ACCESSIBLE, columns:', availableColumns);
          
          diagnostics.database_checks.organizations = {
            accessible: true,
            columns: availableColumns,
            sample_count: sampleData.length
          };
          
          // Check for missing expected columns
          Object.values(FIELD_TO_COLUMN_MAPPING).forEach(dbColumn => {
            if (!availableColumns.includes(dbColumn)) {
              diagnostics.missing_columns.push({
                table: 'organizations',
                column: dbColumn,
                frontend_field: Object.keys(FIELD_TO_COLUMN_MAPPING).find(
                  key => FIELD_TO_COLUMN_MAPPING[key] === dbColumn
                )
              });
            }
          });
        }
      } else {
        logger.info('✅ GOT ORGANIZATIONS COLUMN INFO:', orgColumns);
        diagnostics.database_checks.organizations = {
          accessible: true,
          columns: orgColumns
        };
      }
    } catch (orgError: any) {
      logger.error('❌ ORGANIZATIONS TABLE CHECK FAILED:', orgError);
      diagnostics.database_checks.organizations = {
        accessible: false,
        error: orgError.message
      };
    }
    
    // Check org_sports table structure
    logger.info('🏈 CHECKING ORG_SPORTS TABLE...');
    
    try {
      const { data: sportsData, error: sportsError } = await supabaseAdmin
        .from('org_sports')
        .select('*')
        .limit(1);
      
      if (sportsError) {
        logger.error('❌ ORG_SPORTS TABLE ACCESS FAILED:', sportsError);
        diagnostics.database_checks.org_sports = {
          accessible: false,
          error: sportsError.message
        };
        
        if (sportsError.message.includes('contact_user_id')) {
          diagnostics.missing_columns.push({
            table: 'org_sports',
            column: 'contact_user_id',
            required_for: 'sports contacts with user accounts'
          });
        }
      } else {
        const sportsColumns = sportsData && sportsData.length > 0 ? Object.keys(sportsData[0]) : [];
        logger.info('✅ ORG_SPORTS TABLE ACCESSIBLE, columns:', sportsColumns);
        
        diagnostics.database_checks.org_sports = {
          accessible: true,
          columns: sportsColumns,
          sample_count: sportsData.length
        };
        
        // Check for required org_sports columns
        const requiredSportsColumns = ['organization_id', 'sport_id', 'contact_name', 'contact_email', 'contact_user_id'];
        requiredSportsColumns.forEach(col => {
          if (!sportsColumns.includes(col)) {
            diagnostics.missing_columns.push({
              table: 'org_sports',
              column: col,
              required_for: 'sports contact management'
            });
          }
        });
      }
    } catch (sportsError: any) {
      logger.error('❌ ORG_SPORTS TABLE CHECK FAILED:', sportsError);
      diagnostics.database_checks.org_sports = {
        accessible: false,
        error: sportsError.message
      };
    }
    
    // Generate compatibility analysis
    if (diagnostics.missing_columns.length > 0) {
      diagnostics.compatibility_issues.push({
        type: 'missing_columns',
        severity: 'high',
        description: 'Required database columns are missing',
        affected_columns: diagnostics.missing_columns
      });
      
      diagnostics.recommendations.push(
        'Run database migrations to add missing columns',
        'Check if PostgREST schema cache needs to be reloaded',
        'Verify database user has proper permissions'
      );
    }
    
    // Check for camelCase vs snake_case issues
    const camelCaseIssues = Object.entries(FIELD_TO_COLUMN_MAPPING)
      .filter(([frontend, backend]) => frontend !== backend)
      .map(([frontend, backend]) => ({ frontend, backend }));
    
    if (camelCaseIssues.length > 0) {
      diagnostics.compatibility_issues.push({
        type: 'naming_convention_mismatch', 
        severity: 'medium',
        description: 'Frontend uses camelCase, database uses snake_case',
        mismatches: camelCaseIssues
      });
    }
    
    logger.info('🎯 DIAGNOSTICS COMPLETE:', diagnostics);
    
    res.json({
      success: true,
      diagnostics
    });
    
  } catch (error: any) {
    logger.error('💥 DIAGNOSTICS FAILED:', error);
    
    res.status(500).json({
      success: false,
      error: 'Diagnostics failed',
      message: error.message
    });
  }
});

export default router;
