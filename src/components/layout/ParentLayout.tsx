import { Suspense, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { Outlet, matchPath, useLocation, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Home,
  MessageSquare,
  Megaphone,
  BarChart3,
  ClipboardList,
  Calendar,
  PenTool,
  FileText,
  CreditCard,
  Receipt,
  User,
  Settings,
  LogOut,
  Menu,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { markChatPresenceOffline } from '@/lib/schoolChatApi';
import { useSchoolChatUnreadTotal } from '@/hooks/useSchoolChatUnreadTotal';
import { ParentPortalProvider, useParentPortal } from '@/context/ParentPortalContext';
import { PARENT_PORTAL_SCOPED_STYLE } from '@/lib/parentPortalAssets';
import { displayStudentName } from '@/lib/parentPortalUtils';
import { useSchoolType } from '@/hooks/useSchoolType';

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap';

function navClass(isActive: boolean) {
  return 'pd-nav-item' + (isActive ? ' active' : '');
}

/** Keeps sidebar + top bar visible while lazy child routes load (avoids full-app ThemedLoadingView). */
function ParentOutletFallback() {
  return (
    <div
      className="pd-outlet-fallback"
      style={{
        padding: '28px 24px 40px',
        color: 'var(--t2)',
        fontSize: 14,
        maxWidth: 480,
      }}
    >
      <div
        style={{
          fontFamily: "'Instrument Serif', serif",
          fontSize: 20,
          color: 'var(--t1)',
          marginBottom: 6,
          letterSpacing: '-0.02em',
        }}
      >
        Loading…
      </div>
      <div style={{ opacity: 0.85 }}>Preparing this section.</div>
    </div>
  );
}

function ParentNavButton({
  to,
  end = false,
  onAfterClick,
  children,
}: {
  to: string;
  end?: boolean;
  onAfterClick?: () => void;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isActive = matchPath({ path: to, end }, pathname) != null;

  return (
    <button
      type="button"
      className={navClass(isActive)}
      onClick={() => {
        onAfterClick?.();
        navigate(to);
      }}
    >
      {children}
    </button>
  );
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
    userId,
  } = useParentPortal();
  const { isTertiary } = useSchoolType();

  const chatUnread = useSchoolChatUnreadTotal(userId);
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

  /** Warm lazy chunks so first nav under Overview rarely suspends at the app root. */
  useEffect(() => {
    void import('@/pages/chat/SchoolChatPage');
    void import('@/pages/parent/DesignParentDashboard');
    void import('@/pages/parent/ParentNoticesPage');
    void import('@/pages/parent/ParentPerformancePage');
    void import('@/pages/parent/ParentAttendancePage');
    void import('@/pages/parent/ParentTimetablePage');
    void import('@/pages/parent/ParentExamsPage');
    void import('@/pages/parent/ParentReportsPage');
    void import('@/pages/parent/ParentFeesPage');
    void import('@/pages/parent/ParentReceiptsPage');
    void import('@/pages/parent/ParentProfilePage');
    void import('@/pages/parent/ParentSettingsPage');
  }, []);

  const isOnMessages = location.pathname.startsWith('/dashboard/parent/messages');

  return (
    <>
      <style>{PARENT_PORTAL_SCOPED_STYLE}</style>
      <div className="pw-parent" data-pw-parent-shell data-theme="dark" data-layout="parent-portal">
        <div
          className="pd-shell"
          style={isOnMessages ? { height: '100dvh', maxHeight: '100dvh', overflow: 'hidden' } : undefined}
        >
          <aside className={'pd-sidebar' + (sidebarOpen ? ' open' : '')} id="pd-sidebar">
            <div className="pd-brand">
              <div className="pd-brand-mark">
                <GraduationCap className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="pd-brand-name">PwezaCore</div>
                <div className="pd-brand-role">{isTertiary ? 'Parent & Sponsor Portal' : 'Parent Portal'}</div>
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
                <div className="pd-user-role">{isTertiary ? 'Parent / Sponsor / Guardian' : 'Parent / Guardian'}</div>
              </div>
            </div>

            <div className="pd-child-switch">
              <div className="pd-cs-label">{isTertiary ? 'Sponsored Students / Trainees' : 'My Children'}</div>
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
                <ParentNavButton to="/dashboard/parent" end onAfterClick={() => setSidebarOpen(false)}>
                  <span className="pd-nav-ic"><Home className="w-4 h-4" /></span>Dashboard
                </ParentNavButton>
                <ParentNavButton to="/dashboard/parent/messages" onAfterClick={() => setSidebarOpen(false)}>
                  <span className="pd-nav-ic"><MessageSquare className="w-4 h-4" /></span>Messages
                  {chatUnread > 0 ? (
                    <span className="pd-nav-badge" id="pd-chat-unread-badge" style={{ display: 'flex' }}>
                      {chatUnread > 99 ? '99+' : chatUnread}
                    </span>
                  ) : (
                    <span className="pd-nav-badge" id="pd-chat-unread-badge" style={{ display: 'none' }}>
                      0
                    </span>
                  )}
                </ParentNavButton>
                <ParentNavButton to="/dashboard/parent/notices" onAfterClick={() => setSidebarOpen(false)}>
                  <span className="pd-nav-ic"><Megaphone className="w-4 h-4" /></span>School Notices
                </ParentNavButton>
              </div>

              <div className="pd-nav-section">
                <div className="pd-nav-label">{isTertiary ? 'Student / Trainee' : 'My Child'}</div>
                <ParentNavButton to="/dashboard/parent/performance" onAfterClick={() => setSidebarOpen(false)}>
                  <span className="pd-nav-ic"><BarChart3 className="w-4 h-4" /></span>Performance
                </ParentNavButton>
                <ParentNavButton to="/dashboard/parent/attendance" onAfterClick={() => setSidebarOpen(false)}>
                  <span className="pd-nav-ic"><ClipboardList className="w-4 h-4" /></span>Attendance
                </ParentNavButton>
                <ParentNavButton to="/dashboard/parent/timetable" onAfterClick={() => setSidebarOpen(false)}>
                  <span className="pd-nav-ic"><Calendar className="w-4 h-4" /></span>{isTertiary ? 'Lecture & Rotation Schedule' : 'Timetable'}
                </ParentNavButton>
                <ParentNavButton to="/dashboard/parent/exams" onAfterClick={() => setSidebarOpen(false)}>
                  <span className="pd-nav-ic"><PenTool className="w-4 h-4" /></span>{isTertiary ? 'Semester & UNMEB Results' : 'Exams & Results'}
                </ParentNavButton>
                <ParentNavButton to="/dashboard/parent/reports" onAfterClick={() => setSidebarOpen(false)}>
                  <span className="pd-nav-ic"><FileText className="w-4 h-4" /></span>{isTertiary ? 'Semester Result Slips & Transcripts' : 'Report Cards'}
                </ParentNavButton>
              </div>

              <div className="pd-nav-section">
                <div className="pd-nav-label">Finance</div>
                <ParentNavButton to="/dashboard/parent/fees" onAfterClick={() => setSidebarOpen(false)}>
                  <span className="pd-nav-ic"><CreditCard className="w-4 h-4" /></span>Fees &amp; Payments
                </ParentNavButton>
                <ParentNavButton to="/dashboard/parent/receipts" onAfterClick={() => setSidebarOpen(false)}>
                  <span className="pd-nav-ic"><Receipt className="w-4 h-4" /></span>Receipts
                </ParentNavButton>
              </div>

              <div className="pd-nav-section">
                <div className="pd-nav-label">Account</div>
                <ParentNavButton to="/dashboard/parent/profile" onAfterClick={() => setSidebarOpen(false)}>
                  <span className="pd-nav-ic"><User className="w-4 h-4" /></span>My Profile
                </ParentNavButton>
                <ParentNavButton to="/dashboard/parent/settings" onAfterClick={() => setSidebarOpen(false)}>
                  <span className="pd-nav-ic"><Settings className="w-4 h-4" /></span>Settings
                </ParentNavButton>
              </div>
            </nav>

            <div className="pd-sidebar-footer">
              <button
                type="button"
                className="pd-footer-btn"
                id="pd-btn-logout"
                onClick={async () => {
                  await markChatPresenceOffline();
                  await supabase.auth.signOut();
                  navigate('/login');
                }}
              >
                <span className="pd-nav-ic"><LogOut className="w-4 h-4" /></span>Sign Out
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
                <Menu className="w-5 h-5" />
              </button>
              <span className="pd-topbar-title">PwezaCore</span>
              <div className="pd-topbar-av" id="pd-topbar-av">
                {parentInitialsStr}
              </div>
            </div>

            <div
              className="pd-content"
              style={isOnMessages ? { flex: 1, minHeight: 0, overflow: 'hidden', padding: 0, display: 'flex', flexDirection: 'column' } : undefined}
            >
              <Suspense fallback={<ParentOutletFallback />}>
                <Outlet />
              </Suspense>
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
