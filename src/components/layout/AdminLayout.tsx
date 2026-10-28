import { Suspense, useEffect, useState, isValidElement, type ReactNode, type ComponentType } from 'react';
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
  Package,
  Armchair,
  CalendarDays,
  UtensilsCrossed,
  Mail,
  ChevronDown,
  ChevronRight,
  User,
} from 'lucide-react';
import AdminContentSkeleton from './AdminContentSkeleton';
import { supabase } from '../../lib/supabase';
import { logoutWithSyncCheck } from '../../lib/logoutWithSyncCheck';
import { useSchoolChatUnreadTotal } from '../../hooks/useSchoolChatUnreadTotal';
import { useSystemAlertsCount } from '@/hooks/useSystemAlertsCount';
import { useSchoolType } from '@/hooks/useSchoolType';
import { usePwezaStore } from '../../store/pwezaStore';
import { useAuthStore } from '../../store/authStore';
import { isDesktopApp } from '../../lib/isDesktopApp';
import { useWorkforceNavVisible, usePermission } from '../../hooks/usePermission';
import { PERMISSION_KEYS } from '../../lib/permissions';
import '@/styles/government-system.css';

function renderNavIcon(icon: ReactNode) {
  if (!icon) return null;
  if (isValidElement(icon)) return icon;
  if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null)) {
    const IconCmp = (icon as unknown) as ComponentType<{ className?: string }>;
    return <IconCmp className="w-4 h-4" />;
  }
  return null;
}

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
  onClick?: () => void;
  end?: boolean;
}

function GovNavItem({ to, icon, label, badge, onClick, end = false }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) => `gov-nav-item ${isActive ? 'active' : ''}`}
    >
      <span className="shrink-0 flex items-center justify-center w-4 h-4 text-[#111111]">
        {renderNavIcon(icon)}
      </span>
      <span className="truncate flex-1 text-[12px]">{label}</span>
      {badge !== undefined && badge !== null && String(badge) !== '0' && (
        <span className="gov-nav-badge">{badge}</span>
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
}

function GovNavGroup({ icon, label, isOpen, onToggle, children, matchPaths = [], badge }: NavGroupProps) {
  const location = useLocation();
  const isActive = matchPaths.some((p) => location.pathname.startsWith(p));

  return (
    <div className="border-b border-[#CCCCCC]">
      <button
        type="button"
        className={`gov-nav-item w-full justify-between text-left border-none ${
          isActive ? 'font-bold bg-[#EAEAEA]' : ''
        }`}
        onClick={onToggle}
      >
        <span className="shrink-0 flex items-center justify-center w-4 h-4 text-[#111111]">
          {renderNavIcon(icon)}
        </span>
        <span className="truncate flex-1 text-[12px]">{label}</span>
        {badge !== undefined && badge !== null && String(badge) !== '0' && (
          <span className="gov-nav-badge mr-1">{badge}</span>
        )}
        <span className="text-[#555555]">
          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </span>
      </button>
      {isOpen && <div className="bg-[#F9F9FB] border-t border-[#CCCCCC] pl-4">{children}</div>}
    </div>
  );
}

function GovSubItem({
  to,
  label,
  onClick,
  end = false,
}: {
  to: string;
  label: string;
  onClick?: () => void;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-2 py-2 px-3 text-[11px] text-[#333333] border-b border-[#E5E7EB] hover:bg-[#EAEAEA] ${
          isActive ? 'font-bold text-[#111111] bg-[#E5E7EB]' : ''
        }`
      }
    >
      <span className="text-[10px] text-[#777777]">•</span>
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const authRole = useAuthStore((s) => s.role);
  const authUserId = useAuthStore((s) => s.user?.id);
  const { setUser, setRole, setSchoolId, setPermissions } = useAuthStore();
  const { isTertiary } = useSchoolType();
  const currentSchoolId = useAuthStore((s) => s.schoolId);
  const chatUnread = useSchoolChatUnreadTotal(authUserId ?? undefined);
  const systemAlerts = useSystemAlertsCount(authUserId, currentSchoolId);
  const chatUnreadBadge = chatUnread > 0 ? (chatUnread > 99 ? '99+' : chatUnread) : undefined;
  const showWorkforce = useWorkforceNavVisible();
  const canHrWorkforce = usePermission(PERMISSION_KEYS.hrManage);
  const canWorkforcePayroll = usePermission(PERMISSION_KEYS.hrPayroll);

  // Group toggles
  const [reportsOpen, setReportsOpen] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [workforceOpen, setWorkforceOpen] = useState(false);
  const [userMgmtOpen, setUserMgmtOpen] = useState(false);

  // Enforce Light Mode
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
    root.setAttribute('data-theme', 'light');
    document.body.classList.remove('dark');
    document.body.classList.add('light');
    localStorage.setItem('pwezacore-theme', 'light');
  }, []);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser>({
    name: 'Administrator',
    email: '',
    initials: 'AD',
    hasMultipleRoles: false,
  });
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [jobCount, setJobCount] = useState<number | null>(null);

  // Auto-expand groups when on matching routes
  useEffect(() => {
    if (location.pathname.includes('/accounts') || location.pathname.includes('/permissions')) setUserMgmtOpen(true);
    if (location.pathname.includes('/dashboard/admin/finance') || location.pathname.includes('/budget')) setFinanceOpen(true);
    if (location.pathname.includes('/reports') || location.pathname.includes('/report-records')) setReportsOpen(true);
    if (location.pathname.startsWith('/dashboard/admin/workforce')) setWorkforceOpen(true);
  }, [location.pathname]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const r = authRole ? String(authRole).toLowerCase().replace(/\s+/g, '_') : '';
    if (r === 'head_teacher' && location.pathname.startsWith('/dashboard/admin')) {
      navigate('/dashboard/academic-registrar', { replace: true });
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

        const [studentsRes, jobsRes] = await Promise.all([
          supabase.from('students').select('student_id', { count: 'exact', head: true }).eq('school_id', schoolId),
          supabase.from('jobs').select('job_id', { count: 'exact', head: true }).eq('school_id', schoolId),
        ]);

        setStudentCount(studentsRes.count ?? null);
        setJobCount(jobsRes.count ?? null);
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

  // Common Nav Content for Desktop and Mobile
  const renderNavSections = (onItemClick?: () => void) => (
    <>
      {/* 1. Executive Command */}
      <div className="gov-sidebar-section-title">Executive Command</div>
      <GovNavItem to="/dashboard/admin" icon={<LayoutDashboard />} label="Dashboard" end onClick={onItemClick} />
      <GovNavItem to="/dashboard/accountant" icon={<CircleDollarSign />} label="Accounts Page" onClick={onItemClick} />
      <GovNavItem to="/dashboard/academic-registrar" icon={<UserCheck />} label="Academic Registrar" onClick={onItemClick} />
      <GovNavItem
        to="/dashboard/admin/messages"
        icon={<MessageSquare />}
        label="Messages"
        badge={chatUnreadBadge}
        onClick={onItemClick}
      />
      <GovNavItem to="/dashboard/admin/calendar" icon={<CalendarDays />} label="Calendar & Planner" onClick={onItemClick} />
      <GovNavItem
        to="/dashboard/admin/notifications"
        icon={<Bell />}
        label="Alerts & Notifications"
        badge={systemAlerts.total > 0 ? (systemAlerts.total > 99 ? '99+' : systemAlerts.total) : undefined}
        onClick={onItemClick}
      />

      {/* 2. Registry & Trainees */}
      <div className="gov-sidebar-section-title">Registry & Trainees</div>
      <GovNavItem to="/dashboard/admin/admissions" icon={<ClipboardCheck />} label="Admissions & Intake" onClick={onItemClick} />
      <GovNavItem
        to="/dashboard/admin/students"
        icon={<GraduationCap />}
        label={isTertiary ? 'Students & Trainees' : 'Students'}
        badge={studentCount ?? undefined}
        onClick={onItemClick}
      />
      <GovNavItem to="/dashboard/admin/cards" icon={<CreditCard />} label="Student Cards & Passes" onClick={onItemClick} />
      <GovNavItem to="/dashboard/admin/parents" icon={<Users2 />} label={isTertiary ? 'Parents & Sponsors' : 'Parents'} onClick={onItemClick} />

      {/* 3. Academic & Clinical Training */}
      <div className="gov-sidebar-section-title">Academic & Clinical Training</div>
      <GovNavItem to="/dashboard/admin/settings/classes" icon={<School />} label={isTertiary ? 'Programmes & Cohorts' : 'Classes'} onClick={onItemClick} />
      {isTertiary && (
        <>
          <GovNavItem to="/dashboard/admin/tertiary" icon={<GraduationCap />} label="UNMEB & Curriculum Hub" onClick={onItemClick} />
          <GovNavItem to="/dashboard/admin/ward-postings" icon={<Stethoscope />} label="Ward Postings & Clinical" onClick={onItemClick} />
        </>
      )}
      <GovNavItem to="/dashboard/admin/attendance" icon={<ClipboardCheck />} label="Attendance Records" onClick={onItemClick} />
      <GovNavItem to="/dashboard/admin/attendance-code" icon={<KeyRound />} label="Attendance Code" onClick={onItemClick} />
      <GovNavItem to="/dashboard/admin/lesson-monitor" icon={<Eye />} label={isTertiary ? 'Lecture Monitor' : 'Lesson Monitor'} onClick={onItemClick} />
      <GovNavItem to="/dashboard/admin/biometric" icon={<Fingerprint />} label="Biometric Enrollment" onClick={onItemClick} />
      <GovNavItem to="/dashboard/admin/biometric-devices" icon={<Monitor />} label="Biometric Devices" onClick={onItemClick} />
      <GovNavItem to="/dashboard/admin/exam-sets" icon={<FileEdit />} label={isTertiary ? 'Semester Assessments' : 'Exam Sets'} onClick={onItemClick} />
      <GovNavItem to="/dashboard/admin/exam-set-results" icon={<Trophy />} label={isTertiary ? 'UHPAB & Semester Results' : 'Exam Results'} onClick={onItemClick} />

      {/* Result Slips / Reports Group */}
      <GovNavGroup
        icon={<BarChart3 />}
        label={isTertiary ? 'Result Slips & Transcripts' : 'Reports & Slips'}
        isOpen={reportsOpen}
        onToggle={() => setReportsOpen(!reportsOpen)}
        matchPaths={['/dashboard/admin/reports', '/dashboard/admin/report-records']}
      >
        <GovSubItem to="/dashboard/admin/reports" label="Overview" end onClick={onItemClick} />
        <GovSubItem to="/dashboard/admin/reports/generate" label={isTertiary ? 'Generate Slips' : 'Generate Reports'} onClick={onItemClick} />
        <GovSubItem to="/dashboard/admin/report-records" label={isTertiary ? 'Archived Slips' : 'Report Records'} onClick={onItemClick} />
      </GovNavGroup>

      {/* 4. Institutional Finance & Stores */}
      <div className="gov-sidebar-section-title">Institutional Finance & Stores</div>
      <GovNavGroup
        icon={<Wallet />}
        label="Financial Operations"
        isOpen={financeOpen}
        onToggle={() => setFinanceOpen(!financeOpen)}
        matchPaths={['/dashboard/admin/finance', '/dashboard/admin/budget', '/dashboard/accountant']}
      >
        <GovSubItem to="/dashboard/admin/finance" label="Financial Overview" end onClick={onItemClick} />
        <GovSubItem to="/dashboard/admin/finance/financial-analytics" label="Financial Analytics" onClick={onItemClick} />
        <GovSubItem to="/dashboard/admin/finance/outstanding" label="Outstanding Balances" onClick={onItemClick} />
        <GovSubItem to="/dashboard/accountant" label="Accounts Portal" onClick={onItemClick} />
        <GovSubItem to="/dashboard/admin/recurring-expenses" label="Recurring & Utility Bills" onClick={onItemClick} />
        <GovSubItem to="/dashboard/admin/budget/consolidated" label="Monthly Board Budget" onClick={onItemClick} />
        <GovSubItem to="/dashboard/admin/budget/requisitions" label="Budget Requisitions" onClick={onItemClick} />
      </GovNavGroup>
      <GovNavItem to="/dashboard/admin/store/daily-indent" icon={<UtensilsCrossed />} label="Daily Kitchen Indents" onClick={onItemClick} />
      <GovNavItem to="/dashboard/admin/store" icon={<Package />} label="Store Supplies" onClick={onItemClick} />
      <GovNavItem to="/dashboard/admin/property-assets" icon={<Armchair />} label="Furniture & Physical Assets" onClick={onItemClick} />

      {/* 5. Workforce & Faculty */}
      <div className="gov-sidebar-section-title">Workforce & Faculty</div>
      <GovNavItem to="/dashboard/admin/teachers" icon={<BookOpen />} label={isTertiary ? 'Tutors & Instructors' : 'Teachers'} onClick={onItemClick} />
      <GovNavItem to="/dashboard/admin/staff" icon={<Building2 />} label="Staff Directory" onClick={onItemClick} />
      <GovNavItem to="/dashboard/admin/departments" icon={<Building2 />} label="Departments & Portfolios" onClick={onItemClick} />
      {showWorkforce && (
        <GovNavGroup
          icon={<Briefcase />}
          label="Workforce Hub"
          isOpen={workforceOpen}
          onToggle={() => setWorkforceOpen(!workforceOpen)}
          matchPaths={['/dashboard/admin/workforce']}
        >
          <GovSubItem to="/dashboard/admin/workforce" label="Overview" end onClick={onItemClick} />
          <GovSubItem to="/dashboard/accountant/salary-obligations" label="Salary Obligations" onClick={onItemClick} />
          {canHrWorkforce && (
            <>
              <GovSubItem to="/dashboard/admin/workforce/leave" label="Staff Leave" onClick={onItemClick} />
              <GovSubItem to="/dashboard/admin/workforce/recruitment" label="Recruitment" onClick={onItemClick} />
              <GovSubItem to="/dashboard/admin/workforce/onboarding" label="Onboarding" onClick={onItemClick} />
              <GovSubItem to="/dashboard/admin/workforce/performance" label="Performance" onClick={onItemClick} />
            </>
          )}
          {canWorkforcePayroll && (
            <GovSubItem to="/dashboard/admin/workforce/payroll" label="Payroll" onClick={onItemClick} />
          )}
        </GovNavGroup>
      )}
      <GovNavItem to="/dashboard/admin/jobs" icon={<Briefcase />} label="Careers" badge={jobCount ?? undefined} onClick={onItemClick} />

      {/* 6. Governance & System */}
      <div className="gov-sidebar-section-title">Governance & System</div>
      <GovNavGroup
        icon={<ShieldCheck />}
        label="User Management"
        isOpen={userMgmtOpen}
        onToggle={() => setUserMgmtOpen(!userMgmtOpen)}
        matchPaths={['/dashboard/admin/accounts', '/dashboard/admin/permissions']}
      >
        <GovSubItem to="/dashboard/admin/accounts" label="All Users" onClick={onItemClick} />
        <GovSubItem to="/dashboard/admin/accounts/invite" label="Send Invitations" onClick={onItemClick} />
        <GovSubItem to="/dashboard/admin/permissions" label="Access & Permissions" onClick={onItemClick} />
      </GovNavGroup>
      <GovNavItem
        to="/dashboard/admin/emails"
        icon={<Mail />}
        label="Official Emails"
        badge={systemAlerts.emailsUnread > 0 ? (systemAlerts.emailsUnread > 99 ? '99+' : systemAlerts.emailsUnread) : undefined}
        onClick={onItemClick}
      />
      <GovNavItem to="/dashboard/admin/gate-passes" icon={<ShieldCheck />} label="Gate Passes & Exits" onClick={onItemClick} />
      <GovNavItem to="/dashboard/admin/headed-paper" icon={<FileText />} label="Headed Paper" onClick={onItemClick} />
      <GovNavItem to="/dashboard/admin/settings" icon={<Settings />} label="System Settings" onClick={onItemClick} />
    </>
  );

  return (
    <div className="gov-shell min-h-screen bg-[#F4F4F6] text-[#111111]">
      {/* ── MOBILE TOP BAR ── */}
      <header className="gov-mobile-topbar">
        <button
          type="button"
          className="gov-mobile-hamburger"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle navigation menu"
          title="Toggle Navigation Menu"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="flex flex-col items-center">
          <span className="font-bold text-[12px] uppercase tracking-wider text-[#111111]">
            RCSN — ADMINISTRATION
          </span>
          <span className="text-[9px] text-[#555555] font-mono tracking-wider uppercase">
            Institutional Console
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="gov-status-pill text-[9px]">ONLINE</span>
        </div>
      </header>

      {/* ── MOBILE OVERLAY ── */}
      {sidebarOpen && (
        <div
          className="gov-mobile-overlay"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* ── MOBILE SLIDE-OUT DRAWER WITH ALL SYSTEM LINKS ── */}
      <aside
        className={`gov-mobile-drawer transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Mobile Navigation Sidebar"
      >
        <div className="gov-mobile-drawer-header">
          <div>
            <div className="text-[12px] font-bold text-[#111111] uppercase tracking-wide">
              RCSN Admin System
            </div>
            <div className="text-[10px] text-[#666666] font-mono uppercase">
              Rakai Community School of Nursing
            </div>
          </div>
          <button
            type="button"
            className="gov-btn gov-btn-sm p-1.5"
            onClick={closeSidebar}
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Mini Box in Mobile Drawer */}
        <div className="p-3 bg-[#EAEAEA] border-b border-[#CCCCCC] flex items-center gap-3">
          <div className="w-8 h-8 border border-[#111111] bg-[#FFFFFF] flex items-center justify-center font-mono font-bold text-xs text-[#111111]">
            {adminUser.initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold truncate text-[#111111]">{adminUser.name}</div>
            <div className="text-[10px] text-[#555555] uppercase font-mono">Administrator</div>
          </div>
        </div>

        {/* Complete System Links on Mobile */}
        <nav className="flex-1 py-1 overflow-y-auto">
          {renderNavSections(closeSidebar)}

          {/* Logout button at bottom of mobile menu */}
          <div className="p-3 mt-3 border-t border-[#CCCCCC]">
            <button
              type="button"
              className="gov-btn w-full justify-center bg-[#FFFFFF] hover:bg-[#EAEAEA] border-[#111111]"
              onClick={() => {
                closeSidebar();
                handleLogout();
              }}
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* ── DESKTOP FIXED HIGH-DENSITY SIDEBAR ── */}
      <aside className="gov-desktop-sidebar">
        {/* Brand Header */}
        <div className="gov-sidebar-brand">
          <div className="gov-sidebar-brand-title">
            RCSN ADMIN
          </div>
          <div className="gov-sidebar-brand-subtitle">
            Rakai Community School of Nursing
          </div>
        </div>

        {/* Navigation List With High Information Density & Thin Dividers */}
        <nav className="gov-sidebar-nav">
          {renderNavSections()}
        </nav>

        {/* Desktop Sidebar Bottom User Card & Actions */}
        <div className="gov-sidebar-footer">
          <div className="flex items-center gap-2 mb-2 p-1.5 border border-[#CCCCCC] bg-[#FFFFFF]">
            <div className="w-7 h-7 border border-[#111111] bg-[#EAEAEA] flex items-center justify-center font-mono font-bold text-[11px] text-[#111111] shrink-0">
              {adminUser.initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold truncate text-[#111111] leading-tight">
                {adminUser.name}
              </div>
              <div className="text-[9px] text-[#555555] font-mono uppercase">
                Administrator
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {adminUser.hasMultipleRoles && (
              <button
                type="button"
                className="gov-btn gov-btn-sm flex-1 text-[10px]"
                onClick={() => navigate('/role-picker')}
                title="Switch Role"
              >
                <ArrowLeftRight className="w-3 h-3" />
                <span>Switch</span>
              </button>
            )}
            <button
              type="button"
              className="gov-btn gov-btn-sm flex-1 text-[10px] justify-center bg-[#FFFFFF] hover:bg-[#EAEAEA]"
              onClick={handleLogout}
              title="Official Session Logout"
            >
              <LogOut className="w-3 h-3" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT OUTLET ── */}
      <main className="gov-main-content">
        <Suspense fallback={isDesktopApp ? null : <AdminContentSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
