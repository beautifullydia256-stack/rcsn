import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Filter,
  Download,
  FileText,
  TrendingDown,
  CheckCircle2,
  Clock,
  Users,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useUIStore } from "../../store/uiStore";
import {
  fetchExpensesForMonth,
  fetchRecorderNames,
  EXPENSES_QUERY_KEY,
  type ExpenseRow,
} from "./api/expenses";
import { fetchTeacherSalaryRollup } from "./api/expensePayroll";
import { useSort, Th } from "../../lib/useSort";
import { exportToPdf, exportToExcel } from "../../lib/exportUtils";
import { printExpenseReceipt, type ExpenseReceiptData } from "../../components/accountant/ExpenseReceipt";
import { useSchoolName } from "../../lib/useSchoolName";
import PosEmptyState from "../../components/finance/pos/PosEmptyState";
import { getTokens, cardGrad, SORA, INTER } from "../../styles/posThemeTokens";

const STALE_MS = 2 * 60 * 1000;
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function fmt(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

type AccountantOutletContext = { openRecordExpense?: () => void };

export default function ExpensesPage() {
  const { openRecordExpense } = useOutletContext<AccountantOutletContext>();
  const schoolId = useAuthStore((s) => s.schoolId);
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === "dark";
  const t = getTokens(isDark);

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

  const schoolName = useSchoolName();
  const expenses = monthPack?.rows ?? [];
  const recorderNames = monthPack?.names ?? new Map<string, string>();
  const periodTitle = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

  function handleOpenVoucher(r: ExpenseRow) {
    const data: ExpenseReceiptData = {
      referenceNumber: r.reference_number ?? "—",
      schoolName,
      categoryName: r.category_name ?? "—",
      description: r.description ?? "",
      amount: Number(r.amount ?? 0),
      paymentMethod: r.payment_method ?? "other",
      expenseDate: r.expense_date ?? "",
      recordedBy: r.recorded_by ? recorderNames.get(r.recorded_by) ?? "—" : "—",
      recordedAt: r.created_at ? new Date(r.created_at).toLocaleString() : undefined,
      status: r.status ?? "pending",
      salaryPeriodLabel: r.salary_period_label ?? null,
    };
    printExpenseReceipt(data);
  }

  const categories = useMemo(() => {
    const seen = new Set<string>();
    expenses.forEach((r) => {
      if (r.category_name) seen.add(r.category_name);
    });
    return Array.from(seen).sort();
  }, [expenses]);

  const { totalExpenses, approvedTotal, pendingTotal } = useMemo(() => {
    let approvedTotal = 0;
    let pendingTotal = 0;
    for (const r of expenses) {
      const amt = Number(r.amount || 0);
      if (r.status === "approved" || r.status === "paid") approvedTotal += amt;
      else pendingTotal += amt;
    }
    return { totalExpenses: approvedTotal + pendingTotal, approvedTotal, pendingTotal };
  }, [expenses]);

  const teacherPaidTotal = useMemo(() => {
    return teacherRollup.reduce((sum, r) => sum + Number(r.paid_amount || 0), 0);
  }, [teacherRollup]);

  const teachersCoveredCount = useMemo(() => {
    return teacherRollup.filter((tr) => tr.paid_for_period).length;
  }, [teacherRollup]);

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

  const filteredTotal = useMemo(
    () => sorted.reduce((s, r) => s + Number((r as unknown as ExpenseRow).amount || 0), 0),
    [sorted]
  );

  function doExportPdf() {
    exportToPdf({
      title: `Expenses — ${periodTitle}`,
      subtitle: `${categoryFilter !== "all" ? `Category: ${categoryFilter}` : "All categories"} · ${statusFilter !== "all" ? `Status: ${statusFilter}` : "All statuses"}`,
      schoolName,
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
      schoolName,
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
    <div className="w-full space-y-6 pb-12" style={{ fontFamily: INTER }}>
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="text-[10.5px] font-bold uppercase tracking-[0.2em]"
              style={{ color: t.mint, fontFamily: SORA }}
            >
              FINANCE & TREASURY
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: t.glowA, color: t.mint, border: `1px solid ${t.mintRing}` }}
            >
              DISBURSEMENTS
            </span>
          </div>
          <h1
            className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl"
            style={{ color: t.textHi, fontFamily: SORA }}
          >
            School Expenses &amp; Disbursements
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm" style={{ color: t.textMid }}>
            Staff payroll, utility payments, operations, and procurement vouchers for {periodTitle}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {openRecordExpense && (
            <button
              type="button"
              onClick={() => openRecordExpense()}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all hover:scale-[1.02]"
              style={{
                background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
                color: t.ctaText,
                boxShadow: `0 4px 14px ${t.glowA}`,
              }}
            >
              <Plus className="h-4 w-4" />
              Record Expense
            </button>
          )}

          <button
            type="button"
            onClick={doExportPdf}
            className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all"
            style={{
              background: t.panel,
              border: `1px solid ${t.stroke}`,
              color: t.textHi,
            }}
          >
            <Download className="h-3.5 w-3.5" style={{ color: t.mint }} />
            PDF
          </button>

          <button
            type="button"
            onClick={doExportExcel}
            className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all"
            style={{
              background: t.panel,
              border: `1px solid ${t.stroke}`,
              color: t.textHi,
            }}
          >
            <FileText className="h-3.5 w-3.5" style={{ color: t.blue }} />
            Excel
          </button>
        </div>
      </div>

      {/* 4-Card POS Summary Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Card 1: Total Monthly Outflow */}
        <div
          className="relative overflow-hidden rounded-2xl p-4 transition-all"
          style={{
            background: cardGrad(t, "amber"),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Total Expenses
            </span>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ background: t.goldDim, color: t.gold }}
            >
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold tabular-nums truncate" style={{ color: t.gold, fontFamily: SORA }}>
            {fmt(totalExpenses)} <span className="text-xs font-normal">UGX</span>
          </div>
          <p className="mt-0.5 text-[11px]" style={{ color: t.textLow }}>
            Total outflows in {periodTitle}
          </p>
        </div>

        {/* Card 2: Approved / Paid */}
        <div
          className="relative overflow-hidden rounded-2xl p-4 transition-all"
          style={{
            background: cardGrad(t, "emerald"),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Approved / Paid
            </span>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ background: t.mintDim, color: t.mint }}
            >
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold tabular-nums truncate" style={{ color: t.mint, fontFamily: SORA }}>
            {fmt(approvedTotal)} <span className="text-xs font-normal">UGX</span>
          </div>
          <p className="mt-0.5 text-[11px]" style={{ color: t.textLow }}>
            Disbursed &amp; settled vouchers
          </p>
        </div>

        {/* Card 3: Pending Approval */}
        <div
          className="relative overflow-hidden rounded-2xl p-4 transition-all"
          style={{
            background: cardGrad(t, "purple"),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Pending Vouchers
            </span>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ background: t.deepDim, color: t.deep }}
            >
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold tabular-nums truncate" style={{ color: t.deep, fontFamily: SORA }}>
            {fmt(pendingTotal)} <span className="text-xs font-normal">UGX</span>
          </div>
          <p className="mt-0.5 text-[11px]" style={{ color: t.textLow }}>
            Awaiting clearance / approval
          </p>
        </div>

        {/* Card 4: Teacher Salary Allocation */}
        <div
          className="relative overflow-hidden rounded-2xl p-4 transition-all"
          style={{
            background: cardGrad(t, "blue"),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Teacher Payroll
            </span>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ background: t.blueDim, color: t.blue }}
            >
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold tabular-nums truncate" style={{ color: t.blue, fontFamily: SORA }}>
            {fmt(teacherPaidTotal)} <span className="text-xs font-normal">UGX</span>
          </div>
          <p className="mt-0.5 text-[11px]" style={{ color: t.textLow }}>
            {teachersCoveredCount} of {teacherRollup.length} teachers covered
          </p>
        </div>
      </div>

      {/* Period Picker Bar */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
        style={{
          background: t.panel,
          border: `1px solid ${t.stroke}`,
        }}
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" style={{ color: t.mint }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: t.textLow }}>
            Reporting Period:
          </span>
          <span className="text-sm font-semibold" style={{ color: t.textHi, fontFamily: SORA }}>
            {periodTitle}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div>
            <select
              value={viewMonth}
              onChange={(e) => setViewMonth(Number(e.target.value))}
              className="rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none"
              style={{
                background: t.fieldBg,
                border: `1px solid ${t.stroke}`,
                color: t.textHi,
              }}
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={name} value={i}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <input
              type="number"
              min={2020}
              max={2100}
              value={viewYear}
              onChange={(e) => setViewYear(Number(e.target.value))}
              className="w-24 rounded-xl px-3 py-1.5 text-xs font-semibold tabular-nums focus:outline-none"
              style={{
                background: t.fieldBg,
                border: `1px solid ${t.stroke}`,
                color: t.textHi,
              }}
            />
          </div>
        </div>
      </div>

      {/* Teacher Salary Rollup */}
      <div
        className="overflow-hidden rounded-2xl"
        style={{
          background: t.panel,
          border: `1px solid ${t.stroke}`,
        }}
      >
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-b p-4 sm:px-6"
          style={{ borderColor: t.divider }}
        >
          <div>
            <h2 className="text-sm font-bold" style={{ color: t.textHi, fontFamily: SORA }}>
              Teacher Salaries Rollup — {periodTitle}
            </h2>
            <p className="text-xs" style={{ color: t.textMid }}>
              Expected compensation versus disbursed payment vouchers for teaching staff.
            </p>
          </div>
          <span
            className="rounded-lg px-2.5 py-1 text-xs font-semibold"
            style={{ background: t.fieldBg, color: t.mint }}
          >
            {teachersCoveredCount} Fully Disbursed
          </span>
        </div>

        {rollupLoading ? (
          <div className="p-8 text-center text-xs" style={{ color: t.textMid }}>
            Loading teacher salary schedule…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: t.divider, background: t.fieldBg }}>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
                    Teacher
                  </th>
                  <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
                    Expected (UGX)
                  </th>
                  <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
                    Paid This Period (UGX)
                  </th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
                    Coverage Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: t.divider }}>
                {teacherRollup.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center" style={{ color: t.textMid }}>
                      No teacher records found for this period.
                    </td>
                  </tr>
                ) : (
                  teacherRollup.map((teacher) => (
                    <tr
                      key={teacher.teacher_id}
                      className="transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <td className="px-4 py-3 font-semibold" style={{ color: t.textHi }}>
                        {teacher.name}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums" style={{ color: t.textMid }}>
                        {teacher.expected_salary != null ? fmt(teacher.expected_salary) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums" style={{ color: t.mint }}>
                        {fmt(teacher.paid_amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                          style={{
                            background: teacher.paid_for_period ? t.mintDim : t.fieldBg,
                            color: teacher.paid_for_period ? t.mint : t.textLow,
                            border: `1px solid ${teacher.paid_for_period ? t.mintRing : t.stroke}`,
                          }}
                        >
                          {teacher.paid_for_period ? "Covered" : "Partial / Unpaid"}
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

      {/* Transactions Register */}
      <div
        className="overflow-hidden rounded-2xl"
        style={{
          background: t.panel,
          border: `1px solid ${t.stroke}`,
        }}
      >
        <div
          className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:px-6"
          style={{ borderColor: t.divider }}
        >
          <div>
            <h2 className="text-sm font-bold" style={{ color: t.textHi, fontFamily: SORA }}>
              Expense Ledger &amp; Transactions — {periodTitle}
            </h2>
            <p className="text-xs" style={{ color: t.textMid }}>
              Itemized operating expenses, vouchers, and procurement entries.
            </p>
          </div>
        </div>

        {/* Filters Bar */}
        <div
          className="flex flex-wrap items-center gap-3 border-b p-4"
          style={{ borderColor: t.divider, background: t.fieldBg }}
        >
          <div className="relative min-w-[200px] flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: t.textLow }}
            />
            <input
              type="text"
              placeholder="Search description, category, reference number…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-xl pl-10 pr-4 py-2 text-xs font-medium focus:outline-none"
              style={{
                background: t.panel,
                border: `1px solid ${t.stroke}`,
                color: t.textHi,
              }}
            />
          </div>

          {categories.length > 1 && (
            <div className="relative">
              <Filter
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                style={{ color: t.textLow }}
              />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-xl pl-8 pr-6 py-2 text-xs font-medium focus:outline-none"
                style={{
                  background: t.panel,
                  border: `1px solid ${t.stroke}`,
                  color: t.textHi,
                }}
              >
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter Tabs */}
          <div
            className="flex items-center gap-1 rounded-xl p-1"
            style={{ background: t.panel, border: `1px solid ${t.stroke}` }}
          >
            {["all", "approved", "paid", "pending"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className="rounded-lg px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors"
                style={{
                  background: statusFilter === s ? t.mintDim : "transparent",
                  color: statusFilter === s ? t.mint : t.textMid,
                }}
              >
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs" style={{ color: t.textMid }}>
            Loading expenditures…
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: t.divider, background: t.fieldBg }}>
                    <Th label="Date" sortKey="expense_date" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: t.textLow }}>
                      Reference #
                    </th>
                    <Th label="Description" sortKey="description" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <Th label="Category" sortKey="category_name" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <Th label="Amount (UGX)" sortKey="amount" currentKey={sortKey} dir={sortDir} onSort={toggleSort} right />
                    <Th label="Status" sortKey="status" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: t.textLow }}>
                      Recorded By
                    </th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider text-right" style={{ color: t.textLow }}>
                      Voucher
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: t.divider }}>
                  {sorted.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-0">
                        <PosEmptyState
                          icon={<FileText size={28} />}
                          title={expenses.length === 0 ? `No Expenses in ${periodTitle}` : "No Expenses Match Filters"}
                          description={
                            expenses.length === 0
                              ? "No expense vouchers or disbursements recorded for this month yet. Record a new expenditure to populate this ledger."
                              : "Try clearing your search query or selecting a different status/category filter."
                          }
                          accentColor="blue"
                          action={
                            openRecordExpense
                              ? {
                                  label: "Record Expense",
                                  onClick: openRecordExpense,
                                  icon: <Plus size={16} />,
                                }
                              : undefined
                          }
                          minHeight={260}
                        />
                      </td>
                    </tr>
                  ) : (
                    sorted.map((row) => {
                      const r = row as unknown as ExpenseRow;
                      const isPaid = r.status === "approved" || r.status === "paid";
                      return (
                        <tr
                          key={r.expense_id}
                          className="transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                        >
                          <td className="px-4 py-3 tabular-nums whitespace-nowrap" style={{ color: t.textMid }}>
                            {r.expense_date}
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] whitespace-nowrap" style={{ color: t.textMid }}>
                            {r.reference_number || "—"}
                          </td>
                          <td className="max-w-[240px] truncate px-4 py-3 font-medium" style={{ color: t.textHi }} title={r.description}>
                            {r.description}
                          </td>
                          <td className="max-w-[180px] truncate px-4 py-3" style={{ color: t.textMid }} title={r.category_name}>
                            {r.category_name}
                          </td>
                          <td className="px-4 py-3 text-right font-bold tabular-nums whitespace-nowrap" style={{ color: t.textHi }}>
                            {fmt(Number(r.amount))}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className="inline-flex rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold capitalize"
                              style={{
                                background: isPaid ? t.mintDim : t.goldDim,
                                color: isPaid ? t.mint : t.gold,
                                border: `1px solid ${isPaid ? t.mintRing : t.gold}`,
                              }}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[11px] whitespace-nowrap" style={{ color: t.textMid }}>
                            {r.recorded_by ? recorderNames.get(r.recorded_by) || "—" : "—"}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleOpenVoucher(r)}
                              className="inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                              style={{ color: t.mint }}
                            >
                              <span>Voucher</span>
                              <ExternalLink className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div
              className="flex flex-wrap items-center justify-between border-t p-4"
              style={{ borderColor: t.divider, background: t.fieldBg }}
            >
              <p className="text-xs" style={{ color: t.textMid }}>
                {sorted.length} transaction{sorted.length !== 1 ? "s" : ""}
                {expenses.length !== sorted.length ? ` (of ${expenses.length} total)` : ""}
              </p>
              <p className="text-xs font-bold tabular-nums" style={{ color: t.textHi, fontFamily: SORA }}>
                Filtered Total: {fmt(filteredTotal)} UGX
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
