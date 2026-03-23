import type { FinancialAnalyticsData } from "./fetchFinancialAnalytics";

function escCsv(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadFinancialAnalyticsCsv(
  data: FinancialAnalyticsData,
  meta: {
    financialYear: number;
    termLabel: string;
    periodLabel: string;
  }
): void {
  const lines: string[] = [];
  lines.push("PwezaCore Financial Analytics export");
  lines.push(`Financial year,${meta.financialYear}`);
  lines.push(`Term / scope,${escCsv(meta.termLabel)}`);
  lines.push(`Period,${escCsv(meta.periodLabel)}`);
  lines.push(`Effective range,${data.effectiveStart} to ${data.effectiveEnd}`);
  lines.push("");
  lines.push("Metric,Value (UGX)");
  lines.push(`Total income,${data.totalIncome}`);
  lines.push(`Total spent,${data.totalSpent}`);
  lines.push(`Net position,${data.net}`);
  lines.push(`Payroll (est.),${data.payroll}`);
  lines.push(`Scholarships & waivers,${data.scholarships}`);
  if (data.comparison) {
    lines.push("");
    lines.push("Prior period comparison");
    lines.push(`Prior range,${data.comparison.prevStart} to ${data.comparison.prevEnd}`);
    lines.push(`Prior income,${data.comparison.prevIncome}`);
    lines.push(`Prior spent,${data.comparison.prevSpent}`);
    lines.push(`Prior net,${data.comparison.prevNet}`);
    lines.push(
      `Prior operating margin %,${data.comparison.prevMarginPct != null ? data.comparison.prevMarginPct : ""}`
    );
    lines.push(
      `Margin change (pp vs prior),${data.comparison.marginChangePp != null ? data.comparison.marginChangePp : ""}`
    );
  }
  lines.push("");
  lines.push("Expense categories,Amount (UGX),Share %");
  for (const c of data.categories) {
    lines.push(`${escCsv(c.category)},${c.amount},${c.pct}`);
  }
  lines.push("");
  lines.push("Payment channel,Amount (UGX),Share %");
  for (const m of data.paymentMethods) {
    lines.push(`${escCsv(m.method)},${m.amount},${m.pct}`);
  }
  lines.push("");
  lines.push("Month,Income (UGX),Spent (UGX),Net");
  for (const t of data.trend) {
    lines.push(`${t.label},${t.income},${t.spent},${t.net}`);
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `financial-analytics-${meta.financialYear}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
