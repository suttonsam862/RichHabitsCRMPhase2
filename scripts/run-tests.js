#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const runCommand = (command, args, options = {}) => {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 Running: ${command} ${args.join(' ')}`);
    
    const proc = spawn(command, args, {
      stdio: 'inherit',
      cwd: process.cwd(),
      ...options
    });

    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${command} completed successfully`);
        resolve(code);
      } else {
        console.log(`❌ ${command} failed with exit code ${code}`);
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
  });
};

async function runTests() {
  console.log('🧪 Starting comprehensive test suite for Rich Habits CRM Security Implementation\n');

  try {
    // Check if tests directory exists
    console.log('📋 Checking test structure...');
    
    // Run unit tests
    console.log('\n📝 Running Unit Tests...');
    await runCommand('npx', ['vitest', 'run', 'tests/unit', '--reporter=verbose']);

    // Run integration tests
    console.log('\n🔗 Running Integration Tests...');
    await runCommand('npx', ['vitest', 'run', 'tests/integration', '--reporter=verbose']);

    // Run security tests
    console.log('\n🔒 Running Security Tests...');
    await runCommand('npx', ['vitest', 'run', 'tests/security', '--reporter=verbose']);

    // Generate coverage report
    console.log('\n📊 Generating Coverage Report...');
    await runCommand('npx', ['vitest', 'run', '--coverage']);

    // Run security linting
    console.log('\n🔍 Running Security Linting...');
    await runCommand('npx', ['eslint', '.', '--ext', '.ts,.tsx,.js,.jsx', '--config', '.eslintrc-security.js']);

    console.log('\n✅ All tests completed successfully!');
    console.log('\n📈 Test Summary:');
    console.log('- Unit Tests: ✅ Passed');
    console.log('- Integration Tests: ✅ Passed');
    console.log('- Security Tests: ✅ Passed');
    console.log('- Coverage Report: ✅ Generated');
    console.log('- Security Linting: ✅ Passed');

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };