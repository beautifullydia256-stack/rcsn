import { jsPDF } from "jspdf";
import type {
  CategorySpendRow,
  FinancialAnalyticsData,
  PaymentMethodRow,
} from "./fetchFinancialAnalytics";

export type FinancialAnalyticsPdfBranding = {
  name: string | null;
  logo_url: string | null;
  motto: string | null;
  subtitle: string | null;
  address: string | null;
  pobox: string | null;
  location: string | null;
  contact_email: string | null;
  contact_phone: string | null;
};

const NAVY: [number, number, number] = [30, 58, 138];
const BODY: [number, number, number] = [45, 52, 65];
const MUTED: [number, number, number] = [95, 102, 115];

const BAR_RGB: Record<CategorySpendRow["barClass"], [number, number, number]> = {
  "bar-green": [15, 157, 88],
  "bar-red": [226, 75, 74],
  "bar-blue": [55, 138, 221],
  "bar-gold": [244, 180, 0],
};

function formatUgxpdf(n: number): string {
  return `UGX ${Math.round(n).toLocaleString("en-UG")}`;
}

async function logoImageFromUrl(
  url: string | null | undefined
): Promise<{ dataUrl: string; format: "PNG" | "JPEG" } | null> {
  if (!url?.trim()) return null;
  try {
    const res = await fetch(url.trim(), { mode: "cors", credentials: "omit" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(String(r.result));
      r.onerror = () => reject(new Error("read"));
      r.readAsDataURL(blob);
    });
    const t = blob.type.toLowerCase();
    const format = t.includes("png") ? "PNG" : "JPEG";
    return { dataUrl, format };
  } catch {
    return null;
  }
}

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

function brandingAddressLines(b: FinancialAnalyticsPdfBranding | null): string[] {
  if (!b) return [];
  const parts: string[] = [];
  const addr = [b.address, b.pobox, b.location].filter((x) => x?.trim()).join(" · ");
  if (addr) parts.push(addr);
  const tel = b.contact_phone?.trim();
  const em = b.contact_email?.trim();
  if (tel || em) {
    const bits = [tel ? `Tel: ${tel}` : "", em ? `Email: ${em}` : ""].filter(Boolean);
    if (bits.length) parts.push(bits.join("   "));
  }
  return parts;
}

/**
 * Formal school report PDF: letterhead (badge + school identity), document title, then analytics.
 */
export async function downloadFinancialAnalyticsPdf(
  data: FinancialAnalyticsData,
  meta: {
    financialYear: number;
    termLabel: string;
    periodLabel: string;
  },
  branding: FinancialAnalyticsPdfBranding | null
): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const m = 14;
  let y = 8;

  const schoolFoot = branding?.name?.trim() || "School";

  const ensure = (neededMm: number) => {
    if (y + neededMm > pageH - m) {
      doc.addPage();
      y = m;
    }
  };

  const setTimes = (style: "normal" | "bold" | "italic" | "bolditalic") => {
    doc.setFont("times", style);
  };

  /* Letterhead */
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.35);
  doc.line(m, y, pageW - m, y);
  doc.setLineWidth(0.15);
  doc.line(m, y + 1.2, pageW - m, y + 1.2);
  y = 12;

  const logoMm = 22;
  let textLeft = m;
  const logoImg = await logoImageFromUrl(branding?.logo_url ?? null);
  if (logoImg) {
    try {
      doc.addImage(logoImg.dataUrl, logoImg.format, m, y, logoMm, logoMm);
      textLeft = m + logoMm + 6;
    } catch {
      textLeft = m;
    }
  }

  const schoolTitle = (branding?.name?.trim() || "School").toUpperCase();
  setTimes("bold");
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  const titleLines = doc.splitTextToSize(schoolTitle, pageW - textLeft - m);
  doc.text(titleLines, textLeft, y + 4);
  let ty = y + 4 + titleLines.length * 5.2;

  if (branding?.subtitle?.trim()) {
    setTimes("normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    const sub = doc.splitTextToSize(branding.subtitle.trim(), pageW - textLeft - m);
    doc.text(sub, textLeft, ty);
    ty += sub.length * 4.2;
  }

  if (branding?.motto?.trim()) {
    setTimes("italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    const mot = doc.splitTextToSize(`“${branding.motto.trim()}”`, pageW - textLeft - m);
    doc.text(mot, textLeft, ty + 1);
    ty += mot.length * 4 + 2;
  }

  setTimes("normal");
  doc.setFontSize(8);
  doc.setTextColor(...BODY);
  for (const line of brandingAddressLines(branding)) {
    const ls = doc.splitTextToSize(line, pageW - textLeft - m);
    doc.text(ls, textLeft, ty);
    ty += ls.length * 3.6;
  }

  y = Math.max(y + logoMm, ty) + 6;

  /* Document identification */
  doc.setFillColor(248, 249, 252);
  doc.rect(m, y, pageW - 2 * m, 16, "F");
  doc.setDrawColor(220, 225, 235);
  doc.rect(m, y, pageW - 2 * m, 16, "S");

  setTimes("bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...NAVY);
  doc.text("FINANCIAL ANALYTICS REPORT", pageW / 2, y + 6.5, { align: "center" });

  setTimes("normal");
  doc.setFontSize(8.8);
  doc.setTextColor(...MUTED);
  const docSub =
    "Management summary of fee collections, operating expenditure, student ledger position, and trends — " +
    "prepared from records held in PwezaCore.";
  const docSubLines = doc.splitTextToSize(docSub, pageW - 2 * m - 10);
  doc.text(docSubLines, pageW / 2, y + 11.5, { align: "center" });

  y += 20;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.2);
  doc.line(m, y, pageW - m, y);
  y += 5;

  /* Parameters */
  setTimes("bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text("Report parameters", m, y);
  y += 5.5;
  setTimes("normal");
  doc.setFontSize(9);
  const paramRows: [string, string][] = [
    ["Financial year", `${meta.financialYear} (January – December)`],
    ["Term / scope", meta.termLabel],
    ["Activity period filter", meta.periodLabel],
    ["Cash movements (fee income & expenses)", `${data.effectiveStart} → ${data.effectiveEnd}`],
    ["Generated on", new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })],
  ];
  const labelW = 58;
  for (const [label, val] of paramRows) {
    ensure(6);
    doc.setTextColor(...MUTED);
    doc.text(label, m, y);
    doc.setTextColor(...BODY);
    const vl = doc.splitTextToSize(val, pageW - m * 2 - labelW - 2);
    doc.text(vl, m + labelW, y);
    y += Math.max(5, vl.length * 4);
  }
  y += 4;
  doc.setDrawColor(230, 232, 238);
  doc.line(m, y, pageW - m, y);
  y += 7;

  const om =
    data.totalIncome > 0 ? Math.round((data.net / data.totalIncome) * 1000) / 10 : null;

  setTimes("bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...NAVY);
  doc.text("Financial summary", m, y);
  y += 6;

  setTimes("normal");
  doc.setFontSize(9.5);
  const summaryRows: [string, string][] = [
    ["Total income (fee collections in range)", formatUgxpdf(data.totalIncome)],
    ["Total spent (approved / paid expenses)", formatUgxpdf(data.totalSpent)],
    ["Net (income − expenses)", formatUgxpdf(data.net)],
    ["Operating margin", om != null ? `${om}%` : "—"],
    ["Payroll (within expenses)", formatUgxpdf(data.payroll)],
    ["Scholarships & waivers (period)", formatUgxpdf(data.scholarships)],
    ["Outstanding (student ledger, same term scope)", formatUgxpdf(data.ledgerOutstanding)],
    ["Fees on ledger (total_fees, same scope)", formatUgxpdf(data.ledgerTotalFees)],
  ];

  for (const [k, v] of summaryRows) {
    ensure(7);
    doc.setTextColor(...BODY);
    const kl = doc.splitTextToSize(k, pageW - m * 2 - 52);
    doc.text(kl, m, y);
    doc.setTextColor(...NAVY);
    doc.setFont("times", "bold");
    doc.text(v, pageW - m, y, { align: "right" });
    doc.setFont("times", "normal");
    y += Math.max(5.2, kl.length * 4.2);
  }

  y += 3;
  ensure(8);
  doc.setTextColor(...MUTED);
  const verdictLines = doc.splitTextToSize(data.verdict, pageW - 2 * m);
  doc.text(verdictLines, m, y);
  y += verdictLines.length * 4.5 + 6;

  if (data.comparison) {
    ensure(38);
    setTimes("bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...NAVY);
    doc.text("Prior period comparison", m, y);
    y += 6;
    setTimes("normal");
    doc.setFontSize(9);
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
        "Margin change (percentage points)",
        pr.marginChangePp != null ? `${pr.marginChangePp > 0 ? "+" : ""}${pr.marginChangePp} pp` : "—",
      ],
    ];
    for (const [k, v] of comp) {
      ensure(6);
      doc.setTextColor(...MUTED);
      doc.text(k, m, y);
      doc.setTextColor(...BODY);
      doc.text(v, pageW - m, y, { align: "right" });
      y += 5.5;
    }
    y += 5;
  }

  const payImg = data.paymentMethods.length ? pieDataUrl(paymentSlices(data.paymentMethods), 220) : null;
  const catImg = data.categories.length ? pieDataUrl(categorySlices(data.categories), 220) : null;

  if (payImg || catImg) {
    ensure(78);
    setTimes("bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...NAVY);
    doc.text("Distribution overview (same filters as above)", m, y);
    y += 7;
    const pieW = 58;
    const pieH = 58;
    const gap = 10;
    let x0 = m;
    if (payImg) {
      setTimes("bold");
      doc.setFontSize(9);
      doc.text("Fee collections by channel", x0, y - 0.5);
      doc.addImage(payImg, "PNG", x0, y, pieW, pieH);
      let ly = y + pieH + 4;
      setTimes("normal");
      doc.setFontSize(7.5);
      for (const row of data.paymentMethods.slice(0, 8)) {
        const [r, g, b] = BAR_RGB[row.barClass];
        doc.setFillColor(r, g, b);
        doc.rect(x0, ly - 2.5, 3, 3, "F");
        doc.setTextColor(...BODY);
        const leg = `${row.method} (${row.pct}%)`;
        doc.text(leg, x0 + 5, ly);
        ly += 3.8;
      }
      x0 += pieW + gap;
    }
    if (catImg) {
      setTimes("bold");
      doc.setFontSize(9);
      doc.text("Operating expenses by category", x0, y - 0.5);
      doc.addImage(catImg, "PNG", x0, y, pieW, pieH);
      let ly = y + pieH + 4;
      setTimes("normal");
      doc.setFontSize(7.5);
      for (const row of data.categories) {
        const [r, g, b] = BAR_RGB[row.barClass];
        doc.setFillColor(r, g, b);
        doc.rect(x0, ly - 2.5, 3, 3, "F");
        doc.setTextColor(...BODY);
        const leg = `${row.category} (${row.pct}%)`;
        doc.text(leg, x0 + 5, ly);
        ly += 3.8;
      }
    }
    y += pieH + 34;
  }

  const drawTable = (title: string, head: string[], rows: string[][]) => {
    ensure(16);
    setTimes("bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...NAVY);
    doc.text(title, m, y);
    y += 6;
    doc.setFillColor(243, 245, 250);
    doc.rect(m, y - 3, pageW - 2 * m, 6, "F");
    setTimes("bold");
    doc.setFontSize(8);
    doc.setTextColor(...NAVY);
    const colW = [(pageW - 2 * m) * 0.52, (pageW - 2 * m) * 0.24, (pageW - 2 * m) * 0.2];
    let cx = m;
    for (let i = 0; i < head.length; i++) {
      doc.text(head[i], cx + 1, y + 1.5);
      cx += colW[i] ?? 40;
    }
    y += 8;
    doc.setDrawColor(210, 215, 225);
    doc.line(m, y, pageW - m, y);
    y += 4;
    setTimes("normal");
    doc.setFontSize(8.5);
    for (const rline of rows) {
      ensure(7);
      cx = m;
      let rowH = 5;
      for (let j = 0; j < rline.length; j++) {
        doc.setTextColor(...BODY);
        const cell = doc.splitTextToSize(rline[j], colW[j] - 2);
        doc.text(cell, cx + 1, y);
        rowH = Math.max(rowH, cell.length * 3.8);
        cx += colW[j] ?? 40;
      }
      y += rowH;
    }
    y += 5;
  };

  if (data.categories.length) {
    drawTable(
      "Expense categories (detail)",
      ["Category", "Amount (UGX)", "Share %"],
      data.categories.map((c) => [c.category, String(Math.round(c.amount)), `${c.pct}%`])
    );
  }

  if (data.paymentMethods.length) {
    drawTable(
      "Fee collections by payment channel (detail)",
      ["Channel", "Amount (UGX)", "Share %"],
      data.paymentMethods.map((c) => [c.method, String(Math.round(c.amount)), `${c.pct}%`])
    );
  }

  drawTable(
    "Six-month trend (income and expenditure)",
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
    doc.setFont("times", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(
      `${schoolFoot} · Financial Analytics Report · Page ${p} of ${totalPages}`,
      pageW / 2,
      pageH - 7,
      { align: "center" }
    );
  }

  doc.save(`financial-analytics-${meta.financialYear}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
