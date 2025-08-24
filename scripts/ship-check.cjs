#!/usr/bin/env node

/**
 * Pre-deployment ship check script
 * Runs comprehensive checks before deployment
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

let checksPassed = 0;
let checksFailed = 0;

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

function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'pipe',
      shell: true,
      ...options
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr || stdout}`));
      }
    });
    
    child.on('error', reject);
  });
}

async function checkLinting() {
  log('\n🔍 Running ESLint...', 'info');
  
  try {
    await runCommand('npx', ['eslint', '.', '--quiet']);
    log('✅ ESLint passed', 'success');
    checksPassed++;
  } catch (error) {
    log('❌ ESLint failed', 'error');
    log(error.message, 'error');
    checksFailed++;
  }
}

async function checkTypeScript() {
  log('\n🔧 Checking TypeScript...', 'info');
  
  try {
    await runCommand('npx', ['tsc', '--noEmit']);
    log('✅ TypeScript check passed', 'success');
    checksPassed++;
  } catch (error) {
    log('❌ TypeScript check failed', 'error');
    log(error.message, 'error');
    checksFailed++;
  }
}

async function checkBuild() {
  log('\n🏗️  Testing build...', 'info');
  
  try {
    await runCommand('npm', ['run', 'build']);
    log('✅ Build successful', 'success');
    checksPassed++;
  } catch (error) {
    log('❌ Build failed', 'error');
    log(error.message, 'error');
    checksFailed++;
  }
}

async function checkPreflight() {
  log('\n✈️  Running preflight checks...', 'info');
  
  try {
    await runCommand('npm', ['run', 'preflight']);
    log('✅ Preflight passed', 'success');
    checksPassed++;
  } catch (error) {
    log('❌ Preflight failed', 'error');
    log(error.message, 'error');
    checksFailed++;
  }
}

function checkEnvironmentReadiness() {
  log('\n⚙️  Checking deployment environment...', 'info');
  
  const requiredEnvVars = [
    'DATABASE_URL',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];
  
  let envChecksPassed = 0;
  
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      log(`✅ ${envVar} configured`, 'success');
      envChecksPassed++;
    } else {
      log(`❌ ${envVar} missing`, 'error');
      checksFailed++;
    }
  }
  
  if (envChecksPassed === requiredEnvVars.length) {
    log('✅ All required environment variables configured', 'success');
    checksPassed++;
  }
  
  // Check optional but recommended env vars
  const optionalEnvVars = ['SENDGRID_API_KEY'];
  
  for (const envVar of optionalEnvVars) {
    if (process.env[envVar]) {
      log(`✅ ${envVar} configured (optional)`, 'success');
    } else {
      log(`⚠️  ${envVar} not configured (email features disabled)`, 'warning');
    }
  }
}

function checkPackageIntegrity() {
  log('\n📦 Checking package integrity...', 'info');
  
  const packageJson = path.join(__dirname, '../package.json');
  const packageLock = path.join(__dirname, '../package-lock.json');
  
  if (!fs.existsSync(packageJson)) {
    log('❌ package.json not found', 'error');
    checksFailed++;
    return;
  }
  
  if (!fs.existsSync(packageLock)) {
    log('⚠️  package-lock.json not found (recommend running npm install)', 'warning');
  }
  
  try {
    const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
    
    // Check required scripts
    const requiredScripts = ['dev', 'build', 'start', 'preflight'];
    const missingScripts = requiredScripts.filter(script => !pkg.scripts?.[script]);
    
    if (missingScripts.length === 0) {
      log('✅ All required scripts present', 'success');
      checksPassed++;
    } else {
      log(`❌ Missing scripts: ${missingScripts.join(', ')}`, 'error');
      checksFailed++;
    }
    
    // Check critical dependencies
    const criticalDeps = ['express', 'react', 'drizzle-orm'];
    const missingDeps = criticalDeps.filter(dep => !pkg.dependencies?.[dep]);
    
    if (missingDeps.length === 0) {
      log('✅ All critical dependencies present', 'success');
      checksPassed++;
    } else {
      log(`❌ Missing critical dependencies: ${missingDeps.join(', ')}`, 'error');
      checksFailed++;
    }
    
  } catch (error) {
    log(`❌ Failed to parse package.json: ${error.message}`, 'error');
    checksFailed++;
  }
}

function checkSecurityBasics() {
  log('\n🔒 Checking security basics...', 'info');
  
  // Check for obvious security issues
  const issues = [];
  
  // Check if .env files are gitignored
  const gitignore = path.join(__dirname, '../.gitignore');
  if (fs.existsSync(gitignore)) {
    const gitignoreContent = fs.readFileSync(gitignore, 'utf8');
    if (!gitignoreContent.includes('.env')) {
      issues.push('.env files should be in .gitignore');
    }
  } else {
    issues.push('.gitignore file missing');
  }
  
  // Check for sensitive files in repo
  const sensitiveFiles = ['.env', '.env.local', '.env.production'];
  const foundSensitiveFiles = sensitiveFiles.filter(file => 
    fs.existsSync(path.join(__dirname, '..', file))
  );
  
  if (foundSensitiveFiles.length > 0) {
    issues.push(`Sensitive files found in repo: ${foundSensitiveFiles.join(', ')}`);
  }
  
  if (issues.length === 0) {
    log('✅ Basic security checks passed', 'success');
    checksPassed++;
  } else {
    log('❌ Security issues found:', 'error');
    issues.forEach(issue => log(`  - ${issue}`, 'error'));
    checksFailed++;
  }
}

async function main() {
  log('🚢 Starting Pre-Deployment Ship Check...', 'info');
  log('This will run comprehensive checks before deployment.\n', 'info');
  
  try {
    // Run all checks
    checkPackageIntegrity();
    checkEnvironmentReadiness();
    checkSecurityBasics();
    
    await checkPreflight();
    await checkTypeScript();
    await checkLinting();
    await checkBuild();
    
    // Summary
    log('\n📊 Ship Check Results:', 'info');
    log(`✅ Checks Passed: ${checksPassed}`, 'success');
    log(`❌ Checks Failed: ${checksFailed}`, checksFailed > 0 ? 'error' : 'success');
    
    if (checksFailed > 0) {
      log('\n❌ Ship check failed! Please fix the issues above before deploying.', 'error');
      process.exit(1);
    } else {
      log('\n🎉 All ship checks passed! Ready for deployment! 🚀', 'success');
      process.exit(0);
    }
    
  } catch (error) {
    log(`\n💥 Ship check encountered an error: ${error.message}`, 'error');
    process.exit(1);
  }
}

main().catch(console.error);