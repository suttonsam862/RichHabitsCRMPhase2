/**
 * Converts storage paths to displayable URLs for organization logos
 */
export function getLogoDisplayUrl(logoUrl: string | undefined | null): string | null {
  if (!logoUrl) return null;
  
  // If it's already a full HTTP URL, return as-is
  if (logoUrl.startsWith('http')) return logoUrl;
  
  // If it's a storage path (starts with 'org/' or 'app/'), convert to Supabase public URL
  if (logoUrl.startsWith('org/') || logoUrl.startsWith('app/')) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const displayUrl = `${supabaseUrl}/storage/v1/object/public/app/${logoUrl}`;
    console.log('Converting storage path to Supabase public URL:', logoUrl, '->', displayUrl);
    return displayUrl;
  }
  
  // For any other format, return as-is
  return logoUrl;
}

/**
 * Legacy function maintained for backward compatibility
 * @deprecated Use getLogoDisplayUrl instead for direct Supabase URLs
 */
export function getLogoUrl(organizationId: string, logoUrl?: string | null): string {
  const displayUrl = getLogoDisplayUrl(logoUrl);
  if (displayUrl) return displayUrl;
  
  // Fallback to API endpoint for null/empty logos
  return `/api/v1/organizations/${organizationId}/logo`;
}