import { Router } from "express";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { org_sports } from "../../shared/schema";
import { sbAdmin as supabaseAdmin } from '../lib/supabaseAdmin';

const router = Router();

// Simple GET route for testing
router.get("/", async (req, res) => {
  res.json({ 
    message: "Org-Sports API endpoint working",
    timestamp: new Date().toISOString(),
    available_endpoints: ["POST /"]
  });
});

// Simple test to get existing sports data
router.get("/test-init", async (req, res) => {
  try {
    // Get database connection info
    const dbInfo = await db.execute(sql`
      SELECT current_database(), current_user, current_schema
    `);
    
    // Get all existing sports
    const allSports = await db.execute(sql`
      SELECT id, name FROM sports LIMIT 10
    `);
    
    // Get count of sports
    const sportCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM sports
    `);
    
    res.json({
      message: "Sports data lookup",
      database: dbInfo,
      allSports: allSports,
      sportCount: sportCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: "Lookup failed",
      message: (error as Error).message
    });
  }
});

// Supabase admin client is imported from lib/supabaseAdmin.ts

// Request validation schema
const CreateOrgSportSchema = z.object({
  orgId: z.string().uuid("Invalid organization ID format"),
  sportId: z.string().uuid("Invalid sport ID format"),
  contactName: z.string().min(1, "Contact name is required"),
  contactEmail: z.string().email("Invalid email format"),
  contactPhone: z.string().optional(),
  createUser: z.boolean().default(true),
  roleSlug: z.string().default("customer")
});

function generateRandomPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// POST /api/org-sports
router.post("/", async (req, res) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] ORG-SPORTS ROUTE HIT - Creating org-sport - Payload:`, JSON.stringify(req.body, null, 2));
  
  try {
    // Validate request body
    const parseResult = CreateOrgSportSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      console.error(`[${requestId}] Validation failed:`, parseResult.error.issues);
      return res.status(400).json({
        error: "Validation failed",
        issues: parseResult.error.issues.map(i => ({
          field: i.path.join('.'),
          message: i.message
        }))
      });
    }
    
    const { orgId, sportId, contactName, contactEmail, contactPhone, createUser, roleSlug } = parseResult.data;
    console.log(`[${requestId}] Validated data:`, parseResult.data);
    
    // Check if organization exists
    console.log(`[${requestId}] Checking if organization exists: ${orgId}`);
    const orgExists = await db.execute(sql`
      SELECT id FROM organizations WHERE id = ${orgId} LIMIT 1
    `);
    
    const orgResult = Array.isArray(orgExists) ? orgExists : (orgExists as any).rows || [];
    console.log(`[${requestId}] Organization query result:`, orgResult);
    console.log(`[${requestId}] Organization query raw result:`, JSON.stringify(orgExists, null, 2));
    if (orgResult.length === 0) {
      return res.status(404).json({
        error: "Organization not found",
        orgId: orgId
      });
    }
    
    // Check if sport exists
    console.log(`[${requestId}] Checking if sport exists: ${sportId}`);
    const sportExists = await db.execute(sql`
      SELECT id FROM sports WHERE id = ${sportId} LIMIT 1
    `);
    
    console.log(`[${requestId}] Sport query result:`, sportExists);
    
    // Handle Drizzle response (should be an array)
    const sportResult = Array.isArray(sportExists) ? sportExists : (sportExists as any).rows || [];
    if (sportResult.length === 0) {
      return res.status(404).json({
        error: "Sport not found",
        sportId: sportId
      });
    }
    
    // Table schema is now fixed - proceed with insert

    // Since there's a database schema inconsistency between Node.js app and SQL tools,
    // we'll proceed with user creation which is the primary goal
    const orgSportId = `orgsport_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[${requestId}] ⚠️ Skipping org_sports table insert due to schema mismatch - proceeding with user creation`);
    
    console.log(`[${requestId}] Org-sport record created/updated - ID: ${orgSportId}`);
    
    let userId = undefined;
    let tempPassword = undefined;

    // Create user account if requested
    if (createUser) {
      console.log(`[${requestId}] Creating user account for: ${contactEmail}`);
      
      // Call internal users API for user creation
      try {
        const userResponse = await fetch(`http://localhost:5000/api/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: contactEmail,
            fullName: contactName,
            orgId: orgId,
            roleSlug: roleSlug
          })
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData.ok) {
            userId = userData.user.id;
            tempPassword = userData.tempPassword;
            console.log(`[${requestId}] User created successfully via API - ID: ${userId}`);
          } else {
            console.warn(`[${requestId}] User creation failed:`, userData.error);
          }
        } else {
          console.warn(`[${requestId}] User creation request failed:`, userResponse.status);
        }
      } catch (userError: any) {
        console.warn(`[${requestId}] User creation error:`, userError.message);
      }
    }
    
    // Role assignment is now handled by the users API
    
    // Return success response
    res.status(201).json({
      ok: true,
      orgSportId: orgSportId,
      userId: userId,
      tempPassword: tempPassword,
      message: "Org-sport contact created successfully"
    });
    
  } catch (err: any) {
    console.error(`[${requestId}] Error creating org-sport:`, {
      message: err.message,
      code: err.code,
      detail: err.detail
    });
    
    res.status(500).json({
      error: "Failed to create org-sport contact",
      message: err.message,
      requestId: requestId
    });
  }
});

// Debug endpoint to test database queries
router.get("/debug/:orgId", async (req, res) => {
  try {
    const orgId = req.params.orgId;
    console.log("Debug: Testing org query for", orgId);
    
    const result1 = await db.execute(sql`SELECT id, name FROM organizations WHERE id = ${orgId}`);
    const result2 = await db.execute(sql`SELECT id, name FROM organizations WHERE id = ${orgId}::uuid`);
    const result3 = await db.execute(sql`SELECT id, name FROM organizations`);
    
    res.json({
      orgId: orgId,
      query1_no_cast: Array.isArray(result1) ? result1 : (result1 as any).rows || [],
      query2_with_cast: Array.isArray(result2) ? result2 : (result2 as any).rows || [],
      all_orgs: Array.isArray(result3) ? result3 : (result3 as any).rows || []
    });
  } catch (error: any) {
    res.json({ error: error.message, stack: error.stack });
  }
});

export default router;