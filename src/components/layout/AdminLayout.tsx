import { Outlet, NavLink, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import GlassBackground from './GlassBackground';
import { supabase } from '../../lib/supabase';

const sidebarStyle = {
  background: 'rgba(255, 255, 255, 0.08)',
  backdropFilter: 'blur(25px)',
  WebkitBackdropFilter: 'blur(25px)',
  borderRight: '1px solid rgba(255, 255, 255, 0.20)',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
};

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
          className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium transition-all"
          style={{
            background: isActive ? 'rgba(77, 171, 255, 0.15)' : 'transparent',
            border: isActive ? '1px solid rgba(77, 171, 255, 0.3)' : '1px solid transparent',
            color: isActive ? '#4dabff' : 'rgba(255, 255, 255, 0.85)',
            boxShadow: isActive ? '0 2px 10px rgba(0, 0, 0, 0.15)' : 'none',
          }}
        >
          <Icon className="w-5 h-5 flex-shrink-0 [color:inherit]" />
          {children}
        </span>
      )}
    </NavLink>
  );
}

/**
 * Admin sidebar: exact 2f00b44 structure — flat list, icons, bottom Settings + Logout.
 */
export default function AdminLayout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen relative">
      <GlassBackground />

      <aside
        className="fixed left-0 top-0 bottom-0 w-52 flex flex-col z-10 overflow-y-auto"
        style={sidebarStyle}
      >
        <div
          className="flex items-center gap-2 px-4 py-6 border-b"
          style={{ borderColor: 'rgba(255, 255, 255, 0.20)' }}
        >
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-white">PwezaCore</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <NavLinkStyle to="/dashboard/admin" end icon={LayoutDashboard}>Dashboard</NavLinkStyle>
          <NavLinkStyle to="/dashboard/admin/students" icon={Users}>Students</NavLinkStyle>
          <NavLinkStyle to="/dashboard/admin/teachers" icon={GraduationCap}>Teachers</NavLinkStyle>
          <NavLinkStyle to="/dashboard/admin/parents" icon={UserPlus}>Parents</NavLinkStyle>
          <NavLinkStyle to="/dashboard/admin/accounts" icon={Briefcase}>Staff</NavLinkStyle>
          <NavLinkStyle to="/dashboard/admin/outstanding" icon={DollarSign}>Finance</NavLinkStyle>
          <NavLinkStyle to="/dashboard/admin/reports/snapshots" icon={FileText}>Reports</NavLinkStyle>
          <NavLinkStyle to="/dashboard/admin/attendance" icon={ClipboardList}>Attendance</NavLinkStyle>
          <NavLinkStyle to="/dashboard/admin/exam-sets" icon={BookOpen}>Exam Sets</NavLinkStyle>
          <NavLinkStyle to="/dashboard/admin/settings/classes" icon={Building2}>Classes</NavLinkStyle>
          <NavLinkStyle to="/dashboard/admin/jobs" icon={CreditCard}>Job Vacancies</NavLinkStyle>
          <NavLinkStyle to="/dashboard/admin/settings" icon={Settings}>System Settings</NavLinkStyle>
          <NavLinkStyle to="/dashboard/admin/notifications" icon={Bell}>Notifications</NavLinkStyle>
        </nav>

        <div
          className="px-3 py-4 border-t space-y-1"
          style={{ borderColor: 'rgba(255, 255, 255, 0.20)' }}
        >
          <NavLinkStyle to="/dashboard/admin/settings" icon={Settings}>Settings</NavLinkStyle>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium transition-all"
            style={{
              color: 'rgba(239, 68, 68, 0.9)',
              background: 'transparent',
              border: '1px solid transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            Logout
          </button>
        </div>
      </aside>

      <main className="relative min-w-0 flex-1 ml-52 p-4 sm:p-6 lg:p-8 overflow-y-auto min-h-screen z-0">
        <Outlet />
      </main>
    </div>
  );
}
