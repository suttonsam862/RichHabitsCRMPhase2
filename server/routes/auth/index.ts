import { Router } from 'express';
import { supabaseAdmin } from '../../lib/supabase';
import { sendOk, sendErr } from '../../lib/http';
import { z } from 'zod';
import { createRequestLogger } from '../../lib/log';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().optional()
});

/**
 * POST /api/v1/auth/login
 * User login endpoint
 */
router.post('/login', async (req, res) => {
  const logger = createRequestLogger(req);
  
  try {
    // Validate request body
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return sendErr(res, 'VALIDATION_ERROR', 'Invalid request data', validation.error.flatten(), 400);
    }
    
    const { email, password } = validation.data;
    
    // Attempt login with Supabase
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ 
      email, 
      password 
    });
    
    if (error) {
      logger.info({ email, error: error.message }, 'Login failed');
      return sendErr(res, 'UNAUTHORIZED', 'Invalid credentials', undefined, 401);
    }
    
    logger.info({ userId: data.user?.id, email }, 'User logged in successfully');
    
    return sendOk(res, {
      accessToken: data.session?.access_token,
      refreshToken: data.session?.refresh_token,
      user: {
        id: data.user?.id,
        email: data.user?.email,
        fullName: data.user?.user_metadata?.full_name
      }
    });
  } catch (error) {
    logger.error({ error }, 'Login error');
    return sendErr(res, 'INTERNAL_ERROR', 'An error occurred during login', undefined, 500);
  }
});

/**
 * POST /api/v1/auth/register
 * User registration endpoint
 */
router.post('/register', async (req, res) => {
  const logger = createRequestLogger(req);
  
  try {
    // Validate request body
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return sendErr(res, 'VALIDATION_ERROR', 'Invalid request data', validation.error.flatten(), 400);
    }
    
    const { email, password, fullName } = validation.data;
    
    // Register user with Supabase (auto-confirmed for development)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for development
      user_metadata: {
        full_name: fullName
      }
    });
    
    if (error) {
      logger.info({ email, error: error.message }, 'Registration failed');
      return sendErr(res, 'BAD_REQUEST', error.message, undefined, 400);
    }
    
    logger.info({ userId: data.user?.id, email }, 'User registered successfully');
    
    return sendOk(res, {
      user: {
        id: data.user?.id,
        email: data.user?.email,
        fullName: data.user?.user_metadata?.full_name
      }
    });
  } catch (error) {
    logger.error({ error }, 'Registration error');
    return sendErr(res, 'INTERNAL_ERROR', 'An error occurred during registration', undefined, 500);
  }
});

/**
 * POST /api/v1/auth/logout
 * User logout endpoint (client-side token removal)
 */
router.post('/logout', (_req, res) => {
  // Logout is handled client-side by removing the token
  // Server just acknowledges the request
  return sendOk(res, { ok: true });
});

export default router;