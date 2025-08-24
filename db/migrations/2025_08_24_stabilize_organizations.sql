-- FILE: /db/migrations/2025_08_24_stabilize_organizations.sql
-- PURPOSE: This is a single, consolidated migration to fix critical schema and RLS issues.
-- It addresses schema drift and incorrect policies that are blocking organization creation.

BEGIN;

-- STEP 1: Add the 'created_by' column to the organizations table.
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS created_by UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM   pg_constraint
        WHERE  conname = 'organizations_created_by_fkey'
    )
    THEN
        ALTER TABLE public.organizations
        ADD CONSTRAINT organizations_created_by_fkey
        FOREIGN KEY (created_by)
        REFERENCES auth.users(id)
        ON DELETE SET NULL;
    END IF;
END;
$$;

-- STEP 2: Correct the 'org_sports' table.
ALTER TABLE public.org_sports
DROP COLUMN IF EXISTS contact_user_id;

-- STEP 3: Rebuild RLS policies for 'organizations' from scratch.
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to organizations" ON public.organizations;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.organizations;
DROP POLICY IF EXISTS "Users can insert their own organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can update their own organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can delete their own organizations" ON public.organizations;

CREATE POLICY "Users can view their own organizations" ON public.organizations FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can insert organizations for themselves" ON public.organizations FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their own organizations" ON public.organizations FOR UPDATE USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can delete their own organizations" ON public.organizations FOR DELETE USING (auth.uid() = created_by);

-- STEP 4: Rebuild RLS policies for 'org_sports'.
ALTER TABLE public.org_sports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.org_sports;
DROP POLICY IF EXISTS "Allow full access to org sports" ON public.org_sports;

CREATE POLICY "Users can view sports of their own organizations" ON public.org_sports FOR SELECT USING (EXISTS (SELECT 1 FROM organizations WHERE organizations.id = org_sports.organization_id AND organizations.created_by = auth.uid()));
CREATE POLICY "Users can insert sports for their own organizations" ON public.org_sports FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM organizations WHERE organizations.id = org_sports.organization_id AND organizations.created_by = auth.uid()));
CREATE POLICY "Users can update sports for their own organizations" ON public.org_sports FOR UPDATE USING (EXISTS (SELECT 1 FROM organizations WHERE organizations.id = org_sports.organization_id AND organizations.created_by = auth.uid()));
CREATE POLICY "Users can delete sports from their own organizations" ON public.org_sports FOR DELETE USING (EXISTS (SELECT 1 FROM organizations WHERE organizations.id = org_sports.organization_id AND organizations.created_by = auth.uid()));

COMMIT;