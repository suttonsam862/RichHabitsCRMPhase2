/**
 * Client environment configuration
 * Provides API base URL for server communication
 */

export const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

// For debugging purposes
console.log('Client API_BASE:', API_BASE);