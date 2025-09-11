import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

async function applyMissingColumns() {
  try {
    console.log('🔄 Adding missing columns to Supabase users table...\n');

    // Since direct DDL doesn't work through Supabase client, let's use a workaround
    // We'll create a stored procedure to add the columns

    console.log('1. Creating stored procedure to add missing columns...');
    
    const procedureSQL = `
CREATE OR REPLACE FUNCTION add_missing_users_columns()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result TEXT := '';
BEGIN
    -- Add initial_temp_password column
    BEGIN
        EXECUTE 'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS initial_temp_password TEXT';
        result := result || 'initial_temp_password added; ';
    EXCEPTION WHEN duplicate_column THEN
        result := result || 'initial_temp_password exists; ';
    END;

    -- Add subrole column
    BEGIN
        EXECUTE 'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subrole TEXT';
        result := result || 'subrole added; ';
    EXCEPTION WHEN duplicate_column THEN
        result := result || 'subrole exists; ';
    END;

    -- Add job_title column
    BEGIN
        EXECUTE 'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS job_title TEXT';
        result := result || 'job_title added; ';
    EXCEPTION WHEN duplicate_column THEN
        result := result || 'job_title exists; ';
    END;

    -- Add department column
    BEGIN
        EXECUTE 'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department TEXT';
        result := result || 'department added; ';
    EXCEPTION WHEN duplicate_column THEN
        result := result || 'department exists; ';
    END;

    -- Add hire_date column
    BEGIN
        EXECUTE 'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS hire_date TIMESTAMP';
        result := result || 'hire_date added; ';
    EXCEPTION WHEN duplicate_column THEN
        result := result || 'hire_date exists; ';
    END;

    -- Add permissions column
    BEGIN
        EXECUTE format('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT %L::jsonb', '{}');
        result := result || 'permissions added; ';
    EXCEPTION WHEN duplicate_column THEN
        result := result || 'permissions exists; ';
    END;

    -- Add page_access column
    BEGIN
        EXECUTE format('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS page_access JSONB DEFAULT %L::jsonb', '{}');
        result := result || 'page_access added; ';
    EXCEPTION WHEN duplicate_column THEN
        result := result || 'page_access exists; ';
    END;

    RETURN result;
END;
$$;
`;

    // Save the procedure SQL for reference
    writeFileSync('create-procedure.sql', procedureSQL);
    console.log('📄 Procedure SQL saved to: create-procedure.sql');

    // Try to execute the procedure creation using a different approach
    console.log('\n2. Attempting to create procedure via Supabase...');
    
    // Use the postgrest API to execute SQL - this might work
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      },
      body: JSON.stringify({ sql: procedureSQL })
    });

    if (response.ok) {
      console.log('✅ Procedure created successfully via REST API');
      
      // Execute the procedure
      console.log('\n3. Executing procedure to add columns...');
      const execResponse = await supabaseAdmin.rpc('add_missing_users_columns');
      
      if (execResponse.error) {
        console.log('❌ Procedure execution failed:', execResponse.error);
      } else {
        console.log('✅ Procedure executed:', execResponse.data);
      }
    } else {
      console.log('❌ Procedure creation failed via REST API');
      console.log('Response:', await response.text());
      
      console.log('\n📋 Manual Steps Required:');
      console.log('1. Open Supabase dashboard SQL editor');
      console.log('2. Execute the SQL from add-missing-columns.sql');
      console.log('3. Or execute the procedure from create-procedure.sql then call the function');
    }

    // Test if columns are now available
    console.log('\n4. Testing column availability...');
    const { data: testData, error: testError } = await supabaseAdmin
      .from('users')
      .select('id, subrole, job_title, permissions')
      .limit(1);

    if (testError) {
      console.log('❌ Test failed:', testError.message);
    } else {
      console.log('✅ Test successful! Extended columns are now available');
    }

  } catch (error) {
    console.error('Script error:', error);
  }
}

applyMissingColumns();