
#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

async function testCreationEndpoints() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('🧪 Testing all creation endpoints...\n');

  // Test 1: Organization Creation
  console.log('1. Testing Organization Creation...');
  try {
    const orgData = {
      name: `Test Organization ${Date.now()}`,
      is_business: false,
      brand_primary: '#3B82F6',
      brand_secondary: '#8B5CF6',
      tags: ['Test'],
      status: 'active',
      is_archived: false
    };

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert(orgData)
      .select()
      .single();

    if (orgError) {
      console.error('❌ Organization creation failed:', orgError.message);
    } else {
      console.log('✅ Organization created successfully:', org.id);
      
      // Clean up
      await supabase.from('organizations').delete().eq('id', org.id);
    }
  } catch (error) {
    console.error('❌ Organization test error:', error.message);
  }

  // Test 2: User Creation (if users table exists)
  console.log('\n2. Testing User Creation...');
  try {
    const userData = {
      email: `test${Date.now()}@example.com`,
      full_name: 'Test User',
      role: 'staff',
      is_active: true
    };

    const { data: user, error: userError } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (userError) {
      console.error('❌ User creation failed:', userError.message);
    } else {
      console.log('✅ User created successfully:', user.id);
      
      // Clean up
      await supabase.from('users').delete().eq('id', user.id);
    }
  } catch (error) {
    console.error('❌ User test error:', error.message);
  }

  // Test 3: Salesperson Creation (if salespeople table exists)
  console.log('\n3. Testing Salesperson Creation...');
  try {
    const salespersonData = {
      name: 'Test Salesperson',
      email: `salesperson${Date.now()}@example.com`,
      hire_date: new Date().toISOString().split('T')[0],
      is_active: true
    };

    const { data: salesperson, error: salespersonError } = await supabase
      .from('salespeople')
      .insert(salespersonData)
      .select()
      .single();

    if (salespersonError) {
      console.error('❌ Salesperson creation failed:', salespersonError.message);
    } else {
      console.log('✅ Salesperson created successfully:', salesperson.id);
      
      // Clean up
      await supabase.from('salespeople').delete().eq('id', salesperson.id);
    }
  } catch (error) {
    console.error('❌ Salesperson test error:', error.message);
  }

  console.log('\n🏁 Testing complete!');
}

testCreationEndpoints().catch(console.error);
