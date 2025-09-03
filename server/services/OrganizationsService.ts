/**
 * HARDENED ORGANIZATIONS SERVICE
 * 
 * This service provides a stable interface for organization operations.
 * DO NOT MODIFY the column definitions or field mappings without proper testing.
 * 
 * Required Database Columns (confirmed 2025-08-26):
 * - id, name, is_business, brand_primary, brand_secondary, tags, status, is_archived
 * - created_at, updated_at, logo_url
 * - finance_email, setup_complete, setup_completed_at, tax_exempt_doc_key
 */

import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { logger } from '../lib/log.js';
import { logSbError } from '../lib/dbLog.js';

// Hardened column definitions - DO NOT CHANGE
const CORE_COLUMNS = [
  'id', 'name', 'is_business', 'brand_primary', 'brand_secondary', 
  'tags', 'status', 'is_archived', 'created_at', 'updated_at', 'logo_url',
  'address', 'city', 'zip', 'phone', 'email'
];

// Setup columns re-enabled after cache fix
const SETUP_COLUMNS: string[] = ['setup_complete', 'finance_email', 'setup_completed_at', 'tax_exempt_doc_key'];

const ALL_COLUMNS = [...CORE_COLUMNS, ...SETUP_COLUMNS]; // Include setup fields

export interface OrganizationData {
  id: string;
  name: string;
  isBusiness: boolean;
  brandPrimary: string;
  brandSecondary: string;
  tags: string[];
  status: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  logoUrl: string | null;
  address?: string | null;
  city?: string | null;
  zip?: string | null;
  phone?: string | null;
  email?: string | null;
  // Setup fields
  setupComplete: boolean | null;
  financeEmail: string | null;
  setupCompletedAt: string | null;
  taxExemptDocKey: string | null;
}

export class OrganizationsService {

  /**
   * HARDENED METHOD: List organizations with all required fields
   * This method is designed to be resilient to database schema changes
   */
  static async listOrganizations(params: {
    q?: string;
    tag?: string;
    onlyFavorites?: string;
    includeArchived?: string;
    sort?: string;
    dir?: string;
    limit?: number;
    offset?: number;
  }, req?: any): Promise<{ success: boolean; data?: OrganizationData[]; count?: number; error?: string; details?: any }> {

    try {
      // Build query with hardened column selection
      const columnsList = ALL_COLUMNS.join(', ');

      let query = supabaseAdmin
        .from('organizations')
        .select(columnsList);

      // Apply filters
      if (params.q && typeof params.q === 'string') {
        query = query.ilike('name', `%${params.q}%`);
      }

      if (params.includeArchived !== 'true') {
        query = query.eq('is_archived', false);
      }

      // Apply sorting
      const sortColumn = params.sort === 'updated' ? 'updated_at' : 'name';
      const ascending = params.dir === 'asc';
      query = query.order(sortColumn, { ascending });

      // Apply pagination
      const limit = params.limit || 24;
      const offset = params.offset || 0;
      query = query.range(offset, offset + limit - 1);

      // Execute query
      const { data: organizations, error, count } = await query;

      if (error) {
        logSbError(req, 'orgs.service.list', error);
        return {
          success: false,
          error: 'Database query failed',
          details: error
        };
      }

      // Transform data using hardened mapping
      const transformedData = organizations?.map(org => this.transformOrganization(org)) || [];

      return {
        success: true,
        data: transformedData,
        count: transformedData.length
      };

    } catch (error: any) {
      logSbError(req, 'orgs.service.list.catch', error);
      return {
        success: false,
        error: 'Internal service error',
        details: error
      };
    }
  }

  /**
   * HARDENED METHOD: Transform database row to frontend format
   * Handles missing fields gracefully with sensible defaults
   */
  // Transform snake_case to camelCase for frontend consumption
  static transformOrganization(org: any): any {
    if (!org) return null;

    return {
      id: org.id,
      name: org.name,
      state: org.state,
      phone: org.phone,
      email: org.email,
      address: org.address,
      city: org.city,
      zip: org.zip,
      website: org.website,
      notes: org.notes,
      logoUrl: org.logo_url,
      brandPrimary: org.brand_primary,
      brandSecondary: org.brand_secondary,
      colorPalette: Array.isArray(org.color_palette) ? org.color_palette : [],
      gradientCss: org.gradient_css,
      isBusiness: org.is_business || false,
      isArchived: org.is_archived || false,
      tags: Array.isArray(org.tags) ? org.tags : [],
      setupComplete: org.setup_complete || false,
      setupCompletedAt: org.setup_completed_at,
      createdAt: org.created_at,
      updatedAt: org.updated_at
    };
  }

  static async getOrganizationById(id: string, req?: any): Promise<{ success: boolean; data?: OrganizationData; error?: string; details?: any }> {
    try {
      // Query organization by ID using only guaranteed columns
      const { data, error } = await supabaseAdmin
        .from('organizations')
        .select(ALL_COLUMNS.join(', '))
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - organization not found
          // Organization not found
          return { success: false, error: 'Organization not found' };
        }

        logSbError(req, 'orgs.service.getById', error);
        return { 
          success: false, 
          error: 'Database query failed',
          details: error
        };
      }

      if (!data) {
        // Organization not found
        return { success: false, error: 'Organization not found' };
      }

      // Organization found

      // Map database result to DTO using the existing transform method
      const mappedData = this.transformOrganization(data);

      return { success: true, data: mappedData };

    } catch (error: any) {
      logSbError(req, 'orgs.service.getById.catch', error);
      return { 
        success: false, 
        error: 'Service error',
        details: error.message
      };
    }
  }
}