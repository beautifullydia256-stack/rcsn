import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";

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

  useEffect(() => {
    if (!schoolId) return;
    Promise.all([
      supabase.from("students").select("student_id, name, current_class").eq("school_id", schoolId).eq("status", "active").order("name"),
      supabase.from("school_terms").select("id, term, year").eq("school_id", schoolId).order("year", { ascending: false }).order("term", { ascending: false }),
    ]).then(([s, t]) => {
      setStudents(s.data || []);
      const termList = (t.data || []) as { id: string; term: number; year: number }[];
      setTerms(termList);
      if (termList.length && !selectedTerm) setSelectedTerm(termList[0].id);
    });
  }, [schoolId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId || !userId || !selectedStudent || !selectedTerm || !amount || Number(amount) <= 0) {
      setMessage("Please fill student, term, and amount.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const amt = Number(amount);
      const payload: Record<string, unknown> = {
        school_id: schoolId,
        student_id: selectedStudent,
        term_id: selectedTerm,
        amount_paid: amt,
        payment_method: method,
        payment_date: new Date().toISOString().slice(0, 10),
        recorded_by: userId,
        notes: notes || null,
      };
      const { data: receiptNum } = await supabase.rpc("get_next_receipt_number", { p_school_id: schoolId }).catch(() => ({ data: null }));
      const receipt_number = receiptNum ?? "REC-" + new Date().getFullYear() + "-" + Date.now().toString().slice(-6);
      payload.receipt_number = receipt_number;
      let { error } = await supabase.from("student_payments").insert(payload);
      if (error && (error.message?.includes("receipt_number") || error.message?.includes("column"))) {
        delete payload.receipt_number;
        const res = await supabase.from("student_payments").insert(payload);
        error = res.error;
        if (!error) setMessage("Payment recorded. (Run DB migration for receipt numbers.)");
      } else if (!error) {
        setMessage("Payment recorded. Receipt: " + receipt_number);
      }
      if (error) throw error;
      setAmount("");
      setNotes("");
    } catch (err: unknown) {
      setMessage((err as Error).message || "Failed to record payment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Record Payment</h1>
        <button type="button" onClick={() => navigate("/dashboard/accountant")} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Back to Dashboard</button>
      </div>
      <div className="max-w-lg bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
            <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" required>
              <option value="">Select student</option>
              {students.map((s) => <option key={s.student_id} value={s.student_id}>{s.name} ({s.current_class})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
            <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" required>
              <option value="">Select term</option>
              {terms.map((t) => <option key={t.id} value={t.id}>Term {t.term}, {t.year}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
              <option value="cash">Cash</option><option value="bank">Bank</option><option value="mobile_money">Mobile Money</option><option value="cheque">Cheque</option><option value="pos">POS / Card</option><option value="online">Online</option><option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          </div>
          {message && <p className={"text-sm " + (message.startsWith("Payment") ? "text-teal-600" : "text-red-600")}>{message}</p>}
          <button type="submit" disabled={submitting} className="w-full rounded-xl bg-green-600 text-white py-2.5 text-sm font-medium hover:bg-green-700 disabled:opacity-50">{submitting ? "Recording…" : "Record payment"}</button>
        </form>
      </div>
    </div>
  );
}
