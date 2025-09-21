import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDesignJob, getDesignJobById } from '../../services/supabase/designJobs';

// Mock the client module
vi.mock('../../services/supabase/client');

const mockSupabaseClient = {
  from: vi.fn(),
};

// Create chainable mock
const createMockChain = (returnValue: any) => {
  const chain = {
    from: vi.fn(() => chain),
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve(returnValue)),
  };
  return chain;
};

describe('Design Jobs Service - Happy Path Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const { getSupabaseClient } = require('../../services/supabase/client');
    (getSupabaseClient as any).mockReturnValue(mockSupabaseClient);
  });

  it('should successfully create a new design job', async () => {
    const mockDesignJobData = {
      id: '660e8400-e29b-41d4-a716-446655440000',
      org_id: 'org-456',
      order_item_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Custom Logo Design',
      brief: 'Design a modern logo for team jersey',
      priority: 3,
      status_code: 'pending',
      assignee_designer_id: null,
      created_at: '2025-09-21T10:00:00Z',
      updated_at: '2025-09-21T10:00:00Z'
    };

    const mockChain = createMockChain({ data: mockDesignJobData, error: null });
    (mockSupabaseClient.from as any).mockReturnValue(mockChain);

    const createInput = {
      org_id: 'org-456',
      order_item_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Custom Logo Design',
      brief: 'Design a modern logo for team jersey',
      priority: 3
    };

    const result = await createDesignJob(createInput);

    expect(result.data).toEqual(mockDesignJobData);
    expect(result.error).toBeNull();
  });

  it('should successfully get a design job by ID', async () => {
    const mockDesignJobData = {
      id: '660e8400-e29b-41d4-a716-446655440000',
      org_id: 'org-456',
      order_item_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Custom Logo Design',
      status_code: 'pending'
    };

    const mockChain = createMockChain({ data: mockDesignJobData, error: null });
    (mockSupabaseClient.from as any).mockReturnValue(mockChain);

    const result = await getDesignJobById('660e8400-e29b-41d4-a716-446655440000');

    expect(result.data).toEqual(mockDesignJobData);
    expect(result.error).toBeNull();
  });

  it('should handle database errors gracefully', async () => {
    const mockChain = createMockChain({ data: null, error: { message: 'Invalid UUID format' } });
    (mockSupabaseClient.from as any).mockReturnValue(mockChain);

    const result = await getDesignJobById('invalid-uuid');

    expect(result.data).toBeNull();
    expect(result.error).toContain('Failed to get design job');
  });
});