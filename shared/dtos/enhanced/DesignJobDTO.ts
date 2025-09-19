import { z } from "zod";

/**
 * Enhanced Design Job DTO schemas with comprehensive validation
 * Includes design workflow validation, capacity constraints, and creative process rules
 */

// Common validation utilities
const uuidSchema = z.string().uuid("Must be a valid UUID");
const positiveIntSchema = z.number().int().positive("Must be a positive integer");
const nonEmptyStringSchema = z.string().min(1, "Cannot be empty").transform(val => val.trim());
const optionalNonEmptyStringSchema = z.string().optional().transform(val => val ? val.trim() : val);

// Enhanced Design Job Status with workflow validation
export const DesignJobStatusSchema = z.enum([
  "queued",                 // Design job created, waiting for assignment
  "assigned",               // Assigned to designer but not started
  "drafting",               // Designer is working on initial designs
  "submitted_for_review",   // Designer submitted work for review
  "under_review",           // Client/admin reviewing submitted designs
  "revision_requested",     // Client requested changes/revisions
  "review",                 // Legacy status for backward compatibility
  "approved",               // Design approved and ready for production
  "rejected",               // Design rejected, needs major rework
  "canceled"                // Design job cancelled
], {
  errorMap: () => ({ message: "Invalid design job status" })
});

// Design Job Event codes for workflow tracking
export const DesignJobEventCodeSchema = z.enum([
  "DESIGN_JOB_CREATED",
  "DESIGN_JOB_ASSIGNED",
  "DESIGN_JOB_UNASSIGNED",
  "DESIGN_WORK_STARTED",
  "DESIGN_DRAFT_CREATED",
  "DESIGN_SUBMITTED_FOR_REVIEW",
  "DESIGN_REVIEW_STARTED",
  "DESIGN_APPROVED",
  "DESIGN_REJECTED",
  "REVISION_REQUESTED",
  "REVISION_SUBMITTED",
  "DESIGN_JOB_COMPLETED",
  "DESIGN_JOB_CANCELLED",
  "DESIGNER_COMMENT_ADDED",
  "CLIENT_FEEDBACK_RECEIVED",
  "DEADLINE_EXTENDED",
  "PRIORITY_CHANGED",
], {
  errorMap: () => ({ message: "Invalid design job event code" })
});

// Status transition validation for design jobs
const DESIGN_JOB_STATUS_TRANSITIONS = {
  'queued': ['assigned', 'canceled'],
  'assigned': ['drafting', 'queued', 'canceled'],
  'drafting': ['submitted_for_review', 'assigned', 'canceled'],
  'submitted_for_review': ['under_review', 'drafting'],
  'under_review': ['approved', 'revision_requested', 'rejected'],
  'revision_requested': ['drafting', 'canceled'],
  'review': ['approved', 'revision_requested', 'rejected'], // Legacy support
  'approved': [], // Terminal state
  'rejected': ['queued', 'canceled'],
  'canceled': [] // Terminal state
};

export function validateDesignJobStatusTransition(from: string, to: string): boolean {
  if (from === to) return true;
  const validTransitions = DESIGN_JOB_STATUS_TRANSITIONS[from] || [];
  return validTransitions.includes(to);
}

// Priority validation for design jobs (1=urgent, 10=low priority)
const prioritySchema = z.number().int().min(1, "Priority must be between 1 (urgent) and 10 (low)").max(10, "Priority must be between 1 (urgent) and 10 (low)");

// Designer specializations with validation
export const DesignerSpecializationSchema = z.enum([
  "logos_branding",
  "apparel_graphics", 
  "sports_uniforms",
  "promotional_products",
  "packaging_design",
  "web_graphics",
  "print_design",
  "embroidery_design",
  "screen_printing",
  "vector_illustration",
  "photo_manipulation",
  "3d_modeling",
  "animation"
], {
  errorMap: () => ({ message: "Invalid designer specialization" })
});

// Enhanced Design Job DTO with comprehensive validation
export const DesignJobDTO = z.object({
  id: uuidSchema,
  orgId: uuidSchema,
  orderItemId: uuidSchema,
  title: z.string().max(200, "Title cannot exceed 200 characters").optional(),
  brief: z.string().max(5000, "Brief cannot exceed 5000 characters").optional(),
  priority: prioritySchema.default(5),
  statusCode: DesignJobStatusSchema.default("queued"),
  assigneeDesignerId: uuidSchema.optional(),
  estimatedHours: z.number().positive("Estimated hours must be positive").max(200, "Estimated hours cannot exceed 200").optional(),
  actualHours: z.number().min(0, "Actual hours cannot be negative").max(300, "Actual hours cannot exceed 300").optional(),
  deadline: z.string().datetime("Must be a valid ISO datetime").optional(),
  startedAt: z.string().datetime("Must be a valid ISO datetime").optional(),
  completedAt: z.string().datetime("Must be a valid ISO datetime").optional(),
  clientFeedback: z.string().max(2000, "Client feedback cannot exceed 2000 characters").optional(),
  designerNotes: z.string().max(2000, "Designer notes cannot exceed 2000 characters").optional(),
  revisionCount: z.number().int().min(0, "Revision count cannot be negative").max(10, "Cannot exceed 10 revisions").default(0),
  maxRevisions: z.number().int().min(1, "Must allow at least 1 revision").max(10, "Cannot exceed 10 max revisions").default(3),
  requiredSpecializations: z.array(DesignerSpecializationSchema).max(5, "Cannot require more than 5 specializations").optional(),
  createdAt: z.string().datetime("Must be a valid ISO datetime"),
  updatedAt: z.string().datetime("Must be a valid ISO datetime"),
}).refine((data) => {
  // Business rule: Deadline must be in the future for non-terminal statuses
  if (data.deadline && !['approved', 'rejected', 'canceled'].includes(data.statusCode)) {
    const deadline = new Date(data.deadline);
    const now = new Date();
    if (deadline <= now) {
      return false;
    }
  }
  return true;
}, {
  message: "Deadline must be in the future for active design jobs",
  path: ["deadline"]
}).refine((data) => {
  // Business rule: Started jobs must have start time
  if (['drafting', 'submitted_for_review', 'under_review', 'revision_requested', 'approved'].includes(data.statusCode) && !data.startedAt) {
    return false;
  }
  return true;
}, {
  message: "Started design jobs must have a start time",
  path: ["startedAt"]
}).refine((data) => {
  // Business rule: Completed jobs must have completion time
  if (['approved', 'rejected'].includes(data.statusCode) && !data.completedAt) {
    return false;
  }
  return true;
}, {
  message: "Completed design jobs must have a completion time",
  path: ["completedAt"]
}).refine((data) => {
  // Business rule: Revision count cannot exceed max revisions
  if (data.revisionCount > data.maxRevisions) {
    return false;
  }
  return true;
}, {
  message: "Revision count cannot exceed maximum allowed revisions",
  path: ["revisionCount"]
}).refine((data) => {
  // Business rule: Actual hours should not greatly exceed estimated hours
  if (data.actualHours && data.estimatedHours && data.actualHours > data.estimatedHours * 2) {
    return false;
  }
  return true;
}, {
  message: "Actual hours significantly exceed estimated hours - please review",
  path: ["actualHours"]
});

// Enhanced Design Job Event DTO
export const DesignJobEventDTO = z.object({
  id: uuidSchema,
  designJobId: uuidSchema,
  eventCode: DesignJobEventCodeSchema,
  actorUserId: uuidSchema.optional(),
  payload: z.record(z.any()).optional(),
  notes: z.string().max(1000, "Event notes cannot exceed 1000 characters").optional(),
  occurredAt: z.string().datetime("Must be a valid ISO datetime"),
}).refine((data) => {
  // Business rule: Revision events should have revision details in payload
  if (['REVISION_REQUESTED', 'REVISION_SUBMITTED'].includes(data.eventCode) && 
      (!data.payload || !data.payload.revisionNotes)) {
    return false;
  }
  return true;
}, {
  message: "Revision events must include revision notes in payload",
  path: ["payload"]
});

// Enhanced Design Asset DTO with file validation
export const DesignAssetDTO = z.object({
  id: uuidSchema,
  orgId: uuidSchema,
  orderItemId: uuidSchema,
  designJobId: uuidSchema.optional(),
  uploaderId: uuidSchema,
  version: positiveIntSchema.max(50, "Version cannot exceed 50"),
  fileUrl: z.string().url("Must be a valid URL"),
  thumbnailUrl: z.string().url("Must be a valid URL").optional(),
  filename: nonEmptyStringSchema.max(255, "Filename cannot exceed 255 characters"),
  fileSize: positiveIntSchema.max(100 * 1024 * 1024, "File size cannot exceed 100MB"), // bytes
  mimeType: z.string().regex(/^(image|application)\/(jpeg|jpg|png|gif|pdf|ai|eps|svg|psd)$/, "Invalid file type for design asset"),
  width: positiveIntSchema.max(10000, "Width cannot exceed 10,000 pixels").optional(),
  height: positiveIntSchema.max(10000, "Height cannot exceed 10,000 pixels").optional(),
  isVector: z.boolean().default(false),
  approvedByAdmin: z.boolean().default(false),
  approvedAt: z.string().datetime("Must be a valid ISO datetime").optional(),
  signatureFileUrl: z.string().url("Must be a valid URL").optional(),
  signatureHash: z.string().optional(),
  downloadCount: z.number().int().min(0).default(0),
  createdAt: z.string().datetime("Must be a valid ISO datetime"),
  updatedAt: z.string().datetime("Must be a valid ISO datetime"),
}).refine((data) => {
  // Business rule: Vector files should be marked as vector
  const vectorMimeTypes = ['application/ai', 'application/eps', 'image/svg'];
  if (vectorMimeTypes.includes(data.mimeType) && !data.isVector) {
    return false;
  }
  return true;
}, {
  message: "Vector format files must be marked as vector",
  path: ["isVector"]
}).refine((data) => {
  // Business rule: Image files should have dimensions
  const imageMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  if (imageMimeTypes.includes(data.mimeType) && (!data.width || !data.height)) {
    return false;
  }
  return true;
}, {
  message: "Image files must have width and height dimensions",
  path: ["width", "height"]
});

// Enhanced Create Design Job DTO
export const CreateDesignJobDTO = z.object({
  orgId: uuidSchema,
  orderItemId: uuidSchema,
  title: z.string().min(5, "Title must be at least 5 characters").max(200, "Title cannot exceed 200 characters"),
  brief: z.string().min(20, "Brief must be at least 20 characters").max(5000, "Brief cannot exceed 5000 characters"),
  priority: prioritySchema.default(5),
  assigneeDesignerId: uuidSchema.optional(),
  estimatedHours: z.number().positive("Estimated hours must be positive").max(200, "Estimated hours cannot exceed 200").optional(),
  deadline: z.string().datetime("Must be a valid ISO datetime").refine((date) => {
    return new Date(date) > new Date();
  }, "Deadline must be in the future"),
  maxRevisions: z.number().int().min(1, "Must allow at least 1 revision").max(10, "Cannot exceed 10 max revisions").default(3),
  requiredSpecializations: z.array(DesignerSpecializationSchema).min(1, "Must specify at least one required specialization").max(5, "Cannot require more than 5 specializations"),
  designerNotes: z.string().max(2000, "Designer notes cannot exceed 2000 characters").optional(),
}).refine((data) => {
  // Business rule: Deadline should be reasonable based on estimated hours
  if (data.estimatedHours && data.deadline) {
    const hoursUntilDeadline = (new Date(data.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60);
    // Allow at least 2x the estimated hours as buffer time
    if (hoursUntilDeadline < data.estimatedHours * 2) {
      return false;
    }
  }
  return true;
}, {
  message: "Deadline should allow sufficient time based on estimated hours",
  path: ["deadline"]
});

// Enhanced Update Design Job DTO
export const UpdateDesignJobDTO = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200, "Title cannot exceed 200 characters").optional(),
  brief: z.string().min(20, "Brief must be at least 20 characters").max(5000, "Brief cannot exceed 5000 characters").optional(),
  priority: prioritySchema.optional(),
  estimatedHours: z.number().positive("Estimated hours must be positive").max(200, "Estimated hours cannot exceed 200").optional(),
  actualHours: z.number().min(0, "Actual hours cannot be negative").max(300, "Actual hours cannot exceed 300").optional(),
  deadline: z.string().datetime("Must be a valid ISO datetime").optional(),
  clientFeedback: z.string().max(2000, "Client feedback cannot exceed 2000 characters").optional(),
  designerNotes: z.string().max(2000, "Designer notes cannot exceed 2000 characters").optional(),
  maxRevisions: z.number().int().min(1, "Must allow at least 1 revision").max(10, "Cannot exceed 10 max revisions").optional(),
  requiredSpecializations: z.array(DesignerSpecializationSchema).max(5, "Cannot require more than 5 specializations").optional(),
});

// Status transition DTO with enhanced validation
export const UpdateDesignJobStatusDTO = z.object({
  statusCode: DesignJobStatusSchema,
  notes: z.string().max(1000, "Status change notes cannot exceed 1000 characters").optional(),
  clientFeedback: z.string().max(2000, "Client feedback cannot exceed 2000 characters").optional(),
  designerNotes: z.string().max(2000, "Designer notes cannot exceed 2000 characters").optional(),
  actualHours: z.number().min(0, "Actual hours cannot be negative").max(300, "Actual hours cannot exceed 300").optional(),
  assigneeDesignerId: uuidSchema.optional(),
  revisionRequired: z.boolean().default(false),
  approvalLevel: z.enum(['client', 'admin', 'final']).optional(),
}).refine((data) => {
  // Business rule: Revision requests require client feedback
  if (data.statusCode === 'revision_requested' && !data.clientFeedback) {
    return false;
  }
  return true;
}, {
  message: "Revision requests must include client feedback",
  path: ["clientFeedback"]
}).refine((data) => {
  // Business rule: Completed jobs should have actual hours tracked
  if (['approved', 'rejected'].includes(data.statusCode) && !data.actualHours) {
    return false;
  }
  return true;
}, {
  message: "Completed design jobs should have actual hours tracked",
  path: ["actualHours"]
});

// Designer assignment with workload validation
export const AssignDesignerDTO = z.object({
  designerId: uuidSchema,
  notes: z.string().max(1000, "Assignment notes cannot exceed 1000 characters").optional(),
  skipWorkloadCheck: z.boolean().default(false),
  skipSkillCheck: z.boolean().default(false),
  estimatedHours: z.number().positive("Estimated hours must be positive").max(200, "Estimated hours cannot exceed 200").optional(),
  deadline: z.string().datetime("Must be a valid ISO datetime").optional(),
});

// Smart assignment with enhanced criteria
export const SmartAssignDesignerDTO = z.object({
  requiredSpecializations: z.array(DesignerSpecializationSchema).min(1, "Must specify at least one required specialization").max(5, "Cannot require more than 5 specializations"),
  preferredSpecializations: z.array(DesignerSpecializationSchema).max(5, "Cannot specify more than 5 preferred specializations").optional(),
  maxWorkloadScore: z.number().min(0).max(100, "Workload score must be between 0 and 100").default(80),
  prioritizeExperience: z.boolean().default(false),
  prioritizeSpeed: z.boolean().default(false),
  prioritizeQuality: z.boolean().default(true),
  excludeDesignerIds: z.array(uuidSchema).max(20, "Cannot exclude more than 20 designers").optional(),
  notes: z.string().max(1000, "Assignment notes cannot exceed 1000 characters").optional(),
});

// Design submission DTO
export const SubmitDesignDTO = z.object({
  assetIds: z.array(uuidSchema).min(1, "Must submit at least one design asset").max(20, "Cannot submit more than 20 assets"),
  designerNotes: z.string().min(10, "Designer notes must be at least 10 characters").max(2000, "Designer notes cannot exceed 2000 characters"),
  hoursWorked: z.number().positive("Hours worked must be positive").max(200, "Hours worked cannot exceed 200"),
  isRevision: z.boolean().default(false),
  revisionNotes: z.string().max(1000, "Revision notes cannot exceed 1000 characters").optional(),
  requestFeedback: z.boolean().default(true),
  submissionType: z.enum(['draft', 'final', 'revision']).default('final'),
}).refine((data) => {
  // Business rule: Revisions must have revision notes
  if (data.isRevision && !data.revisionNotes) {
    return false;
  }
  return true;
}, {
  message: "Revisions must include revision notes",
  path: ["revisionNotes"]
});

// Design review DTO
export const ReviewDesignDTO = z.object({
  approved: z.boolean(),
  clientFeedback: z.string().min(10, "Client feedback must be at least 10 characters").max(2000, "Client feedback cannot exceed 2000 characters"),
  revisionRequired: z.boolean().default(false),
  revisionNotes: z.string().max(1000, "Revision notes cannot exceed 1000 characters").optional(),
  qualityScore: z.number().min(1, "Quality score must be between 1 and 5").max(5, "Quality score must be between 1 and 5").optional(),
  approvalLevel: z.enum(['client', 'admin', 'final']).default('client'),
  additionalRevisions: z.number().int().min(0, "Additional revisions cannot be negative").max(5, "Cannot grant more than 5 additional revisions").default(0),
}).refine((data) => {
  // Business rule: Rejected designs must have revision notes if revision required
  if (!data.approved && data.revisionRequired && !data.revisionNotes) {
    return false;
  }
  return true;
}, {
  message: "Rejected designs requiring revision must include revision notes",
  path: ["revisionNotes"]
});

// Bulk operations with validation
export const BulkCreateDesignJobsDTO = z.object({
  orderItemIds: z.array(uuidSchema).min(1, "Must specify at least one order item").max(50, "Cannot create more than 50 design jobs at once"),
  title: z.string().min(5, "Title must be at least 5 characters").max(200, "Title cannot exceed 200 characters"),
  brief: z.string().min(20, "Brief must be at least 20 characters").max(5000, "Brief cannot exceed 5000 characters"),
  priority: prioritySchema.default(5),
  assigneeDesignerId: uuidSchema.optional(),
  estimatedHours: z.number().positive("Estimated hours must be positive").max(200, "Estimated hours cannot exceed 200").default(8),
  deadline: z.string().datetime("Must be a valid ISO datetime").refine((date) => {
    return new Date(date) > new Date();
  }, "Deadline must be in the future"),
  requiredSpecializations: z.array(DesignerSpecializationSchema).min(1, "Must specify at least one required specialization").max(5, "Cannot require more than 5 specializations"),
});

export const BulkAssignDesignJobsDTO = z.object({
  designJobIds: z.array(uuidSchema).min(1, "Must specify at least one design job").max(50, "Cannot assign more than 50 design jobs at once"),
  designerId: uuidSchema.optional(),
  useWorkloadBalancing: z.boolean().default(true),
  useSkillMatching: z.boolean().default(true),
  maxJobsPerDesigner: positiveIntSchema.max(20, "Cannot assign more than 20 jobs per designer").optional(),
  requiredSpecializations: z.array(DesignerSpecializationSchema).max(5, "Cannot require more than 5 specializations").optional(),
  priority: prioritySchema.optional(),
});

// Design job filters for search/reporting
export const DesignJobFiltersDTO = z.object({
  statusCode: z.array(DesignJobStatusSchema).optional(),
  assigneeDesignerId: uuidSchema.optional(),
  priority: z.array(prioritySchema).optional(),
  deadlineFrom: z.string().datetime().optional(),
  deadlineTo: z.string().datetime().optional(),
  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional(),
  requiredSpecializations: z.array(DesignerSpecializationSchema).optional(),
  overdue: z.boolean().optional(),
  search: z.string().max(100, "Search term cannot exceed 100 characters").optional(),
}).refine((data) => {
  if (data.deadlineFrom && data.deadlineTo) {
    return new Date(data.deadlineFrom) <= new Date(data.deadlineTo);
  }
  return true;
}, {
  message: "Deadline 'from' must be before 'to'",
  path: ["deadlineFrom", "deadlineTo"]
});

// TypeScript types
export type DesignJobType = z.infer<typeof DesignJobDTO>;
export type CreateDesignJobType = z.infer<typeof CreateDesignJobDTO>;
export type UpdateDesignJobType = z.infer<typeof UpdateDesignJobDTO>;
export type UpdateDesignJobStatusType = z.infer<typeof UpdateDesignJobStatusDTO>;
export type AssignDesignerType = z.infer<typeof AssignDesignerDTO>;
export type SmartAssignDesignerType = z.infer<typeof SmartAssignDesignerDTO>;
export type SubmitDesignType = z.infer<typeof SubmitDesignDTO>;
export type ReviewDesignType = z.infer<typeof ReviewDesignDTO>;
export type BulkCreateDesignJobsType = z.infer<typeof BulkCreateDesignJobsDTO>;
export type BulkAssignDesignJobsType = z.infer<typeof BulkAssignDesignJobsDTO>;
export type DesignJobFiltersType = z.infer<typeof DesignJobFiltersDTO>;