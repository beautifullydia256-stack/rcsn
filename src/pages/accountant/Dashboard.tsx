import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PiggyBank, 
  TrendingUpIcon,
  CreditCard,
  MoreVertical,
  Plus,
  Settings
} from "lucide-react";

interface DashboardData {
  income: number;
  expense: number;
  savings: number;
  investment: number;
  incomeChange: number;
  expenseChange: number;
  savingsChange: number;
  investmentChange: number;
  totalBalance: number;
}

export default function AccountantDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({
    income: 8500,
    expense: 4900,
    savings: 2000,
    investment: 1600,
    incomeChange: 1.7,
    expenseChange: -2.4,
    savingsChange: 9.1,
    investmentChange: 3.8,
    totalBalance: 1377000
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/login");
          return;
        }

        // Load actual data here when ready
        setLoading(false);
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    };
    loadData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <div className="grid grid-cols-2 gap-0.5">
                <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
              </div>
            </div>
            <span className="text-xl font-bold text-gray-900">COINEST</span>
          </div>
        </div>

        <nav className="flex-1 px-3">
          <NavItem icon="📊" label="Dashboard" active />
          <NavItem icon="💳" label="Payments" />
          <NavItem icon="↔️" label="Transactions" />
          <NavItem icon="📄" label="Invoices" />
          <NavItem icon="💳" label="Cards" />
          <NavItem icon="🏦" label="Saving Plans" />
          <NavItem icon="📈" label="Investments" />
          <NavItem icon="📥" label="Inbox" badge={2} />
          <NavItem icon="🎁" label="Promos" />
          <NavItem icon="💡" label="Insights" />
        </nav>

        {/* Pro Upgrade Card */}
        <div className="m-3 p-4 bg-gradient-to-br from-teal-700 to-teal-900 rounded-2xl text-white">
          <div className="mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-3">
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-sm mb-1">Gain full access to your</p>
            <p className="text-sm">finances with detailed</p>
            <p className="text-sm">analytics and graphs</p>
          </div>
          <button className="w-full bg-emerald-400 hover:bg-emerald-500 text-teal-900 font-semibold py-2 px-4 rounded-lg text-sm transition-colors">
            Get Pro
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search placeholder"
                  className="w-80 pl-4 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  🔍
                </button>
              </div>
              <button className="p-2 hover:bg-gray-50 rounded-lg relative">
                <span className="text-xl">💬</span>
              </button>
              <button className="p-2 hover:bg-gray-50 rounded-lg relative">
                <span className="text-xl">🔔</span>
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Andrew Forbist</span>
                <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full"></div>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-6 mb-6">
            <KPICard
              icon="💰"
              label="Income"
              value={`$${data.income.toLocaleString()}`}
              change={data.incomeChange}
              changeText={`+$${Math.abs(data.incomeChange * 500).toFixed(0)} than last week`}
              positive={data.incomeChange > 0}
            />
            <KPICard
              icon="💸"
              label="Expense"
              value={`$${data.expense.toLocaleString()}`}
              change={data.expenseChange}
              changeText={`-$${Math.abs(data.expenseChange * 200).toFixed(0)} than last week`}
              positive={data.expenseChange < 0}
            />
            <KPICard
              icon="🏦"
              label="Savings"
              value={`$${data.savings.toLocaleString()}`}
              change={data.savingsChange}
              changeText={`+$${Math.abs(data.savingsChange * 20).toFixed(0)} than last week`}
              positive={data.savingsChange > 0}
            />
            <KPICard
              icon="📈"
              label="Investment"
              value={`$${data.investment.toLocaleString()}`}
              change={data.investmentChange}
              changeText={`+$${Math.abs(data.investmentChange * 15).toFixed(0)} than last week`}
              positive={data.investmentChange > 0}
            />
          </div>

          {/* Middle Section */}
          <div className="grid grid-cols-12 gap-6 mb-6">
            {/* Cashflow Chart */}
            <div className="col-span-7 bg-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Cashflow</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900">$12,000</span>
                    <span className="text-sm text-gray-500">Total Balance</span>
                  </div>
                </div>
                <select className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                  <option>Last 7 Days</option>
                </select>
              </div>
              <div className="h-64 flex items-end justify-between gap-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                  <div key={day} className="flex-1 flex flex-col items-center">
                    <div className="w-full relative h-48 mb-2">
                      <div 
                        className="absolute bottom-0 w-full bg-gradient-to-t from-emerald-200 to-emerald-100 rounded-t-lg"
                        style={{ height: `${40 + Math.random() * 60}%` }}
                      ></div>
                      <div 
                        className="absolute bottom-0 w-full bg-gradient-to-t from-gray-200 to-gray-100 rounded-t-lg opacity-50"
                        style={{ height: `${30 + Math.random() * 50}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500">{day}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Income</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span className="text-sm text-gray-600">Expense</span>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="col-span-5 space-y-6">
              {/* Expense Breakdown */}
              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Expense Breakdown</h3>
                  <select className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                    <option>Today</option>
                  </select>
                </div>
                <div className="flex items-center justify-center mb-4">
                  <div className="relative w-40 h-40">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="80" cy="80" r="70" fill="none" stroke="#e5e7eb" strokeWidth="20" />
                      <circle cx="80" cy="80" r="70" fill="none" stroke="#10b981" strokeWidth="20" strokeDasharray="220 440" />
                      <circle cx="80" cy="80" r="70" fill="none" stroke="#d1d5db" strokeWidth="20" strokeDasharray="132 440" strokeDashoffset="-220" />
                      <circle cx="80" cy="80" r="70" fill="none" stroke="#6b7280" strokeWidth="20" strokeDasharray="88 440" strokeDashoffset="-352" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xs text-gray-500">Total Expenses</span>
                      <span className="text-xl font-bold text-gray-900">$1,000</span>
                      <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+9.15%</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <ExpenseItem label="Food & Dining" amount="$500" percentage={50} color="bg-emerald-500" />
                  <ExpenseItem label="Utilities" amount="$300" percentage={30} color="bg-gray-300" />
                  <ExpenseItem label="Investment" amount="$200" percentage={20} color="bg-gray-400" />
                </div>
              </div>

              {/* Finance Score */}
              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Finance Score</h3>
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
                <div className="mb-4">
                  <span className="text-xs text-gray-500">Finance Quality</span>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-bold text-gray-900">Excellent</span>
                    <span className="text-2xl font-semibold text-gray-900">92%</span>
                  </div>
                  <div className="flex gap-1">
                    <div className="flex-1 h-2 bg-teal-800 rounded-full"></div>
                    <div className="flex-1 h-2 bg-emerald-300 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Balance Section */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Balance</h3>
                <span className="text-xs text-gray-500">Total Balance</span>
                <div className="text-3xl font-bold text-gray-900">$1,377,000</div>
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <CardItem
                type="VISA"
                name="Platinum Plus Visa"
                balance="$415,000"
                number="4321 8723 XXXX 9908"
                color="bg-gradient-to-br from-teal-700 to-teal-900"
              />
              <CardItem
                type="Mastercard"
                name="Freedom Unlimited Mastercard"
                balance="$532,000"
                number="5832 5578 8376 5487"
                color="bg-gradient-to-br from-emerald-600 to-teal-700"
              />
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-12 gap-6">
            {/* Recent Transactions */}
            <div className="col-span-5 bg-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
                <div className="flex items-center gap-2">
                  <select className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                    <option>This Month</option>
                  </select>
                  <button className="p-1.5 hover:bg-gray-50 rounded-lg">
                    <Settings className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                <TransactionItem
                  name="Dividend Payout"
                  category="Investments"
                  date="2024-09-25"
                  amount="+$250.00"
                  status="Completed"
                  positive
                  icon="💳"
                  card="Platinum Plus Visa"
                />
                <TransactionItem
                  name="Grocery Shopping"
                  category="Food & Dining"
                  date="2024-09-24"
                  amount="-$124.20"
                  status="Completed"
                  icon="💳"
                  card="Platinum Plus Visa"
                />
                <TransactionItem
                  name="Freelance Payment"
                  category="Income"
                  date="2024-09-23"
                  amount="+$850.00"
                  status="Completed"
                  positive
                  icon="💳"
                  card="Freedom Unlimited Mastercard"
                />
                <TransactionItem
                  name="Electricity Bill"
                  category="Utilities"
                  date="2024-09-22"
                  amount="-$120.75"
                  status="Completed"
                  icon="💳"
                  card="Freedom Unlimited Mastercard"
                />
                <TransactionItem
                  name="Online Subscription"
                  category="Services"
                  date="2024-09-18"
                  amount="-$12.99"
                  status="Pending"
                  icon="💳"
                  card="Platinum Plus Visa"
                />
              </div>
            </div>

            {/* Saving Plans */}
            <div className="col-span-3 bg-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Saving Plans</h3>
                <button className="text-sm text-teal-600 hover:text-teal-700 font-medium">
                  + Add Plans
                </button>
              </div>
              <div className="mb-4">
                <span className="text-xs text-gray-500">Total Savings</span>
                <div className="text-2xl font-bold text-gray-900">$12,000</div>
              </div>
              <div className="space-y-4">
                <SavingPlanItem
                  name="Emergency Fund"
                  current={4800}
                  target={30000}
                  percentage={45}
                />
                <SavingPlanItem
                  name="Retirement Fund"
                  current={5000}
                  target={50000}
                  percentage={28}
                />
                <SavingPlanItem
                  name="Vacation Fund"
                  current={2200}
                  target={8000}
                  percentage={50}
                />
              </div>
            </div>

            {/* Recent Activities */}
            <div className="col-span-4 bg-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
                <button className="text-gray-400 hover:text-gray-600">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-3">Today</div>
                  <ActivityItem
                    time="14:25 AM"
                    text="Reviewed alerts for low balance"
                    icon="🔔"
                    color="bg-emerald-100"
                  />
                  <ActivityItem
                    time="09:22 AM"
                    text="Checked account balance"
                    icon="💰"
                    color="bg-emerald-100"
                  />
                  <ActivityItem
                    time="07:15 AM"
                    text="Logged in from mobile device"
                    icon="📱"
                    color="bg-emerald-100"
                  />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-3">Yesterday</div>
                  <ActivityItem
                    time="03:00 PM"
                    text="Scheduled a recurring utility payment"
                    icon="📅"
                    color="bg-emerald-100"
                  />
                  <ActivityItem
                    time="10:30 PM"
                    text="Updated payment method"
                    icon="💳"
                    color="bg-emerald-100"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 px-8 py-4 mt-8">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Copyright © 2024 Referarow</span>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-gray-700">Privacy Policy</a>
              <a href="#" className="hover:text-gray-700">Term and conditions</a>
              <a href="#" className="hover:text-gray-700">Contact</a>
            </div>
            <div className="flex items-center gap-3">
              <a href="#" className="text-gray-400 hover:text-gray-600">f</a>
              <a href="#" className="text-gray-400 hover:text-gray-600">𝕏</a>
              <a href="#" className="text-gray-400 hover:text-gray-600">📷</a>
              <a href="#" className="text-gray-400 hover:text-gray-600">▶️</a>
              <a href="#" className="text-gray-400 hover:text-gray-600">in</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

// Component helpers
function NavItem({ icon, label, active, badge }: { icon: string; label: string; active?: boolean; badge?: number }) {
  return (
    <button
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
        active ? 'bg-emerald-50 text-emerald-600' : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span className="text-sm font-medium flex-1">{label}</span>
      {badge && (
        <span className="bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </button>
  );
}

function KPICard({ icon, label, value, change, changeText, positive }: any) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-2">{value}</div>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${
          positive ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'
        }`}>
          {positive ? '+' : ''}{change}%
        </span>
        <span className="text-xs text-gray-500">{changeText}</span>
      </div>
    </div>
  );
}

function ExpenseItem({ label, amount, percentage, color }: any) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${color}`}></div>
          <span className="text-sm text-gray-700">{label}</span>
        </div>
        <span className="text-sm font-semibold text-gray-900">{percentage}%</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{amount}</span>
      </div>
    </div>
  );
}

function CardItem({ type, name, balance, number, color }: any) {
  return (
    <div className={`${color} rounded-xl p-4 text-white`}>
      <div className="flex items-center justify-between mb-8">
        <span className="text-xs font-semibold">{type}</span>
        <button className="text-white/80 hover:text-white">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
      <div className="mb-2">
        <div className="text-xs text-white/70 mb-1">{name}</div>
        <div className="text-2xl font-bold">{balance}</div>
      </div>
      <div className="text-xs text-white/70">{number}</div>
    </div>
  );
}

function TransactionItem({ name, category, date, amount, status, positive, icon, card }: any) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900">{name}</div>
        <div className="text-xs text-gray-500">{category}</div>
      </div>
      <div className="text-right">
        <div className="text-xs text-gray-500 mb-0.5">{card}</div>
        <div className="text-xs text-gray-400">{date}</div>
      </div>
      <div className="text-right">
        <div className={`text-sm font-semibold ${positive ? 'text-emerald-600' : 'text-gray-900'}`}>
          {amount}
        </div>
        <div className={`text-xs px-2 py-0.5 rounded-full ${
          status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-yellow-50 text-yellow-700'
        }`}>
          {status}
        </div>
      </div>
    </div>
  );
}

function SavingPlanItem({ name, current, target, percentage }: any) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-900">{name}</span>
        <span className="text-sm font-semibold text-emerald-600">{percentage}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
        <div
          className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-2 rounded-full"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">${current.toLocaleString()} / ${target.toLocaleString()}</span>
      </div>
    </div>
  );
}

function ActivityItem({ time, text, icon, color }: any) {
  return (
    <div className="flex items-start gap-3 mb-3">
      <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center text-sm flex-shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500 mb-0.5">{time}</div>
        <div className="text-sm text-gray-700">{text}</div>
      </div>
    </div>
  );
}
