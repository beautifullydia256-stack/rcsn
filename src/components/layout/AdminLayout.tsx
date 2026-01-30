import { Outlet, NavLink } from 'react-router-dom';
import GlassBackground from './GlassBackground';

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
  children,
}: {
  to: string;
  end?: boolean;
  children: React.ReactNode;
}) {
  return (
    <NavLink to={to} end={end} className="block">
      {({ isActive }) => (
        <span
          className="block w-full rounded-xl px-3 py-2.5 text-sm font-medium transition-all"
          style={{
            background: isActive ? 'rgba(77, 171, 255, 0.15)' : 'transparent',
            border: isActive ? '1px solid rgba(77, 171, 255, 0.3)' : '1px solid transparent',
            color: isActive ? '#4dabff' : 'rgba(255, 255, 255, 0.85)',
            boxShadow: isActive ? '0 2px 10px rgba(0, 0, 0, 0.15)' : 'none',
          }}
        >
          {children}
        </span>
      )}
    </NavLink>
  );
}

/**
 * Layout for admin dashboard: glass sidebar + main (2f00b44 look from Next.js).
 * No top bar; radial gradient background; frosted sidebar with #4dabff active.
 */
export default function AdminLayout() {
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
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
            </svg>
          </div>
          <span className="font-bold text-lg text-white">PwezaCore</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavLinkStyle to="/dashboard/admin" end>Dashboard</NavLinkStyle>
          <div className="pt-3 pb-1 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255, 255, 255, 0.55)' }}>
            MANAGEMENT
          </div>
          <NavLinkStyle to="/dashboard/admin/students">Students</NavLinkStyle>
          <NavLinkStyle to="/dashboard/admin/teachers">Teachers</NavLinkStyle>
          <NavLinkStyle to="/dashboard/admin/parents">Parents</NavLinkStyle>
          <NavLinkStyle to="/dashboard/admin/accounts">Accounts</NavLinkStyle>
          <NavLinkStyle to="/dashboard/admin/exam-sets">Exam Sets</NavLinkStyle>
          <NavLinkStyle to="/dashboard/admin/attendance">Attendance</NavLinkStyle>
          <NavLinkStyle to="/dashboard/admin/settings">Settings</NavLinkStyle>
          <div className="pt-3 pb-1 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255, 255, 255, 0.55)' }}>
            REPORTS
          </div>
          <NavLinkStyle to="/dashboard/admin/reports/snapshots">Snapshots</NavLinkStyle>
          <NavLinkStyle to="/dashboard/admin/reports/bulk">Bulk Generate</NavLinkStyle>
          <NavLinkStyle to="/dashboard/admin/reports/viewer">Report Viewer</NavLinkStyle>
        </nav>
      </aside>

      <main className="relative min-w-0 flex-1 ml-52 p-4 sm:p-6 lg:p-8 overflow-y-auto min-h-screen z-0">
        <Outlet />
      </main>
    </div>
  );
}
