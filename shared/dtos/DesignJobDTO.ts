import { z } from "zod";

/**
 * Design Job DTO schemas for design workflow API
 * Aligned with design_jobs, design_job_events, and design_assets tables
 */

// Design Job Status codes (from status_design_jobs table)
export const DesignJobStatusSchema = z.enum([
  "queued",
  "assigned", 
  "drafting",
  "submitted_for_review",
  "under_review", 
  "revision_requested",
  "review", // Legacy - kept for backward compatibility
  "approved",
  "rejected",
  "canceled"
]);

// Design Job main entity
export const DesignJobDTO = z.object({
  id: z.string(),
  orgId: z.string(),
  orderItemId: z.string(),
  title: z.string().optional(),
  brief: z.string().optional(),
  priority: z.number().optional(),
  statusCode: DesignJobStatusSchema.default("queued"),
  assigneeDesignerId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Design Job Event for tracking workflow progress
export const DesignJobEventDTO = z.object({
  id: z.string(),
  designJobId: z.string(),
  eventCode: z.string(),
  actorUserId: z.string().optional(),
  payload: z.record(z.any()).optional(),
  occurredAt: z.string(),
});

// Design Asset for files associated with design jobs
export const DesignAssetDTO = z.object({
  id: z.string(),
  orgId: z.string().optional(),
  orderItemId: z.string().optional(),
  uploaderId: z.string().optional(),
  version: z.number().optional(),
  fileUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  approvedByAdmin: z.boolean().optional(),
  approvedAt: z.string().optional(),
  signatureFileUrl: z.string().optional(),
  signatureHash: z.string().optional(),
  createdAt: z.string().optional(),
  storageObjectId: z.string().optional(),
});

// Design Job with related data
export const DesignJobWithDetailsDTO = DesignJobDTO.extend({
  orderItem: z.object({
    id: z.string(),
    nameSnapshot: z.string().optional(),
    quantity: z.number(),
    statusCode: z.string(),
  }).optional(),
  assignedDesigner: z.object({
    id: z.string(),
    name: z.string(),
    specializations: z.array(z.string()).optional(),
    hourlyRate: z.number().optional(),
  }).optional(),
  events: z.array(DesignJobEventDTO).optional(),
  assets: z.array(DesignAssetDTO).optional(),
});

// Create Design Job DTOs
export const CreateDesignJobDTO = DesignJobDTO.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Make orderItemId required for creation
  orderItemId: z.string(),
  orgId: z.string(),
  // Optional initial assignment
  assigneeDesignerId: z.string().optional(),
  title: z.string().optional(),
  brief: z.string().optional(),
  priority: z.number().min(1).max(10).default(5),
  statusCode: DesignJobStatusSchema.default("queued"),
});

export const UpdateDesignJobDTO = CreateDesignJobDTO.partial().extend({
  // Status transitions should be explicit
  statusCode: DesignJobStatusSchema.optional(),
});

// Status transition specific DTOs
export const UpdateDesignJobStatusDTO = z.object({
  statusCode: DesignJobStatusSchema,
  notes: z.string().optional(),
  assigneeDesignerId: z.string().optional(),
});

// Bulk operations
export const BulkCreateDesignJobsDTO = z.object({
  orderItemIds: z.array(z.string()).min(1),
  title: z.string().optional(),
  brief: z.string().optional(),
  priority: z.number().min(1).max(10).default(5),
  assigneeDesignerId: z.string().optional(),
});

// Bulk assignment with workload balancing
export const BulkAssignDesignJobsDTO = z.object({
  designJobIds: z.array(z.string()).min(1),
  designerId: z.string().optional(), // If specified, assign all to this designer
  useWorkloadBalancing: z.boolean().default(true),
  useSkillMatching: z.boolean().default(true),
  requiredSpecializations: z.array(z.string()).optional(),
  maxJobsPerDesigner: z.number().optional(),
});

// Designer workload and capacity
export const DesignerWorkloadDTO = z.object({
  designerId: z.string(),
  name: z.string(),
  specializations: z.array(z.string()),
  currentJobs: z.number(),
  capacityLimit: z.number().optional(),
  hourlyRate: z.number().optional(),
  averageCompletionTime: z.number().optional(), // in hours
  isAvailable: z.boolean(),
  workloadScore: z.number(), // 0-100, lower is less busy
});

// Designer availability tracking
export const DesignerAvailabilityDTO = z.object({
  designerId: z.string(),
  isAvailable: z.boolean(),
  unavailableUntil: z.string().optional(),
  notes: z.string().optional(),
});

// Skill matching for assignments
export const SkillMatchDTO = z.object({
  designerId: z.string(),
  name: z.string(),
  specializations: z.array(z.string()),
  matchScore: z.number(), // 0-100, higher is better match
  workloadScore: z.number(), // 0-100, lower is less busy
  overallScore: z.number(), // Combined match and workload score
});

// Designer assignment
export const AssignDesignerDTO = z.object({
  designerId: z.string(),
  notes: z.string().optional(),
  skipWorkloadCheck: z.boolean().default(false),
  skipSkillCheck: z.boolean().default(false),
});

// Smart assignment with preferences
export const SmartAssignDesignerDTO = z.object({
  requiredSpecializations: z.array(z.string()).optional(),
  preferredSpecializations: z.array(z.string()).optional(),
  maxWorkloadScore: z.number().min(0).max(100).default(80),
  prioritizeExperience: z.boolean().default(false),
  notes: z.string().optional(),
});

// Design submission for review
export const SubmitDesignDTO = z.object({
  assetIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
  submissionType: z.enum(['initial', 'revision']).default('initial'),
});

// Design review and approval
export const ReviewDesignDTO = z.object({
  approved: z.boolean(),
  feedback: z.string().optional(),
  requestRevisions: z.boolean().default(false),
  revisionNotes: z.string().optional(),
});

// Design job comments
export const DesignJobCommentDTO = z.object({
  id: z.string(),
  designJobId: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  content: z.string(),
  attachmentUrls: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateDesignJobCommentDTO = DesignJobCommentDTO.omit({
  id: true,
  authorName: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  content: z.string().min(1),
  attachmentUrls: z.array(z.string()).optional(),
});

// Design revision tracking
export const DesignRevisionDTO = z.object({
  id: z.string(),
  designJobId: z.string(),
  version: z.number(),
  assetIds: z.array(z.string()),
  status: z.enum(['draft', 'submitted', 'approved', 'rejected']),
  submittedAt: z.string().optional(),
  reviewedAt: z.string().optional(),
  reviewerId: z.string().optional(),
  feedback: z.string().optional(),
  createdAt: z.string(),
});

// Design Job filters for listing
export const DesignJobFiltersDTO = z.object({
  orgId: z.string().optional(),
  statusCode: DesignJobStatusSchema.optional(),
  assigneeDesignerId: z.string().optional(),
  orderItemId: z.string().optional(),
  priority: z.number().optional(),
  createdAfter: z.string().optional(),
  createdBefore: z.string().optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

// Design Asset upload
export const CreateDesignAssetDTO = DesignAssetDTO.omit({
  id: true,
  createdAt: true,
  approvedAt: true,
  signatureFileUrl: true,
  signatureHash: true,
}).extend({
  file: z.instanceof(File).optional(), // For frontend file uploads
  filename: z.string().optional(),
});

// Event creation
export const CreateDesignJobEventDTO = DesignJobEventDTO.omit({
  id: true,
  occurredAt: true,
}).extend({
  designJobId: z.string(),
  eventCode: z.string(),
  actorUserId: z.string().optional(),
  payload: z.record(z.any()).optional(),
});

// Design workflow transition validation
export const DesignJobTransitionDTO = z.object({
  fromStatus: DesignJobStatusSchema,
  toStatus: DesignJobStatusSchema,
  isValidTransition: z.boolean(),
  requiresApproval: z.boolean().optional(),
  allowedRoles: z.array(z.string()).optional(),
});

// TypeScript types
export type DesignJobType = z.infer<typeof DesignJobDTO>;
export type DesignJobEventType = z.infer<typeof DesignJobEventDTO>;
export type DesignAssetType = z.infer<typeof DesignAssetDTO>;
export type DesignJobWithDetailsType = z.infer<typeof DesignJobWithDetailsDTO>;
export type CreateDesignJobType = z.infer<typeof CreateDesignJobDTO>;
export type UpdateDesignJobType = z.infer<typeof UpdateDesignJobDTO>;
export type UpdateDesignJobStatusType = z.infer<typeof UpdateDesignJobStatusDTO>;
export type BulkCreateDesignJobsType = z.infer<typeof BulkCreateDesignJobsDTO>;
export type AssignDesignerType = z.infer<typeof AssignDesignerDTO>;
export type DesignJobFiltersType = z.infer<typeof DesignJobFiltersDTO>;
export type CreateDesignAssetType = z.infer<typeof CreateDesignAssetDTO>;
export type CreateDesignJobEventType = z.infer<typeof CreateDesignJobEventDTO>;
export type DesignJobTransitionType = z.infer<typeof DesignJobTransitionDTO>;
export type BulkAssignDesignJobsType = z.infer<typeof BulkAssignDesignJobsDTO>;
export type DesignerWorkloadType = z.infer<typeof DesignerWorkloadDTO>;
export type DesignerAvailabilityType = z.infer<typeof DesignerAvailabilityDTO>;
export type SkillMatchType = z.infer<typeof SkillMatchDTO>;
export type SmartAssignDesignerType = z.infer<typeof SmartAssignDesignerDTO>;
export type SubmitDesignType = z.infer<typeof SubmitDesignDTO>;
export type ReviewDesignType = z.infer<typeof ReviewDesignDTO>;
export type DesignJobCommentType = z.infer<typeof DesignJobCommentDTO>;
export type CreateDesignJobCommentType = z.infer<typeof CreateDesignJobCommentDTO>;
export type DesignRevisionType = z.infer<typeof DesignRevisionDTO>;

// Design job status validation helpers
export const isTerminalStatus = (status: string): boolean => {
  return ["approved", "canceled"].includes(status);
};

// Check if status requires review
export const requiresReview = (status: string): boolean => {
  return ["submitted_for_review", "under_review", "revisions_submitted"].includes(status);
};

// Check if status allows revisions
export const allowsRevisions = (status: string): boolean => {
  return ["revision_requested", "under_review"].includes(status);
};

export const getValidTransitions = (currentStatus: string): string[] => {
  const transitions: Record<string, string[]> = {
    "queued": ["assigned", "canceled"],
    "assigned": ["drafting", "queued", "canceled"],
    "drafting": ["submitted_for_review", "assigned", "canceled"],
    "submitted_for_review": ["under_review", "drafting"],
    "under_review": ["approved", "revision_requested"],
    "revision_requested": ["revisions_submitted", "canceled"],
    "revisions_submitted": ["under_review", "approved"],
    "review": ["approved", "rejected", "drafting"], // Legacy status
    "approved": [], // terminal
    "rejected": ["drafting", "canceled"], // Legacy status
    "canceled": [], // terminal
  };
  return transitions[currentStatus] || [];
};

export const canTransition = (from: string, to: string): boolean => {
  return getValidTransitions(from).includes(to);
};

// Additional status codes for collaboration workflow
export const CollaborationStatusSchema = z.enum([
  "submitted_for_review",
  "under_review",
  "revision_requested",
  "revisions_submitted"
]);

// Extended design job status including collaboration states
export const ExtendedDesignJobStatusSchema = z.union([
  DesignJobStatusSchema,
  CollaborationStatusSchema
]);