import { NavLink } from 'react-router-dom';
import './AdminMobileBottomNav.css';

type Props = {
  chatUnread: number | null;
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

function IconClasses() {
  return (
    <svg viewBox="0 0 22 22" fill="none" width="22" height="22" aria-hidden>
      <path
        d="M4 5.5A1.5 1.5 0 015.5 4H15v14H5.5A1.5 1.5 0 014 16.5v-11z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M15 4h1.5A1.5 1.5 0 0118 5.5v11a1.5 1.5 0 01-1.5 1.5H15" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7 8h5M7 11h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconAttendance() {
  return (
    <svg viewBox="0 0 22 22" fill="none" width="22" height="22" aria-hidden>
      <rect x="4" y="4.5" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 8.5h14" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconAssignments() {
  return (
    <svg viewBox="0 0 22 22" fill="none" width="22" height="22" aria-hidden>
      <path
        d="M6 3.5h10a1 1 0 011 1V19l-3-2-3 2-3-2-3 2V4.5a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8 8h6M8 11h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconMessages() {
  return (
    <svg viewBox="0 0 22 22" fill="none" width="22" height="22" aria-hidden>
      <path
        d="M4 6.5A2.5 2.5 0 016.5 4h9A2.5 2.5 0 0118 6.5v6a2.5 2.5 0 01-2.5 2.5H9l-4 3v-3H6.5A2.5 2.5 0 014 12.5v-6z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function TeacherMobileBottomNav({ chatUnread, onPrefetch }: Props) {
  const showBadge = chatUnread != null && chatUnread > 0;
  const badgeText = chatUnread != null && chatUnread > 99 ? '99+' : String(chatUnread ?? '');

  return (
    <nav className="pw-botnav" aria-label="Primary teacher navigation">
      <div className="pw-botnav-items">
        <NavLink
          to="/dashboard/teacher"
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
          to="/dashboard/teacher/classes"
          onMouseEnter={onPrefetch}
          aria-label="Classes"
          className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}
        >
          <span className="pw-botnav-ic">
            <IconClasses />
          </span>
          <span className="pw-botnav-label">Classes</span>
        </NavLink>

        <NavLink
          to="/dashboard/teacher/attendance"
          onMouseEnter={onPrefetch}
          aria-label="Attendance"
          className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}
        >
          <span className="pw-botnav-ic">
            <IconAttendance />
          </span>
          <span className="pw-botnav-label">Attendance</span>
        </NavLink>

        <NavLink
          to="/dashboard/teacher/assignments"
          onMouseEnter={onPrefetch}
          aria-label="Assignments"
          className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}
        >
          <span className="pw-botnav-ic">
            <IconAssignments />
          </span>
          <span className="pw-botnav-label">Assignments</span>
        </NavLink>

        <NavLink
          to="/dashboard/teacher/messages"
          onMouseEnter={onPrefetch}
          aria-label="Messages"
          className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}
        >
          <span className="pw-botnav-ic">
            <IconMessages />
          </span>
          <span className="pw-botnav-label">Messages</span>
          {showBadge && <span className="pw-botnav-badge">{badgeText}</span>}
        </NavLink>
      </div>
    </nav>
  );
}
