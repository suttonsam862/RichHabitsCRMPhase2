#!/usr/bin/env node
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

async function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      stdio: 'pipe', // Change to pipe to capture output
      cwd: projectRoot,
      ...options
    });
    
    let output = '';
    let errorOutput = '';
    
    child.stdout?.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr?.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        if (output.trim()) {
          console.log(output.trim());
        }
        resolve();
      } else {
        console.error('Command output:', output);
        console.error('Command error:', errorOutput);
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function ensureDirectory(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
    console.log(`📁 Ensured directory: ${dir}`);
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

async function copyFile(src, dest) {
  try {
    await fs.copyFile(src, dest);
    console.log(`📋 Copied: ${src} → ${dest}`);
  } catch (error) {
    console.error(`❌ Failed to copy ${src} to ${dest}:`, error.message);
    throw error;
  }
}

async function pullSchema() {
  console.log('Starting database schema auto-pull...\n');
  
  try {
    // Step 1: Introspect the database
    console.log('1. Introspecting database schema...');
    await runCommand('npx', ['drizzle-kit', 'introspect']);
    
    // Step 2: Ensure shared directory exists
    console.log('\n2. Preparing shared directory...');
    await ensureDirectory(join(projectRoot, 'shared'));
    
    // Step 3: Copy generated schema files
    console.log('\n3. Copying schema files...');
    const migrationsDir = join(projectRoot, 'migrations');
    const sharedDir = join(projectRoot, 'shared');
    
    // Copy schema.ts
    await copyFile(
      join(migrationsDir, 'schema.ts'),
      join(sharedDir, 'schema.ts')
    );
    
    // Copy relations.ts  
    await copyFile(
      join(migrationsDir, 'relations.ts'),
      join(sharedDir, 'relations.ts')
    );
    
    // Step 4: Add timestamp to track updates
    const timestamp = new Date().toISOString();
    const updateInfo = `// Schema auto-pulled on ${timestamp}\n// This file was automatically generated from the database\n\n`;
    
    // Prepend timestamp to schema.ts
    const schemaPath = join(sharedDir, 'schema.ts');
    const schemaContent = await fs.readFile(schemaPath, 'utf8');
    await fs.writeFile(schemaPath, updateInfo + schemaContent);
    
    // Prepend timestamp to relations.ts
    const relationsPath = join(sharedDir, 'relations.ts');
    const relationsContent = await fs.readFile(relationsPath, 'utf8');
    await fs.writeFile(relationsPath, updateInfo + relationsContent);
    
    console.log('\nSchema auto-pull completed successfully!');
    console.log(`Schema synchronized with database at ${timestamp}`);
    console.log('Frontend and backend are now in sync with DB schema\n');
    
  } catch (error) {
    console.error('\nSchema auto-pull failed:', error.message);
    throw error; // Don't exit, let caller handle
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  pullSchema();
}

export { pullSchema };