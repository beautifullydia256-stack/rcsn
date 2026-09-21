import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  TrendingUp,
  CreditCard,
  Banknote,
  FileText,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  DollarSign,
  Download,
  Printer,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Building,
  RefreshCw,
  Sparkles,
  History,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useAcademicPeriod } from '../../lib/academicPeriodTerminology';
import {
  fetchAccountantDashboardMetrics,
  fetchRecentAccountantTransactions,
  type AccountantDashboardMetrics,
} from '../../lib/accountantDashboardMetrics';
import {
  getTokens,
  fmtUGX,
  fmtUGXCompact,
  largestRemainderPercentages,
  bezierPath,
  SORA,
  INTER,
} from '../../styles/posThemeTokens';

function computeNiceMax(val: number): number {
  if (val <= 0) return 100000;
  const target = val * 1.15;
  const exponent = Math.floor(Math.log10(target));
  const power = Math.pow(10, exponent);
  const fraction = target / power;
  let niceFraction = 1;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 2.5) niceFraction = 2.5;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;
  return Math.round(niceFraction * power);
}

function formatDateShort(iso: string): string {
  if (!iso) return '';
  try {
    const parts = iso.split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString('en-UG', { day: 'numeric', month: 'short' });
    }
    return new Date(iso).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
}

function formatDateFull(iso: string): string {
  if (!iso) return '';
  try {
    const parts = iso.split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString('en-UG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    }
    return new Date(iso).toLocaleDateString('en-UG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

interface PosFinanceDashboardProps {
  onOpenRecordPayment?: (studentId?: string) => void;
  onOpenRecordExpense?: () => void;
}

export default function PosFinanceDashboard({
  onOpenRecordPayment,
  onOpenRecordExpense,
}: PosFinanceDashboardProps) {
  const navigate = useNavigate();
  const authSchoolId = useAuthStore((s) => s.schoolId);
  const setSchoolId = useAuthStore((s) => s.setSchoolId);
  const queryClient = useQueryClient();
  const [effectiveSchoolId, setEffectiveSchoolId] = useState<string | null>(authSchoolId);

  // Ensure schoolId is resolved even if auth store is hydrating
  React.useEffect(() => {
    if (authSchoolId) {
      setEffectiveSchoolId(authSchoolId);
      return;
    }
    async function resolveSchool() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('users').select('school_id').eq('user_id', user.id).maybeSingle();
      if (data?.school_id) {
        setEffectiveSchoolId(data.school_id);
        setSchoolId(data.school_id);
      }
    }
    void resolveSchool();
  }, [authSchoolId, setSchoolId]);

  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t = getTokens(isDark);
  const { isTertiary, labels } = useAcademicPeriod();

  const [period, setPeriod] = useState<'7d' | '30d' | 'term' | 'all'>('term');
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; val: number; date: string } | null>(null);

  // Fetch real financial metrics
  const {
    data: metrics,
    isLoading: loadingMetrics,
    refetch,
    isFetching,
  } = useQuery<AccountantDashboardMetrics>({
    queryKey: ['accountant-dashboard-metrics', effectiveSchoolId],
    queryFn: () => fetchAccountantDashboardMetrics(supabase, effectiveSchoolId!),
    enabled: Boolean(effectiveSchoolId),
    staleTime: 60 * 1000,
  });

  const { data: recentTransactions = [] } = useQuery({
    queryKey: ['accountant-recent-transactions', effectiveSchoolId],
    queryFn: () => fetchRecentAccountantTransactions(supabase, effectiveSchoolId!, 'month'),
    enabled: Boolean(effectiveSchoolId),
    staleTime: 60 * 1000,
  });

  // Fetch real payment trends AND synchronized payment channels directly from student_payments
  const { data: periodPaymentData } = useQuery({
    queryKey: ['accountant-payment-trends-and-channels', effectiveSchoolId, period, metrics?.currentTerm?.id],
    queryFn: async () => {
      if (!effectiveSchoolId) {
        return {
          trends: [] as { date: string; amount: number }[],
          channels: { bank: 0, cash: 0, school_pay: 0, sure_pay: 0 },
          totalAmount: 0,
          peakDay: { date: '', amount: 0 },
          activeDaysCount: 0,
        };
      }

      let query = supabase
        .from('student_payments')
        .select('amount_paid, payment_date, payment_method, term_id')
        .eq('school_id', effectiveSchoolId)
        .is('reversed_at', null);

      const now = new Date();
      if (period === '7d') {
        const d = new Date();
        d.setDate(now.getDate() - 7);
        query = query.gte('payment_date', d.toISOString().slice(0, 10));
      } else if (period === '30d') {
        const d = new Date();
        d.setDate(now.getDate() - 30);
        query = query.gte('payment_date', d.toISOString().slice(0, 10));
      } else if (period === 'term') {
        if (metrics?.currentTerm?.start_date) {
          query = query.gte('payment_date', metrics.currentTerm.start_date);
          if (metrics.currentTerm.end_date) {
            query = query.lte('payment_date', metrics.currentTerm.end_date);
          }
        } else {
          const termStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 4) * 4, 1);
          query = query.gte('payment_date', termStart.toISOString().slice(0, 10));
        }
      }
      // 'all' has no date bounds: aggregates entire recorded payment history

      const { data, error } = await query.order('payment_date', { ascending: true });
      if (error || !data || data.length === 0) {
        return {
          trends: [] as { date: string; amount: number }[],
          channels: { bank: 0, cash: 0, school_pay: 0, sure_pay: 0 },
          totalAmount: 0,
          peakDay: { date: '', amount: 0 },
          activeDaysCount: 0,
        };
      }

      const channels = { bank: 0, cash: 0, school_pay: 0, sure_pay: 0 };
      const dateMap = new Map<string, number>();
      let totalAmount = 0;
      let peakAmount = 0;
      let peakDate = '';

      for (const row of data) {
        const amt = Number(row.amount_paid || 0);
        if (amt <= 0) continue;
        totalAmount += amt;

        // Categorize payment channels
        const m = (row.payment_method || '').toLowerCase().trim();
        if (m === 'cash' || m.includes('cash')) {
          channels.cash += amt;
        } else if (m === 'school_pay' || m.includes('schoolpay') || m.includes('school_pay')) {
          channels.school_pay += amt;
        } else if (m === 'sure_pay' || m.includes('surepay') || m.includes('sure_pay')) {
          channels.sure_pay += amt;
        } else {
          // bank, mobile_money, card, cheque, pos, online, etc.
          channels.bank += amt;
        }

        // Aggregate daily trends
        const d = row.payment_date;
        if (d) {
          const prev = dateMap.get(d) || 0;
          const next = prev + amt;
          dateMap.set(d, next);
          if (next > peakAmount) {
            peakAmount = next;
            peakDate = d;
          }
        }
      }

      const trends = Array.from(dateMap.entries()).map(([date, amount]) => ({ date, amount }));
      return {
        trends,
        channels,
        totalAmount,
        peakDay: { date: peakDate, amount: peakAmount },
        activeDaysCount: dateMap.size,
      };
    },
    enabled: Boolean(effectiveSchoolId),
    staleTime: 60 * 1000,
  });

    // Fetch top debtors aggregated by student (consolidates multiple terms so each student appears once with their true total balance)
  const { data: topDebtors = [], refetch: refetchTopDebtors } = useQuery({
    queryKey: ['accountant', 'top-debtors', effectiveSchoolId],
    queryFn: async () => {
      if (!effectiveSchoolId) return [];
      const { data: balanceRows, error: balErr } = await supabase
        .from('student_balances')
        .select('student_id, balance, total_fees, total_paid')
        .eq('school_id', effectiveSchoolId);

      if (balErr || !balanceRows) return [];

      // Group & aggregate balances by student_id
      const studentAgg = new Map<string, { balance: number; total_fees: number; total_paid: number }>();
      for (const r of balanceRows) {
        const sid = r.student_id;
        if (!sid) continue;
        const cur = studentAgg.get(sid) || { balance: 0, total_fees: 0, total_paid: 0 };
        cur.balance += Math.max(0, Number(r.balance || 0));
        cur.total_fees += Number(r.total_fees || 0);
        cur.total_paid += Number(r.total_paid || 0);
        studentAgg.set(sid, cur);
      }

      // Filter only students with positive outstanding debt, sort descending by real total balance
      const sortedEntries = Array.from(studentAgg.entries())
        .filter(([_, stats]) => stats.balance > 0)
        .sort((a, b) => b[1].balance - a[1].balance)
        .slice(0, 5);

      if (sortedEntries.length === 0) return [];

      const topStudentIds = sortedEntries.map(([id]) => id);
      const { data: studentsData } = await supabase
        .from('students')
        .select('student_id, name, current_class, student_phone, guardian_phone')
        .in('student_id', topStudentIds);

      const studentMap = new Map((studentsData || []).map((s: any) => [s.student_id, s]));

      return sortedEntries.map(([id, stats]) => {
        const s = studentMap.get(id);
        return {
          id,
          name: s?.name || 'Unknown Student',
          class: s?.current_class || '—',
          phone: s?.student_phone || s?.guardian_phone || '',
          balance: stats.balance,
          totalFees: stats.total_fees,
        };
      });
    },
    enabled: Boolean(effectiveSchoolId),
    staleTime: 5 * 1000,
    refetchOnWindowFocus: true,
  });

  // Realtime subscription: whenever student_payments or student_balances change, automatically refresh top debtors
  useEffect(() => {
    if (!effectiveSchoolId) return;

    const channel = supabase
      .channel(`debtors-live-${effectiveSchoolId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_payments', filter: `school_id=eq.${effectiveSchoolId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['accountant'] });
          refetchTopDebtors();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_balances', filter: `school_id=eq.${effectiveSchoolId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['accountant'] });
          refetchTopDebtors();
        }
      )
      .subscribe();

    const handleCustomPaymentEvent = () => {
      queryClient.invalidateQueries({ queryKey: ['accountant'] });
      refetchTopDebtors();
    };

    window.addEventListener('pweza:payment-recorded', handleCustomPaymentEvent);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('pweza:payment-recorded', handleCustomPaymentEvent);
    };
  }, [effectiveSchoolId, refetchTopDebtors]);

  // Calculate clearance rate
  const clearanceRate = useMemo(() => {
    if (!metrics) return 0;
    if (metrics.termPerformance.collectionRatePercent != null) {
      return Math.round(metrics.termPerformance.collectionRatePercent);
    }
    const expected = metrics.termPerformance.feesExpected;
    const collected = metrics.termPerformance.feesCollectedAttributed;
    if (expected > 0) return Math.min(100, Math.round((collected / expected) * 100));
    return 0;
  }, [metrics]);

  // Payment methods distribution - synchronized 1:1 with active timeframe filter
  const paymentBreakdown = useMemo(() => {
    const channels = periodPaymentData?.channels || { bank: 0, cash: 0, school_pay: 0, sure_pay: 0 };
    const amounts = [channels.bank, channels.cash, channels.school_pay, channels.sure_pay];
    const total = amounts.reduce((a, b) => a + b, 0);
    const percentages = total > 0 ? largestRemainderPercentages(amounts) : [0, 0, 0, 0];
    return [
      { label: 'Bank & Mobile Money', amount: channels.bank, percent: percentages[0] || 0, color: t.blue },
      { label: 'Physical Cash', amount: channels.cash, percent: percentages[1] || 0, color: t.mint },
      { label: 'School Pay', amount: channels.school_pay, percent: percentages[2] || 0, color: t.gold },
      { label: 'Sure Pay', amount: channels.sure_pay, percent: percentages[3] || 0, color: t.warn },
    ];
  }, [periodPaymentData, t]);

  // Chart plotting geometry & coordinates within SVG viewBox="0 0 660 195"
  const plotLeft = 75;
  const plotRight = 635;
  const plotTop = 22;
  const plotBottom = 152;

  const realPaymentTrends = periodPaymentData?.trends || [];
  const maxCollectionAmount = useMemo(() => {
    if (realPaymentTrends.length === 0) return 0;
    return Math.max(...realPaymentTrends.map((d) => d.amount));
  }, [realPaymentTrends]);

  const niceMax = useMemo(() => {
    return computeNiceMax(maxCollectionAmount);
  }, [maxCollectionAmount]);

  const yAxisTicks = useMemo(() => {
    const tiers = [1, 0.75, 0.5, 0.25, 0];
    return tiers.map((tier) => ({
      tier,
      val: Math.round(niceMax * tier),
      y: plotTop + (1 - tier) * (plotBottom - plotTop),
    }));
  }, [niceMax]);

  // 100% Real Bezier curve generation with accurate monetary scale
  const { chartPath, chartPoints, areaPath } = useMemo(() => {
    if (realPaymentTrends.length === 0) {
      return { chartPath: '', chartPoints: [], areaPath: '' };
    }

    if (realPaymentTrends.length === 1) {
      const pt = realPaymentTrends[0];
      const y = plotBottom - (pt.amount / niceMax) * (plotBottom - plotTop);
      const cPath = `M ${plotLeft} ${y} L ${plotRight} ${y}`;
      return {
        chartPath: cPath,
        chartPoints: [{ x: (plotLeft + plotRight) / 2, y, val: pt.amount, idx: 0, date: pt.date }],
        areaPath: `${cPath} L ${plotRight} ${plotBottom} L ${plotLeft} ${plotBottom} Z`,
      };
    }

    const pts: [number, number][] = realPaymentTrends.map((d, i) => {
      const x = plotLeft + (i / (realPaymentTrends.length - 1)) * (plotRight - plotLeft);
      const y = plotBottom - (d.amount / niceMax) * (plotBottom - plotTop);
      return [x, y];
    });

    const cPath = bezierPath(pts);
    const aPath = pts.length > 0
      ? `${cPath} L ${pts[pts.length - 1][0]} ${plotBottom} L ${pts[0][0]} ${plotBottom} Z`
      : '';

    return {
      chartPath: cPath,
      chartPoints: pts.map((p, i) => ({
        x: p[0],
        y: p[1],
        val: realPaymentTrends[i].amount,
        idx: i,
        date: realPaymentTrends[i].date,
      })),
      areaPath: aPath,
    };
  }, [realPaymentTrends, niceMax]);

  const xAxisDateTicks = useMemo(() => {
    if (chartPoints.length === 0) return [];
    if (chartPoints.length <= 6) {
      return chartPoints.map((pt) => ({ x: pt.x, date: formatDateShort(pt.date) }));
    }
    const n = chartPoints.length;
    const indices = [
      0,
      Math.round((n - 1) * 0.25),
      Math.round((n - 1) * 0.5),
      Math.round((n - 1) * 0.75),
      n - 1,
    ];
    const uniqueIndices = Array.from(new Set(indices));
    return uniqueIndices.map((idx) => ({
      x: chartPoints[idx].x,
      date: formatDateShort(chartPoints[idx].date),
    }));
  }, [chartPoints]);

  const periodLabel =
    period === '7d'
      ? 'Last 7 Days'
      : period === '30d'
      ? 'Last 30 Days'
      : period === 'term'
      ? labels.currentPeriod
      : 'All Time';

  const dailyAvg = useMemo(() => {
    const total = periodPaymentData?.totalAmount || 0;
    const days = periodPaymentData?.activeDaysCount || 0;
    if (total <= 0 || days <= 0) return 0;
    return Math.round(total / days);
  }, [periodPaymentData]);

  const handleOpenPayment = () => {
    if (onOpenRecordPayment) onOpenRecordPayment();
    else navigate('/dashboard/accountant/payments');
  };

  const handleOpenExpense = () => {
    if (onOpenRecordExpense) onOpenRecordExpense();
    else navigate('/dashboard/accountant/expenses');
  };

  return (
    <div
      style={{
        background: t.screenBg,
        minHeight: '100%',
        color: t.textHi,
        fontFamily: INTER,
        padding: '24px 28px 48px',
        transition: 'background 0.2s, color 0.2s',
      }}
    >
      {/* ── ROW 0: GREETING & HERO ACTION BUTTONS ──────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24,
        }}
      >
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
            Financial Dashboard
          </div>
          <div
            style={{
              fontSize: 12.5,
              color: t.textMid,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>{metrics?.currentTerm?.label || (isTertiary ? 'Semester Financial Overview' : 'Term Financial Overview')}</span>
            <span>·</span>
            <span>
              {new Date().toLocaleDateString('en-UG', {
                weekday: 'long',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Refresh button */}
          <button
            onClick={() => refetch()}
            title="Refresh Ledger"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 38,
              height: 38,
              borderRadius: 10,
              border: `1px solid ${t.stroke}`,
              background: t.panel,
              color: t.textMid,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
          </button>

          {/* Secondary Action: Record Expense */}
          <button
            onClick={handleOpenExpense}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 15px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              background: t.panel,
              color: t.textHi,
              border: `1px solid ${t.stroke}`,
              boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
              transition: 'all 0.15s',
            }}
          >
            <ArrowDownRight size={16} color={t.warn} />
            <span>Record Expense</span>
          </button>

          {/* Secondary Action: Billing */}
          <button
            onClick={() => navigate('/dashboard/accountant/billing')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 15px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              background: t.panel,
              color: t.textHi,
              border: `1px solid ${t.stroke}`,
              boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
              transition: 'all 0.15s',
            }}
          >
            <FileText size={16} color={t.blue} />
            <span>Invoices & Billing</span>
          </button>

          {/* Student Payment Ledger Button */}
          <button
            onClick={() => navigate('/dashboard/accountant/student-ledger')}
            title="Track all payments ever made by any student with full ledger statement"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 15px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              background: t.panel,
              color: t.textHi,
              border: `1px solid ${t.stroke}`,
              boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
              transition: 'all 0.15s',
            }}
          >
            <History size={16} color={t.mint} />
            <span>Student Payment Ledger</span>
          </button>

          {/* SIGNATURE POS GLOWING CTA BUTTON */}
          <button
            onClick={handleOpenPayment}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '10px 20px',
              borderRadius: 10,
              fontSize: 13.5,
              fontWeight: 800,
              fontFamily: SORA,
              cursor: 'pointer',
              border: 'none',
              background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
              color: t.ctaText,
              boxShadow: '0 8px 22px rgba(61,232,160,0.30)',
              letterSpacing: '0.2px',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
          >
            <Sparkles size={16} />
            <span>+ Record Fee Payment</span>
          </button>
        </div>
      </div>

      {/* ── ROW 1: 5-CARD KPI STRIP ─────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 14,
          marginBottom: 24,
        }}
      >
        {/* KPI 1: Hero Gold Collected Revenue */}
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.strokeHi}`,
            borderRadius: 14,
            padding: '16px 18px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: isDark ? t.moneyGlow : '0 4px 14px rgba(201,130,10,0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: t.gold,
              }}
            >
              COLLECTED REVENUE
            </span>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: t.goldDim,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: t.gold,
              }}
            >
              <Banknote size={16} />
            </div>
          </div>
          <div
            style={{
              fontFamily: SORA,
              fontSize: 22,
              fontWeight: 800,
              color: t.gold,
              letterSpacing: '-0.3px',
              marginBottom: 6,
            }}
          >
            UGX {fmtUGX(metrics?.termPerformance.cashIn ?? 0)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: t.textMid }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 6px',
                borderRadius: 5,
                background: t.mintDim,
                color: t.mintInk,
                fontWeight: 700,
                fontSize: 10.5,
              }}
            >
              +{clearanceRate}% rate
            </span>
            <span>Today: UGX {fmtUGXCompact(metrics?.cashActivity.todayAllTerms ?? 0)}</span>
          </div>
        </div>

        {/* KPI 2: Net Cash Position */}
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
            borderRadius: 14,
            padding: '16px 18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: t.mint,
              }}
            >
              NET CASH SURPLUS
            </span>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: t.mintDim,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: t.mint,
              }}
            >
              <TrendingUp size={16} />
            </div>
          </div>
          <div
            style={{
              fontFamily: SORA,
              fontSize: 22,
              fontWeight: 800,
              color: t.textHi,
              letterSpacing: '-0.3px',
              marginBottom: 6,
            }}
          >
            UGX {fmtUGX(metrics?.schoolCashPosition.netCashSurplus ?? 0)}
          </div>
          <div style={{ fontSize: 11.5, color: t.textMid }}>
            Expenses: UGX {fmtUGXCompact(metrics?.schoolCashPosition.totalExpensesApprovedPaidCurrentTerm ?? 0)}
          </div>
        </div>

        {/* KPI 3: Invoiced / Expected Fees */}
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
            borderRadius: 14,
            padding: '16px 18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: t.blue,
              }}
            >
              EXPECTED BILLING
            </span>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: t.blueDim,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: t.blue,
              }}
            >
              <FileText size={16} />
            </div>
          </div>
          <div
            style={{
              fontFamily: SORA,
              fontSize: 22,
              fontWeight: 800,
              color: t.textHi,
              letterSpacing: '-0.3px',
              marginBottom: 6,
            }}
          >
            UGX {fmtUGX(metrics?.termPerformance.feesExpected ?? 0)}
          </div>
          <div style={{ fontSize: 11.5, color: t.textMid }}>
            Term Attributed: UGX {fmtUGXCompact(metrics?.termPerformance.feesCollectedAttributed ?? 0)}
          </div>
        </div>

        {/* KPI 4: Outstanding Receivables */}
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
            borderRadius: 14,
            padding: '16px 18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: t.red,
              }}
            >
              TOTAL OUTSTANDING
            </span>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: t.redDim,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: t.red,
              }}
            >
              <AlertCircle size={16} />
            </div>
          </div>
          <div
            style={{
              fontFamily: SORA,
              fontSize: 22,
              fontWeight: 800,
              color: t.red,
              letterSpacing: '-0.3px',
              marginBottom: 6,
            }}
          >
            UGX {fmtUGX(metrics?.receivablesAllTerms.totalOutstanding ?? 0)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: t.textMid }}>
            <span
              style={{
                padding: '2px 6px',
                borderRadius: 5,
                background: t.redDim,
                color: t.red,
                fontWeight: 700,
                fontSize: 10.5,
              }}
            >
              {metrics?.receivablesAllTerms.debtorStudentCount ?? 0} Students
            </span>
            <span>with balance</span>
          </div>
        </div>

        {/* KPI 5: Collection Efficiency */}
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
            borderRadius: 14,
            padding: '16px 18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: t.textLow,
              }}
            >
              CLEARANCE EFFICIENCY
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: clearanceRate >= 75 ? t.mintInk : t.warn,
              }}
            >
              {clearanceRate >= 75 ? 'Healthy' : 'Attention'}
            </span>
          </div>
          <div
            style={{
              fontFamily: SORA,
              fontSize: 22,
              fontWeight: 800,
              color: t.textHi,
              letterSpacing: '-0.3px',
              marginBottom: 8,
            }}
          >
            {clearanceRate}%
          </div>
          {/* Micro Progress Bar */}
          <div
            style={{
              width: '100%',
              height: 6,
              background: t.track,
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${clearanceRate}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${t.ctaGradA}, ${t.ctaGradB})`,
                borderRadius: 3,
              }}
            />
          </div>
        </div>
      </div>

      {/* ── ROW 2: DUAL-LINE BEZIER TREND & PAYMENT METHODS ────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Bezier Trend Chart (takes ~65% on wide desktop) */}
        <div
          style={{
            gridColumn: 'span 2',
            background: t.panel,
            border: `1px solid ${t.stroke}`,
            borderRadius: 14,
            padding: '20px 22px',
          }}
        >
          {/* Header & Period Switcher */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div>
              <div style={{ fontFamily: SORA, fontSize: 15, fontWeight: 700, color: t.textHi }}>
                Fee Collection Velocity & Trends
              </div>
              <div style={{ fontSize: 11.5, color: t.textMid, marginTop: 2 }}>
                Real-time cashflow trajectory across academic timeline
              </div>
            </div>

            {/* Period switcher */}
            <div
              style={{
                display: 'flex',
                background: t.fieldBg,
                border: `1px solid ${t.stroke}`,
                borderRadius: 8,
                padding: 2,
              }}
            >
              {(['7d', '30d', 'term', 'all'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: 'none',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: period === p ? t.mintDim : 'transparent',
                    color: period === p ? t.mintInk : t.textMid,
                    transition: 'all 0.15s',
                  }}
                >
                  {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : p === 'term' ? labels.currentPeriod : 'All Time'}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Metrics Reference Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              flexWrap: 'wrap',
              padding: '8px 12px',
              borderRadius: 8,
              background: t.fieldBg,
              border: `1px solid ${t.stroke}`,
              marginBottom: 14,
              fontSize: 11.5,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: t.textMid }}>Period Total:</span>
              <span style={{ fontFamily: SORA, fontWeight: 700, color: t.mintInk }}>
                UGX {fmtUGX(periodPaymentData?.totalAmount || 0)}
              </span>
            </div>
            <div style={{ width: 1, height: 14, background: t.stroke }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: t.textMid }}>Peak Day:</span>
              <span style={{ fontFamily: SORA, fontWeight: 700, color: t.textHi }}>
                UGX {fmtUGX(periodPaymentData?.peakDay.amount || 0)}
              </span>
              {periodPaymentData?.peakDay.date && (
                <span style={{ color: t.textMid, fontSize: 10.5 }}>
                  ({formatDateShort(periodPaymentData.peakDay.date)})
                </span>
              )}
            </div>
            <div style={{ width: 1, height: 14, background: t.stroke }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: t.textMid }}>Daily Avg:</span>
              <span style={{ fontFamily: SORA, fontWeight: 700, color: t.textHi }}>
                UGX {fmtUGXCompact(dailyAvg)}/d
              </span>
            </div>
          </div>

          {/* SVG Smooth Bezier Line Graph with Full Monetary & Date Scale */}
          <div style={{ width: '100%', height: 195, position: 'relative' }}>
            <svg
              viewBox="0 0 660 195"
              style={{ width: '100%', height: '100%', overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="mintArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={t.mint} stopOpacity={isDark ? 0.24 : 0.16} />
                  <stop offset="100%" stopColor={t.mint} stopOpacity={0.0} />
                </linearGradient>
              </defs>

              {/* Y-Axis Horizontal Grid Lines & Monetary Scale Labels */}
              {yAxisTicks.map((tick) => (
                <g key={tick.tier}>
                  {/* Monetary Scale Text Label (UGX) */}
                  <text
                    x={plotLeft - 10}
                    y={tick.y + 3.5}
                    textAnchor="end"
                    fill={tick.tier === 0 ? t.textHi : t.textMid}
                    fontSize="10"
                    fontFamily={INTER}
                    fontWeight={tick.tier === 0 ? '700' : '500'}
                  >
                    {tick.tier === 0 ? 'UGX 0' : `UGX ${fmtUGXCompact(tick.val)}`}
                  </text>

                  {/* Horizontal Axis Grid Line */}
                  <line
                    x1={plotLeft}
                    y1={tick.y}
                    x2={plotRight}
                    y2={tick.y}
                    stroke={tick.tier === 0 ? t.strokeHi : t.gridLine}
                    strokeDasharray={tick.tier === 0 ? undefined : '3 4'}
                    strokeWidth={tick.tier === 0 ? '1.4' : '1'}
                  />
                </g>
              ))}

              {/* X-Axis Date Ticks and Labels along the baseline */}
              {xAxisDateTicks.map((tick, i) => (
                <g key={i}>
                  <line
                    x1={tick.x}
                    y1={plotBottom}
                    x2={tick.x}
                    y2={plotBottom + 5}
                    stroke={t.strokeHi}
                    strokeWidth="1.2"
                  />
                  <text
                    x={tick.x}
                    y={plotBottom + 18}
                    textAnchor="middle"
                    fill={t.textMid}
                    fontSize="10"
                    fontFamily={INTER}
                    fontWeight="600"
                  >
                    {tick.date}
                  </text>
                </g>
              ))}

              {/* Gradient Area Fill */}
              {areaPath && <path d={areaPath} fill="url(#mintArea)" />}

              {/* Smooth Bezier Line */}
              {chartPath && (
                <path
                  d={chartPath}
                  fill="none"
                  stroke={t.mint}
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data points with interactive hover target */}
              {chartPoints.map((pt) => (
                <circle
                  key={pt.idx}
                  cx={pt.x}
                  cy={pt.y}
                  r={hoveredPoint?.val === pt.val ? 5.5 : 3.8}
                  fill={t.panel}
                  stroke={t.mint}
                  strokeWidth="2.2"
                  style={{ cursor: 'pointer', transition: 'r 0.15s' }}
                  onMouseEnter={() => setHoveredPoint({ x: pt.x, y: pt.y, val: pt.val, date: pt.date })}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              ))}
            </svg>

            {/* Empty State Overlay */}
            {realPaymentTrends.length === 0 && (
              <div
                style={{
                  position: 'absolute',
                  left: plotLeft,
                  right: 660 - plotRight,
                  top: plotTop,
                  height: plotBottom - plotTop,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: t.textHi, marginBottom: 3 }}>
                  No Collections Recorded
                </div>
                <div style={{ fontSize: 11, color: t.textMid, maxWidth: 260 }}>
                  No student fee payments found for {periodLabel.toLowerCase()}.
                </div>
              </div>
            )}

            {/* Rich Hover Tooltip */}
            {hoveredPoint && (
              <div
                style={{
                  position: 'absolute',
                  left: `${(hoveredPoint.x / 660) * 100}%`,
                  top: Math.max(8, hoveredPoint.y - 52),
                  transform: 'translateX(-50%)',
                  background: t.panel,
                  border: `1px solid ${t.strokeHi}`,
                  padding: '6px 10px',
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  color: t.mintInk,
                  pointerEvents: 'none',
                  boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 6px 18px rgba(0,0,0,0.12)',
                  whiteSpace: 'nowrap',
                  zIndex: 10,
                }}
              >
                <div style={{ fontSize: 10, color: t.textMid, fontWeight: 500, marginBottom: 2 }}>
                  {formatDateFull(hoveredPoint.date)}
                </div>
                <div style={{ fontFamily: SORA, fontWeight: 800, color: t.mintInk, fontSize: 12.5 }}>
                  UGX {fmtUGX(hoveredPoint.val)}
                </div>
                {periodPaymentData && periodPaymentData.totalAmount > 0 && (
                  <div style={{ fontSize: 9.5, color: t.textMid, marginTop: 2 }}>
                    {Math.round((hoveredPoint.val / periodPaymentData.totalAmount) * 100)}% of period total
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Payment Channels Distribution - Synchronized 1:1 with Timeframe Filter */}
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
            borderRadius: 14,
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ fontFamily: SORA, fontSize: 15, fontWeight: 700, color: t.textHi }}>
              Payment Channels
            </div>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 6,
                background: t.fieldBg,
                color: t.mintInk,
                border: `1px solid ${t.stroke}`,
              }}
            >
              {periodLabel}
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: t.textMid, marginBottom: 18 }}>
            {periodPaymentData && periodPaymentData.totalAmount > 0
              ? `Total collected: UGX ${fmtUGX(periodPaymentData.totalAmount)}`
              : 'No collections in selected timeframe'}
          </div>

          {/* Segmented Progress Bar */}
          <div
            style={{
              display: 'flex',
              height: 10,
              borderRadius: 5,
              overflow: 'hidden',
              background: t.track,
              marginBottom: 20,
            }}
          >
            {paymentBreakdown.map((item, i) => (
              <div
                key={i}
                style={{
                  width: `${item.percent}%`,
                  background: item.color,
                  transition: 'width 0.3s ease',
                }}
                title={`${item.label}: ${item.percent}% (UGX ${fmtUGX(item.amount)})`}
              />
            ))}
          </div>

          {/* Channel Legend Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, justifyContent: 'center' }}>
            {paymentBreakdown.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 12.5,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                  <span style={{ color: t.textHi, fontWeight: 500 }}>{item.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: SORA, fontWeight: 700, color: t.textHi }}>
                    UGX {fmtUGXCompact(item.amount)}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: t.textMid,
                      minWidth: 34,
                      textAlign: 'right',
                    }}
                  >
                    {item.percent}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Live Sync Footer Notice */}
          <div
            style={{
              marginTop: 'auto',
              paddingTop: 14,
              borderTop: `1px solid ${t.stroke}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 11,
              color: t.textMid,
            }}
          >
            <span>Timeframe sync</span>
            <span style={{ fontWeight: 600, color: t.mintInk }}>Live student payments</span>
          </div>
        </div>
      </div>

      {/* ── ROW 3: MODULAR INTELLIGENCE (TOP DEBTORS & VELOCITY) ────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Top Debtors for Immediate Follow-up */}
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
            borderRadius: 14,
            padding: '20px 22px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <div>
              <div style={{ fontFamily: SORA, fontSize: 14.5, fontWeight: 700, color: t.textHi }}>
                Priority Debtor Follow-up
              </div>
              <div style={{ fontSize: 11.5, color: t.textMid }}>
                Students with largest overdue fee balances
              </div>
            </div>
            <button
              onClick={() => navigate('/dashboard/accountant/outstanding')}
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                color: t.blue,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              View All Debtors →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topDebtors.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: t.textMid, fontSize: 12.5 }}>
                No outstanding student balances found.
              </div>
            ) : (
              topDebtors.map((st) => (
                <div
                  key={st.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 9,
                    background: t.fieldBg,
                    border: `1px solid ${t.stroke}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {st.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: t.textHi }}>{st.name}</div>
                      <div style={{ fontSize: 11, color: t.textMid }}>Class: {st.class}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: SORA, fontSize: 12.5, fontWeight: 700, color: t.red }}>
                        UGX {fmtUGXCompact(st.balance)}
                      </div>
                      <div style={{ fontSize: 10.5, color: t.textMid }}>Owed</div>
                    </div>
                    {onOpenRecordPayment && (
                      <button
                        onClick={() => onOpenRecordPayment(st.id)}
                        title="Record Payment"
                        style={{
                          padding: '5px 9px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          background: t.mintDim,
                          color: t.mintInk,
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Pay
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/dashboard/accountant/student-ledger?student=${st.id}`)}
                      title="View all-time payment ledger and statement"
                      style={{
                        padding: '5px 9px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        background: t.panel,
                        color: t.blue,
                        border: `1px solid ${t.stroke}`,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <History size={12} />
                      Ledger
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Collection Activity Summary */}
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
            borderRadius: 14,
            padding: '20px 22px',
          }}
        >
          <div style={{ fontFamily: SORA, fontSize: 14.5, fontWeight: 700, color: t.textHi, marginBottom: 4 }}>
            Cash Velocity Benchmarks
          </div>
          <div style={{ fontSize: 11.5, color: t.textMid, marginBottom: 16 }}>
            Receipt timing and cash intake rates
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
            <div
              style={{
                padding: '12px 10px',
                borderRadius: 10,
                background: t.fieldBg,
                border: `1px solid ${t.stroke}`,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: t.textMid, textTransform: 'uppercase' }}>
                Today
              </div>
              <div style={{ fontFamily: SORA, fontSize: 14, fontWeight: 800, color: t.mint, marginTop: 4 }}>
                UGX {fmtUGXCompact(metrics?.cashActivity.todayAllTerms ?? 0)}
              </div>
            </div>

            <div
              style={{
                padding: '12px 10px',
                borderRadius: 10,
                background: t.fieldBg,
                border: `1px solid ${t.stroke}`,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: t.textMid, textTransform: 'uppercase' }}>
                Last 7 Days
              </div>
              <div style={{ fontFamily: SORA, fontSize: 14, fontWeight: 800, color: t.blue, marginTop: 4 }}>
                UGX {fmtUGXCompact(metrics?.cashActivity.last7DaysAllTerms ?? 0)}
              </div>
            </div>

            <div
              style={{
                padding: '12px 10px',
                borderRadius: 10,
                background: t.fieldBg,
                border: `1px solid ${t.stroke}`,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: t.textMid, textTransform: 'uppercase' }}>
                Month to Date
              </div>
              <div style={{ fontFamily: SORA, fontSize: 14, fontWeight: 800, color: t.gold, marginTop: 4 }}>
                UGX {fmtUGXCompact(metrics?.cashActivity.monthToDateAllTerms ?? 0)}
              </div>
            </div>
          </div>

          {/* Quick links to core financial tasks */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            <button
              onClick={() => navigate('/dashboard/accountant/receipts')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 8,
                background: t.cardGradA,
                border: `1px solid ${t.stroke}`,
                color: t.textHi,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <span>View All Receipts</span>
              <ChevronRight size={14} color={t.textMid} />
            </button>

            <button
              onClick={() => navigate('/dashboard/accountant/reports')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 8,
                background: t.cardGradA,
                border: `1px solid ${t.stroke}`,
                color: t.textHi,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <span>Financial Reports</span>
              <ChevronRight size={14} color={t.textMid} />
            </button>
          </div>
        </div>
      </div>

      {/* ── ROW 4: RECENT FINANCIAL TRANSACTIONS TABLE ─────────────────────── */}
      <div
        style={{
          background: t.panel,
          border: `1px solid ${t.stroke}`,
          borderRadius: 14,
          padding: '20px 22px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ fontFamily: SORA, fontSize: 15, fontWeight: 700, color: t.textHi }}>
              Recent Transactions
            </div>
            <div style={{ fontSize: 11.5, color: t.textMid }}>
              Live real-time feed of payments and approved expenditures
            </div>
          </div>

          <button
            onClick={() => navigate('/dashboard/accountant/payments')}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: t.blue,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Full Payment Log →
          </button>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${t.stroke}`, color: t.textMid, textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>TRANSACTION / STUDENT</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>TYPE & CHANNEL</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>DATE & TIME</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>AMOUNT</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: t.textMid }}>
                    No recent transactions recorded this period.
                  </td>
                </tr>
              ) : (
                recentTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    style={{
                      borderBottom: `1px solid ${t.divider}`,
                      transition: 'background 0.12s',
                    }}
                  >
                    <td style={{ padding: '11px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 7,
                            background: tx.type === 'payment' ? t.mintDim : t.warnDim,
                            color: tx.type === 'payment' ? t.mint : t.warn,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {tx.type === 'payment' ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: t.textHi }}>{tx.name}</div>
                          <div style={{ fontSize: 11, color: t.textMid }}>{tx.account}</div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '11px 12px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          background: tx.type === 'payment' ? t.mintDim : t.warnDim,
                          color: tx.type === 'payment' ? t.mintInk : t.warn,
                        }}
                      >
                        {tx.type === 'payment' ? 'Fee Collection' : 'Expenditure'}
                      </span>
                    </td>

                    <td style={{ padding: '11px 12px', color: t.textMid, whiteSpace: 'nowrap' }}>
                      {tx.date} · {tx.time}
                    </td>

                    <td
                      style={{
                        padding: '11px 12px',
                        textAlign: 'right',
                        fontFamily: SORA,
                        fontWeight: 700,
                        color: tx.type === 'payment' ? t.gold : t.warn,
                      }}
                    >
                      {tx.type === 'payment' ? '+' : '-'}UGX {fmtUGX(Math.abs(tx.amount))}
                    </td>

                    <td style={{ padding: '11px 12px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: 10.5,
                          fontWeight: 700,
                          background: tx.status === 'Completed' ? t.mintDim : t.warnDim,
                          color: tx.status === 'Completed' ? t.mintInk : t.warn,
                        }}
                      >
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
