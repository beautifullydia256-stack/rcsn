import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { RotateCcw, Percent, ArrowRightLeft, FileSignature } from "lucide-react";

type PaymentOption = { payment_id: string; receipt_number: string | null; student_name: string; amount_paid: number; payment_date: string | null };

export default function AdjustmentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const schoolId = useAuthStore((s) => s.schoolId);
  const userId = useAuthStore((s) => s.user?.id);
  const [reversalPaymentId, setReversalPaymentId] = useState("");
  const [reversalReason, setReversalReason] = useState("");
  const [reversing, setReversing] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const { data: payments = [] } = useQuery({
    queryKey: ["accountant", "adjustments", "payments", schoolId],
    queryFn: async (): Promise<PaymentOption[]> => {
      if (!schoolId) return [];
      const { data } = await supabase
        .from("student_payments")
        .select("payment_id, receipt_number, student_id, amount_paid, payment_date")
        .eq("school_id", schoolId)
        .is("reversed_at", null)
        .order("payment_date", { ascending: false })
        .limit(100);
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
        .update({
          reversed_at: new Date().toISOString(),
          reversal_reason: reversalReason.trim(),
        })
        .eq("payment_id", reversalPaymentId)
        .eq("school_id", schoolId);
      if (error) throw error;
      setMessage({ type: "ok", text: "Payment reversed. Balance has been updated; receipt is no longer valid." });
      setReversalPaymentId("");
      setReversalReason("");
      queryClient.invalidateQueries({ queryKey: ["accountant"] });
    } catch (err: unknown) {
      setMessage({ type: "err", text: (err as Error).message || "Reversal failed." });
    } finally {
      setReversing(false);
    }
  }

  return (
    <div className="ac-page-content mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="ac-text-primary text-2xl font-semibold">Adjustments</h1>
        <button type="button" onClick={() => navigate("/dashboard/accountant")} className="ac-glass-btn-secondary rounded-xl px-4 py-2 text-sm font-medium">
          Back to Dashboard
        </button>
      </div>
      <p className="ac-text-secondary mb-6 text-sm">
        Financial corrections without deleting history. Every adjustment is logged for audit. No destructive edits.
      </p>

      {message && (
        <p className={`mb-4 text-sm ${message.type === "ok" ? "text-emerald-500" : "text-red-400"}`}>{message.text}</p>
      )}

      <div className="space-y-6">
        <section className="ac-glass-card rounded-[18px] overflow-hidden">
          <div className="border-b border-[var(--ac-border)] px-4 py-3 flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-amber-400" />
            <h2 className="ac-text-primary text-sm font-semibold">Reverse payment</h2>
          </div>
          <div className="p-4">
            <p className="ac-text-muted text-xs mb-4">
              Creates a reversal entry; the original payment record is kept with reversed_at and reason. Student balance is restored.
            </p>
            <form onSubmit={handleReversePayment} className="space-y-4 max-w-lg">
              <div>
                <label className="ac-text-secondary block text-sm font-medium mb-1">Payment to reverse</label>
                <select
                  value={reversalPaymentId}
                  onChange={(e) => setReversalPaymentId(e.target.value)}
                  className="ac-input w-full"
                  required
                >
                  <option value="">Select payment…</option>
                  {payments.map((p) => (
                    <option key={p.payment_id} value={p.payment_id}>
                      {p.receipt_number ?? p.payment_id} — {p.student_name} — {Number(p.amount_paid).toLocaleString()} — {p.payment_date ?? "—"}
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
              <button type="submit" disabled={reversing} className="ac-glass-btn rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50">
                {reversing ? "Reversing…" : "Reverse payment"}
              </button>
            </form>
          </div>
        </section>

        <section className="ac-glass-card rounded-[18px] overflow-hidden opacity-90">
          <div className="border-b border-[var(--ac-border)] px-4 py-3 flex items-center gap-2">
            <Percent className="h-5 w-5 text-slate-400" />
            <h2 className="ac-text-primary text-sm font-semibold">Apply discount (after billing)</h2>
          </div>
          <div className="p-4 ac-text-muted text-sm">
            Reduce amount due on an invoice with an audit-logged discount. Structure ready; implementation in next phase.
          </div>
        </section>

        <section className="ac-glass-card rounded-[18px] overflow-hidden opacity-90">
          <div className="border-b border-[var(--ac-border)] px-4 py-3 flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-slate-400" />
            <h2 className="ac-text-primary text-sm font-semibold">Reallocate payment</h2>
          </div>
          <div className="p-4 ac-text-muted text-sm">
            Move a recorded payment to another invoice/term. Audit trail: reference_original_id, reason, timestamp. Coming in next phase.
          </div>
        </section>

        <section className="ac-glass-card rounded-[18px] overflow-hidden opacity-90">
          <div className="border-b border-[var(--ac-border)] px-4 py-3 flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-slate-400" />
            <h2 className="ac-text-primary text-sm font-semibold">Credit note</h2>
          </div>
          <div className="p-4 ac-text-muted text-sm">
            Issue a credit note for overpayment or refund. Full handling with audit_type, reference_original_id, user_id, reason. Coming in next phase.
          </div>
        </section>
      </div>
    </div>
  );
}
