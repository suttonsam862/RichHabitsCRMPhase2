import express from 'express';
import { CreateUserDTO, UpdateUserDTO } from '../../../shared/dtos';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/asyncHandler';
import { sendOk, sendErr, HttpErrors, handleDatabaseError } from '../../lib/http';
import { requireAuth, AuthedRequest } from '../../middleware/auth';
import { supabaseAdmin } from '../../lib/supabase';
import { logDatabaseOperation, logSecurityEvent } from '../../lib/log';
import { z } from 'zod';

const router = express.Router();

// All user operations now use Supabase Auth directly

// Validation schemas
const updateEmailSchema = z.object({
  email: z.string().email('Invalid email format')
});

const updateRolesSchema = z.object({
  roles: z.array(z.object({
    slug: z.string(),
    orgId: z.string().uuid(),
    action: z.enum(['add', 'remove'])
  }))
});

// List all users with pagination and search
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const authedReq = req as AuthedRequest;
  const {
    q = '',
    page = '1',
    pageSize = '20'
  } = req.query;

  const pageNum = parseInt(page as string) || 1;
  const pageSizeNum = parseInt(pageSize as string) || 20;

  try {
    // Get ALL users from Supabase Auth (pagination is limited, so we get all and filter client-side)
    const { data: authUsers, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      return sendErr(res, 'INTERNAL_ERROR', 'Failed to fetch users', undefined, 500);
    }

    const results = authUsers?.users || [];

    // Filter out test/mock users based on email patterns
    const isTestUser = (email: string | undefined) => {
      if (!email) return false;
      const testPatterns = [
        /test/i,
        /mock/i,
        /demo/i,
        /fake/i,
        /example\.com$/i,
        /test\.com$/i,
        /mock\.com$/i,
        /tempmail/i,
        /10minutemail/i,
        /throwaway/i,
        /placeholder/i
      ];
      return testPatterns.some(pattern => pattern.test(email));
    };

    let filteredResults = results.filter(user => !isTestUser(user.email));

    // Filter by search query if provided
    if (q && typeof q === 'string' && q.trim()) {
      const searchTerm = q.trim().toLowerCase();
      filteredResults = filteredResults.filter(user =>
        user.email?.toLowerCase().includes(searchTerm) ||
        user.user_metadata?.full_name?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply pagination after filtering
    const total = filteredResults.length;
    const offset = (pageNum - 1) * pageSizeNum;
    const paginatedResults = filteredResults.slice(offset, offset + pageSizeNum);

    // Map Supabase auth users to DTOs
    const data = paginatedResults.map(user => ({
      id: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown User',
      avatarUrl: user.user_metadata?.avatar_url || null,
      role: user.user_metadata?.role || 'customer',
      subrole: user.user_metadata?.subrole || null,
      isActive: true, // Note: Supabase User type doesn't have banned_until, using default
      preferences: user.user_metadata?.preferences || {},
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastLogin: user.last_sign_in_at,
    }));

    sendOk(res, data, total);
  } catch (error) {
    handleDatabaseError(res, error, 'list users');
  }
}));

// Get user by ID
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const authedReq = req as AuthedRequest;
  const { id } = req.params;

  try {
    const { data: user, error } = await supabaseAdmin.auth.admin.getUserById(id);

    if (error || !user) {
      return HttpErrors.notFound(res, 'User not found');
    }

    const userData = {
      id: user.user.id,
      email: user.user.email,
      phone: user.user.phone,
      fullName: user.user.user_metadata?.full_name || null,
      avatarUrl: user.user.user_metadata?.avatar_url || null,
      role: user.user.user_metadata?.role || 'customer',
      subrole: user.user.user_metadata?.subrole || null,
      isActive: true, // Note: Supabase User type doesn't have banned_until, using default
      preferences: user.user.user_metadata?.preferences || {},
      createdAt: user.user.created_at,
      updatedAt: user.user.updated_at,
      lastLogin: user.user.last_sign_in_at,
    };

    sendOk(res, userData);
  } catch (error) {
    handleDatabaseError(res, error, 'fetch user');
  }
}));

// PATCH /:id/email - Update user email
router.patch('/:id/email', requireAuth, asyncHandler(async (req, res) => {
  const authedReq = req as AuthedRequest;
  const { id } = req.params;

  try {
    // Validate request body
    const validation = updateEmailSchema.safeParse(req.body);
    if (!validation.success) {
      return sendErr(res, 'VALIDATION_ERROR', 'Invalid email format', validation.error.flatten(), 400);
    }

    const { email } = validation.data;

    // Update email using Supabase Admin
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { email });

    if (error) {
      logSecurityEvent(req, 'USER_EMAIL_UPDATE_FAILED', { userId: id, error: error.message });
      return sendErr(res, 'UPDATE_ERROR', error.message, undefined, 400);
    }

    logDatabaseOperation(req, 'USER_EMAIL_UPDATED', 'users', { userId: id });
    sendOk(res, { success: true });
  } catch (error) {
    handleDatabaseError(res, error, 'update user email');
  }
}));

// POST /:id/reset-password - Reset user password
router.post('/:id/reset-password', requireAuth, asyncHandler(async (req, res) => {
  const authedReq = req as AuthedRequest;
  const { id } = req.params;

  try {
    // Generate random password
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Update password using Supabase Admin
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password });

    if (error) {
      logSecurityEvent(req, 'USER_PASSWORD_RESET_FAILED', { userId: id, error: error.message });
      return sendErr(res, 'UPDATE_ERROR', error.message, undefined, 400);
    }

    logSecurityEvent(req, 'USER_PASSWORD_RESET', { userId: id, adminId: authedReq.user?.id });

    // Only return masked version (first 3 chars)
    const maskedPassword = password.substring(0, 3) + '*'.repeat(9);
    sendOk(res, {
      success: true,
      message: 'Password reset successfully',
      maskedPassword
    });
  } catch (error) {
    handleDatabaseError(res, error, 'reset user password');
  }
}));

// PATCH /:id/roles - Update user roles (now handled via Supabase user metadata)
router.patch('/:id/roles', requireAuth, asyncHandler(async (req, res) => {
  const authedReq = req as AuthedRequest;
  const { id } = req.params;

  try {
    // Validate request body
    const validation = updateRolesSchema.safeParse(req.body);
    if (!validation.success) {
      return sendErr(res, 'VALIDATION_ERROR', 'Invalid roles data', validation.error.flatten(), 400);
    }

    const { roles } = validation.data;

    // Get current user metadata
    const { data: currentUser, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(id);
    if (fetchError || !currentUser) {
      return sendErr(res, 'USER_NOT_FOUND', 'User not found', undefined, 404);
    }

    // Update user roles in metadata
    const updatedMetadata = {
      ...currentUser.user.user_metadata,
      roles: roles.map(r => r.slug) // Store role slugs in metadata
    };

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(id, {
      user_metadata: updatedMetadata
    });

    if (updateError) {
      return sendErr(res, 'UPDATE_ERROR', updateError.message, undefined, 400);
    }

    logDatabaseOperation(req, 'USER_ROLES_UPDATED', 'users', { userId: id, changes: roles });
    sendOk(res, { success: true });
  } catch (error) {
    handleDatabaseError(res, error, 'update user roles');
  }
}));

// Create user - only in Supabase Auth
router.post('/', requireAuth, validateRequest({ body: CreateUserDTO }),
  asyncHandler(async (req, res) => {
    const authedReq = req as AuthedRequest;
    const validatedData = req.body;

    // Role-based authorization: only admins can assign admin/staff roles
    const requestingUser = authedReq.user;
    const requestedRole = validatedData.role || 'customer';

    if (['admin', 'staff', 'sales'].includes(requestedRole)) {
      // Basic role check (simplified since we're not using local DB)
      const hasAdminRole = requestingUser?.is_super_admin || 
        requestingUser?.user_metadata?.role === 'admin';

      if (!hasAdminRole) {
        logSecurityEvent(req, 'ROLE_ASSIGNMENT_DENIED', {
          requestingUserId: requestingUser?.id,
          requestedRole,
          reason: 'insufficient_privileges'
        });
        return sendErr(res, 'FORBIDDEN', 'Only administrators can assign admin or staff roles', undefined, 403);
      }
    }

    try {
      console.log('Creating user with data:', {
        email: validatedData.email,
        phone: validatedData.phone,
        fullName: validatedData.fullName,
        role: validatedData.role
      });

      // Create user using Supabase Auth
      const createResult = await supabaseAdmin.auth.admin.createUser({
        email: validatedData.email,
        phone: validatedData.phone,
        user_metadata: {
          full_name: validatedData.fullName || validatedData.email.split('@')[0],
          role: validatedData.role || 'customer',
          subrole: validatedData.subrole || null,
          preferences: {}
        },
        email_confirm: true
      });

      if (createResult.error) {
        if (createResult.error.message.includes('already registered')) {
          return sendErr(res, 'CONFLICT', 'User with this email already exists', undefined, 409);
        }
        console.error('Supabase user creation error:', createResult.error);
        return sendErr(res, 'CREATE_ERROR', createResult.error.message, createResult.error, 400);
      }

      const newUser = createResult.data?.user;
      if (!newUser) {
        return sendErr(res, 'CREATE_ERROR', 'Failed to create user', undefined, 500);
      }

      const createdUser = {
        id: newUser.id,
        email: newUser.email,
        phone: newUser.phone,
        fullName: newUser.user_metadata?.full_name,
        role: newUser.user_metadata?.role || 'customer',
        subrole: newUser.user_metadata?.subrole || null,
        isActive: true,
        preferences: newUser.user_metadata?.preferences || {},
        createdAt: newUser.created_at,
        updatedAt: newUser.updated_at
      };

      res.status(201);
      sendOk(res, createdUser);
    } catch (error) {
      handleDatabaseError(res, error, 'create user');
    }
  })
);

// Update user - only in Supabase Auth
router.patch('/:id',
  validateRequest({ body: UpdateUserDTO }),
  asyncHandler(async (req, res) => {
    const authedReq = req as AuthedRequest;
    const { id } = req.params;
    const updateData = req.body;

    try {
      // Check if user exists in Supabase Auth
      const { data: existingUser, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(id);
      
      if (fetchError || !existingUser) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      // Prepare update payload for Supabase Auth
      const updatePayload: any = {};
      
      // Map fields to Supabase Auth format
      if (updateData.fullName !== undefined) {
        updatePayload.user_metadata = {
          ...existingUser.user.user_metadata,
          full_name: updateData.fullName
        };
      }
      
      if (updateData.phone !== undefined) {
        updatePayload.phone = updateData.phone;
      }
      
      if (updateData.role !== undefined) {
        updatePayload.user_metadata = {
          ...updatePayload.user_metadata || existingUser.user.user_metadata,
          role: updateData.role
        };
      }

      if (updateData.subrole !== undefined) {
        updatePayload.user_metadata = {
          ...updatePayload.user_metadata || existingUser.user.user_metadata,
          subrole: updateData.subrole
        };
      }

      // Update user in Supabase Auth
      const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(id, updatePayload);

      if (updateError) {
        return sendErr(res, 'UPDATE_ERROR', updateError.message, undefined, 400);
      }

      console.log(`✅ Updated user: ${updatedUser.user?.user_metadata?.full_name} (${updatedUser.user?.id})`);

      const responseData = {
        id: updatedUser.user?.id,
        email: updatedUser.user?.email,
        phone: updatedUser.user?.phone,
        fullName: updatedUser.user?.user_metadata?.full_name,
        role: updatedUser.user?.user_metadata?.role,
        subrole: updatedUser.user?.user_metadata?.subrole,
        isActive: true, // Note: Supabase User type doesn't have banned_until, using default
        preferences: updatedUser.user?.user_metadata?.preferences || {},
        createdAt: updatedUser.user?.created_at,
        updatedAt: updatedUser.user?.updated_at
      };

      res.json({
        success: true,
        data: responseData
      });
    } catch (error) {
      handleDatabaseError(res, error, 'update user');
    }
  })
);

// Delete user
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // Delete user using Supabase Auth
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (error) {
      if (error.message.includes('not found')) {
        return HttpErrors.notFound(res, 'User not found');
      }
      return sendErr(res, 'DELETE_ERROR', error.message, undefined, 400);
    }

    res.status(204).send();
  } catch (error) {
    handleDatabaseError(res, error, 'delete user');
  }
}));

export { router as usersRouter };