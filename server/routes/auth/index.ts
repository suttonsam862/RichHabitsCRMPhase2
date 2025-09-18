import { Router } from 'express';
import { sendOk, sendErr } from '../../lib/http';
import { supabaseAdmin } from '../../lib/supabase';
import { isEmailConfigured, emailConfigIssues, sendBrandedEmail, supabaseEmailShell, actionButton } from '../../lib/email';
import { requireAuth } from '../../middleware/auth';
import { logAuditEvent, AuditAction, getRequestMetadata } from '../../lib/audit';
const r = Router();

// POST /api/v1/auth/reset-request { email }
r.post('/reset-request', async (req, res) => {
  try{
    const { email } = req.body || {};
    if (!email) return sendErr(res, 'BAD_REQUEST', 'Email required', undefined, 400);
    if (!isEmailConfigured()) return sendErr(res,'SERVICE_UNAVAILABLE','Email not configured: missing '+emailConfigIssues().join(', '), undefined, 503);
    const redirectTo = (process.env.APP_PUBLIC_URL || '').replace(/\/$/,'') + '/reset-password';
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({ type:'recovery', email, options:{ redirectTo } });
    if (error || !data?.properties?.action_link) return sendErr(res,'BAD_REQUEST',error?.message || 'Could not generate link', undefined, 400);
    const html = supabaseEmailShell(
      'Reset your password',
      `<p style="opacity:.8">Click the button below to set a new password. This link will expire soon.</p>
       ${actionButton(data.properties.action_link,'Set new password')}
       <p style="opacity:.65;font-size:13px">If you did not request this, ignore this email.</p>`
    );
    await sendBrandedEmail(email,'Reset your password',html);
    return sendOk(res,{ sent:true });
  }catch(e:any){ return sendErr(res,'INTERNAL_ERROR',e?.message || 'Email error', undefined, 500); }
});

// POST /api/v1/auth/register { email,password,fullName,role, portfolioKey? }
r.post('/register', async (req, res) => {
  try{
    const { email, password, fullName, role, portfolioKey } = req.body || {};
    if (!email || !password || !fullName || !role) return sendErr(res,'BAD_REQUEST','Missing required fields', undefined, 400);
    if (!['customer','sales','design'].includes(role)) return sendErr(res,'BAD_REQUEST','Invalid role', undefined, 400);
    if (!isEmailConfigured()) return sendErr(res,'SERVICE_UNAVAILABLE','Email not configured: missing '+emailConfigIssues().join(', '), undefined, 503);
    const redirectTo = (process.env.APP_PUBLIC_URL || '').replace(/\/$/,'') + '/auth/confirmed';
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type:'signup', email, password,
      options:{ data:{ full_name: fullName, desired_role: role, portfolio_key: portfolioKey || null }, redirectTo }
    });
    if (error || !data?.properties?.action_link) return sendErr(res,'BAD_REQUEST',error?.message || 'Could not generate confirmation link', undefined, 400);
    const html = supabaseEmailShell(
      'Confirm your email',
      `<p style="opacity:.8">Welcome to Rich Habits. Please confirm your email to activate your account.</p>
       ${actionButton(data.properties.action_link,'Confirm email')}
       <p style="opacity:.65;font-size:13px">After confirming, you will be redirected to finish setup.</p>`
    );
    await sendBrandedEmail(email,'Confirm your email',html);
    return sendOk(res,{ sent:true });
  }catch(e:any){ return sendErr(res,'INTERNAL_ERROR',e?.message || 'Email error', undefined, 500); }
});

// POST /api/v1/auth/complete-profile — after verified login, apply desired_role -> user_roles
r.post('/complete-profile', requireAuth, async (req:any,res) => {
  try{
    const uid = req.user?.id; if(!uid) return sendErr(res,'UNAUTHORIZED','Unauthorized', undefined, 401);
    const { data: uData, error: uErr } = await supabaseAdmin.auth.admin.getUserById(uid);
    if (uErr || !uData?.user) return sendErr(res,'BAD_REQUEST',uErr?.message || 'User not found', undefined, 400);
    const meta = uData.user.user_metadata || {};
    const desiredRole = (meta.desired_role || '').toString();
    if (!desiredRole) return sendOk(res,{ ok:true, applied:false });

    const { data: roles } = await supabaseAdmin.from('roles').select('id,slug');
    const slug = desiredRole==='design' ? 'design' : desiredRole==='sales' ? 'sales' : 'customer';
    const roleId = roles?.find(r=>r.slug===slug)?.id;
    if (!roleId) return sendErr(res,'BAD_REQUEST','Role not found', undefined, 400);

    await supabaseAdmin.from('user_roles')
      .upsert({ user_id: uid, org_id: null, role_id: roleId }, { onConflict:'user_id,org_id,role_id' });

    return sendOk(res,{ ok:true, applied:true, role: slug });
  }catch(e:any){ return sendErr(res,'INTERNAL_ERROR',e?.message || 'Complete-profile error', undefined, 500); }
});

// POST /api/v1/auth/admin/create-user — SECURED: only accessible in development or with explicit env flag
r.post('/admin/create-user', requireAuth, async (req: any, res) => {
  try{
    // SECURITY: Kill-switch for production environments
    const isProduction = process.env.NODE_ENV === 'production';
    const allowAdminSeed = process.env.ALLOW_ADMIN_SEED === 'true';
    
    if (isProduction && !allowAdminSeed) {
      console.warn(`[SEC-1] Blocked admin creation attempt in production by user: ${req.user?.id}`);
      await logAuditEvent({
        action: AuditAction.ADMIN_USER_CREATION_BLOCKED,
        actor: req.user?.id,
        success: false,
        metadata: { reason: 'Production environment without ALLOW_ADMIN_SEED flag' },
        ...getRequestMetadata(req)
      });
      return sendErr(res,'FORBIDDEN','Admin creation disabled in production', undefined, 403);
    }
    
    // Additional check: Require system admin role for this operation
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role:roles(slug)')
      .eq('user_id', req.user?.id);
    
    const isSystemAdmin = userRoles?.some((ur: any) => ur.role?.slug === 'admin');
    if (!isSystemAdmin) {
      console.warn(`[SEC-1] Non-admin user attempted admin creation: ${req.user?.id}`);
      await logAuditEvent({
        action: AuditAction.ADMIN_USER_CREATION_BLOCKED,
        actor: req.user?.id,
        success: false,
        metadata: { reason: 'Non-admin user attempted admin creation' },
        ...getRequestMetadata(req)
      });
      return sendErr(res,'FORBIDDEN','System admin access required', undefined, 403);
    }
    
    const { email, password, fullName, role } = req.body || {};
    if (!email || !password || !fullName) return sendErr(res,'BAD_REQUEST','Missing required fields', undefined, 400);
    
    // Log admin creation for audit trail
    console.log(`[AUDIT] Admin user creation initiated by ${req.user?.id} for email: ${email}`);
    await logAuditEvent({
      action: AuditAction.ADMIN_USER_CREATION_ATTEMPT,
      actor: req.user?.id,
      target: email,
      success: true,
      metadata: { targetRole: role || 'admin' },
      ...getRequestMetadata(req)
    });
    
    // Create user directly with admin privileges
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name: fullName },
      email_confirm: true // Skip email confirmation for admin users
    });
    
    if (error || !data?.user) return sendErr(res,'BAD_REQUEST',error?.message || 'Could not create user', undefined, 400);
    
    // Assign admin role
    const { data: roles } = await supabaseAdmin.from('roles').select('id,slug');
    const targetRole = role || 'admin';
    const roleId = roles?.find(r=>r.slug===targetRole)?.id;
    if (!roleId) return sendErr(res,'BAD_REQUEST',`Role ${targetRole} not found`, undefined, 400);

    await supabaseAdmin.from('user_roles')
      .insert({ user_id: data.user.id, org_id: null, role_id: roleId });

    console.log(`[AUDIT] Admin user created successfully: ${data.user.id} by ${req.user?.id}`);
    await logAuditEvent({
      action: AuditAction.ADMIN_USER_CREATION_SUCCESS,
      actor: req.user?.id,
      target: data.user.id,
      success: true,
      metadata: { email: data.user.email, role: targetRole },
      ...getRequestMetadata(req)
    });
    return sendOk(res,{ created:true, user_id: data.user.id, email: data.user.email, role: targetRole });
  }catch(e:any){ 
    console.error(`[ERROR] Admin user creation failed:`, e);
    return sendErr(res,'INTERNAL_ERROR',e?.message || 'Admin user creation error', undefined, 500); 
  }
});

export default r;