/**
 * Utility function to get the correct logo URL for an organization
 * Uses the dedicated logo endpoint which handles Supabase storage and fallbacks
 */
export function getLogoUrl(organizationId: string, logoUrl?: string | null): string {
  // For empty/null logoUrl, always use the dedicated endpoint which provides fallback
  if (!logoUrl) {
    return `/api/v1/organizations/${organizationId}/logo`;
  }
  
  // For full HTTP URLs, use them directly  
  if (logoUrl.startsWith('http')) {
    return logoUrl;
  }
  
  // For relative paths, use the dedicated logo endpoint which handles Supabase lookup
  return `/api/v1/organizations/${organizationId}/logo`;
}