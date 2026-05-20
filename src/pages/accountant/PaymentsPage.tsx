import { useEffect, useRef, useState, useMemo } from "react";
import { useSearchParams, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Receipt, Search, Filter } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { fetchReceipts, RECEIPTS_QUERY_KEY } from "./api/receipts";
import {
  formatReceiptDateTime,
  printReceipt,
  type PaymentReceiptData,
} from "../../components/accountant/PaymentReceipt";
import { schoolCalendarTodayIso, addCalendarDaysToIsoYmd, firstDayOfMonthIsoYmd } from "../../lib/schoolCalendarDate";

type OutletContext = { openRecordPayment: (initialStudentId?: string) => void };

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bank: "Bank",
  mobile_money: "Mobile Money",
  cheque: "Cheque",
  pos: "POS / Card",
  online: "Online",
  school_pay: "School Pay",
  sure_pay: "Sure Pay",
  other: "Other",
};

function methodLabel(raw: string | null | undefined) {
  const k = String(raw ?? "").trim().toLowerCase();
  return METHOD_LABELS[k] ?? String(raw ?? "—").replace(/_/g, " ");
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

const STALE_MS = 2 * 60 * 1000;

type DateFilter = "today" | "week" | "month" | "all";

export default function PaymentsPage() {
  const [searchParams] = useSearchParams();
  const { openRecordPayment } = useOutletContext() as OutletContext;
  const schoolId = useAuthStore((s) => s.schoolId);

  // Auto-open payment modal if a student ID is in the URL
  const studentIdFromUrl = searchParams.get("student") ?? undefined;
  const autoOpenedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!studentIdFromUrl) { autoOpenedRef.current = null; return; }
    if (autoOpenedRef.current === studentIdFromUrl) return;
    autoOpenedRef.current = studentIdFromUrl;
    openRecordPayment(studentIdFromUrl);
  }, [studentIdFromUrl, openRecordPayment]);

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

  // Summary totals from all (unfiltered) payments
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

  // All distinct payment methods for the filter dropdown
  const methods = useMemo(() => {
    const seen = new Set<string>();
    payments.forEach((p) => { if (p.payment_method) seen.add(p.payment_method.toLowerCase()); });
    return Array.from(seen).sort();
  }, [payments]);

  // Apply filters
  const filtered = useMemo(() => {
    let rows = payments;

    if (dateFilter !== "all") {
      const cutoff = dateFilter === "today" ? todayIso : dateFilter === "week" ? weekStartIso : monthStartIso;
      const exact = dateFilter === "today";
      rows = rows.filter((p) => {
        const d = p.payment_date ?? "";
        return exact ? d === cutoff : d >= cutoff;
      });
    }

    if (methodFilter !== "all") {
      rows = rows.filter((p) => (p.payment_method ?? "").toLowerCase() === methodFilter);
    }

    if (q.trim()) {
      const search = q.toLowerCase();
      rows = rows.filter((p) => {
        const s = studentMap[p.student_id];
        const term = termMap[p.term_id] ?? "";
        return (
          s?.name?.toLowerCase().includes(search) ||
          s?.current_class?.toLowerCase().includes(search) ||
          term.toLowerCase().includes(search) ||
          (p.receipt_number?.toLowerCase().includes(search))
        );
      });
    }

    return rows;
  }, [payments, dateFilter, methodFilter, q, todayIso, weekStartIso, monthStartIso, studentMap, termMap]);

  const filteredTotal = useMemo(
    () => filtered.reduce((s, p) => s + Number(p.amount_paid || 0), 0),
    [filtered]
  );

  function handleReprint(p: (typeof payments)[number]) {
    const s = studentMap[p.student_id];
    const remRaw = p.receipt_total_remaining_balance;
    let totalRemainingBalance: number | undefined;
    if (remRaw !== null && remRaw !== undefined && String(remRaw).trim() !== "") {
      const n = Number(String(remRaw).replace(/,/g, ""));
      if (Number.isFinite(n)) totalRemainingBalance = Math.max(0, n);
    }
    const receiptData: PaymentReceiptData = {
      receiptNumber: p.receipt_number || p.payment_id,
      schoolName: schoolName.trim() || undefined,
      schoolPhone,
      schoolEmail,
      studentName: s?.name ?? "—",
      studentClass: s?.current_class ?? "—",
      termLabel: termMap[p.term_id] ?? "—",
      amountPaid: Number(p.amount_paid || 0),
      paymentMethod: p.payment_method ?? "cash",
      transactionTime: p.created_at
        ? formatReceiptDateTime(new Date(p.created_at))
        : p.payment_date
        ? formatReceiptDateTime(new Date(p.payment_date + "T12:00:00"))
        : "—",
      recordedBy: (p.recorded_by && recorderMap[p.recorded_by]) || "—",
      description: p.notes?.trim() || undefined,
      allocations: [{ termLabel: termMap[p.term_id] ?? "—", amountApplied: Number(p.amount_paid || 0) }],
      totalRemainingBalance,
    };
    printReceipt(receiptData);
  }

  return (
    <div className="ac-page-content mx-auto max-w-7xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="ac-text-primary text-2xl font-semibold">Payments</h1>
          <p className="ac-text-secondary mt-0.5 text-sm">
            All fee payments received from students.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openRecordPayment()}
          className="ac-glass-btn inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold"
        >
          <Receipt className="h-4 w-4" />
          Record payment
        </button>
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
              {fmt(value)}
              <span className="ac-text-muted ml-1 text-xs font-normal">UGX</span>
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
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
        {/* Date filter */}
        <div className="flex items-center gap-1 ac-glass-card rounded-xl p-1">
          {(["today", "week", "month", "all"] as DateFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setDateFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                dateFilter === f
                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  : "ac-text-muted hover:ac-text-secondary"
              }`}
            >
              {f === "today" ? "Today" : f === "week" ? "7 days" : f === "month" ? "Month" : "All"}
            </button>
          ))}
        </div>
        {/* Method filter */}
        {methods.length > 1 && (
          <div className="relative">
            <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ac-text-muted" />
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="ac-input pl-8 pr-6 text-sm"
            >
              <option value="all">All methods</option>
              {methods.map((m) => (
                <option key={m} value={m}>{methodLabel(m)}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="ac-glass-card overflow-hidden rounded-[18px]">
        {!schoolId ? (
          <div className="ac-text-muted p-10 text-center text-sm">No school context.</div>
        ) : isLoading ? (
          <div className="ac-text-muted p-10 text-center text-sm">Loading payments…</div>
        ) : isError ? (
          <div className="ac-text-muted p-10 text-center text-sm">
            Could not load payments.{error instanceof Error ? ` ${error.message}` : ""}
          </div>
        ) : filtered.length === 0 ? (
          <div className="ac-text-muted p-10 text-center text-sm">
            {payments.length === 0
              ? "No payments recorded yet. Use the \"Record payment\" button above to get started."
              : "No payments match your filters."}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="ac-table-header">
                    <th className="px-4 py-3 text-left font-semibold ac-text-muted">Date</th>
                    <th className="px-4 py-3 text-left font-semibold ac-text-muted">Student</th>
                    <th className="px-4 py-3 text-left font-semibold ac-text-muted">Class</th>
                    <th className="px-4 py-3 text-left font-semibold ac-text-muted">Term</th>
                    <th className="px-4 py-3 text-right font-semibold ac-text-muted">Amount (UGX)</th>
                    <th className="px-4 py-3 text-left font-semibold ac-text-muted">Method</th>
                    <th className="px-4 py-3 text-left font-semibold ac-text-muted">Receipt #</th>
                    <th className="px-4 py-3 text-left font-semibold ac-text-muted">Recorded by</th>
                    <th className="px-4 py-3 text-left font-semibold ac-text-muted">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y ac-table-divider">
                  {filtered.map((p) => {
                    const s = studentMap[p.student_id];
                    return (
                      <tr key={p.payment_id} className="ac-table-row">
                        <td className="px-4 py-3 tabular-nums ac-text-secondary whitespace-nowrap">
                          {p.payment_date ?? "—"}
                        </td>
                        <td className="ac-cell-primary px-4 py-3 font-medium whitespace-nowrap">
                          {s?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3 ac-text-secondary whitespace-nowrap">
                          {s?.current_class ?? "—"}
                        </td>
                        <td className="px-4 py-3 ac-text-secondary whitespace-nowrap">
                          {termMap[p.term_id] ?? "—"}
                        </td>
                        <td className="ac-cell-primary px-4 py-3 text-right tabular-nums font-semibold whitespace-nowrap">
                          {fmt(Number(p.amount_paid || 0))}
                        </td>
                        <td className="px-4 py-3 ac-text-secondary capitalize whitespace-nowrap">
                          {methodLabel(p.payment_method)}
                        </td>
                        <td className="px-4 py-3 font-mono ac-text-secondary text-xs whitespace-nowrap">
                          {p.receipt_number ?? "—"}
                        </td>
                        <td className="px-4 py-3 ac-text-secondary whitespace-nowrap">
                          {(p.recorded_by && recorderMap[p.recorded_by]) || "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleReprint(p)}
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
            {/* Footer total */}
            <div className="flex items-center justify-between border-t ac-table-divider px-4 py-3">
              <p className="ac-text-muted text-xs">
                {filtered.length} payment{filtered.length !== 1 ? "s" : ""}
                {payments.length !== filtered.length ? ` (of ${payments.length} total)` : ""}
              </p>
              <p className="ac-text-primary text-sm font-semibold tabular-nums">
                Total: {fmt(filteredTotal)} UGX
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
