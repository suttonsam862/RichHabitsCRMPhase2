
import { supabaseAdmin } from "./lib/supabase";

async function testDbConnection() {
  console.log("Testing Supabase connection and queries...");
  
  try {
    // Test basic connection
    console.log("1. Testing basic Supabase query...");
    const { data: testData, error: testError } = await supabaseAdmin
      .from('organizations')
      .select('count', { count: 'exact', head: true });
      
    if (testError) throw testError;
    console.log("✅ Basic query successful, org count:", testData);
    
    // Test organizations table structure
    console.log("\n2. Testing organizations table data...");
    const { data: orgs, error: orgsError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, state')
      .limit(2);
      
    if (orgsError) throw orgsError;
    console.log("✅ Organization data:", orgs);
    
    // Test count query
    console.log("\n3. Testing count query...");
    const { count, error: countError } = await supabaseAdmin
      .from('organizations')
      .select('*', { count: 'exact', head: true });
      
    if (countError) throw countError;
    console.log("✅ Count result:", count);
    
    // Test simple select from organizations table
    console.log("\n4. Testing simple select...");
    const { data: selectResult, error: selectError } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .limit(2);
      
    if (selectError) throw selectError;
    console.log("✅ Simple select result:", selectResult);
    
    // Test Supabase select with specific columns
    console.log("\n5. Testing Supabase select with specific columns...");
    const { data: specificResult, error: specificError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, state')
      .limit(2);
      
    if (specificError) throw specificError;
    console.log("✅ Supabase specific select result:", specificResult);
    
    // Test Supabase select all
    console.log("\n6. Testing Supabase select all...");
    const { data: allResult, error: allError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .limit(2);
      
    if (allError) throw allError;
    console.log("✅ Supabase select all result:", allResult);
    
  } catch (error: any) {
    console.error("❌ Supabase test failed:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack
    });
  }
}

testDbConnection();
