import { Router } from "express";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { org_sports } from "../../shared/schema";
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Supabase admin client for user creation
const supabaseUrl = 'https://qkampkccsdiebvkcfuby.supabase.co';
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Request validation schema
const CreateOrgSportSchema = z.object({
  orgId: z.string().uuid("Invalid organization ID format"),
  sportId: z.string().uuid("Invalid sport ID format"),
  contactName: z.string().min(1, "Contact name is required"),
  contactEmail: z.string().email("Invalid email format"),
  contactPhone: z.string().optional()
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
    
    const { orgId, sportId, contactName, contactEmail, contactPhone } = parseResult.data;
    console.log(`[${requestId}] Validated data:`, parseResult.data);
    
    // Check if organization exists
    console.log(`[${requestId}] Checking if organization exists: ${orgId}`);
    const orgExists = await db.execute(sql`
      SELECT id FROM organizations WHERE id = ${orgId}::uuid LIMIT 1
    `);
    
    const orgResult = Array.isArray(orgExists) ? orgExists : (orgExists as any).rows || [];
    console.log(`[${requestId}] Organization query result:`, orgResult);
    if (orgResult.length === 0) {
      return res.status(404).json({
        error: "Organization not found",
        orgId: orgId
      });
    }
    
    // Check if sport exists
    console.log(`[${requestId}] Checking if sport exists: ${sportId}`);
    const sportExists = await db.execute(sql`
      SELECT id FROM sports WHERE id = ${sportId}::uuid LIMIT 1
    `);
    
    const sportResult = Array.isArray(sportExists) ? sportExists : (sportExists as any).rows || [];
    console.log(`[${requestId}] Sport query result:`, sportResult);
    if (sportResult.length === 0) {
      return res.status(404).json({
        error: "Sport not found",
        sportId: sportId
      });
    }
    
    // Insert or update org_sports record
    console.log(`[${requestId}] Upserting org_sports record...`);
    const orgSportResult = await db.execute(sql`
      INSERT INTO org_sports (organization_id, sport_id, contact_name, contact_email, contact_phone)
      VALUES (${orgId}::uuid, ${sportId}::uuid, ${contactName}, ${contactEmail}, ${contactPhone || null})
      ON CONFLICT (organization_id, sport_id) 
      DO UPDATE SET 
        contact_name = EXCLUDED.contact_name,
        contact_email = EXCLUDED.contact_email,
        contact_phone = EXCLUDED.contact_phone
      RETURNING id
    `);
    
    const orgSportRecord = Array.isArray(orgSportResult) ? orgSportResult[0] : (orgSportResult as any).rows?.[0];
    const orgSportId = orgSportRecord?.id;
    
    if (!orgSportId) {
      throw new Error("Failed to create or update org_sports record");
    }
    
    console.log(`[${requestId}] Org-sport record created/updated - ID: ${orgSportId}`);
    
    // Generate random password for new user
    const tempPassword = generateRandomPassword();
    console.log(`[${requestId}] Creating user account for: ${contactEmail}`);
    
    // Create user using Supabase auth admin
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: contactEmail,
      password: tempPassword,
      email_confirm: true
    });
    
    if (userError) {
      console.error(`[${requestId}] Failed to create user:`, userError);
      return res.status(500).json({
        error: "Failed to create user account",
        message: userError.message,
        requestId: requestId
      });
    }
    
    if (!userData.user?.id) {
      throw new Error("User created but no ID returned");
    }
    
    const userId = userData.user.id;
    console.log(`[${requestId}] User created successfully - ID: ${userId}`);
    
    // Get customer role ID
    const customerRoleResult = await db.execute(sql`
      SELECT id FROM roles WHERE slug = 'customer' LIMIT 1
    `);
    
    const customerRole = Array.isArray(customerRoleResult) ? customerRoleResult[0] : (customerRoleResult as any).rows?.[0];
    
    if (!customerRole?.id) {
      console.error(`[${requestId}] Customer role not found`);
      return res.status(500).json({
        error: "Customer role not found",
        message: "Please ensure the 'customer' role exists in the roles table",
        requestId: requestId
      });
    }
    
    // Insert user role relationship
    console.log(`[${requestId}] Assigning customer role to user...`);
    const userRoleResult = await db.execute(sql`
      INSERT INTO user_roles (user_id, org_id, role_id)
      VALUES (${userId}::uuid, ${orgId}::uuid, ${customerRole.id}::uuid)
      ON CONFLICT (user_id, org_id) DO NOTHING
      RETURNING id
    `);
    
    const userRoleRecord = Array.isArray(userRoleResult) ? userRoleResult[0] : (userRoleResult as any).rows?.[0];
    
    if (userRoleRecord?.id) {
      console.log(`[${requestId}] ✅ Assigned customer role to user ${userId} for org ${orgId}`);
    } else {
      console.log(`[${requestId}] ℹ️ User ${userId} already has a role for org ${orgId}`);
    }
    
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