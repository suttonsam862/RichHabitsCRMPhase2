#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RouteInfo {
  method: string;
  path: string;
  file: string;
  line?: number;
  mountPoint?: string;
}

interface MountInfo {
  mountPath: string;
  routerFile: string;
  line: number;
}

/**
 * Route inventory tool to detect duplicate and overlapping Express routes
 * Analyzes server/index.ts and server/routes/* files
 */
class RouteInventory {
  private routes: RouteInfo[] = [];
  private mounts: MountInfo[] = [];
  
  constructor() {}

  /**
   * Analyze server/index.ts for app.use() mount points
   */
  private analyzeMountPoints(): void {
    const indexPath = path.join(__dirname, '../index.ts');
    if (!fs.existsSync(indexPath)) {
      console.warn(`⚠️ server/index.ts not found at ${indexPath}`);
      return;
    }

    const content = fs.readFileSync(indexPath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Match app.use() calls with mount paths
      const mountMatch = line.match(/app\.use\s*\(\s*["']([^"']+)["']\s*,\s*(\w+)\s*\)/);
      if (mountMatch) {
        const [, mountPath, routerName] = mountMatch;
        this.mounts.push({
          mountPath,
          routerFile: `${routerName} (imported)`,
          line: index + 1
        });
      }

      // Also match direct app.use(router) calls
      const directMount = line.match(/app\.use\s*\(\s*(\w+)\s*\)/);
      if (directMount) {
        const [, routerName] = directMount;
        this.mounts.push({
          mountPath: '/* (all paths)',
          routerFile: `${routerName} (imported)`,
          line: index + 1
        });
      }
    });
  }

  /**
   * Analyze route files for route definitions
   */
  private analyzeRouteFiles(): void {
    const routesDir = path.join(__dirname, '../routes');
    const mainRoutesFile = path.join(__dirname, '../routes.ts');
    
    // Analyze main routes.ts
    if (fs.existsSync(mainRoutesFile)) {
      this.analyzeFile(mainRoutesFile, 'routes.ts');
    }

    // Analyze files in routes/ directory
    if (fs.existsSync(routesDir)) {
      const files = fs.readdirSync(routesDir);
      files.forEach(file => {
        if (file.endsWith('.ts') || file.endsWith('.js')) {
          this.analyzeFile(path.join(routesDir, file), `routes/${file}`);
        }
      });
    }
  }

  /**
   * Analyze a single file for route definitions
   */
  private analyzeFile(filePath: string, relativeFile: string): void {
    if (!fs.existsSync(filePath)) return;

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Match router.method() calls
      const routeMatch = line.match(/router\.(get|post|put|patch|delete|all)\s*\(\s*["']([^"']+)["']/);
      if (routeMatch) {
        const [, method, routePath] = routeMatch;
        this.routes.push({
          method: method.toUpperCase(),
          path: routePath,
          file: relativeFile,
          line: index + 1
        });
      }

      // Match app.method() calls (direct Express app routes)
      const appRouteMatch = line.match(/app\.(get|post|put|patch|delete|all)\s*\(\s*["']([^"']+)["']/);
      if (appRouteMatch) {
        const [, method, routePath] = appRouteMatch;
        this.routes.push({
          method: method.toUpperCase(),
          path: routePath,
          file: relativeFile,
          line: index + 1
        });
      }
    });
  }

  /**
   * Detect duplicate and overlapping routes
   */
  private findConflicts(): { duplicates: RouteInfo[][], overlaps: RouteInfo[][] } {
    const duplicates: RouteInfo[][] = [];
    const overlaps: RouteInfo[][] = [];
    
    // Group routes by method + path combination
    const routeGroups: { [key: string]: RouteInfo[] } = {};
    
    this.routes.forEach(route => {
      const key = `${route.method}:${route.path}`;
      if (!routeGroups[key]) {
        routeGroups[key] = [];
      }
      routeGroups[key].push(route);
    });

    // Find exact duplicates
    Object.values(routeGroups).forEach(group => {
      if (group.length > 1) {
        duplicates.push(group);
      }
    });

    // Find overlapping patterns (simple overlap detection)
    const pathGroups: { [path: string]: RouteInfo[] } = {};
    this.routes.forEach(route => {
      const normalizedPath = route.path.replace(/:\w+/g, ':param');
      if (!pathGroups[normalizedPath]) {
        pathGroups[normalizedPath] = [];
      }
      pathGroups[normalizedPath].push(route);
    });

    Object.values(pathGroups).forEach(group => {
      if (group.length > 1) {
        const methods = [...new Set(group.map(r => r.method))];
        if (methods.length === 1) {
          overlaps.push(group);
        }
      }
    });

    return { duplicates, overlaps };
  }

  /**
   * Generate inventory report
   */
  public generateReport(): string {
    this.analyzeMountPoints();
    this.analyzeRouteFiles();
    
    const { duplicates, overlaps } = this.findConflicts();
    
    let report = `# API Routes Inventory Report\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n\n`;

    // Mount Points Summary
    report += `## Mount Points\n\n`;
    report += `| Mount Path | Router | File:Line |\n`;
    report += `|------------|--------|----------|\n`;
    this.mounts.forEach(mount => {
      report += `| \`${mount.mountPath}\` | ${mount.routerFile} | index.ts:${mount.line} |\n`;
    });
    report += `\n`;

    // All Routes Summary
    report += `## All Routes (${this.routes.length} total)\n\n`;
    report += `| Method | Path | File | Line |\n`;
    report += `|--------|------|------|------|\n`;
    
    // Sort routes by path then method
    const sortedRoutes = [...this.routes].sort((a, b) => {
      if (a.path !== b.path) return a.path.localeCompare(b.path);
      return a.method.localeCompare(b.method);
    });
    
    sortedRoutes.forEach(route => {
      report += `| ${route.method} | \`${route.path}\` | ${route.file} | ${route.line || 'N/A'} |\n`;
    });
    report += `\n`;

    // Conflicts
    if (duplicates.length > 0) {
      report += `## 🚨 Duplicate Routes (${duplicates.length} conflicts)\n\n`;
      duplicates.forEach((group, index) => {
        report += `### Conflict ${index + 1}: ${group[0].method} ${group[0].path}\n\n`;
        group.forEach(route => {
          report += `- **${route.file}:${route.line}** - ${route.method} \`${route.path}\`\n`;
        });
        report += `\n`;
      });
    }

    if (overlaps.length > 0) {
      report += `## ⚠️ Overlapping Routes (${overlaps.length} potential conflicts)\n\n`;
      overlaps.forEach((group, index) => {
        report += `### Overlap ${index + 1}: ${group[0].path}\n\n`;
        group.forEach(route => {
          report += `- **${route.file}:${route.line}** - ${route.method} \`${route.path}\`\n`;
        });
        report += `\n`;
      });
    }

    // Organization Routes Analysis
    const orgRoutes = this.routes.filter(r => 
      r.path.includes('/organizations') || r.path.includes('/api/organizations')
    );
    
    if (orgRoutes.length > 0) {
      report += `## Organizations Routes Analysis\n\n`;
      report += `Found ${orgRoutes.length} organization-related routes:\n\n`;
      report += `| Method | Path | File |\n`;
      report += `|--------|------|------|\n`;
      orgRoutes.forEach(route => {
        report += `| ${route.method} | \`${route.path}\` | ${route.file} |\n`;
      });
      report += `\n`;
    }

    // Recommendations
    report += `## Recommendations\n\n`;
    if (duplicates.length > 0) {
      report += `1. **Resolve ${duplicates.length} duplicate routes** - Multiple definitions of the same endpoint\n`;
    }
    if (overlaps.length > 0) {
      report += `2. **Review ${overlaps.length} overlapping routes** - Similar patterns may cause conflicts\n`;
    }
    
    const orgFiles = [...new Set(orgRoutes.map(r => r.file))];
    if (orgFiles.length > 1) {
      report += `3. **Consolidate organization routes** - Found routes in ${orgFiles.length} files: ${orgFiles.join(', ')}\n`;
    }
    
    report += `4. **Implement canonical routing** - Use single router per resource\n`;
    report += `5. **Add deprecation shims** - For backward compatibility during migration\n\n`;

    return report;
  }

  /**
   * CLI interface
   */
  public static run(): void {
    const inventory = new RouteInventory();
    const report = inventory.generateReport();
    
    console.log(report);
    
    // Also write to file for documentation
    const outputPath = path.join(__dirname, '../../docs/API-ROUTES-INVENTORY.md');
    const outputDir = path.dirname(outputPath);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, report);
    console.log(`\n📄 Report saved to: docs/API-ROUTES-INVENTORY.md`);
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  RouteInventory.run();
}

export { RouteInventory };