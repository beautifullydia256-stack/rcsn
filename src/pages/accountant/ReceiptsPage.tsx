import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";

type PaymentRow = {
  payment_id: string;
  student_id: string;
  term_id: string;
  amount_paid: number;
  receipt_number: string | null;
  payment_date: string | null;
  payment_method: string | null;
  reversed_at: string | null;
};

type StudentMap = Record<string, { name: string; current_class: string }>;
type TermMap = Record<string, string>;

export default function ReceiptsPage() {
  const navigate = useNavigate();
  const schoolId = useAuthStore((s) => s.schoolId);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [studentMap, setStudentMap] = useState<StudentMap>({});
  const [termMap, setTermMap] = useState<TermMap>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!schoolId) return;
    void (async () => {
      const { data: payData } = await supabase
        .from("student_payments")
        .select("payment_id, student_id, term_id, amount_paid, receipt_number, payment_date, payment_method, reversed_at")
        .eq("school_id", schoolId)
        .is("reversed_at", null)
        .order("payment_date", { ascending: false })
        .order("payment_id", { ascending: false })
        .limit(200);
      const rows = (payData || []) as PaymentRow[];
      setPayments(rows);
      const studentIds = [...new Set(rows.map((r) => r.student_id))];
      const termIds = [...new Set(rows.map((r) => r.term_id))];
      if (studentIds.length > 0) {
        const { data: students } = await supabase
          .from("students")
          .select("student_id, name, current_class")
          .in("student_id", studentIds);
        const map: StudentMap = {};
        (students || []).forEach((s: { student_id: string; name: string; current_class: string }) => {
          map[s.student_id] = { name: s.name, current_class: s.current_class || "—" };
        });
        setStudentMap(map);
      } else setStudentMap({});
      if (termIds.length > 0) {
        const { data: terms } = await supabase
          .from("school_terms")
          .select("id, term, year")
          .in("id", termIds);
        const map: TermMap = {};
        (terms || []).forEach((t: { id: string; term: number; year: number }) => {
          map[t.id] = `Term ${t.term}, ${t.year}`;
        });
        setTermMap(map);
      } else setTermMap({});
      setLoading(false);
    })();
  }, [schoolId]);

  const filtered = q.trim()
    ? payments.filter((p) => {
        const s = studentMap[p.student_id];
        const termLabel = termMap[p.term_id] || "";
        const search = q.toLowerCase();
        return (
          (s?.name?.toLowerCase().includes(search)) ||
          (s?.current_class?.toLowerCase().includes(search)) ||
          termLabel.toLowerCase().includes(search) ||
          (p.receipt_number?.toLowerCase().includes(search))
        );
      })
    : payments;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Receipts</h1>
        <button
          type="button"
          onClick={() => navigate("/dashboard/accountant")}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Back to Dashboard
        </button>
      </div>
      <p className="mb-4 text-sm text-slate-600">
        Payments recorded on the Payments page appear here. Reversed payments are hidden.
      </p>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by student, class, term, or receipt number…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full max-w-md rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading receipts…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            {payments.length === 0
              ? "No receipts yet. Record a payment on Payments to see it here."
              : "No receipts match your search."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-left font-medium text-slate-600">
                  <th className="px-4 py-3">Receipt #</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Term</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Method</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {filtered.map((p) => {
                  const s = studentMap[p.student_id];
                  return (
                    <tr key={p.payment_id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono text-slate-600">{p.receipt_number || "—"}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{s?.name ?? "—"}</td>
                      <td className="px-4 py-3">{s?.current_class ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{termMap[p.term_id] ?? "—"}</td>
                      <td className="px-4 py-3 font-medium">{Number(p.amount_paid).toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-600">{p.payment_date ?? "—"}</td>
                      <td className="px-4 py-3 capitalize text-slate-600">{p.payment_method ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
