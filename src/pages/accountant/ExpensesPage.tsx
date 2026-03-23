import { useNavigate, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { fetchExpenses, EXPENSES_QUERY_KEY } from "./api/expenses";

const STALE_MS = 2 * 60 * 1000;

type AccountantOutletContext = { openRecordExpense?: () => void };

export default function ExpensesPage() {
  const navigate = useNavigate();
  const { openRecordExpense } = useOutletContext<AccountantOutletContext>();
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
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="ac-text-primary text-2xl font-semibold">Expenses</h1>
          <p className="ac-text-secondary mt-1 max-w-xl text-sm">
            Record salaries, utilities, and other school spending. Fee income is recorded under Payments — not here.
            Cashflow and Financial Analytics include expenses with status <strong className="text-emerald-600">approved</strong> or{" "}
            <strong className="text-emerald-600">paid</strong>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openRecordExpense?.()}
            className="ac-glass-btn inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ac-text-primary"
          >
            <Plus className="h-4 w-4 shrink-0 text-amber-600" />
            Record expense
          </button>
          <button
            type="button"
            onClick={() => navigate("/dashboard/accountant")}
            className="ac-glass-btn-secondary rounded-xl px-4 py-2 text-sm font-medium"
          >
            Back to Dashboard
          </button>
        </div>
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
