import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  LayoutDashboard,
  UserCheck,
  CircleDollarSign,
  MessageSquare,
  BookOpen,
  Users2,
  ShieldCheck,
  Building2,
  School,
  Briefcase,
  Wallet,
  Stethoscope,
  ClipboardCheck,
  KeyRound,
  Eye,
  Fingerprint,
  Monitor,
  FileEdit,
  Trophy,
  BarChart3,
  CreditCard,
  Bell,
  Settings,
  FileText,
  ArrowLeftRight,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Package,
  Banknote,
  Armchair,
  Repeat,
  CalendarDays,
} from 'lucide-react';
import AdminContentSkeleton from './AdminContentSkeleton';
import AdminMobileBottomNav from './AdminMobileBottomNav';
import { supabase } from '../../lib/supabase';
import { logoutWithSyncCheck } from '../../lib/logoutWithSyncCheck';
import { useSchoolChatUnreadTotal } from '../../hooks/useSchoolChatUnreadTotal';
import { useSchoolType } from '@/hooks/useSchoolType';
import { usePwezaStore } from '../../store/pwezaStore';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { isDesktopApp } from '../../lib/isDesktopApp';
import { POS_SIDEBAR_SHARED_CSS } from '../../lib/pwShellCss';
import { prefetchWorkforceAll } from '@/pages/admin/workforce/workforcePrefetch';
import { useWorkforceNavVisible, usePermission } from '../../hooks/usePermission';
import { PERMISSION_KEYS } from '../../lib/permissions';
import { hasRole, ROLE_GROUPS, logRbacDecision } from '../../lib/rbac';

interface AdminUser {
  name: string;
  email: string;
  initials: string;
  hasMultipleRoles: boolean;
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
  const isActive = location.pathname === '/dashboard/admin/students' && current === d;
  return (
    <NavLink
      to={`/dashboard/admin/students?discipline=${encodeURIComponent(d)}`}
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
  const isActive = location.pathname === '/dashboard/admin/parents' && current === f;
  return (
    <NavLink
      to={`/dashboard/admin/parents?filter=${encodeURIComponent(f)}`}
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
  if (!pathname.startsWith('/dashboard/admin/settings')) return false;
  if (pathname.startsWith('/dashboard/admin/settings/classes')) return false;
  if (pathname.startsWith('/dashboard/admin/settings/location')) return false;
  const rest = pathname.slice('/dashboard/admin/settings'.length);
  if (rest === '' || rest === '/') return true;
  return /^\/(subjects|assignments|finance|requirements|timetable|terms|exams|branding)\/?$/.test(rest);
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const authRole = useAuthStore((s) => s.role);
  const authUserId = useAuthStore((s) => s.user?.id);
  const { setUser, setRole, setSchoolId, setPermissions } = useAuthStore();
  const { isTertiary } = useSchoolType();
  const chatUnread = useSchoolChatUnreadTotal(authUserId ?? undefined);
  const chatUnreadBadge =
    chatUnread > 0 ? (chatUnread > 99 ? '99+' : chatUnread) : undefined;
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const prefetchAll = usePwezaStore((s) => s.prefetchAll); // pweza speed system

  /** Synchronize theme on document root so POS Light and Dark modes render accurately */
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    root.setAttribute('data-theme', theme);
    localStorage.setItem('pwezacore-theme', theme);
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
    hasMultipleRoles: false,
  });
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [jobCount, setJobCount] = useState<number | null>(null);
  const [notifCount, setNotifCount] = useState<number | null>(null);
  useEffect(() => {
    if (location.pathname.includes('/accounts') || location.pathname.includes('/permissions')) setUserMgmtOpen(true);
    if (location.pathname.includes('/dashboard/admin/finance')) setFinanceOpen(true);
    if (location.pathname.includes('/reports') || location.pathname.includes('/report-records') || location.pathname.includes('/templates')) {
      setReportsOpen(true);
    }
    if (location.pathname.startsWith('/dashboard/admin/students')) setStudentsMenuOpen(true);
    if (location.pathname.startsWith('/dashboard/admin/parents')) setParentsMenuOpen(true);
    if (location.pathname.startsWith('/dashboard/admin/workforce')) setWorkforceOpen(true);
  }, [location.pathname]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const r = authRole ? String(authRole).toLowerCase().replace(/\s+/g, '_') : '';
    if (r === 'head_teacher' && location.pathname.startsWith('/dashboard/admin')) {
      navigate('/dashboard/head-teacher', { replace: true });
    }
  }, [authRole, location.pathname, navigate]);

  useEffect(() => {
    async function loadUserAndCounts() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userData } = await supabase
          .from('users')
          .select('name, email, school_id, extra_roles')
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
        const extraRoles = Array.isArray((userData as { extra_roles?: unknown }).extra_roles)
          ? (userData as { extra_roles: string[] }).extra_roles
          : [];
        setAdminUser({
          name,
          email: (userData as { email?: string }).email || user.email || '',
          initials,
          hasMultipleRoles: extraRoles.length > 0,
        });

        const schoolId = (userData as { school_id?: string }).school_id;
        if (!schoolId) return;
        useAuthStore.getState().setSchoolId(schoolId);

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
    void logoutWithSyncCheck(() => {
      setUser(null);
      setRole(null);
      setSchoolId(null);
      setPermissions([]);
      navigate('/');
    });
  }

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <>
      <style>{POS_SIDEBAR_SHARED_CSS}</style>

      <div className="pw-layout" data-theme={theme}>
        <button type="button" className="pw-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar">
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {sidebarOpen && <div className="pw-sidebar-overlay" onClick={closeSidebar} />}

        <aside className={`pw-sidebar ${sidebarOpen ? 'pw-sidebar--open' : ''}`}>
          <div className="pw-brand">
            <div className="pw-brand-name">PwezaCore</div>
            <div className="pw-brand-subtitle">School Administration</div>
            <div className="pw-brand-pill">{isTertiary ? 'Academic Registrar' : 'Administrator'}</div>
          </div>

          <div className="pw-nav-scroll-area">

          <div className="pw-nav-section">
            <span className="pw-nav-label">Main</span>
            <NavItem to="/dashboard/admin" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" end onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to="/dashboard/head-teacher" icon={<UserCheck className="w-4 h-4" />} label="Head Teacher" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to="/dashboard/accountant" icon={<CircleDollarSign className="w-4 h-4" />} label="Accountant" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem
              to="/dashboard/admin/messages"
              icon={<MessageSquare className="w-4 h-4" />}
              label="Messages"
              badge={chatUnreadBadge}
              badgeColor="rose"
              onClick={closeSidebar}
              onPrefetch={onPrefetchNav}
            />
            <NavItem
              to="/dashboard/admin/students"
              icon={<GraduationCap className="w-4 h-4" />}
              label={isTertiary ? "Students & Trainees" : "Students"}
              badge={studentCount ?? undefined}
              badgeColor="teal"
              onClick={closeSidebar}
              onPrefetch={onPrefetchNav}
            />
            <NavItem
              to="/dashboard/admin/cards"
              icon={<CreditCard className="w-4 h-4 text-emerald-400" />}
              label="Student Cards & Passes"
              onClick={closeSidebar}
              onPrefetch={onPrefetchNav}
            />
            <NavItem to="/dashboard/admin/teachers" icon={<BookOpen className="w-4 h-4" />} label={isTertiary ? "Tutors & Instructors" : "Teachers"} onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavGroup
              icon={<Users2 className="w-4 h-4" />}
              label="Parents"
              isOpen={parentsMenuOpen}
              onToggle={() => setParentsMenuOpen(!parentsMenuOpen)}
              matchPaths={['/dashboard/admin/parents']}
            >
              <SubItemParentsFilter filter="all" label="All Parents" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItemParentsFilter filter="outstanding" label="Outstanding balances" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItemParentsFilter filter="missing_contact" label="Missing contact" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            </NavGroup>
          </div>

          <div className="pw-nav-section">
            <span className="pw-nav-label">Management</span>
            <NavGroup icon={<ShieldCheck className="w-4 h-4" />} label="User Management" isOpen={userMgmtOpen} onToggle={() => setUserMgmtOpen(!userMgmtOpen)} matchPaths={['/dashboard/admin/accounts', '/dashboard/admin/permissions']}>
              <SubItem to="/dashboard/admin/accounts" label="All Users" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItem to="/dashboard/admin/accounts/invite" label="Send invitations" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItem to="/dashboard/admin/permissions" label="Access & permissions" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            </NavGroup>
            <NavItem to="/dashboard/admin/departments" icon={<Building2 className="w-4 h-4 text-emerald-400" />} label="Departments & Portfolios" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to="/dashboard/admin/staff" icon={<Building2 className="w-4 h-4" />} label="Staff" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to="/dashboard/admin/gate-passes" icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />} label="Gate Passes & Exits" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to="/dashboard/admin/settings/classes" icon={<School className="w-4 h-4" />} label={isTertiary ? "Programmes & Cohorts" : "Classes"} onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to="/dashboard/admin/store" icon={<Package className="w-4 h-4 text-teal-400" />} label="Store & Kitchen Supplies" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to="/dashboard/admin/property-assets" icon={<Armchair className="w-4 h-4 text-amber-400" />} label="Furniture & Physical Assets" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to="/dashboard/admin/recurring-expenses" icon={<Repeat className="w-4 h-4 text-sky-400" />} label="Recurring & Utility Bills" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            {showWorkforce && (
              <NavGroup
                icon={<Briefcase className="w-4 h-4" />}
                label="Workforce"
                isOpen={workforceOpen}
                onToggle={() => setWorkforceOpen(!workforceOpen)}
                matchPaths={['/dashboard/admin/workforce']}
              >
                <SubItem to="/dashboard/admin/workforce" label="Overview" end onClick={closeSidebar} onPrefetch={onPrefetchWorkforceNav} />
                <SubItem to="/dashboard/accountant/salary-obligations" label="Salary Obligations & Burn" onClick={closeSidebar} onPrefetch={onPrefetchWorkforceNav} />
                {canHrWorkforce && (
                  <>
                    <SubItem to="/dashboard/admin/workforce/leave" label="Leave" onClick={closeSidebar} onPrefetch={onPrefetchWorkforceNav} />
                    <SubItem to="/dashboard/admin/workforce/recruitment" label="Recruitment" onClick={closeSidebar} onPrefetch={onPrefetchWorkforceNav} />
                    <SubItem to="/dashboard/admin/workforce/onboarding" label="Onboarding" onClick={closeSidebar} onPrefetch={onPrefetchWorkforceNav} />
                    <SubItem to="/dashboard/admin/workforce/performance" label="Performance" onClick={closeSidebar} onPrefetch={onPrefetchWorkforceNav} />
                  </>
                )}
                {canWorkforcePayroll && (
                  <SubItem to="/dashboard/admin/workforce/payroll" label="Payroll" onClick={closeSidebar} onPrefetch={onPrefetchWorkforceNav} />
                )}
              </NavGroup>
            )}
            <NavItem to="/dashboard/admin/jobs" icon={<Briefcase className="w-4 h-4" />} label="Job Vacancies" badge={jobCount ?? undefined} badgeColor="rose" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
          </div>

          <div className="pw-nav-section">
            <span className="pw-nav-label">Finance</span>
            <NavGroup
              icon={<Wallet className="w-4 h-4" />}
              label="Finance"
              isOpen={financeOpen}
              onToggle={() => setFinanceOpen(!financeOpen)}
              matchPaths={['/dashboard/admin/finance']}
            >
              <SubItem to="/dashboard/admin/finance" label="Overview" end onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItem to="/dashboard/admin/finance/financial-analytics" label="Financial Analytics" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItem to="/dashboard/admin/finance/outstanding" label="Outstanding balances" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItem to="/dashboard/admin/budget/consolidated" label="Monthly Board Budget (Quorum)" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItem to="/dashboard/admin/budget/requisitions" label="Budget Requisitions" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItem to="/dashboard/admin/store/daily-indent" label="Daily Kitchen Indents" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItem to="/dashboard/admin/store" label="Stores & Supplies" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItem
                to="/dashboard/accountant"
                label="Accounts page"
                onClick={closeSidebar}
                onPrefetch={onPrefetchNav}
              />
            </NavGroup>
          </div>

          <div className="pw-nav-section">
            <span className="pw-nav-label">Academic</span>
            <NavItem to="/dashboard/admin/calendar" icon={<CalendarDays className="w-4 h-4 text-teal-400" />} label="School Calendar & Planner" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            {isTertiary && (
              <NavItem to="/dashboard/admin/tertiary" icon={<GraduationCap className="w-4 h-4 text-emerald-400" />} label="UNMEB & Curriculum Hub" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            )}
            {isTertiary && (
              <NavItem to="/dashboard/admin/ward-postings" icon={<Stethoscope className="w-4 h-4 text-rose-400" />} label="Ward Postings & Clinical" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            )}
            <NavItem to="/dashboard/admin/attendance" icon={<ClipboardCheck className="w-4 h-4" />} label="Attendance" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to="/dashboard/admin/attendance-code" icon={<KeyRound className="w-4 h-4" />} label="Attendance Code" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to="/dashboard/admin/lesson-monitor" icon={<Eye className="w-4 h-4" />} label={isTertiary ? "Lecture & Practicum Monitor" : "Lesson Monitor"} onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to="/dashboard/admin/biometric" icon={<Fingerprint className="w-4 h-4" />} label="Biometric Enrollment" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to="/dashboard/admin/biometric-devices" icon={<Monitor className="w-4 h-4" />} label="Biometric Devices" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to="/dashboard/admin/exam-sets" icon={<FileEdit className="w-4 h-4" />} label={isTertiary ? "Semester Assessments" : "Exam Sets"} onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to="/dashboard/admin/exam-set-results" icon={<Trophy className="w-4 h-4" />} label={isTertiary ? "UHPAB & Semester Results" : "Exam Results"} onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavGroup
              icon={<BarChart3 className="w-4 h-4" />}
              label={isTertiary ? "Result Slips & Transcripts" : "Reports"}
              isOpen={reportsOpen}
              onToggle={() => setReportsOpen(!reportsOpen)}
              matchPaths={['/dashboard/admin/reports', '/dashboard/admin/report-records', '/dashboard/admin/reports/generate-tertiary', '/dashboard/admin/templates']}
            >
              <SubItem
                to="/dashboard/admin/reports"
                label="Overview"
                onClick={closeSidebar}
                onPrefetch={onPrefetchNav}
                className="pw-nav-subitem--hidden"
              />
              <SubItem to="/dashboard/admin/reports/generate" label={isTertiary ? "Generate Result Slips" : "Generate reports"} onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItem to="/dashboard/admin/report-records" label={isTertiary ? "Archived Result Slips" : "Report Records"} onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              {!isTertiary && (
                <SubItem to="/dashboard/admin/templates" label="Report Templates" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              )}
            </NavGroup>
            <NavItem to="/dashboard/admin/identity" icon={<CreditCard className="w-4 h-4" />} label="Identity cards" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
          </div>

          <div className="pw-nav-section">
            <span className="pw-nav-label">System & Operations</span>
            <NavItem to="/dashboard/admin/departments" icon={<Building2 className="w-4 h-4 text-indigo-400" />} label="Departments & Portfolios" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to="/dashboard/admin/notifications" icon={<Bell className="w-4 h-4" />} label="Notifications" badge={notifCount ?? undefined} badgeColor="amber" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to="/dashboard/admin/settings" icon={<Settings className="w-4 h-4" />} label="System Settings" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to="/dashboard/admin/headed-paper" icon={<FileText className="w-4 h-4" />} label="Headed Paper" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
          </div>
          </div>

          <div className="pw-sidebar-tools">
            <button type="button" onClick={toggleTheme} title={theme === 'light' ? 'Switch to dark mode' : 'Switch to white mode'}>
              {theme === 'light' ? <Moon className="h-4 w-4 shrink-0" /> : <Sun className="h-4 w-4 shrink-0" />}
              <span>{theme === 'light' ? 'Dark Mode' : 'White Mode'}</span>
            </button>
          </div>

          <div className="pw-sidebar-bottom">
            <div className="pw-admin-card">
              <div className="pw-admin-av">{adminUser.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="pw-admin-name">{adminUser.name}</div>
                <div className="pw-admin-role">{isTertiary ? 'Academic Registrar / Principal' : 'School Administrator'}</div>
              </div>
            </div>
            {adminUser.hasMultipleRoles && (
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

        <main
          className={[
            'pw-main',
            location.pathname.startsWith('/dashboard/admin/messages') ? 'pw-main--chat' : '',
            isSettingsMasterDetailPath(location.pathname) ? 'pw-main--settings-split' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <Suspense fallback={isDesktopApp ? null : <AdminContentSkeleton />}>
            <Outlet />
          </Suspense>
        </main>

        <AdminMobileBottomNav notifCount={notifCount} onPrefetch={onPrefetchNav} />
      </div>
    </>
  );
}

