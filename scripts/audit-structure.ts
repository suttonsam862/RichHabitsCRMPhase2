#!/usr/bin/env tsx
/**
 * Comprehensive Vite/React + Express Monorepo Structure Auditor
 * 
 * This script identifies potential split-brain frontend trees, duplicate routes,
 * and architectural inconsistencies in a TypeScript monorepo.
 * 
 * Objectives:
 * 1. Detect duplicate frontend trees (multiple src directories with pages/components)
 * 2. Find multiple React entry points or index.html files
 * 3. Extract React Router usage and route tables from JSX
 * 4. Identify Vite + tsconfig path alias drift
 * 5. Find duplicate/overlapping Express routers and API paths
 * 6. Detect cross-root imports that violate architecture boundaries
 * 7. Find default export name collisions that would break lazy routes
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const ROOT_DIR = path.resolve(__dirname, '..');
const IGNORE_DIRS = new Set(['node_modules', 'dist', 'build', '.git', '.next', 'coverage']);
const FRONTEND_INDICATORS = ['pages', 'components', 'App.tsx', 'App.jsx', 'main.tsx', 'main.jsx', 'index.tsx', 'index.jsx'];
const ROUTE_FILE_PATTERNS = [/\.tsx?$/, /\.jsx?$/];

interface AuditResult {
  summary: {
    timestamp: string;
    totalFiles: number;
    totalDirectories: number;
    potentialIssues: number;
  };
  frontendTrees: FrontendTree[];
  reactEntryPoints: ReactEntryPoint[];
  routingAnalysis: RoutingAnalysis;
  aliasConfigs: AliasConfig[];
  serverRoutes: ServerRouteAnalysis;
  crossRootImports: CrossRootImport[];
  exportCollisions: ExportCollision[];
  recommendations: string[];
}

interface FrontendTree {
  rootPath: string;
  type: 'primary' | 'duplicate' | 'legacy';
  structure: {
    pages: string[];
    components: string[];
    assets: string[];
    configs: string[];
  };
  entryPoints: string[];
  packageJsons: string[];
}

interface ReactEntryPoint {
  htmlFile: string;
  scriptSrc: string;
  rootElement: string;
  additionalScripts: string[];
}

interface RoutingAnalysis {
  routerLibrary: 'react-router-dom' | 'wouter' | 'next-router' | 'unknown';
  routeDefinitions: RouteDefinition[];
  routeFiles: string[];
  lazyRoutes: string[];
}

interface RouteDefinition {
  path: string;
  component: string;
  file: string;
  line: number;
  isLazy: boolean;
}

interface AliasConfig {
  file: string;
  type: 'vite' | 'tsconfig' | 'webpack';
  aliases: Record<string, string>;
}

interface ServerRouteAnalysis {
  routeFiles: string[];
  apiPaths: string[];
  duplicateRoutes: DuplicateRoute[];
  mountPoints: MountPoint[];
}

interface DuplicateRoute {
  path: string;
  files: string[];
  methods: string[];
}

interface MountPoint {
  file: string;
  path: string;
  router: string;
  line: number;
}

interface CrossRootImport {
  file: string;
  line: number;
  import: string;
  from: string;
  to: string;
  severity: 'error' | 'warning' | 'info';
}

interface ExportCollision {
  exportName: string;
  files: string[];
  type: 'default' | 'named';
}

class MonorepoAuditor {
  private result: AuditResult;
  private allFiles: string[] = [];
  private allDirectories: string[] = [];

  constructor() {
    this.result = {
      summary: {
        timestamp: new Date().toISOString(),
        totalFiles: 0,
        totalDirectories: 0,
        potentialIssues: 0,
      },
      frontendTrees: [],
      reactEntryPoints: [],
      routingAnalysis: {
        routerLibrary: 'unknown',
        routeDefinitions: [],
        routeFiles: [],
        lazyRoutes: [],
      },
      aliasConfigs: [],
      serverRoutes: {
        routeFiles: [],
        apiPaths: [],
        duplicateRoutes: [],
        mountPoints: [],
      },
      crossRootImports: [],
      exportCollisions: [],
      recommendations: [],
    };
  }

  async audit(): Promise<AuditResult> {
    console.log('🔍 Starting monorepo structure audit...');
    
    // Phase 1: Walk the filesystem
    await this.walkFilesystem(ROOT_DIR);
    
    // Phase 2: Analyze frontend trees
    await this.analyzeFrontendTrees();
    
    // Phase 3: Find React entry points
    await this.findReactEntryPoints();
    
    // Phase 4: Analyze routing
    await this.analyzeRouting();
    
    // Phase 5: Check alias configurations
    await this.checkAliasConfigs();
    
    // Phase 6: Analyze server routes
    await this.analyzeServerRoutes();
    
    // Phase 7: Find cross-root imports
    await this.findCrossRootImports();
    
    // Phase 8: Check export collisions
    await this.checkExportCollisions();
    
    // Phase 9: Generate recommendations
    this.generateRecommendations();
    
    // Update summary
    this.result.summary.totalFiles = this.allFiles.length;
    this.result.summary.totalDirectories = this.allDirectories.length;
    this.result.summary.potentialIssues = this.calculatePotentialIssues();
    
    return this.result;
  }

  private async walkFilesystem(dir: string, relativePath = ''): Promise<void> {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      
      const fullPath = path.join(dir, entry.name);
      const relativeFullPath = path.join(relativePath, entry.name);
      
      if (entry.isDirectory()) {
        this.allDirectories.push(relativeFullPath);
        await this.walkFilesystem(fullPath, relativeFullPath);
      } else {
        this.allFiles.push(relativeFullPath);
      }
    }
  }

  private async analyzeFrontendTrees(): Promise<void> {
    console.log('📂 Analyzing frontend trees...');
    
    const potentialTrees = new Map<string, FrontendTree>();
    
    // Look for directories with frontend indicators
    for (const dir of this.allDirectories) {
      const fullPath = path.join(ROOT_DIR, dir);
      
      try {
        const entries = await fs.promises.readdir(fullPath);
        const hasFrontendIndicators = entries.some(entry => 
          FRONTEND_INDICATORS.includes(entry)
        );
        
        if (hasFrontendIndicators) {
          const tree: FrontendTree = {
            rootPath: dir,
            type: this.determineFrontendTreeType(dir),
            structure: {
              pages: [],
              components: [],
              assets: [],
              configs: [],
            },
            entryPoints: [],
            packageJsons: [],
          };
          
          // Analyze structure
          await this.analyzeFrontendTreeStructure(tree, fullPath);
          potentialTrees.set(dir, tree);
        }
      } catch (error) {
        // Skip directories we can't read
      }
    }
    
    this.result.frontendTrees = Array.from(potentialTrees.values());
  }

  private determineFrontendTreeType(dir: string): 'primary' | 'duplicate' | 'legacy' {
    if (dir === 'client/src' || dir === 'src') return 'primary';
    if (dir.includes('legacy') || dir.includes('old')) return 'legacy';
    return 'duplicate';
  }

  private async analyzeFrontendTreeStructure(tree: FrontendTree, fullPath: string): Promise<void> {
    try {
      await this.scanDirectory(fullPath, '', tree.structure);
    } catch (error) {
      // Skip if we can't scan
    }
  }

  private async scanDirectory(dir: string, relativePath: string, structure: FrontendTree['structure']): Promise<void> {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      
      const fullPath = path.join(dir, entry.name);
      const relativeFullPath = path.join(relativePath, entry.name);
      
      if (entry.isDirectory()) {
        if (entry.name === 'pages') {
          const pages = await this.findFilesInDirectory(fullPath, /\.(tsx?|jsx?)$/);
          structure.pages.push(...pages.map(p => path.join(relativeFullPath, p)));
        } else if (entry.name === 'components') {
          const components = await this.findFilesInDirectory(fullPath, /\.(tsx?|jsx?)$/);
          structure.components.push(...components.map(c => path.join(relativeFullPath, c)));
        } else if (entry.name === 'assets' || entry.name === 'static') {
          const assets = await this.findFilesInDirectory(fullPath, /\.(png|jpg|jpeg|gif|svg|css|scss)$/);
          structure.assets.push(...assets.map(a => path.join(relativeFullPath, a)));
        }
        await this.scanDirectory(fullPath, relativeFullPath, structure);
      } else {
        if (/\.(json|config\.(js|ts)|\.config\.(js|ts))$/.test(entry.name)) {
          structure.configs.push(relativeFullPath);
        }
      }
    }
  }

  private async findFilesInDirectory(dir: string, pattern: RegExp): Promise<string[]> {
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      const files: string[] = [];
      
      for (const entry of entries) {
        if (entry.isFile() && pattern.test(entry.name)) {
          files.push(entry.name);
        } else if (entry.isDirectory() && !IGNORE_DIRS.has(entry.name)) {
          const subFiles = await this.findFilesInDirectory(path.join(dir, entry.name), pattern);
          files.push(...subFiles.map(f => path.join(entry.name, f)));
        }
      }
      
      return files;
    } catch {
      return [];
    }
  }

  private async findReactEntryPoints(): Promise<void> {
    console.log('🎯 Finding React entry points...');
    
    const htmlFiles = this.allFiles.filter(f => f.endsWith('.html'));
    
    for (const htmlFile of htmlFiles) {
      try {
        const content = await fs.promises.readFile(path.join(ROOT_DIR, htmlFile), 'utf-8');
        const entryPoint = this.parseHtmlForReactEntry(content, htmlFile);
        if (entryPoint) {
          this.result.reactEntryPoints.push(entryPoint);
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  }

  private parseHtmlForReactEntry(content: string, file: string): ReactEntryPoint | null {
    const rootMatch = content.match(/<div[^>]*id=["']([^"']+)["'][^>]*>/);
    const scriptMatch = content.match(/<script[^>]*src=["']([^"']*main\.[^"']*)["'][^>]*>/);
    
    if (!rootMatch || !scriptMatch) return null;
    
    const additionalScripts: string[] = [];
    const scriptMatches = content.matchAll(/<script[^>]*src=["']([^"']*)["'][^>]*>/g);
    for (const match of scriptMatches) {
      if (match[1] !== scriptMatch[1]) {
        additionalScripts.push(match[1]);
      }
    }
    
    return {
      htmlFile: file,
      scriptSrc: scriptMatch[1],
      rootElement: rootMatch[1],
      additionalScripts,
    };
  }

  private async analyzeRouting(): Promise<void> {
    console.log('🗺️ Analyzing routing configuration...');
    
    const routeFiles = this.allFiles.filter(f => 
      ROUTE_FILE_PATTERNS.some(pattern => pattern.test(f)) &&
      (f.includes('App.') || f.includes('Router') || f.includes('route'))
    );
    
    this.result.routingAnalysis.routeFiles = routeFiles;
    
    for (const file of routeFiles) {
      try {
        const content = await fs.promises.readFile(path.join(ROOT_DIR, file), 'utf-8');
        
        // Detect router library
        if (content.includes('react-router-dom')) {
          this.result.routingAnalysis.routerLibrary = 'react-router-dom';
        } else if (content.includes('wouter')) {
          this.result.routingAnalysis.routerLibrary = 'wouter';
        } else if (content.includes('next/router')) {
          this.result.routingAnalysis.routerLibrary = 'next-router';
        }
        
        // Extract route definitions
        const routes = this.extractRouteDefinitions(content, file);
        this.result.routingAnalysis.routeDefinitions.push(...routes);
        
        // Find lazy routes
        const lazyRoutes = this.extractLazyRoutes(content);
        this.result.routingAnalysis.lazyRoutes.push(...lazyRoutes);
        
      } catch (error) {
        // Skip files we can't read
      }
    }
  }

  private extractRouteDefinitions(content: string, file: string): RouteDefinition[] {
    const routes: RouteDefinition[] = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Wouter Route pattern
      const wouterMatch = line.match(/<Route\s+path=["']([^"']+)["']\s+component=\{([^}]+)\}/);
      if (wouterMatch) {
        routes.push({
          path: wouterMatch[1],
          component: wouterMatch[2],
          file,
          line: i + 1,
          isLazy: line.includes('lazy') || line.includes('Suspense'),
        });
      }
      
      // React Router Route pattern
      const reactRouterMatch = line.match(/<Route\s+path=["']([^"']+)["'][^>]*element=\{[^}]*<([^>\s]+)/);
      if (reactRouterMatch) {
        routes.push({
          path: reactRouterMatch[1],
          component: reactRouterMatch[2],
          file,
          line: i + 1,
          isLazy: line.includes('lazy') || line.includes('Suspense'),
        });
      }
    }
    
    return routes;
  }

  private extractLazyRoutes(content: string): string[] {
    const lazyRoutes: string[] = [];
    const lazyMatches = content.matchAll(/lazy\(\s*\(\)\s*=>\s*import\s*\(\s*["']([^"']+)["']\s*\)/g);
    
    for (const match of lazyMatches) {
      lazyRoutes.push(match[1]);
    }
    
    return lazyRoutes;
  }

  private async checkAliasConfigs(): Promise<void> {
    console.log('🔗 Checking alias configurations...');
    
    const configFiles = this.allFiles.filter(f => 
      f.includes('vite.config.') || 
      f.includes('tsconfig.json') || 
      f.includes('webpack.config.')
    );
    
    for (const file of configFiles) {
      try {
        const content = await fs.promises.readFile(path.join(ROOT_DIR, file), 'utf-8');
        const aliases = this.extractAliases(content, file);
        if (aliases) {
          this.result.aliasConfigs.push(aliases);
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  }

  private extractAliases(content: string, file: string): AliasConfig | null {
    let type: 'vite' | 'tsconfig' | 'webpack';
    
    if (file.includes('vite')) type = 'vite';
    else if (file.includes('tsconfig')) type = 'tsconfig';
    else if (file.includes('webpack')) type = 'webpack';
    else return null;
    
    const aliases: Record<string, string> = {};
    
    if (type === 'tsconfig') {
      try {
        const parsed = JSON.parse(content);
        if (parsed.compilerOptions?.paths) {
          for (const [alias, paths] of Object.entries(parsed.compilerOptions.paths)) {
            aliases[alias] = Array.isArray(paths) ? paths[0] : paths as string;
          }
        }
      } catch {
        return null;
      }
    } else {
      // Extract aliases from vite/webpack config (simplified)
      const aliasMatches = content.matchAll(/["']([^"']+)["']\s*:\s*path\.resolve\([^)]+,\s*["']([^"']+)["']/g);
      for (const match of aliasMatches) {
        aliases[match[1]] = match[2];
      }
    }
    
    return { file, type, aliases };
  }

  private async analyzeServerRoutes(): Promise<void> {
    console.log('🛣️ Analyzing server routes...');
    
    const serverFiles = this.allFiles.filter(f => 
      f.startsWith('server/') && 
      (f.endsWith('.ts') || f.endsWith('.js')) &&
      (f.includes('route') || f.includes('router') || f === 'server/index.ts')
    );
    
    this.result.serverRoutes.routeFiles = serverFiles;
    
    const apiPaths = new Set<string>();
    const mountPoints: MountPoint[] = [];
    const routesByPath = new Map<string, string[]>();
    
    for (const file of serverFiles) {
      try {
        const content = await fs.promises.readFile(path.join(ROOT_DIR, file), 'utf-8');
        
        // Extract API paths and mount points
        const paths = this.extractApiPaths(content, file);
        paths.forEach(p => apiPaths.add(p));
        
        const mounts = this.extractMountPoints(content, file);
        mountPoints.push(...mounts);
        
        // Track routes by path for duplicate detection
        for (const apiPath of paths) {
          if (!routesByPath.has(apiPath)) {
            routesByPath.set(apiPath, []);
          }
          routesByPath.get(apiPath)!.push(file);
        }
        
      } catch (error) {
        // Skip files we can't read
      }
    }
    
    this.result.serverRoutes.apiPaths = Array.from(apiPaths);
    this.result.serverRoutes.mountPoints = mountPoints;
    
    // Find duplicate routes
    for (const [path, files] of routesByPath) {
      if (files.length > 1) {
        this.result.serverRoutes.duplicateRoutes.push({
          path,
          files,
          methods: ['GET', 'POST', 'PUT', 'DELETE'], // Simplified
        });
      }
    }
  }

  private extractApiPaths(content: string, file: string): string[] {
    const paths: string[] = [];
    const methodPattern = /\.(get|post|put|delete|patch)\s*\(\s*["']([^"']+)["']/g;
    
    let match;
    while ((match = methodPattern.exec(content)) !== null) {
      paths.push(match[2]);
    }
    
    return paths;
  }

  private extractMountPoints(content: string, file: string): MountPoint[] {
    const mountPoints: MountPoint[] = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const mountMatch = line.match(/app\.use\s*\(\s*["']([^"']+)["']\s*,\s*([^)]+)\)/);
      
      if (mountMatch) {
        mountPoints.push({
          file,
          path: mountMatch[1],
          router: mountMatch[2],
          line: i + 1,
        });
      }
    }
    
    return mountPoints;
  }

  private async findCrossRootImports(): Promise<void> {
    console.log('🔄 Finding cross-root imports...');
    
    const tsFiles = this.allFiles.filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
    
    for (const file of tsFiles) {
      try {
        const content = await fs.promises.readFile(path.join(ROOT_DIR, file), 'utf-8');
        const imports = this.extractCrossRootImports(content, file);
        this.result.crossRootImports.push(...imports);
      } catch (error) {
        // Skip files we can't read
      }
    }
  }

  private extractCrossRootImports(content: string, file: string): CrossRootImport[] {
    const imports: CrossRootImport[] = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const importMatch = line.match(/import\s+[^"']*["']([^"']+)["']/);
      
      if (importMatch) {
        const importPath = importMatch[1];
        const severity = this.assessImportSeverity(file, importPath);
        
        if (severity !== 'info') {
          imports.push({
            file,
            line: i + 1,
            import: line.trim(),
            from: this.getFileRoot(file),
            to: this.getImportRoot(importPath),
            severity,
          });
        }
      }
    }
    
    return imports;
  }

  private getFileRoot(file: string): string {
    if (file.startsWith('client/')) return 'client';
    if (file.startsWith('server/')) return 'server';
    if (file.startsWith('shared/')) return 'shared';
    return 'root';
  }

  private getImportRoot(importPath: string): string {
    if (importPath.startsWith('../client/')) return 'client';
    if (importPath.startsWith('../server/')) return 'server';
    if (importPath.startsWith('../shared/')) return 'shared';
    if (importPath.startsWith('./')) return 'relative';
    if (importPath.startsWith('@/')) return 'alias';
    return 'external';
  }

  private assessImportSeverity(file: string, importPath: string): 'error' | 'warning' | 'info' {
    const fileRoot = this.getFileRoot(file);
    const importRoot = this.getImportRoot(importPath);
    
    // Server importing from client is problematic
    if (fileRoot === 'server' && importRoot === 'client') return 'error';
    
    // Client importing from server could be problematic
    if (fileRoot === 'client' && importRoot === 'server') return 'warning';
    
    // Cross-tree imports are worth noting
    if (fileRoot !== importRoot && importRoot !== 'external' && importRoot !== 'relative') {
      return 'warning';
    }
    
    return 'info';
  }

  private async checkExportCollisions(): Promise<void> {
    console.log('💥 Checking export collisions...');
    
    const jsFiles = this.allFiles.filter(f => 
      f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx')
    );
    
    const defaultExports = new Map<string, string[]>();
    const namedExports = new Map<string, string[]>();
    
    for (const file of jsFiles) {
      try {
        const content = await fs.promises.readFile(path.join(ROOT_DIR, file), 'utf-8');
        
        // Find default exports
        const defaultMatch = content.match(/export\s+default\s+(?:function\s+)?(\w+)/);
        if (defaultMatch) {
          const exportName = defaultMatch[1];
          if (!defaultExports.has(exportName)) {
            defaultExports.set(exportName, []);
          }
          defaultExports.get(exportName)!.push(file);
        }
        
        // Find named exports
        const namedMatches = content.matchAll(/export\s+(?:const|function|class)\s+(\w+)/g);
        for (const match of namedMatches) {
          const exportName = match[1];
          if (!namedExports.has(exportName)) {
            namedExports.set(exportName, []);
          }
          namedExports.get(exportName)!.push(file);
        }
        
      } catch (error) {
        // Skip files we can't read
      }
    }
    
    // Find collisions
    for (const [exportName, files] of defaultExports) {
      if (files.length > 1) {
        this.result.exportCollisions.push({
          exportName,
          files,
          type: 'default',
        });
      }
    }
    
    for (const [exportName, files] of namedExports) {
      if (files.length > 1) {
        this.result.exportCollisions.push({
          exportName,
          files,
          type: 'named',
        });
      }
    }
  }

  private generateRecommendations(): void {
    const recommendations: string[] = [];
    
    // Check for multiple frontend trees
    if (this.result.frontendTrees.length > 1) {
      const duplicates = this.result.frontendTrees.filter(t => t.type === 'duplicate');
      if (duplicates.length > 0) {
        recommendations.push(`❌ Found ${duplicates.length} duplicate frontend trees. Consider consolidating into a single client/src directory.`);
      }
    }
    
    // Check for multiple React entry points
    if (this.result.reactEntryPoints.length > 1) {
      recommendations.push(`❌ Found ${this.result.reactEntryPoints.length} React entry points. This can cause build conflicts.`);
    }
    
    // Check for alias drift
    const aliasConfigs = this.result.aliasConfigs;
    if (aliasConfigs.length > 1) {
      const aliasMap = new Map<string, Set<string>>();
      for (const config of aliasConfigs) {
        for (const [alias, target] of Object.entries(config.aliases)) {
          if (!aliasMap.has(alias)) aliasMap.set(alias, new Set());
          aliasMap.get(alias)!.add(target);
        }
      }
      
      for (const [alias, targets] of aliasMap) {
        if (targets.size > 1) {
          recommendations.push(`⚠️ Alias '${alias}' points to different targets: ${Array.from(targets).join(', ')}`);
        }
      }
    }
    
    // Check for duplicate routes
    if (this.result.serverRoutes.duplicateRoutes.length > 0) {
      recommendations.push(`❌ Found ${this.result.serverRoutes.duplicateRoutes.length} duplicate API routes. This can cause routing conflicts.`);
    }
    
    // Check for problematic cross-root imports
    const errorImports = this.result.crossRootImports.filter(i => i.severity === 'error');
    if (errorImports.length > 0) {
      recommendations.push(`❌ Found ${errorImports.length} problematic cross-root imports (server importing client code).`);
    }
    
    // Check for export collisions
    if (this.result.exportCollisions.length > 0) {
      recommendations.push(`⚠️ Found ${this.result.exportCollisions.length} export name collisions that could break lazy loading.`);
    }
    
    // Positive recommendations
    if (recommendations.length === 0) {
      recommendations.push('✅ No major structural issues detected. Architecture appears well-organized.');
    } else {
      recommendations.push('💡 Consider creating a monorepo structure document to prevent future architectural drift.');
    }
    
    this.result.recommendations = recommendations;
  }

  private calculatePotentialIssues(): number {
    return (
      Math.max(0, this.result.frontendTrees.length - 1) + // Extra frontend trees
      Math.max(0, this.result.reactEntryPoints.length - 1) + // Extra entry points
      this.result.serverRoutes.duplicateRoutes.length + // Duplicate routes
      this.result.crossRootImports.filter(i => i.severity === 'error').length + // Error imports
      this.result.exportCollisions.length // Export collisions
    );
  }
}

// Main execution
async function main() {
  const auditor = new MonorepoAuditor();
  const result = await auditor.audit();
  
  // Output results
  console.log('\n📊 AUDIT COMPLETE\n');
  console.log('='.repeat(60));
  
  // Summary
  console.log(`📈 Summary:`);
  console.log(`   Files scanned: ${result.summary.totalFiles}`);
  console.log(`   Directories: ${result.summary.totalDirectories}`);
  console.log(`   Potential issues: ${result.summary.potentialIssues}`);
  
  // Frontend Trees
  console.log(`\n🌳 Frontend Trees (${result.frontendTrees.length}):`);
  for (const tree of result.frontendTrees) {
    console.log(`   ${tree.type === 'primary' ? '✅' : '⚠️'} ${tree.rootPath} (${tree.type})`);
    console.log(`      Pages: ${tree.structure.pages.length}, Components: ${tree.structure.components.length}`);
  }
  
  // React Entry Points
  console.log(`\n🎯 React Entry Points (${result.reactEntryPoints.length}):`);
  for (const entry of result.reactEntryPoints) {
    console.log(`   📄 ${entry.htmlFile} → ${entry.scriptSrc} (#${entry.rootElement})`);
  }
  
  // Routing
  console.log(`\n🗺️ Routing Analysis:`);
  console.log(`   Router library: ${result.routingAnalysis.routerLibrary}`);
  console.log(`   Routes defined: ${result.routingAnalysis.routeDefinitions.length}`);
  console.log(`   Lazy routes: ${result.routingAnalysis.lazyRoutes.length}`);
  
  // Routes detail
  if (result.routingAnalysis.routeDefinitions.length > 0) {
    console.log(`\n   Route Table:`);
    for (const route of result.routingAnalysis.routeDefinitions) {
      console.log(`     ${route.path} → ${route.component} ${route.isLazy ? '(lazy)' : ''}`);
    }
  }
  
  // Alias Configurations
  console.log(`\n🔗 Alias Configurations (${result.aliasConfigs.length}):`);
  for (const config of result.aliasConfigs) {
    console.log(`   ${config.file} (${config.type}):`);
    for (const [alias, target] of Object.entries(config.aliases)) {
      console.log(`     ${alias} → ${target}`);
    }
  }
  
  // Server Routes
  console.log(`\n🛣️ Server Routes:`);
  console.log(`   Route files: ${result.serverRoutes.routeFiles.length}`);
  console.log(`   API paths: ${result.serverRoutes.apiPaths.length}`);
  console.log(`   Duplicate routes: ${result.serverRoutes.duplicateRoutes.length}`);
  
  if (result.serverRoutes.duplicateRoutes.length > 0) {
    console.log(`\n   Duplicate Routes:`);
    for (const dup of result.serverRoutes.duplicateRoutes) {
      console.log(`     ❌ ${dup.path} in ${dup.files.join(', ')}`);
    }
  }
  
  // Mount Points
  if (result.serverRoutes.mountPoints.length > 0) {
    console.log(`\n   Mount Points:`);
    for (const mount of result.serverRoutes.mountPoints) {
      console.log(`     ${mount.path} → ${mount.router} (${mount.file}:${mount.line})`);
    }
  }
  
  // Cross-Root Imports
  const problemImports = result.crossRootImports.filter(i => i.severity !== 'info');
  if (problemImports.length > 0) {
    console.log(`\n🔄 Problematic Cross-Root Imports (${problemImports.length}):`);
    for (const imp of problemImports) {
      const icon = imp.severity === 'error' ? '❌' : '⚠️';
      console.log(`   ${icon} ${imp.file}:${imp.line} - ${imp.from} → ${imp.to}`);
      console.log(`      ${imp.import}`);
    }
  }
  
  // Export Collisions
  if (result.exportCollisions.length > 0) {
    console.log(`\n💥 Export Collisions (${result.exportCollisions.length}):`);
    for (const collision of result.exportCollisions) {
      console.log(`   ❌ ${collision.exportName} (${collision.type}): ${collision.files.join(', ')}`);
    }
  }
  
  // Recommendations
  console.log(`\n💡 Recommendations:`);
  for (const recommendation of result.recommendations) {
    console.log(`   ${recommendation}`);
  }
  
  // Save results to file
  const outputPath = path.join(ROOT_DIR, 'audit-results.json');
  await fs.promises.writeFile(outputPath, JSON.stringify(result, null, 2));
  console.log(`\n📄 Detailed results saved to: ${outputPath}`);
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 Audit completed successfully!');
}

// Handle CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { MonorepoAuditor, type AuditResult };