import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createOrder, getOrderById } from '../../services/supabase/orders';

// Mock the client module
vi.mock('../../services/supabase/client');

const mockSupabaseClient = {
  from: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  single: vi.fn(),
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

describe('Orders Service - Happy Path Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const { getSupabaseClient } = require('../../services/supabase/client');
    (getSupabaseClient as any).mockReturnValue(mockSupabaseClient);
  });

  it('should successfully create a new order', async () => {
    const mockOrderData = {
      id: 'order-123',
      org_id: 'org-456',
      customer_id: 'customer-789',
      code: 'ORD-001',
      customer_contact_name: 'John Doe',
      customer_contact_email: 'john@example.com',
      status_code: 'pending',
      total_amount: 100.00,
      total_items: 2,
      created_at: '2025-09-21T10:00:00Z',
      updated_at: '2025-09-21T10:00:00Z'
    };

    const mockChain = createMockChain({ data: mockOrderData, error: null });
    (mockSupabaseClient.from as any).mockReturnValue(mockChain);

    const createInput = {
      org_id: 'org-456',
      customer_id: 'customer-789',
      code: 'ORD-001',
      customer_contact_name: 'John Doe',
      customer_contact_email: 'john@example.com'
    };

    const result = await createOrder(createInput);

    expect(result.data).toEqual(mockOrderData);
    expect(result.error).toBeNull();
  });

  it('should successfully get an order by ID with tenant scoping', async () => {
    const mockOrderData = {
      id: 'order-123',
      org_id: 'org-456',
      code: 'ORD-001',
      customer_contact_name: 'John Doe'
    };

    const mockChain = createMockChain({ data: mockOrderData, error: null });
    (mockSupabaseClient.from as any).mockReturnValue(mockChain);

    const result = await getOrderById('order-123', 'org-456');

    expect(result.data).toEqual(mockOrderData);
    expect(result.error).toBeNull();
  });

  it('should handle database errors gracefully', async () => {
    const mockChain = createMockChain({ data: null, error: { message: 'Database connection failed' } });
    (mockSupabaseClient.from as any).mockReturnValue(mockChain);

    const result = await getOrderById('invalid-id', 'org-456');

    expect(result.data).toBeNull();
    expect(result.error).toContain('Failed to get order');
  });
});