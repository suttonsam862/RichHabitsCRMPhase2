import express from 'express';
import { CreateUserDTO, UpdateUserDTO, UserDTO } from '@shared/dtos';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/asyncHandler';
import { db } from '../../db';
import { users } from '@shared/schema';
import { sql, eq, ilike, desc } from 'drizzle-orm';
import { sendSuccess, HttpErrors, handleDatabaseError, mapDtoToDb, mapDbToDto } from '../../lib/http';

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

// List all users with pagination and search
router.get('/', asyncHandler(async (req, res) => {
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

    sendSuccess(res, data, total);
  } catch (error) {
    handleDatabaseError(res, error, 'list users');
  }
}));

// Get user by ID
router.get('/:id', asyncHandler(async (req, res) => {
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

    const mappedUser = dbRowToDto(result[0]);
    sendSuccess(res, mappedUser);
  } catch (error) {
    handleDatabaseError(res, error, 'fetch user');
  }
}));

// Create user
router.post('/',
  validateRequest({ body: CreateUserDTO }),
  asyncHandler(async (req, res) => {
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
      const now = new Date();
      const userData = {
        email: validatedData.email,
        phone: validatedData.phone || null,
        preferences: {},
        created_at: now,
        updated_at: now,
        ...mappedData
      };

      const result = await db
        .insert(users)
        .values(userData)
        .returning();

      const createdUser = dbRowToDto(result[0]);
      sendSuccess(res, createdUser, undefined, 201);
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
          updated_at: new Date()
        })
        .where(eq(users.id, id))
        .returning();

      if (result.length === 0) {
        return HttpErrors.notFound(res, 'User not found');
      }

      const mappedResult = dbRowToDto(result[0]);
      sendSuccess(res, mappedResult);
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