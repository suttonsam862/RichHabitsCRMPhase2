import { Router } from 'express';
import { db } from '../../db.js';
import { sql } from 'drizzle-orm';

const router = Router();

// GET /api/v1/sales/dashboard - Sales dashboard with metrics
router.get('/dashboard', async (req, res) => {
  try {
    const period = parseInt(req.query.period as string) || 30;
    
    // First check what tables exist
    const tablesResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('salesperson_profiles', 'salesperson_assignments', 'orders', 'users')
    `);
    
    const existingTables = tablesResult.map(row => row.table_name);
    
    // Get overview metrics with safer queries
    const overviewQueries = [];
    
    if (existingTables.includes('salesperson_profiles')) {
      overviewQueries.push(`(SELECT COUNT(*) FROM salesperson_profiles WHERE is_active = true) as total_salespeople`);
    } else {
      overviewQueries.push(`0 as total_salespeople`);
    }
    
    if (existingTables.includes('salesperson_assignments')) {
      overviewQueries.push(`(SELECT COUNT(*) FROM salesperson_assignments WHERE is_active = true) as active_assignments`);
    } else {
      overviewQueries.push(`0 as active_assignments`);
    }
    
    if (existingTables.includes('orders')) {
      overviewQueries.push(`(SELECT COUNT(*) FROM orders WHERE created_at >= NOW() - INTERVAL '${period} days') as total_orders`);
      overviewQueries.push(`(SELECT COALESCE(SUM(total_amount::numeric), 0) FROM orders WHERE created_at >= NOW() - INTERVAL '${period} days') as total_revenue`);
    } else {
      overviewQueries.push(`0 as total_orders`);
      overviewQueries.push(`0 as total_revenue`);
    }

    const overviewResult = await db.execute(sql.raw(`SELECT ${overviewQueries.join(', ')}`));

    // Get top performers only if tables exist
    let top_performers = [];
    if (existingTables.includes('users') && existingTables.includes('salesperson_profiles')) {
      try {
        const topPerformersResult = await db.execute(sql`
          SELECT 
            u.id as salesperson_id,
            u.full_name,
            COALESCE(COUNT(CASE WHEN sp.id IS NOT NULL THEN 1 END), 0) as has_profile,
            0 as total_sales,
            0 as orders_count,
            0 as commission_earned
          FROM users u
          LEFT JOIN salesperson_profiles sp ON u.id::text = sp.user_id::text
          WHERE u.role = 'sales' OR u.subrole = 'salesperson'
          GROUP BY u.id, u.full_name
          ORDER BY has_profile DESC, u.full_name
          LIMIT 10
        `);

        top_performers = topPerformersResult.map(row => ({
          salesperson_id: row.salesperson_id,
          full_name: row.full_name || 'Unknown',
          total_sales: 0,
          orders_count: 0,
          commission_earned: 0
        }));
      } catch (performersError) {
        console.warn('Could not load top performers:', performersError.message);
      }
    }

    const overview = overviewResult[0] || {
      total_salespeople: 0,
      active_assignments: 0,
      total_orders: 0,
      total_revenue: 0
    };

    res.json({
      success: true,
      overview: {
        total_salespeople: parseInt(overview.total_salespeople || '0'),
        active_assignments: parseInt(overview.active_assignments || '0'),
        total_orders: parseInt(overview.total_orders || '0'),
        total_revenue: Math.round(parseFloat(overview.total_revenue || '0') * 100) // Convert to cents
      },
      top_performers,
      available_tables: existingTables
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