import { Outlet, NavLink } from 'react-router-dom';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  }`;

/**
 * Layout for admin dashboard: sidebar nav + outlet for report and management pages.
 */
export default function AdminLayout() {
  return (
    <div className="flex gap-6 p-4">
      <nav className="w-52 shrink-0 space-y-1 rounded-lg border border-border/50 bg-card/50 p-3 overflow-y-auto max-h-[calc(100vh-8rem)]">
        <NavLink to="/dashboard/admin" end className={navClass}>Dashboard</NavLink>
        <div className="pt-2 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Management</div>
        <NavLink to="/dashboard/admin/students" className={navClass}>Students</NavLink>
        <NavLink to="/dashboard/admin/teachers" className={navClass}>Teachers</NavLink>
        <NavLink to="/dashboard/admin/parents" className={navClass}>Parents</NavLink>
        <NavLink to="/dashboard/admin/accounts" className={navClass}>Accounts</NavLink>
        <NavLink to="/dashboard/admin/exam-sets" className={navClass}>Exam Sets</NavLink>
        <NavLink to="/dashboard/admin/attendance" className={navClass}>Attendance</NavLink>
        <NavLink to="/dashboard/admin/settings" className={navClass}>Settings</NavLink>
        <div className="pt-2 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reports</div>
        <NavLink to="/dashboard/admin/reports/snapshots" className={navClass}>Snapshots</NavLink>
        <NavLink to="/dashboard/admin/reports/bulk" className={navClass}>Bulk Generate</NavLink>
        <NavLink to="/dashboard/admin/reports/viewer" className={navClass}>Report Viewer</NavLink>
      </nav>
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
