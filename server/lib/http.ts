import { Response } from 'express';

/**
 * Standardized API response shapes as per CR requirements:
 * {success: boolean, data?: T, count?: number, error?: {code, message, details?}}
 */

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  count?: number;
  error?: ApiError;
}

export function sendOk(res: any, data?: any, count?: any) {
  const body = count !== undefined ? { success:true, data, count } : { success:true, data };
  return res.status(200).json(body);
}
export function sendCreated(res: any, data?: any) { return res.status(201).json({ success:true, data }); }
export function sendNoContent(res: any) { return res.status(204).send(); }
export function sendErr(
  res: Response,
  error: string,
  message?: string,
  details?: any,
  status?: number
) {
  // Default to 400 unless explicitly overridden (unit tests expect this)
  const httpStatus = typeof status === 'number' ? status : 400;
  return res.status(httpStatus).json({
    success: false,
    error,
    message,
    details,
    timestamp: new Date().toISOString(),
  });
}
);
}

/**
 * Send standardized success response
 */
export function sendSuccess(res: Response, data?: any, count?: number, status = 200) {
  const body: any = { success: true, data };
  if (typeof count === 'number') body.count = count;
  return res.status(status).json(body);
}
/**
 * Send standardized error response
 */
export function sendError(
  res: Response,
  code: string,
  message: string,
  details?: any,
  status: number = 400
): void {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined && { details })
    }
  };
  res.status(status).json(response);
}

/**
 * Common error response helpers
 */
export const HttpErrors = {
  badRequest: (res: Response, message: string, details?: any) => 
    sendError(res, 'BAD_REQUEST', message, details, 400),

  unauthorized: (res: Response, message: string = 'Unauthorized', details?: any) => 
    sendError(res, 'UNAUTHORIZED', message, details, 401),

  forbidden: (res: Response, message: string = 'Forbidden', details?: any) => 
    sendError(res, 'FORBIDDEN', message, details, 403),

  notFound: (res: Response, message: string = 'Not found', details?: any) => 
    sendError(res, 'NOT_FOUND', message, details, 404),

  conflict: (res: Response, message: string, details?: any) => 
    sendError(res, 'CONFLICT', message, details, 409),

  validationError: (res: Response, message: string, details?: any) => 
    sendError(res, 'VALIDATION_ERROR', message, details, 422),

  internalError: (res: Response, message: string = 'Internal server error', details?: any) => 
    sendError(res, 'INTERNAL_ERROR', message, details, 500),

  notImplemented: (res: Response, message: string = 'Not implemented', details?: any) => 
    sendError(res, 'NOT_IMPLEMENTED', message, details, 501)
};

/**
 * Helper for mapping database errors to API responses
 */
export function handleDatabaseError(res: Response, error: any, operation: string = 'operation'): void {
  console.error(`Database error during ${operation}:`, error);

  if (error instanceof Error) {
    if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
      return HttpErrors.conflict(res, `Resource already exists`, { operation });
    }

    if (error.message.includes('invalid input syntax') || error.message.includes('invalid UUID')) {
      return HttpErrors.badRequest(res, 'Invalid data format', { operation, details: error.message });
    }

    if (error.message.includes('foreign key') || error.message.includes('violates')) {
      return HttpErrors.badRequest(res, 'Data constraint violation', { operation, details: error.message });
    }
  }

  return HttpErrors.internalError(res, `Failed to complete ${operation}`, { 
    message: error instanceof Error ? error.message : 'Unknown error' 
  });
}

/**
 * Helper for validating and mapping DTO fields to database fields
 */
export function mapDtoToDb(dto: Record<string, any>, mapping: Record<string, string>): Record<string, any> {
  const mapped: Record<string, any> = {};

  for (const [dtoKey, dbKey] of Object.entries(mapping)) {
    if (dto[dtoKey] !== undefined) {
      mapped[dbKey] = dto[dtoKey];
    }
  }

  return mapped;
}

/**
 * Helper for mapping database fields to DTO fields
 */
export function mapDbToDto(dbRow: Record<string, any>, mapping: Record<string, string>): Record<string, any> {
  const mapped: Record<string, any> = {};

  for (const [dtoKey, dbKey] of Object.entries(mapping)) {
    if (dbRow[dbKey] !== undefined) {
      mapped[dtoKey] = dbRow[dbKey];
    }
  }

  return mapped;
}