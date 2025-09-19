import { Router } from 'express';
import { supabaseAdmin } from '../../lib/supabase.js';
import { requireAuth } from '../../middleware/auth';

const router = Router();

// Get sales dashboard metrics
router.get('/', requireAuth, async (req, res) => {
  try {
    // Get total salespeople count
    const { count: salespeopleCount, error: salespeopleError } = await supabaseAdmin
      .from('salesperson_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (salespeopleError) {
      console.error('Error fetching salespeople count:', salespeopleError);
      return res.status(500).json({ success: false, error: 'Failed to fetch salespeople data' });
    }

    // Get total active assignments
    const { count: assignmentsCount, error: assignmentsError } = await supabaseAdmin
      .from('salesperson_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (assignmentsError) {
      console.error('Error fetching assignments count:', assignmentsError);
      return res.status(500).json({ success: false, error: 'Failed to fetch assignments data' });
    }

    // Get recent metrics (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentMetrics, error: metricsError } = await supabaseAdmin
      .from('salesperson_metrics')
      .select('total_sales, total_orders, commission_earned')
      .gte('period_start', thirtyDaysAgo.toISOString().split('T')[0]);

    if (metricsError) {
      console.error('Error fetching recent metrics:', metricsError);
      return res.status(500).json({ success: false, error: 'Failed to fetch metrics data' });
    }

    // Calculate totals
    const totalSales = recentMetrics?.reduce((sum, metric) => sum + parseFloat(metric.total_sales || '0'), 0) || 0;
    const totalOrders = recentMetrics?.reduce((sum, metric) => sum + (metric.total_orders || 0), 0) || 0;
    const totalCommission = recentMetrics?.reduce((sum, metric) => sum + parseFloat(metric.commission_earned || '0'), 0) || 0;

    const dashboardData = {
      overview: {
        total_salespeople: salespeopleCount || 0,
        active_assignments: assignmentsCount || 0,
        total_orders: totalOrders,
        total_revenue: totalSales
      },
      top_performers: [] // Empty for now - would need actual salesperson performance data
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data'
    });
  }
});

export { router as dashboardRouter };