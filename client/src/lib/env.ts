/**
 * Client environment configuration
 * Note: Only VITE_ prefixed environment variables are available in the client
 */

// API base URL - defaults to /api for same-origin requests
export const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

// Other client environment variables
export const CLIENT_ENV = {
  API_BASE,
  NODE_ENV: import.meta.env.MODE || 'development',
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
} as const;

// Type-safe environment access
export type ClientEnv = typeof CLIENT_ENV;

// Debug logging in development
if (CLIENT_ENV.DEV) {
  console.log('🌐 Client Environment:', CLIENT_ENV);
}