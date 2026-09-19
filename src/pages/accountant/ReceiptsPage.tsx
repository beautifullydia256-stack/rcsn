import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Filter,
  Download,
  Receipt,
  CheckCircle2,
  Calendar,
  Clock,
  Printer,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  X,
  CreditCard,
  User,
  Phone,
  FileText,
  DollarSign,
  Landmark,
  Smartphone,
  Banknote,
  Share2,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { fetchReceipts, RECEIPTS_QUERY_KEY, type PaymentRow } from './api/receipts';
import { exportToPdf, exportToExcel } from '../../lib/exportUtils';
import {
  schoolCalendarTodayIso,
  addCalendarDaysToIsoYmd,
  firstDayOfMonthIsoYmd,
} from '../../lib/schoolCalendarDate';
import { useAcademicPeriod } from '../../lib/academicPeriodTerminology';
import {
  getTokens,
  cardGrad,
  fmtUGX,
  fmtUGXCompact,
  SORA,
  INTER,
} from '../../styles/posThemeTokens';
import PosEmptyState from '../../components/finance/pos/PosEmptyState';

type Period = 'today' | 'week' | 'month' | 'all';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Today',
  week: 'Last 7 days',
  month: 'This month',
  all: 'All time',
};

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank: 'Bank',
  mobile_money: 'Mobile Money',
  cheque: 'Cheque',
  pos: 'POS / Card',
  online: 'Online',
  school_pay: 'School Pay',
  sure_pay: 'Sure Pay',
  other: 'Other',
};

type ReceiptGroup = {
  key: string;
  receipt_number: string | null;
  student_id: string;
  student_name: string;
  current_class: string;
  term_label: string;
  total: number;
  date: string;
  time: string;
  method: string;
  recorded_by: string;
  notes: string | null;
  remaining_balance: number | null;
  rows: PaymentRow[];
};

export default function AccountantReceiptsPage() {
  const navigate = useNavigate();
  const schoolId = useAuthStore((s) => s.schoolId);
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t = getTokens(isDark);

  const { isTertiary, labels } = useAcademicPeriod();

  const [q, setQ] = useState('');
  const [period, setPeriod] = useState<Period>('today');
  const [methodFilter, setMethodFilter] = useState('all');
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptGroup | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch receipts data from Supabase
  const {
    data,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: [...RECEIPTS_QUERY_KEY, schoolId],
    queryFn: () => fetchReceipts(schoolId!),
    enabled: !!schoolId,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const payments = data?.payments ?? [];
  const studentMap = data?.studentMap ?? {};
  const termMap = data?.termMap ?? {};
  const schoolName = data?.schoolName ?? 'School';
  const schoolPhone = data?.schoolPhone;
  const schoolEmail = data?.schoolEmail;
  const recorderMap = data?.recorderMap ?? {};

  const todayIso = schoolCalendarTodayIso();
  const weekStartIso = addCalendarDaysToIsoYmd(todayIso, -7);
  const monthStartIso = firstDayOfMonthIsoYmd(todayIso);

  // Distinct methods present
  const methods = useMemo(() => {
    const seen = new Set<string>();
    payments.forEach((p) => {
      if (p.payment_method) seen.add(p.payment_method.toLowerCase());
    });
    return Array.from(seen).sort();
  }, [payments]);

  // Group payments by receipt_number (or payment_id if individual)
  const allReceipts: ReceiptGroup[] = useMemo(() => {
    const map = new Map<string, PaymentRow[]>();
    payments.forEach((p) => {
      const key = p.receipt_number || p.payment_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });

    return Array.from(map.entries()).map(([key, pRows]) => {
      const sorted = [...pRows].sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return ta - tb;
      });
      const first = sorted[0];
      const s = studentMap[first.student_id];
      const sum = sorted.reduce((acc, row) => acc + Number(row.amount_paid || 0), 0);
      const created = first.created_at ? new Date(first.created_at) : new Date(first.payment_date || todayIso);

      const rem = first.receipt_total_remaining_balance != null
        ? Number(first.receipt_total_remaining_balance)
        : null;

      return {
        key,
        receipt_number: first.receipt_number,
        student_id: first.student_id,
        student_name: s?.name ?? '—',
        current_class: s?.current_class ?? '—',
        term_label: termMap[first.term_id] ?? '—',
        total: sum,
        date: first.payment_date ?? todayIso,
        time: created.toTimeString().slice(0, 5),
        method: first.payment_method ? first.payment_method.toLowerCase() : 'cash',
        recorded_by: first.recorded_by ? recorderMap[first.recorded_by] ?? 'Accounts Staff' : 'Accounts Staff',
        notes: first.notes,
        remaining_balance: rem,
        rows: sorted,
      };
    });
  }, [payments, studentMap, termMap, recorderMap, todayIso]);

  // Financial summary metrics
  const summary = useMemo(() => {
    let todayTotal = 0;
    let weekTotal = 0;
    let monthTotal = 0;
    let grandTotal = 0;

    for (const r of allReceipts) {
      const d = r.date;
      const amt = r.total;
      grandTotal += amt;
      if (d === todayIso) todayTotal += amt;
      if (d >= weekStartIso) weekTotal += amt;
      if (d >= monthStartIso) monthTotal += amt;
    }

    const avg = allReceipts.length > 0 ? Math.round(grandTotal / allReceipts.length) : 0;

    return {
      todayTotal,
      weekTotal,
      monthTotal,
      grandTotal,
      avg,
      count: allReceipts.length,
    };
  }, [allReceipts, todayIso, weekStartIso, monthStartIso]);

  // Filtered receipts
  const filtered = useMemo(() => {
    let list = allReceipts;

    // Period filter
    if (period === 'today') {
      list = list.filter((r) => r.date === todayIso);
    } else if (period === 'week') {
      list = list.filter((r) => r.date >= weekStartIso);
    } else if (period === 'month') {
      list = list.filter((r) => r.date >= monthStartIso);
    }

    // Method filter
    if (methodFilter !== 'all') {
      list = list.filter((r) => r.method === methodFilter);
    }

    // Text search
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(
        (r) =>
          (r.receipt_number && r.receipt_number.toLowerCase().includes(s)) ||
          r.student_name.toLowerCase().includes(s) ||
          r.current_class.toLowerCase().includes(s) ||
          r.term_label.toLowerCase().includes(s) ||
          (r.notes && r.notes.toLowerCase().includes(s)) ||
          r.recorded_by.toLowerCase().includes(s)
      );
    }

    return list;
  }, [allReceipts, period, methodFilter, q, todayIso, weekStartIso, monthStartIso]);

  const copyReceiptNumber = (numStr: string, e: React.MouseEvent) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(numStr);
    setCopiedId(numStr);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Method icons helper
  const renderMethodBadge = (m: string) => {
    const raw = m.toLowerCase();
    let Icon = Banknote;
    let label = METHOD_LABELS[raw] ?? raw;
    let bg = t.mintDim;
    let col = t.mintInk;

    if (raw.includes('bank') || raw.includes('cheque')) {
      Icon = Landmark;
      bg = t.blueDim;
      col = t.blue;
    } else if (raw.includes('mobile') || raw.includes('school_pay') || raw.includes('sure_pay')) {
      Icon = Smartphone;
      bg = 'rgba(245,192,68,0.14)';
      col = t.gold;
    } else if (raw.includes('pos') || raw.includes('online')) {
      Icon = CreditCard;
      bg = 'rgba(139,92,246,0.14)';
      col = '#a78bfa';
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 8px',
          borderRadius: 6,
          background: bg,
          color: col,
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        <Icon size={12} />
        <span>{label}</span>
      </span>
    );
  };

  // Exports
  const doExportPdf = () => {
    exportToPdf({
      title: 'Official Receipts Registry',
      subtitle: `Period: ${PERIOD_LABELS[period]} · As of ${todayIso} · ${schoolName}`,
      schoolName,
      columns: [
        { header: 'Receipt #', key: 'receipt_number', width: 22 },
        { header: isTertiary ? 'Student / Trainee' : 'Student', key: 'student_name', width: 32 },
        { header: isTertiary ? 'Programme' : 'Class', key: 'current_class', width: 18 },
        { header: labels.periodNoun, key: 'term_label', width: 24 },
        { header: 'Date', key: 'date', width: 16 },
        { header: 'Method', key: 'method', width: 16 },
        { header: 'Amount (UGX)', key: 'total', width: 20, align: 'right', format: (v) => fmtUGX(Number(v || 0)) },
      ],
      rows: filtered as unknown as Record<string, unknown>[],
      filename: `receipts-${period}-${todayIso}`,
      totalsRow: ['TOTAL', '', '', '', '', '', fmtUGX(filtered.reduce((s, r) => s + r.total, 0)) + ' UGX'],
    });
  };

  const doExportExcel = () => {
    exportToExcel({
      title: 'Official Receipts Registry',
      schoolName,
      columns: [
        { header: 'Receipt Number', key: 'receipt_number' },
        { header: isTertiary ? 'Student / Trainee' : 'Student', key: 'student_name' },
        { header: isTertiary ? 'Programme' : 'Class', key: 'current_class' },
        { header: labels.periodNoun, key: 'term_label' },
        { header: 'Payment Date', key: 'date' },
        { header: 'Payment Method', key: 'method' },
        { header: 'Amount Paid (UGX)', key: 'total', format: (v) => String(Number(v || 0)) },
        { header: 'Recorded By', key: 'recorded_by' },
        { header: 'Notes', key: 'notes' },
      ],
      rows: filtered as unknown as Record<string, unknown>[],
      filename: `receipts-${period}-${todayIso}`,
    });
  };

  const printCurrentVoucher = () => {
    window.print();
  };

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
      {/* ── HEADER BAR ──────────────────────────────────────────────────────── */}
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
            Receipts Registry
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
            <span>Audited fee collection records & official payment vouchers</span>
            <span>·</span>
            <span style={{ color: t.mintInk, fontWeight: 600 }}>
              {allReceipts.length} total receipts issued
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Refresh button */}
          <button
            onClick={() => refetch()}
            title="Refresh Receipts"
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

          {/* Export PDF */}
          <button
            onClick={doExportPdf}
            disabled={filtered.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '9px 14px',
              borderRadius: 10,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: filtered.length === 0 ? 'not-allowed' : 'pointer',
              background: t.panel,
              color: t.textHi,
              border: `1px solid ${t.stroke}`,
              boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
              opacity: filtered.length === 0 ? 0.5 : 1,
            }}
          >
            <Download size={15} color={t.blue} />
            <span>PDF Export</span>
          </button>

          {/* Export Excel */}
          <button
            onClick={doExportExcel}
            disabled={filtered.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '9px 14px',
              borderRadius: 10,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: filtered.length === 0 ? 'not-allowed' : 'pointer',
              background: t.panel,
              color: t.textHi,
              border: `1px solid ${t.stroke}`,
              boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
              opacity: filtered.length === 0 ? 0.5 : 1,
            }}
          >
            <FileText size={15} color={t.mintInk} />
            <span>Excel</span>
          </button>

          {/* SIGNATURE POS GLOWING CTA BUTTON */}
          <button
            onClick={() => navigate('/dashboard/accountant/payments')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 800,
              fontFamily: SORA,
              cursor: 'pointer',
              border: 'none',
              background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
              color: t.ctaText,
              boxShadow: '0 8px 22px rgba(61,232,160,0.28)',
              letterSpacing: '0.2px',
            }}
          >
            <Sparkles size={16} />
            <span>+ Record Fee Payment</span>
          </button>
        </div>
      </div>

      {/* ── 5-CARD KPI SUMMARY STRIP ───────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.25fr 1fr 1fr 1fr 1fr',
          gap: 12,
          marginBottom: 20,
        }}
      >
        {/* Net Collections Today (Gold Glow) */}
        <div
          style={{
            background: cardGrad(t),
            border: `1px solid ${t.strokeHi}`,
            borderRadius: 16,
            padding: '14px 18px',
            boxShadow: isDark ? t.moneyGlow : '0 4px 14px rgba(245,192,68,0.08)',
          }}
        >
          <div style={{ fontSize: 9.5, letterSpacing: '1.2px', textTransform: 'uppercase', color: t.gold, fontWeight: 700, marginBottom: 4 }}>
            COLLECTIONS TODAY
          </div>
          <div style={{ fontFamily: SORA, fontSize: 21, fontWeight: 800, color: t.gold }}>
            <span style={{ fontSize: 11, color: t.textLow, marginRight: 4 }}>UGX</span>
            {fmtUGX(summary.todayTotal)}
          </div>
          <div style={{ fontSize: 11, color: t.textLow, marginTop: 4 }}>
            Today's physical & digital intake
          </div>
        </div>

        {/* This Week (Mint) */}
        <div style={{ background: cardGrad(t), border: `1px solid ${t.stroke}`, borderRadius: 16, padding: '14px 16px' }}>
          <div style={{ fontSize: 9.5, letterSpacing: '1.2px', textTransform: 'uppercase', color: t.textLow, fontWeight: 700, marginBottom: 4 }}>
            LAST 7 DAYS
          </div>
          <div style={{ fontFamily: SORA, fontSize: 19, fontWeight: 800, color: t.mintInk }}>
            <span style={{ fontSize: 11, color: t.textLow, marginRight: 4 }}>UGX</span>
            {fmtUGX(summary.weekTotal)}
          </div>
          <div style={{ fontSize: 11, color: t.textLow, marginTop: 4 }}>
            7-day rolling volume
          </div>
        </div>

        {/* This Month (Blue) */}
        <div style={{ background: cardGrad(t), border: `1px solid ${t.stroke}`, borderRadius: 16, padding: '14px 16px' }}>
          <div style={{ fontSize: 9.5, letterSpacing: '1.2px', textTransform: 'uppercase', color: t.textLow, fontWeight: 700, marginBottom: 4 }}>
            THIS MONTH
          </div>
          <div style={{ fontFamily: SORA, fontSize: 19, fontWeight: 800, color: t.blue }}>
            <span style={{ fontSize: 11, color: t.textLow, marginRight: 4 }}>UGX</span>
            {fmtUGX(summary.monthTotal)}
          </div>
          <div style={{ fontSize: 11, color: t.textLow, marginTop: 4 }}>
            Month-to-date fees
          </div>
        </div>

        {/* Total Receipts */}
        <div style={{ background: cardGrad(t), border: `1px solid ${t.stroke}`, borderRadius: 16, padding: '14px 16px' }}>
          <div style={{ fontSize: 9.5, letterSpacing: '1.2px', textTransform: 'uppercase', color: t.textLow, fontWeight: 700, marginBottom: 4 }}>
            TOTAL RECEIPTS
          </div>
          <div style={{ fontFamily: SORA, fontSize: 19, fontWeight: 800, color: t.textHi }}>
            {summary.count}
          </div>
          <div style={{ fontSize: 11, color: t.textLow, marginTop: 4 }}>
            Verified transactions
          </div>
        </div>

        {/* Average Collection */}
        <div style={{ background: cardGrad(t), border: `1px solid ${t.stroke}`, borderRadius: 16, padding: '14px 16px' }}>
          <div style={{ fontSize: 9.5, letterSpacing: '1.2px', textTransform: 'uppercase', color: t.textLow, fontWeight: 700, marginBottom: 4 }}>
            AVG PER RECEIPT
          </div>
          <div style={{ fontFamily: SORA, fontSize: 19, fontWeight: 800, color: t.textHi }}>
            <span style={{ fontSize: 11, color: t.textLow, marginRight: 4 }}>UGX</span>
            {fmtUGX(summary.avg)}
          </div>
          <div style={{ fontSize: 11, color: t.textLow, marginTop: 4 }}>
            Average payment size
          </div>
        </div>
      </div>

      {/* ── FILTER & PERIOD SELECTOR BAR ─────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 16,
          background: t.panel,
          border: `1px solid ${t.stroke}`,
          borderRadius: 14,
          padding: '12px 16px',
        }}
      >
        {/* Left: Search Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: t.fieldBg,
            border: `1px solid ${t.stroke}`,
            borderRadius: 10,
            padding: '7px 12px',
            width: 320,
            maxWidth: '100%',
          }}
        >
          <Search size={16} color={t.textLow} />
          <input
            type="text"
            placeholder={`Search by receipt #, ${isTertiary ? 'trainee' : 'student'}, class...`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 12.5,
              color: t.textHi,
              width: '100%',
            }}
          />
          {q && (
            <button
              onClick={() => setQ('')}
              style={{ background: 'transparent', border: 'none', color: t.textLow, cursor: 'pointer', padding: 0 }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Middle: Period Switcher */}
        <div
          style={{
            display: 'flex',
            background: t.fieldBg,
            border: `1px solid ${t.stroke}`,
            borderRadius: 8,
            padding: 2,
          }}
        >
          {(['today', 'week', 'month', 'all'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                border: 'none',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                background: period === p ? t.mintDim : 'transparent',
                color: period === p ? t.mintInk : t.textMid,
                transition: 'all 0.15s',
              }}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Right: Payment Method Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: t.textLow }}>Channel:</span>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            style={{
              background: t.fieldBg,
              border: `1px solid ${t.stroke}`,
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12.5,
              color: t.textHi,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Channels</option>
            {methods.map((m) => (
              <option key={m} value={m}>
                {METHOD_LABELS[m] ?? m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── RECEIPTS TABLE ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <div
          style={{
            background: cardGrad(t),
            border: `1px solid ${t.stroke}`,
            borderRadius: 18,
            padding: 60,
            textAlign: 'center',
            color: t.textMid,
          }}
        >
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', color: t.mint }} />
          <div>Loading receipts registry...</div>
        </div>
      ) : allReceipts.length === 0 ? (
        <PosEmptyState
          icon={<Receipt size={36} color={t.mintInk} />}
          title="No receipts recorded yet"
          description={`Receipts appear here the moment fee payments are recorded for ${isTertiary ? 'students & trainees' : 'students'}.`}
          accentColor="mint"
          action={{
            label: '+ Record Fee Payment',
            onClick: () => navigate('/dashboard/accountant/payments'),
            icon: <Sparkles size={16} />,
          }}
        />
      ) : filtered.length === 0 ? (
        <PosEmptyState
          icon={<Search size={36} color={t.blue} />}
          title="No receipts match these filters"
          description={`No fee receipts found for ${PERIOD_LABELS[period].toLowerCase()}. Try adjusting your date scope or payment channel filter.`}
          accentColor="blue"
          action={{
            label: 'Show All Time',
            onClick: () => {
              setPeriod('all');
              setMethodFilter('all');
              setQ('');
            },
          }}
        />
      ) : (
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr
                  style={{
                    borderBottom: `1px solid ${t.divider}`,
                    color: t.textLow,
                    textAlign: 'left',
                    background: t.cardGradA,
                  }}
                >
                  <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase' }}>
                    RECEIPT # & STATUS
                  </th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase' }}>
                    {isTertiary ? 'STUDENT / TRAINEE' : 'STUDENT'}
                  </th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase' }}>
                    {labels.periodNoun}
                  </th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase' }}>
                    DATE & TIME
                  </th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase' }}>
                    CHANNEL
                  </th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'right' }}>
                    AMOUNT PAID
                  </th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase' }}>
                    RECORDED BY
                  </th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'right' }}>
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const receiptLabel = r.receipt_number || r.key.slice(0, 8).toUpperCase();
                  return (
                    <tr
                      key={r.key}
                      onClick={() => setSelectedReceipt(r)}
                      style={{
                        borderBottom: `1px solid ${t.divider}`,
                        cursor: 'pointer',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : '#F9FAFB';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {/* Receipt # + Status */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              color: t.textHi,
                              fontSize: 12,
                            }}
                          >
                            #{receiptLabel}
                          </span>
                          <button
                            onClick={(e) => copyReceiptNumber(receiptLabel, e)}
                            title="Copy Receipt #"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: t.textLow,
                              cursor: 'pointer',
                              padding: 2,
                            }}
                          >
                            {copiedId === receiptLabel ? (
                              <Check size={12} color={t.mintInk} />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 10.5,
                              fontWeight: 600,
                              color: t.mintInk,
                            }}
                          >
                            <CheckCircle2 size={11} /> Settled
                          </span>
                        </div>
                      </td>

                      {/* Student & Class */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: t.textHi }}>{r.student_name}</div>
                        <div style={{ fontSize: 11, color: t.textLow, marginTop: 2 }}>{r.current_class}</div>
                      </td>

                      {/* Academic Period */}
                      <td style={{ padding: '12px 14px', color: t.textMid }}>
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: 6,
                            background: t.fieldBg,
                            border: `1px solid ${t.stroke}`,
                            fontSize: 11.5,
                            fontWeight: 500,
                          }}
                        >
                          {r.term_label}
                        </span>
                      </td>

                      {/* Date & Time */}
                      <td style={{ padding: '12px 14px', color: t.textMid, fontSize: 12 }}>
                        <div>{r.date}</div>
                        <div style={{ fontSize: 10.5, color: t.textLow, marginTop: 1 }}>{r.time}</div>
                      </td>

                      {/* Payment Method */}
                      <td style={{ padding: '12px 14px' }}>
                        {renderMethodBadge(r.method)}
                      </td>

                      {/* Amount Paid */}
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        <span
                          style={{
                            fontFamily: SORA,
                            fontWeight: 700,
                            color: t.mintInk,
                            fontSize: 13,
                          }}
                        >
                          UGX {fmtUGX(r.total)}
                        </span>
                      </td>

                      {/* Recorded By */}
                      <td style={{ padding: '12px 14px', color: t.textMid, fontSize: 11.5 }}>
                        {r.recorded_by}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedReceipt(r);
                            }}
                            title="Print Voucher"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '5px 9px',
                              borderRadius: 6,
                              fontSize: 11.5,
                              fontWeight: 600,
                              background: t.mintDim,
                              color: t.mintInk,
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            <Printer size={13} />
                            <span>Voucher</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderTop: `1px solid ${t.divider}`,
              background: t.cardGradA,
              fontSize: 12,
              color: t.textLow,
            }}
          >
            <div>
              Showing <b>{filtered.length}</b> receipts · {PERIOD_LABELS[period]}
            </div>
            <div>
              Total Collected: <b style={{ color: t.mintInk, fontFamily: SORA }}>UGX {fmtUGX(filtered.reduce((s, r) => s + r.total, 0))}</b>
            </div>
          </div>
        </div>
      )}

      {/* ── SIGNATURE 1:1 POS PRINTABLE RECEIPT VOUCHER MODAL ────────────────── */}
      {selectedReceipt && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(5px)',
            padding: 16,
          }}
          onClick={() => setSelectedReceipt(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 420,
              background: isDark ? '#0D1512' : '#FFFFFF',
              border: `1px solid ${t.strokeHi}`,
              borderRadius: 18,
              padding: 24,
              boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
              color: t.textHi,
              position: 'relative',
              maxHeight: '92vh',
              overflowY: 'auto',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: t.mintInk, textTransform: 'uppercase', letterSpacing: '1px' }}>
                <CheckCircle2 size={14} /> Official Receipt Voucher
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  border: `1px solid ${t.stroke}`,
                  background: t.fieldBg,
                  color: t.textLow,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Receipt Letterhead (1:1 POS Thermal Style) */}
            <div
              style={{
                textAlign: 'center',
                paddingBottom: 14,
                borderBottom: `1px dashed ${t.strokeHi}`,
                marginBottom: 14,
              }}
            >
              <div style={{ fontFamily: SORA, fontSize: 17, fontWeight: 800, color: t.textHi }}>
                {schoolName}
              </div>
              <div style={{ fontSize: 11, color: t.textMid, marginTop: 2 }}>
                {schoolPhone ? `Tel: ${schoolPhone}` : 'Official Bursar / Finance Receipt'}
              </div>
              {schoolEmail && (
                <div style={{ fontSize: 10.5, color: t.textLow, marginTop: 1 }}>{schoolEmail}</div>
              )}
            </div>

            {/* Receipt Number & Date Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 8,
                background: t.fieldBg,
                fontSize: 11.5,
                marginBottom: 14,
              }}
            >
              <div>
                <span style={{ color: t.textLow }}>Receipt #: </span>
                <strong style={{ fontFamily: 'monospace' }}>
                  #{selectedReceipt.receipt_number || selectedReceipt.key.slice(0, 8).toUpperCase()}
                </strong>
              </div>
              <div style={{ color: t.textMid }}>
                {selectedReceipt.date} · {selectedReceipt.time}
              </div>
            </div>

            {/* Student & Academic Period Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: t.textLow }}>{isTertiary ? 'Trainee:' : 'Student:'}</span>
                <strong style={{ color: t.textHi }}>{selectedReceipt.student_name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: t.textLow }}>{isTertiary ? 'Programme:' : 'Class:'}</span>
                <span style={{ color: t.textMid }}>{selectedReceipt.current_class}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: t.textLow }}>Academic Period:</span>
                <span style={{ color: t.textMid, fontWeight: 600 }}>{selectedReceipt.term_label}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: t.textLow }}>Payment Method:</span>
                <span style={{ textTransform: 'capitalize', color: t.textMid }}>
                  {METHOD_LABELS[selectedReceipt.method] ?? selectedReceipt.method}
                </span>
              </div>
            </div>

            {/* Dashed Line */}
            <div style={{ borderTop: `1px dashed ${t.strokeHi}`, margin: '12px 0' }} />

            {/* Payment Items Breakdown */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: t.textLow, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>
                PAYMENT BREAKDOWN
              </div>
              {selectedReceipt.rows.map((row, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    padding: '4px 0',
                  }}
                >
                  <span style={{ color: t.textMid }}>Fee Payment Installment</span>
                  <strong style={{ fontVariantNumeric: 'tabular-nums', color: t.textHi }}>
                    UGX {fmtUGX(row.amount_paid)}
                  </strong>
                </div>
              ))}
            </div>

            {/* Total Paid Highlight Box */}
            <div
              style={{
                background: isDark ? 'rgba(61,232,160,0.08)' : '#F0FDF4',
                border: `1px solid ${t.mintRing}`,
                borderRadius: 10,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: t.mintInk, textTransform: 'uppercase' }}>
                TOTAL PAID
              </span>
              <span style={{ fontFamily: SORA, fontSize: 18, fontWeight: 800, color: t.mintInk }}>
                UGX {fmtUGX(selectedReceipt.total)}
              </span>
            </div>

            {/* Remaining Balance if present */}
            {selectedReceipt.remaining_balance != null && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  color: selectedReceipt.remaining_balance > 0 ? t.red : t.mintInk,
                  fontWeight: 600,
                  marginBottom: 14,
                  padding: '6px 8px',
                  borderRadius: 6,
                  background: t.fieldBg,
                }}
              >
                <span>Outstanding Balance:</span>
                <span>UGX {fmtUGX(selectedReceipt.remaining_balance)}</span>
              </div>
            )}

            {/* Cashier & Verification Footer */}
            <div
              style={{
                textAlign: 'center',
                fontSize: 10.5,
                color: t.textLow,
                paddingTop: 12,
                borderTop: `1px dashed ${t.strokeHi}`,
                marginBottom: 18,
                lineHeight: 1.5,
              }}
            >
              <div>Recorded By: <b>{selectedReceipt.recorded_by}</b></div>
              <div>Official Computer-Generated Receipt · Valid without manual signature</div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={printCurrentVoucher}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: SORA,
                  cursor: 'pointer',
                  border: 'none',
                  background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
                  color: t.ctaText,
                  boxShadow: '0 4px 14px rgba(61,232,160,0.25)',
                }}
              >
                <Printer size={15} />
                <span>Print Official Voucher</span>
              </button>

              <button
                onClick={() => setSelectedReceipt(null)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: t.fieldBg,
                  color: t.textHi,
                  border: `1px solid ${t.stroke}`,
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
