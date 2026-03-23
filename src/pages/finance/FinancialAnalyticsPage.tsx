import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { TrendingDown, TrendingUp, PiggyBank, Landmark, Scale, Percent, Wallet } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import AdminPageWrapper from "../../components/layout/AdminPageWrapper";
import { ADMIN_STALE_TIME_MS } from "../../lib/adminQueryDefaults";
import {
  FINANCIAL_ANALYTICS_QUERY_KEY,
  currentCalendarYear,
  fetchFinancialAnalytics,
  fetchSchoolTerms,
  financialYearBounds,
  financialYearOptionsFromTerms,
  pickCurrentTermId,
  termIdsForFinancialYear,
  type PeriodType,
  type TermScope,
} from "./fetchFinancialAnalytics";
import { downloadFinancialAnalyticsCsv } from "./financialAnalyticsExport";
import { loadFaPrefs, saveFaPrefs } from "./financialAnalyticsPrefs";
import FinancialAnalyticsToolbar from "./FinancialAnalyticsToolbar";
import "./financialAnalytics.css";
import "@/assets/pwezacore-students-scoped.css";

const STUDENTS_FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap";

function formatUGX(n: number): string {
  return `UGX ${Math.round(n).toLocaleString()}`;
}

function toTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function pctFmt(n: number | null): string {
  if (n == null) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

function ppFmt(n: number | null): string {
  if (n == null) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)} pp`;
}

type DeltaTone = "good" | "bad" | "neutral";

function deltaTone(pct: number | null, goodWhenUp: boolean): DeltaTone {
  if (pct == null || pct === 0) return "neutral";
  const up = pct > 0;
  const good = goodWhenUp ? up : !up;
  return good ? "good" : "bad";
}

function KpiDelta({
  pct,
  goodWhenUp,
  variant = "pct",
}: {
  pct: number | null;
  goodWhenUp: boolean;
  variant?: "pct" | "pp";
}) {
  const tone = deltaTone(pct, goodWhenUp);
  const cls = tone === "good" ? "green" : tone === "bad" ? "red" : "muted";
  if (pct == null) {
    return (
      <div className="kpi-delta muted">
        <span className="kpi-delta__txt">No prior period to compare</span>
      </div>
    );
  }
  const Icon = pct > 0 ? TrendingUp : pct < 0 ? TrendingDown : null;
  const label = variant === "pp" ? ppFmt(pct) : pctFmt(pct);
  const suffix = variant === "pp" ? " vs prior margin" : " vs prior";
  return (
    <div className={`kpi-delta ${cls}`}>
      {Icon && <Icon className="kpi-delta__ic" aria-hidden />}
      <span>
        {label}
        {suffix}
      </span>
    </div>
  );
}

export default function FinancialAnalyticsPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const schoolId = useAuthStore((s) => s.schoolId);
  const isAdmin = pathname.includes("/dashboard/admin/");
  const backTo = isAdmin ? "/dashboard/admin/finance" : "/dashboard/accountant";
  const financeBase = isAdmin ? "/dashboard/admin/finance" : "/dashboard/accountant";
  const receiptsTo = `${financeBase}/receipts`;
  const paymentsTo = `${financeBase}/payments`;
  const expensesTo = `${financeBase}/expenses`;

  useEffect(() => {
    const id = "pweza-students-fonts";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = STUDENTS_FONT_HREF;
      document.head.appendChild(link);
    }
  }, []);

  const { data: terms = [], isLoading: termsLoading } = useQuery({
    queryKey: [...FINANCIAL_ANALYTICS_QUERY_KEY, "terms", schoolId],
    queryFn: () => fetchSchoolTerms(schoolId!),
    enabled: !!schoolId,
    staleTime: ADMIN_STALE_TIME_MS,
  });

  const [financialYear, setFinancialYear] = useState<number>(() => currentCalendarYear());
  const [termScope, setTermScope] = useState<TermScope>("one");
  const [termId, setTermId] = useState<string>("");
  const [period, setPeriod] = useState<PeriodType>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const initPrefsRef = useRef(false);

  useEffect(() => {
    if (!terms.length || initPrefsRef.current) return;
    initPrefsRef.current = true;
    const saved = loadFaPrefs() ?? {};
    if (saved.financialYear != null) setFinancialYear(saved.financialYear);
    else setFinancialYear(currentCalendarYear());
    if (saved.termScope === "all" || saved.termScope === "one") setTermScope(saved.termScope);
    if (saved.termId && terms.some((t) => t.id === saved.termId)) {
      setTermId(saved.termId);
    } else {
      const today = toTodayIso();
      const tid = pickCurrentTermId(terms, today);
      if (tid) setTermId(tid);
      setTermScope("one");
    }
    if (saved.period) setPeriod(saved.period);
  }, [terms]);

  useEffect(() => {
    if (!schoolId || !terms.length) return;
    saveFaPrefs({
      financialYear,
      termScope,
      termId,
      period,
    });
  }, [schoolId, terms.length, financialYear, termScope, termId, period]);

  const yearOptions = useMemo(() => financialYearOptionsFromTerms(terms), [terms]);

  const termsInSelectedYear = useMemo(
    () => terms.filter((t) => t.year === financialYear),
    [terms, financialYear]
  );

  useEffect(() => {
    if (!terms.length) return;
    const inYear = terms.filter((t) => t.year === financialYear);
    if (termScope !== "one") return;
    if (!inYear.length) {
      setTermId("");
      return;
    }
    if (termId && inYear.some((t) => t.id === termId)) return;
    const today = toTodayIso();
    const pick = pickCurrentTermId(inYear, today) || inYear[0].id;
    setTermId(pick);
  }, [financialYear, terms, termScope, termId]);

  const customRange = useMemo(() => {
    if (period !== "custom" || !customStart || !customEnd) return undefined;
    return { start: customStart, end: customEnd };
  }, [period, customStart, customEnd]);

  const termIdsInYear = useMemo(
    () => termIdsForFinancialYear(terms, financialYear),
    [terms, financialYear]
  );

  /** Week/month/year/custom only when FY has terms and a single term is chosen (not "All terms"). */
  const showPeriodFilters =
    termsInSelectedYear.length > 0 && termScope === "one" && !!termId;

  /** "All terms" uses full financial year to date; single term uses selected period. */
  const effectivePeriod: PeriodType = termScope === "all" ? "year" : period;
  const effectiveCustomRange = termScope === "all" ? undefined : customRange;

  const analyticsEnabled =
    !!schoolId &&
    !!terms.length &&
    (termScope === "all"
      ? termIdsInYear.length > 0
      : !!termId &&
        termsInSelectedYear.length > 0 &&
        (period !== "custom" || (!!customStart && !!customEnd)));

  const { data: rawData, isLoading: dataLoading, isFetching } = useQuery({
    queryKey: [
      ...FINANCIAL_ANALYTICS_QUERY_KEY,
      schoolId,
      financialYear,
      termScope,
      termId,
      effectivePeriod,
      effectiveCustomRange?.start,
      effectiveCustomRange?.end,
    ],
    queryFn: () =>
      fetchFinancialAnalytics({
        schoolId: schoolId!,
        financialYear,
        termScope,
        termId: termScope === "one" ? termId : undefined,
        period: effectivePeriod,
        customRange: effectiveCustomRange,
        terms,
      }),
    enabled: analyticsEnabled,
    staleTime: ADMIN_STALE_TIME_MS,
  });

  const data = analyticsEnabled ? rawData : undefined;

  const termLabelForExport = useMemo(() => {
    if (termScope === "all") return "All terms";
    const t = terms.find((x) => x.id === termId);
    return t ? t.label : "Selected term";
  }, [termScope, termId, terms]);

  const periodLabel = useMemo(() => {
    if (termScope === "all") return "Financial year to date (all terms)";
    if (period === "week") return "This week";
    if (period === "month") return "This month";
    if (period === "year") return "This year (within term)";
    if (period === "custom" && customStart && customEnd) return `Custom: ${customStart} → ${customEnd}`;
    return "Custom period";
  }, [termScope, period, customStart, customEnd]);

  const handleExport = useCallback(() => {
    if (!data) return;
    downloadFinancialAnalyticsCsv(data, {
      financialYear,
      termLabel: termLabelForExport,
      periodLabel,
    });
  }, [data, financialYear, termLabelForExport, periodLabel]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const operatingMarginPct =
    data && data.totalIncome > 0 ? Math.round((data.net / data.totalIncome) * 1000) / 10 : null;

  const trendMax = useMemo(() => {
    if (!data?.trend.length) return 1;
    return Math.max(1, ...data.trend.flatMap((t) => [t.income, t.spent]));
  }, [data?.trend]);

  const fyBounds = useMemo(() => financialYearBounds(financialYear), [financialYear]);

  const termSelectValue = termScope === "all" ? "__auto__" : termId;

  const onTermSelectChange = (value: string) => {
    if (value === "__auto__") {
      setTermScope("all");
      return;
    }
    setTermScope("one");
    setTermId(value);
  };

  const needsTerm = terms.length > 0 && termScope === "one" && !termId;
  const loading = termsLoading || needsTerm || (analyticsEnabled && (dataLoading || isFetching));

  const pageSub = useMemo(() => {
    const range = `Jan 1 – Dec 31, ${financialYear}`;
    if (termScope === "all") {
      return `Financial year ${financialYear} (${range}). All terms — year to date. Pick a single term to filter by week or month.`;
    }
    const row = terms.find((t) => t.id === termId);
    if (row) {
      return `Financial analytics for ${financialYear} (${range}). ${row.label} (${row.start_date} → ${row.end_date}).`;
    }
    return `Financial year ${financialYear} (${range}). Select a term to unlock period filters.`;
  }, [financialYear, termScope, termId, terms]);

  const inner = (
    <>
      <div className="page-header fade-up">
        <div className="page-title-block">
          <div className="page-eyebrow">Finance</div>
          <h1 className="page-title">Financial Analytics</h1>
          <p className="page-sub">{pageSub}</p>
        </div>
        <div className="page-actions print:hidden">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(backTo)}>
            ← {isAdmin ? "Finance overview" : "Dashboard"}
          </button>
        </div>
      </div>

      {!schoolId && (
        <p className="muted" style={{ marginBottom: 12 }}>
          Sign in with a school account to view analytics.
        </p>
      )}

      {schoolId && (
        <div className="fa-term-row" style={{ marginBottom: 14 }}>
          <label htmlFor="fa-fy">Financial year</label>
          <select
            id="fa-fy"
            className="fa-select"
            value={financialYear}
            onChange={(e) => setFinancialYear(Number(e.target.value))}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y} (Jan – Dec)
              </option>
            ))}
          </select>
          <label htmlFor="fa-term">Term</label>
          <select
            id="fa-term"
            className="fa-select"
            value={termSelectValue}
            onChange={(e) => onTermSelectChange(e.target.value)}
            disabled={termsLoading || !termsInSelectedYear.length}
          >
            <option value="__auto__">All terms (full year in this FY)</option>
            {termsInSelectedYear.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {schoolId && terms.length > 0 && (
        <FinancialAnalyticsToolbar
          onExport={handleExport}
          onPrint={handlePrint}
          receiptsTo={receiptsTo}
          paymentsTo={paymentsTo}
          expensesTo={expensesTo}
          exportDisabled={!data}
        />
      )}

      {schoolId && termsInSelectedYear.length > 0 && termScope === "all" && (
        <p className="muted" style={{ fontSize: 12, marginBottom: 12, maxWidth: 640 }}>
          Period filters (This week / month / year / Custom) apply after you choose a <strong>single term</strong> above.
          With &quot;All terms&quot;, totals use the full financial year to date.
        </p>
      )}

      {!termsLoading && schoolId && terms.length === 0 && (
        <p className="muted" style={{ marginBottom: 12, fontSize: 13 }}>
          No school terms found. Configure terms for your school to attribute fee income.
        </p>
      )}

      {!termsLoading && schoolId && terms.length > 0 && !termsInSelectedYear.length && (
        <p className="muted" style={{ marginBottom: 12, fontSize: 13 }}>
          No terms for calendar year {financialYear}. Choose another financial year.
        </p>
      )}

      {showPeriodFilters && (
        <div className="period-tabs">
          {(
            [
              ["week", "This week"],
              ["month", "This month"],
              ["year", "This year"],
              ["custom", "Custom"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`ptab ${period === key ? "active" : ""}`}
              onClick={() => setPeriod(key)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {showPeriodFilters && period === "custom" && (
        <div className="fa-custom-dates mb-3">
          <label className="muted" style={{ fontSize: 12 }}>
            From
          </label>
          <input
            type="date"
            className="fa-date"
            value={customStart}
            min={fyBounds.start}
            max={fyBounds.end}
            onChange={(e) => setCustomStart(e.target.value)}
          />
          <label className="muted" style={{ fontSize: 12 }}>
            To
          </label>
          <input
            type="date"
            className="fa-date"
            value={customEnd}
            min={fyBounds.start}
            max={fyBounds.end}
            onChange={(e) => setCustomEnd(e.target.value)}
          />
        </div>
      )}

      {data && (
        <p className="muted" style={{ fontSize: 11, marginBottom: 10 }}>
          Showing {data.effectiveStart} → {data.effectiveEnd}
          {termScope === "all"
            ? " (financial year to date, all terms)."
            : " (clipped to financial year and selected term)."}
        </p>
      )}

      {loading && (
        <>
          <div className="fa-kpi-grid mb-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="kpi kpi-card">
                <div className="fa-skel" style={{ width: "40%" }} />
                <div className="fa-skel" style={{ width: "70%", marginTop: 10 }} />
              </div>
            ))}
          </div>
          <div className="grid-2 gap-3">
            <div className="card-sm" style={{ minHeight: 200 }}>
              <div className="fa-skel mb-2" />
              <div className="fa-skel mb-2" />
              <div className="fa-skel" />
            </div>
            <div className="card-sm" style={{ minHeight: 200 }}>
              <div className="fa-skel mb-2" />
              <div className="fa-skel" />
            </div>
          </div>
        </>
      )}

      {!loading && data && (
        <>
          {data.comparison && (
            <div className="fa-compare-strip" role="complementary" aria-label="Prior period comparison">
              <div className="fa-compare-strip__inner">
                <Scale className="fa-compare-strip__ic" aria-hidden />
                <span className="fa-compare-strip__label">Compared to prior period</span>
                <span className="fa-compare-strip__range">
                  {data.comparison.prevStart} → {data.comparison.prevEnd}
                </span>
              </div>
            </div>
          )}

          <div className="fa-kpi-grid mb-4">
            <div className="kpi kpi-card">
              <div className="kpi-card__head">
                <PiggyBank className="kpi-card__ic" aria-hidden />
                <div className="kpi-label">Total income</div>
              </div>
              <div className="kpi-val green">{formatUGX(data.totalIncome)}</div>
              <div className="kpi-sub muted">Fee collections in range</div>
              <KpiDelta pct={data.comparison?.incomeChangePct ?? null} goodWhenUp />
            </div>
            <div className="kpi kpi-card">
              <div className="kpi-card__head">
                <Landmark className="kpi-card__ic" aria-hidden />
                <div className="kpi-label">Total spent</div>
              </div>
              <div className="kpi-val red">{formatUGX(data.totalSpent)}</div>
              <div className="kpi-sub muted">Operating &amp; payroll</div>
              <KpiDelta pct={data.comparison?.spentChangePct ?? null} goodWhenUp={false} />
            </div>
            <div className="kpi kpi-card">
              <div className="kpi-card__head">
                <Wallet className="kpi-card__ic" aria-hidden />
                <div className="kpi-label">Net position</div>
              </div>
              <div className={`kpi-val ${data.net >= 0 ? "green" : "red"}`}>
                {data.net >= 0 ? "+" : "-"}
                {formatUGX(Math.abs(data.net))}
              </div>
              <div className="kpi-sub muted">{data.net >= 0 ? "Surplus after expenses" : "Deficit — review costs"}</div>
              <KpiDelta pct={data.comparison?.netChangePct ?? null} goodWhenUp />
            </div>
            <div className="kpi kpi-card">
              <div className="kpi-card__head">
                <Percent className="kpi-card__ic" aria-hidden />
                <div className="kpi-label">Operating margin</div>
              </div>
              <div className={`kpi-val ${operatingMarginPct != null && operatingMarginPct >= 0 ? "green" : "red"}`}>
                {operatingMarginPct != null ? `${operatingMarginPct}%` : "—"}
              </div>
              <div className="kpi-sub muted">Net ÷ income (same period)</div>
              {data.comparison && data.comparison.marginChangePp != null ? (
                <KpiDelta pct={data.comparison.marginChangePp} goodWhenUp variant="pp" />
              ) : (
                <div className="kpi-delta muted">
                  <span className="kpi-delta__txt">
                    {!data.comparison
                      ? "Benchmark for sustainability"
                      : data.totalIncome <= 0
                        ? "No fee income this period — margin not applicable"
                        : data.comparison.prevIncome <= 0
                          ? "Prior period had no fee income — margin not comparable"
                          : "Margin change not available"}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="grid-2 gap-3">
            <div>
              <div className="section-title">Breakdown</div>
              <div className="card-sm mb-3">
                <div className="mb-3">
                  <div className="flex-between mb-2">
                    <span style={{ fontSize: 12 }}>Income</span>
                    <span className="green" style={{ fontSize: 12 }}>
                      {formatUGX(data.totalIncome)}
                    </span>
                  </div>
                  <div className="bar-bg">
                    <div className="bar-fill bar-green" style={{ width: `${data.incomeBarPct}%` }} />
                  </div>
                </div>
                <div className="mb-3">
                  <div className="flex-between mb-2">
                    <span style={{ fontSize: 12 }}>Expenses</span>
                    <span className="red" style={{ fontSize: 12 }}>
                      {formatUGX(data.totalSpent)}
                    </span>
                  </div>
                  <div className="bar-bg">
                    <div className="bar-fill bar-red" style={{ width: `${data.expenseBarPct}%` }} />
                  </div>
                </div>
                <div className="mb-3">
                  <div className="flex-between mb-2">
                    <span style={{ fontSize: 12 }}>Staff / payroll</span>
                    <span className="gold" style={{ fontSize: 12 }}>
                      {formatUGX(data.payroll)}
                    </span>
                  </div>
                  <div className="bar-bg">
                    <div className="bar-fill bar-gold" style={{ width: `${data.payrollBarPct}%` }} />
                  </div>
                </div>
                <div className="mb-3">
                  <div className="flex-between mb-2">
                    <span style={{ fontSize: 12 }}>Scholarships &amp; waivers</span>
                    <span style={{ fontSize: 12, color: "var(--fa-blue)" }}>
                      {formatUGX(data.scholarships)}
                    </span>
                  </div>
                  <div className="bar-bg">
                    <div className="bar-fill bar-blue" style={{ width: `${data.scholarshipBarPct}%` }} />
                  </div>
                </div>
                <div className="card-gold">
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fa-gold)" }}>{data.verdict}</div>
                </div>
              </div>

              <div className="section-title">Where your money went</div>
              <div className="card-sm">
                {data.categories.length === 0 ? (
                  <p className="muted" style={{ fontSize: 13 }}>
                    No expense categories in this period.
                  </p>
                ) : (
                  data.categories.map((row) => (
                    <div key={row.category} className="mb-3">
                      <div className="flex-between mb-1">
                        <span className="fa-cat-head">{row.category}</span>
                        <span className="muted" style={{ fontSize: 11 }}>
                          {row.amount.toLocaleString()} ({row.pct}%)
                        </span>
                      </div>
                      <div className="fa-cat-sub">{row.subtitle}</div>
                      <div className="bar-bg">
                        <div className={`bar-fill ${row.barClass}`} style={{ width: `${row.pct}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="section-title">6-month trend</div>
              <div className="card-sm">
                <div className="trend-legend">
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span className="trend-dot" style={{ background: "var(--fa-green)" }} />
                    Income
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span className="trend-dot" style={{ background: "var(--fa-red)" }} />
                    Spent
                  </span>
                </div>
                {data.trend.map((m) => (
                  <div key={m.label} className="trend-row">
                    <div className="trend-month">{m.label}</div>
                    <div className="trend-bars">
                      <div
                        className="trend-bar-row"
                        style={{
                          background: "var(--fa-green)",
                          width: `${Math.round((m.income / trendMax) * 100)}%`,
                        }}
                      />
                      <div
                        className="trend-bar-row"
                        style={{
                          background: "var(--fa-red)",
                          width: `${Math.round((m.spent / trendMax) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className={`trend-net ${m.net >= 0 ? "green" : "red"}`}>{m.netLabel}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="fa-payment-section">
            <div className="section-title">Fee collections by channel</div>
            <div className="card-sm fa-payment-methods">
              {data.paymentMethods.length > 0 ? (
                <>
                  <p className="muted fa-payment-lead" style={{ fontSize: 12, marginBottom: 12 }}>
                    Share of recorded fee payments in this range (by payment method).
                  </p>
                  <div className="fa-payment-grid">
                    {data.paymentMethods.map((row) => (
                      <div key={row.method} className="fa-payment-row">
                        <div className="flex-between mb-1">
                          <span className="fa-cat-head">{row.method}</span>
                          <span className="muted" style={{ fontSize: 11 }}>
                            {formatUGX(row.amount)} ({row.pct}%)
                          </span>
                        </div>
                        <div className="bar-bg">
                          <div className={`bar-fill ${row.barClass}`} style={{ width: `${row.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                  {data.totalIncome > 0
                    ? "Payment methods are not available for these records — amounts are still included in total income above."
                    : "No fee collections in this range, so there is nothing to break down by channel."}
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {!loading && !data && analyticsEnabled && <p className="muted">Could not load analytics.</p>}

      {showPeriodFilters && period === "custom" && (!customStart || !customEnd) && (
        <p className="muted" style={{ fontSize: 13 }}>
          Select start and end dates to load data.
        </p>
      )}
    </>
  );

  if (isAdmin) {
    return (
      <AdminPageWrapper>
        <div className="pw-students print:bg-[#07090f]">
          <div className="page">
            <div className="fa-nze">{inner}</div>
          </div>
        </div>
      </AdminPageWrapper>
    );
  }

  return (
    <div className="ac-page-content mx-auto max-w-7xl pb-8">
      <div className="pw-students print:bg-[#07090f] rounded-[18px] border border-[var(--ac-border)] overflow-hidden">
        <div className="page">
          <div className="fa-nze">{inner}</div>
        </div>
      </div>
    </div>
  );
}
