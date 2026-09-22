import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  Award,
  ClipboardCheck,
} from 'lucide-react';
import './AdminMobileBottomNav.css';

type Props = {
  onPrefetch?: () => void;
};

export default function StudentMobileBottomNav({ onPrefetch }: Props) {
  return (
    <nav className="pw-botnav" aria-label="Student Mobile Navigation">
      <div className="pw-botnav-items">
        <NavLink
          to="/dashboard/student"
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
          to="/dashboard/student/assignments"
          onMouseEnter={onPrefetch}
          onTouchStart={onPrefetch}
          aria-label="Coursework"
          className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}
        >
          <span className="pw-botnav-ic">
            <BookOpen className="w-5 h-5" />
          </span>
          <span className="pw-botnav-label">Coursework</span>
        </NavLink>

        <NavLink
          to="/dashboard/student/timetable"
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
          to="/dashboard/student/results"
          onMouseEnter={onPrefetch}
          onTouchStart={onPrefetch}
          aria-label="Results"
          className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}
        >
          <span className="pw-botnav-ic">
            <Award className="w-5 h-5" />
          </span>
          <span className="pw-botnav-label">Results</span>
        </NavLink>

        <NavLink
          to="/dashboard/student/attendance"
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
