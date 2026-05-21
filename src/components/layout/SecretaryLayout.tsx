import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import AdminContentSkeleton from './AdminContentSkeleton';
import SecretaryMobileBottomNav from './SecretaryMobileBottomNav';
import { supabase } from '../../lib/supabase';
import { markChatPresenceOffline } from '../../lib/schoolChatApi';
import { useSchoolChatUnreadTotal } from '../../hooks/useSchoolChatUnreadTotal';
import { useAuthStore } from '../../store/authStore';
import { isDesktopApp } from '../../lib/isDesktopApp';
import { hasRole, ROLE_GROUPS, normalizeRole, logRbacDecision } from '../../lib/rbac';

const SEC = '/dashboard/secretary';

interface AdminUser {
  name: string;
  email: string;
  initials: string;
}

interface NavItemProps {
  to: string;
  icon: string;
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
  icon: string;
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

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [studentsOpen, setStudentsOpen] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [notifCount, setNotifCount] = useState<number | null>(null);
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser>({ name: 'Secretary', email: '', initials: 'S' });

  useEffect(() => {
    const root = document.documentElement;
    themeRef.current = root.classList.contains('dark') ? 'dark' : 'light';
    root.classList.remove('light');
    root.classList.add('dark');
    localStorage.setItem('pwezacore-theme', 'dark');
    return () => {
      const prev = themeRef.current;
      root.classList.remove('dark', 'light');
      if (prev === 'light') { root.classList.add('light'); localStorage.setItem('pwezacore-theme', 'light'); }
      else { root.classList.add('dark'); localStorage.setItem('pwezacore-theme', 'dark'); }
    };
  }, []);

  useEffect(() => {
    if (location.pathname.startsWith(`${SEC}/students`)) setStudentsOpen(true);
    if (location.pathname.startsWith(`${SEC}/finance`)) setFinanceOpen(true);
    if (location.pathname.startsWith(`${SEC}/admission-form`) || location.pathname.startsWith(`${SEC}/headed-paper`)) setDocsOpen(true);
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

  async function handleLogout() {
    await markChatPresenceOffline();
    await supabase.auth.signOut();
    navigate('/');
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
        .pw-nav-link--group-active{color:#10d9a8}
        .pw-nav-ic{font-size:15px;flex-shrink:0;width:18px;text-align:center}
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
        html.dark .pw-main table,html.dark .pw-main th,html.dark .pw-main td{color:#f8fafc}
        html.light .pw-main table,html.light .pw-main th,html.light .pw-main td,:root:not(.dark) .pw-main table,:root:not(.dark) .pw-main th,:root:not(.dark) .pw-main td{color:#0d1c2e}
        .pw-layout *{scrollbar-width:none!important;-ms-overflow-style:none!important}
        .pw-layout *::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}
        @media(max-width:768px){.pw-main{margin-left:0;width:100%;padding-top:0;-webkit-overflow-scrolling:touch;overscroll-behavior-y:contain}.pw-main{padding-bottom:calc(64px + env(safe-area-inset-bottom,0px) + 16px)}}
      `}</style>

      <div className="pw-layout">
        <button type="button" className="pw-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar">
          {sidebarOpen ? '✕' : '☰'}
        </button>

        {sidebarOpen && <div className="pw-sidebar-overlay" onClick={close} />}

        <aside className={`pw-sidebar ${sidebarOpen ? 'pw-sidebar--open' : ''}`}>
          <div className="pw-brand">
            <div className="pw-brand-logo">🗂️</div>
            <span className="pw-brand-name">PwezaCore</span>
            <span className="pw-brand-pill">Secretary</span>
          </div>

          <div className="pw-nav-section">
            <span className="pw-nav-label">Main</span>
            <NavItem to={SEC} icon="⊞" label="Dashboard" end onClick={close} />
            <NavItem to={`${SEC}/messages`} icon="💬" label="Messages" badge={chatBadge} badgeColor="rose" onClick={close} />
            <NavItem to={`${SEC}/notifications`} icon="🔔" label="Notifications" badge={notifCount ?? undefined} badgeColor="amber" onClick={close} />
          </div>

          <div className="pw-nav-section">
            <span className="pw-nav-label">Students</span>
            <NavGroup icon="👨‍🎓" label="Students" isOpen={studentsOpen} onToggle={() => setStudentsOpen(!studentsOpen)} matchPaths={[`${SEC}/students`]} badge={studentCount ?? undefined} badgeColor="teal">
              <SubItem to={`${SEC}/students`} label="All Students" end onClick={close} />
              <SubItem to={`${SEC}/students/add`} label="Add / Admit Student" onClick={close} />
            </NavGroup>
            <NavItem to={`${SEC}/attendance`} icon="📋" label="Attendance" onClick={close} />
          </div>

          <div className="pw-nav-section">
            <span className="pw-nav-label">Office</span>
            <NavItem to={`${SEC}/visitors`} icon="🚪" label="Visitor Logbook" onClick={close} />
            <NavItem to={`${SEC}/staff`} icon="🏢" label="Staff Directory" onClick={close} />
          </div>

          <div className="pw-nav-section">
            <span className="pw-nav-label">Finance (View)</span>
            <NavGroup icon="💰" label="Finance" isOpen={financeOpen} onToggle={() => setFinanceOpen(!financeOpen)} matchPaths={[`${SEC}/finance`]}>
              <SubItem to={`${SEC}/finance/outstanding`} label="Outstanding Balances" onClick={close} />
              <SubItem to={`${SEC}/finance/fee-records`} label="Fee Records" onClick={close} />
            </NavGroup>
          </div>

          <div className="pw-nav-section">
            <span className="pw-nav-label">Documents</span>
            <NavGroup icon="📄" label="Documents" isOpen={docsOpen} onToggle={() => setDocsOpen(!docsOpen)} matchPaths={[`${SEC}/admission-form`, `${SEC}/headed-paper`]}>
              <SubItem to={`${SEC}/admission-form`} label="Admission Form" onClick={close} />
              <SubItem to={`${SEC}/headed-paper`} label="Headed Paper" onClick={close} />
            </NavGroup>
            <NavItem to={`${SEC}/reports`} icon="📊" label="Reports" onClick={close} />
          </div>

          <div className="pw-sidebar-bottom">
            <Link to={`${SEC}`} className="pw-admin-card" onClick={close} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="pw-admin-av">{adminUser.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="pw-admin-name">{adminUser.name}</div>
                <div className="pw-admin-role">Secretary</div>
              </div>
            </Link>
            {showBackToAdmin && (
              <button
                type="button"
                onClick={() => navigate('/dashboard/admin')}
                className="pw-nav-link"
                style={{ marginTop: 6, color: '#10d9a8', fontSize: 12 }}
              >
                <span className="pw-nav-ic">←</span>
                Back to Admin dashboard
              </button>
            )}
            <button type="button" className="pw-logout-btn" onClick={handleLogout}>
              <span className="pw-nav-ic">🚪</span>
              Logout
            </button>
          </div>
        </aside>

        <main className="pw-main">
          <Suspense fallback={isDesktopApp ? null : <AdminContentSkeleton />}>
            <Outlet />
          </Suspense>
        </main>

        <SecretaryMobileBottomNav notifCount={notifCount} />
      </div>
    </>
  );
}
