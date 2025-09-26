import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthedRequest } from '../middleware/auth.js';
import { sendOk, sendErr, sendCreated } from '../lib/http.js';
import { logSbError } from '../lib/dbLog.js';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { InsertPermissionTemplate } from '../../shared/schema.js';
import { ROLE_DEFAULTS, ACTION_PERMISSIONS, PAGE_ACCESS } from '../lib/permissions.js';
import { logger } from '../lib/log.js';

const router = Router();

// Validation schemas
const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  templateType: z.enum(['system', 'custom', 'role-based']).default('custom'),
  permissions: z.record(z.boolean()).default({}),
  pageAccess: z.record(z.boolean()).default({})
});

const updateTemplateSchema = createTemplateSchema.partial();

// GET /api/v1/permission-templates - List all permission templates
router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { 
      page = '1', 
      limit = '20', 
      search = '',
      templateType = '',
      isActive = 'true'
    } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const offset = (pageNum - 1) * limitNum;

    // Build query with filters
    let query = supabaseAdmin
      .from('permission_templates')
      .select(`
        id,
        name,
        template_type,
        permissions,
        page_access,
        is_active,
        created_by,
        created_at,
        updated_at
      `)
      .range(offset, offset + limitNum - 1)
      .order('created_at', { ascending: false });

    // Apply filters
    if (search && typeof search === 'string') {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (templateType && typeof templateType === 'string') {
      query = query.eq('template_type', templateType);
    }

    if (isActive === 'true') {
      query = query.eq('is_active', true);
    } else if (isActive === 'false') {
      query = query.eq('is_active', false);
    }

    const { data: templates, error } = await query;

    if (error) {
      logSbError(req, 'permission-templates.list', error);
      return sendErr(res, 'DB_ERROR', error.message, undefined, 400);
    }

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from('permission_templates')
      .select('*', { count: 'exact', head: true });

    if (search && typeof search === 'string') {
      countQuery = countQuery.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }
    if (templateType && typeof templateType === 'string') {
      countQuery = countQuery.eq('template_type', templateType);
    }
    if (isActive === 'true') {
      countQuery = countQuery.eq('is_active', true);
    } else if (isActive === 'false') {
      countQuery = countQuery.eq('is_active', false);
    }

    const { count: totalCount } = await countQuery;

    return sendOk(res, {
      templates: templates || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount || 0,
        pages: Math.ceil((totalCount || 0) / limitNum)
      }
    });

  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to list permission templates');
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to list permission templates', undefined, 500);
  }
});

// GET /api/v1/permission-templates/:id - Get specific permission template
router.get('/:id', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { id } = req.params;

    const { data: template, error } = await supabaseAdmin
      .from('permission_templates')
      .select(`
        id,
        name,
        template_type,
        permissions,
        page_access,
        is_active,
        created_by,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .single();

    if (error || !template) {
      if (error?.code === 'PGRST116') {
        return sendErr(res, 'NOT_FOUND', 'Permission template not found', undefined, 404);
      }
      logSbError(req, 'permission-templates.get', error);
      return sendErr(res, 'DB_ERROR', error?.message || 'Template not found', undefined, 400);
    }

    return sendOk(res, template);

  } catch (error: any) {
    logSbError(req, 'permission-templates.get.route', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to fetch permission template', error.message, 500);
  }
});

// POST /api/v1/permission-templates - Create new permission template
router.post('/', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const requestingUserId = req.user?.id;
    if (!requestingUserId) {
      return sendErr(res, 'UNAUTHORIZED', 'Authentication required', undefined, 401);
    }

    const validatedData = createTemplateSchema.parse(req.body);

    // Check for duplicate template name
    const { data: existingTemplate } = await supabaseAdmin
      .from('permission_templates')
      .select('id')
      .eq('name', validatedData.name)
      .single();

    if (existingTemplate) {
      return sendErr(res, 'CONFLICT', 'A template with this name already exists', undefined, 409);
    }

    const templateData: InsertPermissionTemplate = {
      name: validatedData.name,
      description: validatedData.description || null,
      template_type: validatedData.templateType,
      permissions: validatedData.permissions,
      page_access: validatedData.pageAccess,
      is_active: true,
      created_by: requestingUserId
    };

    const { data: newTemplate, error } = await supabaseAdmin
      .from('permission_templates')
      .insert([templateData])
      .select(`
        id,
        name,
        template_type,
        permissions,
        page_access,
        is_active,
        created_by,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      logSbError(req, 'permission-templates.create', error);
      return sendErr(res, 'DB_ERROR', error.message, undefined, 400);
    }

    logger.info(`Created permission template: ${newTemplate.name}`);
    return sendCreated(res, newTemplate);

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return sendErr(res, 'VALIDATION_ERROR', 'Invalid template data', error.errors, 400);
    }

    logSbError(req, 'permission-templates.create.route', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to create permission template', error.message, 500);
  }
});

// PUT /api/v1/permission-templates/:id - Update permission template
router.put('/:id', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user?.id;

    if (!requestingUserId) {
      return sendErr(res, 'UNAUTHORIZED', 'Authentication required', undefined, 401);
    }

    const validatedData = updateTemplateSchema.parse(req.body);

    // Check if template exists
    const { data: existingTemplate } = await supabaseAdmin
      .from('permission_templates')
      .select('id, name')
      .eq('id', id)
      .single();

    if (!existingTemplate) {
      return sendErr(res, 'NOT_FOUND', 'Permission template not found', undefined, 404);
    }

    // Check for duplicate name if name is being changed
    if (validatedData.name && validatedData.name !== existingTemplate.name) {
      const { data: duplicateTemplate } = await supabaseAdmin
        .from('permission_templates')
        .select('id')
        .eq('name', validatedData.name)
        .neq('id', id)
        .single();

      if (duplicateTemplate) {
        return sendErr(res, 'CONFLICT', 'A template with this name already exists', undefined, 409);
      }
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (validatedData.name) updateData.name = validatedData.name;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.templateType) updateData.template_type = validatedData.templateType;
    if (validatedData.permissions) updateData.permissions = validatedData.permissions;
    if (validatedData.pageAccess) updateData.page_access = validatedData.pageAccess;

    const { data: updatedTemplate, error } = await supabaseAdmin
      .from('permission_templates')
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        name,
        template_type,
        permissions,
        page_access,
        is_active,
        created_by,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      logSbError(req, 'permission-templates.update', error);
      return sendErr(res, 'DB_ERROR', error.message, undefined, 400);
    }

    logger.info(`Updated permission template: ${updatedTemplate.name}`);
    return sendOk(res, updatedTemplate);

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return sendErr(res, 'VALIDATION_ERROR', 'Invalid template data', error.errors, 400);
    }

    logSbError(req, 'permission-templates.update.route', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to update permission template', error.message, 500);
  }
});

// DELETE /api/v1/permission-templates/:id - Delete (deactivate) permission template
router.delete('/:id', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { id } = req.params;

    // Check if template exists
    const { data: existingTemplate } = await supabaseAdmin
      .from('permission_templates')
      .select('id, name')
      .eq('id', id)
      .single();

    if (!existingTemplate) {
      return sendErr(res, 'NOT_FOUND', 'Permission template not found', undefined, 404);
    }

    // Soft delete by setting is_active to false
    const { error } = await supabaseAdmin
      .from('permission_templates')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      logSbError(req, 'permission-templates.delete', error);
      return sendErr(res, 'DB_ERROR', error.message, undefined, 400);
    }

    logger.info(`Deactivated permission template: ${existingTemplate.name}`);
    return res.status(204).send();

  } catch (error: any) {
    logSbError(req, 'permission-templates.delete.route', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to delete permission template', error.message, 500);
  }
});

// GET /api/v1/permission-templates/available-permissions - Get all available permissions for template creation
router.get('/available-permissions', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const availablePermissions = {
      actions: ACTION_PERMISSIONS,
      pages: PAGE_ACCESS,
      roleDefaults: ROLE_DEFAULTS
    };

    return sendOk(res, availablePermissions);

  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get available permissions');
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to get available permissions', undefined, 500);
  }
});

// POST /api/v1/permission-templates/:id/apply/:userId - Apply template to user
router.post('/:id/apply/:userId', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { id: templateId, userId } = req.params;
    const requestingUserId = req.user?.id;

    if (!requestingUserId) {
      return sendErr(res, 'UNAUTHORIZED', 'Authentication required', undefined, 401);
    }

    // Get the template
    const { data: template, error: templateError } = await supabaseAdmin
      .from('permission_templates')
      .select('permissions, page_access')
      .eq('id', templateId)
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      return sendErr(res, 'NOT_FOUND', 'Permission template not found', undefined, 404);
    }

    // Check if user exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingUser) {
      return sendErr(res, 'NOT_FOUND', 'User not found', undefined, 404);
    }

    // Apply template permissions to user
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        permissions: template.permissions,
        page_access: template.page_access,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, permissions, page_access')
      .single();

    if (updateError) {
      logSbError(req, 'permission-templates.apply', updateError);
      return sendErr(res, 'DB_ERROR', updateError.message, undefined, 400);
    }

    logger.info(`Applied template ${templateId} to user ${userId}`);
    return sendOk(res, {
      message: 'Template applied successfully',
      user: updatedUser
    });

  } catch (error: any) {
    logSbError(req, 'permission-templates.apply.route', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to apply template', error.message, 500);
  }
});

export default router;