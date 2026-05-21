import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Percent, ArrowRightLeft, FileSignature, Search, Download, FileText } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { useSort, Th } from "../../lib/useSort";
import { exportToPdf, exportToExcel } from "../../lib/exportUtils";
import { schoolCalendarTodayIso } from "../../lib/schoolCalendarDate";
import { useSchoolName } from "../../lib/useSchoolName";

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

function fmt(n: number) { return n.toLocaleString("en-US", { maximumFractionDigits: 0 }); }

export default function AdjustmentsPage() {
  const queryClient = useQueryClient();
  const schoolId = useAuthStore((s) => s.schoolId);
  const userId = useAuthStore((s) => s.user?.id);
  const schoolName = useSchoolName();
  const todayIso = schoolCalendarTodayIso();

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
      return (data as { payment_id: string; receipt_number: string | null; student_id: string; amount_paid: number; payment_date: string | null }[]).map((r) => ({
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
      return (data as { payment_id: string; receipt_number: string | null; student_id: string; amount_paid: number; payment_date: string | null; reversed_at: string; reversal_reason: string | null }[]).map((r) => ({
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
      setMessage({ type: "err", text: "Select a payment and enter a reason." });
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
      setMessage({ type: "ok", text: "Payment reversed. Student balance has been restored." });
      setReversalPaymentId("");
      setReversalReason("");
      queryClient.invalidateQueries({ queryKey: ["accountant"] });
    } catch (err: unknown) {
      setMessage({ type: "err", text: (err as Error).message || "Reversal failed." });
    } finally {
      setReversing(false);
    }
  }

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
    <div className="ac-page-content mx-auto max-w-7xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="ac-text-primary text-2xl font-semibold">Adjustments</h1>
          <p className="ac-text-secondary mt-0.5 text-sm">Financial corrections with full audit trail. No destructive edits.</p>
        </div>
      </div>

      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${message.type === "ok" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-red-500/15 text-red-700 dark:text-red-300"}`}>
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        {/* Reverse payment */}
        <section className="ac-glass-card overflow-hidden rounded-[18px]">
          <div className="flex items-center gap-2 border-b border-[var(--ac-border)] px-4 py-3">
            <RotateCcw className="h-4 w-4 text-amber-400" />
            <h2 className="ac-text-primary text-sm font-semibold">Reverse payment</h2>
          </div>
          <div className="p-4">
            <p className="ac-text-muted text-xs mb-4">
              The original payment record is kept with a <code className="text-xs bg-slate-500/10 rounded px-1">reversed_at</code> timestamp and reason. The student's balance is automatically restored.
            </p>
            <form onSubmit={handleReversePayment} className="space-y-4 max-w-lg">
              <div>
                <label className="ac-text-secondary block text-sm font-medium mb-1">Payment to reverse</label>
                <select value={reversalPaymentId} onChange={(e) => setReversalPaymentId(e.target.value)} className="ac-input w-full" required>
                  <option value="">Select payment…</option>
                  {activePayments.map((p) => (
                    <option key={p.payment_id} value={p.payment_id}>
                      {p.receipt_number ?? p.payment_id.slice(0, 8)} — {p.student_name} — {fmt(Number(p.amount_paid))} UGX — {p.payment_date ?? "—"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="ac-text-secondary block text-sm font-medium mb-1">Reason (required for audit)</label>
                <textarea
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="e.g. Duplicate entry; wrong student"
                  className="ac-input w-full min-h-[80px]"
                  required
                />
              </div>
              <button type="submit" disabled={reversing} className="ac-glass-btn rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
                {reversing ? "Reversing…" : "Reverse payment"}
              </button>
            </form>
          </div>
        </section>

        {/* Coming soon placeholders */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: Percent, title: "Apply discount", desc: "Reduce amount due on an invoice with an audit-logged discount." },
            { icon: ArrowRightLeft, title: "Reallocate payment", desc: "Move a recorded payment to another invoice or term." },
            { icon: FileSignature, title: "Credit note", desc: "Issue a credit note for overpayment or refund." },
          ].map(({ icon: Icon, title, desc }) => (
            <section key={title} className="ac-glass-card overflow-hidden rounded-[18px] opacity-70">
              <div className="flex items-center gap-2 border-b border-[var(--ac-border)] px-4 py-3">
                <Icon className="h-4 w-4 ac-text-muted" />
                <h2 className="ac-text-primary text-sm font-semibold">{title}</h2>
                <span className="ml-auto text-[10px] font-medium ac-text-muted bg-slate-500/10 rounded px-1.5 py-0.5">Coming soon</span>
              </div>
              <div className="p-4 ac-text-muted text-sm">{desc}</div>
            </section>
          ))}
        </div>

        {/* Reversal history */}
        <section className="ac-glass-card overflow-hidden rounded-[18px]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--ac-border)] px-4 py-3">
            <h2 className="ac-text-primary text-sm font-semibold">Reversal history</h2>
            <div className="flex items-center gap-2">
              <button type="button" onClick={doExportPdf} className="ac-glass-btn inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold">
                <Download className="h-3.5 w-3.5" />PDF
              </button>
              <button type="button" onClick={doExportExcel} className="ac-glass-btn inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold">
                <FileText className="h-3.5 w-3.5" />Excel
              </button>
            </div>
          </div>

          <div className="border-b border-[var(--ac-border)] px-4 py-3">
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ac-text-muted" />
              <input
                type="text"
                placeholder="Search student, receipt, reason…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="ac-input w-full pl-9"
              />
            </div>
          </div>

          {reversalsLoading ? (
            <div className="ac-text-muted p-8 text-center text-sm">Loading…</div>
          ) : sorted.length === 0 ? (
            <div className="ac-text-muted p-8 text-center text-sm">
              {reversals.length === 0 ? "No reversals recorded yet." : "No reversals match your search."}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="ac-table-header">
                      <Th label="Reversed on" sortKey="reversed_at" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <th className="px-4 py-3 text-left font-semibold ac-text-muted whitespace-nowrap">Receipt #</th>
                      <Th label="Student" sortKey="student_name" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <Th label="Amount (UGX)" sortKey="amount_paid" currentKey={sortKey} dir={sortDir} onSort={toggleSort} right />
                      <Th label="Payment date" sortKey="payment_date" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <th className="px-4 py-3 text-left font-semibold ac-text-muted">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y ac-table-divider">
                    {sorted.map((row) => {
                      const r = row as unknown as ReversalRecord;
                      return (
                        <tr key={r.payment_id} className="ac-table-row">
                          <td className="px-4 py-3 tabular-nums ac-text-secondary whitespace-nowrap">
                            {r.reversed_at ? r.reversed_at.slice(0, 10) : "—"}
                          </td>
                          <td className="px-4 py-3 font-mono ac-text-secondary text-xs whitespace-nowrap">{r.receipt_number ?? "—"}</td>
                          <td className="ac-cell-primary px-4 py-3 font-medium whitespace-nowrap">{r.student_name}</td>
                          <td className="px-4 py-3 text-right tabular-nums font-semibold text-red-500 whitespace-nowrap">
                            ({fmt(Number(r.amount_paid || 0))})
                          </td>
                          <td className="px-4 py-3 tabular-nums ac-text-secondary whitespace-nowrap">{r.payment_date ?? "—"}</td>
                          <td className="px-4 py-3 ac-text-secondary max-w-[300px]">
                            <span className="line-clamp-2 text-xs" title={r.reversal_reason ?? ""}>{r.reversal_reason || "—"}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t ac-table-divider px-4 py-3">
                <p className="ac-text-muted text-xs">{sorted.length} reversal{sorted.length !== 1 ? "s" : ""}</p>
                <p className="text-sm font-semibold tabular-nums text-red-500">
                  Total reversed: ({fmt(sorted.reduce((s, r) => s + Number((r as unknown as ReversalRecord).amount_paid || 0), 0))}) UGX
                </p>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
