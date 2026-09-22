import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  BarChart3,
  ClipboardList,
  CreditCard,
  MessageSquare,
} from 'lucide-react';
import './AdminMobileBottomNav.css';

type Props = {
  chatUnread?: number | null;
  onPrefetch?: () => void;
};

export default function ParentMobileBottomNav({ chatUnread, onPrefetch }: Props) {
  const showBadge = chatUnread != null && chatUnread > 0;
  const badgeText = chatUnread != null && chatUnread > 99 ? '99+' : String(chatUnread ?? '');

  return (
    <nav className="pw-botnav" aria-label="Parent Mobile Navigation">
      <div className="pw-botnav-items">
        <NavLink
          to="/dashboard/parent"
          end
          onMouseEnter={onPrefetch}
          onTouchStart={onPrefetch}
          aria-label="Home"
          className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}
        >
          <span className="pw-botnav-ic">
            <Home className="w-5 h-5" />
          </span>
          <span className="pw-botnav-label">Home</span>
        </NavLink>

        <NavLink
          to="/dashboard/parent/performance"
          onMouseEnter={onPrefetch}
          onTouchStart={onPrefetch}
          aria-label="Academics"
          className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}
        >
          <span className="pw-botnav-ic">
            <BarChart3 className="w-5 h-5" />
          </span>
          <span className="pw-botnav-label">Academics</span>
        </NavLink>

        <NavLink
          to="/dashboard/parent/attendance"
          onMouseEnter={onPrefetch}
          onTouchStart={onPrefetch}
          aria-label="Attendance"
          className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}
        >
          <span className="pw-botnav-ic">
            <ClipboardList className="w-5 h-5" />
          </span>
          <span className="pw-botnav-label">Attendance</span>
        </NavLink>

        <NavLink
          to="/dashboard/parent/fees"
          onMouseEnter={onPrefetch}
          onTouchStart={onPrefetch}
          aria-label="Fees"
          className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}
        >
          <span className="pw-botnav-ic">
            <CreditCard className="w-5 h-5" />
          </span>
          <span className="pw-botnav-label">Fees</span>
        </NavLink>

        <NavLink
          to="/dashboard/parent/messages"
          onMouseEnter={onPrefetch}
          onTouchStart={onPrefetch}
          aria-label="Messages"
          className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}
        >
          <span className="pw-botnav-ic">
            <MessageSquare className="w-5 h-5" />
          </span>
          <span className="pw-botnav-label">Messages</span>
          {showBadge && <span className="pw-botnav-badge">{badgeText}</span>}
        </NavLink>
      </div>
    </nav>
  );
}
