import { Router } from "express";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { sb as supabaseAdmin } from '../lib/supabaseAdmin';
import { getRoleIdBySlug, ensureRoleExists } from '../lib/roles';

const router = Router();

// Generate random password
function generateRandomPassword(length: number = 20): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// POST /api/users - Create user
const CreateUserSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6).optional(),
  fullName: z.string().optional(),
  orgId: z.string().uuid("Invalid organization ID").optional(),
  roleSlug: z.string().default("customer")
});

router.post("/", async (req, res) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] Creating user:`, { ...req.body, password: req.body.password ? '[REDACTED]' : undefined });

  try {
    const parseResult = CreateUserSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({
        ok: false,
        error: "Validation failed",
        issues: parseResult.error.issues
      });
    }

    const { email, password, fullName, orgId, roleSlug } = parseResult.data;

    // Generate password if not provided
    const userPassword = password || generateRandomPassword();
    const tempPassword = !password ? userPassword : undefined;

    // Create user in Supabase
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: userPassword,
      email_confirm: true,
      user_metadata: fullName ? { full_name: fullName } : undefined
    });

    if (userError) {
      console.error(`[${requestId}] Failed to create user:`, userError);
      return res.status(500).json({
        ok: false,
        error: userError.message
      });
    }

    if (!userData.user?.id) {
      throw new Error("User created but no ID returned");
    }

    const userId = userData.user.id;
    console.log(`[${requestId}] User created successfully - ID: ${userId}`);

    // Assign role if orgId is provided
    if (orgId) {
      console.log(`[${requestId}] Assigning role ${roleSlug} to user for org ${orgId}`);
      
      // Ensure the role exists
      await ensureRoleExists(roleSlug.charAt(0).toUpperCase() + roleSlug.slice(1), roleSlug);
      
      // Get role ID
      const roleId = await getRoleIdBySlug(roleSlug);
      
      if (roleId) {
        try {
          await db.execute(sql`
            INSERT INTO user_roles (user_id, org_id, role_id)
            VALUES (${userId}, ${orgId}, ${roleId})
            ON CONFLICT (user_id, org_id, role_id) DO NOTHING
          `);
          console.log(`[${requestId}] Role assigned successfully`);
        } catch (roleError: any) {
          console.warn(`[${requestId}] Role assignment failed:`, roleError.message);
        }
      } else {
        console.warn(`[${requestId}] Role ${roleSlug} not found`);
      }
    }

    // Return success response
    res.status(201).json({
      ok: true,
      user: {
        id: userId,
        email: email,
        fullName: fullName || ''
      },
      tempPassword: tempPassword
    });

  } catch (error: any) {
    console.error(`[${requestId}] Error creating user:`, error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

export default router;