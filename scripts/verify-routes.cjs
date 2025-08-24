#!/usr/bin/env node

/**
 * Enhanced route verification script
 * Checks for duplicate routes, validates structure, and verifies route mounting
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

let errorCount = 0;

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',    // cyan
    success: '\x1b[32m', // green
    error: '\x1b[31m',   // red
    warning: '\x1b[33m', // yellow
    reset: '\x1b[0m'     // reset
  };
  
  console.log(`${colors[type]}${message}${colors.reset}`);
}

function checkDuplicateRoutes() {
  log('🔍 Checking for duplicate route files...', 'info');
  
  const root = path.join(process.cwd(), 'server', 'routes');
  
  if (!fs.existsSync(root)) {
    log('❌ Routes directory not found: server/routes', 'error');
    errorCount++;
    return;
  }
  
  function walk(dir) {
    return fs.readdirSync(dir).flatMap(f => {
      const p = path.join(dir, f);
      return fs.statSync(p).isDirectory() ? walk(p) : [p];
    });
  }
  
  const files = walk(root).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
  const names = new Map();
  let duplicates = false;
  
  for (const f of files) {
    const key = path.relative(root, f).replace(/\\/g, '/');
    if (names.has(key)) {
      log(`❌ Duplicate route file: ${key}`, 'error');
      duplicates = true;
      errorCount++;
    } else {
      names.set(key, true);
    }
  }
  
  if (!duplicates) {
    log('✅ No duplicate route files found', 'success');
  }
}

function checkRouteStructure() {
  log('🏗️  Checking route structure...', 'info');
  
  const routesIndex = path.join(process.cwd(), 'server', 'routes', 'index.ts');
  
  if (!fs.existsSync(routesIndex)) {
    log('❌ Main routes index file not found: server/routes/index.ts', 'error');
    errorCount++;
    return;
  }
  
  try {
    const content = fs.readFileSync(routesIndex, 'utf8');
    
    // Check for required route mounts
    const requiredRoutes = [
      '/auth',
      '/organizations', 
      '/users',
      '/files'
    ];
    
    let missingRoutes = [];
    
    for (const route of requiredRoutes) {
      if (!content.includes(`'${route}'`) && !content.includes(`"${route}"`)) {
        missingRoutes.push(route);
      }
    }
    
    if (missingRoutes.length === 0) {
      log('✅ All required routes are mounted', 'success');
    } else {
      log(`❌ Missing route mounts: ${missingRoutes.join(', ')}`, 'error');
      errorCount++;
    }
    
    // Check for API versioning
    if (content.includes('/v1')) {
      log('✅ API versioning detected', 'success');
    } else {
      log('⚠️  No API versioning detected', 'warning');
    }
    
  } catch (error) {
    log(`❌ Failed to read routes index: ${error.message}`, 'error');
    errorCount++;
  }
}

function checkClientRoutes() {
  log('🌐 Checking client routes...', 'info');
  
  const clientRoutes = path.join(process.cwd(), 'client', 'src', 'routes.tsx');
  
  if (!fs.existsSync(clientRoutes)) {
    log('❌ Client routes file not found: client/src/routes.tsx', 'error');
    errorCount++;
    return;
  }
  
  try {
    const content = fs.readFileSync(clientRoutes, 'utf8');
    
    // Check for required client routes
    const requiredClientRoutes = [
      '/login',
      '/signup', 
      '/organizations',
      '/users'
    ];
    
    let missingClientRoutes = [];
    
    for (const route of requiredClientRoutes) {
      if (!content.includes(`path="${route}"`)) {
        missingClientRoutes.push(route);
      }
    }
    
    if (missingClientRoutes.length === 0) {
      log('✅ All required client routes found', 'success');
    } else {
      log(`❌ Missing client routes: ${missingClientRoutes.join(', ')}`, 'error');
      errorCount++;
    }
    
    // Check for protected routes
    if (content.includes('ProtectedRoute')) {
      log('✅ Protected routes detected', 'success');
    } else {
      log('⚠️  No protected routes detected', 'warning');
    }
    
  } catch (error) {
    log(`❌ Failed to read client routes: ${error.message}`, 'error');
    errorCount++;
  }
}

function checkAuthRoutes() {
  log('🔐 Checking auth routes...', 'info');
  
  const authRoutes = path.join(process.cwd(), 'server', 'routes', 'auth', 'index.ts');
  
  if (!fs.existsSync(authRoutes)) {
    log('❌ Auth routes file not found: server/routes/auth/index.ts', 'error');
    errorCount++;
    return;
  }
  
  try {
    const content = fs.readFileSync(authRoutes, 'utf8');
    
    // Check for required auth endpoints
    const requiredAuthEndpoints = [
      '/reset-request',
      '/register',
      '/complete-profile'
    ];
    
    let missingEndpoints = [];
    
    for (const endpoint of requiredAuthEndpoints) {
      if (!content.includes(`'${endpoint}'`) && !content.includes(`"${endpoint}"`)) {
        missingEndpoints.push(endpoint);
      }
    }
    
    if (missingEndpoints.length === 0) {
      log('✅ All required auth endpoints found', 'success');
    } else {
      log(`❌ Missing auth endpoints: ${missingEndpoints.join(', ')}`, 'error');
      errorCount++;
    }
    
  } catch (error) {
    log(`❌ Failed to read auth routes: ${error.message}`, 'error');
    errorCount++;
  }
}

function main() {
  log('🚀 Starting Enhanced Route Verification...', 'info');
  
  checkDuplicateRoutes();
  checkRouteStructure();
  checkClientRoutes();
  checkAuthRoutes();
  
  log('\n📊 Verification Results:', 'info');
  
  if (errorCount === 0) {
    log('✅ All route verifications passed!', 'success');
    process.exit(0);
  } else {
    log(`❌ Found ${errorCount} error(s). Please fix the issues above.`, 'error');
    process.exit(1);
  }
}

main();