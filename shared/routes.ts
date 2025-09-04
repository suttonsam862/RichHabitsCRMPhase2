/**
 * COMPREHENSIVE ROUTE DEFINITIONS
 * 
 * This file centralizes all route definitions to prevent confusion between:
 * - API routes (business logic): /api/v1/...
 * - Object Storage routes (file operations): /objects/..., /public-objects/...
 * 
 * CRITICAL: Always import and use these constants instead of hardcoding paths
 */

// =============================================================================
// API ROUTES - Business Logic & CRUD Operations
// =============================================================================

export const API_ROUTES = {
  // Base API prefix
  BASE: '/api/v1',
  
  // Organizations API
  ORGANIZATIONS: {
    BASE: '/api/v1/organizations',
    LIST: '/api/v1/organizations',
    CREATE: '/api/v1/organizations',
    BY_ID: (id: string) => `/api/v1/organizations/${id}`,
    UPDATE: (id: string) => `/api/v1/organizations/${id}`,
    DELETE: (id: string) => `/api/v1/organizations/${id}`,
    SETUP: (id: string) => `/api/v1/organizations/${id}/setup`,
    TEAMS: (id: string) => `/api/v1/organizations/${id}/teams`,
    SPORTS: (id: string) => `/api/v1/organizations/${id}/sports`,
    USERS: (id: string) => `/api/v1/organizations/${id}/users`,
  },
  
  // Teams API
  TEAMS: {
    BASE: '/api/v1/teams',
    LIST: '/api/v1/teams',
    CREATE: '/api/v1/teams',
    BY_ID: (id: string) => `/api/v1/teams/${id}`,
    UPDATE: (id: string) => `/api/v1/teams/${id}`,
    DELETE: (id: string) => `/api/v1/teams/${id}`,
  },
  
  // Sports API  
  SPORTS: {
    BASE: '/api/v1/sports',
    LIST: '/api/v1/sports',
    CREATE: '/api/v1/sports',
    BY_ID: (id: string) => `/api/v1/sports/${id}`,
    UPDATE: (id: string) => `/api/v1/sports/${id}`,
    DELETE: (id: string) => `/api/v1/sports/${id}`,
  },
  
  // Users API
  USERS: {
    BASE: '/api/v1/users',
    LIST: '/api/v1/users',
    CREATE: '/api/v1/users',
    BY_ID: (id: string) => `/api/v1/users/${id}`,
    UPDATE: (id: string) => `/api/v1/users/${id}`,
    DELETE: (id: string) => `/api/v1/users/${id}`,
    PROFILE: '/api/v1/users/profile',
  },
} as const;

// =============================================================================
// OBJECT STORAGE ROUTES - File Upload & Serving
// =============================================================================

export const STORAGE_ROUTES = {
  // Upload endpoints (for getting signed URLs)
  UPLOAD: {
    // General object upload (used by ObjectUploader)
    OBJECTS: '/objects/upload',
    // Legacy endpoints (if any components still use these)
    LOGOS: '/logos/upload',
  },
  
  // File serving endpoints
  SERVE: {
    // Public objects (no auth required)
    PUBLIC_OBJECTS: (path: string) => `/public-objects/${path}`,
    // Private objects (auth required) 
    OBJECTS: (path: string) => `/objects/${path}`,
    // Legacy logo serving
    LOGOS: (orgId: string) => `/organizations/${orgId}/logo`,
  },
  
  // Raw paths for backend route registration
  RAW: {
    UPLOAD_OBJECTS: '/objects/upload',
    SERVE_PUBLIC_OBJECTS: '/public-objects/*',
    SERVE_OBJECTS: '/objects/*',
    SERVE_LOGOS: '/organizations/:id/logo',
  },
} as const;

// =============================================================================
// FRONTEND ROUTES - React Router Paths
// =============================================================================

export const FRONTEND_ROUTES = {
  HOME: '/',
  ORGANIZATIONS: {
    LIST: '/organizations',
    NEW: '/organizations/new',
    DETAIL: (id: string) => `/organizations/${id}`,
    EDIT: (id: string) => `/organizations/${id}/edit`,
    SETUP: (id: string) => `/organizations/${id}/setup`,
    TEAMS: (id: string) => `/organizations/${id}/teams`,
  },
  TEAMS: {
    LIST: '/teams',
    NEW: '/teams/new', 
    DETAIL: (id: string) => `/teams/${id}`,
    EDIT: (id: string) => `/teams/${id}/edit`,
  },
  SPORTS: {
    LIST: '/sports',
    ADMIN: '/sports/admin',
  },
  USERS: {
    LIST: '/users',
    PROFILE: '/profile',
  },
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Build API URL with optional query parameters
 */
export function buildApiUrl(path: string, params?: Record<string, string | number | boolean>): string {
  if (!params) return path;
  
  const url = new URL(path, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });
  
  return url.pathname + url.search;
}

/**
 * Build object storage URL for serving files
 */
export function buildStorageUrl(objectPath: string, isPublic: boolean = true): string {
  // Remove leading slash if present
  const cleanPath = objectPath.startsWith('/') ? objectPath.slice(1) : objectPath;
  
  if (isPublic) {
    return STORAGE_ROUTES.SERVE.PUBLIC_OBJECTS(cleanPath);
  } else {
    return STORAGE_ROUTES.SERVE.OBJECTS(cleanPath);
  }
}

/**
 * Extract object path from storage URL
 */
export function extractObjectPath(storageUrl: string): string {
  // Handle both public and private object URLs
  if (storageUrl.startsWith('/public-objects/')) {
    return storageUrl.replace('/public-objects/', '');
  } else if (storageUrl.startsWith('/objects/')) {
    return storageUrl.replace('/objects/', '');
  } else if (storageUrl.startsWith('/api/public-objects/')) {
    return storageUrl.replace('/api/public-objects/', '');
  } else if (storageUrl.startsWith('/api/objects/')) {
    return storageUrl.replace('/api/objects/', '');
  }
  
  return storageUrl;
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type ApiRoute = typeof API_ROUTES;
export type StorageRoute = typeof STORAGE_ROUTES;  
export type FrontendRoute = typeof FRONTEND_ROUTES;