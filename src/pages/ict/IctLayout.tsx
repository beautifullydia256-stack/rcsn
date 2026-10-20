import { Suspense, useEffect, useState, useRef, type ReactNode } from 'react';
import { Navigate, Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Mail,
  KeyRound,
  Monitor,
  CalendarCheck,
  Fingerprint,
  Wifi,
  Wrench,
  Wallet,
  Package,
  MessageSquare,
  CalendarDays,
  Sun,
  Moon,
  LogOut,
  X,
  Menu,
  ShieldCheck,
  ArrowLeftRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logoutWithSyncCheck } from '@/lib/logoutWithSyncCheck';
import { useSchoolChatUnreadTotal } from '@/hooks/useSchoolChatUnreadTotal';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { POS_SIDEBAR_SHARED_CSS } from '@/lib/pwShellCss';
import { hasRole, ROLE_GROUPS } from '@/lib/rbac';
import AdminContentSkeleton from '@/components/layout/AdminContentSkeleton';

const ICT_BASE = '/dashboard/ict';

interface NavItemProps {
  to: string;
  icon: ReactNode;
  label: string;
  end?: boolean;
  onClick?: () => void;
  badge?: string | number;
  badgeColor?: 'teal' | 'amber' | 'rose';
}

function NavItem({
  to,
  icon,
  label,
  end,
  onClick,
  badge,
  badgeColor = 'rose',
}: NavItemProps) {
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

export default function IctLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = useAuthStore((s) => s.role);
  const user = useAuthStore((s) => s.user);
  const schoolId = useAuthStore((s) => s.schoolId);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [schoolName, setSchoolName] = useState<string>('Rakai Community School of Nursing');
  const [userName, setUserName] = useState<string>('ICT Officer');
  const [userInitials, setUserInitials] = useState<string>('IT');
  const [hasMultipleRoles, setHasMultipleRoles] = useState(false);

  const unreadChatTotal = useSchoolChatUnreadTotal(user?.id);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Authorization check
  const isAuthorized = hasRole(role, ROLE_GROUPS.ICT_DASHBOARD);

  useEffect(() => {
    if (!schoolId) return;
    const fetchSchoolInfo = async () => {
      try {
        const { data } = await supabase
          .from('schools')
          .select('name')
          .eq('school_id', schoolId)
          .maybeSingle();
        if (data?.name) setSchoolName(data.name);
      } catch {
        // Fallback to institutional default
      }
    };
    void fetchSchoolInfo();
  }, [schoolId]);

  useEffect(() => {
    if (!user?.id) return;
    const fetchUserProfile = async () => {
      try {
        const { data } = await supabase
          .from('users')
          .select('name, email, role, extra_roles')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data) {
          const displayName = data.name || data.email || 'ICT Officer';
          setUserName(displayName);
          const parts = displayName.trim().split(/\s+/);
          if (parts.length >= 2) {
            setUserInitials((parts[0][0] + parts[parts.length - 1][0]).toUpperCase());
          } else {
            setUserInitials(displayName.slice(0, 2).toUpperCase());
          }

          const extras = Array.isArray(data.extra_roles) ? data.extra_roles : [];
          setHasMultipleRoles(extras.length > 0);
        }
      } catch {
        // ignore
      }
    };
    void fetchUserProfile();
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isAuthorized) {
    return <Navigate to="/dashboard" replace />;
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = () => {
    void logoutWithSyncCheck(() => {
      navigate('/login', { replace: true });
    });
  };

  return (
    <>
      <style>{POS_SIDEBAR_SHARED_CSS}</style>
      <div className="pw-shell flex h-screen w-full overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        {/* Mobile menu backdrop */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`pw-sidebar fixed inset-y-0 left-0 z-50 flex w-72 flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-bold shadow-md shadow-emerald-500/20">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-white tracking-wide uppercase">
                  {schoolName}
                </p>
                <p className="truncate text-[11px] font-medium text-emerald-400">
                  ICT & Systems Centre
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            <div className="px-3 pb-2 pt-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Core Systems
            </div>

            <NavItem
              to={ICT_BASE}
              end
              icon={<LayoutDashboard className="h-4 w-4" />}
              label="Control Centre"
              onClick={() => setMobileMenuOpen(false)}
            />

            <NavItem
              to={`${ICT_BASE}/email`}
              icon={<Mail className="h-4 w-4" />}
              label="Official Mailbox"
              onClick={() => setMobileMenuOpen(false)}
            />

            <NavItem
              to={`${ICT_BASE}/accounts`}
              icon={<KeyRound className="h-4 w-4" />}
              label="Account & Password Help"
              onClick={() => setMobileMenuOpen(false)}
            />

            <div className="px-3 pb-2 pt-4 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Lab & Infrastructure
            </div>

            <NavItem
              to={`${ICT_BASE}/workstations`}
              icon={<Monitor className="h-4 w-4" />}
              label="Lab Workstations"
              onClick={() => setMobileMenuOpen(false)}
            />

            <NavItem
              to={`${ICT_BASE}/schedule`}
              icon={<CalendarCheck className="h-4 w-4" />}
              label="Lab Timetable & Bookings"
              onClick={() => setMobileMenuOpen(false)}
            />

            <NavItem
              to={`${ICT_BASE}/biometrics`}
              icon={<Fingerprint className="h-4 w-4" />}
              label="Biometric Terminals"
              onClick={() => setMobileMenuOpen(false)}
            />

            <NavItem
              to={`${ICT_BASE}/network`}
              icon={<Wifi className="h-4 w-4" />}
              label="Campus Wi-Fi & CCTV"
              onClick={() => setMobileMenuOpen(false)}
            />

            <NavItem
              to={`${ICT_BASE}/helpdesk`}
              icon={<Wrench className="h-4 w-4" />}
              label="Hardware & Helpdesk"
              onClick={() => setMobileMenuOpen(false)}
            />

            <div className="px-3 pb-2 pt-4 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Procurement & Store
            </div>

            <NavItem
              to={`${ICT_BASE}/requisitions`}
              icon={<Wallet className="h-4 w-4" />}
              label="Budget Requisitions"
              onClick={() => setMobileMenuOpen(false)}
            />

            <NavItem
              to={`${ICT_BASE}/store-indent`}
              icon={<Package className="h-4 w-4" />}
              label="Store Indents"
              onClick={() => setMobileMenuOpen(false)}
            />

            <div className="px-3 pb-2 pt-4 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Communication
            </div>

            <NavItem
              to={`${ICT_BASE}/messages`}
              icon={<MessageSquare className="h-4 w-4" />}
              label="Staff Messages"
              badge={unreadChatTotal > 0 ? unreadChatTotal : undefined}
              badgeColor="rose"
              onClick={() => setMobileMenuOpen(false)}
            />

            <NavItem
              to={`${ICT_BASE}/calendar`}
              icon={<CalendarDays className="h-4 w-4" />}
              label="School Calendar"
              onClick={() => setMobileMenuOpen(false)}
            />
          </nav>

          {/* Footer User Profile & Theme */}
          <div className="border-t border-white/10 p-3">
            <div className="relative" ref={dropdownRef}>
              <div
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-3 rounded-xl p-2 cursor-pointer transition-colors hover:bg-white/10"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600/30 text-emerald-400 font-bold border border-emerald-500/30">
                  {userInitials}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-xs font-semibold text-white">{userName}</p>
                  <p className="truncate text-[10px] text-slate-400">ICT & Systems Officer</p>
                </div>
              </div>

              {userDropdownOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-full rounded-xl bg-slate-900 border border-white/15 p-1.5 shadow-xl backdrop-blur-md z-50">
                  {hasMultipleRoles && (
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        navigate('/role-picker');
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white"
                    >
                      <ArrowLeftRight className="h-4 w-4 text-emerald-400" />
                      Switch Role
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      toggleTheme();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white"
                  >
                    {theme === 'dark' ? (
                      <>
                        <Sun className="h-4 w-4 text-amber-400" />
                        Light Theme
                      </>
                    ) : (
                      <>
                        <Moon className="h-4 w-4 text-indigo-400" />
                        Dark Theme
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          {/* Topbar for mobile */}
          <header className="flex h-14 items-center justify-between border-b border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md px-4 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              RCSN ICT Portal
            </span>
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-lg p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
            </button>
          </header>

          {/* Page Body */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <Suspense fallback={<AdminContentSkeleton />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
    </>
  );
}
