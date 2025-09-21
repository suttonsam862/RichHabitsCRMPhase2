import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createOrderItem, getOrderItemById } from '../../services/supabase/orderItems';

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

describe('Order Items Service - Happy Path Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const { getSupabaseClient } = require('../../services/supabase/client');
    (getSupabaseClient as any).mockReturnValue(mockSupabaseClient);
  });

  it('should successfully create a new order item', async () => {
    const mockOrderItemData = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      org_id: 'org-456',
      order_id: 'order-123',
      name: 'Custom Jersey',
      description: 'Red jersey with custom logo',
      quantity: 5,
      unit_price: 25.00,
      total_price: 125.00,
      status_code: 'pending',
      created_at: '2025-09-21T10:00:00Z',
      updated_at: '2025-09-21T10:00:00Z'
    };

    const mockChain = createMockChain({ data: mockOrderItemData, error: null });
    (mockSupabaseClient.from as any).mockReturnValue(mockChain);

    const createInput = {
      org_id: 'org-456',
      order_id: 'order-123',
      name: 'Custom Jersey',
      description: 'Red jersey with custom logo',
      quantity: 5,
      unit_price: 25.00
    };

    const result = await createOrderItem(createInput);

    expect(result.data).toEqual(mockOrderItemData);
    expect(result.error).toBeNull();
  });

  it('should successfully get an order item by ID', async () => {
    const mockOrderItemData = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      org_id: 'org-456',
      order_id: 'order-123',
      name: 'Custom Jersey',
      quantity: 5,
      unit_price: 25.00,
      status_code: 'pending'
    };

    const mockChain = createMockChain({ data: mockOrderItemData, error: null });
    (mockSupabaseClient.from as any).mockReturnValue(mockChain);

    const result = await getOrderItemById('550e8400-e29b-41d4-a716-446655440000');

    expect(result.data).toEqual(mockOrderItemData);
    expect(result.error).toBeNull();
  });

  it('should handle database errors gracefully', async () => {
    const mockChain = createMockChain({ data: null, error: { message: 'Invalid UUID format' } });
    (mockSupabaseClient.from as any).mockReturnValue(mockChain);

    const result = await getOrderItemById('invalid-uuid');

    expect(result.data).toBeNull();
    expect(result.error).toContain('Failed to get order item');
  });
});