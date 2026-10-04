import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  Users2,
  Bell,
} from 'lucide-react';
import './AdminMobileBottomNav.css';

type Props = {
  notifCount: number | null;
  onPrefetch?: () => void;
};

const HT = '/dashboard/academic-registrar';

export default function HeadTeacherMobileBottomNav({ notifCount, onPrefetch }: Props) {
  const showBadge = notifCount != null && notifCount > 0;
  const badgeText = notifCount != null && notifCount > 99 ? '99+' : String(notifCount ?? '');

  return (
    <nav className="pw-botnav" aria-label="Academic Registrar Mobile Navigation">
      <div className="pw-botnav-items">
        <NavLink
          to={HT}
          end
          onMouseEnter={onPrefetch}
          onTouchStart={onPrefetch}
          aria-label="Dashboard"
          className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}
        >
          <span className="pw-botnav-ic">
            <LayoutDashboard className="w-5 h-5" />
          </span>
          <span className="pw-botnav-label">Home</span>
        </NavLink>

        <NavLink
          to={`${HT}/students`}
          onMouseEnter={onPrefetch}
          onTouchStart={onPrefetch}
          aria-label="Students"
          className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}
        >
          <span className="pw-botnav-ic">
            <GraduationCap className="w-5 h-5" />
          </span>
          <span className="pw-botnav-label">Students</span>
        </NavLink>

        <NavLink
          to={`${HT}/teachers`}
          onMouseEnter={onPrefetch}
          onTouchStart={onPrefetch}
          aria-label="Teachers"
          className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}
        >
          <span className="pw-botnav-ic">
            <BookOpen className="w-5 h-5" />
          </span>
          <span className="pw-botnav-label">Teachers</span>
        </NavLink>

        <NavLink
          to={`${HT}/parents`}
          onMouseEnter={onPrefetch}
          onTouchStart={onPrefetch}
          aria-label="Parents"
          className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}
        >
          <span className="pw-botnav-ic">
            <Users2 className="w-5 h-5" />
          </span>
          <span className="pw-botnav-label">Parents</span>
        </NavLink>

        <NavLink
          to={`${HT}/notifications`}
          onMouseEnter={onPrefetch}
          onTouchStart={onPrefetch}
          aria-label="Alerts"
          className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}
        >
          <span className="pw-botnav-ic">
            <Bell className="w-5 h-5" />
          </span>
          <span className="pw-botnav-label">Alerts</span>
          {showBadge && <span className="pw-botnav-badge">{badgeText}</span>}
        </NavLink>
      </div>
    </nav>
  );
}
