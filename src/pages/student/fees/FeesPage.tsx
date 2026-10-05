import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens, cardGrad, fmtUGX, SORA } from '@/styles/posThemeTokens';
import { supabase } from '@/lib/supabase';
import { RCSN_OFFICIAL_BANK_ACCOUNT, RCSN_DEFAULT_FUNCTIONAL_ITEMS } from '@/lib/rcsnBankDetails';
import { generateRcsnFeeSlipPdf } from '@/lib/rcsnFeeSlipPdf';
import {
  CreditCard,
  Download,
  Building,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
  RefreshCw,
  FileText,
  ShieldCheck,
  Receipt,
  Layers,
  ChevronDown,
  Info,
} from 'lucide-react';

interface StudentInfo {
  id: string;
  name: string;
  admission_number: string;
  current_class: string;
  intake?: string;
  residence_status?: string;
}

interface InvoiceRecord {
  id: string;
  invoice_number: string | null;
  invoice_label: string | null;
  total_amount: number;
  amount_paid: number;
  balance: number;
  status: string;
  created_at: string | null;
  semester?: string | null;
}

interface PaymentRecord {
  id: string;
  amount_paid: number;
  payment_method: string | null;
  payment_date: string | null;
  receipt_number: string | null;
  notes: string | null;
}

interface BreakdownItem {
  name: string;
  amount: number;
  isBaseTuition?: boolean;
}

export default function StudentFeesPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const schoolId = useAuthStore((s) => s.schoolId) || 'e1b10000-0000-4000-a000-000000000001';
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t = getTokens(isDark);
  const cardShadow = isDark ? '0 8px 24px rgba(0,0,0,0.35)' : '0 4px 16px rgba(0,0,0,0.06)';

  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [activeTab, setActiveTab] = useState<'breakdown' | 'invoices' | 'payments'>('breakdown');
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [feeBreakdown, setFeeBreakdown] = useState<BreakdownItem[]>([]);
  const [baseTuitionAmount, setBaseTuitionAmount] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch student data and financial history
  const loadFinancialData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const authId = user?.id;
      if (!authId) return;

      // 1. Identify Student Record
      const { data: stRow, error: stErr } = await supabase
        .from('students')
        .select('student_id, name, first_name, last_name, admission_number, current_class, intake, residence_status, boarding_status, boarding_type')
        .or(`student_id.eq.${authId},user_id.eq.${authId}`)
        .maybeSingle();

      if (stErr && !stRow) {
        console.warn('Student record fetch error:', stErr.message);
      }

      const sid = stRow?.student_id || authId;
      const resolvedName =
        stRow?.name ||
        [stRow?.first_name, stRow?.last_name].filter(Boolean).join(' ') ||
        user?.user_metadata?.name ||
        'Trainee Student';

      const rawRes = String(stRow?.residence_status || stRow?.boarding_status || stRow?.boarding_type || '').toLowerCase();
      const resolvedRes = rawRes.includes('board') || rawRes === 'resident' ? 'Resident' : 'Non-Resident';

      const stInfo: StudentInfo = {
        id: sid,
        name: resolvedName,
        admission_number: stRow?.admission_number || '—',
        current_class: stRow?.current_class || 'Diploma Nursing (Extension)',
        intake: stRow?.intake || 'March 2026',
        residence_status: resolvedRes,
      };
      setStudent(stInfo);

      // 2. Fetch Immutable Historical Invoices
      const { data: invRows } = await supabase
        .from('student_invoices')
        .select('invoice_id, invoice_number, invoice_label, total_amount, amount_paid, balance, status, created_at, school_terms(year, term)')
        .eq('school_id', schoolId)
        .eq('student_id', sid)
        .order('created_at', { ascending: false });

      const mappedInvoices: InvoiceRecord[] = (invRows || []).map((row: any) => ({
        id: row.invoice_id || Math.random().toString(),
        invoice_number: row.invoice_number || '—',
        invoice_label: row.invoice_label || 'Tuition & Functional Fees',
        total_amount: Number(row.total_amount || 0),
        amount_paid: Number(row.amount_paid || 0),
        balance: Number(row.balance || 0),
        status: String(row.status || 'unpaid').toLowerCase(),
        created_at: row.created_at,
        semester: row.school_terms
          ? `Semester ${row.school_terms.term}, ${row.school_terms.year}`
          : null,
      }));
      setInvoices(mappedInvoices);

      // 3. Fetch Verified Payment Receipts
      const { data: payRows } = await supabase
        .from('student_payments')
        .select('payment_id, amount_paid, payment_method, payment_date, receipt_number, notes')
        .eq('school_id', schoolId)
        .eq('student_id', sid)
        .order('payment_date', { ascending: false });

      const mappedPayments: PaymentRecord[] = (payRows || []).map((p: any) => ({
        id: p.payment_id || Math.random().toString(),
        amount_paid: Number(p.amount_paid || 0),
        payment_method: p.payment_method || 'Bank Deposit',
        payment_date: p.payment_date,
        receipt_number: p.receipt_number || 'REC-' + (p.payment_id || '').slice(0, 6).toUpperCase(),
        notes: p.notes,
      }));
      setPayments(mappedPayments);

      // 4. Fetch Fee Structure Breakdown (Tuition + Functional Fees)
      const { data: feeRows } = await supabase
        .from('school_fee_structure')
        .select('class_name, tuition_amount, boarding_tuition_amount')
        .eq('school_id', schoolId);

      const items: BreakdownItem[] = [];
      let base = 0;

      const itemRows = (feeRows || []).filter((r: any) =>
        String(r.class_name || '').startsWith('ITEM:')
      );

      if (itemRows.length > 0) {
        // Match cohort code (e.g. DN, CN, DM, CM)
        const currentUpper = stInfo.current_class.toUpperCase();
        const codeMatched = itemRows.filter((r: any) => {
          const parts = r.class_name.split(':');
          return parts[1] && currentUpper.includes(parts[1]);
        });
        const activeRows = codeMatched.length > 0 ? codeMatched : itemRows;

        activeRows.forEach((r: any) => {
          const parts = r.class_name.split(':');
          const itemName = parts.slice(3).join(':') || parts[2] || '';
          const amt = Number(r.tuition_amount || 0);

          if (itemName.toLowerCase().includes('base tuition')) {
            base = amt;
          } else if (itemName.toLowerCase().includes('hostel')) {
            if (resolvedRes === 'Resident') {
              items.push({ name: 'Hostel Accommodation', amount: amt });
            }
          } else if (itemName) {
            if (!items.some((it) => it.name === itemName)) {
              items.push({ name: itemName, amount: amt });
            }
          }
        });
      }

      // If no functional items configured yet, initialize with official circular items
      if (items.length === 0) {
        RCSN_DEFAULT_FUNCTIONAL_ITEMS.forEach((defName) => {
          items.push({ name: defName, amount: 0 });
        });
      }

      setBaseTuitionAmount(base);
      setFeeBreakdown(items);
    } catch (err: any) {
      console.error('Failed to load student fees:', err);
      setErrorMsg('Failed to load financial records. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFinancialData();
  }, [user, schoolId]);

  // Aggregate Totals
  const totalBilled = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  }, [invoices]);

  const totalPaid = useMemo(() => {
    return payments.reduce((sum, p) => sum + p.amount_paid, 0);
  }, [payments]);

  const outstandingBalance = useMemo(() => {
    return Math.max(0, totalBilled - totalPaid);
  }, [totalBilled, totalPaid]);

  const functionalFeesTotal = useMemo(() => {
    return feeBreakdown.reduce((sum, it) => sum + (it.amount || 0), 0);
  }, [feeBreakdown]);

  const grandSemesterTotal = useMemo(() => {
    return baseTuitionAmount + functionalFeesTotal;
  }, [baseTuitionAmount, functionalFeesTotal]);

  // PDF Slip Downloader
  const handleDownloadFeeSlip = () => {
    if (!student) return;
    setDownloadingPdf(true);
    try {
      const doc = generateRcsnFeeSlipPdf({
        studentName: student.name,
        admissionNumber: student.admission_number,
        className: student.current_class,
        intake: student.intake,
        boardingType: student.residence_status,
        tuitionAmount: baseTuitionAmount,
        functionalItems: feeBreakdown.map((f) => ({ name: f.name, amount: f.amount })),
        amountPaid: totalPaid,
        balanceDue: outstandingBalance,
      });

      const fileName = `RCSN_Fee_Slip_${(student.admission_number || student.name).replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Could not download fee slip PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={() => navigate('/dashboard/student')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 10,
              border: `1px solid ${t.stroke}`,
              background: t.panel,
              color: t.textMid,
              cursor: 'pointer',
            }}
            title="Back to Dashboard"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1
              style={{
                fontFamily: SORA,
                fontSize: 22,
                fontWeight: 800,
                color: t.textHi,
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Fees &amp; Financial Statement
            </h1>
            <p style={{ fontSize: 13, color: t.textMid, margin: '3px 0 0' }}>
              {student ? `${student.name} • ${student.admission_number} • ${student.current_class}` : 'Loading...'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={loadFinancialData}
            title="Refresh Fees"
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
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            onClick={handleDownloadFeeSlip}
            disabled={downloadingPdf || loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 18px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              fontFamily: SORA,
              cursor: downloadingPdf || loading ? 'not-allowed' : 'pointer',
              border: 'none',
              background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
              color: t.ctaText,
              boxShadow: '0 6px 18px rgba(61,232,160,0.25)',
              opacity: downloadingPdf || loading ? 0.6 : 1,
            }}
          >
            <Download size={15} />
            <span>{downloadingPdf ? 'Generating PDF...' : 'Download Official Fee Slip'}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            marginBottom: 18,
            fontSize: 13,
            fontWeight: 600,
            background: t.redDim,
            color: t.red,
            border: `1px solid ${t.redDim}`,
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* 3 Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 14,
          marginBottom: 20,
        }}
      >
        {/* Total Invoiced */}
        <div
          style={{
            background: cardGrad(t),
            border: `1px solid ${t.stroke}`,
            borderRadius: 14,
            padding: '18px 20px',
            boxShadow: cardShadow,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Billed
            </span>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: t.blueDim,
                color: t.blue,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Receipt size={16} />
            </div>
          </div>
          <div style={{ fontFamily: SORA, fontSize: 22, fontWeight: 800, color: t.textHi }}>
            {fmtUGX(totalBilled)}
          </div>
          <div style={{ fontSize: 11.5, color: t.textMid, marginTop: 4 }}>
            {invoices.length} historical invoice{invoices.length !== 1 ? 's' : ''} issued
          </div>
        </div>

        {/* Amount Paid */}
        <div
          style={{
            background: cardGrad(t),
            border: `1px solid ${t.stroke}`,
            borderRadius: 14,
            padding: '18px 20px',
            boxShadow: cardShadow,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Paid
            </span>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: t.mintDim,
                color: t.mintInk,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div style={{ fontFamily: SORA, fontSize: 22, fontWeight: 800, color: t.mintInk }}>
            {fmtUGX(totalPaid)}
          </div>
          <div style={{ fontSize: 11.5, color: t.textMid, marginTop: 4 }}>
            {payments.length} verified payment receipt{payments.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Balance Due */}
        <div
          style={{
            background: cardGrad(t),
            border: `1px solid ${outstandingBalance > 0 ? (isDark ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.25)') : t.stroke}`,
            borderRadius: 14,
            padding: '18px 20px',
            boxShadow: cardShadow,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Outstanding Balance
            </span>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: outstandingBalance > 0 ? t.redDim : t.mintDim,
                color: outstandingBalance > 0 ? t.red : t.mintInk,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {outstandingBalance > 0 ? <AlertCircle size={16} /> : <ShieldCheck size={16} />}
            </div>
          </div>
          <div
            style={{
              fontFamily: SORA,
              fontSize: 22,
              fontWeight: 800,
              color: outstandingBalance > 0 ? t.red : t.mintInk,
            }}
          >
            {fmtUGX(outstandingBalance)}
          </div>
          <div style={{ fontSize: 11.5, color: t.textMid, marginTop: 4 }}>
            {outstandingBalance === 0 ? 'Fully Cleared • In Good Financial Standing' : 'Payment due for current semester'}
          </div>
        </div>
      </div>

      {/* Official Centenary Bank Instructions Banner */}
      <div
        style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(16,185,129,0.09), rgba(6,78,59,0.22))'
            : 'linear-gradient(135deg, #f0fdf4, #ecfdf5)',
          border: '1px solid rgba(16,185,129,0.35)',
          borderRadius: 14,
          padding: '18px 22px',
          marginBottom: 24,
          boxShadow: '0 4px 14px rgba(16,185,129,0.06)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'rgba(16,185,129,0.18)',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Building size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 800, fontFamily: SORA, color: isDark ? '#34d399' : '#065f46' }}>
                  {RCSN_OFFICIAL_BANK_ACCOUNT.bankName} Payment Account
                </span>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: 'rgba(16,185,129,0.18)',
                    color: '#059669',
                    textTransform: 'uppercase',
                  }}
                >
                  Verified Official
                </span>
              </div>
              <div style={{ fontSize: 13, color: t.textMid, marginTop: 2 }}>
                Account Name:{' '}
                <strong style={{ color: t.textHi }}>{RCSN_OFFICIAL_BANK_ACCOUNT.accountName}</strong>
              </div>
            </div>
          </div>

          <div
            style={{
              background: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.9)',
              padding: '8px 16px',
              borderRadius: 10,
              border: '1px solid rgba(16,185,129,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>
              Account Number:
            </span>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: 17,
                fontWeight: 900,
                color: isDark ? '#6ee7b7' : '#047857',
                letterSpacing: '0.08em',
              }}
            >
              {RCSN_OFFICIAL_BANK_ACCOUNT.accountNumber}
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
            paddingTop: 12,
            borderTop: '1px solid rgba(16,185,129,0.2)',
            fontSize: 12.5,
          }}
        >
          <div>
            <span style={{ color: t.textMuted }}>Minimum 1st Installment: </span>
            <strong style={{ color: t.textHi }}>{RCSN_OFFICIAL_BANK_ACCOUNT.minimumFirstPayment}</strong>
          </div>
          <div>
            <span style={{ color: t.textMuted }}>Bank Service Charge: </span>
            <strong style={{ color: t.textHi }}>{RCSN_OFFICIAL_BANK_ACCOUNT.bankCharge}</strong>
          </div>
          <div>
            <span style={{ color: t.textMuted }}>Deposit Notice: </span>
            <span style={{ color: isDark ? '#a7f3d0' : '#047857', fontWeight: 600 }}>
              No cash payments accepted at school campus.
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          background: t.panel,
          border: `1px solid ${t.stroke}`,
          borderRadius: 12,
          padding: 4,
          marginBottom: 18,
          width: 'fit-content',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('breakdown')}
          style={{
            padding: '7px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: SORA,
            cursor: 'pointer',
            border: 'none',
            background: activeTab === 'breakdown' ? (isDark ? 'rgba(255,255,255,0.1)' : '#ffffff') : 'transparent',
            color: activeTab === 'breakdown' ? t.textHi : t.textMuted,
            boxShadow: activeTab === 'breakdown' ? cardShadow : 'none',
            transition: 'all 0.15s',
          }}
        >
          Fee Structure &amp; Functional Levies
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('invoices')}
          style={{
            padding: '7px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: SORA,
            cursor: 'pointer',
            border: 'none',
            background: activeTab === 'invoices' ? (isDark ? 'rgba(255,255,255,0.1)' : '#ffffff') : 'transparent',
            color: activeTab === 'invoices' ? t.textHi : t.textMuted,
            boxShadow: activeTab === 'invoices' ? cardShadow : 'none',
            transition: 'all 0.15s',
          }}
        >
          Invoices ({invoices.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          style={{
            padding: '7px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: SORA,
            cursor: 'pointer',
            border: 'none',
            background: activeTab === 'payments' ? (isDark ? 'rgba(255,255,255,0.1)' : '#ffffff') : 'transparent',
            color: activeTab === 'payments' ? t.textHi : t.textMuted,
            boxShadow: activeTab === 'payments' ? cardShadow : 'none',
            transition: 'all 0.15s',
          }}
        >
          Payment Receipts ({payments.length})
        </button>
      </div>

      {/* TAB CONTENT: Fee Breakdown */}
      {activeTab === 'breakdown' && (
        <div
          style={{
            background: cardGrad(t),
            border: `1px solid ${t.stroke}`,
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: cardShadow,
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${t.stroke}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 800, fontFamily: SORA, color: t.textHi }}>
                Semester Fee Structure
              </div>
              <div style={{ fontSize: 12, color: t.textMid }}>
                Tuition fee and official functional fees schedule.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 11, color: t.textMuted, textTransform: 'uppercase', fontWeight: 600 }}>
                  Semester Grand Total:
                </span>
                <div style={{ fontSize: 17, fontWeight: 900, fontFamily: SORA, color: t.mintInk }}>
                  {fmtUGX(grandSemesterTotal)}
                </div>
              </div>
            </div>
          </div>

          {/* Tuition Fee Section */}
          <div style={{ padding: '14px 20px', background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', borderBottom: `1px solid ${t.stroke}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: t.textHi }}>
                  Tuition Fee
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, fontFamily: SORA, color: t.textHi }}>
                {baseTuitionAmount > 0 ? fmtUGX(baseTuitionAmount) : 'Pending Configuration'}
              </div>
            </div>
          </div>

          {/* Functional Fees Table */}
          <div>
            <div
              style={{
                padding: '12px 20px',
                background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                borderBottom: `1px solid ${t.stroke}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Functional Fees ({feeBreakdown.length} items)
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: t.textMid }}>
                Subtotal: {fmtUGX(functionalFeesTotal)}
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${t.stroke}`, background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.01)' }}>
                    <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600, color: t.textMuted, fontSize: 11, textTransform: 'uppercase' }}>#</th>
                    <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600, color: t.textMuted, fontSize: 11, textTransform: 'uppercase' }}>Functional Fee Description</th>
                    <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: t.textMuted, fontSize: 11, textTransform: 'uppercase' }}>Amount (UGX)</th>
                  </tr>
                </thead>
                <tbody>
                  {feeBreakdown.map((item, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: `1px solid ${t.stroke}`,
                        background: idx % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.01)'),
                      }}
                    >
                      <td style={{ padding: '10px 20px', color: t.textMuted, width: 40 }}>{idx + 1}</td>
                      <td style={{ padding: '10px 20px', fontWeight: 600, color: t.textHi }}>{item.name}</td>
                      <td style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: item.amount > 0 ? t.textHi : t.textMuted }}>
                        {item.amount > 0 ? fmtUGX(item.amount) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Invoices */}
      {activeTab === 'invoices' && (
        <div
          style={{
            background: cardGrad(t),
            border: `1px solid ${t.stroke}`,
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: cardShadow,
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${t.stroke}` }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, fontFamily: SORA, color: t.textHi }}>
              Issued Invoices (Historical &amp; Immutable)
            </div>
            <div style={{ fontSize: 12, color: t.textMid }}>
              Invoices are permanently locked upon issuance to preserve your official accounting and audit record.
            </div>
          </div>

          {invoices.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: t.textMuted, fontSize: 13 }}>
              No invoices generated yet for this student account.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${t.stroke}`, background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.01)' }}>
                    <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600, color: t.textMuted, fontSize: 11, textTransform: 'uppercase' }}>Invoice No</th>
                    <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600, color: t.textMuted, fontSize: 11, textTransform: 'uppercase' }}>Semester / Period</th>
                    <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: t.textMuted, fontSize: 11, textTransform: 'uppercase' }}>Total Billed</th>
                    <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: t.textMuted, fontSize: 11, textTransform: 'uppercase' }}>Paid</th>
                    <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: t.textMuted, fontSize: 11, textTransform: 'uppercase' }}>Balance</th>
                    <th style={{ padding: '10px 20px', textAlign: 'center', fontWeight: 600, color: t.textMuted, fontSize: 11, textTransform: 'uppercase' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} style={{ borderBottom: `1px solid ${t.stroke}` }}>
                      <td style={{ padding: '12px 20px', fontWeight: 700, fontFamily: 'monospace', color: t.textHi }}>
                        {inv.invoice_number}
                      </td>
                      <td style={{ padding: '12px 20px', color: t.textMid }}>
                        {inv.semester || inv.invoice_label}
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 700, color: t.textHi }}>
                        {fmtUGX(inv.total_amount)}
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 700, color: t.mintInk }}>
                        {fmtUGX(inv.amount_paid)}
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 700, color: inv.balance > 0 ? t.red : t.textMuted }}>
                        {inv.balance > 0 ? fmtUGX(inv.balance) : '—'}
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background:
                              inv.balance <= 0 || inv.status === 'paid'
                                ? t.mintDim
                                : inv.amount_paid > 0
                                ? t.warnDim
                                : t.redDim,
                            color:
                              inv.balance <= 0 || inv.status === 'paid'
                                ? t.mintInk
                                : inv.amount_paid > 0
                                ? t.warn
                                : t.red,
                            textTransform: 'uppercase',
                          }}
                        >
                          {inv.balance <= 0 || inv.status === 'paid' ? 'Paid' : inv.amount_paid > 0 ? 'Partial' : 'Unpaid'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Payments */}
      {activeTab === 'payments' && (
        <div
          style={{
            background: cardGrad(t),
            border: `1px solid ${t.stroke}`,
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: cardShadow,
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${t.stroke}` }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, fontFamily: SORA, color: t.textHi }}>
              Verified Payment Receipts
            </div>
            <div style={{ fontSize: 12, color: t.textMid }}>
              Bank deposits and mobile payments credited to your student ledger.
            </div>
          </div>

          {payments.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: t.textMuted, fontSize: 13 }}>
              No payments credited yet for this student account.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${t.stroke}`, background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.01)' }}>
                    <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600, color: t.textMuted, fontSize: 11, textTransform: 'uppercase' }}>Receipt No</th>
                    <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600, color: t.textMuted, fontSize: 11, textTransform: 'uppercase' }}>Date</th>
                    <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600, color: t.textMuted, fontSize: 11, textTransform: 'uppercase' }}>Channel</th>
                    <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: t.textMuted, fontSize: 11, textTransform: 'uppercase' }}>Amount (UGX)</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} style={{ borderBottom: `1px solid ${t.stroke}` }}>
                      <td style={{ padding: '12px 20px', fontWeight: 700, fontFamily: 'monospace', color: t.textHi }}>
                        {p.receipt_number}
                      </td>
                      <td style={{ padding: '12px 20px', color: t.textMid }}>
                        {p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '12px 20px', color: t.textHi }}>
                        {p.payment_method || 'Centenary Bank Deposit'}
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 800, fontFamily: SORA, color: t.mintInk }}>
                        {fmtUGX(p.amount_paid)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
