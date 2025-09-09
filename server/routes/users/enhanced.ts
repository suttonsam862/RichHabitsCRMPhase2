import express from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { sendSuccess, sendErr, sendCreated } from '../../lib/http';
import { requireAuth, AuthedRequest } from '../../middleware/auth';
import { ROLE_DEFAULTS, hasPermission, ACTION_PERMISSIONS, PAGE_ACCESS } from '../../lib/permissions';
import { randomBytes } from 'crypto';

const router = express.Router();

// Enhanced user creation with permissions and subroles
const createUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  phone: z.string().optional(),
  role: z.enum(['admin', 'sales', 'designer', 'manufacturing', 'customer']),
  subrole: z.enum(['salesperson', 'designer', 'manufacturer']).optional(),
  organizationId: z.string().uuid().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  hireDate: z.string().optional(),
  permissions: z.record(z.boolean()).optional(),
  pageAccess: z.record(z.boolean()).optional(),
  sendWelcomeEmail: z.boolean().default(true)
});

// Update user schema with enhanced fields  
const updateUserSchema = z.object({
  fullName: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(['admin', 'sales', 'designer', 'manufacturing', 'customer']).optional(),
  subrole: z.enum(['salesperson', 'designer', 'manufacturer']).optional(),
  organizationId: z.string().uuid().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  hireDate: z.string().optional(),
  permissions: z.record(z.boolean()).optional(),
  pageAccess: z.record(z.boolean()).optional(),
  isActive: z.boolean().optional(),
  avatarUrl: z.string().url().optional()
});

// List users with staff/customer separation
router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { type = 'all', page = '1', limit = '20', search = '' } = req.query;
    
    // Check if user has permission to view users
    // For now, allow all authenticated users - will be enhanced with proper permission checks
    const requestingUserId = req.user?.id;
    if (!requestingUserId) {
      return sendErr(res, 'UNAUTHORIZED', 'Authentication required', undefined, 401);
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;

    // Build query based on type filter
    let query = supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        full_name,
        phone,
        role,
        subrole,
        organization_id,
        job_title,
        department,
        hire_date,
        avatar_url,
        is_active,
        permissions,
        page_access,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        country,
        initial_temp_password,
        last_login,
        email_verified,
        notes,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    // Apply type filter  
    if (type === 'staff') {
      query = query.in('role', ['admin', 'sales', 'designer', 'manufacturing']);
    } else if (type === 'customers') {
      query = query.eq('role', 'customer');
    }

    // Apply search filter
    if (search && typeof search === 'string') {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Apply pagination  
    query = query.range(offset, offset + limitNum - 1);

    const { data: users, error, count } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      return sendErr(res, 'DATABASE_ERROR', 'Failed to fetch users', error, 500);
    }

    // Transform users to include address object structure
    const transformedUsers = (users || []).map(user => ({
      ...user,
      fullName: user.full_name,
      isActive: !!user.is_active,
      emailVerified: !!user.email_verified,
      organizationId: user.organization_id,
      jobTitle: user.job_title,
      hireDate: user.hire_date,
      avatarUrl: user.avatar_url,
      lastLogin: user.last_login,
      initialTempPassword: user.initial_temp_password,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      address: {
        line1: user.address_line1 || '',
        line2: user.address_line2 || '',
        city: user.city || '',
        state: user.state || '',
        postalCode: user.postal_code || '',
        country: user.country || 'US'
      }
    }));

    return sendSuccess(res, {
      users: transformedUsers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        pages: Math.ceil((count || 0) / limitNum)
      }
    });

  } catch (error) {
    console.error('Error in users list:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Internal server error', error, 500);
  }
});

// Get single user with full details
router.get('/:id', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { id } = req.params;
    
    // Check permissions - for now allow all authenticated users
    const requestingUserId = req.user?.id;
    if (!requestingUserId) {
      return sendErr(res, 'UNAUTHORIZED', 'Authentication required', undefined, 401);
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !user) {
      return sendErr(res, 'NOT_FOUND', 'User not found', error, 404);
    }

    // Transform user to include address object structure
    const transformedUser = {
      ...user,
      fullName: user.full_name,
      isActive: !!user.is_active,
      emailVerified: !!user.email_verified,
      organizationId: user.organization_id,
      jobTitle: user.job_title,
      hireDate: user.hire_date,
      avatarUrl: user.avatar_url,
      lastLogin: user.last_login,
      initialTempPassword: user.initial_temp_password,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      address: {
        line1: user.address_line1 || '',
        line2: user.address_line2 || '',
        city: user.city || '',
        state: user.state || '',
        postalCode: user.postal_code || '',
        country: user.country || 'US'
      }
    };

    return sendSuccess(res, transformedUser);

  } catch (error) {
    console.error('Error fetching user:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Internal server error', error, 500);
  }
});

// Create new user with enhanced permissions
router.post('/', requireAuth, async (req: AuthedRequest, res) => {
  try {
    // Check permissions - for now allow all authenticated users
    const requestingUserId = req.user?.id;
    if (!requestingUserId) {
      return sendErr(res, 'UNAUTHORIZED', 'Authentication required', undefined, 401);
    }

    const validatedData = createUserSchema.parse(req.body);
    
    // Generate temporary password for staff users
    const tempPassword = randomBytes(12).toString('base64').replace(/[/+=]/g, '').substring(0, 12);
    
    // Determine default permissions based on role
    const roleDefaults = ROLE_DEFAULTS[validatedData.role.toUpperCase() as keyof typeof ROLE_DEFAULTS];
    const defaultPermissions = validatedData.permissions || roleDefaults?.permissions || {};
    const defaultPageAccess = validatedData.pageAccess || {};

    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: validatedData.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: validatedData.fullName,
        role: validatedData.role,
        subrole: validatedData.subrole || null,
        job_title: validatedData.jobTitle || null,
        department: validatedData.department || null,
        permissions: defaultPermissions,
        page_access: defaultPageAccess
      }
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      return sendErr(res, 'DATABASE_ERROR', 'Failed to create user authentication', authError, 500);
    }

    // Create user record in our users table
    const userData = {
      id: authUser.user.id,
      email: validatedData.email,
      full_name: validatedData.fullName,
      phone: validatedData.phone || null,
      role: validatedData.role,
      subrole: validatedData.subrole || null,
      organization_id: validatedData.organizationId || null,
      job_title: validatedData.jobTitle || null,
      department: validatedData.department || null,
      hire_date: validatedData.hireDate ? new Date(validatedData.hireDate).toISOString() : null,
      permissions: defaultPermissions,
      page_access: defaultPageAccess,
      is_active: 1,
      email_verified: 1,
      created_by: req.user?.id,
      initial_temp_password: validatedData.role !== 'customer' ? tempPassword : null // Store for admin viewing
    };

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (userError) {
      console.error('User table creation error:', userError);
      // Clean up auth user if table insert fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return sendErr(res, 'DATABASE_ERROR', 'Failed to create user record', userError, 500);
    }

    return sendCreated(res, {
      ...user,
      temporaryPassword: validatedData.role !== 'customer' ? tempPassword : undefined
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendErr(res, 'VALIDATION_ERROR', 'Invalid user data', error.errors, 400);
    }
    
    console.error('Error creating user:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Internal server error', error, 500);
  }
});

// Update user with enhanced permissions
router.patch('/:id', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { id } = req.params;
    
    // Check permissions - for now allow all authenticated users
    const requestingUserId = req.user?.id;
    if (!requestingUserId) {
      return sendErr(res, 'UNAUTHORIZED', 'Authentication required', undefined, 401);
    }

    const validatedData = updateUserSchema.parse(req.body);
    
    // Build update object
    const updateData: any = {};
    if (validatedData.fullName) updateData.full_name = validatedData.fullName;
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone;
    if (validatedData.role) updateData.role = validatedData.role;
    if (validatedData.subrole !== undefined) updateData.subrole = validatedData.subrole;
    if (validatedData.organizationId !== undefined) updateData.organization_id = validatedData.organizationId;
    if (validatedData.jobTitle !== undefined) updateData.job_title = validatedData.jobTitle;
    if (validatedData.department !== undefined) updateData.department = validatedData.department;
    if (validatedData.hireDate !== undefined) {
      updateData.hire_date = validatedData.hireDate ? new Date(validatedData.hireDate).toISOString() : null;
    }
    if (validatedData.permissions) updateData.permissions = validatedData.permissions;
    if (validatedData.pageAccess) updateData.page_access = validatedData.pageAccess;
    if (validatedData.isActive !== undefined) updateData.is_active = validatedData.isActive ? 1 : 0;
    if (validatedData.avatarUrl !== undefined) updateData.avatar_url = validatedData.avatarUrl;
    
    updateData.updated_at = new Date().toISOString();

    // Update user record
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return sendErr(res, 'DATABASE_ERROR', 'Failed to update user', error, 500);
    }

    if (!user) {
      return sendErr(res, 'NOT_FOUND', 'User not found', undefined, 404);
    }

    // Also update auth user metadata if needed
    if (validatedData.fullName || validatedData.role || validatedData.subrole || validatedData.permissions || validatedData.pageAccess) {
      const metadata: any = {};
      if (validatedData.fullName) metadata.full_name = validatedData.fullName;
      if (validatedData.role) metadata.role = validatedData.role;
      if (validatedData.subrole !== undefined) metadata.subrole = validatedData.subrole;
      if (validatedData.permissions) metadata.permissions = validatedData.permissions;
      if (validatedData.pageAccess) metadata.page_access = validatedData.pageAccess;

      await supabaseAdmin.auth.admin.updateUserById(id, {
        user_metadata: metadata
      });
    }

    return sendSuccess(res, user);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendErr(res, 'VALIDATION_ERROR', 'Invalid update data', error.errors, 400);
    }
    
    console.error('Error updating user:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Internal server error', error, 500);
  }
});

// Reset user password (staff only)
router.post('/:id/reset-password', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { id } = req.params;
    
    // Check permissions - for now allow all authenticated users
    const requestingUserId = req.user?.id;
    if (!requestingUserId) {
      return sendErr(res, 'UNAUTHORIZED', 'Authentication required', undefined, 401);
    }

    // Generate new temporary password
    const newPassword = randomBytes(12).toString('base64').replace(/[/+=]/g, '').substring(0, 12);

    // Update password in Supabase Auth
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      password: newPassword
    });

    if (error) {
      console.error('Error resetting password:', error);
      return sendErr(res, 'DATABASE_ERROR', 'Failed to reset password', error, 500);
    }

    return sendSuccess(res, {
      message: 'Password reset successfully',
      temporaryPassword: newPassword
    });

  } catch (error) {
    console.error('Error in password reset:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Internal server error', error, 500);
  }
});

// Get user permissions and page access
router.get('/:id/permissions', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { id } = req.params;
    
    // Check permissions - for now allow all authenticated users
    const requestingUserId = req.user?.id;
    if (!requestingUserId) {
      return sendErr(res, 'UNAUTHORIZED', 'Authentication required', undefined, 401);
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('permissions, page_access, role, subrole')
      .eq('id', id)
      .single();

    if (error || !user) {
      return sendErr(res, 'NOT_FOUND', 'User not found', error, 404);
    }

    return sendSuccess(res, {
      permissions: user.permissions || {},
      pageAccess: user.page_access || {},
      role: user.role,
      subrole: user.subrole
    });

  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Internal server error', error, 500);
  }
});

// Update user permissions
router.patch('/:id/permissions', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { id } = req.params;
    const { permissions, pageAccess } = req.body;
    
    // Check permissions - for now allow all authenticated users
    const requestingUserId = req.user?.id;
    if (!requestingUserId) {
      return sendErr(res, 'UNAUTHORIZED', 'Authentication required', undefined, 401);
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    if (permissions && typeof permissions === 'object') {
      updateData.permissions = permissions;
    }
    
    if (pageAccess && typeof pageAccess === 'object') {
      updateData.page_access = pageAccess;
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('permissions, page_access')
      .single();

    if (error) {
      console.error('Error updating user permissions:', error);
      return sendErr(res, 'DATABASE_ERROR', 'Failed to update permissions', error, 500);
    }

    if (!user) {
      return sendErr(res, 'NOT_FOUND', 'User not found', undefined, 404);
    }

    // Also update auth metadata
    await supabaseAdmin.auth.admin.updateUserById(id, {
      user_metadata: {
        permissions: user.permissions,
        page_access: user.page_access
      }
    });

    return sendSuccess(res, {
      permissions: user.permissions || {},
      pageAccess: user.page_access || {}
    });

  } catch (error) {
    console.error('Error updating permissions:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Internal server error', error, 500);
  }
});

// Deactivate user
router.patch('/:id/deactivate', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { id } = req.params;
    
    // Check permissions - for now allow all authenticated users
    const requestingUserId = req.user?.id;
    if (!requestingUserId) {
      return sendErr(res, 'UNAUTHORIZED', 'Authentication required', undefined, 401);
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update({ 
        is_active: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deactivating user:', error);
      return sendErr(res, 'DATABASE_ERROR', 'Failed to deactivate user', error, 500);
    }

    if (!user) {
      return sendErr(res, 'NOT_FOUND', 'User not found', undefined, 404);
    }

    return sendSuccess(res, user);

  } catch (error) {
    console.error('Error in user deactivation:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Internal server error', error, 500);
  }
});

export default router;