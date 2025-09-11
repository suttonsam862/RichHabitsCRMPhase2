-- Add assigned_salesperson_id column to org_sports table
ALTER TABLE public.org_sports 
ADD COLUMN IF NOT EXISTS assigned_salesperson_id VARCHAR NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_org_sports_assigned_salesperson 
ON public.org_sports(assigned_salesperson_id);

-- Add foreign key constraint if users table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        ALTER TABLE public.org_sports 
        ADD CONSTRAINT IF NOT EXISTS fk_org_sports_assigned_salesperson 
        FOREIGN KEY (assigned_salesperson_id) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
