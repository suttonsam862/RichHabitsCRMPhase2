import express from 'express';
import { supabaseAdmin } from '../../lib/supabase';
import { requireAuth, AuthedRequest } from '../../middleware/auth';
import { sendSuccess, sendErr } from '../../lib/http';
import { dashboardRouter } from './dashboard';
import { 
  validateRequest, 
  CreateSalespersonProfileSchema, 
  UpdateSalespersonProfileSchema 
} from '../../lib/validation';

const router = express.Router();

// Mount dashboard routes
router.use('/dashboard', dashboardRouter);

// Get all salespeople with their profiles and assignments
router.get('/salespeople', requireAuth, async (req, res) => {
  const authedReq = req as AuthedRequest;
  // Runtime safety check
  if (!authedReq.user) {
    return sendErr(res, 'UNAUTHORIZED', 'User authentication required', undefined, 401);
  }
  try {
    // Get all salesperson profiles with user data
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('salesperson_profiles')
      .select(`
        *,
        user:userId (
          id,
          email,
          full_name,
          phone,
          role,
          is_active
        )
      `);

    if (profilesError) {
      console.error('Error fetching salesperson profiles:', profilesError);
      return sendErr(res, 'INTERNAL_ERROR', 'Failed to fetch salespeople', undefined, 500);
    }

    // Get assignment counts for each salesperson
    const salespeopleWithCounts = await Promise.all(
      (profiles || []).map(async (profile) => {
        // Get total assignments count
        const { count: totalAssignments, error: totalError } = await supabaseAdmin
          .from('salesperson_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('salespersonId', profile.userId);

        // Get active assignments count
        const { count: activeAssignments, error: activeError } = await supabaseAdmin
          .from('salesperson_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('salespersonId', profile.userId)
          .eq('isActive', true);

        if (totalError) console.warn('Error fetching total assignments for', profile.userId, totalError);
        if (activeError) console.warn('Error fetching active assignments for', profile.userId, activeError);

        return {
          id: profile.userId,
          full_name: profile.user?.full_name || 'Unknown',
          email: profile.user?.email || '',
          phone: profile.user?.phone || '',
          organization_id: 'global', // Default for now
          profile,
          assignments: totalAssignments || 0,
          active_assignments: activeAssignments || 0
        };
      })
    );

    console.log('📊 Salespeople data fetched:', salespeopleWithCounts.length, 'records');
    return sendSuccess(res, salespeopleWithCounts);

  } catch (error) {
    console.error('Error in salespeople route:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Internal server error', undefined, 500);
  }
});

// Create salesperson profile for existing user
router.post('/salespeople/:userId/profile', 
  requireAuth, 
  validateRequest(CreateSalespersonProfileSchema),
  async (req, res) => {
    const authedReq = req as AuthedRequest;
    // Runtime safety check
    if (!authedReq.user) {
      return sendErr(res, 'UNAUTHORIZED', 'User authentication required', undefined, 401);
    }
    const { userId } = req.params;
    const {
      commission_rate = 0.05,
      territory,
      hire_date,
      performance_tier = 'standard'
    } = req.body;

    try {
      // Check if profile already exists
      const { data: existingProfile, error: checkError } = await supabaseAdmin
        .from('salesperson_profiles')
        .select('id')
        .eq('userId', userId)
        .single();

      if (existingProfile) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'PROFILE_EXISTS',
            message: 'A sales profile has already been created for this user.'
          }
        });
      }

      // Generate employee ID
      const { count } = await supabaseAdmin
        .from('salesperson_profiles')
        .select('*', { count: 'exact', head: true });

      const employeeId = `EMP-${String((count || 0) + 1).padStart(4, '0')}`;

      // Create salesperson profile
      const { data: profile, error: createError } = await supabaseAdmin
        .from('salesperson_profiles')
        .insert({
          userId,
          employeeId,
          commissionRate: commission_rate,
          territory: Array.isArray(territory) ? JSON.stringify(territory) : territory,
          hireDate: hire_date,
          performanceTier: performance_tier,
          isActive: true
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating salesperson profile:', createError);
        return sendErr(res, 'CREATE_ERROR', 'Failed to create salesperson profile', createError, 400);
      }

      console.log('✅ Salesperson profile created:', profile.id);
      return sendSuccess(res, profile);

    } catch (error) {
      console.error('Error creating salesperson profile:', error);
      return sendErr(res, 'INTERNAL_ERROR', 'Internal server error', undefined, 500);
    }
  });

// Update salesperson profile
router.patch('/salespeople/:userId/profile', 
  requireAuth, 
  validateRequest(UpdateSalespersonProfileSchema),
  async (req, res) => {
    const authedReq = req as AuthedRequest;
    // Runtime safety check
    if (!authedReq.user) {
      return sendErr(res, 'UNAUTHORIZED', 'User authentication required', undefined, 401);
    }
    const { userId } = req.params;
    const updateData = req.body;

    try {
      // Prepare update data
      const updatePayload: any = {};

      if (updateData.commission_rate !== undefined) {
        updatePayload.commissionRate = updateData.commission_rate;
      }
      if (updateData.territory !== undefined) {
        updatePayload.territory = Array.isArray(updateData.territory) ? JSON.stringify(updateData.territory) : updateData.territory;
      }
      if (updateData.hire_date !== undefined) {
        updatePayload.hireDate = updateData.hire_date;
      }
      if (updateData.performance_tier !== undefined) {
        updatePayload.performanceTier = updateData.performance_tier;
      }
      if (updateData.is_active !== undefined) {
        updatePayload.isActive = updateData.is_active;
      }

      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('salesperson_profiles')
        .update(updatePayload)
        .eq('userId', userId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating salesperson profile:', updateError);
        return sendErr(res, 'UPDATE_ERROR', 'Failed to update salesperson profile', updateError, 400);
      }

      console.log('✅ Salesperson profile updated:', updatedProfile.id);
      return sendSuccess(res, updatedProfile);

    } catch (error) {
      console.error('Error updating salesperson profile:', error);
      return sendErr(res, 'INTERNAL_ERROR', 'Internal server error', undefined, 500);
    }
  });

// Delete salesperson profile
router.delete('/salespeople/:userId/profile', requireAuth, async (req, res) => {
  const authedReq = req as AuthedRequest;
  // Runtime safety check
  if (!authedReq.user) {
    return sendErr(res, 'UNAUTHORIZED', 'User authentication required', undefined, 401);
  }
  const { userId } = req.params;

  try {
    const { error: deleteError } = await supabaseAdmin
      .from('salesperson_profiles')
      .delete()
      .eq('userId', userId);

    if (deleteError) {
      console.error('Error deleting salesperson profile:', deleteError);
      return sendErr(res, 'DELETE_ERROR', 'Failed to delete salesperson profile', deleteError, 400);
    }

    console.log('✅ Salesperson profile deleted for user:', userId);
    res.status(204).send();

  } catch (error) {
    console.error('Error deleting salesperson profile:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Internal server error', undefined, 500);
  }
});

export { router as salesRouter };