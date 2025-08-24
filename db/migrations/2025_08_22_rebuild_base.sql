-- Migration: 2025_08_22_rebuild_base
-- Description: Rebuild auth + theme + baseline production hardening

-- Roles seeds
INSERT INTO public.roles (id, name, slug)
VALUES
  (gen_random_uuid(), 'Admin', 'admin'),
  (gen_random_uuid(), 'Sales', 'sales'),
  (gen_random_uuid(), 'Design', 'design'),
  (gen_random_uuid(), 'Manufacturing', 'manufacturing'),
  (gen_random_uuid(), 'Accounting', 'accounting'),
  (gen_random_uuid(), 'Customer', 'customer')
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name;

-- Order status lookups
INSERT INTO public.status_orders (code, sort_order, is_terminal) VALUES
  ('consultation',1,false),('design',2,false),('manufacturing',3,false),
  ('shipped',4,false),('completed',5,true)
ON CONFLICT (code) DO NOTHING;

-- Order item status lookups
CREATE TABLE IF NOT EXISTS public.status_order_items (
  code text PRIMARY KEY,
  sort_order integer NOT NULL,
  is_terminal boolean NOT NULL DEFAULT false
);

INSERT INTO public.status_order_items (code, sort_order, is_terminal) VALUES
  ('pending',1,false),('design',2,false),('approved',3,false),
  ('manufacturing',4,false),('shipped',5,false),('done',6,true)
ON CONFLICT (code) DO NOTHING;

-- Organizations shape defaults
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='organizations' AND column_name='color_palette') THEN
    ALTER TABLE public.organizations ADD COLUMN color_palette jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='organizations' AND column_name='universal_discounts') THEN
    ALTER TABLE public.organizations ADD COLUMN universal_discounts jsonb;
  END IF;
  UPDATE public.organizations SET universal_discounts='{}'::jsonb WHERE universal_discounts IS NULL;
  ALTER TABLE public.organizations
    ALTER COLUMN universal_discounts SET DEFAULT '{}'::jsonb,
    ALTER COLUMN universal_discounts SET NOT NULL;
END$$;

-- OrgSports contact user link
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='org_sports' AND column_name='contact_user_id') THEN
    ALTER TABLE public.org_sports
      ADD COLUMN contact_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Orders/items: ensure status_code only (no enums)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='orders' AND column_name='status') THEN
    UPDATE public.orders SET status_code = status::text WHERE status_code IS NULL;
    ALTER TABLE public.orders DROP COLUMN status;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='order_items' AND column_name='status_code') THEN
    ALTER TABLE public.order_items ADD COLUMN status_code text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='order_items' AND column_name='status') THEN
    UPDATE public.order_items SET status_code = status::text WHERE status_code IS NULL;
    ALTER TABLE public.order_items DROP COLUMN status;
  END IF;
  BEGIN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_status_code_fkey
      FOREIGN KEY (status_code) REFERENCES public.status_order_items(code);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Drop orphan enums if unused
DO $$ DECLARE r int; i int;
BEGIN
  SELECT COUNT(*) INTO r FROM pg_type t LEFT JOIN pg_depend d ON d.refobjid=t.oid WHERE t.typname='order_status';
  IF r=0 THEN BEGIN DROP TYPE IF EXISTS public.order_status; EXCEPTION WHEN others THEN NULL; END; END IF;
  SELECT COUNT(*) INTO i FROM pg_type t LEFT JOIN pg_depend d ON d.refobjid=t.oid WHERE t.typname='order_item_status';
  IF i=0 THEN BEGIN DROP TYPE IF EXISTS public.order_item_status; EXCEPTION WHEN others THEN NULL; END; END IF;
END $$;

-- RLS Helpers
CREATE OR REPLACE FUNCTION public.has_role_slug(uid uuid, org uuid, role_slug text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id=ur.role_id
    WHERE ur.user_id=uid AND ur.org_id IS NOT DISTINCT FROM org AND r.slug=role_slug
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(uid uuid, org uuid, role_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id=ur.role_id
    WHERE ur.user_id=uid AND ur.org_id IS NOT DISTINCT FROM org
      AND (r.slug=lower(role_name) OR r.name=role_name)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(uid uuid, org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=uid AND org_id IS NOT DISTINCT FROM org);
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(uid uuid, org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT public.has_role_slug(uid, org, 'admin');
$$;

-- Org bootstrap owner
CREATE OR REPLACE FUNCTION public.handle_org_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE admin_role_id uuid; v_user uuid;
BEGIN
  BEGIN v_user := auth.uid(); EXCEPTION WHEN others THEN v_user := NULL; END;
  IF v_user IS NULL THEN RETURN NEW; END IF;
  SELECT id INTO admin_role_id FROM public.roles WHERE slug='admin' LIMIT 1;
  IF admin_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, org_id, role_id)
    VALUES (v_user, NEW.id, admin_role_id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

-- Summary RPC (avoid N+1)
CREATE OR REPLACE FUNCTION public.org_summary(p_org_id uuid, p_requester uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.is_org_member(p_requester, p_org_id) AND NOT public.is_org_admin(p_requester, p_org_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;
  SELECT jsonb_build_object(
    'organization', to_jsonb(o) - 'universal_discounts' || jsonb_build_object(
        'universalDiscounts', COALESCE(o.universal_discounts,'{}'::jsonb),
        'colorPalette', COALESCE(o.color_palette, '[]'::jsonb)
    ),
    'sports', COALESCE((
       SELECT jsonb_agg(jsonb_build_object(
         'sportId', os.sport_id, 'contactEmail', os.contact_email,
         'contactUserId', os.contact_user_id, 'contactUserEmail', au.email ))
       FROM public.org_sports os
       LEFT JOIN auth.users au ON au.id=os.contact_user_id
       WHERE os.org_id=o.id
    ), '[]'::jsonb)
  ) INTO result
  FROM public.organizations o WHERE o.id=p_org_id;
  RETURN COALESCE(result, '{}'::jsonb);
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_org_id       ON public.orders(org_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id  ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status_code  ON public.orders(status_code);
CREATE INDEX IF NOT EXISTS idx_order_items_order   ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_org     ON public.order_items(org_id);
CREATE INDEX IF NOT EXISTS idx_order_items_status  ON public.order_items(status_code);
CREATE INDEX IF NOT EXISTS idx_orgs_name           ON public.organizations(name);
CREATE INDEX IF NOT EXISTS idx_user_roles_org_user ON public.user_roles(org_id, user_id);

-- RLS enable (no-op if already)
DO $$ BEGIN
  EXECUTE 'ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.org_sports ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN others THEN NULL; END $$;

-- Storage bucket ensure
INSERT INTO storage.buckets (id, name, public) VALUES ('app','app',false)
ON CONFLICT (id) DO NOTHING;