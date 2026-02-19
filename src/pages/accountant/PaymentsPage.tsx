import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";

type InvoiceRow = { invoice_id: string; total_amount: number; amount_paid: number; balance: number; status: string; invoice_number: string | null };

export default function PaymentsPage() {
  const navigate = useNavigate();
  const schoolId = useAuthStore((s) => s.schoolId);
  const userId = useAuthStore((s) => s.user?.id);
  const [students, setStudents] = useState<{ student_id: string; name: string; current_class: string }[]>([]);
  const [terms, setTerms] = useState<{ id: string; term: number; year: number }[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [invoice, setInvoice] = useState<InvoiceRow | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    void (async () => {
      const [sRes, tRes, balRes] = await Promise.all([
        supabase.from("students").select("student_id, name, current_class").eq("school_id", schoolId).eq("status", "active").order("name"),
        supabase.from("school_terms").select("id, term, year").eq("school_id", schoolId).order("year", { ascending: false }).order("term", { ascending: false }),
        supabase.from("student_balances").select("student_id").eq("school_id", schoolId).gt("balance", 0),
      ]);
      const active = (sRes.data || []) as { student_id: string; name: string; current_class: string }[];
      const termList = (tRes.data || []) as { id: string; term: number; year: number }[];
      setTerms(termList);
      if (termList.length && !selectedTerm) setSelectedTerm(termList[0].id);
      const debtorIds = [...new Set((balRes.data || []).map((b: { student_id: string }) => b.student_id))].filter(
        (id) => !active.some((s) => s.student_id === id)
      );
      if (debtorIds.length > 0) {
        const { data: debtors } = await supabase
          .from("students")
          .select("student_id, name, current_class")
          .eq("school_id", schoolId)
          .in("student_id", debtorIds);
        setStudents([...active, ...(debtors || [])].sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        setStudents(active);
      }
    })();
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId || !selectedStudent || !selectedTerm) {
      setInvoice(null);
      return;
    }
    setInvoiceLoading(true);
    setInvoice(null);
    void (async () => {
      try {
        const { data } = await supabase
          .from("student_invoices")
          .select("invoice_id, total_amount, amount_paid, balance, status, invoice_number")
          .eq("school_id", schoolId)
          .eq("student_id", selectedStudent)
          .eq("term_id", selectedTerm)
          .in("status", ["issued", "partial"])
          .maybeSingle();
        setInvoice((data as InvoiceRow | null) ?? null);
      } finally {
        setInvoiceLoading(false);
      }
    })();
  }, [schoolId, selectedStudent, selectedTerm]);

  const balanceValue = invoice ? Number(invoice.balance ?? invoice.total_amount - invoice.amount_paid) : 0;
  const canRecordPayment = invoice && balanceValue > 0;
  const balanceDisplay = balanceValue;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId || !userId || !selectedStudent || !selectedTerm || !amount || Number(amount) <= 0) {
      setMessage("Please fill student, term, and amount.");
      return;
    }
    if (!invoice || !canRecordPayment) {
      setMessage("No invoice for this student/term, or balance is zero. Generate an invoice first (Invoices & Billing).");
      return;
    }
    const amt = Number(amount);
    if (amt > balanceDisplay) {
      setMessage("Amount cannot exceed outstanding balance (" + balanceDisplay.toLocaleString() + ").");
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const payload: Record<string, unknown> = {
        school_id: schoolId,
        student_id: selectedStudent,
        term_id: selectedTerm,
        amount: amt,
        amount_paid: amt,
        payment_method: method,
        payment_date: new Date().toISOString().slice(0, 10),
        recorded_by: userId,
        notes: notes || null,
        invoice_id: invoice.invoice_id,
      };
      let receiptNum: string | null = null;
      try {
        const res = await supabase.rpc("get_next_receipt_number", { p_school_id: schoolId });
        receiptNum = res.data ?? null;
      } catch {
        receiptNum = null;
      }
      payload.receipt_number = receiptNum ?? "REC-" + new Date().getFullYear() + "-" + Date.now().toString().slice(-6);
      let { error } = await supabase.from("student_payments").insert(payload);
      if (error && (error.message?.includes("receipt_number") || error.message?.includes("column"))) {
        delete payload.receipt_number;
        const res = await supabase.from("student_payments").insert(payload);
        error = res.error;
        if (!error) setMessage("Payment recorded. (Run DB migration for receipt numbers.)");
      } else if (!error) {
        setMessage("Payment recorded. Receipt: " + (payload.receipt_number as string));
      }
      if (error) throw error;
      setAmount("");
      setNotes("");
      setInvoice(null);
      setInvoiceLoading(true);
      try {
        const { data } = await supabase
          .from("student_invoices")
          .select("invoice_id, total_amount, amount_paid, balance, status, invoice_number")
          .eq("school_id", schoolId)
          .eq("student_id", selectedStudent)
          .eq("term_id", selectedTerm)
          .in("status", ["issued", "partial"])
          .maybeSingle();
        setInvoice((data as InvoiceRow | null) ?? null);
      } finally {
        setInvoiceLoading(false);
      }
    } catch (err: unknown) {
      setMessage((err as Error).message || "Failed to record payment.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Record Payment</h1>
        <button
          type="button"
          onClick={() => navigate("/dashboard/accountant")}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Back to Dashboard
        </button>
      </div>
      <div className="max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Student</label>
            <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} className={inputClass} required>
              <option value="">Select student</option>
              {students.map((s) => (
                <option key={s.student_id} value={s.student_id}>
                  {s.name} ({s.current_class})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Term</label>
            <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} className={inputClass} required>
              <option value="">Select term</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  Term {t.term}, {t.year}
                </option>
              ))}
            </select>
          </div>
          {selectedStudent && selectedTerm && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-sm">
              {invoiceLoading ? (
                <span className="text-slate-500">Checking invoice…</span>
              ) : invoice ? (
                <>
                  <p className="font-medium text-slate-800">
                    Invoice {invoice.invoice_number ?? "—"} · Balance due: {balanceDisplay.toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-slate-600">
                    Total: {Number(invoice.total_amount).toLocaleString()} · Paid: {Number(invoice.amount_paid).toLocaleString()}
                  </p>
                  {balanceDisplay <= 0 && (
                    <p className="mt-1 text-amber-700">This invoice is fully paid. No payment needed.</p>
                  )}
                </>
              ) : (
                <p className="text-amber-700">
                  No invoice for this student/term. Generate an invoice first in <strong>Invoices & Billing</strong> before recording payment.
                </p>
              )}
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Amount</label>
            <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Payment method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="cheque">Cheque</option>
              <option value="pos">POS / Card</option>
              <option value="online">Online</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes (optional)</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
          </div>
          {message && (
            <p className={"text-sm " + (message.startsWith("Payment") ? "text-emerald-600" : "text-red-600")}>{message}</p>
          )}
          <button
            type="submit"
            disabled={submitting || !canRecordPayment || invoiceLoading}
            className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? "Recording…" : "Record payment"}
          </button>
        </form>
      </div>
    </div>
  );
}
