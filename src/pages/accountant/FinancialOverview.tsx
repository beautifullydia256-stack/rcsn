import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import {
  Wallet,
  CreditCard,
  FileText,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Users,
  Banknote,
  Smartphone,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";

const STALE_TIME_MS = 2 * 60 * 1000;
const fmt = (n: number) =>
  n == null || Number.isNaN(n) ? "—" : n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

interface OverviewData {
  termId: string | null;
  termLabel: string;
  totalFeesExpected: number;
  totalFeesCollected: number;
  outstandingBalances: number;
  todayCollections: number;
  weekCollections: number;
  monthCollections: number;
  scholarshipsDiscounts: number;
  totalExpensesThisTerm: number;
  netPosition: number;
  cashTotal: number;
  bankTotal: number;
  mobileTotal: number;
  otherTotal: number;
  fullyPaidCount: number;
  partiallyPaidCount: number;
  notPaidCount: number;
  recentPayments: {
    student_name: string;
    class: string;
    receipt_number: string | null;
    payment_date: string;
    amount_paid: number;
    payment_method: string;
  }[];
}

async function fetchFinancialOverview(schoolId: string): Promise<OverviewData> {
  const today = new Date().toISOString().slice(0, 10);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().slice(0, 10);

  const { data: terms } = await supabase
    .from("school_terms")
    .select("id, start_date, end_date, year, term")
    .eq("school_id", schoolId)
    .order("year", { ascending: false })
    .order("term", { ascending: false });

  const currentTerm =
    (terms || []).find(
      (t: { start_date?: string; end_date: string }) =>
        t.start_date && t.end_date && t.start_date <= today && t.end_date >= today
    ) ?? terms?.[0];
  const termId = (currentTerm as { id: string } | undefined)?.id ?? null;
  const termLabel = currentTerm
    ? `Term ${(currentTerm as { term: number }).term}, ${(currentTerm as { year: number }).year}`
    : "No term";
  const termStart = (currentTerm as { start_date?: string })?.start_date ?? "1900-01-01";
  const termEnd = (currentTerm as { end_date: string })?.end_date ?? "2100-12-31";

  const [balancesRes, paymentsRes, expensesRes, discountsRes, recentPaymentsRes] = await Promise.all([
    termId
      ? supabase
          .from("student_balances")
          .select("total_fees, total_paid, balance")
          .eq("school_id", schoolId)
          .eq("term_id", termId)
      : { data: [] as { total_fees: number; total_paid: number; balance: number }[] },
    supabase.from("student_payments").select("amount_paid, payment_date, payment_method").eq("school_id", schoolId),
    termId
      ? supabase
          .from("school_expenses")
          .select("amount, status")
          .eq("school_id", schoolId)
          .eq("term_id", termId)
      : { data: [] as { amount: number; status: string }[] },
    Promise.resolve(
      supabase.from("student_discounts").select("amount").eq("school_id", schoolId)
    ).then((r) => r, () => ({ data: [] as { amount: number }[] })),
    supabase
      .from("student_payments")
      .select("amount_paid, payment_date, payment_method, receipt_number, student_id")
      .eq("school_id", schoolId)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const balances = balancesRes.data || [];
  const paymentsRaw = paymentsRes.data || [];
  const payments = paymentsRaw.filter((p: Record<string, unknown>) => !p.reversed_at);
  const expenses = expensesRes.data || [];
  const discounts = discountsRes.data || [];
  const recentPaymentsRows = (recentPaymentsRes.data || []).filter((p: Record<string, unknown>) => !p.reversed_at);

  type Bal = { total_fees?: number; total_paid?: number; balance?: number };
  type Pay = { payment_date: string; amount_paid?: number };
  type Disc = { amount?: number };
  type Exp = { status: string; amount?: number };

  const totalFeesExpected = balances.reduce((s: number, b: Bal) => s + Number(b.total_fees || 0), 0);
  const totalFeesCollected = balances.reduce((s: number, b: Bal) => s + Number(b.total_paid || 0), 0);
  const outstandingBalances = balances.reduce((s: number, b: Bal) => s + Math.max(0, Number(b.balance ?? 0)), 0);

  const paymentsInTerm = payments.filter((p: Pay) => p.payment_date >= termStart && p.payment_date <= termEnd);
  const todayCollections = payments
    .filter((p: Pay) => p.payment_date === today)
    .reduce((s: number, p: Pay) => s + Number(p.amount_paid || 0), 0);
  const weekCollections = payments
    .filter((p: Pay) => p.payment_date >= weekStartStr && p.payment_date <= today)
    .reduce((s: number, p: Pay) => s + Number(p.amount_paid || 0), 0);
  const monthCollections = payments
    .filter((p: Pay) => p.payment_date >= monthStartStr && p.payment_date <= today)
    .reduce((s: number, p: Pay) => s + Number(p.amount_paid || 0), 0);

  const scholarshipsDiscounts = discounts.reduce((s: number, d: Disc) => s + Number(d.amount || 0), 0);
  const totalExpensesThisTerm = expenses
    .filter((e: Exp) => ["approved", "paid"].includes(e.status))
    .reduce((s: number, e: Exp) => s + Number(e.amount || 0), 0);
  const netPosition = totalFeesCollected - totalExpensesThisTerm;

  const byMethod = { cash: 0, bank: 0, mobile_money: 0, other: 0 };
  paymentsInTerm.forEach((p: { payment_method?: string; amount_paid: number }) => {
    const m = (p.payment_method || "").toLowerCase();
    const amt = Number(p.amount_paid || 0);
    if (m === "cash") byMethod.cash += amt;
    else if (m === "bank" || m === "cheque" || m === "pos" || m === "online") byMethod.bank += amt;
    else if (m === "mobile_money") byMethod.mobile_money += amt;
    else byMethod.other += amt;
  });

  let fullyPaidCount = 0,
    partiallyPaidCount = 0,
    notPaidCount = 0;
  balances.forEach((b: Bal) => {
    const tf = Number(b.total_fees || 0);
    const bal = Number(b.balance ?? 0);
    if (tf <= 0) return;
    if (bal <= 0) fullyPaidCount++;
    else if (bal >= tf) notPaidCount++;
    else partiallyPaidCount++;
  });

  const studentIds = [...new Set(recentPaymentsRows.map((r: { student_id: string }) => r.student_id))];
  const { data: studentsData } =
    studentIds.length > 0
      ? await supabase.from("students").select("student_id, name, current_class").in("student_id", studentIds)
      : { data: [] };
  const studentMap = new Map(
    (studentsData || []).map((s: { student_id: string; name: string; current_class: string }) => [
      s.student_id,
      { name: s.name, current_class: s.current_class },
    ])
  );

  const recentPayments = recentPaymentsRows.map(
    (r: {
      student_id: string;
      amount_paid: number;
      payment_date: string;
      payment_method: string;
      receipt_number: string | null;
    }) => {
      const st = studentMap.get(r.student_id);
      return {
        student_name: st?.name ?? "—",
        class: st?.current_class ?? "—",
        receipt_number: r.receipt_number ?? null,
        payment_date: r.payment_date,
        amount_paid: Number(r.amount_paid || 0),
        payment_method: r.payment_method ?? "—",
      };
    }
  );

  return {
    termId,
    termLabel,
    totalFeesExpected,
    totalFeesCollected,
    outstandingBalances,
    todayCollections,
    weekCollections,
    monthCollections,
    scholarshipsDiscounts,
    totalExpensesThisTerm,
    netPosition,
    cashTotal: byMethod.cash,
    bankTotal: byMethod.bank,
    mobileTotal: byMethod.mobile_money,
    otherTotal: byMethod.other,
    fullyPaidCount,
    partiallyPaidCount,
    notPaidCount,
    recentPayments,
  };
}

function KPICard({
  icon: Icon,
  label,
  value,
  subline,
  accent = "emerald",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subline: string;
  accent?: "emerald" | "amber" | "red" | "slate";
}) {
  const accentClasses = {
    emerald: "bg-emerald-500/10 text-emerald-600",
    amber: "bg-amber-500/10 text-amber-600",
    red: "bg-red-500/10 text-red-600",
    slate: "bg-slate-500/10 text-slate-600",
  };
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className={`rounded-lg p-2.5 ${accentClasses[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-1 text-xs text-slate-400">{subline}</p>
    </div>
  );
}

export default function FinancialOverview() {
  const navigate = useNavigate();
  const schoolId = useAuthStore((s) => s.schoolId);

  const { data, isLoading } = useQuery({
    queryKey: ["accountant", "financial-overview", schoolId],
    queryFn: () => fetchFinancialOverview(schoolId!),
    enabled: !!schoolId,
    staleTime: STALE_TIME_MS,
  });

  if (!schoolId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
        Loading your school…
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-xl border border-slate-200 bg-white animate-pulse" />
          ))}
        </div>
        <div className="mt-6 text-center text-sm text-slate-500">Loading financial overview…</div>
      </div>
    );
  }

  const collectionRate =
    data.totalFeesExpected > 0 ? Math.round((data.totalFeesCollected / data.totalFeesExpected) * 100) : 0;
  const maxMethod = Math.max(
    data.cashTotal,
    data.bankTotal,
    data.mobileTotal,
    data.otherTotal,
    1
  );

  return (
    <div className="min-h-full bg-slate-50/60">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Financial Overview</h1>
              <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  {data.termLabel}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate("/dashboard/accountant/payments")}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
              >
                <Receipt className="h-4 w-4" />
                Record payment
              </button>
              <button
                type="button"
                onClick={() => navigate("/dashboard/accountant/outstanding")}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                View outstanding
              </button>
              <button
                type="button"
                onClick={() => navigate("/dashboard/accountant/expenses")}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Record expense
              </button>
            </div>
          </div>
        </div>

        {/* KPI row */}
        <section className="mb-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">Key figures</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard
              icon={Wallet}
              label="Total fees expected"
              value={fmt(data.totalFeesExpected)}
              subline="This term"
              accent="slate"
            />
            <KPICard
              icon={CreditCard}
              label="Total fees collected"
              value={fmt(data.totalFeesCollected)}
              subline="This term"
              accent="emerald"
            />
            <KPICard
              icon={FileText}
              label="Outstanding balances"
              value={fmt(data.outstandingBalances)}
              subline="Balance due"
              accent="red"
            />
            <KPICard
              icon={TrendingUp}
              label="Today's collections"
              value={fmt(data.todayCollections)}
              subline="Payments today"
              accent="emerald"
            />
          </div>
        </section>

        {/* Summary row: Collections + Rate + Methods */}
        <section className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Fee collections</h3>
              <p className="mt-1 text-sm text-slate-500">Collected vs expected this term</p>
              <div className="mt-4 flex flex-wrap gap-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-slate-900">{fmt(data.totalFeesCollected)}</span>
                  <span className="text-sm text-slate-500">collected</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-medium text-slate-400">{fmt(data.totalFeesExpected)}</span>
                  <span className="text-sm text-slate-500">expected</span>
                </div>
              </div>
              <div className="mt-4 space-y-1 text-sm text-slate-500">
                <p>This week: <span className="font-medium text-slate-700">{fmt(data.weekCollections)}</span></p>
                <p>This month: <span className="font-medium text-slate-700">{fmt(data.monthCollections)}</span></p>
              </div>
            </div>
          </div>
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Collection rate</h3>
              <div className="mt-3 flex items-end gap-3">
                <span className="text-3xl font-bold text-slate-900">{collectionRate}%</span>
                <div className="flex-1 rounded-full bg-slate-100 p-1">
                  <div
                    className="h-2 rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, collectionRate)}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">By payment method</h3>
              <div className="mt-4 space-y-3">
                {[
                  { label: "Cash", value: data.cashTotal, icon: Banknote },
                  { label: "Bank / Card", value: data.bankTotal, icon: CreditCard },
                  { label: "Mobile money", value: data.mobileTotal, icon: Smartphone },
                  { label: "Other", value: data.otherTotal, icon: Receipt },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-slate-400" />
                    <div className="flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">{label}</span>
                        <span className="font-medium text-slate-900">{fmt(value)}</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-500/70"
                          style={{ width: `${(value / maxMethod) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Secondary stats: Expenses, Net, Discounts, Payment status */}
        <section className="mb-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">Summary</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Expenses (term)</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{fmt(data.totalExpensesThisTerm)}</p>
              <p className="mt-0.5 text-xs text-slate-500">Approved / paid</p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Net position</p>
              <p className={`mt-1 flex items-center gap-1 text-xl font-semibold ${data.netPosition >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {data.netPosition >= 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                {data.netPosition >= 0 ? "Surplus" : "Deficit"} {fmt(Math.abs(data.netPosition))}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Scholarships / discounts</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{fmt(data.scholarshipsDiscounts)}</p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Payment status</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  <Users className="h-3.5 w-3" /> {data.fullyPaidCount} fully paid
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700">
                  {data.partiallyPaidCount} partial
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-700">
                  {data.notPaidCount} not paid
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Recent payments + Payment status breakdown */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <h3 className="text-base font-semibold text-slate-900">Recent fee payments</h3>
                <button
                  type="button"
                  onClick={() => navigate("/dashboard/accountant/payments")}
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                >
                  View all →
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Student / Class
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Receipt
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Method
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.recentPayments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                          No payments recorded yet.
                        </td>
                      </tr>
                    ) : (
                      data.recentPayments.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900">
                            {row.student_name} <span className="text-slate-400">/ {row.class}</span>
                          </td>
                          <td className="px-6 py-4 text-slate-600">{row.receipt_number ?? "—"}</td>
                          <td className="px-6 py-4 text-slate-600">{row.payment_date}</td>
                          <td className="px-6 py-4 text-right font-semibold text-emerald-600">{fmt(row.amount_paid)}</td>
                          <td className="px-6 py-4 text-slate-600">{row.payment_method}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="lg:col-span-4">
            <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Payment status (this term)</h3>
              <p className="mt-1 text-sm text-slate-500">Students by fee status</p>
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3">
                  <span className="text-sm font-medium text-slate-700">Fully paid</span>
                  <span className="text-lg font-bold text-emerald-700">{data.fullyPaidCount}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3">
                  <span className="text-sm font-medium text-slate-700">Partially paid</span>
                  <span className="text-lg font-bold text-amber-700">{data.partiallyPaidCount}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3">
                  <span className="text-sm font-medium text-slate-700">Not paid</span>
                  <span className="text-lg font-bold text-red-700">{data.notPaidCount}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
