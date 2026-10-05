import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import {
  Search,
  Filter,
  Download,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  MessageSquare,
  Plus,
  RefreshCw,
  ChevronRight,
  X,
  CreditCard,
  User,
  Phone,
  FileText,
  DollarSign,
  ArrowUpRight,
  History,
  Send,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';
import { registerApiUrl } from '../../lib/registerApiOrigin';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { fetchDebtors, OUTSTANDING_QUERY_KEY, type OutstandingRow } from './api/outstanding';
import { exportToPdf, exportToExcel } from '../../lib/exportUtils';
import { schoolCalendarTodayIso } from '../../lib/schoolCalendarDate';
import { useSchoolName } from '../../lib/useSchoolName';
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

type OutletContext = {
  openRecordPayment?: (initialStudentId?: string, studentMeta?: { name?: string; current_class?: string }) => void;
};

const BUCKET_NAMES = [
  'Current (0–30 days)',
  '31–60 days overdue',
  '61–90 days overdue',
  '90+ days (Critical)',
];

const BUCKET_SHORT = ['0–30 d', '31–60 d', '61–90 d', '90+ d'];

export default function AccountantOutstandingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const outletCtx = useOutletContext<OutletContext | undefined>();
  const openRecordPayment = outletCtx?.openRecordPayment;

  const schoolId = useAuthStore((s) => s.schoolId);
  const schoolName = useSchoolName();
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t = getTokens(isDark);

  const { isTertiary, labels } = useAcademicPeriod();

  const studentParam = searchParams.get('student');
  const qParam = searchParams.get('q');

  const [q, setQ] = useState(qParam || '');
  const [classFilter, setClassFilter] = useState('all');
  const [selectedBucket, setSelectedBucket] = useState<number>(-1); // -1 = all
  const [riskFilter, setRiskFilter] = useState<'all' | 'critical' | 'current'>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(studentParam || null);
  const [whatsappCopied, setWhatsappCopied] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [smsSendSuccess, setSmsSendSuccess] = useState<string | null>(null);
  const [smsSendError, setSmsSendError] = useState<string | null>(null);

  useEffect(() => {
    if (studentParam) {
      setSelectedStudentId(studentParam);
    }
  }, [studentParam]);

  useEffect(() => {
    if (qParam && !q) {
      setQ(qParam);
    }
  }, [qParam]);

  // Fetch real debtor data from Supabase
  const {
    data: rows = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: [...OUTSTANDING_QUERY_KEY, schoolId],
    queryFn: () => fetchDebtors(schoolId!),
    enabled: !!schoolId,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  // Real-time synchronization: automatically refetch debtors whenever a fee payment or finance event occurs
  useEffect(() => {
    const handleSync = () => {
      void refetch();
    };
    window.addEventListener('pweza:payment-recorded', handleSync);
    window.addEventListener('pweza:expense-updated', handleSync);
    window.addEventListener('pweza:finance-mutated', handleSync);
    return () => {
      window.removeEventListener('pweza:payment-recorded', handleSync);
      window.removeEventListener('pweza:expense-updated', handleSync);
      window.removeEventListener('pweza:finance-mutated', handleSync);
    };
  }, [refetch]);

  const todayIso = schoolCalendarTodayIso();

  // Distinct classes / programmes
  const classes = useMemo(() => {
    const seen = new Set<string>();
    rows.forEach((r) => {
      if (r.current_class && r.current_class !== '—') seen.add(r.current_class);
    });
    return Array.from(seen).sort();
  }, [rows]);

  // Bucket classification helper
  const getBucketIndex = (days: number): number => {
    if (days <= 30) return 0;
    if (days <= 60) return 1;
    if (days <= 90) return 2;
    return 3;
  };

  // Aggregated totals & Ageing Buckets
  const totals = useMemo(() => {
    let totalOwing = 0;
    let over30Owing = 0;
    let criticalOwing = 0;
    const bSums = [0, 0, 0, 0];
    const bCounts = [0, 0, 0, 0];

    for (const r of rows) {
      const bal = Number(r.balance || 0);
      totalOwing += bal;
      const bIdx = getBucketIndex(r.days_overdue);
      bSums[bIdx] += bal;
      bCounts[bIdx] += 1;

      if (r.days_overdue > 30) over30Owing += bal;
      if (r.days_overdue > 90) criticalOwing += bal;
    }

    const avgDebt = rows.length > 0 ? Math.round(totalOwing / rows.length) : 0;

    return {
      totalOwing,
      over30Owing,
      criticalOwing,
      bSums,
      bCounts,
      avgDebt,
      count: rows.length,
    };
  }, [rows]);

  // Color tokens for ageing
  const bucketColor = (idx: number) => {
    if (idx === 0) return t.mint;
    if (idx === 1) return t.blue;
    if (idx === 2) return t.warn;
    return t.red;
  };

  const bucketInk = (idx: number) => {
    if (idx === 0) return t.mintInk;
    if (idx === 1) return t.blue;
    if (idx === 2) return t.warn;
    return t.red;
  };

  // Filtered rows
  const filtered = useMemo(() => {
    let list = rows;
    if (classFilter !== 'all') {
      list = list.filter((r) => r.current_class === classFilter);
    }
    if (selectedBucket >= 0) {
      list = list.filter((r) => getBucketIndex(r.days_overdue) === selectedBucket);
    }
    if (riskFilter === 'critical') {
      list = list.filter((r) => r.days_overdue > 60);
    } else if (riskFilter === 'current') {
      list = list.filter((r) => r.days_overdue <= 30);
    }

    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(
        (r) =>
          r.student_name.toLowerCase().includes(s) ||
          r.current_class.toLowerCase().includes(s) ||
          r.term_label.toLowerCase().includes(s) ||
          (r.invoice_number && r.invoice_number.toLowerCase().includes(s)) ||
          (r.parent_name && r.parent_name.toLowerCase().includes(s)) ||
          (r.parent_phone && r.parent_phone.includes(s))
      );
    }
    return list;
  }, [rows, classFilter, selectedBucket, riskFilter, q]);

  // Selected debtor for drawer
  const selectedDebtor = useMemo(() => {
    if (!selectedStudentId) return null;
    return rows.find((r) => r.student_id === selectedStudentId) ?? null;
  }, [rows, selectedStudentId]);

  // If the student has zero overdue balance (e.g. fully paid or cleared), fetch their student info
  // so the balance profile drawer can still show their clearance status and billing breakdown.
  const { data: standaloneDebtor } = useQuery({
    queryKey: ['accountant-student-single-balance', schoolId, selectedStudentId],
    queryFn: async () => {
      if (!schoolId || !selectedStudentId) return null;
      const [stRes, balRes, parentRes] = await Promise.all([
        supabase
          .from('students')
          .select('student_id, name, current_class, guardian_name, guardian_phone, student_phone')
          .eq('school_id', schoolId)
          .eq('student_id', selectedStudentId)
          .maybeSingle(),
        supabase
          .from('student_balances')
          .select('term_id, total_fees, total_paid, balance')
          .eq('school_id', schoolId)
          .eq('student_id', selectedStudentId),
        supabase
          .from('parents')
          .select('name, phone')
          .eq('school_id', schoolId)
          .eq('student_id', selectedStudentId)
          .maybeSingle(),
      ]);

      const st = stRes.data;
      if (!st) return null;

      let totalFees = 0;
      let totalPaid = 0;
      let balance = 0;
      (balRes.data || []).forEach((b: any) => {
        totalFees += Number(b.total_fees || 0);
        totalPaid += Number(b.total_paid || 0);
        balance += Math.max(0, Number(b.balance || 0));
      });

      return {
        student_id: st.student_id,
        term_id: '',
        term_label: 'Current Academic Term',
        student_name: st.name,
        current_class: st.current_class || '—',
        amount_paid: totalPaid,
        balance,
        total_fees: totalFees,
        invoice_number: null,
        term_end_date: null,
        days_overdue: 0,
        parent_name: parentRes.data?.name ?? st.guardian_name ?? null,
        parent_phone: parentRes.data?.phone ?? st.guardian_phone ?? st.student_phone ?? null,
        guardian_phone: st.guardian_phone ?? null,
        student_phone: st.student_phone ?? null,
        terms: [],
      } as OutstandingRow;
    },
    enabled: Boolean(schoolId && selectedStudentId && !rows.some((r) => r.student_id === selectedStudentId)),
  });

  const activeDebtor = selectedDebtor || standaloneDebtor || null;

  // Auto-sync phone input when debtor drawer opens
  useEffect(() => {
    if (activeDebtor) {
      setPhoneInput(activeDebtor.parent_phone || activeDebtor.guardian_phone || activeDebtor.student_phone || '');
      setSmsSendSuccess(null);
      setSmsSendError(null);
    }
  }, [activeDebtor?.student_id, activeDebtor?.parent_phone, activeDebtor?.guardian_phone, activeDebtor?.student_phone]);

  const handleCloseDrawer = () => {
    setSelectedStudentId(null);
    if (searchParams.has('student') || searchParams.has('q')) {
      const next = new URLSearchParams(searchParams);
      next.delete('student');
      next.delete('q');
      setSearchParams(next, { replace: true });
    }
  };

  // Export handlers
  const doExportPdf = () => {
    exportToPdf({
      title: isTertiary ? 'Outstanding Fees & Student Debtors' : `${labels.periodFees} Outstanding & Debtors`,
      subtitle: `As of ${todayIso} · ${schoolName}${classFilter !== 'all' ? ` · Class: ${classFilter}` : ''}`,
      schoolName,
      columns: [
        { header: isTertiary ? 'Student / Trainee' : 'Student', key: 'student_name', width: 36 },
        { header: isTertiary ? 'Programme' : 'Class', key: 'current_class', width: 18 },
        { header: isTertiary ? 'Semester' : 'Term', key: 'term_label', width: 26 },
        { header: 'Expected (UGX)', key: 'total_fees', width: 20, align: 'right', format: (v) => fmtUGX(Number(v || 0)) },
        { header: 'Paid (UGX)', key: 'amount_paid', width: 20, align: 'right', format: (v) => fmtUGX(Number(v || 0)) },
        { header: 'Balance (UGX)', key: 'balance', width: 20, align: 'right', format: (v) => fmtUGX(Number(v || 0)) },
        { header: 'Overdue', key: 'days_overdue', width: 16, align: 'right', format: (v) => Number(v) > 0 ? `${v} days` : 'Current' },
      ],
      rows: filtered as unknown as Record<string, unknown>[],
      filename: `debtors-report-${todayIso}`,
      totalsRow: ['TOTAL', '', '', '', '', fmtUGX(filtered.reduce((s, r) => s + r.balance, 0)) + ' UGX', ''],
    });
  };

  const doExportExcel = () => {
    exportToExcel({
      title: isTertiary ? 'Outstanding Fees & Student Debtors' : `${labels.periodFees} Outstanding & Debtors`,
      schoolName,
      columns: [
        { header: isTertiary ? 'Student / Trainee' : 'Student', key: 'student_name' },
        { header: isTertiary ? 'Programme' : 'Class', key: 'current_class' },
        { header: isTertiary ? 'Semester' : 'Term', key: 'term_label' },
        { header: 'Invoice Number', key: 'invoice_number' },
        { header: 'Expected Fees', key: 'total_fees', format: (v) => String(Number(v || 0)) },
        { header: 'Amount Paid', key: 'amount_paid', format: (v) => String(Number(v || 0)) },
        { header: 'Outstanding Balance', key: 'balance', format: (v) => String(Number(v || 0)) },
        { header: 'Days Overdue', key: 'days_overdue', format: (v) => String(Number(v || 0)) },
        { header: 'Parent Name', key: 'parent_name' },
        { header: 'Parent Phone', key: 'parent_phone' },
      ],
      rows: filtered as unknown as Record<string, unknown>[],
      filename: `debtors-report-${todayIso}`,
    });
  };

  const handlePayClick = (studentId: string, studentMeta?: { name?: string; current_class?: string }) => {
    if (openRecordPayment) {
      openRecordPayment(studentId, studentMeta);
    } else {
      navigate(`/dashboard/accountant/payments?student=${studentId}`);
    }
  };

  // Phone normalizer for Uganda numbers
  const normalizeUgandaPhone = (raw: string): string => {
    let clean = raw.replace(/\D/g, '');
    if (clean.startsWith('256') && clean.length >= 12) return clean;
    if (clean.startsWith('0') && clean.length === 10) return '256' + clean.slice(1);
    if (clean.length === 9) return '256' + clean;
    return clean;
  };

  const buildReminderMessage = (debtor: OutstandingRow): string => {
    const student = debtor.student_name;
    const balance = fmtUGX(debtor.balance);
    const period = debtor.term_label;
    let breakdownText = '';
    if (debtor.terms && debtor.terms.length > 1) {
      breakdownText = '\nDetailed breakdown:\n' + debtor.terms.map((t) => `• ${t.term_label}: UGX ${fmtUGX(t.balance)}`).join('\n') + '\n';
    }

    return (
      `Dear Parent/Guardian of ${student},\n\n` +
      `This is a gentle reminder from ${schoolName} regarding the outstanding school fees balance of UGX ${balance} for ${period}.${breakdownText}\n\n` +
      `Kindly arrange payment at your earliest convenience to ensure uninterrupted learning. Thank you for your continued support.\n\n` +
      `Bursar / Accounts Office\n${schoolName}`
    );
  };

  // WhatsApp reminder generator
  const handleSendWhatsApp = (debtor: OutstandingRow, targetPhone?: string) => {
    const rawPhone = (targetPhone || phoneInput || debtor.parent_phone || debtor.guardian_phone || debtor.student_phone || '').trim();
    const cleanPhone = normalizeUgandaPhone(rawPhone);
    const text = buildReminderMessage(debtor);
    const message = encodeURIComponent(text);

    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
    } else {
      // Copy text to clipboard if phone not configured
      void navigator.clipboard.writeText(text);
      setWhatsappCopied(true);
      setTimeout(() => setWhatsappCopied(false), 3000);
    }
  };

  // Direct SMS reminder dispatch via EgoSMS
  const handleSendSms = async (debtor: OutstandingRow, targetPhone?: string) => {
    const rawPhone = (targetPhone || phoneInput || debtor.parent_phone || debtor.guardian_phone || debtor.student_phone || '').trim();
    const cleanPhone = normalizeUgandaPhone(rawPhone);
    if (!cleanPhone) {
      setSmsSendError('Please enter a mobile phone number to send the SMS reminder.');
      setTimeout(() => setSmsSendError(null), 5000);
      return;
    }

    const student = debtor.student_name;
    const balance = fmtUGX(debtor.balance);
    const period = debtor.term_label;
    const smsText = `Dear Parent/Guardian, reminder from ${schoolName}: ${student} has an outstanding fees balance of UGX ${balance} (${period}). Kindly clear promptly to avoid inconvenience. Thank you.`;

    setIsSendingSms(true);
    setSmsSendError(null);
    setSmsSendSuccess(null);

    try {
      const res = await fetch(registerApiUrl('/api/notifications/send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: `+${cleanPhone}`,
          message: smsText,
          channel: 'sms',
          school_id: schoolId,
          recipient_name: student,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        setSmsSendSuccess(`SMS sent successfully to +${cleanPhone}`);
        setTimeout(() => setSmsSendSuccess(null), 6000);
      } else {
        setSmsSendError(data.error || 'Failed to send SMS reminder.');
        setTimeout(() => setSmsSendError(null), 6000);
      }
    } catch (err: any) {
      setSmsSendError(err?.message || 'Network error sending SMS.');
      setTimeout(() => setSmsSendError(null), 6000);
    } finally {
      setIsSendingSms(false);
    }
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
            Outstanding Fees & Debtors
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
            <span>{isTertiary ? 'Semester' : 'Term'} Ageing & Accounts Receivable</span>
            <span>·</span>
            <span style={{ color: t.mintInk, fontWeight: 600 }}>
              {totals.count} {isTertiary ? 'trainees' : 'students'} with balance
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Refresh button */}
          <button
            onClick={() => refetch()}
            title="Refresh Debtors Ledger"
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
            onClick={() => handlePayClick('')}
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

      {/* ── TOP SECTION: TOTAL OUTSTANDING + AGEING BREAKDOWN ─────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2.1fr',
          gap: 14,
          marginBottom: 16,
        }}
      >
        {/* Left: Total Outstanding Hero Card */}
        <div
          style={{
            background: cardGrad(t),
            border: `1px solid ${t.strokeHi}`,
            borderRadius: 18,
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            boxShadow: isDark ? '0 0 24px rgba(248,113,113,0.12)' : '0 4px 14px rgba(248,113,113,0.06)',
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: '1.4px',
              textTransform: 'uppercase',
              color: t.textLow,
              marginBottom: 8,
              fontWeight: 700,
            }}
          >
            TOTAL OUTSTANDING DEBT
          </div>
          <div
            style={{
              fontFamily: SORA,
              fontSize: 30,
              fontWeight: 800,
              color: t.red,
              letterSpacing: '-1px',
              lineHeight: 1.1,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: t.textLow, marginRight: 6 }}>UGX</span>
            {isLoading ? '—' : fmtUGX(totals.totalOwing)}
          </div>
          <div
            style={{
              fontSize: 12,
              color: t.textLow,
              marginTop: 10,
              display: 'flex',
              gap: 14,
              flexWrap: 'wrap',
            }}
          >
            <span>
              <strong style={{ color: t.textHi, fontWeight: 600 }}>{totals.count}</strong> {isTertiary ? 'trainees' : 'students'}
            </span>
            <span>·</span>
            <span>
              <strong style={{ color: t.red, fontWeight: 600 }}>UGX {fmtUGXCompact(totals.over30Owing)}</strong> over 30 days
            </span>
          </div>
        </div>

        {/* Right: Ageing Breakdown Matrix Box */}
        <div
          style={{
            background: cardGrad(t),
            border: `1px solid ${t.stroke}`,
            borderRadius: 18,
            padding: '18px 20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: SORA, fontSize: 13.5, fontWeight: 700, color: t.textHi }}>
                Receivables Ageing Matrix
              </span>
              <span style={{ fontSize: 11, color: t.textLow }}>
                (Days overdue past {isTertiary ? 'semester' : 'term'} end)
              </span>
            </div>
            {selectedBucket >= 0 && (
              <button
                onClick={() => setSelectedBucket(-1)}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: t.mintInk,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Reset Filter <X className="h-3 w-3" />
                </span>
              </button>
            )}
          </div>

          {/* Ageing Bar */}
          <div
            style={{
              display: 'flex',
              height: 12,
              borderRadius: 6,
              overflow: 'hidden',
              gap: 3,
              marginBottom: 12,
              background: t.track,
            }}
          >
            {totals.bSums.map((v, i) => {
              const pct = totals.totalOwing > 0 ? (v / totals.totalOwing) * 100 : 0;
              if (pct <= 0) return null;
              return (
                <div
                  key={i}
                  onClick={() => setSelectedBucket(selectedBucket === i ? -1 : i)}
                  title={`${BUCKET_NAMES[i]}: UGX ${fmtUGX(v)}`}
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: bucketColor(i),
                    cursor: 'pointer',
                    transition: 'opacity 0.15s ease',
                    opacity: selectedBucket === -1 || selectedBucket === i ? 1 : 0.4,
                  }}
                />
              );
            })}
          </div>

          {/* 4 Interactive Ageing Bucket Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {totals.bSums.map((v, i) => {
              const active = selectedBucket === i;
              return (
                <div
                  key={i}
                  onClick={() => setSelectedBucket(active ? -1 : i)}
                  style={{
                    padding: '9px 11px',
                    borderRadius: 12,
                    background: active ? (isDark ? 'rgba(61,232,160,0.08)' : '#F0FDF4') : t.fieldBg,
                    border: `1px solid ${active ? t.mintRing : t.stroke}`,
                    boxShadow: active ? `0 0 0 1px ${t.mintRing}` : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 9.5,
                      color: t.textLow,
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 2,
                        background: bucketColor(i),
                        flexShrink: 0,
                      }}
                    />
                    {BUCKET_SHORT[i]}
                  </div>
                  <div
                    style={{
                      fontFamily: SORA,
                      fontSize: 13,
                      fontWeight: 700,
                      color: bucketInk(i),
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {fmtUGX(v)}
                  </div>
                  <div style={{ fontSize: 10, color: t.textLow, marginTop: 2 }}>
                    {totals.bCounts[i]} {totals.bCounts[i] === 1 ? 'account' : 'accounts'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 4 KPI METRIC STRIP ─────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div style={{ background: cardGrad(t), border: `1px solid ${t.stroke}`, borderRadius: 14, padding: '14px 16px' }}>
          <div style={{ fontSize: 9.5, letterSpacing: '1.2px', textTransform: 'uppercase', color: t.textLow, fontWeight: 700, marginBottom: 4 }}>
            OVERDUE DEBT (60+ DAYS)
          </div>
          <div style={{ fontFamily: SORA, fontSize: 19, fontWeight: 800, color: t.red }}>
            <span style={{ fontSize: 11, color: t.textLow, marginRight: 4 }}>UGX</span>
            {fmtUGX(totals.bSums[2] + totals.bSums[3])}
          </div>
          <div style={{ fontSize: 11, color: t.textLow, marginTop: 3 }}>
            {totals.bCounts[2] + totals.bCounts[3]} high-risk accounts
          </div>
        </div>

        <div style={{ background: cardGrad(t), border: `1px solid ${t.stroke}`, borderRadius: 14, padding: '14px 16px' }}>
          <div style={{ fontSize: 9.5, letterSpacing: '1.2px', textTransform: 'uppercase', color: t.textLow, fontWeight: 700, marginBottom: 4 }}>
            CURRENT PERIOD DEBT (0-30D)
          </div>
          <div style={{ fontFamily: SORA, fontSize: 19, fontWeight: 800, color: t.mintInk }}>
            <span style={{ fontSize: 11, color: t.textLow, marginRight: 4 }}>UGX</span>
            {fmtUGX(totals.bSums[0])}
          </div>
          <div style={{ fontSize: 11, color: t.textLow, marginTop: 3 }}>
            {totals.bCounts[0]} healthy current accounts
          </div>
        </div>

        <div style={{ background: cardGrad(t), border: `1px solid ${t.stroke}`, borderRadius: 14, padding: '14px 16px' }}>
          <div style={{ fontSize: 9.5, letterSpacing: '1.2px', textTransform: 'uppercase', color: t.textLow, fontWeight: 700, marginBottom: 4 }}>
            AVERAGE DEBTOR BALANCE
          </div>
          <div style={{ fontFamily: SORA, fontSize: 19, fontWeight: 800, color: t.textHi }}>
            <span style={{ fontSize: 11, color: t.textLow, marginRight: 4 }}>UGX</span>
            {fmtUGX(totals.avgDebt)}
          </div>
          <div style={{ fontSize: 11, color: t.textLow, marginTop: 3 }}>
            per student with balance
          </div>
        </div>

        <div style={{ background: cardGrad(t), border: `1px solid ${t.stroke}`, borderRadius: 14, padding: '14px 16px' }}>
          <div style={{ fontSize: 9.5, letterSpacing: '1.2px', textTransform: 'uppercase', color: t.textLow, fontWeight: 700, marginBottom: 4 }}>
            COLLECTION RECOVERY
          </div>
          <div style={{ fontFamily: SORA, fontSize: 19, fontWeight: 800, color: t.gold }}>
            Active
          </div>
          <div style={{ fontSize: 11, color: t.textLow, marginTop: 3 }}>
            Auto WhatsApp reminders enabled
          </div>
        </div>
      </div>

      {/* ── FILTER & SEARCH BAR ────────────────────────────────────────────── */}
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
            placeholder={`Search by ${isTertiary ? 'trainee' : 'student'}, parent phone, invoice...`}
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

        {/* Middle: Class Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: t.textLow }}>
            {isTertiary ? 'Programme:' : 'Class:'}
          </span>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
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
            <option value="all">All {isTertiary ? 'Programmes' : 'Classes'}</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Right: Risk Filter Pills */}
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
              { id: 'all', label: 'All Debtors' },
              { id: 'critical', label: 'High Risk (>60d)' },
              { id: 'current', label: 'Current (0-30d)' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setRiskFilter(item.id)}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                border: 'none',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                background: riskFilter === item.id ? t.mintDim : 'transparent',
                color: riskFilter === item.id ? t.mintInk : t.textMid,
                transition: 'all 0.15s',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT: DEBTOR TABLE & DETAIL DRAWER ─────────────────────── */}
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
          <div>Loading student balances and receivables...</div>
        </div>
      ) : rows.length === 0 ? (
        <PosEmptyState
          icon={<CheckCircle2 size={36} color={t.mintInk} />}
          title="No outstanding fees"
          description={`Every ${isTertiary ? 'trainee' : 'student'} has settled their account balance. Balances appear here the moment invoices are issued or fees are recorded.`}
          accentColor="mint"
          action={{
            label: 'Record Fee Payment',
            onClick: () => handlePayClick(''),
            icon: <Plus size={16} />,
          }}
        />
      ) : filtered.length === 0 && !activeDebtor ? (
        <PosEmptyState
          icon={<Search size={36} color={t.blue} />}
          title="No debtors match this filter"
          description={`Try resetting your search query or choosing a different ${isTertiary ? 'programme' : 'class'} or ageing bucket.`}
          accentColor="blue"
          action={{
            label: 'Clear Filters',
            onClick: () => {
              setQ('');
              setClassFilter('all');
              setSelectedBucket(-1);
              setRiskFilter('all');
            },
          }}
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: activeDebtor ? '1fr 380px' : '1fr',
            gap: 16,
            alignItems: 'start',
            transition: 'all 0.2s ease',
          }}
        >
          {/* Table Container */}
          <div
            style={{
              background: t.panel,
              border: `1px solid ${t.stroke}`,
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            {filtered.length === 0 && activeDebtor ? (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <CheckCircle2 size={40} color={t.mintInk} style={{ margin: '0 auto 12px' }} />
                <div style={{ fontFamily: SORA, fontSize: 16, fontWeight: 700, color: t.textHi }}>
                  {activeDebtor.student_name} has no overdue balance
                </div>
                <div style={{ fontSize: 13, color: t.textMid, marginTop: 4 }}>
                  All fees are up to date for this student. See their detailed balance profile on the right panel.
                </div>
              </div>
            ) : (
              <>
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
                      {isTertiary ? 'STUDENT / TRAINEE' : 'STUDENT'}
                    </th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase' }}>
                      {isTertiary ? 'PROGRAMME' : 'CLASS'}
                    </th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase' }}>
                      {isTertiary ? 'SEMESTER' : 'TERM'}
                    </th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'right' }}>
                      EXPECTED
                    </th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'right' }}>
                      PAID
                    </th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'right' }}>
                      BALANCE DUE
                    </th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'center' }}>
                      AGEING
                    </th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'right' }}>
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const isSelected = selectedStudentId === r.student_id;
                    const bIdx = getBucketIndex(r.days_overdue);
                    const riskBg =
                      bIdx === 0
                        ? t.mintDim
                        : bIdx === 1
                        ? t.blueDim
                        : bIdx === 2
                        ? t.warnDim
                        : t.redDim;
                    const riskColor =
                      bIdx === 0
                        ? t.mintInk
                        : bIdx === 1
                        ? t.blue
                        : bIdx === 2
                        ? t.warn
                        : t.red;
                    const riskLabel =
                      bIdx === 0
                        ? 'Current'
                        : `${r.days_overdue}d Overdue`;

                    return (
                      <tr
                        key={`${r.student_id}-${r.term_id}`}
                        onClick={() => setSelectedStudentId(r.student_id)}
                        style={{
                          borderBottom: `1px solid ${t.divider}`,
                          background: isSelected
                            ? isDark
                              ? 'rgba(61,232,160,0.06)'
                              : '#F0FDF4'
                            : 'transparent',
                          cursor: 'pointer',
                          transition: 'background 0.12s',
                        }}
                      >
                        {/* Student Name */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600, color: t.textHi }}>{r.student_name}</div>
                          {r.invoice_number && (
                            <div style={{ fontSize: 11, color: t.textLow, marginTop: 2 }}>
                              Invoice #{r.invoice_number}
                            </div>
                          )}
                        </td>

                        {/* Class */}
                        <td style={{ padding: '12px 14px', color: t.textMid }}>
                          {r.current_class}
                        </td>

                        {/* Academic Period (Semester vs Term) */}
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

                        {/* Expected */}
                        <td style={{ padding: '12px 14px', textAlign: 'right', color: t.textMid, fontVariantNumeric: 'tabular-nums' }}>
                          {fmtUGX(r.total_fees)}
                        </td>

                        {/* Paid */}
                        <td style={{ padding: '12px 14px', textAlign: 'right', color: t.mintInk, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                          {fmtUGX(r.amount_paid)}
                        </td>

                        {/* Balance Due */}
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          <span
                            style={{
                              fontFamily: SORA,
                              fontWeight: 700,
                              color: t.red,
                              fontSize: 13,
                            }}
                          >
                            {fmtUGX(r.balance)}
                          </span>
                        </td>

                        {/* Ageing Risk Chip */}
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '3px 8px',
                              borderRadius: 6,
                              background: riskBg,
                              color: riskColor,
                              fontWeight: 700,
                              fontSize: 11,
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: riskColor }} />
                            {riskLabel}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePayClick(r.student_id);
                              }}
                              style={{
                                padding: '5px 10px',
                                borderRadius: 6,
                                fontSize: 11.5,
                                fontWeight: 700,
                                background: t.mintDim,
                                color: t.mintInk,
                                border: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              Pay
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSendWhatsApp(r);
                              }}
                              title="Send WhatsApp Reminder"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                background: t.fieldBg,
                                border: `1px solid ${t.stroke}`,
                                color: t.textMid,
                                cursor: 'pointer',
                              }}
                            >
                              <MessageSquare size={13} color="#22c55e" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/dashboard/accountant/student-ledger?student=${r.student_id}`);
                              }}
                              title="View all-time payment ledger and statement for this student"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                background: t.fieldBg,
                                border: `1px solid ${t.stroke}`,
                                color: t.blue,
                                cursor: 'pointer',
                              }}
                            >
                              <History size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer Summary */}
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
                Showing <b>{filtered.length}</b> of <b>{rows.length}</b> debtor accounts
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <span>
                  Filtered Balance: <b style={{ color: t.red, fontFamily: SORA }}>UGX {fmtUGX(filtered.reduce((s, r) => s + r.balance, 0))}</b>
                </span>
              </div>
            </div>
          </>
        )}
      </div>

          {/* ── DEBTOR DETAIL SLIDE-OVER DRAWER (RIGHT PANEL) ──────────────── */}
          {activeDebtor && (
            <div
              style={{
                background: cardGrad(t),
                border: `1px solid ${t.strokeHi}`,
                borderRadius: 16,
                padding: '20px 22px',
                position: 'sticky',
                top: 24,
                boxShadow: isDark ? '0 12px 36px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.06)',
              }}
            >
              {/* Drawer Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                  paddingBottom: 14,
                  borderBottom: `1px solid ${t.divider}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: t.mintDim,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: t.mintInk,
                    }}
                  >
                    <User size={18} />
                  </div>
                  <div>
                    <div style={{ fontFamily: SORA, fontSize: 14, fontWeight: 700, color: t.textHi }}>
                      Student Balance Dossier
                    </div>
                    <div style={{ fontSize: 11, color: t.textLow }}>
                      {isTertiary ? 'Semester' : 'Term'} fee breakdown & profile
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCloseDrawer}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    border: `1px solid ${t.stroke}`,
                    background: t.panel,
                    color: t.textLow,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title="Close student dossier"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Student Identification */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontFamily: SORA, fontSize: 17, fontWeight: 800, color: t.textHi }}>
                  {activeDebtor.student_name}
                </div>
                <div style={{ fontSize: 12, color: t.textMid, marginTop: 3 }}>
                  {activeDebtor.current_class} · {activeDebtor.term_label}
                </div>
              </div>

              {/* Outstanding Balance Banner */}
              {activeDebtor.balance > 0 ? (
                <div
                  style={{
                    background: isDark ? 'rgba(248,113,113,0.10)' : '#FEF2F2',
                    border: `1px solid ${t.redDim}`,
                    borderRadius: 12,
                    padding: '14px 16px',
                    marginBottom: 18,
                  }}
                >
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: t.red, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    AMOUNT STILL OWING
                  </div>
                  <div
                    style={{
                      fontFamily: SORA,
                      fontSize: 24,
                      fontWeight: 800,
                      color: t.red,
                      marginTop: 4,
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 600, color: t.textLow, marginRight: 5 }}>UGX</span>
                    {fmtUGX(activeDebtor.balance)}
                  </div>
                  <div style={{ fontSize: 11, color: t.textLow, marginTop: 4 }}>
                    {activeDebtor.days_overdue > 0 ? `${activeDebtor.days_overdue} days past due` : 'Current period'}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: isDark ? 'rgba(16,185,129,0.10)' : '#F0FDF4',
                    border: `1px solid ${t.mintDim}`,
                    borderRadius: 12,
                    padding: '14px 16px',
                    marginBottom: 18,
                  }}
                >
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: t.mintInk, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    FINANCIAL CLEARANCE STATUS
                  </div>
                  <div
                    style={{
                      fontFamily: SORA,
                      fontSize: 22,
                      fontWeight: 800,
                      color: t.mintInk,
                      marginTop: 4,
                    }}
                  >
                    UGX 0 · Fully Cleared
                  </div>
                  <div style={{ fontSize: 11, color: t.textMid, marginTop: 4 }}>
                    This student has no outstanding fees or unpaid invoices.
                  </div>
                </div>
              )}

              {/* Ledger Summary Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: t.fieldBg,
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: t.textLow }}>Invoiced Fees</span>
                  <span style={{ fontWeight: 600, color: t.textHi }}>UGX {fmtUGX(activeDebtor.total_fees)}</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: t.fieldBg,
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: t.textLow }}>Settled / Paid</span>
                  <span style={{ fontWeight: 600, color: t.mintInk }}>UGX {fmtUGX(activeDebtor.amount_paid)}</span>
                </div>

                {activeDebtor.invoice_number && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: 8,
                      background: t.fieldBg,
                      fontSize: 12,
                    }}
                  >
                    <span style={{ color: t.textLow }}>Invoice Ref</span>
                    <span style={{ fontWeight: 600, color: t.textHi }}>#{activeDebtor.invoice_number}</span>
                  </div>
                )}
              </div>

              {/* Semester / Term Breakdown if multi-term */}
              {activeDebtor.terms && activeDebtor.terms.length > 1 && (
                <div
                  style={{
                    background: t.fieldBg,
                    border: `1px solid ${t.stroke}`,
                    borderRadius: 12,
                    padding: '12px 14px',
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: t.textLow, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.5px' }}>
                    {isTertiary ? 'SEMESTER BREAKDOWN' : 'PERIOD BREAKDOWN'} ({activeDebtor.terms.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {activeDebtor.terms.map((tb) => (
                      <div
                        key={tb.term_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: 8,
                          background: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
                          border: `1px solid ${t.stroke}`,
                          fontSize: 12,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, color: t.textHi }}>{tb.term_label}</div>
                          {tb.invoice_number && (
                            <div style={{ fontSize: 11, color: t.textLow }}>Ref #{tb.invoice_number}</div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: SORA, fontWeight: 700, color: t.red }}>
                            UGX {fmtUGX(tb.balance)}
                          </div>
                          <div style={{ fontSize: 10, color: t.textLow }}>
                            {tb.days_overdue > 0 ? `${tb.days_overdue}d overdue` : 'Current period'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Parent & Sponsor Contact */}
              <div
                style={{
                  background: t.fieldBg,
                  border: `1px solid ${t.stroke}`,
                  borderRadius: 12,
                  padding: '12px 14px',
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color: t.textLow, textTransform: 'uppercase', marginBottom: 6 }}>
                  PARENT / SPONSOR CONTACT
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.textHi }}>
                  {activeDebtor.parent_name || 'Primary Guardian'}
                </div>
                <div style={{ marginTop: 8 }}>
                  <label style={{ fontSize: 10.5, fontWeight: 700, color: t.textLow, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                    Recipient Phone (WhatsApp / SMS)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Phone size={14} color={t.textLow} />
                    <input
                      type="text"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="e.g. 0772123456 or 25677..."
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: 7,
                        border: `1px solid ${t.stroke}`,
                        background: isDark ? 'rgba(0,0,0,0.25)' : '#ffffff',
                        color: t.textHi,
                        fontSize: 12.5,
                        fontWeight: 600,
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Send WhatsApp & SMS Reminders */}
                {activeDebtor.balance > 0 && (
                  <>
                    {smsSendSuccess && (
                      <div style={{ padding: '8px 12px', borderRadius: 8, background: t.mintDim, color: t.mintInk, fontSize: 12, fontWeight: 600 }}>
                        {smsSendSuccess}
                      </div>
                    )}
                    {smsSendError && (
                      <div style={{ padding: '8px 12px', borderRadius: 8, background: t.redDim, color: t.red, fontSize: 12, fontWeight: 600 }}>
                        {smsSendError}
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => handleSendWhatsApp(activeDebtor, phoneInput)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          padding: '10px 8px',
                          borderRadius: 9,
                          fontSize: 12.5,
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: '#22c55e',
                          color: '#ffffff',
                          border: 'none',
                          boxShadow: '0 3px 12px rgba(34,197,94,0.25)',
                        }}
                        title="Send fee reminder via WhatsApp"
                      >
                        <MessageSquare size={15} />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSendingSms}
                        onClick={() => handleSendSms(activeDebtor, phoneInput)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          padding: '10px 8px',
                          borderRadius: 9,
                          fontSize: 12.5,
                          fontWeight: 700,
                          cursor: isSendingSms ? 'not-allowed' : 'pointer',
                          background: '#2563eb',
                          color: '#ffffff',
                          border: 'none',
                          boxShadow: '0 3px 12px rgba(37,99,235,0.25)',
                          opacity: isSendingSms ? 0.7 : 1,
                        }}
                        title="Send fee reminder via SMS"
                      >
                        {isSendingSms ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                        <span>{isSendingSms ? 'Sending…' : 'Send SMS'}</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const msg = buildReminderMessage(activeDebtor);
                        void navigator.clipboard.writeText(msg);
                        setWhatsappCopied(true);
                        setTimeout(() => setWhatsappCopied(false), 3000);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '7px 10px',
                        borderRadius: 8,
                        fontSize: 11.5,
                        fontWeight: 600,
                        background: t.cardGradA,
                        color: t.textMid,
                        border: `1px solid ${t.stroke}`,
                        cursor: 'pointer',
                      }}
                    >
                      {whatsappCopied ? <Check size={13} color={t.mintInk} /> : <Copy size={13} />}
                      <span>{whatsappCopied ? 'Reminder text copied to clipboard!' : 'Copy reminder text'}</span>
                    </button>
                  </>
                )}

                {/* Record Fee Payment CTA */}
                <button
                  type="button"
                  onClick={() => handlePayClick(activeDebtor.student_id, { name: activeDebtor.student_name, current_class: activeDebtor.current_class })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '11px',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 800,
                    fontFamily: SORA,
                    cursor: 'pointer',
                    border: 'none',
                    background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
                    color: t.ctaText,
                    boxShadow: '0 4px 14px rgba(61,232,160,0.25)',
                  }}
                >
                  <Plus size={16} />
                  <span>Record Payment</span>
                </button>

                {/* All-Time Student Payment Ledger CTA */}
                <button
                  type="button"
                  onClick={() => navigate(`/dashboard/accountant/student-ledger?student=${activeDebtor.student_id}&name=${encodeURIComponent(activeDebtor.student_name)}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '10px',
                    borderRadius: 10,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: t.fieldBg,
                    color: t.blue,
                    border: `1px solid ${t.stroke}`,
                  }}
                >
                  <History size={15} />
                  <span>View All-Time Payment Ledger</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
