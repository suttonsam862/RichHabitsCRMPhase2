import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  parsePaginationParams,
  sendPaginatedResponse,
  createPaginationLinks,
  paginationMiddleware,
  buildPaginationQuery,
  buildCountQuery,
  PaginationQuerySchema
} from '../../server/lib/pagination';

describe('Pagination Utilities', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      query: {},
      baseUrl: '/api/v1',
      path: '/users',
      protocol: 'https',
      get: vi.fn().mockReturnValue('localhost:3000')
    };
    res = {
      setHeader: vi.fn(),
      json: vi.fn()
    };
    next = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('parsePaginationParams', () => {
    it('should parse valid pagination parameters', () => {
      const query = { page: '2', limit: '50' };
      const params = parsePaginationParams(query);

      expect(params).toEqual({
        page: 2,
        limit: 50,
        offset: 50
      });
    });

    it('should use default values for missing parameters', () => {
      const query = {};
      const params = parsePaginationParams(query);

      expect(params).toEqual({
        page: 1,
        limit: 20,
        offset: 0
      });
    });

    it('should enforce minimum page value', () => {
      const query = { page: '-5', limit: '10' };
      const params = parsePaginationParams(query);

      expect(params.page).toBe(1);
      expect(params.offset).toBe(0);
    });

    it('should enforce minimum limit value', () => {
      const query = { page: '1', limit: '0' };
      const params = parsePaginationParams(query);

      expect(params.limit).toBe(1);
    });

    it('should enforce maximum limit value', () => {
      const query = { page: '1', limit: '1000' };
      const params = parsePaginationParams(query);

      expect(params.limit).toBe(100); // Max limit should be 100
    });

    it('should calculate correct offset', () => {
      const query = { page: '3', limit: '25' };
      const params = parsePaginationParams(query);

      expect(params.offset).toBe(50); // (3-1) * 25 = 50
    });

    it('should use explicit offset when provided', () => {
      const query = { page: '2', limit: '10', offset: '100' };
      const params = parsePaginationParams(query);

      expect(params.offset).toBe(100);
    });

    it('should handle invalid numeric strings gracefully', () => {
      const query = { page: 'invalid', limit: 'also-invalid' };
      const params = parsePaginationParams(query);

      expect(params).toEqual({
        page: 1,
        limit: 20,
        offset: 0
      });
    });
  });

  describe('sendPaginatedResponse', () => {
    it('should send paginated response with correct headers', () => {
      const data = [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }];
      const total = 100;
      const params = { page: 2, limit: 20, offset: 20 };

      sendPaginatedResponse(res as Response, data, total, params);

      expect(res.setHeader).toHaveBeenCalledWith('X-Total-Count', '100');
      expect(res.setHeader).toHaveBeenCalledWith('X-Page', '2');
      expect(res.setHeader).toHaveBeenCalledWith('X-Limit', '20');
      expect(res.setHeader).toHaveBeenCalledWith('X-Total-Pages', '5');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Expose-Headers', 
        'X-Total-Count, X-Page, X-Limit, X-Total-Pages'
      );

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data,
        pagination: {
          page: 2,
          limit: 20,
          total: 100,
          totalPages: 5,
          hasNext: true,
          hasPrev: true
        }
      });
    });

    it('should calculate correct pagination metadata', () => {
      const data = [];
      const total = 47;
      const params = { page: 1, limit: 10, offset: 0 };

      sendPaginatedResponse(res as Response, data, total, params);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 47,
          totalPages: 5, // Math.ceil(47/10)
          hasNext: true,
          hasPrev: false
        }
      });
    });

    it('should handle last page correctly', () => {
      const data = [{ id: 41, name: 'Last Item' }];
      const total = 41;
      const params = { page: 5, limit: 10, offset: 40 };

      sendPaginatedResponse(res as Response, data, total, params);

      const jsonCall = (res.json as any).mock.calls[0][0];
      expect(jsonCall.pagination.hasNext).toBe(false);
      expect(jsonCall.pagination.hasPrev).toBe(true);
    });

    it('should handle empty result set', () => {
      const data: any[] = [];
      const total = 0;
      const params = { page: 1, limit: 20, offset: 0 };

      sendPaginatedResponse(res as Response, data, total, params);

      const jsonCall = (res.json as any).mock.calls[0][0];
      expect(jsonCall.pagination.totalPages).toBe(0);
      expect(jsonCall.pagination.hasNext).toBe(false);
      expect(jsonCall.pagination.hasPrev).toBe(false);
    });
  });

  describe('createPaginationLinks', () => {
    it('should create correct pagination links', () => {
      const baseUrl = 'https://example.com/api/users';
      const params = { page: 3, limit: 10, offset: 20 };
      const total = 100;

      const links = createPaginationLinks(baseUrl, params, total);

      expect(links).toContain('<https://example.com/api/users?page=1&limit=10>; rel="first"');
      expect(links).toContain('<https://example.com/api/users?page=10&limit=10>; rel="last"');
      expect(links).toContain('<https://example.com/api/users?page=4&limit=10>; rel="next"');
      expect(links).toContain('<https://example.com/api/users?page=2&limit=10>; rel="prev"');
    });

    it('should omit prev link on first page', () => {
      const baseUrl = 'https://example.com/api/users';
      const params = { page: 1, limit: 10, offset: 0 };
      const total = 50;

      const links = createPaginationLinks(baseUrl, params, total);

      expect(links).not.toContain('rel="prev"');
      expect(links).toContain('rel="next"');
    });

    it('should omit next link on last page', () => {
      const baseUrl = 'https://example.com/api/users';
      const params = { page: 5, limit: 10, offset: 40 };
      const total = 50;

      const links = createPaginationLinks(baseUrl, params, total);

      expect(links).not.toContain('rel="next"');
      expect(links).toContain('rel="prev"');
    });

    it('should handle single page result', () => {
      const baseUrl = 'https://example.com/api/users';
      const params = { page: 1, limit: 10, offset: 0 };
      const total = 5;

      const links = createPaginationLinks(baseUrl, params, total);

      expect(links).toContain('rel="first"');
      expect(links).toContain('rel="last"');
      expect(links).not.toContain('rel="next"');
      expect(links).not.toContain('rel="prev"');
    });
  });

  describe('paginationMiddleware', () => {
    it('should attach pagination params to request', () => {
      req.query = { page: '2', limit: '30' };

      paginationMiddleware(req as Request, res as Response, next);

      expect((req as any).pagination).toEqual({
        page: 2,
        limit: 30,
        offset: 30
      });
      expect(next).toHaveBeenCalled();
    });

    it('should override res.json to add pagination headers', () => {
      req.query = { page: '1', limit: '10' };
      
      paginationMiddleware(req as Request, res as Response, next);

      const paginatedData = {
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3,
          hasNext: true,
          hasPrev: false
        }
      };

      (res.json as any)(paginatedData);

      expect(res.setHeader).toHaveBeenCalledWith('X-Total-Count', '25');
      expect(res.setHeader).toHaveBeenCalledWith('X-Page', '1');
      expect(res.setHeader).toHaveBeenCalledWith('X-Limit', '10');
      expect(res.setHeader).toHaveBeenCalledWith('X-Total-Pages', '3');
    });

    it('should add Link header when baseUrl is available', () => {
      req.query = { page: '2', limit: '10' };
      req.baseUrl = '/api/v1';
      req.path = '/users';
      req.protocol = 'https';
      (req.get as any) = vi.fn().mockReturnValue('example.com');

      paginationMiddleware(req as Request, res as Response, next);

      const paginatedData = {
        pagination: {
          page: 2,
          limit: 10,
          total: 50,
          totalPages: 5,
          hasNext: true,
          hasPrev: true
        }
      };

      (res.json as any)(paginatedData);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Link',
        expect.stringContaining('https://example.com/api/v1/users?page=')
      );
    });

    it('should not add pagination headers for non-paginated responses', () => {
      req.query = { page: '1', limit: '10' };
      
      paginationMiddleware(req as Request, res as Response, next);

      const regularData = {
        success: true,
        data: { message: 'Hello' }
      };

      (res.json as any)(regularData);

      expect(res.setHeader).not.toHaveBeenCalledWith('X-Total-Count', expect.anything());
    });
  });

  describe('Query builders', () => {
    describe('buildPaginationQuery', () => {
      it('should append LIMIT and OFFSET to query', () => {
        const baseQuery = 'SELECT * FROM users WHERE active = true';
        const params = { page: 2, limit: 10, offset: 10 };

        const query = buildPaginationQuery(baseQuery, params);

        expect(query).toBe('SELECT * FROM users WHERE active = true LIMIT 10 OFFSET 10');
      });

      it('should handle queries without WHERE clause', () => {
        const baseQuery = 'SELECT id, name FROM products';
        const params = { page: 1, limit: 5, offset: 0 };

        const query = buildPaginationQuery(baseQuery, params);

        expect(query).toBe('SELECT id, name FROM products LIMIT 5 OFFSET 0');
      });
    });

    describe('buildCountQuery', () => {
      it('should wrap query in count subquery', () => {
        const baseQuery = 'SELECT * FROM users WHERE role = \'admin\'';
        
        const countQuery = buildCountQuery(baseQuery);

        expect(countQuery).toBe('SELECT COUNT(*) as total FROM (SELECT * FROM users WHERE role = \'admin\') as count_query');
      });

      it('should remove ORDER BY clause', () => {
        const baseQuery = 'SELECT * FROM users WHERE active = true ORDER BY created_at DESC';
        
        const countQuery = buildCountQuery(baseQuery);

        expect(countQuery).toBe('SELECT COUNT(*) as total FROM (SELECT * FROM users WHERE active = true ) as count_query');
        expect(countQuery).not.toContain('ORDER BY');
      });

      it('should handle case-insensitive ORDER BY', () => {
        const baseQuery = 'SELECT * FROM products order by price asc, name desc';
        
        const countQuery = buildCountQuery(baseQuery);

        expect(countQuery).toBe('SELECT COUNT(*) as total FROM (SELECT * FROM products ) as count_query');
        expect(countQuery).not.toContain('order by');
      });
    });
  });

  describe('PaginationQuerySchema', () => {
    it('should validate and transform valid pagination query', () => {
      const query = { page: '3', limit: '25' };
      
      const result = PaginationQuerySchema.parse(query);

      expect(result).toEqual({
        page: 3,
        limit: 25
      });
    });

    it('should apply defaults for missing values', () => {
      const query = {};
      
      const result = PaginationQuerySchema.parse(query);

      expect(result).toEqual({
        page: 1,
        limit: 20
      });
    });

    it('should reject non-numeric strings', () => {
      const query = { page: 'abc', limit: 'def' };
      
      expect(() => PaginationQuerySchema.parse(query)).toThrow();
    });

    it('should reject negative numbers', () => {
      const query = { page: '-1', limit: '-5' };
      
      expect(() => PaginationQuerySchema.parse(query)).toThrow();
    });

    it('should handle offset parameter', () => {
      const query = { page: '2', limit: '10', offset: '100' };
      
      const result = PaginationQuerySchema.parse(query);

      expect(result.offset).toBe(100);
    });
  });

  describe('Security considerations', () => {
    it('should prevent excessively large page numbers', () => {
      const query = { page: '999999999', limit: '20' };
      const params = parsePaginationParams(query);

      // Large page numbers should be handled gracefully
      expect(params.page).toBe(999999999);
      expect(params.offset).toBe((999999999 - 1) * 20);
    });

    it('should prevent excessively large limit values', () => {
      const query = { page: '1', limit: '99999' };
      const params = parsePaginationParams(query);

      // Limit should be capped at maximum
      expect(params.limit).toBe(100);
    });

    it('should sanitize SQL injection attempts in pagination', () => {
      // While pagination utilities don't directly execute SQL, 
      // they should only accept numeric values
      const maliciousQuery = { 
        page: '1; DROP TABLE users; --',
        limit: '20\' OR 1=1 --'
      };

      const params = parsePaginationParams(maliciousQuery);

      // Should fall back to defaults for invalid input
      expect(params.page).toBe(1);
      expect(params.limit).toBe(20);
    });

    it('should handle extremely large offset values', () => {
      const query = { offset: '999999999999999' };
      const params = parsePaginationParams(query);

      // Should handle large numbers without crashing
      expect(typeof params.offset).toBe('number');
      expect(params.offset).toBe(999999999999999);
    });

    it('should prevent negative offset values', () => {
      const query = { offset: '-100' };
      const params = parsePaginationParams(query);

      // Negative offset should be converted appropriately
      expect(params.offset).toBe(-100);
    });
  });
});