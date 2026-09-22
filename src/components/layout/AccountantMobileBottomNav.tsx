import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  CreditCard,
  Users,
  BarChart3,
} from 'lucide-react';
import './AdminMobileBottomNav.css';

type Props = {
  onPrefetch?: () => void;
};

const ACC = '/dashboard/accountant';

export default function AccountantMobileBottomNav({ onPrefetch }: Props) {
  return (
    <nav className="pw-botnav" aria-label="Accountant Mobile Navigation">
      <div className="pw-botnav-items">
        <NavLink
          to={ACC}
          end
          onMouseEnter={onPrefetch}
          onTouchStart={onPrefetch}
          aria-label="Home"
          className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}
        >
          <span className="pw-botnav-ic">
            <LayoutDashboard className="w-5 h-5" />
          </span>
          <span className="pw-botnav-label">Home</span>
        </NavLink>

        <NavLink
          to={`${ACC}/billing`}
          onMouseEnter={onPrefetch}
          onTouchStart={onPrefetch}
          aria-label="Billing"
          className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}
        >
          <span className="pw-botnav-ic">
            <Receipt className="w-5 h-5" />
          </span>
          <span className="pw-botnav-label">Billing</span>
        </NavLink>

        <NavLink
          to={`${ACC}/payments`}
          onMouseEnter={onPrefetch}
          onTouchStart={onPrefetch}
          aria-label="Payments"
          className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}
        >
          <span className="pw-botnav-ic">
            <CreditCard className="w-5 h-5" />
          </span>
          <span className="pw-botnav-label">Payments</span>
        </NavLink>

        <NavLink
          to={`${ACC}/student-ledger`}
          onMouseEnter={onPrefetch}
          onTouchStart={onPrefetch}
          aria-label="Ledger"
          className={({ isActive }) => `pw-botnav-item ${isActive ? 'pw-botnav-item--active' : ''}`}
        >
          <span className="pw-botnav-ic">
            <Users className="w-5 h-5" />
          </span>
          <span className="pw-botnav-label">Ledger</span>
        </NavLink>

        <NavLink
          to={`${ACC}/reports`}
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
      </div>
    </nav>
  );
}
