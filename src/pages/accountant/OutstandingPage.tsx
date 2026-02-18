import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";

const STALE_MS = 2 * 60 * 1000;

type Row = { student_id: string; student_name: string; current_class: string; amount_paid: number; balance: number; total_fees: number };

async function fetchDebtors(schoolId: string): Promise<Row[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: terms } = await supabase.from("school_terms").select("id, start_date, end_date").eq("school_id", schoolId).order("year", { ascending: false }).order("term", { ascending: false });
  const current = (terms || []).find((t: { start_date?: string; end_date: string }) => t.start_date && t.end_date && t.start_date <= today && t.end_date >= today) ?? terms?.[0];
  const termId = (current as { id: string } | undefined)?.id;
  if (!termId) return [];
  const { data: balances } = await supabase.from("student_balances").select("student_id, total_fees, total_paid, balance").eq("school_id", schoolId).eq("term_id", termId).gt("balance", 0);
  if (!balances?.length) return [];
  const studentIds = balances.map((b) => b.student_id);
  const { data: students } = await supabase.from("students").select("student_id, name, current_class").in("student_id", studentIds);
  const map = new Map((students || []).map((s: { student_id: string; name: string; current_class: string }) => [s.student_id, { name: s.name, current_class: s.current_class }]));
  return balances.map((b) => ({
    student_id: b.student_id,
    student_name: map.get(b.student_id)?.name ?? "—",
    current_class: map.get(b.student_id)?.current_class ?? "—",
    amount_paid: Number(b.total_paid || 0),
    balance: Number(b.balance ?? 0),
    total_fees: Number(b.total_fees || 0),
  }));
}

export default function AccountantOutstandingPage() {
  const navigate = useNavigate();
  const schoolId = useAuthStore((s) => s.schoolId);
  const [q, setQ] = useState("");
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["accountant", "outstanding", schoolId], queryFn: () => fetchDebtors(schoolId!), enabled: !!schoolId, staleTime: STALE_MS });
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return !t ? rows : rows.filter((r) => r.student_name.toLowerCase().includes(t) || r.current_class.toLowerCase().includes(t));
  }, [q, rows]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Outstanding Fees</h1>
        <button type="button" onClick={() => navigate("/dashboard/accountant")} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Back to Dashboard</button>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <input type="text" placeholder="Search by student or class..." value={q} onChange={(e) => setQ(e.target.value)} className="w-full max-w-md rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </div>
        {isLoading ? <div className="p-8 text-gray-500">Loading…</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 font-medium border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3">Student</th><th className="px-4 py-3">Class</th><th className="px-4 py-3">Expected</th><th className="px-4 py-3">Paid</th><th className="px-4 py-3">Balance</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {filtered.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No outstanding balances.</td></tr> : filtered.map((r) => (
                  <tr key={r.student_id} className="border-b border-gray-50">
                    <td className="px-4 py-3 font-medium">{r.student_name}</td>
                    <td className="px-4 py-3">{r.current_class}</td>
                    <td className="px-4 py-3">{r.total_fees.toLocaleString()}</td>
                    <td className="px-4 py-3">{r.amount_paid.toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-red-600">{r.balance.toLocaleString()}</td>
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
