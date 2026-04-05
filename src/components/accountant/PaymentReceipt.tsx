/**
 * POS-style payment receipt. Immediate display + optional auto-print in new window.
 */
import { useEffect } from "react";

export type SchoolBrandingRow = {
  name?: string | null;
  motto?: string | null;
  address?: string | null;
  location?: string | null;
  pobox?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
};

/** Map `schools` row → receipt header (name + contact only; no motto/address on receipt). */
export function schoolRowToReceiptHeader(row: SchoolBrandingRow | null | undefined): {
  schoolName?: string;
  schoolPhone?: string;
  schoolEmail?: string;
} {
  if (!row) return {};
  const name = String(row.name ?? "").trim();
  const phone = String(row.contact_phone ?? "").trim();
  const email = String(row.contact_email ?? "").trim();
  return {
    schoolName: name || undefined,
    schoolPhone: phone || undefined,
    schoolEmail: email || undefined,
  };
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type PaymentReceiptData = {
  receiptNumber: string;
  /** From `schools` — name + contact only on slip */
  schoolName?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  studentName: string;
  studentClass: string;
  termLabel: string;
  amountPaid: number;
  paymentMethod: string;
  transactionTime: string;
  /** Display name of staff who recorded (not email) */
  recordedBy: string;
  description?: string;
  /** When payment is split across terms (oldest first) */
  allocations?: { termLabel: string; amountApplied: number }[];
  /** Total outstanding balance after this payment */
  totalRemainingBalance?: number;
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bank: "Bank Transfer",
  mobile_money: "Mobile Money",
  cheque: "Cheque",
  pos: "POS / Card",
  online: "Online",
  other: "Other",
};

function formatMethod(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

/** Same format for first print and reprints (local device time). */
export function formatReceiptDateTime(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()];
  const year = d.getFullYear();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${day}-${mon}-${year} ${h}:${m}:${s}`;
}

/** School line + optional Tel / Email only (no motto, no address — matches older receipt). */
function receiptSchoolBlockHtml(data: PaymentReceiptData): string {
  const bits: string[] = [];
  if (data.schoolName) bits.push(`<div class="school-name">${escapeHtml(data.schoolName)}</div>`);
  const contact: string[] = [];
  if (data.schoolPhone) contact.push(`Tel: ${escapeHtml(data.schoolPhone)}`);
  if (data.schoolEmail) contact.push(`Email: ${escapeHtml(data.schoolEmail)}`);
  if (contact.length) bits.push(`<div class="school-contact">${contact.join(" | ")}</div>`);
  if (bits.length === 0) return "";
  return `<div class="school-block">${bits.join("")}</div>`;
}

/** Open a new window, render receipt HTML, trigger print. Non-blocking; does not block transaction. */
export function printReceipt(data: PaymentReceiptData): void {
  const methodLabel = formatMethod(data.paymentMethod);
  const allocationsHtml =
    data.allocations && data.allocations.length > 0
      ? data.allocations
          .map(
            (a) =>
              `<div class="row"><span class="label">Applied to ${escapeHtml(a.termLabel)}</span><span>${a.amountApplied.toLocaleString()} UGX</span></div>`
          )
          .join("")
      : "";
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${escapeHtml(data.receiptNumber)}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 24px; max-width: 360px; margin: 0 auto; color: #1e293b; }
    h1 { text-align: center; font-size: 18px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px dashed #cbd5e1; padding-bottom: 12px; margin: 0 0 8px; font-weight: 700; }
    .school-block { text-align: center; margin-bottom: 8px; }
    .school-name { font-weight: 600; font-size: 15px; }
    .school-contact { font-size: 12px; color: #475569; margin-top: 6px; }
    .row { display: flex; justify-content: space-between; margin: 6px 0; font-size: 14px; }
    .label { color: #64748b; }
    .value { font-weight: 500; }
    .amount { font-weight: 700; font-size: 16px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0; }
    .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 16px; border-top: 2px dashed #cbd5e1; padding-top: 12px; }
  </style>
</head>
<body>
  <h1>Payment receipt</h1>
  ${receiptSchoolBlockHtml(data)}
  <div class="row"><span class="label">Receipt No</span><span class="value">${escapeHtml(data.receiptNumber)}</span></div>
  <div class="row"><span class="label">Student</span><span class="value">${escapeHtml(data.studentName)}</span></div>
  <div class="row"><span class="label">Class</span><span>${escapeHtml(data.studentClass)}</span></div>
  <div class="row"><span class="label">Term</span><span>${escapeHtml(data.termLabel)}</span></div>
  <div class="row amount"><span class="label">Amount Paid</span><span>${data.amountPaid.toLocaleString()} UGX</span></div>
  ${allocationsHtml}
  ${data.totalRemainingBalance !== undefined && data.totalRemainingBalance >= 0 ? `<div class="row amount"><span class="label">Remaining balance</span><span>${data.totalRemainingBalance.toLocaleString()} UGX</span></div>` : ""}
  <div class="row"><span class="label">Payment Method</span><span>${escapeHtml(methodLabel)}</span></div>
  <div class="row"><span class="label">Date & Time</span><span>${escapeHtml(data.transactionTime)}</span></div>
  <div class="row"><span class="label">Recorded by</span><span>${escapeHtml(data.recordedBy)}</span></div>
  ${data.description ? `<div class="row" style="margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0"><span class="label">Description</span><span>${escapeHtml(data.description)}</span></div>` : ""}
  <div class="footer">Thank you for your payment</div>
  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  </script>
</body>
</html>`;
  try {
    const w = window.open("", "_blank", "width=420,height=600");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  } catch (e) {
    console.warn("Receipt print window failed:", e);
  }
}

export function PaymentReceipt({ data, autoPrint }: { data: PaymentReceiptData; autoPrint?: boolean }) {
  useEffect(() => {
    if (!autoPrint) return;
    const t = setTimeout(() => {
      printReceipt(data);
    }, 400);
    return () => clearTimeout(t);
  }, [autoPrint, data.receiptNumber]);

  return (
    <div className="bg-white p-6 text-slate-900 shadow-lg" style={{ maxWidth: 360 }}>
      <div className="mb-4 border-b-2 border-dashed border-slate-300 pb-3">
        <h2 className="text-center text-lg font-bold uppercase tracking-wide text-slate-800">Payment receipt</h2>
        {data.schoolName && (
          <p className="mt-2 text-center text-sm font-semibold text-slate-700">{data.schoolName}</p>
        )}
        {(data.schoolPhone || data.schoolEmail) && (
          <p className="mt-1 text-center text-xs text-slate-600">
            {data.schoolPhone && <>Tel: {data.schoolPhone}</>}
            {data.schoolPhone && data.schoolEmail && " | "}
            {data.schoolEmail && <>Email: {data.schoolEmail}</>}
          </p>
        )}
      </div>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Receipt No</span>
          <span className="font-mono font-semibold">{data.receiptNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Student</span>
          <span className="font-medium">{data.studentName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Class</span>
          <span>{data.studentClass}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Term</span>
          <span>{data.termLabel}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
          <span className="font-normal text-slate-500">Amount Paid</span>
          <span>{data.amountPaid.toLocaleString()} UGX</span>
        </div>
        {data.allocations && data.allocations.length > 0 && (
          <>
            {data.allocations.map((a, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-slate-500">Applied to {a.termLabel}</span>
                <span>{a.amountApplied.toLocaleString()} UGX</span>
              </div>
            ))}
          </>
        )}
        {data.totalRemainingBalance !== undefined && data.totalRemainingBalance >= 0 && (
          <div className="flex justify-between border-t border-slate-200 pt-2">
            <span className="text-slate-500">Remaining balance</span>
            <span className="font-semibold">{data.totalRemainingBalance.toLocaleString()} UGX</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-slate-500">Payment Method</span>
          <span>{formatMethod(data.paymentMethod)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Date & Time</span>
          <span>{data.transactionTime}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Recorded by</span>
          <span>{data.recordedBy}</span>
        </div>
        {data.description && (
          <div className="flex justify-between border-t border-slate-200 pt-2">
            <span className="text-slate-500">Description</span>
            <span className="text-right">{data.description}</span>
          </div>
        )}
      </div>
      <div className="mt-4 border-t-2 border-dashed border-slate-300 pt-3 text-center text-xs text-slate-400">
        Thank you for your payment
      </div>
    </div>
  );
}
