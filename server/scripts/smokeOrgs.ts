import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const TEST_USER_ID = process.env.DEFAULT_USER_ID || uuidv4();

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

async function runTest(
  name: string, 
  testFn: () => Promise<void>
): Promise<void> {
  try {
    await testFn();
    results.push({ name, passed: true, message: 'Passed' });
    console.log(`✅ ${name}`);
  } catch (error: any) {
    results.push({ 
      name, 
      passed: false, 
      message: error.message,
      details: error.response || error
    });
    console.log(`❌ ${name}: ${error.message}`);
  }
}

async function apiRequest(
  path: string, 
  options: any = {}
): Promise<any> {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
    (error as any).response = data;
    throw error;
  }
  
  return data;
}

async function main() {
  console.log('🔍 Starting Organization API Smoke Tests\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test User ID: ${TEST_USER_ID}\n`);
  
  let createdOrgId: string | null = null;
  
  // Test 1: Create organization with minimal fields (name only)
  await runTest('Create org with minimal fields', async () => {
    const response = await apiRequest('/api/organizations', {
      method: 'POST',
      body: {
        name: `Test Org Minimal ${Date.now()}`
      }
    });
    
    if (!response.id || !response.organization) {
      throw new Error('Missing id or organization in response');
    }
    createdOrgId = response.id;
  });
  
  // Test 2: Create organization with empty optional fields
  await runTest('Create org with empty optional fields', async () => {
    const response = await apiRequest('/api/organizations', {
      method: 'POST',
      body: {
        name: `Test Org Empty Fields ${Date.now()}`,
        address: '',
        phone: '',
        email: '',
        notes: '',
        state: ''
      }
    });
    
    if (!response.id) {
      throw new Error('Failed to create org with empty fields');
    }
  });
  
  // Test 3: Create organization with camelCase fields
  await runTest('Create org with camelCase fields', async () => {
    const response = await apiRequest('/api/organizations', {
      method: 'POST',
      body: {
        name: `Test Org CamelCase ${Date.now()}`,
        logoUrl: 'https://example.com/logo.png',
        isBusiness: true,
        universalDiscounts: { percentage: 10 }
      }
    });
    
    if (!response.id) {
      throw new Error('Failed to create org with camelCase fields');
    }
    
    // Verify fields were mapped correctly
    if (response.organization) {
      if (!response.organization.is_business) {
        throw new Error('isBusiness was not mapped to is_business');
      }
      if (!response.organization.logo_url) {
        throw new Error('logoUrl was not mapped to logo_url');
      }
    }
  });
  
  // Test 4: Create organization with user ID header
  await runTest('Create org with x-user-id header', async () => {
    const response = await apiRequest('/api/organizations', {
      method: 'POST',
      headers: {
        'x-user-id': TEST_USER_ID
      },
      body: {
        name: `Test Org With User ${Date.now()}`
      }
    });
    
    if (!response.id) {
      throw new Error('Failed to create org with user ID');
    }
    console.log('  → Organization created with potential owner assignment');
  });
  
  // Test 5: Create organization WITHOUT user ID header
  await runTest('Create org WITHOUT x-user-id header', async () => {
    const response = await apiRequest('/api/organizations', {
      method: 'POST',
      body: {
        name: `Test Org No User ${Date.now()}`
      }
    });
    
    if (!response.id) {
      throw new Error('Failed to create org without user ID');
    }
    console.log('  → Organization created successfully without user role');
  });
  
  // Test 6: List organizations with filters
  await runTest('List organizations with filters', async () => {
    const response = await apiRequest(
      '/api/organizations?type=all&sort=created_at&order=desc&page=1&pageSize=20'
    );
    
    if (!response.items || !Array.isArray(response.items)) {
      throw new Error('Invalid response format');
    }
    
    if (typeof response.total !== 'number' || typeof response.page !== 'number') {
      throw new Error('Missing pagination metadata');
    }
    
    console.log(`  → Found ${response.items.length} organizations (total: ${response.total})`);
  });
  
  // Test 7: Test duplicate name rejection
  await runTest('Reject duplicate organization name', async () => {
    const name = `Unique Org ${Date.now()}`;
    
    // Create first org
    await apiRequest('/api/organizations', {
      method: 'POST',
      body: { name }
    });
    
    // Try to create duplicate
    try {
      await apiRequest('/api/organizations', {
        method: 'POST',
        body: { name }
      });
      throw new Error('Should have rejected duplicate name');
    } catch (error: any) {
      if (!error.response?.error?.includes('already exists')) {
        throw new Error('Unexpected error for duplicate: ' + error.message);
      }
      console.log('  → Correctly rejected duplicate name');
    }
  });
  
  // Test 8: Fetch single organization
  if (createdOrgId) {
    await runTest('Fetch single organization', async () => {
      const response = await apiRequest(`/api/organizations/${createdOrgId}`);
      
      if (!response.id || response.id !== createdOrgId) {
        throw new Error('Invalid organization data returned');
      }
      console.log(`  → Successfully fetched org: ${response.name}`);
    });
  }
  
  // Test 9: State normalization
  await runTest('State field normalization', async () => {
    const response = await apiRequest('/api/organizations', {
      method: 'POST',
      body: {
        name: `Test State Normalization ${Date.now()}`,
        state: 'ca'  // lowercase, should be normalized to 'CA'
      }
    });
    
    if (!response.organization || response.organization.state !== 'CA') {
      throw new Error('State was not normalized to uppercase');
    }
    console.log('  → State correctly normalized to uppercase');
  });
  
  // Test 10: Mixed naming convention support
  await runTest('Mixed camelCase and snake_case fields', async () => {
    const response = await apiRequest('/api/organizations', {
      method: 'POST',
      body: {
        name: `Test Mixed Naming ${Date.now()}`,
        logoUrl: 'https://example.com/logo1.png',
        is_business: false,
        universalDiscounts: { discount: 5 },
        phone: '555-1234'
      }
    });
    
    if (!response.id) {
      throw new Error('Failed to create org with mixed naming');
    }
    console.log('  → Successfully handled mixed naming conventions');
  });
  
  // Summary
  console.log('\n' + '='.repeat(50));
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);
  
  if (failed > 0) {
    console.log('Failed tests:');
    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`  - ${r.name}: ${r.message}`);
        if (r.details) {
          console.log(`    Details:`, r.details);
        }
      });
    process.exit(1);
  } else {
    console.log('✨ All tests passed!');
    process.exit(0);
  }
}

// Run tests
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});