/**
 * Organizations API client with robust error handling
 */

import { z } from 'zod';

// API base URL from environment
const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

// Organization schema for validation
const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  logoUrl: z.string().optional(),
  titleCardUrl: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  addressLine1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  universalDiscounts: z.boolean().optional(),
});

const ListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(OrganizationSchema),
  count: z.number(),
  warning: z.string().optional(),
});

const ItemResponseSchema = z.object({
  success: z.boolean(),
  data: OrganizationSchema,
  warning: z.string().optional(),
});

const DeleteResponseSchema = z.object({
  success: z.boolean(),
  id: z.string(),
});

export type Organization = z.infer<typeof OrganizationSchema>;

class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

// Helper to format dates safely
export function formatDateSafe(dateString?: string): string {
  if (!dateString) return '—';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric', 
      year: 'numeric'
    }).format(date);
  } catch {
    return '—';
  }
}

async function makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
      throw new ApiError(`HTTP ${response.status}: ${response.statusText}`, response.status);
    }

    const contentType = response.headers.get('Content-Type');
    if (!contentType?.includes('application/json')) {
      throw new ApiError('Expected JSON response', response.status);
    }

    const text = await response.text();
    if (!text) {
      throw new ApiError('Empty response body', response.status);
    }

    return JSON.parse(text);
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

export interface ListOrganizationsParams {
  page?: number;
  pageSize?: number;
  q?: string;
  state?: string;
  type?: 'all' | 'business' | 'school';
  sort?: 'name' | 'created_at';
  order?: 'asc' | 'desc';
}

export async function listOrganizations(
  params: ListOrganizationsParams = {}
): Promise<{ data: Organization[]; count: number; warning?: string }> {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  const endpoint = `/organizations${queryString ? `?${queryString}` : ''}`;
  
  const response = await makeRequest<typeof ListResponseSchema._type>(endpoint);
  const validated = ListResponseSchema.parse(response);
  
  return {
    data: validated.data,
    count: validated.count,
    warning: validated.warning
  };
}

export async function getOrganization(id: string): Promise<Organization> {
  if (!id) {
    throw new ApiError('Organization ID is required', 400);
  }

  const response = await makeRequest<typeof ItemResponseSchema._type>(`/organizations/${id}`);
  const validated = ItemResponseSchema.parse(response);
  
  return validated.data;
}

export async function deleteOrganization(id: string): Promise<{ success: boolean; id: string }> {
  if (!id) {
    throw new ApiError('Organization ID is required', 400);
  }

  const response = await makeRequest<typeof DeleteResponseSchema._type>(`/organizations/${id}`, {
    method: 'DELETE',
  });
  
  const validated = DeleteResponseSchema.parse(response);
  
  return {
    success: validated.success,
    id: validated.id
  };
}

export { ApiError };