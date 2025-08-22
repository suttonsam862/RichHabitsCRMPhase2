#!/usr/bin/env node
// Preflight guardrail check
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

console.log('✅ Preflight OK');
