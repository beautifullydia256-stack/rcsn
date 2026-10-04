import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  HeartPulse,
  LayoutDashboard,
  Users,
  BedDouble,
  Pill,
  FileText,
  Ambulance,
  ArrowLeft,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Building2,
  Bell,
} from 'lucide-react';
import AdminContentSkeleton from './AdminContentSkeleton';
import { supabase } from '../../lib/supabase';
import { logoutWithSyncCheck } from '../../lib/logoutWithSyncCheck';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { POS_SIDEBAR_SHARED_CSS } from '../../lib/pwShellCss';
import { hasRole, ROLE_GROUPS, normalizeRole, logRbacDecision } from '../../lib/rbac';

const CLINIC = '/dashboard/clinician';

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

export default function ClinicianLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = useAuthStore((s) => s.role);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const isDark = theme === 'dark';

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState('School Clinician');
  const [initials, setInitials] = useState('SC');

  const showBackToAdmin = role && ['admin', 'head_teacher', 'principal', 'director'].includes(role.toLowerCase());

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: ud } = await supabase
          .from('users')
          .select('name, email')
          .eq('user_id', user.id)
          .maybeSingle();
        const name = (ud as { name?: string } | null)?.name || user.email?.split('@')[0] || 'Clinician';
        setUserName(name);
        const inits = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'SC';
        setInitials(inits);
      } catch {
        /* non-fatal */
      }
    }
    void loadUser();
  }, []);

  function handleLogout() {
    void logoutWithSyncCheck(() => navigate('/'));
  }

  function toggleTheme() {
    const next = isDark ? 'light' : 'dark';
    setTheme(next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      document.body.classList.remove('dark');
    }
  }

  const close = () => setSidebarOpen(false);

  return (
    <>
      <style>{POS_SIDEBAR_SHARED_CSS}</style>

      <div className="pw-layout">
        <button
          type="button"
          className="pw-hamburger"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {sidebarOpen && <div className="pw-sidebar-overlay" onClick={close} />}

        <aside className={`pw-sidebar ${sidebarOpen ? 'pw-sidebar--open' : ''}`}>
          <div className="pw-brand">
            <div className="pw-brand-name">RCSN</div>
            <div className="pw-brand-subtitle">School Sickbay & Clinic</div>
            <div className="pw-brand-pill">Health Care</div>
          </div>

          <div className="pw-nav-scroll-area">
            <div className="pw-nav-section">
              <span className="pw-nav-label">Overview</span>
              <NavItem to={CLINIC} icon={<LayoutDashboard className="w-4 h-4" />} label="Clinic Dashboard" end onClick={close} />
            </div>

            <div className="pw-nav-section">
              <span className="pw-nav-label">Clinical Care</span>
              <NavItem to={`${CLINIC}/patients`} icon={<Users className="w-4 h-4" />} label="Outpatient Triage" onClick={close} />
              <NavItem to={`${CLINIC}/ward`} icon={<BedDouble className="w-4 h-4" />} label="Inpatient Ward (Beds)" onClick={close} />
              <NavItem to={`${CLINIC}/pharmacy`} icon={<Pill className="w-4 h-4" />} label="Pharmacy & Stocks" onClick={close} />
            </div>

            <div className="pw-nav-section">
              <span className="pw-nav-label">Safety & Referrals</span>
              <NavItem to={`${CLINIC}/records`} icon={<FileText className="w-4 h-4" />} label="Chronic & Allergies" onClick={close} />
              <NavItem to={`${CLINIC}/referrals`} icon={<Ambulance className="w-4 h-4" />} label="Hospital Referrals" onClick={close} />
            </div>
          </div>

          <div className="pw-sidebar-tools">
            <button type="button" onClick={toggleTheme} title={isDark ? 'Switch to white mode' : 'Switch to dark mode'}>
              {isDark ? <Sun className="h-4 w-4 shrink-0 text-amber-400" /> : <Moon className="h-4 w-4 shrink-0 text-slate-600" />}
              <span>{isDark ? 'White Mode' : 'Dark Mode'}</span>
            </button>
          </div>

          <div className="pw-sidebar-bottom">
            <div className="pw-admin-card">
              <div className="pw-admin-av">
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="pw-admin-name">{userName}</div>
                <div className="pw-admin-role">Medical Clinician</div>
              </div>
            </div>

            {showBackToAdmin && (
              <button
                type="button"
                onClick={() => navigate('/dashboard/admin')}
                className="pw-footer-action"
                style={{ color: '#8b5cf6' }}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Admin</span>
              </button>
            )}

            <button type="button" className="pw-logout-btn" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        <main className="pw-main" style={{ width: '100%', minHeight: '100vh', overflowX: 'hidden' }}>
          <Suspense fallback={<AdminContentSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </>
  );
}
