/**
 * POS-style Record Payment modal. Renders on top of current view; no route change.
 * Opened from dashboard (or layout); Esc and overlay close it.
 */
import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { resolveCurrentSchoolTerm } from "../../lib/adminFinanceTerm";
import { useAuthStore } from "../../store/authStore";
import { PaymentReceipt, type PaymentReceiptData } from "./PaymentReceipt";
import { Receipt, X } from "lucide-react";

type OutstandingBalanceRow = { term_id: string; term: number; year: number; balance: number };
type CurrentTermRow = { id: string; term: number; year: number; start_date?: string; end_date?: string };

/** Sort outstanding balances oldest term first so payment is applied to oldest debt first */
function sortOutstandingOldestFirst(
  rows: OutstandingBalanceRow[]
): OutstandingBalanceRow[] {
  return [...rows].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.term - b.term;
  });
}

function formatReceiptTime(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()];
  const year = d.getFullYear();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${day}-${mon}-${year} ${h}:${m}:${s}`;
}

export type RecordPaymentModalProps = {
  open: boolean;
  onClose: () => void;
  initialStudentId?: string;
};

export default function RecordPaymentModal({ open, onClose, initialStudentId }: RecordPaymentModalProps) {
  const queryClient = useQueryClient();
  const schoolId = useAuthStore((s) => s.schoolId);
  const userId = useAuthStore((s) => s.user?.id);
  const userEmail = useAuthStore((s) => s.user?.email ?? "");
  const userName = useAuthStore((s) => (s.user?.user_metadata as { full_name?: string })?.full_name ?? "");
  const [students, setStudents] = useState<{ student_id: string; name: string; current_class: string; status?: string }[]>([]);
  const [terms, setTerms] = useState<{ id: string; term: number; year: number }[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [outstandingBalances, setOutstandingBalances] = useState<OutstandingBalanceRow[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [receiptData, setReceiptData] = useState<PaymentReceiptData | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentSearchFocused, setStudentSearchFocused] = useState(false);
  const [currentTerm, setCurrentTerm] = useState<CurrentTermRow | null>(null);
  const [hasCurrentTermInvoice, setHasCurrentTermInvoice] = useState<boolean | null>(null);
  const [currentTermFee, setCurrentTermFee] = useState<number | null>(null);
  const [activatingInvoice, setActivatingInvoice] = useState(false);
  const [schoolName, setSchoolName] = useState("");

  useEffect(() => {
    if (open && initialStudentId) setSelectedStudent(initialStudentId);
  }, [open, initialStudentId]);

  useEffect(() => {
    if (!open || !schoolId) return;
    void (async () => {
      const [sRes, tRes, balRes, schoolRes] = await Promise.all([
        supabase.from("students").select("student_id, name, current_class, status").eq("school_id", schoolId).eq("status", "active").order("name"),
        supabase.from("school_terms").select("id, term, year, start_date, end_date").eq("school_id", schoolId).order("year", { ascending: false }).order("term", { ascending: false }),
        supabase.from("student_balances").select("student_id").eq("school_id", schoolId).gt("balance", 0),
        supabase.from("schools").select("name").eq("school_id", schoolId).single(),
      ]);
      const school = (schoolRes.data as { name?: string } | null) ?? null;
      setSchoolName(school?.name ?? "");
      const active = (sRes.data || []) as { student_id: string; name: string; current_class: string; status?: string }[];
      const termList = (tRes.data || []) as { id: string; term: number; year: number }[];
      setTerms(termList);
      const cur = await resolveCurrentSchoolTerm(supabase, schoolId);
      setCurrentTerm(
        cur
          ? {
              id: cur.id,
              term: cur.term ?? 1,
              year: cur.year ?? new Date().getFullYear(),
              start_date: cur.start_date ?? undefined,
              end_date: cur.end_date ?? undefined,
            }
          : null
      );
      const debtorIds = [...new Set((balRes.data || []).map((b: { student_id: string }) => b.student_id))].filter(
        (id) => !active.some((s) => s.student_id === id)
      );
      if (debtorIds.length > 0) {
        const { data: debtors } = await supabase
          .from("students")
          .select("student_id, name, current_class, status")
          .eq("school_id", schoolId)
          .in("student_id", debtorIds);
        setStudents([...active, ...(debtors || [])].sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        setStudents(active);
      }
    })();
  }, [open, schoolId]);

  useEffect(() => {
    if (!schoolId || !selectedStudent) {
      setOutstandingBalances([]);
      setHasCurrentTermInvoice(null);
      setCurrentTermFee(null);
      return;
    }
    setBalancesLoading(true);
    setOutstandingBalances([]);
    setHasCurrentTermInvoice(null);
    setCurrentTermFee(null);
    void (async () => {
      try {
        const [balRes, invRes, feeRes] = await Promise.all([
          supabase
            .from("student_balances")
            .select("term_id, term, year, balance")
            .eq("school_id", schoolId)
            .eq("student_id", selectedStudent)
            .gt("balance", 0)
            .order("year", { ascending: true })
            .order("term", { ascending: true }),
          currentTerm
            ? supabase
                .from("student_invoices")
                .select("invoice_id")
                .eq("school_id", schoolId)
                .eq("student_id", selectedStudent)
                .eq("term_id", currentTerm.id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          (() => {
            const studentRow = students.find((s) => s.student_id === selectedStudent);
            const currentClass = studentRow?.current_class;
            if (!currentClass) return Promise.resolve({ data: [] });
            return supabase
              .from("school_fee_structure")
              .select("tuition_amount")
              .eq("school_id", schoolId)
              .eq("class_name", currentClass)
              .maybeSingle();
          })(),
        ]);
        const raw = ((balRes.data || []) as { term_id: string; term: number; year: number; balance: number }[]).map((r) => ({
          term_id: r.term_id,
          term: r.term,
          year: r.year,
          balance: Number(r.balance),
        }));
        setOutstandingBalances(sortOutstandingOldestFirst(raw));
        if (currentTerm) {
          setHasCurrentTermInvoice(!!invRes.data);
          const feeRow = feeRes.data as { tuition_amount?: number } | null;
          setCurrentTermFee(feeRow?.tuition_amount != null ? Number(feeRow.tuition_amount) : null);
        }
      } finally {
        setBalancesLoading(false);
      }
    })();
  }, [schoolId, selectedStudent, currentTerm, students]);

  const totalDue = outstandingBalances.reduce((sum, b) => sum + b.balance, 0);
  const canRecordPayment = totalDue > 0 && Number(amount) > 0;
  const selectedStudentRow = students.find((s) => s.student_id === selectedStudent);

  const isGraduated = selectedStudentRow?.status === "graduated";
  const showActivateCurrentTerm =
    !!currentTerm && hasCurrentTermInvoice === false && !!selectedStudent && !isGraduated;

  async function handleActivateCurrentTermInvoice() {
    if (!schoolId || !userId || !selectedStudent || !currentTerm || !selectedStudentRow) return;
    const feeAmount = currentTermFee ?? 0;
    if (!feeAmount || feeAmount <= 0) {
      setMessage("No fee set for this class. Add it in Invoices & Billing or Admin → Settings → Financial.");
      return;
    }
    setActivatingInvoice(true);
    setMessage("");
    try {
      let invNum: string | null = null;
      try {
        const res = await supabase.rpc("get_next_invoice_number", { p_school_id: schoolId });
        invNum = res.data ?? null;
      } catch {
        invNum = "INV-" + new Date().getFullYear() + "-" + Date.now().toString().slice(-6);
      }
      const { error: invErr } = await supabase.from("student_invoices").upsert(
        {
          school_id: schoolId,
          student_id: selectedStudent,
          term_id: currentTerm.id,
          total_amount: feeAmount,
          status: "issued",
          invoice_number: invNum,
          created_by: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "school_id,student_id,term_id" }
      );
      if (invErr) throw invErr;
      const { data: invVerify } = await supabase
        .from("student_invoices")
        .select("invoice_id, invoice_number")
        .eq("school_id", schoolId)
        .eq("student_id", selectedStudent)
        .eq("term_id", currentTerm.id)
        .maybeSingle();
      if (!invVerify) throw new Error("Invoice was not created. Please try again.");
      const { data: existing } = await supabase
        .from("student_balances")
        .select("total_paid")
        .eq("student_id", selectedStudent)
        .eq("term_id", currentTerm.id)
        .maybeSingle();
      const totalPaid = (existing as { total_paid?: number } | null)?.total_paid ?? 0;
      const { error: balErr } = await supabase.from("student_balances").upsert(
        {
          student_id: selectedStudent,
          school_id: schoolId,
          term_id: currentTerm.id,
          year: currentTerm.year,
          term: currentTerm.term,
          total_fees: feeAmount,
          total_paid: Number(totalPaid),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,term_id" }
      );
      if (balErr) throw balErr;
      setHasCurrentTermInvoice(true);
      setMessage("Current term invoice activated. Refreshing balances…");
      const { data } = await supabase
        .from("student_balances")
        .select("term_id, term, year, balance")
        .eq("school_id", schoolId)
        .eq("student_id", selectedStudent)
        .gt("balance", 0);
      const raw = (data || []).map((r: { term_id: string; term: number; year: number; balance: number }) => ({
        term_id: r.term_id,
        term: r.term,
        year: r.year,
        balance: Number(r.balance),
      }));
      setOutstandingBalances(sortOutstandingOldestFirst(raw));
      setMessage("Current term invoice activated. Total due now includes Term " + currentTerm.term + ", " + currentTerm.year + ".");
      queryClient.invalidateQueries({ queryKey: ["accountant"] });
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string"
          ? (err as { message: string }).message
          : err instanceof Error
            ? err.message
            : "Failed to activate invoice.";
      setMessage(msg);
    } finally {
      setActivatingInvoice(false);
    }
  }

  const q = studentSearchQuery.trim().toLowerCase();
  const studentMatches =
    selectedStudent && !q
      ? []
      : students.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            (s.current_class && s.current_class.toLowerCase().includes(q))
        ).slice(0, 12);

  const handleClose = useCallback(() => {
    setReceiptData(null);
    setMessage("");
    setAmount("");
    setNotes("");
    setStudentSearchQuery("");
    setSelectedStudent("");
    setOutstandingBalances([]);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, handleClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId || !userId || !selectedStudent || !amount || Number(amount) <= 0) {
      setMessage("Please select a student and enter an amount.");
      return;
    }
    if (outstandingBalances.length === 0) {
      setMessage("This student has no outstanding balance.");
      return;
    }
    const amt = Number(amount);
    if (amt > totalDue) {
      setMessage("Amount cannot exceed total due (" + totalDue.toLocaleString() + ").");
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const sortedBalances = sortOutstandingOldestFirst(outstandingBalances);
      let remaining = amt;
      const allocations: { term_id: string; term: number; year: number; amount: number }[] = [];
      for (const row of sortedBalances) {
        if (remaining <= 0) break;
        const apply = Math.min(remaining, row.balance);
        if (apply <= 0) continue;
        allocations.push({ term_id: row.term_id, term: row.term, year: row.year, amount: apply });
        remaining -= apply;
      }
      if (allocations.length === 0) {
        setMessage("No amount to apply to outstanding balances.");
        setSubmitting(false);
        return;
      }

      let receiptNum: string | null = null;
      try {
        const res = await supabase.rpc("get_next_receipt_number", {
          p_school_id: schoolId,
          p_term_id: allocations[0].term_id,
        });
        receiptNum = res.data ?? null;
      } catch {
        receiptNum = null;
      }
      const year = new Date().getFullYear();
      const receiptNumberForPayments =
        receiptNum ?? "RCT-" + year + "-T1-" + Date.now().toString().slice(-4).padStart(4, "0");

      const termIds = allocations.map((a) => a.term_id);
      const { data: invoices } = await supabase
        .from("student_invoices")
        .select("term_id, invoice_id")
        .eq("school_id", schoolId)
        .eq("student_id", selectedStudent)
        .in("term_id", termIds)
        .in("status", ["issued", "partial", "paid"]);
      const invoiceByTerm = new Map<string, string>();
      for (const inv of invoices || []) {
        invoiceByTerm.set((inv as { term_id: string; invoice_id: string }).term_id, (inv as { term_id: string; invoice_id: string }).invoice_id);
      }

      const paymentDate = new Date().toISOString().slice(0, 10);
      for (const a of allocations) {
        const payload: Record<string, unknown> = {
          school_id: schoolId,
          student_id: selectedStudent,
          term_id: a.term_id,
          amount: a.amount,
          amount_paid: a.amount,
          payment_method: method,
          payment_date: paymentDate,
          recorded_by: userId,
          notes: notes || null,
          receipt_number: receiptNumberForPayments,
        };
        const invId = invoiceByTerm.get(a.term_id);
        if (invId) payload.invoice_id = invId;
        const { error } = await supabase.from("student_payments").insert(payload);
        if (error) throw error;
      }

      const totalRemaining = totalDue - amt;
      const allocationLines = allocations.map((a) => ({
        termLabel: `Term ${a.term}, ${a.year}`,
        amountApplied: a.amount,
      }));
      const studentRow = students.find((s) => s.student_id === selectedStudent);
      const now = new Date();
      const { data: userRow } = await supabase.from("users").select("name").eq("user_id", userId).single();
      const recordedByName = (userRow as { name?: string } | null)?.name?.trim() || userName || userEmail || "Staff";
      setReceiptData({
        receiptNumber: receiptNumberForPayments,
        schoolName: schoolName || undefined,
        studentName: studentRow?.name ?? "—",
        studentClass: studentRow?.current_class ?? "—",
        termLabel: allocationLines.length === 1 ? allocationLines[0].termLabel : "Multiple terms",
        amountPaid: amt,
        paymentMethod: method,
        transactionTime: formatReceiptTime(now),
        recordedBy: recordedByName,
        description: notes || undefined,
        allocations: allocationLines,
        totalRemainingBalance: totalRemaining,
      });
      setMessage("Payment recorded.");
      setAmount("");
      setNotes("");
      setStudentSearchQuery("");
      setSelectedStudent("");
      setOutstandingBalances([]);
      queryClient.invalidateQueries({ queryKey: ["accountant"] });
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string"
          ? (err as { message: string }).message
          : err instanceof Error
            ? err.message
            : "Failed to record payment.";
      setMessage(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

  if (!open) return null;

  const modalContent = (
    <>
      {receiptData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Payment receipt">
          <div className="relative">
            <PaymentReceipt data={receiptData} autoPrint />
            <button
              type="button"
              onClick={() => setReceiptData(null)}
              className="mt-4 w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Close — record next payment
            </button>
          </div>
        </div>
      )}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Record payment"
        onClick={handleClose}
      >
        <div
          className="relative max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="overflow-y-auto max-h-[90vh]">
            <div className="flex items-start gap-3 rounded-t-2xl bg-emerald-700 px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20">
                <Receipt className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-white">Record Payment</h2>
                <p className="mt-0.5 text-sm text-white/90">Record a student payment and allocate to outstanding balances.</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="shrink-0 rounded-lg p-1.5 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col">
              <div className="space-y-4 p-5">
                <div className="relative">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Student</label>
                  {selectedStudentRow ? (
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5">
                      <span className="flex-1 text-sm font-medium text-slate-800">
                        {selectedStudentRow.name} <span className="text-slate-500">({selectedStudentRow.current_class})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudent("");
                          setStudentSearchQuery("");
                        }}
                        className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        onFocus={() => setStudentSearchFocused(true)}
                        onBlur={() => setTimeout(() => setStudentSearchFocused(false), 150)}
                        placeholder="Search by name or class…"
                        className={inputClass}
                        autoComplete="off"
                      />
                      {studentSearchFocused && studentMatches.length > 0 && (
                        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                          {studentMatches.map((s) => (
                            <li key={s.student_id}>
                              <button
                                type="button"
                                className="w-full px-3 py-2.5 text-left text-sm text-slate-800 hover:bg-slate-100"
                                onClick={() => {
                                  setSelectedStudent(s.student_id);
                                  setStudentSearchQuery("");
                                  setStudentSearchFocused(false);
                                }}
                              >
                                {s.name} <span className="text-slate-500">({s.current_class})</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {studentSearchQuery.trim() && studentMatches.length === 0 && (
                        <p className="mt-1 text-sm text-slate-500">No students match. Try a different search.</p>
                      )}
                    </>
                  )}
                </div>
                {selectedStudent && (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-sm">
                      {balancesLoading ? (
                        <span className="text-slate-500">Loading balances…</span>
                      ) : outstandingBalances.length > 0 ? (
                        <>
                          <p className="font-medium text-slate-800">Outstanding balances (oldest first)</p>
                          <ul className="mt-1 list-inside list-disc text-slate-700">
                            {outstandingBalances.map((b) => (
                              <li key={b.term_id}>
                                Term {b.term}, {b.year}: {b.balance.toLocaleString()}
                              </li>
                            ))}
                          </ul>
                          <p className="mt-2 font-medium text-slate-800">Total due: {totalDue.toLocaleString()}</p>
                          <p className="mt-0.5 text-slate-600">Payments are applied to the oldest term first, then the next, and so on.</p>
                        </>
                      ) : (
                        <p className="text-slate-600">No outstanding balance for this student.</p>
                      )}
                    </div>
                    {showActivateCurrentTerm && currentTerm && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm">
                        <p className="font-medium text-slate-800">No invoice for current term (Term {currentTerm.term}, {currentTerm.year})</p>
                        <p className="mt-0.5 text-slate-600">
                          Activate the current term invoice so this student is expected in school for this term. The term fee will be added to their total due.
                          {currentTermFee != null && currentTermFee > 0 && (
                            <span className="mt-1 block font-medium text-slate-700">Fee for this term: {currentTermFee.toLocaleString()}</span>
                          )}
                        </p>
                        <button
                          type="button"
                          onClick={handleActivateCurrentTermInvoice}
                          disabled={activatingInvoice || (currentTermFee != null && currentTermFee <= 0)}
                          className="mt-2 rounded-lg border border-amber-600 bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                        >
                          {activatingInvoice ? "Activating…" : "Activate invoice for current term"}
                        </button>
                        {(currentTermFee == null || currentTermFee <= 0) && (
                          <p className="mt-1 text-xs text-amber-700">Set the fee for this class in Invoices & Billing or Settings.</p>
                        )}
                      </div>
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
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/50 px-5 py-4 rounded-b-2xl">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl border-2 border-emerald-600 bg-white px-4 py-2.5 text-sm font-medium text-emerald-600 shadow-sm hover:bg-emerald-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !canRecordPayment || balancesLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Receipt className="h-4 w-4" />
                  {submitting ? "Recording…" : "Record payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
