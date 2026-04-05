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

/** Map `schools` row fields into receipt letterhead (shared by modal, reprint, print HTML). */
export function schoolRowToReceiptHeader(row: SchoolBrandingRow | null | undefined): {
  schoolName?: string;
  schoolMotto?: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolEmail?: string;
} {
  if (!row) return {};
  const name = String(row.name ?? "").trim();
  const motto = String(row.motto ?? "").trim();
  const address = [row.address, row.location, row.pobox]
    .map((x) => (x == null ? "" : String(x).trim()))
    .filter(Boolean)
    .join("\n");
  const phone = String(row.contact_phone ?? "").trim();
  const email = String(row.contact_email ?? "").trim();
  return {
    schoolName: name || undefined,
    schoolMotto: motto || undefined,
    schoolAddress: address || undefined,
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
  /** Letterhead — from `schools` */
  schoolName?: string;
  schoolMotto?: string;
  schoolAddress?: string;
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

function receiptLetterheadHtml(data: PaymentReceiptData): string {
  const parts: string[] = [];
  if (data.schoolName) parts.push(`<div class="rh-name">${escapeHtml(data.schoolName)}</div>`);
  if (data.schoolMotto) parts.push(`<div class="rh-motto">${escapeHtml(data.schoolMotto)}</div>`);
  const contactBits: string[] = [];
  if (data.schoolPhone) contactBits.push(`<span>Tel: ${escapeHtml(data.schoolPhone)}</span>`);
  if (data.schoolEmail) contactBits.push(`<span>Email: ${escapeHtml(data.schoolEmail)}</span>`);
  if (contactBits.length)
    parts.push(`<div class="rh-contact">${contactBits.join(" <span class='rh-sep'>|</span> ")}</div>`);
  if (data.schoolAddress) {
    const lines = data.schoolAddress.split(/\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length) parts.push(`<div class="rh-address">${lines.map((l) => escapeHtml(l)).join("<br/>")}</div>`);
  }
  if (parts.length === 0) return "";
  return `<header class="receipt-header">${parts.join("")}</header>`;
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
    body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; padding: 28px 20px; max-width: 420px; margin: 0 auto; color: #1e293b; }
    .receipt-header { text-align: center; padding-bottom: 16px; margin-bottom: 4px; border-bottom: 2px solid #0f172a; }
    .rh-name { font-size: 20px; font-weight: 700; letter-spacing: 0.03em; color: #0f172a; line-height: 1.25; }
    .rh-motto { font-size: 12px; color: #64748b; font-style: italic; margin-top: 6px; }
    .rh-contact { font-size: 12px; color: #334155; margin-top: 10px; line-height: 1.5; }
    .rh-sep { color: #94a3b8; padding: 0 6px; }
    .rh-address { font-size: 11px; color: #64748b; margin-top: 8px; line-height: 1.45; }
    .doc-block { text-align: center; margin: 18px 0 16px; padding-bottom: 14px; border-bottom: 1px dashed #cbd5e1; }
    .doc-title { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #0f172a; }
    .doc-receipt-no { font-size: 13px; margin-top: 8px; color: #475569; }
    .doc-receipt-no strong { font-family: ui-monospace, monospace; color: #0f172a; }
    .row { display: flex; justify-content: space-between; gap: 12px; margin: 8px 0; font-size: 14px; align-items: flex-start; }
    .label { color: #64748b; flex-shrink: 0; }
    .value { font-weight: 500; text-align: right; }
    .amount { font-weight: 700; font-size: 16px; margin-top: 8px; padding-top: 10px; border-top: 1px solid #e2e8f0; }
    .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 20px; border-top: 2px dashed #cbd5e1; padding-top: 14px; }
  </style>
</head>
<body>
  ${receiptLetterheadHtml(data)}
  <div class="doc-block">
    <div class="doc-title">Fee payment receipt</div>
    <div class="doc-receipt-no">Receipt No. <strong>${escapeHtml(data.receiptNumber)}</strong></div>
  </div>
  <div class="row"><span class="label">Student</span><span class="value">${escapeHtml(data.studentName)}</span></div>
  <div class="row"><span class="label">Class</span><span class="value">${escapeHtml(data.studentClass)}</span></div>
  <div class="row"><span class="label">Term</span><span class="value">${escapeHtml(data.termLabel)}</span></div>
  <div class="row amount"><span class="label">Amount Paid</span><span class="value">${data.amountPaid.toLocaleString()} UGX</span></div>
  ${allocationsHtml}
  ${data.totalRemainingBalance !== undefined && data.totalRemainingBalance >= 0 ? `<div class="row amount"><span class="label">Remaining balance</span><span class="value">${data.totalRemainingBalance.toLocaleString()} UGX</span></div>` : ""}
  <div class="row"><span class="label">Payment Method</span><span class="value">${escapeHtml(methodLabel)}</span></div>
  <div class="row"><span class="label">Date & Time</span><span class="value">${escapeHtml(data.transactionTime)}</span></div>
  <div class="row"><span class="label">Recorded by</span><span class="value">${escapeHtml(data.recordedBy)}</span></div>
  ${data.description ? `<div class="row" style="margin-top:10px;padding-top:10px;border-top:1px solid #e2e8f0"><span class="label">Description</span><span class="value">${escapeHtml(data.description)}</span></div>` : ""}
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
    <div
      className="bg-white p-6 text-slate-900 shadow-lg"
      style={{ maxWidth: 420 }}
    >
      <header className="border-b-2 border-slate-900 pb-4 text-center">
        {data.schoolName && (
          <div className="text-xl font-bold tracking-wide text-slate-900">{data.schoolName}</div>
        )}
        {data.schoolMotto && (
          <div className="mt-1.5 text-xs italic text-slate-500">{data.schoolMotto}</div>
        )}
        {(data.schoolPhone || data.schoolEmail) && (
          <div className="mt-2.5 text-xs text-slate-600">
            {data.schoolPhone && <span>Tel: {data.schoolPhone}</span>}
            {data.schoolPhone && data.schoolEmail && <span className="px-2 text-slate-400">|</span>}
            {data.schoolEmail && <span>Email: {data.schoolEmail}</span>}
          </div>
        )}
        {data.schoolAddress && (
          <div className="mt-2 whitespace-pre-line text-[11px] leading-snug text-slate-500">{data.schoolAddress}</div>
        )}
      </header>
      <div className="my-4 border-b border-dashed border-slate-300 pb-4 text-center">
        <div className="text-[13px] font-bold uppercase tracking-[0.12em] text-slate-900">Fee payment receipt</div>
        <div className="mt-2 text-sm text-slate-600">
          Receipt No. <span className="font-mono font-semibold text-slate-900">{data.receiptNumber}</span>
        </div>
      </div>
      <div className="space-y-1.5 text-sm">
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
        <div className="flex justify-between border-t border-slate-200 pt-2">
          <span className="text-slate-500">Amount Paid</span>
          <span className="font-bold">{data.amountPaid.toLocaleString()} UGX</span>
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
