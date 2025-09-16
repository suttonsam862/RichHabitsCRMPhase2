import { sb } from '../supabase';
// Using a simple type definition since the patch updated the schema
interface Organization {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  sports?: string[];
}
const BASE_URL = '/api/v1/organizations';
export const createOrganization = async (organizationData: Omit<Organization, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> & { sports?: string[] }): Promise<Organization> => {
  try {
    const token = (await sb?.auth.getSession())?.data.session?.access_token;
    if (!token) { throw new Error('Authentication token not found.'); }
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(organizationData),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create organization');
    }
    return await response.json();
  } catch (error) {
    throw error;
  }
};
export const getOrganizations = async (): Promise<Organization[]> => {
    try {
        const token = (await sb?.auth.getSession())?.data.session?.access_token;
        if (!token) { 
            console.error('Authentication token not found - user may not be logged in');
            throw new Error('Authentication token not found.'); 
        }
        
        console.log('Making API request with token:', token.substring(0, 20) + '...');
        
        const response = await fetch(BASE_URL, { 
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            } 
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('API Error:', response.status, errorData);
            throw new Error(errorData.message || 'Failed to fetch organizations');
        }
        
        const result = await response.json();
        console.log('Organizations fetched successfully:', result);
        return result.data || result; // Handle both formats
    } catch (error) {
        console.error('Error fetching organizations:', error);
        throw error;
    }
};