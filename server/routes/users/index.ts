import express from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler';
import { db } from '../../db';
import { sql, eq } from 'drizzle-orm';

// User schema
const CreateUserSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1),
  phone: z.string().optional(),
  avatar_url: z.string().url().optional(),
});

const UpdateUserSchema = CreateUserSchema.partial();

const router = express.Router();

// List all users with pagination
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
    // Minimal implementation - using raw query until users table is added to schema
    let query = 'SELECT id, name, email, role, created_at, updated_at FROM users';
    let countQuery = 'SELECT COUNT(*) as count FROM users';
    let params: any[] = [];

    if (q && typeof q === 'string' && q.trim()) {
      query += ` WHERE name ILIKE '%${q.trim()}%'`;
      countQuery += ` WHERE name ILIKE '%${q.trim()}%'`;
    }

    query += ` ORDER BY created_at DESC LIMIT ${pageSizeNum} OFFSET ${offset}`;

    const countResult = await db.execute(sql.raw(countQuery));
    const total = Number((countResult as any)[0]?.count || 0);

    const results = await db.execute(sql.raw(query));
    const rows = (results as any) || [];

    // Map to camelCase
    const data = rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined
    }));

    res.json({
      success: true,
      data,
      count: total
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.json({
      success: true,
      data: [],
      count: 0,
      warning: 'database query failed - returning empty result'
    });
  }
}));

// Create user
router.post('/', asyncHandler(async (req, res) => {
  const parseResult = CreateUserSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      issues: parseResult.error.issues
    });
  }

  const userData = parseResult.data;

  try {
    // Check if user already exists
    const existingUser = await db.execute(sql`
      SELECT id FROM users WHERE email = ${userData.email}
    `);

    if ((existingUser as any).length > 0) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Create user
    const result = await db.execute(sql`
      INSERT INTO users (email, full_name, phone, avatar_url)
      VALUES (${userData.email}, ${userData.full_name}, ${userData.phone || null}, ${userData.avatar_url || null})
      RETURNING id, email, full_name, avatar_url, phone, created_at, updated_at, is_active
    `);

    res.status(201).json({
      success: true,
      data: (result as any)[0]
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Get user by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.execute(sql`
      SELECT id, email, full_name, avatar_url, phone, created_at, updated_at, is_active, last_login, preferences
      FROM users 
      WHERE id = ${id}
    `);

    if ((result as any).length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: (result as any)[0]
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Update user
router.patch('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const parseResult = UpdateUserSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      issues: parseResult.error.issues
    });
  }

  const updateData = parseResult.data;

  try {
    // Build dynamic update query
    const setClause = Object.entries(updateData)
      .map(([key, value]) => `${key} = ${value === null ? 'NULL' : `'${value}'`}`)
      .join(', ');

    if (!setClause) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    const result = await db.execute(sql`
      UPDATE users 
      SET ${sql.raw(setClause)}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, email, full_name, avatar_url, phone, created_at, updated_at, is_active
    `);

    if ((result as any).length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: (result as any)[0]
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

export { router as usersRouter };