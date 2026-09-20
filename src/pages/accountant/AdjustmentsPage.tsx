import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  RotateCcw,
  Percent,
  ArrowRightLeft,
  FileSignature,
  Search,
  Download,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  TrendingDown,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { useUIStore } from "../../store/uiStore";
import { useSort, Th } from "../../lib/useSort";
import { exportToPdf, exportToExcel } from "../../lib/exportUtils";
import { schoolCalendarTodayIso } from "../../lib/schoolCalendarDate";
import { useSchoolName } from "../../lib/useSchoolName";
import PosEmptyState from "../../components/finance/pos/PosEmptyState";
import { getTokens, cardGrad, SORA, INTER } from "../../styles/posThemeTokens";

type PaymentOption = {
  payment_id: string;
  receipt_number: string | null;
  student_name: string;
  amount_paid: number;
  payment_date: string | null;
};

type ReversalRecord = {
  payment_id: string;
  receipt_number: string | null;
  student_name: string;
  amount_paid: number;
  payment_date: string | null;
  reversed_at: string;
  reversal_reason: string | null;
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export default function AdjustmentsPage() {
  const queryClient = useQueryClient();
  const schoolId = useAuthStore((s) => s.schoolId);
  const userId = useAuthStore((s) => s.user?.id);
  const schoolName = useSchoolName();
  const todayIso = schoolCalendarTodayIso();
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === "dark";
  const t = getTokens(isDark);

  const [reversalPaymentId, setReversalPaymentId] = useState("");
  const [reversalReason, setReversalReason] = useState("");
  const [reversing, setReversing] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [q, setQ] = useState("");

  // Active (un-reversed) payments for the reversal form
  const { data: activePayments = [] } = useQuery({
    queryKey: ["accountant", "adjustments", "payments", schoolId],
    queryFn: async (): Promise<PaymentOption[]> => {
      if (!schoolId) return [];
      const { data } = await supabase
        .from("student_payments")
        .select("payment_id, receipt_number, student_id, amount_paid, payment_date")
        .eq("school_id", schoolId)
        .is("reversed_at", null)
        .order("payment_date", { ascending: false })
        .limit(200);
      if (!data?.length) return [];
      const studentIds = [...new Set((data as { student_id: string }[]).map((r) => r.student_id))];
      const { data: students } = await supabase.from("students").select("student_id, name").in("student_id", studentIds);
      const nameMap = new Map((students || []).map((s: { student_id: string; name: string }) => [s.student_id, s.name]));
      return (
        data as {
          payment_id: string;
          receipt_number: string | null;
          student_id: string;
          amount_paid: number;
          payment_date: string | null;
        }[]
      ).map((r) => ({
        payment_id: r.payment_id,
        receipt_number: r.receipt_number,
        student_name: nameMap.get(r.student_id) ?? "—",
        amount_paid: r.amount_paid,
        payment_date: r.payment_date,
      }));
    },
    enabled: !!schoolId,
    staleTime: 2 * 60 * 1000,
  });

  // Reversal history
  const { data: reversals = [], isLoading: reversalsLoading } = useQuery({
    queryKey: ["accountant", "adjustments", "reversals", schoolId],
    queryFn: async (): Promise<ReversalRecord[]> => {
      if (!schoolId) return [];
      const { data } = await supabase
        .from("student_payments")
        .select("payment_id, receipt_number, student_id, amount_paid, payment_date, reversed_at, reversal_reason")
        .eq("school_id", schoolId)
        .not("reversed_at", "is", null)
        .order("reversed_at", { ascending: false })
        .limit(200);
      if (!data?.length) return [];
      const studentIds = [...new Set((data as { student_id: string }[]).map((r) => r.student_id))];
      const { data: students } = await supabase.from("students").select("student_id, name").in("student_id", studentIds);
      const nameMap = new Map((students || []).map((s: { student_id: string; name: string }) => [s.student_id, s.name]));
      return (
        data as {
          payment_id: string;
          receipt_number: string | null;
          student_id: string;
          amount_paid: number;
          payment_date: string | null;
          reversed_at: string;
          reversal_reason: string | null;
        }[]
      ).map((r) => ({
        payment_id: r.payment_id,
        receipt_number: r.receipt_number,
        student_name: nameMap.get(r.student_id) ?? "—",
        amount_paid: r.amount_paid,
        payment_date: r.payment_date,
        reversed_at: r.reversed_at,
        reversal_reason: r.reversal_reason,
      }));
    },
    enabled: !!schoolId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(t);
    }
  }, [message]);

  async function handleReversePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!reversalPaymentId.trim() || !reversalReason.trim()) {
      setMessage({ type: "err", text: "Select a payment and enter a valid reversal reason." });
      return;
    }
    if (!schoolId || !userId) return;
    setReversing(true);
    setMessage(null);
    try {
      const { error } = await supabase
        .from("student_payments")
        .update({ reversed_at: new Date().toISOString(), reversal_reason: reversalReason.trim() })
        .eq("payment_id", reversalPaymentId)
        .eq("school_id", schoolId);
      if (error) throw error;
      setMessage({ type: "ok", text: "Payment successfully reversed. Learner balance has been restored." });
      setReversalPaymentId("");
      setReversalReason("");
      queryClient.invalidateQueries({ queryKey: ["accountant"] });
    } catch (err: unknown) {
      setMessage({ type: "err", text: (err as Error).message || "Reversal operation failed." });
    } finally {
      setReversing(false);
    }
  }

  const totalReversedSum = useMemo(() => {
    return reversals.reduce((s, r) => s + Number(r.amount_paid || 0), 0);
  }, [reversals]);

  const filteredReversals = useMemo(() => {
    if (!q.trim()) return reversals;
    const s = q.toLowerCase();
    return reversals.filter(
      (r) =>
        r.student_name.toLowerCase().includes(s) ||
        (r.receipt_number?.toLowerCase().includes(s)) ||
        (r.reversal_reason?.toLowerCase().includes(s))
    );
  }, [reversals, q]);

  const { sortKey, sortDir, sorted, toggleSort } = useSort(
    filteredReversals as unknown as Record<string, unknown>[],
    "reversed_at",
    "desc"
  );

  function doExportPdf() {
    exportToPdf({
      title: "Adjustments — Reversal History",
      subtitle: `As of ${todayIso}`,
      schoolName,
      columns: [
        { header: "Reversed on", key: "reversed_at", width: 28, format: (v) => String(v ?? "").slice(0, 10) },
        { header: "Receipt #", key: "receipt_number", width: 22 },
        { header: "Student", key: "student_name", width: 36 },
        { header: "Amount (UGX)", key: "amount_paid", width: 22, align: "right", format: (v) => fmt(Number(v || 0)) },
        { header: "Payment date", key: "payment_date", width: 22 },
        { header: "Reason", key: "reversal_reason", width: 50 },
      ],
      rows: sorted as unknown as Record<string, unknown>[],
      filename: `reversal-history-${todayIso}`,
    });
  }

  function doExportExcel() {
    exportToExcel({
      title: "Adjustments — Reversal History",
      subtitle: `As of ${todayIso}`,
      schoolName,
      columns: [
        { header: "Reversed on", key: "reversed_at", width: 22, format: (v) => String(v ?? "").slice(0, 10) },
        { header: "Receipt #", key: "receipt_number", width: 18 },
        { header: "Student", key: "student_name", width: 28 },
        { header: "Amount (UGX)", key: "amount_paid", width: 18, align: "right", format: (v) => fmt(Number(v || 0)) },
        { header: "Payment date", key: "payment_date", width: 16 },
        { header: "Reason", key: "reversal_reason", width: 40 },
      ],
      rows: sorted as unknown as Record<string, unknown>[],
      filename: `reversal-history-${todayIso}`,
    });
  }

  return (
    <div className="w-full space-y-6 pb-12" style={{ fontFamily: INTER }}>
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="text-[10.5px] font-bold uppercase tracking-[0.2em]"
              style={{ color: t.mint, fontFamily: SORA }}
            >
              FINANCE & AUDIT
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: t.glowA, color: t.mint, border: `1px solid ${t.mintRing}` }}
            >
              NON-DESTRUCTIVE LEDGER
            </span>
          </div>
          <h1
            className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl"
            style={{ color: t.textHi, fontFamily: SORA }}
          >
            Adjustments &amp; Payment Reversals
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm" style={{ color: t.textMid }}>
            Audit-backed financial corrections, receipt cancellations, and balance restoration.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={doExportPdf}
            className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all"
            style={{
              background: t.panel,
              border: `1px solid ${t.stroke}`,
              color: t.textHi,
            }}
          >
            <Download className="h-3.5 w-3.5" style={{ color: t.mint }} />
            PDF
          </button>

          <button
            type="button"
            onClick={doExportExcel}
            className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all"
            style={{
              background: t.panel,
              border: `1px solid ${t.stroke}`,
              color: t.blue,
            }}
          >
            <FileText className="h-3.5 w-3.5" style={{ color: t.blue }} />
            Excel
          </button>
        </div>
      </div>

      {/* 4-Card POS Summary Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Card 1: Active Payments Available */}
        <div
          className="relative overflow-hidden rounded-2xl p-4 transition-all"
          style={{
            background: cardGrad(t, "emerald"),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Active Payments
            </span>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ background: t.mintDim, color: t.mint }}
            >
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold" style={{ color: t.textHi, fontFamily: SORA }}>
            {activePayments.length} Active
          </div>
          <p className="mt-0.5 text-[11px]" style={{ color: t.textLow }}>
            Eligible for reversal
          </p>
        </div>

        {/* Card 2: Total Reversals Logged */}
        <div
          className="relative overflow-hidden rounded-2xl p-4 transition-all"
          style={{
            background: cardGrad(t, "purple"),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Total Reversals
            </span>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ background: t.deepDim, color: t.deep }}
            >
              <RotateCcw className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold" style={{ color: t.textHi, fontFamily: SORA }}>
            {reversals.length} Records
          </div>
          <p className="mt-0.5 text-[11px]" style={{ color: t.textLow }}>
            Historical corrections logged
          </p>
        </div>

        {/* Card 3: Total Reversal Value */}
        <div
          className="relative overflow-hidden rounded-2xl p-4 transition-all"
          style={{
            background: cardGrad(t, "amber"),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Reversed Outflow
            </span>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ background: t.goldDim, color: t.gold }}
            >
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold tabular-nums truncate" style={{ color: t.gold, fontFamily: SORA }}>
            UGX {fmt(totalReversedSum)}
          </div>
          <p className="mt-0.5 text-[11px]" style={{ color: t.textLow }}>
            Restored to student balances
          </p>
        </div>

        {/* Card 4: Audit Integrity */}
        <div
          className="relative overflow-hidden rounded-2xl p-4 transition-all"
          style={{
            background: cardGrad(t, "blue"),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Audit Protection
            </span>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ background: t.blueDim, color: t.blue }}
            >
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold" style={{ color: t.blue, fontFamily: SORA }}>
            100% Retained
          </div>
          <p className="mt-0.5 text-[11px]" style={{ color: t.textLow }}>
            Immutable audit timestamped
          </p>
        </div>
      </div>

      {message && (
        <div
          className="flex items-center gap-2 rounded-xl p-3 text-xs font-medium animate-fadeIn"
          style={{
            background: message.type === "ok" ? t.mintDim : t.redDim,
            border: `1px solid ${message.type === "ok" ? t.mintRing : t.red}`,
            color: message.type === "ok" ? t.mint : t.red,
          }}
        >
          {message.type === "ok" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Reverse Payment Action Form */}
      <section
        className="overflow-hidden rounded-2xl"
        style={{
          background: t.panel,
          border: `1px solid ${t.stroke}`,
        }}
      >
        <div
          className="flex items-center gap-2 border-b p-4 sm:px-6"
          style={{ borderColor: t.divider }}
        >
          <div
            className="flex h-6 w-6 items-center justify-center rounded-lg"
            style={{ background: t.goldDim, color: t.gold }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </div>
          <h2 className="text-sm font-bold" style={{ color: t.textHi, fontFamily: SORA }}>
            Initiate Payment Reversal
          </h2>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          <p className="text-xs max-w-2xl" style={{ color: t.textMid }}>
            The original payment record is safely archived with an immutable timestamp and mandatory audit reason. The student's invoice balance is automatically recalculated and restored.
          </p>

          <form onSubmit={handleReversePayment} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: t.textLow }}>
                Select Active Payment to Reverse
              </label>
              <select
                value={reversalPaymentId}
                onChange={(e) => setReversalPaymentId(e.target.value)}
                className="w-full rounded-xl px-3.5 py-2.5 text-xs font-medium transition-colors focus:outline-none"
                style={{
                  background: t.fieldBg,
                  border: `1px solid ${t.stroke}`,
                  color: t.textHi,
                }}
                required
              >
                <option value="">-- Choose payment record --</option>
                {activePayments.map((p) => (
                  <option key={p.payment_id} value={p.payment_id}>
                    {p.receipt_number ?? p.payment_id.slice(0, 8)} — {p.student_name} — UGX {fmt(Number(p.amount_paid))} — {p.payment_date ?? "—"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: t.textLow }}>
                Audit Justification / Reason (Mandatory)
              </label>
              <textarea
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="e.g. Duplicate receipt issued; incorrect bank transfer attributed; payment posted to wrong student profile…"
                className="w-full rounded-xl px-3.5 py-2.5 text-xs font-medium min-h-[85px] transition-colors focus:outline-none"
                style={{
                  background: t.fieldBg,
                  border: `1px solid ${t.stroke}`,
                  color: t.textHi,
                }}
                required
              />
            </div>

            <button
              type="submit"
              disabled={reversing || !reversalPaymentId}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition-all hover:scale-[1.01] disabled:opacity-40"
              style={{
                background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
                color: t.ctaText,
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {reversing ? "Processing Reversal…" : "Authorize Reversal"}
            </button>
          </form>
        </div>
      </section>

      {/* Feature Expansion Previews */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { icon: Percent, title: "Apply Discount", desc: "Reduce tuition obligation on an invoice with approval authorization." },
          { icon: ArrowRightLeft, title: "Reallocate Payment", desc: "Transfer an existing payment voucher to an alternate invoice or term." },
          { icon: FileSignature, title: "Credit Note", desc: "Issue formalized credit documentation for student fee overpayments." },
        ].map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="overflow-hidden rounded-2xl p-4 transition-all"
            style={{
              background: t.panel,
              border: `1px solid ${t.stroke}`,
              opacity: 0.85,
            }}
          >
            <div className="flex items-center justify-between">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ background: t.fieldBg, color: t.textLow }}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ background: t.fieldBg, color: t.textLow }}
              >
                Roadmap
              </span>
            </div>
            <h3 className="mt-2 text-xs font-bold" style={{ color: t.textHi, fontFamily: SORA }}>
              {title}
            </h3>
            <p className="mt-1 text-[11px]" style={{ color: t.textMid }}>
              {desc}
            </p>
          </div>
        ))}
      </div>

      {/* Reversal Audit History Table */}
      <section
        className="overflow-hidden rounded-2xl"
        style={{
          background: t.panel,
          border: `1px solid ${t.stroke}`,
        }}
      >
        <div
          className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:px-6"
          style={{ borderColor: t.divider }}
        >
          <div>
            <h2 className="text-sm font-bold" style={{ color: t.textHi, fontFamily: SORA }}>
              Reversal History &amp; Audit Trail
            </h2>
            <p className="text-xs" style={{ color: t.textMid }}>
              Full log of all historical payment rollbacks and adjustments.
            </p>
          </div>
        </div>

        {/* Search */}
        <div
          className="border-b p-4"
          style={{ borderColor: t.divider, background: t.fieldBg }}
        >
          <div className="relative max-w-sm">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: t.textLow }}
            />
            <input
              type="text"
              placeholder="Search student, receipt number, reason…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-xl pl-10 pr-4 py-2 text-xs font-medium focus:outline-none"
              style={{
                background: t.panel,
                border: `1px solid ${t.stroke}`,
                color: t.textHi,
              }}
            />
          </div>
        </div>

        {reversalsLoading ? (
          <div className="p-8 text-center text-xs" style={{ color: t.textMid }}>
            Loading audit records…
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-0">
            <PosEmptyState
              icon={<RotateCcw size={28} />}
              title={reversals.length === 0 ? "No Reversals Recorded" : "No Matching Reversals"}
              description={
                reversals.length === 0
                  ? "All recorded payments in the system remain active. No manual reversals or cancellations have been processed."
                  : "No reversal audit entries match your current search query. Try searching by another student name or receipt number."
              }
              accentColor="purple"
              minHeight={240}
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: t.divider, background: t.fieldBg }}>
                    <Th label="Reversed On" sortKey="reversed_at" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: t.textLow }}>
                      Receipt #
                    </th>
                    <Th label="Student" sortKey="student_name" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <Th label="Amount (UGX)" sortKey="amount_paid" currentKey={sortKey} dir={sortDir} onSort={toggleSort} right />
                    <Th label="Original Date" sortKey="payment_date" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
                      Audit Justification
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: t.divider }}>
                  {sorted.map((row) => {
                    const r = row as unknown as ReversalRecord;
                    return (
                      <tr
                        key={r.payment_id}
                        className="transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                      >
                        <td className="px-4 py-3 tabular-nums whitespace-nowrap" style={{ color: t.textMid }}>
                          {r.reversed_at ? r.reversed_at.slice(0, 10) : "—"}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] whitespace-nowrap" style={{ color: t.textMid }}>
                          {r.receipt_number ?? "—"}
                        </td>
                        <td className="px-4 py-3 font-semibold whitespace-nowrap" style={{ color: t.textHi }}>
                          {r.student_name}
                        </td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums whitespace-nowrap" style={{ color: t.red }}>
                          ({fmt(Number(r.amount_paid || 0))})
                        </td>
                        <td className="px-4 py-3 tabular-nums whitespace-nowrap" style={{ color: t.textMid }}>
                          {r.payment_date ?? "—"}
                        </td>
                        <td className="px-4 py-3 max-w-[320px]" style={{ color: t.textMid }}>
                          <span className="line-clamp-2 text-xs" title={r.reversal_reason ?? ""}>
                            {r.reversal_reason || "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div
              className="flex flex-wrap items-center justify-between border-t p-4"
              style={{ borderColor: t.divider, background: t.fieldBg }}
            >
              <p className="text-xs" style={{ color: t.textMid }}>
                {sorted.length} reversal record{sorted.length !== 1 ? "s" : ""} logged
              </p>
              <p className="text-xs font-bold tabular-nums" style={{ color: t.red, fontFamily: SORA }}>
                Total Reversed: ({fmt(sorted.reduce((s, r) => s + Number((r as unknown as ReversalRecord).amount_paid || 0), 0))}) UGX
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
