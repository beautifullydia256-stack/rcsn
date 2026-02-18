import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { Wallet, CreditCard, FileText, TrendingUp } from "lucide-react";
import { useAuthStore } from "../../store/authStore";

const STALE_TIME_MS = 2 * 60 * 1000;
const fmt = (n: number) => (n == null || Number.isNaN(n) ? "—" : n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }));

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
  recentPayments: { student_name: string; class: string; receipt_number: string | null; payment_date: string; amount_paid: number; payment_method: string }[];
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

  const [
    balancesRes,
    paymentsRes,
    expensesRes,
    discountsRes,
    recentPaymentsRes,
  ] = await Promise.all([
    termId
      ? supabase
          .from("student_balances")
          .select("total_fees, total_paid, balance")
          .eq("school_id", schoolId)
          .eq("term_id", termId)
      : { data: [] as { total_fees: number; total_paid: number; balance: number }[] },
    supabase
      .from("student_payments")
      .select("amount_paid, payment_date, payment_method")
      .eq("school_id", schoolId),
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

  const paymentsInTerm = payments.filter(
    (p: Pay) => p.payment_date >= termStart && p.payment_date <= termEnd
  );
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
  balances.forEach((b: { total_fees: number; total_paid: number; balance: number }) => {
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

  const recentPayments = recentPaymentsRows.map((r: { student_id: string; amount_paid: number; payment_date: string; payment_method: string; receipt_number: string | null }) => {
    const st = studentMap.get(r.student_id);
    return {
      student_name: st?.name ?? "—",
      class: st?.current_class ?? "—",
      receipt_number: r.receipt_number ?? null,
      payment_date: r.payment_date,
      amount_paid: Number(r.amount_paid || 0),
      payment_method: r.payment_method ?? "—",
    };
  });

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
  trend,
  positive,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  trend: string;
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
      <span className="text-xs text-gray-500">{trend}</span>
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
      <div className="p-6 text-gray-500">
        Loading your school…
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-gray-200 h-28 animate-pulse" />
          ))}
        </div>
        <div className="text-gray-500">Loading financial overview…</div>
      </div>
    );
  }

  const collectionRate =
    data.totalFeesExpected > 0
      ? Math.round((data.totalFeesCollected / data.totalFeesExpected) * 100)
      : 0;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Financial Overview</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/dashboard/accountant/payments")}
            className="rounded-xl border border-teal-600 bg-white px-4 py-2 text-sm font-medium text-teal-600 hover:bg-teal-50"
          >
            Record payment
          </button>
          <button
            type="button"
            onClick={() => navigate("/dashboard/accountant/outstanding")}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            View outstanding
          </button>
          <button
            type="button"
            onClick={() => navigate("/dashboard/accountant/expenses")}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Record expense
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-4">{data.termLabel}</p>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard
          icon={Wallet}
          label="Total Fees Expected"
          value={fmt(data.totalFeesExpected)}
          trend="This term"
          positive
        />
        <KPICard
          icon={CreditCard}
          label="Total Fees Collected"
          value={fmt(data.totalFeesCollected)}
          trend="This term"
          positive
        />
        <KPICard
          icon={FileText}
          label="Outstanding Balances"
          value={fmt(data.outstandingBalances)}
          trend="Students with balance due"
          positive={false}
        />
        <KPICard
          icon={TrendingUp}
          label="Today's Collections"
          value={fmt(data.todayCollections)}
          trend="Payments received today"
          positive
        />
      </div>

      <div className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-7 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Fee Collections</h3>
          <p className="text-2xl font-bold text-gray-900 mb-2">{data.termLabel}</p>
          <div className="flex gap-4 mb-4">
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-3 h-3 rounded-full bg-teal-600" /> Collected: {fmt(data.totalFeesCollected)}
            </span>
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-3 h-3 rounded-full bg-gray-400" /> Expected: {fmt(data.totalFeesExpected)}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            This week: {fmt(data.weekCollections)} · This month: {fmt(data.monthCollections)}
          </p>
        </div>

        <div className="col-span-2 bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Expense Breakdown</h3>
          <p className="text-lg font-bold text-gray-900 mb-4">{fmt(data.totalExpensesThisTerm)}</p>
          <p className="text-xs text-gray-500">This term (approved/paid)</p>
        </div>

        <div className="col-span-3 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Collection Rate</h3>
            <p className="text-xl font-bold text-gray-900">{collectionRate}%</p>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
              <div
                className="h-full rounded-full bg-teal-500 transition-all"
                style={{ width: `${Math.min(100, collectionRate)}%` }}
              />
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Collections by Method</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Cash</span>
                <span className="font-medium">{fmt(data.cashTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Bank / Card</span>
                <span className="font-medium">{fmt(data.bankTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Mobile Money</span>
                <span className="font-medium">{fmt(data.mobileTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Other</span>
                <span className="font-medium">{fmt(data.otherTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-4 bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-2">Scholarships / Discounts</h3>
          <p className="text-2xl font-bold text-gray-900">{fmt(data.scholarshipsDiscounts)}</p>
        </div>
        <div className="col-span-4 bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-2">Net Position</h3>
          <p className={`text-2xl font-bold ${data.netPosition >= 0 ? "text-teal-600" : "text-red-600"}`}>
            {data.netPosition >= 0 ? "Surplus " : "Deficit "}
            {fmt(Math.abs(data.netPosition))}
          </p>
        </div>
        <div className="col-span-4 bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-2">Payment Status</h3>
          <div className="flex gap-4 text-sm">
            <span className="text-teal-600 font-medium">Fully paid: {data.fullyPaidCount}</span>
            <span className="text-amber-600 font-medium">Partial: {data.partiallyPaidCount}</span>
            <span className="text-red-600 font-medium">Not paid: {data.notPaidCount}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-7 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Fee Payments</h3>
            <button
              type="button"
              onClick={() => navigate("/dashboard/accountant/payments")}
              className="text-sm font-medium text-teal-600 hover:text-teal-700"
            >
              View all
            </button>
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
                {data.recentPayments.length === 0 ? (
                  <tr>
                    <td className="py-6 text-gray-400 text-center" colSpan={5}>
                      No payments recorded yet.
                    </td>
                  </tr>
                ) : (
                  data.recentPayments.map((row, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-3 pr-4 font-medium">{row.student_name} / {row.class}</td>
                      <td className="py-3 pr-4">{row.receipt_number ?? "—"}</td>
                      <td className="py-3 pr-4">{row.payment_date}</td>
                      <td className="py-3 text-right font-semibold text-teal-600">{fmt(row.amount_paid)}</td>
                      <td className="py-3 pl-2">{row.payment_method}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-span-5 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Status (This Term)</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-teal-50 border border-teal-100">
              <span className="text-sm font-medium text-gray-900">Fully paid</span>
              <span className="text-lg font-bold text-teal-700">{data.fullyPaidCount}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-100">
              <span className="text-sm font-medium text-gray-900">Partially paid</span>
              <span className="text-lg font-bold text-amber-700">{data.partiallyPaidCount}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-red-50 border border-red-100">
              <span className="text-sm font-medium text-gray-900">Not paid</span>
              <span className="text-lg font-bold text-red-700">{data.notPaidCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
