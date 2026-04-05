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
  const schoolMotto = data?.schoolMotto;
  const schoolAddress = data?.schoolAddress;
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

  const paymentsByReceipt = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    filtered.forEach((p) => {
      const key = p.receipt_number || p.payment_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return map;
  }, [filtered]);

  function handleReprint(receiptNumber: string) {
    const group = paymentsByReceipt.get(receiptNumber) || [];
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
    const remRaw = first.receipt_total_remaining_balance;
    const totalRemainingBalance =
      remRaw !== null && remRaw !== undefined && String(remRaw) !== "" && Number.isFinite(Number(remRaw))
        ? Math.max(0, Number(remRaw))
        : undefined;
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
      schoolMotto,
      schoolAddress,
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
        ) : filtered.length === 0 ? (
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
                {filtered.map((p) => {
                  const s = studentMap[p.student_id];
                  const receiptNum = p.receipt_number || p.payment_id;
                  return (
                    <tr key={p.payment_id}>
                      <td className="px-4 py-3 font-mono">{p.receipt_number || "—"}</td>
                      <td className="ac-cell-primary px-4 py-3">{s?.name ?? "—"}</td>
                      <td className="px-4 py-3">{s?.current_class ?? "—"}</td>
                      <td className="px-4 py-3">{termMap[p.term_id] ?? "—"}</td>
                      <td className="ac-cell-primary px-4 py-3">{Number(p.amount_paid).toLocaleString()}</td>
                      <td className="px-4 py-3">{p.payment_date ?? "—"}</td>
                      <td className="px-4 py-3 capitalize">{p.payment_method ?? "—"}</td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => handleReprint(receiptNum)} className="text-emerald-500 hover:underline text-sm font-medium">
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
