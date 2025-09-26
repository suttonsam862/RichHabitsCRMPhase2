import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DesignJobService } from '../../server/services/designJobService';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { 
  CreateDesignJobType,
  SubmitDesignType,
  ReviewDesignType,
  DesignJobType 
} from '../../shared/dtos';

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
  rpc: vi.fn(),
} as unknown as SupabaseClient;

// Mock WorkOrderService
vi.mock('../../server/services/workOrderService', () => ({
  WorkOrderService: {
    createWorkOrder: vi.fn(),
  }
}));

describe('DesignJobService', () => {
  let mockQuery: any;
  let mockSelect: any;
  let mockInsert: any;
  let mockUpdate: any;
  let mockEq: any;
  let mockSingle: any;
  let mockReturning: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create mock chain
    mockSingle = vi.fn();
    mockReturning = vi.fn();
    mockEq = vi.fn().mockReturnThis();
    mockSelect = vi.fn().mockReturnThis();
    mockInsert = vi.fn().mockReturnThis();
    mockUpdate = vi.fn().mockReturnThis();
    
    mockQuery = {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      eq: mockEq,
      single: mockSingle,
      returning: mockReturning,
    };

    // Setup default return chains
    mockSelect.mockReturnValue(mockQuery);
    mockInsert.mockReturnValue(mockQuery);
    mockUpdate.mockReturnValue(mockQuery);
    mockEq.mockReturnValue(mockQuery);
    mockReturning.mockReturnValue(mockQuery);

    // Mock supabase from() method
    (mockSupabaseClient.from as any).mockReturnValue(mockQuery);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('submitDesignForReview', () => {
    const mockDesignJobId = 'design-job-123';
    const mockOrgId = 'org-123';
    const mockActorUserId = 'user-123';
    const mockSubmissionData: SubmitDesignType = {
      assetIds: ['asset-1', 'asset-2'],
      notes: 'Design ready for review',
      submissionType: 'initial'
    };

    it('should successfully submit design for review', async () => {
      // Mock updateDesignJobStatus response
      const mockUpdatedJob: DesignJobType = {
        id: mockDesignJobId,
        orgId: mockOrgId,
        orderItemId: 'order-item-123',
        assigneeDesignerId: 'designer-123',
        statusCode: 'submitted_for_review',
        priority: 3,
        createdAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-01-20T11:00:00Z'
      };

      // Mock DesignJobService.updateDesignJobStatus
      const updateStatusSpy = vi.spyOn(DesignJobService, 'updateDesignJobStatus')
        .mockResolvedValue(mockUpdatedJob);

      // Mock DesignJobService.createDesignJobEvent
      const createEventSpy = vi.spyOn(DesignJobService, 'createDesignJobEvent')
        .mockResolvedValue(undefined);

      const result = await DesignJobService.submitDesignForReview(
        mockSupabaseClient,
        mockDesignJobId,
        mockOrgId,
        mockActorUserId,
        mockSubmissionData
      );

      expect(updateStatusSpy).toHaveBeenCalledWith(
        mockSupabaseClient,
        mockDesignJobId,
        'submitted_for_review',
        mockOrgId,
        mockActorUserId,
        mockSubmissionData.notes
      );

      expect(createEventSpy).toHaveBeenCalledWith(
        mockSupabaseClient,
        expect.objectContaining({
          designJobId: mockDesignJobId,
          eventCode: 'DESIGN_SUBMITTED',
          actorUserId: mockActorUserId,
          payload: expect.objectContaining({
            submission_type: mockSubmissionData.submissionType,
            asset_ids: mockSubmissionData.assetIds,
            notes: mockSubmissionData.notes,
            timestamp: expect.any(String)
          })
        })
      );

      expect(result).toEqual(mockUpdatedJob);
    });

    it('should handle submission without optional data', async () => {
      const mockUpdatedJob: DesignJobType = {
        id: mockDesignJobId,
        orgId: mockOrgId,
        orderItemId: 'order-item-123',
        assigneeDesignerId: 'designer-123',
        statusCode: 'submitted_for_review',
        priority: 3,
        createdAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-01-20T11:00:00Z'
      };

      const updateStatusSpy = vi.spyOn(DesignJobService, 'updateDesignJobStatus')
        .mockResolvedValue(mockUpdatedJob);
      const createEventSpy = vi.spyOn(DesignJobService, 'createDesignJobEvent')
        .mockResolvedValue({} as any);

      const result = await DesignJobService.submitDesignForReview(
        mockSupabaseClient,
        mockDesignJobId,
        mockOrgId,
        mockActorUserId
      );

      expect(updateStatusSpy).toHaveBeenCalledWith(
        mockSupabaseClient,
        mockDesignJobId,
        'submitted_for_review',
        mockOrgId,
        mockActorUserId,
        undefined
      );

      expect(createEventSpy).toHaveBeenCalledWith(
        mockSupabaseClient,
        expect.objectContaining({
          designJobId: mockDesignJobId,
          eventCode: 'DESIGN_SUBMITTED',
          actorUserId: mockActorUserId,
          payload: expect.objectContaining({
            asset_ids: [],
            notes: undefined
          })
        })
      );

      expect(result).toEqual(mockUpdatedJob);
    });

    it('should handle updateDesignJobStatus errors', async () => {
      const error = new Error('Database error');
      vi.spyOn(DesignJobService, 'updateDesignJobStatus')
        .mockRejectedValue(error);

      await expect(
        DesignJobService.submitDesignForReview(
          mockSupabaseClient,
          mockDesignJobId,
          mockOrgId,
          mockActorUserId,
          mockSubmissionData
        )
      ).rejects.toThrow('Database error');
    });

    it('should handle createDesignJobEvent errors', async () => {
      const mockUpdatedJob: DesignJobType = {
        id: mockDesignJobId,
        orgId: mockOrgId,
        orderItemId: 'order-item-123',
        assigneeDesignerId: 'designer-123',
        statusCode: 'submitted_for_review',
        priority: 3,
        createdAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-01-20T11:00:00Z'
      };

      vi.spyOn(DesignJobService, 'updateDesignJobStatus')
        .mockResolvedValue(mockUpdatedJob);
      vi.spyOn(DesignJobService, 'createDesignJobEvent')
        .mockRejectedValue(new Error('Event creation failed'));

      await expect(
        DesignJobService.submitDesignForReview(
          mockSupabaseClient,
          mockDesignJobId,
          mockOrgId,
          mockActorUserId,
          mockSubmissionData
        )
      ).rejects.toThrow('Event creation failed');
    });
  });

  describe('reviewDesign', () => {
    const mockDesignJobId = 'design-job-123';
    const mockOrgId = 'org-123';
    const mockActorUserId = 'reviewer-123';
    const mockReviewData: ReviewDesignType = {
      approved: true,
      feedback: 'Looks good, approved!',
      requestRevisions: false,
      revisionNotes: undefined
    };

    it('should successfully approve design', async () => {
      const mockUpdatedJob: DesignJobType = {
        id: mockDesignJobId,
        orgId: mockOrgId,
        orderItemId: 'order-item-123',
        assigneeDesignerId: 'designer-123',
        statusCode: 'approved',
        priority: 3,
        createdAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-01-20T11:00:00Z'
      };

      const updateStatusSpy = vi.spyOn(DesignJobService, 'updateDesignJobStatus')
        .mockResolvedValue(mockUpdatedJob);
      const createEventSpy = vi.spyOn(DesignJobService, 'createDesignJobEvent')
        .mockResolvedValue({} as any);

      const result = await DesignJobService.reviewDesign(
        mockSupabaseClient,
        mockDesignJobId,
        mockOrgId,
        mockActorUserId,
        mockReviewData
      );

      expect(updateStatusSpy).toHaveBeenCalledWith(
        mockSupabaseClient,
        mockDesignJobId,
        'approved',
        mockOrgId,
        mockActorUserId,
        mockReviewData.feedback
      );

      expect(createEventSpy).toHaveBeenCalledWith(
        mockSupabaseClient,
        expect.objectContaining({
          designJobId: mockDesignJobId,
          eventCode: 'DESIGN_APPROVED',
          actorUserId: mockActorUserId,
          payload: expect.objectContaining({
            approved: true,
            feedback: mockReviewData.feedback,
            request_revisions: mockReviewData.requestRevisions,
            revision_notes: mockReviewData.revisionNotes
          })
        })
      );

      expect(result).toEqual(mockUpdatedJob);
    });

    it('should successfully request design revisions', async () => {
      const revisionData: ReviewDesignType = {
        approved: false,
        feedback: 'Please adjust the logo placement',
        requestRevisions: true,
        revisionNotes: 'Please adjust the logo placement and color'
      };

      const mockUpdatedJob: DesignJobType = {
        id: mockDesignJobId,
        orgId: mockOrgId,
        orderItemId: 'order-item-123',
        assigneeDesignerId: 'designer-123',
        statusCode: 'revision_requested',
        priority: 3,
        createdAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-01-20T11:00:00Z'
      };

      const updateStatusSpy = vi.spyOn(DesignJobService, 'updateDesignJobStatus')
        .mockResolvedValue(mockUpdatedJob);
      const createEventSpy = vi.spyOn(DesignJobService, 'createDesignJobEvent')
        .mockResolvedValue({} as any);

      const result = await DesignJobService.reviewDesign(
        mockSupabaseClient,
        mockDesignJobId,
        mockOrgId,
        mockActorUserId,
        revisionData
      );

      expect(updateStatusSpy).toHaveBeenCalledWith(
        mockSupabaseClient,
        mockDesignJobId,
        'revision_requested',
        mockOrgId,
        mockActorUserId,
        revisionData.feedback
      );

      expect(createEventSpy).toHaveBeenCalledWith(
        mockSupabaseClient,
        expect.objectContaining({
          designJobId: mockDesignJobId,
          eventCode: 'REVISIONS_REQUESTED',
          actorUserId: mockActorUserId,
          payload: expect.objectContaining({
            approved: false,
            feedback: revisionData.feedback,
            request_revisions: revisionData.requestRevisions,
            revision_notes: revisionData.revisionNotes
          })
        })
      );

      expect(result).toEqual(mockUpdatedJob);
    });
  });

  describe('createDesignJob', () => {
    const mockCreateData: CreateDesignJobType = {
      orgId: 'org-123',
      orderItemId: 'order-item-123',
      assigneeDesignerId: 'designer-123',
      statusCode: 'queued',
      priority: 3,
      title: 'Custom logo design',
      brief: 'Create custom logo design'
    };

    it('should successfully create design job', async () => {
      const mockCreatedJob: DesignJobType = {
        id: 'design-job-123',
        ...mockCreateData,
        createdAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-01-20T10:00:00Z'
      };

      // Mock database call
      mockSingle.mockResolvedValue({ data: mockCreatedJob, error: null });

      const createEventSpy = vi.spyOn(DesignJobService, 'createDesignJobEvent')
        .mockResolvedValue(undefined);

      const result = await DesignJobService.createDesignJob(
        mockSupabaseClient,
        'order-item-123',
        'org-123',
        'actor-123',
        mockCreateData
      );

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('design_jobs');
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        org_id: mockCreateData.orgId,
        order_item_id: mockCreateData.orderItemId,
        assignee_designer_id: mockCreateData.assigneeDesignerId,
        status_code: mockCreateData.statusCode,
        priority: mockCreateData.priority,
        title: mockCreateData.title,
        brief: mockCreateData.brief
      }));

      expect(createEventSpy).toHaveBeenCalledWith(
        mockSupabaseClient,
        expect.objectContaining({
          designJobId: mockCreatedJob.id,
          eventCode: 'DESIGN_JOB_CREATED',
          actorUserId: 'actor-123'
        })
      );

      expect(result).toEqual(mockCreatedJob);
    });

    it('should handle database errors during creation', async () => {
      const error = new Error('Database constraint violation');
      mockSingle.mockResolvedValue({ data: null, error });

      await expect(
        DesignJobService.createDesignJob(
          mockSupabaseClient,
          'order-item-123',
          'org-123',
          'actor-123',
          mockCreateData
        )
      ).rejects.toThrow('Failed to create design job: Database constraint violation');
    });

    it('should handle missing data response', async () => {
      mockSingle.mockResolvedValue({ data: null, error: null });

      await expect(
        DesignJobService.createDesignJob(
          mockSupabaseClient,
          'order-item-123',
          'org-123',
          'actor-123',
          mockCreateData
        )
      ).rejects.toThrow('Failed to create design job');
    });
  });

  describe('bulkCreateDesignJobs', () => {
    const mockBulkData: CreateDesignJobType[] = [
      {
        orgId: 'org-123',
        orderItemId: 'order-item-1',
        assigneeDesignerId: 'designer-123',
        statusCode: 'queued',
        priority: 3,
        title: 'Design 1',
        brief: 'Create design 1'
      },
      {
        orgId: 'org-123',
        orderItemId: 'order-item-2',
        assigneeDesignerId: 'designer-456',
        statusCode: 'queued',
        priority: 2,
        title: 'Design 2',
        brief: 'Create design 2'
      }
    ];

    it('should successfully create multiple design jobs', async () => {
      const mockCreatedJobs: DesignJobType[] = mockBulkData.map((data, index) => ({
        id: `design-job-${index + 1}`,
        ...data,
        createdAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-01-20T10:00:00Z'
      }));

      // Mock database call
      mockReturning.mockResolvedValue({ data: mockCreatedJobs, error: null });

      const createEventSpy = vi.spyOn(DesignJobService, 'createDesignJobEvent')
        .mockResolvedValue(undefined);

      const result = await DesignJobService.bulkCreateDesignJobs(
        mockSupabaseClient,
        ['order-item-1', 'order-item-2'],
        'org-123',
        'actor-123',
        {}
      );

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('design_jobs');
      expect(mockInsert).toHaveBeenCalledWith(
        mockBulkData.map(data => expect.objectContaining({
          org_id: data.orgId,
          order_item_id: data.orderItemId,
          assignee_designer_id: data.assigneeDesignerId,
          status_code: data.statusCode,
          priority: data.priority,
          title: data.title,
          brief: data.brief
        }))
      );

      expect(createEventSpy).toHaveBeenCalledTimes(mockBulkData.length);
      expect(result).toEqual(mockCreatedJobs);
    });

    it('should handle empty array input', async () => {
      const result = await DesignJobService.bulkCreateDesignJobs(
        mockSupabaseClient,
        [],
        'org-123',
        'actor-123'
      );

      expect(result).toEqual([]);
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it('should handle partial creation failures', async () => {
      const error = new Error('Some jobs failed to create');
      mockReturning.mockResolvedValue({ data: null, error });

      await expect(
        DesignJobService.bulkCreateDesignJobs(
          mockSupabaseClient,
          ['order-item-1', 'order-item-2'],
          'org-123',
          'actor-123',
          {}
        )
      ).rejects.toThrow('Failed to bulk create design jobs: Some jobs failed to create');
    });
  });

  describe('isValidStatusTransition', () => {
    it('should validate correct status transitions', () => {
      expect(DesignJobService.isValidStatusTransition('draft', 'in_progress')).toBe(true);
      expect(DesignJobService.isValidStatusTransition('in_progress', 'submitted_for_review')).toBe(true);
      expect(DesignJobService.isValidStatusTransition('submitted_for_review', 'approved')).toBe(true);
      expect(DesignJobService.isValidStatusTransition('submitted_for_review', 'revision_requested')).toBe(true);
    });

    it('should reject invalid status transitions', () => {
      expect(DesignJobService.isValidStatusTransition('draft', 'approved')).toBe(false);
      expect(DesignJobService.isValidStatusTransition('approved', 'draft')).toBe(false);
      expect(DesignJobService.isValidStatusTransition('completed', 'in_progress')).toBe(false);
    });

    it('should handle unknown status codes', () => {
      expect(DesignJobService.isValidStatusTransition('unknown', 'draft')).toBe(false);
      expect(DesignJobService.isValidStatusTransition('draft', 'unknown')).toBe(false);
    });
  });

  describe('getValidTransitions', () => {
    it('should return valid transitions for each status', () => {
      const draftTransitions = DesignJobService.getValidTransitions('draft');
      expect(draftTransitions).toContain('in_progress');
      expect(draftTransitions).toContain('cancelled');

      const inProgressTransitions = DesignJobService.getValidTransitions('in_progress');
      expect(inProgressTransitions).toContain('submitted_for_review');
      expect(inProgressTransitions).toContain('cancelled');

      const approvedTransitions = DesignJobService.getValidTransitions('approved');
      expect(approvedTransitions).toContain('completed');
    });

    it('should return empty array for terminal statuses', () => {
      expect(DesignJobService.getValidTransitions('completed')).toEqual([]);
      expect(DesignJobService.getValidTransitions('cancelled')).toEqual([]);
    });

    it('should handle unknown status codes', () => {
      expect(DesignJobService.getValidTransitions('unknown')).toEqual([]);
    });
  });
});