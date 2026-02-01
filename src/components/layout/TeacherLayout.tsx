import { Suspense } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import TeacherContentSkeleton from './TeacherContentSkeleton';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  }`;

/** Layout stays mounted; only <Outlet /> content updates on navigation (SPA-style). */
export default function TeacherLayout() {
  return (
    <div className="flex gap-6 p-4">
      <nav className="w-52 shrink-0 space-y-1 rounded-lg border border-border/50 bg-card/50 p-3 overflow-y-auto max-h-[calc(100vh-8rem)]">
        <NavLink to="/dashboard/teacher" end className={navClass}>Dashboard</NavLink>
        <NavLink to="/dashboard/teacher/students" className={navClass}>Students</NavLink>
        <NavLink to="/dashboard/teacher/classes" className={navClass}>Classes</NavLink>
        <NavLink to="/dashboard/teacher/exam-results" className={navClass}>Exam Results</NavLink>
        <NavLink to="/dashboard/teacher/attendance" className={navClass}>Attendance</NavLink>
        <NavLink to="/dashboard/teacher/timetable" className={navClass}>Timetable</NavLink>
        <NavLink to="/dashboard/teacher/settings" className={navClass}>Settings</NavLink>
      </nav>
      <main className="min-w-0 flex-1">
        <Suspense fallback={<TeacherContentSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
