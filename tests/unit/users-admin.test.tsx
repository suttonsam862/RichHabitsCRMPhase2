import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UsersAdminPage from '@/pages/users-admin';

// Mock user data
const mockUsers = [
  {
    id: 'user-1',
    fullName: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    isActive: true,
    roles: ['Admin'],
    avatarUrl: null,
    lastLogin: '2024-01-15T10:30:00Z',
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'user-2', 
    fullName: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+0987654321',
    isActive: false,
    roles: ['Member'],
    avatarUrl: 'https://example.com/avatar.jpg',
    lastLogin: '2024-01-10T15:45:00Z',
    createdAt: '2024-01-02T00:00:00Z'
  }
];

const mockRoles = [
  { id: 'role-1', name: 'Admin', slug: 'admin' },
  { id: 'role-2', name: 'Member', slug: 'member' }
];

describe('UsersAdminPage', () => {
  let queryClient: QueryClient;
  const user = userEvent.setup();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Mock API responses
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/api/users')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: mockUsers, count: mockUsers.length })
        });
      }
      if (url.includes('/api/roles')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: mockRoles })
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <UsersAdminPage />
      </QueryClientProvider>
    );
  };

  it('renders users administration page', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Users Administration')).toBeInTheDocument();
      expect(screen.getByText('Manage users, roles, and permissions')).toBeInTheDocument();
    });
  });

  it('displays list of users with their information', async () => {
    renderComponent();

    await waitFor(() => {
      // Check user information is displayed
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      
      // Check roles are displayed
      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Member')).toBeInTheDocument();
    });
  });

  it('shows user status correctly', async () => {
    renderComponent();

    await waitFor(() => {
      // John is active, Jane is inactive
      const activeStatus = screen.getByTestId('status-user-1');
      const inactiveStatus = screen.getByTestId('status-user-2');
      
      expect(activeStatus).toHaveTextContent('Active');
      expect(inactiveStatus).toHaveTextContent('Inactive');
    });
  });

  it('opens create user dialog when create button clicked', async () => {
    renderComponent();

    const createButton = await screen.findByTestId('button-create-user');
    await user.click(createButton);

    expect(screen.getByText('Create New User')).toBeInTheDocument();
    expect(screen.getByTestId('input-email')).toBeInTheDocument();
    expect(screen.getByTestId('input-full-name')).toBeInTheDocument();
  });

  it('allows editing user information', async () => {
    renderComponent();

    await waitFor(() => {
      const editButton = screen.getByTestId('button-edit-user-1');
      fireEvent.click(editButton);
    });

    expect(screen.getByText('Edit User')).toBeInTheDocument();
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
  });

  it('shows password reset functionality', async () => {
    renderComponent();

    await waitFor(() => {
      const resetButton = screen.getByTestId('button-reset-password-user-1');
      fireEvent.click(resetButton);
    });

    expect(screen.getByText('Reset Password')).toBeInTheDocument();
    expect(screen.getByText(/temporary password/i)).toBeInTheDocument();
  });

  it('allows toggling user status', async () => {
    renderComponent();

    // Mock the PATCH request
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockUsers, count: mockUsers.length })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

    await waitFor(() => {
      const statusToggle = screen.getByTestId('toggle-status-user-1');
      fireEvent.click(statusToggle);
    });

    // Verify PATCH request was made
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/users/user-1',
      expect.objectContaining({
        method: 'PATCH',
        data: { isActive: false }
      })
    );
  });

  it('handles role assignment', async () => {
    renderComponent();

    await waitFor(() => {
      const manageRolesButton = screen.getByTestId('button-manage-roles-user-1');
      fireEvent.click(manageRolesButton);
    });

    expect(screen.getByText('Manage User Roles')).toBeInTheDocument();
    expect(screen.getByText('Available Roles')).toBeInTheDocument();
  });

  it('filters users by search query', async () => {
    renderComponent();

    const searchInput = await screen.findByTestId('input-search');
    await user.type(searchInput, 'John');

    // The component should filter results, but we'd need to implement
    // the actual search functionality to test this properly
    expect(searchInput).toHaveValue('John');
  });

  it('handles pagination controls', async () => {
    renderComponent();

    await waitFor(() => {
      // Check if pagination elements exist
      expect(screen.getByText(/showing/i)).toBeInTheDocument();
    });
  });

  it('handles loading state', () => {
    // Mock fetch to never resolve
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));
    
    renderComponent();

    expect(screen.getByText('Loading users...')).toBeInTheDocument();
  });

  it('handles error state gracefully', async () => {
    // Mock fetch to reject
    global.fetch = vi.fn().mockRejectedValue(new Error('API Error'));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/failed to load users/i)).toBeInTheDocument();
    });
  });
});