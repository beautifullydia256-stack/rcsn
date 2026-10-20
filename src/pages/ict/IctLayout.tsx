import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Mail,
  KeyRound,
  Monitor,
  CalendarCheck,
  Fingerprint,
  Wifi,
  Wrench,
  Wallet,
  Package,
  MessageSquare,
  CalendarDays,
  Sun,
  Moon,
  LogOut,
  X,
  Menu,
  ShieldCheck,
  ArrowLeftRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logoutWithSyncCheck } from '@/lib/logoutWithSyncCheck';
import { useSchoolChatUnreadTotal } from '@/hooks/useSchoolChatUnreadTotal';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { POS_SIDEBAR_SHARED_CSS } from '@/lib/pwShellCss';
import { hasRole, ROLE_GROUPS } from '@/lib/rbac';
import AdminContentSkeleton from '@/components/layout/AdminContentSkeleton';
import IctMobileBottomNav from '@/components/layout/IctMobileBottomNav';

const ICT_BASE = '/dashboard/ict';

interface NavItemProps {
  to: string;
  icon: ReactNode;
  label: string;
  end?: boolean;
  onClick?: () => void;
  badge?: string | number;
  badgeColor?: 'teal' | 'amber' | 'rose';
}

function NavItem({
  to,
  icon,
  label,
  end,
  onClick,
  badge,
  badgeColor = 'rose',
}: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) => ['pw-nav-link', isActive ? 'pw-nav-link--active' : ''].join(' ')}
    >
      <span className="pw-nav-ic">{icon}</span>
      <span className="pw-nav-text">{label}</span>
      {badge !== undefined && badge !== null && String(badge) !== '0' && (
        <span className={`pw-nav-badge pw-nav-badge--${badgeColor}`}>{badge}</span>
      )}
    </NavLink>
  );
}

export default function IctLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = useAuthStore((s) => s.role);
  const user = useAuthStore((s) => s.user);
  const schoolId = useAuthStore((s) => s.schoolId);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  /** Synchronize theme on document root so POS Light and Dark modes render accurately */
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    root.setAttribute('data-theme', theme);
    localStorage.setItem('pwezacore-theme', theme);
  }, [theme]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState<string>('ICT Officer');
  const [userInitials, setUserInitials] = useState<string>('IT');
  const [hasMultipleRoles, setHasMultipleRoles] = useState(false);
  const [openTicketCount, setOpenTicketCount] = useState<number>(0);
  const [unreadEmailCount, setUnreadEmailCount] = useState<number>(0);

  const unreadChatTotal = useSchoolChatUnreadTotal(user?.id);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Authorization check
  const isAuthorized = hasRole(role, ROLE_GROUPS.ICT_DASHBOARD);

  useEffect(() => {
    async function loadUserData() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        const { data: userData } = await supabase
          .from('users')
          .select('name, email, role, extra_roles')
          .eq('user_id', authUser.id)
          .maybeSingle();

        const name = userData?.name || authUser.email?.split('@')[0] || 'ICT Officer';
        const initials = name
          .split(' ')
          .filter(Boolean)
          .map((w: string) => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase() || 'IT';

        setUserName(name);
        setUserInitials(initials);

        const extras = Array.isArray(userData?.extra_roles) ? userData.extra_roles : [];
        setHasMultipleRoles(extras.length > 0 || ['admin', 'owner', 'super_admin'].includes(role || ''));

        // Load open tickets count for mobile badge
        if (schoolId) {
          const { count } = await supabase
            .from('ict_helpdesk_tickets')
            .select('id', { count: 'exact', head: true })
            .eq('school_id', schoolId)
            .in('status', ['open', 'in_progress']);
          setOpenTicketCount(count || 0);
        }

        // Load unread emails count for mobile badge
        const { count: emailCount } = await supabase
          .from('institutional_emails')
          .select('id', { count: 'exact', head: true })
          .eq('direction', 'inbound')
          .eq('is_read', false);
        setUnreadEmailCount(emailCount || 0);

      } catch (err) {
        console.error('ICT user load error:', err);
      }
    }
    void loadUserData();
  }, [schoolId, role]);

  function handleLogout() {
    void logoutWithSyncCheck(() => {
      useAuthStore.getState().logout();
      navigate('/');
    });
  }

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  }

  const closeSidebar = () => setSidebarOpen(false);

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4 text-center">
        <div className="max-w-md rounded-2xl border border-white/10 bg-slate-800/80 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-white">Access Restricted</h2>
          <p className="mt-2 text-sm text-slate-400">
            The ICT & Systems Centre is restricted to the ICT Department and Systems Administrators.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => navigate('/role-picker')}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500"
            >
              Switch Role
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{POS_SIDEBAR_SHARED_CSS}</style>
      <style>{`
        /* Hide all scrollbars on the sidebar completely */
        .pw-sidebar .pw-nav-scroll-area {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        .pw-sidebar .pw-nav-scroll-area::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }

        /* ICT Layout header styling */
        .ict-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          border-bottom: 1px solid var(--pos-border);
          background: var(--pos-header-bg);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .ict-theme-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid var(--pos-border);
          background: var(--pos-field-bg);
          color: var(--pos-ink);
        }

        .ict-theme-btn:hover {
          background: var(--pos-hover-bg);
          border-color: var(--pos-brand);
        }

        /* Ensure .pw-main has correct margin on desktop */
        @media (min-width: 769px) {
          .pw-layout .pw-main {
            margin-left: 220px !important;
            width: calc(100% - 220px) !important;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
          }
        }

        /* Clearance on mobile for hamburger button */
        @media (max-width: 768px) {
          .ict-topbar {
            padding: 10px 54px 10px 14px;
          }
        }
      `}</style>

      <div className="pw-layout" data-theme={theme}>
        {/* Mobile Hamburger toggle */}
        <button
          type="button"
          className="pw-hamburger"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Mobile backdrop */}
        {sidebarOpen && <div className="pw-sidebar-overlay" onClick={closeSidebar} />}

        {/* Sidebar Rail */}
        <aside className={`pw-sidebar ${sidebarOpen ? 'pw-sidebar--open' : ''}`}>
          <div className="pw-brand">
            <div className="pw-brand-name">RCSN</div>
            <div className="pw-brand-subtitle">Rakai Community School of Nursing</div>
            <div className="pw-brand-pill">ICT &amp; Systems Department</div>
          </div>

          <div className="pw-nav-scroll-area">
            {/* 1. Core Systems */}
            <div className="pw-nav-section">
              <span className="pw-nav-label">Core Systems</span>
              <NavItem
                to={ICT_BASE}
                end
                icon={<LayoutDashboard className="w-4 h-4" />}
                label="Control Centre"
                onClick={closeSidebar}
              />
              <NavItem
                to={`${ICT_BASE}/email`}
                icon={<Mail className="w-4 h-4 text-emerald-400" />}
                label="Official Mailbox"
                badge={unreadEmailCount > 0 ? unreadEmailCount : undefined}
                badgeColor="rose"
                onClick={closeSidebar}
              />
              <NavItem
                to={`${ICT_BASE}/accounts`}
                icon={<KeyRound className="w-4 h-4 text-indigo-400" />}
                label="Account &amp; Passwords"
                onClick={closeSidebar}
              />
            </div>

            {/* 2. Lab & Infrastructure */}
            <div className="pw-nav-section">
              <span className="pw-nav-label">Lab &amp; Infrastructure</span>
              <NavItem
                to={`${ICT_BASE}/workstations`}
                icon={<Monitor className="w-4 h-4" />}
                label="Lab Workstations"
                onClick={closeSidebar}
              />
              <NavItem
                to={`${ICT_BASE}/schedule`}
                icon={<CalendarCheck className="w-4 h-4 text-teal-400" />}
                label="Lab Timetable &amp; Bookings"
                onClick={closeSidebar}
              />
              <NavItem
                to={`${ICT_BASE}/biometrics`}
                icon={<Fingerprint className="w-4 h-4 text-cyan-400" />}
                label="Biometric Terminals"
                onClick={closeSidebar}
              />
              <NavItem
                to={`${ICT_BASE}/network`}
                icon={<Wifi className="w-4 h-4 text-emerald-400" />}
                label="Campus Wi-Fi &amp; CCTV"
                onClick={closeSidebar}
              />
              <NavItem
                to={`${ICT_BASE}/helpdesk`}
                icon={<Wrench className="w-4 h-4 text-amber-400" />}
                label="Hardware &amp; Helpdesk"
                badge={openTicketCount > 0 ? openTicketCount : undefined}
                badgeColor="amber"
                onClick={closeSidebar}
              />
            </div>

            {/* 3. Procurement & Store */}
            <div className="pw-nav-section">
              <span className="pw-nav-label">Procurement &amp; Store</span>
              <NavItem
                to={`${ICT_BASE}/requisitions`}
                icon={<Wallet className="w-4 h-4" />}
                label="Budget Requisitions"
                onClick={closeSidebar}
              />
              <NavItem
                to={`${ICT_BASE}/store-indent`}
                icon={<Package className="w-4 h-4" />}
                label="Store Indents"
                onClick={closeSidebar}
              />
            </div>

            {/* 4. Communication */}
            <div className="pw-nav-section">
              <span className="pw-nav-label">Communication</span>
              <NavItem
                to={`${ICT_BASE}/messages`}
                icon={<MessageSquare className="w-4 h-4" />}
                label="Staff Messages"
                badge={unreadChatTotal > 0 ? unreadChatTotal : undefined}
                badgeColor="rose"
                onClick={closeSidebar}
              />
              <NavItem
                to={`${ICT_BASE}/calendar`}
                icon={<CalendarDays className="w-4 h-4 text-teal-400" />}
                label="School Calendar"
                onClick={closeSidebar}
              />
            </div>
          </div>

          {/* Theme Switcher in Sidebar Tools */}
          <div className="pw-sidebar-tools">
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to White Mode'}
            >
              {theme === 'light' ? <Moon className="h-4 w-4 shrink-0" /> : <Sun className="h-4 w-4 shrink-0" />}
              <span>{theme === 'light' ? 'Dark Mode' : 'White Mode'}</span>
            </button>
          </div>

          {/* Sidebar Footer User Info */}
          <div className="pw-sidebar-bottom">
            <div className="pw-admin-card">
              <div className="pw-admin-av">{userInitials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="pw-admin-name">{userName}</div>
                <div className="pw-admin-role">ICT &amp; Systems Officer</div>
              </div>
            </div>
            {hasMultipleRoles && (
              <button
                type="button"
                className="pw-footer-action"
                onClick={() => navigate('/role-picker')}
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span>Switch Role</span>
              </button>
            )}
            <button type="button" className="pw-logout-btn" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="pw-main flex-1 flex flex-col min-w-0">
          {/* Universal Sticky Topbar with Theme Toggle */}
          <header className="ict-topbar">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  RCSN Digital Systems Hub
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Prominent Theme Switcher Button */}
              <button
                type="button"
                onClick={toggleTheme}
                className="ict-theme-btn"
                title={theme === 'light' ? 'Switch to Dark Theme' : 'Switch to White Theme'}
              >
                {theme === 'light' ? (
                  <>
                    <Moon className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Dark Mode</span>
                  </>
                ) : (
                  <>
                    <Sun className="h-3.5 w-3.5 text-amber-400" />
                    <span>White Mode</span>
                  </>
                )}
              </button>

              {/* User Initials Badge */}
              <div
                onClick={() => hasMultipleRoles && navigate('/role-picker')}
                className={`flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white shadow-sm ${
                  hasMultipleRoles ? 'cursor-pointer hover:opacity-90' : ''
                }`}
                title={hasMultipleRoles ? 'Click to switch role' : userName}
              >
                {userInitials}
              </div>
            </div>
          </header>

          {/* Page Content Body */}
          <div className="flex-1 p-4 sm:p-6 lg:p-8">
            <Suspense fallback={<AdminContentSkeleton />}>
              <Outlet />
            </Suspense>
          </div>
        </main>

        {/* Mobile Bottom Navigation (Same as Admin) */}
        <IctMobileBottomNav
          openTicketCount={openTicketCount}
          unreadEmailCount={unreadEmailCount}
        />
      </div>
    </>
  );
}
