import * as XLSX from "xlsx";
import type { FinancialAnalyticsData } from "./fetchFinancialAnalytics";

export function downloadFinancialAnalyticsXlsx(
  data: FinancialAnalyticsData,
  meta: {
    financialYear: number;
    termLabel: string;
    periodLabel: string;
    schoolName?: string | null;
  }
): void {
  const wb = XLSX.utils.book_new();
  const school = meta.schoolName?.trim() || "";

  const overview: (string | number | null)[][] = [
    ["Financial analytics workbook"],
    [],
    ["School", school],
    ["Financial year", meta.financialYear],
    ["Term / scope", meta.termLabel],
    ["Activity period filter", meta.periodLabel],
    ["Cash movement window (income & expenses)", `${data.effectiveStart} → ${data.effectiveEnd}`],
    ["Generated", new Date().toISOString()],
    [],
    ["Metric", "Value (UGX or text)"],
    ["Total income (fee collections in range)", data.totalIncome],
    ["Total spent (approved / paid expenses)", data.totalSpent],
    ["Net (income − expenses)", data.net],
    [
      "Operating margin %",
      data.totalIncome > 0 ? Math.round((data.net / data.totalIncome) * 1000) / 10 : null,
    ],
    ["Payroll (within expenses)", data.payroll],
    ["Scholarships & waivers (period)", data.scholarships],
    ["Still to collect (school-wide)", data.ledgerOutstanding],
    ["Outstanding - this term only", data.ledgerOutstandingCurrentTerm],
    ["Outstanding - older terms / prior", data.ledgerOutstandingPriorTerms],
    ["This term: fees on ledger (total_fees)", data.ledgerCurrentTermTotalFees],
    [],
    ["Narrative", data.verdict],
  ];

  if (data.comparison) {
    const pr = data.comparison;
    overview.push(
      [],
      ["Prior period comparison"],
      ["Prior range", `${pr.prevStart} → ${pr.prevEnd}`],
      ["Prior income", pr.prevIncome],
      ["Prior spent", pr.prevSpent],
      ["Prior net", pr.prevNet],
      ["Prior operating margin %", pr.prevMarginPct],
      ["Income change vs prior %", pr.incomeChangePct],
      ["Spent change vs prior %", pr.spentChangePct],
      ["Net change vs prior %", pr.netChangePct],
      ["Margin change (pp)", pr.marginChangePp]
    );
  }

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(overview), "Overview");

  const catSheet = [
    ["Category", "Amount (UGX)", "Share %"],
    ...data.categories.map((c) => [c.category, Math.round(c.amount), c.pct]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(catSheet), "Expense categories");

  const paySheet = [
    ["Channel", "Amount (UGX)", "Share %"],
    ...data.paymentMethods.map((r) => [r.method, Math.round(r.amount), r.pct]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(paySheet), "Payment channels");

  const trendSheet = [
    ["Month", "Income (UGX)", "Spent (UGX)", "Net (UGX)"],
    ...data.trend.map((t) => [t.label, t.income, t.spent, t.net]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(trendSheet), "Six month trend");

  const fname = `financial-analytics-${meta.financialYear}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fname);
}
