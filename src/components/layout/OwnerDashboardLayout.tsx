import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { markChatPresenceOffline } from '../../lib/schoolChatApi';
import { useAuthStore } from '../../store/authStore';
import { isDesktopApp } from '../../lib/isDesktopApp';
import ThemedLoadingView from '../ui/ThemedLoadingView';
import { OwnerErrorBoundary } from '../OwnerErrorBoundary';
import OwnerSidebar from './OwnerSidebar';
import '../../styles/owner-sidebar.css';
import { hasRole, ROLE_GROUPS, roleToDashboard, normalizeRole, logRbacDecision } from '../../lib/rbac';

interface OwnerUser {
  name: string;
  email: string;
  initials: string;
}

export default function OwnerDashboardLayout({ children }: { children?: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const authRole = useAuthStore((s) => s.role);
  const authUser = useAuthStore((s) => s.user);
  const themeBeforeOwnerRef = useRef<'light' | 'dark' | null>(null);

  // Route guard: Only allow owner role access
  useEffect(() => {
    const normalized = normalizeRole(authRole);
    const allowed = hasRole(authRole, ROLE_GROUPS.OWNER_DASHBOARD);
    
    // Debug logging
    logRbacDecision(
      'OwnerDashboardLayout',
      location.pathname,
      authRole,
      normalized,
      ROLE_GROUPS.OWNER_DASHBOARD,
      allowed
    );

    if (authRole && !allowed) {
      // Redirect non-owner users to their appropriate dashboard
      const redirectPath = roleToDashboard(authRole);
      console.log(`[RBAC] Redirecting non-owner (${authRole}) from owner dashboard to ${redirectPath}`);
      navigate(redirectPath, { replace: true });
    }
  }, [authRole, navigate, location.pathname]);

  /** Owner UI uses dark theme; restore previous theme when leaving */
  useEffect(() => {
    const root = document.documentElement;
    themeBeforeOwnerRef.current = root.classList.contains('dark') ? 'dark' : 'light';
    root.classList.remove('light');
    root.classList.add('dark');
    localStorage.setItem('pwezacore-theme', 'dark');
    return () => {
      const prev = themeBeforeOwnerRef.current;
      root.classList.remove('dark', 'light');
      if (prev === 'light') {
        root.classList.add('light');
        localStorage.setItem('pwezacore-theme', 'light');
      } else {
        root.classList.add('dark');
        localStorage.setItem('pwezacore-theme', 'dark');
      }
    };
  }, []);

  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [schoolsOpen, setSchoolsOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [systemOpen, setSystemOpen] = useState(false);
  const [contentOpen, setContentOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Handle window resize for responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [ownerUser, setOwnerUser] = useState<OwnerUser>({
    name: 'Platform Owner',
    email: '',
    initials: 'PO',
  });

  // Auto-expand sections based on current path
  useEffect(() => {
    if (location.pathname.includes('/owner/schools')) setSchoolsOpen(true);
    if (location.pathname.includes('/owner/users')) setUsersOpen(true);
    if (location.pathname.includes('/owner/finance')) setFinanceOpen(true);
    if (location.pathname.includes('/owner/system')) setSystemOpen(true);
    if (location.pathname.includes('/owner/content')) setContentOpen(true);
    if (location.pathname.includes('/owner/settings')) setSettingsOpen(true);
  }, [location.pathname]);

  // Close sidebar on navigation (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Load owner user data
  useEffect(() => {
    async function loadOwnerData() {
      try {
        if (!authUser) return;

        const { data: userData } = await supabase
          .from('users')
          .select('name, email')
          .eq('user_id', authUser.id)
          .single();

        if (userData) {
          const name = (userData as { name?: string }).name || authUser.email || 'Platform Owner';
          const initials = name
            .split(' ')
            .map((w: string) => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();
          setOwnerUser({
            name,
            email: (userData as { email?: string }).email || authUser.email || '',
            initials,
          });
        }
      } catch (err) {
        console.error('OwnerDashboardLayout user load error:', err);
      }
    }
    void loadOwnerData();
  }, [authUser]);

  async function handleLogout() {
    await markChatPresenceOffline();
    await supabase.auth.signOut();
    navigate('/');
  }

  const closeSidebar = () => setSidebarOpen(false);

  // Don't render if not owner role
  if (authRole && !hasRole(authRole, ROLE_GROUPS.OWNER_DASHBOARD)) {
    return <ThemedLoadingView />;
  }

  return (
    <div className="ow-layout">
      <motion.button 
        type="button" 
        className="ow-hamburger" 
        onClick={() => setSidebarOpen(!sidebarOpen)} 
        aria-label="Toggle sidebar"
        whileHover={{ 
          scale: 1.05,
          borderColor: "var(--ow-bh)",
          boxShadow: "0 4px 16px rgba(6,182,212,0.2)"
        }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <motion.span
          animate={{ rotate: sidebarOpen ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          {sidebarOpen ? '✕' : '☰'}
        </motion.span>
      </motion.button>

      <OwnerSidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        ownerUser={ownerUser}
        onLogout={handleLogout}
        schoolsOpen={schoolsOpen}
        usersOpen={usersOpen}
        financeOpen={financeOpen}
        systemOpen={systemOpen}
        contentOpen={contentOpen}
        settingsOpen={settingsOpen}
        setSchoolsOpen={setSchoolsOpen}
        setUsersOpen={setUsersOpen}
        setFinanceOpen={setFinanceOpen}
        setSystemOpen={setSystemOpen}
        setContentOpen={setContentOpen}
        setSettingsOpen={setSettingsOpen}
      />

      <motion.main 
        className="ow-main"
        initial={false}
        animate={{ 
          marginLeft: window.innerWidth > 768 ? "var(--ow-sidebar-width, 280px)" : 0
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <OwnerErrorBoundary>
          <Suspense fallback={isDesktopApp ? null : <ThemedLoadingView />}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 25,
                opacity: { duration: 0.2 }
              }}
            >
              {children || <Outlet />}
            </motion.div>
          </Suspense>
        </OwnerErrorBoundary>
      </motion.main>
    </div>
  );
}