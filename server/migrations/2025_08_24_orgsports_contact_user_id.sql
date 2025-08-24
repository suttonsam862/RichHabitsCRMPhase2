-- Idempotent migration: ensure column present
ALTER TABLE public.org_sports
  ADD COLUMN IF NOT EXISTS contact_user_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'org_sports_contact_user_fk'
  ) THEN
    ALTER TABLE public.org_sports
      ADD CONSTRAINT org_sports_contact_user_fk
      FOREIGN KEY (contact_user_id) REFERENCES auth.users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Force PostgREST schema cache reload immediately
SELECT pg_notify('pgrst', 'reload schema');