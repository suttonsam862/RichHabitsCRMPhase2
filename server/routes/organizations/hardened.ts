
import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../lib/supabaseAdmin.js';
import { createRequestLogger } from '../../lib/log.js';
import { AuthedRequest } from '../middleware/asyncHandler.js';

const router = Router();

// Enhanced schema with detailed validation
const CreateOrganizationSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(120),
  isBusiness: z.boolean().default(false),
  brandPrimary: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Brand primary must be a valid hex color").optional(),
  brandSecondary: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Brand secondary must be a valid hex color").optional(),
  colorPalette: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  state: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  universalDiscounts: z.record(z.unknown()).default({}),
  sports: z.array(z.object({
    sportId: z.string().uuid(),
    contactName: z.string(),
    contactEmail: z.string().email(),
    contactPhone: z.string().optional()
  })).default([])
});

type CreateOrganizationRequest = z.infer<typeof CreateOrganizationSchema>;

// Column mapping function to convert camelCase to snake_case
function mapFieldsToDbColumns(data: CreateOrganizationRequest, req?: any) {
  // Create a mock request object if not provided
  const mockReq = req || { 
    method: 'POST', 
    url: '/organizations/field-mapping',
    headers: {
      'user-agent': 'Field Mapper'
    }
  };
  const logger = createRequestLogger(mockReq);
  
  logger.info('🔍 FIELD MAPPING DIAGNOSTICS - Input data:', data);
  
  const dbPayload: Record<string, any> = {
    name: data.name,
    is_business: data.isBusiness,
    brand_primary: data.brandPrimary || null,
    brand_secondary: data.brandSecondary || null,
    color_palette: JSON.stringify(data.colorPalette || []),
    tags: data.tags || [],
    state: data.state || null,
    phone: data.phone || null,
    email: data.email || null,
    address: data.address || null,
    notes: data.notes || null,
    universal_discounts: data.universalDiscounts || {},
    status: 'active',
    is_archived: false
  };

  logger.info('🔄 FIELD MAPPING - Converted payload:', dbPayload);
  
  // Log each mapping
  const mappings = [
    { frontend: 'isBusiness', backend: 'is_business', value: data.isBusiness },
    { frontend: 'brandPrimary', backend: 'brand_primary', value: data.brandPrimary },
    { frontend: 'brandSecondary', backend: 'brand_secondary', value: data.brandSecondary },
    { frontend: 'colorPalette', backend: 'color_palette', value: data.colorPalette },
    { frontend: 'universalDiscounts', backend: 'universal_discounts', value: data.universalDiscounts }
  ];
  
  mappings.forEach(mapping => {
    logger.info(`📋 MAPPING: ${mapping.frontend} → ${mapping.backend}`, { 
      originalValue: mapping.value,
      mappedValue: dbPayload[mapping.backend]
    });
  });

  return dbPayload;
}

// Function to validate database schema before insertion
async function validateDatabaseSchema(req?: any) {
  // Create a mock request object if not provided
  const mockReq = req || { 
    method: 'GET', 
    url: '/organizations/schema-check',
    headers: {
      'user-agent': 'Schema Validator'
    }
  };
  const logger = createRequestLogger(mockReq);
  
  try {
    logger.info('🔍 SCHEMA VALIDATION - Checking organizations table structure...');
    
    // Check if we can query the table structure
    const { data: schemaInfo, error: schemaError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .limit(1);
    
    if (schemaError) {
      logger.error('❌ SCHEMA ERROR:', schemaError);
      return { isValid: false, error: schemaError };
    }
    
    logger.info('✅ SCHEMA VALIDATION - Organizations table accessible');
    
    // Test required columns by attempting a dry-run insert with minimal data
    const testPayload = {
      name: '__SCHEMA_TEST__',
      is_business: false,
      status: 'active',
      is_archived: false,
      universal_discounts: {},
      tags: [],
      color_palette: '[]'
    };
    
    logger.info('🧪 SCHEMA TEST - Testing column compatibility:', testPayload);
    
    // This will fail if columns don't exist, but we catch and analyze the error
    const { data: testData, error: testError } = await supabaseAdmin
      .from('organizations')
      .insert([testPayload])
      .select()
      .single();
    
    if (testError) {
      logger.error('❌ SCHEMA TEST FAILED:', testError);
      
      // Analyze the error to identify missing columns
      if (testError.message.includes('column') && testError.message.includes('does not exist')) {
        const missingColumn = testError.message.match(/column "([^"]+)" does not exist/)?.[1];
        logger.error(`🚨 MISSING COLUMN DETECTED: ${missingColumn}`);
      }
      
      return { isValid: false, error: testError, missingColumn: testError.message };
    }
    
    // Clean up test data
    if (testData?.id) {
      await supabaseAdmin
        .from('organizations')
        .delete()
        .eq('id', testData.id);
      logger.info('🧹 CLEANUP - Removed test organization');
    }
    
    logger.info('✅ SCHEMA VALIDATION - All columns compatible');
    return { isValid: true };
    
  } catch (error: any) {
    logger.error('❌ SCHEMA VALIDATION FAILED:', error);
    return { isValid: false, error };
  }
}

// Function to validate and prepare sports data
function prepareSportsData(sports: CreateOrganizationRequest['sports'], orgId: string, req?: any) {
  // Create a mock request object if not provided
  const mockReq = req || { 
    method: 'POST', 
    url: '/organizations/sports-prep',
    headers: {
      'user-agent': 'Sports Prep'
    }
  };
  const logger = createRequestLogger(mockReq);
  
  logger.info('🏈 SPORTS PREP - Processing sports contacts:', sports);
  
  const sportsPayload = sports.map((sport, index) => {
    const sportData = {
      organization_id: orgId,
      sport_id: sport.sportId,
      contact_name: sport.contactName,
      contact_email: sport.contactEmail,
      contact_phone: sport.contactPhone || null,
      contact_user_id: null // This will be set when user is created
    };
    
    logger.info(`🏈 SPORT ${index + 1}:`, sportData);
    return sportData;
  });
  
  logger.info('🏈 SPORTS PREP COMPLETE - Prepared data:', sportsPayload);
  return sportsPayload;
}

// GET route to list organizations - HARDENED IMPLEMENTATION
router.get('/', async (req, res) => {
  const logger = createRequestLogger(req);
  
  try {
    logger.info('🏢 HARDENED ORGANIZATIONS LIST REQUEST');
    
    // Import the hardened service
    const { OrganizationsService } = await import('../../services/OrganizationsService.js');
    
    // Extract query parameters
    const {
      q = '',
      tag = '',
      onlyFavorites = 'false',
      includeArchived = 'false',
      sort = 'updated',
      dir = 'desc',
      limit = 24,
      offset = 0
    } = req.query;

    // Use hardened service
    const result = await OrganizationsService.listOrganizations({
      q: q as string,
      tag: tag as string,
      onlyFavorites: onlyFavorites as string,
      includeArchived: includeArchived as string,
      sort: sort as string,
      dir: dir as string,
      limit: parseInt(limit as string) || 24,
      offset: parseInt(offset as string) || 0
    }, req);

    if (!result.success) {
      logger.error('❌ SERVICE FAILED:', result.error);
      return res.status(500).json(result);
    }

    logger.info(`✅ HARDENED SERVICE SUCCESS: ${result.data?.length} organizations`);

    return res.json(result);

  } catch (error: any) {
    logger.error('💥 ROUTE ERROR:', error);
    return res.status(500).json({
      success: false,
      error: 'Route handler error',
      message: error.message
    });
  }
});

// GET route to fetch single organization by ID - HARDENED IMPLEMENTATION
router.get('/:id', async (req, res) => {
  const logger = createRequestLogger(req);
  
  try {
    logger.info('🏢 HARDENED ORGANIZATION GET BY ID REQUEST');
    
    const { id } = req.params;
    
    if (!id) {
      logger.error('❌ Missing organization ID');
      return res.status(400).json({
        success: false,
        error: 'Organization ID is required'
      });
    }
    
    // Import the hardened service
    const { OrganizationsService } = await import('../../services/OrganizationsService.js');
    
    // Use hardened service to get organization by ID
    const result = await OrganizationsService.getOrganizationById(id, req);

    if (!result.success) {
      if (result.error === 'Organization not found') {
        logger.info(`📭 Organization not found: ${id}`);
        return res.status(404).json(result);
      }
      
      logger.error('❌ SERVICE FAILED:', result.error);
      return res.status(500).json(result);
    }

    logger.info(`✅ HARDENED SERVICE SUCCESS: Found organization ${id}`);

    return res.json(result);

  } catch (error: any) {
    logger.error('💥 ROUTE ERROR:', error);
    return res.status(500).json({
      success: false,
      error: 'Route handler error',
      message: error.message
    });
  }
});

router.post('/', async (req, res) => {
  const logger = createRequestLogger(req);
  
  try {
    logger.info('🚀 ORGANIZATION CREATION STARTED');
    logger.info('📨 Raw request body:', req.body);
    
    // Step 1: Validate input schema
    logger.info('1️⃣ VALIDATING INPUT SCHEMA...');
    const validation = CreateOrganizationSchema.safeParse(req.body);
    
    if (!validation.success) {
      logger.error('❌ VALIDATION FAILED:', validation.error.errors);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors
      });
    }
    
    const validatedData = validation.data;
    logger.info('✅ INPUT VALIDATION PASSED:', validatedData);
    
    // Step 2: Check database schema compatibility
    logger.info('2️⃣ CHECKING DATABASE SCHEMA...');
    const schemaCheck = await validateDatabaseSchema(req);
    
    if (!schemaCheck.isValid) {
      logger.error('❌ SCHEMA INCOMPATIBILITY DETECTED:', schemaCheck);
      return res.status(500).json({
        success: false,
        error: 'Database schema incompatibility',
        details: schemaCheck.error,
        suggestion: 'Run database migration to add missing columns'
      });
    }
    
    logger.info('✅ SCHEMA COMPATIBILITY CONFIRMED');
    
    // Step 3: Map frontend fields to database columns
    logger.info('3️⃣ MAPPING FIELDS TO DATABASE COLUMNS...');
    const dbPayload = mapFieldsToDbColumns(validatedData, req);
    
    // Step 4: Create organization
    logger.info('4️⃣ CREATING ORGANIZATION...');
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert([dbPayload])
      .select('id, name, created_at')
      .single();
    
    if (orgError) {
      logger.error('❌ ORGANIZATION CREATION FAILED:', orgError);
      
      // Provide specific error analysis
      if (orgError.message.includes('column') && orgError.message.includes('does not exist')) {
        const missingColumn = orgError.message.match(/column "([^"]+)" does not exist/)?.[1];
        logger.error(`🚨 MISSING COLUMN: ${missingColumn}`);
        
        return res.status(500).json({
          success: false,
          error: `Database column missing: ${missingColumn}`,
          message: `The database is missing the '${missingColumn}' column. Please run migrations.`,
          code: 'MISSING_COLUMN'
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Failed to create organization',
        details: orgError
      });
    }
    
    logger.info('✅ ORGANIZATION CREATED:', orgData);
    
    // Step 5: Handle sports contacts if any
    if (validatedData.sports.length > 0) {
      logger.info('5️⃣ PROCESSING SPORTS CONTACTS...');
      const sportsPayload = prepareSportsData(validatedData.sports, orgData.id, req);
      
      const { data: sportsData, error: sportsError } = await supabaseAdmin
        .from('org_sports')
        .insert(sportsPayload)
        .select();
      
      if (sportsError) {
        logger.error('❌ SPORTS CREATION FAILED:', sportsError);
        
        // Check for org_sports column issues
        if (sportsError.message.includes('column') && sportsError.message.includes('does not exist')) {
          const missingColumn = sportsError.message.match(/column "([^"]+)" does not exist/)?.[1];
          logger.error(`🚨 MISSING ORG_SPORTS COLUMN: ${missingColumn}`);
        }
        
        // Organization was created, but sports failed - log this
        logger.warn('⚠️ Organization created but sports contacts failed. Manual cleanup may be needed.');
        
        return res.status(500).json({
          success: false,
          error: 'Organization created but sports contacts failed',
          organizationId: orgData.id,
          sportsError: sportsError
        });
      }
      
      logger.info('✅ SPORTS CONTACTS CREATED:', sportsData);
    }
    
    // Step 6: Success response
    logger.info('🎉 ORGANIZATION CREATION COMPLETED SUCCESSFULLY');
    
    return res.status(201).json({
      success: true,
      data: {
        id: orgData.id,
        name: orgData.name,
        createdAt: orgData.created_at
      }
    });
    
  } catch (error: any) {
    logger.error('💥 UNEXPECTED ERROR:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      stack: error.stack
    });
  }
});

export default router;
