-- DB MIGRATION: 2025_08_22_healthcheck_hardening
-- Idempotent migration for healthcheck hardening CR

-- Indexes (perf) — safe if they already exist
CREATE INDEX IF NOT EXISTS idx_orders_org_id ON public.orders(org_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status_code ON public.orders(status_code);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_org ON public.order_items(org_id);
CREATE INDEX IF NOT EXISTS idx_order_items_status ON public.order_items(status_code);
CREATE INDEX IF NOT EXISTS idx_order_item_sizes_it ON public.order_item_sizes(order_item_id);
CREATE INDEX IF NOT EXISTS idx_orgs_name ON public.organizations(name);
CREATE INDEX IF NOT EXISTS idx_user_roles_org_user ON public.user_roles(org_id, user_id);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add color_palette to organizations if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='organizations' AND column_name='color_palette') THEN
        ALTER TABLE public.organizations ADD COLUMN color_palette jsonb DEFAULT '[]'::jsonb;
    END IF;
    
    -- Add contact_user_id to org_sports if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='org_sports' AND column_name='contact_user_id') THEN
        ALTER TABLE public.org_sports ADD COLUMN contact_user_id uuid;
        ALTER TABLE public.org_sports ADD CONSTRAINT org_sports_contact_user_id_fkey 
            FOREIGN KEY (contact_user_id) REFERENCES public.users(id);
    END IF;
END $$;

-- RLS enable (no-op if already enabled)
DO $$ 
BEGIN
    BEGIN
        EXECUTE 'ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY';
    EXCEPTION WHEN duplicate_object THEN NULL; 
    END;
    BEGIN
        EXECUTE 'ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY';
    EXCEPTION WHEN duplicate_object THEN NULL; 
    END;
    BEGIN
        EXECUTE 'ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY';
    EXCEPTION WHEN duplicate_object THEN NULL; 
    END;
    BEGIN
        EXECUTE 'ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY';
    EXCEPTION WHEN duplicate_object THEN NULL; 
    END;
    BEGIN
        EXECUTE 'ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY';
    EXCEPTION WHEN duplicate_object THEN NULL; 
    END;
    BEGIN
        EXECUTE 'ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY';
    EXCEPTION WHEN duplicate_object THEN NULL; 
    END;
    BEGIN
        EXECUTE 'ALTER TABLE public.design_jobs ENABLE ROW LEVEL SECURITY';
    EXCEPTION WHEN duplicate_object THEN NULL; 
    END;
    BEGIN
        EXECUTE 'ALTER TABLE public.manufacturing_work_orders ENABLE ROW LEVEL SECURITY';
    EXCEPTION WHEN duplicate_object THEN NULL; 
    END;
END $$;

-- Bucket existence for uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('app', 'app', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for org branding files
DO $$
BEGIN
    -- Policy for members to read branding files
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_branding_select' AND tablename = 'objects') THEN
        CREATE POLICY org_branding_select ON storage.objects
        FOR SELECT TO authenticated
        USING (
            bucket_id = 'app' AND 
            (storage.foldername(name))[1] = 'org' AND
            is_org_member(auth.uid(), ((storage.foldername(name))[2])::uuid)
        );
    END IF;
    
    -- Policy for admins to upload/delete branding files
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_branding_insert' AND tablename = 'objects') THEN
        CREATE POLICY org_branding_insert ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (
            bucket_id = 'app' AND 
            (storage.foldername(name))[1] = 'org' AND
            (storage.foldername(name))[3] = 'branding' AND
            has_role_slug(auth.uid(), ((storage.foldername(name))[2])::uuid, 'Admin')
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_branding_delete' AND tablename = 'objects') THEN
        CREATE POLICY org_branding_delete ON storage.objects
        FOR DELETE TO authenticated
        USING (
            bucket_id = 'app' AND 
            (storage.foldername(name))[1] = 'org' AND
            (storage.foldername(name))[3] = 'branding' AND
            has_role_slug(auth.uid(), ((storage.foldername(name))[2])::uuid, 'Admin')
        );
    END IF;
END $$;