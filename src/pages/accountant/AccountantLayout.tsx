import { Suspense, useEffect, useState, useRef } from "react";
import { Outlet, NavLink, Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  CreditCard,
  FileText,
  Wallet,
  Receipt,
  TrendingUp,
  BarChart3,
  Building2,
  Search,
  MessageCircle,
  Bell,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Banknote,
  RotateCcw,
  LogOut,
} from "lucide-react";
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
        <span
          className={`ac-sidebar-nav-item ${isActive ? "ac-sidebar-nav-item-active" : ""}`}
        >
          <Icon className="h-5 w-5 flex-shrink-0 [color:inherit]" />
          <span className="flex-1">{children}</span>
          {isActive && <ChevronRight className="h-4 w-4 flex-shrink-0 opacity-80" />}
        </span>
      )}
    </NavLink>
  );
}

export default function AccountantLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const { user, schoolId, setUser, setRole, setSchoolId, setPermissions } = useAuthStore();
  const canAccessAccountant = useCanAccessAccountantDashboard();
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<StudentHit[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [recordPaymentInitialStudentId, setRecordPaymentInitialStudentId] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const openRecordPayment = (initialStudentId?: string) => {
    setRecordPaymentInitialStudentId(initialStudentId ?? null);
    setRecordPaymentOpen(true);
  };

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

  // Prefetch all accountant route chunks as soon as possible (idle or short delay) so navigation is instant
  useEffect(() => {
    const run = () => ACCOUNTANT_ROUTE_CHUNKS.forEach((fn) => prefetchChunk(fn));
    const useIdle = typeof requestIdleCallback !== "undefined";
    const id = useIdle ? requestIdleCallback(run, { timeout: 200 }) : window.setTimeout(run, 120);
    return () => (useIdle ? cancelIdleCallback(id as number) : clearTimeout(id));
  }, []);

  // Prefetch accountant page data in background when schoolId is ready so pages open with data
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
    <div className="accountant-glass fixed inset-0 flex overflow-hidden" data-theme={theme} style={{ background: "var(--ac-page-bg)", backgroundColor: "var(--ac-page-bg)" }}>
      <RecordPaymentModal
        open={recordPaymentOpen}
        onClose={() => { setRecordPaymentOpen(false); setRecordPaymentInitialStudentId(null); }}
        initialStudentId={recordPaymentInitialStudentId ?? undefined}
      />
      <aside className="ac-glass-sidebar w-56 flex flex-col flex-shrink-0 z-10 overflow-y-auto">
        {/* Logo row: icon in glass circle + name + collapse (reference style) */}
        <div className="flex items-center justify-between gap-2 px-4 py-5 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
              <CreditCard className="h-5 w-5 text-white" />
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
          <NavLinkStyle to="/dashboard/accountant" end icon={LayoutDashboard} onPrefetch={() => prefetchChunk(ACCOUNTANT_ROUTE_CHUNKS[0])}>
            Dashboard
          </NavLinkStyle>
          <NavLinkStyle to="/dashboard/accountant/fee-structure" icon={DollarSign} onPrefetch={() => prefetchChunk(ACCOUNTANT_ROUTE_CHUNKS[1])}>
            Fee Structure
          </NavLinkStyle>
          <NavLinkStyle to="/dashboard/accountant/billing" icon={FileText} onPrefetch={() => prefetchChunk(ACCOUNTANT_ROUTE_CHUNKS[2])}>
            Invoices & Billing
          </NavLinkStyle>
          <NavLinkStyle to="/dashboard/accountant/payments" icon={Banknote} onPrefetch={() => prefetchChunk(ACCOUNTANT_ROUTE_CHUNKS[3])}>
            Payments
          </NavLinkStyle>
          <NavLinkStyle to="/dashboard/accountant/receipts" icon={Receipt} onPrefetch={() => prefetchChunk(ACCOUNTANT_ROUTE_CHUNKS[4])}>
            Receipts
          </NavLinkStyle>
          <NavLinkStyle to="/dashboard/accountant/outstanding" icon={Wallet} onPrefetch={() => prefetchChunk(ACCOUNTANT_ROUTE_CHUNKS[5])}>
            Outstanding Fees
          </NavLinkStyle>
          <NavLinkStyle to="/dashboard/accountant/expenses" icon={TrendingUp} onPrefetch={() => prefetchChunk(ACCOUNTANT_ROUTE_CHUNKS[6])}>
            Expenses
          </NavLinkStyle>
          <NavLinkStyle to="/dashboard/accountant/bank" icon={Building2} onPrefetch={() => prefetchChunk(ACCOUNTANT_ROUTE_CHUNKS[7])}>
            Bank & Cash
          </NavLinkStyle>
          <NavLinkStyle to="/dashboard/accountant/reports" icon={BarChart3} onPrefetch={() => prefetchChunk(ACCOUNTANT_ROUTE_CHUNKS[8])}>
            Reports
          </NavLinkStyle>
          <NavLinkStyle to="/dashboard/accountant/adjustments" icon={RotateCcw} onPrefetch={() => prefetchChunk(ACCOUNTANT_ROUTE_CHUNKS[9])}>
            Adjustments
          </NavLinkStyle>
          <button
            type="button"
            onClick={handleLogout}
            className="ac-sidebar-nav-item w-full text-left"
          >
            <LogOut className="h-5 w-5 flex-shrink-0 [color:inherit]" />
            <span className="flex-1">Logout</span>
          </button>
        </nav>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden min-h-0" style={{ background: "transparent" }}>
        <header className="ac-glass-header flex-shrink-0 px-6 py-4">
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
                      <div className="ac-text-primary px-3 py-2 text-sm font-medium">{st.name} ({st.current_class})</div>
                      <div className="flex gap-2 px-3 pb-2">
                        <button
                          type="button"
                          onClick={() => { openRecordPayment(st.student_id); setSearchOpen(false); setSearchQ(""); }}
                          className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                        >
                          Record payment
                        </button>
                        <button
                          type="button"
                          onClick={() => { navigate("/dashboard/accountant/outstanding"); setSearchOpen(false); setSearchQ(""); }}
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
            <div className="flex items-center gap-2 pl-2">
              <span className="ac-text-primary text-sm font-medium">
                {user?.user_metadata?.name ?? user?.email ?? "Accountant"}
              </span>
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
          <div className="ac-text-secondary flex items-center justify-between text-sm">
            <span>Copyright © {new Date().getFullYear()} PwezaCore</span>
            <div className="flex items-center gap-6">
              <Link to="/privacy-policy" className="hover:opacity-100 opacity-80">Privacy Policy</Link>
              <Link to="/affiliate-terms" className="hover:opacity-100 opacity-80">Terms and conditions</Link>
              <Link to="/contact" className="hover:opacity-100 opacity-80">Contact</Link>
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
