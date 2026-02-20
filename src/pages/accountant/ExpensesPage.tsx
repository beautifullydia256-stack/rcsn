import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../store/authStore";
import { fetchExpenses, EXPENSES_QUERY_KEY } from "./api/expenses";

const STALE_MS = 2 * 60 * 1000;

export default function ExpensesPage() {
  const navigate = useNavigate();
  const schoolId = useAuthStore((s) => s.schoolId);
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: [...EXPENSES_QUERY_KEY, schoolId],
    queryFn: () => fetchExpenses(schoolId!),
    enabled: !!schoolId,
    staleTime: STALE_MS,
    refetchOnWindowFocus: true,
  });

  return (
    <div className="ac-page-content mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="ac-text-primary text-2xl font-semibold">Expenses</h1>
        <button type="button" onClick={() => navigate("/dashboard/accountant")} className="ac-glass-btn-secondary rounded-xl px-4 py-2 text-sm font-medium">Back to Dashboard</button>
      </div>
      <div className="ac-glass-card overflow-hidden rounded-[18px]">
        {isLoading ? (
          <div className="ac-text-muted p-8">Loading…</div>
        ) : (
          <div className="overflow-x-auto ac-table-wrap">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-3">Date</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center ac-text-muted">No expenses yet.</td></tr> : expenses.map((r) => (
                  <tr key={r.expense_id}>
                    <td className="px-4 py-3">{r.expense_date}</td>
                    <td className="ac-cell-primary px-4 py-3">{r.description}</td>
                    <td className="px-4 py-3">{r.category_name}</td>
                    <td className="ac-cell-primary px-4 py-3">{Number(r.amount).toLocaleString()}</td>
                    <td className="px-4 py-3"><span className={"inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium " + (r.status === "approved" || r.status === "paid" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400")}>{r.status}</span></td>
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
