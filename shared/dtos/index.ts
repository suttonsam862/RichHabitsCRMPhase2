/**
 * Shared DTOs (Data Transfer Objects) for client-server communication
 * These schemas ensure type consistency between frontend and backend
 */

// Re-export all DTOs from individual modules
export * from './OrganizationDTO';
export * from './UserDTO';
export * from './LeadDTO';
export * from './DesignJobDTO';
export * from './WorkOrderDTO';
// export * from './ProductDTO';
export * from './OrderDTO';
// export * from './PoDTO';

// Common response wrappers
import { z } from "zod";

export const BaseResponseSchema = z.object({
  success: z.boolean().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
  timestamp: z.string().optional(),
});

export const ListResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  BaseResponseSchema.extend({
    data: z.array(itemSchema),
    count: z.number().optional(),
    total: z.number().optional(),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      totalPages: z.number(),
    }).optional(),
  });

export const ItemResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  BaseResponseSchema.extend({
    data: itemSchema,
  });

export type BaseResponse = z.infer<typeof BaseResponseSchema>;
export type ListResponse<T> = BaseResponse & {
  data: T[];
  count?: number;
  total?: number;
  pagination?: {
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type ItemResponse<T> = BaseResponse & {
  data: T;
};