import { useEffect, useLayoutEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ParentPortalProvider, useParentPortal } from '@/context/ParentPortalContext';
import { PARENT_PORTAL_SCOPED_STYLE } from '@/lib/parentPortalAssets';
import { displayStudentName } from '@/lib/parentPortalUtils';

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap';

function navClass({ isActive }: { isActive: boolean }) {
  return 'pd-nav-item' + (isActive ? ' active' : '');
}

function ParentChrome() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    parentNameFull,
    parentInitialsStr,
    children,
    activeStudentId,
    setActiveStudentId,
    unreadInbox,
  } = useParentPortal();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useLayoutEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
    document.body.style.overflow = '';
  }, [location.pathname]);

  useEffect(() => {
    const mobile = typeof window !== 'undefined' && window.matchMedia('(max-width:768px)').matches;
    if (sidebarOpen && mobile) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  return (
    <>
      <style>{PARENT_PORTAL_SCOPED_STYLE}</style>
      <div className="pw-parent" data-pw-parent-shell data-theme="dark" data-layout="parent-portal">
        <div className="pd-shell">
          <aside className={'pd-sidebar' + (sidebarOpen ? ' open' : '')} id="pd-sidebar">
            <div className="pd-brand">
              <div className="pd-brand-mark">🎓</div>
              <div>
                <div className="pd-brand-name">PwezaCore</div>
                <div className="pd-brand-role">Parent Portal</div>
              </div>
            </div>

            <div className="pd-user-card">
              <div className="pd-user-av" id="pd-parent-initials">
                {parentInitialsStr}
              </div>
              <div>
                <div className="pd-user-name" id="pd-parent-name">
                  {parentNameFull || '—'}
                </div>
                <div className="pd-user-role">Parent / Guardian</div>
              </div>
            </div>

            <div className="pd-child-switch">
              <div className="pd-cs-label">My Children</div>
              <div className="pd-child-tabs" id="pd-child-tabs">
                {children.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--t3)', padding: 4 }}>No children linked yet.</div>
                ) : (
                  children.map((c) => (
                    <div
                      key={c.student_id}
                      className={'pd-child-tab' + (activeStudentId === c.student_id ? ' active' : '')}
                      role="button"
                      tabIndex={0}
                      onClick={() => setActiveStudentId(c.student_id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setActiveStudentId(c.student_id);
                        }
                      }}
                    >
                      <div className="pd-child-dot" />
                      {displayStudentName(c)}
                    </div>
                  ))
                )}
              </div>
            </div>

            <nav className="pd-nav">
              <div className="pd-nav-section">
                <div className="pd-nav-label">Overview</div>
                <NavLink to="/dashboard/parent" end className={navClass} onClick={() => setSidebarOpen(false)}>
                  <span className="pd-nav-ic">🏠</span>Dashboard
                </NavLink>
                <NavLink
                  to="/dashboard/parent/messages"
                  className={navClass}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="pd-nav-ic">💬</span>Messages
                  {unreadInbox > 0 ? (
                    <span className="pd-nav-badge" id="pd-notif-badge" style={{ display: 'flex' }}>
                      {unreadInbox > 99 ? '99+' : unreadInbox}
                    </span>
                  ) : (
                    <span className="pd-nav-badge" id="pd-notif-badge" style={{ display: 'none' }}>
                      0
                    </span>
                  )}
                </NavLink>
                <NavLink to="/dashboard/parent/notices" className={navClass} onClick={() => setSidebarOpen(false)}>
                  <span className="pd-nav-ic">📢</span>School Notices
                </NavLink>
              </div>

              <div className="pd-nav-section">
                <div className="pd-nav-label">My Child</div>
                <NavLink to="/dashboard/parent/performance" className={navClass} onClick={() => setSidebarOpen(false)}>
                  <span className="pd-nav-ic">📊</span>Performance
                </NavLink>
                <NavLink to="/dashboard/parent/attendance" className={navClass} onClick={() => setSidebarOpen(false)}>
                  <span className="pd-nav-ic">📋</span>Attendance
                </NavLink>
                <NavLink to="/dashboard/parent/timetable" className={navClass} onClick={() => setSidebarOpen(false)}>
                  <span className="pd-nav-ic">📅</span>Timetable
                </NavLink>
                <NavLink to="/dashboard/parent/exams" className={navClass} onClick={() => setSidebarOpen(false)}>
                  <span className="pd-nav-ic">✏️</span>Exams &amp; Results
                </NavLink>
                <NavLink to="/dashboard/parent/reports" className={navClass} onClick={() => setSidebarOpen(false)}>
                  <span className="pd-nav-ic">📄</span>Report Cards
                </NavLink>
              </div>

              <div className="pd-nav-section">
                <div className="pd-nav-label">Finance</div>
                <NavLink to="/dashboard/parent/fees" className={navClass} onClick={() => setSidebarOpen(false)}>
                  <span className="pd-nav-ic">💳</span>Fees &amp; Payments
                </NavLink>
                <NavLink to="/dashboard/parent/receipts" className={navClass} onClick={() => setSidebarOpen(false)}>
                  <span className="pd-nav-ic">🧾</span>Receipts
                </NavLink>
              </div>

              <div className="pd-nav-section">
                <div className="pd-nav-label">Account</div>
                <NavLink to="/dashboard/parent/profile" className={navClass} onClick={() => setSidebarOpen(false)}>
                  <span className="pd-nav-ic">👤</span>My Profile
                </NavLink>
                <NavLink to="/dashboard/parent/settings" className={navClass} onClick={() => setSidebarOpen(false)}>
                  <span className="pd-nav-ic">⚙️</span>Settings
                </NavLink>
              </div>
            </nav>

            <div className="pd-sidebar-footer">
              <button
                type="button"
                className="pd-footer-btn"
                id="pd-btn-logout"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate('/login');
                }}
              >
                <span className="pd-nav-ic">🚪</span>Sign Out
              </button>
            </div>
          </aside>

          <div
            className={'pd-overlay' + (sidebarOpen ? ' open' : '')}
            id="pd-overlay"
            role="presentation"
            aria-hidden={!sidebarOpen}
            onClick={() => setSidebarOpen(false)}
          />

          <main className="pd-main">
            <div className="pd-topbar">
              <button
                type="button"
                className="pd-hamburger"
                id="pd-hamburger"
                aria-label="Open menu"
                aria-expanded={sidebarOpen}
                onClick={() => setSidebarOpen((o) => !o)}
              >
                ☰
              </button>
              <span className="pd-topbar-title">PwezaCore</span>
              <div className="pd-topbar-av" id="pd-topbar-av">
                {parentInitialsStr}
              </div>
            </div>

            <div className="pd-content">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

/** Persistent parent shell (sidebar + top bar); child routes render in the outlet like teacher/admin. */
export default function ParentLayout() {
  return (
    <ParentPortalProvider>
      <ParentChrome />
    </ParentPortalProvider>
  );
}
