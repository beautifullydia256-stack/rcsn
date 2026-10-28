import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingDown,
  TrendingUp,
  Scale,
  Wallet,
  CircleDollarSign,
  ArrowLeft,
  Download,
  FileText,
  RefreshCw,
  Building2,
  ChevronRight,
  Landmark,
  ArrowUpRight,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { ADMIN_STALE_TIME_MS } from '../../lib/adminQueryDefaults';
import { supabase } from '../../lib/supabase';
import { useAcademicPeriod } from '../../lib/academicPeriodTerminology';
import {
  FINANCIAL_ANALYTICS_QUERY_KEY,
  currentCalendarYear,
  fetchFinancialAnalytics,
  fetchSchoolTerms,
  financialYearOptionsFromTerms,
  pickCurrentTermId,
  termIdsForFinancialYear,
  type PeriodType,
  type TermScope,
} from './fetchFinancialAnalytics';
import { downloadFinancialAnalyticsXlsx } from './financialAnalyticsExport';
import { downloadFinancialAnalyticsPdf, type FinancialAnalyticsPdfBranding } from './financialAnalyticsPdf';
import { loadFaPrefs, saveFaPrefs } from './financialAnalyticsPrefs';
import { fmtUGX, fmtUGXCompact } from '../../styles/posThemeTokens';
import { GovPageLoader, GovRollingBox } from '@/components/ui/GovLoadingIndicator';
import '@/styles/government-system.css';

function toTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function FinancialAnalyticsPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const schoolId = useAuthStore((s) => s.schoolId);
  const { labels } = useAcademicPeriod();

  const isAdmin = pathname.includes('/dashboard/admin/');
  const backTo = isAdmin ? '/dashboard/admin/finance' : '/dashboard/accountant';
  const financeBase = isAdmin ? '/dashboard/admin/finance' : '/dashboard/accountant';

  const { data: terms = [], isLoading: termsLoading } = useQuery({
    queryKey: [...FINANCIAL_ANALYTICS_QUERY_KEY, 'terms', schoolId],
    queryFn: () => fetchSchoolTerms(schoolId!),
    enabled: !!schoolId,
    staleTime: ADMIN_STALE_TIME_MS,
  });

  const brandingSelect =
    'name, logo_url, motto, subtitle, address, pobox, location, contact_email, contact_phone';

  const { data: schoolBranding } = useQuery({
    queryKey: [...FINANCIAL_ANALYTICS_QUERY_KEY, 'school-branding', schoolId],
    queryFn: async (): Promise<FinancialAnalyticsPdfBranding | null> => {
      const bySchoolId = await supabase
        .from('schools')
        .select(brandingSelect)
        .eq('school_id', schoolId!)
        .maybeSingle();
      let data = bySchoolId.data;
      if (!data) {
        const byId = await supabase.from('schools').select(brandingSelect).eq('id', schoolId!).maybeSingle();
        data = byId.data;
      }
      return (data as FinancialAnalyticsPdfBranding | null) ?? null;
    },
    enabled: !!schoolId,
    staleTime: 10 * 60 * 1000,
  });

  const [financialYear, setFinancialYear] = useState<number>(() => {
    const saved = loadFaPrefs();
    return saved?.financialYear ?? currentCalendarYear();
  });
  const [termScope, setTermScope] = useState<TermScope>(() => {
    const saved = loadFaPrefs();
    return saved?.termScope === 'all' || saved?.termScope === 'one' ? saved.termScope : 'one';
  });
  const [termId, setTermId] = useState<string>(() => {
    const saved = loadFaPrefs();
    return saved?.termId ?? '';
  });
  const [period, setPeriod] = useState<PeriodType>(() => {
    const saved = loadFaPrefs();
    const p = saved?.period;
    return p === 'term' || p === 'week' || p === 'month' || p === 'year' || p === 'custom' ? p : 'term';
  });

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
    if (termScope !== 'one') return;
    if (!inYear.length) {
      setTermId('');
      return;
    }
    if (termId && inYear.some((t) => t.id === termId)) return;
    const today = toTodayIso();
    const pick = pickCurrentTermId(inYear, today) || inYear[0].id;
    setTermId(pick);
  }, [financialYear, terms, termScope, termId]);

  const termIdsInYear = useMemo(
    () => termIdsForFinancialYear(terms, financialYear),
    [terms, financialYear]
  );

  const effectivePeriod: PeriodType = termScope === 'all' ? 'year' : period;

  const analyticsEnabled =
    !!schoolId &&
    !!terms.length &&
    (termScope === 'all'
      ? termIdsInYear.length > 0
      : !!termId &&
        termsInSelectedYear.length > 0 &&
        termsInSelectedYear.some((t) => t.id === termId));

  const {
    data,
    isLoading: dataLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [
      ...FINANCIAL_ANALYTICS_QUERY_KEY,
      schoolId,
      effectivePeriod,
      undefined,
      financialYear,
      termScope,
      termScope === 'one' ? termId : 'all',
      termsInSelectedYear.map((t) => t.id).join(','),
    ],
    queryFn: () =>
      fetchFinancialAnalytics({
        schoolId: schoolId!,
        period: effectivePeriod,
        financialYear,
        termScope,
        termId: termScope === 'one' ? termId : undefined,
        terms,
      }),
    enabled: analyticsEnabled,
    staleTime: ADMIN_STALE_TIME_MS,
    placeholderData: (prev) => prev,
  });

  const selectedTerm = useMemo(() => terms.find((t) => t.id === termId), [terms, termId]);

  const termLabelForExport = useMemo(() => {
    if (termScope === 'all') return `FY ${financialYear} (All ${labels.periodNoun}s)`;
    if (!selectedTerm) return `FY ${financialYear}`;
    return selectedTerm.label?.trim() || `${labels.periodNoun} ${selectedTerm.term}, ${selectedTerm.year}`;
  }, [termScope, financialYear, selectedTerm, labels.periodNoun]);

  const periodLabel = useMemo(() => {
    if (termScope === 'all') return 'All terms (year to date)';
    switch (period) {
      case 'term':
        return `${labels.periodNoun} to date`;
      case 'week':
        return 'This week';
      case 'month':
        return 'This month';
      case 'year':
        return 'Calendar year to date';
      default:
        return 'Selected period';
    }
  }, [termScope, period, labels.periodNoun]);

  const handleExportXlsx = useCallback(() => {
    if (!data) return;
    downloadFinancialAnalyticsXlsx(data, {
      financialYear,
      termLabel: termLabelForExport,
      periodLabel,
      schoolName: schoolBranding?.name,
    });
  }, [data, financialYear, termLabelForExport, periodLabel, schoolBranding?.name]);

  const handleExportPdf = useCallback(async () => {
    if (!data) return;
    await downloadFinancialAnalyticsPdf(
      data,
      {
        financialYear,
        termLabel: termLabelForExport,
        periodLabel,
      },
      schoolBranding ?? null
    );
  }, [data, financialYear, termLabelForExport, periodLabel, schoolBranding]);

  // Operational metrics
  const operatingMargin =
    data && data.totalIncome > 0 ? Math.round((data.net / data.totalIncome) * 100) : 0;

  const totalArrears = data?.ledgerOutstanding ?? 0;
  const totalBilled = (data?.totalIncome ?? 0) + totalArrears;
  const recoveryRate = totalBilled > 0 ? Math.round(((data?.totalIncome ?? 0) / totalBilled) * 100) : 0;
  const spentRatio = (data?.totalIncome ?? 0) > 0 ? Math.min(100, Math.round(((data?.totalSpent ?? 0) / (data?.totalIncome ?? 1)) * 100)) : 0;

  // Max value for monthly trend bars
  const trendMax = useMemo(() => {
    if (!data?.trend.length) return 1;
    return Math.max(1, ...data.trend.flatMap((t) => [t.income, t.spent]));
  }, [data?.trend]);

  if ((termsLoading || (dataLoading && !data)) && !data) {
    return <GovPageLoader minHeight="min-h-[50vh]" />;
  }

  return (
    <div className="admin-terminal-page space-y-5">
      {/* ── 1. INSTITUTIONAL GOVERNMENT HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#CCCCCC] pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(backTo)}
            className="gov-btn gov-btn-sm"
            title="Back to Finance Hub"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[17px] font-bold tracking-tight text-[#111111] uppercase font-sans">
                FINANCIAL ANALYTICS & TREASURY AUDIT
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-bold bg-[#EAEAEA] text-[#222222] border border-[#CCCCCC]">
                TREASURY
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="gov-btn gov-btn-sm"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>REFRESH</span>
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="gov-btn gov-btn-sm"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700" />
            <span>PDF AUDIT</span>
          </button>
          <button
            type="button"
            onClick={handleExportXlsx}
            className="gov-btn gov-btn-sm"
          >
            <FileText className="w-3.5 h-3.5 text-amber-700" />
            <span>EXCEL EXPORT</span>
          </button>
        </div>
      </div>

      {/* ── 2. FILTER & SCOPE CONTROL BAR ── */}
      <div className="gov-control-bar flex-wrap">
        <div className="gov-control-bar-left flex-wrap gap-3">
          {/* Year selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono font-bold text-[#555555] uppercase">YEAR:</span>
            <select
              value={financialYear}
              onChange={(e) => setFinancialYear(Number(e.target.value))}
              className="gov-select text-xs font-mono font-bold w-auto"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y} ACADEMIC YEAR
                </option>
              ))}
            </select>
          </div>

          {/* Period Scope */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono font-bold text-[#555555] uppercase">SCOPE:</span>
            <select
              value={termScope === 'all' ? '__all__' : termId}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '__all__') {
                  setTermScope('all');
                } else {
                  setTermScope('one');
                  setTermId(val);
                }
              }}
              className="gov-select text-xs font-mono font-bold w-auto"
            >
              <option value="__all__">ENTIRE FINANCIAL YEAR (CONSOLIDATED)</option>
              {termsInSelectedYear.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label?.toUpperCase() || `${labels.periodNoun.toUpperCase()} ${t.term}, ${t.year}`}
                </option>
              ))}
            </select>
          </div>

          {/* Time Frequency */}
          {termScope === 'one' && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono font-bold text-[#555555] uppercase">INTERVAL:</span>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as PeriodType)}
                className="gov-select text-xs font-mono font-bold w-auto"
              >
                <option value="term">{labels.periodNoun.toUpperCase()} TO DATE</option>
                <option value="month">THIS CURRENT MONTH</option>
                <option value="week">THIS WEEK</option>
                <option value="year">FULL CALENDAR YEAR</option>
              </select>
            </div>
          )}
        </div>

        <div className="gov-control-bar-right">
          <span className="text-[11px] font-mono text-[#555555] font-semibold">
            {periodLabel.toUpperCase()}
          </span>
        </div>
      </div>

      {termsLoading || dataLoading ? (
        <GovPageLoader message="COMPUTING TREASURY ANALYTICS & CASHFLOW METRICS..." minHeight="min-h-[50vh]" />
      ) : (
        <>
          {/* ── 3. FOUR ELEVATED MONEY-COLORED KPI CARDS WITH VISUAL PROGRESS BARS ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Fee Collections (Inflow - Institutional Emerald) */}
            <div className="gov-card p-4 rounded-lg border border-[#CCCCCC] border-l-4 border-l-emerald-600 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#555555]">
                  Fee Revenue Collections
                </span>
                <span className="p-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                  <TrendingUp className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-2xl font-mono font-bold text-emerald-700 mt-2">
                UGX {fmtUGX(data?.totalIncome ?? 0)}
              </div>
              <div className="text-[11px] text-[#666666] font-mono mt-1">
                Tuition & functional fees banked
              </div>
              {/* Collection Realization Bar */}
              <div className="mt-3">
                <div className="flex justify-between text-[10px] font-mono font-bold text-[#555555] mb-1">
                  <span>COLLECTION RATE</span>
                  <span className="text-emerald-700">{recoveryRate}%</span>
                </div>
                <div className="h-2 bg-[#EAEAEA] rounded overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-300"
                    style={{ width: `${Math.min(100, recoveryRate)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Operating Expenditures (Outflow - Institutional Amber) */}
            <div className="gov-card p-4 rounded-lg border border-[#CCCCCC] border-l-4 border-l-amber-600 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#555555]">
                  Operating Expenditures
                </span>
                <span className="p-1 bg-amber-50 text-amber-700 border border-amber-200 rounded">
                  <TrendingDown className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-2xl font-mono font-bold text-amber-700 mt-2">
                UGX {fmtUGX(data?.totalSpent ?? 0)}
              </div>
              <div className="text-[11px] text-[#666666] font-mono mt-1">
                Approved vouchers & disbursements
              </div>
              {/* Operating Expenditure Ratio Bar */}
              <div className="mt-3">
                <div className="flex justify-between text-[10px] font-mono font-bold text-[#555555] mb-1">
                  <span>EXPENSE-TO-INCOME RATIO</span>
                  <span className="text-amber-700">{spentRatio}%</span>
                </div>
                <div className="h-2 bg-[#EAEAEA] rounded overflow-hidden">
                  <div
                    className="h-full bg-amber-600 transition-all duration-300"
                    style={{ width: `${Math.min(100, spentRatio)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Card 3: Net Operating Position (Margin - Dynamic Emerald or Red) */}
            <div
              className={`gov-card p-4 rounded-lg border border-[#CCCCCC] border-l-4 bg-white ${
                (data?.net ?? 0) >= 0 ? 'border-l-emerald-600' : 'border-l-red-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#555555]">
                  Net Operating Position
                </span>
                <span
                  className={`p-1 rounded border ${
                    (data?.net ?? 0) >= 0
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}
                >
                  <Scale className="w-3.5 h-3.5" />
                </span>
              </div>
              <div
                className={`text-2xl font-mono font-bold mt-2 ${
                  (data?.net ?? 0) >= 0 ? 'text-[#111111]' : 'text-red-700'
                }`}
              >
                {(data?.net ?? 0) < 0 ? '-' : '+'}UGX {fmtUGX(Math.abs(data?.net ?? 0))}
              </div>
              <div className="text-[11px] text-[#666666] font-mono mt-1">
                {(data?.net ?? 0) >= 0 ? 'Cashflow Operating Surplus' : 'Operating Deficit (Overspent)'}
              </div>
              {/* Operating Margin Indicator */}
              <div className="mt-3">
                <div className="flex justify-between text-[10px] font-mono font-bold text-[#555555] mb-1">
                  <span>OPERATING MARGIN</span>
                  <span className={(data?.net ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                    {operatingMargin}%
                  </span>
                </div>
                <div className="h-2 bg-[#EAEAEA] rounded overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      (data?.net ?? 0) >= 0 ? 'bg-emerald-600' : 'bg-red-600'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(8, Math.abs(operatingMargin)))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Card 4: Uncollected Arrears (Debt / Arrears - Institutional Crimson Red) */}
            <div className="gov-card p-4 rounded-lg border border-[#CCCCCC] border-l-4 border-l-red-600 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#555555]">
                  Uncollected Tuition Arrears
                </span>
                <span className="p-1 bg-red-50 text-red-700 border border-red-200 rounded">
                  <Wallet className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-2xl font-mono font-bold text-red-700 mt-2">
                UGX {fmtUGX(totalArrears)}
              </div>
              <div className="text-[11px] text-[#666666] font-mono mt-1">
                Outstanding student ledger debt
              </div>
              {/* Arrears Exposure Meter */}
              <div className="mt-3">
                <div className="flex justify-between text-[10px] font-mono font-bold text-[#555555] mb-1">
                  <span>OUTSTANDING DEBT RATIO</span>
                  <span className="text-red-700">{100 - recoveryRate}%</span>
                </div>
                <div className="h-2 bg-[#EAEAEA] rounded overflow-hidden">
                  <div
                    className="h-full bg-red-600 transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, 100 - recoveryRate))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── 4. MONTHLY CASH FLOW TREND VISUALIZER (COLLECTIONS VS EXPENSES) ── */}
          <div className="gov-card p-5 rounded-lg border border-[#CCCCCC] bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAEAEA] pb-3 mb-4">
              <div>
                <h3 className="text-sm font-mono font-bold text-[#111111] uppercase tracking-wide">
                  MONTHLY CASH FLOW COMPARISON · REVENUE VS. EXPENDITURES
                </h3>
                <p className="text-[11px] text-[#666666] font-mono mt-0.5">
                  Comparative monthly breakdown of collections vs operating disbursements over the period.
                </p>
              </div>

              {/* Legend with Money Colors */}
              <div className="flex items-center gap-4 text-xs font-mono font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-emerald-600 inline-block" />
                  <span className="text-[#111111]">FEE COLLECTIONS</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-amber-600 inline-block" />
                  <span className="text-[#111111]">OPERATING DISBURSEMENTS</span>
                </div>
              </div>
            </div>

            {!data?.trend.length ? (
              <div className="py-12 text-center text-xs font-mono text-[#777777]">
                NO CASH FLOW TRANSACTIONS LOGGED FOR THIS PERIOD.
              </div>
            ) : (
              <div className="pt-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 items-end h-56 border-b border-[#CCCCCC] pb-2">
                  {data.trend.map((m, idx) => {
                    const incomeHeight = Math.max(6, Math.round((m.income / trendMax) * 160));
                    const spentHeight = Math.max(6, Math.round((m.spent / trendMax) * 160));
                    const monthlyNet = m.income - m.spent;

                    return (
                      <div
                        key={m.label || idx}
                        className="flex flex-col items-center justify-end h-full gap-2 p-2 rounded hover:bg-[#F9FAFB] transition-colors"
                      >
                        {/* Dual Comparative Bars */}
                        <div className="flex items-end gap-2 h-40">
                          {/* Income Bar (Emerald) */}
                          <div
                            title={`Collections: UGX ${fmtUGX(m.income)}`}
                            className="w-5 bg-emerald-600 rounded-t transition-all duration-300"
                            style={{ height: `${incomeHeight}px` }}
                          />
                          {/* Expense Bar (Amber) */}
                          <div
                            title={`Expenditures: UGX ${fmtUGX(m.spent)}`}
                            className="w-5 bg-amber-600 rounded-t transition-all duration-300"
                            style={{ height: `${spentHeight}px` }}
                          />
                        </div>

                        {/* Month Label */}
                        <div className="text-xs font-mono font-bold text-[#111111] uppercase">
                          {m.label}
                        </div>

                        {/* Monthly Net Position Badge */}
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            monthlyNet >= 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {monthlyNet >= 0 ? '+' : ''}
                          {fmtUGXCompact(monthlyNet)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── 5. TWO-COLUMN HIGH-DENSITY PAPER TABLES (COST CENTERS & COLLECTION CHANNELS) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left: Cost Centers & Vote-Head Expenditure Breakdown */}
            <div className="gov-card p-4 rounded-lg border border-[#CCCCCC] bg-white">
              <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-700" />
                  <h3 className="text-xs font-mono font-bold text-[#111111] uppercase tracking-wide">
                    COST CENTERS & EXPENDITURE BREAKDOWN
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`${financeBase}/expenses`)}
                  className="gov-btn gov-btn-sm text-[10px]"
                >
                  <span>ALL VOUCHERS</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {!data?.categories.length ? (
                <div className="py-8 text-center text-xs font-mono text-[#777777]">
                  NO OPERATING EXPENDITURES RECORDED FOR THIS SCOPE.
                </div>
              ) : (
                <div className="gov-table-container">
                  <table className="gov-table">
                    <thead>
                      <tr>
                        <th>Cost Center / Vote Head</th>
                        <th className="text-right">Total Disbursed</th>
                        <th className="text-right">Share (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.categories.slice(0, 8).map((cat) => (
                        <tr key={cat.category}>
                          <td className="font-semibold text-[#111111]">
                            <div>{cat.category}</div>
                            {/* Distribution Bar */}
                            <div className="h-1.5 bg-[#EAEAEA] rounded overflow-hidden mt-1 max-w-[140px]">
                              <div
                                className="h-full bg-amber-600"
                                style={{ width: `${Math.min(100, cat.pct)}%` }}
                              />
                            </div>
                          </td>
                          <td className="font-mono font-bold text-xs text-right text-amber-800">
                            UGX {fmtUGX(cat.amount)}
                          </td>
                          <td className="font-mono text-xs text-right font-bold text-[#555555]">
                            {cat.pct}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right: Fee Revenue Collection Channels */}
            <div className="gov-card p-4 rounded-lg border border-[#CCCCCC] bg-white">
              <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <CircleDollarSign className="w-4 h-4 text-emerald-700" />
                  <h3 className="text-xs font-mono font-bold text-[#111111] uppercase tracking-wide">
                    FEE COLLECTION CHANNELS & DEPOSITS
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`${financeBase}/receipts`)}
                  className="gov-btn gov-btn-sm text-[10px]"
                >
                  <span>ALL RECEIPTS</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {!data?.paymentMethods.length ? (
                <div className="py-8 text-center text-xs font-mono text-[#777777]">
                  NO TUITION PAYMENTS RECORDED FOR THIS SCOPE.
                </div>
              ) : (
                <div className="gov-table-container">
                  <table className="gov-table">
                    <thead>
                      <tr>
                        <th>Channel / Deposit Method</th>
                        <th className="text-right">Total Deposited</th>
                        <th className="text-right">Share (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.paymentMethods.map((m) => (
                        <tr key={m.method}>
                          <td className="font-semibold text-[#111111]">
                            <div>{m.method}</div>
                            {/* Collection Bar */}
                            <div className="h-1.5 bg-[#EAEAEA] rounded overflow-hidden mt-1 max-w-[140px]">
                              <div
                                className="h-full bg-emerald-600"
                                style={{ width: `${Math.min(100, m.pct)}%` }}
                              />
                            </div>
                          </td>
                          <td className="font-mono font-bold text-xs text-right text-emerald-800">
                            UGX {fmtUGX(m.amount)}
                          </td>
                          <td className="font-mono text-xs text-right font-bold text-[#555555]">
                            {m.pct}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ── 6. QUICK ACTION RECONCILIATION CARDS ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => navigate(`${financeBase}/outstanding`)}
              className="gov-card p-3 rounded-lg border border-[#CCCCCC] bg-white text-left hover:bg-[#F9FAFB] transition-colors flex items-center justify-between"
            >
              <div>
                <div className="text-xs font-mono font-bold text-[#111111] uppercase">
                  FEE DEBTORS & ARREARS
                </div>
                <div className="text-[11px] font-mono text-[#666666] mt-0.5">
                  Ageing schedule & recovery follow-up
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#888888]" />
            </button>

            <button
              type="button"
              onClick={() => navigate(`${financeBase}/bank`)}
              className="gov-card p-3 rounded-lg border border-[#CCCCCC] bg-white text-left hover:bg-[#F9FAFB] transition-colors flex items-center justify-between"
            >
              <div>
                <div className="text-xs font-mono font-bold text-[#111111] uppercase">
                  BANK & CASHBOOK LEDGER
                </div>
                <div className="text-[11px] font-mono text-[#666666] mt-0.5">
                  Real-time verified running balances
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#888888]" />
            </button>

            <button
              type="button"
              onClick={() => navigate(`${financeBase}/expenses`)}
              className="gov-card p-3 rounded-lg border border-[#CCCCCC] bg-white text-left hover:bg-[#F9FAFB] transition-colors flex items-center justify-between"
            >
              <div>
                <div className="text-xs font-mono font-bold text-[#111111] uppercase">
                  EXPENSES & VOUCHERS
                </div>
                <div className="text-[11px] font-mono text-[#666666] mt-0.5">
                  Requisitions & disbursements audit
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#888888]" />
            </button>

            <button
              type="button"
              onClick={() => navigate(`${financeBase}/reports`)}
              className="gov-card p-3 rounded-lg border border-[#CCCCCC] bg-white text-left hover:bg-[#F9FAFB] transition-colors flex items-center justify-between"
            >
              <div>
                <div className="text-xs font-mono font-bold text-[#111111] uppercase">
                  COLLECTION STATEMENTS
                </div>
                <div className="text-[11px] font-mono text-[#666666] mt-0.5">
                  Programme & cohort ledger summaries
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#888888]" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
