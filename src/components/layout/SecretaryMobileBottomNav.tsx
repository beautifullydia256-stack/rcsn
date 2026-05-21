import { NavLink } from 'react-router-dom';
import './AdminMobileBottomNav.css';

const SEC = '/dashboard/secretary';

export default function SecretaryMobileBottomNav({ notifCount }: { notifCount: number | null }) {
  const badge = notifCount != null && notifCount > 0;
  const badgeText = notifCount != null && notifCount > 99 ? '99+' : String(notifCount ?? '');

  return (
    <nav className="pw-botnav" aria-label="Secretary navigation">
      <div className="pw-botnav-items">
        <NavLink to={SEC} end aria-label="Home" className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}>
          <span className="pw-botnav-ic">
            <svg viewBox="0 0 22 22" fill="none" width="22" height="22" aria-hidden><path d="M3 9L11 3l8 6v10a1.5 1.5 0 01-1.5 1.5H4.5A1.5 1.5 0 013 19V9z" stroke="currentColor" strokeWidth="1.5" /></svg>
          </span>
          <span className="pw-botnav-label">Home</span>
        </NavLink>
        <NavLink to={`${SEC}/students`} aria-label="Students" className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}>
          <span className="pw-botnav-ic">
            <svg viewBox="0 0 22 22" fill="none" width="22" height="22" aria-hidden><path d="M11 11a3 3 0 100-6 3 3 0 000 6zM3 19a8 8 0 0116 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </span>
          <span className="pw-botnav-label">Students</span>
        </NavLink>
        <NavLink to={`${SEC}/visitors`} aria-label="Visitors" className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}>
          <span className="pw-botnav-ic">
            <svg viewBox="0 0 22 22" fill="none" width="22" height="22" aria-hidden><path d="M4 18a7 7 0 0114 0M11 11a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M16 10l2 2-2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </span>
          <span className="pw-botnav-label">Visitors</span>
        </NavLink>
        <NavLink to={`${SEC}/messages`} aria-label="Messages" className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}>
          <span className="pw-botnav-ic">
            <svg viewBox="0 0 22 22" fill="none" width="22" height="22" aria-hidden><path d="M4 4h14a1 1 0 011 1v9a1 1 0 01-1 1H7l-4 4V5a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
          </span>
          <span className="pw-botnav-label">Messages</span>
        </NavLink>
        <NavLink to={`${SEC}/notifications`} aria-label="Alerts" className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}>
          <span className="pw-botnav-ic">
            <svg viewBox="0 0 22 22" fill="none" width="22" height="22" aria-hidden><path d="M11 3a5 5 0 015 5v4l1.5 2.5H5.5L7 12V8a5 5 0 015-5zM9 18a2 2 0 004 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <span className="pw-botnav-label">Alerts</span>
          {badge && <span className="pw-botnav-badge">{badgeText}</span>}
        </NavLink>
      </div>
    </nav>
  );
}
