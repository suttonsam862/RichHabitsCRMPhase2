import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

console.log('Testing Supabase connection...');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('URL:', url);
console.log('Key exists:', !!key);

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

async function testConnection() {
  try {
    console.log('\n1. Testing basic connection...');
    const { data: orgs, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .limit(1);
    
    if (orgError) {
      console.error('Organizations table error:', orgError);
    } else {
      console.log('✅ Organizations table accessible');
    }

    console.log('\n2. Testing users table structure...');
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, role, subrole, job_title, department, permissions, page_access')
      .limit(1);
    
    if (usersError) {
      console.error('❌ Users table error:', usersError);
      return;
    } else {
      console.log('✅ Users table accessible with extended columns');
      console.log('Sample user columns:', Object.keys(users[0] || {}));
    }

    console.log('\n3. Testing enhanced user query (similar to API)...');
    const { data: enhancedUsers, error: enhancedError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        full_name,
        phone,
        role,
        subrole,
        organization_id,
        job_title,
        department,
        hire_date,
        avatar_url,
        is_active,
        permissions,
        page_access,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        country,
        initial_temp_password,
        last_login,
        email_verified,
        notes,
        created_at,
        updated_at
      `)
      .limit(3);

    if (enhancedError) {
      console.error('❌ Enhanced query error:', enhancedError);
    } else {
      console.log('✅ Enhanced query successful');
      console.log('Number of users found:', enhancedUsers.length);
      if (enhancedUsers.length > 0) {
        console.log('Sample user structure:', Object.keys(enhancedUsers[0]));
      }
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testConnection().then(() => {
  console.log('\nTest completed!');
  process.exit(0);
}).catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});