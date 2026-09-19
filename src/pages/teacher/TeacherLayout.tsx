import { Suspense, useEffect, useState } from "react";
import ThemedLoadingView from "../../components/ui/ThemedLoadingView";
import { useTheme } from "../../lib/theme-provider";
import { Navigate, Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  Users,
  UserPlus,
  Wallet,
  FileText,
  ClipboardList,
  Calendar,
  Video,
  Percent,
  Sparkles,
  PenTool,
  Book,
  MessageSquare,
  MessageCircle,
  Bell,
  Settings,
  Trophy,
  ClipboardCheck,
  Stethoscope,
  LogOut,
  X,
  Menu,
} from "lucide-react";
import { useSchoolType } from "../../hooks/useSchoolType";
import { supabase } from "../../lib/supabase";
import { logoutWithSyncCheck } from "../../lib/logoutWithSyncCheck";
import { useSchoolChatUnreadTotal } from "../../hooks/useSchoolChatUnreadTotal";
import { useAuthStore } from "../../store/authStore";
import { useCanAccessAccountantDashboard, usePermission } from "../../hooks/usePermission";
import { PERMISSION_KEYS } from "../../lib/permissions";
import { useUIStore } from "../../store/uiStore";
import { useTeacherContext } from "./useTeacherContext";
import { ACCOUNTANT_PW_SHELL_CSS } from "../../lib/pwShellCss";
import AdminContentSkeleton from "../../components/layout/AdminContentSkeleton";
import TeacherMobileBottomNav from "../../components/layout/TeacherMobileBottomNav";
import { hasRole, ROLE_GROUPS, normalizeRole, logRbacDecision } from "../../lib/rbac";
const prefetchChunk = (importFn: () => Promise<unknown>) => {
  importFn().catch(() => {});
};

const TEACHER_ROUTE_CHUNKS = [
  () => import("./TeacherDashboardHome"),          // 0
  () => import("./students/StudentsPage"),          // 1
  () => import("./classes/ClassesPage"),            // 2
  () => import("./exam-results/ExamResultsPage"),   // 3
  () => import("./attendance/AttendancePage"),       // 4
  () => import("./timetable/TimetablePage"),         // 5
  () => import("./grading-system/GradingSystemPage"),// 6
  () => import("./ai-planner/AiPlannerPage"),        // 7
  () => import("./assignments/AssignmentsPage"),     // 8
  () => import("./resources/ResourcesPage"),         // 9
  () => import("../chat/SchoolChatPage"),            // 10
  () => import("./notifications/NotificationsPage"), // 11
  () => import("./settings/SettingsPage"),           // 12
  () => import("../admin/students/AddStudentPage"),  // 13
  () => import("./templates/TemplatesPage"),         // 14
  () => import("./curriculum/CurriculumPage"),              // 15
  () => import("./scheme-of-work/SchemeOfWorkPage"),        // 16
  () => import("./lesson-plan/LessonPlanPage"),             // 17
  () => import("./lesson-notes/LessonNotesPage"),           // 18
  () => import("./assignments/CreateAssignmentPage"),        // 19
  () => import("./assignments/AssignmentSubmissionsPage"),   // 20
  () => import("./lesson-log/LessonLogPage"),               // 21
];

/**
 * One teacher shell for all school types (matches primary pw-sidebar layout).
 * Exam/grading data still varies by school type inside child routes.
 */
export default function TeacherLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const setUITheme = useUIStore((s) => s.setTheme);
  const { theme: ctxTheme, setTheme: setCtxTheme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const schoolId =
    useAuthStore((s) => s.schoolId) ?? (user?.user_metadata?.school_id as string | undefined) ?? null;
  const role = useAuthStore((s) => s.role);
  const { setUser, setRole, setSchoolId, setPermissions } = useAuthStore();
  const canEnrolStudents = usePermission(PERMISSION_KEYS.studentsManage);
  const canAccessFinance = useCanAccessAccountantDashboard();
  const { classesWithSubjects } = useTeacherContext();
  const { isTertiary } = useSchoolType();
  const [examResultsOpen, setExamResultsOpen] = useState(false);
  const [openClass, setOpenClass] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  const chatUnread = useSchoolChatUnreadTotal(user?.id);
  const chatUnreadBadge = chatUnread > 0 ? (chatUnread > 99 ? "99+" : chatUnread) : null;

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
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    void logoutWithSyncCheck(() => {
      setUser(null);
      setRole(null);
      setSchoolId(null);
      setPermissions([]);
      navigate("/");
    });
  };

  // Route guard: Allow teacher and admin roles
  const allowed = hasRole(role, ROLE_GROUPS.TEACHER_DASHBOARD);
  
  // Debug logging
  logRbacDecision(
    'TeacherLayout',
    location.pathname,
    role,
    normalizeRole(role),
    ROLE_GROUPS.TEACHER_DASHBOARD,
    allowed
  );

  if (role && !allowed) {
    console.log(`[RBAC] Redirecting unauthorized role (${role}) from teacher dashboard`);
    return <Navigate to="/dashboard" replace />;
  }

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
    const prevCtx = ctxTheme;
    const prevUi = useUIStore.getState().theme;
    setCtxTheme("dark");
    setUITheme("dark");
    return () => {
      setCtxTheme(prevCtx);
      setUITheme(prevUi);
    };
  }, [setCtxTheme, setUITheme]);

  if (!schoolId) {
    return <ThemedLoadingView />;
  }

  const isTeacherMessages = location.pathname.startsWith("/dashboard/teacher/messages");

  return (
    <div className="accountant-glass pw-layout fixed inset-0 flex overflow-hidden" data-theme="dark">
      <style>{ACCOUNTANT_PW_SHELL_CSS}</style>
      <button
        type="button"
        className="pw-hamburger"
        onClick={() => setSidebarOpen(prev => !prev)}
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
      {sidebarOpen && <div className="pw-sidebar-overlay" onClick={closeSidebar} role="presentation" />}
      <aside className={`pw-sidebar ${sidebarOpen ? "pw-sidebar--open" : ""}`}>
        <div className="pw-brand">
          <div className="pw-brand-logo">
            {isTertiary ? (
              <Stethoscope className="w-5 h-5 text-emerald-400" strokeWidth={2} />
            ) : (
              <GraduationCap className="w-5 h-5 text-emerald-400" strokeWidth={2} />
            )}
          </div>
          <span className="pw-brand-name">PwezaCore</span>
          <span className="pw-brand-pill">{isTertiary ? "Tutor" : "Teacher"}</span>
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
            <span className="pw-nav-ic"><LayoutDashboard className="w-4 h-4" /></span>
            <span className="pw-nav-text">Dashboard</span>
          </NavLink>
          <NavLink
            to="/dashboard/teacher/classes"
            onClick={closeSidebar}
            onMouseEnter={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[2])}
            className={({ isActive }) => ["pw-nav-link", isActive ? "pw-nav-link--active" : ""].join(" ")}
          >
            <span className="pw-nav-ic"><BookOpen className="w-4 h-4" /></span>
            <span className="pw-nav-text">{isTertiary ? "My Cohorts" : "My Classes"}</span>
          </NavLink>
          <NavLink
            to="/dashboard/teacher/students"
            onClick={closeSidebar}
            onMouseEnter={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[1])}
            className={({ isActive }) => ["pw-nav-link", isActive ? "pw-nav-link--active" : ""].join(" ")}
          >
            <span className="pw-nav-ic"><Users className="w-4 h-4" /></span>
            <span className="pw-nav-text">{isTertiary ? "My Trainees" : "My Students"}</span>
          </NavLink>
          {canEnrolStudents && (
            <NavLink
              to="/dashboard/teacher/school/add-student"
              onClick={closeSidebar}
              onMouseEnter={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[13])}
              className={({ isActive }) => ["pw-nav-link", isActive ? "pw-nav-link--active" : ""].join(" ")}
            >
              <span className="pw-nav-ic"><UserPlus className="w-4 h-4" /></span>
              <span className="pw-nav-text">{isTertiary ? "Add Trainee" : "Add student"}</span>
            </NavLink>
          )}
          {canAccessFinance && role !== "accountant" && (
            <NavLink
              to="/dashboard/accountant"
              onClick={closeSidebar}
              onMouseEnter={() => prefetchChunk(() => import("../accountant/Dashboard"))}
              className={({ isActive }) => ["pw-nav-link", isActive ? "pw-nav-link--active" : ""].join(" ")}
            >
              <span className="pw-nav-ic"><Wallet className="w-4 h-4" /></span>
              <span className="pw-nav-text">Finance</span>
            </NavLink>
          )}
        </div>

        <div className="pw-nav-section">
          <span className="pw-nav-label">Teaching</span>
          <NavLink
            to="/dashboard/teacher/templates"
            onClick={closeSidebar}
            onMouseEnter={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[14])}
            className={({ isActive }) => ["pw-nav-link", isActive ? "pw-nav-link--active" : ""].join(" ")}
          >
            <span className="pw-nav-ic"><FileText className="w-4 h-4" /></span>
            <span className="pw-nav-text">Templates</span>
          </NavLink>
          <button
            type="button"
            onClick={() => setExamResultsOpen((o) => !o)}
            className={["pw-nav-link", isExamResultsArea ? "pw-nav-link--active" : ""].join(" ")}
          >
            <span className="pw-nav-ic"><Trophy className="w-4 h-4" /></span>
            <span className="pw-nav-text">{isTertiary ? "Continuous Assessment & Results" : "Exam Results"}</span>
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
                    <span
                      className={`pw-nav-chevron ${openClass === c.class_name ? "pw-nav-chevron--open" : ""}`}
                      style={{ marginLeft: 0, marginRight: 6 }}
                    >
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
            <span className="pw-nav-ic"><ClipboardCheck className="w-4 h-4" /></span>
            <span className="pw-nav-text">Attendance</span>
          </NavLink>
          {isTertiary && (
            <NavLink
              to="/dashboard/teacher/ward-postings"
              onClick={closeSidebar}
              className={({ isActive }) => ["pw-nav-link", isActive ? "pw-nav-link--active" : ""].join(" ")}
            >
              <span className="pw-nav-ic"><Stethoscope className="w-4 h-4" /></span>
              <span className="pw-nav-text">Ward Postings & Clinical</span>
            </NavLink>
          )}
          <NavLink
            to="/dashboard/teacher/timetable"
            onClick={closeSidebar}
            onMouseEnter={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[5])}
            className={({ isActive }) => ["pw-nav-link", isActive ? "pw-nav-link--active" : ""].join(" ")}
          >
            <span className="pw-nav-ic"><Calendar className="w-4 h-4" /></span>
            <span className="pw-nav-text">{isTertiary ? "Lecture & Clinical Schedule" : "Timetable"}</span>
          </NavLink>
          <NavLink
            to="/dashboard/teacher/lesson-log"
            onClick={closeSidebar}
            onMouseEnter={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[21])}
            className={({ isActive }) => ["pw-nav-link", isActive ? "pw-nav-link--active" : ""].join(" ")}
          >
            <span className="pw-nav-ic"><Video className="w-4 h-4" /></span>
            <span className="pw-nav-text">{isTertiary ? "Lecture & Practical Log" : "Lesson Log"}</span>
          </NavLink>
          <NavLink
            to="/dashboard/teacher/grading-system"
            onClick={closeSidebar}
            onMouseEnter={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[6])}
            className={({ isActive }) => ["pw-nav-link", isActive ? "pw-nav-link--active" : ""].join(" ")}
          >
            <span className="pw-nav-ic"><Percent className="w-4 h-4" /></span>
            <span className="pw-nav-text">{isTertiary ? "UNMEB Grading Scale & Regulations" : "Grading System"}</span>
          </NavLink>
          <NavLink
            to="/dashboard/teacher/ai-planner"
            onClick={closeSidebar}
            onMouseEnter={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[7])}
            className={({ isActive }) => ["pw-nav-link", isActive ? "pw-nav-link--active" : ""].join(" ")}
          >
            <span className="pw-nav-ic"><Sparkles className="w-4 h-4" /></span>
            <span className="pw-nav-text">AI Lesson Planner</span>
          </NavLink>
          <NavLink
            to="/dashboard/teacher/assignments"
            onClick={closeSidebar}
            onMouseEnter={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[8])}
            className={({ isActive }) => ["pw-nav-link", isActive ? "pw-nav-link--active" : ""].join(" ")}
          >
            <span className="pw-nav-ic"><PenTool className="w-4 h-4" /></span>
            <span className="pw-nav-text">Assignments</span>
          </NavLink>
          <NavLink
            to="/dashboard/teacher/resources"
            onClick={closeSidebar}
            onMouseEnter={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[9])}
            className={({ isActive }) => ["pw-nav-link", isActive ? "pw-nav-link--active" : ""].join(" ")}
          >
            <span className="pw-nav-ic"><Book className="w-4 h-4" /></span>
            <span className="pw-nav-text">Resources</span>
          </NavLink>
        </div>

        <div className="pw-nav-section">
          <span className="pw-nav-label">Academic</span>
          <NavLink
            to="/dashboard/teacher/curriculum"
            onClick={closeSidebar}
            onMouseEnter={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[15])}
            className={({ isActive }) => ["pw-nav-link", isActive ? "pw-nav-link--active" : ""].join(" ")}
          >
            <span className="pw-nav-ic"><BookOpen className="w-4 h-4" /></span>
            <span className="pw-nav-text">Curriculum</span>
          </NavLink>
          <NavLink
            to="/dashboard/teacher/scheme-of-work"
            onClick={closeSidebar}
            onMouseEnter={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[16])}
            className={({ isActive }) => ["pw-nav-link", isActive ? "pw-nav-link--active" : ""].join(" ")}
          >
            <span className="pw-nav-ic"><ClipboardList className="w-4 h-4" /></span>
            <span className="pw-nav-text">Scheme of Work</span>
          </NavLink>
          <NavLink
            to="/dashboard/teacher/lesson-plan"
            onClick={closeSidebar}
            onMouseEnter={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[17])}
            className={({ isActive }) => ["pw-nav-link", isActive ? "pw-nav-link--active" : ""].join(" ")}
          >
            <span className="pw-nav-ic"><FileText className="w-4 h-4" /></span>
            <span className="pw-nav-text">Lesson Plan</span>
          </NavLink>
          <NavLink
            to="/dashboard/teacher/lesson-notes"
            onClick={closeSidebar}
            onMouseEnter={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[18])}
            className={({ isActive }) => ["pw-nav-link", isActive ? "pw-nav-link--active" : ""].join(" ")}
          >
            <span className="pw-nav-ic"><BookOpen className="w-4 h-4" /></span>
            <span className="pw-nav-text">Lesson Notes</span>
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
            <span className="pw-nav-ic"><MessageSquare className="w-4 h-4" /></span>
            <span className="pw-nav-text">Messages</span>
            {chatUnreadBadge != null && (
              <span className="pw-nav-badge pw-nav-badge--rose">{chatUnreadBadge}</span>
            )}
          </NavLink>
          <NavLink
            to="/dashboard/teacher/notifications"
            onClick={closeSidebar}
            onMouseEnter={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[11])}
            className={({ isActive }) => ["pw-nav-link", isActive ? "pw-nav-link--active" : ""].join(" ")}
          >
            <span className="pw-nav-ic"><Bell className="w-4 h-4" /></span>
            <span className="pw-nav-text">Notifications</span>
          </NavLink>
          <NavLink
            to="/dashboard/teacher/settings"
            onClick={closeSidebar}
            onMouseEnter={() => prefetchChunk(TEACHER_ROUTE_CHUNKS[12])}
            className={({ isActive }) => ["pw-nav-link", isActive ? "pw-nav-link--active" : ""].join(" ")}
          >
            <span className="pw-nav-ic"><Settings className="w-4 h-4" /></span>
            <span className="pw-nav-text">Settings</span>
          </NavLink>
        </div>

        <div className="pw-sidebar-tools">
          <button
            type="button"
            className="relative"
            onClick={() => {
              navigate("/dashboard/teacher/messages");
              closeSidebar();
            }}
            aria-label="Messages"
          >
            <MessageCircle className="h-4 w-4 shrink-0" />
            <span>Chat</span>
            {chatUnread > 0 && (
              <span
                className="pw-nav-badge pw-nav-badge--rose pointer-events-none absolute -right-0.5 -top-1 min-w-[16px] scale-[0.92] px-1 text-[9px]"
                style={{ lineHeight: "16px", padding: "0 4px" }}
              >
                {chatUnread > 99 ? "99+" : chatUnread}
              </span>
            )}
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
              <div className="pw-admin-role">{isTertiary ? "Tutor / Clinical Instructor" : "Teacher"}</div>
            </div>
          </div>
          <button type="button" className="pw-logout-btn" onClick={handleLogout}>
            <span className="pw-nav-ic"><LogOut className="w-4 h-4" /></span>
            Logout
          </button>
        </div>
      </aside>

      <main className={`pw-main ${isTeacherMessages ? "pw-main--chat" : ""}`}>
        {isTeacherMessages ? (
          <Suspense fallback={<AdminContentSkeleton />}>
            <Outlet />
          </Suspense>
        ) : (
          <div className="px-4 py-6 sm:px-6 lg:px-8 pb-10 min-h-0">
            <Suspense fallback={<AdminContentSkeleton />}>
              <Outlet />
            </Suspense>
          </div>
        )}
      </main>
      <TeacherMobileBottomNav chatUnread={chatUnread} />
    </div>
  );
}
