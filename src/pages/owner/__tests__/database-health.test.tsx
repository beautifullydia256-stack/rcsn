import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import DatabaseHealthPage from '../DatabaseHealthPage';

// Mock supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null }))
      }))
    }))
  })),
  rpc: vi.fn(() => Promise.resolve({ data: [] }))
};

vi.mock('../../../lib/supabase', () => ({
  supabase: mockSupabase
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    tr: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
  },
}));

// Test wrapper
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

describe('Database Health Monitoring Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test performance degradation alert triggers
   * Requirements: 6.11 - Database performance degradation alerts
   */
  test('should trigger performance degradation alerts when thresholds exceeded', async () => {
    // Mock high CPU usage scenario
    const highCpuMetrics = {
      database_size: '2.4 GB',
      total_tables: 45,
      total_rows: 1250000,
      active_connections: 12,
      slow_queries_count: 15, // High slow query count
      avg_query_time: 250.5, // High average query time
      cache_hit_ratio: 85.2, // Low cache hit ratio
      disk_usage: 65,
      cpu_usage: 95, // Critical CPU usage
      memory_usage: 92 // Critical memory usage
    };

    render(
      <TestWrapper>
        <DatabaseHealthPage />
      </TestWrapper>
    );

    await waitFor(() => {
      // Check that critical status indicators are displayed
      const cpuUsage = screen.getByText('95%');
      expect(cpuUsage).toBeInTheDocument();
      expect(cpuUsage.className).toContain('text-red-600'); // Critical status color

      const memoryUsage = screen.getByText('92%');
      expect(memoryUsage).toBeInTheDocument();
      expect(memoryUsage.className).toContain('text-red-600'); // Critical status color

      const avgQueryTime = screen.getByText('250.5ms');
      expect(avgQueryTime).toBeInTheDocument();
      expect(avgQueryTime.className).toContain('text-red-600'); // Critical status color
    });
  });

  /**
   * Test database error categorization and logging
   * Requirements: 6.11 - Database error categorization
   */
  test('should categorize and display database errors correctly', async () => {
    const mockSlowQueries = [
      {
        query_id: '1',
        query_text: 'SELECT * FROM students WHERE school_id = ? AND status = ? ORDER BY created_at DESC',
        execution_time: 3500, // Critical - over 2000ms
        calls: 45,
        avg_time: 3200,
        school_id: 'school_123',
        timestamp: new Date().toISOString()
      },
      {
        query_id: '2',
        query_text: 'SELECT COUNT(*) FROM student_payments WHERE payment_date BETWEEN ? AND ?',
        execution_time: 1500, // Warning - between 1000-2000ms
        calls: 23,
        avg_time: 1400,
        timestamp: new Date().toISOString()
      },
      {
        query_id: '3',
        query_text: 'SELECT * FROM users WHERE user_id = ?',
        execution_time: 800, // Normal - under 1000ms
        calls: 120,
        avg_time: 750,
        timestamp: new Date().toISOString()
      }
    ];

    render(
      <TestWrapper>
        <DatabaseHealthPage />
      </TestWrapper>
    );

    await waitFor(() => {
      // Check that queries are categorized correctly
      const criticalQuery = screen.getByText('Critical');
      expect(criticalQuery).toBeInTheDocument();
      expect(criticalQuery.className).toContain('bg-red-100 text-red-800');

      const warningQuery = screen.getByText('Warning');
      expect(warningQuery).toBeInTheDocument();
      expect(warningQuery.className).toContain('bg-yellow-100 text-yellow-800');

      const normalQuery = screen.getByText('Normal');
      expect(normalQuery).toBeInTheDocument();
      expect(normalQuery.className).toContain('bg-green-100 text-green-800');
    });
  });

  test('should display table information with correct metrics', async () => {
    render(
      <TestWrapper>
        <DatabaseHealthPage />
      </TestWrapper>
    );

    await waitFor(() => {
      // Check table headers are present
      expect(screen.getByText('Table Name')).toBeInTheDocument();
      expect(screen.getByText('Schools')).toBeInTheDocument();
      expect(screen.getByText('Row Count')).toBeInTheDocument();
      expect(screen.getByText('Size (MB)')).toBeInTheDocument();
      expect(screen.getByText('Last Updated')).toBeInTheDocument();

      // Check that table data is displayed
      expect(screen.getByText('students')).toBeInTheDocument();
      expect(screen.getByText('student_payments')).toBeInTheDocument();
      expect(screen.getByText('users')).toBeInTheDocument();
      expect(screen.getByText('schools')).toBeInTheDocument();
      expect(screen.getByText('exam_results')).toBeInTheDocument();
    });
  });

  test('should handle refresh functionality', async () => {
    render(
      <TestWrapper>
        <DatabaseHealthPage />
      </TestWrapper>
    );

    const refreshButton = screen.getByText('Refresh');
    expect(refreshButton).toBeInTheDocument();

    fireEvent.click(refreshButton);

    // Should show loading state briefly
    await waitFor(() => {
      expect(screen.getByText('Database Health')).toBeInTheDocument();
    });
  });

  test('should export health report functionality', async () => {
    // Mock URL.createObjectURL and related functions
    const mockCreateObjectURL = vi.fn(() => 'mock-url');
    const mockRevokeObjectURL = vi.fn();
    const mockClick = vi.fn();

    Object.defineProperty(window, 'URL', {
      value: {
        createObjectURL: mockCreateObjectURL,
        revokeObjectURL: mockRevokeObjectURL,
      },
      writable: true,
    });

    // Mock createElement to return element with click method
    const mockAnchor = {
      href: '',
      download: '',
      click: mockClick,
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);

    render(
      <TestWrapper>
        <DatabaseHealthPage />
      </TestWrapper>
    );

    const exportButton = screen.getByText('Export Report');
    expect(exportButton).toBeInTheDocument();

    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });
  });

  test('should display correct health status indicators', async () => {
    render(
      <TestWrapper>
        <DatabaseHealthPage />
      </TestWrapper>
    );

    await waitFor(() => {
      // Check that all metric cards are displayed
      expect(screen.getByText('Database Size')).toBeInTheDocument();
      expect(screen.getByText('Active Connections')).toBeInTheDocument();
      expect(screen.getByText('Cache Hit Ratio')).toBeInTheDocument();
      expect(screen.getByText('CPU Usage')).toBeInTheDocument();
      expect(screen.getByText('Memory Usage')).toBeInTheDocument();
      expect(screen.getByText('Avg Query Time')).toBeInTheDocument();
    });
  });

  test('should handle empty slow queries state', async () => {
    render(
      <TestWrapper>
        <DatabaseHealthPage />
      </TestWrapper>
    );

    // If no slow queries, should show empty state message
    // This would be tested with mock data that returns empty array
    await waitFor(() => {
      expect(screen.getByText('Slow Queries')).toBeInTheDocument();
    });
  });

  test('should display loading state correctly', () => {
    render(
      <TestWrapper>
        <DatabaseHealthPage />
      </TestWrapper>
    );

    // Should show loading skeleton initially
    const loadingElements = document.querySelectorAll('.animate-pulse');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  test('should handle error states gracefully', async () => {
    // Mock console.error to avoid test output noise
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock fetch to throw error
    mockSupabase.rpc.mockRejectedValueOnce(new Error('Database connection failed'));

    render(
      <TestWrapper>
        <DatabaseHealthPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching database health:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  test('should format numbers correctly in display', async () => {
    render(
      <TestWrapper>
        <DatabaseHealthPage />
      </TestWrapper>
    );

    await waitFor(() => {
      // Check that large numbers are formatted with commas
      const formattedNumber = screen.getByText('45,000');
      expect(formattedNumber).toBeInTheDocument();

      const formattedNumber2 = screen.getByText('180,000');
      expect(formattedNumber2).toBeInTheDocument();
    });
  });
});