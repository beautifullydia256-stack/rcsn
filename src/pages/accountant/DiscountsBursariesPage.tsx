import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Percent,
  Download,
  Search,
  Filter,
  RefreshCw,
  Award,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Users,
  Building,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useSchoolName } from '../../lib/useSchoolName';
import { useAcademicPeriod } from '../../lib/academicPeriodTerminology';
import { schoolCalendarTodayIso } from '../../lib/schoolCalendarDate';
import { exportToPdf, exportToExcel } from '../../lib/exportUtils';
import {
  fetchDiscountsAudit,
  DISCOUNTS_AUDIT_QUERY_KEY,
  type StudentDiscountAuditRow,
} from './api/discounts';
import {
  getTokens,
  fmtUGX,
  fmtUGXCompact,
  SORA,
  INTER,
} from '../../styles/posThemeTokens';
import PosEmptyState from '../../components/finance/pos/PosEmptyState';

const STALE_MS = 2 * 60 * 1000;

export default function DiscountsBursariesPage() {
  const schoolId = useAuthStore((s) => s.schoolId);
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t = getTokens(isDark);
  const amber = t.warn;
  const purple = '#a855f7';
  const cyan = '#06b6d4';

  const schoolName = useSchoolName();
  const { isTertiary, labels } = useAcademicPeriod();
  const todayIso = schoolCalendarTodayIso();

  const [q, setQ] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('all');
  const [selectedClass, setSelectedClass] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | '100_percent' | 'partial' | 'fixed'>('all');

  const {
    data: rows = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: [...DISCOUNTS_AUDIT_QUERY_KEY, schoolId],
    queryFn: () => fetchDiscountsAudit(schoolId!),
    enabled: !!schoolId,
    staleTime: STALE_MS,
    gcTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: true,
  });

  // Extract distinct terms and classes for dropdowns
  const availableTerms = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => map.set(r.term_id, r.term_label));
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [rows]);

  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.current_class && r.current_class !== '—') set.add(r.current_class);
    });
    return Array.from(set).sort();
  }, [rows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (selectedTerm !== 'all' && r.term_id !== selectedTerm) return false;
      if (selectedClass !== 'all' && r.current_class !== selectedClass) return false;

      if (categoryFilter === '100_percent' && !r.is_100_percent) return false;
      if (categoryFilter === 'partial' && (r.is_100_percent || r.discount_type !== 'percentage')) return false;
      if (categoryFilter === 'fixed' && r.discount_type !== 'fixed') return false;

      if (q.trim()) {
        const query = q.toLowerCase();
        const matchesName = r.name.toLowerCase().includes(query);
        const matchesAdm = r.admission_number.toLowerCase().includes(query);
        const matchesClass = r.current_class.toLowerCase().includes(query);
        if (!matchesName && !matchesAdm && !matchesClass) return false;
      }
      return true;
    });
  }, [rows, selectedTerm, selectedClass, categoryFilter, q]);

  // Financial summary metrics
  const totals = useMemo(() => {
    let gross = 0;
    let discount = 0;
    let net = 0;
    let paid = 0;
    let balance = 0;
    let count100 = 0;

    filteredRows.forEach((r) => {
      gross += r.gross_fee;
      discount += r.discount_amount;
      net += r.net_billed;
      paid += r.amount_paid;
      balance += r.balance;
      if (r.is_100_percent) count100++;
    });

    const recoveryRate = net > 0 ? (paid / net) * 100 : 100;

    return {
      studentCount: filteredRows.length,
      count100,
      gross,
      discount,
      net,
      paid,
      balance,
      recoveryRate,
    };
  }, [filteredRows]);

  // Official PDF Export
  function handleExportPdf() {
    exportToPdf({
      title: 'DISCOUNTS, BURSARIES & SCHOLARSHIPS AUDIT REPORT',
      subtitle: `Audit Breakdown of Student Fee Concessions & Relief · Generated ${todayIso}`,
      schoolName,
      columns: [
        { header: isTertiary ? 'Trainee Name' : 'Student Name', key: 'name', width: 34 },
        { header: isTertiary ? 'Admission / Reg No' : 'Adm No', key: 'admission_number', width: 22 },
        { header: isTertiary ? 'Programme / Cohort' : 'Class', key: 'current_class', width: 26 },
        { header: 'Period', key: 'term_label', width: 22 },
        {
          header: 'Gross Fee',
          key: 'gross_fee',
          width: 24,
          align: 'right',
          format: (v) => fmtUGX(Number(v || 0)),
        },
        {
          header: 'Discount Concession',
          key: 'discount_reason',
          width: 32,
        },
        {
          header: 'Relief / Waived',
          key: 'discount_amount',
          width: 24,
          align: 'right',
          format: (v) => fmtUGX(Number(v || 0)),
        },
        {
          header: 'Net Billed',
          key: 'net_billed',
          width: 24,
          align: 'right',
          format: (v) => fmtUGX(Number(v || 0)),
        },
        {
          header: 'Amount Paid',
          key: 'amount_paid',
          width: 24,
          align: 'right',
          format: (v) => fmtUGX(Number(v || 0)),
        },
        {
          header: 'Balance Due',
          key: 'balance',
          width: 24,
          align: 'right',
          format: (v) => fmtUGX(Number(v || 0)),
        },
      ],
      rows: filteredRows.map((r) => ({
        ...r,
      })),
      filename: `discounts_bursaries_audit_${todayIso}.pdf`,
      totalsRow: [
        'TOTALS / SUMMARY',
        `${totals.studentCount} Students (${totals.count100} Full 100%)`,
        '—',
        '—',
        fmtUGX(totals.gross),
        'Total Relief Forgone',
        fmtUGX(totals.discount),
        fmtUGX(totals.net),
        fmtUGX(totals.paid),
        fmtUGX(totals.balance),
      ],
    });
  }

  return (
    <div
      style={{
        padding: '24px 28px',
        maxWidth: 1600,
        margin: '0 auto',
        fontFamily: INTER,
      }}
    >
      {/* Page Header */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${t.gold}22, ${amber}33)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: t.gold,
                border: `1px solid ${t.gold}44`,
              }}
            >
              <Percent size={22} />
            </div>
            <div>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  fontFamily: SORA,
                  color: t.textHi,
                  margin: 0,
                  letterSpacing: '-0.4px',
                }}
              >
                Discounts, Bursaries & Scholarships Audit
              </h1>
              <p style={{ fontSize: 13, color: t.textMid, margin: '2px 0 0 0' }}>
                Track fee remissions, 100% full waivers, institutional revenue forgone, and net collections
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh Data"
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
            }}
          >
            <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleExportPdf}
            disabled={filteredRows.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 18px',
              borderRadius: 10,
              background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
              color: t.ctaText,
              fontWeight: 700,
              fontSize: 13,
              border: 'none',
              cursor: filteredRows.length === 0 ? 'not-allowed' : 'pointer',
              boxShadow: `0 4px 16px ${t.mintDim}`,
              opacity: filteredRows.length === 0 ? 0.6 : 1,
            }}
          >
            <Download size={15} />
            <span>Download Audit PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
          marginBottom: 24,
        }}
      >
        {/* Total Discounted Students */}
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
            borderRadius: 14,
            padding: '16px 18px',
            borderTop: `3px solid ${amber}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.textMid, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Discounted {isTertiary ? 'Trainees' : 'Students'}
            </span>
            <Users size={16} style={{ color: amber }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: SORA, color: t.textHi, marginTop: 8 }}>
            {totals.studentCount}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 6,
                background: `${purple}22`,
                color: purple,
                border: `1px solid ${purple}44`,
              }}
            >
              {totals.count100} with 100% Full Bursary
            </span>
          </div>
        </div>

        {/* Gross Potential Fees */}
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
            borderRadius: 14,
            padding: '16px 18px',
            borderTop: `3px solid ${cyan}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.textMid, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Gross Original Fees
            </span>
            <Building size={16} style={{ color: cyan }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: SORA, color: t.textHi, marginTop: 8 }}>
            UGX {fmtUGXCompact(totals.gross)}
          </div>
          <div style={{ fontSize: 11, color: t.textLow, marginTop: 4 }}>
            Full baseline tariff value
          </div>
        </div>

        {/* Relief / Concession Forgone */}
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.gold}55`,
            borderRadius: 14,
            padding: '16px 18px',
            borderTop: `3px solid ${t.gold}`,
            boxShadow: `0 4px 18px ${t.gold}15`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.gold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Revenue Forgone (Relief)
            </span>
            <Award size={16} style={{ color: t.gold }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: SORA, color: t.gold, marginTop: 8 }}>
            UGX {fmtUGXCompact(totals.discount)}
          </div>
          <div style={{ fontSize: 11, color: t.textLow, marginTop: 4 }}>
            Total value conceded by school
          </div>
        </div>

        {/* Net Billed Obligation */}
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
            borderRadius: 14,
            padding: '16px 18px',
            borderTop: `3px solid ${t.blue}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.textMid, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Net Billable Target
            </span>
            <Wallet size={16} style={{ color: t.blue }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: SORA, color: t.textHi, marginTop: 8 }}>
            UGX {fmtUGXCompact(totals.net)}
          </div>
          <div style={{ fontSize: 11, color: t.textLow, marginTop: 4 }}>
            Actual expected after discounts
          </div>
        </div>

        {/* Total Collected */}
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.mintRing}`,
            borderRadius: 14,
            padding: '16px 18px',
            borderTop: `3px solid ${t.mint}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.mint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Collected
            </span>
            <CheckCircle2 size={16} style={{ color: t.mint }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: SORA, color: t.mint, marginTop: 8 }}>
            UGX {fmtUGXCompact(totals.paid)}
          </div>
          <div style={{ fontSize: 11, color: t.textLow, marginTop: 4 }}>
            {totals.recoveryRate.toFixed(1)}% recovery of net target
          </div>
        </div>

        {/* Balance Outstanding */}
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
            borderRadius: 14,
            padding: '16px 18px',
            borderTop: `3px solid ${totals.balance > 0 ? t.red : t.mint}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: totals.balance > 0 ? t.red : t.mint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Pending Balance
            </span>
            <AlertCircle size={16} style={{ color: totals.balance > 0 ? t.red : t.mint }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: SORA, color: totals.balance > 0 ? t.red : t.mint, marginTop: 8 }}>
            UGX {fmtUGXCompact(totals.balance)}
          </div>
          <div style={{ fontSize: 11, color: t.textLow, marginTop: 4 }}>
            Uncollected net fee debt
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          background: t.panel,
          border: `1px solid ${t.stroke}`,
          borderRadius: 14,
          padding: '14px 18px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        {/* Search Input */}
        <div
          style={{
            position: 'relative',
            flex: '1 1 240px',
            minWidth: 200,
          }}
        >
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: t.textLow,
            }}
          />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={isTertiary ? 'Search trainee name, adm no...' : 'Search student name, adm no...'}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: 8,
              border: `1px solid ${t.stroke}`,
              background: t.fieldBg,
              color: t.textHi,
              fontSize: 12.5,
              outline: 'none',
            }}
          />
        </div>

        {/* Period / Semester Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: t.textMid, fontWeight: 600 }}>Period:</span>
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: 8,
              border: `1px solid ${t.stroke}`,
              background: t.fieldBg,
              color: t.textHi,
              fontSize: 12,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Semesters / Periods</option>
            {availableTerms.map((tm) => (
              <option key={tm.id} value={tm.id}>
                {tm.label}
              </option>
            ))}
          </select>
        </div>

        {/* Class / Programme Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: t.textMid, fontWeight: 600 }}>
            {isTertiary ? 'Programme:' : 'Class:'}
          </span>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: 8,
              border: `1px solid ${t.stroke}`,
              background: t.fieldBg,
              color: t.textHi,
              fontSize: 12,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Classes / Cohorts</option>
            {availableClasses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Discounts' },
            { id: '100_percent', label: '100% Full Bursaries' },
            { id: 'partial', label: 'Partial (%)' },
            { id: 'fixed', label: 'Fixed Amount' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id as any)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 11.5,
                fontWeight: categoryFilter === cat.id ? 700 : 500,
                border: categoryFilter === cat.id ? `1px solid ${t.mintRing}` : `1px solid ${t.stroke}`,
                background: categoryFilter === cat.id ? `${t.mint}18` : t.fieldBg,
                color: categoryFilter === cat.id ? t.mint : t.textMid,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Audit Ledger Table */}
      <div
        style={{
          background: t.panel,
          border: `1px solid ${t.stroke}`,
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: `0 4px 20px ${isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.04)'}`,
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${t.stroke}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: `${t.panel}dd`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: t.textHi, fontFamily: SORA }}>
              Student Concession Records ({filteredRows.length})
            </span>
          </div>
          <span style={{ fontSize: 11, color: t.textLow }}>
            Sorted by full scholarships first, then student name
          </span>
        </div>

        {filteredRows.length === 0 ? (
          <div style={{ padding: '40px 20px' }}>
            <PosEmptyState
              icon={<Percent size={32} style={{ color: t.gold }} />}
              title="No Discounted Students Found"
              description="No students match your selected filters or have bursaries recorded for this period."
            />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    borderBottom: `1px solid ${t.stroke}`,
                    background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                    color: t.textMid,
                    fontWeight: 700,
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  <th style={{ padding: '12px 18px' }}>{isTertiary ? 'Trainee' : 'Student'}</th>
                  <th style={{ padding: '12px 14px' }}>Adm / Reg No</th>
                  <th style={{ padding: '12px 14px' }}>{isTertiary ? 'Programme' : 'Class'}</th>
                  <th style={{ padding: '12px 14px' }}>Period</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Gross Fee</th>
                  <th style={{ padding: '12px 14px' }}>Concession Reason</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Relief Granted</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Net Billed</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Paid</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Balance</th>
                  <th style={{ padding: '12px 18px', textAlign: 'center' }}>Clearance Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => {
                  return (
                    <tr
                      key={`${r.student_id}_${r.term_id}`}
                      style={{
                        borderBottom: `1px solid ${t.stroke}`,
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Name with full waiver star */}
                      <td style={{ padding: '12px 18px', fontWeight: 600, color: t.textHi }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {r.is_100_percent && (
                            <span title="100% Full Bursary" style={{ display: 'inline-flex' }}>
                              <Sparkles size={14} style={{ color: t.gold, flexShrink: 0 }} />
                            </span>
                          )}
                          <span>{r.name}</span>
                        </div>
                      </td>

                      {/* Admission number */}
                      <td style={{ padding: '12px 14px', color: t.textMid, fontFamily: SORA, fontSize: 11.5 }}>
                        {r.admission_number}
                      </td>

                      {/* Class */}
                      <td style={{ padding: '12px 14px', color: t.textHi }}>
                        {r.current_class}
                      </td>

                      {/* Term */}
                      <td style={{ padding: '12px 14px', color: t.textMid }}>
                        {r.term_label}
                      </td>

                      {/* Gross Fee */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: SORA, color: t.textMid }}>
                        UGX {fmtUGX(r.gross_fee)}
                      </td>

                      {/* Concession Type & Reason */}
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            background: r.is_100_percent ? `${purple}22` : `${t.gold}18`,
                            color: r.is_100_percent ? purple : t.gold,
                            border: `1px solid ${r.is_100_percent ? purple + '44' : t.gold + '44'}`,
                          }}
                        >
                          {r.discount_reason || (r.is_100_percent ? '100% Full Bursary' : `${r.discount_percentage}% Concession`)}
                        </span>
                      </td>

                      {/* Relief Forgone */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: SORA, fontWeight: 700, color: t.gold }}>
                        - UGX {fmtUGX(r.discount_amount)}
                      </td>

                      {/* Net Billed */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: SORA, fontWeight: 700, color: t.textHi }}>
                        UGX {fmtUGX(r.net_billed)}
                      </td>

                      {/* Paid */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: SORA, fontWeight: 700, color: t.mint }}>
                        UGX {fmtUGX(r.amount_paid)}
                      </td>

                      {/* Balance */}
                      <td
                        style={{
                          padding: '12px 14px',
                          textAlign: 'right',
                          fontFamily: SORA,
                          fontWeight: 700,
                          color: r.balance > 0 ? t.red : t.mint,
                        }}
                      >
                        UGX {fmtUGX(r.balance)}
                      </td>

                      {/* Clearance Badge */}
                      <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                        {r.is_100_percent ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 10px',
                              borderRadius: 12,
                              fontSize: 10.5,
                              fontWeight: 700,
                              background: `${purple}20`,
                              color: purple,
                              border: `1px solid ${purple}40`,
                            }}
                          >
                            100% Free Waiver
                          </span>
                        ) : r.balance <= 0 ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 10px',
                              borderRadius: 12,
                              fontSize: 10.5,
                              fontWeight: 700,
                              background: `${t.mint}20`,
                              color: t.mint,
                              border: `1px solid ${t.mint}40`,
                            }}
                          >
                            Net Cleared
                          </span>
                        ) : r.amount_paid > 0 ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 10px',
                              borderRadius: 12,
                              fontSize: 10.5,
                              fontWeight: 700,
                              background: `${amber}20`,
                              color: amber,
                              border: `1px solid ${amber}40`,
                            }}
                          >
                            Partial (UGX {fmtUGXCompact(r.balance)} due)
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 10px',
                              borderRadius: 12,
                              fontSize: 10.5,
                              fontWeight: 700,
                              background: `${t.red}20`,
                              color: t.red,
                              border: `1px solid ${t.red}40`,
                            }}
                          >
                            Unpaid
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
