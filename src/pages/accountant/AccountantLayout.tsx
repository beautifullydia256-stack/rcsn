import { Suspense, useEffect, useState, useRef, useCallback, type ReactNode } from "react";
import { Navigate, Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Search,
  MessageCircle,
  Bell,
  Sun,
  Moon,
  LayoutDashboard,
  MessageSquare,
  Receipt,
  RefreshCw,
  FileText,
  CircleDollarSign,
  Wallet,
  TrendingUp,
  Landmark,
  BarChart3,
  TrendingDown,
  LogOut,
  X,
  Menu,
  History,
  Package,
  Banknote,
  Armchair,
  Repeat,
  ShieldCheck,
  UtensilsCrossed,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { logoutWithSyncCheck } from "../../lib/logoutWithSyncCheck";
import { useSchoolChatUnreadTotal } from "../../hooks/useSchoolChatUnreadTotal";
import { useAuthStore } from "../../store/authStore";
import { useCanAccessAccountantDashboard } from "../../hooks/usePermission";
import ThemedLoadingView from "../../components/ui/ThemedLoadingView";
import { useUIStore } from "../../store/uiStore";
import RecordPaymentModal from "../../components/accountant/RecordPaymentModal";
import RecordExpenseModal from "../../components/accountant/RecordExpenseModal";
import { fetchDebtors, OUTSTANDING_QUERY_KEY } from "./api/outstanding";
import { fetchReceipts, RECEIPTS_QUERY_KEY } from "./api/receipts";
import { fetchBillingData, BILLING_QUERY_KEY } from "./api/billing";
import { fetchExpenses, EXPENSES_QUERY_KEY } from "./api/expenses";
import { fetchFeeCollectionReport, REPORTS_FEE_COLLECTION_QUERY_KEY } from "./api/reports";
import AdminContentSkeleton from "../../components/layout/AdminContentSkeleton";
import AccountantMobileBottomNav from "../../components/layout/AccountantMobileBottomNav";
import { ACCOUNTANT_PW_SHELL_CSS } from "../../lib/pwShellCss";
import { hasRole, ROLE_GROUPS, normalizeRole, logRbacDecision } from "../../lib/rbac";
import { useSchoolType } from "../../hooks/useSchoolType";
import { fetchSchoolTerms } from "../finance/fetchFinancialAnalytics";

type StudentHit = { student_id: string; name: string; current_class: string; admission_number?: string };

function NavItem({
  to,
  icon,
  label,
  end,
  onClick,
  onPrefetch,
  badge,
  badgeColor = "rose",
}: {
  to: string;
  icon: ReactNode;
  label: string;
  end?: boolean;
  onClick?: () => void;
  onPrefetch?: () => void;
  badge?: string | number;
  badgeColor?: "teal" | "amber" | "rose";
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      onMouseEnter={onPrefetch}
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

// Prefetch route chunks on hover/idle so navigation feels instant
const prefetchChunk = (importFn: () => Promise<unknown>) => {
  importFn().catch(() => {});
};

const ACCOUNTANT_ROUTE_CHUNKS = [
  () => import("./Dashboard"),
  () => import("./FeeStructurePage"),
  () => import("./BillingPage"),
  () => import("./PaymentsPage"),
  () => import("./ReceiptsPage"),
  () => import("./OutstandingPage"),
  () => import("./ExpensesPage"),
  () => import("./BankPage"),
  () => import("./ReportsPage"),
  () => import("./AdjustmentsPage"),
  () => import("../finance/FinancialAnalyticsPage"),
  () => import("../admin/students/StudentFeeSyncPage"),
  () => import("./StudentPaymentHistoryPage"),
];

export default function AccountantLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { isTertiary } = useSchoolType();
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const { user, schoolId, role, setUser, setRole, setSchoolId, setPermissions } = useAuthStore();
  const showBackToAdminDashboard = role === "admin";
  const chatUnread = useSchoolChatUnreadTotal(user?.id);
  const chatUnreadBadge = chatUnread > 0 ? (chatUnread > 99 ? "99+" : chatUnread) : undefined;
  const canAccessAccountant = useCanAccessAccountantDashboard();
  const [authChecked, setAuthChecked] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<StudentHit[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [recordPaymentInitialStudent, setRecordPaymentInitialStudent] = useState<{
    student_id: string;
    name?: string;
    current_class?: string;
  } | null>(null);
  const [recordExpenseOpen, setRecordExpenseOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const closeSidebar = () => setSidebarOpen(false);

  const openRecordPayment = useCallback((initialStudentId?: string, studentMeta?: { name?: string; current_class?: string }) => {
    if (initialStudentId) {
      setRecordPaymentInitialStudent({
        student_id: initialStudentId,
        name: studentMeta?.name,
        current_class: studentMeta?.current_class,
      });
    } else {
      setRecordPaymentInitialStudent(null);
    }
    setRecordPaymentOpen(true);
  }, []);

  const closeRecordPayment = useCallback(() => {
    setRecordPaymentOpen(false);
    setRecordPaymentInitialStudent(null);
    // Drop ?student= so PaymentsPage auto-open effect cannot reopen after dismiss (remount / strict / churn).
    const params = new URLSearchParams(location.search);
    if (location.pathname.includes("/accountant/payments") && params.has("student")) {
      params.delete("student");
      const next = params.toString();
      navigate({ pathname: location.pathname, search: next ? `?${next}` : "" }, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  const openRecordExpense = useCallback(() => setRecordExpenseOpen(true), []);

  const displayName = user?.user_metadata?.name ?? user?.email ?? "Accountant";
  const userInitials = displayName
    .split(/\s+/)
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "A";

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    try {
      localStorage.setItem("pwezacore-theme", theme);
    } catch {
      // ignore storage access errors
    }
  }, [theme]);

  useEffect(() => {
    if (!searchQ.trim() || searchQ.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    const t = setTimeout(async () => {
      if (!schoolId) return;
      const q = searchQ.trim().toLowerCase();
      const { data } = await supabase
        .from("students")
        .select("student_id, name, current_class, admission_number")
        .eq("school_id", schoolId)
        .eq("status", "active")
        .or(`name.ilike.%${q}%,current_class.ilike.%${q}%,admission_number.ilike.%${q}%`)
        .limit(8);
      setSearchResults((data || []) as StudentHit[]);
      setSearchOpen(true);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQ, schoolId]);

  // Route guard: Allow accountant and admin roles
  const allowed = hasRole(role, ROLE_GROUPS.ACCOUNTANT_DASHBOARD);
  
  // Debug logging
  logRbacDecision(
    'AccountantLayout',
    location.pathname,
    role,
    normalizeRole(role),
    ROLE_GROUPS.ACCOUNTANT_DASHBOARD,
    allowed
  );

  if (role && !allowed) {
    console.log(`[RBAC] Redirecting unauthorized role (${role}) from accountant dashboard`);
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    if (!searchModalOpen) return;
    const t = window.setTimeout(() => searchInputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchModalOpen(false);
        setSearchQ("");
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [searchModalOpen]);

  // Only redirect after we have confirmed the session. Without this guard,
  // opening the page in a new tab fires this effect with canAccessAccountant=false
  // (role still null) before the auth check below has fetched the user's role,
  // sending them straight to the landing page.
  useEffect(() => {
    if (!authChecked) return;
    if (!canAccessAccountant) {
      navigate("/dashboard", { replace: true });
    }
  }, [authChecked, canAccessAccountant, navigate]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

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
      setAuthChecked(true);
    };
    check();
  }, [navigate, setUser, setRole, setSchoolId]);

  useEffect(() => {
    const run = () => ACCOUNTANT_ROUTE_CHUNKS.forEach((fn) => prefetchChunk(fn));
    const useIdle = typeof requestIdleCallback !== "undefined";
    const id = useIdle ? requestIdleCallback(run, { timeout: 200 }) : window.setTimeout(run, 120);
    return () => (useIdle ? cancelIdleCallback(id as number) : clearTimeout(id));
  }, []);

  useEffect(() => {
    if (!schoolId) return;
    const stale = 60 * 1000;
    queryClient.prefetchQuery({ queryKey: [...OUTSTANDING_QUERY_KEY, schoolId], queryFn: () => fetchDebtors(schoolId), staleTime: stale }).catch(() => {});
    queryClient.prefetchQuery({ queryKey: [...RECEIPTS_QUERY_KEY, schoolId], queryFn: () => fetchReceipts(schoolId), staleTime: stale }).catch(() => {});
    queryClient.prefetchQuery({ queryKey: [...BILLING_QUERY_KEY, schoolId], queryFn: () => fetchBillingData(schoolId), staleTime: stale }).catch(() => {});
    queryClient.prefetchQuery({ queryKey: [...EXPENSES_QUERY_KEY, schoolId], queryFn: () => fetchExpenses(schoolId), staleTime: stale }).catch(() => {});
    queryClient.prefetchQuery({ queryKey: [...REPORTS_FEE_COLLECTION_QUERY_KEY, schoolId], queryFn: () => fetchFeeCollectionReport(schoolId), staleTime: stale }).catch(() => {});
  }, [schoolId, queryClient]);

  const handleLogout = () => {
    void logoutWithSyncCheck(() => {
      setPermissions([]);
      navigate("/");
    });
  };

  if (!canAccessAccountant) {
    return <ThemedLoadingView />;
  }

  const closeSearchModal = () => {
    setSearchModalOpen(false);
    setSearchQ("");
    setSearchOpen(false);
  };

  return (
    <div className="accountant-glass pw-layout fixed inset-0 flex overflow-hidden" data-theme={theme}>
      <style>{ACCOUNTANT_PW_SHELL_CSS}</style>
      <RecordPaymentModal
        open={recordPaymentOpen}
        onClose={closeRecordPayment}
        initialStudentId={recordPaymentInitialStudent?.student_id ?? undefined}
        initialStudentName={recordPaymentInitialStudent?.name}
        initialStudentClass={recordPaymentInitialStudent?.current_class}
      />
      <RecordExpenseModal open={recordExpenseOpen} onClose={() => setRecordExpenseOpen(false)} />

      {searchModalOpen && (
        <div
          className="pw-search-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Search students"
          onClick={closeSearchModal}
        >
          <div ref={searchRef} className="pw-search-panel" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60"
                style={{ color: "var(--pw-t3, #3d5278)" }}
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={isTertiary ? "Search trainees, receipts, invoices..." : "Search students, receipts, invoices..."}
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
              />
            </div>
            {searchOpen && searchResults.length > 0 && (
              <div className="pw-search-results">
                {searchResults.map((st) => (
                  <div
                    key={st.student_id}
                    style={{ borderBottom: "1px solid var(--pw-border, rgba(255,255,255,0.07))" }}
                    className="last:border-b-0"
                  >
                    <div className="px-3 py-2 text-sm font-medium" style={{ color: "var(--pw-t1, #eef3ff)" }}>
                      {st.name} ({st.current_class})
                    </div>
                    <div className="flex gap-3 px-3 pb-2">
                      <button
                        type="button"
                        onClick={() => {
                          openRecordPayment(st.student_id, { name: st.name, current_class: st.current_class });
                          closeSearchModal();
                        }}
                        className="text-xs font-medium"
                        style={{ color: "var(--pw-teal, #10d9a8)" }}
                      >
                        Record payment
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigate(`/dashboard/accountant/outstanding?student=${st.student_id}&q=${encodeURIComponent(st.name)}`);
                          closeSearchModal();
                        }}
                        className="text-xs font-medium"
                        style={{ color: "var(--pw-t2, #8296be)" }}
                      >
                        View balance
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigate(`/dashboard/accountant/student-ledger?student=${st.student_id}&name=${encodeURIComponent(st.name)}`);
                          closeSearchModal();
                        }}
                        className="text-xs font-medium"
                        style={{ color: "var(--pw-cyan, #38bdf8)" }}
                      >
                        Ledger
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <button type="button" className="pw-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar">
        {sidebarOpen ? <X className="w-5 h-5 mx-auto" /> : <Menu className="w-5 h-5 mx-auto" />}
      </button>

      {sidebarOpen && <div className="pw-sidebar-overlay" onClick={closeSidebar} role="presentation" />}

      <aside className={`pw-sidebar ${sidebarOpen ? "pw-sidebar--open" : ""}`}>
        <div className="pw-brand">
          <div className="pw-brand-name">PwezaCore</div>
          <div className="pw-brand-subtitle">Finance & Accounts</div>
          <div className="pw-brand-pill">{isTertiary ? "Bursar" : "Accountant"}</div>
        </div>

        <div className="pw-nav-scroll-area">
          <div className="pw-nav-section">
            <span className="pw-nav-label">Main</span>
            <NavItem
              to="/dashboard/accountant"
              icon={<LayoutDashboard className="w-4 h-4" />}
              label="Dashboard"
              end
              onClick={closeSidebar}
              onPrefetch={() => prefetchChunk(ACCOUNTANT_ROUTE_CHUNKS[0])}
            />
            <NavItem
              to="/dashboard/accountant/messages"
              icon={<MessageSquare className="w-4 h-4" />}
              label="Messages"
              badge={chatUnreadBadge}
              badgeColor="rose"
              onClick={closeSidebar}
            />
          </div>

          <div className="pw-nav-section">
            <span className="pw-nav-label">Finance</span>
            <NavItem to="/dashboard/accountant/fee-structure" icon={<Receipt className="w-4 h-4" />} label={isTertiary ? "Semester Tuition & Levies" : "Fee Structure"} onClick={closeSidebar} onPrefetch={() => prefetchChunk(ACCOUNTANT_ROUTE_CHUNKS[1])} />
            <NavItem to="/dashboard/accountant/fee-sync" icon={<RefreshCw className="w-4 h-4" />} label={isTertiary ? "Trainee Fee Sync" : "Student Fee Sync"} onClick={closeSidebar} onPrefetch={() => prefetchChunk(ACCOUNTANT_ROUTE_CHUNKS[11])} />
            <NavItem to="/dashboard/accountant/billing" icon={<FileText className="w-4 h-4" />} label="Invoices & Billing" onClick={closeSidebar} onPrefetch={() => prefetchChunk(ACCOUNTANT_ROUTE_CHUNKS[2])} />
            <NavItem to="/dashboard/accountant/payments" icon={<CircleDollarSign className="w-4 h-4" />} label="Payments" onClick={closeSidebar} onPrefetch={() => prefetchChunk(ACCOUNTANT_ROUTE_CHUNKS[3])} />
            <NavItem to="/dashboard/accountant/student-ledger" icon={<History className="w-4 h-4" />} label={isTertiary ? "Trainee Payment Ledger" : "Student Payment Ledger"} onClick={closeSidebar} onPrefetch={() => prefetchChunk(ACCOUNTANT_ROUTE_CHUNKS[12])} />
            <NavItem to="/dashboard/accountant/receipts" icon={<Receipt className="w-4 h-4" />} label="Receipts" onClick={closeSidebar} onPrefetch={() => prefetchChunk(ACCOUNTANT_ROUTE_CHUNKS[4])} />
            <NavItem to="/dashboard/accountant/outstanding" icon={<Wallet className="w-4 h-4" />} label="Outstanding Fees" onClick={closeSidebar} onPrefetch={() => prefetchChunk(ACCOUNTANT_ROUTE_CHUNKS[5])} />
            <NavItem to="/dashboard/accountant/expenses" icon={<TrendingUp className="w-4 h-4" />} label="Expenses" onClick={closeSidebar} onPrefetch={() => prefetchChunk(ACCOUNTANT_ROUTE_CHUNKS[6])} />
            <NavItem to="/dashboard/accountant/budget/consolidated" icon={<ShieldCheck className="w-4 h-4 text-purple-400" />} label="Monthly Board Budget (Quorum)" onClick={closeSidebar} />
            <NavItem to="/dashboard/accountant/budget/requisitions" icon={<FileText className="w-4 h-4 text-indigo-400" />} label="Budget Requisitions Pipeline" onClick={closeSidebar} />
            <NavItem to="/dashboard/accountant/store/daily-indent" icon={<UtensilsCrossed className="w-4 h-4 text-emerald-400" />} label="Daily Kitchen & Store Indents" onClick={closeSidebar} />
            <NavItem to="/dashboard/accountant/recurring-expenses" icon={<Repeat className="w-4 h-4" />} label="Recurring & Utility Bills" onClick={closeSidebar} />
            <NavItem to="/dashboard/accountant/store" icon={<Package className="w-4 h-4" />} label="Store & Food Supplies" onClick={closeSidebar} />
            <NavItem to="/dashboard/accountant/property-assets" icon={<Armchair className="w-4 h-4" />} label="Furniture & Physical Assets" onClick={closeSidebar} />
            <NavItem to="/dashboard/accountant/salary-obligations" icon={<Banknote className="w-4 h-4" />} label="Salary Obligations" onClick={closeSidebar} />
            <NavItem to="/dashboard/accountant/bank" icon={<Landmark className="w-4 h-4" />} label="Bank & Cash" onClick={closeSidebar} onPrefetch={() => prefetchChunk(ACCOUNTANT_ROUTE_CHUNKS[7])} />
            <NavItem to="/dashboard/accountant/reports" icon={<BarChart3 className="w-4 h-4" />} label="Reports" onClick={closeSidebar} onPrefetch={() => prefetchChunk(ACCOUNTANT_ROUTE_CHUNKS[8])} />
            <NavItem to="/dashboard/accountant/adjustments" icon={<RefreshCw className="w-4 h-4" />} label="Adjustments" onClick={closeSidebar} onPrefetch={() => prefetchChunk(ACCOUNTANT_ROUTE_CHUNKS[9])} />
            <NavItem
              to="/dashboard/accountant/financial-analytics"
              icon={<TrendingDown className="w-4 h-4" />}
              label="Financial Analytics"
              onClick={closeSidebar}
              onPrefetch={() => {
                prefetchChunk(ACCOUNTANT_ROUTE_CHUNKS[10]);
                if (schoolId) {
                  queryClient.prefetchQuery({
                    queryKey: ["financial-analytics", "terms", schoolId],
                    queryFn: () => fetchSchoolTerms(schoolId),
                    staleTime: 5 * 60 * 1000,
                  });
                }
              }}
            />
          </div>

          <div className="pw-nav-section">
            <span className="pw-nav-label">Quick</span>
            <button
              type="button"
              className="pw-nav-link"
              onClick={() => {
                setSearchModalOpen(true);
                closeSidebar();
              }}
            >
              <span className="pw-nav-ic"><Search className="w-4 h-4" /></span>
              <span className="pw-nav-text">{isTertiary ? "Search trainees" : "Search students"}</span>
            </button>
          </div>
        </div>

        <div className="pw-sidebar-tools">
          <button type="button" onClick={toggleTheme} title={theme === "light" ? "Switch to dark mode" : "Switch to white mode"}>
            {theme === "light" ? <Moon className="h-4 w-4 shrink-0" /> : <Sun className="h-4 w-4 shrink-0" />}
            <span>{theme === "light" ? "Dark Mode" : "White Mode"}</span>
          </button>
          <button
            type="button"
            aria-label="Messages"
            title="Messages"
            className="relative"
            onClick={() => {
              navigate("/dashboard/accountant/messages");
              closeSidebar();
            }}
          >
            <MessageCircle className="h-4 w-4 shrink-0" />
            {chatUnread > 0 && (
              <span
                className="pw-nav-badge pw-nav-badge--rose absolute -right-1 -top-1 min-w-[16px] scale-90 px-1 text-[9px] leading-[16px]"
                style={{ padding: "0 4px" }}
              >
                {chatUnread > 99 ? "99+" : chatUnread}
              </span>
            )}
          </button>
          <button type="button" aria-label="Notifications" title="Notifications" onClick={() => navigate('/dashboard/accountant/notifications')}>
            <Bell className="h-4 w-4 shrink-0" />
          </button>
        </div>

        <div className="pw-sidebar-bottom">
          <div className="pw-admin-card">
            <div className="pw-admin-av">{userInitials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="pw-admin-name">{displayName}</div>
              <div className="pw-admin-role">{isTertiary ? "Bursar" : "Accountant"}</div>
            </div>
          </div>
          <button type="button" className="pw-logout-btn" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main
        className={
          location.pathname.startsWith('/dashboard/accountant/messages') ? 'pw-main pw-main--chat' : 'pw-main'
        }
      >
        {showBackToAdminDashboard && (
          <div
            className="pw-back-bar flex shrink-0 items-center justify-end border-b px-4 py-2"
            style={{
              flex: "0 0 auto",
              borderColor: "var(--pw-border, rgba(255,255,255,0.07))",
              background: "var(--pw-s2, #101828)",
            }}
          >
            <button
              type="button"
              onClick={() => navigate("/dashboard/admin")}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                color: "var(--pw-teal, #10d9a8)",
                border: "1px solid rgba(16,217,168,0.35)",
                background: "rgba(16,217,168,0.08)",
              }}
            >
              ← Back to Admin dashboard
            </button>
          </div>
        )}
        <div className="flex-1 min-h-0 flex flex-col w-full h-full">
          <Suspense
            fallback={
              <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
                <AdminContentSkeleton />
              </div>
            }
          >
            <Outlet context={{ openRecordPayment, openRecordExpense }} />
          </Suspense>
        </div>
      </main>

      <AccountantMobileBottomNav />
    </div>
  );
}
