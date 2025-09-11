import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

async function addMissingColumns() {
  try {
    console.log('Adding missing columns to users table in Supabase...');

    // Define the SQL to add missing columns
    const addColumnsSql = `
-- Add missing columns to users table
do $$
begin
  -- Add subrole column (text, nullable)
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'users' and column_name = 'subrole'
  ) then
    alter table public.users add column subrole text;
    raise notice 'Added subrole column';
  else
    raise notice 'subrole column already exists';
  end if;

  -- Add job_title column (text, nullable)
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'users' and column_name = 'job_title'
  ) then
    alter table public.users add column job_title text;
    raise notice 'Added job_title column';
  else
    raise notice 'job_title column already exists';
  end if;

  -- Add department column (text, nullable)
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'users' and column_name = 'department'
  ) then
    alter table public.users add column department text;
    raise notice 'Added department column';
  else
    raise notice 'department column already exists';
  end if;

  -- Add hire_date column (timestamp, nullable)
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'users' and column_name = 'hire_date'
  ) then
    alter table public.users add column hire_date timestamp;
    raise notice 'Added hire_date column';
  else
    raise notice 'hire_date column already exists';
  end if;

  -- Add permissions column (jsonb, default empty object)
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'users' and column_name = 'permissions'
  ) then
    alter table public.users add column permissions jsonb default '{}'::jsonb;
    raise notice 'Added permissions column';
  else
    raise notice 'permissions column already exists';
  end if;

  -- Add page_access column (jsonb, default empty object)
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'users' and column_name = 'page_access'
  ) then
    alter table public.users add column page_access jsonb default '{}'::jsonb;
    raise notice 'Added page_access column';
  else
    raise notice 'page_access column already exists';
  end if;

  -- Add initial_temp_password column (text, nullable)
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'users' and column_name = 'initial_temp_password'
  ) then
    alter table public.users add column initial_temp_password text;
    raise notice 'Added initial_temp_password column';
  else
    raise notice 'initial_temp_password column already exists';
  end if;

end$$;
    `;

    // Execute the SQL using Supabase's RPC function
    const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql: addColumnsSql });
    
    if (error) {
      console.error('Error executing SQL:', error);
      
      // Try alternative approach using individual ALTER statements
      console.log('\nTrying alternative approach with individual column additions...');
      
      const columns = [
        { name: 'subrole', type: 'text' },
        { name: 'job_title', type: 'text' },  
        { name: 'department', type: 'text' },
        { name: 'hire_date', type: 'timestamp' },
        { name: 'permissions', type: 'jsonb', default: "'{}'::jsonb" },
        { name: 'page_access', type: 'jsonb', default: "'{}'::jsonb" },
        { name: 'initial_temp_password', type: 'text' }
      ];

      for (const col of columns) {
        try {
          const alterSql = col.default 
            ? `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ${col.name} ${col.type} DEFAULT ${col.default};`
            : `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};`;
          
          console.log(`Adding column ${col.name}...`);
          const { error: colError } = await supabaseAdmin.rpc('exec_sql', { sql: alterSql });
          
          if (colError) {
            console.error(`Error adding ${col.name}:`, colError);
          } else {
            console.log(`✅ Successfully added ${col.name}`);
          }
        } catch (err) {
          console.error(`Failed to add ${col.name}:`, err);
        }
      }
    } else {
      console.log('✅ Successfully added all missing columns');
    }

  } catch (error) {
    console.error('Script error:', error);
  }
}

addMissingColumns();