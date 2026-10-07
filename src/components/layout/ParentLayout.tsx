import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
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
  X,
  Sun,
  Moon,
  ChevronDown,
  BookOpen,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logoutWithSyncCheck } from '@/lib/logoutWithSyncCheck';
import { useSchoolChatUnreadTotal } from '@/hooks/useSchoolChatUnreadTotal';
import ParentMobileBottomNav from './ParentMobileBottomNav';
import { ParentPortalProvider, useParentPortal } from '@/context/ParentPortalContext';
import { displayStudentName } from '@/lib/parentPortalUtils';
import { useSchoolType } from '@/hooks/useSchoolType';
import { useUIStore } from '@/store/uiStore';
import { getTokens, cardGrad, SORA, INTER } from '@/styles/posThemeTokens';

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

  const isDark = useUIStore((s) => s.theme === 'dark');
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const t = getTokens(isDark);

  const chatUnread = useSchoolChatUnreadTotal(userId);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [childDropdownOpen, setChildDropdownOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const activeChild = children.find((c) => c.student_id === activeStudentId) || children[0] || null;

  const handleLogout = () => {
    void logoutWithSyncCheck(() => navigate('/'));
  };

  interface ParentNavItem {
    to: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    end?: boolean;
    badge?: number;
  }

  interface ParentNavSection {
    title: string;
    items: ParentNavItem[];
  }

  const navSections: ParentNavSection[] = [
    {
      title: 'Overview',
      items: [
        { to: '/dashboard/parent', label: 'Dashboard', icon: Home, end: true },
        { to: '/dashboard/parent/profile', label: 'My Profile', icon: User },
      ],
    },
    {
      title: 'Finances & Fees',
      items: [
        { to: '/dashboard/parent/fees', label: 'Fees & Ledger', icon: CreditCard },
        { to: '/dashboard/parent/receipts', label: 'Payment Receipts', icon: Receipt },
      ],
    },
    {
      title: 'Academic Progress',
      items: [
        { to: '/dashboard/parent/performance', label: 'Academics & Marks', icon: BarChart3 },
        { to: '/dashboard/parent/exams', label: 'Exam Results', icon: PenTool },
        { to: '/dashboard/parent/reports', label: 'Report Cards', icon: FileText },
        { to: '/dashboard/parent/timetable', label: 'Class Timetable', icon: Calendar },
        { to: '/dashboard/parent/assignments', label: 'Homework & Tasks', icon: BookOpen },
        { to: '/dashboard/parent/attendance', label: 'Term Attendance', icon: ClipboardList },
      ],
    },
    {
      title: 'Safety & Communications',
      items: [
        { to: '/dashboard/parent/gate-pass', label: 'Gate Passes & Exits', icon: ShieldCheck },
        { to: '/dashboard/parent/notices', label: 'School Notices', icon: Megaphone },
        { to: '/dashboard/parent/messages', label: 'School Chat', icon: MessageSquare, badge: chatUnread },
      ],
    },
  ];

  const isOnMessages = location.pathname.startsWith('/dashboard/parent/messages');

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row antialiased"
      style={{
        backgroundColor: t.screenBg,
        color: t.textHi,
        fontFamily: INTER,
      }}
    >
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 flex flex-col transition-transform duration-200 md:translate-x-0 backdrop-blur-2xl backdrop-saturate-[180%] ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          backgroundColor: isDark ? '#070B09' : 'rgba(255, 255, 255, 0.75)',
          borderRight: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.85)'}`,
          boxShadow: isDark
            ? '10px 0 35px -5px rgba(0, 0, 0, 0.38), inset -1px 0 1.5px rgba(255, 255, 255, 0.15)'
            : '10px 0 30px -5px rgba(0, 0, 0, 0.07), inset -1px 0 1.5px rgba(255, 255, 255, 0.95)',
        }}
      >
        {/* Brand Header */}
        <div
          className="p-4 flex items-center justify-between border-b"
          style={{ borderColor: t.divider }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm"
              style={{
                background: 'linear-gradient(135deg,#10d9a8,#0ea5e9)',
                color: '#05080f',
              }}
            >
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
                RCSN
              </div>
              <div className="text-[10px] uppercase font-bold tracking-wider" style={{ color: t.mint }}>
                {isTertiary ? 'Sponsor Portal' : 'Parent Portal'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Parent Profile Card */}
        <div className="p-3.5 mx-3 mt-3 rounded-2xl flex items-center gap-3" style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}` }}>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0"
            style={{
              backgroundColor: isDark ? 'rgba(16,217,168,0.15)' : 'rgba(16,185,129,0.12)',
              color: t.mint,
            }}
          >
            {parentInitialsStr || 'P'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold truncate" style={{ color: t.textHi }}>
              {parentNameFull || 'Parent / Guardian'}
            </div>
            <div className="text-[10px]" style={{ color: t.textLow }}>
              {children.length} {children.length === 1 ? 'Child Linked' : 'Children Linked'}
            </div>
          </div>
        </div>

        {/* Active Child Switcher Section (in Sidebar) */}
        {children.length > 0 && (
          <div className="px-3 mt-3">
            <div className="text-[10px] font-bold uppercase tracking-wider px-1 mb-1.5" style={{ color: t.textLow }}>
              Active Student Context
            </div>
            <div className="space-y-1">
              {children.map((child) => {
                const isSelected = child.student_id === activeStudentId;
                return (
                  <button
                    key={child.student_id}
                    type="button"
                    onClick={() => setActiveStudentId(child.student_id)}
                    className="w-full px-3 py-2 rounded-xl flex items-center justify-between text-left transition-all"
                    style={{
                      backgroundColor: isSelected
                        ? isDark
                          ? 'rgba(16,217,168,0.15)'
                          : 'rgba(16,185,129,0.12)'
                        : 'transparent',
                      color: isSelected ? t.mint : t.textMid,
                      border: isSelected ? `1px solid ${t.mint}` : '1px solid transparent',
                    }}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-semibold truncate">{displayStudentName(child)}</div>
                      <div className="text-[10px] opacity-75">{child.current_class || 'Class'}</div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: t.mint }} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4" style={{ scrollbarWidth: 'none' }}>
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider px-2 mb-1" style={{ color: t.textLow }}>
                {section.title}
              </div>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isActive ? 'shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/5'
                      }`
                    }
                    style={({ isActive }) => ({
                      backgroundColor: isActive
                        ? isDark
                          ? 'rgba(16, 217, 168, 0.16)'
                          : 'rgba(13, 148, 136, 0.12)'
                        : 'transparent',
                      color: isActive ? (isDark ? '#10d9a8' : '#0d9488') : t.textMid,
                      border: isActive
                        ? `1px solid ${isDark ? 'rgba(255,255,255,0.18)' : 'rgba(13,148,136,0.22)'}`
                        : '1px solid transparent',
                      borderTop: isActive
                        ? `1px solid ${isDark ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.95)'}`
                        : '1px solid transparent',
                      boxShadow: isActive
                        ? '0 4px 14px rgba(0,0,0,0.2), inset 0 1px 1.5px rgba(255,255,255,0.35)'
                        : 'none',
                      backdropFilter: isActive ? 'blur(8px)' : 'none',
                    })}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom Actions: Theme Toggle & Logout */}
        <div className="p-3 border-t space-y-1" style={{ borderColor: t.divider }}>
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all hover:bg-black/5 dark:hover:bg-white/5"
            style={{ color: t.textMid }}
          >
            <div className="flex items-center gap-2.5">
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-500" />}
              <span>{isDark ? 'Light / White Mode' : 'Deep Dark Mode'}</span>
            </div>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all text-rose-400 hover:bg-rose-500/10"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <header
          className="sticky top-0 z-30 px-4 sm:px-6 py-3 flex items-center justify-between backdrop-blur-md border-b"
          style={{
            backgroundColor: isDark ? 'rgba(5,8,15,0.85)' : 'rgba(255,255,255,0.85)',
            borderColor: t.stroke,
          }}
        >
          {/* Mobile Hamburger & Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl border text-slate-400"
              style={{ backgroundColor: t.panel, borderColor: t.stroke }}
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-bold text-sm tracking-tight hidden sm:inline" style={{ fontFamily: SORA, color: t.textHi }}>
              Parent Portal
            </span>
          </div>

          {/* Right Header Controls: Multi-Child Switcher & Theme Toggle */}
          <div className="flex items-center gap-3">
            {/* Multi-Child Selector Pill */}
            {children.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setChildDropdownOpen(!childDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm"
                  style={{
                    backgroundColor: t.panel,
                    border: `1px solid ${t.stroke}`,
                    color: t.textHi,
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px]"
                    style={{
                      backgroundColor: isDark ? 'rgba(16,217,168,0.2)' : 'rgba(16,185,129,0.15)',
                      color: t.mint,
                    }}
                  >
                    {(activeChild?.name || '?').charAt(0)}
                  </div>
                  <span className="max-w-[120px] sm:max-w-[160px] truncate">
                    {activeChild ? displayStudentName(activeChild) : 'Select Child'}
                  </span>
                  {activeChild?.current_class && (
                    <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-medium">
                      {activeChild.current_class}
                    </span>
                  )}
                  {children.length > 1 && <ChevronDown className="w-3.5 h-3.5" style={{ color: t.textLow }} />}
                </button>

                {/* Dropdown Menu */}
                {childDropdownOpen && children.length > 1 && (
                  <div
                    className="absolute right-0 mt-2 w-56 rounded-2xl p-2 shadow-2xl z-50 space-y-1"
                    style={{
                      backgroundColor: t.panel,
                      border: `1px solid ${t.stroke}`,
                    }}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider px-2 py-1" style={{ color: t.textLow }}>
                      Switch Linked Child
                    </div>
                    {children.map((child) => (
                      <button
                        key={child.student_id}
                        type="button"
                        onClick={() => {
                          setActiveStudentId(child.student_id);
                          setChildDropdownOpen(false);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-left transition-all hover:bg-black/5 dark:hover:bg-white/5"
                        style={{
                          backgroundColor: child.student_id === activeStudentId ? (isDark ? 'rgba(16,217,168,0.15)' : 'rgba(16,185,129,0.12)') : 'transparent',
                          color: child.student_id === activeStudentId ? t.mint : t.textHi,
                        }}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{displayStudentName(child)}</div>
                          <div className="text-[10px]" style={{ color: t.textLow }}>{child.current_class || 'Class'}</div>
                        </div>
                        {child.student_id === activeStudentId && (
                          <CheckCircle2 className="w-3.5 h-3.5" style={{ color: t.mint }} />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Theme Toggle Button in Header */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl transition-all shadow-sm"
              style={{
                backgroundColor: t.panel,
                border: `1px solid ${t.stroke}`,
                color: t.textHi,
              }}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-500" />}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main
          className={`flex-1 ${isOnMessages ? 'overflow-hidden p-0 flex flex-col' : 'pb-24 md:pb-8'}`}
        >
          <Suspense
            fallback={
              <div className="p-8 text-center text-sm" style={{ color: t.textLow }}>
                Loading section...
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>

        {/* Responsive Mobile Bottom Navigation */}
        {!isOnMessages && <ParentMobileBottomNav chatUnread={chatUnread} />}
      </div>
    </div>
  );
}

export default function ParentLayout() {
  return (
    <ParentPortalProvider>
      <ParentChrome />
    </ParentPortalProvider>
  );
}
