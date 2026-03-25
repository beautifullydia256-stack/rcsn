import { Suspense, useEffect, useState } from "react";
import ThemedLoadingView from "../../components/ui/ThemedLoadingView";
import { useTheme } from "../../lib/theme-provider";
import { useSchoolType } from "../../hooks/useSchoolType";
import { Outlet, NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileCheck,
  ClipboardList,
  Calendar,
  Settings,
  Search,
  Bell,
  Sun,
  Moon,
  ChevronRight,
  ChevronDown,
  GraduationCap,
  ChevronLeft,
  LogOut,
  Sparkles,
  FileText,
  Book,
  MessageSquare,
  Percent,
  UserPlus,
  Banknote,
  MessageCircle,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { useCanAccessAccountantDashboard, usePermission } from "../../hooks/usePermission";
import { PERMISSION_KEYS } from "../../lib/permissions";
import { useUIStore } from "../../store/uiStore";
import { useTeacherContext } from "./useTeacherContext";
import { ACCOUNTANT_PW_SHELL_CSS } from "../../lib/pwShellCss";
import AdminContentSkeleton from "../../components/layout/AdminContentSkeleton";

const prefetchChunk = (importFn: () => Promise<unknown>) => {
  importFn().catch(() => {});
};

const TEACHER_ROUTE_CHUNKS = [
  () => import("./TeacherDashboardHome"),
  () => import("./students/StudentsPage"),
  () => import("./classes/ClassesPage"),
  () => import("./exam-results/ExamResultsPage"),
  () => import("./attendance/AttendancePage"),
  () => import("./timetable/TimetablePage"),
  () => import("./grading-system/GradingSystemPage"),
  () => import("./ai-planner/AiPlannerPage"),
  () => import("./assignments/AssignmentsPage"),
  () => import("./resources/ResourcesPage"),
  () => import("../chat/SchoolChatPage"),
  () => import("./notifications/NotificationsPage"),
  () => import("./settings/SettingsPage"),
  () => import("../admin/students/AddStudentPage"),
];

function NavLinkStyle({
  to,
  end,
  icon: Icon,
  children,
  onPrefetch,
}: {
  to: string;
  end?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onPrefetch?: () => void;
}) {
  return (
    <NavLink to={to} end={end} className="block" onMouseEnter={onPrefetch}>
      {({ isActive }) => (
        <span className={`ac-sidebar-nav-item ${isActive ? "ac-sidebar-nav-item-active" : ""}`}>
          <Icon className="h-5 w-5 flex-shrink-0 [color:inherit]" />
          <span className="flex-1">{children}</span>
          {isActive && <ChevronRight className="h-4 w-4 flex-shrink-0 opacity-80" />}
        </span>
      )}
    </NavLink>
  );
}

export default function TeacherLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const setUITheme = useUIStore((s) => s.setTheme);
  const { theme: ctxTheme, setTheme: setCtxTheme } = useTheme();
  const { data: schoolType, isLoading: schoolTypeLoading } = useSchoolType();
  const isPrimarySchool = schoolType === "Nursery/Primary";
  const user = useAuthStore((s) => s.user);
  const schoolId =
    useAuthStore((s) => s.schoolId) ?? (user?.user_metadata?.school_id as string | undefined) ?? null;
  const role = useAuthStore((s) => s.role);
  const { setUser, setRole, setSchoolId, setPermissions } = useAuthStore();
  const canEnrolStudents = usePermission(PERMISSION_KEYS.studentsManage);
  const canAccessFinance = useCanAccessAccountantDashboard();
  const { classesWithSubjects } = useTeacherContext();
  const [searchQ, setSearchQ] = useState("");
  const [examResultsOpen, setExamResultsOpen] = useState(false);
  const [openClass, setOpenClass] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  const displayLabel = user?.user_metadata?.name ?? user?.email ?? "Teacher";
  const userInitials =
    displayLabel
      .split(/\s+/)
      .map((w: string) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "T";

  const isExamResultsArea = location.pathname.startsWith("/dashboard/teacher/exam-results");
  useEffect(() => {
    if (isExamResultsArea) setExamResultsOpen(true);
  }, [isExamResultsArea]);
  useEffect(() => {
    const match = location.pathname.match(/^\/dashboard\/teacher\/exam-results\/class\/([^/]+)(?:\/subject\/[^/]+)?/);
    if (match) {
      try {
        setOpenClass(decodeURIComponent(match[1]));
      } catch {
        setOpenClass(null);
      }
    }
  }, [location.pathname]);

  useEffect(() => {
    if (isPrimarySchool) setSidebarOpen(false);
  }, [location.pathname, isPrimarySchool]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setSchoolId(null);
    setPermissions([]);
    navigate("/");
  };

  useEffect(() => {
    const check = async () => {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      if (!u) {
        navigate("/login");
        return;
      }
      setUser(u);
      const { data: profile } = await supabase
        .from("users")
        .select("role, school_id")
        .eq("user_id", u.id)
        .single();
      if (profile) {
        setRole((profile as { role?: string }).role ?? null);
        setSchoolId((profile as { school_id?: string }).school_id ?? null);
      }
    };
    check();
  }, [navigate, setUser, setRole, setSchoolId]);

  useEffect(() => {
    const run = () => TEACHER_ROUTE_CHUNKS.forEach((fn) => prefetchChunk(fn));
    const useIdle = typeof requestIdleCallback !== "undefined";
    const id = useIdle ? requestIdleCallback(run, { timeout: 200 }) : window.setTimeout(run, 120);
    return () => (useIdle ? cancelIdleCallback(id as number) : clearTimeout(id));
  }, []);

  useEffect(() => {
    if (!isPrimarySchool) return;
    const prevCtx = ctxTheme;
    const prevUi = useUIStore.getState().theme;
    setCtxTheme("dark");
    setUITheme("dark");
    return () => {
      setCtxTheme(prevCtx);
      setUITheme(prevUi);
    };
  }, [isPrimarySchool, setCtxTheme, setUITheme]);

  useEffect(() => {
    if (isPrimarySchool) return;
    setCtxTheme(theme);
  }, [isPrimarySchool, theme, setCtxTheme]);

  if (!schoolId || schoolTypeLoading) {
    return <ThemedLoadingView />;
  }

  /** Same shell as accountant: fixed pw-sidebar + scrollable pw-main (no separate glass header/footer). */
  const isTeacherMessages = location.pathname.startsWith('/dashboard/teacher/messages');

  if (isPrimarySchool) {
    return (
      <div className="accountant-glass pw-layout fixed inset-0 flex overflow-hidden" data-theme="dark">
        <style>{ACCOUNTANT_PW_SHELL_CSS}</style>
        <button
          type="button"
          className="pw-hamburger"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? "✕" : "☰"}
        </button>
        {sidebarOpen && <div className="pw-sidebar-overlay" onClick={closeSidebar} role="presentation" />}
        <aside className={`pw-sidebar ${sidebarOpen ? "pw-sidebar--open" : ""}`}>
          <div className="pw-brand">
            <div className="pw-brand-logo">🎓</div>
            <span className="pw-brand-name">PwezaCore</span>
            <span className="pw-brand-pill">Teacher</span>
          </div>

          <div className="pw-nav-section">
            <span className="pw-nav-label">Main</span>
            <NavLink
              to="/dashboard/teacher"
              end
              onClick={closeSidebar}
              onMouseEnter={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[0])}
              className={({ isActive }) => ["pw-nav-link", isActive ? "pw-nav-link--active" : ""].join(" ")}
            >
              <span className="pw-nav-ic">⊞</span>
              <span className="pw-nav-text">Dashboard</span>
            </NavLink>
            <NavLink
              to="/dashboard/teacher/classes"
              onClick={closeSidebar}
              onMouseEnter={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[2])}
              className={({ isActive }) => ["pw-nav-link", isActive ? "pw-nav-link--active" : ""].join(" ")}
            >
              <span className="pw-nav-ic">📚</span>
              <span className="pw-nav-text">My Classes</span>
            </NavLink>
            <NavLink
              to="/dashboard/teacher/students"
              onClick={closeSidebar}
              onMouseEnter={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[1])}
              className={({ isActive }) => ["pw-nav-link", isActive ? "pw-nav-link--active" : ""].join(" ")}
            >
              <span className="pw-nav-ic">👥</span>
              <span className="pw-nav-text">My Students</span>
            </NavLink>
            {canEnrolStudents && (
              <NavLink
                to="/dashboard/teacher/school/add-student"
                onClick={closeSidebar}
                onMouseEnter={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[13])}
                className={({ isActive }) => ["pw-nav-link", isActive ? "pw-nav-link--active" : ""].join(" ")}
              >
                <span className="pw-nav-ic">➕</span>
                <span className="pw-nav-text">Add student</span>
              </NavLink>
            )}
            {canAccessFinance && role !== "accountant" && (
              <NavLink
                to="/dashboard/accountant"
                onClick={closeSidebar}
                onMouseEnter={() => prefetchChunk(() => import("../accountant/Dashboard"))}
                className={({ isActive }) => ["pw-nav-link", isActive ? "pw-nav-link--active" : ""].join(" ")}
              >
                <span className="pw-nav-ic">💰</span>
                <span className="pw-nav-text">Finance</span>
              </NavLink>
            )}
          </div>

          <div className="pw-nav-section">
            <span className="pw-nav-label">Teaching</span>
            <button
              type="button"
              onClick={() => setExamResultsOpen((o) => !o)}
              className={["pw-nav-link", isExamResultsArea ? "pw-nav-link--active" : ""].join(" ")}
            >
              <span className="pw-nav-ic">📋</span>
              <span className="pw-nav-text">Exam Results</span>
              <span className={`pw-nav-chevron ${examResultsOpen ? "pw-nav-chevron--open" : ""}`}>›</span>
            </button>
            {examResultsOpen && classesWithSubjects.length > 0 && (
              <div className="pw-nav-subitems">
                {classesWithSubjects.map((c) => (
                  <div key={c.class_name}>
                    <button
                      type="button"
                      onClick={() => setOpenClass((prev) => (prev === c.class_name ? null : c.class_name))}
                      className="pw-nav-link"
                      style={{ fontSize: "12px", padding: "6px 10px" }}
                    >
                      <span className={`pw-nav-chevron ${openClass === c.class_name ? "pw-nav-chevron--open" : ""}`} style={{ marginLeft: 0, marginRight: 6 }}>
                        ›
                      </span>
                      <span className="pw-nav-text">{c.class_name}</span>
                    </button>
                    {openClass === c.class_name && c.subjects.length > 0 && (
                      <div className="pw-nav-subitems">
                        {c.subjects.map((sub) => (
                          <NavLink
                            key={sub}
                            to={`/dashboard/teacher/exam-results/class/${encodeURIComponent(c.class_name)}/subject/${encodeURIComponent(sub)}`}
                            onClick={closeSidebar}
                            onMouseEnter={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[3])}
                            className={({ isActive }) =>
                              ["pw-nav-subitem", isActive ? "pw-nav-subitem--active" : ""].join(" ")
                            }
                          >
                            <span className="pw-nav-sub-dot">·</span>
                            {sub}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {examResultsOpen && classesWithSubjects.length === 0 && (
              <div className="px-3 py-1 text-[11px]" style={{ color: "var(--pw-t3, #3d5278)" }}>
                No classes assigned
              </div>
            )}
            <NavLink
              to="/dashboard/teacher/attendance"
              onClick={closeSidebar}
              onMouseEnter={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[4])}
              className={({ isActive }) => ["pw-nav-link", isActive ? "pw-nav-link--active" : ""].join(" ")}
            >
              <span className="pw-nav-ic">📅</span>
              <span className="pw-nav-text">Attendance</span>
            </NavLink>
            <NavLink
              to="/dashboard/teacher/timetable"
              onClick={closeSidebar}
              onMouseEnter={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[5])}
              className={({ isActive }) => ["pw-nav-link", isActive ? "pw-nav-link--active" : ""].join(" ")}
            >
              <span className="pw-nav-ic">🗓</span>
              <span className="pw-nav-text">Timetable</span>
            </NavLink>
            <NavLink
              to="/dashboard/teacher/grading-system"
              onClick={closeSidebar}
              onMouseEnter={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[6])}
              className={({ isActive }) => ["pw-nav-link", isActive ? "pw-nav-link--active" : ""].join(" ")}
            >
              <span className="pw-nav-ic">％</span>
              <span className="pw-nav-text">Grading System</span>
            </NavLink>
            <NavLink
              to="/dashboard/teacher/ai-planner"
              onClick={closeSidebar}
              onMouseEnter={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[7])}
              className={({ isActive }) => ["pw-nav-link", isActive ? "pw-nav-link--active" : ""].join(" ")}
            >
              <span className="pw-nav-ic">✨</span>
              <span className="pw-nav-text">AI Lesson Planner</span>
            </NavLink>
            <NavLink
              to="/dashboard/teacher/assignments"
              onClick={closeSidebar}
              onMouseEnter={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[8])}
              className={({ isActive }) => ["pw-nav-link", isActive ? "pw-nav-link--active" : ""].join(" ")}
            >
              <span className="pw-nav-ic">📝</span>
              <span className="pw-nav-text">Assignments</span>
            </NavLink>
            <NavLink
              to="/dashboard/teacher/resources"
              onClick={closeSidebar}
              onMouseEnter={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[9])}
              className={({ isActive }) => ["pw-nav-link", isActive ? "pw-nav-link--active" : ""].join(" ")}
            >
              <span className="pw-nav-ic">📖</span>
              <span className="pw-nav-text">Resources</span>
            </NavLink>
          </div>

          <div className="pw-nav-section">
            <span className="pw-nav-label">Quick</span>
            <NavLink
              to="/dashboard/teacher/messages"
              onClick={closeSidebar}
              onMouseEnter={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[10])}
              className={({ isActive }) => ["pw-nav-link", isActive ? "pw-nav-link--active" : ""].join(" ")}
            >
              <span className="pw-nav-ic">💬</span>
              <span className="pw-nav-text">Messages</span>
            </NavLink>
            <NavLink
              to="/dashboard/teacher/notifications"
              onClick={closeSidebar}
              onMouseEnter={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[11])}
              className={({ isActive }) => ["pw-nav-link", isActive ? "pw-nav-link--active" : ""].join(" ")}
            >
              <span className="pw-nav-ic">🔔</span>
              <span className="pw-nav-text">Notifications</span>
            </NavLink>
            <NavLink
              to="/dashboard/teacher/settings"
              onClick={closeSidebar}
              onMouseEnter={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[12])}
              className={({ isActive }) => ["pw-nav-link", isActive ? "pw-nav-link--active" : ""].join(" ")}
            >
              <span className="pw-nav-ic">⚙</span>
              <span className="pw-nav-text">Settings</span>
            </NavLink>
          </div>

          <div className="pw-sidebar-tools">
            <button
              type="button"
              onClick={() => {
                navigate("/dashboard/teacher/messages");
                closeSidebar();
              }}
              aria-label="Messages"
            >
              <MessageCircle className="h-4 w-4 shrink-0" />
              <span>Chat</span>
            </button>
            <button
              type="button"
              onClick={() => {
                navigate("/dashboard/teacher/notifications");
                closeSidebar();
              }}
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4 shrink-0" />
            </button>
          </div>

          <div className="pw-sidebar-bottom">
            <div className="pw-admin-card">
              <div className="pw-admin-av">{userInitials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="pw-admin-name" style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {displayLabel}
                </div>
                <div className="pw-admin-role">Teacher</div>
              </div>
            </div>
            <button type="button" className="pw-logout-btn" onClick={handleLogout}>
              <span className="pw-nav-ic">🚪</span>
              Logout
            </button>
          </div>
        </aside>

        <main className={`pw-main ${isTeacherMessages ? 'pw-main--chat' : ''}`}>
          {isTeacherMessages ? (
            <Suspense fallback={<AdminContentSkeleton />}>
              <Outlet />
            </Suspense>
          ) : (
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 pb-10 min-h-0">
              <Suspense fallback={<AdminContentSkeleton />}>
                <Outlet />
              </Suspense>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div
      className="accountant-glass fixed inset-0 flex overflow-hidden"
      data-theme={theme}
      style={{ background: "var(--ac-page-bg)", backgroundColor: "var(--ac-page-bg)" }}
    >
      <aside className="ac-glass-sidebar w-56 flex flex-col flex-shrink-0 z-10 overflow-y-auto">
        <div className="flex items-center justify-between gap-2 px-4 py-5 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="ac-text-primary font-semibold text-base truncate">PwezaCore</span>
          </div>
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ac-text-muted hover:bg-white/10 transition-colors"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
        <div className="px-4 pt-4 pb-2">
          <span className="ac-text-muted text-[11px] font-semibold uppercase tracking-widest">Menu</span>
        </div>
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          <NavLinkStyle to="/dashboard/teacher" end icon={LayoutDashboard} onPrefetch={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[0])}>
            Dashboard
          </NavLinkStyle>
          <NavLinkStyle to="/dashboard/teacher/classes" icon={BookOpen} onPrefetch={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[2])}>
            My Classes
          </NavLinkStyle>
          <NavLinkStyle to="/dashboard/teacher/students" icon={Users} onPrefetch={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[1])}>
            My Students
          </NavLinkStyle>
          {canEnrolStudents && (
            <NavLinkStyle
              to="/dashboard/teacher/school/add-student"
              icon={UserPlus}
              onPrefetch={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[13])}
            >
              Add student (school)
            </NavLinkStyle>
          )}
          {canAccessFinance && role !== "accountant" && (
            <NavLinkStyle to="/dashboard/accountant" icon={Banknote} onPrefetch={() => prefetchChunk(() => import("../accountant/Dashboard"))}>
              Finance & accounting
            </NavLinkStyle>
          )}
          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => setExamResultsOpen((o) => !o)}
              className={`ac-sidebar-nav-item w-full text-left flex items-center ${
                isExamResultsArea ? "ac-sidebar-nav-item-active" : ""
              }`}
            >
              <FileCheck className="h-5 w-5 flex-shrink-0 [color:inherit]" />
              <span className="flex-1">Exam Results</span>
              {examResultsOpen ? (
                <ChevronDown className="h-4 w-4 flex-shrink-0 opacity-80" />
              ) : (
                <ChevronRight className="h-4 w-4 flex-shrink-0 opacity-80" />
              )}
            </button>
            {examResultsOpen && classesWithSubjects.length > 0 && (
              <div className="pl-6 pr-2 py-1 space-y-0.5 border-l-2 border-white/10 ml-5">
                {classesWithSubjects.map((c) => (
                  <div key={c.class_name}>
                    <button
                      type="button"
                      onClick={() => setOpenClass((prev) => (prev === c.class_name ? null : c.class_name))}
                      className="ac-sidebar-nav-item w-full text-left flex items-center py-1.5 px-2 rounded-md text-sm"
                    >
                      <ChevronRight
                        className={`h-4 w-4 flex-shrink-0 transition-transform ${
                          openClass === c.class_name ? "rotate-90" : ""
                        }`}
                      />
                      <span className="truncate">{c.class_name}</span>
                    </button>
                    {openClass === c.class_name && c.subjects.length > 0 && (
                      <div className="pl-4 py-1 space-y-0.5">
                        {c.subjects.map((sub) => (
                          <NavLink
                            key={sub}
                            to={`/dashboard/teacher/exam-results/class/${encodeURIComponent(c.class_name)}/subject/${encodeURIComponent(sub)}`}
                            className={({ isActive }) =>
                              `block py-1.5 px-2 rounded-md text-sm truncate ac-text-secondary hover:ac-text-primary ${
                                isActive ? "ac-sidebar-nav-item-active" : ""
                              }`
                            }
                            onMouseEnter={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[3])}
                          >
                            {sub}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {examResultsOpen && classesWithSubjects.length === 0 && (
              <div className="pl-6 py-1 border-l-2 border-white/10 ml-5">
                <span className="text-xs ac-text-muted px-2">No classes assigned</span>
              </div>
            )}
          </div>
          <NavLinkStyle to="/dashboard/teacher/attendance" icon={ClipboardList} onPrefetch={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[4])}>
            Attendance
          </NavLinkStyle>
          <NavLinkStyle to="/dashboard/teacher/timetable" icon={Calendar} onPrefetch={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[5])}>
            Timetable
          </NavLinkStyle>
          <NavLinkStyle to="/dashboard/teacher/grading-system" icon={Percent} onPrefetch={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[6])}>
            Grading System
          </NavLinkStyle>
          <NavLinkStyle to="/dashboard/teacher/ai-planner" icon={Sparkles} onPrefetch={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[7])}>
            AI Lesson Planner
          </NavLinkStyle>
          <NavLinkStyle to="/dashboard/teacher/assignments" icon={FileText} onPrefetch={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[8])}>
            Assignments
          </NavLinkStyle>
          <NavLinkStyle to="/dashboard/teacher/resources" icon={Book} onPrefetch={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[9])}>
            Resources
          </NavLinkStyle>
          <NavLinkStyle to="/dashboard/teacher/messages" icon={MessageSquare} onPrefetch={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[10])}>
            Messages
          </NavLinkStyle>
          <NavLinkStyle to="/dashboard/teacher/notifications" icon={Bell} onPrefetch={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[11])}>
            Notifications
          </NavLinkStyle>
          <NavLinkStyle to="/dashboard/teacher/settings" icon={Settings} onPrefetch={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[12])}>
            Settings
          </NavLinkStyle>
          <div className="pt-4 mt-4 border-t border-white/10">
            <button type="button" onClick={handleLogout} className="ac-sidebar-nav-item w-full text-left">
              <LogOut className="h-5 w-5 flex-shrink-0 [color:inherit]" />
              <span className="flex-1">Logout</span>
            </button>
          </div>
        </nav>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden min-h-0" style={{ background: "transparent" }}>
        <header className="ac-glass-header flex-shrink-0 px-6 py-4">
          <div className="flex items-center justify-end gap-4">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search students, classes..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                className="ac-input w-full rounded-xl py-2.5 pl-4 pr-10 text-sm min-h-0"
              />
              <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 ac-text-muted" />
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="ac-glass-card flex h-10 w-10 items-center justify-center rounded-full ac-text-secondary transition-colors hover:opacity-90"
              title={theme === "light" ? "Switch to dark" : "Switch to light"}
            >
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>
            <button
              type="button"
              className="ac-glass-card flex h-10 w-10 items-center justify-center rounded-full ac-text-secondary transition-colors hover:opacity-90"
            >
              <Bell className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 pl-2">
              <span className="ac-text-primary text-sm font-medium truncate max-w-[120px]">
                {user?.user_metadata?.name ?? user?.email ?? "Teacher"}
              </span>
              <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600" />
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <Suspense
              fallback={
                <div className="animate-pulse space-y-6">
                  <div className="h-8 w-56 rounded ac-skeleton-block" />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-28 rounded-xl ac-skeleton-block" />
                    ))}
                  </div>
                  <div className="h-64 rounded-xl ac-skeleton-block" />
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </div>
        </div>
        <footer className="ac-glass-footer flex-shrink-0 px-6 py-4">
          <div className="ac-text-secondary flex items-center justify-between text-sm">
            <span>Copyright © {new Date().getFullYear()} PwezaCore</span>
            <div className="flex items-center gap-6">
              <Link to="/privacy-policy" className="hover:opacity-100 opacity-80">
                Privacy Policy
              </Link>
              <Link to="/affiliate-terms" className="hover:opacity-100 opacity-80">
                Terms and conditions
              </Link>
              <Link to="/contact" className="hover:opacity-100 opacity-80">
                Contact
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
