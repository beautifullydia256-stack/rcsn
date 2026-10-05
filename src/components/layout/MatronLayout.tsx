import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  Moon,
  Bed,
  ShieldAlert,
  Clock,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Shield,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import AdminContentSkeleton from './AdminContentSkeleton';
import { supabase } from '../../lib/supabase';
import { logoutWithSyncCheck } from '../../lib/logoutWithSyncCheck';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useTheme } from '@/lib/theme-provider';
import { getTokens } from '../../styles/posThemeTokens';

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

export default function MatronLayout() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  const { theme, toggleTheme } = useUIStore();
  const { setTheme } = useTheme();
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const { user, role } = useAuthStore();
  const [profileName, setProfileName] = useState('Resident Matron');
  const [profileEmail, setProfileEmail] = useState('');

  useEffect(() => {
    async function loadUser() {
      if (!user) return;
      setProfileEmail(user.email || '');
      const { data } = await supabase
        .from('users')
        .select('name, role')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data?.name) {
        setProfileName(data.name);
      } else {
        const isWarden = role === 'warden' || role === 'patron';
        setProfileName(isWarden ? 'Hostel Warden' : 'Resident Matron');
      }
    }
    void loadUser();
  }, [user, role]);

  const initials = profileName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'HM';

  const handleLogout = async () => {
    await logoutWithSyncCheck(() => navigate('/login'));
  };

  const handleThemeToggle = () => {
    toggleTheme();
    setTheme(isDark ? 'light' : 'dark');
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`pw-admin-root ${isDark ? 'dark' : 'light'}`} style={{ backgroundColor: tk.screenBg }}>
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`pw-admin-sidebar ${mobileMenuOpen ? 'pw-admin-sidebar--mobile-open' : ''}`}
        style={{
          backgroundColor: tk.sidebarBg,
          borderColor: tk.sidebarBorder,
        }}
      >
        <div className="pw-sidebar-brand" style={{ borderBottomColor: tk.sidebarBorder }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight" style={{ color: tk.textHi }}>
                RCSN Hostels
              </h2>
              <p className="text-[11px] font-medium" style={{ color: tk.textLow }}>
                Matron &amp; Warden Office
              </p>
            </div>
          </div>
          <button
            type="button"
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-100"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="pw-sidebar-nav">
          <div className="pw-nav-section-label" style={{ color: tk.sidebarSectionLabel }}>
            Hostel Operations
          </div>
          <NavItem
            to="/dashboard/matron"
            end
            icon={<Users className="w-4 h-4" />}
            label="Resident Directory"
            onClick={() => setMobileMenuOpen(false)}
          />
          <NavItem
            to="/dashboard/matron/roll-call"
            icon={<Moon className="w-4 h-4" />}
            label="Night Roll Call"
            onClick={() => setMobileMenuOpen(false)}
          />
          <NavItem
            to="/dashboard/matron/rooms"
            icon={<Bed className="w-4 h-4" />}
            label="Rooms &amp; Beds"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="pw-nav-section-label mt-5" style={{ color: tk.sidebarSectionLabel }}>
            Welfare &amp; Discipline
          </div>
          <NavItem
            to="/dashboard/matron/liabilities"
            icon={<ShieldAlert className="w-4 h-4" />}
            label="Damage &amp; Breakages"
            onClick={() => setMobileMenuOpen(false)}
          />
          <NavItem
            to="/dashboard/matron/gate-passes"
            icon={<Clock className="w-4 h-4" />}
            label="Approved Gate Passes"
            onClick={() => setMobileMenuOpen(false)}
          />
        </nav>

        <div className="pw-sidebar-footer" style={{ borderTopColor: tk.sidebarBorder }}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 font-bold text-xs flex items-center justify-center border border-rose-500/30 shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: tk.textHi }}>
                  {profileName}
                </p>
                <p className="text-[10px] truncate" style={{ color: tk.textLow }}>
                  {profileEmail || 'Hostel Administration'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleThemeToggle}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
              title="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="pw-admin-main">
        {/* Top Header */}
        <header
          className="pw-admin-topbar sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 h-14 backdrop-blur-md border-b"
          style={{
            backgroundColor: `${tk.panel}cc`,
            borderColor: tk.stroke,
          }}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Activity className="w-3.5 h-3.5" /> RCSN UNMEB U028
              </span>
              <span className="hidden sm:inline-block text-xs font-medium text-slate-400">
                Hostel Resident Management System
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleThemeToggle}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
              title="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="relative" ref={userDropdownRef}>
              <button
                type="button"
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/5 transition-colors"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                  {initials}
                </div>
                <span className="hidden md:block text-xs font-medium text-slate-200">
                  {profileName}
                </span>
              </button>

              {userDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 rounded-xl shadow-2xl border p-1 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
                  style={{
                    backgroundColor: tk.panel,
                    borderColor: tk.stroke,
                  }}
                >
                  <div className="px-3 py-2 border-b" style={{ borderColor: tk.stroke }}>
                    <p className="text-xs font-semibold" style={{ color: tk.textHi }}>
                      {profileName}
                    </p>
                    <p className="text-[11px] truncate" style={{ color: tk.textLow }}>
                      {profileEmail}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors mt-1"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <Suspense fallback={<AdminContentSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
