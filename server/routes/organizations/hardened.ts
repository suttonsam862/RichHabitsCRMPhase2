
import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../lib/supabaseAdmin.js';
import { logger } from '../../lib/log.js';
import { logSbError } from '../../lib/dbLog.js';
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
function mapFieldsToDbColumns(data: CreateOrganizationRequest) {
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

  return dbPayload;
}

// Simple schema validation function
async function validateDatabaseSchema() {
  try {
    // Quick check if table is accessible
    const { error: schemaError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .limit(1);
    
    return { isValid: !schemaError, error: schemaError };
  } catch (error: any) {
    return { isValid: false, error };
  }
}

// Prepare sports data for insertion
function prepareSportsData(sports: CreateOrganizationRequest['sports'], orgId: string) {
  return sports.map(sport => ({
    organization_id: orgId,
    sport_id: sport.sportId,
    contact_name: sport.contactName,
    contact_email: sport.contactEmail,
    contact_phone: sport.contactPhone || null,
    contact_user_id: null
  }));
}

// GET route to list organizations - HARDENED IMPLEMENTATION
router.get('/', async (req, res) => {
  try {
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
      logSbError(req, 'orgs.list', result.error);
      return res.status(500).json(result);
    }

    // Single summary log after successful fetch
    const rid = (res as any).locals?.rid;
    logger.info({ rid, count: result.data?.length }, 'organizations.list ok');

    return res.json(result);

  } catch (error: any) {
    logSbError(req, 'orgs.list.route', error);
    return res.status(500).json({
      success: false,
      error: 'Route handler error',
      message: error.message
    });
  }
});

// GET route to fetch single organization by ID - HARDENED IMPLEMENTATION
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
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
        return res.status(404).json(result);
      }
      
      logSbError(req, 'orgs.getById', result.error);
      return res.status(500).json(result);
    }

    return res.json(result);

  } catch (error: any) {
    logSbError(req, 'orgs.getById.route', error);
    return res.status(500).json({
      success: false,
      error: 'Route handler error',
      message: error.message
    });
  }
});

router.post('/', async (req, res) => {
  try {
    // Validate input schema
    const validation = CreateOrganizationSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors
      });
    }
    
    const validatedData = validation.data;
    
    // Check database schema compatibility
    const schemaCheck = await validateDatabaseSchema();
    
    if (!schemaCheck.isValid) {
      logSbError(req, 'orgs.create.schema', schemaCheck.error);
      return res.status(500).json({
        success: false,
        error: 'Database schema incompatibility',
        details: schemaCheck.error,
        suggestion: 'Run database migration to add missing columns'
      });
    }
    
    // Map frontend fields to database columns
    const dbPayload = mapFieldsToDbColumns(validatedData);
    
    // Create organization
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert([dbPayload])
      .select('id, name, created_at')
      .single();
    
    if (orgError) {
      logSbError(req, 'orgs.create.insert', orgError);
      
      // Provide specific error analysis
      if (orgError.message.includes('column') && orgError.message.includes('does not exist')) {
        const missingColumn = orgError.message.match(/column "([^"]+)" does not exist/)?.[1];
        
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
    
    // Handle sports contacts if any
    if (validatedData.sports.length > 0) {
      const sportsPayload = prepareSportsData(validatedData.sports, orgData.id);
      
      const { data: sportsData, error: sportsError } = await supabaseAdmin
        .from('org_sports')
        .insert(sportsPayload)
        .select();
      
      if (sportsError) {
        logSbError(req, 'orgs.create.sports', sportsError);
        
        return res.status(500).json({
          success: false,
          error: 'Organization created but sports contacts failed',
          organizationId: orgData.id,
          sportsError: sportsError
        });
      }
    }
    
    return res.status(201).json({
      success: true,
      data: {
        id: orgData.id,
        name: orgData.name,
        createdAt: orgData.created_at
      }
    });
    
  } catch (error: any) {
    logSbError(req, 'orgs.create.route', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      stack: error.stack
    });
  }
});

// DELETE route to delete an organization - HARDENED IMPLEMENTATION
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid organization ID format'
      });
    }

    // Check if organization exists first
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      });
    }

    // Delete related org_sports first (foreign key constraint)
    const { error: sportsError } = await supabaseAdmin
      .from('org_sports')
      .delete()
      .eq('organization_id', id);

    if (sportsError) {
      logSbError(req, 'orgs.delete.sports', sportsError);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete organization sports',
        details: sportsError
      });
    }

    // Delete the organization
    const { error: deleteError } = await supabaseAdmin
      .from('organizations')
      .delete()
      .eq('id', id);

    if (deleteError) {
      logSbError(req, 'orgs.delete.main', deleteError);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete organization',
        details: deleteError
      });
    }

    // Success log
    const rid = (res as any).locals?.rid;
    logger.info({ rid, orgId: id, orgName: existing.name }, 'organizations.delete ok');

    return res.json({
      success: true,
      message: `Organization "${existing.name}" deleted successfully`
    });

  } catch (error: any) {
    logSbError(req, 'orgs.delete.route', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;
