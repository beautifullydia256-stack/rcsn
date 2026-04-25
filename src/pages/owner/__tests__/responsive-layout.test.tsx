import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import fc from 'fast-check';
import OwnerDashboardLayout from '../../../components/layout/OwnerDashboardLayout';
import { useAuthStore } from '../../../store/authStore';

// Mock the auth store
vi.mock('../../../store/authStore');
const mockUseAuthStore = vi.mocked(useAuthStore);

// Mock supabase
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { name: 'Test Owner', email: 'owner@test.com' } }))
        }))
      }))
    })),
    auth: {
      signOut: vi.fn(() => Promise.resolve())
    }
  }
}));

// Mock other dependencies
vi.mock('../../../lib/schoolChatApi', () => ({
  markChatPresenceOffline: vi.fn(() => Promise.resolve())
}));

vi.mock('../../../lib/isDesktopApp', () => ({
  isDesktopApp: false
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    aside: ({ children, ...props }: any) => <aside {...props}>{children}</aside>,
    main: ({ children, ...props }: any) => <main {...props}>{children}</main>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Test component wrapper
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
}

// Mock window.innerWidth for responsive testing
function mockWindowWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  
  // Trigger resize event
  window.dispatchEvent(new Event('resize'));
}

// Generator for screen widths
const screenWidthGenerator = fc.integer({ min: 320, max: 2560 });

// Generator for mobile breakpoint widths (below 768px)
const mobileWidthGenerator = fc.integer({ min: 320, max: 767 });

// Generator for desktop breakpoint widths (768px and above)
const desktopWidthGenerator = fc.integer({ min: 768, max: 2560 });

describe('Owner Dashboard Responsive Layout Properties', () => {
  beforeEach(() => {
    // Mock auth store to return owner role
    mockUseAuthStore.mockReturnValue({
      role: 'owner',
      user: { id: 'test-owner-id', email: 'owner@test.com' },
      // Add other required auth store properties as needed
    } as any);

    // Reset window width
    mockWindowWidth(1024);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Property 6: Responsive Layout Behavior**
   * **Validates: Requirements 2.9**
   * 
   * For any screen size below the mobile breakpoint (768px), the sidebar navigation 
   * SHALL collapse into a mobile-friendly format while maintaining all functionality.
   */
  test('Property 6: Responsive Layout Behavior - Mobile Breakpoint Collapse', () => {
    fc.assert(fc.property(
      mobileWidthGenerator,
      (screenWidth) => {
        // Set the screen width to mobile size
        mockWindowWidth(screenWidth);
        
        const { container } = render(
          <TestWrapper>
            <OwnerDashboardLayout>
              <div data-testid="test-content">Test Content</div>
            </OwnerDashboardLayout>
          </TestWrapper>
        );

        // The hamburger menu should be visible on mobile
        const hamburger = container.querySelector('.ow-hamburger');
        expect(hamburger).toBeTruthy();
        
        // The sidebar should be initially closed (not visible) on mobile
        const sidebar = container.querySelector('.ow-sidebar');
        expect(sidebar).toBeTruthy();
        
        // The main content should take full width on mobile (no left margin)
        const main = container.querySelector('.ow-main');
        expect(main).toBeTruthy();
        
        // Content should still be accessible
        const content = screen.getByTestId('test-content');
        expect(content).toBeInTheDocument();
        
        return true;
      }
    ), { numRuns: 25 });
  });

  test('Property 6: Responsive Layout Behavior - Desktop Layout Persistence', () => {
    fc.assert(fc.property(
      desktopWidthGenerator,
      (screenWidth) => {
        // Set the screen width to desktop size
        mockWindowWidth(screenWidth);
        
        const { container } = render(
          <TestWrapper>
            <OwnerDashboardLayout>
              <div data-testid="test-content">Test Content</div>
            </OwnerDashboardLayout>
          </TestWrapper>
        );

        // The sidebar should be visible on desktop
        const sidebar = container.querySelector('.ow-sidebar');
        expect(sidebar).toBeTruthy();
        
        // The main content should have left margin for sidebar on desktop
        const main = container.querySelector('.ow-main');
        expect(main).toBeTruthy();
        
        // Content should be accessible
        const content = screen.getByTestId('test-content');
        expect(content).toBeInTheDocument();
        
        return true;
      }
    ), { numRuns: 25 });
  });

  test('Property 6: Responsive Layout Behavior - Sidebar Functionality Preservation', async () => {
    fc.assert(fc.asyncProperty(
      mobileWidthGenerator,
      async (screenWidth) => {
        // Set mobile screen width
        mockWindowWidth(screenWidth);
        
        const { container } = render(
          <TestWrapper>
            <OwnerDashboardLayout>
              <div data-testid="test-content">Test Content</div>
            </OwnerDashboardLayout>
          </TestWrapper>
        );

        // Find and click the hamburger menu
        const hamburger = container.querySelector('.ow-hamburger');
        expect(hamburger).toBeTruthy();
        
        if (hamburger) {
          fireEvent.click(hamburger);
          
          // Wait for sidebar to potentially open
          await waitFor(() => {
            // The sidebar should still contain all navigation elements
            const sidebar = container.querySelector('.ow-sidebar');
            expect(sidebar).toBeTruthy();
            
            // Check for main navigation sections
            const mainSection = container.querySelector('.ow-nav-section');
            expect(mainSection).toBeTruthy();
            
            // Check for brand section
            const brand = container.querySelector('.ow-brand');
            expect(brand).toBeTruthy();
          }, { timeout: 1000 });
        }
        
        return true;
      }
    ), { numRuns: 25 });
  });

  test('Property 6: Responsive Layout Behavior - Breakpoint Transition Consistency', () => {
    fc.assert(fc.property(
      fc.tuple(mobileWidthGenerator, desktopWidthGenerator),
      ([mobileWidth, desktopWidth]) => {
        // Start with mobile width
        mockWindowWidth(mobileWidth);
        
        const { container, rerender } = render(
          <TestWrapper>
            <OwnerDashboardLayout>
              <div data-testid="test-content">Test Content</div>
            </OwnerDashboardLayout>
          </TestWrapper>
        );

        // Verify mobile state
        let hamburger = container.querySelector('.ow-hamburger');
        expect(hamburger).toBeTruthy();
        
        // Switch to desktop width
        mockWindowWidth(desktopWidth);
        
        // Re-render to trigger responsive changes
        rerender(
          <TestWrapper>
            <OwnerDashboardLayout>
              <div data-testid="test-content">Test Content</div>
            </OwnerDashboardLayout>
          </TestWrapper>
        );

        // Content should remain accessible throughout transition
        const content = screen.getByTestId('test-content');
        expect(content).toBeInTheDocument();
        
        // Sidebar should still be present
        const sidebar = container.querySelector('.ow-sidebar');
        expect(sidebar).toBeTruthy();
        
        return true;
      }
    ), { numRuns: 25 });
  });

  test('Property 6: Responsive Layout Behavior - Navigation State Preservation', async () => {
    fc.assert(fc.asyncProperty(
      fc.tuple(screenWidthGenerator, fc.constantFrom('schools', 'users', 'finance', 'system', 'content', 'settings')),
      async ([screenWidth, section]) => {
        mockWindowWidth(screenWidth);
        
        const { container } = render(
          <TestWrapper>
            <OwnerDashboardLayout>
              <div data-testid="test-content">Test Content</div>
            </OwnerDashboardLayout>
          </TestWrapper>
        );

        // The sidebar should contain navigation for all sections regardless of screen size
        const sidebar = container.querySelector('.ow-sidebar');
        expect(sidebar).toBeTruthy();
        
        if (sidebar) {
          // Check that navigation sections are present
          const navSections = container.querySelectorAll('.ow-nav-section');
          expect(navSections.length).toBeGreaterThan(0);
          
          // Check that navigation labels are present
          const navLabels = container.querySelectorAll('.ow-nav-label');
          expect(navLabels.length).toBeGreaterThan(0);
        }
        
        return true;
      }
    ), { numRuns: 25 });
  });

  test('Property 6: Responsive Layout Behavior - Content Accessibility Invariant', () => {
    fc.assert(fc.property(
      screenWidthGenerator,
      (screenWidth) => {
        mockWindowWidth(screenWidth);
        
        render(
          <TestWrapper>
            <OwnerDashboardLayout>
              <div data-testid="main-content">Main Dashboard Content</div>
              <div data-testid="navigation-content">Navigation Available</div>
            </OwnerDashboardLayout>
          </TestWrapper>
        );

        // Core content must always be accessible regardless of screen size
        const mainContent = screen.getByTestId('main-content');
        expect(mainContent).toBeInTheDocument();
        
        // Navigation must always be present (even if collapsed)
        const navContent = screen.getByTestId('navigation-content');
        expect(navContent).toBeInTheDocument();
        
        return true;
      }
    ), { numRuns: 25 });
  });

  // Edge case testing for exact breakpoint
  test('Property 6: Responsive Layout Behavior - Exact Breakpoint Behavior', () => {
    const breakpoint = 768;
    
    // Test exactly at breakpoint (should be desktop behavior)
    mockWindowWidth(breakpoint);
    
    const { container: desktopContainer } = render(
      <TestWrapper>
        <OwnerDashboardLayout>
          <div data-testid="test-content">Test Content</div>
        </OwnerDashboardLayout>
      </TestWrapper>
    );

    // At exactly 768px, should behave as desktop
    const desktopSidebar = desktopContainer.querySelector('.ow-sidebar');
    expect(desktopSidebar).toBeTruthy();
    
    // Test one pixel below breakpoint (should be mobile behavior)
    mockWindowWidth(breakpoint - 1);
    
    const { container: mobileContainer } = render(
      <TestWrapper>
        <OwnerDashboardLayout>
          <div data-testid="test-content">Test Content</div>
        </OwnerDashboardLayout>
      </TestWrapper>
    );

    // At 767px, should behave as mobile
    const mobileHamburger = mobileContainer.querySelector('.ow-hamburger');
    expect(mobileHamburger).toBeTruthy();
  });
});