import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Filter,
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
  Landmark,
  CircleDollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { fetchReceipts, RECEIPTS_QUERY_KEY } from './api/receipts';
import { fetchExpenses, EXPENSES_QUERY_KEY } from './api/expenses';
import {
  schoolCalendarTodayIso,
  addCalendarDaysToIsoYmd,
  firstDayOfMonthIsoYmd,
} from '../../lib/schoolCalendarDate';
import { useAcademicPeriod } from '../../lib/academicPeriodTerminology';
import { useSort, Th } from '../../lib/useSort';
import { exportToPdf, exportToExcel } from '../../lib/exportUtils';
import PosEmptyState from '../../components/finance/pos/PosEmptyState';
import {
  getTokens,
  cardGrad,
  fmtUGX,
  SORA,
  INTER,
} from '../../styles/posThemeTokens';

const STALE_MS = 2 * 60 * 1000;

type EntryType = 'payment' | 'expense';
type DateFilter = 'today' | 'week' | 'month' | 'three_months' | 'six_months' | 'this_year' | 'year' | 'all';

type CashbookEntry = {
  id: string;
  date: string;
  type: EntryType;
  description: string;
  cashIn: number;
  cashOut: number;
  balance: number;
};

export default function BankPage() {
  const schoolId = useAuthStore((s) => s.schoolId);
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t = getTokens(isDark);
  const { labels } = useAcademicPeriod();

  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | EntryType>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  const { data: receiptsData, isLoading: receiptsLoading } = useQuery({
    queryKey: [...RECEIPTS_QUERY_KEY, schoolId],
    queryFn: () => fetchReceipts(schoolId!),
    enabled: !!schoolId,
    staleTime: STALE_MS,
    gcTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const { data: expenseRows = [], isLoading: expensesLoading } = useQuery({
    queryKey: [...EXPENSES_QUERY_KEY, schoolId],
    queryFn: () => fetchExpenses(schoolId!),
    enabled: !!schoolId,
    staleTime: STALE_MS,
    gcTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const isLoading = receiptsLoading || expensesLoading;
  const schoolName = receiptsData?.schoolName ?? '';

  const todayIso = schoolCalendarTodayIso();
  const weekStartIso = addCalendarDaysToIsoYmd(todayIso, -7);
  const monthStartIso = firstDayOfMonthIsoYmd(todayIso);
  const threeMonthsStartIso = addCalendarDaysToIsoYmd(todayIso, -90);
  const sixMonthsStartIso = addCalendarDaysToIsoYmd(todayIso, -180);
  const thisYearStartIso = `${todayIso.slice(0, 4)}-01-01`;
  const yearStartIso = addCalendarDaysToIsoYmd(todayIso, -365);

  // Build full cashbook with running balance (chronological asc, then reversed for display)
  const allEntries = useMemo((): CashbookEntry[] => {
    if (!receiptsData) return [];
    const payments = receiptsData.payments;
    const studentMap = receiptsData.studentMap;
    const entries: Omit<CashbookEntry, 'balance'>[] = [];

    payments.forEach((p) => {
      const name = studentMap[p.student_id]?.name ?? '—';
      entries.push({
        id: p.payment_id,
        date: p.payment_date || todayIso,
        type: 'payment',
        description: `Fee Payment — ${name}${p.receipt_number ? ` (Receipt #${p.receipt_number})` : ''}`,
        cashIn: Number(p.amount_paid || 0),
        cashOut: 0,
      });
    });

    expenseRows
      .filter((e) => e.status === 'approved' || e.status === 'paid')
      .forEach((e) => {
        entries.push({
          id: e.expense_id,
          date: e.expense_date,
          type: 'expense',
          description: e.description || e.category_name || 'Expense Disbursement',
          cashIn: 0,
          cashOut: Number(e.amount || 0),
        });
      });

    entries.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    let running = 0;
    return entries.map((e) => {
      running += e.cashIn - e.cashOut;
      return { ...e, balance: running };
    });
  }, [receiptsData, expenseRows, todayIso]);

  // Overall Lifetime Totals
  const { totalIn, totalOut, netBalance, inCount, outCount } = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let inCount = 0;
    let outCount = 0;
    for (const e of allEntries) {
      if (e.type === 'payment') {
        totalIn += e.cashIn;
        inCount++;
      } else {
        totalOut += e.cashOut;
        outCount++;
      }
    }
    return {
      totalIn,
      totalOut,
      netBalance: totalIn - totalOut,
      inCount,
      outCount,
    };
  }, [allEntries]);

  // Apply filters
  const filtered = useMemo(() => {
    let res = [...allEntries].reverse();
    if (dateFilter !== 'all') {
      let cutoff = '';
      if (dateFilter === 'today') cutoff = todayIso;
      else if (dateFilter === 'week') cutoff = weekStartIso;
      else if (dateFilter === 'month') cutoff = monthStartIso;
      else if (dateFilter === 'three_months') cutoff = threeMonthsStartIso;
      else if (dateFilter === 'six_months') cutoff = sixMonthsStartIso;
      else if (dateFilter === 'this_year') cutoff = thisYearStartIso;
      else if (dateFilter === 'year') cutoff = yearStartIso;

      const exact = dateFilter === 'today';
      res = res.filter((e) => (exact ? e.date === cutoff : e.date >= cutoff));
    }
    if (typeFilter !== 'all') res = res.filter((e) => e.type === typeFilter);
    if (q.trim()) {
      const s = q.toLowerCase();
      res = res.filter((e) => e.description.toLowerCase().includes(s));
    }
    return res;
  }, [
    allEntries,
    dateFilter,
    typeFilter,
    q,
    todayIso,
    weekStartIso,
    monthStartIso,
    threeMonthsStartIso,
    sixMonthsStartIso,
    thisYearStartIso,
    yearStartIso,
  ]);

  // Selected Period Totals (for filtered rows)
  const { periodIn, periodOut, periodNet, periodInCount, periodOutCount } = useMemo(() => {
    let inSum = 0;
    let outSum = 0;
    let inCount = 0;
    let outCount = 0;
    for (const e of filtered) {
      if (e.type === 'payment') {
        inSum += e.cashIn;
        inCount++;
      } else {
        outSum += e.cashOut;
        outCount++;
      }
    }
    return {
      periodIn: inSum,
      periodOut: outSum,
      periodNet: inSum - outSum,
      periodInCount: inCount,
      periodOutCount: outCount,
    };
  }, [filtered]);

  const { sortKey, sortDir, sorted, toggleSort } = useSort(
    filtered as unknown as Record<string, unknown>[],
    'date',
    'desc'
  );

  const subtitleForExport = `${
    dateFilter === 'today'
      ? 'Today'
      : dateFilter === 'week'
      ? 'Last 7 days'
      : dateFilter === 'month'
      ? 'This month'
      : dateFilter === 'three_months'
      ? 'Last 3 months'
      : dateFilter === 'six_months'
      ? 'Last 6 months'
      : dateFilter === 'this_year'
      ? `This year (${todayIso.slice(0, 4)})`
      : dateFilter === 'year'
      ? 'Last 12 months'
      : 'All time'
  } · ${typeFilter === 'all' ? 'All transactions' : typeFilter === 'payment' ? 'Inflows only' : 'Outflows only'}`;

  function doExportPdf() {
    exportToPdf({
      title: 'Bank & Cash — Cashbook Ledger',
      subtitle: subtitleForExport,
      schoolName,
      columns: [
        { header: 'Date', key: 'date', width: 22 },
        { header: 'Type', key: 'type', width: 16 },
        { header: 'Description', key: 'description', width: 70 },
        {
          header: 'Cash In (UGX)',
          key: 'cashIn',
          width: 24,
          align: 'right',
          format: (v) => (Number(v) > 0 ? fmtUGX(Number(v)) : '—'),
        },
        {
          header: 'Cash Out (UGX)',
          key: 'cashOut',
          width: 24,
          align: 'right',
          format: (v) => (Number(v) > 0 ? fmtUGX(Number(v)) : '—'),
        },
        {
          header: 'Balance (UGX)',
          key: 'balance',
          width: 24,
          align: 'right',
          format: (v) => fmtUGX(Number(v)),
        },
      ],
      rows: sorted as unknown as Record<string, unknown>[],
      totalsRow: [
        'TOTALS',
        `${sorted.length} entries`,
        `Net Period Movement: ${fmtUGX(periodNet)}`,
        fmtUGX(periodIn),
        fmtUGX(periodOut),
        fmtUGX(periodNet),
      ],
      filename: `cashbook-${todayIso}`,
    });
  }

  function doExportExcel() {
    exportToExcel({
      title: 'Bank & Cash — Cashbook Ledger',
      subtitle: subtitleForExport,
      schoolName,
      columns: [
        { header: 'Date', key: 'date', width: 16 },
        { header: 'Type', key: 'type', width: 12 },
        { header: 'Description', key: 'description', width: 48 },
        {
          header: 'Cash In (UGX)',
          key: 'cashIn',
          width: 18,
          align: 'right',
          format: (v) => (Number(v) > 0 ? fmtUGX(Number(v)) : ''),
        },
        {
          header: 'Cash Out (UGX)',
          key: 'cashOut',
          width: 18,
          align: 'right',
          format: (v) => (Number(v) > 0 ? fmtUGX(Number(v)) : ''),
        },
        {
          header: 'Balance (UGX)',
          key: 'balance',
          width: 18,
          align: 'right',
          format: (v) => fmtUGX(Number(v)),
        },
      ],
      rows: sorted as unknown as Record<string, unknown>[],
      totalsRow: [
        'TOTALS',
        `${sorted.length} entries`,
        `Net Period Movement: ${fmtUGX(periodNet)}`,
        fmtUGX(periodIn),
        fmtUGX(periodOut),
        fmtUGX(periodNet),
      ],
      filename: `cashbook-${todayIso}`,
    });
  }

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
      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
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
            Bank & Cash
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={doExportPdf}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              height: 38,
              padding: '0 16px',
              background: t.fieldBg,
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
            onClick={doExportExcel}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              height: 38,
              padding: '0 16px',
              background: t.fieldBg,
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

      {/* ── 4-CARD POS METRIC STRIP ────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: 14,
          marginBottom: 22,
        }}
      >
        {/* Card 1: Total Inflows */}
        <div
          style={{
            background: cardGrad(t, 'mint'),
            border: `1px solid ${t.stroke}`,
            borderRadius: 16,
            padding: '16px 18px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: t.textMid, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Cash Inflows
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: isDark ? 'rgba(61,232,160,0.12)' : '#E6F9F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowUpRight className="h-4 w-4" style={{ color: t.mintInk }} />
            </div>
          </div>
          <div style={{ fontFamily: SORA, fontSize: 21, fontWeight: 800, color: t.mintInk, marginBottom: 4 }}>
            {fmtUGX(periodIn)}
          </div>
          <div style={{ fontSize: 11.5, color: t.textLow }}>
            {periodInCount} recorded receipt{periodInCount !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Card 2: Total Outflows */}
        <div
          style={{
            background: cardGrad(t, 'amber'),
            border: `1px solid ${t.stroke}`,
            borderRadius: 16,
            padding: '16px 18px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: t.textMid, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Cash Outflows
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: isDark ? 'rgba(245,192,68,0.12)' : '#FEF3C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowDownRight className="h-4 w-4" style={{ color: t.warn }} />
            </div>
          </div>
          <div style={{ fontFamily: SORA, fontSize: 21, fontWeight: 800, color: t.warn, marginBottom: 4 }}>
            {fmtUGX(periodOut)}
          </div>
          <div style={{ fontSize: 11.5, color: t.textLow }}>
            {periodOutCount} approved expense{periodOutCount !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Card 3: Net Cashbook Position */}
        <div
          style={{
            background: cardGrad(t, periodNet >= 0 ? 'mint' : 'red'),
            border: `1px solid ${t.stroke}`,
            borderRadius: 16,
            padding: '16px 18px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: t.textMid, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Net Operating Balance
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: periodNet >= 0 ? (isDark ? 'rgba(61,232,160,0.12)' : '#E6F9F0') : (isDark ? 'rgba(248,113,113,0.12)' : '#FEE2E2'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Scale className="h-4 w-4" style={{ color: periodNet >= 0 ? t.mintInk : t.red }} />
            </div>
          </div>
          <div
            style={{
              fontFamily: SORA,
              fontSize: 21,
              fontWeight: 800,
              color: periodNet >= 0 ? t.textHi : t.red,
              marginBottom: 4,
            }}
          >
            {periodNet < 0 ? '-' : ''}{fmtUGX(Math.abs(periodNet))}
          </div>
          <div style={{ fontSize: 11.5, color: t.textLow }}>
            {periodNet >= 0 ? 'Operating Surplus' : 'Deficit Cashflow'}
          </div>
        </div>

        {/* Card 4: Running Balance */}
        <div
          style={{
            background: cardGrad(t, 'blue'),
            border: `1px solid ${t.stroke}`,
            borderRadius: 16,
            padding: '16px 18px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: t.textMid, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Cashbook Position
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: isDark ? 'rgba(120,170,255,0.12)' : '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Landmark className="h-4 w-4" style={{ color: t.blue }} />
            </div>
          </div>
          <div style={{ fontFamily: SORA, fontSize: 21, fontWeight: 800, color: t.textHi, marginBottom: 4 }}>
            {fmtUGX(allEntries.length > 0 ? allEntries[allEntries.length - 1].balance : 0)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: t.mintInk, fontWeight: 600 }}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            Audit Reconciled
          </div>
        </div>
      </div>

      {/* ── FILTER & SEARCH BAR ────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', minWidth: 260, flex: 1 }}>
          <Search
            className="h-4 w-4"
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: t.textLow,
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search description, student, or voucher..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{
              width: '100%',
              height: 40,
              paddingLeft: 38,
              paddingRight: 14,
              background: t.panel,
              border: `1px solid ${t.stroke}`,
              borderRadius: 10,
              color: t.textHi,
              fontSize: 13.5,
              outline: 'none',
              transition: 'all 0.15s ease',
            }}
          />
        </div>

        {/* Timeframe Dropdown & Quick Selection */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              background: t.panel,
              border: `1px solid ${t.stroke}`,
              borderRadius: 10,
              padding: 3,
            }}
          >
            {[
              { id: 'all', label: 'All Time' },
              { id: 'this_year', label: 'Year' },
              { id: 'six_months', label: '6M' },
              { id: 'three_months', label: '3M' },
              { id: 'month', label: 'Month' },
              { id: 'week', label: '7D' },
              { id: 'today', label: 'Today' },
            ].map(({ id, label }) => {
              const active = dateFilter === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setDateFilter(id as DateFilter)}
                  style={{
                    height: 32,
                    padding: '0 10px',
                    borderRadius: 7,
                    border: 'none',
                    background: active ? (isDark ? 'rgba(61,232,160,0.15)' : '#E6F9F0') : 'transparent',
                    color: active ? t.mintInk : t.textMid,
                    fontSize: 12,
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Detailed Timeframe Dropdown */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Calendar
              className="h-4 w-4"
              style={{
                position: 'absolute',
                left: 12,
                color: t.textLow,
                pointerEvents: 'none',
              }}
            />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              style={{
                height: 40,
                paddingLeft: 36,
                paddingRight: 32,
                background: t.panel,
                border: `1px solid ${t.stroke}`,
                borderRadius: 10,
                color: t.textHi,
                fontSize: 13,
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">This Month</option>
              <option value="three_months">Last 3 Months (90 Days)</option>
              <option value="six_months">Last 6 Months (180 Days)</option>
              <option value="this_year">This Year ({todayIso.slice(0, 4)})</option>
              <option value="year">Last 12 Months (1 Year)</option>
              <option value="all">All Time (Full Cashbook)</option>
            </select>
          </div>
        </div>

        {/* Type Filter */}
        <div style={{ position: 'relative' }}>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            style={{
              height: 40,
              padding: '0 32px 0 14px',
              background: t.panel,
              border: `1px solid ${t.stroke}`,
              borderRadius: 10,
              color: t.textHi,
              fontSize: 13,
              fontWeight: 500,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Transactions</option>
            <option value="payment">Inflows Only (Fee Payments)</option>
            <option value="expense">Outflows Only (Expenses)</option>
          </select>
        </div>
      </div>

      {/* ── TABLE CARD ──────────────────────────────────────────────────────── */}
      <div
        style={{
          background: t.panel,
          border: `1px solid ${t.stroke}`,
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        {isLoading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: t.textMid, fontSize: 14 }}>
            Loading cashbook records...
          </div>
        ) : sorted.length === 0 ? (
          <PosEmptyState
            icon={<TrendingUp size={30} />}
            title={allEntries.length === 0 ? 'Cashbook is Empty' : 'No Matching Transactions'}
            description={
              allEntries.length === 0
                ? 'No fee payments or approved expenses have been logged yet. Inflows and disbursements will reconcile here.'
                : 'Try adjusting your search criteria or switching to a broader date filter.'
            }
            accentColor="mint"
            minHeight={280}
          />
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: t.fieldBg, borderBottom: `1px solid ${t.divider}` }}>
                    <Th label="Date" sortKey="date" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <Th label="Type" sortKey="type" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <Th label="Description" sortKey="description" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <Th label="Cash In (UGX)" sortKey="cashIn" currentKey={sortKey} dir={sortDir} onSort={toggleSort} right />
                    <Th label="Cash Out (UGX)" sortKey="cashOut" currentKey={sortKey} dir={sortDir} onSort={toggleSort} right />
                    <Th label="Balance (UGX)" sortKey="balance" currentKey={sortKey} dir={sortDir} onSort={toggleSort} right />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row, idx) => {
                    const e = row as unknown as CashbookEntry;
                    const isEven = idx % 2 === 0;
                    return (
                      <tr
                        key={e.id}
                        style={{
                          background: isEven ? 'transparent' : isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.01)',
                          borderBottom: `1px solid ${t.divider}`,
                          transition: 'background 0.12s ease',
                        }}
                      >
                        <td style={{ padding: '12px 16px', color: t.textMid, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                          {e.date}
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '2px 9px',
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 700,
                              background:
                                e.type === 'payment'
                                  ? isDark
                                    ? 'rgba(61,232,160,0.14)'
                                    : '#E6F9F0'
                                  : isDark
                                  ? 'rgba(245,192,68,0.14)'
                                  : '#FEF3C7',
                              color: e.type === 'payment' ? t.mintInk : t.warn,
                            }}
                          >
                            {e.type === 'payment' ? 'INFLOW' : 'OUTFLOW'}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '12px 16px',
                            color: t.textHi,
                            fontWeight: 600,
                            maxWidth: 380,
                          }}
                        >
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.description}>
                            {e.description}
                          </div>
                        </td>
                        <td
                          style={{
                            padding: '12px 16px',
                            textAlign: 'right',
                            fontFamily: SORA,
                            fontWeight: 700,
                            color: e.cashIn > 0 ? t.mintInk : t.textLow,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {e.cashIn > 0 ? fmtUGX(e.cashIn) : '—'}
                        </td>
                        <td
                          style={{
                            padding: '12px 16px',
                            textAlign: 'right',
                            fontFamily: SORA,
                            fontWeight: 700,
                            color: e.cashOut > 0 ? t.warn : t.textLow,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {e.cashOut > 0 ? fmtUGX(e.cashOut) : '—'}
                        </td>
                        <td
                          style={{
                            padding: '12px 16px',
                            textAlign: 'right',
                            fontFamily: SORA,
                            fontWeight: 800,
                            color: e.balance >= 0 ? t.textHi : t.red,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {e.balance < 0 ? '-' : ''}{fmtUGX(Math.abs(e.balance))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Table Totals Row */}
                <tfoot>
                  <tr
                    style={{
                      background: isDark ? 'rgba(16,185,129,0.08)' : '#F0FDF4',
                      borderTop: `2px solid ${t.mint}`,
                    }}
                  >
                    <td
                      colSpan={3}
                      style={{
                        padding: '12px 16px',
                        fontFamily: SORA,
                        fontWeight: 800,
                        fontSize: 12.5,
                        color: t.textHi,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Totals ({sorted.length} Entries)
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        textAlign: 'right',
                        fontFamily: SORA,
                        fontWeight: 800,
                        fontSize: 13,
                        color: t.mintInk,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {fmtUGX(periodIn)}
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        textAlign: 'right',
                        fontFamily: SORA,
                        fontWeight: 800,
                        fontSize: 13,
                        color: t.warn,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {fmtUGX(periodOut)}
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        textAlign: 'right',
                        fontFamily: SORA,
                        fontWeight: 900,
                        fontSize: 13,
                        color: periodNet >= 0 ? t.mintInk : t.red,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {periodNet < 0 ? '-' : ''}{fmtUGX(Math.abs(periodNet))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Table Footer Summary Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
                padding: '14px 20px',
                borderTop: `1px solid ${t.divider}`,
                background: t.fieldBg,
                fontSize: 12.5,
              }}
            >
              <div style={{ color: t.textMid }}>
                Showing <strong style={{ color: t.textHi }}>{sorted.length}</strong> transaction{sorted.length !== 1 ? 's' : ''}
                {allEntries.length !== sorted.length ? ` (filtered from ${allEntries.length} total)` : ''}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ color: t.textMid }}>
                  Total In: <strong style={{ color: t.mintInk }}>{fmtUGX(periodIn)}</strong>
                </div>
                <div style={{ color: t.textMid }}>
                  Total Out: <strong style={{ color: t.warn }}>{fmtUGX(periodOut)}</strong>
                </div>
                <div style={{ fontFamily: SORA, fontWeight: 700, color: t.textHi }}>
                  Period Net:{' '}
                  <span style={{ color: periodNet >= 0 ? t.mintInk : t.red }}>
                    {periodNet < 0 ? '-' : ''}{fmtUGX(Math.abs(periodNet))}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
