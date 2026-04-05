import { jsPDF } from "jspdf";
import type {
  CategorySpendRow,
  FinancialAnalyticsData,
  PaymentMethodRow,
} from "./fetchFinancialAnalytics";

const BAR_RGB: Record<CategorySpendRow["barClass"], [number, number, number]> = {
  "bar-green": [15, 157, 88],
  "bar-red": [226, 75, 74],
  "bar-blue": [55, 138, 221],
  "bar-gold": [244, 180, 0],
};

function formatUgxpdf(n: number): string {
  return `UGX ${Math.round(n).toLocaleString("en-UG")}`;
}

/** Donut chart as PNG data URL (browser only). */
function pieDataUrl(
  slices: { pct: number; rgb: [number, number, number] }[],
  size = 200
): string | null {
  if (typeof document === "undefined") return null;
  const total = slices.reduce((s, x) => s + Math.max(0, x.pct), 0);
  if (total <= 0) return null;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const cx = size / 2;
  const cy = size / 2;
  const rOut = size * 0.38;
  const rIn = rOut * 0.55;
  let start = -Math.PI / 2;
  for (const sl of slices) {
    const p = Math.max(0, sl.pct);
    if (p <= 0) continue;
    const sweep = (p / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.arc(cx, cy, rOut, start, start + sweep);
    ctx.arc(cx, cy, rIn, start + sweep, start, true);
    ctx.closePath();
    ctx.fillStyle = `rgb(${sl.rgb[0]},${sl.rgb[1]},${sl.rgb[2]})`;
    ctx.fill();
    start += sweep;
  }
  return canvas.toDataURL("image/png");
}

function paymentSlices(rows: PaymentMethodRow[]): { pct: number; rgb: [number, number, number] }[] {
  return rows.map((r) => ({ pct: r.pct, rgb: BAR_RGB[r.barClass] }));
}

function categorySlices(rows: CategorySpendRow[]): { pct: number; rgb: [number, number, number] }[] {
  return rows.map((r) => ({ pct: r.pct, rgb: BAR_RGB[r.barClass] }));
}

export function downloadFinancialAnalyticsPdf(
  data: FinancialAnalyticsData,
  meta: {
    financialYear: number;
    termLabel: string;
    periodLabel: string;
    /** Optional display name (e.g. school) */
    schoolName?: string | null;
  }
): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const m = 14;
  let y = 10;

  const ensure = (neededMm: number) => {
    if (y + neededMm > pageH - m) {
      doc.addPage();
      y = m;
    }
  };

  doc.setFillColor(15, 157, 88);
  doc.rect(0, 0, pageW, 9, "F");

  y = 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(13, 34, 59);
  doc.text("Financial analytics report", m, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(70, 85, 105);
  const headLine = meta.schoolName?.trim()
    ? `${meta.schoolName.trim()} · FY ${meta.financialYear} (Jan–Dec)`
    : `Financial year ${meta.financialYear} (Jan–Dec)`;
  doc.text(headLine, m, y);
  y += 5;
  doc.text(`Term / scope: ${meta.termLabel}`, m, y);
  y += 5;
  doc.text(`Period filter: ${meta.periodLabel}`, m, y);
  y += 5;
  doc.text(`Cash-movement window: ${data.effectiveStart} → ${data.effectiveEnd}`, m, y);
  y += 5;
  doc.setTextColor(110, 120, 135);
  doc.text(`Generated ${new Date().toLocaleString()}`, m, y);
  y += 10;

  doc.setDrawColor(220, 225, 235);
  doc.line(m, y, pageW - m, y);
  y += 8;

  const om =
    data.totalIncome > 0 ? Math.round((data.net / data.totalIncome) * 1000) / 10 : null;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(13, 34, 59);
  doc.text("Summary", m, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const summaryRows: [string, string][] = [
    ["Total income (fee collections in range)", formatUgxpdf(data.totalIncome)],
    ["Total spent (approved / paid expenses)", formatUgxpdf(data.totalSpent)],
    ["Net (income − expenses)", formatUgxpdf(data.net)],
    ["Operating margin", om != null ? `${om}%` : "—"],
    ["Payroll (within expenses)", formatUgxpdf(data.payroll)],
    ["Scholarships & waivers (range)", formatUgxpdf(data.scholarships)],
    ["Outstanding (student ledger, same term scope)", formatUgxpdf(data.ledgerOutstanding)],
    ["Fees on ledger (total_fees, same scope)", formatUgxpdf(data.ledgerTotalFees)],
  ];

  for (const [k, v] of summaryRows) {
    ensure(7);
    doc.setTextColor(55, 65, 80);
    const kl = doc.splitTextToSize(k, pageW - m * 2 - 55);
    doc.text(kl, m, y);
    doc.setTextColor(15, 120, 75);
    doc.text(v, pageW - m - 50, y, { align: "right" });
    y += Math.max(5.5, kl.length * 4.5);
  }

  y += 4;
  ensure(8);
  doc.setTextColor(90, 95, 110);
  const verdictLines = doc.splitTextToSize(data.verdict, pageW - 2 * m);
  doc.text(verdictLines, m, y);
  y += verdictLines.length * 4.8 + 6;

  if (data.comparison) {
    ensure(36);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(13, 34, 59);
    doc.text("Prior period comparison", m, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const pr = data.comparison;
    const comp: [string, string][] = [
      ["Prior range", `${pr.prevStart} → ${pr.prevEnd}`],
      ["Prior income", formatUgxpdf(pr.prevIncome)],
      ["Prior spent", formatUgxpdf(pr.prevSpent)],
      ["Prior net", formatUgxpdf(pr.prevNet)],
      [
        "Income change vs prior",
        pr.incomeChangePct != null ? `${pr.incomeChangePct > 0 ? "+" : ""}${pr.incomeChangePct}%` : "—",
      ],
      [
        "Spent change vs prior",
        pr.spentChangePct != null ? `${pr.spentChangePct > 0 ? "+" : ""}${pr.spentChangePct}%` : "—",
      ],
      [
        "Net change vs prior",
        pr.netChangePct != null ? `${pr.netChangePct > 0 ? "+" : ""}${pr.netChangePct}%` : "—",
      ],
      [
        "Margin change (pp)",
        pr.marginChangePp != null ? `${pr.marginChangePp > 0 ? "+" : ""}${pr.marginChangePp} pp` : "—",
      ],
    ];
    for (const [k, v] of comp) {
      ensure(6);
      doc.setTextColor(55, 65, 80);
      doc.text(k, m, y);
      doc.setTextColor(15, 100, 70);
      doc.text(v, pageW - m, y, { align: "right" });
      y += 5.5;
    }
    y += 6;
  }

  const payImg = data.paymentMethods.length ? pieDataUrl(paymentSlices(data.paymentMethods), 220) : null;
  const catImg = data.categories.length ? pieDataUrl(categorySlices(data.categories), 220) : null;

  if (payImg || catImg) {
    ensure(72);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(13, 34, 59);
    doc.text("Composition charts (same filters as above)", m, y);
    y += 8;
    const pieW = 58;
    const pieH = 58;
    const gap = 10;
    let x0 = m;
    if (payImg) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Fee collections by channel", x0, y - 1);
      doc.addImage(payImg, "PNG", x0, y, pieW, pieH);
      let ly = y + pieH + 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      for (const row of data.paymentMethods.slice(0, 8)) {
        const [r, g, b] = BAR_RGB[row.barClass];
        doc.setFillColor(r, g, b);
        doc.rect(x0, ly - 2.5, 3, 3, "F");
        doc.setTextColor(50, 55, 65);
        const leg = `${row.method} (${row.pct}%)`;
        doc.text(leg, x0 + 5, ly);
        ly += 4;
      }
      x0 += pieW + gap;
    }
    if (catImg) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Operating expenses by category", x0, y - 1);
      doc.addImage(catImg, "PNG", x0, y, pieW, pieH);
      let ly = y + pieH + 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      for (const row of data.categories) {
        const [r, g, b] = BAR_RGB[row.barClass];
        doc.setFillColor(r, g, b);
        doc.rect(x0, ly - 2.5, 3, 3, "F");
        doc.setTextColor(50, 55, 65);
        const leg = `${row.category} (${row.pct}%)`;
        doc.text(leg, x0 + 5, ly);
        ly += 4;
      }
    }
    y += pieH + 32;
  }

  const drawTable = (title: string, head: string[], rows: string[][]) => {
    ensure(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(13, 34, 59);
    doc.text(title, m, y);
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    const colW = [(pageW - 2 * m) * 0.52, (pageW - 2 * m) * 0.24, (pageW - 2 * m) * 0.2];
    let cx = m;
    for (let i = 0; i < head.length; i++) {
      doc.setTextColor(80, 85, 100);
      doc.text(head[i], cx, y);
      cx += colW[i] ?? 40;
    }
    y += 4;
    doc.setDrawColor(230, 232, 238);
    doc.line(m, y, pageW - m, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    for (const rline of rows) {
      ensure(6);
      cx = m;
      for (let j = 0; j < rline.length; j++) {
        doc.setTextColor(40, 45, 58);
        const cell = doc.splitTextToSize(rline[j], colW[j] - 1);
        doc.text(cell, cx, y);
        cx += colW[j] ?? 40;
      }
      y += 6;
    }
    y += 6;
  };

  if (data.categories.length) {
    drawTable(
      "Expense categories",
      ["Category", "Amount (UGX)", "Share %"],
      data.categories.map((c) => [c.category, String(Math.round(c.amount)), `${c.pct}%`])
    );
  }

  if (data.paymentMethods.length) {
    drawTable(
      "Fee collections by payment channel",
      ["Channel", "Amount (UGX)", "Share %"],
      data.paymentMethods.map((c) => [c.method, String(Math.round(c.amount)), `${c.pct}%`])
    );
  }

  drawTable(
    "Rolling six-month trend (income & spend)",
    ["Month", "Income (UGX)", "Spent / Net"],
    data.trend.map((t) => [
      t.label,
      String(Math.round(t.income)),
      `${Math.round(t.spent)} / ${t.netLabel}`,
    ])
  );

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 155, 165);
    doc.text(`PwezaCore · Page ${p} of ${totalPages}`, pageW / 2, pageH - 8, { align: "center" });
  }

  doc.save(`financial-analytics-${meta.financialYear}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
