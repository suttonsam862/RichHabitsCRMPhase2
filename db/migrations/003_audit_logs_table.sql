-- Phase 0 SEC-3: Create audit_logs table for security event tracking
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  actor TEXT, -- User ID or IP address
  target TEXT, -- Resource being accessed/modified
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON public.audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON public.audit_logs(success);

-- Enable RLS (but allow service role full access)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read audit logs for their organization
CREATE POLICY IF NOT EXISTS audit_logs_admin_read ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND (ur.org_id = audit_logs.org_id OR ur.org_id IS NULL)
        AND r.slug = 'admin'
    )
  );

-- No INSERT/UPDATE/DELETE policies - only service role can write
COMMENT ON TABLE public.audit_logs IS 'Security audit trail for critical operations';
COMMENT ON COLUMN public.audit_logs.action IS 'Type of action performed (e.g., LOGIN_ATTEMPT, ADMIN_USER_CREATION)';
COMMENT ON COLUMN public.audit_logs.actor IS 'User ID or IP address of the actor';
COMMENT ON COLUMN public.audit_logs.target IS 'Resource being accessed or modified';
COMMENT ON COLUMN public.audit_logs.metadata IS 'Additional context about the action';