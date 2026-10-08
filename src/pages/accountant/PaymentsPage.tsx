import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useSearchParams, useOutletContext, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Filter,
  Download,
  Receipt,
  Plus,
  RefreshCw,
  Printer,
  FileText,
  User,
  CreditCard,
  Banknote,
  Landmark,
  Smartphone,
  ChevronRight,
  Clock,
  Calendar,
  CheckCircle2,
  X,
  History,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { fetchReceipts, RECEIPTS_QUERY_KEY, type PaymentRow } from './api/receipts';
import { formatReceiptDateTime, printReceipt, type PaymentReceiptData } from '../../components/accountant/PaymentReceipt';
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

type OutletContext = { openRecordPayment: (initialStudentId?: string) => void };

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

type DateFilter = 'today' | 'week' | 'month' | 'all';

export default function AccountantPaymentsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { openRecordPayment } = useOutletContext() as OutletContext;
  const schoolId = useAuthStore((s) => s.schoolId);
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t = getTokens(isDark);

  const { isTertiary, labels } = useAcademicPeriod();

  // Auto-open payment modal if a student ID is in the URL
  const studentIdFromUrl = searchParams.get('student') ?? undefined;
  const autoOpenedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!studentIdFromUrl) {
      autoOpenedRef.current = null;
      return;
    }
    if (autoOpenedRef.current === studentIdFromUrl) return;
    autoOpenedRef.current = studentIdFromUrl;
    openRecordPayment(studentIdFromUrl);
  }, [studentIdFromUrl, openRecordPayment]);

  const [q, setQ] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

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

  const { todayTotal, weekTotal, monthTotal } = useMemo(() => {
    let todayTotal = 0, weekTotal = 0, monthTotal = 0;
    for (const p of payments) {
      const d = p.payment_date ?? '';
      const amt = Number(p.amount_paid || 0);
      if (d === todayIso) todayTotal += amt;
      if (d >= weekStartIso) weekTotal += amt;
      if (d >= monthStartIso) monthTotal += amt;
    }
    return { todayTotal, weekTotal, monthTotal };
  }, [payments, todayIso, weekStartIso, monthStartIso]);

  const methods = useMemo(() => {
    const seen = new Set<string>();
    payments.forEach((p) => {
      if (p.payment_method) seen.add(p.payment_method.toLowerCase());
    });
    return Array.from(seen).sort();
  }, [payments]);

  // Apply filters
  const filtered = useMemo(() => {
    let rows = payments;

    if (dateFilter !== 'all') {
      const cutoff = dateFilter === 'today' ? todayIso : dateFilter === 'week' ? weekStartIso : monthStartIso;
      const exact = dateFilter === 'today';
      rows = rows.filter((p) => {
        const d = p.payment_date ?? '';
        return exact ? d === cutoff : d >= cutoff;
      });
    }

    if (methodFilter !== 'all') {
      rows = rows.filter((p) => (p.payment_method ?? '').toLowerCase() === methodFilter);
    }

    if (q.trim()) {
      const search = q.toLowerCase();
      rows = rows.filter((p) => {
        const s = studentMap[p.student_id];
        const term = termMap[p.term_id] ?? '';
        return (
          s?.name?.toLowerCase().includes(search) ||
          s?.current_class?.toLowerCase().includes(search) ||
          term.toLowerCase().includes(search) ||
          (p.receipt_number?.toLowerCase().includes(search))
        );
      });
    }

    return rows;
  }, [payments, dateFilter, methodFilter, q, todayIso, weekStartIso, monthStartIso, studentMap, termMap]);

  function handleReprint(p: (typeof payments)[number]) {
    const s = studentMap[p.student_id];
    const remRaw = p.receipt_total_remaining_balance;
    let totalRemainingBalance: number | undefined;
    if (remRaw !== null && remRaw !== undefined && String(remRaw).trim() !== '') {
      const n = Number(String(remRaw).replace(/,/g, ''));
      if (Number.isFinite(n)) totalRemainingBalance = Math.max(0, n);
    }
    const receiptData: PaymentReceiptData = {
      receiptNumber: p.receipt_number || p.payment_id,
      schoolName: schoolName.trim() || undefined,
      schoolPhone,
      schoolEmail,
      studentName: s?.name ?? '—',
      studentClass: s?.current_class ?? '—',
      termLabel: termMap[p.term_id] ?? '—',
      amountPaid: Number(p.amount_paid || 0),
      paymentMethod: p.payment_method ?? 'cash',
      transactionTime: p.created_at
        ? formatReceiptDateTime(new Date(p.created_at))
        : p.payment_date
        ? formatReceiptDateTime(new Date(p.payment_date + 'T12:00:00'))
        : '—',
      recordedBy: (p.recorded_by && recorderMap[p.recorded_by]) || '—',
      description: p.notes?.trim() || undefined,
      allocations: [{ termLabel: termMap[p.term_id] ?? '—', amountApplied: Number(p.amount_paid || 0) }],
      totalRemainingBalance,
    };
    printReceipt(receiptData);
  }

  const renderMethodBadge = (m: string | null) => {
    const raw = (m || 'cash').toLowerCase();
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
            Payments Terminal
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
            <span style={{ color: t.mintInk, fontWeight: 600 }}>
              {payments.length} verified transactions
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Refresh button */}
          <button
            onClick={() => refetch()}
            title="Refresh Payments"
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

          {/* Quick Nav: Outstanding Debtors */}
          <button
            onClick={() => navigate('/dashboard/accountant/outstanding')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '9px 14px',
              borderRadius: 10,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              background: t.panel,
              color: t.textHi,
              border: `1px solid ${t.stroke}`,
              boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <User size={15} color={t.blue} />
            <span>View Debtors</span>
          </button>

          {/* Quick Nav: All Receipts */}
          <button
            onClick={() => navigate('/dashboard/accountant/receipts')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '9px 14px',
              borderRadius: 10,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              background: t.panel,
              color: t.textHi,
              border: `1px solid ${t.stroke}`,
              boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <Receipt size={15} color={t.mintInk} />
            <span>Receipts Registry</span>
          </button>

          {/* Student Payment Ledger Button */}
          <button
            onClick={() => navigate('/dashboard/accountant/student-ledger')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              borderRadius: 9,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              background: t.panel,
              color: t.textHi,
              border: `1px solid ${t.stroke}`,
              boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <History size={15} color={t.mint} />
            <span>Student Ledger</span>
          </button>

          {/* SIGNATURE POS GLOWING CTA BUTTON */}
          <button
            onClick={() => openRecordPayment()}
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
            <Plus size={16} />
            <span>Record Fee Payment</span>
          </button>
        </div>
      </div>

      {/* ── 3-CARD SUMMARY STRIP ───────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 14,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            background: cardGrad(t),
            border: `1px solid ${t.stroke}`,
            borderRadius: 16,
            padding: '16px 20px',
            boxShadow: 'none',
          }}
        >
          <div style={{ fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase', color: t.gold, fontWeight: 700, marginBottom: 4 }}>
            COLLECTED TODAY
          </div>
          <div style={{ fontFamily: SORA, fontSize: 22, fontWeight: 800, color: t.gold }}>
            <span style={{ fontSize: 11, color: t.textLow, marginRight: 5 }}>UGX</span>
            {fmtUGX(todayTotal)}
          </div>
          <div style={{ fontSize: 11, color: t.textLow, marginTop: 4 }}>
            Physical & bank payments posted today
          </div>
        </div>

        <div style={{ background: cardGrad(t), border: `1px solid ${t.stroke}`, borderRadius: 16, padding: '16px 20px' }}>
          <div style={{ fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase', color: t.textLow, fontWeight: 700, marginBottom: 4 }}>
            LAST 7 DAYS
          </div>
          <div style={{ fontFamily: SORA, fontSize: 22, fontWeight: 800, color: t.mintInk }}>
            <span style={{ fontSize: 11, color: t.textLow, marginRight: 5 }}>UGX</span>
            {fmtUGX(weekTotal)}
          </div>
          <div style={{ fontSize: 11, color: t.textLow, marginTop: 4 }}>
            Rolling weekly collections volume
          </div>
        </div>

        <div style={{ background: cardGrad(t), border: `1px solid ${t.stroke}`, borderRadius: 16, padding: '16px 20px' }}>
          <div style={{ fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase', color: t.textLow, fontWeight: 700, marginBottom: 4 }}>
            THIS MONTH
          </div>
          <div style={{ fontFamily: SORA, fontSize: 22, fontWeight: 800, color: t.blue }}>
            <span style={{ fontSize: 11, color: t.textLow, marginRight: 5 }}>UGX</span>
            {fmtUGX(monthTotal)}
          </div>
          <div style={{ fontSize: 11, color: t.textLow, marginTop: 4 }}>
            Current calendar month total
          </div>
        </div>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ───────────────────────────────────────── */}
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
        {/* Search */}
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
            placeholder={`Search ${isTertiary ? 'trainee' : 'student'}, class, receipt #...`}
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
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Date Filters */}
        <div
          style={{
            display: 'flex',
            background: t.fieldBg,
            border: `1px solid ${t.stroke}`,
            borderRadius: 8,
            padding: 2,
          }}
        >
          {(
            [
              { id: 'today', label: 'Today' },
              { id: 'week', label: '7 Days' },
              { id: 'month', label: 'Month' },
              { id: 'all', label: 'All Time' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setDateFilter(item.id)}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                border: 'none',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                background: dateFilter === item.id ? t.mintDim : 'transparent',
                color: dateFilter === item.id ? t.mintInk : t.textMid,
                transition: 'all 0.15s',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Payment Method Filter */}
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

      {/* ── PAYMENTS TABLE ─────────────────────────────────────────────────── */}
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
          <div>Loading payments terminal feed...</div>
        </div>
      ) : payments.length === 0 ? (
        <PosEmptyState
          icon={<Receipt size={36} color={t.mintInk} />}
          title="No fee payments recorded"
          description={`Payment entries made via the terminal will appear here instantly with verifiable voucher generation.`}
          accentColor="mint"
          action={{
            label: 'Record Fee Payment',
            onClick: () => openRecordPayment(),
            icon: <Plus size={16} />,
          }}
        />
      ) : filtered.length === 0 ? (
        <PosEmptyState
          icon={<Search size={36} color={t.blue} />}
          title="No payments match these filters"
          description={`Try resetting your search query or selecting a different date scope or payment channel.`}
          accentColor="blue"
          action={{
            label: 'Clear Filters',
            onClick: () => {
              setQ('');
              setDateFilter('all');
              setMethodFilter('all');
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
                    RECEIPT #
                  </th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase' }}>
                    {isTertiary ? 'STUDENT / TRAINEE' : 'STUDENT'}
                  </th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase' }}>
                    {isTertiary ? 'SEMESTER' : 'TERM'}
                  </th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase' }}>
                    DATE
                  </th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase' }}>
                    METHOD
                  </th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'right' }}>
                    AMOUNT (UGX)
                  </th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase' }}>
                    CASHIER
                  </th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'right' }}>
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const s = studentMap[p.student_id];
                  const termLabel = termMap[p.term_id] ?? '—';
                  const receiptNum = p.receipt_number || p.payment_id.slice(0, 8).toUpperCase();

                  return (
                    <tr
                      key={p.payment_id}
                      style={{
                        borderBottom: `1px solid ${t.divider}`,
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : '#F9FAFB';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {/* Receipt # */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: t.textHi, fontSize: 12 }}>
                          #{receiptNum}
                        </span>
                      </td>

                      {/* Student & Class */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: t.textHi }}>{s?.name ?? '—'}</div>
                        <div style={{ fontSize: 11, color: t.textLow, marginTop: 2 }}>{s?.current_class ?? '—'}</div>
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
                          {termLabel}
                        </span>
                      </td>

                      {/* Date */}
                      <td style={{ padding: '12px 14px', color: t.textMid, fontSize: 12 }}>
                        {p.payment_date ?? '—'}
                      </td>

                      {/* Method */}
                      <td style={{ padding: '12px 14px' }}>
                        {renderMethodBadge(p.payment_method)}
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        <span style={{ fontFamily: SORA, fontWeight: 700, color: t.mintInk, fontSize: 13 }}>
                          UGX {fmtUGX(p.amount_paid)}
                        </span>
                      </td>

                      {/* Cashier */}
                      <td style={{ padding: '12px 14px', color: t.textMid, fontSize: 11.5 }}>
                        {(p.recorded_by && recorderMap[p.recorded_by]) || 'Accounts'}
                      </td>

                      {/* Action */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleReprint(p)}
                          title="Print Receipt"
                          style={{
                            display: 'inline-flex',
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
                          <span>Reprint</span>
                        </button>
                        <button
                          onClick={() => navigate(`/dashboard/accountant/student-ledger?student=${p.student_id}`)}
                          title="View all-time payment ledger and statement for this student"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '5px 9px',
                            borderRadius: 6,
                            fontSize: 11.5,
                            fontWeight: 600,
                            background: t.fieldBg,
                            color: t.blue,
                            border: `1px solid ${t.stroke}`,
                            cursor: 'pointer',
                            marginLeft: 6,
                          }}
                        >
                          <History size={13} />
                          <span>Ledger</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
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
              Showing <b>{filtered.length}</b> of <b>{payments.length}</b> fee payments
            </div>
            <div>
              Total Filtered: <b style={{ color: t.mintInk, fontFamily: SORA }}>UGX {fmtUGX(filtered.reduce((s, p) => s + Number(p.amount_paid || 0), 0))}</b>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
