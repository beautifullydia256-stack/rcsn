import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, Download, FileText, AlertTriangle } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { fetchDebtors, OUTSTANDING_QUERY_KEY } from "./api/outstanding";
import { useSort, Th } from "../../lib/useSort";
import { exportToPdf, exportToExcel } from "../../lib/exportUtils";
import { schoolCalendarTodayIso } from "../../lib/schoolCalendarDate";

const STALE_MS = 2 * 60 * 1000;
type OutletContext = { openRecordPayment: (initialStudentId?: string) => void };

function fmt(n: number) { return n.toLocaleString("en-US", { maximumFractionDigits: 0 }); }

export default function AccountantOutstandingPage() {
  const { openRecordPayment } = useOutletContext() as OutletContext;
  const schoolId = useAuthStore((s) => s.schoolId);
  const [q, setQ] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [agingFilter, setAgingFilter] = useState<"all" | "overdue">("all");

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: [...OUTSTANDING_QUERY_KEY, schoolId],
    queryFn: () => fetchDebtors(schoolId!),
    enabled: !!schoolId,
    staleTime: STALE_MS,
    gcTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: true,
  });

  const todayIso = schoolCalendarTodayIso();

  const classes = useMemo(() => {
    const seen = new Set<string>();
    rows.forEach((r) => { if (r.current_class) seen.add(r.current_class); });
    return Array.from(seen).sort();
  }, [rows]);

  const { totalOwing, totalOverdue, overdueCount } = useMemo(() => {
    let totalOwing = 0, totalOverdue = 0, overdueCount = 0;
    for (const r of rows) {
      totalOwing += r.balance;
      if (r.days_overdue > 0) { totalOverdue += r.balance; overdueCount++; }
    }
    return { totalOwing, totalOverdue, overdueCount };
  }, [rows]);

  const filtered = useMemo(() => {
    let res = rows;
    if (classFilter !== "all") res = res.filter((r) => r.current_class === classFilter);
    if (agingFilter === "overdue") res = res.filter((r) => r.days_overdue > 0);
    if (q.trim()) {
      const s = q.toLowerCase();
      res = res.filter(
        (r) =>
          r.student_name.toLowerCase().includes(s) ||
          r.current_class.toLowerCase().includes(s) ||
          r.term_label.toLowerCase().includes(s) ||
          (r.invoice_number?.toLowerCase().includes(s))
      );
    }
    return res;
  }, [rows, classFilter, agingFilter, q]);

  const { sortKey, sortDir, sorted, toggleSort } = useSort(
    filtered as unknown as Record<string, unknown>[],
    "balance",
    "desc"
  );

  const filteredTotal = useMemo(() => sorted.reduce((s, r) => s + Number((r as unknown as typeof rows[number]).balance), 0), [sorted]);

  const subtitleForExport = `As of ${todayIso}${classFilter !== "all" ? ` · Class: ${classFilter}` : ""}${agingFilter === "overdue" ? " · Overdue only" : ""}`;

  function doExportPdf() {
    exportToPdf({
      title: "Outstanding Fees",
      subtitle: subtitleForExport,
      columns: [
        { header: "Student", key: "student_name", width: 36 },
        { header: "Class", key: "current_class", width: 18 },
        { header: "Term", key: "term_label", width: 28 },
        { header: "Invoice #", key: "invoice_number", width: 24 },
        { header: "Expected", key: "total_fees", width: 20, align: "right", format: (v) => fmt(Number(v || 0)) },
        { header: "Paid", key: "amount_paid", width: 20, align: "right", format: (v) => fmt(Number(v || 0)) },
        { header: "Balance", key: "balance", width: 20, align: "right", format: (v) => fmt(Number(v || 0)) },
        { header: "Overdue (days)", key: "days_overdue", width: 20, align: "right", format: (v) => Number(v) > 0 ? String(v) : "—" },
      ],
      rows: sorted as unknown as Record<string, unknown>[],
      filename: `outstanding-fees-${todayIso}`,
      totalsRow: ["TOTAL", "", "", "", "", "", fmt(filteredTotal) + " UGX", ""],
    });
  }

  function doExportExcel() {
    exportToExcel({
      title: "Outstanding Fees",
      subtitle: subtitleForExport,
      columns: [
        { header: "Student", key: "student_name", width: 28 },
        { header: "Class", key: "current_class", width: 14 },
        { header: "Term", key: "term_label", width: 22 },
        { header: "Invoice #", key: "invoice_number", width: 20 },
        { header: "Expected (UGX)", key: "total_fees", width: 18, align: "right", format: (v) => fmt(Number(v || 0)) },
        { header: "Paid (UGX)", key: "amount_paid", width: 16, align: "right", format: (v) => fmt(Number(v || 0)) },
        { header: "Balance (UGX)", key: "balance", width: 16, align: "right", format: (v) => fmt(Number(v || 0)) },
        { header: "Days Overdue", key: "days_overdue", width: 14, align: "right", format: (v) => Number(v) > 0 ? String(v) : "—" },
      ],
      rows: sorted as unknown as Record<string, unknown>[],
      filename: `outstanding-fees-${todayIso}`,
      totalsRow: ["TOTAL", "", "", "", "", "", fmt(filteredTotal) + " UGX", ""],
    });
  }

  return (
    <div className="ac-page-content mx-auto max-w-7xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="ac-text-primary text-2xl font-semibold">Outstanding Fees</h1>
          <p className="ac-text-secondary mt-0.5 text-sm">Students with unpaid balances across all terms.</p>
        </div>
        <div className="flex items-center gap-2">
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
          <p className="ac-text-muted text-xs font-medium">Students owing</p>
          <p className="ac-text-primary mt-1 text-lg font-bold tabular-nums">{rows.length}</p>
        </div>
        <div className="ac-glass-card rounded-2xl px-4 py-3">
          <p className="ac-text-muted text-xs font-medium">Total outstanding</p>
          <p className="ac-text-primary mt-1 text-lg font-bold tabular-nums">
            {fmt(totalOwing)}<span className="ac-text-muted ml-1 text-xs font-normal">UGX</span>
          </p>
        </div>
        <div className="ac-glass-card rounded-2xl px-4 py-3">
          <p className="ac-text-muted text-xs font-medium">Overdue ({overdueCount} students)</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-amber-500">
            {fmt(totalOverdue)}<span className="ml-1 text-xs font-normal text-amber-400">UGX</span>
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ac-text-muted" />
          <input
            type="text"
            placeholder="Search student, class, term, invoice…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="ac-input w-full pl-9"
          />
        </div>
        {/* Aging toggle */}
        <div className="flex items-center gap-1 ac-glass-card rounded-xl p-1">
          {(["all", "overdue"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setAgingFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${agingFilter === f ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "ac-text-muted hover:ac-text-secondary"}`}
            >
              {f === "all" ? "All" : "Overdue only"}
            </button>
          ))}
        </div>
        {classes.length > 1 && (
          <div className="relative">
            <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ac-text-muted" />
            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="ac-input pl-8 pr-6 text-sm">
              <option value="all">All classes</option>
              {classes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="ac-glass-card overflow-hidden rounded-[18px]">
        {!schoolId ? (
          <div className="ac-text-muted p-10 text-center text-sm">No school context.</div>
        ) : isLoading ? (
          <div className="ac-text-muted p-10 text-center text-sm">Loading outstanding fees…</div>
        ) : isError ? (
          <div className="ac-text-muted p-10 text-center text-sm">Could not load data.</div>
        ) : sorted.length === 0 ? (
          <div className="ac-text-muted p-10 text-center text-sm">
            {rows.length === 0 ? "No outstanding balances. All students are up to date." : "No records match your filters."}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="ac-table-header">
                    <Th label="Student" sortKey="student_name" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <Th label="Class" sortKey="current_class" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <Th label="Term" sortKey="term_label" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <th className="px-4 py-3 text-left font-semibold ac-text-muted whitespace-nowrap">Invoice #</th>
                    <Th label="Expected" sortKey="total_fees" currentKey={sortKey} dir={sortDir} onSort={toggleSort} right />
                    <Th label="Paid" sortKey="amount_paid" currentKey={sortKey} dir={sortDir} onSort={toggleSort} right />
                    <Th label="Balance (UGX)" sortKey="balance" currentKey={sortKey} dir={sortDir} onSort={toggleSort} right />
                    <Th label="Overdue" sortKey="days_overdue" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <th className="px-4 py-3 text-left font-semibold ac-text-muted">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y ac-table-divider">
                  {sorted.map((row) => {
                    const r = row as unknown as typeof rows[number];
                    return (
                      <tr key={`${r.student_id}-${r.term_id}`} className="ac-table-row">
                        <td className="ac-cell-primary px-4 py-3 font-medium whitespace-nowrap">{r.student_name}</td>
                        <td className="px-4 py-3 ac-text-secondary whitespace-nowrap">{r.current_class}</td>
                        <td className="px-4 py-3 ac-text-secondary whitespace-nowrap">{r.term_label}</td>
                        <td className="px-4 py-3 font-mono ac-text-secondary text-xs whitespace-nowrap">{r.invoice_number ?? "—"}</td>
                        <td className="px-4 py-3 ac-text-secondary text-right tabular-nums whitespace-nowrap">{fmt(r.total_fees)}</td>
                        <td className="px-4 py-3 ac-text-secondary text-right tabular-nums whitespace-nowrap">{fmt(r.amount_paid)}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-amber-500 whitespace-nowrap">{fmt(r.balance)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {r.days_overdue > 0 ? (
                            <span className="inline-flex items-center gap-1 text-amber-400 text-xs font-medium">
                              <AlertTriangle className="h-3 w-3" />{r.days_overdue}d
                            </span>
                          ) : (
                            <span className="ac-text-muted text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openRecordPayment(r.student_id)}
                            className="text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 text-xs font-semibold hover:underline"
                          >
                            Record payment
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t ac-table-divider px-4 py-3">
              <p className="ac-text-muted text-xs">
                {sorted.length} student{sorted.length !== 1 ? "s" : ""}
                {rows.length !== sorted.length ? ` (of ${rows.length} total)` : ""}
              </p>
              <p className="text-sm font-semibold tabular-nums text-amber-500">Outstanding: {fmt(filteredTotal)} UGX</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
