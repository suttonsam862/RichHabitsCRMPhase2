/**
 * Frontend Canonicalization Guard
 * 
 * This file establishes client/src as the single canonical React application root.
 * It prevents split-brain architecture by marking this as the authoritative frontend tree.
 * 
 * DO NOT IMPORT FROM TOP-LEVEL ./src - USE ONLY client/src
 */

export const CANONICAL_ROOT = "client/src" as const;

/**
 * Compile-time check to ensure we're in the canonical frontend tree.
 * This will help catch any accidental imports from legacy ./src locations.
 */
export function ensureCanonicalRoot() {
  // This function should only be called from within client/src
  const currentPath = __filename || import.meta.url;
  if (!currentPath.includes('/client/src/')) {
    throw new Error(
      `[CANONICAL_ROOT_VIOLATION] Code executed outside canonical frontend tree. ` +
      `Expected: client/src/, Actual: ${currentPath}`
    );
  }
  return CANONICAL_ROOT;
}

/**
 * Type-level enforcement for canonical imports.
 * Use this type to document functions that should only receive 
 * imports from the canonical tree.
 */
export type CanonicalImport<T> = T & { __canonical: typeof CANONICAL_ROOT };

/**
 * Runtime validator for ensuring imports come from canonical tree.
 * Use in development to catch cross-root imports.
 */
export function validateCanonicalImport(modulePath: string): void {
  if (process.env.NODE_ENV === 'development') {
    // Check for imports from legacy ./src that bypass the canonical tree
    const problematicPatterns = [
      /^\.\.\/\.\.\/src\//,  // ../../src/
      /^\.\.\/src\//,        // ../src/
      /^\.\/src\//,          // ./src/ (if called from wrong location)
    ];
    
    for (const pattern of problematicPatterns) {
      if (pattern.test(modulePath)) {
        console.error(
          `[CANONICAL_ROOT_VIOLATION] Import from legacy src detected: ${modulePath}\n` +
          `All imports should use the canonical client/src tree or @/ aliases.`
        );
        
        // In development, this should fail builds
        if (process.env.VITE_STRICT_CANONICAL === 'true') {
          throw new Error(`Canonical root violation: ${modulePath}`);
        }
      }
    }
  }
}

// Export metadata for tooling
export const CANONICALIZATION_META = {
  migrationDate: '2025-08-20',
  auditToolUsed: 'scripts/audit-structure.ts',
  legacyArchiveLocation: 'client/_legacy/',
  enforceStrictMode: process.env.VITE_STRICT_CANONICAL === 'true',
} as const;