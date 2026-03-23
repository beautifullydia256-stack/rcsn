/**
 * Printable expense voucher (school payment / salary). Similar to student payment receipt.
 */
export type ExpenseReceiptData = {
  referenceNumber: string;
  schoolName?: string;
  categoryName: string;
  /** Full stored description (may include appended external proof line). */
  description: string;
  /** Line item text without the optional external proof suffix. */
  descriptionMain?: string;
  externalProofUrl?: string | null;
  amount: number;
  paymentMethod: string;
  expenseDate: string;
  recordedBy: string;
  recordedAt?: string;
  status: string;
  salaryPeriodLabel?: string | null;
  payeeName?: string | null;
  payeeRole?: string | null;
};

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bank: "Bank",
  mobile_money: "Mobile Money",
  cheque: "Cheque",
  other: "Other",
};

function formatMethod(m: string): string {
  return METHOD_LABELS[m] ?? m;
}

export function printExpenseReceipt(data: ExpenseReceiptData): void {
  const methodLabel = formatMethod(data.paymentMethod);
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Expense ${data.referenceNumber}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 24px; max-width: 420px; margin: 0 auto; color: #1e293b; }
    h1 { text-align: center; font-size: 17px; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 2px dashed #cbd5e1; padding-bottom: 12px; }
    .row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; gap: 12px; }
    .label { color: #64748b; flex-shrink: 0; }
    .value { font-weight: 500; text-align: right; }
    .amount { font-weight: 700; font-size: 17px; margin-top: 10px; padding-top: 10px; border-top: 1px solid #e2e8f0; }
    .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 18px; border-top: 2px dashed #cbd5e1; padding-top: 12px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 6px; background: #f1f5f9; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Expense voucher</h1>
  ${data.schoolName ? `<div class="row" style="margin-bottom:10px;font-weight:600;font-size:15px;"><span>${data.schoolName}</span></div>` : ""}
  <div class="row"><span class="label">Reference</span><span class="value">${data.referenceNumber}</span></div>
  <div class="row"><span class="label">Category</span><span class="value">${data.categoryName}</span></div>
  ${data.payeeName ? `<div class="row"><span class="label">Payee</span><span class="value">${data.payeeName}${data.payeeRole ? ` (${data.payeeRole})` : ""}</span></div>` : ""}
  ${data.salaryPeriodLabel ? `<div class="row"><span class="label">Salary period</span><span class="value">${data.salaryPeriodLabel}</span></div>` : ""}
  <div class="row amount"><span class="label">Amount</span><span class="value">${data.amount.toLocaleString()} UGX</span></div>
  <div class="row"><span class="label">Payment method</span><span class="value">${methodLabel}</span></div>
  <div class="row"><span class="label">Expense date</span><span class="value">${data.expenseDate}</span></div>
  <div class="row"><span class="label">Status</span><span class="value"><span class="badge">${data.status}</span></span></div>
  <div class="row"><span class="label">Recorded by</span><span class="value">${data.recordedBy}</span></div>
  ${data.recordedAt ? `<div class="row"><span class="label">Recorded at</span><span class="value">${data.recordedAt}</span></div>` : ""}
  <div class="row" style="margin-top:10px;padding-top:10px;border-top:1px solid #e2e8f0"><span class="label">Description</span><span class="value" style="text-align:right;max-width:65%">${data.descriptionMain ?? data.description}</span></div>
  ${data.externalProofUrl ? `<div class="row"><span class="label">External proof</span><span class="value" style="text-align:right;max-width:65%;word-break:break-all">${data.externalProofUrl}</span></div>` : ""}
  <div class="footer">Keep this voucher for your records. Official school expense record.</div>
  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  </script>
</body>
</html>`;
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}
