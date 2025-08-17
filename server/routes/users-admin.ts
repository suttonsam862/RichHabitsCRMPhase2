import { Router } from "express";
import { z } from "zod";
import { sbAdmin as supabaseAdmin } from '../lib/supabaseAdmin';

const router = Router();

// TODO: Add authentication/authorization for admin endpoints

// GET /api/users/admin - List users
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 100
    });

    if (error) {
      console.error("Failed to list users:", error);
      return res.status(500).json({
        ok: false,
        error: error.message
      });
    }

    const users = data.users.map(user => ({
      id: user.id,
      email: user.email,
      fullName: user.user_metadata?.full_name || '',
      createdAt: user.created_at,
      lastSignIn: user.last_sign_in_at
    }));

    res.json({
      ok: true,
      users: users
    });

  } catch (error: any) {
    console.error("Error listing users:", error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// PUT /api/users/admin - Update user
const UpdateUserSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  email: z.string().email("Invalid email").optional(),
  fullName: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional()
});

router.put("/", async (req, res) => {
  try {
    const parseResult = UpdateUserSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({
        ok: false,
        error: "Validation failed",
        issues: parseResult.error.issues
      });
    }

    const { userId, email, fullName, password } = parseResult.data;

    // Prepare update data
    const updateData: any = {};
    
    if (email) {
      updateData.email = email;
    }
    
    if (password) {
      updateData.password = password;
    }

    if (fullName !== undefined) {
      updateData.user_metadata = { full_name: fullName };
    }

    const { data: user, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      updateData
    );

    if (error) {
      console.error("Failed to update user:", error);
      return res.status(500).json({
        ok: false,
        error: error.message
      });
    }

    res.json({
      ok: true,
      user: {
        id: user.user.id,
        email: user.user.email,
        fullName: user.user.user_metadata?.full_name || ''
      }
    });

  } catch (error: any) {
    console.error("Error updating user:", error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

export default router;