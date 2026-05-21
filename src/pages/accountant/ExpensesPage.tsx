import { useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Filter, Download, FileText } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import {
  fetchExpensesForMonth,
  fetchRecorderNames,
  EXPENSES_QUERY_KEY,
  type ExpenseRow,
} from "./api/expenses";
import { fetchTeacherSalaryRollup } from "./api/expensePayroll";
import { useSort, Th } from "../../lib/useSort";
import { exportToPdf, exportToExcel } from "../../lib/exportUtils";

const STALE_MS = 2 * 60 * 1000;
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function fmt(n: number) { return n.toLocaleString("en-US", { maximumFractionDigits: 0 }); }

type AccountantOutletContext = { openRecordExpense?: () => void };

export default function ExpensesPage() {
  const { openRecordExpense } = useOutletContext<AccountantOutletContext>();
  const schoolId = useAuthStore((s) => s.schoolId);
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(() => now.getMonth());
  const [viewYear, setViewYear] = useState(() => now.getFullYear());
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: monthPack, isLoading } = useQuery({
    queryKey: [...EXPENSES_QUERY_KEY, schoolId, "calendar-month", viewYear, viewMonth] as const,
    queryFn: async () => {
      const rows = await fetchExpensesForMonth(schoolId!, viewYear, viewMonth);
      const names = await fetchRecorderNames(rows.map((r) => r.recorded_by));
      return { rows, names };
    },
    enabled: !!schoolId,
    staleTime: STALE_MS,
    gcTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: true,
  });

  const { data: teacherRollup = [], isLoading: rollupLoading } = useQuery({
    queryKey: [...EXPENSES_QUERY_KEY, schoolId, "teacher-rollup", viewYear, viewMonth] as const,
    queryFn: () => fetchTeacherSalaryRollup(schoolId!, viewMonth, viewYear, MONTH_NAMES),
    enabled: !!schoolId,
    staleTime: STALE_MS,
    gcTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const expenses = monthPack?.rows ?? [];
  const recorderNames = monthPack?.names ?? new Map<string, string>();
  const periodTitle = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

  const categories = useMemo(() => {
    const seen = new Set<string>();
    expenses.forEach((r) => { if (r.category_name) seen.add(r.category_name); });
    return Array.from(seen).sort();
  }, [expenses]);

  const { totalExpenses, approvedTotal, pendingTotal } = useMemo(() => {
    let approvedTotal = 0, pendingTotal = 0;
    for (const r of expenses) {
      const amt = Number(r.amount || 0);
      if (r.status === "approved" || r.status === "paid") approvedTotal += amt;
      else pendingTotal += amt;
    }
    return { totalExpenses: approvedTotal + pendingTotal, approvedTotal, pendingTotal };
  }, [expenses]);

  const filtered = useMemo(() => {
    let res = expenses;
    if (categoryFilter !== "all") res = res.filter((r) => r.category_name === categoryFilter);
    if (statusFilter !== "all") res = res.filter((r) => r.status === statusFilter);
    if (q.trim()) {
      const s = q.toLowerCase();
      res = res.filter(
        (r) =>
          r.description?.toLowerCase().includes(s) ||
          r.category_name?.toLowerCase().includes(s) ||
          r.reference_number?.toLowerCase().includes(s)
      );
    }
    return res;
  }, [expenses, categoryFilter, statusFilter, q]);

  const { sortKey, sortDir, sorted, toggleSort } = useSort(
    filtered as unknown as Record<string, unknown>[],
    "expense_date",
    "desc"
  );

  const filteredTotal = useMemo(() => sorted.reduce((s, r) => s + Number((r as unknown as ExpenseRow).amount || 0), 0), [sorted]);

  function doExportPdf() {
    exportToPdf({
      title: `Expenses — ${periodTitle}`,
      subtitle: `${categoryFilter !== "all" ? `Category: ${categoryFilter}` : "All categories"} · ${statusFilter !== "all" ? `Status: ${statusFilter}` : "All statuses"}`,
      columns: [
        { header: "Date", key: "expense_date", width: 20 },
        { header: "Reference", key: "reference_number", width: 22 },
        { header: "Description", key: "description", width: 50 },
        { header: "Category", key: "category_name", width: 32 },
        { header: "Amount (UGX)", key: "amount", width: 22, align: "right", format: (v) => fmt(Number(v || 0)) },
        { header: "Status", key: "status", width: 16 },
      ],
      rows: sorted as unknown as Record<string, unknown>[],
      filename: `expenses-${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`,
      totalsRow: ["TOTAL", "", "", "", fmt(filteredTotal) + " UGX", ""],
    });
  }

  function doExportExcel() {
    exportToExcel({
      title: `Expenses — ${periodTitle}`,
      subtitle: `${categoryFilter !== "all" ? `Category: ${categoryFilter}` : "All categories"} · ${statusFilter !== "all" ? `Status: ${statusFilter}` : "All statuses"}`,
      columns: [
        { header: "Date", key: "expense_date", width: 16 },
        { header: "Reference", key: "reference_number", width: 18 },
        { header: "Description", key: "description", width: 38 },
        { header: "Category", key: "category_name", width: 26 },
        { header: "Amount (UGX)", key: "amount", width: 18, align: "right", format: (v) => fmt(Number(v || 0)) },
        { header: "Status", key: "status", width: 14 },
        { header: "Recorded by", key: "recorded_by", width: 20 },
      ],
      rows: (sorted as unknown as ExpenseRow[]).map((r) => ({
        ...r,
        recorded_by: r.recorded_by ? recorderNames.get(r.recorded_by) || "—" : "—",
      })) as unknown as Record<string, unknown>[],
      filename: `expenses-${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`,
      totalsRow: ["TOTAL", "", "", "", fmt(filteredTotal) + " UGX", "", ""],
    });
  }

  return (
    <div className="ac-page-content mx-auto max-w-7xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="ac-text-primary text-2xl font-semibold">Expenses</h1>
          <p className="ac-text-secondary mt-0.5 text-sm">
            Salaries, utilities, and other school spending for {periodTitle}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openRecordExpense?.()}
            className="ac-glass-btn inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
          >
            <Plus className="h-4 w-4 text-amber-500" />
            Record expense
          </button>
          <button type="button" onClick={doExportPdf} className="ac-glass-btn inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold">
            <Download className="h-4 w-4" />PDF
          </button>
          <button type="button" onClick={doExportExcel} className="ac-glass-btn inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold">
            <FileText className="h-4 w-4" />Excel
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="ac-glass-card rounded-2xl px-4 py-3">
          <p className="ac-text-muted text-xs font-medium">Total expenses</p>
          <p className="ac-text-primary mt-1 text-lg font-bold tabular-nums">
            {fmt(totalExpenses)}<span className="ac-text-muted ml-1 text-xs font-normal">UGX</span>
          </p>
        </div>
        <div className="ac-glass-card rounded-2xl px-4 py-3">
          <p className="ac-text-muted text-xs font-medium">Approved / Paid</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-emerald-500">
            {fmt(approvedTotal)}<span className="ml-1 text-xs font-normal text-emerald-400">UGX</span>
          </p>
        </div>
        <div className="ac-glass-card rounded-2xl px-4 py-3">
          <p className="ac-text-muted text-xs font-medium">Pending</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-amber-500">
            {fmt(pendingTotal)}<span className="ml-1 text-xs font-normal text-amber-400">UGX</span>
          </p>
        </div>
      </div>

      {/* Period picker */}
      <div className="flex flex-wrap items-end gap-3 ac-glass-card rounded-[14px] px-4 py-3">
        <div>
          <label className="mb-1 block text-xs font-medium ac-text-muted">Month</label>
          <select className="ac-input rounded-lg px-3 py-2 text-sm" value={viewMonth} onChange={(e) => setViewMonth(Number(e.target.value))}>
            {MONTH_NAMES.map((name, i) => <option key={name} value={i}>{name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium ac-text-muted">Year</label>
          <input type="number" className="ac-input w-28 rounded-lg px-3 py-2 text-sm" min={2020} max={2100} value={viewYear} onChange={(e) => setViewYear(Number(e.target.value))} />
        </div>
      </div>

      {/* Teacher salary rollup */}
      <div className="ac-glass-card overflow-hidden rounded-[18px]">
        <div className="border-b border-[var(--ac-border)] px-4 py-3">
          <h2 className="ac-text-primary text-base font-semibold">Teacher salaries — {periodTitle}</h2>
          <p className="ac-text-muted mt-0.5 text-xs">Expected vs paid for each teacher this pay period.</p>
        </div>
        {rollupLoading ? (
          <div className="ac-text-muted p-6 text-sm">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="ac-table-header">
                  <th className="px-4 py-3 text-left font-semibold ac-text-muted">Teacher</th>
                  <th className="px-4 py-3 text-right font-semibold ac-text-muted">Expected (UGX)</th>
                  <th className="px-4 py-3 text-right font-semibold ac-text-muted">Paid this period (UGX)</th>
                  <th className="px-4 py-3 text-left font-semibold ac-text-muted">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y ac-table-divider">
                {teacherRollup.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center ac-text-muted">No teachers found.</td></tr>
                ) : teacherRollup.map((t) => (
                  <tr key={t.teacher_id} className="ac-table-row">
                    <td className="ac-cell-primary px-4 py-3 font-medium">{t.name}</td>
                    <td className="px-4 py-3 text-right tabular-nums ac-text-secondary">
                      {t.expected_salary != null ? fmt(t.expected_salary) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums ac-cell-primary">{fmt(t.paid_amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${t.paid_for_period ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/20 text-slate-400"}`}>
                        {t.paid_for_period ? "Covered" : "Not fully covered"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transactions */}
      <div className="ac-glass-card overflow-hidden rounded-[18px]">
        <div className="border-b border-[var(--ac-border)] px-4 py-3">
          <h2 className="ac-text-primary text-base font-semibold">Transactions — {periodTitle}</h2>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--ac-border)] px-4 py-3">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ac-text-muted" />
            <input
              type="text"
              placeholder="Search description, category, ref…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="ac-input w-full pl-9"
            />
          </div>
          {categories.length > 1 && (
            <div className="relative">
              <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ac-text-muted" />
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="ac-input pl-8 pr-6 text-sm">
                <option value="all">All categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          <div className="flex items-center gap-1 ac-glass-card rounded-xl p-1">
            {["all", "approved", "paid", "pending"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${statusFilter === s ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "ac-text-muted hover:ac-text-secondary"}`}
              >
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="ac-text-muted p-8">Loading…</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="ac-table-header">
                    <Th label="Date" sortKey="expense_date" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <th className="px-4 py-3 text-left font-semibold ac-text-muted whitespace-nowrap">Reference</th>
                    <Th label="Description" sortKey="description" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <Th label="Category" sortKey="category_name" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <Th label="Amount (UGX)" sortKey="amount" currentKey={sortKey} dir={sortDir} onSort={toggleSort} right />
                    <Th label="Status" sortKey="status" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <th className="px-4 py-3 text-left font-semibold ac-text-muted whitespace-nowrap">Recorded by</th>
                    <th className="px-4 py-3 text-left font-semibold ac-text-muted">Voucher</th>
                  </tr>
                </thead>
                <tbody className="divide-y ac-table-divider">
                  {sorted.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center ac-text-muted">
                      {expenses.length === 0 ? `No expenses in ${periodTitle}.` : "No expenses match your filters."}
                    </td></tr>
                  ) : sorted.map((row) => {
                    const r = row as unknown as ExpenseRow;
                    return (
                      <tr key={r.expense_id} className="ac-table-row">
                        <td className="px-4 py-3 tabular-nums ac-text-secondary whitespace-nowrap">{r.expense_date}</td>
                        <td className="px-4 py-3 font-mono text-xs ac-text-secondary whitespace-nowrap">{r.reference_number || "—"}</td>
                        <td className="ac-cell-primary max-w-[220px] truncate px-4 py-3" title={r.description}>{r.description}</td>
                        <td className="max-w-[180px] truncate px-4 py-3 ac-text-secondary" title={r.category_name}>{r.category_name}</td>
                        <td className="ac-cell-primary px-4 py-3 text-right tabular-nums font-semibold whitespace-nowrap">{fmt(Number(r.amount))}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${r.status === "approved" || r.status === "paid" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs ac-text-secondary whitespace-nowrap">
                          {r.recorded_by ? recorderNames.get(r.recorded_by) || "—" : "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Link to={`/dashboard/accountant/expenses/receipt/${r.expense_id}`} className="text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 text-xs font-semibold hover:underline" target="_blank" rel="noreferrer">
                            Open
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t ac-table-divider px-4 py-3">
              <p className="ac-text-muted text-xs">
                {sorted.length} transaction{sorted.length !== 1 ? "s" : ""}
                {expenses.length !== sorted.length ? ` (of ${expenses.length} total)` : ""}
              </p>
              <p className="ac-text-primary text-sm font-semibold tabular-nums">Total: {fmt(filteredTotal)} UGX</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
