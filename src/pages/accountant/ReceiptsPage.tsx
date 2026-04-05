import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../store/authStore";
import { fetchReceipts, RECEIPTS_QUERY_KEY } from "./api/receipts";
import { formatReceiptDateTime, printReceipt, type PaymentReceiptData } from "../../components/accountant/PaymentReceipt";

const STALE_MS = 2 * 60 * 1000;

export default function ReceiptsPage() {
  const navigate = useNavigate();
  const schoolId = useAuthStore((s) => s.schoolId);
  const [q, setQ] = useState("");
  const { data, isPending, isFetching, isError, error } = useQuery({
    queryKey: [...RECEIPTS_QUERY_KEY, schoolId],
    queryFn: () => fetchReceipts(schoolId!),
    enabled: !!schoolId,
    staleTime: STALE_MS,
    refetchOnWindowFocus: true,
  });

  const payments = data?.payments ?? [];
  const studentMap = data?.studentMap ?? {};
  const termMap = data?.termMap ?? {};
  const schoolName = data?.schoolName ?? "";
  const schoolPhone = data?.schoolPhone;
  const schoolEmail = data?.schoolEmail;
  const recorderMap = data?.recorderMap ?? {};
  const filtered = q.trim()
    ? payments.filter((p) => {
        const s = studentMap[p.student_id];
        const termLabel = termMap[p.term_id] || "";
        const search = q.toLowerCase();
        return (
          (s?.name?.toLowerCase().includes(search)) ||
          (s?.current_class?.toLowerCase().includes(search)) ||
          termLabel.toLowerCase().includes(search) ||
          (p.receipt_number?.toLowerCase().includes(search))
        );
      })
    : payments;

  /** One logical receipt per group (same receipt_number, or single row keyed by payment_id). Newest receipt first. */
  const { receiptGroups, paymentsByReceipt } = useMemo(() => {
    type Row = (typeof filtered)[number];
    const map = new Map<string, Row[]>();
    filtered.forEach((p) => {
      const key = p.receipt_number || p.payment_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    const latestTs = (rows: Row[]) =>
      rows.reduce((acc, p) => {
        const t1 = p.created_at ? new Date(p.created_at).getTime() : 0;
        const t2 = p.payment_date ? new Date(p.payment_date + "T12:00:00").getTime() : 0;
        return Math.max(acc, t1, t2);
      }, 0);
    const groups = Array.from(map.entries()).map(([key, rows]) => {
      const sorted = [...rows].sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return ta - tb;
      });
      return { key, rows: sorted };
    });
    groups.sort((a, b) => latestTs(b.rows) - latestTs(a.rows));
    const paymentsByReceipt = new Map<string, Row[]>(groups.map((g) => [g.key, g.rows]));
    return { receiptGroups: groups, paymentsByReceipt };
  }, [filtered]);

  function handleReprint(receiptKey: string) {
    const group = paymentsByReceipt.get(receiptKey) || [];
    if (group.length === 0) return;
    const sorted = [...group].sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return ta - tb;
    });
    const first = sorted[0];
    const s = studentMap[first.student_id];
    const total = sorted.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
    const allocations = sorted.map((p) => ({
      termLabel: termMap[p.term_id] ?? "—",
      amountApplied: Number(p.amount_paid || 0),
    }));
    /** Same receipt may have multiple DB rows (split terms); snapshot is on each but earliest row can be null on legacy data. */
    const remSource =
      sorted.find((p) => {
        const v = p.receipt_total_remaining_balance;
        return v !== null && v !== undefined && String(v).trim() !== "";
      }) ?? first;
    const remRaw = remSource.receipt_total_remaining_balance;
    let totalRemainingBalance: number | undefined;
    if (remRaw !== null && remRaw !== undefined && String(remRaw).trim() !== "") {
      const n = typeof remRaw === "bigint" ? Number(remRaw) : Number(String(remRaw).replace(/,/g, ""));
      if (Number.isFinite(n)) totalRemainingBalance = Math.max(0, n);
    }
    let transactionTime = "—";
    if (first.created_at) {
      transactionTime = formatReceiptDateTime(new Date(first.created_at));
    } else if (first.payment_date) {
      transactionTime = formatReceiptDateTime(new Date(first.payment_date + "T12:00:00"));
    }
    const recorderId = first.recorded_by;
    const recordedBy =
      recorderId && recorderMap[recorderId]?.trim()
        ? recorderMap[recorderId]!
        : "—";
    const receiptData: PaymentReceiptData = {
      receiptNumber: first.receipt_number || first.payment_id,
      schoolName: schoolName.trim() || undefined,
      schoolPhone,
      schoolEmail,
      studentName: s?.name ?? "—",
      studentClass: s?.current_class ?? "—",
      termLabel: allocations.length === 1 ? allocations[0].termLabel : "Multiple terms",
      amountPaid: total,
      paymentMethod: first.payment_method ?? "cash",
      transactionTime,
      recordedBy,
      description: first.notes?.trim() || undefined,
      allocations,
      totalRemainingBalance,
    };
    printReceipt(receiptData);
  }

  return (
    <div className="ac-page-content mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="ac-text-primary text-2xl font-semibold">Receipts</h1>
        <button
          type="button"
          onClick={() => navigate("/dashboard/accountant")}
          className="ac-glass-btn-secondary rounded-xl px-4 py-2 text-sm font-medium"
        >
          Back to Dashboard
        </button>
      </div>
      <p className="ac-text-secondary mb-4 text-sm">
        Read-only archive. Payments recorded on the Payments page appear here. Reversed payments are hidden. Use Reprint to print again.
      </p>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by student, class, term, or receipt number…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="ac-input max-w-md"
        />
      </div>
      <div className="ac-glass-card overflow-hidden rounded-[18px]">
        {!schoolId || (isPending && isFetching) ? (
          <div className="ac-text-muted p-8 text-center">Loading receipts…</div>
        ) : isError ? (
          <div className="ac-text-muted p-8 text-center">
            Could not load receipts.{error instanceof Error ? ` ${error.message}` : ""}
          </div>
        ) : receiptGroups.length === 0 ? (
          <div className="ac-text-muted p-8 text-center">
            {payments.length === 0
              ? "No receipts yet. Record a payment on Payments to see it here."
              : "No receipts match your search."}
          </div>
        ) : (
          <div className="overflow-x-auto ac-table-wrap">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-3">Receipt #</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Term</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {receiptGroups.map((g) => {
                  const first = g.rows[0];
                  const s = studentMap[first.student_id];
                  const total = g.rows.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
                  const termLabel =
                    g.rows.length === 1 ? (termMap[first.term_id] ?? "—") : "Multiple terms";
                  const payDates = g.rows.map((p) => p.payment_date).filter(Boolean) as string[];
                  const dateDisplay =
                    payDates.length === 0 ? "—" : payDates.reduce((a, b) => (a >= b ? a : b));
                  return (
                    <tr key={g.key}>
                      <td className="px-4 py-3 font-mono">{first.receipt_number || "—"}</td>
                      <td className="ac-cell-primary px-4 py-3">{s?.name ?? "—"}</td>
                      <td className="px-4 py-3">{s?.current_class ?? "—"}</td>
                      <td className="px-4 py-3">{termLabel}</td>
                      <td className="ac-cell-primary px-4 py-3">{total.toLocaleString()}</td>
                      <td className="px-4 py-3">{dateDisplay}</td>
                      <td className="px-4 py-3 capitalize">{first.payment_method ?? "—"}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleReprint(g.key)}
                          className="text-emerald-500 hover:underline text-sm font-medium"
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
        )}
      </div>
    </div>
  );
}
