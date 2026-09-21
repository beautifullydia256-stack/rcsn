import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useAcademicPeriod } from '../../lib/academicPeriodTerminology';
import {
  getTokens,
  cardGrad,
  fmtUGX,
  fmtUGXCompact,
  SORA,
  INTER,
} from '../../styles/posThemeTokens';
import {
  Search,
  User,
  History,
  DollarSign,
  FileText,
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Layers,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronDown,
  RefreshCw,
  CreditCard,
  Building,
  School,
  ArrowRight,
  ShieldCheck,
  Receipt,
  FileCheck,
} from 'lucide-react';
import {
  fetchStudentLedger,
  searchStudentsForLedger,
  type StudentLedgerData,
  type StudentSearchResult,
  type StudentLedgerPayment,
} from './api/studentLedger';
import { exportToPdf, exportToExcel, type ExportColumn } from '../../lib/exportUtils';
import { printReceipt, formatReceiptDateTime, type PaymentReceiptData } from '../../components/accountant/PaymentReceipt';

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank: 'Bank Deposit',
  mobile_money: 'Mobile Money',
  cheque: 'Cheque',
  pos: 'POS / Card',
  online: 'Online Gateway',
  school_pay: 'SchoolPay',
  sure_pay: 'SurePay',
  other: 'Other',
};

export default function StudentPaymentHistoryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const schoolId = useAuthStore((s) => s.schoolId);
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t = getTokens(isDark);
  const { labels, isTertiary } = useAcademicPeriod();

  const selectedStudentId = searchParams.get('student') || '';

  // Combobox & Search States
  const [searchQ, setSearchQ] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [termFilter, setTermFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'payments' | 'invoices'>('payments');
  const comboboxRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Autocomplete search results
  const { data: searchResults = [], isFetching: searchingStudents } = useQuery({
    queryKey: ['accountant-student-ledger-search', schoolId, searchQ],
    queryFn: () => searchStudentsForLedger(schoolId!, searchQ),
    enabled: Boolean(schoolId) && searchQ.trim().length >= 1,
    staleTime: 30 * 1000,
  });

  // Selected student complete ledger query
  const {
    data: ledgerData,
    isLoading: loadingLedger,
    isFetching: refetchingLedger,
    refetch,
  } = useQuery({
    queryKey: ['accountant-student-ledger', schoolId, selectedStudentId],
    queryFn: () => fetchStudentLedger(schoolId!, selectedStudentId),
    enabled: Boolean(schoolId) && Boolean(selectedStudentId),
    staleTime: 30 * 1000,
  });

  const selectStudent = (studentId: string) => {
    setSearchParams({ student: studentId });
    setSearchOpen(false);
    setSearchQ('');
  };

  const clearSelectedStudent = () => {
    setSearchParams({});
    setSearchQ('');
  };

  // Filtered payments by selected academic period and method
  const filteredPayments = useMemo(() => {
    if (!ledgerData) return [];
    let rows = ledgerData.payments;

    if (termFilter !== 'all') {
      rows = rows.filter((p) => p.term_id === termFilter);
    }

    if (methodFilter !== 'all') {
      rows = rows.filter((p) => (p.payment_method || '').toLowerCase() === methodFilter);
    }

    return rows;
  }, [ledgerData, termFilter, methodFilter]);

  // Filtered invoices by selected academic period
  const filteredInvoices = useMemo(() => {
    if (!ledgerData) return [];
    let rows = ledgerData.invoices;

    if (termFilter !== 'all') {
      rows = rows.filter((inv) => inv.term_id === termFilter);
    }

    return rows;
  }, [ledgerData, termFilter]);

  // Methods present in this student's history
  const availableMethods = useMemo(() => {
    if (!ledgerData) return [];
    const set = new Set<string>();
    ledgerData.payments.forEach((p) => {
      if (p.payment_method) set.add(p.payment_method.toLowerCase());
    });
    return Array.from(set);
  }, [ledgerData]);

  // Handle individual payment reprint
  const handleReprint = (p: StudentLedgerPayment) => {
    if (!ledgerData) return;
    const receiptData: PaymentReceiptData = {
      receiptNumber: p.receipt_number || p.payment_id.slice(0, 8).toUpperCase(),
      schoolName: ledgerData.schoolName,
      schoolPhone: ledgerData.schoolPhone || undefined,
      schoolEmail: ledgerData.schoolEmail || undefined,
      studentName: ledgerData.student.name,
      studentClass: ledgerData.student.current_class || '—',
      termLabel: p.term_name,
      transactionTime: p.payment_date
        ? formatReceiptDateTime(new Date(p.payment_date + 'T12:00:00'))
        : '—',
      amountPaid: p.amount_paid,
      paymentMethod: p.payment_method || 'cash',
      recordedBy: p.recorder_name || 'Accounts Staff',
      description: p.notes || undefined,
      allocations: [{ termLabel: p.term_name, amountApplied: Number(p.amount_paid || 0) }],
      totalRemainingBalance:
        p.receipt_total_remaining_balance != null
          ? Number(p.receipt_total_remaining_balance)
          : undefined,
    };
    printReceipt(receiptData);
  };

  // Export official PDF Statement of Account
  const handleExportPdf = () => {
    if (!ledgerData) return;
    const student = ledgerData.student;
    const summary = ledgerData.summary;

    const columns: ExportColumn[] = [
      { header: 'Date', key: 'payment_date', width: 22 },
      { header: 'Receipt #', key: 'receipt_number', width: 24 },
      { header: labels.periodNoun, key: 'term_name', width: 28 },
      {
        header: 'Channel',
        key: 'payment_method',
        width: 22,
        format: (v) => METHOD_LABELS[String(v || '').toLowerCase()] || String(v || '—'),
      },
      { header: 'Notes / Ref', key: 'notes', width: 34, format: (v) => String(v || '—') },
      {
        header: 'Amount Paid (UGX)',
        key: 'amount_paid',
        width: 30,
        align: 'right',
        format: (v) => fmtUGX(Number(v || 0)),
      },
      {
        header: 'Running Total (UGX)',
        key: 'running_total_paid',
        width: 32,
        align: 'right',
        format: (v) => fmtUGX(Number(v || 0)),
      },
    ];

    exportToPdf({
      title: 'OFFICIAL STUDENT PAYMENT STATEMENT & FINANCIAL LEDGER',
      subtitle: `Student: ${student.name} (${student.admission_number || 'No ID'}) | Class: ${student.current_class || '—'} | All-Time Total Paid: UGX ${fmtUGX(summary.totalPaidAllTime)} | Current Balance: UGX ${fmtUGX(summary.netBalance)}`,
      schoolName: ledgerData.schoolName,
      columns,
      rows: filteredPayments as unknown as Record<string, unknown>[],
      filename: `Statement-${student.name.replace(/\s+/g, '_')}-${new Date().toISOString().slice(0, 10)}`,
      totalsRow: [
        'TOTAL PAID',
        '',
        '',
        '',
        `${filteredPayments.length} Payments`,
        fmtUGX(filteredPayments.reduce((s, p) => s + p.amount_paid, 0)),
        `Balance: UGX ${fmtUGX(summary.netBalance)}`,
      ],
    });
  };

  // Export Excel / CSV spreadsheet
  const handleExportExcel = () => {
    if (!ledgerData) return;
    const student = ledgerData.student;
    const summary = ledgerData.summary;

    const columns: ExportColumn[] = [
      { header: 'Payment Date', key: 'payment_date' },
      { header: 'Receipt Number', key: 'receipt_number' },
      { header: labels.periodNoun, key: 'term_name' },
      {
        header: 'Payment Method',
        key: 'payment_method',
        format: (v) => METHOD_LABELS[String(v || '').toLowerCase()] || String(v || '—'),
      },
      { header: 'Notes & Ref', key: 'notes' },
      { header: 'Recorded By', key: 'recorder_name' },
      {
        header: 'Amount Paid (UGX)',
        key: 'amount_paid',
        format: (v) => String(v || 0),
      },
      {
        header: 'Cumulative Paid (UGX)',
        key: 'running_total_paid',
        format: (v) => String(v || 0),
      },
    ];

    exportToExcel({
      title: `${ledgerData.schoolName} - Student Payment Ledger: ${student.name}`,
      subtitle: `Class: ${student.current_class} | Total Paid: ${summary.totalPaidAllTime} | Balance: ${summary.netBalance}`,
      columns,
      rows: filteredPayments as unknown as Record<string, unknown>[],
      filename: `Payment-Ledger-${student.name.replace(/\s+/g, '_')}`,
    });
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
      {/* ── ROW 0: HEADER & STUDENT SELECTOR ─────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 22,
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: t.mintInk,
              marginBottom: 4,
            }}
          >
            <span
              style={{
                width: 14,
                height: 2,
                borderRadius: 1,
                background: t.mintInk,
              }}
            />
            <History size={14} />
            <span>Student Transactional Ledger</span>
          </div>

          <h1
            style={{
              fontFamily: SORA,
              fontSize: 24,
              fontWeight: 800,
              color: t.textHi,
              letterSpacing: '-0.3px',
              margin: '0 0 4px 0',
            }}
          >
            Student Payment History & Statement
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: t.textMid }}>
            Comprehensive all-time record of every fee payment, transaction receipt, and balance ledger for any student.
          </p>
        </div>

        {/* Action Controls & Refetch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {selectedStudentId && (
            <>
              <button
                type="button"
                onClick={clearSelectedStudent}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 10,
                  fontSize: 12.5,
                  fontWeight: 600,
                  border: `1.5px solid ${t.stroke}`,
                  background: t.panel,
                  color: t.textMid,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <Search size={14} />
                <span>Switch Student</span>
              </button>

              <button
                type="button"
                onClick={() => refetch()}
                disabled={refetchingLedger}
                title="Refresh student records"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  border: `1.5px solid ${t.stroke}`,
                  background: t.panel,
                  color: t.textMid,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <RefreshCw size={15} className={refetchingLedger ? 'animate-spin' : ''} />
              </button>

              <button
                type="button"
                onClick={handleExportPdf}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '9px 16px',
                  borderRadius: 10,
                  border: 'none',
                  background: isDark
                    ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                    : 'linear-gradient(135deg, #047857 0%, #059669 100%)',
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
                  transition: 'all 0.15s',
                }}
              >
                <Download size={15} />
                <span>Download Statement (PDF)</span>
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '9px 15px',
                  borderRadius: 10,
                  border: `1.5px solid ${t.stroke}`,
                  background: t.panel,
                  color: t.textHi,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <FileSpreadsheet size={15} style={{ color: t.mintInk }} />
                <span>Excel / CSV</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '9px 15px',
                  borderRadius: 10,
                  border: `1.5px solid ${t.stroke}`,
                  background: t.panel,
                  color: t.textHi,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <Printer size={15} />
                <span>Print</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── ROW 1: SEARCH & COMBOBOX STATION ─────────────────────────────────── */}
      <div
        ref={comboboxRef}
        style={{
          position: 'relative',
          marginBottom: 20,
          zIndex: 40,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: t.panel,
            border: `1.5px solid ${searchOpen ? (isDark ? '#3de8a0' : '#059669') : t.stroke}`,
            borderRadius: 12,
            padding: '4px 6px 4px 14px',
            boxShadow: searchOpen
              ? (isDark ? '0 0 0 3px rgba(61,232,160,0.15)' : '0 0 0 3px rgba(5,150,105,0.12)')
              : (isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)'),
            transition: 'all 0.15s ease',
          }}
        >
          <Search size={18} style={{ color: t.textMid, marginRight: 10, flexShrink: 0 }} />
          <input
            type="text"
            placeholder={
              ledgerData
                ? `Active Student: ${ledgerData.student.name} (${ledgerData.student.current_class || 'Class'}). Type to search another student...`
                : 'Search student by name, admission number, class stream, or SchoolPay code...'
            }
            value={searchQ}
            onChange={(e) => {
              setSearchQ(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 13.5,
              fontWeight: 500,
              color: t.textHi,
              padding: '8px 0',
            }}
          />
          {searchQ && (
            <button
              type="button"
              onClick={() => setSearchQ('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: t.textMid,
                fontSize: 12,
                cursor: 'pointer',
                padding: '4px 8px',
              }}
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => setSearchOpen((o) => !o)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 12px',
              borderRadius: 8,
              border: 'none',
              background: t.fieldBg,
              color: t.textMid,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <span>Students</span>
            <ChevronDown size={14} style={{ transform: searchOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>
        </div>

        {/* Dropdown Results Overlay */}
        {searchOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              maxHeight: 340,
              overflowY: 'auto',
              background: t.panel,
              border: `1.5px solid ${t.strokeHi}`,
              borderRadius: 14,
              boxShadow: isDark
                ? '0 12px 36px rgba(0,0,0,0.6)'
                : '0 10px 30px -4px rgba(15,23,42,0.12), 0 4px 12px -2px rgba(15,23,42,0.08)',
              padding: 6,
              zIndex: 50,
            }}
          >
            {searchingStudents ? (
              <div style={{ padding: 16, textAlign: 'center', color: t.textMid, fontSize: 13 }}>
                Searching students database...
              </div>
            ) : searchQ.trim().length >= 1 ? (
              searchResults.length === 0 ? (
                <div style={{ padding: 18, textAlign: 'center', color: t.textMid, fontSize: 13 }}>
                  No students matched &quot;{searchQ}&quot;
                </div>
              ) : (
                searchResults.map((s) => (
                  <button
                    key={s.student_id}
                    type="button"
                    onClick={() => selectStudent(s.student_id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: 'none',
                      background: s.student_id === selectedStudentId ? t.mintDim : 'transparent',
                      color: s.student_id === selectedStudentId ? t.mintInk : t.textHi,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => {
                      if (s.student_id !== selectedStudentId) {
                        e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (s.student_id !== selectedStudentId) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
                          color: isDark ? '#cbd5e1' : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <User size={16} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{s.name}</div>
                        <div style={{ fontSize: 11.5, color: t.textMid }}>
                          Class: <strong>{s.current_class || '—'}</strong>
                          {s.admission_number ? ` · ID: ${s.admission_number}` : ''}
                          {s.schoolpay_payment_code ? ` · SchoolPay: ${s.schoolpay_payment_code}` : ''}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: t.mintInk }}>View Ledger →</span>
                    </div>
                  </button>
                ))
              )
            ) : (
              <div style={{ padding: '16px 14px', textAlign: 'center', color: t.textMid, fontSize: 13 }}>
                Type a student name, admission number, or class to search records...
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── ROW 2: EMPTY STATE WHEN NO STUDENT SELECTED ──────────────────────── */}
      {!selectedStudentId && (
        <div
          style={{
            borderRadius: 16,
            border: `2px dashed ${isDark ? 'rgba(255,255,255,0.12)' : '#cbd5e1'}`,
            background: t.panel,
            padding: '48px 24px',
            textAlign: 'center',
            boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 16,
              background: t.mintDim,
              color: t.mintInk,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
            }}
          >
            <History size={30} />
          </div>

          <h2
            style={{
              fontFamily: SORA,
              fontSize: 20,
              fontWeight: 800,
              color: t.textHi,
              margin: '0 0 6px 0',
            }}
          >
            Select a Student to View Complete Payment History
          </h2>
          <p
            style={{
              maxWidth: 540,
              margin: '0 auto',
              fontSize: 13.5,
              lineHeight: 1.6,
              color: t.textMid,
            }}
          >
            Type a student&apos;s name, admission number, or class in the search bar above to look up their full ledger,
            running cumulative payments, fee clearance status, and official PDF statements.
          </p>
        </div>
      )}

      {/* ── ROW 3: STUDENT PROFILE & FINANCIAL STATUS ────────────────────────── */}
      {loadingLedger && (
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
            borderRadius: 16,
            padding: '48px 24px',
            textAlign: 'center',
            color: t.textMid,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
            marginBottom: 24,
          }}
        >
          <RefreshCw size={28} className="animate-spin" style={{ color: t.mint }} />
          <div style={{ fontFamily: SORA, fontSize: 16, fontWeight: 700, color: t.textHi }}>
            Loading Student Payment History & Ledger...
          </div>
          <div style={{ fontSize: 12.5, color: t.textMid }}>
            Aggregating historical invoices, cash entries, bank deposits, and running totals
          </div>
        </div>
      )}

      {!loadingLedger && !ledgerData && selectedStudentId && (
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
            borderRadius: 16,
            padding: '40px 24px',
            textAlign: 'center',
            boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: t.warnDim,
              color: t.warn,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px auto',
            }}
          >
            <AlertCircle size={28} />
          </div>
          <h3 style={{ fontFamily: SORA, fontSize: 18, fontWeight: 700, color: t.textHi, margin: '0 0 6px 0' }}>
            Student Profile Not Found
          </h3>
          <p style={{ fontSize: 13, color: t.textMid, maxWidth: 460, margin: '0 auto 18px auto' }}>
            We could not retrieve payment history records for this student. The record may have been archived or moved.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <button
              onClick={() => refetch()}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                background: t.fieldBg,
                color: t.textHi,
                border: `1px solid ${t.stroke}`,
              }}
            >
              Retry
            </button>
            <button
              onClick={clearSelectedStudent}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                background: t.mintDim,
                color: t.mintInk,
                border: 'none',
              }}
            >
              Select Another Student
            </button>
          </div>
        </div>
      )}

      {!loadingLedger && ledgerData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Student Profile Card */}
          <div
            style={{
              background: t.panel,
              border: `1.5px solid ${t.stroke}`,
              borderRadius: 16,
              padding: '20px 24px',
              boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    fontWeight: 800,
                    fontFamily: SORA,
                    boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
                  }}
                >
                  {ledgerData.student.name.slice(0, 2).toUpperCase()}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <h2
                      style={{
                        fontFamily: SORA,
                        fontSize: 20,
                        fontWeight: 800,
                        color: t.textHi,
                        margin: 0,
                      }}
                    >
                      {ledgerData.student.name}
                    </h2>

                    {/* Clearance Badge */}
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 11.5,
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: 20,
                        background: ledgerData.summary.isFullyCleared
                          ? (isDark ? 'rgba(61,232,160,0.15)' : 'rgba(5,150,105,0.1)')
                          : (isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)'),
                        color: ledgerData.summary.isFullyCleared
                          ? (isDark ? '#3de8a0' : '#059669')
                          : (isDark ? '#f87171' : '#dc2626'),
                        border: `1px solid ${ledgerData.summary.isFullyCleared ? (isDark ? 'rgba(61,232,160,0.3)' : 'rgba(5,150,105,0.25)') : (isDark ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.25)')}`,
                      }}
                    >
                      {ledgerData.summary.isFullyCleared ? (
                        <>
                          <CheckCircle2 size={13} />
                          <span>Fully Cleared / Settled</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={13} />
                          <span>Outstanding Balance</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      fontSize: 12.5,
                      color: t.textMid,
                      marginTop: 4,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span>
                      Class: <strong style={{ color: t.textHi }}>{ledgerData.student.current_class || '—'}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Admission: <strong style={{ color: t.textHi }}>{ledgerData.student.admission_number || 'N/A'}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Section: <strong style={{ color: t.textHi }}>{ledgerData.student.boarding_type || 'Day Scholar'}</strong>
                    </span>
                    {ledgerData.student.schoolpay_payment_code && (
                      <>
                        <span>·</span>
                        <span style={{ color: t.blue, fontWeight: 600 }}>
                          SchoolPay: {ledgerData.student.schoolpay_payment_code}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button: Record Fresh Payment */}
              <button
                type="button"
                onClick={() => navigate(`/dashboard/accountant/payments?student=${ledgerData.student.student_id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 18px',
                  borderRadius: 10,
                  border: 'none',
                  background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
                  color: t.ctaText,
                  fontFamily: SORA,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(61,232,160,0.35)',
                }}
              >
                <Sparkles size={16} />
                <span>+ Record New Payment</span>
              </button>
            </div>
          </div>

          {/* ── ROW 4: 4-CARD POS SUMMARY STRIP ───────────────────────────────── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 14,
            }}
          >
            {/* KPI 1: All-Time Total Paid */}
            <div
              style={{
                background: t.panel,
                border: `1.5px solid ${t.stroke}`,
                borderRadius: 14,
                padding: '16px 18px',
                boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    color: t.gold,
                  }}
                >
                  ALL-TIME FEES PAID
                </span>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    background: t.goldDim,
                    color: t.gold,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <DollarSign size={16} />
                </div>
              </div>
              <div
                style={{
                  fontFamily: SORA,
                  fontSize: 22,
                  fontWeight: 800,
                  color: t.gold,
                  letterSpacing: '-0.3px',
                }}
              >
                UGX {fmtUGX(ledgerData.summary.totalPaidAllTime)}
              </div>
              <div style={{ fontSize: 11.5, color: t.textMid, marginTop: 4 }}>
                Cumulative payments ever deposited
              </div>
            </div>

            {/* KPI 2: Total Billed / Invoiced */}
            <div
              style={{
                background: t.panel,
                border: `1.5px solid ${t.stroke}`,
                borderRadius: 14,
                padding: '16px 18px',
                boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    color: t.blue,
                  }}
                >
                  ALL-TIME INVOICED
                </span>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    background: t.blueDim,
                    color: t.blue,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
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
                }}
              >
                UGX {fmtUGX(ledgerData.summary.totalInvoicedAllTime)}
              </div>
              <div style={{ fontSize: 11.5, color: t.textMid, marginTop: 4 }}>
                Across {ledgerData.invoices.length} billing statements
              </div>
            </div>

            {/* KPI 3: Current Net Balance */}
            <div
              style={{
                background: t.panel,
                border: `1.5px solid ${t.stroke}`,
                borderRadius: 14,
                padding: '16px 18px',
                boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    color: ledgerData.summary.isFullyCleared ? t.mintInk : t.red,
                  }}
                >
                  NET BALANCE
                </span>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    background: ledgerData.summary.isFullyCleared ? t.mintDim : t.redDim,
                    color: ledgerData.summary.isFullyCleared ? t.mintInk : t.red,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {ledgerData.summary.isFullyCleared ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                </div>
              </div>
              <div
                style={{
                  fontFamily: SORA,
                  fontSize: 22,
                  fontWeight: 800,
                  color: ledgerData.summary.isFullyCleared ? t.mintInk : t.red,
                  letterSpacing: '-0.3px',
                }}
              >
                UGX {fmtUGX(ledgerData.summary.netBalance)}
              </div>
              <div style={{ fontSize: 11.5, color: t.textMid, marginTop: 4 }}>
                {ledgerData.summary.isFullyCleared
                  ? 'Zero arrears / Settled'
                  : 'Pending institutional clearance'}
              </div>
            </div>

            {/* KPI 4: Transaction Velocity & Dates */}
            <div
              style={{
                background: t.panel,
                border: `1.5px solid ${t.stroke}`,
                borderRadius: 14,
                padding: '16px 18px',
                boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    color: isDark ? '#c084fc' : '#7e22ce',
                  }}
                >
                  PAYMENT TIMELINE
                </span>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    background: isDark ? 'rgba(192,132,252,0.12)' : 'rgba(126,34,206,0.08)',
                    color: isDark ? '#c084fc' : '#7e22ce',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Calendar size={16} />
                </div>
              </div>
              <div
                style={{
                  fontFamily: SORA,
                  fontSize: 22,
                  fontWeight: 800,
                  color: t.textHi,
                  letterSpacing: '-0.3px',
                }}
              >
                {ledgerData.summary.transactionCount} Payments
              </div>
              <div style={{ fontSize: 11.5, color: t.textMid, marginTop: 4 }}>
                {ledgerData.summary.latestPaymentDate
                  ? `Latest: ${ledgerData.summary.latestPaymentDate}`
                  : 'No payment dates recorded'}
              </div>
            </div>
          </div>

          {/* ── ROW 5: FILTER BAR & TABS ───────────────────────────────────────── */}
          <div
            style={{
              background: t.panel,
              border: `1.5px solid ${t.stroke}`,
              borderRadius: 14,
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 14,
              boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            {/* Tab Buttons: Payments vs Invoices */}
            <div
              style={{
                display: 'flex',
                background: t.fieldBg,
                borderRadius: 10,
                padding: 3,
                border: `1px solid ${t.stroke}`,
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('payments')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: activeTab === 'payments' ? (isDark ? 'rgba(61,232,160,0.15)' : '#ffffff') : 'transparent',
                  color: activeTab === 'payments' ? t.mintInk : t.textMid,
                  boxShadow: activeTab === 'payments' && !isDark ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                <History size={14} />
                <span>Payments Ledger ({filteredPayments.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('invoices')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: activeTab === 'invoices' ? (isDark ? 'rgba(56,189,248,0.15)' : '#ffffff') : 'transparent',
                  color: activeTab === 'invoices' ? t.blue : t.textMid,
                  boxShadow: activeTab === 'invoices' && !isDark ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                <FileText size={14} />
                <span>Invoices & Billing ({filteredInvoices.length})</span>
              </button>
            </div>

            {/* Filter Selectors: Term & Payment Method */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {/* Term Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
                <span style={{ color: t.textMid }}>{labels.periodNoun}:</span>
                <select
                  value={termFilter}
                  onChange={(e) => setTermFilter(e.target.value)}
                  style={{
                    height: 36,
                    borderRadius: 8,
                    border: `1.5px solid ${t.stroke}`,
                    background: t.fieldBg,
                    color: t.textHi,
                    padding: '0 10px',
                    fontSize: 12.5,
                    outline: 'none',
                  }}
                >
                  <option value="all">All-Time ({labels.allPeriods})</option>
                  {ledgerData.terms.map((term) => (
                    <option key={term.id} value={term.id}>
                      {term.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Method Filter (only on payments tab) */}
              {activeTab === 'payments' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
                  <span style={{ color: t.textMid }}>Channel:</span>
                  <select
                    value={methodFilter}
                    onChange={(e) => setMethodFilter(e.target.value)}
                    style={{
                      height: 36,
                      borderRadius: 8,
                      border: `1.5px solid ${t.stroke}`,
                      background: t.fieldBg,
                      color: t.textHi,
                      padding: '0 10px',
                      fontSize: 12.5,
                      outline: 'none',
                    }}
                  >
                    <option value="all">All Channels</option>
                    {availableMethods.map((m) => (
                      <option key={m} value={m}>
                        {METHOD_LABELS[m] || m}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* ── ROW 6: ALL-TIME TRANSACTIONAL LEDGER TABLE ─────────────────────── */}
          {activeTab === 'payments' && (
            <div
              style={{
                background: t.panel,
                border: `1.5px solid ${t.stroke}`,
                borderRadius: 16,
                padding: '20px 22px',
                boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
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
                  <h3
                    style={{
                      fontFamily: SORA,
                      fontSize: 16,
                      fontWeight: 700,
                      color: t.textHi,
                      margin: '0 0 2px 0',
                    }}
                  >
                    All-Time Verified Payment Transactions
                  </h3>
                  <div style={{ fontSize: 12, color: t.textMid }}>
                    Every verified fee deposit logged for {ledgerData.student.name} in chronological sequence.
                  </div>
                </div>

                <div style={{ fontSize: 12, color: t.textMid }}>
                  Showing <strong>{filteredPayments.length}</strong> of{' '}
                  <strong>{ledgerData.payments.length}</strong> total deposits
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: `1.5px solid ${t.stroke}`,
                        color: t.textMid,
                        textAlign: 'left',
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: 0.8,
                      }}
                    >
                      <th style={{ padding: '10px 12px' }}>DATE & TIME</th>
                      <th style={{ padding: '10px 12px' }}>RECEIPT # / REF</th>
                      <th style={{ padding: '10px 12px' }}>{labels.periodNoun.toUpperCase()}</th>
                      <th style={{ padding: '10px 12px' }}>CHANNEL</th>
                      <th style={{ padding: '10px 12px' }}>NOTES / RECORDER</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>AMOUNT PAID</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>RUNNING TOTAL</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          style={{
                            padding: 32,
                            textAlign: 'center',
                            color: t.textMid,
                            fontSize: 13.5,
                          }}
                        >
                          No payments found matching the selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredPayments.map((p) => (
                        <tr
                          key={p.payment_id}
                          style={{
                            borderBottom: `1px solid ${t.divider}`,
                            transition: 'background 0.12s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          {/* Date & Time */}
                          <td style={{ padding: '12px 12px', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 600, color: t.textHi }}>
                              {p.payment_date || '—'}
                            </div>
                            {p.created_at && (
                              <div style={{ fontSize: 10.5, color: t.textMid }}>
                                {new Date(p.created_at).toLocaleTimeString('en-UG', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            )}
                          </td>

                          {/* Receipt Number */}
                          <td style={{ padding: '12px 12px' }}>
                            <span
                              style={{
                                fontFamily: SORA,
                                fontWeight: 700,
                                fontSize: 12,
                                color: t.textHi,
                                padding: '3px 8px',
                                borderRadius: 6,
                                background: t.fieldBg,
                                border: `1px solid ${t.stroke}`,
                              }}
                            >
                              {p.receipt_number || p.payment_id.slice(0, 8)}
                            </span>
                          </td>

                          {/* Term */}
                          <td style={{ padding: '12px 12px', color: t.textHi, fontWeight: 500 }}>
                            {p.term_name}
                          </td>

                          {/* Channel / Method */}
                          <td style={{ padding: '12px 12px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '3px 8px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 600,
                                background: (p.payment_method || '').toLowerCase() === 'cash'
                                  ? t.mintDim
                                  : (p.payment_method || '').toLowerCase().includes('bank')
                                  ? t.blueDim
                                  : t.goldDim,
                                color: (p.payment_method || '').toLowerCase() === 'cash'
                                  ? t.mintInk
                                  : (p.payment_method || '').toLowerCase().includes('bank')
                                  ? t.blue
                                  : t.gold,
                              }}
                            >
                              <CreditCard size={12} />
                              <span>{METHOD_LABELS[(p.payment_method || '').toLowerCase()] || p.payment_method || 'Deposit'}</span>
                            </span>
                          </td>

                          {/* Notes & Recorded By */}
                          <td style={{ padding: '12px 12px', maxWidth: 220 }}>
                            <div style={{ color: t.textHi, fontSize: 12, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {p.notes || 'Tuition & school fees payment'}
                            </div>
                            {p.recorder_name && (
                              <div style={{ fontSize: 10.5, color: t.textMid }}>
                                By: {p.recorder_name}
                              </div>
                            )}
                          </td>

                          {/* Amount Paid */}
                          <td
                            style={{
                              padding: '12px 12px',
                              textAlign: 'right',
                              fontFamily: SORA,
                              fontSize: 13.5,
                              fontWeight: 800,
                              color: t.mintInk,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            UGX {fmtUGX(p.amount_paid)}
                          </td>

                          {/* Running Total */}
                          <td
                            style={{
                              padding: '12px 12px',
                              textAlign: 'right',
                              fontFamily: SORA,
                              fontSize: 13,
                              fontWeight: 700,
                              color: t.textMid,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            UGX {fmtUGX(p.running_total_paid)}
                          </td>

                          {/* Action Button: Reprint Receipt */}
                          <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleReprint(p)}
                              title="Reprint official transaction receipt"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '5px 10px',
                                borderRadius: 7,
                                border: `1px solid ${t.stroke}`,
                                background: t.fieldBg,
                                color: t.textHi,
                                fontSize: 11.5,
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = isDark ? '#3de8a0' : '#059669';
                                e.currentTarget.style.color = t.mintInk;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = t.stroke;
                                e.currentTarget.style.color = t.textHi;
                              }}
                            >
                              <Receipt size={13} />
                              <span>Receipt</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── ROW 7: INVOICES & BILLING HISTORY TABLE ────────────────────────── */}
          {activeTab === 'invoices' && (
            <div
              style={{
                background: t.panel,
                border: `1.5px solid ${t.stroke}`,
                borderRadius: 16,
                padding: '20px 22px',
                boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
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
                  <h3
                    style={{
                      fontFamily: SORA,
                      fontSize: 16,
                      fontWeight: 700,
                      color: t.textHi,
                      margin: '0 0 2px 0',
                    }}
                  >
                    Invoices & Fee Assessments Issued
                  </h3>
                  <div style={{ fontSize: 12, color: t.textMid }}>
                    All institutional bills, supplementary balances, and term charges issued for {ledgerData.student.name}.
                  </div>
                </div>

                <div style={{ fontSize: 12, color: t.textMid }}>
                  Showing <strong>{filteredInvoices.length}</strong> billing items
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: `1.5px solid ${t.stroke}`,
                        color: t.textMid,
                        textAlign: 'left',
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: 0.8,
                      }}
                    >
                      <th style={{ padding: '10px 12px' }}>INVOICE #</th>
                      <th style={{ padding: '10px 12px' }}>DESCRIPTION</th>
                      <th style={{ padding: '10px 12px' }}>{labels.periodNoun.toUpperCase()}</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>TOTAL BILLED</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>AMOUNT PAID</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>BALANCE</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          style={{
                            padding: 32,
                            textAlign: 'center',
                            color: t.textMid,
                            fontSize: 13.5,
                          }}
                        >
                          No invoices recorded for this student.
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((inv) => (
                        <tr
                          key={inv.invoice_id}
                          style={{
                            borderBottom: `1px solid ${t.divider}`,
                          }}
                        >
                          <td style={{ padding: '12px 12px' }}>
                            <span
                              style={{
                                fontFamily: SORA,
                                fontWeight: 700,
                                fontSize: 12,
                                color: t.textHi,
                                padding: '3px 8px',
                                borderRadius: 6,
                                background: t.fieldBg,
                                border: `1px solid ${t.stroke}`,
                              }}
                            >
                              {inv.invoice_number || inv.invoice_id.slice(0, 8)}
                            </span>
                          </td>

                          <td style={{ padding: '12px 12px' }}>
                            <div style={{ fontWeight: 600, color: t.textHi }}>
                              {inv.invoice_label || (inv.is_supplementary ? 'Supplementary Balance' : 'Term Tuition & Levies')}
                            </div>
                            {inv.created_at && (
                              <div style={{ fontSize: 10.5, color: t.textMid }}>
                                Issued: {inv.created_at.slice(0, 10)}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '12px 12px', color: t.textHi, fontWeight: 500 }}>
                            {inv.term_name}
                          </td>

                          <td
                            style={{
                              padding: '12px 12px',
                              textAlign: 'right',
                              fontFamily: SORA,
                              fontSize: 13,
                              fontWeight: 700,
                              color: t.textHi,
                            }}
                          >
                            UGX {fmtUGX(inv.total_amount)}
                          </td>

                          <td
                            style={{
                              padding: '12px 12px',
                              textAlign: 'right',
                              fontFamily: SORA,
                              fontSize: 13,
                              fontWeight: 700,
                              color: t.mintInk,
                            }}
                          >
                            UGX {fmtUGX(inv.amount_paid)}
                          </td>

                          <td
                            style={{
                              padding: '12px 12px',
                              textAlign: 'right',
                              fontFamily: SORA,
                              fontSize: 13,
                              fontWeight: 700,
                              color: inv.balance <= 0 ? t.mintInk : t.red,
                            }}
                          >
                            UGX {fmtUGX(inv.balance)}
                          </td>

                          <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 700,
                                textTransform: 'capitalize',
                                background: inv.status === 'paid' || inv.balance <= 0
                                  ? t.mintDim
                                  : inv.status === 'partial'
                                  ? t.goldDim
                                  : t.redDim,
                                color: inv.status === 'paid' || inv.balance <= 0
                                  ? t.mintInk
                                  : inv.status === 'partial'
                                  ? t.gold
                                  : t.red,
                              }}
                            >
                              {inv.balance <= 0 ? 'Paid' : inv.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
