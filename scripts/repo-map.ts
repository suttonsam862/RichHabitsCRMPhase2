#!/usr/bin/env node
/**
 * Repository Structure Mapper
 * Generates a structured map of the codebase to prevent architectural drift
 */

import fs from 'fs';
import path from 'path';

interface DirInfo {
  name: string;
  path: string;
  description: string;
  children?: DirInfo[];
  files?: string[];
}

const ROOT_DESCRIPTIONS: Record<string, string> = {
  'client': 'Frontend React/TypeScript application',
  'server': 'Backend Express API server',
  'shared': 'Shared types, DTOs, and schemas',
  'scripts': 'Development and maintenance scripts',
  'docs': 'Project documentation',
  'migrations': 'Database migration files',
  'lib': 'Shared utilities (legacy location)',
  'tests': 'Test files and fixtures'
};

const CLIENT_DESCRIPTIONS: Record<string, string> = {
  'src': 'Main source code (canonical location)',
  '_legacy': 'Legacy components (read-only, being migrated)',
  'public': 'Static assets served by Vite'
};

const SERVER_DESCRIPTIONS: Record<string, string> = {
  'routes': 'Express route handlers organized by domain',
  'services': 'Business logic and data access',
  'middleware': 'Express middleware functions',
  'lib': 'Server utilities and configuration',
  'db': 'Database connection and query helpers',
  'scripts': 'Server-side scripts and tools'
};

const SHARED_DESCRIPTIONS: Record<string, string> = {
  'dtos': 'Data Transfer Objects with Zod validation',
  'schema': 'Database schema definitions',
  'constants': 'Shared constants and enums'
};

function shouldIgnore(name: string): boolean {
  const ignored = [
    'node_modules', '.git', 'dist', 'build', '.cache', 
    'coverage', '.next', '.vite', 'tmp', '.env'
  ];
  return ignored.includes(name) || name.startsWith('.');
}

function getDescription(dirPath: string, name: string): string {
  const parts = dirPath.split(path.sep);
  
  if (parts.length === 1) {
    return ROOT_DESCRIPTIONS[name] || 'Directory';
  }
  
  if (parts[0] === 'client') {
    return CLIENT_DESCRIPTIONS[name] || 'Client directory';
  }
  
  if (parts[0] === 'server') {
    return SERVER_DESCRIPTIONS[name] || 'Server directory';
  }
  
  if (parts[0] === 'shared') {
    return SHARED_DESCRIPTIONS[name] || 'Shared directory';
  }
  
  return 'Directory';
}

function scanDirectory(dirPath: string, maxDepth: number = 3, currentDepth: number = 0): DirInfo | null {
  if (currentDepth > maxDepth || shouldIgnore(path.basename(dirPath))) {
    return null;
  }

  const fullPath = path.resolve(dirPath);
  
  // Debug the issue
  console.log(`Scanning: ${dirPath} -> ${fullPath}`);
  
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) {
    return null;
  }

  const name = path.basename(dirPath);
  const info: DirInfo = {
    name,
    path: dirPath,
    description: getDescription(dirPath, name),
    children: [],
    files: []
  };

  try {
    const entries = fs.readdirSync(fullPath);
    
    for (const entry of entries) {
      if (shouldIgnore(entry)) continue;
      
      const entryPath = path.join(fullPath, entry);
      const stat = fs.statSync(entryPath);
      
      if (stat.isDirectory()) {
        const childInfo = scanDirectory(path.join(dirPath, entry), maxDepth, currentDepth + 1);
        if (childInfo) {
          info.children!.push(childInfo);
        }
      } else if (stat.isFile() && currentDepth <= 2) {
        // Only include files for top-level directories
        info.files!.push(entry);
      }
    }
    
    // Sort children and files
    info.children!.sort((a, b) => a.name.localeCompare(b.name));
    info.files!.sort();
    
  } catch (error) {
    console.warn(`Warning: Could not read directory ${fullPath}:`, error);
  }

  return info;
}

function generateMarkdown(info: DirInfo, indent: string = ''): string {
  let md = `${indent}- **${info.name}/** - ${info.description}\n`;
  
  if (info.children && info.children.length > 0) {
    for (const child of info.children) {
      md += generateMarkdown(child, indent + '  ');
    }
  }
  
  if (info.files && info.files.length > 0 && indent.length < 4) {
    const keyFiles = info.files.filter(f => 
      f.endsWith('.ts') || f.endsWith('.tsx') || 
      f === 'package.json' || f === 'README.md'
    ).slice(0, 5);
    
    if (keyFiles.length > 0) {
      md += `${indent}  - Key files: ${keyFiles.join(', ')}\n`;
    }
  }
  
  return md;
}

async function main() {
  console.log('🗺️  Generating repository map...');
  
  const rootInfo = scanDirectory('.', 3);
  
  if (!rootInfo) {
    console.error('❌ Could not scan repository root');
    process.exit(1);
  }

  // Ensure output directories exist
  if (!fs.existsSync('tmp')) {
    fs.mkdirSync('tmp');
  }
  if (!fs.existsSync('docs')) {
    fs.mkdirSync('docs');
  }

  // Generate JSON output
  const jsonOutput = JSON.stringify(rootInfo, null, 2);
  fs.writeFileSync('tmp/repo-map.json', jsonOutput);

  // Generate Markdown output
  const markdown = `# Repository Structure Map

Generated on: ${new Date().toISOString()}

This document provides a structured overview of the codebase to prevent architectural drift and guide development decisions.

## Directory Structure

${generateMarkdown(rootInfo)}

## Key Principles

- **client/src**: Canonical frontend location (React + TypeScript)
- **server**: Express API server, owns all /api/* routes
- **shared**: Shared types and schemas between client/server
- **client/_legacy**: Read-only legacy code being migrated

## Route Ownership

- Express server handles ALL /api/* requests
- Vite serves static assets and SPA fallback for non-API routes
- No /api/* handling in Vite or client-side routing

Last updated: ${new Date().toISOString()}
`;

  fs.writeFileSync('docs/REPO_MAP.md', markdown);

  console.log('✅ Repository map generated:');
  console.log('   📄 tmp/repo-map.json');
  console.log('   📄 docs/REPO_MAP.md');
  console.log(`   📊 Scanned ${rootInfo.children?.length || 0} top-level directories`);
}

// ESM module entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { scanDirectory, generateMarkdown };