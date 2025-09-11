
import { Router } from 'express';
import { db } from '../../db.js';
import { salespersonAssignments, salespeople, organizations } from '../../../shared/schema.js';
import { eq, and, gte, sql } from 'drizzle-orm';
import { authenticateToken } from '../../middleware/auth.js';

const router = Router();

router.get('/dashboard', authenticateToken, async (req, res) => {
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
