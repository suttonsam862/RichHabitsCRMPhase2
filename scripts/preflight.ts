#!/usr/bin/env node
/**
 * Preflight Check Script
 * Runs repository mapping, route inventory, and type checking
 * Use before making changes to ensure clean starting state
 */

import { execSync } from 'child_process';
import fs from 'fs';

interface CheckResult {
  name: string;
  success: boolean;
  message: string;
  duration: number;
}

class PreflightChecker {
  private results: CheckResult[] = [];

  async runCheck(name: string, command: string, description: string): Promise<CheckResult> {
    const startTime = Date.now();
    console.log(`🔍 ${description}...`);

    try {
      const output = execSync(command, { 
        encoding: 'utf-8', 
        timeout: 30000,
        stdio: 'pipe'
      });
      
      const duration = Date.now() - startTime;
      const result: CheckResult = {
        name,
        success: true,
        message: `✅ ${description} completed`,
        duration
      };
      
      this.results.push(result);
      console.log(`   ${result.message} (${duration}ms)`);
      return result;
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const result: CheckResult = {
        name,
        success: false,
        message: `❌ ${description} failed: ${error.message}`,
        duration
      };
      
      this.results.push(result);
      console.log(`   ${result.message} (${duration}ms)`);
      return result;
    }
  }

  async runAll(): Promise<boolean> {
    console.log('🚀 Running preflight checks...\n');

    // 1. Repository mapping
    await this.runCheck(
      'repo-map', 
      'tsx scripts/repo-map.ts',
      'Generating repository structure map'
    );

    // 2. Route inventory
    await this.runCheck(
      'route-inventory', 
      'tsx scripts/route-inventory.ts',
      'Scanning API route surface'
    );

    // 3. TypeScript compilation check
    await this.runCheck(
      'typecheck',
      'npx tsc --noEmit',
      'Type checking codebase'
    );

    // 4. Check for critical files
    await this.checkCriticalFiles();

    // 5. Summary
    this.printSummary();

    return this.results.every(r => r.success);
  }

  private async checkCriticalFiles(): Promise<void> {
    const startTime = Date.now();
    console.log('🔍 Checking critical files...');

    const criticalFiles = [
      'package.json',
      'shared/schema.ts',
      'server/db.ts',
      'client/src/main.tsx'
    ];

    const missing: string[] = [];
    
    for (const file of criticalFiles) {
      if (!fs.existsSync(file)) {
        missing.push(file);
      }
    }

    const duration = Date.now() - startTime;
    
    if (missing.length === 0) {
      const result: CheckResult = {
        name: 'critical-files',
        success: true,
        message: '✅ All critical files present',
        duration
      };
      this.results.push(result);
      console.log(`   ${result.message} (${duration}ms)`);
    } else {
      const result: CheckResult = {
        name: 'critical-files',
        success: false,
        message: `❌ Missing critical files: ${missing.join(', ')}`,
        duration
      };
      this.results.push(result);
      console.log(`   ${result.message} (${duration}ms)`);
    }
  }

  private printSummary(): void {
    console.log('\n📊 Preflight Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const passed = this.results.filter(r => r.success).length;
    const total = this.results.length;
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);

    for (const result of this.results) {
      console.log(`   ${result.success ? '✅' : '❌'} ${result.name}: ${result.message.replace(/[✅❌] /, '')}`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   ${passed}/${total} checks passed in ${totalTime}ms`);

    if (passed === total) {
      console.log('   🎉 All checks passed! Ready for development.');
    } else {
      console.log('   ⚠️  Some checks failed. Review and fix before proceeding.');
    }

    // Write results to file
    if (!fs.existsSync('tmp')) {
      fs.mkdirSync('tmp');
    }

    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        passed,
        total,
        totalTime,
        success: passed === total
      },
      results: this.results
    };

    fs.writeFileSync('tmp/preflight-report.json', JSON.stringify(reportData, null, 2));
    console.log('   📄 Detailed report: tmp/preflight-report.json');
  }
}

async function main() {
  const checker = new PreflightChecker();
  const success = await checker.runAll();
  
  process.exit(success ? 0 : 1);
}

// ESM module entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { PreflightChecker };