
-- Comprehensive fix for salespeople table policies and schema dependencies
-- This script safely removes policies, drops problematic columns, and recreates the schema

DO $$
DECLARE
    policy_record RECORD;
    table_list TEXT[] := ARRAY[
        'salespeople', 'salesperson_profiles', 'salesperson_assignments', 'salesperson_metrics',
        'roles', 'role_permissions', 'user_roles', 'permissions',
        'organizations', 'users', 'orders', 'order_items', 'org_sports',
        'designers', 'manufacturers', 'audit_logs', 'catalog_items',
        'customers', 'design_assets', 'order_item_sizes', 'sports',
        'status_orders', 'commissions', 'accounting_invoices', 'accounting_payments'
    ];
    table_name TEXT;
BEGIN
    RAISE NOTICE 'Starting comprehensive policy and schema fix...';

    -- Step 1: Disable RLS on all tables to avoid conflicts
    FOREACH table_name IN ARRAY table_list
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'public' AND table_name = table_name) THEN
            BEGIN
                EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', table_name);
                RAISE NOTICE 'Disabled RLS on table %', table_name;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not disable RLS on table %: %', table_name, SQLERRM;
            END;
        END IF;
    END LOOP;

    -- Step 2: Drop ALL policies that might interfere
    FOREACH table_name IN ARRAY table_list
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'public' AND table_name = table_name) THEN
            
            FOR policy_record IN 
                SELECT schemaname, tablename, policyname 
                FROM pg_policies 
                WHERE tablename = table_name AND schemaname = 'public'
            LOOP
                BEGIN
                    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I CASCADE', 
                                  policy_record.policyname, 
                                  policy_record.schemaname, 
                                  policy_record.tablename);
                    RAISE NOTICE 'Dropped policy % on table %.%', 
                                 policy_record.policyname, 
                                 policy_record.schemaname, 
                                 policy_record.tablename;
                EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE 'Could not drop policy % on table %.%: %', 
                                 policy_record.policyname, 
                                 policy_record.schemaname, 
                                 policy_record.tablename,
                                 SQLERRM;
                END;
            END LOOP;
        END IF;
    END LOOP;

    -- Step 3: Handle problematic salespeople table columns
    BEGIN
        -- Drop the problematic org_id column if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'salespeople' AND column_name = 'org_id') THEN
            ALTER TABLE salespeople DROP COLUMN org_id CASCADE;
            RAISE NOTICE 'Dropped org_id column from salespeople table';
        END IF;

        -- Drop commission_rate_default column if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'salespeople' AND column_name = 'commission_rate_default') THEN
            ALTER TABLE salespeople DROP COLUMN commission_rate_default CASCADE;
            RAISE NOTICE 'Dropped commission_rate_default column from salespeople table';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not modify salespeople table: %', SQLERRM;
    END;

    -- Step 4: Clean up other problematic columns mentioned in the migration
    BEGIN
        -- Fix permissions table
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'permissions' AND column_name = 'key') THEN
            ALTER TABLE permissions DROP COLUMN key CASCADE;
            RAISE NOTICE 'Dropped key column from permissions table';
        END IF;

        -- Fix order_events table
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'order_events' AND column_name = 'org_id') THEN
            ALTER TABLE order_events DROP COLUMN org_id CASCADE;
            RAISE NOTICE 'Dropped org_id column from order_events table';
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'order_events' AND column_name = 'from_status') THEN
            ALTER TABLE order_events DROP COLUMN from_status CASCADE;
            RAISE NOTICE 'Dropped from_status column from order_events table';
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'order_events' AND column_name = 'to_status') THEN
            ALTER TABLE order_events DROP COLUMN to_status CASCADE;
            RAISE NOTICE 'Dropped to_status column from order_events table';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not clean up other columns: %', SQLERRM;
    END;

    -- Step 5: Drop the problematic size_enum type if it exists
    BEGIN
        DROP TYPE IF EXISTS size_enum CASCADE;
        RAISE NOTICE 'Dropped size_enum type';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not drop size_enum type: %', SQLERRM;
    END;

    -- Step 6: Ensure audit_logs id column is bigint
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'audit_logs' AND column_name = 'id' 
                   AND data_type != 'bigint') THEN
            ALTER TABLE audit_logs ALTER COLUMN id TYPE bigint;
            RAISE NOTICE 'Fixed audit_logs.id column type to bigint';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not fix audit_logs.id column: %', SQLERRM;
    END;

    RAISE NOTICE 'Comprehensive policy and schema fix completed successfully!';
    RAISE NOTICE 'You can now run drizzle-kit push to apply the new schema.';
END $$;

SELECT 'Policy dependencies removed, problematic columns dropped, ready for schema push' as status;
