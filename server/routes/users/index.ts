import express from 'express';
import { CreateUserDTO, UpdateUserDTO, UserDTO } from '@shared/dtos';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/asyncHandler';
import { db } from '../../db';
import { userRoles } from '@shared/schema';
import { sql, eq, ilike, desc } from 'drizzle-orm';
import { sendSuccess, sendOk, sendErr, sendCreated, HttpErrors, handleDatabaseError, mapDtoToDb, mapDbToDto } from '../../lib/http';
import { requireAuth, AuthedRequest } from '../../middleware/auth';
import { supabaseAdmin } from '../../lib/supabase';
import { logDatabaseOperation, logSecurityEvent } from '../../lib/log';
import { z } from 'zod';

const router = express.Router();

// DTO <-> DB field mappings for camelCase <-> snake_case conversion
const DTO_TO_DB_MAPPING = {
  fullName: 'full_name',
  avatarUrl: 'avatar_url',
  isActive: 'is_active',
  lastLogin: 'last_login',
  createdAt: 'created_at',
  updatedAt: 'updated_at'
};

// Helper to map DB row to DTO
function dbRowToDto(row: any): any {
  if (!row) return null;

  const mapped = mapDbToDto(row, DTO_TO_DB_MAPPING);

  return {
    id: row.id,
    email: row.email,
    phone: row.phone,
    preferences: row.preferences || {},
    ...mapped,
    createdAt: row.created_at?.toISOString?.() ?? null,
    updatedAt: row.updated_at?.toISOString?.() ?? null,
    lastLogin: row.last_login?.toISOString?.() ?? null,
  };
}

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
router.get('/', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const {
    q = '',
    page = '1',
    pageSize = '20'
  } = req.query;

  const pageNum = parseInt(page as string) || 1;
  const pageSizeNum = parseInt(pageSize as string) || 20;
  const offset = (pageNum - 1) * pageSizeNum;

  try {
    // Build where conditions
    const conditions = [];

    // Use Supabase Auth to get users instead of custom table
    const { data: authUsers, error } = await supabaseAdmin.auth.admin.listUsers({
      page: pageNum,
      perPage: pageSizeNum
    });

    if (error) {
      return sendErr(res, 'INTERNAL_ERROR', 'Failed to fetch users', undefined, 500);
    }

    const results = authUsers?.users || [];
    const total = authUsers?.total || 0;

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

    const realUsers = results.filter(user => !isTestUser(user.email));

    // Filter by search query if provided
    let filteredResults = realUsers;
    if (q && typeof q === 'string' && q.trim()) {
      const searchTerm = q.trim().toLowerCase();
      filteredResults = realUsers.filter(user => 
        user.email?.toLowerCase().includes(searchTerm) ||
        user.user_metadata?.full_name?.toLowerCase().includes(searchTerm)
      );
    }

    // Map Supabase auth users to DTOs
    const data = filteredResults.map(user => ({
      id: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.user_metadata?.full_name || null,
      avatarUrl: user.user_metadata?.avatar_url || null,
      isActive: true,
      preferences: user.user_metadata?.preferences || {},
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastLogin: user.last_sign_in_at,
    }));

    sendOk(res, data, filteredResults.length);
  } catch (error) {
    handleDatabaseError(res, error, 'list users');
  }
}));

// Get user by ID with roles
router.get('/:id', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
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
      isActive: true, // Simplified since banned_until not reliably available
      preferences: user.user.user_metadata?.preferences || {},
      createdAt: user.user.created_at,
      updatedAt: user.user.updated_at,
      lastLogin: user.user.last_sign_in_at,
    };

    // Get user roles
    const rolesResult = await db.execute(sql`
      SELECT r.id, r.name, r.slug, ur.org_id
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ${id}
    `);

    const mappedUser = {
      ...userData,
      roles: rolesResult || []
    };
    sendOk(res, mappedUser);
  } catch (error) {
    handleDatabaseError(res, error, 'fetch user');
  }
}));

// PATCH /:id/email - Update user email
router.patch('/:id/email', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
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
router.post('/:id/reset-password', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
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

    logSecurityEvent(req, 'USER_PASSWORD_RESET', { userId: id, adminId: req.user?.id });

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

// PATCH /:id/roles - Update user roles
router.patch('/:id/roles', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const { id } = req.params;

  try {
    // Validate request body
    const validation = updateRolesSchema.safeParse(req.body);
    if (!validation.success) {
      return sendErr(res, 'VALIDATION_ERROR', 'Invalid roles data', validation.error.flatten(), 400);
    }

    const { roles } = validation.data;

    for (const roleChange of roles) {
      // Get role ID from slug
      const roleResult = await db.execute(sql`
        SELECT id FROM roles WHERE slug = ${roleChange.slug} LIMIT 1
      `);

      if (!roleResult || roleResult.length === 0) {
        continue;
      }

      const roleId = (roleResult as any)[0].id;

      if (roleChange.action === 'add') {
        // Add role
        await db.execute(sql`
          INSERT INTO user_roles (user_id, org_id, role_id)
          VALUES (${id}, ${roleChange.orgId}, ${roleId})
          ON CONFLICT (user_id, org_id, role_id) DO NOTHING
        `);
      } else {
        // Remove role
        await db.execute(sql`
          DELETE FROM user_roles 
          WHERE user_id = ${id} AND org_id = ${roleChange.orgId} AND role_id = ${roleId}
        `);
      }
    }

    logDatabaseOperation(req, 'USER_ROLES_UPDATED', 'user_roles', { userId: id, changes: roles });
    sendOk(res, { success: true });
  } catch (error) {
    handleDatabaseError(res, error, 'update user roles');
  }
}));

// Create user
router.post('/',
  requireAuth,
  validateRequest({ body: CreateUserDTO }),
  asyncHandler(async (req: AuthedRequest, res) => {
    const validatedData = req.body;

    try {
      // Create user using Supabase Auth
      const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
        email: validatedData.email,
        phone: validatedData.phone,
        user_metadata: {
          full_name: validatedData.fullName || validatedData.email.split('@')[0],
          preferences: {}
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          return HttpErrors.conflict(res, 'User with this email already exists');
        }
        return sendErr(res, 'CREATE_ERROR', error.message, undefined, 400);
      }

      const createdUser = {
        id: newUser.user?.id,
        email: newUser.user?.email,
        phone: newUser.user?.phone,
        fullName: newUser.user?.user_metadata?.full_name,
        isActive: true,
        preferences: newUser.user?.user_metadata?.preferences || {},
        createdAt: newUser.user?.created_at,
        updatedAt: newUser.user?.updated_at
      };
      res.status(201);
      sendOk(res, createdUser);
    } catch (error) {
      handleDatabaseError(res, error, 'create user');
    }
  })
);

// Update user
router.patch('/:id',
  validateRequest({ body: UpdateUserDTO }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    try {
      // Update user using Supabase Auth
      const updatePayload: any = {};
      if (updateData.phone) updatePayload.phone = updateData.phone;
      if (updateData.fullName || updateData.avatarUrl || updateData.preferences) {
        updatePayload.user_metadata = {
          full_name: updateData.fullName,
          avatar_url: updateData.avatarUrl,
          preferences: updateData.preferences
        };
      }

      const { data: updatedUser, error } = await supabaseAdmin.auth.admin.updateUserById(id, updatePayload);

      if (error) {
        if (error.message.includes('not found')) {
          return HttpErrors.notFound(res, 'User not found');
        }
        return sendErr(res, 'UPDATE_ERROR', error.message, undefined, 400);
      }

      const mappedResult = {
        id: updatedUser.user?.id,
        email: updatedUser.user?.email,
        phone: updatedUser.user?.phone,
        fullName: updatedUser.user?.user_metadata?.full_name,
        avatarUrl: updatedUser.user?.user_metadata?.avatar_url,
        isActive: true,
        preferences: updatedUser.user?.user_metadata?.preferences || {},
        createdAt: updatedUser.user?.created_at,
        updatedAt: updatedUser.user?.updated_at
      };
      sendOk(res, mappedResult);
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