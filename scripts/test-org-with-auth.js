
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testWithAuth() {
  try {
    // You'll need to either:
    // 1. Sign in with existing credentials, or
    // 2. Create a test user first
    
    console.log('Testing organizations endpoint with proper authentication...');
    
    // Option 1: Sign in with existing user (replace with real credentials)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com', // Replace with actual test user email
      password: 'password123'    // Replace with actual password
    });

    if (authError) {
      console.log('Auth failed:', authError.message);
      console.log('Creating test user...');
      
      // Option 2: Create test user if sign-in fails
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: 'test@example.com',
        password: 'password123'
      });
      
      if (signUpError) {
        console.error('Failed to create test user:', signUpError.message);
        return;
      }
      
      console.log('Test user created, please check email for confirmation');
      return;
    }

    const token = authData.session?.access_token;
    if (!token) {
      console.error('No access token received');
      return;
    }

    // Test the organizations endpoint with valid token
    const response = await fetch('http://localhost:5000/api/v1/organizations', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));

    // Sign out
    await supabase.auth.signOut();
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testWithAuth();
