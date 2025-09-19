/**
 * Fulfillment Data Transformers
 * Handles conversion between camelCase DTOs and snake_case database rows
 * Critical for fixing DTO/DB mapping mismatches in fulfillment flows
 */

import {
  FulfillmentEventType,
  CreateFulfillmentEventType,
  ShippingInfoType,
  CreateShippingInfoType,
  UpdateShippingInfoType,
  QualityCheckType,
  CreateQualityCheckType,
  UpdateQualityCheckType,
  CompletionRecordType,
  CreateCompletionRecordType,
  FulfillmentMilestoneType,
  CreateFulfillmentMilestoneType,
  UpdateFulfillmentMilestoneType,
} from '@shared/dtos/FulfillmentDTO';

// Shipment DTOs (for new partial fulfillment support)
export interface ShipmentType {
  id: string;
  orgId: string;
  orderId: string;
  shipmentNumber: string;
  carrier: string;
  service?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  labelUrl?: string;
  shippingCost?: number;
  weight?: number;
  dimensions?: any;
  shippingAddress: any;
  originAddress?: any;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  deliveryInstructions?: string;
  requiresSignature: boolean;
  isInsured: boolean;
  insuranceAmount?: number;
  statusCode: string;
  deliveryAttempts: number;
  lastStatusUpdate?: string;
  shippedAt?: string;
  deliveredAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShipmentType {
  orgId: string;
  orderId: string;
  shipmentNumber: string;
  carrier: string;
  service?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  labelUrl?: string;
  shippingCost?: number;
  weight?: number;
  dimensions?: any;
  shippingAddress: any;
  originAddress?: any;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  deliveryInstructions?: string;
  requiresSignature?: boolean;
  isInsured?: boolean;
  insuranceAmount?: number;
  statusCode?: string;
  deliveryAttempts?: number;
  lastStatusUpdate?: string;
  shippedAt?: string;
  deliveredAt?: string;
  notes?: string;
}

export interface ShipmentItemType {
  id: string;
  orgId: string;
  shipmentId: string;
  orderItemId: string;
  quantity: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShipmentItemType {
  orgId: string;
  shipmentId: string;
  orderItemId: string;
  quantity: number;
  notes?: string;
}

// Helper function to convert camelCase to snake_case
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Helper function to convert snake_case to camelCase
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Generic object transformer
function transformObjectKeys(obj: any, transformer: (key: string) => string): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(item => transformObjectKeys(item, transformer));
  if (typeof obj !== 'object') return obj;
  
  const transformed: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = transformer(key);
    transformed[newKey] = transformObjectKeys(value, transformer);
  }
  return transformed;
}

// FULFILLMENT EVENTS TRANSFORMERS

export function serializeFulfillmentEvent(dto: CreateFulfillmentEventType): any {
  return {
    org_id: dto.orgId,
    order_id: dto.orderId,
    order_item_id: dto.orderItemId,
    work_order_id: dto.workOrderId,
    event_code: dto.eventCode,
    event_type: dto.eventType,
    status_before: dto.statusBefore,
    status_after: dto.statusAfter,
    actor_user_id: dto.actorUserId,
    notes: dto.notes,
    metadata: dto.metadata,
  };
}

export function deserializeFulfillmentEvent(dbRow: any): FulfillmentEventType {
  return {
    id: dbRow.id,
    orgId: dbRow.org_id,
    orderId: dbRow.order_id,
    orderItemId: dbRow.order_item_id,
    workOrderId: dbRow.work_order_id,
    eventCode: dbRow.event_code,
    eventType: dbRow.event_type,
    statusBefore: dbRow.status_before,
    statusAfter: dbRow.status_after,
    actorUserId: dbRow.actor_user_id,
    notes: dbRow.notes,
    metadata: dbRow.metadata,
    createdAt: dbRow.created_at,
  };
}

// SHIPPING INFO TRANSFORMERS

export function serializeShippingInfo(dto: CreateShippingInfoType): any {
  return {
    org_id: dto.orgId,
    order_id: dto.orderId,
    shipment_number: dto.shipmentNumber,
    carrier: dto.carrier,
    service: dto.service,
    tracking_number: dto.trackingNumber,
    tracking_url: dto.trackingUrl,
    label_url: dto.labelUrl,
    shipping_cost: dto.shippingCost,
    weight: dto.weight,
    dimensions: dto.dimensions,
    shipping_address: dto.shippingAddress,
    origin_address: dto.originAddress,
    estimated_delivery_date: dto.estimatedDeliveryDate,
    actual_delivery_date: dto.actualDeliveryDate,
    delivery_instructions: dto.deliveryInstructions,
    requires_signature: dto.requiresSignature,
    is_insured: dto.isInsured,
    insurance_amount: dto.insuranceAmount,
    status_code: dto.statusCode,
    delivery_attempts: dto.deliveryAttempts,
    last_status_update: dto.lastStatusUpdate,
    notes: dto.notes,
  };
}

export function deserializeShippingInfo(dbRow: any): ShippingInfoType {
  return {
    id: dbRow.id,
    orgId: dbRow.org_id,
    orderId: dbRow.order_id,
    shipmentNumber: dbRow.shipment_number,
    carrier: dbRow.carrier,
    service: dbRow.service,
    trackingNumber: dbRow.tracking_number,
    trackingUrl: dbRow.tracking_url,
    labelUrl: dbRow.label_url,
    shippingCost: dbRow.shipping_cost ? parseFloat(dbRow.shipping_cost) : undefined,
    weight: dbRow.weight ? parseFloat(dbRow.weight) : undefined,
    dimensions: dbRow.dimensions,
    shippingAddress: dbRow.shipping_address,
    originAddress: dbRow.origin_address,
    estimatedDeliveryDate: dbRow.estimated_delivery_date,
    actualDeliveryDate: dbRow.actual_delivery_date,
    deliveryInstructions: dbRow.delivery_instructions,
    requiresSignature: dbRow.requires_signature,
    isInsured: dbRow.is_insured,
    insuranceAmount: dbRow.insurance_amount ? parseFloat(dbRow.insurance_amount) : undefined,
    statusCode: dbRow.status_code,
    deliveryAttempts: dbRow.delivery_attempts,
    lastStatusUpdate: dbRow.last_status_update,
    notes: dbRow.notes,
    createdAt: dbRow.created_at,
    updatedAt: dbRow.updated_at,
  };
}

export function serializeShippingInfoUpdate(dto: UpdateShippingInfoType): any {
  const result: any = {};
  
  if (dto.shipmentNumber !== undefined) result.shipment_number = dto.shipmentNumber;
  if (dto.carrier !== undefined) result.carrier = dto.carrier;
  if (dto.service !== undefined) result.service = dto.service;
  if (dto.trackingNumber !== undefined) result.tracking_number = dto.trackingNumber;
  if (dto.trackingUrl !== undefined) result.tracking_url = dto.trackingUrl;
  if (dto.labelUrl !== undefined) result.label_url = dto.labelUrl;
  if (dto.shippingCost !== undefined) result.shipping_cost = dto.shippingCost;
  if (dto.weight !== undefined) result.weight = dto.weight;
  if (dto.dimensions !== undefined) result.dimensions = dto.dimensions;
  if (dto.shippingAddress !== undefined) result.shipping_address = dto.shippingAddress;
  if (dto.originAddress !== undefined) result.origin_address = dto.originAddress;
  if (dto.estimatedDeliveryDate !== undefined) result.estimated_delivery_date = dto.estimatedDeliveryDate;
  if (dto.actualDeliveryDate !== undefined) result.actual_delivery_date = dto.actualDeliveryDate;
  if (dto.deliveryInstructions !== undefined) result.delivery_instructions = dto.deliveryInstructions;
  if (dto.requiresSignature !== undefined) result.requires_signature = dto.requiresSignature;
  if (dto.isInsured !== undefined) result.is_insured = dto.isInsured;
  if (dto.insuranceAmount !== undefined) result.insurance_amount = dto.insuranceAmount;
  if (dto.statusCode !== undefined) result.status_code = dto.statusCode;
  if (dto.deliveryAttempts !== undefined) result.delivery_attempts = dto.deliveryAttempts;
  if (dto.lastStatusUpdate !== undefined) result.last_status_update = dto.lastStatusUpdate;
  if (dto.notes !== undefined) result.notes = dto.notes;
  
  result.updated_at = new Date().toISOString();
  return result;
}

// QUALITY CHECKS TRANSFORMERS

export function serializeQualityCheck(dto: CreateQualityCheckType): any {
  return {
    org_id: dto.orgId,
    order_id: dto.orderId,
    order_item_id: dto.orderItemId,
    work_order_id: dto.workOrderId,
    check_type: dto.checkType,
    checklist_id: dto.checklistId,
    checked_by: dto.checkedBy,
    overall_result: dto.overallResult,
    quality_score: dto.qualityScore,
    defects_found: dto.defectsFound,
    critical_defects: dto.criticalDefects,
    minor_defects: dto.minorDefects,
    check_results: dto.checkResults,
    defect_details: dto.defectDetails,
    correction_required: dto.correctionRequired,
    correction_instructions: dto.correctionInstructions,
    corrected_by: dto.correctedBy,
    corrected_at: dto.correctedAt,
    rework_required: dto.reworkRequired,
    rework_instructions: dto.reworkInstructions,
    photo_urls: dto.photoUrls,
    approved_by: dto.approvedBy,
    approved_at: dto.approvedAt,
    notes: dto.notes,
  };
}

export function deserializeQualityCheck(dbRow: any): QualityCheckType {
  return {
    id: dbRow.id,
    orgId: dbRow.org_id,
    orderId: dbRow.order_id,
    orderItemId: dbRow.order_item_id,
    workOrderId: dbRow.work_order_id,
    checkType: dbRow.check_type,
    checklistId: dbRow.checklist_id,
    checkedBy: dbRow.checked_by,
    checkedAt: dbRow.checked_at,
    overallResult: dbRow.overall_result,
    qualityScore: dbRow.quality_score ? parseFloat(dbRow.quality_score) : undefined,
    defectsFound: dbRow.defects_found,
    criticalDefects: dbRow.critical_defects,
    minorDefects: dbRow.minor_defects,
    checkResults: dbRow.check_results,
    defectDetails: dbRow.defect_details,
    correctionRequired: dbRow.correction_required,
    correctionInstructions: dbRow.correction_instructions,
    correctedBy: dbRow.corrected_by,
    correctedAt: dbRow.corrected_at,
    reworkRequired: dbRow.rework_required,
    reworkInstructions: dbRow.rework_instructions,
    photoUrls: dbRow.photo_urls,
    approvedBy: dbRow.approved_by,
    approvedAt: dbRow.approved_at,
    notes: dbRow.notes,
    createdAt: dbRow.created_at,
    updatedAt: dbRow.updated_at,
  };
}

// COMPLETION RECORDS TRANSFORMERS

export function serializeCompletionRecord(dto: CreateCompletionRecordType): any {
  return {
    org_id: dto.orgId,
    order_id: dto.orderId,
    completion_type: dto.completionType,
    completed_by: dto.completedBy,
    verification_method: dto.verificationMethod,
    delivery_confirmed: dto.deliveryConfirmed,
    customer_satisfaction_score: dto.customerSatisfactionScore,
    customer_feedback: dto.customerFeedback,
    quality_score: dto.qualityScore,
    defects_reported: dto.defectsReported,
    rework_required: dto.reworkRequired,
    rework_notes: dto.reworkNotes,
    completion_certificate_url: dto.completionCertificateUrl,
    invoice_generated: dto.invoiceGenerated,
    invoice_id: dto.invoiceId,
    final_payment_captured: dto.finalPaymentCaptured,
    archived_at: dto.archivedAt,
    metadata: dto.metadata,
    notes: dto.notes,
  };
}

export function deserializeCompletionRecord(dbRow: any): CompletionRecordType {
  return {
    id: dbRow.id,
    orgId: dbRow.org_id,
    orderId: dbRow.order_id,
    completionType: dbRow.completion_type,
    completedBy: dbRow.completed_by,
    completedAt: dbRow.completed_at,
    verificationMethod: dbRow.verification_method,
    deliveryConfirmed: dbRow.delivery_confirmed,
    customerSatisfactionScore: dbRow.customer_satisfaction_score,
    customerFeedback: dbRow.customer_feedback,
    qualityScore: dbRow.quality_score ? parseFloat(dbRow.quality_score) : undefined,
    defectsReported: dbRow.defects_reported,
    reworkRequired: dbRow.rework_required,
    reworkNotes: dbRow.rework_notes,
    completionCertificateUrl: dbRow.completion_certificate_url,
    invoiceGenerated: dbRow.invoice_generated,
    invoiceId: dbRow.invoice_id,
    finalPaymentCaptured: dbRow.final_payment_captured,
    archivedAt: dbRow.archived_at,
    metadata: dbRow.metadata,
    notes: dbRow.notes,
    createdAt: dbRow.created_at,
    updatedAt: dbRow.updated_at,
  };
}

// FULFILLMENT MILESTONES TRANSFORMERS

export function serializeFulfillmentMilestone(dto: CreateFulfillmentMilestoneType): any {
  return {
    org_id: dto.orgId,
    order_id: dto.orderId,
    milestone_code: dto.milestoneCode,
    milestone_name: dto.milestoneName,
    milestone_type: dto.milestoneType,
    status: dto.status,
    depends_on: dto.dependsOn,
    planned_date: dto.plannedDate,
    started_at: dto.startedAt,
    completed_at: dto.completedAt,
    completed_by: dto.completedBy,
    duration_minutes: dto.durationMinutes,
    blocked_reason: dto.blockedReason,
    notes: dto.notes,
    metadata: dto.metadata,
  };
}

export function deserializeFulfillmentMilestone(dbRow: any): FulfillmentMilestoneType {
  return {
    id: dbRow.id,
    orgId: dbRow.org_id,
    orderId: dbRow.order_id,
    milestoneCode: dbRow.milestone_code,
    milestoneName: dbRow.milestone_name,
    milestoneType: dbRow.milestone_type,
    status: dbRow.status,
    dependsOn: dbRow.depends_on,
    plannedDate: dbRow.planned_date,
    startedAt: dbRow.started_at,
    completedAt: dbRow.completed_at,
    completedBy: dbRow.completed_by,
    durationMinutes: dbRow.duration_minutes,
    blockedReason: dbRow.blocked_reason,
    notes: dbRow.notes,
    metadata: dbRow.metadata,
    createdAt: dbRow.created_at,
    updatedAt: dbRow.updated_at,
  };
}

// SHIPMENT TRANSFORMERS (for partial fulfillment)

export function serializeShipment(dto: CreateShipmentType): any {
  return {
    org_id: dto.orgId,
    order_id: dto.orderId,
    shipment_number: dto.shipmentNumber,
    carrier: dto.carrier,
    service: dto.service,
    tracking_number: dto.trackingNumber,
    tracking_url: dto.trackingUrl,
    label_url: dto.labelUrl,
    shipping_cost: dto.shippingCost,
    weight: dto.weight,
    dimensions: dto.dimensions,
    shipping_address: dto.shippingAddress,
    origin_address: dto.originAddress,
    estimated_delivery_date: dto.estimatedDeliveryDate,
    actual_delivery_date: dto.actualDeliveryDate,
    delivery_instructions: dto.deliveryInstructions,
    requires_signature: dto.requiresSignature ?? false,
    is_insured: dto.isInsured ?? false,
    insurance_amount: dto.insuranceAmount,
    status_code: dto.statusCode ?? 'preparing',
    delivery_attempts: dto.deliveryAttempts ?? 0,
    last_status_update: dto.lastStatusUpdate,
    shipped_at: dto.shippedAt,
    delivered_at: dto.deliveredAt,
    notes: dto.notes,
  };
}

export function deserializeShipment(dbRow: any): ShipmentType {
  return {
    id: dbRow.id,
    orgId: dbRow.org_id,
    orderId: dbRow.order_id,
    shipmentNumber: dbRow.shipment_number,
    carrier: dbRow.carrier,
    service: dbRow.service,
    trackingNumber: dbRow.tracking_number,
    trackingUrl: dbRow.tracking_url,
    labelUrl: dbRow.label_url,
    shippingCost: dbRow.shipping_cost ? parseFloat(dbRow.shipping_cost) : undefined,
    weight: dbRow.weight ? parseFloat(dbRow.weight) : undefined,
    dimensions: dbRow.dimensions,
    shippingAddress: dbRow.shipping_address,
    originAddress: dbRow.origin_address,
    estimatedDeliveryDate: dbRow.estimated_delivery_date,
    actualDeliveryDate: dbRow.actual_delivery_date,
    deliveryInstructions: dbRow.delivery_instructions,
    requiresSignature: dbRow.requires_signature,
    isInsured: dbRow.is_insured,
    insuranceAmount: dbRow.insurance_amount ? parseFloat(dbRow.insurance_amount) : undefined,
    statusCode: dbRow.status_code,
    deliveryAttempts: dbRow.delivery_attempts,
    lastStatusUpdate: dbRow.last_status_update,
    shippedAt: dbRow.shipped_at,
    deliveredAt: dbRow.delivered_at,
    notes: dbRow.notes,
    createdAt: dbRow.created_at,
    updatedAt: dbRow.updated_at,
  };
}

// SHIPMENT ITEM TRANSFORMERS

export function serializeShipmentItem(dto: CreateShipmentItemType): any {
  return {
    org_id: dto.orgId,
    shipment_id: dto.shipmentId,
    order_item_id: dto.orderItemId,
    quantity: dto.quantity,
    notes: dto.notes,
  };
}

export function deserializeShipmentItem(dbRow: any): ShipmentItemType {
  return {
    id: dbRow.id,
    orgId: dbRow.org_id,
    shipmentId: dbRow.shipment_id,
    orderItemId: dbRow.order_item_id,
    quantity: dbRow.quantity,
    notes: dbRow.notes,
    createdAt: dbRow.created_at,
    updatedAt: dbRow.updated_at,
  };
}

// UTILITY FUNCTIONS

/**
 * Safely parse decimal values from database
 */
export function parseDecimal(value: any): number | undefined {
  if (value === null || value === undefined) return undefined;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? undefined : parsed;
}

/**
 * Serialize array of DTOs to DB format
 */
export function serializeArray<T, U>(dtos: T[], serializer: (dto: T) => U): U[] {
  return dtos.map(serializer);
}

/**
 * Deserialize array of DB rows to DTO format
 */
export function deserializeArray<T, U>(rows: T[], deserializer: (row: T) => U): U[] {
  return rows.map(deserializer);
}

/**
 * Generate shipment number in format SHIP-YYYYMMDD-XXXX
 */
export function generateShipmentNumber(orgId: string): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `SHIP-${date}-${random}`;
}