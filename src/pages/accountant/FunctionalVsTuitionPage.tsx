import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Layers,
  Download,
  Search,
  Filter,
  RefreshCw,
  ShieldCheck,
  GraduationCap,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Building,
  Users,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useSchoolName } from '../../lib/useSchoolName';
import { useAcademicPeriod } from '../../lib/academicPeriodTerminology';
import { schoolCalendarTodayIso } from '../../lib/schoolCalendarDate';
import { exportToPdf, exportToExcel } from '../../lib/exportUtils';
import {
  fetchFunctionalTrackingData,
  FUNCTIONAL_TRACKING_QUERY_KEY,
} from './api/functionalTracking';
import {
  aggregateWaterfallMetrics,
  type StudentFeeBreakdown,
} from '../../lib/feeAllocationWaterfall';
import {
  getTokens,
  fmtUGX,
  fmtUGXCompact,
  SORA,
  INTER,
} from '../../styles/posThemeTokens';
import PosEmptyState from '../../components/finance/pos/PosEmptyState';

const STALE_MS = 2 * 60 * 1000;

export default function FunctionalVsTuitionPage() {
  const schoolId = useAuthStore((s) => s.schoolId);
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t = getTokens(isDark);
  const amber = t.warn;
  const purple = '#a855f7';

  const schoolName = useSchoolName();
  const { isTertiary, labels } = useAcademicPeriod();
  const todayIso = schoolCalendarTodayIso();

  const [q, setQ] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'functional_cleared' | 'functional_pending' | 'fully_cleared'>('all');

  const {
    data,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: [...FUNCTIONAL_TRACKING_QUERY_KEY, schoolId],
    queryFn: () => fetchFunctionalTrackingData(schoolId!),
    enabled: !!schoolId,
    staleTime: STALE_MS,
    gcTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: true,
  });

  const students = data?.students || [];
  const classOptions = data?.classOptions || [];

  // Filtered students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (selectedClass !== 'all' && s.className !== selectedClass) return false;

      if (statusFilter === 'functional_cleared' && !s.isFunctionalCleared) return false;
      if (statusFilter === 'functional_pending' && s.isFunctionalCleared) return false;
      if (statusFilter === 'fully_cleared' && !s.isFullyCleared) return false;

      if (q.trim()) {
        const query = q.toLowerCase();
        const matchesName = s.studentName.toLowerCase().includes(query);
        const matchesAdm = (s.admissionNumber || '').toLowerCase().includes(query);
        const matchesClass = s.className.toLowerCase().includes(query);
        if (!matchesName && !matchesAdm && !matchesClass) return false;
      }
      return true;
    });
  }, [students, selectedClass, statusFilter, q]);

  // Aggregate metrics using our verified waterfall calculation
  const agg = useMemo(() => {
    return aggregateWaterfallMetrics(filteredStudents);
  }, [filteredStudents]);

  // Official PDF Export
  function handleExportPdf() {
    exportToPdf({
      title: 'FUNCTIONAL FEES VS. BASE TUITION SETTLEMENT REPORT',
      subtitle: `Priority Waterfall Audit (Functional Cleared 100% First) · Generated ${todayIso}`,
      schoolName,
      columns: [
        { header: isTertiary ? 'Trainee' : 'Student', key: 'studentName', width: 32 },
        { header: isTertiary ? 'Adm / Reg' : 'Adm No', key: 'admissionNumber', width: 20 },
        { header: isTertiary ? 'Programme' : 'Class', key: 'className', width: 24 },
        { header: 'Type', key: 'boardingType', width: 18 },
        {
          header: 'Func Billed',
          key: 'functionalBilled',
          width: 22,
          align: 'right',
          format: (v) => fmtUGX(Number(v || 0)),
        },
        {
          header: 'Func Paid (1st)',
          key: 'functionalPaid',
          width: 22,
          align: 'right',
          format: (v) => fmtUGX(Number(v || 0)),
        },
        {
          header: 'Func Due',
          key: 'functionalBalance',
          width: 20,
          align: 'right',
          format: (v) => fmtUGX(Number(v || 0)),
        },
        {
          header: 'Tuition Billed',
          key: 'baseTuitionBilled',
          width: 22,
          align: 'right',
          format: (v) => fmtUGX(Number(v || 0)),
        },
        {
          header: 'Tuition Paid',
          key: 'baseTuitionPaid',
          width: 22,
          align: 'right',
          format: (v) => fmtUGX(Number(v || 0)),
        },
        {
          header: 'Tuition Due',
          key: 'baseTuitionBalance',
          width: 20,
          align: 'right',
          format: (v) => fmtUGX(Number(v || 0)),
        },
        {
          header: 'Total Balance',
          key: 'totalBalance',
          width: 22,
          align: 'right',
          format: (v) => fmtUGX(Number(v || 0)),
        },
      ],
      rows: filteredStudents.map((s) => ({
        ...s,
      })),
      filename: `functional_vs_tuition_${todayIso}.pdf`,
      totalsRow: [
        'TOTALS / SUMMARY',
        `${agg.studentCount} Enrolled`,
        '—',
        '—',
        fmtUGX(agg.functionalBilled),
        fmtUGX(agg.functionalPaid),
        fmtUGX(agg.functionalBalance),
        fmtUGX(agg.baseTuitionBilled),
        fmtUGX(agg.baseTuitionPaid),
        fmtUGX(agg.baseTuitionBalance),
        fmtUGX(agg.totalBalance),
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
                background: `linear-gradient(135deg, ${t.mint}22, ${t.blue}33)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: t.mint,
                border: `1px solid ${t.mint}44`,
              }}
            >
              <Layers size={22} />
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
                Functional Fees vs. Base Tuition Tracker
              </h1>
              <p style={{ fontSize: 13, color: t.textMid, margin: '2px 0 0 0' }}>
                Priority Waterfall Settlement: Mandatory functional operational levies and boarding fees clear 100% first before base tuition
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
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
            disabled={filteredStudents.length === 0}
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
              cursor: filteredStudents.length === 0 ? 'not-allowed' : 'pointer',
              boxShadow: `0 4px 16px ${t.mintDim}`,
              opacity: filteredStudents.length === 0 ? 0.6 : 1,
            }}
          >
            <Download size={15} />
            <span>Export Breakdown PDF</span>
          </button>
        </div>
      </div>

      {/* 1. Overall Combined Position Cards (Preserving overall view intact) */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: t.textMid, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
          Overall Institutional Totals
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 14,
          }}
        >
          {/* Overall Invoiced / Expected */}
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
                Overall Total Expected
              </span>
              <Wallet size={16} style={{ color: t.blue }} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: SORA, color: t.textHi, marginTop: 8 }}>
              UGX {fmtUGXCompact(agg.totalBilled)}
            </div>
            <div style={{ fontSize: 11, color: t.textLow, marginTop: 4 }}>
              Combined Functional + Base Tuition
            </div>
          </div>

          {/* Overall Collected */}
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
                Overall Total Collected
              </span>
              <CheckCircle2 size={16} style={{ color: t.mint }} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: SORA, color: t.mint, marginTop: 8 }}>
              UGX {fmtUGXCompact(agg.totalPaid)}
            </div>
            <div style={{ fontSize: 11, color: t.textLow, marginTop: 4 }}>
              {agg.overallCollectionRate.toFixed(1)}% overall realization
            </div>
          </div>

          {/* Overall Outstanding */}
          <div
            style={{
              background: t.panel,
              border: `1px solid ${t.stroke}`,
              borderRadius: 14,
              padding: '16px 18px',
              borderTop: `3px solid ${agg.totalBalance > 0 ? t.red : t.mint}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: agg.totalBalance > 0 ? t.red : t.mint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Overall Balance Outstanding
              </span>
              <AlertCircle size={16} style={{ color: agg.totalBalance > 0 ? t.red : t.mint }} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: SORA, color: agg.totalBalance > 0 ? t.red : t.mint, marginTop: 8 }}>
              UGX {fmtUGXCompact(agg.totalBalance)}
            </div>
            <div style={{ fontSize: 11, color: t.textLow, marginTop: 4 }}>
              {agg.studentCount} active enrolled {isTertiary ? 'trainees' : 'students'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Differentiated Waterfall Buckets */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Functional Fees Priority Bucket */}
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.mintRing}`,
            borderRadius: 16,
            padding: '20px 22px',
            boxShadow: `0 4px 20px ${t.mintDim}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={18} style={{ color: t.mint }} />
              <span style={{ fontFamily: SORA, fontSize: 14, fontWeight: 800, color: t.textHi }}>
                1. Functional Fees (100% Priority Waterfall)
              </span>
            </div>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 6,
                background: `${t.mint}22`,
                color: t.mint,
                border: `1px solid ${t.mintRing}`,
              }}
            >
              Priority Liquidation
            </span>
          </div>
          <p style={{ fontSize: 11.5, color: t.textMid, margin: '0 0 16px 0', lineHeight: 1.4 }}>
            Includes clinical placements, exam fees, hospital rotations, uniforms, ID card, guild, and hostel/boarding accommodation.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <div style={{ background: t.fieldBg, borderRadius: 10, padding: '12px 14px', border: `1px solid ${t.stroke}` }}>
              <div style={{ fontSize: 10.5, color: t.textLow, textTransform: 'uppercase', fontWeight: 600 }}>Target Billed</div>
              <div style={{ fontSize: 16, fontWeight: 800, fontFamily: SORA, color: t.textHi, marginTop: 4 }}>
                UGX {fmtUGXCompact(agg.functionalBilled)}
              </div>
            </div>

            <div style={{ background: t.fieldBg, borderRadius: 10, padding: '12px 14px', border: `1px solid ${t.stroke}` }}>
              <div style={{ fontSize: 10.5, color: t.mint, textTransform: 'uppercase', fontWeight: 600 }}>Collected (1st)</div>
              <div style={{ fontSize: 16, fontWeight: 800, fontFamily: SORA, color: t.mint, marginTop: 4 }}>
                UGX {fmtUGXCompact(agg.functionalPaid)}
              </div>
              <div style={{ fontSize: 10.5, color: t.mint, marginTop: 2 }}>
                {agg.functionalCollectionRate.toFixed(1)}% Realized
              </div>
            </div>

            <div style={{ background: t.fieldBg, borderRadius: 10, padding: '12px 14px', border: `1px solid ${t.stroke}` }}>
              <div style={{ fontSize: 10.5, color: agg.functionalBalance > 0 ? t.red : t.mint, textTransform: 'uppercase', fontWeight: 600 }}>
                Pending Deficit
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, fontFamily: SORA, color: agg.functionalBalance > 0 ? t.red : t.mint, marginTop: 4 }}>
                UGX {fmtUGXCompact(agg.functionalBalance)}
              </div>
              <div style={{ fontSize: 10.5, color: t.textLow, marginTop: 2 }}>
                {agg.functionalClearedCount} Cleared
              </div>
            </div>
          </div>
        </div>

        {/* Base Tuition Secondary Bucket */}
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
            borderRadius: 16,
            padding: '20px 22px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <GraduationCap size={18} style={{ color: t.blue }} />
              <span style={{ fontFamily: SORA, fontSize: 14, fontWeight: 800, color: t.textHi }}>
                2. Base Tuition (Instructional & Teaching)
              </span>
            </div>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 6,
                background: `${t.blue}22`,
                color: t.blue,
                border: `1px solid ${t.blue}44`,
              }}
            >
              Residual Liquidation
            </span>
          </div>
          <p style={{ fontSize: 11.5, color: t.textMid, margin: '0 0 16px 0', lineHeight: 1.4 }}>
            Pure teaching and instructional fees credited ONLY after a student has completely satisfied their mandatory functional fees.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <div style={{ background: t.fieldBg, borderRadius: 10, padding: '12px 14px', border: `1px solid ${t.stroke}` }}>
              <div style={{ fontSize: 10.5, color: t.textLow, textTransform: 'uppercase', fontWeight: 600 }}>Target Billed</div>
              <div style={{ fontSize: 16, fontWeight: 800, fontFamily: SORA, color: t.textHi, marginTop: 4 }}>
                UGX {fmtUGXCompact(agg.baseTuitionBilled)}
              </div>
            </div>

            <div style={{ background: t.fieldBg, borderRadius: 10, padding: '12px 14px', border: `1px solid ${t.stroke}` }}>
              <div style={{ fontSize: 10.5, color: t.blue, textTransform: 'uppercase', fontWeight: 600 }}>Collected (2nd)</div>
              <div style={{ fontSize: 16, fontWeight: 800, fontFamily: SORA, color: t.blue, marginTop: 4 }}>
                UGX {fmtUGXCompact(agg.baseTuitionPaid)}
              </div>
              <div style={{ fontSize: 10.5, color: t.blue, marginTop: 2 }}>
                {agg.tuitionCollectionRate.toFixed(1)}% Realized
              </div>
            </div>

            <div style={{ background: t.fieldBg, borderRadius: 10, padding: '12px 14px', border: `1px solid ${t.stroke}` }}>
              <div style={{ fontSize: 10.5, color: agg.baseTuitionBalance > 0 ? amber : t.mint, textTransform: 'uppercase', fontWeight: 600 }}>
                Remaining Due
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, fontFamily: SORA, color: agg.baseTuitionBalance > 0 ? amber : t.mint, marginTop: 4 }}>
                UGX {fmtUGXCompact(agg.baseTuitionBalance)}
              </div>
              <div style={{ fontSize: 10.5, color: t.textLow, marginTop: 2 }}>
                {agg.fullyClearedCount} Fully Cleared
              </div>
            </div>
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
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
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
            placeholder={isTertiary ? 'Search trainee name or reg no...' : 'Search student name or adm no...'}
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

        {/* Class Filter */}
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
            <option value="all">All Programmes / Classes</option>
            {classOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Status Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Students' },
            { id: 'functional_cleared', label: 'Functional Cleared (Exam Ready)' },
            { id: 'functional_pending', label: 'Functional Incomplete' },
            { id: 'fully_cleared', label: 'Fully Paid (100%)' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setStatusFilter(item.id as any)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 11.5,
                fontWeight: statusFilter === item.id ? 700 : 500,
                border: statusFilter === item.id ? `1px solid ${t.mintRing}` : `1px solid ${t.stroke}`,
                background: statusFilter === item.id ? `${t.mint}18` : t.fieldBg,
                color: statusFilter === item.id ? t.mint : t.textMid,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Student Waterfall Table */}
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
              Student Waterfall Settlement Ledger ({filteredStudents.length})
            </span>
          </div>
          <span style={{ fontSize: 11, color: t.textLow }}>
            Payments first fill Functional Fees (100%) $\rightarrow$ remainder fills Base Tuition
          </span>
        </div>

        {filteredStudents.length === 0 ? (
          <div style={{ padding: '40px 20px' }}>
            <PosEmptyState
              icon={<Layers size={32} style={{ color: t.mint }} />}
              title="No Students Found"
              description="No student records match your selected filter criteria."
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
                  <th style={{ padding: '12px 14px' }}>Adm / Reg</th>
                  <th style={{ padding: '12px 14px' }}>{isTertiary ? 'Programme' : 'Class'}</th>
                  <th style={{ padding: '12px 14px' }}>Type</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', color: t.mint }}>Functional Billed</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', color: t.mint }}>Functional Paid (1st)</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', color: t.mint }}>Functional Due</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', color: t.blue }}>Tuition Billed</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', color: t.blue }}>Tuition Paid (2nd)</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', color: t.blue }}>Tuition Due</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800 }}>Total Balance</th>
                  <th style={{ padding: '12px 18px', textAlign: 'center' }}>Clearance Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => (
                  <tr
                    key={s.studentId}
                    style={{
                      borderBottom: `1px solid ${t.stroke}`,
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Name */}
                    <td style={{ padding: '12px 18px', fontWeight: 600, color: t.textHi }}>
                      {s.studentName}
                    </td>

                    {/* Adm No */}
                    <td style={{ padding: '12px 14px', color: t.textMid, fontFamily: SORA, fontSize: 11.5 }}>
                      {s.admissionNumber}
                    </td>

                    {/* Class */}
                    <td style={{ padding: '12px 14px', color: t.textHi }}>
                      {s.className}
                    </td>

                    {/* Boarding Type */}
                    <td style={{ padding: '12px 14px', color: t.textMid }}>
                      <span
                        style={{
                          fontSize: 10.5,
                          padding: '2px 7px',
                          borderRadius: 6,
                          background: s.boardingType === 'Boarder' ? `${purple}20` : t.fieldBg,
                          color: s.boardingType === 'Boarder' ? purple : t.textMid,
                          border: `1px solid ${s.boardingType === 'Boarder' ? purple + '40' : t.stroke}`,
                        }}
                      >
                        {s.boardingType}
                      </span>
                    </td>

                    {/* Functional Billed */}
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: SORA, color: t.textMid }}>
                      UGX {fmtUGX(s.functionalBilled)}
                    </td>

                    {/* Functional Paid (100% first) */}
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: SORA, fontWeight: 700, color: t.mint }}>
                      UGX {fmtUGX(s.functionalPaid)}
                    </td>

                    {/* Functional Due */}
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: SORA, fontWeight: 700, color: s.functionalBalance > 0 ? t.red : t.mint }}>
                      UGX {fmtUGX(s.functionalBalance)}
                    </td>

                    {/* Base Tuition Billed */}
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: SORA, color: t.textMid }}>
                      UGX {fmtUGX(s.baseTuitionBilled)}
                    </td>

                    {/* Base Tuition Paid (residual) */}
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: SORA, fontWeight: 700, color: t.blue }}>
                      UGX {fmtUGX(s.baseTuitionPaid)}
                    </td>

                    {/* Base Tuition Due */}
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: SORA, fontWeight: 700, color: s.baseTuitionBalance > 0 ? amber : t.mint }}>
                      UGX {fmtUGX(s.baseTuitionBalance)}
                    </td>

                    {/* Total Balance */}
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: SORA, fontWeight: 800, color: s.totalBalance > 0 ? t.textHi : t.mint }}>
                      UGX {fmtUGX(s.totalBalance)}
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                      {s.isFullyCleared ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 9px',
                            borderRadius: 12,
                            fontSize: 10.5,
                            fontWeight: 700,
                            background: `${t.mint}20`,
                            color: t.mint,
                            border: `1px solid ${t.mint}40`,
                          }}
                        >
                          <CheckCircle2 size={12} />
                          Fully Cleared (100%)
                        </span>
                      ) : s.isFunctionalCleared ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 9px',
                            borderRadius: 12,
                            fontSize: 10.5,
                            fontWeight: 700,
                            background: `${t.blue}20`,
                            color: t.blue,
                            border: `1px solid ${t.blue}40`,
                          }}
                          title="Functional fees 100% paid. Cleared for national examination and clinical placement."
                        >
                          <ShieldCheck size={12} />
                          Functional Cleared (Exam Ready)
                        </span>
                      ) : s.functionalPaid > 0 ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 9px',
                            borderRadius: 12,
                            fontSize: 10.5,
                            fontWeight: 700,
                            background: `${amber}20`,
                            color: amber,
                            border: `1px solid ${amber}40`,
                          }}
                        >
                          <Clock size={12} />
                          Functional Incomplete
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 9px',
                            borderRadius: 12,
                            fontSize: 10.5,
                            fontWeight: 700,
                            background: `${t.red}20`,
                            color: t.red,
                            border: `1px solid ${t.red}40`,
                          }}
                        >
                          <AlertCircle size={12} />
                          Zero Paid
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
