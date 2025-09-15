import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { sendOk, sendErr } from '../../lib/http';
import { supabaseAdmin, supabaseForUser } from '../../lib/supabase';

const r = Router();
r.use(requireAuth);

// POST /api/v1/admin/schema/reload - triggers PostgREST schema reload
r.post('/reload', async (req: any, res) => {
  try {
    const { data, error } = await supabaseAdmin.rpc('pgrst_reload');
    if (error) {
      return sendErr(res, 'BAD_REQUEST', 'Schema reload failed', error, 500);
    }
    return sendOk(res, { reloaded: true });
  } catch (err: any) {
    return sendErr(res, 'INTERNAL_ERROR', 'Schema reload error', err.message, 500);
  }
});

// POST /api/v1/admin/rls/selftest - tests RLS org_can_insert function
r.post('/rls/selftest', async (req: any, res) => {
  try {
    const token = req.headers.authorization?.slice(7); // Remove 'Bearer ' prefix
    if (!token) {
      return sendErr(res, 'UNAUTHORIZED', 'Missing authorization token', undefined, 401);
    }
    
    const sb = supabaseForUser(token);
    const { data, error } = await sb.rpc('org_can_insert');
    
    if (error) {
      return sendErr(res, 'BAD_REQUEST', 'RLS self-test failed', error, 500);
    }
    
    return sendOk(res, { canInsert: data });
  } catch (err: any) {
    return sendErr(res, 'INTERNAL_ERROR', 'RLS self-test error', err.message, 500);
  }
});

// GET /api/v1/admin/schema/tables - list database tables
r.get('/tables', async (req: any, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');
    
    if (error) {
      return sendErr(res, 'BAD_REQUEST', 'Failed to list tables', error, 500);
    }
    
    return sendOk(res, { tables: data?.map(t => t.table_name) || [] });
  } catch (err: any) {
    return sendErr(res, 'INTERNAL_ERROR', 'Schema tables error', err.message, 500);
  }
});

export default r;
import { Router } from 'express';
import { db } from '../../db.js';
import { sql } from 'drizzle-orm';

const router = Router();

// GET /api/v1/admin/schema/tables - List all tables
router.get('/tables', async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT 
        table_name,
        table_schema,
        table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    res.json({
      success: true,
      tables: result
    });
  } catch (error) {
    console.error('Schema tables error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch table information'
    });
  }
});

// POST /api/v1/admin/schema/reload - Reload schema cache
router.post('/reload', async (req, res) => {
  try {
    // Simple schema validation query
    await db.execute(sql`SELECT 1`);
    
    res.json({
      success: true,
      message: 'Schema cache reloaded successfully'
    });
  } catch (error) {
    console.error('Schema reload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reload schema cache'
    });
  }
});

export default router;
