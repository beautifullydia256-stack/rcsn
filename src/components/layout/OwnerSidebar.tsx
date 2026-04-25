import { motion, AnimatePresence } from 'framer-motion';
import { NavLink, useLocation } from 'react-router-dom';

interface OwnerUser {
  name: string;
  email: string;
  initials: string;
}

interface NavItemProps {
  to: string;
  icon: string;
  label: string;
  badge?: string | number;
  badgeColor?: 'teal' | 'amber' | 'rose';
  onClick?: () => void;
  end?: boolean;
}

interface NavGroupProps {
  icon: string;
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  matchPaths?: string[];
  badge?: string | number;
  badgeColor?: 'teal' | 'amber' | 'rose';
}

interface SubItemProps {
  to: string;
  label: string;
  onClick?: () => void;
  end?: boolean;
}

interface OwnerSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  ownerUser: OwnerUser;
  onLogout: () => void;
  // Navigation state
  schoolsOpen: boolean;
  usersOpen: boolean;
  financeOpen: boolean;
  systemOpen: boolean;
  contentOpen: boolean;
  settingsOpen: boolean;
  // Navigation toggles
  setSchoolsOpen: (open: boolean) => void;
  setUsersOpen: (open: boolean) => void;
  setFinanceOpen: (open: boolean) => void;
  setSystemOpen: (open: boolean) => void;
  setContentOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
}

function NavItem({ to, icon, label, badge, badgeColor = 'rose', onClick, end = false }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) => ['ow-nav-link', isActive ? 'ow-nav-link--active' : ''].join(' ')}
    >
      {({ isActive }) => (
        <motion.div
          className="ow-nav-link-content"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <motion.span 
            className="ow-nav-ic"
            animate={{ 
              scale: isActive ? 1.1 : 1,
              rotate: isActive ? [0, -10, 10, 0] : 0
            }}
            transition={{ 
              scale: { type: "spring", stiffness: 300, damping: 20 },
              rotate: { duration: 0.6, ease: "easeInOut" }
            }}
          >
            {icon}
          </motion.span>
          <span className="ow-nav-text">{label}</span>
          <AnimatePresence>
            {badge !== undefined && badge !== null && String(badge) !== '0' && (
              <motion.span 
                className={`ow-nav-badge ow-nav-badge--${badgeColor}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                {badge}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </NavLink>
  );
}

function NavGroup({
  icon,
  label,
  isOpen,
  onToggle,
  children,
  matchPaths = [],
  badge,
  badgeColor = 'rose',
}: NavGroupProps) {
  const location = useLocation();
  const isActive = matchPaths.some((p) => location.pathname.startsWith(p));

  return (
    <div className="ow-nav-group">
      <motion.button
        type="button"
        className={['ow-nav-link', 'ow-nav-group-btn', isActive ? 'ow-nav-link--group-active' : ''].join(' ')}
        onClick={onToggle}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <motion.span 
          className="ow-nav-ic"
          animate={{ 
            scale: isActive ? 1.1 : 1,
            rotate: isActive ? [0, -10, 10, 0] : 0
          }}
          transition={{ 
            scale: { type: "spring", stiffness: 300, damping: 20 },
            rotate: { duration: 0.6, ease: "easeInOut" }
          }}
        >
          {icon}
        </motion.span>
        <span className="ow-nav-text">{label}</span>
        <AnimatePresence>
          {badge !== undefined && badge !== null && String(badge) !== '0' && (
            <motion.span 
              className={`ow-nav-badge ow-nav-badge--${badgeColor}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              {badge}
            </motion.span>
          )}
        </AnimatePresence>
        <motion.span 
          className="ow-nav-chevron"
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          ›
        </motion.span>
      </motion.button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="ow-nav-subitems"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ 
              height: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            style={{ overflow: "hidden" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SubItem({ to, label, onClick, end = false }: SubItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        ['ow-nav-subitem', isActive ? 'ow-nav-subitem--active' : ''].join(' ')
      }
    >
      {({ isActive }) => (
        <motion.div
          className="ow-nav-subitem-content"
          whileHover={{ x: 4, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <motion.span 
            className="ow-nav-sub-dot"
            animate={{ 
              scale: isActive ? 1.3 : 1,
              color: isActive ? "var(--ow-accent)" : "var(--ow-t3)"
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            ·
          </motion.span>
          {label}
        </motion.div>
      )}
    </NavLink>
  );
}

export default function OwnerSidebar({
  isOpen,
  onClose,
  ownerUser,
  onLogout,
  schoolsOpen,
  usersOpen,
  financeOpen,
  systemOpen,
  contentOpen,
  settingsOpen,
  setSchoolsOpen,
  setUsersOpen,
  setFinanceOpen,
  setSystemOpen,
  setContentOpen,
  setSettingsOpen,
}: OwnerSidebarProps) {
  return (
    <>
      <AnimatePresence>
        {isOpen && window.innerWidth <= 768 && (
          <motion.div 
            className="ow-sidebar-overlay" 
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      <motion.aside 
        className="ow-sidebar"
        initial={false}
        animate={{ 
          x: (window.innerWidth <= 768 && !isOpen) ? -280 : 0,
          opacity: (window.innerWidth <= 768 && !isOpen) ? 0.8 : 1
        }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 30,
          opacity: { duration: 0.2 }
        }}
      >
        <motion.div 
          className="ow-brand"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 25 }}
        >
          <motion.div 
            className="ow-brand-logo"
            whileHover={{ 
              scale: 1.1, 
              rotate: [0, -10, 10, 0],
              boxShadow: "0 8px 32px rgba(6,182,212,0.4)"
            }}
            transition={{ 
              scale: { type: "spring", stiffness: 400, damping: 20 },
              rotate: { duration: 0.6, ease: "easeInOut" },
              boxShadow: { duration: 0.3 }
            }}
          >
            👑
          </motion.div>
          <span className="ow-brand-name">PwezaCore</span>
          <motion.span 
            className="ow-brand-pill"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 500, damping: 25 }}
          >
            Owner
          </motion.span>
        </motion.div>

        {/* MAIN Section */}
        <motion.div 
          className="ow-nav-section"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 25 }}
        >
          <span className="ow-nav-label">Main</span>
          <NavItem 
            to="/dashboard/owner" 
            icon="📊" 
            label="Dashboard" 
            end 
            onClick={onClose} 
          />
          <NavItem 
            to="/dashboard/owner/notifications" 
            icon="🔔" 
            label="Notifications" 
            onClick={onClose} 
          />
        </motion.div>

        {/* SCHOOLS Section */}
        <motion.div 
          className="ow-nav-section"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 25 }}
        >
          <span className="ow-nav-label">Schools</span>
          <NavGroup
            icon="🏫"
            label="Schools"
            isOpen={schoolsOpen}
            onToggle={() => setSchoolsOpen(!schoolsOpen)}
            matchPaths={['/dashboard/owner/schools']}
          >
            <SubItem to="/dashboard/owner/schools" label="All Schools" end onClick={onClose} />
            <SubItem to="/dashboard/owner/schools/add" label="Add School" onClick={onClose} />
            <SubItem to="/dashboard/owner/schools/requests" label="School Requests" onClick={onClose} />
            <SubItem to="/dashboard/owner/schools/suspended" label="Suspended Schools" onClick={onClose} />
          </NavGroup>
        </motion.div>

        {/* USERS Section */}
        <motion.div 
          className="ow-nav-section"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 300, damping: 25 }}
        >
          <span className="ow-nav-label">Users</span>
          <NavGroup
            icon="👥"
            label="Users"
            isOpen={usersOpen}
            onToggle={() => setUsersOpen(!usersOpen)}
            matchPaths={['/dashboard/owner/users']}
          >
            <SubItem to="/dashboard/owner/users" label="All Users" end onClick={onClose} />
            <SubItem to="/dashboard/owner/users/admins" label="Admins" onClick={onClose} />
            <SubItem to="/dashboard/owner/users/roles" label="User Roles" onClick={onClose} />
            <SubItem to="/dashboard/owner/users/activity" label="Login Activity" onClick={onClose} />
          </NavGroup>
        </motion.div>

        {/* FINANCE Section */}
        <motion.div 
          className="ow-nav-section"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 300, damping: 25 }}
        >
          <span className="ow-nav-label">Finance</span>
          <NavGroup
            icon="💰"
            label="Finance"
            isOpen={financeOpen}
            onToggle={() => setFinanceOpen(!financeOpen)}
            matchPaths={['/dashboard/owner/finance']}
          >
            <SubItem to="/dashboard/owner/finance" label="Revenue Overview" end onClick={onClose} />
            <SubItem to="/dashboard/owner/finance/subscriptions" label="Subscriptions" onClick={onClose} />
            <SubItem to="/dashboard/owner/finance/invoices" label="Invoices" onClick={onClose} />
            <SubItem to="/dashboard/owner/finance/payouts" label="Payouts" onClick={onClose} />
          </NavGroup>
        </motion.div>

        {/* SYSTEM Section */}
        <motion.div 
          className="ow-nav-section"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.6, type: "spring", stiffness: 300, damping: 25 }}
        >
          <span className="ow-nav-label">System</span>
          <NavGroup
            icon="⚙️"
            label="System"
            isOpen={systemOpen}
            onToggle={() => setSystemOpen(!systemOpen)}
            matchPaths={['/dashboard/owner/system']}
          >
            <SubItem to="/dashboard/owner/system/database" label="Database Health" onClick={onClose} />
            <SubItem to="/dashboard/owner/system/storage" label="Storage Usage" onClick={onClose} />
            <SubItem to="/dashboard/owner/system/api" label="API Usage" onClick={onClose} />
            <SubItem to="/dashboard/owner/system/errors" label="Error Logs" onClick={onClose} />
            <SubItem to="/dashboard/owner/system/audit" label="Audit Log" onClick={onClose} />
          </NavGroup>
        </motion.div>

        {/* CONTENT Section */}
        <motion.div 
          className="ow-nav-section"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.7, type: "spring", stiffness: 300, damping: 25 }}
        >
          <span className="ow-nav-label">Content</span>
          <NavGroup
            icon="📢"
            label="Content"
            isOpen={contentOpen}
            onToggle={() => setContentOpen(!contentOpen)}
            matchPaths={['/dashboard/owner/content']}
          >
            <SubItem to="/dashboard/owner/content/announcements" label="Announcements" onClick={onClose} />
            <SubItem to="/dashboard/owner/content/support" label="Support Tickets" onClick={onClose} />
            <SubItem to="/dashboard/owner/content/features" label="Feature Flags" onClick={onClose} />
          </NavGroup>
        </motion.div>

        {/* SETTINGS Section */}
        <motion.div 
          className="ow-nav-section"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.8, type: "spring", stiffness: 300, damping: 25 }}
        >
          <span className="ow-nav-label">Settings</span>
          <NavGroup
            icon="🔧"
            label="Settings"
            isOpen={settingsOpen}
            onToggle={() => setSettingsOpen(!settingsOpen)}
            matchPaths={['/dashboard/owner/settings']}
          >
            <SubItem to="/dashboard/owner/settings/platform" label="Platform Settings" onClick={onClose} />
            <SubItem to="/dashboard/owner/settings/billing" label="Billing Plans" onClick={onClose} />
            <SubItem to="/dashboard/owner/settings/security" label="Security" onClick={onClose} />
            <SubItem to="/dashboard/owner/settings/backup" label="Backup & Recovery" onClick={onClose} />
            <SubItem to="/dashboard/owner/referral-codes" label="Referral Codes" onClick={onClose} />
          </NavGroup>
        </motion.div>

        <motion.div 
          className="ow-sidebar-bottom"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9, type: "spring", stiffness: 300, damping: 25 }}
        >
          <motion.div 
            className="ow-owner-card"
            whileHover={{ 
              scale: 1.02,
              borderColor: "var(--ow-bh)",
              boxShadow: "0 8px 32px rgba(6,182,212,0.15)"
            }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <motion.div 
              className="ow-owner-av"
              whileHover={{ 
                scale: 1.1,
                boxShadow: "0 4px 16px rgba(6,182,212,0.3)"
              }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              {ownerUser.initials}
            </motion.div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="ow-owner-name">{ownerUser.name}</div>
              <div className="ow-owner-role">Platform Owner</div>
            </div>
            <span style={{ color: 'var(--ow-t3)', fontSize: '13px', flexShrink: 0 }}>⋯</span>
          </motion.div>
          <motion.button 
            type="button" 
            className="ow-logout-btn" 
            onClick={onLogout}
            whileHover={{ 
              scale: 1.02,
              backgroundColor: "rgba(239,68,68,0.15)"
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <span className="ow-nav-ic">🚪</span>
            Logout
          </motion.button>
        </motion.div>
      </motion.aside>
    </>
  );
}