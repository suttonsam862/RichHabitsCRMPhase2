/**
 * Typed API SDK for server communication
 * Centralizes all API calls with proper error handling and type safety
 */

import { z } from 'zod';
import { API_BASE } from './env';
import { OrganizationDTO } from '@shared/dtos/OrganizationDTO';

// API Response envelope schema
const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any(),
  count: z.number().optional(),
  message: z.string().optional(),
  warning: z.string().optional(),
  error: z.string().optional(),
});

type ApiResponse<T> = {
  success: boolean;
  data: T;
  count?: number;
  message?: string;
  warning?: string;
  error?: string;
};

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new ApiError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status
      );
    }

    const data = await response.json();
    
    // Validate response structure
    const parsed = ApiResponseSchema.safeParse(data);
    if (!parsed.success) {
      console.warn('Invalid API response format:', data);
      // Still return the data for compatibility
      return data;
    }

    return parsed.data as ApiResponse<T>;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      0
    );
  }
}

// Organizations API methods
export interface ListOrganizationsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  state?: string;
  type?: 'all' | 'business' | 'school';
  sort?: 'name' | 'created_at';
  order?: 'asc' | 'desc';
}

export async function listOrganizations(
  params: ListOrganizationsParams = {}
): Promise<{ data: OrganizationDTO[]; count: number; warning?: string }> {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  const endpoint = `/organizations${queryString ? `?${queryString}` : ''}`;
  
  const response = await apiRequest<OrganizationDTO[]>(endpoint);
  
  return {
    data: response.data || [],
    count: response.count || 0,
    warning: response.warning
  };
}

export async function getOrganization(id: string): Promise<OrganizationDTO> {
  const response = await apiRequest<OrganizationDTO>(`/organizations/${id}`);
  
  if (!response.success) {
    throw new ApiError(response.error || 'Failed to fetch organization', 404);
  }
  
  return response.data;
}

export async function createOrganization(data: Partial<OrganizationDTO>): Promise<OrganizationDTO> {
  const response = await apiRequest<OrganizationDTO>('/organizations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  
  if (!response.success) {
    throw new ApiError(response.error || 'Failed to create organization', 400);
  }
  
  return response.data;
}

export async function updateOrganization(
  id: string, 
  data: Partial<OrganizationDTO>
): Promise<OrganizationDTO> {
  const response = await apiRequest<OrganizationDTO>(`/organizations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  
  if (!response.success) {
    throw new ApiError(response.error || 'Failed to update organization', 400);
  }
  
  return response.data;
}

export async function deleteOrganization(id: string): Promise<void> {
  const response = await apiRequest<void>(`/organizations/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.success) {
    throw new ApiError(response.error || 'Failed to delete organization', 400);
  }
}

// Debug method to check available columns
export async function getOrganizationColumns(): Promise<{
  columns: string[];
  required: string[];
  optional: string[];
}> {
  const response = await apiRequest<{
    columns: string[];
    required: string[];
    optional: string[];
  }>('/organizations/__columns');
  return response.data;
}

// Users API methods
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListUsersParams {
  page?: number;
  pageSize?: number;
  q?: string;
}

export async function listUsers(
  params: ListUsersParams = {}
): Promise<{ data: User[]; count: number; warning?: string }> {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  const endpoint = `/users${queryString ? `?${queryString}` : ''}`;
  
  const response = await apiRequest<User[]>(endpoint);
  
  return {
    data: response.data || [],
    count: response.count || 0,
    warning: response.warning
  };
}

export async function getUser(id: string): Promise<User> {
  const response = await apiRequest<User>(`/users/${id}`);
  
  if (!response.success) {
    throw new ApiError(response.error || 'Failed to fetch user', 404);
  }
  
  return response.data;
}

// Export the main API client
export { apiRequest, ApiError };