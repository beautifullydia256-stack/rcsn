import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import fc from 'fast-check';
import OwnerSidebar from './OwnerSidebar';

// **Validates: Requirements 2.8**

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    aside: ({ children, ...props }: any) => <aside {...props}>{children}</aside>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock useLocation hook
const mockLocation = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: () => mockLocation(),
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

// Navigation sections and their corresponding paths
const navigationSections = {
  main: ['/dashboard/owner', '/dashboard/owner/notifications'],
  schools: [
    '/dashboard/owner/schools',
    '/dashboard/owner/schools/add',
    '/dashboard/owner/schools/requests',
    '/dashboard/owner/schools/suspended',
  ],
  users: [
    '/dashboard/owner/users',
    '/dashboard/owner/users/admins',
    '/dashboard/owner/users/roles',
    '/dashboard/owner/users/activity',
  ],
  finance: [
    '/dashboard/owner/finance',
    '/dashboard/owner/finance/subscriptions',
    '/dashboard/owner/finance/invoices',
    '/dashboard/owner/finance/payouts',
  ],
  system: [
    '/dashboard/owner/system/database',
    '/dashboard/owner/system/storage',
    '/dashboard/owner/system/api',
    '/dashboard/owner/system/errors',
    '/dashboard/owner/system/audit',
  ],
  content: [
    '/dashboard/owner/content/announcements',
    '/dashboard/owner/content/support',
    '/dashboard/owner/content/features',
  ],
  settings: [
    '/dashboard/owner/settings/platform',
    '/dashboard/owner/settings/billing',
    '/dashboard/owner/settings/security',
    '/dashboard/owner/settings/backup',
  ],
};

// Generator for valid navigation paths
const pathGenerator = fc.oneof(
  ...Object.values(navigationSections).flat().map(path => fc.constant(path))
);

// Generator for sidebar props
const sidebarPropsGenerator = fc.record({
  isOpen: fc.boolean(),
  schoolsOpen: fc.boolean(),
  usersOpen: fc.boolean(),
  financeOpen: fc.boolean(),
  systemOpen: fc.boolean(),
  contentOpen: fc.boolean(),
  settingsOpen: fc.boolean(),
});

// Default owner user for tests
const defaultOwnerUser: OwnerUser = {
  name: 'Test Owner',
  email: 'owner@test.com',
  initials: 'TO',
};

// Helper function to create sidebar props
function createSidebarProps(overrides: Partial<SidebarProps> = {}): SidebarProps {
  return {
    isOpen: true,
    onClose: vi.fn(),
    ownerUser: defaultOwnerUser,
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
    ...overrides,
  };
}

// Helper function to render sidebar with router
function renderSidebarWithRouter(pathname: string, props: SidebarProps) {
  mockLocation.mockReturnValue({ pathname });
  
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <OwnerSidebar {...props} />
    </MemoryRouter>
  );
}

// Helper function to determine which section should be active for a given path
function getExpectedActiveSection(pathname: string): string | null {
  for (const [section, paths] of Object.entries(navigationSections)) {
    if (paths.some(path => pathname.startsWith(path))) {
      return section;
    }
  }
  return null;
}

// Helper function to check if a section group button has active styling
function isSectionActive(sectionLabel: string, container: HTMLElement): boolean {
  const buttons = container.querySelectorAll('button');
  for (const button of buttons) {
    if (button.textContent?.includes(sectionLabel)) {
      return button.classList.contains('ow-nav-link--group-active') ||
             button.classList.contains('ow-nav-link--active');
    }
  }
  return false;
}

// Helper function to check if a nav link has active styling
function isNavLinkActive(linkText: string, container: HTMLElement): boolean {
  const links = container.querySelectorAll('a');
  for (const link of links) {
    if (link.textContent?.includes(linkText)) {
      return link.classList.contains('ow-nav-link--active') ||
             link.classList.contains('ow-nav-subitem--active');
    }
  }
  return false;
}

describe('OwnerSidebar Navigation State Consistency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Property 5: Navigation State Consistency', () => {
    it('should highlight the correct section for any valid navigation path', () => {
      // **Property 5: Navigation State Consistency**
      // **Validates: Requirements 2.8**
      
      fc.assert(
        fc.property(
          pathGenerator,
          sidebarPropsGenerator,
          (pathname, sidebarConfig) => {
            const props = createSidebarProps(sidebarConfig);
            const { container } = renderSidebarWithRouter(pathname, props);
            
            const expectedActiveSection = getExpectedActiveSection(pathname);
            
            // Verify that the correct section is highlighted
            if (expectedActiveSection) {
              switch (expectedActiveSection) {
                case 'main':
                  // Main section items should be directly active (not grouped)
                  if (pathname === '/dashboard/owner') {
                    expect(isNavLinkActive('Dashboard', container)).toBe(true);
                  } else if (pathname === '/dashboard/owner/notifications') {
                    expect(isNavLinkActive('Notifications', container)).toBe(true);
                  }
                  break;
                  
                case 'schools':
                  // Schools section should be active when any schools path is current
                  expect(isSectionActive('Schools', container)).toBe(true);
                  break;
                  
                case 'users':
                  // Users section should be active when any users path is current
                  expect(isSectionActive('Users', container)).toBe(true);
                  break;
                  
                case 'finance':
                  // Finance section should be active when any finance path is current
                  expect(isSectionActive('Finance', container)).toBe(true);
                  break;
                  
                case 'system':
                  // System section should be active when any system path is current
                  expect(isSectionActive('System', container)).toBe(true);
                  break;
                  
                case 'content':
                  // Content section should be active when any content path is current
                  expect(isSectionActive('Content', container)).toBe(true);
                  break;
                  
                case 'settings':
                  // Settings section should be active when any settings path is current
                  expect(isSectionActive('Settings', container)).toBe(true);
                  break;
              }
            }
            
            // Verify that only one section is active at a time (mutual exclusivity)
            const sectionLabels = ['Schools', 'Users', 'Finance', 'System', 'Content', 'Settings'];
            const activeSections = sectionLabels.filter(label => isSectionActive(label, container));
            
            // For grouped sections, at most one should be active
            expect(activeSections.length).toBeLessThanOrEqual(1);
            
            // Verify consistency: if a section is active, it should match the current path
            if (activeSections.length === 1) {
              const activeSection = activeSections[0].toLowerCase();
              const pathSection = getExpectedActiveSection(pathname);
              
              if (pathSection && pathSection !== 'main') {
                expect(activeSection).toBe(pathSection);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain active state consistency across page refreshes', () => {
      // **Property 5: Navigation State Consistency** 
      // **Validates: Requirements 2.8**
      
      fc.assert(
        fc.property(
          pathGenerator,
          (pathname) => {
            const props = createSidebarProps();
            
            // Render sidebar multiple times with same path (simulating page refresh)
            const render1 = renderSidebarWithRouter(pathname, props);
            const render2 = renderSidebarWithRouter(pathname, props);
            
            const expectedActiveSection = getExpectedActiveSection(pathname);
            
            if (expectedActiveSection) {
              // Both renders should have the same active state
              const sectionLabels = ['Schools', 'Users', 'Finance', 'System', 'Content', 'Settings'];
              
              for (const label of sectionLabels) {
                const active1 = isSectionActive(label, render1.container);
                const active2 = isSectionActive(label, render2.container);
                
                expect(active1).toBe(active2);
              }
              
              // Main section links should also be consistent
              const mainLinks = ['Dashboard', 'Notifications'];
              for (const link of mainLinks) {
                const active1 = isNavLinkActive(link, render1.container);
                const active2 = isNavLinkActive(link, render2.container);
                
                expect(active1).toBe(active2);
              }
            }
            
            render1.unmount();
            render2.unmount();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should correctly handle section expansion state independent of active highlighting', () => {
      // **Property 5: Navigation State Consistency**
      // **Validates: Requirements 2.8**
      
      fc.assert(
        fc.property(
          pathGenerator,
          fc.record({
            schoolsOpen: fc.boolean(),
            usersOpen: fc.boolean(),
            financeOpen: fc.boolean(),
            systemOpen: fc.boolean(),
            contentOpen: fc.boolean(),
            settingsOpen: fc.boolean(),
          }),
          (pathname, expansionState) => {
            const props = createSidebarProps({
              ...expansionState,
              isOpen: true,
            });
            
            const { container } = renderSidebarWithRouter(pathname, props);
            
            // Active highlighting should be independent of expansion state
            const expectedActiveSection = getExpectedActiveSection(pathname);
            
            if (expectedActiveSection && expectedActiveSection !== 'main') {
              const sectionLabel = expectedActiveSection.charAt(0).toUpperCase() + expectedActiveSection.slice(1);
              
              // Section should be active regardless of whether it's expanded
              expect(isSectionActive(sectionLabel, container)).toBe(true);
              
              // Expansion state should not affect active highlighting
              const isExpanded = (expansionState as any)[`${expectedActiveSection}Open`];
              
              // The section should still be highlighted as active
              expect(isSectionActive(sectionLabel, container)).toBe(true);
              
              // But expansion state should be independent
              // (We can't easily test DOM expansion state without more complex selectors,
              // but the key point is that active highlighting works regardless)
            }
          }
        ),
        { numRuns: 75 }
      );
    });

    it('should handle edge cases and invalid paths gracefully', () => {
      // **Property 5: Navigation State Consistency**
      // **Validates: Requirements 2.8**
      
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('/dashboard/owner/invalid'),
            fc.constant('/dashboard/owner/schools/nonexistent'),
            fc.constant('/dashboard/owner/users/invalid/path'),
            fc.constant('/completely/different/path'),
            fc.constant(''),
            fc.constant('/'),
          ),
          (invalidPath) => {
            const props = createSidebarProps();
            
            // Should not throw errors with invalid paths
            expect(() => {
              const { container } = renderSidebarWithRouter(invalidPath, props);
              
              // For invalid paths, no sections should be active
              const sectionLabels = ['Schools', 'Users', 'Finance', 'System', 'Content', 'Settings'];
              const activeSections = sectionLabels.filter(label => isSectionActive(label, container));
              
              // Invalid paths should not activate any sections
              if (!invalidPath.startsWith('/dashboard/owner')) {
                expect(activeSections.length).toBe(0);
              }
            }).not.toThrow();
          }
        ),
        { numRuns: 25 }
      );
    });
  });

  // Unit tests for specific examples
  describe('Specific Navigation Examples', () => {
    it('should highlight Dashboard for root owner path', () => {
      const props = createSidebarProps();
      const { container } = renderSidebarWithRouter('/dashboard/owner', props);
      
      expect(isNavLinkActive('Dashboard', container)).toBe(true);
      expect(isNavLinkActive('Notifications', container)).toBe(false);
    });

    it('should highlight Schools section for any schools path', () => {
      const schoolsPaths = [
        '/dashboard/owner/schools',
        '/dashboard/owner/schools/add',
        '/dashboard/owner/schools/requests',
        '/dashboard/owner/schools/suspended',
      ];

      for (const path of schoolsPaths) {
        const props = createSidebarProps();
        const { container } = renderSidebarWithRouter(path, props);
        
        expect(isSectionActive('Schools', container)).toBe(true);
        
        // Other sections should not be active
        expect(isSectionActive('Users', container)).toBe(false);
        expect(isSectionActive('Finance', container)).toBe(false);
      }
    });

    it('should highlight Users section for any users path', () => {
      const usersPaths = [
        '/dashboard/owner/users',
        '/dashboard/owner/users/admins',
        '/dashboard/owner/users/roles',
        '/dashboard/owner/users/activity',
      ];

      for (const path of usersPaths) {
        const props = createSidebarProps();
        const { container } = renderSidebarWithRouter(path, props);
        
        expect(isSectionActive('Users', container)).toBe(true);
        
        // Other sections should not be active
        expect(isSectionActive('Schools', container)).toBe(false);
        expect(isSectionActive('Finance', container)).toBe(false);
      }
    });
  });
});