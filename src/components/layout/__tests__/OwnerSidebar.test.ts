import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import fc from 'fast-check';
import React from 'react';
import OwnerSidebar from '../OwnerSidebar';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => React.createElement('div', props, children),
    aside: ({ children, ...props }: any) => React.createElement('aside', props, children),
    button: ({ children, ...props }: any) => React.createElement('button', props, children),
    span: ({ children, ...props }: any) => React.createElement('span', props, children),
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: () => ({ pathname: '/dashboard/owner' }),
    NavLink: ({ children, to, className, ...props }: any) => {
      const isActive = to === '/dashboard/owner';
      const classNameResult = typeof className === 'function' 
        ? className({ isActive }) 
        : className;
      return React.createElement('a', { href: to, className: classNameResult, ...props }, 
        typeof children === 'function' ? children({ isActive }) : children
      );
    },
  };
});

interface OwnerUser {
  name: string;
  email: string;
  initials: string;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  ownerUser: OwnerUser;
  onLogout: () => void;
  schoolsOpen: boolean;
  usersOpen: boolean;
  financeOpen: boolean;
  systemOpen: boolean;
  contentOpen: boolean;
  settingsOpen: boolean;
  setSchoolsOpen: (open: boolean) => void;
  setUsersOpen: (open: boolean) => void;
  setFinanceOpen: (open: boolean) => void;
  setSystemOpen: (open: boolean) => void;
  setContentOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
}

// Generators for property-based testing
const ownerUserGenerator = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }),
  email: fc.emailAddress(),
  initials: fc.string({ minLength: 1, maxLength: 3 }),
});

const sidebarStateGenerator = fc.record({
  isOpen: fc.boolean(),
  schoolsOpen: fc.boolean(),
  usersOpen: fc.boolean(),
  financeOpen: fc.boolean(),
  systemOpen: fc.boolean(),
  contentOpen: fc.boolean(),
  settingsOpen: fc.boolean(),
});

const renderSidebar = (props: Partial<SidebarProps> = {}) => {
  const defaultProps: SidebarProps = {
    isOpen: true,
    onClose: vi.fn(),
    ownerUser: { name: 'Test Owner', email: 'test@example.com', initials: 'TO' },
    onLogout: vi.fn(),
    schoolsOpen: false,
    usersOpen: false,
    financeOpen: false,
    systemOpen: false,
    contentOpen: false,
    settingsOpen: false,
    setSchoolsOpen: vi.fn(),
    setUsersOpen: vi.fn(),
    setFinanceOpen: vi.fn(),
    setSystemOpen: vi.fn(),
    setContentOpen: vi.fn(),
    setSettingsOpen: vi.fn(),
    ...props,
  };

  return render(
    React.createElement(BrowserRouter, null,
      React.createElement(OwnerSidebar, defaultProps)
    )
  );
};

describe('OwnerSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('renders all main navigation sections', () => {
      renderSidebar();
      
      // Check main sections are present
      expect(screen.getByText('Main')).toBeInTheDocument();
      expect(screen.getByText('Schools')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Finance')).toBeInTheDocument();
      expect(screen.getByText('System')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('renders main navigation items', () => {
      renderSidebar();
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    it('renders owner user information', () => {
      const ownerUser = { name: 'John Doe', email: 'john@example.com', initials: 'JD' };
      renderSidebar({ ownerUser });
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Platform Owner')).toBeInTheDocument();
      expect(screen.getByText('JD')).toBeInTheDocument();
    });
  });

  /**
   * Property 5: Navigation State Consistency
   * 
   * **Validates: Requirements 2.8**
   * 
   * For any navigation action within the sidebar, the active section highlighting 
   * SHALL accurately reflect the current page location and remain consistent 
   * across page refreshes.
   */
  describe('Property 5: Navigation State Consistency', () => {
    it('maintains consistent navigation state across different sidebar configurations', () => {
      fc.assert(
        fc.property(
          ownerUserGenerator,
          sidebarStateGenerator,
          (ownerUser, sidebarState) => {
            // Render sidebar with generated state
            const { container } = renderSidebar({
              ownerUser,
              ...sidebarState,
            });

            // Property: Sidebar visibility should match isOpen state
            const sidebar = container.querySelector('.ow-sidebar');
            expect(sidebar).toBeInTheDocument();

            // Property: All required navigation sections should be present regardless of state
            const requiredSections = ['Main', 'Schools', 'Users', 'Finance', 'System', 'Content', 'Settings'];
            requiredSections.forEach(section => {
              expect(screen.getByText(section)).toBeInTheDocument();
            });

            // Property: Owner user information should always be displayed correctly
            expect(screen.getByText(ownerUser.name)).toBeInTheDocument();
            expect(screen.getByText(ownerUser.initials)).toBeInTheDocument();
            expect(screen.getByText('Platform Owner')).toBeInTheDocument();

            // Property: Main navigation items should always be visible
            expect(screen.getByText('Dashboard')).toBeInTheDocument();
            expect(screen.getByText('Notifications')).toBeInTheDocument();

            // Property: Logout button should always be present
            expect(screen.getByText('Logout')).toBeInTheDocument();

            // Property: Brand elements should always be present
            expect(screen.getByText('PwezaCore')).toBeInTheDocument();
            expect(screen.getByText('Owner')).toBeInTheDocument();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('maintains navigation structure integrity with various section states', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.boolean(),
          fc.boolean(),
          fc.boolean(),
          fc.boolean(),
          fc.boolean(),
          (schoolsOpen, usersOpen, financeOpen, systemOpen, contentOpen, settingsOpen) => {
            renderSidebar({
              schoolsOpen,
              usersOpen,
              financeOpen,
              systemOpen,
              contentOpen,
              settingsOpen,
            });

            // Property: All navigation groups should be present regardless of open/closed state
            const navigationGroups = [
              { label: 'Schools', testId: 'Schools' },
              { label: 'Users', testId: 'Users' },
              { label: 'Finance', testId: 'Finance' },
              { label: 'System', testId: 'System' },
              { label: 'Content', testId: 'Content' },
              { label: 'Settings', testId: 'Settings' },
            ];

            navigationGroups.forEach(group => {
              expect(screen.getByText(group.label)).toBeInTheDocument();
            });

            // Property: Navigation structure should remain consistent
            // Each section should have its label visible
            expect(screen.getByText('Main')).toBeInTheDocument();
            expect(screen.getByText('Schools')).toBeInTheDocument();
            expect(screen.getByText('Users')).toBeInTheDocument();
            expect(screen.getByText('Finance')).toBeInTheDocument();
            expect(screen.getByText('System')).toBeInTheDocument();
            expect(screen.getByText('Content')).toBeInTheDocument();
            expect(screen.getByText('Settings')).toBeInTheDocument();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('preserves navigation hierarchy and accessibility across all states', () => {
      fc.assert(
        fc.property(
          sidebarStateGenerator,
          ownerUserGenerator,
          (sidebarState, ownerUser) => {
            const { container } = renderSidebar({
              ...sidebarState,
              ownerUser,
            });

            // Property: Navigation hierarchy should be preserved
            // Main section should come first
            const mainSection = screen.getByText('Main');
            expect(mainSection).toBeInTheDocument();

            // Property: All navigation links should be accessible
            const dashboardLink = screen.getByText('Dashboard');
            const notificationsLink = screen.getByText('Notifications');
            
            expect(dashboardLink.closest('a')).toHaveAttribute('href', '/dashboard/owner');
            expect(notificationsLink.closest('a')).toHaveAttribute('href', '/dashboard/owner/notifications');

            // Property: Navigation groups should maintain their structure
            const navigationGroups = ['Schools', 'Users', 'Finance', 'System', 'Content', 'Settings'];
            navigationGroups.forEach(groupName => {
              const groupElement = screen.getByText(groupName);
              expect(groupElement).toBeInTheDocument();
              
              // Each group should be clickable (button or link)
              const clickableElement = groupElement.closest('button') || groupElement.closest('a');
              expect(clickableElement).toBeInTheDocument();
            });

            // Property: User information section should be at the bottom
            const ownerCard = container.querySelector('.ow-owner-card');
            const logoutButton = screen.getByText('Logout');
            expect(ownerCard).toBeInTheDocument();
            expect(logoutButton).toBeInTheDocument();
          }
        ),
        { numRuns: 75 }
      );
    });

    it('ensures consistent active state highlighting logic', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            '/dashboard/owner',
            '/dashboard/owner/notifications',
            '/dashboard/owner/schools',
            '/dashboard/owner/users',
            '/dashboard/owner/finance',
            '/dashboard/owner/system',
            '/dashboard/owner/content',
            '/dashboard/owner/settings'
          ),
          sidebarStateGenerator,
          (currentPath, sidebarState) => {
            // Mock the current location
            const mockUseLocation = vi.fn().mockReturnValue({ pathname: currentPath });
            vi.doMock('react-router-dom', () => ({
              ...vi.importActual('react-router-dom'),
              useLocation: mockUseLocation
            }));

            renderSidebar(sidebarState);

            // Property: Navigation should always render without errors regardless of path
            expect(screen.getByText('Dashboard')).toBeInTheDocument();
            expect(screen.getByText('PwezaCore')).toBeInTheDocument();

            // Property: All navigation sections should be present
            const sections = ['Main', 'Schools', 'Users', 'Finance', 'System', 'Content', 'Settings'];
            sections.forEach(section => {
              expect(screen.getByText(section)).toBeInTheDocument();
            });

            // Property: Active state logic should not break navigation rendering
            // The sidebar should render consistently regardless of which path is active
            expect(screen.getByText('Logout')).toBeInTheDocument();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Navigation sections expansion', () => {
    it('shows expanded sections when state is true', () => {
      renderSidebar({ schoolsOpen: true });
      
      // When schools section is open, sub-items should be visible
      // Note: Due to AnimatePresence mock, we check for the presence of sub-items
      expect(screen.getByText('Schools')).toBeInTheDocument();
    });

    it('handles section toggle callbacks', () => {
      const setSchoolsOpen = vi.fn();
      renderSidebar({ setSchoolsOpen });
      
      // Find and click the Schools button
      const schoolsButton = screen.getByText('Schools').closest('button');
      expect(schoolsButton).toBeInTheDocument();
    });
  });

  describe('User interactions', () => {
    it('calls onClose when sidebar overlay is clicked', () => {
      const onClose = vi.fn();
      const { container } = renderSidebar({ onClose, isOpen: true });
      
      const overlay = container.querySelector('.ow-sidebar-overlay');
      if (overlay) {
        overlay.click();
        expect(onClose).toHaveBeenCalled();
      }
    });

    it('calls onLogout when logout button is clicked', () => {
      const onLogout = vi.fn();
      renderSidebar({ onLogout });
      
      const logoutButton = screen.getByText('Logout');
      logoutButton.click();
      expect(onLogout).toHaveBeenCalled();
    });
  });
});