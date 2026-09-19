import { NavLink } from 'react-router-dom';
import { useSchoolType } from '@/hooks/useSchoolType';
import './AdminMobileBottomNav.css';

type Props = {
  notifCount: number | null;
  onPrefetch?: () => void;
};

function IconHome() {
  return (
    <svg viewBox="0 0 22 22" fill="none" width="22" height="22" aria-hidden>
      <path
        d="M3 9L11 3l8 6v10a1.5 1.5 0 01-1.5 1.5H4.5A1.5 1.5 0 013 19V9z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function IconStudents() {
  return (
    <svg viewBox="0 0 22 22" fill="none" width="22" height="22" aria-hidden>
      <path
        d="M11 11a3 3 0 100-6 3 3 0 000 6zM3 19a8 8 0 0116 0M16 8a3 3 0 11-6 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconTeachers() {
  return (
    <svg viewBox="0 0 22 22" fill="none" width="22" height="22" aria-hidden>
      <path
        d="M5 17V8l-1 1h14l-1-1v9M5 17h12M9 5h4l1 2H8l1-2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 11h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconParents() {
  return (
    <svg viewBox="0 0 22 22" fill="none" width="22" height="22" aria-hidden>
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="14" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M2 20c0-3 2.5-5 6-5m6 5c0-3-2.5-5-6-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconBell() {
  return (
    <svg viewBox="0 0 22 22" fill="none" width="22" height="22" aria-hidden>
      <path
        d="M11 3a5 5 0 015 5v4l1.5 2.5H5.5L7 12V8a5 5 0 015-5zM9 18a2 2 0 004 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function AdminMobileBottomNav({ notifCount, onPrefetch }: Props) {
  const { isTertiary } = useSchoolType();
  const showBadge = notifCount != null && notifCount > 0;
  const badgeText = notifCount != null && notifCount > 99 ? '99+' : String(notifCount ?? '');

  return (
    <nav className="pw-botnav" aria-label="Primary admin navigation">
      <div className="pw-botnav-items">
        <NavLink
          to="/dashboard/admin"
          end
          onMouseEnter={onPrefetch}
          aria-label="Home"
          className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}
        >
          <span className="pw-botnav-ic">
            <IconHome />
          </span>
          <span className="pw-botnav-label">Home</span>
        </NavLink>

        <NavLink
          to="/dashboard/admin/students"
          onMouseEnter={onPrefetch}
          aria-label="Students"
          className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}
        >
          <span className="pw-botnav-ic">
            <IconStudents />
          </span>
          <span className="pw-botnav-label">Students</span>
        </NavLink>

        <NavLink
          to="/dashboard/admin/teachers"
          onMouseEnter={onPrefetch}
          aria-label={isTertiary ? "Tutors" : "Teachers"}
          className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}
        >
          <span className="pw-botnav-ic">
            <IconTeachers />
          </span>
          <span className="pw-botnav-label">{isTertiary ? "Tutors" : "Teachers"}</span>
        </NavLink>

        <NavLink
          to="/dashboard/admin/parents"
          onMouseEnter={onPrefetch}
          aria-label="Parents"
          className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}
        >
          <span className="pw-botnav-ic">
            <IconParents />
          </span>
          <span className="pw-botnav-label">Parents</span>
        </NavLink>

        <NavLink
          to="/dashboard/admin/notifications"
          onMouseEnter={onPrefetch}
          aria-label="Alerts"
          className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}
        >
          <span className="pw-botnav-ic">
            <IconBell />
          </span>
          <span className="pw-botnav-label">Alerts</span>
          {showBadge && <span className="pw-botnav-badge">{badgeText}</span>}
        </NavLink>
      </div>
    </nav>
  );
}
