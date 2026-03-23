import { useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import {
  fetchExpensesForMonth,
  fetchRecorderNames,
  EXPENSES_QUERY_KEY,
  type ExpenseRow,
} from "./api/expenses";
import { fetchTeacherSalaryRollup } from "./api/expensePayroll";

const STALE_MS = 2 * 60 * 1000;
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type AccountantOutletContext = { openRecordExpense?: () => void };

export default function ExpensesPage() {
  const navigate = useNavigate();
  const { openRecordExpense } = useOutletContext<AccountantOutletContext>();
  const schoolId = useAuthStore((s) => s.schoolId);
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(() => now.getMonth());
  const [viewYear, setViewYear] = useState(() => now.getFullYear());

  const { data: monthPack, isLoading } = useQuery({
    queryKey: [...EXPENSES_QUERY_KEY, schoolId, "calendar-month", viewYear, viewMonth] as const,
    queryFn: async () => {
      const rows = await fetchExpensesForMonth(schoolId!, viewYear, viewMonth);
      const names = await fetchRecorderNames(rows.map((r) => r.recorded_by));
      return { rows, names };
    },
    enabled: !!schoolId,
    staleTime: STALE_MS,
    refetchOnWindowFocus: true,
  });

  const { data: teacherRollup = [], isLoading: rollupLoading } = useQuery({
    queryKey: [...EXPENSES_QUERY_KEY, schoolId, "teacher-rollup", viewYear, viewMonth] as const,
    queryFn: () => fetchTeacherSalaryRollup(schoolId!, viewMonth, viewYear, MONTH_NAMES),
    enabled: !!schoolId,
    staleTime: STALE_MS,
  });

  const expenses = monthPack?.rows ?? [];
  const recorderNames = monthPack?.names ?? new Map<string, string>();

  const periodTitle = useMemo(() => `${MONTH_NAMES[viewMonth]} ${viewYear}`, [viewMonth, viewYear]);

  const salaryRows = useMemo(
    () => expenses.filter((r) => r.linked_teacher_id && r.salary_period_label),
    [expenses]
  );

  return (
    <div className="ac-page-content mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="ac-text-primary text-2xl font-semibold">Expenses</h1>
          <p className="ac-text-secondary mt-1 max-w-xl text-sm">
            Record salaries, utilities, and other school spending. Fee income is recorded under Payments — not here. Cashflow and Financial
            Analytics include expenses with status <strong className="text-emerald-600">approved</strong> or <strong className="text-emerald-600">paid</strong>.
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

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-[14px] border border-[var(--ac-border)] bg-[var(--ac-surface-elevated)] px-4 py-3">
        <div>
          <label className="mb-1 block text-xs font-medium ac-text-muted">Calendar month (table)</label>
          <select
            className="ac-glass-btn-secondary rounded-lg px-3 py-2 text-sm"
            value={viewMonth}
            onChange={(e) => setViewMonth(Number(e.target.value))}
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={i}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium ac-text-muted">Year</label>
          <input
            type="number"
            className="ac-glass-btn-secondary w-28 rounded-lg px-3 py-2 text-sm"
            min={2020}
            max={2100}
            value={viewYear}
            onChange={(e) => setViewYear(Number(e.target.value))}
          />
        </div>
        <p className="text-xs ac-text-muted max-w-md pb-1">
          The list below uses <strong>expense date</strong> in {periodTitle}. Teacher salary status uses the <strong>salary pay period</strong> label (
          {periodTitle}) so it lines up with how you record salaries.
        </p>
      </div>

      <div className="ac-glass-card mb-6 overflow-hidden rounded-[18px]">
        <div className="border-b border-[var(--ac-border)] px-4 py-3">
          <h2 className="ac-text-primary text-base font-semibold">Teacher salaries — {periodTitle}</h2>
          <p className="ac-text-muted mt-0.5 text-xs">
            Expected amount comes from each teacher&apos;s profile. &quot;Paid&quot; here means approved/paid salary lines for this pay period total at least the
            expected salary (or any amount if no salary is on file).
          </p>
        </div>
        {rollupLoading ? (
          <div className="ac-text-muted p-6 text-sm">Loading…</div>
        ) : (
          <div className="overflow-x-auto ac-table-wrap">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left">Teacher</th>
                  <th className="px-4 py-3 text-right">Expected (UGX)</th>
                  <th className="px-4 py-3 text-right">Paid this period (UGX)</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {teacherRollup.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center ac-text-muted">
                      No teachers found for this school.
                    </td>
                  </tr>
                ) : (
                  teacherRollup.map((t) => (
                    <tr key={t.teacher_id}>
                      <td className="ac-cell-primary px-4 py-3">{t.name}</td>
                      <td className="px-4 py-3 text-right ac-text-secondary">
                        {t.expected_salary != null ? t.expected_salary.toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">{t.paid_amount.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium " +
                            (t.paid_for_period ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/20 text-slate-400")
                          }
                        >
                          {t.paid_for_period ? "Covered for period" : "Not fully covered"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="ac-glass-card overflow-hidden rounded-[18px]">
        <div className="border-b border-[var(--ac-border)] px-4 py-3">
          <h2 className="ac-text-primary text-base font-semibold">Transactions — expense date in {periodTitle}</h2>
          {salaryRows.length > 0 && (
            <p className="ac-text-muted mt-1 text-xs">
              {salaryRows.length} line(s) in this month look like salary payments (linked teacher + pay period). Open the voucher for a printable record.
            </p>
          )}
        </div>
        {isLoading ? (
          <div className="ac-text-muted p-8">Loading…</div>
        ) : (
          <div className="overflow-x-auto ac-table-wrap">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Recorded by</th>
                  <th className="px-4 py-3">Voucher</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center ac-text-muted">
                      No expenses in this month.
                    </td>
                  </tr>
                ) : (
                  expenses.map((r: ExpenseRow) => (
                    <tr key={r.expense_id}>
                      <td className="px-4 py-3">{r.expense_date}</td>
                      <td className="px-4 py-3 font-mono text-xs ac-text-secondary">{r.reference_number || "—"}</td>
                      <td className="ac-cell-primary max-w-[220px] truncate px-4 py-3" title={r.description}>
                        {r.description}
                      </td>
                      <td className="max-w-[180px] truncate px-4 py-3" title={r.category_name}>
                        {r.category_name}
                      </td>
                      <td className="ac-cell-primary px-4 py-3">{Number(r.amount).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium " +
                            (r.status === "approved" || r.status === "paid" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400")
                          }
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {r.recorded_by ? recorderNames.get(r.recorded_by) || "—" : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/dashboard/expense-receipt/${r.expense_id}`}
                          className="text-emerald-600 underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
