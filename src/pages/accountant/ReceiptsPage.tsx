import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Search, Filter, Download } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { fetchReceipts, RECEIPTS_QUERY_KEY } from "./api/receipts";
import { formatReceiptDateTime, printReceipt, type PaymentReceiptData } from "../../components/accountant/PaymentReceipt";
import { schoolCalendarTodayIso, addCalendarDaysToIsoYmd, firstDayOfMonthIsoYmd } from "../../lib/schoolCalendarDate";
import { useSort, Th } from "../../lib/useSort";
import { exportToPdf, exportToExcel } from "../../lib/exportUtils";

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash", bank: "Bank", mobile_money: "Mobile Money",
  cheque: "Cheque", pos: "POS / Card", online: "Online",
  school_pay: "School Pay", sure_pay: "Sure Pay", other: "Other",
};
function methodLabel(raw: string | null | undefined) {
  const k = String(raw ?? "").trim().toLowerCase();
  return METHOD_LABELS[k] ?? String(raw ?? "—").replace(/_/g, " ");
}
function fmt(n: number) { return n.toLocaleString("en-US", { maximumFractionDigits: 0 }); }

type DateFilter = "today" | "week" | "month" | "all";
const STALE_MS = 2 * 60 * 1000;

type ReceiptGroup = {
  key: string;
  receipt_number: string | null;
  student_name: string;
  current_class: string;
  term_label: string;
  total: number;
  date: string;
  method: string;
  rows: ReturnType<typeof fetchReceipts> extends Promise<infer R> ? R extends { payments: Array<infer P> } ? P[] : never : never;
};

export default function ReceiptsPage() {
  const schoolId = useAuthStore((s) => s.schoolId);
  const [q, setQ] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [...RECEIPTS_QUERY_KEY, schoolId],
    queryFn: () => fetchReceipts(schoolId!),
    enabled: !!schoolId,
    staleTime: STALE_MS,
    gcTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  const payments = data?.payments ?? [];
  const studentMap = data?.studentMap ?? {};
  const termMap = data?.termMap ?? {};
  const schoolName = data?.schoolName ?? "";
  const schoolPhone = data?.schoolPhone;
  const schoolEmail = data?.schoolEmail;
  const recorderMap = data?.recorderMap ?? {};

  const todayIso = schoolCalendarTodayIso();
  const weekStartIso = addCalendarDaysToIsoYmd(todayIso, -7);
  const monthStartIso = firstDayOfMonthIsoYmd(todayIso);

  const { todayTotal, weekTotal, monthTotal } = useMemo(() => {
    let todayTotal = 0, weekTotal = 0, monthTotal = 0;
    for (const p of payments) {
      const d = p.payment_date ?? "";
      const amt = Number(p.amount_paid || 0);
      if (d === todayIso) todayTotal += amt;
      if (d >= weekStartIso) weekTotal += amt;
      if (d >= monthStartIso) monthTotal += amt;
    }
    return { todayTotal, weekTotal, monthTotal };
  }, [payments, todayIso, weekStartIso, monthStartIso]);

  const methods = useMemo(() => {
    const seen = new Set<string>();
    payments.forEach((p) => { if (p.payment_method) seen.add(p.payment_method.toLowerCase()); });
    return Array.from(seen).sort();
  }, [payments]);

  // Group by receipt_number
  const groups: ReceiptGroup[] = useMemo(() => {
    type Row = (typeof payments)[number];
    const map = new Map<string, Row[]>();
    payments.forEach((p) => {
      const key = p.receipt_number || p.payment_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return Array.from(map.entries()).map(([key, rows]) => {
      const sorted = [...rows].sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return ta - tb;
      });
      const first = sorted[0];
      const s = studentMap[first.student_id];
      const dates = rows.map((r) => r.payment_date).filter(Boolean) as string[];
      const date = dates.length ? dates.reduce((a, b) => (a >= b ? a : b)) : "";
      const total = rows.reduce((sum, r) => sum + Number(r.amount_paid || 0), 0);
      return {
        key,
        receipt_number: first.receipt_number,
        student_name: s?.name ?? "—",
        current_class: s?.current_class ?? "—",
        term_label: rows.length === 1 ? (termMap[first.term_id] ?? "—") : "Multiple terms",
        total,
        date,
        method: first.payment_method ?? "",
        rows: sorted,
      };
    });
  }, [payments, studentMap, termMap]);

  const filtered = useMemo(() => {
    let res = groups;
    if (dateFilter !== "all") {
      const cutoff = dateFilter === "today" ? todayIso : dateFilter === "week" ? weekStartIso : monthStartIso;
      const exact = dateFilter === "today";
      res = res.filter((g) => (exact ? g.date === cutoff : g.date >= cutoff));
    }
    if (methodFilter !== "all") {
      res = res.filter((g) => g.method.toLowerCase() === methodFilter);
    }
    if (q.trim()) {
      const s = q.toLowerCase();
      res = res.filter(
        (g) =>
          g.student_name.toLowerCase().includes(s) ||
          g.current_class.toLowerCase().includes(s) ||
          g.term_label.toLowerCase().includes(s) ||
          (g.receipt_number?.toLowerCase().includes(s))
      );
    }
    return res;
  }, [groups, dateFilter, methodFilter, q, todayIso, weekStartIso, monthStartIso]);

  const { sortKey, sortDir, sorted: sortedGroups, toggleSort } = useSort(
    filtered as unknown as Record<string, unknown>[],
    "date",
    "desc"
  );

  const filteredTotal = useMemo(() => sortedGroups.reduce((s, g) => s + Number((g as unknown as ReceiptGroup).total), 0), [sortedGroups]);

  function handleReprint(g: ReceiptGroup) {
    const first = g.rows[0];
    const remSource = g.rows.find((p) => {
      const v = p.receipt_total_remaining_balance;
      return v !== null && v !== undefined && String(v).trim() !== "";
    }) ?? first;
    const remRaw = remSource.receipt_total_remaining_balance;
    let totalRemainingBalance: number | undefined;
    if (remRaw !== null && remRaw !== undefined && String(remRaw).trim() !== "") {
      const n = typeof remRaw === "bigint" ? Number(remRaw) : Number(String(remRaw).replace(/,/g, ""));
      if (Number.isFinite(n)) totalRemainingBalance = Math.max(0, n);
    }
    const receiptData: PaymentReceiptData = {
      receiptNumber: first.receipt_number || first.payment_id,
      schoolName: schoolName.trim() || undefined,
      schoolPhone, schoolEmail,
      studentName: g.student_name,
      studentClass: g.current_class,
      termLabel: g.term_label,
      amountPaid: g.total,
      paymentMethod: first.payment_method ?? "cash",
      transactionTime: first.created_at
        ? formatReceiptDateTime(new Date(first.created_at))
        : g.date ? formatReceiptDateTime(new Date(g.date + "T12:00:00")) : "—",
      recordedBy: (first.recorded_by && recorderMap[first.recorded_by]) || "—",
      description: first.notes?.trim() || undefined,
      allocations: g.rows.map((r) => ({ termLabel: termMap[r.term_id] ?? "—", amountApplied: Number(r.amount_paid || 0) })),
      totalRemainingBalance,
    };
    printReceipt(receiptData);
  }

  const subtitleForExport = `${dateFilter === "today" ? "Today" : dateFilter === "week" ? "Last 7 days" : dateFilter === "month" ? "This month" : "All time"} · ${methodFilter === "all" ? "All methods" : methodLabel(methodFilter)}`;

  function doExportPdf() {
    exportToPdf({
      title: "Receipts",
      subtitle: subtitleForExport,
      schoolName,
      columns: [
        { header: "Receipt #", key: "receipt_number", width: 28 },
        { header: "Date", key: "date", width: 22 },
        { header: "Student", key: "student_name", width: 36 },
        { header: "Class", key: "current_class", width: 18 },
        { header: "Term", key: "term_label", width: 28 },
        { header: "Amount (UGX)", key: "total", width: 22, align: "right", format: (v) => fmt(Number(v || 0)) },
        { header: "Method", key: "method", width: 20, format: (v) => methodLabel(String(v ?? "")) },
      ],
      rows: sortedGroups as unknown as Record<string, unknown>[],
      filename: `receipts-${todayIso}`,
      totalsRow: ["TOTAL", "", "", "", "", fmt(filteredTotal) + " UGX", ""],
    });
  }

  function doExportExcel() {
    exportToExcel({
      title: "Receipts",
      subtitle: subtitleForExport,
      schoolName,
      columns: [
        { header: "Receipt #", key: "receipt_number", width: 22 },
        { header: "Date", key: "date", width: 16 },
        { header: "Student", key: "student_name", width: 28 },
        { header: "Class", key: "current_class", width: 14 },
        { header: "Term", key: "term_label", width: 22 },
        { header: "Amount (UGX)", key: "total", width: 18, align: "right", format: (v) => fmt(Number(v || 0)) },
        { header: "Method", key: "method", width: 16, format: (v) => methodLabel(String(v ?? "")) },
      ],
      rows: sortedGroups as unknown as Record<string, unknown>[],
      filename: `receipts-${todayIso}`,
      totalsRow: ["TOTAL", "", "", "", "", fmt(filteredTotal) + " UGX", ""],
    });
  }

  return (
    <div className="ac-page-content mx-auto max-w-7xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="ac-text-primary text-2xl font-semibold">Receipts</h1>
          <p className="ac-text-secondary mt-0.5 text-sm">Read-only archive of all fee payment receipts.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={doExportPdf}
              className="ac-glass-btn inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
            >
              <Download className="h-4 w-4" />
              PDF
            </button>
          </div>
          <button
            type="button"
            onClick={doExportExcel}
            className="ac-glass-btn inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
          >
            <FileText className="h-4 w-4" />
            Excel
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "Today", value: todayTotal },
          { label: "Last 7 days", value: weekTotal },
          { label: "This month", value: monthTotal },
        ].map(({ label, value }) => (
          <div key={label} className="ac-glass-card rounded-2xl px-4 py-3">
            <p className="ac-text-muted text-xs font-medium">{label}</p>
            <p className="ac-text-primary mt-1 text-lg font-bold tabular-nums">
              {fmt(value)}<span className="ac-text-muted ml-1 text-xs font-normal">UGX</span>
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ac-text-muted" />
          <input
            type="text"
            placeholder="Search student, class, term, receipt…"
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
        {methods.length > 1 && (
          <div className="relative">
            <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ac-text-muted" />
            <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className="ac-input pl-8 pr-6 text-sm">
              <option value="all">All methods</option>
              {methods.map((m) => <option key={m} value={m}>{methodLabel(m)}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="ac-glass-card overflow-hidden rounded-[18px]">
        {!schoolId ? (
          <div className="ac-text-muted p-10 text-center text-sm">No school context.</div>
        ) : isLoading ? (
          <div className="ac-text-muted p-10 text-center text-sm">Loading receipts…</div>
        ) : isError ? (
          <div className="ac-text-muted p-10 text-center text-sm">Could not load receipts.{error instanceof Error ? ` ${error.message}` : ""}</div>
        ) : sortedGroups.length === 0 ? (
          <div className="ac-text-muted p-10 text-center text-sm">
            {groups.length === 0 ? "No receipts yet. Record a payment on Payments to see it here." : "No receipts match your filters."}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="ac-table-header">
                    <Th label="Receipt #" sortKey="receipt_number" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <Th label="Date" sortKey="date" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <Th label="Student" sortKey="student_name" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <Th label="Class" sortKey="current_class" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <Th label="Term" sortKey="term_label" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <Th label="Amount (UGX)" sortKey="total" currentKey={sortKey} dir={sortDir} onSort={toggleSort} right />
                    <Th label="Method" sortKey="method" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <th className="px-4 py-3 text-left font-semibold ac-text-muted">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y ac-table-divider">
                  {sortedGroups.map((g) => {
                    const grp = g as unknown as ReceiptGroup;
                    return (
                      <tr key={grp.key} className="ac-table-row">
                        <td className="px-4 py-3 font-mono ac-text-secondary text-xs whitespace-nowrap">{grp.receipt_number ?? "—"}</td>
                        <td className="px-4 py-3 tabular-nums ac-text-secondary whitespace-nowrap">{grp.date || "—"}</td>
                        <td className="ac-cell-primary px-4 py-3 font-medium whitespace-nowrap">{grp.student_name}</td>
                        <td className="px-4 py-3 ac-text-secondary whitespace-nowrap">{grp.current_class}</td>
                        <td className="px-4 py-3 ac-text-secondary whitespace-nowrap">{grp.term_label}</td>
                        <td className="ac-cell-primary px-4 py-3 text-right tabular-nums font-semibold whitespace-nowrap">{fmt(grp.total)}</td>
                        <td className="px-4 py-3 ac-text-secondary capitalize whitespace-nowrap">{methodLabel(grp.method)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleReprint(grp)}
                            className="text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 text-xs font-semibold hover:underline"
                          >
                            Reprint
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
                {sortedGroups.length} receipt{sortedGroups.length !== 1 ? "s" : ""}
                {groups.length !== sortedGroups.length ? ` (of ${groups.length} total)` : ""}
              </p>
              <p className="ac-text-primary text-sm font-semibold tabular-nums">Total: {fmt(filteredTotal)} UGX</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
