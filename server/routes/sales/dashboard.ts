import { Router } from 'express';
import { db } from '../../db.js';
import { sql } from 'drizzle-orm';

const router = Router();

// GET /api/v1/sales/dashboard - Sales dashboard with metrics
router.get('/dashboard', async (req, res) => {
  try {
    const period = parseInt(req.query.period as string) || 30;
    
    // Get overview metrics using raw SQL for reliability
    const overviewResult = await db.execute(sql`
      SELECT 
        (SELECT COUNT(*) FROM salesperson_profiles WHERE is_active = true) as total_salespeople,
        (SELECT COUNT(*) FROM salesperson_assignments WHERE is_active = true) as active_assignments,
        (SELECT COUNT(*) FROM orders WHERE created_at >= NOW() - INTERVAL '${sql.raw(period.toString())} days') as total_orders,
        (SELECT COALESCE(SUM(total_amount::numeric), 0) FROM orders WHERE created_at >= NOW() - INTERVAL '${sql.raw(period.toString())} days') as total_revenue
    `);

    // Get top performers using raw SQL
    const topPerformersResult = await db.execute(sql`
      SELECT 
        u.id as salesperson_id,
        u.full_name,
        COALESCE(SUM(o.total_amount::numeric), 0) as total_sales,
        COUNT(o.id) as orders_count,
        COALESCE(SUM(o.total_amount::numeric * sp.commission_rate), 0) as commission_earned
      FROM users u
      LEFT JOIN salesperson_profiles sp ON u.id = sp.user_id
      LEFT JOIN orders o ON u.id = o.salesperson_id 
        AND o.created_at >= NOW() - INTERVAL '${sql.raw(period.toString())} days'
      WHERE u.role = 'sales' OR u.subrole = 'salesperson'
      GROUP BY u.id, u.full_name, sp.commission_rate
      HAVING COALESCE(SUM(o.total_amount::numeric), 0) > 0
      ORDER BY total_sales DESC
      LIMIT 10
    `);

    const overview = overviewResult[0] || {
      total_salespeople: 0,
      active_assignments: 0,
      total_orders: 0,
      total_revenue: 0
    };

    const top_performers = topPerformersResult.map(row => ({
      salesperson_id: row.salesperson_id,
      full_name: row.full_name,
      total_sales: parseFloat(row.total_sales || '0'),
      orders_count: parseInt(row.orders_count || '0'),
      commission_earned: parseFloat(row.commission_earned || '0')
    }));

    res.json({
      overview: {
        total_salespeople: parseInt(overview.total_salespeople || '0'),
        active_assignments: parseInt(overview.active_assignments || '0'),
        total_orders: parseInt(overview.total_orders || '0'),
        total_revenue: Math.round(parseFloat(overview.total_revenue || '0') * 100) // Convert to cents
      },
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