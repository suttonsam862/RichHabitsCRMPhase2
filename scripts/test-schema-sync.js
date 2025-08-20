#!/usr/bin/env node
import { pullSchema } from './schema-sync.js';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

async function testSchemaSync() {
  console.log('🧪 Testing Schema Auto-Pull Functionality\n');
  
  try {
    // Test 1: Run schema pull
    console.log('Test 1: Running schema auto-pull...');
    await pullSchema();
    console.log('✅ Test 1 PASSED: Schema pull executed successfully\n');
    
    // Test 2: Verify files exist
    console.log('Test 2: Verifying generated files exist...');
    const schemaPath = join(projectRoot, 'shared/schema.ts');
    const relationsPath = join(projectRoot, 'shared/relations.ts');
    
    await fs.access(schemaPath);
    await fs.access(relationsPath);
    console.log('✅ Test 2 PASSED: Schema files exist in shared/ directory\n');
    
    // Test 3: Verify file contents
    console.log('Test 3: Verifying file contents...');
    const schemaContent = await fs.readFile(schemaPath, 'utf8');
    const relationsContent = await fs.readFile(relationsPath, 'utf8');
    
    // Check for timestamp header
    if (schemaContent.includes('Schema auto-pulled on') && 
        relationsContent.includes('Schema auto-pulled on')) {
      console.log('✅ Test 3.1 PASSED: Timestamp headers present');
    } else {
      throw new Error('Missing timestamp headers');
    }
    
    // Check for essential table exports
    const expectedTables = ['users', 'organizations', 'quotes'];
    let tablesFound = 0;
    for (const table of expectedTables) {
      if (schemaContent.includes(`export const ${table}`)) {
        tablesFound++;
        console.log(`✅ Found table: ${table}`);
      }
    }
    
    if (tablesFound > 0) {
      console.log(`✅ Test 3.2 PASSED: Found ${tablesFound} tables in schema`);
    } else {
      throw new Error('No expected tables found in schema');
    }
    
    // Check relations file
    if (relationsContent.includes('relations')) {
      console.log('✅ Test 3.3 PASSED: Relations file contains relations');
    } else {
      throw new Error('Relations file missing relations');
    }
    
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('📊 Schema auto-pull is working correctly');
    console.log('🔗 Frontend and backend will stay in sync with database\n');
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testSchemaSync();
}