import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OrgQuickViewDialog } from '../../client/src/components/org-quick-view-dialog';

// Mock the organization summary API response
const mockOrgSummary = {
  organization: {
    id: 'test-org-id',
    name: 'Test Organization',
    email: 'test@example.com',
    phone: '555-0123',
    status: 'School',
    colorPalette: ['#FF0000', '#00FF00'],
  },
  branding: [
    { name: 'logo.png', url: 'https://example.com/logo.png', size: 1024 }
  ],
  sports: [
    { sport: 'Basketball', contactName: 'John Coach', contactEmail: 'coach@school.edu' }
  ],
  users: [
    { fullName: 'Jane Admin', email: 'admin@school.edu', roles: ['Admin'] }
  ],
  summary: {
    totalUsers: 1,
    totalSports: 1,
    totalBrandingFiles: 1
  }
};

describe('OrgQuickViewDialog', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Mock fetch to return our mock data
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockOrgSummary,
    });
  });

  const renderComponent = (isOpen = true, orgId = 'test-org-id') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <OrgQuickViewDialog
          open={isOpen}
          onClose={() => {}}
          organizationId={orgId}
        />
      </QueryClientProvider>
    );
  };

  it('renders organization quick view dialog when open', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Organization')).toBeInTheDocument();
    });

    // Check that all tabs are present
    expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /branding/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /sports/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /users/i })).toBeInTheDocument();
  });

  it('displays organization information correctly', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Organization')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('555-0123')).toBeInTheDocument();
      expect(screen.getByText('School')).toBeInTheDocument();
    });
  });

  it('shows branding files in grid layout', async () => {
    renderComponent();

    // Switch to branding tab
    fireEvent.click(screen.getByRole('tab', { name: /branding/i }));

    await waitFor(() => {
      expect(screen.getByText('logo.png')).toBeInTheDocument();
      expect(screen.getByText('1.0 KB')).toBeInTheDocument();
    });
  });

  it('displays sports and contacts information', async () => {
    renderComponent();

    // Switch to sports tab
    fireEvent.click(screen.getByRole('tab', { name: /sports/i }));

    await waitFor(() => {
      expect(screen.getByText('Basketball')).toBeInTheDocument();
      expect(screen.getByText('John Coach')).toBeInTheDocument();
      expect(screen.getByText('coach@school.edu')).toBeInTheDocument();
    });
  });

  it('shows users and their roles', async () => {
    renderComponent();

    // Switch to users tab
    fireEvent.click(screen.getByRole('tab', { name: /users/i }));

    await waitFor(() => {
      expect(screen.getByText('Jane Admin')).toBeInTheDocument();
      expect(screen.getByText('admin@school.edu')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });
  });

  it('handles loading state properly', () => {
    // Mock fetch to never resolve to simulate loading
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));
    
    renderComponent();

    expect(screen.getByText('Loading organization details...')).toBeInTheDocument();
  });

  it('handles error state gracefully', async () => {
    // Mock fetch to reject
    global.fetch = vi.fn().mockRejectedValue(new Error('API Error'));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/failed to load organization data/i)).toBeInTheDocument();
    });
  });

  it('does not render when closed', () => {
    renderComponent(false);

    expect(screen.queryByText('Test Organization')).not.toBeInTheDocument();
  });
});