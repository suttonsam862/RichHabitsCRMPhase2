#!/usr/bin/env node
/**
 * API Route Inventory Generator
 * Scans and catalogs all mounted Express routes to maintain API surface documentation
 */

import fs from 'fs';
import path from 'path';

interface RouteInfo {
  method: string;
  path: string;
  handler: string;
  file: string;
  implemented: boolean;
  validation: boolean;
}

interface RouterMount {
  basePath: string;
  routerFile: string;
  routes: RouteInfo[];
}

class RouteInventory {
  private mounts: RouterMount[] = [];

  async scanRoutes(directory: string = 'server'): Promise<RouterMount[]> {
    console.log(`📋 Scanning routes in ${directory}...`);
    
    try {
      // Find main server entry points
      await this.scanServerEntry();
      await this.scanRoutesDirectory();
      
      return this.mounts;
    } catch (error) {
      console.error('Error scanning routes:', error);
      return [];
    }
  }

  private async scanServerEntry() {
    // Check for main server files that mount routers
    const entryFiles = [
      'server/index.ts',
      'server/app.ts', 
      'server/server.ts',
      'server/vite.ts'
    ];

    for (const file of entryFiles) {
      if (fs.existsSync(file)) {
        await this.parseServerFile(file);
      }
    }
  }

  private async scanRoutesDirectory() {
    const routesDir = 'server/routes';
    if (!fs.existsSync(routesDir)) return;

    // Scan routes.ts (main router)
    const mainRoutes = path.join(routesDir, 'routes.ts');
    if (fs.existsSync(mainRoutes)) {
      await this.parseRouterFile(mainRoutes, '/api');
    }

    // Scan api.ts (api router)
    const apiRoutes = path.join(routesDir, 'api.ts');
    if (fs.existsSync(apiRoutes)) {
      await this.parseRouterFile(apiRoutes, '/api');
    }

    // Scan domain-specific routers
    const domainDirs = fs.readdirSync(routesDir)
      .filter(item => {
        const fullPath = path.join(routesDir, item);
        return fs.statSync(fullPath).isDirectory();
      });

    for (const domain of domainDirs) {
      const indexFile = path.join(routesDir, domain, 'index.ts');
      if (fs.existsSync(indexFile)) {
        await this.parseRouterFile(indexFile, `/api/${domain}`);
      }
    }
  }

  private async parseServerFile(filePath: string) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Look for app.use patterns that mount routers
      const mountPatterns = [
        /app\.use\(['"`]([^'"`]+)['"`],\s*([^)]+)\)/g,
        /app\.use\(([^,]+),\s*([^)]+)\)/g
      ];

      for (const pattern of mountPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const [, basePath, routerName] = match;
          if (basePath && basePath.startsWith('/api')) {
            // Found API router mount
            console.log(`Found API mount: ${basePath} -> ${routerName}`);
          }
        }
      }
    } catch (error) {
      console.warn(`Could not parse ${filePath}:`, error);
    }
  }

  private async parseRouterFile(filePath: string, basePath: string) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const routes: RouteInfo[] = [];

      // Parse route definitions
      const routePatterns = [
        /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
        /router\.(use)\s*\(\s*['"`]([^'"`]+)['"`]/g
      ];

      for (const pattern of routePatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const [fullMatch, method, routePath] = match;
          
          // Skip if this is mounting another router
          if (method === 'use' && !routePath.startsWith('/')) continue;
          
          const fullPath = basePath + (routePath === '/' ? '' : routePath);
          
          // Check if route is implemented (not just a TODO/stub)
          const lineIndex = content.indexOf(fullMatch);
          const lineStart = content.lastIndexOf('\n', lineIndex) + 1;
          const lineEnd = content.indexOf('\n', lineIndex);
          const line = content.slice(lineStart, lineEnd);
          const nextLines = content.slice(lineIndex, lineIndex + 200);
          
          const implemented = !nextLines.includes('TODO') && 
                            !nextLines.includes('501') &&
                            !nextLines.includes('Not implemented');
          
          const validation = nextLines.includes('validateRequest') ||
                           nextLines.includes('validate') ||
                           nextLines.includes('schema');

          routes.push({
            method: method.toUpperCase(),
            path: fullPath,
            handler: 'handler',
            file: filePath,
            implemented,
            validation
          });
        }
      }

      if (routes.length > 0) {
        this.mounts.push({
          basePath,
          routerFile: filePath,
          routes
        });
      }

    } catch (error) {
      console.warn(`Could not parse router file ${filePath}:`, error);
    }
  }

  generateMarkdown(): string {
    let markdown = `# API Route Surface

Generated on: ${new Date().toISOString()}

This document catalogs all mounted API routes to track the public API surface.

## Route Summary

`;

    let totalRoutes = 0;
    let implementedRoutes = 0;
    let validatedRoutes = 0;

    for (const mount of this.mounts) {
      totalRoutes += mount.routes.length;
      implementedRoutes += mount.routes.filter(r => r.implemented).length;
      validatedRoutes += mount.routes.filter(r => r.validation).length;

      markdown += `### ${mount.basePath}\n\n`;
      markdown += `Source: \`${mount.routerFile}\`\n\n`;
      markdown += `| Method | Path | Status | Validation |\n`;
      markdown += `|--------|------|--------|-----------|\n`;

      for (const route of mount.routes) {
        const status = route.implemented ? '✅ Implemented' : '🚧 Stub';
        const validation = route.validation ? '✅' : '❌';
        markdown += `| ${route.method} | ${route.path} | ${status} | ${validation} |\n`;
      }

      markdown += '\n';
    }

    markdown += `## Statistics

- Total routes: ${totalRoutes}
- Implemented: ${implementedRoutes}
- Stubbed: ${totalRoutes - implementedRoutes}
- With validation: ${validatedRoutes}

## API Design Rules

1. All API routes must be under \`/api/*\` prefix
2. Use domain-based organization: \`/api/organizations\`, \`/api/orders\`, etc.
3. Implement proper validation using Zod schemas
4. Return consistent response envelopes: \`{ success, data, error, message }\`

Last updated: ${new Date().toISOString()}
`;

    return markdown;
  }

  generateJSON() {
    return {
      generatedAt: new Date().toISOString(),
      mounts: this.mounts,
      summary: {
        totalRoutes: this.mounts.reduce((sum, m) => sum + m.routes.length, 0),
        implemented: this.mounts.reduce((sum, m) => sum + m.routes.filter(r => r.implemented).length, 0),
        validated: this.mounts.reduce((sum, m) => sum + m.routes.filter(r => r.validation).length, 0)
      }
    };
  }
}

async function main() {
  console.log('🛣️  Scanning API routes...');
  
  const inventory = new RouteInventory();
  await inventory.scanRoutes();

  // Ensure output directories exist
  if (!fs.existsSync('tmp')) {
    fs.mkdirSync('tmp');
  }
  if (!fs.existsSync('docs')) {
    fs.mkdirSync('docs');
  }

  // Generate outputs
  const markdown = inventory.generateMarkdown();
  const json = inventory.generateJSON();

  fs.writeFileSync('docs/ROUTE_SURFACE.md', markdown);
  fs.writeFileSync('tmp/route-surface.json', JSON.stringify(json, null, 2));

  console.log('✅ Route inventory generated:');
  console.log('   📄 docs/ROUTE_SURFACE.md');
  console.log('   📄 tmp/route-surface.json');
  console.log(`   📊 Found ${json.summary.totalRoutes} total routes`);
  console.log(`   ✅ ${json.summary.implemented} implemented`);
  console.log(`   🔒 ${json.summary.validated} with validation`);
}

// ESM module entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { RouteInventory };