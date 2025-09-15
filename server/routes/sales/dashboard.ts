import { Router } from 'express';
import { db } from '../../db.js';
import { sql, eq } from 'drizzle-orm';
import { users, salespersonProfiles, salespersonAssignments, orders } from '../../../shared/schema.js';

const router = Router();

// GET /api/v1/sales/dashboard - Sales dashboard with metrics
router.get('/dashboard', async (req, res) => {
  try {
    const period = parseInt(req.query.period as string) || 30;

    // Get overview metrics with safe queries
    const [totalSalespeopleResult] = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM salesperson_profiles 
      WHERE is_active = true
    `);

    const [activeAssignmentsResult] = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM salesperson_assignments 
      WHERE is_active = true
    `);

    const [ordersResult] = await db.execute(sql`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(CAST(total_amount AS NUMERIC)), 0) as total_revenue
      FROM orders 
      WHERE created_at >= NOW() - INTERVAL '${period} days'
    `);

    // Get top performers
    const topPerformersResult = await db.execute(sql`
      SELECT 
        u.id as salesperson_id,
        u.full_name,
        COALESCE(COUNT(o.id), 0) as orders_count,
        COALESCE(SUM(CAST(o.total_amount AS NUMERIC)), 0) as total_sales,
        COALESCE(SUM(CAST(o.total_amount AS NUMERIC)) * 0.05, 0) as commission_earned
      FROM users u
      INNER JOIN salesperson_profiles sp ON u.id = sp.user_id
      LEFT JOIN orders o ON u.id = o.salesperson_id 
        AND o.created_at >= NOW() - INTERVAL '${period} days'
      WHERE sp.is_active = true
      GROUP BY u.id, u.full_name
      ORDER BY total_sales DESC, orders_count DESC
      LIMIT 10
    `);

    const overview = {
      total_salespeople: parseInt(totalSalespeopleResult[0]?.count || '0'),
      active_assignments: parseInt(activeAssignmentsResult[0]?.count || '0'),
      total_orders: parseInt(ordersResult[0]?.total_orders || '0'),
      total_revenue: Math.round(parseFloat(ordersResult[0]?.total_revenue || '0') * 100) // Convert to cents
    };

    const top_performers = topPerformersResult.map(row => ({
      salesperson_id: row.salesperson_id,
      full_name: row.full_name || 'Unknown',
      total_sales: Math.round(parseFloat(row.total_sales || '0') * 100), // Convert to cents
      orders_count: parseInt(row.orders_count || '0'),
      commission_earned: Math.round(parseFloat(row.commission_earned || '0') * 100) // Convert to cents
    }));

    res.json({
      success: true,
      overview,
      top_performers
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