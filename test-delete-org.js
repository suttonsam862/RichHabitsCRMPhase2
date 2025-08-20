// Test DELETE organization functionality
const baseUrl = 'http://localhost:5000';

async function testDeleteOrganization() {
  try {
    console.log('Testing DELETE organization functionality...\n');
    
    // First create a test organization
    const createData = {
      name: 'Test Delete Org',
      state: 'TX',
      notes: 'Organization created for delete testing'
    };
    
    console.log('1. Creating test organization...');
    const createResponse = await fetch(`${baseUrl}/api/organizations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createData)
    });
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create organization: ${createResponse.status}`);
    }
    
    const created = await createResponse.json();
    const orgId = created.id || created.organization?.id;
    console.log(`   ✓ Created organization: ${orgId}\n`);
    
    // Verify it exists
    console.log('2. Verifying organization exists...');
    const getResponse = await fetch(`${baseUrl}/api/organizations/${orgId}`);
    if (getResponse.ok) {
      const org = await getResponse.json();
      console.log(`   ✓ Organization found: ${org.name}\n`);
    } else {
      throw new Error('Organization not found after creation');
    }
    
    // Test DELETE
    console.log('3. Testing DELETE...');
    const deleteResponse = await fetch(`${baseUrl}/api/organizations/${orgId}`, {
      method: 'DELETE'
    });
    
    if (deleteResponse.ok) {
      console.log(`   ✓ DELETE successful: ${deleteResponse.status}\n`);
    } else {
      const errorBody = await deleteResponse.text();
      throw new Error(`DELETE failed: ${deleteResponse.status} - ${errorBody}`);
    }
    
    // Verify it's gone
    console.log('4. Verifying organization is deleted...');
    const verifyResponse = await fetch(`${baseUrl}/api/organizations/${orgId}`);
    if (verifyResponse.status === 404) {
      console.log('   ✓ Organization successfully deleted (404 Not Found)\n');
      console.log('✅ DELETE functionality working correctly!');
    } else {
      throw new Error('Organization still exists after deletion');
    }
    
  } catch (error) {
    console.error('❌ DELETE test failed:', error.message);
  }
}

testDeleteOrganization();