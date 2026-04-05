import { useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../store/authStore";
import { fetchDebtors, OUTSTANDING_QUERY_KEY } from "./api/outstanding";

const STALE_MS = 2 * 60 * 1000;

type OutletContext = { openRecordPayment: (initialStudentId?: string) => void };

export default function AccountantOutstandingPage() {
  const navigate = useNavigate();
  const { openRecordPayment } = useOutletContext() as OutletContext;
  const schoolId = useAuthStore((s) => s.schoolId);
  const [q, setQ] = useState("");
  const { data: rows = [], isLoading } = useQuery({
    queryKey: [...OUTSTANDING_QUERY_KEY, schoolId],
    queryFn: () => fetchDebtors(schoolId!),
    enabled: !!schoolId,
    staleTime: STALE_MS,
    refetchOnWindowFocus: true,
  });
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return !t ? rows : rows.filter((r) => r.student_name.toLowerCase().includes(t) || r.current_class.toLowerCase().includes(t) || r.term_label.toLowerCase().includes(t) || (r.invoice_number && r.invoice_number.toLowerCase().includes(t)));
  }, [q, rows]);

  const colSpan = 9;

  return (
    <div className="ac-page-content mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="ac-text-primary text-2xl font-semibold">Outstanding Fees</h1>
        <button type="button" onClick={() => navigate("/dashboard/accountant")} className="ac-glass-btn-secondary rounded-xl px-4 py-2 text-sm font-medium">Back to Dashboard</button>
      </div>
      <div className="ac-glass-card overflow-hidden rounded-[18px]">
        <div className="border-b border-[var(--ac-border)] px-4 py-3">
          <input type="text" placeholder="Search by student or class…" value={q} onChange={(e) => setQ(e.target.value)} className="ac-input max-w-md" />
        </div>
        {isLoading ? <div className="ac-text-muted p-8">Loading…</div> : (
          <div className="overflow-x-auto ac-table-wrap">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Term</th>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Expected</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">Aging</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? <tr><td colSpan={colSpan} className="px-4 py-8 text-center ac-text-muted">No outstanding balances.</td></tr> : filtered.map((r) => (
                  <tr key={`${r.student_id}-${r.term_id}`}>
                    <td className="ac-cell-primary px-4 py-3">{r.student_name}</td>
                    <td className="px-4 py-3">{r.current_class}</td>
                    <td className="px-4 py-3">{r.term_label}</td>
                    <td className="px-4 py-3 font-mono">{r.invoice_number ?? "—"}</td>
                    <td className="px-4 py-3">{r.total_fees.toLocaleString()}</td>
                    <td className="px-4 py-3">{r.amount_paid.toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-amber-400">{r.balance.toLocaleString()}</td>
                    <td className="px-4 py-3">{r.days_overdue > 0 ? <span className="text-amber-400">{r.days_overdue} days overdue</span> : "—"}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openRecordPayment(r.student_id)}
                        className="text-emerald-500 hover:underline text-sm font-medium"
                      >
                        Record Payment
                      </button>
                    </td>
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
