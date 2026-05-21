import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, Download, FileText, TrendingUp, TrendingDown } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { fetchReceipts, RECEIPTS_QUERY_KEY } from "./api/receipts";
import { fetchExpenses, EXPENSES_QUERY_KEY } from "./api/expenses";
import { schoolCalendarTodayIso, addCalendarDaysToIsoYmd, firstDayOfMonthIsoYmd } from "../../lib/schoolCalendarDate";
import { useSort, Th } from "../../lib/useSort";
import { exportToPdf, exportToExcel } from "../../lib/exportUtils";

const STALE_MS = 2 * 60 * 1000;

function fmt(n: number) { return n.toLocaleString("en-US", { maximumFractionDigits: 0 }); }

type EntryType = "payment" | "expense";
type DateFilter = "today" | "week" | "month" | "all";

type CashbookEntry = {
  id: string;
  date: string;
  type: EntryType;
  description: string;
  cashIn: number;
  cashOut: number;
  balance: number;
};

export default function BankPage() {
  const schoolId = useAuthStore((s) => s.schoolId);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | EntryType>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  const { data: receiptsData, isLoading: receiptsLoading } = useQuery({
    queryKey: [...RECEIPTS_QUERY_KEY, schoolId],
    queryFn: () => fetchReceipts(schoolId!),
    enabled: !!schoolId,
    staleTime: STALE_MS,
    gcTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const { data: expenseRows = [], isLoading: expensesLoading } = useQuery({
    queryKey: [...EXPENSES_QUERY_KEY, schoolId],
    queryFn: () => fetchExpenses(schoolId!),
    enabled: !!schoolId,
    staleTime: STALE_MS,
    gcTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const isLoading = receiptsLoading || expensesLoading;
  const schoolName = receiptsData?.schoolName ?? "";

  const todayIso = schoolCalendarTodayIso();
  const weekStartIso = addCalendarDaysToIsoYmd(todayIso, -7);
  const monthStartIso = firstDayOfMonthIsoYmd(todayIso);

  // Build full cashbook with running balance (chronological asc, then we reverse for display)
  const allEntries = useMemo((): CashbookEntry[] => {
    if (!receiptsData) return [];
    const payments = receiptsData.payments;
    const studentMap = receiptsData.studentMap;
    const entries: Omit<CashbookEntry, "balance">[] = [];

    payments.forEach((p) => {
      const name = studentMap[p.student_id]?.name ?? "—";
      entries.push({
        id: p.payment_id,
        date: p.payment_date || todayIso,
        type: "payment",
        description: `Payment — ${name}${p.receipt_number ? ` (${p.receipt_number})` : ""}`,
        cashIn: Number(p.amount_paid || 0),
        cashOut: 0,
      });
    });

    expenseRows
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

    entries.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    let running = 0;
    return entries.map((e) => {
      running += e.cashIn - e.cashOut;
      return { ...e, balance: running };
    });
  }, [receiptsData, expenseRows, todayIso]);

  // Summary totals from all entries
  const { totalIn, totalOut, netBalance } = useMemo(() => {
    let totalIn = 0, totalOut = 0;
    for (const e of allEntries) { totalIn += e.cashIn; totalOut += e.cashOut; }
    return { totalIn, totalOut, netBalance: totalIn - totalOut };
  }, [allEntries]);

  // Apply filters (reverse for newest-first display)
  const filtered = useMemo(() => {
    let res = [...allEntries].reverse();
    if (dateFilter !== "all") {
      const cutoff = dateFilter === "today" ? todayIso : dateFilter === "week" ? weekStartIso : monthStartIso;
      const exact = dateFilter === "today";
      res = res.filter((e) => exact ? e.date === cutoff : e.date >= cutoff);
    }
    if (typeFilter !== "all") res = res.filter((e) => e.type === typeFilter);
    if (q.trim()) {
      const s = q.toLowerCase();
      res = res.filter((e) => e.description.toLowerCase().includes(s));
    }
    return res;
  }, [allEntries, dateFilter, typeFilter, q, todayIso, weekStartIso, monthStartIso]);

  const { sortKey, sortDir, sorted, toggleSort } = useSort(
    filtered as unknown as Record<string, unknown>[],
    "date",
    "desc"
  );

  const subtitleForExport = `${dateFilter === "today" ? "Today" : dateFilter === "week" ? "Last 7 days" : dateFilter === "month" ? "This month" : "All time"} · ${typeFilter === "all" ? "All transactions" : typeFilter === "payment" ? "Income only" : "Expenses only"}`;

  function doExportPdf() {
    exportToPdf({
      title: "Bank & Cash — Cashbook",
      subtitle: subtitleForExport,
      schoolName,
      columns: [
        { header: "Date", key: "date", width: 22 },
        { header: "Type", key: "type", width: 16 },
        { header: "Description", key: "description", width: 70 },
        { header: "Cash In (UGX)", key: "cashIn", width: 24, align: "right", format: (v) => Number(v) > 0 ? fmt(Number(v)) : "—" },
        { header: "Cash Out (UGX)", key: "cashOut", width: 24, align: "right", format: (v) => Number(v) > 0 ? fmt(Number(v)) : "—" },
        { header: "Balance (UGX)", key: "balance", width: 24, align: "right", format: (v) => fmt(Number(v)) },
      ],
      rows: sorted as unknown as Record<string, unknown>[],
      filename: `cashbook-${todayIso}`,
    });
  }

  function doExportExcel() {
    exportToExcel({
      title: "Bank & Cash — Cashbook",
      subtitle: subtitleForExport,
      schoolName,
      columns: [
        { header: "Date", key: "date", width: 16 },
        { header: "Type", key: "type", width: 12 },
        { header: "Description", key: "description", width: 48 },
        { header: "Cash In (UGX)", key: "cashIn", width: 18, align: "right", format: (v) => Number(v) > 0 ? fmt(Number(v)) : "" },
        { header: "Cash Out (UGX)", key: "cashOut", width: 18, align: "right", format: (v) => Number(v) > 0 ? fmt(Number(v)) : "" },
        { header: "Balance (UGX)", key: "balance", width: 18, align: "right", format: (v) => fmt(Number(v)) },
      ],
      rows: sorted as unknown as Record<string, unknown>[],
      filename: `cashbook-${todayIso}`,
    });
  }

  return (
    <div className="ac-page-content mx-auto max-w-7xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="ac-text-primary text-2xl font-semibold">Bank & Cash</h1>
          <p className="ac-text-secondary mt-0.5 text-sm">Chronological cashbook: fee income and approved expenses. Running balance.</p>
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
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            <p className="ac-text-muted text-xs font-medium">Total income</p>
          </div>
          <p className="mt-1 text-lg font-bold tabular-nums text-emerald-500">
            {fmt(totalIn)}<span className="ml-1 text-xs font-normal text-emerald-400">UGX</span>
          </p>
        </div>
        <div className="ac-glass-card rounded-2xl px-4 py-3">
          <div className="flex items-center gap-1.5">
            <TrendingDown className="h-3.5 w-3.5 text-amber-500" />
            <p className="ac-text-muted text-xs font-medium">Total expenses</p>
          </div>
          <p className="mt-1 text-lg font-bold tabular-nums text-amber-500">
            {fmt(totalOut)}<span className="ml-1 text-xs font-normal text-amber-400">UGX</span>
          </p>
        </div>
        <div className="ac-glass-card rounded-2xl px-4 py-3">
          <p className="ac-text-muted text-xs font-medium">Net balance</p>
          <p className={`mt-1 text-lg font-bold tabular-nums ${netBalance >= 0 ? "ac-text-primary" : "text-red-500"}`}>
            {fmt(netBalance)}<span className="ac-text-muted ml-1 text-xs font-normal">UGX</span>
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ac-text-muted" />
          <input
            type="text"
            placeholder="Search description…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="ac-input w-full pl-9"
          />
        </div>
        <div className="flex items-center gap-1 ac-glass-card rounded-xl p-1">
          {(["today", "week", "month", "all"] as DateFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setDateFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${dateFilter === f ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "ac-text-muted hover:ac-text-secondary"}`}
            >
              {f === "today" ? "Today" : f === "week" ? "7 days" : f === "month" ? "Month" : "All"}
            </button>
          ))}
        </div>
        <div className="relative">
          <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ac-text-muted" />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)} className="ac-input pl-8 pr-6 text-sm">
            <option value="all">All transactions</option>
            <option value="payment">Income only</option>
            <option value="expense">Expenses only</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="ac-glass-card overflow-hidden rounded-[18px]">
        {isLoading ? (
          <div className="ac-text-muted p-10 text-center text-sm">Loading cashbook…</div>
        ) : sorted.length === 0 ? (
          <div className="ac-text-muted p-10 text-center text-sm">
            {allEntries.length === 0 ? "No transactions yet." : "No transactions match your filters."}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="ac-table-header">
                    <Th label="Date" sortKey="date" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <Th label="Type" sortKey="type" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <Th label="Description" sortKey="description" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <Th label="Cash In (UGX)" sortKey="cashIn" currentKey={sortKey} dir={sortDir} onSort={toggleSort} right />
                    <Th label="Cash Out (UGX)" sortKey="cashOut" currentKey={sortKey} dir={sortDir} onSort={toggleSort} right />
                    <Th label="Balance (UGX)" sortKey="balance" currentKey={sortKey} dir={sortDir} onSort={toggleSort} right />
                  </tr>
                </thead>
                <tbody className="divide-y ac-table-divider">
                  {sorted.map((row) => {
                    const e = row as unknown as CashbookEntry;
                    return (
                      <tr key={e.id} className="ac-table-row">
                        <td className="px-4 py-3 tabular-nums ac-text-secondary whitespace-nowrap">{e.date}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${e.type === "payment" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"}`}>
                            {e.type === "payment" ? "Income" : "Expense"}
                          </span>
                        </td>
                        <td className="ac-cell-primary px-4 py-3 max-w-[300px] truncate" title={e.description}>{e.description}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {e.cashIn > 0 ? fmt(e.cashIn) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-amber-600 dark:text-amber-400 whitespace-nowrap">
                          {e.cashOut > 0 ? fmt(e.cashOut) : "—"}
                        </td>
                        <td className={`px-4 py-3 text-right tabular-nums font-semibold whitespace-nowrap ${e.balance >= 0 ? "ac-cell-primary" : "text-red-500"}`}>
                          {fmt(e.balance)}
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
                {allEntries.length !== sorted.length ? ` (of ${allEntries.length} total)` : ""}
              </p>
              <p className="ac-text-primary text-sm font-semibold tabular-nums">
                Net: {fmt(sorted.reduce((s, e) => s + (e as unknown as CashbookEntry).cashIn - (e as unknown as CashbookEntry).cashOut, 0))} UGX
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
