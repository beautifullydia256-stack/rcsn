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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Expenses</h1>
        <button type="button" onClick={() => navigate("/dashboard/accountant")} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Back to Dashboard</button>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? <div className="p-8 text-gray-500">Loading…</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 font-medium border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3">Date</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {expenses.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No expenses yet.</td></tr> : expenses.map((r) => (
                  <tr key={r.expense_id} className="border-b border-gray-50">
                    <td className="px-4 py-3">{r.expense_date}</td>
                    <td className="px-4 py-3">{r.description}</td>
                    <td className="px-4 py-3">{r.category_name}</td>
                    <td className="px-4 py-3 font-medium">{Number(r.amount).toLocaleString()}</td>
                    <td className="px-4 py-3"><span className={"px-2 py-0.5 rounded-full text-xs " + (r.status === "approved" || r.status === "paid" ? "bg-teal-50 text-teal-700" : "bg-amber-50 text-amber-700")}>{r.status}</span></td>
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
