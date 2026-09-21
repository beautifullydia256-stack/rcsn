import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingDown,
  TrendingUp,
  Banknote,
  Landmark,
  Scale,
  Percent,
  Wallet,
  CircleDollarSign,
  ArrowLeft,
  Download,
  FileText,
  Calendar,
  RefreshCw,
  Layers,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  Building2,
  Users,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { ADMIN_STALE_TIME_MS } from '../../lib/adminQueryDefaults';
import { supabase } from '../../lib/supabase';
import { useAcademicPeriod } from '../../lib/academicPeriodTerminology';
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
} from './fetchFinancialAnalytics';
import { downloadFinancialAnalyticsXlsx } from './financialAnalyticsExport';
import { downloadFinancialAnalyticsPdf, type FinancialAnalyticsPdfBranding } from './financialAnalyticsPdf';
import { loadFaPrefs, saveFaPrefs } from './financialAnalyticsPrefs';
import PosEmptyState from '../../components/finance/pos/PosEmptyState';
import {
  getTokens,
  cardGrad,
  fmtUGX,
  fmtUGXCompact,
  SORA,
  INTER,
} from '../../styles/posThemeTokens';

function toTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function FinancialAnalyticsPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const schoolId = useAuthStore((s) => s.schoolId);
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t = getTokens(isDark);
  const { isTertiary, labels } = useAcademicPeriod();

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
  const [customStart] = useState('');
  const [customEnd] = useState('');

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

  // Max value for monthly trend bars
  const trendMax = useMemo(() => {
    if (!data?.trend.length) return 1;
    return Math.max(1, ...data.trend.flatMap((t) => [t.income, t.spent]));
  }, [data?.trend]);

  return (
    <div
      style={{
        minHeight: '100%',
        background: t.screenBg,
        color: t.textHi,
        padding: '24px 28px 48px',
        fontFamily: INTER,
      }}
    >
      {/* ── TOP HEADER ───────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={() => navigate(backTo)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 38,
              height: 38,
              borderRadius: 10,
              background: t.panel,
              border: `1px solid ${t.stroke}`,
              color: t.textHi,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Back to Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div
              style={{
                fontFamily: SORA,
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: '-0.3px',
                color: t.textHi,
                marginBottom: 4,
              }}
            >
              Financial Analytics & Intelligence
            </div>
            <div style={{ fontSize: 13, color: t.textMid }}>
              Executive revenue collections, operational disbursements, and cash flow health for {termLabelForExport}.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => refetch()}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 38,
              height: 38,
              borderRadius: 10,
              background: t.panel,
              border: `1px solid ${t.stroke}`,
              color: t.textMid,
              cursor: 'pointer',
            }}
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              height: 38,
              padding: '0 16px',
              background: t.panel,
              border: `1px solid ${t.stroke}`,
              borderRadius: 10,
              color: t.textHi,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Download className="h-4 w-4" style={{ color: t.mintInk }} />
            PDF Export
          </button>
          <button
            type="button"
            onClick={handleExportXlsx}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              height: 38,
              padding: '0 16px',
              background: t.panel,
              border: `1px solid ${t.stroke}`,
              borderRadius: 10,
              color: t.textHi,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <FileText className="h-4 w-4" style={{ color: t.gold }} />
            Excel Export
          </button>
        </div>
      </div>

      {/* ── FILTER & SCOPE CONTROL BAR ─────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          padding: '12px 16px',
          background: t.panel,
          border: `1px solid ${t.stroke}`,
          borderRadius: 14,
          marginBottom: 22,
          boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          {/* Year selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: t.textLow, textTransform: 'uppercase' }}>Year:</span>
            <select
              value={financialYear}
              onChange={(e) => setFinancialYear(Number(e.target.value))}
              style={{
                height: 34,
                padding: '0 10px',
                background: t.fieldBg,
                border: `1px solid ${t.stroke}`,
                borderRadius: 8,
                color: t.textHi,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y} Academic Year
                </option>
              ))}
            </select>
          </div>

          {/* Period Scope */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: t.textLow, textTransform: 'uppercase' }}>Scope:</span>
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
              style={{
                height: 34,
                padding: '0 10px',
                background: t.fieldBg,
                border: `1px solid ${t.stroke}`,
                borderRadius: 8,
                color: t.textHi,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <option value="__all__">All {labels.periodNoun}s (Full Year)</option>
              {termsInSelectedYear.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.label || `${labels.periodNoun} ${term.term}`}
                </option>
              ))}
            </select>
          </div>

          {/* Date range chips when single term is active */}
          {termScope === 'one' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: t.fieldBg,
                border: `1px solid ${t.stroke}`,
                borderRadius: 8,
                padding: 2,
              }}
            >
              {(['term', 'month', 'week'] as PeriodType[]).map((p) => {
                const active = period === p;
                const label =
                  p === 'term'
                    ? `${labels.periodNoun} to Date`
                    : p === 'month'
                    ? 'This Month'
                    : 'This Week';
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    style={{
                      height: 28,
                      padding: '0 10px',
                      borderRadius: 6,
                      border: 'none',
                      background: active ? (isDark ? 'rgba(61,232,160,0.15)' : '#E6F9F0') : 'transparent',
                      color: active ? t.mintInk : t.textMid,
                      fontSize: 11.5,
                      fontWeight: active ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.12s ease',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ fontSize: 12, color: t.textMid }}>
          Window: <strong style={{ color: t.textHi }}>{data?.effectiveStart ?? '—'}</strong> →{' '}
          <strong style={{ color: t.textHi }}>{data?.effectiveEnd ?? '—'}</strong>
        </div>
      </div>

      {/* ── 4-CARD POS METRIC STRIP ────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 14,
          marginBottom: 24,
        }}
      >
        {/* Card 1: Revenue Collections */}
        <div
          style={{
            background: cardGrad(t, 'mint'),
            border: `1px solid ${t.stroke}`,
            borderRadius: 16,
            padding: '18px 20px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: t.textMid, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Fee Revenue Collections
            </span>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: isDark ? 'rgba(61,232,160,0.12)' : '#E6F9F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp className="h-4 w-4" style={{ color: t.mintInk }} />
            </div>
          </div>
          <div style={{ fontFamily: SORA, fontSize: 22, fontWeight: 800, color: t.mintInk, marginBottom: 4 }}>
            {fmtUGX(data?.totalIncome ?? 0)}
          </div>
          <div style={{ fontSize: 11.5, color: t.textLow }}>
            Total tuition & fee payments deposited
          </div>
        </div>

        {/* Card 2: Operating Expenditures */}
        <div
          style={{
            background: cardGrad(t, 'amber'),
            border: `1px solid ${t.stroke}`,
            borderRadius: 16,
            padding: '18px 20px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: t.textMid, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Operating Expenditures
            </span>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: isDark ? 'rgba(245,192,68,0.12)' : '#FEF3C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingDown className="h-4 w-4" style={{ color: t.warn }} />
            </div>
          </div>
          <div style={{ fontFamily: SORA, fontSize: 22, fontWeight: 800, color: t.warn, marginBottom: 4 }}>
            {fmtUGX(data?.totalSpent ?? 0)}
          </div>
          <div style={{ fontSize: 11.5, color: t.textLow }}>
            Approved expenses & disbursements
          </div>
        </div>

        {/* Card 3: Net Operating Balance */}
        <div
          style={{
            background: cardGrad(t, (data?.net ?? 0) >= 0 ? 'mint' : 'red'),
            border: `1px solid ${t.stroke}`,
            borderRadius: 16,
            padding: '18px 20px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: t.textMid, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Net Operating Margin
            </span>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: (data?.net ?? 0) >= 0
                  ? (isDark ? 'rgba(61,232,160,0.12)' : '#E6F9F0')
                  : (isDark ? 'rgba(248,113,113,0.12)' : '#FEE2E2'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Scale className="h-4 w-4" style={{ color: (data?.net ?? 0) >= 0 ? t.mintInk : t.red }} />
            </div>
          </div>
          <div
            style={{
              fontFamily: SORA,
              fontSize: 22,
              fontWeight: 800,
              color: (data?.net ?? 0) >= 0 ? t.textHi : t.red,
              marginBottom: 4,
            }}
          >
            {(data?.net ?? 0) < 0 ? '-' : ''}{fmtUGX(Math.abs(data?.net ?? 0))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: t.textLow }}>
            <span
              style={{
                fontWeight: 700,
                color: (data?.net ?? 0) >= 0 ? t.mintInk : t.red,
              }}
            >
              {operatingMargin}% Margin
            </span>
            · {(data?.net ?? 0) >= 0 ? 'Operating Surplus' : 'Deficit Cashflow'}
          </div>
        </div>

        {/* Card 4: Fee Recovery & Arrears */}
        <div
          style={{
            background: cardGrad(t, 'blue'),
            border: `1px solid ${t.stroke}`,
            borderRadius: 16,
            padding: '18px 20px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: t.textMid, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Uncollected Arrears
            </span>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: isDark ? 'rgba(120,170,255,0.12)' : '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Wallet className="h-4 w-4" style={{ color: t.blue }} />
            </div>
          </div>
          <div style={{ fontFamily: SORA, fontSize: 22, fontWeight: 800, color: t.textHi, marginBottom: 4 }}>
            {fmtUGX(totalArrears)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: t.textLow }}>
            <span style={{ fontWeight: 700, color: recoveryRate >= 70 ? t.mintInk : t.warn }}>
              {recoveryRate}% Collection Rate
            </span>
            · Outstanding balance
          </div>
        </div>
      </div>

      {/* ── SECTION: MONTHLY CASH FLOW TREND VISUALIZER ─────────────────────── */}
      <div
        style={{
          background: t.panel,
          border: `1px solid ${t.stroke}`,
          borderRadius: 16,
          padding: '22px 24px',
          marginBottom: 24,
          boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div>
            <div style={{ fontFamily: SORA, fontSize: 16, fontWeight: 700, color: t.textHi, marginBottom: 3 }}>
              Monthly Cash Flow Trend (Revenue vs Expenses)
            </div>
            <div style={{ fontSize: 12.5, color: t.textMid }}>
              Comparative monthly breakdown of collections vs operating disbursements over the last 6 months.
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, fontWeight: 600 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: t.mintInk }} />
              <span style={{ color: t.textHi }}>Fee Collections</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: t.warn }} />
              <span style={{ color: t.textHi }}>Operating Expenses</span>
            </div>
          </div>
        </div>

        {/* Bar chart */}
        {dataLoading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: t.textMid, fontSize: 13 }}>
            Loading trend visualizer...
          </div>
        ) : !data?.trend.length ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: t.textLow, fontSize: 13 }}>
            No transaction records found for this period.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${data.trend.length}, 1fr)`,
              gap: 16,
              alignItems: 'end',
              height: 200,
              paddingTop: 24,
              borderBottom: `1px solid ${t.divider}`,
              paddingBottom: 8,
            }}
          >
            {data.trend.map((m, idx) => {
              const incomeHeight = Math.max(4, Math.round((m.income / trendMax) * 150));
              const spentHeight = Math.max(4, Math.round((m.spent / trendMax) * 150));
              const monthlyNet = m.income - m.spent;
              return (
                <div
                  key={m.label || idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: '100%',
                    justifyContent: 'flex-end',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 150 }}>
                    {/* Income Bar */}
                    <div
                      title={`Income: ${fmtUGX(m.income)}`}
                      style={{
                        width: 22,
                        height: incomeHeight,
                        background: t.mintInk,
                        borderRadius: '5px 5px 0 0',
                        transition: 'height 0.3s ease',
                      }}
                    />
                    {/* Expense Bar */}
                    <div
                      title={`Expenses: ${fmtUGX(m.spent)}`}
                      style={{
                        width: 22,
                        height: spentHeight,
                        background: t.warn,
                        borderRadius: '5px 5px 0 0',
                        transition: 'height 0.3s ease',
                      }}
                    />
                  </div>
                  {/* Month Label */}
                  <div style={{ fontSize: 12, fontWeight: 700, color: t.textHi }}>{m.label}</div>
                  {/* Net Badge */}
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: monthlyNet >= 0 ? t.mintInk : t.red,
                    }}
                  >
                    {monthlyNet >= 0 ? '+' : ''}{fmtUGXCompact(monthlyNet)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── TWO-COLUMN DEEP DIVE ────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: 20,
          marginBottom: 24,
        }}
      >
        {/* Left: Cost Center Breakdown */}
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
            borderRadius: 16,
            padding: '22px 24px',
            boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 className="h-4 w-4" style={{ color: t.warn }} />
              <div style={{ fontFamily: SORA, fontSize: 15, fontWeight: 700, color: t.textHi }}>
                Cost Centers & Expenditure Breakdown
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate(`${financeBase}/expenses`)}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: t.mintInk,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              View All Vouchers →
            </button>
          </div>

          {dataLoading ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: t.textMid, fontSize: 13 }}>
              Loading cost centers...
            </div>
          ) : !data?.categories.length ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: t.textLow, fontSize: 13 }}>
              No expenses recorded in this period.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {data.categories.slice(0, 6).map((cat) => (
                <div key={cat.category}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: t.textHi }}>{cat.category}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: SORA, fontSize: 12.5, fontWeight: 700, color: t.textHi }}>
                        {fmtUGX(cat.amount)}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: t.textLow, width: 38, textAlign: 'right' }}>
                        {cat.pct}%
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div
                    style={{
                      height: 6,
                      borderRadius: 3,
                      background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        borderRadius: 3,
                        background: t.warn,
                        width: `${Math.min(100, cat.pct)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Revenue Collection Channels */}
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
            borderRadius: 16,
            padding: '22px 24px',
            boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CircleDollarSign className="h-4 w-4" style={{ color: t.mintInk }} />
              <div style={{ fontFamily: SORA, fontSize: 15, fontWeight: 700, color: t.textHi }}>
                Fee Collection Channels
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate(`${financeBase}/receipts`)}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: t.mintInk,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              View All Receipts →
            </button>
          </div>

          {dataLoading ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: t.textMid, fontSize: 13 }}>
              Loading collection channels...
            </div>
          ) : !data?.paymentMethods.length ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: t.textLow, fontSize: 13 }}>
              No payments logged for this period.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {data.paymentMethods.map((m) => (
                <div key={m.method}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: t.textHi }}>{m.method}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: SORA, fontSize: 12.5, fontWeight: 700, color: t.mintInk }}>
                        {fmtUGX(m.amount)}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: t.textLow, width: 38, textAlign: 'right' }}>
                        {m.pct}%
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div
                    style={{
                      height: 6,
                      borderRadius: 3,
                      background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        borderRadius: 3,
                        background: t.mintInk,
                        width: `${Math.min(100, m.pct)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── QUICK ACTION RECONCILIATION CARDS ──────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
        }}
      >
        <div
          onClick={() => navigate(`${financeBase}/outstanding`)}
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
            borderRadius: 14,
            padding: '16px 18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease',
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.textHi, marginBottom: 2 }}>
              Fee Debtors & Arrears
            </div>
            <div style={{ fontSize: 11.5, color: t.textMid }}>Ageing schedule & SMS follow-up</div>
          </div>
          <ChevronRight className="h-4 w-4" style={{ color: t.textLow }} />
        </div>

        <div
          onClick={() => navigate(`${financeBase}/bank`)}
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
            borderRadius: 14,
            padding: '16px 18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease',
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.textHi, marginBottom: 2 }}>
              Bank & Cash Cashbook
            </div>
            <div style={{ fontSize: 11.5, color: t.textMid }}>Real-time running balances</div>
          </div>
          <ChevronRight className="h-4 w-4" style={{ color: t.textLow }} />
        </div>

        <div
          onClick={() => navigate(`${financeBase}/expenses`)}
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
            borderRadius: 14,
            padding: '16px 18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease',
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.textHi, marginBottom: 2 }}>
              Expenses & Vouchers
            </div>
            <div style={{ fontSize: 11.5, color: t.textMid }}>Disbursements & approvals</div>
          </div>
          <ChevronRight className="h-4 w-4" style={{ color: t.textLow }} />
        </div>

        <div
          onClick={() => navigate(`${financeBase}/reports`)}
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
            borderRadius: 14,
            padding: '16px 18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease',
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.textHi, marginBottom: 2 }}>
              Collection Reports
            </div>
            <div style={{ fontSize: 11.5, color: t.textMid }}>Cohort & class level summaries</div>
          </div>
          <ChevronRight className="h-4 w-4" style={{ color: t.textLow }} />
        </div>
      </div>
    </div>
  );
}
