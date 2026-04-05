import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CategorySpendRow, PaymentMethodRow } from "./fetchFinancialAnalytics";

const COLORS = ["#0f9d58", "#e24b4a", "#378add", "#f4b400", "#8aa4c8", "#6b5b95", "#2d6a4f", "#c75b39"];

function formatUGX(n: number): string {
  return `UGX ${Math.round(n).toLocaleString()}`;
}

export default function FinancialAnalyticsCharts({
  paymentMethods,
  categories,
}: {
  paymentMethods: PaymentMethodRow[];
  categories: CategorySpendRow[];
}) {
  const showPay = paymentMethods.length > 0;
  const showCat = categories.length > 0;
  if (!showPay && !showCat) return null;

  const payData = paymentMethods.map((r) => ({ name: r.method, value: r.amount }));
  const catData = categories.map((r) => ({ name: r.category, value: r.amount }));

  return (
    <div className="fa-charts-grid">
      {showPay && (
        <div className="card-sm fa-pie-card">
          <div className="section-title">Collections by channel</div>
          <p className="muted" style={{ fontSize: 12, marginBottom: 10, maxWidth: 520 }}>
            Share of fee payments recorded in the selected date range (by method).
          </p>
          <div className="fa-pie-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={payData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={82}
                  paddingAngle={1.5}
                  stroke="none"
                >
                  {payData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => formatUGX(v)}
                  contentStyle={{
                    background: "var(--fa-surface)",
                    border: "1px solid var(--fa-border)",
                    borderRadius: 8,
                    color: "var(--fa-text)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "var(--fa-text2)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {showCat && (
        <div className="card-sm fa-pie-card">
          <div className="section-title">Operating expenses by category</div>
          <p className="muted" style={{ fontSize: 12, marginBottom: 10, maxWidth: 520 }}>
            Top expense categories (approved / paid) in the same range.
          </p>
          <div className="fa-pie-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={catData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={82}
                  paddingAngle={1.5}
                  stroke="none"
                >
                  {catData.map((_, i) => (
                    <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => formatUGX(v)}
                  contentStyle={{
                    background: "var(--fa-surface)",
                    border: "1px solid var(--fa-border)",
                    borderRadius: 8,
                    color: "var(--fa-text)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "var(--fa-text2)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
