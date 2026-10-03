import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  UserCheck,
  BookOpen,
  Users2,
  ShieldCheck,
  Building2,
  School,
  Briefcase,
  Wallet,
  ClipboardCheck,
  FileEdit,
  Trophy,
  BarChart3,
  CreditCard,
  Bell,
  Settings,
  FileText,
  LogOut,
  Menu,
  X,
  Stethoscope,
  Sun,
  Moon,
  ArrowLeft,
  Package,
  Banknote,
  Armchair,
  Repeat,
  CalendarDays,
} from 'lucide-react';
import AdminContentSkeleton from './AdminContentSkeleton';
import HeadTeacherMobileBottomNav from './HeadTeacherMobileBottomNav';
import { supabase } from '../../lib/supabase';
import { logoutWithSyncCheck } from '../../lib/logoutWithSyncCheck';
import { useSchoolChatUnreadTotal } from '../../hooks/useSchoolChatUnreadTotal';
import { usePwezaStore } from '../../store/pwezaStore';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useTheme } from '@/lib/theme-provider';
import { isDesktopApp } from '../../lib/isDesktopApp';
import { POS_SIDEBAR_SHARED_CSS } from '../../lib/pwShellCss';
import { prefetchWorkforceAll } from '@/pages/admin/workforce/workforcePrefetch';
import { useWorkforceNavVisible, usePermission } from '../../hooks/usePermission';
import { PERMISSION_KEYS } from '../../lib/permissions';
import { hasRole, ROLE_GROUPS, normalizeRole, logRbacDecision } from '../../lib/rbac';
import { useSchoolType } from '../../hooks/useSchoolType';
import { getRoleTitle, getNavTerminology } from '../../lib/roleTerminology';

const HT_BASE = '/dashboard/head-teacher';

interface AdminUser {
  name: string;
  email: string;
  initials: string;
}

interface NavItemProps {
  to: string;
  icon: ReactNode;
  label: string;
  badge?: string | number;
  badgeColor?: 'teal' | 'amber' | 'rose';
  onClick?: () => void;
  end?: boolean;
  /** pweza speed system — warm cache on hover */
  onPrefetch?: () => void;
}

function NavItem({ to, icon, label, badge, badgeColor = 'rose', onClick, end = false, onPrefetch }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      onMouseEnter={onPrefetch}
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

interface NavGroupProps {
  icon: ReactNode;
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
  matchPaths?: string[];
  badge?: string | number;
  badgeColor?: 'teal' | 'amber' | 'rose';
}

function NavGroup({
  icon,
  label,
  isOpen,
  onToggle,
  children,
  matchPaths = [],
  badge,
  badgeColor = 'rose',
}: NavGroupProps) {
  const location = useLocation();
  const isActive = matchPaths.some((p) => location.pathname.startsWith(p));

  return (
    <div className="pw-nav-group">
      <button
        type="button"
        className={['pw-nav-link', 'pw-nav-group-btn', isActive ? 'pw-nav-link--group-active' : ''].join(' ')}
        onClick={onToggle}
      >
        <span className="pw-nav-ic">{icon}</span>
        <span className="pw-nav-text">{label}</span>
        {badge !== undefined && badge !== null && String(badge) !== '0' && (
          <span className={`pw-nav-badge pw-nav-badge--${badgeColor}`}>{badge}</span>
        )}
        <span className={`pw-nav-chevron ${isOpen ? 'pw-nav-chevron--open' : ''}`}>›</span>
      </button>
      {isOpen && <div className="pw-nav-subitems">{children}</div>}
    </div>
  );
}

function SubItem({
  to,
  label,
  onClick,
  end = false,
  onPrefetch,
  className = '',
}: {
  to: string;
  label: string;
  onClick?: () => void;
  end?: boolean;
  onPrefetch?: () => void;
  /** e.g. pw-nav-subitem--hidden to keep route but hide from UI */
  className?: string;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      onMouseEnter={onPrefetch}
      className={({ isActive }) =>
        ['pw-nav-subitem', isActive ? 'pw-nav-subitem--active' : '', className].filter(Boolean).join(' ')
      }
    >
      <span className="pw-nav-sub-dot">·</span>
      {label}
    </NavLink>
  );
}

/** React Router matches `NavLink` by pathname only; discipline uses `?discipline=`. */
function SubItemStudentsDiscipline({
  discipline,
  label,
  onClick,
  onPrefetch,
}: {
  discipline: string;
  label: string;
  onClick?: () => void;
  onPrefetch?: () => void;
}) {
  const location = useLocation();
  const d = discipline.toLowerCase();
  const current = (new URLSearchParams(location.search).get('discipline') || 'all').toLowerCase();
  const isActive = location.pathname === `${HT_BASE}/students` && current === d;
  return (
    <NavLink
      to={`${HT_BASE}/students?discipline=${encodeURIComponent(d)}`}
      onClick={onClick}
      onMouseEnter={onPrefetch}
      className={['pw-nav-subitem', isActive ? 'pw-nav-subitem--active' : ''].join(' ')}
    >
      <span className="pw-nav-sub-dot">·</span>
      {label}
    </NavLink>
  );
}

function SubItemParentsFilter({
  filter,
  label,
  onClick,
  onPrefetch,
}: {
  filter: string;
  label: string;
  onClick?: () => void;
  onPrefetch?: () => void;
}) {
  const location = useLocation();
  const f = filter.toLowerCase();
  const current = (new URLSearchParams(location.search).get('filter') || 'all').toLowerCase();
  const isActive = location.pathname === `${HT_BASE}/parents` && current === f;
  return (
    <NavLink
      to={`${HT_BASE}/parents?filter=${encodeURIComponent(f)}`}
      onClick={onClick}
      onMouseEnter={onPrefetch}
      className={['pw-nav-subitem', isActive ? 'pw-nav-subitem--active' : ''].join(' ')}
    >
      <span className="pw-nav-sub-dot">·</span>
      {label}
    </NavLink>
  );
}

function isSettingsMasterDetailPath(pathname: string): boolean {
  if (!pathname.startsWith('/dashboard/head-teacher/settings')) return false;
  if (pathname.startsWith('/dashboard/head-teacher/settings/classes')) return false;
  if (pathname.startsWith('/dashboard/head-teacher/settings/location')) return false;
  const rest = pathname.slice('/dashboard/head-teacher/settings'.length);
  if (rest === '' || rest === '/') return true;
  return /^\/(subjects|assignments|finance|requirements|timetable|terms|exams|branding)\/?$/.test(rest);
}

export default function HeadTeacherLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const authUserId = useAuthStore((s) => s.user?.id);
  const role = useAuthStore((s) => s.role);
  const showBackToAdminDashboard = role === "admin";
  const chatUnread = useSchoolChatUnreadTotal(authUserId ?? undefined);
  const chatUnreadBadge =
    chatUnread > 0 ? (chatUnread > 99 ? '99+' : chatUnread) : undefined;
  const theme = useUIStore((s) => s.theme);
  const { setTheme: setCtxTheme } = useTheme();
  const prefetchAll = usePwezaStore((s) => s.prefetchAll);

  const handleToggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    useUIStore.getState().toggleTheme();
    setCtxTheme(next);
    if (next === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('pwezacore-theme', 'light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('pwezacore-theme', 'dark');
    }
  };

  useEffect(() => {
    const activeTheme = useUIStore.getState().theme;
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(activeTheme === 'light' ? 'light' : 'dark');
    root.setAttribute('data-theme', activeTheme === 'light' ? 'light' : 'dark');
  }, [theme]);
  const onPrefetchNav = () => {
    void prefetchAll();
  }; // pweza speed system

  const onPrefetchWorkforceNav = () => {
    void prefetchAll();
    if (authUserId) prefetchWorkforceAll(authUserId);
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [studentsMenuOpen, setStudentsMenuOpen] = useState(false);
  const [parentsMenuOpen, setParentsMenuOpen] = useState(false);
  const [userMgmtOpen, setUserMgmtOpen] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [workforceOpen, setWorkforceOpen] = useState(false);
  const showWorkforce = useWorkforceNavVisible();
  const canHrWorkforce = usePermission(PERMISSION_KEYS.hrManage);
  const canWorkforcePayroll = usePermission(PERMISSION_KEYS.hrPayroll);
  const [adminUser, setAdminUser] = useState<AdminUser>({
    name: 'Admin',
    email: '',
    initials: 'A',
  });
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [jobCount, setJobCount] = useState<number | null>(null);
  const [notifCount, setNotifCount] = useState<number | null>(null);
  useEffect(() => {
    if (location.pathname.includes('/accounts') || location.pathname.includes('/permissions')) setUserMgmtOpen(true);
    if (location.pathname.includes('/dashboard/head-teacher/finance')) setFinanceOpen(true);
    if (location.pathname.includes('/reports') || location.pathname.includes('/report-records')) {
      setReportsOpen(true);
    }
    if (location.pathname.startsWith('/dashboard/head-teacher/students')) setStudentsMenuOpen(true);
    if (location.pathname.startsWith('/dashboard/head-teacher/parents')) setParentsMenuOpen(true);
    if (location.pathname.startsWith('/dashboard/head-teacher/workforce')) setWorkforceOpen(true);
  }, [location.pathname]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    async function loadUserAndCounts() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userData } = await supabase
          .from('users')
          .select('name, email, school_id')
          .eq('user_id', user.id)
          .single();

        if (!userData) return;

        const name = (userData as { name?: string }).name || user.email || 'Admin';
        const initials = name
          .split(' ')
          .map((w: string) => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();
        setAdminUser({
          name,
          email: (userData as { email?: string }).email || user.email || '',
          initials,
        });

        const schoolId = (userData as { school_id?: string }).school_id;
        if (!schoolId) return;

        const [studentsRes, jobsRes, notifsRes] = await Promise.all([
          supabase
            .from('students')
            .select('student_id', { count: 'exact', head: true })
            .eq('school_id', schoolId),
          supabase
            .from('jobs')
            .select('job_id', { count: 'exact', head: true })
            .eq('school_id', schoolId),
          supabase
            .from('notifications')
            .select('notification_id', { count: 'exact', head: true })
            .eq('school_id', schoolId),
        ]);

        setStudentCount(studentsRes.count ?? null);
        setJobCount(jobsRes.count ?? null);
        setNotifCount(notifsRes.count ?? null);
      } catch (err) {
        console.error('AdminLayout user load error:', err);
      }
    }
    void loadUserAndCounts();
  }, []);

  function handleLogout() {
    void logoutWithSyncCheck(() => navigate('/'));
  }

  const closeSidebar = () => setSidebarOpen(false);

  const { isTertiary, schoolType } = useSchoolType();
  const navTerms = getNavTerminology(schoolType);
  const htPillLabel = getRoleTitle(role, schoolType);

  // Route guard: Allow head_teacher, deputy_head_teacher, and admin roles
  const allowed = hasRole(role, ROLE_GROUPS.HEADTEACHER_DASHBOARD);
  
  // Debug logging
  logRbacDecision(
    'HeadTeacherLayout',
    location.pathname,
    role,
    normalizeRole(role),
    ROLE_GROUPS.HEADTEACHER_DASHBOARD,
    allowed
  );

  if (role && !allowed) {
    console.log(`[RBAC] Redirecting unauthorized role (${role}) from head-teacher dashboard`);
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <style>{POS_SIDEBAR_SHARED_CSS}</style>

      <div className="pw-layout" data-theme={theme === 'light' ? 'light' : 'dark'}>
        <button type="button" className="pw-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar">
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {sidebarOpen && <div className="pw-sidebar-overlay" onClick={closeSidebar} />}

        <aside className={`pw-sidebar ${sidebarOpen ? 'pw-sidebar--open' : ''}`}>
          <div className="pw-brand">
            <div className="pw-brand-name">PwezaCore</div>
            <div className="pw-brand-subtitle">School Administration</div>
            <div className="pw-brand-pill">{htPillLabel}</div>
          </div>

          <div className="pw-nav-scroll-area">

          <div className="pw-nav-section">
            <span className="pw-nav-label">Main</span>
            <NavItem to="/dashboard/head-teacher" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" end onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem
              to="/dashboard/head-teacher/messages"
              icon={<MessageSquare className="w-4 h-4" />}
              label="Messages"
              badge={chatUnreadBadge}
              badgeColor="rose"
              onClick={closeSidebar}
              onPrefetch={onPrefetchNav}
            />
            <NavItem
              to="/dashboard/head-teacher/profile"
              icon={<UserCheck className="w-4 h-4" />}
              label="My profile"
              onClick={closeSidebar}
              onPrefetch={onPrefetchNav}
            />
            <NavItem
              to="/dashboard/head-teacher/students"
              icon={<GraduationCap className="w-4 h-4" />}
              label={navTerms.studentsLabel}
              badge={studentCount ?? undefined}
              badgeColor="teal"
              onClick={closeSidebar}
              onPrefetch={onPrefetchNav}
            />
            <NavItem
              to="/dashboard/head-teacher/cards"
              icon={<CreditCard className="w-4 h-4 text-emerald-400" />}
              label="Student Cards & Passes"
              onClick={closeSidebar}
              onPrefetch={onPrefetchNav}
            />
            <NavItem to="/dashboard/head-teacher/teachers" icon={<BookOpen className="w-4 h-4" />} label={navTerms.teachersLabel} onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavGroup
              icon={<Users2 className="w-4 h-4" />}
              label={isTertiary ? 'Parents & Sponsors' : 'Parents'}
              isOpen={parentsMenuOpen}
              onToggle={() => setParentsMenuOpen(!parentsMenuOpen)}
              matchPaths={['/dashboard/head-teacher/parents']}
            >
              <SubItemParentsFilter filter="all" label={isTertiary ? 'All Parents & Sponsors' : 'All Parents'} onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItemParentsFilter filter="outstanding" label="Outstanding balances" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItemParentsFilter filter="missing_contact" label="Missing contact" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            </NavGroup>
          </div>

          <div className="pw-nav-section">
            <span className="pw-nav-label">Management</span>
            <NavGroup icon={<ShieldCheck className="w-4 h-4" />} label="User Management" isOpen={userMgmtOpen} onToggle={() => setUserMgmtOpen(!userMgmtOpen)} matchPaths={['/dashboard/head-teacher/accounts', '/dashboard/head-teacher/permissions']}>
              <SubItem to="/dashboard/head-teacher/accounts" label="All Users" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItem to="/dashboard/head-teacher/accounts/invite" label="Send invitations" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItem to="/dashboard/head-teacher/permissions" label="Access & permissions" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            </NavGroup>
            <NavItem to="/dashboard/head-teacher/staff" icon={<Building2 className="w-4 h-4" />} label="Staff" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to="/dashboard/head-teacher/gate-passes" icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />} label="Gate Passes & Exits" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to="/dashboard/head-teacher/settings/classes" icon={<School className="w-4 h-4" />} label={navTerms.classesLabel} onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to="/dashboard/head-teacher/store" icon={<Package className="w-4 h-4 text-teal-400" />} label="Store & Kitchen Supplies" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to="/dashboard/head-teacher/property-assets" icon={<Armchair className="w-4 h-4 text-amber-400" />} label="Furniture & Physical Assets" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to="/dashboard/head-teacher/recurring-expenses" icon={<Repeat className="w-4 h-4 text-sky-400" />} label="Recurring & Utility Bills" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            {showWorkforce && (
              <NavGroup
                icon={<Briefcase className="w-4 h-4" />}
                label="Workforce"
                isOpen={workforceOpen}
                onToggle={() => setWorkforceOpen(!workforceOpen)}
                matchPaths={['/dashboard/head-teacher/workforce']}
              >
                <SubItem to="/dashboard/head-teacher/workforce" label="Overview" end onClick={closeSidebar} onPrefetch={onPrefetchWorkforceNav} />
                <SubItem to="/dashboard/accountant/salary-obligations" label="Salary Obligations & Burn" onClick={closeSidebar} onPrefetch={onPrefetchWorkforceNav} />
                {canHrWorkforce && (
                  <>
                    <SubItem to="/dashboard/head-teacher/workforce/leave" label="Leave" onClick={closeSidebar} onPrefetch={onPrefetchWorkforceNav} />
                    <SubItem to="/dashboard/head-teacher/workforce/recruitment" label="Recruitment" onClick={closeSidebar} onPrefetch={onPrefetchWorkforceNav} />
                    <SubItem to="/dashboard/head-teacher/workforce/onboarding" label="Onboarding" onClick={closeSidebar} onPrefetch={onPrefetchWorkforceNav} />
                    <SubItem to="/dashboard/head-teacher/workforce/performance" label="Performance" onClick={closeSidebar} onPrefetch={onPrefetchWorkforceNav} />
                  </>
                )}
                {canWorkforcePayroll && (
                  <SubItem to="/dashboard/head-teacher/workforce/payroll" label="Payroll" onClick={closeSidebar} onPrefetch={onPrefetchWorkforceNav} />
                )}
              </NavGroup>
            )}
            <NavItem to="/dashboard/head-teacher/jobs" icon={<Briefcase className="w-4 h-4" />} label="Job Vacancies" badge={jobCount ?? undefined} badgeColor="rose" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
          </div>

          <div className="pw-nav-section">
            <span className="pw-nav-label">Finance</span>
            <NavGroup
              icon={<Wallet className="w-4 h-4" />}
              label="Finance"
              isOpen={financeOpen}
              onToggle={() => setFinanceOpen(!financeOpen)}
              matchPaths={['/dashboard/head-teacher/finance']}
            >
              <SubItem to="/dashboard/head-teacher/finance" label="Overview" end onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItem to="/dashboard/head-teacher/finance/financial-analytics" label="Financial Analytics" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItem to="/dashboard/head-teacher/finance/outstanding" label="Outstanding balances" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItem to="/dashboard/head-teacher/budget/consolidated" label="Monthly Board Budget (Quorum)" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItem to="/dashboard/head-teacher/budget/requisitions" label="Budget Requisitions" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItem to="/dashboard/head-teacher/store/daily-indent" label="Daily Kitchen Indents" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItem to="/dashboard/head-teacher/store" label="Stores & Supplies" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            </NavGroup>
          </div>

          <div className="pw-nav-section">
            <span className="pw-nav-label">Academic</span>
            <NavItem to="/dashboard/head-teacher/calendar" icon={<CalendarDays className="w-4 h-4 text-teal-400" />} label="School Calendar & Planner" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to="/dashboard/head-teacher/attendance" icon={<ClipboardCheck className="w-4 h-4" />} label={navTerms.attendanceLabel} onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            {isTertiary && (
              <NavItem to="/dashboard/admin/ward-postings" icon={<Stethoscope className="w-4 h-4" />} label="Ward Postings & Clinical" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            )}
            <NavItem to="/dashboard/head-teacher/exam-sets" icon={<FileEdit className="w-4 h-4" />} label={navTerms.examSetsLabel} onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to="/dashboard/head-teacher/exam-set-results" icon={<Trophy className="w-4 h-4" />} label={navTerms.examResultsLabel} onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavGroup
              icon={<BarChart3 className="w-4 h-4" />}
              label={navTerms.reportsLabel}
              isOpen={reportsOpen}
              onToggle={() => setReportsOpen(!reportsOpen)}
              matchPaths={['/dashboard/head-teacher/reports', '/dashboard/head-teacher/report-records', '/dashboard/admin/reports/generate-tertiary']}
            >
              <SubItem
                to="/dashboard/head-teacher/reports"
                label="Overview"
                onClick={closeSidebar}
                onPrefetch={onPrefetchNav}
                className="pw-nav-subitem--hidden"
              />
              <SubItem to="/dashboard/head-teacher/reports/generate" label={navTerms.generateReportsLabel} onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItem to="/dashboard/head-teacher/report-records" label="Report Records" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItem
                to="/dashboard/head-teacher/settings"
                label="Report Templates"
                onClick={closeSidebar}
                onPrefetch={onPrefetchNav}
                className="pw-nav-subitem--hidden"
              />
            </NavGroup>
            <NavItem to="/dashboard/head-teacher/identity" icon={<CreditCard className="w-4 h-4" />} label="Identity cards" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
          </div>


          <div className="pw-nav-section">
            <span className="pw-nav-label">System</span>
            <NavItem to="/dashboard/head-teacher/notifications" icon={<Bell className="w-4 h-4" />} label="Notifications" badge={notifCount ?? undefined} badgeColor="amber" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to="/dashboard/head-teacher/settings" icon={<Settings className="w-4 h-4" />} label="System Settings" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to="/dashboard/head-teacher/headed-paper" icon={<FileText className="w-4 h-4" />} label="Headed Paper" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
          </div>

          </div>

          <div className="pw-sidebar-tools">
            <button type="button" onClick={handleToggleTheme} title={theme === 'light' ? 'Switch to dark mode' : 'Switch to white mode'}>
              {theme === 'light' ? <Moon className="h-4 w-4 shrink-0" /> : <Sun className="h-4 w-4 shrink-0 text-amber-400" />}
              <span>{theme === 'light' ? 'Dark Mode' : 'White Mode'}</span>
            </button>
          </div>

          <div className="pw-sidebar-bottom">
            <Link
              to="/dashboard/head-teacher/profile"
              className="pw-admin-card"
              onClick={closeSidebar}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="pw-admin-av">{adminUser.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="pw-admin-name">{adminUser.name}</div>
                <div className="pw-admin-role">{htPillLabel} · Profile</div>
              </div>
            </Link>
            {showBackToAdminDashboard && (
              <button
                type="button"
                className="pw-footer-action"
                onClick={() => navigate('/dashboard/admin')}
                style={{ color: '#8b5cf6' }}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Admin</span>
              </button>
            )}
            <button type="button" className="pw-logout-btn" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        <main
          className={[
            'pw-main',
            location.pathname.startsWith('/dashboard/head-teacher/messages') ? 'pw-main--chat' : '',
            isSettingsMasterDetailPath(location.pathname) ? 'pw-main--settings-split' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >

          <div className="flex-1 min-h-0 flex flex-col w-full h-full">
            <Suspense fallback={isDesktopApp ? null : <AdminContentSkeleton />}>
              <Outlet />
            </Suspense>
          </div>
        </main>

        <HeadTeacherMobileBottomNav notifCount={notifCount} onPrefetch={onPrefetchNav} />
      </div>
    </>
  );
}

