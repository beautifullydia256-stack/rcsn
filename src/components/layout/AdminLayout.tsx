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
} from 'lucide-react';
import GlassBackground from './GlassBackground';
import AdminContentSkeleton from './AdminContentSkeleton';
import { supabase } from '../../lib/supabase';

function NavLinkStyle({
  to,
  end,
  icon: Icon,
  children,
}: {
  to: string;
  end?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <NavLink to={to} end={end} className="block">
      {({ isActive }) => (
        <span
          className={`flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
            isActive
              ? 'bg-green-600 text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Icon className="w-5 h-5 flex-shrink-0 [color:inherit]" />
          {children}
        </span>
      )}
    </NavLink>
  );
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard/admin';

  const [adminName, setAdminName] = useState('Admin');
  const [adminEmail, setAdminEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const profileRef = useRef<HTMLDivElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      setIsMobileDevice(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua));
    };
    checkMobile();
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('users').select('name, email').eq('user_id', user.id).single();
        if (data) {
          setAdminName(data.name || 'Admin');
          setAdminEmail(data.email || '');
        }
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  return (
    <div className="min-h-screen relative">
      {!isDashboard && <GlassBackground />}

      <aside className="fixed left-0 top-0 bottom-0 w-52 flex flex-col z-10 overflow-y-auto bg-white border-r border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 px-4 py-6 border-b border-gray-200">
          <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-green-800 rounded-lg flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-gray-900">PwezaCore</span>
        </div>

        <div className="px-4 pt-2 pb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">MENU</span>
        </div>
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          <NavLinkStyle to="/dashboard/admin" end icon={LayoutDashboard}>Dashboard</NavLinkStyle>
          <NavLinkStyle to="/dashboard/admin/students" icon={Users}>Students</NavLinkStyle>
          <NavLinkStyle to="/dashboard/admin/teachers" icon={GraduationCap}>Teachers</NavLinkStyle>
          <NavLinkStyle to="/dashboard/admin/parents" icon={UserPlus}>Parents</NavLinkStyle>
          <NavLinkStyle to="/dashboard/admin/accounts" icon={Briefcase}>Staff</NavLinkStyle>
          <NavLinkStyle to="/dashboard/admin/outstanding" icon={DollarSign}>Finance</NavLinkStyle>
          <NavLinkStyle to="/dashboard/admin/reports" end icon={FileText}>Reports</NavLinkStyle>
          <NavLinkStyle to="/dashboard/admin/attendance" icon={ClipboardList}>Attendance</NavLinkStyle>
          <NavLinkStyle to="/dashboard/admin/exam-sets" icon={BookOpen}>Exam Sets</NavLinkStyle>
          <NavLinkStyle to="/dashboard/admin/settings/classes" icon={Building2}>Classes</NavLinkStyle>
          <NavLinkStyle to="/dashboard/admin/jobs" icon={CreditCard}>Job Vacancies</NavLinkStyle>
          <NavLinkStyle to="/dashboard/admin/settings" icon={Settings}>System Settings</NavLinkStyle>
          <NavLinkStyle to="/dashboard/admin/notifications" icon={Bell}>Notifications</NavLinkStyle>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-all"
          >
            <LogOut className="w-5 h-5 flex-shrink-0 text-gray-600" />
            Logout
          </button>
        </nav>

        {isMobileDevice && (
          <div className="mx-3 mb-4 p-4 rounded-xl bg-green-600 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="w-5 h-5 text-white" />
              <span className="text-sm font-semibold">Download our Mobile App</span>
            </div>
            <p className="text-xs text-white/90 mb-3">Get easy in another way.</p>
            <a
              href="#"
              className="block w-full py-2 rounded-lg text-center text-sm font-medium bg-white text-green-600 hover:bg-green-50 transition-colors"
            >
              Download
            </a>
          </div>
        )}
      </aside>

      <div className={`relative min-w-0 flex-1 ml-52 flex flex-col min-h-screen z-0 ${isDashboard ? 'bg-gray-50' : ''}`}>
        {isDashboard && (
          <nav className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
            <div className="px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 flex-wrap items-center gap-3 max-w-4xl">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search students, fees, reports..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-12 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">⌘F</span>
                  </div>
                  <select className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/30">
                    <option value="">Term</option>
                    <option value="1">Term 1</option>
                    <option value="2">Term 2</option>
                    <option value="3">Term 3</option>
                  </select>
                  <select className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/30">
                    <option value="">Class</option>
                    <option value="P1">Primary 1</option>
                    <option value="P2">Primary 2</option>
                  </select>
                  <select className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/30">
                    <option value="">Academic Year</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="hidden sm:block text-sm text-gray-600">
                    {greeting()}, <span className="font-medium text-gray-900">{adminName}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/admin/notifications')}
                    className="relative p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    <Bell className="w-5 h-5" />
                  </button>
                  <div className="relative" ref={profileRef}>
                    <button
                      type="button"
                      onClick={() => setProfileOpen(!profileOpen)}
                      className="flex items-center gap-2 p-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50"
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white font-semibold text-sm">
                        {adminName.charAt(0).toUpperCase()}
                      </div>
                      <div className="hidden md:block text-left max-w-[140px]">
                        <div className="text-sm font-medium text-gray-900 truncate">{adminName}</div>
                        <div className="text-xs text-gray-500 truncate">{adminEmail}</div>
                      </div>
                    </button>
                    {profileOpen && (
                      <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-gray-200 shadow-lg overflow-hidden z-50">
                        <div className="p-4 border-b border-gray-100">
                          <div className="font-medium text-gray-900">{adminName}</div>
                          <div className="text-sm text-gray-500 truncate">{adminEmail}</div>
                        </div>
                        <div className="p-1">
                          <button
                            type="button"
                            onClick={() => { navigate('/dashboard/admin/settings'); setProfileOpen(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Settings className="w-4 h-4" />
                            Settings
                          </button>
                          <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50"
                          >
                            <LogOut className="w-4 h-4" />
                            Logout
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </nav>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Suspense fallback={<AdminContentSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
