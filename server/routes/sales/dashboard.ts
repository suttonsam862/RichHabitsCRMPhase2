import { Router } from 'express';
import { supabaseAdmin } from '../../lib/supabase.js';

const router = Router();

// Get sales dashboard metrics
router.get('/', async (req, res) => {
  try {
    // Get total salespeople count
    const { count: salespeopleCount, error: salespeopleError } = await supabaseAdmin
      .from('salesperson_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('isActive', true);

    if (salespeopleError) {
      console.error('Error fetching salespeople count:', salespeopleError);
      return res.status(500).json({ success: false, error: 'Failed to fetch salespeople data' });
    }

    // Get total active assignments
    const { count: assignmentsCount, error: assignmentsError } = await supabaseAdmin
      .from('salesperson_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('isActive', true);

    if (assignmentsError) {
      console.error('Error fetching assignments count:', assignmentsError);
      return res.status(500).json({ success: false, error: 'Failed to fetch assignments data' });
    }

    // Get recent metrics (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentMetrics, error: metricsError } = await supabaseAdmin
      .from('salesperson_metrics')
      .select('totalSales, totalOrders, commissionEarned')
      .gte('periodStart', thirtyDaysAgo.toISOString().split('T')[0]);

    if (metricsError) {
      console.error('Error fetching recent metrics:', metricsError);
      return res.status(500).json({ success: false, error: 'Failed to fetch metrics data' });
    }

    // Calculate totals
    const totalSales = recentMetrics?.reduce((sum, metric) => sum + parseFloat(metric.totalSales || '0'), 0) || 0;
    const totalOrders = recentMetrics?.reduce((sum, metric) => sum + (metric.totalOrders || 0), 0) || 0;
    const totalCommission = recentMetrics?.reduce((sum, metric) => sum + parseFloat(metric.commissionEarned || '0'), 0) || 0;

    const dashboardData = {
      salespeople: {
        total: salespeopleCount || 0,
        active: salespeopleCount || 0
      },
      assignments: {
        total: assignmentsCount || 0,
        active: assignmentsCount || 0
      },
      metrics: {
        totalSales,
        totalOrders,
        totalCommission,
        averageOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0
      }
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