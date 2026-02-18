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
  Inbox,
  Gift,
  Lightbulb,
  Lock,
  Search,
  MessageCircle,
  Bell,
  MoreVertical,
  Copy,
} from "lucide-react";

const SIDEBAR_BG = "#0d9488";
const SIDEBAR_ACTIVE = "rgba(255,255,255,0.15)";

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
      {/* Sidebar - dark green */}
      <aside
        className="w-[260px] flex flex-col flex-shrink-0 text-white"
        style={{ background: SIDEBAR_BG }}
      >
        <div className="p-6 flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
            <div className="grid grid-cols-2 gap-0.5">
              <div className="w-1.5 h-1.5 bg-white rounded-sm" />
              <div className="w-1.5 h-1.5 bg-white rounded-sm" />
              <div className="w-1.5 h-1.5 bg-white rounded-sm" />
              <div className="w-1.5 h-1.5 bg-white rounded-sm" />
            </div>
          </div>
          <span className="text-xl font-bold">COINEST</span>
        </div>

        <nav className="flex-1 px-3 overflow-y-auto space-y-0.5">
          <NavItem icon={LayoutDashboard} label="Dashboard" active />
          <NavItem icon={CreditCard} label="Payments" />
          <NavItem icon={ArrowLeftRight} label="Transactions" />
          <NavItem icon={FileText} label="Invoices" />
          <NavItem icon={Wallet} label="Cards" />
          <NavItem icon={PiggyBank} label="Saving Plans" />
          <NavItem icon={TrendingUp} label="Investments" />
          <NavItem icon={Inbox} label="Inbox" badge={99} />
          <NavItem icon={Gift} label="Promos" />
          <NavItem icon={Lightbulb} label="Insights" />
        </nav>

        <div className="p-3">
          <div
            className="rounded-xl p-4 text-white"
            style={{ background: "rgba(0,0,0,0.2)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 opacity-90" />
              <span className="text-sm font-semibold">Get Pro</span>
            </div>
            <p className="text-xs text-white/80 mb-3 leading-relaxed">
              Gain full access to your finances with detailed analytics and graphs
            </p>
            <button
              className="w-full py-2 rounded-lg text-sm font-medium text-[#0d9488] bg-white hover:bg-white/95 transition-colors"
            >
              Get Pro
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#f1f5f9]">
        {/* Header */}
        <header className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-end gap-4">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search placeholder"
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
          {/* Row 1: 4 KPI cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <KPICard
              icon={CreditCard}
              label="Income"
              value="$8,500"
              trend="+$355 than last week"
              change="↑ 1.78%"
              positive
            />
            <KPICard
              icon={Wallet}
              label="Expense"
              value="$4,900"
              trend="-$126 than last week"
              change="↓ 2.45%"
              positive={false}
            />
            <KPICard
              icon={PiggyBank}
              label="Savings"
              value="$2,000"
              trend="+$30 than last week"
              change="↑ 1.5%"
              positive
            />
            <KPICard
              icon={TrendingUp}
              label="Investment"
              value="$1,600"
              trend="+$64 than last week"
              change="↑ 3.85%"
              positive
            />
          </div>

          {/* Row 2: Cashflow | Expense Breakdown | Finance Score + Balance */}
          <div className="grid grid-cols-12 gap-6 mb-6">
            {/* Cashflow - 7 cols */}
            <div className="col-span-7 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Cashflow</h3>
                <select className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                  <option>Last 7 Days</option>
                </select>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-6">$12,000</p>
              <div className="flex gap-4 mb-4">
                <span className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="w-3 h-3 rounded-full bg-teal-600" /> Income
                </span>
                <span className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="w-3 h-3 rounded-full bg-gray-400" /> Expense
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

            {/* Expense Breakdown - 2 cols */}
            <div className="col-span-2 bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-900">Expense Breakdown</h3>
                <select className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
                  <option>Today</option>
                </select>
              </div>
              <div className="flex justify-center my-4">
                <div className="relative w-28 h-28">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#0d9488" strokeWidth="3" strokeDasharray="50 100" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#5eead4" strokeWidth="3" strokeDasharray="30 100" strokeDashoffset="-50" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#94a3b8" strokeWidth="3" strokeDasharray="20 100" strokeDashoffset="-80" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-gray-500">Total</span>
                    <span className="text-lg font-bold text-gray-900">$1,000</span>
                  </div>
                </div>
              </div>
              <p className="text-center text-xs text-teal-600 font-medium mb-3">↑ 1.5%</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-teal-600" /> Food & Dining</span>
                  <span className="font-medium text-gray-900">$500</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-teal-300" /> Utilities</span>
                  <span className="font-medium text-gray-900">$300</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-400" /> Investment</span>
                  <span className="font-medium text-gray-900">$200</span>
                </div>
              </div>
            </div>

            {/* Finance Score + Balance - 3 cols */}
            <div className="col-span-3 space-y-4">
              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-900">Finance Score</h3>
                  <button className="p-1 text-gray-400 hover:text-gray-600"><MoreVertical className="w-4 h-4" /></button>
                </div>
                <p className="text-xs text-gray-500 mb-1">Finance Quality</p>
                <p className="text-xl font-bold text-gray-900">Excellent</p>
                <p className="text-lg font-semibold text-gray-900 mb-2">92%</p>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-teal-500" style={{ width: "92%" }} />
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-900">Balance</h3>
                  <button className="p-1 text-gray-400 hover:text-gray-600"><MoreVertical className="w-4 h-4" /></button>
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-4">$1,377,000</p>
                <div className="space-y-3">
                  <div className="rounded-xl p-4 text-white bg-gradient-to-br from-teal-700 to-teal-900">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-semibold opacity-90">VISA</span>
                    </div>
                    <p className="text-[10px] opacity-80 mb-1">Visa Platinum Plus</p>
                    <p className="text-lg font-bold">$415,000</p>
                    <p className="text-xs opacity-80 mt-1 flex items-center gap-1">
                      4532 8723 0045 9967 <button type="button" className="p-0.5 hover:bg-white/20 rounded"><Copy className="w-3 h-3" /></button>
                    </p>
                  </div>
                  <div className="rounded-xl p-4 text-white bg-gradient-to-br from-teal-700 to-teal-900">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-semibold opacity-90">Mastercard</span>
                    </div>
                    <p className="text-[10px] opacity-80 mb-1">Freedom Unlimited Mastercard</p>
                    <p className="text-lg font-bold">$532,000</p>
                    <p className="text-xs opacity-80 mt-1 flex items-center gap-1">
                      5582 5574 8376 5487 <button type="button" className="p-0.5 hover:bg-white/20 rounded"><Copy className="w-3 h-3" /></button>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Recent Transactions | Saving Plans | Recent Activities */}
          <div className="grid grid-cols-12 gap-6">
            {/* Recent Transactions - 5 cols */}
            <div className="col-span-5 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
                <div className="flex items-center gap-2">
                  <select className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                    <option>This Month</option>
                  </select>
                  <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-500"><ArrowLeftRight className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 font-medium border-b border-gray-100">
                      <th className="pb-3 pr-4">Transaction Name</th>
                      <th className="pb-3 pr-4">Account</th>
                      <th className="pb-3 pr-4">Date & Time</th>
                      <th className="pb-3 text-right">Amount</th>
                      <th className="pb-3 pl-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700">
                    <tr className="border-b border-gray-50">
                      <td className="py-3 pr-4 font-medium">Dividend Payout</td>
                      <td className="py-3 pr-4">Platinum Plus Visa</td>
                      <td className="py-3 pr-4">2024-09-25 10:00</td>
                      <td className="py-3 text-right font-semibold text-teal-600">+$200.00</td>
                      <td className="py-3 pl-2"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700">Completed</span></td>
                    </tr>
                    <tr className="border-b border-gray-50">
                      <td className="py-3 pr-4 font-medium">Grocery Shopping</td>
                      <td className="py-3 pr-4">Platinum Plus Visa</td>
                      <td className="py-3 pr-4">2024-09-24 14:30</td>
                      <td className="py-3 text-right font-semibold">-$154.20</td>
                      <td className="py-3 pl-2"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700">Completed</span></td>
                    </tr>
                    <tr className="border-b border-gray-50">
                      <td className="py-3 pr-4 font-medium">Freelance Payment</td>
                      <td className="py-3 pr-4">Freedom Unlimited Mastercard</td>
                      <td className="py-3 pr-4">2024-09-23 15:00</td>
                      <td className="py-3 text-right font-semibold text-teal-600">+$850.00</td>
                      <td className="py-3 pl-2"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700">Completed</span></td>
                    </tr>
                    <tr className="border-b border-gray-50">
                      <td className="py-3 pr-4 font-medium">Electricity Bill</td>
                      <td className="py-3 pr-4">Freedom Unlimited Mastercard</td>
                      <td className="py-3 pr-4">2024-09-22 09:15</td>
                      <td className="py-3 text-right font-semibold">-$120.75</td>
                      <td className="py-3 pl-2"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700">Completed</span></td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 font-medium">Online Subscription</td>
                      <td className="py-3 pr-4">Platinum Plus Visa</td>
                      <td className="py-3 pr-4">2024-09-18 08:00</td>
                      <td className="py-3 text-right font-semibold">-$12.99</td>
                      <td className="py-3 pl-2"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Pending</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Saving Plans - 2 cols */}
            <div className="col-span-2 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Saving Plans</h3>
                <button className="text-sm font-medium text-teal-600 hover:text-teal-700">+ Add Plans</button>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-6">$12,000</p>
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">Emergency Fund</p>
                  <p className="text-xs text-gray-500 mb-2">$4,500 / $10,000</p>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-teal-400" style={{ width: "45%" }} />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">Retirement Fund</p>
                  <p className="text-xs text-gray-500 mb-2">$5,000 / $20,000</p>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-teal-400" style={{ width: "25%" }} />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">Vacation Fund</p>
                  <p className="text-xs text-gray-500 mb-2">$2,500 / $5,000</p>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-teal-400" style={{ width: "50%" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activities - 5 cols */}
            <div className="col-span-5 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
                <button className="p-1 text-gray-400 hover:text-gray-600"><MoreVertical className="w-4 h-4" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-3">Today</p>
                  <ActivityRow time="11:45 AM" text="Reviewed alerts for low balance" icon="clock" />
                  <ActivityRow time="09:22 AM" text="Checked account balance" icon="doc" />
                  <ActivityRow time="07:15 AM" text="Logged in from mobile device" icon="mobile" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-3">Yesterday</p>
                  <ActivityRow time="05:50 PM" text="Scheduled a recurring utility payment" icon="calendar" />
                  <ActivityRow time="03:30 PM" text="Updated payment method" icon="doc" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Copyright © 2024 Peterdraw</span>
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
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
        active ? "text-white" : "text-white/85 hover:bg-white/10"
      }`}
      style={active ? { background: SIDEBAR_ACTIVE } : {}}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm font-medium flex-1">{label}</span>
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
