/**
 * Typed API SDK for client-side API calls
 * Centralizes all API interactions with proper typing and validation
 */

import { z } from "zod";
import { API_BASE } from "./env";

// Base response schema
const baseResponseSchema = z.object({
  success: z.boolean().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});

// Organization schemas (from existing backend)
export const organizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z.string().optional(),
  website: z.string().optional(),
  logo_url: z.string().optional(),
  title_card_url: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Organization = z.infer<typeof organizationSchema>;

// List response wrapper
const listResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  baseResponseSchema.extend({
    data: z.array(itemSchema),
    count: z.number().optional(),
    total: z.number().optional(),
  });

// Single item response wrapper  
const itemResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  baseResponseSchema.extend({
    data: itemSchema,
  });

// Create organization payload
export const createOrganizationSchema = organizationSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type CreateOrganizationPayload = z.infer<typeof createOrganizationSchema>;

// API SDK class
export class ApiSDK {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  /**
   * Generic request method with error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    schema?: z.ZodSchema<T>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const response = await fetch(url, { ...defaultOptions, ...options });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // Validate response if schema provided
    if (schema) {
      try {
        return schema.parse(data);
      } catch (validationError) {
        console.error('API Response validation failed:', validationError);
        console.error('Raw response:', data);
        throw new Error('Invalid API response format');
      }
    }

    return data as T;
  }

  // Organizations API methods
  async getOrganizations(): Promise<Organization[]> {
    const response = await this.request(
      '/organizations',
      {},
      listResponseSchema(organizationSchema)
    );
    return response.data;
  }

  async getOrganization(id: string): Promise<Organization> {
    const response = await this.request(
      `/organizations/${id}`,
      {},
      itemResponseSchema(organizationSchema)
    );
    return response.data;
  }

  async createOrganization(payload: CreateOrganizationPayload): Promise<Organization> {
    const response = await this.request(
      '/organizations',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      itemResponseSchema(organizationSchema)
    );
    return response.data;
  }

  async updateOrganization(id: string, payload: Partial<CreateOrganizationPayload>): Promise<Organization> {
    const response = await this.request(
      `/organizations/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      itemResponseSchema(organizationSchema)
    );
    return response.data;
  }

  async deleteOrganization(id: string): Promise<void> {
    await this.request(`/organizations/${id}`, {
      method: 'DELETE',
    });
  }

  // Health check
  async healthCheck(): Promise<{ ok: boolean; db: string; orgs: number }> {
    return this.request('/health');
  }
}

// Default SDK instance
export const apiSDK = new ApiSDK();

// Legacy fetch replacements (commented for migration)
/*
// Replace these patterns:
// fetch("/api/organizations") -> apiSDK.getOrganizations()
// fetch(`/api/organizations/${id}`) -> apiSDK.getOrganization(id)
// fetch("/api/organizations", { method: "POST", body: JSON.stringify(data) }) -> apiSDK.createOrganization(data)
*/