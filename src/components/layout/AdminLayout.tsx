import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import AdminContentSkeleton from './AdminContentSkeleton';
import AdminMobileBottomNav from './AdminMobileBottomNav';
import { supabase } from '../../lib/supabase';
import { usePwezaStore } from '../../store/pwezaStore';

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
  icon: string;
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
  matchPaths?: string[];
}

function NavGroup({ icon, label, isOpen, onToggle, children, matchPaths = [] }: NavGroupProps) {
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
      className={({ isActive }) => ['pw-nav-subitem', isActive ? 'pw-nav-subitem--active' : ''].join(' ')}
    >
      <span className="pw-nav-sub-dot">·</span>
      {label}
    </NavLink>
  );
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const themeBeforeAdminRef = useRef<'light' | 'dark' | null>(null);
  const prefetchAll = usePwezaStore((s) => s.prefetchAll); // pweza speed system

  /** Admin UI is dark-only; restore previous html theme when leaving admin. */
  useEffect(() => {
    const root = document.documentElement;
    themeBeforeAdminRef.current = root.classList.contains('dark') ? 'dark' : 'light';
    root.classList.remove('light');
    root.classList.add('dark');
    localStorage.setItem('pwezacore-theme', 'dark');
    return () => {
      const prev = themeBeforeAdminRef.current;
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
  const onPrefetchNav = () => {
    void prefetchAll();
  }; // pweza speed system

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMgmtOpen, setUserMgmtOpen] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
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
    if (location.pathname.includes('/dashboard/admin/finance')) setFinanceOpen(true);
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

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/');
  }

  const closeSidebar = () => setSidebarOpen(false);

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
          --pw-t1: #eef3ff;
          --pw-t2: #8296be;
          --pw-t3: #3d5278;
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
        /* Admin shell: single scroll region in .pw-main; hide scrollbars everywhere under .pw-layout (scroll still works). */
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
          background: var(--pw-s1, #0b1120);
          border-right: 1px solid var(--pw-border, rgba(255,255,255,0.07));
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
        .pw-sidebar::-webkit-scrollbar {
          width: 0;
          height: 0;
          display: none;
        }
        @media (max-width: 768px) {
          .pw-sidebar { transform: translateX(-100%); }
          .pw-sidebar.pw-sidebar--open { transform: translateX(0); }
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
        .pw-nav-link:hover {
          background: var(--pw-s2, #101828);
          color: var(--pw-t1, #eef3ff);
        }
        .pw-nav-link--active {
          background: var(--pw-teal-s, rgba(16,217,168,0.10)) !important;
          color: var(--pw-teal, #10d9a8) !important;
          border-color: rgba(16,217,168,0.15) !important;
        }
        .pw-nav-link--group-active { color: var(--pw-teal, #10d9a8); }
        .pw-nav-ic { font-size: 15px; flex-shrink: 0; width: 18px; text-align: center; }
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
          top: 14px; left: 14px;
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
        .pw-main--chat {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding: 0;
        }
        .pw-main--chat > * {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }
        .pw-layout * {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        .pw-layout *::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        .pw-layout *::-webkit-scrollbar-track,
        .pw-layout *::-webkit-scrollbar-thumb {
          display: none !important;
        }
        @media (max-width: 768px) {
          .pw-main {
            margin-left: 0;
            width: 100%;
            padding-top: 0;
          }
        }
        html.dark .pw-main table,
        html.dark .pw-main th,
        html.dark .pw-main td { color: #eef3ff; }
        html.light .pw-main table,
        html.light .pw-main th,
        html.light .pw-main td,
        :root:not(.dark) .pw-main table,
        :root:not(.dark) .pw-main th,
        :root:not(.dark) .pw-main td { color: #0d1c2e; }
      `}</style>

      <div className="pw-layout">
        <button type="button" className="pw-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar">
          {sidebarOpen ? '✕' : '☰'}
        </button>

        {sidebarOpen && <div className="pw-sidebar-overlay" onClick={closeSidebar} />}

        <aside className={`pw-sidebar ${sidebarOpen ? 'pw-sidebar--open' : ''}`}>
          <div className="pw-brand">
            <div className="pw-brand-logo">🎓</div>
            <span className="pw-brand-name">PwezaCore</span>
            <span className="pw-brand-pill">Admin</span>
          </div>

          <div className="pw-nav-section">
            <span className="pw-nav-label">Main</span>
            <NavItem to="/dashboard/admin" icon="⊞" label="Dashboard" end onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to="/dashboard/admin/messages" icon="💬" label="Messages" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to="/dashboard/admin/students" icon="👨‍🎓" label="Students" badge={studentCount ?? undefined} badgeColor="teal" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to="/dashboard/admin/teachers" icon="🧑‍🏫" label="Teachers" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to="/dashboard/admin/parents" icon="👨‍👩‍👧" label="Parents" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
          </div>

          <div className="pw-nav-section">
            <span className="pw-nav-label">Management</span>
            <NavGroup icon="👥" label="User Management" isOpen={userMgmtOpen} onToggle={() => setUserMgmtOpen(!userMgmtOpen)} matchPaths={['/dashboard/admin/accounts', '/dashboard/admin/permissions']}>
              <SubItem to="/dashboard/admin/accounts" label="All Users" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItem to="/dashboard/admin/accounts/invite" label="Send invitations" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItem to="/dashboard/admin/permissions" label="Access & permissions" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            </NavGroup>
            <NavItem to="/dashboard/admin/staff" icon="🏢" label="Staff" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to="/dashboard/admin/settings/classes" icon="🏫" label="Classes" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to="/dashboard/admin/jobs" icon="💼" label="Job Vacancies" badge={jobCount ?? undefined} badgeColor="rose" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
          </div>

          <div className="pw-nav-section">
            <span className="pw-nav-label">Finance</span>
            <NavGroup
              icon="💰"
              label="Finance"
              isOpen={financeOpen}
              onToggle={() => setFinanceOpen(!financeOpen)}
              matchPaths={['/dashboard/admin/finance']}
            >
              <SubItem to="/dashboard/admin/finance" label="Overview" end onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItem to="/dashboard/admin/finance/financial-analytics" label="Financial Analytics" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItem to="/dashboard/admin/finance/outstanding" label="Outstanding balances" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItem to="/dashboard/admin/finance/receipts" label="Receipts" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            </NavGroup>
          </div>

          <div className="pw-nav-section">
            <span className="pw-nav-label">Academic</span>
            <NavItem to="/dashboard/admin/attendance" icon="📋" label="Attendance" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to="/dashboard/admin/exam-sets" icon="📝" label="Exam Sets" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavGroup icon="📊" label="Reports" isOpen={reportsOpen} onToggle={() => setReportsOpen(!reportsOpen)} matchPaths={['/dashboard/admin/reports', '/dashboard/admin/report-records']}>
              <SubItem to="/dashboard/admin/reports" label="Overview" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItem to="/dashboard/admin/reports/generate" label="Generate Reports" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItem to="/dashboard/admin/report-records" label="Report Records" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
              <SubItem to="/dashboard/admin/settings" label="Report Templates" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            </NavGroup>
            <NavItem to="/dashboard/admin/identity" icon="🪪" label="Identity" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
          </div>

          <div className="pw-nav-section">
            <span className="pw-nav-label">System</span>
            <NavItem to="/dashboard/admin/notifications" icon="🔔" label="Notifications" badge={notifCount ?? undefined} badgeColor="amber" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to="/dashboard/admin/settings" icon="⚙️" label="System Settings" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
            <NavItem to="/dashboard/admin/headed-paper" icon="📄" label="Headed Paper" onClick={closeSidebar} onPrefetch={onPrefetchNav} />
          </div>

          <div className="pw-sidebar-bottom">
            <div className="pw-admin-card">
              <div className="pw-admin-av">{adminUser.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="pw-admin-name">{adminUser.name}</div>
                <div className="pw-admin-role">School Administrator</div>
              </div>
              <span style={{ color: 'var(--pw-t3)', fontSize: '13px', flexShrink: 0 }}>⋯</span>
            </div>
            <button type="button" className="pw-logout-btn" onClick={handleLogout}>
              <span className="pw-nav-ic">🚪</span>
              Logout
            </button>
          </div>
        </aside>

        <main
          className={
            location.pathname.startsWith('/dashboard/admin/messages')
              ? 'pw-main pw-main--chat'
              : 'pw-main'
          }
        >
          <Suspense fallback={<AdminContentSkeleton />}>
            <Outlet />
          </Suspense>
        </main>

        <AdminMobileBottomNav notifCount={notifCount} onPrefetch={onPrefetchNav} />
      </div>
    </>
  );
}

