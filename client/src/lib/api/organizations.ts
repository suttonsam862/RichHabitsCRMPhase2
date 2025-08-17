import { apiRequest } from "../queryClient";
import type { OrgCreate, OrgUpdate, OrgQueryParams, Org } from "../../../../shared/schemas/organization";

export interface OrganizationsResponse {
  items: Org[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Fetch organizations with filtering, sorting, and pagination
export async function fetchOrganizations(params?: OrgQueryParams): Promise<OrganizationsResponse> {
  const queryParams = new URLSearchParams();
  
  if (params) {
    if (params.q) queryParams.append('q', params.q);
    if (params.state) queryParams.append('state', params.state);
    if (params.type) queryParams.append('type', params.type);
    if (params.sort) queryParams.append('sort', params.sort);
    if (params.order) queryParams.append('order', params.order);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
  }
  
  const url = `/api/organizations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to fetch organizations');
  }
  
  return response.json();
}

// Create a new organization
export async function createOrganization(data: OrgCreate): Promise<{ ok: boolean; organization: Org }> {
  return apiRequest('/api/organizations', {
    method: 'POST',
    data: data,
  });
}

// Update an existing organization
export async function updateOrganization(id: string, data: OrgUpdate): Promise<{ ok: boolean; organization: Org }> {
  return apiRequest(`/api/organizations/${id}`, {
    method: 'PATCH',
    data: data,
  });
}

// Delete an organization
export async function deleteOrganization(id: string): Promise<void> {
  await apiRequest(`/api/organizations/${id}`, {
    method: 'DELETE',
  });
}

// Get a single organization
export async function fetchOrganization(id: string): Promise<Org> {
  const response = await fetch(`/api/organizations/${id}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch organization');
  }
  
  return response.json();
}

// Upload organization logo
export async function uploadOrganizationLogo(file: File): Promise<{ url: string; path: string; mime?: string; size?: number }> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/upload/logo', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json();
    // Check for field errors (validation errors)
    if (error.fieldErrors?.file) {
      throw new Error(error.fieldErrors.file);
    }
    throw new Error(error.error || 'Failed to upload logo');
  }
  
  return response.json();
}