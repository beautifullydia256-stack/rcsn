import { Suspense, useEffect, useState, useRef } from "react";
import { Outlet, NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Search, MessageCircle, Bell, Sun, Moon } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { useCanAccessAccountantDashboard } from "../../hooks/usePermission";
import ThemedLoadingView from "../../components/ui/ThemedLoadingView";
import { useUIStore } from "../../store/uiStore";
import RecordPaymentModal from "../../components/accountant/RecordPaymentModal";
import { fetchDebtors, OUTSTANDING_QUERY_KEY } from "./api/outstanding";
import { fetchReceipts, RECEIPTS_QUERY_KEY } from "./api/receipts";
import { fetchBillingData, BILLING_QUERY_KEY } from "./api/billing";
import { fetchExpenses, EXPENSES_QUERY_KEY } from "./api/expenses";
import { fetchFeeCollectionReport, REPORTS_FEE_COLLECTION_QUERY_KEY } from "./api/reports";

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
];

/** Inline styles aligned with `AdminLayout` sidebar shell (pw-* tokens), scoped to accountant + data-theme. */
const ACCOUNTANT_PW_SHELL_CSS = `
  .accountant-glass.pw-layout[data-theme="dark"] {
    --pw-bg: #05080f;
    --pw-s1: #0b1120;
    --pw-s2: #101828;
    --pw-s3: #141c2e;
    --pw-s4: #1d2d4e;
    --pw-t1: #eef3ff;
    --pw-t2: #8296be;
    --pw-t3: #3d5278;
    --pw-border: rgba(255,255,255,0.07);
    --pw-bh: rgba(255,255,255,0.12);
  }
  .accountant-glass.pw-layout[data-theme="light"] {
    --pw-bg: #f0f4f8;
    --pw-s1: #ffffff;
    --pw-s2: #f5f7fa;
    --pw-s3: #e8edf5;
    --pw-s4: #d0dbe8;
    --pw-t1: #0d1c2e;
    --pw-t2: #4a6080;
    --pw-t3: #8aa0b8;
    --pw-border: rgba(0,0,0,0.08);
    --pw-bh: rgba(0,0,0,0.14);
  }
  .accountant-glass.pw-layout {
    display: flex;
    min-height: 100vh;
    height: 100vh;
    max-height: 100vh;
    overflow: hidden;
    background: var(--ac-page-bg);
    font-family: 'Instrument Sans', 'Cabinet Grotesk', system-ui, sans-serif;
  }
  .accountant-glass .pw-sidebar {
    width: var(--pw-sidebar-width, 232px);
    min-height: 100vh;
    background: var(--pw-s1, #0b1120);
    border-right: 1px solid var(--pw-border, rgba(255,255,255,0.07));
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0; left: 0; bottom: 0;
    z-index: 200;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
    -ms-overflow-style: none;
    transition: transform 0.28s cubic-bezier(.4,0,.2,1);
  }
  .accountant-glass .pw-sidebar::-webkit-scrollbar { width: 0; height: 0; display: none; }
  @media (max-width: 768px) {
    .accountant-glass .pw-sidebar { transform: translateX(-100%); }
    .accountant-glass .pw-sidebar.pw-sidebar--open { transform: translateX(0); }
  }
  .accountant-glass .pw-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 20px 16px 18px;
    border-bottom: 1px solid var(--pw-border, rgba(255,255,255,0.07));
    flex-shrink: 0;
  }
  .accountant-glass .pw-brand-logo {
    width: 33px; height: 33px;
    background: linear-gradient(135deg, var(--pw-teal, #10d9a8), #0ea5e9);
    border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    font-size: 17px; flex-shrink: 0;
    box-shadow: 0 4px 14px rgba(16,217,168,0.22);
  }
  .accountant-glass .pw-brand-name {
    font-family: 'Cabinet Grotesk', sans-serif;
    font-weight: 800; font-size: 16.5px;
    letter-spacing: -0.2px;
    color: var(--pw-t1, #eef3ff);
  }
  .accountant-glass .pw-brand-pill {
    margin-left: auto;
    font-size: 9px; font-weight: 700;
    letter-spacing: 0.8px; text-transform: uppercase;
    color: var(--pw-teal, #10d9a8);
    background: rgba(16,217,168,0.10);
    border: 1px solid rgba(16,217,168,0.2);
    border-radius: 4px;
    padding: 2px 6px;
    flex-shrink: 0;
  }
  .accountant-glass .pw-nav-section { padding: 16px 10px 4px; }
  .accountant-glass .pw-nav-label {
    font-size: 9.5px; font-weight: 700;
    letter-spacing: 1.2px; text-transform: uppercase;
    color: var(--pw-t3, #3d5278);
    padding: 0 6px; margin-bottom: 5px;
    display: block;
  }
  .accountant-glass .pw-nav-link {
    display: flex; align-items: center; gap: 9px;
    padding: 8px 10px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s;
    color: var(--pw-t2, #8296be);
    font-size: 13px; font-weight: 500;
    white-space: nowrap;
    text-decoration: none;
    width: 100%;
    border: 1px solid transparent;
    background: transparent;
    font-family: inherit;
  }
  .accountant-glass .pw-nav-link:hover {
    background: var(--pw-s2, #101828);
    color: var(--pw-t1, #eef3ff);
  }
  .accountant-glass .pw-nav-link--active {
    background: rgba(16,217,168,0.10) !important;
    color: var(--pw-teal, #10d9a8) !important;
    border-color: rgba(16,217,168,0.15) !important;
  }
  .accountant-glass .pw-nav-ic { font-size: 15px; flex-shrink: 0; width: 18px; text-align: center; }
  .accountant-glass .pw-nav-text { flex: 1; text-align: left; }
  .accountant-glass .pw-sidebar-bottom {
    margin-top: auto;
    padding: 12px;
    border-top: 1px solid var(--pw-border, rgba(255,255,255,0.07));
    flex-shrink: 0;
  }
  .accountant-glass .pw-admin-card {
    display: flex; align-items: center; gap: 9px;
    padding: 9px 10px;
    border-radius: 8px;
    background: var(--pw-s2, #101828);
    border: 1px solid var(--pw-border, rgba(255,255,255,0.07));
    cursor: default;
    transition: border-color 0.2s;
  }
  .accountant-glass .pw-admin-av {
    width: 32px; height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--pw-teal, #10d9a8), #3d8ef8);
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700;
    color: #05080f;
    flex-shrink: 0;
  }
  .accountant-glass .pw-admin-name {
    font-size: 12px; font-weight: 600;
    color: var(--pw-t1, #eef3ff);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .accountant-glass .pw-admin-role { font-size: 10.5px; color: var(--pw-t3, #3d5278); }
  .accountant-glass .pw-logout-btn {
    display: flex; align-items: center; gap: 9px;
    padding: 7px 10px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.14s;
    color: var(--pw-rose, #f75c5c);
    font-size: 13px; font-weight: 500;
    background: transparent;
    border: none;
    width: 100%;
    font-family: inherit;
    margin-top: 6px;
  }
  .accountant-glass .pw-logout-btn:hover { background: rgba(247,92,92,0.10); }
  .accountant-glass .pw-sidebar-overlay { display: none; }
  @media (max-width: 768px) {
    .accountant-glass .pw-sidebar-overlay {
      display: block;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      z-index: 199;
      backdrop-filter: blur(2px);
    }
  }
  .accountant-glass .pw-hamburger {
    display: none;
    position: fixed;
    top: 14px; left: 14px;
    z-index: 300;
    width: 36px; height: 36px;
    border-radius: 8px;
    background: var(--pw-s2, #101828);
    border: 1px solid var(--pw-border, rgba(255,255,255,0.07));
    align-items: center; justify-content: center;
    cursor: pointer;
    font-size: 16px;
    color: var(--pw-t1, #eef3ff);
    transition: border-color 0.14s;
  }
  .accountant-glass .pw-hamburger:hover { border-color: var(--pw-bh, rgba(255,255,255,0.12)); }
  @media (max-width: 768px) { .accountant-glass .pw-hamburger { display: flex; } }
  .accountant-glass .pw-main {
    margin-left: var(--pw-sidebar-width, 232px);
    flex: 1;
    min-height: 0;
    width: calc(100% - var(--pw-sidebar-width, 232px));
    overflow-x: hidden;
    overflow-y: auto;
    background: var(--ac-page-bg);
    color: var(--ac-text-primary);
  }
  @media (max-width: 768px) {
    .accountant-glass .pw-main {
      margin-left: 0;
      width: 100%;
    }
  }
  .accountant-glass[data-theme="dark"] .pw-main table,
  .accountant-glass[data-theme="dark"] .pw-main th,
  .accountant-glass[data-theme="dark"] .pw-main td { color: #eef3ff; }
  .accountant-glass[data-theme="light"] .pw-main table,
  .accountant-glass[data-theme="light"] .pw-main th,
  .accountant-glass[data-theme="light"] .pw-main td { color: #0d1c2e; }
`;

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
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [recordPaymentInitialStudentId, setRecordPaymentInitialStudentId] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const closeSidebar = () => setSidebarOpen(false);

  const openRecordPayment = (initialStudentId?: string) => {
    setRecordPaymentInitialStudentId(initialStudentId ?? null);
    setRecordPaymentOpen(true);
  };

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
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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

  return (
    <div
      className="accountant-glass pw-layout fixed inset-0 flex overflow-hidden"
      data-theme={theme}
      style={{ background: "var(--ac-page-bg)", backgroundColor: "var(--ac-page-bg)" }}
    >
      <style>{ACCOUNTANT_PW_SHELL_CSS}</style>
      <RecordPaymentModal
        open={recordPaymentOpen}
        onClose={() => {
          setRecordPaymentOpen(false);
          setRecordPaymentInitialStudentId(null);
        }}
        initialStudentId={recordPaymentInitialStudentId ?? undefined}
      />

      <button type="button" className="pw-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar">
        {sidebarOpen ? "✕" : "☰"}
      </button>

      {sidebarOpen && <div className="pw-sidebar-overlay" onClick={closeSidebar} role="presentation" />}

      <aside className={`pw-sidebar ${sidebarOpen ? "pw-sidebar--open" : ""}`}>
        <div className="pw-brand">
          <div className="pw-brand-logo">💳</div>
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

      <main className="pw-main flex flex-col min-h-0">
        <header className="ac-glass-header flex-shrink-0 px-6 py-4 max-md:pl-14">
          <div className="flex items-center justify-end gap-4">
            <div ref={searchRef} className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search students, receipts, invoices..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
                className="ac-glass-card w-full rounded-xl py-2.5 pl-4 pr-10 text-sm ac-text-primary placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              {searchOpen && searchResults.length > 0 && (
                <div className="ac-glass-card absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-hidden overflow-y-auto rounded-xl shadow-lg">
                  {searchResults.map((st) => (
                    <div key={st.student_id} className="border-b border-slate-200/50 last:border-0">
                      <div className="ac-text-primary px-3 py-2 text-sm font-medium">
                        {st.name} ({st.current_class})
                      </div>
                      <div className="flex gap-2 px-3 pb-2">
                        <button
                          type="button"
                          onClick={() => {
                            openRecordPayment(st.student_id);
                            setSearchOpen(false);
                            setSearchQ("");
                          }}
                          className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                        >
                          Record payment
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigate("/dashboard/accountant/outstanding");
                            setSearchOpen(false);
                            setSearchQ("");
                          }}
                          className="text-xs font-medium text-slate-600 hover:text-slate-700"
                        >
                          View balance
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
              <MessageCircle className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="ac-glass-card relative flex h-10 w-10 items-center justify-center rounded-full ac-text-secondary transition-colors hover:opacity-90"
            >
              <Bell className="h-5 w-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 pl-2">
              <span className="ac-text-primary text-sm font-medium">{displayName}</span>
              <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600" />
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto min-h-0">
          <Suspense
            fallback={
              <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="animate-pulse space-y-6">
                  <div className="h-8 w-56 rounded bg-slate-200" />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-28 rounded-xl bg-slate-200" />
                    ))}
                  </div>
                  <div className="h-64 rounded-xl bg-slate-200" />
                </div>
              </div>
            }
          >
            <Outlet context={{ openRecordPayment }} />
          </Suspense>
        </div>
        <footer className="ac-glass-footer flex-shrink-0 px-6 py-4">
          <div className="ac-text-secondary flex flex-wrap items-center justify-between gap-3 text-sm">
            <span>Copyright © {new Date().getFullYear()} PwezaCore</span>
            <div className="flex flex-wrap items-center gap-6">
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
            <div className="flex items-center gap-3 text-slate-400">
              <span className="font-bold">f</span>
              <span>𝕏</span>
              <span className="font-bold">in</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
