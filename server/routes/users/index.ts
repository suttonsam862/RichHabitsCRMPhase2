import express from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler';
import { db } from '../../db';
import { sql } from 'drizzle-orm';
// TODO: Add users table to schema - using minimal approach for now

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
    const total = Number((countResult as any).rows?.[0]?.count || 0);

    const results = await db.execute(sql.raw(query));
    const rows = (results as any).rows || [];

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

// Get user by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  try {
    const query = 'SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = $1 LIMIT 1';
    const result = await db.execute(sql.raw(query.replace('$1', `'${id}'`)));
    const rows = (result as any).rows || [];

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Map to camelCase
    const data = {
      id: rows[0].id,
      name: rows[0].name,
      email: rows[0].email,
      role: rows[0].role,
      createdAt: rows[0].created_at ? new Date(rows[0].created_at).toISOString() : undefined,
      updatedAt: rows[0].updated_at ? new Date(rows[0].updated_at).toISOString() : undefined
    };

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }
}));

export { router as usersRouter };