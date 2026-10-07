import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  UserCheck,
  BookOpen,
  Calendar,
  FileEdit,
  Trophy,
  ClipboardCheck,
  ClipboardList,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Stethoscope,
  Sun,
  Moon,
  CalendarDays,
} from 'lucide-react';
import AdminContentSkeleton from './AdminContentSkeleton';
import DosMobileBottomNav from './DosMobileBottomNav';
import { supabase } from '../../lib/supabase';
import { logoutWithSyncCheck } from '../../lib/logoutWithSyncCheck';
import { useSchoolChatUnreadTotal } from '../../hooks/useSchoolChatUnreadTotal';
import { usePwezaStore } from '../../store/pwezaStore';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useTheme } from '@/lib/theme-provider';
import { isDesktopApp } from '../../lib/isDesktopApp';
import { hasRole, ROLE_GROUPS, normalizeRole, logRbacDecision } from '../../lib/rbac';
import { useSchoolType } from '../../hooks/useSchoolType';
import { getNavTerminology } from '../../lib/roleTerminology';

const DOS_BASE = '/dashboard/dos';

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

function NavGroup({ icon, label, isOpen, onToggle, children, matchPaths = [], badge, badgeColor = 'rose' }: NavGroupProps) {
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
}: {
  to: string;
  label: string;
  onClick?: () => void;
  end?: boolean;
  onPrefetch?: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      onMouseEnter={onPrefetch}
      className={({ isActive }) =>
        ['pw-nav-subitem', isActive ? 'pw-nav-subitem--active' : ''].filter(Boolean).join(' ')
      }
    >
      <span className="pw-nav-sub-dot">·</span>
      {label}
    </NavLink>
  );
}

function SubItemStudentsFilter({
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
  const isActive = location.pathname === `${DOS_BASE}/students` && current === d;
  return (
    <NavLink
      to={`${DOS_BASE}/students?discipline=${encodeURIComponent(d)}`}
      onClick={onClick}
      onMouseEnter={onPrefetch}
      className={['pw-nav-subitem', isActive ? 'pw-nav-subitem--active' : ''].join(' ')}
    >
      <span className="pw-nav-sub-dot">·</span>
      {label}
    </NavLink>
  );
}

export default function DosLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const authUserId = useAuthStore((s) => s.user?.id);
  const role = useAuthStore((s) => s.role);
  const chatUnread = useSchoolChatUnreadTotal(authUserId ?? undefined);
  const chatUnreadBadge = chatUnread > 0 ? (chatUnread > 99 ? '99+' : chatUnread) : undefined;
  const themeBeforeRef = useRef<'light' | 'dark' | null>(null);
  const prefetchAll = usePwezaStore((s) => s.prefetchAll);
  const { isTertiary, schoolType } = useSchoolType();
  const navTerms = getNavTerminology(schoolType);

  const dosPillLabel = isTertiary
    ? (normalizeRole(role) === 'deputy_dos' ? 'Dep. Registrar' : 'Academic Registrar')
    : (normalizeRole(role) === 'deputy_dos' ? 'Deputy DOS' : 'Dir. of Studies');
  const dosRoleLabel = isTertiary
    ? (normalizeRole(role) === 'deputy_dos' ? 'Deputy Academic Registrar' : 'Academic Registrar')
    : (normalizeRole(role) === 'deputy_dos' ? 'Deputy Director of Studies' : 'Director of Studies');

  const theme = useUIStore((s) => s.theme);
  const { setTheme: setCtxTheme } = useTheme();

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

  const onPrefetchNav = () => { void prefetchAll(); };

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [studentsMenuOpen, setStudentsMenuOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser>({ name: 'DOS', email: '', initials: 'D' });
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [notifCount, setNotifCount] = useState<number | null>(null);

  useEffect(() => {
    if (location.pathname.startsWith(`${DOS_BASE}/students`)) setStudentsMenuOpen(true);
    if (location.pathname.includes('/reports') || location.pathname.includes('/report-records')) {
      setReportsOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    async function loadUserAndCounts() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userData } = await supabase
          .from('users')
          .select('name, email, school_id')
          .eq('user_id', user.id)
          .single();

        if (!userData) return;

        const name = (userData as { name?: string }).name || user.email || 'DOS';
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

        const [studentsRes, notifsRes] = await Promise.all([
          supabase.from('students').select('student_id', { count: 'exact', head: true }).eq('school_id', schoolId),
          supabase.from('notifications').select('notification_id', { count: 'exact', head: true }).eq('school_id', schoolId),
        ]);

        setStudentCount(studentsRes.count ?? null);
        setNotifCount(notifsRes.count ?? null);
      } catch (err) {
        console.error('DosLayout user load error:', err);
      }
    }
    void loadUserAndCounts();
  }, []);

  function handleLogout() {
    void logoutWithSyncCheck(() => navigate('/'));
  }

  const closeSidebar = () => setSidebarOpen(false);

  // Route guard
  const allowed = hasRole(role, ROLE_GROUPS.DOS_DASHBOARD);
  logRbacDecision('DosLayout', location.pathname, role, normalizeRole(role), ROLE_GROUPS.DOS_DASHBOARD, allowed);

  if (role && !allowed) {
    console.log(`[RBAC] Redirecting unauthorized role (${role}) from DOS dashboard`);
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <style>{`
        html.dark .pw-layout,
        html[data-theme="dark"] .pw-layout,
        body.dark .pw-layout {
          --pw-bg: #05080f;
          --pw-s1: #0b1120;
          --pw-s2: #101828;
          --pw-s3: #141c2e;
          --pw-s4: #1d2d4e;
          --pw-t1: #f8fafc;
          --pw-t2: #c5d4ef;
          --pw-t3: #94a8d0;
          --pw-border: rgba(255,255,255,0.07);
          --pw-bh: rgba(255,255,255,0.12);
        }
        html.light .pw-layout,
        html[data-theme="light"] .pw-layout,
        body.light .pw-layout,
        :root:not(.dark) .pw-layout {
          --pw-bg: #f0f4f8;
          --pw-s1: #ffffff;
          --pw-s2: #f5f7fa;
          --pw-s3: #e8edf5;
          --pw-s4: #d0dbe8;
          --pw-t1: #0d1c2e;
          --pw-t2: #4a6080;
          --pw-t3: #8aa0b8;
          --pw-border: rgba(0,0,0,0.08);
          --pw-bh: rgba(0,0,0,0.14);
        }
        .pw-layout {
          display: flex;
          min-height: 100vh;
          height: 100vh;
          max-height: 100vh;
          overflow: hidden;
          background: var(--pw-bg, #05080f);
          font-family: 'Instrument Sans', 'Cabinet Grotesk', system-ui, sans-serif;
        }
        .pw-sidebar {
          width: var(--pw-sidebar-width, 232px);
          min-height: 100vh;
          background: rgba(10, 15, 29, 0.65);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border-right: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 10px 0 35px -5px rgba(0, 0, 0, 0.38), inset -1px 0 1.5px rgba(255, 255, 255, 0.15);
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0; left: 0; bottom: 0;
          z-index: 200;
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: none;
          -ms-overflow-style: none;
          transition: transform 0.28s cubic-bezier(.4,0,.2,1);
        }
        .pw-sidebar::after {
          content: '';
          position: absolute;
          top: 0; right: 0; bottom: 0;
          width: 1.5px;
          background: linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.2) 15%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.2) 85%, transparent 100%);
          pointer-events: none;
          z-index: 205;
        }
        html.light .pw-sidebar, html[data-theme="light"] .pw-sidebar, body.light .pw-sidebar, :root:not(.dark) .pw-sidebar {
          background: rgba(255, 255, 255, 0.75) !important;
          border-right: 1px solid rgba(255, 255, 255, 0.85) !important;
          box-shadow: 10px 0 30px -5px rgba(0, 0, 0, 0.07), inset -1px 0 1.5px rgba(255, 255, 255, 0.95) !important;
        }
        html.light .pw-sidebar::after, html[data-theme="light"] .pw-sidebar::after, body.light .pw-sidebar::after, :root:not(.dark) .pw-sidebar::after {
          background: linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.6) 15%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.6) 85%, transparent 100%) !important;
        }
        .pw-sidebar::-webkit-scrollbar { display: none; }
        @media (max-width: 768px) {
          .pw-sidebar {
            transform: translateX(-100%);
            padding-bottom: 0 !important;
            height: 100dvh !important;
            -webkit-overflow-scrolling: touch;
          }
          .pw-sidebar.pw-sidebar--open { transform: translateX(0); }
          .pw-sidebar-bottom {
            margin-top: auto !important;
            padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px)) !important;
          }
        }
        .pw-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 20px 16px 18px;
          border-bottom: 1px solid var(--pw-border, rgba(255,255,255,0.07));
          flex-shrink: 0;
        }
        .pw-brand-logo {
          width: 33px; height: 33px;
          background: linear-gradient(135deg, var(--pw-teal, #10d9a8), #0ea5e9);
          border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          font-size: 17px; flex-shrink: 0;
          box-shadow: 0 4px 14px var(--pw-teal-g, rgba(16,217,168,0.22));
        }
        .pw-brand-name {
          font-family: 'Cabinet Grotesk', sans-serif;
          font-weight: 800; font-size: 16.5px;
          letter-spacing: -0.2px;
          color: var(--pw-t1, #eef3ff);
        }
        .pw-brand-pill {
          margin-left: auto;
          font-size: 9px; font-weight: 700;
          letter-spacing: 0.8px; text-transform: uppercase;
          color: var(--pw-teal, #10d9a8);
          background: var(--pw-teal-s, rgba(16,217,168,0.10));
          border: 1px solid rgba(16,217,168,0.2);
          border-radius: 4px;
          padding: 2px 6px;
          flex-shrink: 0;
        }
        .pw-nav-section { padding: 16px 10px 4px; }
        .pw-nav-label {
          font-size: 9.5px; font-weight: 700;
          letter-spacing: 1.2px; text-transform: uppercase;
          color: var(--pw-t3, #3d5278);
          padding: 0 6px; margin-bottom: 5px;
          display: block;
        }
        .pw-nav-link {
          display: flex; align-items: center; gap: 9px;
          padding: 8px 10px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s;
          color: var(--pw-t2, #8296be);
          font-size: 13px; font-weight: 500;
          white-space: nowrap;
          text-decoration: none;
          width: 100%;
          border: 1px solid transparent;
          background: transparent;
          font-family: inherit;
        }
        .pw-nav-link:hover { background: var(--pw-s2, #101828); color: var(--pw-t1, #eef3ff); }
        .pw-nav-link--active {
          background: rgba(16, 217, 168, 0.16) !important;
          color: #10d9a8 !important;
          font-weight: 700 !important;
          border: 1px solid rgba(255, 255, 255, 0.18) !important;
          border-top: 1px solid rgba(255, 255, 255, 0.45) !important;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2), inset 0 1px 1.5px rgba(255, 255, 255, 0.35), 0 0 16px rgba(16, 217, 168, 0.2) !important;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        .pw-nav-link--active .pw-nav-ic {
          filter: drop-shadow(0 2px 6px rgba(16, 217, 168, 0.5));
        }
        .pw-nav-ic {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 18px;
          height: 18px;
          color: currentColor;
        }
        .pw-nav-ic svg {
          width: 16px;
          height: 16px;
        }
        .pw-nav-text { flex: 1; text-align: left; }
        .pw-nav-badge {
          margin-left: auto;
          font-size: 10px; font-weight: 700;
          border-radius: 99px; padding: 1px 6px;
          flex-shrink: 0;
        }
        .pw-nav-badge--rose { background: var(--pw-rose, #f75c5c); color: #fff; }
        .pw-nav-badge--teal { background: var(--pw-teal, #10d9a8); color: #05080f; }
        .pw-nav-badge--amber { background: var(--pw-amber, #f5a623); color: #05080f; }
        .pw-nav-chevron {
          margin-left: auto;
          font-size: 14px;
          color: var(--pw-t3, #3d5278);
          transition: transform 0.2s;
          display: inline-block;
          line-height: 1;
        }
        .pw-nav-chevron--open { transform: rotate(90deg); }
        .pw-nav-group-btn { cursor: pointer; text-align: left; }
        .pw-nav-subitems { padding: 2px 0 4px 14px; }
        .pw-nav-subitem {
          display: flex; align-items: center; gap: 7px;
          padding: 6px 10px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.14s;
          color: var(--pw-t2, #8296be);
          font-size: 12.5px; font-weight: 500;
          text-decoration: none;
          width: 100%;
          border: 1px solid transparent;
          background: transparent;
          font-family: inherit;
        }
        .pw-nav-subitem:hover { background: var(--pw-s2, #101828); color: var(--pw-t1, #eef3ff); }
        .pw-nav-subitem--active {
          color: var(--pw-teal, #10d9a8) !important;
          background: var(--pw-teal-s, rgba(16,217,168,0.08)) !important;
        }
        .pw-nav-sub-dot {
          color: var(--pw-t3, #3d5278);
          flex-shrink: 0;
          font-size: 16px;
          line-height: 1;
        }
        .pw-sidebar-bottom {
          margin-top: auto;
          padding: 12px;
          border-top: 1px solid var(--pw-border, rgba(255,255,255,0.07));
          flex-shrink: 0;
        }
        .pw-admin-card {
          display: flex; align-items: center; gap: 9px;
          padding: 9px 10px;
          border-radius: 8px;
          background: var(--pw-s2, #101828);
          border: 1px solid var(--pw-border, rgba(255,255,255,0.07));
          cursor: pointer;
          transition: border-color 0.2s;
        }
        .pw-admin-card:hover { border-color: var(--pw-bh, rgba(255,255,255,0.12)); }
        .pw-admin-av {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--pw-teal, #10d9a8), var(--pw-blue, #3d8ef8));
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700;
          color: #05080f;
          flex-shrink: 0;
        }
        .pw-admin-name {
          font-size: 12px; font-weight: 600;
          color: var(--pw-t1, #eef3ff);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .pw-admin-role { font-size: 10.5px; color: var(--pw-t3, #3d5278); }
        .pw-logout-btn {
          display: flex; align-items: center; gap: 9px;
          padding: 7px 10px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.14s;
          color: var(--pw-rose, #f75c5c);
          font-size: 13px; font-weight: 500;
          background: transparent;
          border: none;
          width: 100%;
          font-family: inherit;
          margin-top: 6px;
        }
        .pw-logout-btn:hover { background: var(--pw-rose-s, rgba(247,92,92,0.10)); }
        .pw-sidebar-overlay { display: none; }
        @media (max-width: 768px) {
          .pw-sidebar-overlay {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.6);
            z-index: 199;
            backdrop-filter: blur(2px);
          }
        }
        .pw-hamburger {
          display: none;
          position: fixed;
          top: calc(env(safe-area-inset-top, 0px) + 6px);
          right: calc(10px + env(safe-area-inset-right, 0px));
          z-index: 300;
          width: 36px; height: 36px;
          border-radius: 8px;
          background: var(--pw-s2, #101828);
          border: 1px solid var(--pw-border, rgba(255,255,255,0.07));
          align-items: center; justify-content: center;
          cursor: pointer;
          font-size: 16px;
          color: var(--pw-t1, #eef3ff);
          transition: border-color 0.14s;
        }
        .pw-hamburger:hover { border-color: var(--pw-bh, rgba(255,255,255,0.12)); }
        @media (max-width: 768px) { .pw-hamburger { display: flex; } }
        .pw-main {
          margin-left: var(--pw-sidebar-width, 232px);
          flex: 1;
          min-height: 0;
          width: calc(100% - var(--pw-sidebar-width, 232px));
          overflow-x: hidden;
          overflow-y: auto;
          background: var(--pw-bg, #05080f);
          color: var(--pw-t1, #eef3ff);
        }
        html.dark .pw-main {
          --ac-cpu-white: #F0F0F0;
          --ac-page-bg: transparent;
          --ac-card-bg: rgba(255, 255, 255, 0.06);
          --ac-card-bg-fallback: rgba(22, 33, 58, 0.92);
          --ac-text-primary: #f8fafc;
          --ac-text-secondary: rgba(248, 250, 252, 0.9);
          --ac-text-muted: rgba(226, 232, 240, 0.75);
          --ac-border: rgba(255, 255, 255, 0.12);
          --ac-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.35);
          --ac-shadow-strong: 0 12px 40px 0 rgba(0, 0, 0, 0.45);
          --ac-chart-grid: rgba(255, 255, 255, 0.08);
          --ac-chart-axis: rgba(255, 255, 255, 0.65);
          --ac-chart-ref-line: rgba(255, 255, 255, 0.35);
          --ac-accent-blue: #60a5fa;
          --ac-accent-green: #34d399;
          --ac-accent-orange: #fbbf24;
          --ac-accent-teal: #2dd4bf;
          --ac-sidebar-active-bg: rgba(255, 255, 255, 0.08);
        }
        html.light .pw-main,
        :root:not(.dark) .pw-main {
          --ac-cpu-white: #ffffff;
          --ac-page-bg: #f8fafc;
          --ac-card-bg: #ffffff;
          --ac-card-bg-fallback: #ffffff;
          --ac-text-primary: #0f172a;
          --ac-text-secondary: #475569;
          --ac-text-muted: #64748b;
          --ac-border: #e2e8f0;
          --ac-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 4px 12px -2px rgba(0, 0, 0, 0.04);
          --ac-shadow-strong: 0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 10px 20px -5px rgba(0, 0, 0, 0.08);
          --ac-chart-grid: #e2e8f0;
          --ac-chart-axis: #64748b;
          --ac-chart-ref-line: #94a3b8;
          --ac-accent-blue: #2563eb;
          --ac-accent-green: #059669;
          --ac-accent-orange: #d97706;
          --ac-accent-teal: #0d9488;
          --ac-sidebar-active-bg: rgba(0, 0, 0, 0.04);
        }
        html.light .pw-main select,
        :root:not(.dark) .pw-main select {
          color-scheme: light;
          background-color: #ffffff;
          color: #0f172a;
          border: 1.5px solid #cbd5e1;
          border-radius: 10px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        }
        html.light .pw-main select option,
        :root:not(.dark) .pw-main select option {
          background-color: #ffffff;
          color: #0f172a;
        }
        html.light .pw-main .ac-input,
        :root:not(.dark) .pw-main .ac-input {
          background-color: #ffffff;
          border: 1.5px solid #cbd5e1;
          border-radius: 10px;
          color: #0f172a;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        }
        html.light .pw-main .ac-glass-card,
        :root:not(.dark) .pw-main .ac-glass-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 4px 16px -2px rgba(15, 23, 42, 0.06);
        }
        html.light .pw-main .ac-glass-btn-secondary,
        :root:not(.dark) .pw-main .ac-glass-btn-secondary {
          background: #f1f5f9;
          border: 1.5px solid #cbd5e1;
          color: #0f172a;
        }
        html.light .pw-main .ac-glass-btn-secondary:hover,
        :root:not(.dark) .pw-main .ac-glass-btn-secondary:hover {
          background: #e2e8f0;
          box-shadow: var(--ac-shadow);
        }
        html.dark .pw-main select {
          color-scheme: dark;
          background-color: var(--pw-s3, #16213a);
          color: var(--pw-t1, #f8fafc);
          border: 1px solid var(--pw-border, rgba(255,255,255,0.12));
        }
        html.dark .pw-main select option {
          background-color: #1e293b;
          color: #f1f5f9;
        }
        html.dark .pw-main .ac-glass-btn {
          background: rgba(52, 211, 153, 0.15);
          border-color: rgba(255, 255, 255, 0.25);
          box-shadow: 0 2px 16px rgba(52, 211, 153, 0.2);
        }
        html.dark .pw-main .ac-glass-btn:hover {
          background: rgba(52, 211, 153, 0.25);
          box-shadow: 0 4px 28px rgba(52, 211, 153, 0.4);
        }
        .pw-layout * {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        .pw-layout *::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
        .pw-layout *::-webkit-scrollbar-track,
        .pw-layout *::-webkit-scrollbar-thumb { display: none !important; }
        @media (max-width: 768px) {
          .pw-main {
            margin-left: 0;
            width: 100%;
            -webkit-overflow-scrolling: touch;
            overscroll-behavior-y: contain;
          }
        }
        html.dark .pw-main table,
        html.dark .pw-main th,
        html.dark .pw-main td { color: #f8fafc; }
        html.light .pw-main table,
        html.light .pw-main th,
        html.light .pw-main td,
        :root:not(.dark) .pw-main table,
        :root:not(.dark) .pw-main th,
        :root:not(.dark) .pw-main td { color: #0d1c2e; }
      `}</style>

      <div className="pw-layout" data-theme={theme === 'light' ? 'light' : 'dark'}>
        {/* Floating Theme Switcher Pill */}
        <div style={{ position: 'fixed', top: 14, right: 24, zIndex: 110, display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={handleToggleTheme}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 99,
              background: theme === 'light' ? '#ffffff' : '#0e1626',
              border: `1px solid ${theme === 'light' ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)'}`,
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              color: theme === 'light' ? '#0f172a' : '#f8fafc',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
            }}
          >
            {theme === 'light' ? (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-500" />
                <span>Switch to Dark Mode</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Switch to White Mode</span>
              </>
            )}
          </button>
        </div>

        <button
          type="button"
          className="pw-hamburger"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {sidebarOpen && <div className="pw-sidebar-overlay" onClick={closeSidebar} />}

        <aside className={`pw-sidebar ${sidebarOpen ? 'pw-sidebar--open' : ''}`}>
          <div className="pw-brand">
            <div className="pw-brand-logo">
              <GraduationCap className="w-5 h-5 text-emerald-400" strokeWidth={2} />
            </div>
            <span className="pw-brand-name">RCSN</span>
            <span className="pw-brand-pill">{dosPillLabel}</span>
          </div>

          {/* ── Main ────────────────────────────────────────────────────────── */}
          <div className="pw-nav-section">
            <span className="pw-nav-label">Main</span>
            <NavItem to={DOS_BASE} icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" end onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to={`${DOS_BASE}/messages`} icon={<MessageSquare className="w-4 h-4" />} label="Messages" badge={chatUnreadBadge} badgeColor="rose" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to={`${DOS_BASE}/profile`} icon={<UserCheck className="w-4 h-4" />} label="My profile" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
          </div>

          {/* ── Students ────────────────────────────────────────────────────── */}
          <div className="pw-nav-section">
            <span className="pw-nav-label">Students</span>
            <NavGroup
              icon={<GraduationCap className="w-4 h-4" />}
              label={navTerms.studentsLabel}
              isOpen={studentsMenuOpen}
              onToggle={() => setStudentsMenuOpen(!studentsMenuOpen)}
              matchPaths={[`${DOS_BASE}/students`]}
              badge={studentCount ?? undefined}
              badgeColor="teal"
            >
              <SubItemStudentsFilter discipline="all" label={`All ${navTerms.studentsLabel}`} onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItemStudentsFilter discipline="active" label="Active" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItemStudentsFilter discipline="warned" label="Warned" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItemStudentsFilter discipline="suspended" label="Suspended" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItemStudentsFilter discipline="deactivated" label="Deactivated" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            </NavGroup>
            <NavItem to={`${DOS_BASE}/teachers`} icon={<BookOpen className="w-4 h-4" />} label={navTerms.teachersLabel} onClick={closeSidebar} onPrefetch={onPrefetchNav} />
          </div>

          {/* ── Academic ────────────────────────────────────────────────────── */}
          <div className="pw-nav-section">
            <span className="pw-nav-label">Academic</span>
            <NavItem to={`${DOS_BASE}/calendar`} icon={<CalendarDays className="w-4 h-4 text-emerald-400" />} label="Academic Calendar & Exams" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to={`${DOS_BASE}/settings/timetable`} icon={<Calendar className="w-4 h-4" />} label={navTerms.timetableLabel} onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            {isTertiary && (
              <NavItem to="/dashboard/admin/ward-postings" icon={<Stethoscope className="w-4 h-4" />} label="Ward Postings & Clinical" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            )}
            <NavItem to={`${DOS_BASE}/exam-sets`} icon={<FileEdit className="w-4 h-4" />} label={navTerms.examSetsLabel} onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to={`${DOS_BASE}/exam-set-results`} icon={<Trophy className="w-4 h-4" />} label={navTerms.examResultsLabel} onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to={`${DOS_BASE}/attendance`} icon={<ClipboardCheck className="w-4 h-4" />} label={navTerms.attendanceLabel} onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to={`${DOS_BASE}/attendance/teachers`} icon={<ClipboardList className="w-4 h-4" />} label={isTertiary ? 'Tutor Sign-In' : 'Teacher Sign-In'} onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to={`${DOS_BASE}/headteacher-comments-settings`} icon={<MessageSquare className="w-4 h-4" />} label={isTertiary ? 'Grading Regulations' : 'Grade Comments'} onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavGroup
              icon={<BarChart3 className="w-4 h-4" />}
              label={navTerms.reportsLabel}
              isOpen={reportsOpen}
              onToggle={() => setReportsOpen(!reportsOpen)}
              matchPaths={[`${DOS_BASE}/reports`, `${DOS_BASE}/report-records`, '/dashboard/admin/reports/generate-tertiary']}
            >
              <SubItem to={isTertiary ? '/dashboard/admin/reports/generate-tertiary' : `${DOS_BASE}/reports/generate`} label={navTerms.generateReportsLabel} onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItem to={`${DOS_BASE}/report-records`} label="Report Records" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            </NavGroup>
          </div>

          {/* ── System ──────────────────────────────────────────────────────── */}
          <div className="pw-nav-section">
            <span className="pw-nav-label">System</span>
            <NavItem to={`${DOS_BASE}/notifications`} icon={<Bell className="w-4 h-4" />} label="Notifications" badge={notifCount ?? undefined} badgeColor="amber" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to={`${DOS_BASE}/settings`} icon={<Settings className="w-4 h-4" />} label="Settings" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
          </div>

          <div className="pw-sidebar-bottom">
            <Link
              to={`${DOS_BASE}/profile`}
              className="pw-admin-card"
              onClick={closeSidebar}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="pw-admin-av">{adminUser.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="pw-admin-name">{adminUser.name}</div>
                <div className="pw-admin-role">{dosRoleLabel} · Profile</div>
              </div>
              <span style={{ color: 'var(--pw-t3)', fontSize: '13px', flexShrink: 0 }}>⋯</span>
            </Link>
            <button
              type="button"
              className="pw-logout-btn"
              onClick={handleToggleTheme}
              style={{ marginBottom: 6 }}
            >
              <span className="pw-nav-ic">
                {theme === 'light' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
              </span>
              {theme === 'light' ? 'Switch to Dark' : 'Switch to White'}
            </button>
            <button type="button" className="pw-logout-btn" onClick={handleLogout}>
              <span className="pw-nav-ic"><LogOut className="w-4 h-4" /></span>
              Logout
            </button>
          </div>
        </aside>

        <main className="pw-main">
          <Suspense fallback={isDesktopApp ? null : <AdminContentSkeleton />}>
            <Outlet />
          </Suspense>
        </main>

        <DosMobileBottomNav notifCount={notifCount} onPrefetch={onPrefetchNav} />
      </div>
    </>
  );
}
