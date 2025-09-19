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
export * from './PoDTO';

// Import FulfillmentDTO selectively to avoid conflicts with WorkOrder QualityCheck types
export {
  // Fulfillment DTOs (avoiding conflicts with WorkOrder QualityCheck types)
  FulfillmentEventDTO,
  CreateFulfillmentEventDTO,
  ShippingAddressDTO,
  PackageDimensionsDTO,
  ShippingInfoDTO,
  CreateShippingInfoDTO,
  UpdateShippingInfoDTO,
  CompletionRecordDTO,
  CreateCompletionRecordDTO,
  UpdateCompletionRecordDTO,
  FulfillmentMilestoneDTO,
  CreateFulfillmentMilestoneDTO,
  UpdateFulfillmentMilestoneDTO,
  StartFulfillmentDTO,
  ShipOrderDTO,
  DeliverOrderDTO,
  CompleteOrderDTO,
  FulfillmentStatusDTO,
  FulfillmentDashboardItemDTO,
  FulfillmentDashboardDTO,
  // Quality Check types with unique names to avoid conflicts with WorkOrder types
  QualityCheckDTO as FulfillmentQualityCheckDTO,
  CreateQualityCheckDTO as CreateFulfillmentQualityCheckDTO,
  UpdateQualityCheckDTO as UpdateFulfillmentQualityCheckDTO,
  // Types
  type FulfillmentEventType,
  type CreateFulfillmentEventType,
  type ShippingAddressType,
  type PackageDimensionsType,
  type ShippingInfoType,
  type CreateShippingInfoType,
  type UpdateShippingInfoType,
  type QualityCheckType as FulfillmentQualityCheckType,
  type CreateQualityCheckType as CreateFulfillmentQualityCheckType,
  type UpdateQualityCheckType as UpdateFulfillmentQualityCheckType,
  type CompletionRecordType,
  type CreateCompletionRecordType,
  type UpdateCompletionRecordType,
  type FulfillmentMilestoneType,
  type CreateFulfillmentMilestoneType,
  type UpdateFulfillmentMilestoneType,
  type StartFulfillmentType,
  type ShipOrderType,
  type DeliverOrderType,
  type CompleteOrderType,
  type FulfillmentStatusType,
  type FulfillmentDashboardItemType,
  type FulfillmentDashboardType,
  // Constants
  FULFILLMENT_EVENT_CODES,
  FULFILLMENT_MILESTONE_CODES,
  FULFILLMENT_STATUS_CODES,
  SHIPPING_STATUS_CODES,
  FULFILLMENT_STATUS_TRANSITIONS,
  canTransitionFulfillmentStatus,
  getDefaultFulfillmentMilestones
} from './FulfillmentDTO';

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