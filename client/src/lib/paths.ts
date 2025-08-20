/**
 * Centralized path definitions for type-safe navigation
 * Import these instead of using string literals in navigation
 */

export const paths = {
  home: "/",
  organizations: "/organizations",
  org: (id: string) => `/organizations/${id}`,
  users: "/users",
  quotes: "/quote",
  quoteHistory: "/quotes/history",
  orders: (id: string) => `/orders/${id}`,
  // Future routes
  designs: "/designs",
  ordersAll: "/orders",
  // Print/export routes (no app chrome)
  quotePrint: (id: string) => `/quote/${id}/print`,
  quoteExport: (id: string) => `/quote/${id}/export`,
} as const;

// Helper for building paths with query params
export function buildPath(basePath: string, params?: Record<string, string>) {
  if (!params) return basePath;
  
  const searchParams = new URLSearchParams(params);
  return `${basePath}?${searchParams.toString()}`;
}

// Navigation helpers
export const navigate = {
  home: () => paths.home,
  organizations: () => paths.organizations,
  org: (id: string) => paths.org(id),
  users: () => paths.users,
  quotes: () => paths.quotes,
  quoteHistory: () => paths.quoteHistory,
  orders: (id: string) => paths.orders(id),
  quotePrint: (id: string) => paths.quotePrint(id),
  quoteExport: (id: string) => paths.quoteExport(id),
};