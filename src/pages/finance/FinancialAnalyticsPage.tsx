import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
  type SchoolTermRow,
  type TermScope,
} from "./fetchFinancialAnalytics";
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

export default function FinancialAnalyticsPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const schoolId = useAuthStore((s) => s.schoolId);
  const isAdmin = pathname.includes("/dashboard/admin/");
  const backTo = isAdmin ? "/dashboard/admin/finance" : "/dashboard/accountant";

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
  const defaultsAppliedRef = useRef(false);

  useEffect(() => {
    if (!terms.length || defaultsAppliedRef.current) return;
    const fy = currentCalendarYear();
    setFinancialYear(fy);
    const today = toTodayIso();
    const tid = pickCurrentTermId(terms, today);
    if (tid) setTermId(tid);
    setTermScope("one");
    defaultsAppliedRef.current = true;
  }, [terms]);

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

  const [period, setPeriod] = useState<PeriodType>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const customRange = useMemo(() => {
    if (period !== "custom" || !customStart || !customEnd) return undefined;
    return { start: customStart, end: customEnd };
  }, [period, customStart, customEnd]);

  const termIdsInYear = useMemo(
    () => termIdsForFinancialYear(terms, financialYear),
    [terms, financialYear]
  );

  const analyticsEnabled =
    !!schoolId &&
    !!terms.length &&
    (termScope === "all" ? termIdsInYear.length > 0 : !!termId) &&
    (period !== "custom" || (!!customStart && !!customEnd));

  const { data: rawData, isLoading: dataLoading, isFetching } = useQuery({
    queryKey: [
      ...FINANCIAL_ANALYTICS_QUERY_KEY,
      schoolId,
      financialYear,
      termScope,
      termId,
      period,
      customRange?.start,
      customRange?.end,
    ],
    queryFn: () =>
      fetchFinancialAnalytics({
        schoolId: schoolId!,
        financialYear,
        termScope,
        termId: termScope === "one" ? termId : undefined,
        period,
        customRange,
        terms: terms as SchoolTermRow[],
      }),
    enabled: analyticsEnabled,
    staleTime: ADMIN_STALE_TIME_MS,
  });

  const data = analyticsEnabled ? rawData : undefined;

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
      return `Financial year ${financialYear} (${range}). All terms in this year.`;
    }
    const row = terms.find((t) => t.id === termId);
    if (row) {
      return `Financial year ${financialYear} (${range}). ${row.label} (${row.start_date} → ${row.end_date}).`;
    }
    return `Financial year ${financialYear} (${range}).`;
  }, [financialYear, termScope, termId, terms]);

  const inner = (
    <>
      <div className="page-header fade-up">
        <div className="page-title-block">
          <div className="page-eyebrow">Finance</div>
          <h1 className="page-title">Income vs Expenditure</h1>
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

      {period === "custom" && (
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
          Showing {data.effectiveStart} → {data.effectiveEnd} (clipped to financial year
          {termScope === "one" ? " and selected term" : ""}).
        </p>
      )}

      {loading && (
        <>
          <div className="grid-3 mb-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="kpi">
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
          <div className="grid-3 mb-4">
            <div className="kpi">
              <div className="kpi-label">Total income</div>
              <div className="kpi-val green">{formatUGX(data.totalIncome)}</div>
              <div className="kpi-delta muted">Fee collections</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Total spent</div>
              <div className="kpi-val red">{formatUGX(data.totalSpent)}</div>
              <div className="kpi-delta muted">All categories</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Net position</div>
              <div className={`kpi-val ${data.net >= 0 ? "green" : "red"}`}>
                {data.net >= 0 ? "+" : "-"}
                {formatUGX(Math.abs(data.net))}
              </div>
              <div className={`kpi-delta ${data.net >= 0 ? "green" : "red"}`}>
                {data.net >= 0 ? "On track" : "Review spend"}
              </div>
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
        </>
      )}

      {!loading && !data && analyticsEnabled && <p className="muted">Could not load analytics.</p>}

      {period === "custom" && (!customStart || !customEnd) && (
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
