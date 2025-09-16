
#!/usr/bin/env node

const fetch = require('node-fetch');

const BASE_URL = 'http://0.0.0.0:5000';

class OrganizationTester {
  constructor() {
    this.testResults = [];
  }

  async test(name, testFn) {
    try {
      console.log(`🧪 Testing: ${name}`);
      await testFn();
      this.testResults.push({ name, status: 'PASS' });
      console.log(`✅ ${name}: PASSED\n`);
    } catch (error) {
      this.testResults.push({ name, status: 'FAIL', error: error.message });
      console.log(`❌ ${name}: FAILED - ${error.message}\n`);
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Organization API Tests\n');

    // Test 1: Health check
    await this.test('Server Health Check', async () => {
      const response = await fetch(`${BASE_URL}/api/v1/organizations`);
      if (response.status !== 401 && response.status !== 200) {
        throw new Error(`Expected 200 or 401, got ${response.status}`);
      }
    });

    // Test 2: Sports endpoint
    await this.test('Sports List', async () => {
      const response = await fetch(`${BASE_URL}/api/v1/sports`);
      if (response.status !== 401 && response.status !== 200) {
        throw new Error(`Expected 200 or 401, got ${response.status}`);
      }
    });

    // Test 3: Create sport (without auth - should fail properly)
    await this.test('Create Sport (No Auth)', async () => {
      const response = await fetch(`${BASE_URL}/api/v1/sports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Sport' })
      });
      
      if (response.status !== 401) {
        throw new Error(`Expected 401 Unauthorized, got ${response.status}`);
      }
    });

    // Test 4: Create organization (without auth - should fail properly)
    await this.test('Create Organization (No Auth)', async () => {
      const response = await fetch(`${BASE_URL}/api/v1/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: 'Test Organization',
          isBusiness: false,
          brandPrimary: '#FF0000',
          brandSecondary: '#00FF00'
        })
      });
      
      if (response.status !== 401) {
        throw new Error(`Expected 401 Unauthorized, got ${response.status}`);
      }
    });

    // Summary
    console.log('📊 Test Results Summary:');
    console.log('========================');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${Math.round((passed / this.testResults.length) * 100)}%\n`);

    if (failed > 0) {
      console.log('Failed Tests:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
    }

    return failed === 0;
  }
}

// Run tests
async function main() {
  const tester = new OrganizationTester();
  const success = await tester.runAllTests();
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = OrganizationTester;
