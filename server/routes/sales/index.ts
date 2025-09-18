import { Router } from "express";
import { eq, and, desc, sql, or } from "drizzle-orm";
import { randomUUID } from "crypto";
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
} from "../../../shared/schema.js";
import { requireAuth, AuthedRequest } from "../../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { z } from "zod";
import dashboardRouter from "./dashboard.js";

const router = Router();

// Mount dashboard routes
router.use('/', dashboardRouter);

// Get all salespeople with their profiles and metrics
router.get("/salespeople", requireAuth, asyncHandler(async (req, res) => {
  const salespeople = await db
    .select({
      id: users.id,
      full_name: users.fullName,
      email: users.email,
      phone: users.phone,
      organization_id: users.organizationId,
      profile: salespersonProfiles,
      assignments: sql<number>`COUNT(${salespersonAssignments.id})::int`,
      active_assignments: sql<number>`COUNT(CASE WHEN ${salespersonAssignments.isActive} = true THEN 1 END)::int`
    })
    .from(users)
    .innerJoin(salespersonProfiles, eq(users.id, salespersonProfiles.userId)) // Inner join to only get actual salespeople
    .leftJoin(salespersonAssignments, eq(users.id, salespersonAssignments.salespersonId))
    .where(and(
      or(eq(users.role, 'sales'), eq(users.subrole, 'salesperson')),
      eq(salespersonProfiles.isActive, true)
    ))
    .groupBy(users.id, salespersonProfiles.id);

  console.log(`🔍 Found ${salespeople.length} active salespeople in database`);
  res.json(salespeople);
}));

// Get salesperson details with assignments and metrics
router.get("/salespeople/:id", requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;

  console.log(`🔍 Looking for salesperson with ID: ${id}`);

  // First, check if the user exists at all
  const [userExists] = await db
    .select()
    .from(users)
    .where(eq(users.id, id));

  console.log(`👤 User exists:`, userExists ? 'Yes' : 'No');
  if (userExists) {
    console.log(`👤 User details:`, { 
      id: userExists.id, 
      fullName: userExists.fullName, 
      role: userExists.role 
    });
  }

  // Get salesperson basic info and profile - don't filter by role, just get the user
  const [salesperson] = await db
    .select()
    .from(users)
    .leftJoin(salespersonProfiles, eq(users.id, salespersonProfiles.userId))
    .where(eq(users.id, id));

  console.log(`🔍 Salesperson query result:`, salesperson ? 'Found' : 'Not found');

  if (!salesperson) {
    return res.status(404).json({ error: "Salesperson not found" });
  }

  // Get assignments with organization details (remove sport_name for now since assignments table doesn't have sport_id)
  const assignments = await db
    .select({
      id: salespersonAssignments.id,
      organization_id: salespersonAssignments.organizationId,
      is_active: salespersonAssignments.isActive,
      assigned_at: salespersonAssignments.assignedAt,
      notes: salespersonAssignments.notes,
      organization_name: organizations.name,
      sport_name: sql<string>`NULL`.as('sport_name'), // Placeholder until schema is updated
      team_name: sql<string>`NULL`.as('team_name'), // Placeholder until schema is updated
    })
    .from(salespersonAssignments)
    .leftJoin(organizations, eq(salespersonAssignments.organizationId, organizations.id))
    .where(eq(salespersonAssignments.salespersonId, id));

  // Get recent metrics
  const metrics = await db
    .select()
    .from(salespersonMetrics)
    .where(eq(salespersonMetrics.salespersonId, id))
    .orderBy(desc(salespersonMetrics.periodStart))
    .limit(12);

  // If user exists but has no salesperson profile, create a basic one
  if (!salesperson.salesperson_profiles) {
    console.log(`📋 Creating basic salesperson profile for user ${id}`);
    
    // Generate sequential employee ID
    const maxIdResult = await db.execute(sql`
      SELECT COALESCE(MAX(CAST(SUBSTRING(employee_id FROM 5) AS INTEGER)), 0) + 1 as next_id
      FROM salesperson_profiles 
      WHERE employee_id ~ '^EMP-[0-9]+$'
    `);
    const nextId = maxIdResult[0]?.next_id || 1;
    const employeeId = `EMP-${nextId.toString().padStart(4, '0')}`;

    // Create basic profile
    const [newProfile] = await db.execute(sql`
      INSERT INTO salesperson_profiles (
        id, user_id, employee_id, commission_rate, performance_tier, is_active, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        ${id},
        ${employeeId},
        0.05,
        'standard',
        true,
        NOW(),
        NOW()
      )
      RETURNING *
    `);

    console.log(`✅ Created salesperson profile:`, newProfile);
  }

  // Structure the response to match frontend expectations
  const response = {
    data: {
      id: salesperson.users.id,
      full_name: salesperson.users.fullName,
      email: salesperson.users.email,
      phone: salesperson.users.phone,
      organization_id: salesperson.users.organizationId,
      profile: salesperson.salesperson_profiles ? {
        id: salesperson.salesperson_profiles.id,
        user_id: salesperson.salesperson_profiles.userId,
        employee_id: salesperson.salesperson_profiles.employeeId,
        commission_rate: salesperson.salesperson_profiles.commissionRate ? parseInt(salesperson.salesperson_profiles.commissionRate) : 0,
        territory: salesperson.salesperson_profiles.territory,
        hire_date: salesperson.salesperson_profiles.hireDate,
        performance_tier: salesperson.salesperson_profiles.performanceTier,
        profile_photo_url: null // Add if needed later
      } : {
        // Provide default profile structure if none exists
        id: null,
        user_id: id,
        employee_id: 'Pending',
        commission_rate: 0,
        territory: null,
        hire_date: null,
        performance_tier: 'standard',
        profile_photo_url: null
      },
      assignments,
      metrics
    }
  };

  res.json(response);
}));

// Create or update salesperson profile
const profileSchema = z.object({
  employeeId: z.string().optional(),
  taxId: z.string().optional(),
  commissionRate: z.string().optional(), // Decimal fields expect strings
  territory: z.string().optional(), // Single territory, not array
  hireDate: z.string().optional(),
  managerId: z.string().optional(),
  performanceTier: z.enum(['bronze', 'silver', 'gold', 'platinum', 'standard']).optional()
});

// Function to generate unique employee ID
async function generateEmployeeId() {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000); // 4 digit number
  let employeeId = `EMP-${year}-${randomSuffix}`;

  // Check if this ID already exists, if so regenerate
  let attempts = 0;
  while (attempts < 10) {
    const [existing] = await db
      .select()
      .from(salespersonProfiles)
      .where(eq(salespersonProfiles.employeeId, employeeId));

    if (!existing) {
      break;
    }

    // Generate a new one
    const newRandomSuffix = Math.floor(1000 + Math.random() * 9000);
    employeeId = `EMP-${year}-${newRandomSuffix}`;
    attempts++;
  }

  return employeeId;
}

// Update salesperson profile
router.patch('/salespeople/:id/profile', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const profileData = req.body;

  console.log(`🔄 Updating salesperson profile for user ${id}:`, profileData);

  try {
    // First verify the user exists
    const userResult = await db.execute(sql`
      SELECT id, full_name FROM users WHERE id = ${id} LIMIT 1
    `);

    if (userResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Check if profile exists
    const existingResult = await db.execute(sql`
      SELECT * FROM salesperson_profiles WHERE user_id = ${id} LIMIT 1
    `);

    if (existingResult.length > 0) {
      // Update existing profile - commission_rate comes as percentage, convert to decimal
      const commissionDecimal = profileData.commission_rate ? (profileData.commission_rate / 100) : 0.05;
      const territory = Array.isArray(profileData.territory) ? JSON.stringify(profileData.territory) : profileData.territory;
      
      const updated = await db.execute(sql`
        UPDATE salesperson_profiles 
        SET 
          commission_rate = ${commissionDecimal},
          territory = ${territory},
          hire_date = ${profileData.hire_date || null},
          performance_tier = ${profileData.performance_tier || 'standard'},
          updated_at = NOW()
        WHERE user_id = ${id}
        RETURNING *
      `);

      res.json({
        success: true,
        data: updated[0]
      });
    } else {
      // Create new profile - commission_rate comes as percentage, convert to decimal
      const maxIdResult = await db.execute(sql`
        SELECT COALESCE(MAX(CAST(SUBSTRING(employee_id FROM 5) AS INTEGER)), 0) + 1 as next_id
        FROM salesperson_profiles 
        WHERE employee_id ~ '^EMP-[0-9]+$'
      `);
      const nextId = maxIdResult[0]?.next_id || 1;
      const employeeId = `EMP-${nextId.toString().padStart(4, '0')}`;

      const commissionDecimal = profileData.commission_rate ? (profileData.commission_rate / 100) : 0.05;
      const territory = Array.isArray(profileData.territory) ? JSON.stringify(profileData.territory) : profileData.territory;
      
      const created = await db.execute(sql`
        INSERT INTO salesperson_profiles (
          id, user_id, employee_id, commission_rate, territory, hire_date, performance_tier, is_active, created_at, updated_at
        ) VALUES (
          gen_random_uuid(),
          ${id},
          ${employeeId},
          ${commissionDecimal},
          ${territory},
          ${profileData.hire_date || null},
          ${profileData.performance_tier || 'standard'},
          true,
          NOW(),
          NOW()
        )
        RETURNING *
      `);

      res.json({
        success: true,
        data: created[0]
      });
    }
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROFILE_UPDATE_ERROR',
        message: 'Failed to update salesperson profile',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
}));

// Create a new salesperson profile  
router.post('/salespeople/:id/profile', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const profileData = req.body;

  try {
    // First verify the user exists
    const userResult = await db.execute(sql`
      SELECT id, full_name FROM users WHERE id = ${id} LIMIT 1
    `);

    if (userResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Check if profile already exists
    const existingResult = await db.execute(sql`
      SELECT * FROM salesperson_profiles WHERE user_id = ${id} LIMIT 1
    `);

    if (existingResult.length > 0) {
      // Update existing profile - convert commission rate from percentage to decimal
      const commissionDecimal = profileData.commission_rate ? (profileData.commission_rate / 100) : 0.05;
      const updated = await db.execute(sql`
        UPDATE salesperson_profiles 
        SET 
          commission_rate = ${commissionDecimal},
          territory = ${profileData.territory || null},
          hire_date = ${profileData.hire_date || null},
          performance_tier = ${profileData.performance_tier || 'standard'},
          updated_at = NOW()
        WHERE user_id = ${id}
        RETURNING *
      `);

      res.json({
        success: true,
        data: updated[0]
      });
    } else {
      // Generate sequential employee ID
      const maxIdResult = await db.execute(sql`
        SELECT COALESCE(MAX(CAST(SUBSTRING(employee_id FROM 5) AS INTEGER)), 0) + 1 as next_id
        FROM salesperson_profiles 
        WHERE employee_id ~ '^EMP-[0-9]+$'
      `);
      const nextId = maxIdResult[0]?.next_id || 1;
      const employeeId = `EMP-${nextId.toString().padStart(4, '0')}`;

      // Create new profile - convert commission rate from percentage to decimal
      const commissionDecimal = profileData.commission_rate ? (profileData.commission_rate / 100) : 0.05;
      const created = await db.execute(sql`
        INSERT INTO salesperson_profiles (
          id, user_id, employee_id, commission_rate, territory, hire_date, performance_tier, is_active, created_at, updated_at
        ) VALUES (
          gen_random_uuid(),
          ${id},
          ${employeeId},
          ${commissionDecimal},
          ${profileData.territory || null},
          ${profileData.hire_date || null},
          ${profileData.performance_tier || 'standard'},
          true,
          NOW(),
          NOW()
        )
        RETURNING *
      `);

      res.json({
        success: true,
        data: created[0]
      });
    }
  } catch (error) {
    console.error('Profile creation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROFILE_CREATE_ERROR',
        message: 'Failed to create salesperson profile',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
}));

// Assign salesperson to organization
const assignmentSchema = z.object({
  organizationId: z.string(),
  territory: z.string().optional(),
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
        eq(salespersonAssignments.salespersonId, id),
        eq(salespersonAssignments.organizationId, assignmentData.organizationId)
      )
    );

  if (existing) {
    return res.status(400).json({ error: "Assignment already exists" });
  }

  const [assignment] = await db
    .insert(salespersonAssignments)
    .values([{
      id: randomUUID(),
      salespersonId: id,
      assignedBy: req.user?.id,
      ...assignmentData
    }])
    .returning();

  // Assignment created at organization level only

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

  // Note: orgSports unassignment would need to be handled separately
  // based on organization-level assignment removal

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
      isActive: !assignment.isActive,
      updatedAt: new Date().toISOString()
    })
    .where(eq(salespersonAssignments.id, assignmentId))
    .returning();

  res.json(updated);
}));

// Delete salesperson (soft delete by deactivating)
router.delete('/salespeople/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    console.log(`🗑️ Attempting to delete/deactivate salesperson: ${id}`);
    
    // First verify the user exists
    const userResult = await db.execute(sql`
      SELECT id, full_name FROM users WHERE id = ${id} LIMIT 1
    `);

    if (userResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Salesperson not found'
        }
      });
    }

    // Deactivate salesperson profile instead of deleting
    const profileResult = await db.execute(sql`
      UPDATE salesperson_profiles 
      SET is_active = false, updated_at = NOW()
      WHERE user_id = ${id}
      RETURNING *
    `);

    // Deactivate all assignments
    await db.execute(sql`
      UPDATE salesperson_assignments 
      SET is_active = false, updated_at = NOW()
      WHERE salesperson_id = ${id}
    `);

    // Mark user as inactive
    await db.execute(sql`
      UPDATE users 
      SET is_active = 0, updated_at = NOW()
      WHERE id = ${id}
    `);

    console.log(`✅ Salesperson ${id} deactivated successfully`);

    res.json({
      success: true,
      message: 'Salesperson deactivated successfully'
    });
  } catch (error) {
    console.error('Salesperson deletion error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETION_ERROR',
        message: 'Failed to delete salesperson',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
}));

// POST /api/v1/organizations - Create a new organization
router.post("/organizations", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const organizationData = req.body;

  // Generate a UUID for the organization ID
  const organizationId = randomUUID();

  // Insert the new organization with the generated ID
  const [createdOrganization] = await db
    .insert(organizations)
    .values([{
      id: organizationId, // Explicitly set the generated UUID
      ...organizationData,
      createdAt: new Date(),
      updatedAt: new Date()
    }])
    .returning();

  res.status(201).json(createdOrganization);
}));

export default router;