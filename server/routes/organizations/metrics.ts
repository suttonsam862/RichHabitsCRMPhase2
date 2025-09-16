import { Router } from 'express';
import { supabaseAdmin } from '../../lib/supabaseAdmin.js';
import { logSbError } from '../../lib/dbLog.js';
import { requireAuth } from '../../middleware/auth';
import { requireOrgReadonly, requireOrgAdmin } from '../../middleware/orgSecurity';

const router = Router();

// GET organization metrics/KPIs
router.get('/:id/metrics', requireAuth, requireOrgReadonly(), async (req, res) => {
  try {
    const { id } = req.params;
    
    // First, verify the organization exists
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, created_at')
      .eq('id', id)
      .single();

    if (orgError || !org) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      });
    }

    // Get metrics from organization_metrics table
    const { data: metrics, error: metricsError } = await supabaseAdmin
      .from('organization_metrics')
      .select('*')
      .eq('organization_id', id)
      .single();

    // Calculate years with company from organization creation date
    const createdDate = new Date(org.created_at);
    const currentDate = new Date();
    const yearsWithCompany = Math.max(1, Math.floor((currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 365)));

    // Get additional metrics from related tables
    const { data: sportsCount } = await supabaseAdmin
      .from('org_sports')
      .select('id', { count: 'exact' })
      .eq('organization_id', id);

    const { data: ordersData } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('org_id', id);

    const totalOrders = ordersData?.length || 0;

    if (metricsError && metricsError.code !== 'PGRST116') {
      // Log error but don't fail - we'll return computed metrics
      logSbError(req, 'metrics.get', metricsError);
    }

    // If no metrics record exists, return computed/default values
    const responseData = {
      totalRevenue: metrics?.total_revenue || 0,
      totalOrders: metrics?.total_orders || totalOrders,
      activeSports: metrics?.active_sports || sportsCount?.length || 0,
      yearsWithRichHabits: metrics?.years_with_company || yearsWithCompany,
      averageOrderValue: metrics?.average_order_value || (metrics?.total_revenue && metrics?.total_orders ? Math.round(metrics.total_revenue / metrics.total_orders) : 0),
      repeatCustomerRate: metrics?.repeat_customer_rate || 0,
      growthRate: metrics?.growth_rate || 0,
      satisfactionScore: metrics?.satisfaction_score || 0,
      lastUpdated: metrics?.last_updated || null
    };

    res.json({
      success: true,
      data: responseData,
      computed: !metrics // Flag to indicate if these are computed vs stored metrics
    });

  } catch (error: any) {
    logSbError(req, 'metrics.get.catch', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch organization metrics',
      details: error.message
    });
  }
});

// Update organization metrics (for future admin functionality)
router.post('/:id/metrics', requireAuth, requireOrgAdmin(), async (req, res) => {
  try {
    const { id } = req.params;
    const metricsData = req.body;

    // Verify organization exists
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('id', id)
      .single();

    if (orgError || !org) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      });
    }

    // Upsert metrics data
    const { data, error } = await supabaseAdmin
      .from('organization_metrics')
      .upsert({
        organization_id: id,
        ...metricsData,
        last_updated: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      logSbError(req, 'metrics.upsert', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update metrics'
      });
    }

    res.json({
      success: true,
      data: data
    });

  } catch (error: any) {
    logSbError(req, 'metrics.post.catch', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update organization metrics',
      details: error.message
    });
  }
});

export default router;