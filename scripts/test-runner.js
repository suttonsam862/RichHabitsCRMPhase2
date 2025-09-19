#!/usr/bin/env node

/**
 * ORD-15 Comprehensive Test Runner
 * Executes all test suites required by ORD-15 specification
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, description) {
  log(`\n🔄 ${description}...`, 'blue');
  try {
    const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    log(`✅ ${description} - PASSED`, 'green');
    return { success: true, output: result };
  } catch (error) {
    log(`❌ ${description} - FAILED`, 'red');
    log(`Error: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

function generateTestReport(results) {
  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    summary: {
      total: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    },
    results
  };

  fs.writeFileSync('test-results.json', JSON.stringify(report, null, 2));
  log(`\n📊 Test report generated: test-results.json`, 'blue');
  
  return report;
}

async function main() {
  log('🚀 ORD-15 Comprehensive Testing Suite', 'blue');
  log('=====================================\n', 'blue');

  const testSuites = [
    {
      name: 'Unit Tests',
      command: 'npx vitest run tests/unit/ --reporter=json --outputFile=unit-test-results.json',
      description: 'Unit Testing Suite - All Services and Utilities',
      category: 'unit'
    },
    {
      name: 'Integration Tests',
      command: 'npx vitest run tests/integration/ --reporter=json --outputFile=integration-test-results.json',
      description: 'Integration Testing Suite - End-to-End Workflows',
      category: 'integration'
    },
    {
      name: 'API Tests',
      command: 'npx vitest run tests/api/ --reporter=json --outputFile=api-test-results.json',
      description: 'API Testing Suite - All Endpoints',
      category: 'api'
    },
    {
      name: 'Security Tests',
      command: 'npx vitest run tests/security/ --reporter=json --outputFile=security-test-results.json',
      description: 'Security Testing Suite - OWASP Top 10 & RBAC',
      category: 'security'
    },
    {
      name: 'Performance Tests',
      command: 'npx vitest run tests/performance/ --reporter=json --outputFile=performance-test-results.json',
      description: 'Performance Testing Suite - Load & Scalability',
      category: 'performance'
    },
    {
      name: 'E2E Tests',
      command: 'npx playwright test --reporter=json --output=e2e-test-results.json',
      description: 'End-to-End Testing Suite - Complete User Workflows',
      category: 'e2e'
    }
  ];

  const results = [];
  
  for (const suite of testSuites) {
    const result = runCommand(suite.command, suite.description);
    results.push({
      ...suite,
      ...result,
      timestamp: new Date().toISOString()
    });
  }

  // Generate comprehensive report
  const report = generateTestReport(results);
  
  // Display summary
  log('\n📋 Test Execution Summary', 'blue');
  log('========================', 'blue');
  log(`Total Test Suites: ${report.summary.total}`, 'blue');
  log(`Passed: ${report.summary.passed}`, 'green');
  log(`Failed: ${report.summary.failed}`, report.summary.failed > 0 ? 'red' : 'green');
  
  // ORD-15 Compliance Check
  log('\n🎯 ORD-15 Compliance Check', 'blue');
  log('==========================', 'blue');
  
  const requiredTests = {
    'Unit Testing': results.find(r => r.category === 'unit')?.success || false,
    'Integration Testing': results.find(r => r.category === 'integration')?.success || false,
    'E2E Testing': results.find(r => r.category === 'e2e')?.success || false,
    'Performance Testing': results.find(r => r.category === 'performance')?.success || false,
    'Security Testing': results.find(r => r.category === 'security')?.success || false,
    'API Testing': results.find(r => r.category === 'api')?.success || false
  };
  
  const compliant = Object.values(requiredTests).every(Boolean);
  
  Object.entries(requiredTests).forEach(([test, passed]) => {
    log(`${passed ? '✅' : '❌'} ${test}`, passed ? 'green' : 'red');
  });
  
  log(`\n🏆 ORD-15 Compliance Status: ${compliant ? 'COMPLIANT' : 'NON-COMPLIANT'}`, 
      compliant ? 'green' : 'red');
  
  if (!compliant) {
    log('\n⚠️  Some test suites failed. Review test-results.json for details.', 'yellow');
    process.exit(1);
  }
  
  log('\n🎉 All ORD-15 testing requirements satisfied!', 'green');
  process.exit(0);
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  log(`💥 Uncaught Exception: ${error.message}`, 'red');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`💥 Unhandled Rejection at: ${promise}, reason: ${reason}`, 'red');
  process.exit(1);
});

main().catch(error => {
  log(`💥 Test runner failed: ${error.message}`, 'red');
  process.exit(1);
});