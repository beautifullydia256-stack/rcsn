import React, { useState, useEffect, Suspense } from 'react';
import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom';
import { GuildProvider, useGuild } from '@/context/GuildContext';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useTheme } from '@/lib/theme-provider';
import { getTokens, PosTokens } from '@/styles/posThemeTokens';
import { supabase } from '@/lib/supabase';
import { logoutWithSyncCheck } from '@/lib/logoutWithSyncCheck';
import AdminContentSkeleton from '@/components/layout/AdminContentSkeleton';
import StudentMobileBottomNav from '@/components/layout/StudentMobileBottomNav';
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  Calendar,
  CalendarDays,
  Award,
  ClipboardCheck,
  FolderOpen,
  CreditCard,
  MessageSquare,
  Vote,
  MessageSquareQuote,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  Landmark,
  ArrowRight,
  ShieldCheck,
  Building2,
} from 'lucide-react';

interface StudentInfo {
  name: string;
  admission_number: string;
  current_class: string;
  school_name: string;
  initials: string;
}

// Prefetch chunks so clicking sidebar links is instant without any full-page reload
const STUDENT_ROUTE_CHUNKS = [
  () => import('@/pages/student/Dashboard'),
  () => import('@/pages/student/assignments/StudentAssignmentsPage'),
  () => import('@/pages/student/timetable/StudentTimetablePage'),
  () => import('@/pages/student/results/StudentResultsPage'),
  () => import('@/pages/student/attendance/StudentAttendancePage'),
  () => import('@/pages/student/resources/StudentResourcesPage'),
];

export function StudentLayoutContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const schoolId = useAuthStore((s) => s.schoolId) ?? (user?.user_metadata?.school_id as string | undefined);
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t: PosTokens = getTokens(isDark);
  const { setTheme: setCtxTheme } = useTheme();
  const { isGuildExecutive, portfolioTitle, setExecutiveMode } = useGuild();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [studentInfo, setStudentInfo] = useState<StudentInfo>({
    name: 'Student',
    admission_number: '—',
    current_class: '—',
    school_name: 'Rakai Community School of Nursing',
    initials: 'ST',
  });

  // Prefetch route chunks on mount
  useEffect(() => {
    STUDENT_ROUTE_CHUNKS.forEach((loader) => {
      try {
        void loader();
      } catch (_) {}
    });
  }, []);

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

  // Fetch student details
  useEffect(() => {
    async function loadStudent() {
      if (!user) return;
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('name, student_id, school_id')
          .eq('user_id', user.id)
          .maybeSingle();

        const sid = (userData as any)?.student_id;
        const schId = (userData as any)?.school_id || schoolId;

        let stName = (userData as any)?.name || user.user_metadata?.name || user.email?.split('@')[0] || 'Student';
        let admNo = '—';
        let clsName = '—';
        let schName = 'Rakai Community School of Nursing';

        if (schId) {
          const { data: schData } = await supabase
            .from('schools')
            .select('name')
            .eq('school_id', schId)
            .maybeSingle();
          if (schData?.name) schName = schData.name;
        }

        if (sid && schId) {
          const { data: stRow } = await supabase
            .from('students')
            .select('name, admission_number, current_class')
            .eq('student_id', sid)
            .eq('school_id', schId)
            .maybeSingle();
          if (stRow) {
            if (stRow.name) stName = stRow.name;
            if (stRow.admission_number) admNo = stRow.admission_number;
            if (stRow.current_class) clsName = stRow.current_class;
          }
        }

        const initials = stName
          .split(' ')
          .map((w: string) => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase() || 'ST';

        setStudentInfo({
          name: stName,
          admission_number: admNo,
          current_class: clsName,
          school_name: schName,
          initials,
        });
      } catch (err) {
        console.error('Error loading student layout info:', err);
      }
    }
    void loadStudent();
  }, [user, schoolId]);

  const handleLogout = () => {
    void logoutWithSyncCheck(() => navigate('/'));
  };

  const closeSidebar = () => setSidebarOpen(false);

  const navSections = [
    {
      title: 'Academic Journey',
      items: [
        { to: '/dashboard/student', icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard', end: true, prefetch: STUDENT_ROUTE_CHUNKS[0] },
        { to: '/dashboard/student/timetable', icon: <Calendar className="w-4 h-4" />, label: 'Class Timetable', prefetch: STUDENT_ROUTE_CHUNKS[2] },
        { to: '/dashboard/student/course-registration', icon: <GraduationCap className="w-4 h-4 text-purple-400" />, label: 'Course Registration & Retakes' },
        { to: '/dashboard/student/assignments', icon: <BookOpen className="w-4 h-4" />, label: 'My Coursework', prefetch: STUDENT_ROUTE_CHUNKS[1] },
        { to: '/dashboard/student/resources', icon: <FolderOpen className="w-4 h-4" />, label: 'Learning Resources', prefetch: STUDENT_ROUTE_CHUNKS[5] },
      ],
    },
    {
      title: 'Assessments & Standing',
      items: [
        { to: '/dashboard/student/results', icon: <Award className="w-4 h-4" />, label: 'Exam Results & Reports', prefetch: STUDENT_ROUTE_CHUNKS[3] },
        { to: '/dashboard/student/calendar', icon: <CalendarDays className="w-4 h-4 text-emerald-400" />, label: 'School Calendar & Exams' },
        { to: '/dashboard/student/attendance', icon: <ClipboardCheck className="w-4 h-4" />, label: 'My Attendance', prefetch: STUDENT_ROUTE_CHUNKS[4] },
      ],
    },
    {
      title: 'Finances & Clearance',
      items: [
        { to: '/dashboard/student/fees', icon: <CreditCard className="w-4 h-4" />, label: 'Tuition & Fees Ledger' },
        { to: '/dashboard/student/facilities', icon: <Building2 className="w-4 h-4 text-sky-400" />, label: 'Facility Passes & Liabilities' },
      ],
    },
    {
      title: 'Campus Life & Services',
      items: [
        { to: '/dashboard/student/gate-pass', icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />, label: 'Exit Permissions' },
        { to: '/dashboard/student/messages', icon: <MessageSquare className="w-4 h-4" />, label: 'School Messages' },
        { to: '/dashboard/student/voting', icon: <Vote className="w-4 h-4" />, label: 'Campus Voting' },
        { to: '/dashboard/student/grievances', icon: <MessageSquareQuote className="w-4 h-4" />, label: 'Grievances Desk' },
      ],
    },
  ];

  return (
    <div
      className="pw-layout"
      data-theme={isDark ? 'dark' : 'light'}
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: t.screenBg,
        color: t.textPrimary,
        fontFamily: "'Instrument Sans', 'Cabinet Grotesk', system-ui, sans-serif",
      }}
    >
      {/* ── Scoped Layout Styles ─────────────────────────────────────────────── */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .pw-student-sidebar {
              width: 250px;
              min-width: 250px;
              height: 100vh;
              position: fixed;
              top: 0;
              left: 0;
              bottom: 0;
              z-index: 118;
              background: ${isDark ? '#070B09' : 'rgba(255, 255, 255, 0.75)'};
              backdrop-filter: blur(24px) saturate(180%);
              -webkit-backdrop-filter: blur(24px) saturate(180%);
              border-right: 1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.85)'};
              box-shadow: ${isDark ? '10px 0 35px -5px rgba(0, 0, 0, 0.38), inset -1px 0 1.5px rgba(255, 255, 255, 0.15)' : '10px 0 30px -5px rgba(0, 0, 0, 0.07), inset -1px 0 1.5px rgba(255, 255, 255, 0.95)'};
              display: flex;
              flex-direction: column;
              transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
              overflow-y: auto;
            }
            .pw-student-sidebar::after {
              content: '';
              position: absolute;
              top: 0; right: 0; bottom: 0;
              width: 1.5px;
              background: ${isDark ? 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.2) 15%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.2) 85%, transparent 100%)' : 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.6) 15%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.6) 85%, transparent 100%)'};
              pointer-events: none;
              z-index: 120;
            }
            .pw-student-main {
              margin-left: 250px;
              width: calc(100% - 250px);
              flex: 1;
              min-height: 100vh;
              overflow-x: hidden;
              overflow-y: auto;
              padding: 24px 28px 60px;
              box-sizing: border-box;
              background: ${t.screenBg};
            }
            @media (max-width: 768px) {
              .pw-student-sidebar {
                transform: translateX(-100%);
              }
              .pw-student-sidebar.open {
                transform: translateX(0);
              }
              .pw-student-main {
                margin-left: 0 !important;
                width: 100% !important;
                padding: 16px 14px calc(var(--pw-botnav-h, 64px) + env(safe-area-inset-bottom, 0px) + 24px) !important;
              }
              .pw-student-mobile-btn {
                display: flex !important;
              }
            }
          `,
        }}
      />

      {/* ── Top Floating Utility Bar ────────────────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          top: 14,
          right: 24,
          zIndex: 110,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        {isGuildExecutive && (
          <button
            type="button"
            onClick={() => {
              setExecutiveMode(true);
              navigate('/dashboard/guild');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 99,
              background: 'linear-gradient(135deg, #059669, #0d9488)',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 700,
              boxShadow: '0 4px 14px rgba(5,150,105,0.25)',
              border: '1px solid rgba(255,255,255,0.2)',
              cursor: 'pointer',
            }}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Guild Executive</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={handleToggleTheme}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            borderRadius: 99,
            background: isDark ? '#0e1626' : '#ffffff',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            color: isDark ? '#f8fafc' : '#0f172a',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
          }}
        >
          {isDark ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Switch to White Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-indigo-500" />
              <span>Switch to Dark Mode</span>
            </>
          )}
        </button>
      </div>

      {/* ── Mobile Hamburger Button ─────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          position: 'fixed',
          top: 14,
          left: 16,
          zIndex: 120,
          background: t.card,
          border: `1px solid ${t.border}`,
          color: t.textPrimary,
          borderRadius: 8,
          padding: 8,
          cursor: 'pointer',
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        className="pw-student-mobile-btn"
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* ── Mobile Backdrop ─────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          onClick={closeSidebar}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 115,
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className={`pw-student-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Brand Header */}
        <div
          style={{
            padding: '20px 18px',
            borderBottom: `1px solid ${t.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #10b981, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(16,185,129,0.25)',
              flexShrink: 0,
            }}
          >
            <GraduationCap className="w-5 h-5" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: t.textPrimary, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              RCSN
            </div>
            <div style={{ fontSize: 11, color: t.mint, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.mint, display: 'inline-block' }} />
              Student Portal
            </div>
          </div>
        </div>

        {/* Student Mini Profile */}
        <div
          style={{
            margin: '12px 14px 4px',
            padding: '12px',
            borderRadius: 12,
            background: t.surface,
            border: `1px solid ${t.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: t.mintDim,
              color: t.mint,
              fontWeight: 800,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {studentInfo.initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {studentInfo.name}
            </div>
            <div style={{ fontSize: 10, color: t.textSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Class: {studentInfo.current_class}
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <div style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navSections.map((section, sIdx) => (
            <div key={section.title} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.textMuted, padding: `${sIdx === 0 ? '4px' : '10px'} 12px 4px` }}>
                {section.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {section.items.map((item) => {
                  const active = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={closeSidebar}
                      onMouseEnter={() => item.prefetch?.()}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '9px 12px',
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: active ? 700 : 500,
                        color: active ? t.mint : t.textSecondary,
                        background: active ? t.mintDim : 'transparent',
                        border: `1px solid ${active ? 'rgba(16,217,168,0.2)' : 'transparent'}`,
                        textDecoration: 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ color: active ? t.mint : t.textMuted }}>{item.icon}</span>
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div style={{ padding: '12px 14px', borderTop: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            type="button"
            onClick={handleToggleTheme}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: '8px 12px',
              borderRadius: 8,
              background: t.surface,
              border: `1px solid ${t.border}`,
              color: t.textSecondary,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
            <span>{isDark ? 'White Mode' : 'Dark Mode'}</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: '8px 12px',
              borderRadius: 8,
              background: 'transparent',
              border: `1px solid transparent`,
              color: t.red,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content Area with Local Suspense (prevents full-page reload) ── */}
      <main className="pw-student-main">
        <div style={{ maxWidth: 1280, margin: '0 auto', width: '100%' }}>
          <Suspense fallback={<AdminContentSkeleton />}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      {/* ── Mobile Bottom Navigation Bar ── */}
      <StudentMobileBottomNav
        onPrefetch={() => {
          STUDENT_ROUTE_CHUNKS.forEach((loader) => {
            try {
              void loader();
            } catch (_) {}
          });
        }}
      />
    </div>
  );
}

export default function StudentLayout() {
  return (
    <GuildProvider>
      <StudentLayoutContent />
    </GuildProvider>
  );
}
