
-- Fix organization_metrics table default constraint casting issue
-- This handles the specific error: default for column "id" cannot be cast automatically to type uuid

DO $$
BEGIN
    RAISE NOTICE 'Starting organization_metrics id column fix';
    
    -- Check if the table exists and needs fixing
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organization_metrics' 
        AND column_name = 'id'
        AND data_type = 'character varying'
    ) THEN
        RAISE NOTICE 'Found organization_metrics.id that needs UUID conversion';
        
        -- First, drop the existing default constraint
        ALTER TABLE organization_metrics ALTER COLUMN id DROP DEFAULT;
        RAISE NOTICE 'Dropped default constraint on organization_metrics.id';
        
        -- Clean any invalid UUID values
        UPDATE organization_metrics 
        SET id = NULL 
        WHERE id IS NOT NULL 
        AND id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
        RAISE NOTICE 'Cleaned invalid UUIDs in organization_metrics.id';
        
        -- Generate UUIDs for any NULL values
        UPDATE organization_metrics SET id = gen_random_uuid() WHERE id IS NULL;
        RAISE NOTICE 'Generated UUIDs for NULL values in organization_metrics.id';
        
        -- Now convert the column type
        ALTER TABLE organization_metrics ALTER COLUMN id TYPE uuid USING id::uuid;
        RAISE NOTICE 'Successfully converted organization_metrics.id to uuid';
        
        -- Add back the default for new rows
        ALTER TABLE organization_metrics ALTER COLUMN id SET DEFAULT gen_random_uuid();
        RAISE NOTICE 'Set default UUID generation for organization_metrics.id';
        
    ELSE
        RAISE NOTICE 'organization_metrics.id is already UUID type or table does not exist';
    END IF;
    
    RAISE NOTICE 'organization_metrics id fix completed';
END $$;
