import { Router } from 'express';
import { db } from '../../db.js';
import { salespersonProfiles, salespersonAssignments, salespersonMetrics, orders, organizations } from '../../../shared/schema.js';
import { eq, sql, and, gte, lte } from 'drizzle-orm';

const router = Router();

// GET /api/v1/sales/dashboard - Sales dashboard with metrics
router.get('/dashboard', async (req, res) => {
  try {
    // Get total salespeople count from salesperson_profiles
    const totalSalespeopleCounts = await db
      .select({
        count: sql<number>`cast(count(*) as int)`.as('count')
      })
      .from(salespersonProfiles)
      .where(eq(salespersonProfiles.isActive, true));

    // Get active assignments count
    const activeAssignmentsCounts = await db
      .select({
        count: sql<number>`cast(count(*) as int)`.as('count')
      })
      .from(salespersonAssignments)
      .where(eq(salespersonAssignments.isActive, true));

    // Get recent sales metrics (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentMetricsResults = await db
      .select({
        totalSales: sql<string>`cast(coalesce(sum(total_sales), 0) as text)`.as('totalSales'),
        totalOrders: sql<number>`cast(coalesce(sum(total_orders), 0) as int)`.as('totalOrders'),
        totalCommission: sql<string>`cast(coalesce(sum(commission_earned), 0) as text)`.as('totalCommission')
      })
      .from(salespersonMetrics)
      .where(gte(salespersonMetrics.periodStart, thirtyDaysAgo.toISOString().split('T')[0]));

    const totalSalespeople = totalSalespeopleCounts[0]?.count || 0;
    const activeAssignments = activeAssignmentsCounts[0]?.count || 0;
    const recentMetrics = recentMetricsResults[0] || {
      totalSales: '0',
      totalOrders: 0,
      totalCommission: '0'
    };

    res.json({
      success: true,
      data: {
        totalSalespeople,
        activeAssignments,
        recentMetrics: {
          totalSales: parseFloat(recentMetrics.totalSales),
          totalOrders: recentMetrics.totalOrders,
          totalCommission: parseFloat(recentMetrics.totalCommission)
        }
      }
    });
  } catch (error) {
    console.error('Sales dashboard error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DASHBOARD_ERROR',
        message: 'Failed to load sales dashboard',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

export default router;