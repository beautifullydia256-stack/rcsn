import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  LayoutDashboard,
  MessageSquare,
  Bell,
  GraduationCap,
  ClipboardCheck,
  KeyRound,
  UserCheck,
  Wallet,
  FileText,
  Trophy,
  BarChart3,
  ArrowLeft,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  ShieldCheck,
  Armchair,
  CalendarDays,
} from 'lucide-react';
import AdminContentSkeleton from './AdminContentSkeleton';
import SecretaryMobileBottomNav from './SecretaryMobileBottomNav';
import { supabase } from '../../lib/supabase';
import { logoutWithSyncCheck } from '../../lib/logoutWithSyncCheck';
import { useSchoolChatUnreadTotal } from '../../hooks/useSchoolChatUnreadTotal';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { isDesktopApp } from '../../lib/isDesktopApp';
import { hasRole, ROLE_GROUPS, normalizeRole, logRbacDecision } from '../../lib/rbac';
import { useSchoolType } from '../../hooks/useSchoolType';

const SEC = '/dashboard/secretary';

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
}

function NavItem({ to, icon, label, badge, badgeColor = 'rose', onClick, end = false }: NavItemProps) {
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

function SubItem({ to, label, onClick, end = false }: { to: string; label: string; onClick?: () => void; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) => ['pw-nav-subitem', isActive ? 'pw-nav-subitem--active' : ''].filter(Boolean).join(' ')}
    >
      <span className="pw-nav-sub-dot">·</span>
      {label}
    </NavLink>
  );
}

export default function SecretaryLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const authUserId = useAuthStore((s) => s.user?.id);
  const role = useAuthStore((s) => s.role);
  const showBackToAdmin = role === 'admin';
  const chatUnread = useSchoolChatUnreadTotal(authUserId ?? undefined);
  const chatBadge = chatUnread > 0 ? (chatUnread > 99 ? '99+' : chatUnread) : undefined;
  const themeRef = useRef<'light' | 'dark' | null>(null);
  const isOnChat = location.pathname.startsWith(`${SEC}/messages`);
  const { isTertiary } = useSchoolType();
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const isDark = theme === 'dark';

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [studentsOpen, setStudentsOpen] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [notifCount, setNotifCount] = useState<number | null>(null);
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser>({ name: 'Secretary', email: '', initials: 'S' });


  // Sync with global theme from uiStore and theme-provider


  useEffect(() => {
    if (location.pathname.startsWith(`${SEC}/students`)) setStudentsOpen(true);
    if (location.pathname.startsWith(`${SEC}/finance`)) setFinanceOpen(true);
    if (location.pathname.startsWith(`${SEC}/admission-form`) || location.pathname.startsWith(`${SEC}/headed-paper`)) setDocsOpen(true);
    if (location.pathname.startsWith(`${SEC}/reports`) || location.pathname.startsWith(`${SEC}/report-records`)) setReportsOpen(true);
  }, [location.pathname]);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: ud } = await supabase.from('users').select('name, email, school_id').eq('user_id', user.id).single();
        if (!ud) return;
        const name = (ud as { name?: string }).name || user.email || 'Secretary';
        const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
        setAdminUser({ name, email: (ud as { email?: string }).email || user.email || '', initials });
        const schoolId = (ud as { school_id?: string }).school_id;
        if (!schoolId) return;
        const [sc, nc] = await Promise.all([
          supabase.from('students').select('student_id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'active'),
          supabase.from('notifications').select('notification_id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('is_read', false),
        ]);
        setStudentCount(sc.count ?? null);
        setNotifCount(nc.count ?? null);
      } catch { /* non-fatal */ }
    }
    void load();
  }, []);

  function handleLogout() {
    void logoutWithSyncCheck(() => navigate('/'));
  }

  const close = () => setSidebarOpen(false);

  const allowed = hasRole(role, ROLE_GROUPS.SECRETARY_DASHBOARD);
  logRbacDecision('SecretaryLayout', location.pathname, role, normalizeRole(role), ROLE_GROUPS.SECRETARY_DASHBOARD, allowed);
  if (role && !allowed) return <Navigate to="/dashboard" replace />;

  return (
    <>
      <style>{`
        html.dark .pw-layout,html[data-theme="dark"] .pw-layout,body.dark .pw-layout{--pw-bg:#05080f;--pw-s1:#0b1120;--pw-s2:#101828;--pw-s3:#141c2e;--pw-s4:#1d2d4e;--pw-t1:#f8fafc;--pw-t2:#c5d4ef;--pw-t3:#94a8d0;--pw-border:rgba(255,255,255,0.07);--pw-bh:rgba(255,255,255,0.12)}
        html.light .pw-layout,html[data-theme="light"] .pw-layout,body.light .pw-layout,:root:not(.dark) .pw-layout{--pw-bg:#f0f4f8;--pw-s1:#ffffff;--pw-s2:#f5f7fa;--pw-s3:#e8edf5;--pw-s4:#d0dbe8;--pw-t1:#0d1c2e;--pw-t2:#4a6080;--pw-t3:#8aa0b8;--pw-border:rgba(0,0,0,0.08);--pw-bh:rgba(0,0,0,0.14)}
        .pw-layout{display:flex;min-height:100vh;height:100vh;max-height:100vh;overflow:hidden;background:var(--pw-bg,#05080f);font-family:'Instrument Sans','Cabinet Grotesk',system-ui,sans-serif}
        .pw-sidebar{width:232px;min-height:100vh;background:var(--pw-s1,#0b1120);border-right:1px solid var(--pw-border,rgba(255,255,255,0.07));display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:200;overflow-y:auto;overflow-x:hidden;scrollbar-width:none;-ms-overflow-style:none;transition:transform 0.28s cubic-bezier(.4,0,.2,1)}
        .pw-sidebar::-webkit-scrollbar{display:none}
        @media(max-width:768px){.pw-sidebar{transform:translateX(-100%);padding-bottom:calc(64px + env(safe-area-inset-bottom,0px) + 20px)}.pw-sidebar.pw-sidebar--open{transform:translateX(0)}.pw-sidebar-bottom{margin-top:0}}
        .pw-brand{display:flex;align-items:center;gap:10px;padding:20px 16px 18px;border-bottom:1px solid var(--pw-border,rgba(255,255,255,0.07));flex-shrink:0}
        .pw-brand-logo{width:33px;height:33px;background:linear-gradient(135deg,#10d9a8,#0ea5e9);border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;box-shadow:0 4px 14px rgba(16,217,168,0.22)}
        .pw-brand-name{font-family:'Cabinet Grotesk',sans-serif;font-weight:800;font-size:16.5px;letter-spacing:-0.2px;color:var(--pw-t1,#eef3ff)}
        .pw-brand-pill{margin-left:auto;font-size:9px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#10d9a8;background:rgba(16,217,168,0.10);border:1px solid rgba(16,217,168,0.2);border-radius:4px;padding:2px 6px;flex-shrink:0}
        .pw-nav-section{padding:16px 10px 4px}
        .pw-nav-label{font-size:9.5px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--pw-t3,#3d5278);padding:0 6px;margin-bottom:5px;display:block}
        .pw-nav-link{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:8px;cursor:pointer;transition:all 0.15s;color:var(--pw-t2,#8296be);font-size:13px;font-weight:500;white-space:nowrap;text-decoration:none;width:100%;border:1px solid transparent;background:transparent;font-family:inherit}
        .pw-nav-link:hover{background:var(--pw-s2,#101828);color:var(--pw-t1,#eef3ff)}
        .pw-nav-link--active{background:rgba(16,217,168,0.10)!important;color:#10d9a8!important;border-color:rgba(16,217,168,0.15)!important}
        .pw-nav-ic{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;width:18px;height:18px;color:currentColor}
        .pw-nav-ic svg{width:16px;height:16px}
        .pw-nav-text{flex:1;text-align:left}
        .pw-nav-badge{margin-left:auto;font-size:10px;font-weight:700;border-radius:99px;padding:1px 6px;flex-shrink:0}
        .pw-nav-badge--rose{background:#f75c5c;color:#fff}
        .pw-nav-badge--teal{background:#10d9a8;color:#05080f}
        .pw-nav-badge--amber{background:#f5a623;color:#05080f}
        .pw-nav-chevron{margin-left:auto;font-size:14px;color:var(--pw-t3,#3d5278);transition:transform 0.2s;display:inline-block;line-height:1}
        .pw-nav-chevron--open{transform:rotate(90deg)}
        .pw-nav-group-btn{cursor:pointer;text-align:left}
        .pw-nav-subitems{padding:2px 0 4px 14px}
        .pw-nav-subitem{display:flex;align-items:center;gap:7px;padding:6px 10px;border-radius:8px;cursor:pointer;transition:all 0.14s;color:var(--pw-t2,#8296be);font-size:12.5px;font-weight:500;text-decoration:none;width:100%;border:1px solid transparent;background:transparent;font-family:inherit}
        .pw-nav-subitem:hover{background:var(--pw-s2,#101828);color:var(--pw-t1,#eef3ff)}
        .pw-nav-subitem--active{color:#10d9a8!important;background:rgba(16,217,168,0.08)!important}
        .pw-nav-sub-dot{color:var(--pw-t3,#3d5278);flex-shrink:0;font-size:16px;line-height:1}
        .pw-sidebar-bottom{margin-top:auto;padding:12px;border-top:1px solid var(--pw-border,rgba(255,255,255,0.07));flex-shrink:0}
        .pw-admin-card{display:flex;align-items:center;gap:9px;padding:9px 10px;border-radius:8px;background:var(--pw-s2,#101828);border:1px solid var(--pw-border,rgba(255,255,255,0.07));cursor:pointer;transition:border-color 0.2s}
        .pw-admin-card:hover{border-color:var(--pw-bh,rgba(255,255,255,0.12))}
        .pw-admin-av{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#10d9a8,#3d8ef8);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#05080f;flex-shrink:0}
        .pw-admin-name{font-size:12px;font-weight:600;color:var(--pw-t1,#eef3ff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .pw-admin-role{font-size:10.5px;color:var(--pw-t3,#3d5278)}
        .pw-logout-btn{display:flex;align-items:center;gap:9px;padding:7px 10px;border-radius:8px;cursor:pointer;transition:all 0.14s;color:#f75c5c;font-size:13px;font-weight:500;background:transparent;border:none;width:100%;font-family:inherit;margin-top:6px}
        .pw-logout-btn:hover{background:rgba(247,92,92,0.10)}
        .pw-sidebar-overlay{display:none}
        @media(max-width:768px){.pw-sidebar-overlay{display:block;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:199;backdrop-filter:blur(2px)}}
        .pw-hamburger{display:none;position:fixed;top:calc(env(safe-area-inset-top,0px) + 6px);right:calc(10px + env(safe-area-inset-right,0px));z-index:300;width:36px;height:36px;border-radius:8px;background:var(--pw-s2,#101828);border:1px solid var(--pw-border,rgba(255,255,255,0.07));align-items:center;justify-content:center;cursor:pointer;font-size:16px;color:var(--pw-t1,#eef3ff);transition:border-color 0.14s}
        @media(max-width:768px){.pw-hamburger{display:flex}}
        .pw-main{margin-left:232px;flex:1;min-height:0;width:calc(100% - 232px);overflow-x:hidden;overflow-y:auto;background:var(--pw-bg,#05080f);color:var(--pw-t1,#eef3ff)}
        html.dark .pw-main{--ac-page-bg:transparent;--ac-card-bg:rgba(255,255,255,0.06);--ac-text-primary:#f8fafc;--ac-text-secondary:rgba(248,250,252,0.9);--ac-text-muted:rgba(226,232,240,0.75);--ac-border:rgba(255,255,255,0.12);--ac-shadow:0 8px 32px 0 rgba(0,0,0,0.35);--ac-accent-blue:#60a5fa;--ac-accent-green:#34d399;--ac-accent-orange:#fbbf24;--ac-accent-teal:#2dd4bf}
        html.light .pw-main,:root:not(.dark) .pw-main{--ac-cpu-white:#ffffff;--ac-page-bg:#f8fafc;--ac-card-bg:#ffffff;--ac-card-bg-fallback:#ffffff;--ac-text-primary:#0f172a;--ac-text-secondary:#475569;--ac-text-muted:#64748b;--ac-border:#e2e8f0;--ac-shadow:0 1px 3px 0 rgba(0,0,0,0.05),0 4px 12px -2px rgba(0,0,0,0.04);--ac-shadow-strong:0 4px 6px -1px rgba(0,0,0,0.06),0 10px 20px -5px rgba(0,0,0,0.08);--ac-chart-grid:#e2e8f0;--ac-chart-axis:#64748b;--ac-chart-ref-line:#94a3b8;--ac-accent-blue:#2563eb;--ac-accent-green:#059669;--ac-accent-orange:#d97706;--ac-accent-teal:#0d9488;--ac-sidebar-active-bg:rgba(0,0,0,0.04)}
        html.light .pw-main select,:root:not(.dark) .pw-main select{color-scheme:light;background-color:#ffffff;color:#0f172a;border:1.5px solid #cbd5e1;border-radius:10px;box-shadow:0 1px 2px rgba(0,0,0,0.04)}
        html.light .pw-main select option,:root:not(.dark) .pw-main select option{background-color:#ffffff;color:#0f172a}
        html.light .pw-main .ac-input,:root:not(.dark) .pw-main .ac-input{background-color:#ffffff;border:1.5px solid #cbd5e1;border-radius:10px;color:#0f172a;box-shadow:0 1px 2px rgba(0,0,0,0.04)}
        html.light .pw-main .ac-glass-card,:root:not(.dark) .pw-main .ac-glass-card{background:#ffffff;border:1px solid #e2e8f0;box-shadow:0 1px 3px 0 rgba(0,0,0,0.05),0 4px 16px -2px rgba(15,23,42,0.06)}
        html.light .pw-main .ac-glass-btn-secondary,:root:not(.dark) .pw-main .ac-glass-btn-secondary{background:#f1f5f9;border:1.5px solid #cbd5e1;color:#0f172a}
        html.dark .pw-main table,html.dark .pw-main th,html.dark .pw-main td{color:#f8fafc}
        html.light .pw-main table,html.light .pw-main th,html.light .pw-main td,:root:not(.dark) .pw-main table,:root:not(.dark) .pw-main th,:root:not(.dark) .pw-main td{color:#0d1c2e}
        .pw-layout *{scrollbar-width:none!important;-ms-overflow-style:none!important}
        .pw-layout *::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}
        @media(max-width:768px){.pw-main{margin-left:0;width:100%;padding-top:0;-webkit-overflow-scrolling:touch;overscroll-behavior-y:contain}.pw-main{padding-bottom:calc(64px + env(safe-area-inset-bottom,0px) + 16px)}.pw-main--no-botnav{padding-bottom:0!important}}
      `}</style>

      <div className="pw-layout" style={isOnChat ? { height: '100dvh', maxHeight: '100dvh', overflow: 'hidden' } : undefined}>
        <button type="button" className="pw-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar">
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {sidebarOpen && <div className="pw-sidebar-overlay" onClick={close} />}

        <aside className={`pw-sidebar ${sidebarOpen ? 'pw-sidebar--open' : ''}`}>
          <div className="pw-brand">
            <div className="pw-brand-logo">
              <Building2 className="w-5 h-5 text-emerald-400" strokeWidth={2} />
            </div>
            <span className="pw-brand-name">PwezaCore</span>
            <span className="pw-brand-pill">{isTertiary ? "Registry" : "Secretary"}</span>
          </div>

          <div className="pw-nav-section">
            <span className="pw-nav-label">Main</span>
            <NavItem to={SEC} icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" end onClick={close} />
            <NavItem to={`${SEC}/messages`} icon={<MessageSquare className="w-4 h-4" />} label="Messages" badge={chatBadge} badgeColor="rose" onClick={close} />
            <NavItem to={`${SEC}/notifications`} icon={<Bell className="w-4 h-4" />} label="Notifications" badge={notifCount ?? undefined} badgeColor="amber" onClick={close} />
          </div>

          <div className="pw-nav-section">
            <span className="pw-nav-label">{isTertiary ? "Trainees" : "Students"}</span>
            <NavGroup icon={<GraduationCap className="w-4 h-4" />} label={isTertiary ? "Trainees" : "Students"} isOpen={studentsOpen} onToggle={() => setStudentsOpen(!studentsOpen)} matchPaths={[`${SEC}/students`]} badge={studentCount ?? undefined} badgeColor="teal">
              <SubItem to={`${SEC}/students`} label={isTertiary ? "All Trainees" : "All Students"} end onClick={close} />
              <SubItem to={`${SEC}/students/add`} label={isTertiary ? "Admit Trainee" : "Add / Admit Student"} onClick={close} />
            </NavGroup>
            <NavItem to={`${SEC}/attendance`} icon={<ClipboardCheck className="w-4 h-4" />} label="Attendance" onClick={close} />
            <NavItem to={`${SEC}/attendance-code`} icon={<KeyRound className="w-4 h-4" />} label="Attendance Code" onClick={close} />
          </div>

          <div className="pw-nav-section">
            <span className="pw-nav-label">Office & Exits</span>
            <NavItem to={`${SEC}/calendar`} icon={<CalendarDays className="w-4 h-4 text-teal-400" />} label="School Calendar & Events" onClick={close} />
            <NavItem to={`${SEC}/visitors`} icon={<UserCheck className="w-4 h-4" />} label="Visitor Logbook" onClick={close} />
            <NavItem to={`${SEC}/gate-passes`} icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />} label="Gate Passes & Exits" onClick={close} />
            <NavItem to={`${SEC}/staff`} icon={<Building2 className="w-4 h-4" />} label="Staff Directory" onClick={close} />
            <NavItem to={`${SEC}/property-assets`} icon={<Armchair className="w-4 h-4 text-amber-400" />} label="Furniture & Property" onClick={close} />
          </div>

          <div className="pw-nav-section">
            <span className="pw-nav-label">Finance (View)</span>
            <NavGroup icon={<Wallet className="w-4 h-4" />} label="Finance" isOpen={financeOpen} onToggle={() => setFinanceOpen(!financeOpen)} matchPaths={[`${SEC}/finance`]}>
              <SubItem to={`${SEC}/finance/outstanding`} label="Outstanding Balances" onClick={close} />
              <SubItem to={`${SEC}/finance/fee-records`} label="Fee Records" onClick={close} />
            </NavGroup>
          </div>

          <div className="pw-nav-section">
            <span className="pw-nav-label">Documents</span>
            <NavGroup icon={<FileText className="w-4 h-4" />} label="Documents" isOpen={docsOpen} onToggle={() => setDocsOpen(!docsOpen)} matchPaths={[`${SEC}/admission-form`, `${SEC}/headed-paper`]}>
              <SubItem to={`${SEC}/admission-form`} label="Admission Form" onClick={close} />
              <SubItem to={`${SEC}/headed-paper`} label="Headed Paper" onClick={close} />
            </NavGroup>
            <NavItem to={`${SEC}/exam-set-results`} icon={<Trophy className="w-4 h-4" />} label={isTertiary ? "Semester & UHPAB Results" : "Exam Results"} onClick={close} />
            <NavGroup icon={<BarChart3 className="w-4 h-4" />} label="Reports" isOpen={reportsOpen} onToggle={() => setReportsOpen(!reportsOpen)} matchPaths={[`${SEC}/reports`, `${SEC}/report-records`]}>
              <SubItem to={`${SEC}/reports`} label="Reports Hub" end onClick={close} />
              <SubItem to={`${SEC}/reports/generate`} label={isTertiary ? "Generate Result Slips" : "Generate Report Cards"} onClick={close} />
              <SubItem to={`${SEC}/report-records`} label="Report Records" onClick={close} />
              <SubItem to={`${SEC}/reports/bulk`} label="Bulk Generate" onClick={close} />
            </NavGroup>
          </div>

          <div className="pw-sidebar-bottom">
            <Link to={`${SEC}`} className="pw-admin-card" onClick={close} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="pw-admin-av">{adminUser.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="pw-admin-name">{adminUser.name}</div>
                <div className="pw-admin-role">{isTertiary ? "Admissions & Registry Officer" : "Secretary"}</div>
              </div>
            </Link>
            {showBackToAdmin && (
              <button
                type="button"
                onClick={() => navigate('/dashboard/admin')}
                className="pw-nav-link"
                style={{ marginTop: 6, color: '#10d9a8', fontSize: 12 }}
              >
                <span className="pw-nav-ic"><ArrowLeft className="w-4 h-4" /></span>
                Back to Admin dashboard
              </button>
            )}
            <button
              type="button"
              onClick={toggleTheme}
              className="pw-nav-link"
              style={{
                marginTop: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                cursor: 'pointer',
                background: 'transparent',
                border: 'none',
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
              }}
            >
              <span className="pw-nav-ic">{isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-500" />}</span>
              <span>{isDark ? 'Light / White Mode' : 'Deep Dark Mode'}</span>
            </button>
            <button type="button" className="pw-logout-btn" onClick={handleLogout}>
              <span className="pw-nav-ic"><LogOut className="w-4 h-4" /></span>
              Logout
            </button>
          </div>
        </aside>

        <main
          className={`pw-main${isOnChat ? ' pw-main--no-botnav' : ''}`}
          style={isOnChat ? { overflow: 'hidden', padding: 0, display: 'flex', flexDirection: 'column' } : undefined}
        >
          <Suspense fallback={isDesktopApp ? null : <AdminContentSkeleton />}>
            <Outlet />
          </Suspense>
        </main>

        {!isOnChat && <SecretaryMobileBottomNav notifCount={notifCount} />}
      </div>
    </>
  );
}
