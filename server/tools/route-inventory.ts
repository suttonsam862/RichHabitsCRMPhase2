/**
 * Route inventory tool for architectural analysis
 * Scans and catalogs all API routes in the system
 */

import * as fs from 'fs';
import * as path from 'path';

interface RouteInfo {
  path: string;
  method: string;
  file: string;
  middleware?: string[];
  validation?: boolean;
  implemented: boolean;
}

class RouteInventory {
  private routes: RouteInfo[] = [];
  
  async scanRoutes(directory: string = 'server/routes'): Promise<RouteInfo[]> {
    console.log(`📋 Scanning routes in ${directory}...`);
    
    try {
      await this.scanDirectory(directory, '');
      return this.routes;
    } catch (error) {
      console.error('Error scanning routes:', error);
      return [];
    }
  }

  private async scanDirectory(dir: string, prefix: string): Promise<void> {
    if (!fs.existsSync(dir)) {
      console.warn(`Directory ${dir} does not exist`);
      return;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && entry.name !== 'middleware') {
        const routePrefix = entry.name === 'api' ? '' : entry.name;
        await this.scanDirectory(fullPath, `${prefix}/${routePrefix}`);
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        await this.parseRouteFile(fullPath, prefix);
      }
    }
  }

  private async parseRouteFile(filePath: string, prefix: string): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Extract route definitions using regex
      const routeRegex = /router\.(get|post|put|patch|delete|use)\s*\(\s*['"`]([^'"`]+)['"`]/g;
      let match;
      
      while ((match = routeRegex.exec(content)) !== null) {
        const [, method, routePath] = match;
        const fullPath = `${prefix}${routePath}`.replace(/\/+/g, '/');
        
        const routeInfo: RouteInfo = {
          path: fullPath,
          method: method.toUpperCase(),
          file: filePath,
          validation: content.includes('validateRequest'),
          implemented: !content.includes('Not implemented') && !content.includes('🚧'),
        };

        this.routes.push(routeInfo);
      }
    } catch (error) {
      console.error(`Error parsing ${filePath}:`, error);
    }
  }

  printSummary(): void {
    console.log('\n📊 Route Inventory Summary:');
    console.log('==========================================');
    
    const groupedRoutes = this.groupByFeature();
    
    for (const [feature, routes] of Object.entries(groupedRoutes)) {
      console.log(`\n🔸 ${feature.toUpperCase()}`);
      console.log(`   Total routes: ${routes.length}`);
      console.log(`   Implemented: ${routes.filter(r => r.implemented).length}`);
      console.log(`   With validation: ${routes.filter(r => r.validation).length}`);
      
      routes.forEach(route => {
        const status = route.implemented ? '✅' : '🚧';
        const validation = route.validation ? '[V]' : '';
        console.log(`   ${status} ${route.method.padEnd(6)} ${route.path} ${validation}`);
      });
    }
    
    console.log('\n📈 Overall Stats:');
    console.log(`   Total routes: ${this.routes.length}`);
    console.log(`   Implemented: ${this.routes.filter(r => r.implemented).length}`);
    console.log(`   Stubbed: ${this.routes.filter(r => !r.implemented).length}`);
    console.log(`   With validation: ${this.routes.filter(r => r.validation).length}`);
  }

  private groupByFeature(): Record<string, RouteInfo[]> {
    return this.routes.reduce((acc, route) => {
      const feature = this.extractFeature(route.path);
      if (!acc[feature]) acc[feature] = [];
      acc[feature].push(route);
      return acc;
    }, {} as Record<string, RouteInfo[]>);
  }

  private extractFeature(path: string): string {
    const parts = path.split('/').filter(Boolean);
    if (parts.length === 0) return 'root';
    
    // Extract feature name from path
    if (parts[0] === 'api' && parts.length > 1) {
      return parts[1];
    }
    return parts[0];
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const inventory = new RouteInventory();
  inventory.scanRoutes()
    .then(() => {
      inventory.printSummary();
    })
    .catch(console.error);
}

export { RouteInventory };