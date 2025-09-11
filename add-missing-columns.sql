-- Add missing columns to users table in Supabase to match Neon schema
-- Missing: initial_temp_password, subrole, job_title, department, hire_date, permissions, page_access

BEGIN;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS initial_temp_password TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subrole TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS hire_date TIMESTAMP;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS page_access JSONB DEFAULT '{}'::jsonb;

COMMIT;