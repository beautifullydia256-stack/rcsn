import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";

const STALE_MS = 2 * 60 * 1000;

type Row = { student_id: string; term_id: string; term_label: string; student_name: string; current_class: string; amount_paid: number; balance: number; total_fees: number };

async function fetchDebtors(schoolId: string): Promise<Row[]> {
  const { data: balances } = await supabase
    .from("student_balances")
    .select("student_id, term_id, total_fees, total_paid, balance")
    .eq("school_id", schoolId)
    .gt("balance", 0)
    .order("term_id", { ascending: false });
  if (!balances?.length) return [];
  const termIds = [...new Set((balances as { term_id: string }[]).map((b) => b.term_id))];
  const studentIds = [...new Set((balances as { student_id: string }[]).map((b) => b.student_id))];
  const [termsRes, studentsRes] = await Promise.all([
    supabase.from("school_terms").select("id, term, year").in("id", termIds),
    supabase.from("students").select("student_id, name, current_class").in("student_id", studentIds),
  ]);
  const termMap = new Map((termsRes.data || []).map((t: { id: string; term: number; year: number }) => [t.id, `Term ${t.term}, ${t.year}`]));
  const studentMap = new Map((studentsRes.data || []).map((s: { student_id: string; name: string; current_class: string }) => [s.student_id, { name: s.name, current_class: s.current_class }]));
  return balances.map((b) => {
    const bb = b as { student_id: string; term_id: string; total_fees: number; total_paid: number; balance: number };
    return {
      student_id: bb.student_id,
      term_id: bb.term_id,
      term_label: termMap.get(bb.term_id) ?? "—",
      student_name: studentMap.get(bb.student_id)?.name ?? "—",
      current_class: studentMap.get(bb.student_id)?.current_class ?? "—",
      amount_paid: Number(bb.total_paid || 0),
      balance: Number(bb.balance ?? 0),
      total_fees: Number(bb.total_fees || 0),
    };
  });
}

export default function AccountantOutstandingPage() {
  const navigate = useNavigate();
  const schoolId = useAuthStore((s) => s.schoolId);
  const [q, setQ] = useState("");
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["accountant", "outstanding", schoolId], queryFn: () => fetchDebtors(schoolId!), enabled: !!schoolId, staleTime: STALE_MS });
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return !t ? rows : rows.filter((r) => r.student_name.toLowerCase().includes(t) || r.current_class.toLowerCase().includes(t) || r.term_label.toLowerCase().includes(t));
  }, [q, rows]);

  const colSpan = 6;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Outstanding Fees</h1>
        <button type="button" onClick={() => navigate("/dashboard/accountant")} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">Back to Dashboard</button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3">
          <input type="text" placeholder="Search by student or class…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
        </div>
        {isLoading ? <div className="p-8 text-slate-500">Loading…</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-left font-medium text-slate-600">
                  <th className="px-4 py-3">Student</th><th className="px-4 py-3">Class</th><th className="px-4 py-3">Term</th><th className="px-4 py-3">Expected</th><th className="px-4 py-3">Paid</th><th className="px-4 py-3">Balance</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {filtered.length === 0 ? <tr><td colSpan={colSpan} className="px-4 py-8 text-center text-slate-400">No outstanding balances.</td></tr> : filtered.map((r) => (
                  <tr key={`${r.student_id}-${r.term_id}`} className="border-b border-slate-100 transition-colors hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900">{r.student_name}</td>
                    <td className="px-4 py-3">{r.current_class}</td>
                    <td className="px-4 py-3 text-slate-600">{r.term_label}</td>
                    <td className="px-4 py-3">{r.total_fees.toLocaleString()}</td>
                    <td className="px-4 py-3">{r.amount_paid.toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-amber-600">{r.balance.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
