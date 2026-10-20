import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Monitor, Wrench, Mail, CalendarCheck } from 'lucide-react';
import './AdminMobileBottomNav.css';

interface IctMobileBottomNavProps {
  openTicketCount?: number;
  unreadEmailCount?: number;
  onPrefetch?: () => void;
}

export default function IctMobileBottomNav({
  openTicketCount = 0,
  unreadEmailCount = 0,
  onPrefetch,
}: IctMobileBottomNavProps) {
  const showTicketBadge = openTicketCount > 0;
  const ticketBadgeText = openTicketCount > 99 ? '99+' : String(openTicketCount);

  const showEmailBadge = unreadEmailCount > 0;
  const emailBadgeText = unreadEmailCount > 99 ? '99+' : String(unreadEmailCount);

  return (
    <nav className="pw-botnav" aria-label="Primary ICT mobile navigation">
      <div className="pw-botnav-items">
        {/* 1. Control Centre */}
        <NavLink
          to="/dashboard/ict"
          end
          onMouseEnter={onPrefetch}
          aria-label="Control Centre"
          className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}
        >
          <span className="pw-botnav-ic">
            <LayoutDashboard className="h-5 w-5" />
          </span>
          <span className="pw-botnav-label">Control</span>
        </NavLink>

        {/* 2. Official Mailbox */}
        <NavLink
          to="/dashboard/ict/email"
          onMouseEnter={onPrefetch}
          aria-label="Official Mailbox"
          className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}
        >
          <span className="pw-botnav-ic">
            <Mail className="h-5 w-5" />
          </span>
          <span className="pw-botnav-label">Mailbox</span>
          {showEmailBadge && <span className="pw-botnav-badge">{emailBadgeText}</span>}
        </NavLink>

        {/* 3. Lab PCs */}
        <NavLink
          to="/dashboard/ict/workstations"
          onMouseEnter={onPrefetch}
          aria-label="Lab Workstations"
          className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}
        >
          <span className="pw-botnav-ic">
            <Monitor className="h-5 w-5" />
          </span>
          <span className="pw-botnav-label">Lab PCs</span>
        </NavLink>

        {/* 4. Helpdesk & Hardware */}
        <NavLink
          to="/dashboard/ict/helpdesk"
          onMouseEnter={onPrefetch}
          aria-label="Helpdesk"
          className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}
        >
          <span className="pw-botnav-ic">
            <Wrench className="h-5 w-5" />
          </span>
          <span className="pw-botnav-label">Helpdesk</span>
          {showTicketBadge && (
            <span
              className="pw-botnav-badge"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.45)',
              }}
            >
              {ticketBadgeText}
            </span>
          )}
        </NavLink>

        {/* 5. Lab Schedule */}
        <NavLink
          to="/dashboard/ict/schedule"
          onMouseEnter={onPrefetch}
          aria-label="Lab Schedule"
          className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}
        >
          <span className="pw-botnav-ic">
            <CalendarCheck className="h-5 w-5" />
          </span>
          <span className="pw-botnav-label">Schedule</span>
        </NavLink>
      </div>
    </nav>
  );
}

