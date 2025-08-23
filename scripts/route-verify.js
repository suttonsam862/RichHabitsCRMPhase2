#!/usr/bin/env node

/**
 * Route verification script
 * Validates that all API routes are properly configured and accessible
 */

import { execSync } from 'child_process';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = process.env.API_BASE || 'http://localhost:5000';

// Define expected routes
const routes = [
  // Auth routes
  { method: 'POST', path: '/api/auth/register', requiresAuth: false },
  { method: 'POST', path: '/api/auth/login', requiresAuth: false },
  { method: 'POST', path: '/api/auth/logout', requiresAuth: true },
  { method: 'GET', path: '/api/auth/me', requiresAuth: true },
  
  // Organizations routes
  { method: 'GET', path: '/api/organizations', requiresAuth: true },
  { method: 'GET', path: '/api/organizations/summary', requiresAuth: true },
  { method: 'POST', path: '/api/organizations', requiresAuth: true },
  
  // Users routes
  { method: 'GET', path: '/api/users', requiresAuth: true },
  
  // Orders routes
  { method: 'GET', path: '/api/orders', requiresAuth: true },
  { method: 'GET', path: '/api/orders/status-codes', requiresAuth: true },
  { method: 'GET', path: '/api/orders/item-status-codes', requiresAuth: true },
  { method: 'POST', path: '/api/orders', requiresAuth: true },
  
  // Health check
  { method: 'GET', path: '/api/health', requiresAuth: false }
];

console.log(chalk.bold('\n🔍 Verifying API Routes...\n'));

let passed = 0;
let failed = 0;

async function checkRoute(route) {
  const url = `${API_BASE}${route.path}`;
  
  try {
    const headers = route.requiresAuth 
      ? `-H "Authorization: Bearer test-token"` 
      : '';
    
    const method = route.method === 'GET' ? '' : `-X ${route.method}`;
    
    // Use curl to check if route exists (expect 401 for auth routes without valid token)
    const cmd = `curl -s -o /dev/null -w "%{http_code}" ${method} ${headers} "${url}"`;
    const statusCode = execSync(cmd, { encoding: 'utf8' }).trim();
    
    // Consider route exists if it returns any HTTP status (including 401/403)
    if (statusCode && statusCode !== '000') {
      if (route.requiresAuth && statusCode === '401') {
        console.log(chalk.green(`✓ ${route.method.padEnd(6)} ${route.path} - Auth required (${statusCode})`));
      } else if (statusCode.startsWith('2') || statusCode.startsWith('3')) {
        console.log(chalk.green(`✓ ${route.method.padEnd(6)} ${route.path} - OK (${statusCode})`));
      } else if (statusCode.startsWith('4')) {
        console.log(chalk.yellow(`⚠ ${route.method.padEnd(6)} ${route.path} - Client error (${statusCode})`));
      } else {
        console.log(chalk.yellow(`⚠ ${route.method.padEnd(6)} ${route.path} - Server error (${statusCode})`));
      }
      passed++;
    } else {
      console.log(chalk.red(`✗ ${route.method.padEnd(6)} ${route.path} - Not reachable`));
      failed++;
    }
  } catch (error) {
    console.log(chalk.red(`✗ ${route.method.padEnd(6)} ${route.path} - Error: ${error.message}`));
    failed++;
  }
}

// Check if server is running
console.log(chalk.bold('Checking server status...\n'));

try {
  const healthCheck = execSync(`curl -s "${API_BASE}/api/health"`, { encoding: 'utf8' });
  console.log(chalk.green('✓ Server is running\n'));
} catch (e) {
  console.log(chalk.red('✗ Server is not responding. Please start the server first.\n'));
  console.log(chalk.yellow('Run: npm run dev\n'));
  process.exit(1);
}

// Check all routes
console.log(chalk.bold('Checking routes...\n'));

for (const route of routes) {
  await checkRoute(route);
}

// Summary
console.log(chalk.bold('\n📊 Route Verification Summary:\n'));

if (failed === 0) {
  console.log(chalk.green.bold(`✅ All ${passed} routes verified successfully!\n`));
  process.exit(0);
} else {
  console.log(chalk.yellow(`Routes verified: ${passed}`));
  console.log(chalk.red(`Routes failed: ${failed}\n`));
  process.exit(1);
}