import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";

type ReportRow = { class_name: string; expected: number; collected: number; outstanding: number };

export default function ReportsPage() {
  const navigate = useNavigate();
  const schoolId = useAuthStore((s) => s.schoolId);
  const [reportType, setReportType] = useState<"fee_collection" | "outstanding">("fee_collection");
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!schoolId || reportType !== "fee_collection") return;
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    Promise.all([
      supabase.from("school_terms").select("id, start_date, end_date").eq("school_id", schoolId).order("year", { ascending: false }).order("term", { ascending: false }),
      supabase.from("student_balances").select("student_id, total_fees, total_paid, balance").eq("school_id", schoolId),
      supabase.from("students").select("student_id, current_class").eq("school_id", schoolId),
    ])
      .then(([t, b, s]) => {
        const terms = t.data || [];
        const current = (terms as { start_date?: string; end_date: string }[]).find(
          (x) => x.start_date && x.end_date && x.start_date <= today && x.end_date >= today
        ) ?? terms[0];
        const termId = (current as { id: string })?.id;
        const balances = (b.data || []) as { student_id: string; total_fees: number; total_paid: number; balance: number }[];
        const studentClass = new Map(((s.data || []) as { student_id: string; current_class: string }[]).map((x) => [x.student_id, x.current_class]));

        const byClass: Record<string, { expected: number; collected: number; outstanding: number }> = {};
        balances.forEach((row) => {
          const c = studentClass.get(row.student_id) ?? "Other";
          if (!byClass[c]) byClass[c] = { expected: 0, collected: 0, outstanding: 0 };
          byClass[c].expected += Number(row.total_fees || 0);
          byClass[c].collected += Number(row.total_paid || 0);
          byClass[c].outstanding += Math.max(0, Number(row.balance ?? 0));
        });
        setRows(
          Object.entries(byClass).map(([class_name, v]) => ({
            class_name,
            expected: v.expected,
            collected: v.collected,
            outstanding: v.outstanding,
          }))
        );
      })
      .finally(() => setLoading(false));
  }, [schoolId, reportType]);

  function exportCsv() {
    const headers = ["Class", "Expected", "Collected", "Outstanding"];
    const lines = [headers.join(","), ...rows.map((r) => [r.class_name, r.expected, r.collected, r.outstanding].join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `fee-collection-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Financial Reports</h1>
        <button type="button" onClick={() => navigate("/dashboard/accountant")} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
          Back to Dashboard
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <label className="text-sm font-medium text-slate-700">Report type</label>
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value as "fee_collection" | "outstanding")}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="fee_collection">Fee collection by class</option>
          <option value="outstanding">Outstanding (use Outstanding page for list)</option>
        </select>
        {reportType === "fee_collection" && (
          <button type="button" onClick={exportCsv} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700">
            Export CSV
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-slate-500">Loading report…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-left font-medium text-slate-600">
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Expected</th>
                  <th className="px-4 py-3">Collected</th>
                  <th className="px-4 py-3">Outstanding</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-400">No data for current term.</td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.class_name} className="border-b border-slate-100 transition-colors hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">{r.class_name}</td>
                      <td className="px-4 py-3">{r.expected.toLocaleString()}</td>
                      <td className="px-4 py-3">{r.collected.toLocaleString()}</td>
                      <td className="px-4 py-3 font-medium text-amber-600">{r.outstanding.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-4 text-sm text-slate-500">More reports (Income Statement, Daily Cash, PDF export) coming in Phase 4.</p>
    </div>
  );
}
