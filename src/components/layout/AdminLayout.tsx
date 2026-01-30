import { Outlet, NavLink } from 'react-router-dom';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-blue-600 text-white'
      : 'text-gray-300 hover:bg-white/10 hover:text-white'
  }`;

/**
 * Layout for admin dashboard: sidebar nav + outlet (2f00b44 style).
 * No global top bar; single sidebar with MANAGEMENT and REPORTS sections.
 */
export default function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-[#1f2937]">
      <nav
        className="w-52 shrink-0 flex flex-col border-r border-white/10 bg-[#1a2034] p-3 overflow-y-auto"
        style={{ minHeight: '100vh' }}
      >
        <NavLink to="/dashboard/admin" end className={navClass}>
          Dashboard
        </NavLink>
        <div className="pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          MANAGEMENT
        </div>
        <NavLink to="/dashboard/admin/students" className={navClass}>
          Students
        </NavLink>
        <NavLink to="/dashboard/admin/teachers" className={navClass}>
          Teachers
        </NavLink>
        <NavLink to="/dashboard/admin/parents" className={navClass}>
          Parents
        </NavLink>
        <NavLink to="/dashboard/admin/accounts" className={navClass}>
          Accounts
        </NavLink>
        <NavLink to="/dashboard/admin/exam-sets" className={navClass}>
          Exam Sets
        </NavLink>
        <NavLink to="/dashboard/admin/attendance" className={navClass}>
          Attendance
        </NavLink>
        <NavLink to="/dashboard/admin/settings" className={navClass}>
          Settings
        </NavLink>
        <div className="pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          REPORTS
        </div>
        <NavLink to="/dashboard/admin/reports/snapshots" className={navClass}>
          Snapshots
        </NavLink>
        <NavLink to="/dashboard/admin/reports/bulk" className={navClass}>
          Bulk Generate
        </NavLink>
        <NavLink to="/dashboard/admin/reports/viewer" className={navClass}>
          Report Viewer
        </NavLink>
      </nav>
      <main className="min-w-0 flex-1 bg-[#1f2937] p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
