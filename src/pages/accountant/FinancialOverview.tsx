import { useState, type ComponentType } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import {
  Wallet,
  CreditCard,
  FileText,
  TrendingUp,
  Receipt,
  FilePlus,
  DollarSign,
  Users,
  PieChart as PieChartIcon,
  Calendar,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useUIStore } from "../../store/uiStore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  fetchAccountantDashboardMetrics,
  fetchRecentAccountantTransactions,
} from "../../lib/accountantDashboardMetrics";

const CHART_THEME = {
  light: { grid: "#f1f5f9", axis: "#64748b", refLine: "#94a3b8" },
  dark: { grid: "rgba(255,255,255,0.08)", axis: "rgba(255,255,255,0.6)", refLine: "rgba(255,255,255,0.35)" },
} as const;

const STALE_TIME_MS = 2 * 60 * 1000;
const DONUT_COLORS = ["#166534", "#22c55e", "#86efac", "#bbf7d0", "#94a3b8", "#475569"];

const fmt = (n: number) =>
  n == null || Number.isNaN(n) ? "—" : n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

type KPIVariant = "blue" | "green" | "orange" | "teal" | "slate" | "violet";

function KPICard({
  icon: Icon,
  label,
  value,
  subline,
  variant = "green",
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subline: string;
  variant?: KPIVariant;
}) {
  const borderTopClass: Record<KPIVariant, string> = {
    blue: "border-t-[3px] border-t-blue-500/90",
    green: "border-t-[3px] border-t-emerald-500/90",
    orange: "border-t-[3px] border-t-amber-500/90",
    teal: "border-t-[3px] border-t-teal-500/90",
    slate: "border-t-[3px] border-t-slate-400/90",
    violet: "border-t-[3px] border-t-violet-500/90",
  };
  const iconClass: Record<KPIVariant, string> = {
    blue: "ac-glass-icon ac-icon-blue",
    green: "ac-glass-icon ac-icon-green",
    orange: "ac-glass-icon ac-icon-orange",
    teal: "ac-glass-icon ac-icon-teal",
    slate: "ac-glass-icon bg-slate-500/15 text-slate-600 dark:text-slate-300",
    violet: "ac-glass-icon bg-violet-500/15 text-violet-600 dark:text-violet-300",
  };
  return (
    <div
      className={`ac-glass-card will-change-transform rounded-2xl border border-[var(--ac-border)]/60 p-5 shadow-sm transition-shadow hover:shadow-[var(--ac-shadow-strong)] ${borderTopClass[variant]}`}
    >
      <div className="flex items-start justify-between">
        <div className={iconClass[variant]}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="ac-text-primary mt-4 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      <p className="ac-text-secondary mt-1 text-sm font-medium leading-snug">{label}</p>
      <p className="ac-text-muted mt-1.5 text-[11px] leading-relaxed">{subline}</p>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="ac-text-primary text-base font-semibold tracking-tight">{title}</h2>
      <p className="ac-text-muted mt-1 max-w-3xl text-[13px] leading-relaxed">{subtitle}</p>
    </div>
  );
}

type AccountantOutletContext = { openRecordPayment?: () => void; openRecordExpense?: () => void };

export default function FinancialOverview() {
  const navigate = useNavigate();
  const theme = useUIStore((s) => s.theme);
  const { openRecordPayment, openRecordExpense } = useOutletContext<AccountantOutletContext>();
  const schoolId = useAuthStore((s) => s.schoolId);
  const chartColors = CHART_THEME[theme];

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["accountant", "dashboard-metrics", schoolId],
    queryFn: () => fetchAccountantDashboardMetrics(supabase, schoolId!),
    enabled: !!schoolId,
    staleTime: STALE_TIME_MS,
  });

  const [recentPeriod, setRecentPeriod] = useState<"month" | "year">("month");
  const { data: recentTransactions = [] } = useQuery({
    queryKey: ["accountant", "recent-transactions", schoolId, recentPeriod],
    queryFn: () => fetchRecentAccountantTransactions(supabase, schoolId!, recentPeriod),
    enabled: !!schoolId,
    staleTime: STALE_TIME_MS,
  });

  if (!schoolId) {
    return (
      <div className="ac-text-secondary flex min-h-[40vh] items-center justify-center text-sm">
        Loading your school...
      </div>
    );
  }

  if (isLoading || !metrics) {
    return (
      <div
        className="flex min-h-full items-center justify-center"
        style={{ background: "var(--ac-page-bg)", backgroundColor: "var(--ac-page-bg)" }}
      >
        <p className="ac-text-secondary text-sm">Loading financial overview...</p>
      </div>
    );
  }

  const m = metrics;
  const tp = m.termPerformance;
  const ra = m.receivablesAllTerms;
  const ca = m.cashActivity;
  const termSubtitle = m.currentTerm
    ? m.currentTerm.start_date && m.currentTerm.end_date
      ? `${m.currentTerm.start_date} → ${m.currentTerm.end_date}`
      : m.currentTerm.label
    : "No academic term configured";

  const collectionRateDisplay =
    tp.collectionRatePercent != null ? `${tp.collectionRatePercent}%` : "—";

  const pieData = ra.byTerm
    .filter((t) => t.outstanding > 0)
    .map((t) => ({ name: t.termLabel, value: t.outstanding }));

  return (
    <div className="min-h-full" style={{ background: "var(--ac-page-bg)", backgroundColor: "var(--ac-page-bg)" }}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="ac-glass-card mb-8 flex flex-col gap-4 rounded-2xl border border-[var(--ac-border)]/60 px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="ac-text-primary text-2xl font-bold tracking-tight">Financial overview</h1>
            <p className="ac-text-muted mt-1 text-xs font-medium uppercase tracking-wider">As of {m.asOfDate}</p>
            <p className="ac-text-secondary mt-3 flex flex-wrap items-center gap-2 text-[13px]">
              <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                {m.currentTerm?.label ?? "No current term"}
              </span>
              <span className="ac-text-muted">{termSubtitle}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => openRecordPayment?.()}
              className="ac-glass-btn inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium ac-text-primary"
            >
              <Receipt className="h-4 w-4 shrink-0 text-emerald-600" />
              Record payment
            </button>
            <button
              type="button"
              onClick={() => navigate("/dashboard/accountant/billing")}
              className="ac-glass-btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium ac-text-primary"
            >
              <FilePlus className="h-4 w-4 shrink-0 text-blue-600" />
              Invoicing
            </button>
            <button
              type="button"
              onClick={() => openRecordExpense?.()}
              className="ac-glass-btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium ac-text-primary"
            >
              <DollarSign className="h-4 w-4 shrink-0 text-amber-600" />
              Record expense
            </button>
          </div>
        </div>

        {/* Current term */}
        <section className="mb-10">
          <SectionTitle
            title="Current term performance"
            subtitle="Figures below use the resolved current school term. “Collected” sums payments whose term_id matches this term (not payment date alone). Expenses are approved or paid rows tagged with this term."
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <KPICard
              icon={Wallet}
              label="Fees invoiced (expected)"
              value={fmt(tp.feesExpected)}
              subline={`All student balance rows for ${m.currentTerm?.label ?? "this term"}`}
              variant="blue"
            />
            <KPICard
              icon={CreditCard}
              label="Collected (attributed to this term)"
              value={fmt(tp.feesCollectedAttributed)}
              subline="Sum of fee payments recorded against this term_id"
              variant="green"
            />
            <KPICard
              icon={FileText}
              label="Outstanding (this term only)"
              value={fmt(tp.outstandingOnTerm)}
              subline="Remaining balance on ledger for this term"
              variant="orange"
            />
            <KPICard
              icon={TrendingUp}
              label="Collection rate"
              value={collectionRateDisplay}
              subline={tp.feesExpected > 0 ? "Collected ÷ expected for this term" : "Set invoiced fees to compute rate"}
              variant="teal"
            />
            <KPICard
              icon={DollarSign}
              label="Expenses (this term)"
              value={fmt(tp.expensesApproved)}
              subline="Approved or paid expenses allocated to this term"
              variant="slate"
            />
            <KPICard
              icon={TrendingUp}
              label="Net term cash"
              value={fmt(tp.netTermCash)}
              subline="Attributed collections minus this-term expenses"
              variant={tp.netTermCash >= 0 ? "green" : "orange"}
            />
          </div>
          {m.discountsSchoolWide > 0 && (
            <p className="ac-text-muted mt-3 text-xs">
              Discounts / waivers on record (school-wide, all time):{" "}
              <span className="ac-text-secondary font-medium tabular-nums">{fmt(m.discountsSchoolWide)}</span>
            </p>
          )}
        </section>

        {/* Cash activity */}
        <section className="mb-10">
          <SectionTitle
            title="Fee receipt activity (by payment date)"
            subtitle="Uses payment_date across all terms. A payment toward a prior term still appears here on the day it was received."
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KPICard
              icon={Calendar}
              label="Today"
              value={fmt(ca.todayAllTerms)}
              subline="All terms · non-reversed payments only"
              variant="teal"
            />
            <KPICard
              icon={Calendar}
              label="Last 7 days"
              value={fmt(ca.last7DaysAllTerms)}
              subline="Rolling window through today"
              variant="blue"
            />
            <KPICard
              icon={Calendar}
              label="Month to date"
              value={fmt(ca.monthToDateAllTerms)}
              subline="Calendar month, all terms"
              variant="green"
            />
          </div>
        </section>

        {/* Receivables + cashflow */}
        <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="w-full">
            <div className="ac-glass-card h-full rounded-2xl border border-[var(--ac-border)]/60 p-6 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <PieChartIcon className="ac-text-muted h-5 w-5" />
                <h3 className="ac-text-primary text-lg font-semibold">School receivables</h3>
              </div>
              <p className="ac-text-muted mb-5 text-[13px] leading-relaxed">
                All terms: positive balances where fees were set. Prior vs current split matches the centre total.
              </p>
              <div className="mb-5 grid grid-cols-2 gap-3">
                <div className="ac-glass-card rounded-xl border border-[var(--ac-border)]/50 p-3.5">
                  <p className="ac-text-secondary text-xs font-medium">Total still to collect</p>
                  <p className="ac-text-primary mt-1 text-xl font-bold tabular-nums">{fmt(ra.totalOutstanding)}</p>
                </div>
                <div className="ac-glass-card rounded-xl border border-[var(--ac-border)]/50 p-3.5">
                  <p className="ac-text-secondary text-xs font-medium">Students owing</p>
                  <p className="ac-text-primary mt-1 flex items-center gap-1.5 text-xl font-bold tabular-nums">
                    <Users className="h-4 w-4 opacity-70" />
                    {ra.debtorStudentCount}
                  </p>
                </div>
                <div className="ac-glass-card rounded-xl border border-[var(--ac-border)]/50 p-3.5">
                  <p className="ac-text-secondary text-xs font-medium">Current term slice</p>
                  <p className="ac-text-primary mt-1 text-lg font-semibold tabular-nums">{fmt(ra.onCurrentTerm)}</p>
                </div>
                <div className="ac-glass-card rounded-xl border border-[var(--ac-border)]/50 p-3.5">
                  <p className="ac-text-secondary text-xs font-medium">Older / prior terms</p>
                  <p className="ac-text-primary mt-1 text-lg font-semibold tabular-nums">{fmt(ra.onPriorTerms)}</p>
                </div>
              </div>

              {pieData.length > 0 ? (
                <div className="border-t border-slate-200/80 pt-5 dark:border-white/10">
                  <p className="ac-text-muted mb-3 text-xs font-medium uppercase tracking-wider">By term (outstanding)</p>
                  <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-center">
                    <div className="relative h-[200px] w-[200px] shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={56}
                            outerRadius={80}
                            paddingAngle={1}
                            stroke="none"
                          >
                            {pieData.map((slice, i) => (
                              <Cell key={slice.name} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(v: number) => [fmt(v), "Outstanding"]}
                            contentStyle={{
                              borderRadius: 8,
                              border: "1px solid var(--ac-border)",
                              background: "var(--ac-card-bg)",
                              color: "var(--ac-text-primary)",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="ac-text-muted text-[10px] font-semibold uppercase tracking-wider">Total</span>
                        <span className="ac-text-primary text-lg font-bold tabular-nums">{fmt(ra.totalOutstanding)}</span>
                      </div>
                    </div>
                    <ul className="ac-text-secondary flex max-h-[200px] flex-col gap-1.5 overflow-y-auto text-xs sm:max-w-[220px]">
                      {pieData.map((t, i) => (
                        <li key={t.name} className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-sm"
                              style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                            />
                            {t.name}
                          </span>
                          <span className="ac-text-primary tabular-nums font-medium">{fmt(t.value)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="ac-text-muted border-t border-slate-200/80 pt-4 text-sm dark:border-white/10">
                  No outstanding balances by term.
                </p>
              )}
            </div>
          </section>

          <section className="w-full">
            <div className="ac-glass-card h-full rounded-2xl border border-[var(--ac-border)]/60 p-6 shadow-sm">
              <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="ac-text-primary text-lg font-semibold">Calendar-year cashflow</h3>
                <span className="ac-text-muted text-xs font-medium">{m.calendarYear}</span>
              </div>
              <p className="ac-text-muted mb-4 text-[13px] leading-relaxed">
                Fee receipts and expenses by calendar month ({m.calendarYear}). Not the same as “current term” above.
                Expenses count when status is approved or paid.
              </p>
              <p className="ac-text-secondary text-[13px] font-medium">Net (fee receipts − expenses)</p>
              <p
                className={`mt-0.5 text-3xl font-bold tabular-nums tracking-tight ${m.cashflowYTD.netCash >= 0 ? "text-emerald-600" : "text-red-500"}`}
              >
                {fmt(m.cashflowYTD.netCash)}
              </p>
              <div className="ac-text-secondary mt-4 flex flex-wrap gap-4 text-[13px]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-emerald-700" />
                  Fee receipts
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-emerald-300" />
                  Expenses (downward bars)
                </span>
              </div>
              <div className="mt-4 h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={m.cashflowYTD.months.map((row) => ({
                      ...row,
                      expenseNeg: -row.expenses,
                    }))}
                    margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                    barCategoryGap="12%"
                    barGap={4}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                    <ReferenceLine y={0} stroke={chartColors.refLine} strokeWidth={1} />
                    <XAxis
                      dataKey="monthLabel"
                      tick={{ fontSize: 11, fill: chartColors.axis }}
                      axisLine={{ stroke: chartColors.grid }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: chartColors.axis }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${v / 1000}K` : String(v))}
                      domain={["auto", "auto"]}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as { monthLabel: string; feeReceipts: number; expenses: number };
                        return (
                          <div className="ac-glass-card rounded-xl border border-[var(--ac-border)] px-4 py-3 text-sm shadow-lg">
                            <p className="ac-text-primary mb-2 font-semibold">
                              {d.monthLabel} {m.calendarYear}
                            </p>
                            <p className="text-emerald-600">Fee receipts {fmt(d.feeReceipts)}</p>
                            <p className="text-teal-600">Expenses {fmt(d.expenses)}</p>
                          </div>
                        );
                      }}
                      cursor={{ fill: theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(148, 163, 184, 0.08)" }}
                    />
                    <Bar dataKey="feeReceipts" fill="#047857" radius={[2, 2, 0, 0]} name="Fee receipts" />
                    <Bar dataKey="expenseNeg" fill="#86efac" radius={[0, 0, 2, 2]} name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        </div>

        {/* Payment mix — current term */}
        {(m.collectionsByMethod.cash > 0 ||
          m.collectionsByMethod.bank > 0 ||
          m.collectionsByMethod.mobile_money > 0 ||
          m.collectionsByMethod.other > 0) && (
          <section className="mb-10">
            <SectionTitle
              title="Collections by method (current term)"
              subtitle="Breakdown of payments attributed to the current term only."
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="ac-glass-card rounded-xl border border-[var(--ac-border)]/50 px-4 py-3">
                <p className="ac-text-muted text-xs">Cash</p>
                <p className="ac-text-primary mt-1 font-semibold tabular-nums">{fmt(m.collectionsByMethod.cash)}</p>
              </div>
              <div className="ac-glass-card rounded-xl border border-[var(--ac-border)]/50 px-4 py-3">
                <p className="ac-text-muted text-xs">Bank / card</p>
                <p className="ac-text-primary mt-1 font-semibold tabular-nums">{fmt(m.collectionsByMethod.bank)}</p>
              </div>
              <div className="ac-glass-card rounded-xl border border-[var(--ac-border)]/50 px-4 py-3">
                <p className="ac-text-muted text-xs">Mobile money</p>
                <p className="ac-text-primary mt-1 font-semibold tabular-nums">{fmt(m.collectionsByMethod.mobile_money)}</p>
              </div>
              <div className="ac-glass-card rounded-xl border border-[var(--ac-border)]/50 px-4 py-3">
                <p className="ac-text-muted text-xs">Other</p>
                <p className="ac-text-primary mt-1 font-semibold tabular-nums">{fmt(m.collectionsByMethod.other)}</p>
              </div>
            </div>
          </section>
        )}

        {/* Recent payments list from metrics */}
        <section className="mb-10">
          <div className="ac-glass-card rounded-2xl border border-[var(--ac-border)]/60 p-6 shadow-sm">
            <h3 className="ac-text-primary mb-1 text-lg font-semibold">Latest fee payments</h3>
            <p className="ac-text-muted mb-4 text-[13px]">Ten most recent non-reversed payments school-wide.</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="ac-text-muted border-b border-slate-200/80 text-xs font-medium uppercase tracking-wider dark:border-white/10">
                    <th className="pb-3 pt-1">Student</th>
                    <th className="pb-3 pt-1">Class</th>
                    <th className="pb-3 pt-1">Receipt</th>
                    <th className="pb-3 pt-1">Date</th>
                    <th className="pb-3 pt-1">Method</th>
                    <th className="pb-3 pt-1 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {m.recentPayments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="ac-text-muted py-8 text-center">
                        No recent payments.
                      </td>
                    </tr>
                  ) : (
                    m.recentPayments.map((r) => (
                      <tr key={r.payment_id} className="border-b border-slate-200/50 last:border-0 dark:border-white/5">
                        <td className="ac-text-primary py-3 font-medium">{r.student_name}</td>
                        <td className="ac-text-secondary py-3">{r.class}</td>
                        <td className="ac-text-secondary py-3">{r.receipt_number ?? "—"}</td>
                        <td className="ac-text-secondary py-3">{r.payment_date}</td>
                        <td className="ac-text-secondary py-3 capitalize">{r.payment_method}</td>
                        <td className="py-3 text-right font-medium tabular-nums text-emerald-600">{fmt(r.amount_paid)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Recent transactions */}
        <section className="w-full">
          <div className="ac-glass-card rounded-2xl border border-[var(--ac-border)]/60 p-6 shadow-sm">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="ac-text-primary text-lg font-semibold">Activity feed</h3>
                <p className="ac-text-muted mt-0.5 text-[13px]">Fee payments and expenses for the selected period.</p>
              </div>
              <select
                value={recentPeriod}
                onChange={(e) => setRecentPeriod(e.target.value as "month" | "year")}
                className="ac-glass-card ac-text-primary inline-flex rounded-xl border border-[var(--ac-border)]/60 px-3 py-2 text-sm font-medium focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="month">This month</option>
                <option value="year">This year</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="ac-text-muted border-b border-slate-200/80 text-xs font-medium uppercase tracking-wider dark:border-white/10">
                    <th className="pb-3 pt-1">Transaction</th>
                    <th className="pb-3 pt-1">Account</th>
                    <th className="pb-3 pt-1">Date & time</th>
                    <th className="pb-3 pt-1 text-right">Amount</th>
                    <th className="pb-3 pt-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="ac-text-muted py-8 text-center">
                        No transactions in this period.
                      </td>
                    </tr>
                  ) : (
                    recentTransactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-slate-200/50 last:border-0 dark:border-white/5">
                        <td className="py-3">
                          <p className="ac-text-primary font-medium">{tx.name}</p>
                          <p className="ac-text-muted text-xs">{tx.sub}</p>
                        </td>
                        <td className="ac-text-secondary py-3">{tx.account}</td>
                        <td className="ac-text-secondary py-3">
                          <p>{tx.date}</p>
                          <p className="ac-text-muted text-xs">{tx.time}</p>
                        </td>
                        <td className="py-3 text-right">
                          <span className={tx.amount >= 0 ? "font-medium tabular-nums text-emerald-600" : "font-medium tabular-nums text-red-600"}>
                            {tx.amount >= 0 ? "+" : ""}
                            {fmt(tx.amount)}
                          </span>
                        </td>
                        <td className="py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${
                              tx.status === "Completed" ? "bg-emerald-600" : "bg-amber-500"
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
