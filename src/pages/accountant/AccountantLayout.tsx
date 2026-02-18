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
            isActive ? "bg-green-600 text-white" : "text-gray-700 hover:bg-gray-100"
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
    <div className="fixed inset-0 flex bg-[#f1f5f9] overflow-hidden">
      <aside className="w-52 flex flex-col flex-shrink-0 z-10 overflow-y-auto bg-white border-r border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 px-4 py-6 border-b border-gray-200">
          <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-green-800 rounded-lg flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-gray-900">PwezaCore</span>
        </div>
        <div className="px-4 pt-2 pb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">MENU</span>
        </div>
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          <NavLinkStyle to="/dashboard/accountant" end icon={LayoutDashboard}>
            Dashboard
          </NavLinkStyle>
          <NavLinkStyle to="/dashboard/accountant/payments" icon={CreditCard}>
            Payments
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
      <main className="flex-1 flex flex-col overflow-hidden bg-[#f1f5f9]">
        <header className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-end gap-4">
            <div ref={searchRef} className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search students, receipts, invoices..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
                className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              {searchOpen && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 rounded-xl border border-gray-200 bg-white shadow-lg z-50 overflow-hidden max-h-64 overflow-y-auto">
                  {searchResults.map((st) => (
                    <div key={st.student_id} className="border-b border-gray-50 last:border-0">
                      <div className="px-3 py-2 text-sm font-medium text-gray-900">{st.name} ({st.current_class})</div>
                      <div className="flex gap-2 px-3 pb-2">
                        <button
                          type="button"
                          onClick={() => { navigate("/dashboard/accountant/payments"); setSearchOpen(false); setSearchQ(""); }}
                          className="text-xs font-medium text-teal-600 hover:text-teal-700"
                        >
                          Record payment
                        </button>
                        <button
                          type="button"
                          onClick={() => { navigate("/dashboard/accountant/outstanding"); setSearchOpen(false); setSearchQ(""); }}
                          className="text-xs font-medium text-gray-600 hover:text-gray-700"
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
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
            <button
              type="button"
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors relative"
            >
              <Bell className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 pl-2">
              <span className="text-sm font-medium text-gray-800">
                {user?.user_metadata?.name ?? user?.email ?? "Accountant"}
              </span>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 flex-shrink-0" />
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto min-h-0">
          <Outlet />
        </div>
        <footer className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Copyright © 2025 PwezaCore</span>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-gray-700">Privacy Policy</a>
              <a href="#" className="hover:text-gray-700">Terms and conditions</a>
              <a href="#" className="hover:text-gray-700">Contact</a>
            </div>
            <div className="flex items-center gap-3 text-gray-400">
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
