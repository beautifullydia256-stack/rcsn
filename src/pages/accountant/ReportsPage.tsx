import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart2,
  Download,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Receipt,
  Users,
  Percent,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { fetchFeeCollectionReport, REPORTS_FEE_COLLECTION_QUERY_KEY } from './api/reports';
import { useSort, Th } from '../../lib/useSort';
import { exportToPdf, exportToExcel } from '../../lib/exportUtils';
import { schoolCalendarTodayIso } from '../../lib/schoolCalendarDate';
import { useSchoolName } from '../../lib/useSchoolName';
import { useAcademicPeriod } from '../../lib/academicPeriodTerminology';
import PosEmptyState from '../../components/finance/pos/PosEmptyState';
import {
  getTokens,
  cardGrad,
  fmtUGX,
  SORA,
  INTER,
} from '../../styles/posThemeTokens';

const STALE_MS = 2 * 60 * 1000;

export default function ReportsPage() {
  const schoolId = useAuthStore((s) => s.schoolId);
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t = getTokens(isDark);

  const schoolName = useSchoolName();
  const { labels, isTertiary } = useAcademicPeriod();
  const todayIso = schoolCalendarTodayIso();
  const [reportType] = useState<'fee_collection'>('fee_collection');

  const {
    data: rows = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: [...REPORTS_FEE_COLLECTION_QUERY_KEY, schoolId],
    queryFn: () => fetchFeeCollectionReport(schoolId!),
    enabled: !!schoolId && reportType === 'fee_collection',
    staleTime: STALE_MS,
    gcTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: true,
  });

  const { sortKey, sortDir, sorted, toggleSort } = useSort(
    rows as unknown as Record<string, unknown>[],
    'outstanding',
    'desc'
  );

  const totalExpected = rows.reduce((s, r) => s + r.expected, 0);
  const totalCollected = rows.reduce((s, r) => s + r.collected, 0);
  const totalOutstanding = rows.reduce((s, r) => s + r.outstanding, 0);
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  function doExportPdf() {
    exportToPdf({
      title: isTertiary ? 'Fee Collection Report — by Cohort' : 'Fee Collection Report — by Class',
      subtitle: `${labels.currentPeriod} · Generated ${todayIso}`,
      schoolName,
      columns: [
        { header: isTertiary ? 'Cohort / Programme' : 'Class', key: 'class_name', width: 36 },
        {
          header: 'Expected (UGX)',
          key: 'expected',
          width: 28,
          align: 'right',
          format: (v) => fmtUGX(Number(v || 0)),
        },
        {
          header: 'Collected (UGX)',
          key: 'collected',
          width: 28,
          align: 'right',
          format: (v) => fmtUGX(Number(v || 0)),
        },
        {
          header: 'Outstanding (UGX)',
          key: 'outstanding',
          width: 28,
          align: 'right',
          format: (v) => fmtUGX(Number(v || 0)),
        },
        {
          header: 'Collection %',
          key: 'collected',
          width: 20,
          align: 'right',
          format: (v, row) => {
            const exp = Number((row as Record<string, unknown>)?.['expected'] ?? 0);
            const col = Number(v || 0);
            return exp > 0 ? `${Math.round((col / exp) * 100)}%` : '—';
          },
        },
      ],
      rows: sorted as unknown as Record<string, unknown>[],
      filename: `fee-collection-report-${todayIso}`,
      totalsRow: [
        'TOTAL',
        fmtUGX(totalExpected),
        fmtUGX(totalCollected),
        fmtUGX(totalOutstanding),
        `${collectionRate}%`,
      ],
    });
  }

  function doExportExcel() {
    exportToExcel({
      title: isTertiary ? 'Fee Collection Report — by Cohort' : 'Fee Collection Report — by Class',
      subtitle: `${labels.currentPeriod} · Generated ${todayIso}`,
      schoolName,
      columns: [
        { header: isTertiary ? 'Cohort / Programme' : 'Class', key: 'class_name', width: 24 },
        {
          header: 'Expected (UGX)',
          key: 'expected',
          width: 18,
          align: 'right',
          format: (v) => fmtUGX(Number(v || 0)),
        },
        {
          header: 'Collected (UGX)',
          key: 'collected',
          width: 18,
          align: 'right',
          format: (v) => fmtUGX(Number(v || 0)),
        },
        {
          header: 'Outstanding (UGX)',
          key: 'outstanding',
          width: 20,
          align: 'right',
          format: (v) => fmtUGX(Number(v || 0)),
        },
        {
          header: 'Collection %',
          key: 'class_name',
          width: 14,
          align: 'right',
          format: (_v, row) => {
            const r = row as Record<string, unknown>;
            const exp = Number(r['expected'] ?? 0);
            const col = Number(r['collected'] ?? 0);
            return exp > 0 ? `${Math.round((col / exp) * 100)}%` : '—';
          },
        },
      ],
      rows: sorted as unknown as Record<string, unknown>[],
      filename: `fee-collection-report-${todayIso}`,
      totalsRow: [
        'TOTAL',
        fmtUGX(totalExpected),
        fmtUGX(totalCollected),
        fmtUGX(totalOutstanding),
        `${collectionRate}%`,
      ],
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
            Financial Reports
          </div>
          <div style={{ fontSize: 13, color: t.textMid }}>
            Comprehensive fee collection summary by {isTertiary ? 'cohort / programme' : 'class'} for {labels.currentPeriod}.
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
            onClick={doExportExcel}
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

      {/* ── 4-CARD POS PERFORMANCE STRIP ───────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: 14,
          marginBottom: 22,
        }}
      >
        {/* Card 1: Expected Revenue */}
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
              Expected Revenue
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
              <Receipt className="h-4 w-4" style={{ color: t.blue }} />
            </div>
          </div>
          <div style={{ fontFamily: SORA, fontSize: 21, fontWeight: 800, color: t.textHi, marginBottom: 4 }}>
            {fmtUGX(totalExpected)}
          </div>
          <div style={{ fontSize: 11.5, color: t.textLow }}>
            Total billed for {labels.periodNoun.toLowerCase()}
          </div>
        </div>

        {/* Card 2: Collected Revenue */}
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
              Collected Fees
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
              <CheckCircle2 className="h-4 w-4" style={{ color: t.mintInk }} />
            </div>
          </div>
          <div style={{ fontFamily: SORA, fontSize: 21, fontWeight: 800, color: t.mintInk, marginBottom: 4 }}>
            {fmtUGX(totalCollected)}
          </div>
          <div style={{ fontSize: 11.5, color: t.textLow }}>
            Banked & cleared receipts
          </div>
        </div>

        {/* Card 3: Outstanding Fees */}
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
              Outstanding Balance
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
              <AlertCircle className="h-4 w-4" style={{ color: t.warn }} />
            </div>
          </div>
          <div style={{ fontFamily: SORA, fontSize: 21, fontWeight: 800, color: t.warn, marginBottom: 4 }}>
            {fmtUGX(totalOutstanding)}
          </div>
          <div style={{ fontSize: 11.5, color: t.textLow }}>
            Uncollected tuition arrears
          </div>
        </div>

        {/* Card 4: Collection Rate */}
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
              Collection Efficiency
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
              <Percent className="h-4 w-4" style={{ color: t.mintInk }} />
            </div>
          </div>
          <div style={{ fontFamily: SORA, fontSize: 21, fontWeight: 800, color: t.mintInk, marginBottom: 6 }}>
            {collectionRate}%
          </div>
          {/* Progress bar */}
          <div
            style={{
              height: 6,
              width: '100%',
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
                width: `${Math.min(100, collectionRate)}%`,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
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
            Loading collection report...
          </div>
        ) : isError ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: t.red, fontSize: 14 }}>
            Could not load fee collection report.
          </div>
        ) : sorted.length === 0 ? (
          <PosEmptyState
            icon={<BarChart2 size={30} />}
            title={`No Data for ${labels.currentPeriod}`}
            description={`No fee structures or balances have been posted for the active ${labels.periodNoun.toLowerCase()}. Generate invoices to begin tracking collections.`}
            accentColor="gold"
            minHeight={280}
          />
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: t.fieldBg, borderBottom: `1px solid ${t.divider}` }}>
                    <Th
                      label={isTertiary ? 'Cohort / Programme' : 'Class'}
                      sortKey="class_name"
                      currentKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <Th label="Expected (UGX)" sortKey="expected" currentKey={sortKey} dir={sortDir} onSort={toggleSort} right />
                    <Th label="Collected (UGX)" sortKey="collected" currentKey={sortKey} dir={sortDir} onSort={toggleSort} right />
                    <Th label="Outstanding (UGX)" sortKey="outstanding" currentKey={sortKey} dir={sortDir} onSort={toggleSort} right />
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: t.textMid,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Collection Rate
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row, idx) => {
                    const r = row as unknown as typeof rows[number];
                    const rate = r.expected > 0 ? Math.round((r.collected / r.expected) * 100) : 0;
                    const isEven = idx % 2 === 0;
                    return (
                      <tr
                        key={r.class_name}
                        style={{
                          background: isEven ? 'transparent' : isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.01)',
                          borderBottom: `1px solid ${t.divider}`,
                          transition: 'background 0.12s ease',
                        }}
                      >
                        <td style={{ padding: '12px 16px', color: t.textHi, fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {r.class_name}
                        </td>
                        <td
                          style={{
                            padding: '12px 16px',
                            textAlign: 'right',
                            color: t.textMid,
                            fontFamily: SORA,
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {fmtUGX(r.expected)}
                        </td>
                        <td
                          style={{
                            padding: '12px 16px',
                            textAlign: 'right',
                            color: t.mintInk,
                            fontFamily: SORA,
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {fmtUGX(r.collected)}
                        </td>
                        <td
                          style={{
                            padding: '12px 16px',
                            textAlign: 'right',
                            color: r.outstanding > 0 ? t.warn : t.textLow,
                            fontFamily: SORA,
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {r.outstanding > 0 ? fmtUGX(r.outstanding) : '0'}
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
                            <span
                              style={{
                                fontFamily: SORA,
                                fontSize: 12,
                                fontWeight: 700,
                                color: rate >= 80 ? t.mintInk : rate >= 50 ? t.gold : t.warn,
                                width: 36,
                                textAlign: 'right',
                              }}
                            >
                              {rate}%
                            </span>
                            <div
                              style={{
                                width: 80,
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
                                  background: rate >= 80 ? t.mintInk : rate >= 50 ? t.gold : t.warn,
                                  width: `${Math.min(100, rate)}%`,
                                }}
                              />
                            </div>
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
                padding: '14px 20px',
                borderTop: `1px solid ${t.divider}`,
                background: t.fieldBg,
                fontSize: 12.5,
              }}
            >
              <div style={{ color: t.textMid }}>
                Total Cohorts:{' '}
                <strong style={{ color: t.textHi }}>{sorted.length}</strong> {isTertiary ? 'cohort' : 'class'}
                {sorted.length !== 1 ? (isTertiary ? 's' : 'es') : ''}
              </div>
              <div style={{ fontFamily: SORA, fontWeight: 700, color: t.textHi }}>
                Total Collected:{' '}
                <span style={{ color: t.mintInk }}>{fmtUGX(totalCollected)}</span> / {fmtUGX(totalExpected)} ({collectionRate}%)
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
