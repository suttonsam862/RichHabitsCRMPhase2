
-- Add missing user columns to fix authentication errors
-- This fixes the authentication errors preventing organization access

BEGIN;

-- Add the missing columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS user_metadata JSONB DEFAULT '{}'::jsonb;

-- Update any existing admin users to have super admin privileges
UPDATE public.users 
SET is_super_admin = true 
WHERE email ILIKE '%admin%' OR email ILIKE '%@richabits%';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_is_super_admin ON public.users(is_super_admin) 
WHERE is_super_admin = true;

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

COMMIT;
