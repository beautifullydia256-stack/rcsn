import { Suspense, useEffect, useState, useRef, type ReactNode } from "react";
import { Navigate, Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  Bell,
  Sun,
  Moon,
  LayoutDashboard,
  MessageSquare,
  Users,
  UserPlus,
  DollarSign,
  Briefcase,
  FileText,
  CalendarCheck,
  Clock,
  Calendar,
  Award,
  CalendarDays,
  LogOut,
  X,
  Menu,
  GraduationCap,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { logoutWithSyncCheck } from "../../lib/logoutWithSyncCheck";
import { useSchoolChatUnreadTotal } from "../../hooks/useSchoolChatUnreadTotal";
import { useAuthStore } from "../../store/authStore";
import { useUIStore } from "../../store/uiStore";
import { POS_SIDEBAR_SHARED_CSS } from "../../lib/pwShellCss";
import { hasRole, ROLE_GROUPS } from "../../lib/rbac";
import { useSchoolType } from "../../hooks/useSchoolType";
import AdminContentSkeleton from "./AdminContentSkeleton";

const HR_BASE = "/dashboard/hr";

interface NavItemProps {
  to: string;
  icon: ReactNode;
  label: string;
  end?: boolean;
  onClick?: () => void;
  badge?: string | number;
  badgeColor?: "teal" | "amber" | "rose";
}

function NavItem({
  to,
  icon,
  label,
  end,
  onClick,
  badge,
  badgeColor = "rose",
}: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) => ["pw-nav-link", isActive ? "pw-nav-link--active" : ""].join(" ")}
    >
      <span className="pw-nav-ic">{icon}</span>
      <span className="pw-nav-text">{label}</span>
      {badge !== undefined && badge !== null && String(badge) !== "0" && (
        <span className={`pw-nav-badge pw-nav-badge--${badgeColor}`}>{badge}</span>
      )}
    </NavLink>
  );
}

export default function HrLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = useAuthStore((s) => s.role);
  const user = useAuthStore((s) => s.user);
  const schoolId = useAuthStore((s) => s.schoolId);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const { isTertiary } = useSchoolType();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [schoolName, setSchoolName] = useState<string>("Institution");
  const [userName, setUserName] = useState<string>("HR Manager");
  const [userInitials, setUserInitials] = useState<string>("HR");

  const unreadChatTotal = useSchoolChatUnreadTotal(user?.id);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Authorization check
  const isAuthorized = hasRole(role, ROLE_GROUPS.HR_DASHBOARD);

  useEffect(() => {
    if (!schoolId) return;
    const fetchSchoolInfo = async () => {
      const { data } = await supabase
        .from("schools")
        .select("name")
        .eq("school_id", schoolId)
        .maybeSingle();
      if (data?.name) setSchoolName(data.name);
    };
    fetchSchoolInfo();
  }, [schoolId]);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("users")
        .select("name, email")
        .eq("user_id", user.id)
        .maybeSingle();

      const displayName = data?.name || user.email || "HR Manager";
      setUserName(displayName);
      const parts = displayName.split(" ").filter(Boolean);
      const inits = parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : displayName.slice(0, 2).toUpperCase();
      setUserInitials(inits);
    };
    fetchProfile();
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on navigate
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (!isAuthorized) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogout = () => {
    void logoutWithSyncCheck(() => {
      navigate("/login", { replace: true });
    });
  };

  const roleLabel = isTertiary ? "Human Resource Manager" : "Human Resource Officer";

  return (
    <div className={`pw-shell ${theme === "dark" ? "dark" : ""}`}>
      <style>{POS_SIDEBAR_SHARED_CSS}</style>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`pw-sidebar ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } transition-transform duration-200 z-50`}
      >
        {/* Brand Header */}
        <div className="pw-sidebar-brand">
          <div className="pw-brand-logo-wrap">
            <Briefcase className="w-5 h-5 text-teal-500" />
          </div>
          <div className="pw-brand-text">
            <span className="pw-brand-name">PwezaCore</span>
            <span className="pw-brand-sub">HR PORTAL</span>
          </div>
          <button
            type="button"
            className="lg:hidden ml-auto p-1.5 rounded-lg text-gray-400 hover:text-white"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Institution Info Pill */}
        <div className="px-4 py-2 mx-3 mb-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs font-semibold text-teal-600 dark:text-teal-400 flex items-center gap-2 truncate">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{schoolName}</span>
        </div>

        {/* Navigation Sections */}
        <div className="pw-sidebar-nav overflow-y-auto">
          {/* Main */}
          <div className="pw-nav-section">
            <span className="pw-nav-label">Overview</span>
            <NavItem
              to={HR_BASE}
              end
              icon={<LayoutDashboard className="w-4 h-4" />}
              label="Dashboard"
            />
          </div>

          {/* Faculty & Staff Management */}
          <div className="pw-nav-section">
            <span className="pw-nav-label">Faculty & Staff</span>
            <NavItem
              to={`${HR_BASE}/teachers`}
              icon={<GraduationCap className="w-4 h-4" />}
              label={isTertiary ? "Tutors & Lecturers" : "Teachers & Faculty"}
            />
            <NavItem
              to={`${HR_BASE}/staff`}
              icon={<Users className="w-4 h-4" />}
              label="Support Staff"
            />
            <NavItem
              to={`${HR_BASE}/staff/add`}
              icon={<UserPlus className="w-4 h-4" />}
              label="Onboard New Staff"
            />
          </div>

          {/* Compensation & Contracts */}
          <div className="pw-nav-section">
            <span className="pw-nav-label">Compensation & Terms</span>
            <NavItem
              to={`${HR_BASE}/salaries`}
              icon={<DollarSign className="w-4 h-4" />}
              label="Salary Setup"
            />
            <NavItem
              to={`${HR_BASE}/contracts`}
              icon={<FileText className="w-4 h-4" />}
              label="Employment Contracts"
            />
          </div>

          {/* Attendance & Time Tracking */}
          <div className="pw-nav-section">
            <span className="pw-nav-label">Attendance & Time</span>
            <NavItem
              to={`${HR_BASE}/attendance`}
              icon={<CalendarCheck className="w-4 h-4" />}
              label="Staff Attendance"
            />
            <NavItem
              to={`${HR_BASE}/attendance/teachers`}
              icon={<Clock className="w-4 h-4" />}
              label={isTertiary ? "Tutor Logs" : "Teacher Attendance"}
            />
          </div>

          {/* Workforce Operations */}
          <div className="pw-nav-section">
            <span className="pw-nav-label">Workforce Operations</span>
            <NavItem
              to={`${HR_BASE}/leave`}
              icon={<Calendar className="w-4 h-4" />}
              label="Leave & Absence"
            />
            <NavItem
              to={`${HR_BASE}/performance`}
              icon={<Award className="w-4 h-4" />}
              label="Staff Appraisals"
            />
            <NavItem
              to={`${HR_BASE}/recruitment`}
              icon={<Briefcase className="w-4 h-4" />}
              label="Recruitment"
            />
          </div>

          {/* Institutional Tools */}
          <div className="pw-nav-section">
            <span className="pw-nav-label">Communication</span>
            <NavItem
              to={`${HR_BASE}/messages`}
              icon={<MessageSquare className="w-4 h-4" />}
              label="Staff Chat"
              badge={unreadChatTotal > 0 ? unreadChatTotal : undefined}
              badgeColor="teal"
            />
            <NavItem
              to={`${HR_BASE}/calendar`}
              icon={<CalendarDays className="w-4 h-4" />}
              label="Staff Calendar"
            />
            <NavItem
              to={`${HR_BASE}/notifications`}
              icon={<Bell className="w-4 h-4" />}
              label="Notifications"
            />
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="pw-sidebar-footer">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 font-bold text-xs flex items-center justify-center shrink-0 border border-teal-500/30">
              {userInitials}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-gray-900 dark:text-white truncate">{userName}</div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{roleLabel}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main View Container */}
      <div className="pw-main-wrap flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="pw-topbar">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="lg:hidden p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                {roleLabel}
              </span>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate max-w-[200px] md:max-w-xs">
                {schoolName}
              </span>
            </div>
          </div>

          {/* Topbar Actions */}
          <div className="flex items-center gap-2">
            {/* Quick Action Button: Onboard Staff */}
            <button
              type="button"
              onClick={() => navigate(`${HR_BASE}/staff/add`)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-all shadow-sm active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Onboard Staff</span>
            </button>

            {/* Notifications Button */}
            <button
              type="button"
              onClick={() => navigate(`${HR_BASE}/notifications`)}
              className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
            >
              <Bell className="w-4 h-4" />
            </button>

            {/* Chat Button */}
            <button
              type="button"
              onClick={() => navigate(`${HR_BASE}/messages`)}
              className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
            >
              <MessageSquare className="w-4 h-4" />
              {unreadChatTotal > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-teal-500" />
              )}
            </button>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* User Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 font-bold text-xs flex items-center justify-center border border-teal-500/30">
                  {userInitials}
                </div>
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#0D1512] border border-gray-200 dark:border-white/10 shadow-xl py-2 z-50 text-xs">
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-white/5">
                    <div className="font-bold text-gray-900 dark:text-white truncate">{userName}</div>
                    <div className="text-gray-500 dark:text-gray-400 text-[11px] truncate">{roleLabel}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      navigate("/role-picker");
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 text-gray-700 dark:text-gray-300 font-semibold"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Switch Role / Portal</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Child Page Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Suspense fallback={<AdminContentSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
