import { Router } from 'express';
import { db } from '../../db.js';
import { sql, eq } from 'drizzle-orm';

const router = Router();

// GET /api/v1/sales/dashboard - Sales dashboard with metrics
router.get('/dashboard', async (req, res) => {
  try {
    const period = parseInt(req.query.period as string) || 30;

    // Debug: Check if tables exist first
    console.log('🔍 Checking database connection and table existence...');
    
    try {
      const tableCheckResult = await db.execute(sql`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('salesperson_profiles', 'salesperson_assignments', 'salesperson_metrics')
      `);
      console.log('📊 Available salesperson tables:', tableCheckResult.map((r: any) => r.table_name));
    } catch (tableError) {
      console.error('❌ Table check failed:', tableError);
      return res.status(500).json({
        success: false,
        error: {
          code: 'DASHBOARD_ERROR',
          message: 'Database connection issue',
          details: tableError.message
        }
      });
    }

    // Get real-time metrics by counting from actual data
    let totalSalespeopleResult, activeAssignmentsResult, ordersResult, topPerformersResult;

    console.log(`🔍 Dashboard query for period: ${period} days`);

    try {
      // Count active salespeople - anyone with sales role or salesperson subrole
      totalSalespeopleResult = await db.execute(sql`
        SELECT COUNT(DISTINCT u.id) as count 
        FROM public.users u
        WHERE (u.role = 'sales' OR u.subrole = 'salesperson')
        AND u.is_active != 0
      `);
      
      console.log('📊 Total salespeople count:', totalSalespeopleResult[0]?.count);
      
      // Debug: Show all salespeople details
      const debugSalespeople = await db.execute(sql`
        SELECT u.id, u.full_name, u.role, u.subrole, u.is_active, u.created_at
        FROM public.users u
        WHERE (u.role = 'sales' OR u.subrole = 'salesperson')
        AND u.is_active != 0
        ORDER BY u.created_at DESC
      `);
      console.log('📊 Active salespeople details:', debugSalespeople);
      
    } catch (error) {
      console.log('❌ Trying fallback query for salespeople count:', error.message);
      totalSalespeopleResult = await db.execute(sql`
        SELECT COUNT(DISTINCT u.id) as count 
        FROM users u
        WHERE (u.role = 'sales' OR u.subrole = 'salesperson')
        AND u.is_active != 0
      `);
    }

    try {
      // Count active assignments
      activeAssignmentsResult = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM public.salesperson_assignments 
        WHERE is_active = true
      `);
      console.log('📊 Active assignments count:', activeAssignmentsResult[0]?.count);
    } catch (error) {
      console.log('❌ Trying fallback query for assignments:', error.message);
      activeAssignmentsResult = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM salesperson_assignments 
        WHERE is_active = true
      `);
    }

    try {
      // Count orders and revenue for the period
      ordersResult = await db.execute(sql`
        SELECT 
          COUNT(*)::int as total_orders,
          COALESCE(SUM(CAST(total_amount AS NUMERIC)), 0)::decimal as total_revenue
        FROM public.orders 
        WHERE created_at >= NOW() - INTERVAL '${sql.raw(period.toString())} days'
        AND status_code NOT IN ('cancelled', 'rejected')
      `);
      console.log('📊 Orders result for period:', ordersResult[0]);
    } catch (error) {
      console.log('❌ Trying fallback query for orders:', error.message);
      ordersResult = await db.execute(sql`
        SELECT 
          COUNT(*)::int as total_orders,
          COALESCE(SUM(CAST(total_amount AS NUMERIC)), 0)::decimal as total_revenue
        FROM orders 
        WHERE created_at >= NOW() - INTERVAL '${sql.raw(period.toString())} days'
        AND status_code NOT IN ('cancelled', 'rejected')
      `);
    }

    try {
      // Get top performers with real order data
      topPerformersResult = await db.execute(sql`
        SELECT 
          u.id as salesperson_id,
          u.full_name,
          COUNT(o.id)::int as orders_count,
          COALESCE(SUM(CAST(o.total_amount AS NUMERIC)), 0)::decimal as total_sales,
          COALESCE(
            SUM(CAST(o.total_amount AS NUMERIC)) * COALESCE(sp.commission_rate, 0.05), 
            0
          )::decimal as commission_earned
        FROM public.users u
        LEFT JOIN public.salesperson_profiles sp ON u.id = sp.user_id AND sp.is_active = true
        LEFT JOIN public.orders o ON u.id = o.salesperson_id 
          AND o.created_at >= NOW() - INTERVAL '${sql.raw(period.toString())} days'
          AND o.status_code NOT IN ('cancelled', 'rejected')
        WHERE (u.role = 'sales' OR u.subrole = 'salesperson')
        AND u.is_active != 0
        GROUP BY u.id, u.full_name, sp.commission_rate
        ORDER BY total_sales DESC, orders_count DESC
        LIMIT 10
      `);
      console.log('📊 Top performers result:', topPerformersResult);
    } catch (error) {
      console.log('❌ Trying fallback query for top performers:', error.message);
      topPerformersResult = await db.execute(sql`
        SELECT 
          u.id as salesperson_id,
          u.full_name,
          COUNT(o.id)::int as orders_count,
          COALESCE(SUM(CAST(o.total_amount AS NUMERIC)), 0)::decimal as total_sales,
          COALESCE(
            SUM(CAST(o.total_amount AS NUMERIC)) * COALESCE(sp.commission_rate, 0.05), 
            0
          )::decimal as commission_earned
        FROM users u
        LEFT JOIN salesperson_profiles sp ON u.id = sp.user_id AND sp.is_active = true
        LEFT JOIN orders o ON u.id = o.salesperson_id 
          AND o.created_at >= NOW() - INTERVAL '${sql.raw(period.toString())} days'
          AND o.status_code NOT IN ('cancelled', 'rejected')
        WHERE (u.role = 'sales' OR u.subrole = 'salesperson')
        AND u.is_active != 0
        GROUP BY u.id, u.full_name, sp.commission_rate
        ORDER BY total_sales DESC, orders_count DESC
        LIMIT 10
      `);
    }

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