import { Router } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../../db";
import { 
  salespersonAssignments, 
  salespersonProfiles, 
  salespersonMetrics,
  orders,
  users,
  orgSports,
  organizations,
  sports
} from "@shared/schema";
import { requireAuth, AuthedRequest } from "../../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { z } from "zod";

const router = Router();

// Get all salespeople with their profiles and metrics
router.get("/salespeople", requireAuth, asyncHandler(async (req, res) => {
  const salespeople = await db
    .select({
      id: users.id,
      full_name: users.full_name,
      email: users.email,
      phone: users.phone,
      organization_id: users.organization_id,
      profile: salespersonProfiles,
      assignments: sql<number>`COUNT(${salespersonAssignments.id})::int`,
      active_assignments: sql<number>`COUNT(CASE WHEN ${salespersonAssignments.is_active} = true THEN 1 END)::int`
    })
    .from(users)
    .leftJoin(salespersonProfiles, eq(users.id, salespersonProfiles.user_id))
    .leftJoin(salespersonAssignments, eq(users.id, salespersonAssignments.salesperson_id))
    .where(eq(users.role, 'salesperson'))
    .groupBy(users.id, salespersonProfiles.id);

  res.json(salespeople);
}));

// Get salesperson details with assignments and metrics
router.get("/salespeople/:id", requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Get salesperson basic info and profile
  const [salesperson] = await db
    .select()
    .from(users)
    .leftJoin(salespersonProfiles, eq(users.id, salespersonProfiles.user_id))
    .where(eq(users.id, id));

  if (!salesperson) {
    return res.status(404).json({ error: "Salesperson not found" });
  }

  // Get assignments with organization and sport details
  const assignments = await db
    .select({
      id: salespersonAssignments.id,
      organization_id: salespersonAssignments.organization_id,
      sport_id: salespersonAssignments.sport_id,
      team_name: salespersonAssignments.team_name,
      is_active: salespersonAssignments.is_active,
      assigned_at: salespersonAssignments.assigned_at,
      notes: salespersonAssignments.notes,
      organization_name: organizations.name,
      sport_name: sports.name,
    })
    .from(salespersonAssignments)
    .leftJoin(organizations, eq(salespersonAssignments.organization_id, organizations.id))
    .leftJoin(sports, eq(salespersonAssignments.sport_id, sports.id))
    .where(eq(salespersonAssignments.salesperson_id, id));

  // Get recent metrics
  const metrics = await db
    .select()
    .from(salespersonMetrics)
    .where(eq(salespersonMetrics.salesperson_id, id))
    .orderBy(desc(salespersonMetrics.period_start))
    .limit(12);

  res.json({
    ...salesperson,
    assignments,
    metrics
  });
}));

// Create or update salesperson profile
const profileSchema = z.object({
  employee_id: z.string().optional(),
  tax_id: z.string().optional(),
  commission_rate: z.number().min(0).max(10000).optional(),
  territory: z.string().optional(),
  hire_date: z.string().optional(),
  manager_id: z.string().optional(),
  performance_tier: z.enum(['bronze', 'silver', 'gold', 'platinum', 'standard']).optional()
});

router.put("/salespeople/:id/profile", requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const profileData = profileSchema.parse(req.body);

  // Check if profile exists
  const [existing] = await db
    .select()
    .from(salespersonProfiles)
    .where(eq(salespersonProfiles.user_id, id));

  if (existing) {
    // Update existing profile
    const [updated] = await db
      .update(salespersonProfiles)
      .set({
        ...profileData,
        hire_date: profileData.hire_date ? new Date(profileData.hire_date) : undefined,
        updated_at: new Date()
      })
      .where(eq(salespersonProfiles.user_id, id))
      .returning();
    
    res.json(updated);
  } else {
    // Create new profile
    const [created] = await db
      .insert(salespersonProfiles)
      .values({
        user_id: id,
        ...profileData,
        hire_date: profileData.hire_date ? new Date(profileData.hire_date) : undefined
      })
      .returning();
    
    res.json(created);
  }
}));

// Assign salesperson to team
const assignmentSchema = z.object({
  organization_id: z.string(),
  sport_id: z.string(),
  team_name: z.string(),
  notes: z.string().optional()
});

router.post("/salespeople/:id/assignments", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const { id } = req.params;
  const assignmentData = assignmentSchema.parse(req.body);

  // Check if assignment already exists
  const [existing] = await db
    .select()
    .from(salespersonAssignments)
    .where(
      and(
        eq(salespersonAssignments.salesperson_id, id),
        eq(salespersonAssignments.organization_id, assignmentData.organization_id),
        eq(salespersonAssignments.sport_id, assignmentData.sport_id),
        eq(salespersonAssignments.team_name, assignmentData.team_name)
      )
    );

  if (existing) {
    return res.status(400).json({ error: "Assignment already exists" });
  }

  const [assignment] = await db
    .insert(salespersonAssignments)
    .values({
      salesperson_id: id,
      assigned_by: req.user?.id,
      ...assignmentData
    })
    .returning();

  // Also update the org_sports table to assign this salesperson
  await db
    .update(orgSports)
    .set({ assigned_salesperson_id: id })
    .where(
      and(
        eq(orgSports.organization_id, assignmentData.organization_id),
        eq(orgSports.sport_id, assignmentData.sport_id),
        eq(orgSports.team_name, assignmentData.team_name)
      )
    );

  res.json(assignment);
}));

// Remove assignment
router.delete("/assignments/:assignmentId", requireAuth, asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;

  // Get assignment details before deletion
  const [assignment] = await db
    .select()
    .from(salespersonAssignments)
    .where(eq(salespersonAssignments.id, assignmentId));

  if (!assignment) {
    return res.status(404).json({ error: "Assignment not found" });
  }

  // Delete assignment
  await db
    .delete(salespersonAssignments)
    .where(eq(salespersonAssignments.id, assignmentId));

  // Remove assignment from org_sports
  await db
    .update(orgSports)
    .set({ assigned_salesperson_id: null })
    .where(
      and(
        eq(orgSports.organization_id, assignment.organization_id),
        eq(orgSports.sport_id, assignment.sport_id),
        eq(orgSports.team_name, assignment.team_name)
      )
    );

  res.json({ success: true });
}));

// Toggle assignment active status
router.patch("/assignments/:assignmentId/toggle", requireAuth, asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;

  const [assignment] = await db
    .select()
    .from(salespersonAssignments)
    .where(eq(salespersonAssignments.id, assignmentId));

  if (!assignment) {
    return res.status(404).json({ error: "Assignment not found" });
  }

  const [updated] = await db
    .update(salespersonAssignments)
    .set({ 
      is_active: !assignment.is_active,
      updated_at: new Date()
    })
    .where(eq(salespersonAssignments.id, assignmentId))
    .returning();

  res.json(updated);
}));

// Get sales dashboard KPIs
router.get("/dashboard", requireAuth, asyncHandler(async (req, res) => {
  const { period = '30' } = req.query;
  const periodDays = parseInt(period as string);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);

  // Get overall KPIs
  const [totalSalespeople] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(users)
    .where(eq(users.role, 'salesperson'));

  const [activeAssignments] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(salespersonAssignments)
    .where(eq(salespersonAssignments.is_active, true));

  const [totalOrders] = await db
    .select({ 
      count: sql<number>`COUNT(*)::int`,
      revenue: sql<number>`COALESCE(SUM(total_amount), 0)::int`
    })
    .from(orders)
    .where(sql`created_at >= ${startDate}`);

  // Get top performers
  const topPerformers = await db
    .select({
      salesperson_id: salespersonMetrics.salesperson_id,
      full_name: users.full_name,
      total_sales: sql<number>`SUM(${salespersonMetrics.total_sales})::int`,
      orders_count: sql<number>`SUM(${salespersonMetrics.orders_count})::int`,
      commission_earned: sql<number>`SUM(${salespersonMetrics.commission_earned})::int`
    })
    .from(salespersonMetrics)
    .leftJoin(users, eq(salespersonMetrics.salesperson_id, users.id))
    .where(sql`${salespersonMetrics.period_start} >= ${startDate}`)
    .groupBy(salespersonMetrics.salesperson_id, users.full_name)
    .orderBy(desc(sql`SUM(${salespersonMetrics.total_sales})`))
    .limit(10);

  res.json({
    overview: {
      total_salespeople: totalSalespeople.count,
      active_assignments: activeAssignments.count,
      total_orders: totalOrders.count,
      total_revenue: totalOrders.revenue
    },
    top_performers: topPerformers
  });
}));

export default router;