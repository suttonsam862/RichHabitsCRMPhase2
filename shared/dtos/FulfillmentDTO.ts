import { z } from "zod";

/**
 * Fulfillment & Order Completion DTOs
 * Comprehensive schemas for fulfillment workflow management
 */

// Fulfillment Events
export const FulfillmentEventDTO = z.object({
  id: z.string(),
  orgId: z.string(),
  orderId: z.string(),
  orderItemId: z.string().optional(),
  workOrderId: z.string().optional(),
  eventCode: z.string(),
  eventType: z.string().default('status_change'),
  statusBefore: z.string().optional(),
  statusAfter: z.string().optional(),
  actorUserId: z.string().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.string(),
});

export const CreateFulfillmentEventDTO = FulfillmentEventDTO.omit({
  id: true,
  createdAt: true,
});

// Shipping Info
export const ShippingAddressDTO = z.object({
  name: z.string(),
  company: z.string().optional(),
  addressLine1: z.string(),
  addressLine2: z.string().optional(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  country: z.string().default('US'),
  phone: z.string().optional(),
  email: z.string().optional(),
});

export const PackageDimensionsDTO = z.object({
  length: z.number(),
  width: z.number(),
  height: z.number(),
  unit: z.string().default('inches'), // inches, cm
});

export const ShippingInfoDTO = z.object({
  id: z.string(),
  orgId: z.string(),
  orderId: z.string(),
  shipmentNumber: z.string().optional(),
  carrier: z.string(),
  service: z.string().optional(),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().optional(),
  labelUrl: z.string().optional(),
  shippingCost: z.number().optional(),
  weight: z.number().optional(),
  dimensions: PackageDimensionsDTO.optional(),
  shippingAddress: ShippingAddressDTO,
  originAddress: ShippingAddressDTO.optional(),
  estimatedDeliveryDate: z.string().optional(),
  actualDeliveryDate: z.string().optional(),
  deliveryInstructions: z.string().optional(),
  requiresSignature: z.boolean().default(false),
  isInsured: z.boolean().default(false),
  insuranceAmount: z.number().optional(),
  statusCode: z.string().default('preparing'),
  deliveryAttempts: z.number().default(0),
  lastStatusUpdate: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateShippingInfoDTO = ShippingInfoDTO.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateShippingInfoDTO = CreateShippingInfoDTO.partial();

// Quality Checks
export const QualityCheckDTO = z.object({
  id: z.string(),
  orgId: z.string(),
  orderId: z.string(),
  orderItemId: z.string().optional(),
  workOrderId: z.string().optional(),
  checkType: z.string(),
  checklistId: z.string().optional(),
  checkedBy: z.string(),
  checkedAt: z.string(),
  overallResult: z.string(),
  qualityScore: z.number().optional(),
  defectsFound: z.number().default(0),
  criticalDefects: z.number().default(0),
  minorDefects: z.number().default(0),
  checkResults: z.record(z.any()).optional(),
  defectDetails: z.record(z.any()).optional(),
  correctionRequired: z.boolean().default(false),
  correctionInstructions: z.string().optional(),
  correctedBy: z.string().optional(),
  correctedAt: z.string().optional(),
  reworkRequired: z.boolean().default(false),
  reworkInstructions: z.string().optional(),
  photoUrls: z.array(z.string()).optional(),
  approvedBy: z.string().optional(),
  approvedAt: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateQualityCheckDTO = QualityCheckDTO.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateQualityCheckDTO = CreateQualityCheckDTO.partial();

// Completion Records
export const CompletionRecordDTO = z.object({
  id: z.string(),
  orgId: z.string(),
  orderId: z.string(),
  completionType: z.string(),
  completedBy: z.string().optional(),
  completedAt: z.string(),
  verificationMethod: z.string().optional(),
  deliveryConfirmed: z.boolean().default(false),
  customerSatisfactionScore: z.number().optional(),
  customerFeedback: z.string().optional(),
  qualityScore: z.number().optional(),
  defectsReported: z.number().default(0),
  reworkRequired: z.boolean().default(false),
  reworkNotes: z.string().optional(),
  completionCertificateUrl: z.string().optional(),
  invoiceGenerated: z.boolean().default(false),
  invoiceId: z.string().optional(),
  finalPaymentCaptured: z.boolean().default(false),
  archivedAt: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateCompletionRecordDTO = CompletionRecordDTO.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateCompletionRecordDTO = CreateCompletionRecordDTO.partial();

// Fulfillment Milestones
export const FulfillmentMilestoneDTO = z.object({
  id: z.string(),
  orgId: z.string(),
  orderId: z.string(),
  milestoneCode: z.string(),
  milestoneName: z.string(),
  milestoneType: z.string().default('standard'),
  status: z.string().default('pending'),
  dependsOn: z.array(z.string()).optional(),
  plannedDate: z.string().optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  completedBy: z.string().optional(),
  durationMinutes: z.number().optional(),
  blockedReason: z.string().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateFulfillmentMilestoneDTO = FulfillmentMilestoneDTO.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateFulfillmentMilestoneDTO = CreateFulfillmentMilestoneDTO.partial();

// Fulfillment Operations DTOs
export const StartFulfillmentDTO = z.object({
  notes: z.string().optional(),
  priority: z.number().default(5),
  plannedShipDate: z.string().optional(),
  specialInstructions: z.string().optional(),
});

export const ShipOrderDTO = z.object({
  carrier: z.string(),
  service: z.string().optional(),
  trackingNumber: z.string().optional(),
  shippingCost: z.number().optional(),
  weight: z.number().optional(),
  dimensions: PackageDimensionsDTO.optional(),
  estimatedDeliveryDate: z.string().optional(),
  requiresSignature: z.boolean().default(false),
  isInsured: z.boolean().default(false),
  insuranceAmount: z.number().optional(),
  notes: z.string().optional(),
});

export const DeliverOrderDTO = z.object({
  deliveryDate: z.string(),
  deliveryMethod: z.string().optional(), // 'carrier', 'pickup', 'signature_required'
  recipientName: z.string().optional(),
  deliveryNotes: z.string().optional(),
  photoUrl: z.string().optional(), // Delivery confirmation photo
});

export const CompleteOrderDTO = z.object({
  completionType: z.string().default('manual'), // 'automatic', 'manual', 'exception'
  verificationMethod: z.string().optional(),
  customerSatisfactionScore: z.number().optional(),
  customerFeedback: z.string().optional(),
  qualityScore: z.number().optional(),
  defectsReported: z.number().default(0),
  generateInvoice: z.boolean().default(true),
  capturePayment: z.boolean().default(false),
  notes: z.string().optional(),
});

// Fulfillment Status & Dashboard DTOs
export const FulfillmentStatusDTO = z.object({
  orderId: z.string(),
  overallStatus: z.string(),
  fulfillmentProgress: z.number(), // 0-100 percentage
  currentMilestone: z.string().optional(),
  nextMilestone: z.string().optional(),
  estimatedCompletion: z.string().optional(),
  milestones: z.array(FulfillmentMilestoneDTO),
  events: z.array(FulfillmentEventDTO),
  shippingInfo: ShippingInfoDTO.optional(),
  qualityChecks: z.array(QualityCheckDTO).optional(),
  completionRecord: CompletionRecordDTO.optional(),
  blockers: z.array(z.object({
    type: z.string(),
    description: z.string(),
    severity: z.string(),
  })).optional(),
});

export const FulfillmentDashboardItemDTO = z.object({
  orderId: z.string(),
  orderCode: z.string(),
  customerName: z.string(),
  totalAmount: z.number().optional(),
  statusCode: z.string(),
  fulfillmentStatus: z.string(),
  currentMilestone: z.string().optional(),
  daysInFulfillment: z.number(),
  estimatedCompletion: z.string().optional(),
  isOverdue: z.boolean(),
  priority: z.number().default(5),
  blockers: z.number().default(0),
  lastActivity: z.string().optional(),
});

export const FulfillmentDashboardDTO = z.object({
  summary: z.object({
    totalOrders: z.number(),
    inFulfillment: z.number(),
    readyToShip: z.number(),
    shipped: z.number(),
    completed: z.number(),
    overdue: z.number(),
    avgDaysToCompletion: z.number().optional(),
  }),
  orders: z.array(FulfillmentDashboardItemDTO),
  milestoneStats: z.record(z.number()).optional(),
});

// TypeScript types
export type FulfillmentEventType = z.infer<typeof FulfillmentEventDTO>;
export type CreateFulfillmentEventType = z.infer<typeof CreateFulfillmentEventDTO>;

export type ShippingAddressType = z.infer<typeof ShippingAddressDTO>;
export type PackageDimensionsType = z.infer<typeof PackageDimensionsDTO>;
export type ShippingInfoType = z.infer<typeof ShippingInfoDTO>;
export type CreateShippingInfoType = z.infer<typeof CreateShippingInfoDTO>;
export type UpdateShippingInfoType = z.infer<typeof UpdateShippingInfoDTO>;

export type QualityCheckType = z.infer<typeof QualityCheckDTO>;
export type CreateQualityCheckType = z.infer<typeof CreateQualityCheckDTO>;
export type UpdateQualityCheckType = z.infer<typeof UpdateQualityCheckDTO>;

export type CompletionRecordType = z.infer<typeof CompletionRecordDTO>;
export type CreateCompletionRecordType = z.infer<typeof CreateCompletionRecordDTO>;
export type UpdateCompletionRecordType = z.infer<typeof UpdateCompletionRecordDTO>;

export type FulfillmentMilestoneType = z.infer<typeof FulfillmentMilestoneDTO>;
export type CreateFulfillmentMilestoneType = z.infer<typeof CreateFulfillmentMilestoneDTO>;
export type UpdateFulfillmentMilestoneType = z.infer<typeof UpdateFulfillmentMilestoneDTO>;

export type StartFulfillmentType = z.infer<typeof StartFulfillmentDTO>;
export type ShipOrderType = z.infer<typeof ShipOrderDTO>;
export type DeliverOrderType = z.infer<typeof DeliverOrderDTO>;
export type CompleteOrderType = z.infer<typeof CompleteOrderDTO>;

export type FulfillmentStatusType = z.infer<typeof FulfillmentStatusDTO>;
export type FulfillmentDashboardItemType = z.infer<typeof FulfillmentDashboardItemDTO>;
export type FulfillmentDashboardType = z.infer<typeof FulfillmentDashboardDTO>;

// Event Code Constants
export const FULFILLMENT_EVENT_CODES = {
  FULFILLMENT_STARTED: 'FULFILLMENT_STARTED',
  READY_FOR_PACKAGING: 'READY_FOR_PACKAGING',
  PACKAGING_STARTED: 'PACKAGING_STARTED',
  QUALITY_CHECK_PASSED: 'QUALITY_CHECK_PASSED',
  QUALITY_CHECK_FAILED: 'QUALITY_CHECK_FAILED',
  READY_TO_SHIP: 'READY_TO_SHIP',
  SHIPPED: 'SHIPPED',
  IN_TRANSIT: 'IN_TRANSIT',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERY_ATTEMPTED: 'DELIVERY_ATTEMPTED',
  DELIVERED: 'DELIVERED',
  COMPLETED: 'COMPLETED',
  EXCEPTION: 'EXCEPTION',
  CUSTOMER_FEEDBACK_RECEIVED: 'CUSTOMER_FEEDBACK_RECEIVED',
  // System and management events
  MILESTONE_UPDATED: 'MILESTONE_UPDATED',
  INVENTORY_UPDATED: 'INVENTORY_UPDATED',
  ANALYTICS_UPDATED: 'ANALYTICS_UPDATED',
} as const;

// Milestone Code Constants
export const FULFILLMENT_MILESTONE_CODES = {
  ORDER_CONFIRMED: 'ORDER_CONFIRMED',
  DESIGN_APPROVED: 'DESIGN_APPROVED', 
  MATERIALS_RECEIVED: 'MATERIALS_RECEIVED',
  MANUFACTURING_STARTED: 'MANUFACTURING_STARTED',
  MANUFACTURING_COMPLETED: 'MANUFACTURING_COMPLETED',
  QUALITY_CHECK_PASSED: 'QUALITY_CHECK_PASSED',
  READY_TO_SHIP: 'READY_TO_SHIP',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  COMPLETED: 'COMPLETED',
} as const;

// Status Constants
export const FULFILLMENT_STATUS_CODES = {
  NOT_STARTED: 'not_started',
  PREPARATION: 'preparation',
  PACKAGING: 'packaging',
  READY_TO_SHIP: 'ready_to_ship',
  SHIPPED: 'shipped',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  EXCEPTION: 'exception',
  CANCELLED: 'cancelled',
} as const;

export const SHIPPING_STATUS_CODES = {
  PREPARING: 'preparing',
  LABEL_CREATED: 'label_created',
  SHIPPED: 'shipped',
  IN_TRANSIT: 'in_transit',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  EXCEPTION: 'exception',
  RETURNED: 'returned',
} as const;

// Status Transition Validation
export const FULFILLMENT_STATUS_TRANSITIONS = {
  [FULFILLMENT_STATUS_CODES.NOT_STARTED]: [FULFILLMENT_STATUS_CODES.PREPARATION],
  [FULFILLMENT_STATUS_CODES.PREPARATION]: [FULFILLMENT_STATUS_CODES.PACKAGING, FULFILLMENT_STATUS_CODES.EXCEPTION],
  [FULFILLMENT_STATUS_CODES.PACKAGING]: [FULFILLMENT_STATUS_CODES.READY_TO_SHIP, FULFILLMENT_STATUS_CODES.EXCEPTION],
  [FULFILLMENT_STATUS_CODES.READY_TO_SHIP]: [FULFILLMENT_STATUS_CODES.SHIPPED, FULFILLMENT_STATUS_CODES.EXCEPTION],
  [FULFILLMENT_STATUS_CODES.SHIPPED]: [FULFILLMENT_STATUS_CODES.IN_TRANSIT, FULFILLMENT_STATUS_CODES.DELIVERED, FULFILLMENT_STATUS_CODES.EXCEPTION],
  [FULFILLMENT_STATUS_CODES.IN_TRANSIT]: [FULFILLMENT_STATUS_CODES.DELIVERED, FULFILLMENT_STATUS_CODES.EXCEPTION],
  [FULFILLMENT_STATUS_CODES.DELIVERED]: [FULFILLMENT_STATUS_CODES.COMPLETED],
  [FULFILLMENT_STATUS_CODES.COMPLETED]: [], // Terminal state
  [FULFILLMENT_STATUS_CODES.EXCEPTION]: [FULFILLMENT_STATUS_CODES.PREPARATION, FULFILLMENT_STATUS_CODES.PACKAGING, FULFILLMENT_STATUS_CODES.CANCELLED],
  [FULFILLMENT_STATUS_CODES.CANCELLED]: [], // Terminal state
} as const;

// Helper Functions
export const canTransitionFulfillmentStatus = (from: string, to: string): boolean => {
  const validTransitions = (FULFILLMENT_STATUS_TRANSITIONS as Record<string, readonly string[]>)[from] || [];
  return validTransitions.includes(to);
};

export const getDefaultFulfillmentMilestones = () => [
  { code: FULFILLMENT_MILESTONE_CODES.ORDER_CONFIRMED, name: 'Order Confirmed', type: 'standard' },
  { code: FULFILLMENT_MILESTONE_CODES.DESIGN_APPROVED, name: 'Design Approved', type: 'approval_gate' },
  { code: FULFILLMENT_MILESTONE_CODES.MATERIALS_RECEIVED, name: 'Materials Received', type: 'standard' },
  { code: FULFILLMENT_MILESTONE_CODES.MANUFACTURING_STARTED, name: 'Manufacturing Started', type: 'standard' },
  { code: FULFILLMENT_MILESTONE_CODES.MANUFACTURING_COMPLETED, name: 'Manufacturing Completed', type: 'standard' },
  { code: FULFILLMENT_MILESTONE_CODES.QUALITY_CHECK_PASSED, name: 'Quality Check Passed', type: 'quality_gate' },
  { code: FULFILLMENT_MILESTONE_CODES.READY_TO_SHIP, name: 'Ready to Ship', type: 'standard' },
  { code: FULFILLMENT_MILESTONE_CODES.SHIPPED, name: 'Shipped', type: 'standard' },
  { code: FULFILLMENT_MILESTONE_CODES.DELIVERED, name: 'Delivered', type: 'standard' },
  { code: FULFILLMENT_MILESTONE_CODES.COMPLETED, name: 'Completed', type: 'standard' },
];