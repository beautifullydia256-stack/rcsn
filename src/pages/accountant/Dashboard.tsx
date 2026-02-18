import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import {
  LayoutDashboard,
  CreditCard,
  ArrowLeftRight,
  FileText,
  Wallet,
  PiggyBank,
  TrendingUp,
  Receipt,
  BarChart3,
  Users,
  Search,
  MessageCircle,
  Bell,
  MoreVertical,
} from "lucide-react";

export default function AccountantDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) navigate("/login");
    };
    check();
  }, [navigate]);

  return (
    <div className="fixed inset-0 flex bg-[#f1f5f9] overflow-hidden">
      {/* Sidebar - white, same style as admin */}
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
          <NavItem icon={LayoutDashboard} label="Dashboard" active />
          <NavItem icon={CreditCard} label="Payments" />
          <NavItem icon={FileText} label="Invoices & Billing" />
          <NavItem icon={Wallet} label="Outstanding Fees" />
          <NavItem icon={Receipt} label="Receipts" />
          <NavItem icon={TrendingUp} label="Expenses" />
          <NavItem icon={BarChart3} label="Reports" />
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#f1f5f9]">
        {/* Header */}
        <header className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-end gap-4">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search students, receipts, invoices..."
                className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
            <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors">
              <MessageCircle className="w-5 h-5" />
            </button>
            <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors relative">
              <Bell className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 pl-2">
              <span className="text-sm font-medium text-gray-800">Andrew Forbist</span>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 flex-shrink-0" />
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Row 1: School finance KPIs */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <KPICard
              icon={Wallet}
              label="Total Fees Expected"
              value="—"
              trend="This term"
              change="—"
              positive
            />
            <KPICard
              icon={CreditCard}
              label="Total Fees Collected"
              value="—"
              trend="This term"
              change="—"
              positive
            />
            <KPICard
              icon={FileText}
              label="Outstanding Balances"
              value="—"
              trend="Students with balance due"
              change="—"
              positive={false}
            />
            <KPICard
              icon={TrendingUp}
              label="Today's Collections"
              value="—"
              trend="Payments received today"
              change="—"
              positive
            />
          </div>

          {/* Row 2: Cashflow | Expense Breakdown | Finance Score + Balance */}
          <div className="grid grid-cols-12 gap-6 mb-6">
            {/* Fee collections chart - 7 cols */}
            <div className="col-span-7 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Fee Collections</h3>
                <select className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                  <option>This Term</option>
                  <option>Last 7 Days</option>
                </select>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-6">Collections vs Expected</p>
              <div className="flex gap-4 mb-4">
                <span className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="w-3 h-3 rounded-full bg-teal-600" /> Fees collected
                </span>
                <span className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="w-3 h-3 rounded-full bg-gray-400" /> Expected
                </span>
              </div>
              <div className="h-52 flex items-end gap-2">
                {[60, 45, 70, 50, 80, 55, 75].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col gap-1">
                    <div className="flex-1 flex items-end gap-0.5">
                      <div className="flex-1 rounded-t bg-teal-600/80 min-h-[4px]" style={{ height: `${h}%` }} />
                      <div className="flex-1 rounded-t bg-gray-300/60 min-h-[4px]" style={{ height: `${Math.max(20, h - 15)}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 text-center">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* School expense breakdown - 2 cols */}
            <div className="col-span-2 bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-900">Expense Breakdown</h3>
                <select className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
                  <option>This Term</option>
                </select>
              </div>
              <div className="flex justify-center my-4">
                <div className="relative w-28 h-28">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#0d9488" strokeWidth="3" strokeDasharray="45 100" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#5eead4" strokeWidth="3" strokeDasharray="25 100" strokeDashoffset="-45" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#94a3b8" strokeWidth="3" strokeDasharray="20 100" strokeDashoffset="-70" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#64748b" strokeWidth="3" strokeDasharray="10 100" strokeDashoffset="-90" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-gray-500">Total</span>
                    <span className="text-lg font-bold text-gray-900">—</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-teal-600" /> Salaries</span>
                  <span className="font-medium text-gray-900">—</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-teal-300" /> Utilities</span>
                  <span className="font-medium text-gray-900">—</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-400" /> Maintenance</span>
                  <span className="font-medium text-gray-900">—</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-500" /> Supplies</span>
                  <span className="font-medium text-gray-900">—</span>
                </div>
              </div>
            </div>

            {/* Collection rate + Payment methods - 3 cols */}
            <div className="col-span-3 space-y-4">
              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-900">Collection Rate</h3>
                  <button className="p-1 text-gray-400 hover:text-gray-600"><MoreVertical className="w-4 h-4" /></button>
                </div>
                <p className="text-xs text-gray-500 mb-1">Fees collected vs expected this term</p>
                <p className="text-xl font-bold text-gray-900 mb-2">—%</p>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-teal-500" style={{ width: "0%" }} />
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-900">Collections by Method</h3>
                  <button className="p-1 text-gray-400 hover:text-gray-600"><MoreVertical className="w-4 h-4" /></button>
                </div>
                <p className="text-sm text-gray-500 mb-4">This term</p>
                <div className="space-y-3">
                  <div className="rounded-xl p-4 bg-teal-50 border border-teal-100">
                    <p className="text-xs font-medium text-teal-700 mb-1">Cash</p>
                    <p className="text-lg font-bold text-gray-900">—</p>
                  </div>
                  <div className="rounded-xl p-4 bg-teal-50 border border-teal-100">
                    <p className="text-xs font-medium text-teal-700 mb-1">Bank / Mobile Money</p>
                    <p className="text-lg font-bold text-gray-900">—</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Recent Transactions | Saving Plans | Recent Activities */}
          <div className="grid grid-cols-12 gap-6">
            {/* Recent Fee Payments - 5 cols */}
            <div className="col-span-5 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Fee Payments</h3>
                <div className="flex items-center gap-2">
                  <select className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                    <option>This Term</option>
                  </select>
                  <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-500"><Receipt className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 font-medium border-b border-gray-100">
                      <th className="pb-3 pr-4">Student / Class</th>
                      <th className="pb-3 pr-4">Receipt No</th>
                      <th className="pb-3 pr-4">Date</th>
                      <th className="pb-3 text-right">Amount</th>
                      <th className="pb-3 pl-2">Method</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700">
                    <tr>
                      <td className="py-6 text-gray-400 text-center" colSpan={5}>No payments recorded yet. Data will appear when fees are collected.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Student payment status - 2 cols */}
            <div className="col-span-2 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Payment Status</h3>
                <button className="text-sm font-medium text-teal-600 hover:text-teal-700">View all</button>
              </div>
              <p className="text-sm text-gray-500 mb-4">Students by fee status this term</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-teal-50 border border-teal-100">
                  <span className="text-sm font-medium text-gray-900">Fully paid</span>
                  <span className="text-lg font-bold text-teal-700"><Users className="w-4 h-4 inline mr-1" />—</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <span className="text-sm font-medium text-gray-900">Partially paid</span>
                  <span className="text-lg font-bold text-amber-700">—</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-red-50 border border-red-100">
                  <span className="text-sm font-medium text-gray-900">Not paid</span>
                  <span className="text-lg font-bold text-red-700">—</span>
                </div>
              </div>
            </div>

            {/* Recent activity - 5 cols */}
            <div className="col-span-5 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                <button className="p-1 text-gray-400 hover:text-gray-600"><MoreVertical className="w-4 h-4" /></button>
              </div>
              <div className="space-y-4">
                <ActivityRow time="—" text="Fee payment recorded" icon="doc" />
                <ActivityRow time="—" text="Receipt issued" icon="doc" />
                <ActivityRow time="—" text="Expense logged" icon="doc" />
                <p className="text-sm text-gray-400 pt-2">Activity will appear here as you record payments and expenses.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Copyright © 2025 PwezaCore</span>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-gray-700">Privacy Policy</a>
              <a href="#" className="hover:text-gray-700">Term and conditions</a>
              <a href="#" className="hover:text-gray-700">Contact</a>
            </div>
            <div className="flex items-center gap-3 text-gray-400">
              <span className="font-bold">f</span>
              <span>𝕏</span>
              <span>📷</span>
              <span className="font-bold">in</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

function NavItem({
  icon: Icon,
  label,
  active,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  badge?: number;
}) {
  return (
    <button
      type="button"
      className={`flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
        active ? "bg-green-600 text-white" : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      <Icon className="w-5 h-5 flex-shrink-0 [color:inherit]" />
      <span className="flex-1 text-left">{label}</span>
      {badge != null && (
        <span className="bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </button>
  );
}

function KPICard({
  icon: Icon,
  label,
  value,
  trend,
  change,
  positive,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  trend: string;
  change: string;
  positive: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-teal-600">
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500">{trend}</span>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded ${
            positive ? "text-teal-700 bg-teal-50" : "text-red-700 bg-red-50"
          }`}
        >
          {change}
        </span>
      </div>
    </div>
  );
}

function ActivityRow({
  time,
  text,
  icon,
}: {
  time: string;
  text: string;
  icon: "clock" | "doc" | "mobile" | "calendar";
}) {
  const Icon = icon === "clock" ? Bell : FileText;
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 flex-shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{time}</p>
        <p className="text-sm text-gray-800">{text}</p>
      </div>
    </div>
  );
}
