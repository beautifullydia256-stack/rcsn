import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  FileEdit,
  BarChart3,
  ClipboardCheck,
} from 'lucide-react';
import './AdminMobileBottomNav.css';

type Props = {
  notifCount?: number | null;
  onPrefetch?: () => void;
};

const DOS_BASE = '/dashboard/dos';

export default function DosMobileBottomNav({ onPrefetch }: Props) {
  return (
    <nav className="pw-botnav" aria-label="DOS Mobile Navigation">
      <div className="pw-botnav-items">
        <NavLink
          to={DOS_BASE}
          end
          onMouseEnter={onPrefetch}
          onTouchStart={onPrefetch}
          aria-label="Dashboard"
          className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}
        >
          <span className="pw-botnav-ic">
            <LayoutDashboard className="w-5 h-5" />
          </span>
          <span className="pw-botnav-label">Dashboard</span>
        </NavLink>

        <NavLink
          to={`${DOS_BASE}/timetable`}
          onMouseEnter={onPrefetch}
          onTouchStart={onPrefetch}
          aria-label="Timetable"
          className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}
        >
          <span className="pw-botnav-ic">
            <Calendar className="w-5 h-5" />
          </span>
          <span className="pw-botnav-label">Timetable</span>
        </NavLink>

        <NavLink
          to={`${DOS_BASE}/exam-sets`}
          onMouseEnter={onPrefetch}
          onTouchStart={onPrefetch}
          aria-label="Exam Sets"
          className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}
        >
          <span className="pw-botnav-ic">
            <FileEdit className="w-5 h-5" />
          </span>
          <span className="pw-botnav-label">Exam Sets</span>
        </NavLink>

        <NavLink
          to={`${DOS_BASE}/reports`}
          onMouseEnter={onPrefetch}
          onTouchStart={onPrefetch}
          aria-label="Reports"
          className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}
        >
          <span className="pw-botnav-ic">
            <BarChart3 className="w-5 h-5" />
          </span>
          <span className="pw-botnav-label">Reports</span>
        </NavLink>

        <NavLink
          to={`${DOS_BASE}/attendance`}
          onMouseEnter={onPrefetch}
          onTouchStart={onPrefetch}
          aria-label="Attendance"
          className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}
        >
          <span className="pw-botnav-ic">
            <ClipboardCheck className="w-5 h-5" />
          </span>
          <span className="pw-botnav-label">Attendance</span>
        </NavLink>
      </div>
    </nav>
  );
}
