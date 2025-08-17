#!/usr/bin/env node

/**
 * Test script for the enhanced create-org API endpoint
 * Tests validation, error handling, and successful creation
 */

const baseUrl = process.env.API_BASE_URL || 'http://localhost:5000';

// Test cases covering various validation scenarios
const testCases = [
  {
    name: "✅ Valid Organization (Business)",
    payload: {
      name: "Acme Corporation",
      logo_url: "https://example.com/logo.png",
      state: "CA",
      address: "123 Business Ave, San Francisco, CA 94105",
      phone: "+1 (555) 123-4567",
      email: "contact@acmecorp.com",
      is_business: true,
      notes: "Premium client with custom requirements",
      universal_discounts: {
        "bulk_order": 15,
        "repeat_customer": 10
      }
    },
    expectedStatus: 201
  },
  {
    name: "✅ Valid Organization (Individual)",
    payload: {
      name: "John Smith",
      state: "NY",
      phone: "555-987-6543",
      email: "john.smith@email.com",
      is_business: false,
      notes: "Individual customer - prefers phone contact"
    },
    expectedStatus: 201
  },
  {
    name: "✅ Minimal Valid Organization",
    payload: {
      name: "Simple Org",
      is_business: false
    },
    expectedStatus: 201
  },
  {
    name: "❌ Missing Required Name",
    payload: {
      state: "TX",
      is_business: true
    },
    expectedStatus: 400
  },
  {
    name: "❌ Empty Name After Trim",
    payload: {
      name: "   ",
      is_business: false
    },
    expectedStatus: 400
  },
  {
    name: "❌ Invalid Email Format",
    payload: {
      name: "Test Org",
      email: "invalid-email",
      is_business: false
    },
    expectedStatus: 400
  },
  {
    name: "❌ Invalid State Code",
    payload: {
      name: "Test Org",
      state: "XX",
      is_business: false
    },
    expectedStatus: 400
  },
  {
    name: "❌ Phone Too Short",
    payload: {
      name: "Test Org",
      phone: "123",
      is_business: false
    },
    expectedStatus: 400
  },
  {
    name: "❌ Invalid Phone Characters",
    payload: {
      name: "Test Org",
      phone: "555-123-ABCD",
      is_business: false
    },
    expectedStatus: 400
  },
  {
    name: "❌ Invalid Logo URL",
    payload: {
      name: "Test Org",
      logo_url: "not-a-url",
      is_business: false
    },
    expectedStatus: 400
  },
  {
    name: "❌ Notes Too Long",
    payload: {
      name: "Test Org",
      notes: "A".repeat(2001), // Exceeds 2000 character limit
      is_business: false
    },
    expectedStatus: 400
  },
  {
    name: "❌ Invalid Content Type",
    payload: {
      name: "Test Org",
      is_business: false
    },
    contentType: 'text/plain',
    expectedStatus: 400
  }
];

// Helper function to make API requests
async function apiRequest(endpoint, options = {}) {
  const url = `${baseUrl}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': options.contentType || 'application/json',
        ...options.headers
      },
      body: options.contentType === 'text/plain' 
        ? JSON.stringify(options.body)  // Send as plain text to test content-type validation
        : JSON.stringify(options.body)
    });
    
    const responseData = await response.text();
    let parsedData;
    
    try {
      parsedData = JSON.parse(responseData);
    } catch (e) {
      parsedData = { rawResponse: responseData };
    }
    
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      data: parsedData
    };
  } catch (error) {
    return {
      status: 0,
      error: error.message,
      data: null
    };
  }
}

// Main test function
async function runTests() {
  console.log(`🚀 Testing Create Organization API at ${baseUrl}/api/organizations\n`);
  
  let passedTests = 0;
  let failedTests = 0;
  const results = [];
  
  for (const testCase of testCases) {
    console.log(`Running: ${testCase.name}`);
    
    const result = await apiRequest('/api/organizations', {
      body: testCase.payload,
      contentType: testCase.contentType,
    });
    
    const passed = result.status === testCase.expectedStatus;
    
    if (passed) {
      console.log(`✅ PASS - Status: ${result.status}`);
      passedTests++;
    } else {
      console.log(`❌ FAIL - Expected: ${testCase.expectedStatus}, Got: ${result.status}`);
      console.log(`   Response:`, JSON.stringify(result.data, null, 2));
      failedTests++;
    }
    
    results.push({
      test: testCase.name,
      passed,
      expectedStatus: testCase.expectedStatus,
      actualStatus: result.status,
      response: result.data
    });
    
    console.log(''); // Empty line for readability
  }
  
  // Summary
  console.log(`\n📊 Test Summary:`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Success Rate: ${Math.round((passedTests / testCases.length) * 100)}%\n`);
  
  // Show successful creations
  const successfulCreations = results.filter(r => r.passed && r.actualStatus === 201);
  if (successfulCreations.length > 0) {
    console.log(`🎉 Successfully Created Organizations:`);
    successfulCreations.forEach(result => {
      if (result.response?.organization) {
        const org = result.response.organization;
        console.log(`   📋 ${org.name} (ID: ${org.id})`);
        console.log(`      State: ${org.state || 'N/A'}, Business: ${org.is_business ? 'Yes' : 'No'}`);
        console.log(`      Created: ${org.created_at}`);
      }
    });
    console.log('');
  }
  
  // Show validation errors for failed tests
  const validationFailures = results.filter(r => !r.passed && r.actualStatus === 400);
  if (validationFailures.length > 0) {
    console.log(`🔍 Validation Error Examples:`);
    validationFailures.slice(0, 3).forEach(result => {
      console.log(`   ${result.test}:`);
      if (result.response?.fieldErrors) {
        Object.entries(result.response.fieldErrors).forEach(([field, error]) => {
          console.log(`      ${field}: ${error}`);
        });
      } else if (result.response?.message) {
        console.log(`      ${result.response.message}`);
      }
    });
  }
  
  return { passedTests, failedTests, results };
}

// Script execution
if (require.main === module) {
  runTests()
    .then(({ passedTests, failedTests }) => {
      process.exit(failedTests > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Test script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { runTests, testCases };