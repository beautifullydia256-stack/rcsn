import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../store/authStore";
import { fetchReceipts, RECEIPTS_QUERY_KEY } from "./api/receipts";
import { fetchExpenses, EXPENSES_QUERY_KEY } from "./api/expenses";

const STALE_MS = 2 * 60 * 1000;

type CashbookEntry = {
  id: string;
  date: string;
  type: "payment" | "expense";
  description: string;
  cashIn: number;
  cashOut: number;
  balance: number;
};

export default function BankPage() {
  const navigate = useNavigate();
  const schoolId = useAuthStore((s) => s.schoolId);
  const [tab, setTab] = useState<"cashbook" | "deposits" | "reconciliation">("cashbook");

  const { data: receiptsData } = useQuery({
    queryKey: [...RECEIPTS_QUERY_KEY, schoolId],
    queryFn: () => fetchReceipts(schoolId!),
    enabled: !!schoolId && tab === "cashbook",
    staleTime: STALE_MS,
  });
  const { data: expenses = [] } = useQuery({
    queryKey: [...EXPENSES_QUERY_KEY, schoolId],
    queryFn: () => fetchExpenses(schoolId!),
    enabled: !!schoolId && tab === "cashbook",
    staleTime: STALE_MS,
  });

  const cashbookEntries = useMemo((): CashbookEntry[] => {
    if (!receiptsData || !schoolId) return [];
    const payments = receiptsData.payments;
    const studentMap = receiptsData.studentMap;
    const entries: { id: string; date: string; type: "payment" | "expense"; description: string; cashIn: number; cashOut: number }[] = [];
    payments.forEach((p) => {
      const name = studentMap[p.student_id]?.name ?? "—";
      entries.push({
        id: p.payment_id,
        date: p.payment_date || new Date().toISOString().slice(0, 10),
        type: "payment",
        description: `Payment — ${name} (${p.receipt_number || ""})`,
        cashIn: Number(p.amount_paid || 0),
        cashOut: 0,
      });
    });
    expenses
      .filter((e) => e.status === "approved" || e.status === "paid")
      .forEach((e) => {
        entries.push({
          id: e.expense_id,
          date: e.expense_date,
          type: "expense",
          description: e.description || e.category_name || "Expense",
          cashIn: 0,
          cashOut: Number(e.amount || 0),
        });
      });
    entries.sort((a, b) => a.date.localeCompare(b.date));
    let running = 0;
    return entries.map((e) => {
      running += e.cashIn - e.cashOut;
      return { ...e, balance: running };
    }).reverse();
  }, [receiptsData, expenses, schoolId]);

  return (
    <div className="ac-page-content mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="ac-text-primary text-2xl font-semibold">Bank & Cash</h1>
        <button type="button" onClick={() => navigate("/dashboard/accountant")} className="ac-glass-btn-secondary rounded-xl px-4 py-2 text-sm font-medium">
          Back to Dashboard
        </button>
      </div>

      <div className="mb-4 flex gap-2 border-b border-[var(--ac-border)]">
        {(["cashbook", "deposits", "reconciliation"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`pb-2 px-3 text-sm font-medium capitalize ${tab === t ? "border-b-2 border-emerald-500 text-emerald-500" : "ac-text-muted"}`}
          >
            {t === "cashbook" ? "Cashbook" : t === "deposits" ? "Deposits" : "Reconciliation"}
          </button>
        ))}
      </div>

      {tab === "cashbook" && (
        <div className="ac-glass-card overflow-hidden rounded-[18px]">
          <div className="border-b border-[var(--ac-border)] px-4 py-3">
            <h2 className="ac-text-primary text-sm font-semibold">Cashbook</h2>
            <p className="ac-text-muted text-xs mt-0.5">Chronological view: payments received and expenses paid. Running balance.</p>
          </div>
          <div className="overflow-x-auto ac-table-wrap">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Cash in</th>
                  <th className="px-4 py-3">Cash out</th>
                  <th className="px-4 py-3">Balance</th>
                </tr>
              </thead>
              <tbody>
                {cashbookEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center ac-text-muted">No entries yet.</td>
                  </tr>
                ) : (
                  cashbookEntries.map((e) => (
                    <tr key={e.id}>
                      <td className="px-4 py-3">{e.date}</td>
                      <td className="ac-cell-primary px-4 py-3">{e.description}</td>
                      <td className="px-4 py-3 text-emerald-500">{e.cashIn > 0 ? e.cashIn.toLocaleString() : "—"}</td>
                      <td className="px-4 py-3 text-amber-400">{e.cashOut > 0 ? e.cashOut.toLocaleString() : "—"}</td>
                      <td className="px-4 py-3 font-medium">{e.balance.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "deposits" && (
        <div className="ac-glass-card rounded-[18px] p-8">
          <h2 className="ac-text-primary text-sm font-semibold mb-2">Deposits</h2>
          <p className="ac-text-muted text-sm">
            Track when collected cash is moved to the bank. Structure ready; deposit recording can be added in a future phase.
          </p>
        </div>
      )}

      {tab === "reconciliation" && (
        <div className="ac-glass-card rounded-[18px] p-8">
          <h2 className="ac-text-primary text-sm font-semibold mb-2">Reconciliation</h2>
          <p className="ac-text-muted text-sm">
            Reconcile bank statements with recorded transactions. Structure ready; full reconciliation logic in a future phase.
          </p>
        </div>
      )}
    </div>
  );
}
