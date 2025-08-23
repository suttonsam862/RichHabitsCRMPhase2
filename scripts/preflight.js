#!/usr/bin/env node

/**
 * Preflight check script
 * Validates environment, dependencies, and database connection before starting the app
 */

import { config } from 'dotenv';
import { existsSync } from 'fs';
import { execSync } from 'child_process';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config();

let errors = 0;
let warnings = 0;

function log(message, type = 'info') {
  const prefix = {
    info: chalk.blue('ℹ'),
    success: chalk.green('✓'),
    warning: chalk.yellow('⚠'),
    error: chalk.red('✗')
  };
  console.log(`${prefix[type]} ${message}`);
  if (type === 'error') errors++;
  if (type === 'warning') warnings++;
}

console.log(chalk.bold('\n🚀 Running preflight checks...\n'));

// 1. Check Node version
try {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion < 18) {
    log(`Node.js version ${nodeVersion} is below minimum required v18`, 'error');
  } else {
    log(`Node.js ${nodeVersion}`, 'success');
  }
} catch (e) {
  log('Failed to check Node.js version', 'error');
}

// 2. Check required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET'
];

const optionalEnvVars = [
  'PORT',
  'ORIGINS',
  'NODE_ENV'
];

console.log(chalk.bold('\n📋 Environment Variables:\n'));

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    log(`Missing required: ${varName}`, 'error');
  } else {
    log(`${varName} is set`, 'success');
  }
});

optionalEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    log(`Optional not set: ${varName} (using defaults)`, 'warning');
  } else {
    log(`${varName} is set`, 'success');
  }
});

// 3. Check database connection
console.log(chalk.bold('\n🗄️  Database Connection:\n'));

try {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    // Parse database URL to check format
    const url = new URL(dbUrl);
    if (url.protocol === 'postgresql:' || url.protocol === 'postgres:') {
      log(`Database URL format valid (${url.hostname})`, 'success');
    } else {
      log(`Invalid database protocol: ${url.protocol}`, 'error');
    }
  }
} catch (e) {
  log(`Invalid DATABASE_URL format: ${e.message}`, 'error');
}

// 4. Check required files exist
console.log(chalk.bold('\n📁 Required Files:\n'));

const requiredFiles = [
  'server/index.ts',
  'client/src/App.tsx',
  'package.json',
  'tsconfig.json',
  'vite.config.ts'
];

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (existsSync(filePath)) {
    log(`${file} exists`, 'success');
  } else {
    log(`Missing file: ${file}`, 'error');
  }
});

// 5. Check dependencies
console.log(chalk.bold('\n📦 Dependencies Check:\n'));

try {
  execSync('npm ls --depth=0', { stdio: 'ignore' });
  log('All npm dependencies installed', 'success');
} catch (e) {
  log('Some npm dependencies may be missing or have conflicts', 'warning');
  log('Run `npm install` to fix', 'info');
}

// 6. Check TypeScript compilation
console.log(chalk.bold('\n🔧 TypeScript Check:\n'));

try {
  execSync('npx tsc --noEmit --project tsconfig.json', { 
    stdio: 'ignore',
    cwd: path.join(__dirname, '..')
  });
  log('TypeScript compilation successful', 'success');
} catch (e) {
  log('TypeScript compilation errors detected', 'warning');
  log('Run `npm run check` for details', 'info');
}

// 7. Summary
console.log(chalk.bold('\n📊 Preflight Summary:\n'));

if (errors === 0 && warnings === 0) {
  console.log(chalk.green.bold('✅ All checks passed! Ready to start.\n'));
  process.exit(0);
} else if (errors === 0) {
  console.log(chalk.yellow.bold(`⚠️  ${warnings} warning(s) found but can proceed.\n`));
  process.exit(0);
} else {
  console.log(chalk.red.bold(`❌ ${errors} error(s) and ${warnings} warning(s) found.\n`));
  console.log(chalk.red('Please fix the errors before starting the application.\n'));
  process.exit(1);
}