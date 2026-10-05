import { useState, useEffect, type ComponentType } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import {
  Wallet,
  CreditCard,
  Banknote,
  FileText,
  TrendingUp,
  Receipt,
  FilePlus,
  DollarSign,
  Users,
  PieChart as PieChartIcon,
  Calendar,
  Landmark,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useUIStore } from "../../store/uiStore";
import { useAcademicVocabulary } from "@/hooks/useAcademicVocabulary";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  fetchAccountantDashboardMetrics,
  fetchRecentAccountantTransactions,
} from "../../lib/accountantDashboardMetrics";
import AccountantNotificationsCard from "./components/AccountantNotificationsCard";

const CHART_THEME = {
  light: { grid: "#f1f5f9", axis: "#64748b", refLine: "#94a3b8" },
  dark: { grid: "rgba(255,255,255,0.08)", axis: "rgba(255,255,255,0.6)", refLine: "rgba(255,255,255,0.35)" },
} as const;

const STALE_TIME_MS = 2 * 60 * 1000;
/** Muted teal / slate series — readable on dark glass (matches Students terminal) */
const DONUT_COLORS = ["#34d399", "#2dd4bf", "#5eead4", "#94a3b8", "#64748b", "#475569"];

const fmt = (n: number) =>
  n == null || Number.isNaN(n) ? "—" : n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const FEE_PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bank: "Bank",
  mobile_money: "Mobile money",
  cheque: "Cheque",
  pos: "POS / card",
  online: "Online",
  other: "Other",
  school_pay: "School Pay",
  sure_pay: "Sure Pay",
};

function feePaymentMethodLabel(raw: string | null | undefined): string {
  const k = String(raw ?? "").trim().toLowerCase();
  if (!k) return "—";
  return FEE_PAYMENT_METHOD_LABELS[k] ?? String(raw ?? k).replace(/_/g, " ");
}

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
  subline?: string;
  variant?: KPIVariant;
}) {
  const borderTopClass: Record<KPIVariant, string> = {
    blue: "border-t-[3px] border-t-sky-500/75 dark:border-t-sky-400/55",
    green: "border-t-[3px] border-t-emerald-500/85 dark:border-t-emerald-400/55",
    orange: "border-t-[3px] border-t-amber-500/80 dark:border-t-amber-400/50",
    teal: "border-t-[3px] border-t-teal-500/80 dark:border-t-teal-400/50",
    slate: "border-t-[3px] border-t-slate-400/70 dark:border-t-slate-500/45",
    violet: "border-t-[3px] border-t-violet-500/75 dark:border-t-violet-400/50",
  };
  const iconClass: Record<KPIVariant, string> = {
    blue: "ac-glass-icon ac-icon-blue",
    green: "ac-glass-icon ac-icon-green",
    orange: "ac-glass-icon ac-icon-orange",
    teal: "ac-glass-icon ac-icon-teal",
    slate: "ac-glass-icon bg-slate-500/15 text-slate-600 dark:text-slate-300",
    violet: "ac-glass-icon bg-violet-500/15 text-violet-600 dark:text-violet-300",
  };
  const variantBg: Record<KPIVariant, string> = {
    blue: "bg-sky-500/[0.06] dark:bg-sky-500/[0.09]",
    green: "bg-emerald-500/[0.06] dark:bg-emerald-500/[0.09]",
    orange: "bg-amber-500/[0.07] dark:bg-amber-500/[0.1]",
    teal: "bg-teal-500/[0.06] dark:bg-teal-500/[0.09]",
    slate: "bg-slate-500/[0.06] dark:bg-slate-500/[0.1]",
    violet: "bg-violet-500/[0.07] dark:bg-violet-500/[0.1]",
  };
  return (
    <div
      className={`ac-glass-card flex min-h-[9rem] flex-col will-change-transform rounded-xl border border-[var(--ac-border)]/55 p-4 shadow-sm transition-shadow hover:border-emerald-500/25 hover:shadow-[var(--ac-shadow-strong)] ${variantBg[variant]} ${borderTopClass[variant]}`}
    >
      <div className="flex items-start justify-between">
        <div className={iconClass[variant]}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="ac-text-muted mt-3 text-[11px] font-bold uppercase leading-tight tracking-[0.07em]">{label}</p>
      <p className="fo-num ac-text-primary mt-1.5 text-[clamp(1.2rem,2.4vw,1.55rem)] font-semibold leading-snug tracking-tight">{value}</p>
      {subline ? (
        <p className="ac-text-muted mt-auto border-t border-[var(--ac-border)]/35 pt-2 text-[11px] leading-snug">{subline}</p>
      ) : null}
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <h2 className="fo-section-heading">{title}</h2>
      {subtitle?.trim() ? (
        <p className="ac-text-muted mt-1 max-w-3xl text-[13px] leading-snug">{subtitle}</p>
      ) : null}
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
  const { isTertiary, v } = useAcademicVocabulary();

  const { data: metrics, isLoading, isFetching, refetch: refetchMetrics } = useQuery({
    queryKey: ["accountant", "dashboard-metrics", schoolId],
    queryFn: () => fetchAccountantDashboardMetrics(supabase, schoolId!),
    enabled: !!schoolId,
    staleTime: 0,
    gcTime: 20 * 60 * 1000,
    placeholderData: (prev) => prev,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const [recentPeriod, setRecentPeriod] = useState<"month" | "year">("month");
  const { data: recentTransactions = [], refetch: refetchTransactions } = useQuery({
    queryKey: ["accountant", "recent-transactions", schoolId, recentPeriod],
    queryFn: () => fetchRecentAccountantTransactions(supabase, schoolId!, recentPeriod),
    enabled: !!schoolId,
    staleTime: 0,
    gcTime: 20 * 60 * 1000,
    placeholderData: (prev) => prev,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!schoolId) return;

    const handleMutated = () => {
      void refetchMetrics();
      void refetchTransactions();
    };

    window.addEventListener('pweza:payment-recorded', handleMutated);
    window.addEventListener('pweza:expense-updated', handleMutated);
    window.addEventListener('pweza:finance-mutated', handleMutated);

    const channel = supabase
      .channel(`accountant-overview-live-${schoolId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_payments', filter: `school_id=eq.${schoolId}` }, handleMutated)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'school_expenses', filter: `school_id=eq.${schoolId}` }, handleMutated)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_balances', filter: `school_id=eq.${schoolId}` }, handleMutated)
      .subscribe();

    return () => {
      window.removeEventListener('pweza:payment-recorded', handleMutated);
      window.removeEventListener('pweza:expense-updated', handleMutated);
      window.removeEventListener('pweza:finance-mutated', handleMutated);
      void supabase.removeChannel(channel);
    };
  }, [schoolId, refetchMetrics, refetchTransactions]);

  if (!schoolId) {
    return (
      <div className="ac-text-secondary flex min-h-[40vh] items-center justify-center text-sm">
        Loading your school...
      </div>
    );
  }

  if (isLoading || !metrics) {
    return (
      <div className="fo-financial-overview flex min-h-full items-center justify-center px-4 py-8">
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
      : (isTertiary ? m.currentTerm.label.replace(/Term/gi, 'Semester') : m.currentTerm.label)
    : (isTertiary ? "No academic intake configured" : "No academic term configured");

  const collectionRateDisplay =
    tp.collectionRatePercent != null ? `${tp.collectionRatePercent}%` : "—";

  const pieData = ra.byTerm
    .filter((t) => t.outstanding > 0)
    .map((t) => ({
      name: isTertiary ? t.termLabel.replace(/Term/gi, 'Intake / Sem') : t.termLabel,
      value: t.outstanding,
    }));

  const netCashBars = [
    { name: "Fee receipts" as const, amount: m.cashflowAllTime.totalFeeReceipts },
    { name: "Expenses" as const, amount: m.cashflowAllTime.totalExpenses },
  ];
  const hasNetCashActivity = netCashBars.some((r) => r.amount > 0);

  return (
    <div className="fo-financial-overview min-h-full">
      <div className="mx-auto w-full max-w-[1600px] space-y-6 px-3 py-4 sm:px-4 sm:py-5 lg:px-5">
        {/* Hero */}
        <div className="ac-glass-card relative flex flex-col gap-3 overflow-hidden rounded-xl border border-emerald-500/20 px-4 py-4 shadow-[0_0_40px_-16px_rgba(16,185,129,0.35)] sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              background:
                "radial-gradient(ellipse 90% 80% at 100% 0%, rgba(16,185,129,0.9) 0%, transparent 55%), radial-gradient(ellipse 70% 60% at 0% 100%, rgba(59,130,246,0.5) 0%, transparent 50%)",
            }}
          />
          <div className="relative min-w-0 flex-1">
            <p className="fo-hero-eyebrow">At a glance</p>
            <h1 className="fo-hero-title mt-0.5 flex items-center gap-2">
              Financial overview
              {isFetching && (
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400/70" title="Refreshing…" />
              )}
            </h1>
            <p className="ac-text-muted mt-2 text-[13px] font-medium tabular-nums">As of {m.asOfDate}</p>
            <p className="ac-text-muted mt-1 text-[12px] font-medium leading-snug">
              All monetary amounts below are in UGX (whole numbers).
            </p>
            <p className="ac-text-secondary mt-3 flex flex-wrap items-center gap-2 text-[13px] leading-snug">
              <span className="inline-flex items-center rounded-full bg-emerald-500/18 px-2.5 py-0.5 text-[12px] font-semibold text-emerald-800 ring-1 ring-emerald-500/25 dark:text-emerald-200">
                {m.currentTerm ? (isTertiary ? m.currentTerm.label.replace(/Term/gi, 'Semester') : m.currentTerm.label) : `No ${v.financeCurrentPeriod.toLowerCase()}`}
              </span>
              <span className="ac-text-muted">{termSubtitle}</span>
            </p>
          </div>
          <div className="relative flex flex-shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => openRecordPayment?.()}
              className="ac-glass-btn inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold ac-text-primary"
            >
              <Receipt className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              Record payment
            </button>
            <button
              type="button"
              onClick={() => navigate("/dashboard/accountant/billing")}
              className="ac-glass-btn-secondary inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold ac-text-primary"
            >
              <FilePlus className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
              Invoicing
            </button>
            <button
              type="button"
              onClick={() => openRecordExpense?.()}
              className="ac-glass-btn-secondary inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold ac-text-primary"
            >
              <DollarSign className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              Record expense
            </button>
          </div>
        </div>

        {/* School-wide cash position */}
        <section>
          <SectionTitle title="School cash position" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <KPICard
              icon={Landmark}
              label="Net cash surplus"
              value={fmt(m.schoolCashPosition.netCashSurplus)}
              subline="All fee receipts recorded − all approved/paid expenses"
              variant={m.schoolCashPosition.netCashSurplus >= 0 ? "green" : "orange"}
            />
            <KPICard
              icon={DollarSign}
              label="Total expenses (approved/paid)"
              value={fmt(m.schoolCashPosition.totalExpensesApprovedPaidCurrentTerm)}
              subline={isTertiary ? `Current intake only (${m.currentTerm?.label.replace(/Term/gi, 'Intake') ?? "—"})` : `Current term only (${m.currentTerm?.label ?? "—"})`}
              variant="slate"
            />
          </div>
        </section>

        {/* Current term */}
        <section>
          <SectionTitle title={v.financePerformance} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <KPICard icon={Wallet} label="Fees invoiced (expected)" value={fmt(tp.feesExpected)} variant="blue" />
            <KPICard
              icon={CreditCard}
              label={v.financeCurrentPeriodAttributed}
              value={fmt(tp.feesCollectedAttributed)}
              variant="green"
            />
            <KPICard
              icon={Banknote}
              label="Cash in"
              value={fmt(tp.cashIn)}
              subline={`All fee receipts dated in this ${v.financePeriod.toLowerCase()}’s window (${m.currentTerm?.label ?? "—"}); includes payments toward older ${v.financePeriodPlural.toLowerCase()}`}
              variant="violet"
            />
            <KPICard icon={FileText} label={`Outstanding (${v.financeCurrentPeriod.toLowerCase()} only)`} value={fmt(tp.outstandingOnTerm)} variant="orange" />
            <KPICard icon={TrendingUp} label="Collection rate" value={collectionRateDisplay} variant="teal" />
            <KPICard
              icon={DollarSign}
              label={`Expenses (${v.financeCurrentPeriod.toLowerCase()})`}
              value={fmt(tp.expensesApproved)}
              subline={`Approved or paid expenses allocated to this ${v.financePeriod.toLowerCase()}`}
              variant="slate"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[13px]">
            <p className="ac-text-muted">
              Discounts / waivers on record (school-wide, all time):{" "}
              <span className="ac-text-secondary fo-num font-medium">{fmt(m.discountsSchoolWide)}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/dashboard/accountant/functional-vs-tuition')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20"
              >
                Functional vs. Tuition Tracker →
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard/accountant/discounts-bursaries')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400 transition-colors hover:bg-amber-500/20"
              >
                Discounts & Bursaries Audit →
              </button>
            </div>
          </div>
        </section>

        {/* Cash activity */}
        <section>
          <SectionTitle title="Fee receipt activity" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KPICard icon={Calendar} label="Today" value={fmt(ca.todayAllTerms)} variant="teal" />
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
              subline={isTertiary ? "Calendar month, all intakes" : "Calendar month, all terms"}
              variant="green"
            />
          </div>
        </section>

        {/* Receivables + cashflow */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
          <section className="w-full">
            <div className="ac-glass-card flex h-full min-h-0 flex-col rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-4 shadow-sm dark:bg-emerald-500/[0.06]">
              <div className="mb-3 flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 shrink-0 text-emerald-500 dark:text-emerald-400" />
                <h3 className="fo-panel-title">School receivables</h3>
              </div>
              <div className="mb-4 grid grid-cols-2 gap-2.5">
                <div className="ac-glass-card rounded-lg border border-[var(--ac-border)]/50 p-3">
                  <p className="ac-text-secondary text-xs font-medium">Total still to collect</p>
                  <p className="fo-num ac-text-primary mt-1 text-xl font-bold">{fmt(ra.totalOutstanding)}</p>
                </div>
                <div className="ac-glass-card rounded-lg border border-[var(--ac-border)]/50 p-3">
                  <p className="ac-text-secondary text-xs font-medium">{isTertiary ? 'Trainees owing' : 'Students owing'}</p>
                  <p className="ac-text-primary mt-1 flex items-center gap-1.5 text-xl font-bold">
                    <Users className="h-4 w-4 shrink-0 opacity-70" />
                    <span className="fo-num">{ra.debtorStudentCount}</span>
                  </p>
                </div>
                <div className="ac-glass-card rounded-lg border border-[var(--ac-border)]/50 p-3">
                  <p className="ac-text-secondary text-xs font-medium">{isTertiary ? 'Current intake slice' : 'Current term slice'}</p>
                  <p className="fo-num ac-text-primary mt-1 text-lg font-semibold">{fmt(ra.onCurrentTerm)}</p>
                </div>
                <div className="ac-glass-card rounded-lg border border-[var(--ac-border)]/50 p-3">
                  <p className="ac-text-secondary text-xs font-medium">{v.financeOlderPeriodArrears}</p>
                  <p className="fo-num ac-text-primary mt-1 text-lg font-semibold">{fmt(ra.onPriorTerms)}</p>
                </div>
              </div>

              {pieData.length > 0 ? (
                <div className="border-t border-slate-200/80 pt-3 dark:border-white/10">
                  <p className="ac-text-muted mb-2 text-xs font-medium uppercase tracking-wider">{isTertiary ? 'By intake (outstanding)' : 'By term (outstanding)'}</p>
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
                        <span className="fo-num ac-text-primary text-lg font-bold">{fmt(ra.totalOutstanding)}</span>
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
                          <span className="fo-num ac-text-primary font-medium">{fmt(t.value)}</span>
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
            <div className="ac-glass-card flex h-full min-h-0 flex-col rounded-xl border border-sky-500/15 bg-sky-500/[0.04] p-4 shadow-sm dark:bg-sky-500/[0.06]">
              <div className="mb-2 flex flex-col gap-0.5">
                <h3 className="fo-panel-title">Net cash</h3>
                <p className="ac-text-secondary text-[13px] font-medium leading-snug">
                  Fee receipts compared with what the school has spent (approved/paid expenses). Net is what&apos;s left.
                </p>
              </div>
              <p
                className={`fo-num mt-1.5 text-[clamp(1.45rem,2.8vw,1.75rem)] font-bold tracking-tight ${m.cashflowAllTime.netCash >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-rose-400"}`}
              >
                {fmt(m.cashflowAllTime.netCash)}
              </p>
              <p className="ac-text-muted mt-1 text-[11px] leading-snug">
                Same total basis as &quot;Net cash surplus&quot; above.
              </p>
              <div className="ac-text-secondary mt-3 flex flex-wrap gap-3 text-[13px]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600 dark:bg-emerald-400" />
                  Fee receipts
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-red-600 dark:bg-rose-400" />
                  Expenses (red bars)
                </span>
              </div>
              <div className="mt-3 h-[min(280px,38vh)] min-h-[180px] w-full">
                {!hasNetCashActivity ? (
                  <p className="ac-text-muted py-8 text-center text-sm">No fee receipts or expenses recorded yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={netCashBars} margin={{ top: 8, right: 8, left: 8, bottom: 8 }} barCategoryGap="28%">
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: chartColors.axis }}
                        axisLine={{ stroke: chartColors.grid }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: chartColors.axis }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${v / 1000}K` : String(v))}
                        domain={[0, "auto"]}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload as { name: string; amount: number };
                          return (
                            <div className="ac-glass-card rounded-xl border border-[var(--ac-border)] px-4 py-3 text-sm shadow-lg">
                              <p className="ac-text-primary mb-1 font-semibold">{d.name}</p>
                              <p
                                className={
                                  d.name === "Expenses"
                                    ? "text-red-600 dark:text-rose-400"
                                    : "text-emerald-600 dark:text-emerald-400"
                                }
                              >
                                {fmt(d.amount)}
                              </p>
                            </div>
                          );
                        }}
                        cursor={{ fill: theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(148, 163, 184, 0.08)" }}
                      />
                      <Bar dataKey="amount" radius={[6, 6, 0, 0]} name="Amount">
                        <Cell fill={theme === "dark" ? "#34d399" : "#047857"} />
                        <Cell fill={theme === "dark" ? "#f87171" : "#dc2626"} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Payment mix — current term (Cash, Bank, School Pay, Sure Pay) */}
        <section>
          <SectionTitle
            title="Collections by method (current term)"
            subtitle="Breakdown of payments attributed to the current term only. Bank includes mobile money, transfers, POS, and similar. Sure Pay will appear once that integration is enabled."
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="ac-glass-card flex min-h-[4.25rem] flex-col rounded-lg border border-[var(--ac-border)]/50 bg-violet-500/[0.05] px-3 py-2.5 dark:bg-violet-500/[0.08]">
              <p className="ac-text-muted text-xs font-medium">Cash</p>
              <p className="fo-num ac-text-primary mt-auto text-base font-semibold sm:text-lg">{fmt(m.collectionsByMethod.cash)}</p>
            </div>
            <div className="ac-glass-card flex min-h-[4.25rem] flex-col rounded-lg border border-[var(--ac-border)]/50 bg-violet-500/[0.05] px-3 py-2.5 dark:bg-violet-500/[0.08]">
              <p className="ac-text-muted text-xs font-medium">Bank</p>
              <p className="fo-num ac-text-primary mt-auto text-base font-semibold sm:text-lg">{fmt(m.collectionsByMethod.bank)}</p>
            </div>
            <div className="ac-glass-card flex min-h-[4.25rem] flex-col rounded-lg border border-[var(--ac-border)]/50 bg-violet-500/[0.05] px-3 py-2.5 dark:bg-violet-500/[0.08]">
              <p className="ac-text-muted text-xs font-medium">School Pay</p>
              <p className="fo-num ac-text-primary mt-auto text-base font-semibold sm:text-lg">{fmt(m.collectionsByMethod.school_pay)}</p>
            </div>
            <div className="ac-glass-card flex min-h-[4.25rem] flex-col rounded-lg border border-[var(--ac-border)]/50 bg-violet-500/[0.05] px-3 py-2.5 dark:bg-violet-500/[0.08]">
              <p className="ac-text-muted text-xs font-medium">Sure Pay</p>
              <p className="fo-num ac-text-primary mt-auto text-base font-semibold sm:text-lg">{fmt(m.collectionsByMethod.sure_pay)}</p>
            </div>
          </div>
        </section>

        {/* Recent payments list from metrics */}
        <section>
          <div className="ac-glass-card rounded-xl border border-[var(--ac-border)]/60 p-4 shadow-sm">
            <h3 className="fo-section-heading mb-1">Latest fee payments</h3>
            <p className="ac-text-muted mb-3 text-[13px] leading-snug">
              Ten most recent non-reversed payments school-wide.
            </p>
            <div className="ac-table-wrap overflow-x-auto rounded-xl border border-[var(--ac-border)]/45">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Class</th>
                    <th>Receipt</th>
                    <th>Date</th>
                    <th>Method</th>
                    <th className="text-right">Amount</th>
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
                      <tr key={r.payment_id}>
                        <td className="ac-cell-primary">{r.student_name}</td>
                        <td>{r.class}</td>
                        <td>{r.receipt_number ?? "—"}</td>
                        <td>{r.payment_date}</td>
                        <td>{feePaymentMethodLabel(r.payment_method)}</td>
                        <td className="fo-num text-right font-medium text-emerald-600 dark:text-emerald-400">
                          {fmt(r.amount_paid)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Recent transactions */}
        <section className="w-full pb-2">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start">
            {/* Notifications Card */}
            <div className="lg:col-span-1">
              <AccountantNotificationsCard />
            </div>
            
            {/* Activity Feed */}
            <div className="lg:col-span-2">
              <div className="ac-glass-card rounded-xl border border-[var(--ac-border)]/60 p-4 shadow-sm">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="fo-section-heading">Activity feed</h3>
                    <p className="ac-text-muted mt-0.5 text-[13px] leading-relaxed">
                      Fee payments and expenses for the selected period.
                    </p>
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
                <div className="ac-table-wrap overflow-x-auto rounded-xl border border-[var(--ac-border)]/45">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr>
                        <th>Transaction</th>
                        <th>Account</th>
                        <th>Date & time</th>
                        <th className="text-right">Amount</th>
                        <th>Status</th>
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
                          <tr key={tx.id}>
                            <td>
                              <p className="ac-cell-primary">{tx.name}</p>
                              <p className="ac-text-muted text-xs">{tx.sub}</p>
                            </td>
                            <td>{tx.account}</td>
                            <td>
                              <p>{tx.date}</p>
                              <p className="ac-text-muted text-xs">{tx.time}</p>
                            </td>
                            <td className="text-right">
                              <span
                                className={
                                  tx.amount >= 0
                                    ? "fo-num font-medium text-emerald-600 dark:text-emerald-400"
                                    : "fo-num font-medium text-red-600 dark:text-rose-400"
                                }
                              >
                                {tx.amount >= 0 ? "+" : ""}
                                {fmt(tx.amount)}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  tx.status === "Completed"
                                    ? "bg-emerald-600/90 text-white dark:bg-emerald-500/80 dark:text-emerald-950"
                                    : "bg-amber-500/90 text-amber-950 dark:bg-amber-400/75 dark:text-amber-950"
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
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
