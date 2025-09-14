
import { Router } from 'express';
import { db } from '../../db.js';
import { salespersonAssignments, salespersonProfiles, organizations } from '../../../shared/schema.js';
import { eq, and, gte, sql } from 'drizzle-orm';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

// Dashboard metrics endpoint with error handling
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const periodDays = parseInt(period as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Try to get dashboard data, but handle missing tables gracefully
    let dashboardData = {
      totalSalespeople: 0,
      activeSalespeople: 0,
      totalAssignments: 0,
      activeAssignments: 0,
      recentMetrics: []
    };

    try {
      // Get basic salesperson counts
      const salespeopleCount = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(salespersonProfiles);
      
      const activeSalespeopleCount = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(salespersonProfiles)
        .where(eq(salespersonProfiles.isActive, true));

      const assignmentsCount = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(salespersonAssignments);

      const activeAssignmentsCount = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(salespersonAssignments)
        .where(eq(salespersonAssignments.isActive, true));

      dashboardData = {
        totalSalespeople: salespeopleCount[0]?.count || 0,
        activeSalespeople: activeSalespeopleCount[0]?.count || 0,
        totalAssignments: assignmentsCount[0]?.count || 0,
        activeAssignments: activeAssignmentsCount[0]?.count || 0,
        recentMetrics: []
      };

    } catch (tableError) {
      console.warn('Sales dashboard tables not ready:', tableError.message);
      // Return empty dashboard data if tables don't exist yet
    }

    res.json(dashboardData);

  } catch (error) {
    console.error('Sales dashboard error:', error);
    res.status(500).json({ 
      error: 'Failed to load dashboard data',
      message: error.message 
    });
  }
}));

export default router;

const router = Router();

router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const { period = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(period));

    // Get basic stats
    const totalAssignments = await db
      .select({ count: sql<number>`count(*)` })
      .from(salespersonAssignments)
      .where(and(
        eq(salespersonAssignments.isActive, true),
        gte(salespersonAssignments.assignedAt, startDate.toISOString())
      ));

    const activeSalespeople = await db
      .select({ count: sql<number>`count(distinct ${salespersonAssignments.salespersonId})` })
      .from(salespersonAssignments)
      .where(eq(salespersonAssignments.isActive, true));

    res.json({
      period: Number(period),
      totalAssignments: totalAssignments[0]?.count || 0,
      activeSalespeople: activeSalespeople[0]?.count || 0,
      revenue: 0, // Placeholder for future implementation
      commissions: 0 // Placeholder for future implementation
    });
  } catch (error: any) {
    console.error('Sales dashboard error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch sales dashboard data',
      details: error.message 
    });
  }
});

export default router;
