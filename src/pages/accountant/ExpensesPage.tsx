import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";

type ExpenseRow = { expense_id: string; description: string; amount: number; expense_date: string; category_name: string; status: string };

export default function ExpensesPage() {
  const navigate = useNavigate();
  const schoolId = useAuthStore((s) => s.schoolId);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId) return;
    supabase.from("school_expenses").select("expense_id, description, amount, expense_date, category_name, status").eq("school_id", schoolId).order("expense_date", { ascending: false }).limit(50).then(({ data }) => {
      setExpenses((data || []) as ExpenseRow[]);
      setLoading(false);
    });
  }, [schoolId]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Expenses</h1>
        <button type="button" onClick={() => navigate("/dashboard/accountant")} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">Back to Dashboard</button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? <div className="p-8 text-slate-500">Loading…</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-left font-medium text-slate-600">
                  <th className="px-4 py-3">Date</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {expenses.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No expenses yet.</td></tr> : expenses.map((r) => (
                  <tr key={r.expense_id} className="border-b border-slate-100 transition-colors hover:bg-slate-50/50">
                    <td className="px-4 py-3">{r.expense_date}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{r.description}</td>
                    <td className="px-4 py-3">{r.category_name}</td>
                    <td className="px-4 py-3 font-medium">{Number(r.amount).toLocaleString()}</td>
                    <td className="px-4 py-3"><span className={"inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium " + (r.status === "approved" || r.status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>{r.status}</span></td>
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
