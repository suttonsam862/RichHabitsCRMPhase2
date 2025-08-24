/**
 * Rock-Solid Organization Creation Flow
 * Handles all potential database errors with comprehensive recovery
 */

import { Router } from 'express';
import { z } from 'zod';
import { sendOk, sendErr } from '../../lib/http';
import { mapPgError, mapValidationError } from '../../lib/err';
import { supabaseForUser, supabaseAdmin } from '../../lib/supabase';
import { requireAuth } from '../../middleware/auth';
import { logger } from '../../lib/log';
import { 
  withRetry, 
  validateDatabaseSchema, 
  forceSchemaRefresh, 
  ensureRequiredRoles,
  validateOrganizationData 
} from '../../lib/database-hardening';

const r = Router();
r.use(requireAuth);

// Enhanced validation schema
const createOrgSchema = z.object({
  name: z.string().min(2).max(120).trim(),
  isBusiness: z.boolean().default(false),
  brandPrimary: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).optional(),
  brandSecondary: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).optional(),
  colorPalette: z.array(z.string()).max(12).default([]),
  emailDomain: z.string().email().optional().or(z.literal('').transform(() => undefined)),
  billingEmail: z.string().email().optional().or(z.literal('').transform(() => undefined)),
  tags: z.array(z.string().max(24)).max(20).default([]),
  sports: z.array(z.object({
    sportId: z.string().uuid('Invalid sport ID'),
    contactName: z.string().min(1).max(100).trim(),
    contactEmail: z.string().email('Invalid email address'),
    contactPhone: z.string().optional(),
    saved: z.boolean().optional(),
    id: z.string().optional(),
    sportName: z.string().optional()
  })).default([])
}).passthrough();

/**
 * HARDENED ORGANIZATION CREATION ENDPOINT
 * Rock-solid with comprehensive error handling and recovery
 */
r.post('/hardened', async (req: any, res) => {
  const requestId = res.locals?.rid || 'unknown';
  logger.info({ requestId, body: req.body }, 'Starting hardened organization creation');
  
  try {
    // Step 1: Pre-flight validation
    const schemaValidation = await validateDatabaseSchema();
    if (!schemaValidation.isValid) {
      logger.error({ requestId, validation: schemaValidation }, 'Schema validation failed');
      
      // Attempt auto-recovery
      try {
        await forceSchemaRefresh();
        logger.info({ requestId }, 'Schema refresh completed, retrying validation');
        
        const retryValidation = await validateDatabaseSchema();
        if (!retryValidation.isValid) {
          return sendErr(res, 500, 'Database schema inconsistency detected', {
            missingTables: retryValidation.missingTables,
            missingColumns: retryValidation.missingColumns,
            errors: retryValidation.errors
          });
        }
      } catch (refreshError: any) {
        return sendErr(res, 500, 'Database schema refresh failed', refreshError.message);
      }
    }
    
    // Step 2: Input validation with detailed error reporting
    const parse = createOrgSchema.safeParse(req.body);
    if (!parse.success) {
      const errors = mapValidationError(parse.error);
      logger.warn({ requestId, errors }, 'Input validation failed');
      return sendErr(res, 400, errors.message, errors.details);
    }
    
    // Step 3: Additional business logic validation
    const dataValidationErrors = validateOrganizationData(parse.data);
    if (dataValidationErrors.length > 0) {
      logger.warn({ requestId, errors: dataValidationErrors }, 'Business validation failed');
      return sendErr(res, 400, 'Validation failed', dataValidationErrors);
    }
    
    // Step 4: Ensure required roles exist
    await withRetry({
      operation: () => ensureRequiredRoles(),
      retryCount: 2,
      onError: (error, attempt) => {
        logger.warn({ requestId, attempt, error: error.message }, 'Role validation retry');
      }
    });
    
    const uid = req.user!.id;
    const sb = supabaseForUser(req.headers.authorization?.slice(7));
    const p = parse.data;
    
    // Step 5: Prepare organization data with defaults and validation
    const colorPalette = Array.isArray(p.colorPalette) ? p.colorPalette : [];
    const brandPrimary = p.brandPrimary || '#3B82F6';
    const brandSecondary = p.brandSecondary || '#8B5CF6';
    const gradient_css = `linear-gradient(135deg, ${brandPrimary} 0%, ${brandSecondary} 100%)`;
    const tags = Array.isArray(p.tags) ? p.tags : [];
    
    // Step 6: Insert organization with comprehensive error handling
    const org = await withRetry({
      operation: async () => {
        const { data, error } = await sb.from('organizations').insert([{
          name: p.name,
          is_business: p.isBusiness,
          brand_primary: brandPrimary,
          brand_secondary: brandSecondary,
          color_palette: colorPalette,
          email_domain: p.emailDomain,
          billing_email: p.billingEmail,
          tags: tags,
          gradient_css: gradient_css
        }]).select().single();
        
        if (error) throw error;
        return data;
      },
      retryCount: 3,
      retryDelay: 1000,
      onError: (error, attempt) => {
        logger.warn({ 
          requestId, 
          attempt, 
          error: error.message, 
          code: error.code,
          hint: error.hint 
        }, 'Organization insert retry');
        
        // Schema cache issue - force refresh
        if (error.message?.includes('schema cache') || error.code === '42P01') {
          forceSchemaRefresh().catch(refreshError => {
            logger.error({ requestId, refreshError }, 'Schema refresh failed during retry');
          });
        }
      }
    });
    
    logger.info({ requestId, orgId: org.id }, 'Organization created successfully');
    
    // Step 7: Re-select with RLS validation
    const freshOrg = await withRetry({
      operation: async () => {
        const { data, error } = await sb.from('organizations')
          .select('*')
          .eq('id', org.id)
          .single();
        
        if (error) throw error;
        return data;
      },
      retryCount: 2
    });
    
    // Step 8: Process sports contacts with comprehensive error handling
    const sportsResults = [];
    for (let index = 0; index < p.sports.length; index++) {
      const sport = p.sports[index];
      try {
        logger.info({ requestId, sportIndex: index, contactEmail: sport.contactEmail }, 'Processing sport contact');
        
        // Create or find auth user
        const coachId = await withRetry({
          operation: async () => {
            // Check if user exists
            const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({
              page: 1,
              perPage: 1000 // Increased to handle more users
            });
            
            let userId = existingUsers?.users?.find(u => u.email === sport.contactEmail)?.id;
            
            if (!userId) {
              const createResult = await supabaseAdmin.auth.admin.createUser({
                email: sport.contactEmail,
                email_confirm: false,
                user_metadata: { 
                  full_name: sport.contactName, 
                  desired_role: 'customer',
                  created_by_org: org.id
                }
              });
              
              if (createResult.error || !createResult.data?.user) {
                throw new Error(`Failed to create user: ${createResult.error?.message || 'Unknown error'}`);
              }
              
              userId = createResult.data.user.id;
              logger.info({ requestId, userId, email: sport.contactEmail }, 'Created new auth user');
            }
            
            return userId;
          },
          retryCount: 2,
          onError: (error, attempt) => {
            logger.warn({ 
              requestId, 
              sportIndex: index, 
              attempt, 
              error: error.message 
            }, 'Auth user creation retry');
          }
        });
        
        // Insert org_sports entry
        await withRetry({
          operation: async () => {
            const { error } = await sb.from('org_sports').insert([{
              organization_id: org.id,
              sport_id: sport.sportId,
              contact_name: sport.contactName,
              contact_email: sport.contactEmail,
              contact_phone: sport.contactPhone,
              contact_user_id: coachId
            }]);
            
            if (error) throw error;
          },
          retryCount: 3,
          onError: (error, attempt) => {
            logger.warn({ 
              requestId, 
              sportIndex: index, 
              attempt, 
              error: error.message,
              code: error.code 
            }, 'Org sports insert retry');
            
            // Handle schema cache issues
            if (error.message?.includes('contact_user_id') || error.message?.includes('schema cache')) {
              forceSchemaRefresh().catch(refreshError => {
                logger.error({ requestId, refreshError }, 'Schema refresh failed during sports insert');
              });
            }
          }
        });
        
        // Assign customer role
        await withRetry({
          operation: async () => {
            const { data: roles } = await supabaseAdmin
              .from('roles')
              .select('id,slug')
              .eq('slug', 'customer')
              .limit(1);
            
            const customerRole = roles?.[0];
            if (!customerRole) {
              throw new Error('Customer role not found');
            }
            
            const { error } = await supabaseAdmin
              .from('user_roles')
              .upsert(
                { 
                  user_id: coachId, 
                  org_id: org.id, 
                  role_id: customerRole.id 
                },
                { 
                  onConflict: 'user_id,org_id,role_id',
                  ignoreDuplicates: false
                }
              );
            
            if (error) throw error;
          },
          retryCount: 2
        });
        
        sportsResults.push({
          success: true,
          sportIndex: index,
          contactEmail: sport.contactEmail,
          userId: coachId
        });
        
      } catch (sportError: any) {
        logger.error({ 
          requestId, 
          sportIndex: index, 
          error: sportError.message 
        }, 'Sport contact processing failed');
        
        sportsResults.push({
          success: false,
          sportIndex: index,
          contactEmail: sport.contactEmail,
          error: sportError.message
        });
        
        // Continue with other sports instead of failing entire operation
      }
    }
    
    logger.info({ 
      requestId, 
      orgId: org.id, 
      sportsProcessed: sportsResults.length,
      sportsSuccessful: sportsResults.filter(r => r.success).length
    }, 'Organization creation completed');
    
    // Return comprehensive result
    return sendOk(res, {
      organization: freshOrg,
      sportsResults: sportsResults,
      summary: {
        organizationCreated: true,
        sportsContactsProcessed: sportsResults.length,
        sportsContactsSuccessful: sportsResults.filter(r => r.success).length,
        sportsContactsFailed: sportsResults.filter(r => !r.success).length
      }
    });
    
  } catch (error: any) {
    logger.error({ 
      requestId, 
      error: error.message, 
      stack: error.stack,
      code: error.code,
      hint: error.hint
    }, 'Hardened organization creation failed');
    
    const mappedError = mapPgError(error);
    return sendErr(res, 500, mappedError.message, mappedError, mappedError.hint);
  }
});

export default r;