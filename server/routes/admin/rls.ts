/**
 * RLS Diagnostics & Management Routes
 * Provides testing and debugging capabilities for Row Level Security
 */

import { Router } from 'express';
import { z } from 'zod';
import { sendOk, sendErr } from '../../lib/http';
import { mapPgError, mapValidationError } from '../../lib/err';
import { supabaseForUser, supabaseAdmin } from '../../lib/supabase';
import { requireAuth } from '../../middleware/auth';
import { logger } from '../../lib/log';

const r = Router();

// Schema for org-sports selftest
const orgSportsSelftestSchema = z.object({
  orgId: z.string().uuid('Invalid organization ID')
});

/**
 * POST /schema/reload
 * Force PostgREST schema reload
 */
r.post('/schema/reload', async (req: any, res) => {
  try {
    logger.info({ rid: res.locals?.rid }, 'Forcing PostgREST schema reload');
    
    // Multiple reload methods for maximum effectiveness
    await Promise.allSettled([
      supabaseAdmin.rpc('pgrst_reload'),
      supabaseAdmin.from('pg_notify').insert([
        { channel: 'pgrst', payload: 'reload schema' }
      ]),
      supabaseAdmin.from('pg_notify').insert([
        { channel: 'pgrst', payload: 'reload config' }
      ])
    ]);
    
    logger.info({ rid: res.locals?.rid }, 'Schema reload completed');
    return sendOk(res, { reloaded: true });
    
  } catch (error: any) {
    logger.error({ rid: res.locals?.rid, error: error.message }, 'Schema reload failed');
    const mappedError = mapPgError(error);
    return sendErr(res, 500, mappedError.message, mappedError);
  }
});

/**
 * POST /selftest/org
 * Test basic org creation permissions for authenticated user
 */
r.post('/selftest/org', requireAuth, async (req: any, res) => {
  try {
    const token = req.headers.authorization?.slice(7);
    if (!token) {
      return sendErr(res, 401, 'No authorization token provided');
    }
    
    const sb = supabaseForUser(token);
    const { data, error } = await sb.rpc('org_can_insert');
    
    if (error) {
      logger.warn({ rid: res.locals?.rid, error: error.message }, 'Org selftest failed');
      const mappedError = mapPgError(error);
      return sendErr(res, 400, mappedError.message, mappedError);
    }
    
    logger.info({ rid: res.locals?.rid, canInsert: data }, 'Org selftest completed');
    return sendOk(res, { 
      canInsertOrg: data,
      userId: req.user?.id,
      testResult: data ? 'PASS' : 'FAIL'
    });
    
  } catch (error: any) {
    logger.error({ rid: res.locals?.rid, error: error.message }, 'Org selftest error');
    const mappedError = mapPgError(error);
    return sendErr(res, 500, mappedError.message, mappedError);
  }
});

/**
 * POST /selftest/org-sports
 * Test org_sports creation permissions for specific organization
 */
r.post('/selftest/org-sports', requireAuth, async (req: any, res) => {
  try {
    const parse = orgSportsSelftestSchema.safeParse(req.body);
    if (!parse.success) {
      const errors = mapValidationError(parse.error);
      return sendErr(res, 400, errors.message, errors.details);
    }
    
    const token = req.headers.authorization?.slice(7);
    if (!token) {
      return sendErr(res, 401, 'No authorization token provided');
    }
    
    const sb = supabaseForUser(token);
    const { data, error } = await sb.rpc('org_sports_can_insert', { 
      p_org: parse.data.orgId 
    });
    
    if (error) {
      logger.warn({ 
        rid: res.locals?.rid, 
        orgId: parse.data.orgId,
        error: error.message 
      }, 'Org-sports selftest failed');
      const mappedError = mapPgError(error);
      return sendErr(res, 400, mappedError.message, mappedError);
    }
    
    logger.info({ 
      rid: res.locals?.rid, 
      orgId: parse.data.orgId,
      canInsert: data 
    }, 'Org-sports selftest completed');
    
    return sendOk(res, { 
      canInsertOrgSports: data,
      userId: req.user?.id,
      orgId: parse.data.orgId,
      testResult: data ? 'PASS' : 'FAIL'
    });
    
  } catch (error: any) {
    logger.error({ rid: res.locals?.rid, error: error.message }, 'Org-sports selftest error');
    const mappedError = mapPgError(error);
    return sendErr(res, 500, mappedError.message, mappedError);
  }
});

/**
 * GET /policies/organizations
 * List all RLS policies for organizations table
 */
r.get('/policies/organizations', async (req: any, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'organizations')
      .order('policyname');
    
    if (error) {
      const mappedError = mapPgError(error);
      return sendErr(res, 400, mappedError.message, mappedError);
    }
    
    return sendOk(res, data || []);
    
  } catch (error: any) {
    const mappedError = mapPgError(error);
    return sendErr(res, 500, mappedError.message, mappedError);
  }
});

/**
 * GET /policies/org-sports
 * List all RLS policies for org_sports table
 */
r.get('/policies/org-sports', async (req: any, res) => {
  try {
    const { data, error } = await supabaseAdmin.rpc('exec_sql', {
      query: 'SELECT schemaname, tablename, policyname, permissive, roles, cmd FROM pg_policies WHERE tablename = $1',
      params: ['org_sports']
    });
    
    if (error) {
      const mappedError = mapPgError(error);
      return sendErr(res, 400, mappedError.message, mappedError);
    }
    
    return sendOk(res, data || []);
    
  } catch (error: any) {
    const mappedError = mapPgError(error);
    return sendErr(res, 500, mappedError.message, mappedError);
  }
});

export default r;