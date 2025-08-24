#!/usr/bin/env node
// Preflight guardrail check
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function sh(cmd) {
  try {
    return execSync(cmd, { stdio: ['pipe', 'pipe', 'inherit'] })
      .toString()
      .trim();
  } catch (e) {
    return '';
  }
}

// Prefer staged diff; if none, fallback to working tree changes
let changed = sh('git diff --name-only --cached');
if (!changed) changed = sh('git diff --name-only');
const files = changed.split('\n').filter(Boolean);

// If not a git repo (first run/CI), allow pass
try {
  execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
} catch {
  console.log('✅ Preflight OK (no git context)');
  process.exit(0);
}

if (!files.length) {
  console.log('✅ Preflight OK (no files changed)');
  process.exit(0);
}

// ❌ Block if editing legacy code
if (files.some(p => p.startsWith('client/_legacy/'))) {
  console.error('❌ Preflight: edits to client/_legacy are forbidden. Move work to client/src/.');
  process.exit(1);
}

// ❌ Require CR YAML if touching schema/DTO/API
const sensitive = files.some(p =>
  p.startsWith('server/routes/') ||
  p.startsWith('shared/schema') ||
  p.startsWith('shared/dtos') ||
  p.startsWith('db/migrations')
);

if (sensitive) {
  const crs = files.filter(p => p.startsWith('architecture/crs/') && p.endsWith('.yaml'));
  if (crs.length === 0) {
    console.error('❌ Preflight: Detected schema/DTO/API changes but no CR YAML in /architecture/crs/.');
    console.error('   -> Copy /architecture/cr_template.yaml and describe the change.');
    process.exit(1);
  }
}

// ❌ Check for security issues
const securityIssues = [];

// Check if .env files are properly gitignored
const gitignoreFile = '.gitignore';
if (fs.existsSync(gitignoreFile)) {
  const gitignoreContent = fs.readFileSync(gitignoreFile, 'utf8');
  if (!gitignoreContent.includes('.env')) {
    securityIssues.push('.env files should be in .gitignore');
  }
} else {
  securityIssues.push('.gitignore file missing');
}

// Check for sensitive files in repo
const sensitiveFiles = ['.env', '.env.local', '.env.production'];
const foundSensitiveFiles = sensitiveFiles.filter(file => fs.existsSync(file));
if (foundSensitiveFiles.length > 0) {
  securityIssues.push(`Sensitive files found: ${foundSensitiveFiles.join(', ')}`);
}

if (securityIssues.length > 0) {
  console.error('❌ Preflight: Security issues detected:');
  securityIssues.forEach(issue => console.error(`   -> ${issue}`));
  process.exit(1);
}

// ❌ Run route verification
try {
  execSync('node scripts/verify-routes.cjs', { stdio: 'inherit' });
} catch (e) {
  console.error('❌ Preflight: Route verification failed');
  process.exit(1);
}

// ❌ Check TypeScript compilation
try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
} catch (e) {
  console.error('❌ Preflight: TypeScript compilation failed');
  console.error('   -> Run "npx tsc --noEmit" to see details');
  process.exit(1);
}

// === END: preflight env checks ===
const { execSync: exec } = require('child_process');
try {
  execSync('npm run db:schema:dump', { stdio:'inherit' });
  execSync('npm run db:schema:check', { stdio:'inherit' });
} catch (e) {
  console.error('Preflight DB checks failed. Fix schema drift before continuing.');
  process.exit(1);
}

console.log('✅ Preflight OK - All checks passed!');
