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
import { createRequestLogger } from '../lib/log.js';

// Hardened column definitions - DO NOT CHANGE
const CORE_COLUMNS = [
  'id', 'name', 'is_business', 'brand_primary', 'brand_secondary', 
  'tags', 'status', 'is_archived', 'created_at', 'updated_at', 'logo_url'
];

const SETUP_COLUMNS = [
  'finance_email', 'setup_complete', 'setup_completed_at', 'tax_exempt_doc_key'
];

const ALL_COLUMNS = [...CORE_COLUMNS, ...SETUP_COLUMNS];

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
    
    const logger = createRequestLogger(req || { 
      method: 'GET', 
      url: '/api/organizations/service',
      headers: { 'user-agent': 'Organizations Service' }
    });
    
    try {
      logger.info('🏢 ORGANIZATIONS SERVICE - Listing organizations');
      logger.info('📋 Parameters:', params);
      
      // Build query with hardened column selection
      const columnsList = ALL_COLUMNS.join(', ');
      logger.info('🔍 Selecting columns:', columnsList);
      
      let query = supabaseAdmin
        .from('organizations')
        .select(columnsList);
      
      // Apply filters
      if (params.q && typeof params.q === 'string') {
        query = query.ilike('name', `%${params.q}%`);
        logger.info('🔎 Search filter applied:', params.q);
      }
      
      if (params.includeArchived !== 'true') {
        query = query.eq('is_archived', false);
        logger.info('📁 Excluding archived organizations');
      }
      
      // Apply sorting
      const sortColumn = params.sort === 'updated' ? 'updated_at' : 'name';
      const ascending = params.dir === 'asc';
      query = query.order(sortColumn, { ascending });
      logger.info('📊 Sorting by:', sortColumn, ascending ? 'ASC' : 'DESC');
      
      // Apply pagination
      const limit = params.limit || 24;
      const offset = params.offset || 0;
      query = query.range(offset, offset + limit - 1);
      logger.info('📄 Pagination:', { limit, offset });
      
      // Execute query
      const { data: organizations, error, count } = await query;
      
      if (error) {
        logger.error('❌ DATABASE QUERY FAILED:', error);
        return {
          success: false,
          error: 'Database query failed',
          details: error
        };
      }
      
      // Transform data using hardened mapping
      const transformedData = organizations?.map(org => this.transformOrganization(org, logger)) || [];
      
      logger.info('✅ ORGANIZATIONS RETRIEVED:', {
        count: transformedData.length,
        hasSetupData: transformedData.some(org => org.setupComplete !== null)
      });
      
      return {
        success: true,
        data: transformedData,
        count: transformedData.length
      };
      
    } catch (error: any) {
      logger.error('💥 SERVICE ERROR:', error);
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
  private static transformOrganization(dbRow: any, logger?: any): OrganizationData {
    if (logger) {
      logger.info('🔄 Transforming organization:', { id: dbRow.id, name: dbRow.name });
    }
    
    return {
      // Core fields (required)
      id: dbRow.id,
      name: dbRow.name,
      isBusiness: dbRow.is_business || false,
      brandPrimary: dbRow.brand_primary || '#6EE7F9',
      brandSecondary: dbRow.brand_secondary || '#A78BFA', 
      tags: dbRow.tags || [],
      status: dbRow.status || 'active',
      isArchived: dbRow.is_archived || false,
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at,
      logoUrl: dbRow.logo_url || null,
      
      // Setup fields (with safe defaults)
      setupComplete: dbRow.setup_complete !== undefined ? dbRow.setup_complete : null,
      financeEmail: dbRow.finance_email || null,
      setupCompletedAt: dbRow.setup_completed_at || null,
      taxExemptDocKey: dbRow.tax_exempt_doc_key || null
    };
  }
}