
-- Add missing description column to permission_templates table
-- This fixes the error: column permission_templates.description does not exist

DO $$
BEGIN
  -- Check if description column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'permission_templates' 
    AND column_name = 'description'
  ) THEN
    ALTER TABLE public.permission_templates 
    ADD COLUMN description text;
    
    -- Set default value for existing records
    UPDATE public.permission_templates 
    SET description = null 
    WHERE description IS NULL;
    
    RAISE NOTICE 'Added description column to permission_templates table';
  ELSE
    RAISE NOTICE 'Description column already exists in permission_templates table';
  END IF;
END $$;
