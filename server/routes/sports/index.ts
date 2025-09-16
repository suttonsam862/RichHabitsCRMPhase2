
import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../lib/supabaseAdmin.js';
import { sendOk, sendCreated, sendErr } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

// Validation schema for sports
const createSportSchema = z.object({
  name: z.string().min(1, 'Sport name is required')
});

const updateSportSchema = z.object({
  name: z.string().min(1, 'Sport name is required')
});

// Helper function to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// GET /api/v1/sports - List all sports
router.get('/', requireAuth, async (req, res) => {
  try {
    const sb = supabaseAdmin;
    const { data, error } = await sb
      .from('sports')
      .select('*')
      .order('name');

    if (error) {
      console.error('Sports fetch error:', error);
      return sendErr(res, 'BAD_REQUEST', error.message, undefined, 400);
    }

    return sendOk(res, data);
  } catch (error: any) {
    console.error('Sports list error:', error);
    return sendErr(res, 'INTERNAL_SERVER_ERROR', 'Failed to fetch sports', undefined, 500);
  }
});

// POST /api/v1/sports - Create a new sport
router.post('/', requireAuth, async (req, res) => {
  const parse = createSportSchema.safeParse(req.body);
  
  if (!parse.success) {
    return sendErr(res, 'BAD_REQUEST', 'Invalid sport data', parse.error.flatten(), 400);
  }

  const sb = supabaseAdmin;
  const slug = generateSlug(parse.data.name);
  
  const { data, error } = await sb
    .from('sports')
    .insert([{ 
      name: parse.data.name,
      slug: slug
    }])
    .select()
    .single();

  if (error) {
    console.log('Database error:', error);
    // If it's a unique constraint violation on slug, try with a suffix
    if (error.message?.includes('sports_slug_unique')) {
      const timestamp = Date.now();
      const { data: retryData, error: retryError } = await sb
        .from('sports')
        .insert([{ 
          name: parse.data.name,
          slug: `${slug}-${timestamp}`
        }])
        .select()
        .single();
      
      if (retryError) {
        return sendErr(res, 'BAD_REQUEST', retryError.message, undefined, 400);
      }
      return sendCreated(res, retryData);
    }
    return sendErr(res, 'BAD_REQUEST', error.message, undefined, 400);
  }
  return sendCreated(res, data);
});

// GET /api/v1/sports/:id - Get a specific sport
router.get('/:id', requireAuth, async (req, res) => {
  const sb = supabaseAdmin;
  const { data, error } = await sb
    .from('sports')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error) return sendErr(res, 'NOT_FOUND', 'Sport not found', undefined, 404);
  return sendOk(res, data);
});

// PATCH /api/v1/sports/:id - Update a sport
router.patch('/:id', requireAuth, async (req, res) => {
  const parse = updateSportSchema.safeParse(req.body);
  if (!parse.success) return sendErr(res, 'BAD_REQUEST', 'Invalid sport data', parse.error.flatten(), 400);

  const sb = supabaseAdmin;
  const slug = generateSlug(parse.data.name);
  
  const { data, error } = await sb
    .from('sports')
    .update({ 
      name: parse.data.name,
      slug: slug
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) {
    // If it's a unique constraint violation on slug, try with a suffix
    if (error.message?.includes('sports_slug_unique')) {
      const timestamp = Date.now();
      const { data: retryData, error: retryError } = await sb
        .from('sports')
        .update({ 
          name: parse.data.name,
          slug: `${slug}-${timestamp}`
        })
        .eq('id', req.params.id)
        .select()
        .single();
      
      if (retryError) {
        return sendErr(res, 'BAD_REQUEST', retryError.message, undefined, 400);
      }
      return sendOk(res, retryData);
    }
    return sendErr(res, 'BAD_REQUEST', error.message, undefined, 400);
  }
  return sendOk(res, data);
});

// DELETE /api/v1/sports/:id - Delete a sport
router.delete('/:id', requireAuth, async (req, res) => {
  const sb = supabaseAdmin;
  const { error } = await sb
    .from('sports')
    .delete()
    .eq('id', req.params.id);

  if (error) return sendErr(res, 'BAD_REQUEST', error.message, undefined, 400);
  return sendOk(res, { message: 'Sport deleted successfully' });
});

export default router;
