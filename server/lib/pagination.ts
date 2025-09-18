// Phase 3 API-2: Standard pagination utilities with X-Total-Count header
import { Request, Response } from 'express';
import { z } from 'zod';

// Pagination query schema
export const PaginationQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
  offset: z.string().regex(/^\d+$/).transform(Number).optional()
});

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Parse pagination params from request query
export function parsePaginationParams(query: any): PaginationParams {
  const page = Math.max(1, parseInt(query.page || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20')));
  const offset = query.offset ? parseInt(query.offset) : (page - 1) * limit;
  
  return { page, limit, offset };
}

// Add X-Total-Count header and pagination metadata
export function sendPaginatedResponse<T>(
  res: Response, 
  data: T[], 
  total: number, 
  params: PaginationParams
): Response {
  const totalPages = Math.ceil(total / params.limit);
  const hasNext = params.page < totalPages;
  const hasPrev = params.page > 1;
  
  // Set X-Total-Count header for client-side pagination
  res.setHeader('X-Total-Count', total.toString());
  res.setHeader('X-Page', params.page.toString());
  res.setHeader('X-Limit', params.limit.toString());
  res.setHeader('X-Total-Pages', totalPages.toString());
  
  // Allow client to read custom headers
  res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count, X-Page, X-Limit, X-Total-Pages');
  
  return res.json({
    success: true,
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNext,
      hasPrev
    }
  });
}

// Create pagination links for Link header (RFC 5988)
export function createPaginationLinks(
  baseUrl: string,
  params: PaginationParams,
  total: number
): string {
  const links: string[] = [];
  const totalPages = Math.ceil(total / params.limit);
  
  // First page
  links.push(`<${baseUrl}?page=1&limit=${params.limit}>; rel="first"`);
  
  // Last page
  if (totalPages > 0) {
    links.push(`<${baseUrl}?page=${totalPages}&limit=${params.limit}>; rel="last"`);
  }
  
  // Next page
  if (params.page < totalPages) {
    links.push(`<${baseUrl}?page=${params.page + 1}&limit=${params.limit}>; rel="next"`);
  }
  
  // Previous page
  if (params.page > 1) {
    links.push(`<${baseUrl}?page=${params.page - 1}&limit=${params.limit}>; rel="prev"`);
  }
  
  return links.join(', ');
}

// Middleware to add pagination to response
export function paginationMiddleware(req: Request, res: Response, next: any) {
  const params = parsePaginationParams(req.query);
  
  // Attach pagination params to request
  (req as any).pagination = params;
  
  // Override res.json to automatically add pagination headers if response contains pagination data
  const originalJson = res.json.bind(res);
  res.json = function(data: any) {
    if (data && data.pagination && typeof data.pagination.total === 'number') {
      res.setHeader('X-Total-Count', data.pagination.total.toString());
      res.setHeader('X-Page', data.pagination.page.toString());
      res.setHeader('X-Limit', data.pagination.limit.toString());
      res.setHeader('X-Total-Pages', data.pagination.totalPages.toString());
      res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count, X-Page, X-Limit, X-Total-Pages');
      
      // Add Link header if baseUrl is available
      if (req.baseUrl && req.path) {
        const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`;
        const links = createPaginationLinks(baseUrl, params, data.pagination.total);
        res.setHeader('Link', links);
      }
    }
    return originalJson(data);
  };
  
  next();
}

// SQL query builders for pagination
export function buildPaginationQuery(baseQuery: string, params: PaginationParams): string {
  return `${baseQuery} LIMIT ${params.limit} OFFSET ${params.offset}`;
}

export function buildCountQuery(baseQuery: string): string {
  // Remove ORDER BY clause if present
  const withoutOrderBy = baseQuery.replace(/ORDER BY.*$/i, '');
  return `SELECT COUNT(*) as total FROM (${withoutOrderBy}) as count_query`;
}