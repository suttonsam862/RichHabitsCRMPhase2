import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../lib/supabaseAdmin.js';
import { logger } from '../../lib/log.js';
import { logSbError } from '../../lib/dbLog.js';
import { sendOk, sendErr } from '../../lib/http.js';
import { requireAuth, AuthedRequest } from '../../middleware/auth.js';
import { randomUUID } from 'crypto';
import { generateRandomPassword } from '../../lib/uuid-generator.js';

const router = Router();

// Validation schemas
const CreateUserSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1),
  phone: z.string().optional(),
  role: z.string().default('customer'),
  organization_id: z.string().optional(),
  password: z.string().min(6).optional(), // Optional for auto-generated accounts
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().default('US'),
  notes: z.string().optional()
});

const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  full_name: z.string().min(1).optional(),
  phone: z.string().optional(),
  role: z.string().optional(),
  organization_id: z.string().optional().nullable(),
  is_active: z.number().min(0).max(1).optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional()
});

// Helper function to hash passwords (placeholder - use proper bcrypt in production)
async function hashPassword(password: string): Promise<string> {
  // In production, use bcrypt or similar
  return `hashed_${password}`;
}

// Statistics endpoint MUST come before /:id route to avoid conflicts
router.get('/__stats', requireAuth, async (req, res) => {
  const authedReq = req as AuthedRequest;
  try {
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, role, is_active, created_at');

    if (usersError) {
      logSbError(req, 'users.stats', usersError);
      return sendErr(res, 'DB_ERROR', usersError.message, undefined, 400);
    }

    const totalUsers = users?.length || 0;
    const activeUsers = users?.filter(u => u.is_active === 1).length || 0;
    const recentUsers = users?.filter(u => {
      if (!u.created_at) return false;
      const createdDate = new Date(u.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return createdDate >= thirtyDaysAgo;
    }).length || 0;

    // Role breakdown
    const roleBreakdown = users?.reduce((acc: Record<string, number>, user) => {
      const role = user.role || 'unknown';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {}) || {};

    const stats = {
      totalUsers,
      activeUsers,
      recentUsers,
      roleBreakdown
    };

    sendOk(res, stats);
  } catch (error: any) {
    logger.error({ error: error.message, rid: authedReq.user?.id }, 'Failed to get user statistics');
    sendErr(res, 'INTERNAL_ERROR', 'Failed to get user statistics', undefined, 500);
  }
});

// List users with filtering and pagination
router.get('/', requireAuth, async (req, res) => {
  const authedReq = req as AuthedRequest;
  try {
    const {
      page = '1',
      limit = '20',
      search = '',
      role = '',
      organization_id = '',
      is_active = ''
    } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 20, 100); // Max 100 per page
    const offset = (pageNum - 1) * limitNum;

    // Build query with filters
    let query = supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        full_name,
        phone,
        role,
        organization_id,
        is_active,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        country,
        last_login,
        email_verified,
        notes,
        created_at,
        updated_at
      `)
      .range(offset, offset + limitNum - 1)
      .order('created_at', { ascending: false });

    // Apply filters
    if (search && typeof search === 'string') {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (role && typeof role === 'string') {
      query = query.eq('role', role);
    }

    if (organization_id && typeof organization_id === 'string') {
      query = query.eq('organization_id', organization_id);
    }

    if (is_active && typeof is_active === 'string') {
      query = query.eq('is_active', parseInt(is_active));
    }

    const { data: users, error, count } = await query;

    if (error) {
      logSbError(req, 'users.list', error);
      return sendErr(res, 'DB_ERROR', error.message, undefined, 400);
    }

    // Also get total count for pagination
    let countQuery = supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (search && typeof search === 'string') {
      countQuery = countQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (role && typeof role === 'string') {
      countQuery = countQuery.eq('role', role);
    }
    if (organization_id && typeof organization_id === 'string') {
      countQuery = countQuery.eq('organization_id', organization_id);
    }
    if (is_active && typeof is_active === 'string') {
      countQuery = countQuery.eq('is_active', parseInt(is_active));
    }

    const { count: totalCount } = await countQuery;

    const mappedUsers = (users || []).map((user: any) => ({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      phone: user.phone,
      role: user.role,
      organizationId: user.organization_id,
      organizationName: null, // Temporarily disabled due to join issues
      isActive: user.is_active === 1,
      address: {
        line1: user.address_line1,
        line2: user.address_line2,
        city: user.city,
        state: user.state,
        postalCode: user.postal_code,
        country: user.country
      },
      lastLogin: user.last_login,
      emailVerified: user.email_verified === 1,
      notes: user.notes,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    }));

    return sendOk(res, mappedUsers, totalCount || 0);

  } catch (error: any) {
    logSbError(req, 'users.list.route', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to fetch users', error.message, 500);
  }
});

// Get user by ID
router.get('/:id', requireAuth, async (req, res) => {
  const authedReq = req as AuthedRequest;
  try {
    const { id } = req.params;

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        full_name,
        phone,
        role,
        organization_id,
        is_active,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        country,
        last_login,
        email_verified,
        notes,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .single();

    if (error || !user) {
      if (error?.code === 'PGRST116') {
        return sendErr(res, 'NOT_FOUND', 'User not found', undefined, 404);
      }
      logSbError(req, 'users.get', error);
      return sendErr(res, 'DB_ERROR', error?.message || 'User not found', undefined, 400);
    }

    const mappedUser = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      phone: user.phone,
      role: user.role,
      organizationId: user.organization_id,
      organizationName: null, // Temporarily disabled due to join issues
      isActive: user.is_active === 1,
      address: {
        line1: user.address_line1,
        line2: user.address_line2,
        city: user.city,
        state: user.state,
        postalCode: user.postal_code,
        country: user.country
      },
      lastLogin: user.last_login,
      emailVerified: user.email_verified === 1,
      notes: user.notes,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };

    return sendOk(res, mappedUser);

  } catch (error: any) {
    logSbError(req, 'users.get.route', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to fetch user', error.message, 500);
  }
});

// Create new user
router.post('/', requireAuth, async (req, res) => {
  const authedReq = req as AuthedRequest;
  try {
    const parseResult = CreateUserSchema.safeParse(req.body);

    if (!parseResult.success) {
      return sendErr(res, 'VALIDATION_ERROR', 'Invalid user data', parseResult.error.flatten(), 400);
    }

    const userData = parseResult.data;

    // Check for duplicate email in Supabase Auth first
    const { data: authUsers, error: authListError } = await supabaseAdmin.auth.admin.listUsers();
    if (authListError) {
      logger.error({ error: authListError }, 'Failed to check existing auth users');
      return sendErr(res, 'AUTH_ERROR', 'Failed to validate user uniqueness', undefined, 500);
    }

    const existingAuthUser = authUsers?.users?.find(user => user.email === userData.email);
    if (existingAuthUser) {
      return sendErr(res, 'CONFLICT', 'User with this email already exists in auth system', undefined, 409);
    }

    // Check for duplicate in database
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', userData.email)
      .single();

    if (existingUser) {
      return sendErr(res, 'CONFLICT', 'User with this email already exists', undefined, 409);
    }

    // Generate UUID for the user
    const userId = randomUUID();

    // Create Supabase Auth user first
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password || generateRandomPassword(),
      email_confirm: true,
      user_metadata: {
        full_name: userData.full_name,
        phone: userData.phone
      }
    });

    if (authError) {
      logger.error({ error: authError, email: userData.email }, 'Failed to create auth user');
      return sendErr(res, 'AUTH_ERROR', 'Failed to create authentication user', authError, 500);
    }

    // Prepare user data for insertion with the auth user's ID
    const insertData = {
      id: authUser.user?.id || userId, // Use auth user ID or fallback to generated UUID
      email: userData.email,
      full_name: userData.full_name,
      phone: userData.phone || null,
      role: userData.role,
      organization_id: userData.organization_id || null,
      password_hash: userData.password ? await hashPassword(userData.password) : null,
      is_active: 1,
      email_verified: 1, // Auth user is email confirmed
      address_line1: userData.address_line1 || null,
      address_line2: userData.address_line2 || null,
      city: userData.city || null,
      state: userData.state || null,
      postal_code: userData.postal_code || null,
      country: userData.country,
      notes: userData.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert([insertData])
      .select(`
        id,
        email,
        full_name,
        phone,
        role,
        organization_id,
        is_active,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        country,
        email_verified,
        notes,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      logSbError(req, 'users.create', error);
      return sendErr(res, 'DB_ERROR', error.message, undefined, 400);
    }

    const mappedUser = {
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.full_name,
      phone: newUser.phone,
      role: newUser.role,
      organizationId: newUser.organization_id,
      isActive: newUser.is_active === 1,
      address: {
        line1: newUser.address_line1,
        line2: newUser.address_line2,
        city: newUser.city,
        state: newUser.state,
        postalCode: newUser.postal_code,
        country: newUser.country
      },
      emailVerified: newUser.email_verified === 1,
      notes: newUser.notes,
      createdAt: newUser.created_at,
      updatedAt: newUser.updated_at
    };

    logger.info(`Created new user: ${newUser.email}`);
    res.status(201);
    return sendOk(res, mappedUser);

  } catch (error: any) {
    logSbError(req, 'users.create.route', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to create user', error.message, 500);
  }
});

// Update user
router.patch('/:id', requireAuth, async (req, res) => {
  const authedReq = req as AuthedRequest;
  try {
    const { id } = req.params;
    const parseResult = UpdateUserSchema.safeParse(req.body);

    if (!parseResult.success) {
      return sendErr(res, 'VALIDATION_ERROR', 'Invalid update data', parseResult.error.flatten(), 400);
    }

    const updateData = parseResult.data;

    // Check if user exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingUser) {
      return sendErr(res, 'NOT_FOUND', 'User not found', undefined, 404);
    }

    // If email is being changed, check for duplicates
    if (updateData.email) {
      const { data: emailConflict } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', updateData.email)
        .neq('id', id)
        .single();

      if (emailConflict) {
        return sendErr(res, 'CONFLICT', 'Email already in use by another user', undefined, 409);
      }
    }

    // Prepare update data
    const updatePayload: any = {
      updated_at: new Date().toISOString()
    };

    // Map fields
    if (updateData.email !== undefined) updatePayload.email = updateData.email;
    if (updateData.full_name !== undefined) updatePayload.full_name = updateData.full_name;
    if (updateData.phone !== undefined) updatePayload.phone = updateData.phone;
    if (updateData.role !== undefined) updatePayload.role = updateData.role;
    if (updateData.organization_id !== undefined) updatePayload.organization_id = updateData.organization_id;
    if (updateData.is_active !== undefined) updatePayload.is_active = updateData.is_active;
    if (updateData.address_line1 !== undefined) updatePayload.address_line1 = updateData.address_line1;
    if (updateData.address_line2 !== undefined) updatePayload.address_line2 = updateData.address_line2;
    if (updateData.city !== undefined) updatePayload.city = updateData.city;
    if (updateData.state !== undefined) updatePayload.state = updateData.state;
    if (updateData.postal_code !== undefined) updatePayload.postal_code = updateData.postal_code;
    if (updateData.country !== undefined) updatePayload.country = updateData.country;
    if (updateData.notes !== undefined) updatePayload.notes = updateData.notes;

    const { data: updatedUser, error } = await supabaseAdmin
      .from('users')
      .update(updatePayload)
      .eq('id', id)
      .select(`
        id,
        email,
        full_name,
        phone,
        role,
        organization_id,
        is_active,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        country,
        email_verified,
        notes,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      logSbError(req, 'users.update', error);
      return sendErr(res, 'DB_ERROR', error.message, undefined, 400);
    }

    const mappedUser = {
      id: updatedUser.id,
      email: updatedUser.email,
      fullName: updatedUser.full_name,
      phone: updatedUser.phone,
      role: updatedUser.role,
      organizationId: updatedUser.organization_id,
      organizationName: null, // Temporarily disabled due to join issues
      isActive: updatedUser.is_active === 1,
      address: {
        line1: updatedUser.address_line1,
        line2: updatedUser.address_line2,
        city: updatedUser.city,
        state: updatedUser.state,
        postalCode: updatedUser.postal_code,
        country: updatedUser.country
      },
      emailVerified: updatedUser.email_verified === 1,
      notes: updatedUser.notes,
      createdAt: updatedUser.created_at,
      updatedAt: updatedUser.updated_at
    };

    logger.info(`Updated user: ${updatedUser.email}`);
    return sendOk(res, mappedUser);

  } catch (error: any) {
    logSbError(req, 'users.update.route', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to update user', error.message, 500);
  }
});

// Delete user
router.delete('/:id', requireAuth, async (req, res) => {
  const authedReq = req as AuthedRequest;
  try {
    const { id } = req.params;

    // Check if user exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('id', id)
      .single();

    if (!existingUser) {
      return sendErr(res, 'NOT_FOUND', 'User not found', undefined, 404);
    }

    // Soft delete by setting is_active to 0
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        is_active: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      logSbError(req, 'users.delete', error);
      return sendErr(res, 'DB_ERROR', error.message, undefined, 400);
    }

    logger.info(`Soft deleted user: ${existingUser.email}`);
    return res.status(204).send();

  } catch (error: any) {
    logSbError(req, 'users.delete.route', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to delete user', error.message, 500);
  }
});


export { router as comprehensiveUsersRouter };
export default router;