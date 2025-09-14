import { Router } from 'express';
import { db } from '../../db.js';
import { salespeople, salespersonAssignments, salespersonMetrics, orders, organizations } from '../../../shared/schema.js';
import { eq, sql, and, gte, lte } from 'drizzle-orm';

const router = Router();

// GET /api/v1/sales/dashboard - Sales dashboard with metrics
router.get('/dashboard', async (req, res) => {
  try {
    // Get total salespeople count
    const totalSalespeopleCte = db.$with('total_salespeople').as(
      db.select({
        count: sql<number>`cast(count(*) as int)`.as('count')
      }).from(salespeople).where(eq(salespeople.isActive, true))
    );

    // Get active assignments count
    const activeAssignmentsCte = db.$with('active_assignments').as(
      db.select({
        count: sql<number>`cast(count(*) as int)`.as('count')
      }).from(salespersonAssignments).where(eq(salespersonAssignments.isActive, true))
    );

    // Get recent sales metrics (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentMetricsCte = db.$with('recent_metrics').as(
      db.select({
        totalSales: sql<string>`cast(coalesce(sum(total_sales), 0) as text)`.as('totalSales'),
        totalOrders: sql<number>`cast(coalesce(sum(total_orders), 0) as int)`.as('totalOrders'),
        totalCommission: sql<string>`cast(coalesce(sum(commission_earned), 0) as text)`.as('totalCommission')
      })
      .from(salespersonMetrics)
      .where(gte(salespersonMetrics.periodStart, thirtyDaysAgo.toISOString().split('T')[0]))
    );

    // Execute all CTEs together
    const result = await db
      .with(totalSalespeopleCte, activeAssignmentsCte, recentMetricsCte)
      .select({
        totalSalespeople: totalSalespeopleCte.count,
        activeAssignments: activeAssignmentsCte.count,
        totalSales: recentMetricsCte.totalSales,
        totalOrders: recentMetricsCte.totalOrders,
        totalCommission: recentMetricsCte.totalCommission
      })
      .from(totalSalespeopleCte)
      .crossJoin(activeAssignmentsCte)
      .crossJoin(recentMetricsCte);

    const metrics = result[0] || {
      totalSalespeople: 0,
      activeAssignments: 0,
      totalSales: '0',
      totalOrders: 0,
      totalCommission: '0'
    };

    res.json({
      success: true,
      data: {
        totalSalespeople: metrics.totalSalespeople,
        activeAssignments: metrics.activeAssignments,
        recentMetrics: {
          totalSales: parseFloat(metrics.totalSales),
          totalOrders: metrics.totalOrders,
          totalCommission: parseFloat(metrics.totalCommission)
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