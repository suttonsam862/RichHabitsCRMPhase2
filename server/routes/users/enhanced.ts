
import express from 'express';
import { z } from 'zod';
import { sendSuccess, sendErr, sendCreated } from '../../lib/http';
import { requireAuth, AuthedRequest } from '../../middleware/auth';
import { supabaseAdmin } from '../../lib/supabase';

const router = express.Router();

// Enhanced user creation with permissions and subroles
const createUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  phone: z.string().optional(),
  role: z.enum(['admin', 'sales', 'designer', 'manufacturing', 'customer']),
  subrole: z.enum(['salesperson', 'designer', 'manufacturer']).optional(),
  organizationId: z.string().uuid().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  hireDate: z.string().optional(),
  permissions: z.record(z.boolean()).optional(),
  pageAccess: z.record(z.boolean()).optional(),
  sendWelcomeEmail: z.boolean().default(true)
});

// Update user schema with enhanced fields
const updateUserSchema = z.object({
  fullName: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(['admin', 'sales', 'designer', 'manufacturing', 'customer']).optional(),
  subrole: z.enum(['salesperson', 'designer', 'manufacturer']).optional(),
  organizationId: z.string().uuid().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  hireDate: z.string().optional(),
  permissions: z.record(z.boolean()).optional(),
  pageAccess: z.record(z.boolean()).optional(),
  isActive: z.boolean().optional(),
  avatarUrl: z.string().url().optional()
});

// List users with staff/customer separation
router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { type = 'all', page = '1', limit = '20', pageSize, search = '', q = '' } = req.query;

    // Use q parameter as fallback for search if provided (frontend compatibility)
    const searchTerm = search || q || '';

    // Check if user has permission to view users
    const requestingUserId = req.user?.id;
    if (!requestingUserId) {
      return sendErr(res, 'UNAUTHORIZED', 'Authentication required', undefined, 401);
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt((pageSize || limit) as string) || 20));

    // Get users from Supabase Auth instead of our database table
    const { data: authUsers, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error('Error fetching users from Supabase Auth:', error);
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

    // Apply search filter if provided
    if (searchTerm && typeof searchTerm === 'string' && searchTerm.trim()) {
      const searchLower = searchTerm.trim().toLowerCase();
      filteredResults = filteredResults.filter(user => 
        user.email?.toLowerCase().includes(searchLower) ||
        user.user_metadata?.full_name?.toLowerCase().includes(searchLower)
      );
    }

    // Apply type filter
    if (type && type !== 'all') {
      const userRole = (user: any) => user.user_metadata?.role || 'customer';
      
      if (type === 'staff') {
        filteredResults = filteredResults.filter(user => 
          ['admin', 'sales', 'designer', 'manufacturing', 'staff'].includes(userRole(user))
        );
      } else if (type === 'customer') {
        filteredResults = filteredResults.filter(user => userRole(user) === 'customer');
      }
    }

    // Apply pagination
    const offset = (pageNum - 1) * limitNum;
    const paginatedResults = filteredResults.slice(offset, offset + limitNum);

    // Transform users to include address object structure
    const transformedUsers = paginatedResults.map(user => ({
      id: user.id,
      email: user.email,
      fullName: user.user_metadata?.full_name || null,
      phone: user.phone,
      role: user.user_metadata?.role || 'customer',
      organizationId: user.user_metadata?.organization_id || null,
      organizationName: null, // Would need separate lookup
      isActive: !user.banned_until,
      jobTitle: user.user_metadata?.job_title || null,
      department: user.user_metadata?.department || null,
      avatarUrl: user.user_metadata?.avatar_url || null,
      address: {
        line1: user.user_metadata?.address?.line1 || '',
        line2: user.user_metadata?.address?.line2 || '',
        city: user.user_metadata?.address?.city || '',
        state: user.user_metadata?.address?.state || '',
        postalCode: user.user_metadata?.address?.postalCode || '',
        country: user.user_metadata?.address?.country || 'US'
      },
      lastLogin: user.last_sign_in_at,
      emailVerified: !!user.email_confirmed_at,
      notes: user.user_metadata?.notes || null,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    }));

    return sendSuccess(res, {
      users: transformedUsers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filteredResults.length,
        pages: Math.ceil(filteredResults.length / limitNum)
      }
    });

  } catch (error) {
    console.error('Error in enhanced users list:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Internal server error', error, 500);
  }
});

// Get single user with full details
router.get('/:id', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { id } = req.params;

    // Check permissions - for now allow all authenticated users
    const requestingUserId = req.user?.id;
    if (!requestingUserId) {
      return sendErr(res, 'UNAUTHORIZED', 'Authentication required', undefined, 401);
    }

    const { data: user, error } = await supabaseAdmin.auth.admin.getUserById(id);

    if (error || !user) {
      return sendErr(res, 'NOT_FOUND', 'User not found', undefined, 404);
    }

    const transformedUser = {
      id: user.user.id,
      email: user.user.email,
      fullName: user.user.user_metadata?.full_name || null,
      phone: user.user.phone,
      role: user.user.user_metadata?.role || 'customer',
      organizationId: user.user.user_metadata?.organization_id || null,
      organizationName: null,
      isActive: !user.user.banned_until,
      jobTitle: user.user.user_metadata?.job_title || null,
      department: user.user.user_metadata?.department || null,
      avatarUrl: user.user.user_metadata?.avatar_url || null,
      address: {
        line1: user.user.user_metadata?.address?.line1 || '',
        line2: user.user.user_metadata?.address?.line2 || '',
        city: user.user.user_metadata?.address?.city || '',
        state: user.user.user_metadata?.address?.state || '',
        postalCode: user.user.user_metadata?.address?.postalCode || '',
        country: user.user.user_metadata?.address?.country || 'US'
      },
      lastLogin: user.user.last_sign_in_at,
      emailVerified: !!user.user.email_confirmed_at,
      notes: user.user.user_metadata?.notes || null,
      createdAt: user.user.created_at,
      updatedAt: user.user.updated_at
    };

    return sendSuccess(res, transformedUser);
  } catch (error) {
    console.error('Error fetching enhanced user:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Internal server error', error, 500);
  }
});

export { router as enhancedUsersRouter };
