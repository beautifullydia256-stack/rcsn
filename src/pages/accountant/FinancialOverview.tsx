import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import {
  Wallet,
  CreditCard,
  FileText,
  TrendingUp,
  Receipt,
  DollarSign,
  FilePlus,
  Send,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";

const STALE_TIME_MS = 2 * 60 * 1000;
const fmt = (n: number) =>
  n == null || Number.isNaN(n) ? "Ã¢â‚¬â€" : n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

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
        student_name: st?.name ?? "Ã¢â‚¬â€",
        class: st?.current_class ?? "Ã¢â‚¬â€",
        receipt_number: r.receipt_number ?? null,
        payment_date: r.payment_date,
        amount_paid: Number(r.amount_paid || 0),
        payment_method: r.payment_method ?? "Ã¢â‚¬â€",
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
        Loading your schoolÃ¢â‚¬Â¦
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
        <div className="mt-6 text-center text-sm text-slate-500">Loading financial overviewÃ¢â‚¬Â¦</div>
      </div>
    );
  }

  return (
    <div className="min-h-full" style={{ backgroundColor: "#f7f9fb" }}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-7">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Financial Overview</h1>
          <p className="mt-1 flex items-center gap-2 text-[13px] text-[#6b7280]">
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  {data.termLabel}
                </span>
              </p>
        </div>

        {/* ROW 1 â€” KPI cards (unchanged) */}
        <section className="mb-7" style={{ marginBottom: 28 }}>
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

        {/* Quick actions */}
        <section style={{ marginBottom: 28 }}>
          <h3 className="mb-4 text-[18px] font-semibold text-[#1f2933]">Quick actions</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4" style={{ gap: 24 }}>
            <button
              type="button"
              onClick={() => navigate("/dashboard/accountant/payments")}
              className="flex flex-col items-center justify-center gap-3 rounded-[14px] border border-[#eef1f4] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <Receipt className="h-6 w-6" />
              </span>
              <span className="text-sm font-semibold text-[#1f2933]">Record payment</span>
            </button>
            <button
              type="button"
              onClick={() => navigate("/dashboard/accountant/billing")}
              className="flex flex-col items-center justify-center gap-3 rounded-[14px] border border-[#eef1f4] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <FilePlus className="h-6 w-6" />
              </span>
              <span className="text-sm font-semibold text-[#1f2933]">Generate invoice</span>
            </button>
            <button
              type="button"
              onClick={() => navigate("/dashboard/accountant/expenses")}
              className="flex flex-col items-center justify-center gap-3 rounded-[14px] border border-[#eef1f4] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <DollarSign className="h-6 w-6" />
              </span>
              <span className="text-sm font-semibold text-[#1f2933]">Record expense</span>
            </button>
            <button
              type="button"
              className="flex flex-col items-center justify-center gap-3 rounded-[14px] border border-[#eef1f4] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Send className="h-6 w-6" />
              </span>
              <span className="text-sm font-semibold text-[#1f2933]">Send reminder</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
