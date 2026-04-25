import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import UsersManagementPage from '../page';

// Mock Supabase
const mockSupabase = {
  auth: {
    getSession: vi.fn(() => Promise.resolve({
      data: { session: { access_token: 'mock-token' } }
    }))
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null })),
        head: vi.fn(() => Promise.resolve({ count: 0 })),
        gte: vi.fn(() => ({
          head: vi.fn(() => Promise.resolve({ count: 0 }))
        }))
      })),
      head: vi.fn(() => Promise.resolve({ count: 0 })),
      gte: vi.fn(() => ({
        head: vi.fn(() => Promise.resolve({ count: 0 }))
      })),
      order: vi.fn(() => Promise.resolve({ data: [] }))
    }))
  }))
};

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock fetch for API calls
global.fetch = vi.fn();

// Test component wrapper
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
}

describe('Users Management System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API responses
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          users: [],
          totalCount: 0,
          pagination: { limit: 50, offset: 0, hasMore: false },
          summary: {
            totalByRole: {},
            activeUsers: 0,
            inactiveUsers: 0
          }
        }
      })
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('renders users management page with all tabs', async () => {
    render(
      <TestWrapper>
        <UsersManagementPage />
      </TestWrapper>
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading user management...')).not.toBeInTheDocument();
    });

    // Check main heading
    expect(screen.getByText('Users Management')).toBeInTheDocument();
    expect(screen.getByText('Manage users across all schools on the platform')).toBeInTheDocument();

    // Check navigation tabs
    expect(screen.getByText('All Users')).toBeInTheDocument();
    expect(screen.getByText('Admins')).toBeInTheDocument();
    expect(screen.getByText('User Roles')).toBeInTheDocument();
    expect(screen.getByText('Login Activity')).toBeInTheDocument();
  });

  test('displays user statistics correctly', async () => {
    // Mock stats data
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        head: vi.fn(() => Promise.resolve({ count: 150 })),
        gte: vi.fn(() => ({
          head: vi.fn(() => Promise.resolve({ count: 120 }))
        })),
        order: vi.fn(() => Promise.resolve({ 
          data: [
            { role: 'admin' },
            { role: 'admin' },
            { role: 'teacher' },
            { role: 'teacher' },
            { role: 'teacher' },
            { role: 'student' },
            { role: 'parent' }
          ]
        }))
      }))
    });

    render(
      <TestWrapper>
        <UsersManagementPage />
      </TestWrapper>
    );

    // Wait for stats to load
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument(); // Total users
      expect(screen.getByText('120')).toBeInTheDocument(); // Active users
    });

    // Check stats cards
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('Active Users (30d)')).toBeInTheDocument();
    expect(screen.getByText('Admins')).toBeInTheDocument();
    expect(screen.getByText('Recent Logins (24h)')).toBeInTheDocument();
  });

  test('tab navigation works correctly', async () => {
    render(
      <TestWrapper>
        <UsersManagementPage />
      </TestWrapper>
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading user management...')).not.toBeInTheDocument();
    });

    // Click on Admins tab
    const adminsTab = screen.getByText('Admins');
    fireEvent.click(adminsTab);

    // Should show admins content
    await waitFor(() => {
      expect(screen.getByText('School Administrators')).toBeInTheDocument();
    });

    // Click on User Roles tab
    const userRolesTab = screen.getByText('User Roles');
    fireEvent.click(userRolesTab);

    // Should show user roles content
    await waitFor(() => {
      expect(screen.getByText('User Roles & Permissions')).toBeInTheDocument();
    });

    // Click on Login Activity tab
    const loginActivityTab = screen.getByText('Login Activity');
    fireEvent.click(loginActivityTab);

    // Should show login activity content
    await waitFor(() => {
      expect(screen.getByText('Login Activity & Security Monitoring')).toBeInTheDocument();
    });
  });

  test('refresh stats button works', async () => {
    render(
      <TestWrapper>
        <UsersManagementPage />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.queryByText('Loading user management...')).not.toBeInTheDocument();
    });

    // Click refresh button
    const refreshButton = screen.getByText('Refresh Stats');
    fireEvent.click(refreshButton);

    // Should trigger new API calls
    expect(mockSupabase.from).toHaveBeenCalled();
  });

  test('back to dashboard link is present', async () => {
    render(
      <TestWrapper>
        <UsersManagementPage />
      </TestWrapper>
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading user management...')).not.toBeInTheDocument();
    });

    // Check back link
    const backLink = screen.getByText('← Back to Dashboard');
    expect(backLink).toBeInTheDocument();
    expect(backLink.closest('a')).toHaveAttribute('href', '/dashboard/owner');
  });

  test('handles loading state correctly', () => {
    // Mock loading state
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        head: vi.fn(() => new Promise(() => {})), // Never resolves to simulate loading
      }))
    });

    render(
      <TestWrapper>
        <UsersManagementPage />
      </TestWrapper>
    );

    // Should show loading state
    expect(screen.getByText('Loading user management...')).toBeInTheDocument();
  });

  test('role distribution displays correctly', async () => {
    // Mock role data
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        head: vi.fn(() => Promise.resolve({ count: 100 })),
        gte: vi.fn(() => ({
          head: vi.fn(() => Promise.resolve({ count: 80 }))
        })),
        order: vi.fn(() => Promise.resolve({ 
          data: [
            { role: 'admin' },
            { role: 'admin' },
            { role: 'teacher' },
            { role: 'teacher' },
            { role: 'teacher' },
            { role: 'teacher' },
            { role: 'teacher' },
            { role: 'student' },
            { role: 'student' },
            { role: 'student' },
            { role: 'parent' },
            { role: 'parent' }
          ]
        }))
      }))
    });

    render(
      <TestWrapper>
        <UsersManagementPage />
      </TestWrapper>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('User Distribution by Role')).toBeInTheDocument();
    });

    // Should show role counts
    expect(screen.getByText('2')).toBeInTheDocument(); // Admin count
    expect(screen.getByText('5')).toBeInTheDocument(); // Teacher count
    expect(screen.getByText('3')).toBeInTheDocument(); // Student count
  });
});

describe('Users Management API Integration', () => {
  test('makes correct API calls for user data', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          users: [
            {
              userId: 'user1',
              name: 'Test User',
              email: 'test@example.com',
              role: 'admin',
              schoolId: 'school1',
              schoolName: 'Test School',
              status: 'active',
              isActive: true
            }
          ],
          totalCount: 1,
          pagination: { limit: 50, offset: 0, hasMore: false },
          summary: {
            totalByRole: { admin: 1 },
            activeUsers: 1,
            inactiveUsers: 0
          }
        }
      })
    });

    global.fetch = mockFetch;

    render(
      <TestWrapper>
        <UsersManagementPage />
      </TestWrapper>
    );

    // Wait for API call
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/owner/users'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token'
          })
        })
      );
    });
  });

  test('handles API errors gracefully', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('API Error'));
    global.fetch = mockFetch;

    // Mock console.error to avoid test output noise
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <TestWrapper>
        <UsersManagementPage />
      </TestWrapper>
    );

    // Should handle error gracefully and not crash
    await waitFor(() => {
      expect(screen.queryByText('Loading user management...')).not.toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });
});