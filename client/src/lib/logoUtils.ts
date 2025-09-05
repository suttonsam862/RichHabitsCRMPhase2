/**
 * Converts storage paths to displayable URLs for organization logos
 * Fixed to handle both full URLs and storage paths correctly
 */
export function getLogoDisplayUrl(logoUrl: string | undefined | null): string | null {
  if (!logoUrl) return null;
  
  // If it's already a full HTTP URL, return as-is (this handles the main case)
  if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
    console.log('Logo URL is already a full URL:', logoUrl);
    return logoUrl;
  }
  
  // If it's a storage path (starts with 'org/' or 'app/'), convert to Supabase public URL
  if (logoUrl.startsWith('org/') || logoUrl.startsWith('app/')) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      console.error('VITE_SUPABASE_URL environment variable not set');
      return null;
    }
    const displayUrl = `${supabaseUrl}/storage/v1/object/public/app/${logoUrl}`;
    console.log('Converting storage path to Supabase public URL:', logoUrl, '->', displayUrl);
    return displayUrl;
  }
  
  // For any other format, log a warning and return as-is
  console.warn('Unexpected logoUrl format, returning as-is:', logoUrl);
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