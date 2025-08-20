#!/usr/bin/env ts-node

import madge from 'madge';
import fs from 'fs';
import path from 'path';

interface CircularReport {
  timestamp: string;
  circularDependencies: string[][];
  totalFiles: number;
  circularCount: number;
  status: 'pass' | 'fail';
  allowedCirculars: string[];
}

async function findCircularDependencies(): Promise<CircularReport> {
  console.log('🔍 Scanning for circular dependencies...\n');
  
  const allowlist: string[] = []; // Empty allowlist initially
  
  try {
    // Analyze client/src
    console.log('Analyzing client/src...');
    const clientResult = await madge(['client/src'], {
      fileExtensions: ['ts', 'tsx'],
      tsConfig: 'tsconfig.json',
    });
    
    const clientCirculars = clientResult.circular();
    
    // Analyze server/
    console.log('Analyzing server/...');
    const serverResult = await madge(['server'], {
      fileExtensions: ['ts'],
      tsConfig: 'tsconfig.json',
    });
    
    const serverCirculars = serverResult.circular();
    
    // Combine results
    const allCirculars = [...clientCirculars, ...serverCirculars];
    const totalFiles = clientResult.obj() ? Object.keys(clientResult.obj()).length : 0;
    const serverFiles = serverResult.obj() ? Object.keys(serverResult.obj()).length : 0;
    
    const report: CircularReport = {
      timestamp: new Date().toISOString(),
      circularDependencies: allCirculars,
      totalFiles: totalFiles + serverFiles,
      circularCount: allCirculars.length,
      status: allCirculars.length === 0 ? 'pass' : 'fail',
      allowedCirculars: allowlist,
    };
    
    // Create tmp/audit directory if it doesn't exist
    const auditDir = path.join(process.cwd(), 'tmp', 'audit');
    if (!fs.existsSync(auditDir)) {
      fs.mkdirSync(auditDir, { recursive: true });
    }
    
    // Write report to JSON file
    const reportPath = path.join(auditDir, 'circulars.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Console output
    if (allCirculars.length === 0) {
      console.log('✅ No circular dependencies found!');
      console.log(`Analyzed ${report.totalFiles} files total\n`);
    } else {
      console.log('🚨 Circular dependencies detected:');
      allCirculars.forEach((circular, index) => {
        console.log(`\n${index + 1}. ${circular.join(' → ')}`);
      });
      console.log(`\nTotal: ${allCirculars.length} circular dependencies found`);
      console.log(`Analyzed ${report.totalFiles} files total`);
    }
    
    console.log(`📄 Report saved to: ${reportPath}\n`);
    
    return report;
    
  } catch (error) {
    console.error('❌ Error analyzing circular dependencies:', error);
    
    const errorReport: CircularReport = {
      timestamp: new Date().toISOString(),
      circularDependencies: [],
      totalFiles: 0,
      circularCount: -1, // Error state
      status: 'fail',
      allowedCirculars: allowlist,
    };
    
    return errorReport;
  }
}

// CLI execution
async function main() {
  const report = await findCircularDependencies();
  
  // Exit with error code if circular dependencies found (and not in allowlist)
  if (report.status === 'fail' && report.circularCount > 0) {
    console.log('💥 Build failed due to circular dependencies');
    console.log('Add allowed patterns to allowlist in scripts/find-circulars.ts to bypass specific cases\n');
    process.exit(1);
  }
  
  if (report.circularCount === -1) {
    console.log('💥 Build failed due to analysis error\n');
    process.exit(1);
  }
  
  console.log('✅ Circular dependency check passed\n');
  process.exit(0);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { findCircularDependencies, type CircularReport };