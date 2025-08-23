import express from 'express';
import { CreateUserDTO, UpdateUserDTO, UserDTO } from '@shared/dtos';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/asyncHandler';
import { db } from '../../db';
import { users } from '@shared/schema';
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
    
    // Search query by name or email
    if (q && typeof q === 'string' && q.trim()) {
      const searchTerm = `%${q.trim()}%`;
      conditions.push(sql`(${users.fullName} ILIKE ${searchTerm} OR ${users.email} ILIKE ${searchTerm})`);
    }

    // Get total count
    const countResult = await db
      .select({ count: sql`count(*)` })
      .from(users)
      .where(conditions.length > 0 ? sql`${conditions[0]}` : undefined);

    const total = Number(countResult[0]?.count || 0);

    // Get paginated results
    const results = await db
      .select()
      .from(users)
      .where(conditions.length > 0 ? sql`${conditions[0]}` : undefined)
      .orderBy(desc(users.createdAt))
      .limit(pageSizeNum)
      .offset(offset);

    // Map database rows to DTOs
    const data = results.map(dbRowToDto);

    sendOk(res, data, total);
  } catch (error) {
    handleDatabaseError(res, error, 'list users');
  }
}));

// Get user by ID with roles
router.get('/:id', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const { id } = req.params;

  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (result.length === 0) {
      return HttpErrors.notFound(res, 'User not found');
    }

    // Get user roles
    const rolesResult = await db.execute(sql`
      SELECT r.id, r.name, r.slug, ur.org_id
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ${id}
    `);
    
    const mappedUser = {
      ...dbRowToDto(result[0]),
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
      // Check if user already exists
      const existingUser = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, validatedData.email))
        .limit(1);

      if (existingUser.length > 0) {
        return HttpErrors.conflict(res, 'User with this email already exists');
      }

      // Map DTO fields to DB fields
      const mappedData = mapDtoToDb(validatedData, DTO_TO_DB_MAPPING);
      
      // Prepare user data
      const now = new Date().toISOString();
      const userData = {
        email: validatedData.email,
        phone: validatedData.phone || null,
        fullName: validatedData.fullName || validatedData.email.split('@')[0],
        preferences: {},
        createdAt: now,
        updatedAt: now,
        ...mappedData
      };

      const result = await db
        .insert(users)
        .values(userData)
        .returning();

      const createdUser = dbRowToDto(result[0]);
      sendOk(res, createdUser, undefined, 201);
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
      // Map DTO fields to DB fields
      const mappedData = mapDtoToDb(updateData, DTO_TO_DB_MAPPING);
      
      const result = await db
        .update(users)
        .set({
          ...mappedData,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, id))
        .returning();

      if (result.length === 0) {
        return HttpErrors.notFound(res, 'User not found');
      }

      const mappedResult = dbRowToDto(result[0]);
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
    const result = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning();

    if (result.length === 0) {
      return HttpErrors.notFound(res, 'User not found');
    }

    res.status(204).send();
  } catch (error) {
    handleDatabaseError(res, error, 'delete user');
  }
}));

export { router as usersRouter };