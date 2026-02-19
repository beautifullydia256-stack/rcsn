import { useEffect, useState, useRef } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";

type StudentHit = { student_id: string; name: string; current_class: string; admission_number?: string };

function NavLinkStyle({
  to,
  end,
  icon: Icon,
  children,
}: {
  to: string;
  end?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <NavLink to={to} end={end} className="block">
      {({ isActive }) => (
        <span
          className={`flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
            isActive ? "bg-emerald-600 text-white" : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          <Icon className="w-5 h-5 flex-shrink-0 [color:inherit]" />
          {children}
        </span>
      )}
    </NavLink>
  );
}

export default function AccountantLayout() {
  const navigate = useNavigate();
  const { user, schoolId, setUser, setRole, setSchoolId } = useAuthStore();
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<StudentHit[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="fixed inset-0 flex bg-slate-50 overflow-hidden">
      <aside className="w-52 flex flex-col flex-shrink-0 z-10 overflow-y-auto bg-white border-r border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 px-4 py-6 border-b border-slate-200">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600">
            <CreditCard className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg text-slate-900">PwezaCore</span>
        </div>
        <div className="px-4 pt-2 pb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Menu</span>
        </div>
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          <NavLinkStyle to="/dashboard/accountant" end icon={LayoutDashboard}>
            Dashboard
          </NavLinkStyle>
          <NavLinkStyle to="/dashboard/accountant/billing" icon={FileText}>
            Invoices & Billing
          </NavLinkStyle>
          <NavLinkStyle to="/dashboard/accountant/outstanding" icon={Wallet}>
            Outstanding Fees
          </NavLinkStyle>
          <NavLinkStyle to="/dashboard/accountant/receipts" icon={Receipt}>
            Receipts
          </NavLinkStyle>
          <NavLinkStyle to="/dashboard/accountant/expenses" icon={TrendingUp}>
            Expenses
          </NavLinkStyle>
          <NavLinkStyle to="/dashboard/accountant/reports" icon={BarChart3}>
            Reports
          </NavLinkStyle>
          <NavLinkStyle to="/dashboard/accountant/bank" icon={Building2}>
            Bank & Cash
          </NavLinkStyle>
        </nav>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        <header className="flex-shrink-0 border-b border-slate-200 bg-white/80 backdrop-blur-sm px-6 py-4">
          <div className="flex items-center justify-end gap-4">
            <div ref={searchRef} className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search students, receipts, invoices..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-4 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              {searchOpen && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-hidden overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                  {searchResults.map((st) => (
                    <div key={st.student_id} className="border-b border-slate-50 last:border-0">
                      <div className="px-3 py-2 text-sm font-medium text-slate-900">{st.name} ({st.current_class})</div>
                      <div className="flex gap-2 px-3 pb-2">
                        <button
                          type="button"
                          onClick={() => { navigate("/dashboard/accountant/payments"); setSearchOpen(false); setSearchQ(""); }}
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
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
            >
              <MessageCircle className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
            >
              <Bell className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 pl-2">
              <span className="text-sm font-medium text-slate-800">
                {user?.user_metadata?.name ?? user?.email ?? "Accountant"}
              </span>
              <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600" />
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto min-h-0">
          <Outlet />
        </div>
        <footer className="flex-shrink-0 border-t border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Copyright © 2025 PwezaCore</span>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-slate-700">Privacy Policy</a>
              <a href="#" className="hover:text-slate-700">Terms and conditions</a>
              <a href="#" className="hover:text-slate-700">Contact</a>
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
