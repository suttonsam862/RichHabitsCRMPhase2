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
  'tags', 'status', 'is_archived', 'created_at', 'updated_at', 'logo_url'
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
      
      // Use direct PostgreSQL to bypass Supabase cache issues
      const { Pool } = await import('pg');
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      
      const whereConditions = [];
      const queryValues = [];
      let paramIndex = 1;
      
      if (params.q) {
        whereConditions.push(`name ILIKE $${paramIndex}`);
        queryValues.push(`%${params.q}%`);
        paramIndex++;
      }
      
      if (params.includeArchived !== 'true') {
        whereConditions.push(`is_archived = $${paramIndex}`);
        queryValues.push(false);
        paramIndex++;
      }
      
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      const sortColumn = params.sort === 'updated' ? 'updated_at' : 'name';
      const sortDirection = params.dir === 'asc' ? 'ASC' : 'DESC';
      const limit = params.limit || 24;
      const offset = params.offset || 0;
      
      const sqlQuery = `
        SELECT * FROM organizations 
        ${whereClause}
        ORDER BY ${sortColumn} ${sortDirection}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryValues.push(limit, offset);
      
      const result = await pool.query(sqlQuery, queryValues);
      const organizations = result.rows;
      await pool.end();
      
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
  private static transformOrganization(dbRow: any): OrganizationData {
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
      
      // Setup fields - read directly from database with fallback
      setupComplete: dbRow.setup_complete ?? false,
      financeEmail: dbRow.finance_email || null,
      setupCompletedAt: dbRow.setup_completed_at || null,
      taxExemptDocKey: dbRow.tax_exempt_doc_key || null
    };
  }

  static async getOrganizationById(id: string, req?: any): Promise<{ success: boolean; data?: OrganizationData; error?: string; details?: any }> {
    try {
      // Use direct PostgreSQL to get accurate data
      const { Pool } = await import('pg');
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      
      const result = await pool.query(
        'SELECT * FROM organizations WHERE id = $1',
        [id]
      );
      await pool.end();
      
      if (result.rows.length === 0) {
        return { success: false, error: 'Organization not found' };
      }

      // Map database result to DTO using the existing transform method
      const mappedData = this.transformOrganization(result.rows[0]);
      
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