import { Suspense, useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  UserPlus,
  Briefcase,
  DollarSign,
  FileText,
  ClipboardList,
  BookOpen,
  Building2,
  CreditCard,
  Settings,
  Bell,
  LogOut,
  Search,
  Smartphone,
  IdCard,
  Sun,
  Moon,
  ChevronRight,
  ChevronDown,
  UserCog,
  UsersRound,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import AdminContentSkeleton from './AdminContentSkeleton';
import { supabase } from '../../lib/supabase';
import { useUIStore } from '../../store/uiStore';
import { fetchAdminKpis, ADMIN_KPIS_QUERY_KEY } from '../../pages/admin/components/AdminKPICards';

// Prefetch route chunks on hover/idle so navigation feels instant (same pattern as accountant)
const prefetchChunk = (importFn: () => Promise<unknown>) => {
  importFn().catch(() => {});
};

const ADMIN_ROUTE_CHUNKS = [
  () => import('../../pages/admin/Dashboard'),
  () => import('../../pages/admin/students/StudentsPage'),
  () => import('../../pages/admin/students/AddStudentPage'),
  () => import('../../pages/admin/teachers/TeachersPage'),
  () => import('../../pages/admin/parents/ParentsPage'),
  () => import('../../pages/admin/accounts/AccountsPage'),
  () => import('../../pages/admin/staff/StaffPage'),
  () => import('../../pages/admin/outstanding/OutstandingPage'),
  () => import('../../pages/admin/reports/ReportsHub'),
  () => import('../../pages/admin/reports/GenerateReportsPage'),
  () => import('../../pages/admin/reports/ReportRecordsPage'),
  () => import('../../pages/admin/reports/BulkGenerator'),
  () => import('../../pages/admin/reports/ReportViewer'),
  () => import('../../pages/admin/attendance/AttendanceRecordsPage'),
  () => import('../../pages/admin/exam-sets/ExamSetsPage'),
  () => import('../../pages/admin/identity/IdentityPage'),
  () => import('../../pages/admin/identity/StudentIDCardPage'),
  () => import('../../pages/admin/settings/SettingsPage'),
  () => import('../../pages/admin/settings/ClassesPage'),
  () => import('../../pages/admin/settings/ClassDetailPage'),
  () => import('../../pages/admin/settings/LocationSettingsPage'),
  () => import('../../pages/admin/jobs/AdminJobsPage'),
  () => import('../../pages/admin/notifications/NotificationsPage'),
];

function NavLinkStyle({
  to,
  end,
  icon: Icon,
  children,
  onPrefetch,
}: {
  to: string;
  end?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onPrefetch?: () => void;
}) {
  return (
    <NavLink to={to} end={end} className="block" onMouseEnter={onPrefetch}>
      {({ isActive }) => (
        <span
          className={`ac-sidebar-nav-item ${isActive ? 'ac-sidebar-nav-item-active' : ''}`}
        >
          <Icon className="h-5 w-5 flex-shrink-0 [color:inherit]" />
          <span className="flex-1">{children}</span>
          {isActive && <ChevronRight className="h-4 w-4 flex-shrink-0 opacity-80" />}
        </span>
      )}
    </NavLink>
  );
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const isAdminSection = location.pathname.startsWith('/dashboard/admin');

  const [adminName, setAdminName] = useState('Admin');
  const [adminEmail, setAdminEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    students: { student_id: string; name: string; current_class?: string; admission_number?: string }[];
    teachers: { teacher_id: string; name: string; email?: string }[];
    reports: { report_id: string; template_name?: string; created_at: string; student_name?: string }[];
  }>({ students: [], teachers: [], reports: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [userManagementOpen, setUserManagementOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);

  useEffect(() => {
    if (location.pathname.startsWith('/dashboard/admin/accounts')) setUserManagementOpen(true);
  }, [location.pathname]);
  useEffect(() => {
    if (location.pathname.startsWith('/dashboard/admin/reports') || location.pathname.startsWith('/dashboard/admin/report-records')) setReportsOpen(true);
  }, [location.pathname]);

  useEffect(() => {
    const checkMobile = () => {
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      setIsMobileDevice(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua));
    };
    checkMobile();
  }, []);

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('users').select('name, email, school_id').eq('user_id', user.id).single();
        if (data) {
          setAdminName((data as { name?: string }).name || 'Admin');
          setAdminEmail((data as { email?: string }).email || '');
          setSchoolId((data as { school_id?: string }).school_id ?? null);
        }
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!schoolId || !isAdminSection) return;
    const stale = 60 * 1000;
    queryClient.prefetchQuery({
      queryKey: [...ADMIN_KPIS_QUERY_KEY, schoolId],
      queryFn: () => fetchAdminKpis(schoolId),
      staleTime: stale,
    }).catch(() => {});
  }, [schoolId, isAdminSection, queryClient]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchOpen(false);
      setSearchResults({ students: [], teachers: [], reports: [] });
      return;
    }
    if (!schoolId) return;
    const q = searchQuery.trim();
    const t = setTimeout(async () => {
      setSearchLoading(true);
      setSearchOpen(true);
      try {
        const [studentsRes, teachersRes, reportsRes] = await Promise.all([
          supabase
            .from('students')
            .select('student_id, name, current_class, admission_number')
            .eq('school_id', schoolId)
            .or(`name.ilike.%${q}%,admission_number.ilike.%${q}%,current_class.ilike.%${q}%`)
            .limit(8),
          supabase
            .from('teachers')
            .select('teacher_id, name, email')
            .eq('school_id', schoolId)
            .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
            .limit(5),
          supabase
            .from('reports')
            .select('report_id, template_name, created_at, students(name)')
            .eq('school_id', schoolId)
            .ilike('template_name', `%${q}%`)
            .order('created_at', { ascending: false })
            .limit(5),
        ]);
        const students = (studentsRes.data || []) as { student_id: string; name: string; current_class?: string; admission_number?: string }[];
        const teachers = (teachersRes.data || []) as { teacher_id: string; name: string; email?: string }[];
        const reportsRaw = (reportsRes.data || []) as { report_id: string; template_name?: string; created_at: string; students?: { name?: string } | { name?: string }[] }[];
        const reports = reportsRaw.map((r) => ({
          report_id: r.report_id,
          template_name: r.template_name,
          created_at: r.created_at,
          student_name: Array.isArray(r.students) ? (r.students[0] as { name?: string })?.name : (r.students as { name?: string })?.name,
        }));
        setSearchResults({ students, teachers, reports });
      } catch {
        setSearchResults({ students: [], teachers: [], reports: [] });
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, schoolId]);

  // Prefetch all admin route chunks on idle so navigation is instant (same as accountant)
  useEffect(() => {
    const run = () => ADMIN_ROUTE_CHUNKS.forEach((fn) => prefetchChunk(fn));
    const useIdle = typeof requestIdleCallback !== 'undefined';
    const id = useIdle ? requestIdleCallback(run, { timeout: 200 }) : window.setTimeout(run, 120);
    return () => (useIdle ? cancelIdleCallback(id as number) : clearTimeout(id));
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Glass layout (same as accountant): only when we're in admin dashboard routes
  if (isAdminSection) {
    return (
      <div
        className="accountant-glass fixed inset-0 flex overflow-hidden"
        data-theme={theme}
        style={{ background: 'var(--ac-page-bg)', backgroundColor: 'var(--ac-page-bg)' }}
      >
        <aside className="ac-glass-sidebar w-56 flex flex-col flex-shrink-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-between gap-2 px-4 py-5 border-b border-white/10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span className="ac-text-primary font-semibold text-base truncate">PwezaCore</span>
            </div>
          </div>
          <div className="px-4 pt-4 pb-2">
            <span className="ac-text-muted text-[11px] font-semibold uppercase tracking-widest">Menu</span>
          </div>
          <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
            <NavLinkStyle to="/dashboard/admin" end icon={LayoutDashboard} onPrefetch={() => prefetchChunk(ADMIN_ROUTE_CHUNKS[0])}>
              Dashboard
            </NavLinkStyle>
            <NavLinkStyle to="/dashboard/admin/students" icon={Users} onPrefetch={() => prefetchChunk(ADMIN_ROUTE_CHUNKS[1])}>
              Students
            </NavLinkStyle>
            <NavLinkStyle to="/dashboard/admin/teachers" icon={GraduationCap} onPrefetch={() => prefetchChunk(ADMIN_ROUTE_CHUNKS[3])}>
              Teachers
            </NavLinkStyle>
            <NavLinkStyle to="/dashboard/admin/parents" icon={UserPlus} onPrefetch={() => prefetchChunk(ADMIN_ROUTE_CHUNKS[4])}>
              Parents
            </NavLinkStyle>
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => setUserManagementOpen((o) => !o)}
                onMouseEnter={() => prefetchChunk(ADMIN_ROUTE_CHUNKS[5])}
                className={`ac-sidebar-nav-item w-full text-left flex items-center gap-3 ${location.pathname.startsWith('/dashboard/admin/accounts') ? 'ac-sidebar-nav-item-active' : ''}`}
              >
                <UserCog className="h-5 w-5 flex-shrink-0 [color:inherit]" />
                <span className="flex-1">User Management</span>
                <ChevronDown className={`h-4 w-4 flex-shrink-0 opacity-80 transition-transform ${userManagementOpen ? '' : '-rotate-90'}`} />
              </button>
              {userManagementOpen && (
                <div className="pl-4 ml-2 border-l border-[var(--ac-border)] space-y-0.5">
                  <NavLink to="/dashboard/admin/accounts" className="block" onMouseEnter={() => prefetchChunk(ADMIN_ROUTE_CHUNKS[5])}>
                    {({ isActive }) => (
                      <span className={`block px-3 py-2 rounded-lg text-sm ${isActive ? 'ac-sidebar-nav-item-active' : 'ac-text-secondary hover:ac-text-primary hover:bg-white/5'}`}>
                        All users
                      </span>
                    )}
                  </NavLink>
                  <NavLink to="/dashboard/admin/accounts/add" className="block" onMouseEnter={() => prefetchChunk(ADMIN_ROUTE_CHUNKS[5])}>
                    {({ isActive }) => (
                      <span className={`block px-3 py-2 rounded-lg text-sm ${isActive ? 'ac-sidebar-nav-item-active' : 'ac-text-secondary hover:ac-text-primary hover:bg-white/5'}`}>
                        Create Staff
                      </span>
                    )}
                  </NavLink>
                </div>
              )}
            </div>
            <NavLinkStyle to="/dashboard/admin/staff" icon={UsersRound} onPrefetch={() => prefetchChunk(ADMIN_ROUTE_CHUNKS[6])}>
              Staff
            </NavLinkStyle>
            <NavLinkStyle to="/dashboard/admin/outstanding" icon={DollarSign} onPrefetch={() => prefetchChunk(ADMIN_ROUTE_CHUNKS[7])}>
              Finance
            </NavLinkStyle>
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => setReportsOpen((o) => !o)}
                onMouseEnter={() => { prefetchChunk(ADMIN_ROUTE_CHUNKS[8]); prefetchChunk(ADMIN_ROUTE_CHUNKS[9]); prefetchChunk(ADMIN_ROUTE_CHUNKS[10]); }}
                className={`ac-sidebar-nav-item w-full text-left flex items-center gap-3 ${(location.pathname.startsWith('/dashboard/admin/reports') || location.pathname.startsWith('/dashboard/admin/report-records')) ? 'ac-sidebar-nav-item-active' : ''}`}
              >
                <FileText className="h-5 w-5 flex-shrink-0 [color:inherit]" />
                <span className="flex-1">Reports</span>
                <ChevronDown className={`h-4 w-4 flex-shrink-0 opacity-80 transition-transform ${reportsOpen ? '' : '-rotate-90'}`} />
              </button>
              {reportsOpen && (
                <div className="pl-4 ml-2 border-l border-[var(--ac-border)] space-y-0.5">
                  <NavLink to="/dashboard/admin/reports" end className="block" onMouseEnter={() => prefetchChunk(ADMIN_ROUTE_CHUNKS[8])}>
                    {({ isActive }) => (
                      <span className={`block px-3 py-2 rounded-lg text-sm ${isActive ? 'ac-sidebar-nav-item-active' : 'ac-text-secondary hover:ac-text-primary hover:bg-white/5'}`}>
                        Overview
                      </span>
                    )}
                  </NavLink>
                  <NavLink to="/dashboard/admin/reports/generate" className="block" onMouseEnter={() => prefetchChunk(ADMIN_ROUTE_CHUNKS[9])}>
                    {({ isActive }) => (
                      <span className={`block px-3 py-2 rounded-lg text-sm ${isActive ? 'ac-sidebar-nav-item-active' : 'ac-text-secondary hover:ac-text-primary hover:bg-white/5'}`}>
                        Generate Reports
                      </span>
                    )}
                  </NavLink>
                  <NavLink to="/dashboard/admin/report-records" className="block" onMouseEnter={() => prefetchChunk(ADMIN_ROUTE_CHUNKS[10])}>
                    {({ isActive }) => (
                      <span className={`block px-3 py-2 rounded-lg text-sm ${isActive ? 'ac-sidebar-nav-item-active' : 'ac-text-secondary hover:ac-text-primary hover:bg-white/5'}`}>
                        Report Records
                      </span>
                    )}
                  </NavLink>
                  <NavLink to="/dashboard/admin/settings" className="block" onMouseEnter={() => prefetchChunk(ADMIN_ROUTE_CHUNKS[17])}>
                    {({ isActive }) => (
                      <span className={`block px-3 py-2 rounded-lg text-sm ${isActive ? 'ac-sidebar-nav-item-active' : 'ac-text-secondary hover:ac-text-primary hover:bg-white/5'}`}>
                        Report Templates
                      </span>
                    )}
                  </NavLink>
                </div>
              )}
            </div>
            <NavLinkStyle to="/dashboard/admin/attendance" icon={ClipboardList} onPrefetch={() => prefetchChunk(ADMIN_ROUTE_CHUNKS[13])}>
              Attendance
            </NavLinkStyle>
            <NavLinkStyle to="/dashboard/admin/exam-sets" icon={BookOpen} onPrefetch={() => prefetchChunk(ADMIN_ROUTE_CHUNKS[14])}>
              Exam Sets
            </NavLinkStyle>
            <NavLinkStyle to="/dashboard/admin/identity" icon={IdCard} onPrefetch={() => prefetchChunk(ADMIN_ROUTE_CHUNKS[15])}>
              Identity
            </NavLinkStyle>
            <NavLinkStyle to="/dashboard/admin/settings/classes" icon={Building2} onPrefetch={() => prefetchChunk(ADMIN_ROUTE_CHUNKS[18])}>
              Classes
            </NavLinkStyle>
            <NavLinkStyle to="/dashboard/admin/jobs" icon={CreditCard} onPrefetch={() => prefetchChunk(ADMIN_ROUTE_CHUNKS[21])}>
              Job Vacancies
            </NavLinkStyle>
            <NavLinkStyle to="/dashboard/admin/settings" icon={Settings} onPrefetch={() => prefetchChunk(ADMIN_ROUTE_CHUNKS[17])}>
              System Settings
            </NavLinkStyle>
            <NavLinkStyle to="/dashboard/admin/notifications" icon={Bell} onPrefetch={() => prefetchChunk(ADMIN_ROUTE_CHUNKS[22])}>
              Notifications
            </NavLinkStyle>
            <button
              type="button"
              onClick={handleLogout}
              className="ac-sidebar-nav-item w-full text-left"
            >
              <LogOut className="h-5 w-5 flex-shrink-0 [color:inherit]" />
              <span className="flex-1">Logout</span>
            </button>
          </nav>
          {isMobileDevice && (
            <div className="mx-3 mb-4 p-4 rounded-xl ac-glass-card">
              <div className="flex items-center gap-2 mb-2 ac-text-primary">
                <Smartphone className="w-5 h-5" />
                <span className="text-sm font-semibold">Download our Mobile App</span>
              </div>
              <p className="text-xs ac-text-secondary mb-3">Get easy in another way.</p>
              <a
                href="#"
                className="block w-full py-2 rounded-lg text-center text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                Download
              </a>
            </div>
          )}
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden min-h-0" style={{ background: 'transparent' }}>
          <header className="ac-glass-header flex-shrink-0 px-6 py-4">
            <div className="flex items-center justify-end gap-4">
              <div ref={searchRef} className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search students, fees, reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.trim().length >= 2 && setSearchOpen(true)}
                  className="ac-glass-card w-full rounded-xl py-2.5 pl-4 pr-10 text-sm ac-text-primary placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                {searchOpen && (
                  <div className="ac-glass-card absolute left-0 right-0 top-full z-50 mt-1 max-h-[min(400px,70vh)] overflow-hidden overflow-y-auto rounded-xl shadow-lg">
                    {searchLoading ? (
                      <div className="p-4 text-center ac-text-secondary text-sm">Searching...</div>
                    ) : (
                      <>
                        {searchResults.students.length > 0 && (
                          <div className="border-b border-slate-200/50">
                            <div className="px-3 py-2 text-xs font-semibold ac-text-muted uppercase tracking-wider flex items-center gap-2">
                              <Users className="w-4 h-4" /> Students
                            </div>
                            {searchResults.students.map((s) => (
                              <button
                                key={s.student_id}
                                type="button"
                                onClick={() => {
                                  navigate(`/dashboard/admin/students?highlight=${s.student_id}`);
                                  setSearchQuery('');
                                  setSearchOpen(false);
                                }}
                                className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-white/5 ac-text-primary text-sm"
                              >
                                <span className="font-medium truncate">{s.name}</span>
                                <span className="ac-text-muted shrink-0">{s.current_class || '—'}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {searchResults.teachers.length > 0 && (
                          <div className="border-b border-slate-200/50">
                            <div className="px-3 py-2 text-xs font-semibold ac-text-muted uppercase tracking-wider flex items-center gap-2">
                              <GraduationCap className="w-4 h-4" /> Teachers
                            </div>
                            {searchResults.teachers.map((t) => (
                              <button
                                key={t.teacher_id}
                                type="button"
                                onClick={() => {
                                  navigate(`/dashboard/admin/teachers`);
                                  setSearchQuery('');
                                  setSearchOpen(false);
                                }}
                                className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-white/5 ac-text-primary text-sm"
                              >
                                <span className="font-medium truncate">{t.name}</span>
                                {t.email && <span className="ac-text-muted text-xs truncate max-w-[180px]">{t.email}</span>}
                              </button>
                            ))}
                          </div>
                        )}
                        {searchResults.reports.length > 0 && (
                          <div className="border-b border-slate-200/50">
                            <div className="px-3 py-2 text-xs font-semibold ac-text-muted uppercase tracking-wider flex items-center gap-2">
                              <FileText className="w-4 h-4" /> Reports
                            </div>
                            {searchResults.reports.map((r) => (
                              <button
                                key={r.report_id}
                                type="button"
                                onClick={() => {
                                  navigate('/dashboard/admin/report-records');
                                  setSearchQuery('');
                                  setSearchOpen(false);
                                }}
                                className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-white/5 ac-text-primary text-sm"
                              >
                                <span className="font-medium truncate">{r.template_name || 'Report'}</span>
                                {r.student_name && <span className="ac-text-muted shrink-0 truncate max-w-[120px]">{r.student_name}</span>}
                              </button>
                            ))}
                          </div>
                        )}
                        {!searchLoading && searchQuery.trim().length >= 2 && searchResults.students.length === 0 && searchResults.teachers.length === 0 && searchResults.reports.length === 0 && (
                          <div className="p-4 text-center ac-text-muted text-sm">No results found.</div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
              <select className="ac-glass-card rounded-xl px-3 py-2 text-sm ac-text-primary border-0 min-w-[100px]">
                <option value="">Term</option>
                <option value="1">Term 1</option>
                <option value="2">Term 2</option>
                <option value="3">Term 3</option>
              </select>
              <select className="ac-glass-card rounded-xl px-3 py-2 text-sm ac-text-primary border-0 min-w-[100px]">
                <option value="">Class</option>
                <option value="P1">Primary 1</option>
                <option value="P2">Primary 2</option>
              </select>
              <select className="ac-glass-card rounded-xl px-3 py-2 text-sm ac-text-primary border-0 min-w-[100px]">
                <option value="">Academic Year</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
              <button
                type="button"
                onClick={toggleTheme}
                className="ac-glass-card flex h-10 w-10 items-center justify-center rounded-full ac-text-secondary transition-colors hover:opacity-90"
                title={theme === 'light' ? 'Switch to dark' : 'Switch to light'}
              >
                {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard/admin/notifications')}
                className="ac-glass-card flex h-10 w-10 items-center justify-center rounded-full ac-text-secondary transition-colors hover:opacity-90"
              >
                <Bell className="h-5 w-5" />
              </button>
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl ac-glass-card border-0 hover:opacity-90"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-semibold text-sm">
                    {adminName.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden md:block text-left max-w-[140px]">
                    <div className="text-sm font-medium ac-text-primary truncate">{adminName}</div>
                    <div className="text-xs ac-text-muted truncate">{adminEmail}</div>
                  </div>
                </button>
                {profileOpen && (
                  <div className="ac-glass-card absolute right-0 mt-2 w-56 rounded-xl overflow-hidden z-50 shadow-lg border">
                    <div className="p-4 border-b border-white/10">
                      <div className="font-medium ac-text-primary">{adminName}</div>
                      <div className="text-sm ac-text-muted truncate">{adminEmail}</div>
                    </div>
                    <div className="p-1">
                      <button
                        type="button"
                        onClick={() => { navigate('/dashboard/admin/settings'); setProfileOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ac-text-secondary hover:bg-white/10"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </button>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-500/10"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
              <Suspense
                fallback={
                  <div className="animate-pulse space-y-6">
                    <div className="h-8 w-56 rounded ac-skeleton-block" />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-28 rounded-xl ac-skeleton-block" />
                      ))}
                    </div>
                    <div className="h-64 rounded-xl ac-skeleton-block" />
                  </div>
                }
              >
                <Outlet />
              </Suspense>
            </div>
          </div>
          <footer className="ac-glass-footer flex-shrink-0 px-6 py-4">
            <div className="ac-text-secondary flex items-center justify-between text-sm">
              <span>Copyright © 2025 PwezaCore</span>
              <div className="flex items-center gap-6">
                <a href="#" className="hover:opacity-100 opacity-80">Privacy Policy</a>
                <a href="#" className="hover:opacity-100 opacity-80">Terms and conditions</a>
                <a href="#" className="hover:opacity-100 opacity-80">Contact</a>
              </div>
            </div>
          </footer>
        </main>
      </div>
    );
  }

  // Non-admin section (e.g. redirect): minimal wrapper without glass
  return (
    <div className="min-h-screen relative">
      <aside className="fixed left-0 top-0 bottom-0 w-52 flex flex-col z-10 overflow-y-auto bg-white border-r border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 px-4 py-6 border-b border-gray-200">
          <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-green-800 rounded-lg flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-gray-900">PwezaCore</span>
        </div>
        <nav className="flex-1 px-3 py-2">
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin')}
            className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            Dashboard
          </button>
        </nav>
      </aside>
      <div className="relative min-w-0 flex-1 ml-52 flex flex-col min-h-screen z-0 bg-gray-50">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Suspense fallback={<AdminContentSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
