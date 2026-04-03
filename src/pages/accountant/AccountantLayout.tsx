import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Search, MessageCircle, Bell, Sun, Moon } from "lucide-react";
import { supabase } from "../../lib/supabase";
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
import { ACCOUNTANT_PW_SHELL_CSS } from "../../lib/pwShellCss";

type StudentHit = { student_id: string; name: string; current_class: string; admission_number?: string };

function NavItem({
  to,
  icon,
  label,
  end,
  onClick,
  onPrefetch,
}: {
  to: string;
  icon: string;
  label: string;
  end?: boolean;
  onClick?: () => void;
  onPrefetch?: () => void;
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
];

export default function AccountantLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const { user, schoolId, setUser, setRole, setSchoolId, setPermissions } = useAuthStore();
  const canAccessAccountant = useCanAccessAccountantDashboard();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<StudentHit[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [recordPaymentInitialStudentId, setRecordPaymentInitialStudentId] = useState<string | null>(null);
  const [recordExpenseOpen, setRecordExpenseOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const closeSidebar = () => setSidebarOpen(false);

  const openRecordPayment = useCallback((initialStudentId?: string) => {
    setRecordPaymentInitialStudentId(initialStudentId ?? null);
    setRecordPaymentOpen(true);
  }, []);

  const closeRecordPayment = useCallback(() => {
    setRecordPaymentOpen(false);
    setRecordPaymentInitialStudentId(null);
  }, []);

  const openRecordExpense = useCallback(() => setRecordExpenseOpen(true), []);

  const displayName = user?.user_metadata?.name ?? user?.email ?? "Accountant";
  const userInitials = displayName
    .split(/\s+/)
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "A";

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

  useEffect(() => {
    if (!canAccessAccountant) {
      navigate("/dashboard", { replace: true });
    }
  }, [canAccessAccountant, navigate]);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setPermissions([]);
    navigate("/");
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
        initialStudentId={recordPaymentInitialStudentId ?? undefined}
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
                placeholder="Search students, receipts, invoices..."
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
                          openRecordPayment(st.student_id);
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
                          navigate("/dashboard/accountant/outstanding");
                          closeSearchModal();
                        }}
                        className="text-xs font-medium"
                        style={{ color: "var(--pw-t2, #8296be)" }}
                      >
                        View balance
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
        {sidebarOpen ? "✕" : "☰"}
      </button>

      {sidebarOpen && <div className="pw-sidebar-overlay" onClick={closeSidebar} role="presentation" />}

      <aside className={`pw-sidebar ${sidebarOpen ? "pw-sidebar--open" : ""}`}>
        <div className="pw-brand">
          <div className="pw-brand-logo">🎓</div>
          <span className="pw-brand-name">PwezaCore</span>
          <span className="pw-brand-pill">Accounts</span>
        </div>

        <div className="pw-nav-section">
          <span className="pw-nav-label">Main</span>
          <NavItem
            to="/dashboard/accountant"
            icon="⊞"
            label="Dashboard"
            end
            onClick={closeSidebar}
            onPrefetch={() => prefetchChunk(ACCOUNTANT_ROUTE_CHUNKS[0])}
          />
          <NavItem to="/dashboard/accountant/messages" icon="💬" label="Messages" onClick={closeSidebar} />
        </div>

        <div className="pw-nav-section">
          <span className="pw-nav-label">Finance</span>
          <NavItem to="/dashboard/accountant/fee-structure" icon="💵" label="Fee Structure" onClick={closeSidebar} onPrefetch={() => prefetchChunk(ACCOUNTANT_ROUTE_CHUNKS[1])} />
          <NavItem to="/dashboard/accountant/billing" icon="📄" label="Invoices & Billing" onClick={closeSidebar} onPrefetch={() => prefetchChunk(ACCOUNTANT_ROUTE_CHUNKS[2])} />
          <NavItem to="/dashboard/accountant/payments" icon="💸" label="Payments" onClick={closeSidebar} onPrefetch={() => prefetchChunk(ACCOUNTANT_ROUTE_CHUNKS[3])} />
          <NavItem to="/dashboard/accountant/receipts" icon="🧾" label="Receipts" onClick={closeSidebar} onPrefetch={() => prefetchChunk(ACCOUNTANT_ROUTE_CHUNKS[4])} />
          <NavItem to="/dashboard/accountant/outstanding" icon="💰" label="Outstanding Fees" onClick={closeSidebar} onPrefetch={() => prefetchChunk(ACCOUNTANT_ROUTE_CHUNKS[5])} />
          <NavItem to="/dashboard/accountant/expenses" icon="📈" label="Expenses" onClick={closeSidebar} onPrefetch={() => prefetchChunk(ACCOUNTANT_ROUTE_CHUNKS[6])} />
          <NavItem to="/dashboard/accountant/bank" icon="🏦" label="Bank & Cash" onClick={closeSidebar} onPrefetch={() => prefetchChunk(ACCOUNTANT_ROUTE_CHUNKS[7])} />
          <NavItem to="/dashboard/accountant/reports" icon="📊" label="Reports" onClick={closeSidebar} onPrefetch={() => prefetchChunk(ACCOUNTANT_ROUTE_CHUNKS[8])} />
          <NavItem to="/dashboard/accountant/adjustments" icon="🔄" label="Adjustments" onClick={closeSidebar} onPrefetch={() => prefetchChunk(ACCOUNTANT_ROUTE_CHUNKS[9])} />
          <NavItem to="/dashboard/accountant/financial-analytics" icon="📉" label="Financial Analytics" onClick={closeSidebar} onPrefetch={() => prefetchChunk(ACCOUNTANT_ROUTE_CHUNKS[10])} />
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
            <span className="pw-nav-ic">🔍</span>
            <span className="pw-nav-text">Search students</span>
          </button>
        </div>

        <div className="pw-sidebar-tools">
          <button type="button" onClick={toggleTheme} title={theme === "light" ? "Switch to dark" : "Switch to light"}>
            {theme === "light" ? <Moon className="h-4 w-4 shrink-0" /> : <Sun className="h-4 w-4 shrink-0" />}
            <span>Theme</span>
          </button>
          <button type="button" aria-label="Messages" title="Messages">
            <MessageCircle className="h-4 w-4 shrink-0" />
          </button>
          <button type="button" aria-label="Notifications" title="Notifications">
            <Bell className="h-4 w-4 shrink-0" />
          </button>
        </div>

        <div className="pw-sidebar-bottom">
          <div className="pw-admin-card">
            <div className="pw-admin-av">{userInitials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="pw-admin-name">{displayName}</div>
              <div className="pw-admin-role">Accountant</div>
            </div>
          </div>
          <button type="button" className="pw-logout-btn" onClick={handleLogout}>
            <span className="pw-nav-ic">🚪</span>
            Logout
          </button>
        </div>
      </aside>

      <main
        className={
          location.pathname.startsWith('/dashboard/accountant/messages') ? 'pw-main pw-main--chat' : 'pw-main'
        }
      >
        <Suspense
          fallback={
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
              <AdminContentSkeleton />
            </div>
          }
        >
          <Outlet context={{ openRecordPayment, openRecordExpense }} />
        </Suspense>
      </main>
    </div>
  );
}
