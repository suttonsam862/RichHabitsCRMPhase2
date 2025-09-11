import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

async function createMissingColumns() {
  try {
    console.log('Attempting to add missing columns to users table...');

    // Step 1: Create a SQL function that can execute DDL
    console.log('\n1. Creating DDL execution function...');
    const createFunctionSql = `
CREATE OR REPLACE FUNCTION public.add_users_columns()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result text := '';
BEGIN
  -- Add subrole column
  BEGIN
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subrole text;
    result := result || 'Added subrole; ';
  EXCEPTION WHEN duplicate_column THEN
    result := result || 'subrole exists; ';
  END;

  -- Add job_title column
  BEGIN
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS job_title text;
    result := result || 'Added job_title; ';
  EXCEPTION WHEN duplicate_column THEN
    result := result || 'job_title exists; ';
  END;

  -- Add department column
  BEGIN
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department text;
    result := result || 'Added department; ';
  EXCEPTION WHEN duplicate_column THEN
    result := result || 'department exists; ';
  END;

  -- Add hire_date column
  BEGIN
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS hire_date timestamp;
    result := result || 'Added hire_date; ';
  EXCEPTION WHEN duplicate_column THEN
    result := result || 'hire_date exists; ';
  END;

  -- Add permissions column
  BEGIN
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '{}'::jsonb;
    result := result || 'Added permissions; ';
  EXCEPTION WHEN duplicate_column THEN
    result := result || 'permissions exists; ';
  END;

  -- Add page_access column
  BEGIN
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS page_access jsonb DEFAULT '{}'::jsonb;
    result := result || 'Added page_access; ';
  EXCEPTION WHEN duplicate_column THEN
    result := result || 'page_access exists; ';
  END;

  -- Add initial_temp_password column
  BEGIN
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS initial_temp_password text;
    result := result || 'Added initial_temp_password; ';
  EXCEPTION WHEN duplicate_column THEN
    result := result || 'initial_temp_password exists; ';
  END;

  RETURN result;
END;
$$;
`;

    console.log('Creating SQL function...');
    const { data: createData, error: createError } = await supabaseAdmin.rpc('sql', { 
      query: createFunctionSql 
    });

    if (createError) {
      console.log('Function creation failed, trying direct column addition...');
      console.error('Create function error:', createError);
      
      // Try direct approach - create columns one by one using individual queries
      console.log('\n2. Trying direct column additions...');
      
      const alterQueries = [
        "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subrole text;",
        "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS job_title text;", 
        "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department text;",
        "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS hire_date timestamp;",
        "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '{}'::jsonb;",
        "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS page_access jsonb DEFAULT '{}'::jsonb;",
        "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS initial_temp_password text;"
      ];

      for (const [index, query] of alterQueries.entries()) {
        try {
          console.log(`Executing query ${index + 1}: ${query}`);
          const { data, error } = await supabaseAdmin.rpc('sql', { query });
          
          if (error) {
            console.error(`Error on query ${index + 1}:`, error);
          } else {
            console.log(`✅ Query ${index + 1} successful`);
          }
        } catch (err) {
          console.error(`Exception on query ${index + 1}:`, err);
        }
        
        // Add a small delay between queries
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
    } else {
      console.log('✅ SQL function created successfully');
      
      // Step 2: Execute the function to add columns
      console.log('\n2. Executing function to add missing columns...');
      const { data: executeData, error: executeError } = await supabaseAdmin.rpc('add_users_columns');
      
      if (executeError) {
        console.error('Function execution error:', executeError);
      } else {
        console.log('✅ Function executed successfully:', executeData);
      }
    }

    // Step 3: Test if columns were added
    console.log('\n3. Testing if columns were added...');
    const { data: testUsers, error: testError } = await supabaseAdmin
      .from('users')
      .select('id, email, subrole, job_title, department, permissions, page_access')
      .limit(1);
    
    if (testError) {
      console.error('❌ Test query failed:', testError);
    } else {
      console.log('✅ Test query successful! Columns exist:');
      if (testUsers && testUsers.length > 0) {
        console.log('Available columns:', Object.keys(testUsers[0]));
      } else {
        console.log('No users found, but query structure is valid');
      }
    }

  } catch (error) {
    console.error('Script error:', error);
  }
}

createMissingColumns();