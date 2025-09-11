import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

async function addMissingColumns() {
  try {
    console.log('Adding missing columns to users table...');

    // First, let's check which columns actually exist
    const { data: existingUsers, error: queryError } = await supabaseAdmin
      .from('users')
      .select('*')
      .limit(1);

    if (queryError) {
      console.error('Error querying users:', queryError);
      return;
    }

    const existingColumns = existingUsers && existingUsers.length > 0 
      ? Object.keys(existingUsers[0]) 
      : [];
    
    console.log('Existing columns:', existingColumns);

    // Define required columns from schema
    const requiredColumns = [
      'subrole', 'job_title', 'department', 'hire_date', 
      'permissions', 'page_access', 'email_verified', 
      'initial_temp_password', 'password_reset_expires',
      'notes', 'created_by'
    ];

    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    console.log('Missing columns:', missingColumns);

    if (missingColumns.length === 0) {
      console.log('✅ All columns exist! The issue might be elsewhere.');
      return;
    }

    // Since Supabase doesn't allow DDL through the client, we need to use the SQL API
    console.log('❌ Cannot add columns directly through Supabase client.');
    console.log('The schema push via Drizzle should handle this.');
    console.log('Missing columns that need to be added:', missingColumns);

  } catch (error) {
    console.error('Error:', error);
  }
}

addMissingColumns();