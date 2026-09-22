import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useParentPortal } from '@/context/ParentPortalContext';
import { useUIStore } from '@/store/uiStore';
import { displayStudentName } from '@/lib/parentPortalUtils';
import {
  Receipt,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  CreditCard,
  Building2,
  Sparkles,
  Download,
} from 'lucide-react';
import { getTokens, cardGrad, SORA, INTER } from '@/styles/posThemeTokens';

function fmt(n: number) {
  return `${Math.round(n || 0).toLocaleString()} UGX`;
}

type PayRow = {
  payment_id: string;
  student_id: string;
  amount_paid: number | null;
  payment_date: string | null;
  payment_method: string | null;
  transaction_ref: string | null;
};

export default function ParentReceiptsPage() {
  const { schoolId, ready, children, activeStudentId } = useParentPortal();
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);

  const studentIds = children.map((c) => c.student_id);
  const [rows, setRows] = useState<PayRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !schoolId || studentIds.length === 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('student_payments')
        .select('payment_id, student_id, amount_paid, payment_date, payment_method, transaction_ref')
        .eq('school_id', schoolId)
        .in('student_id', studentIds)
        .order('payment_date', { ascending: false })
        .limit(60);
      if (!cancelled) {
        setRows((data as PayRow[]) || []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, schoolId, studentIds.join('|')]);

  const nameBy = new Map(children.map((c) => [c.student_id, displayStudentName(c)]));

  const filtered =
    activeStudentId && studentIds.includes(activeStudentId)
      ? rows.filter((r) => r.student_id === activeStudentId)
      : rows;

  const totalSum = filtered.reduce((acc, r) => acc + (Number(r.amount_paid) || 0), 0);

  return (
    <div
      className="p-4 sm:p-6 lg:p-8 space-y-6 w-full max-w-none"
      style={{
        backgroundColor: t.screenBg,
        color: t.textHi,
        fontFamily: INTER,
      }}
    >
      {/* Top Breadcrumb & Header */}
      <div>
        <Link
          to="/dashboard/parent"
          className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline mb-2"
          style={{ color: t.mint }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md"
                style={{
                  backgroundColor: isDark ? 'rgba(16,217,168,0.15)' : 'rgba(16,185,129,0.12)',
                  color: t.mint,
                  fontFamily: SORA,
                }}
              >
                PAYMENT AUDIT LOG
              </span>
            </div>
            <h1
              className="text-2xl sm:text-3xl font-bold mt-1 tracking-tight"
              style={{ fontFamily: SORA, color: t.textHi }}
            >
              Official Payment Receipts
            </h1>
            <p className="text-sm mt-0.5" style={{ color: t.textMid }}>
              Bank and mobile money transactions officially logged and reconciled by the school accounts department.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          className="p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm"
          style={{ background: cardGrad(isDark), border: `1px solid ${t.stroke}` }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Verified Total Paid
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight text-emerald-500" style={{ fontFamily: SORA }}>
            {loading ? '...' : fmt(totalSum)}
          </div>
          <div className="text-xs mt-1" style={{ color: t.textMid }}>
            Across {filtered.length} payment transactions
          </div>
        </div>

        <div
          className="p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm"
          style={{ background: cardGrad(isDark), border: `1px solid ${t.stroke}` }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Receipt Transactions
            </span>
            <Receipt className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
            {filtered.length}
          </div>
          <div className="text-xs mt-1" style={{ color: t.textMid }}>
            Confirmed cashier entries
          </div>
        </div>
      </div>

      {/* Receipts List */}
      <div
        className="p-5 sm:p-6 rounded-3xl shadow-sm space-y-4"
        style={{
          background: t.panel,
          border: `1px solid ${t.stroke}`,
        }}
      >
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: t.divider }}>
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-500" />
            <span className="font-bold text-sm tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
              Transactions Log
            </span>
          </div>
          <span className="text-xs" style={{ color: t.textLow }}>
            {filtered.length} Receipts
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs font-medium" style={{ color: t.textLow }}>
            Loading receipts...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-xs" style={{ color: t.textLow }}>
            No payment receipts recorded on file for this student yet.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <div
                key={r.payment_id}
                className="p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                style={{
                  backgroundColor: t.fieldBg,
                  border: `1px solid ${t.stroke}`,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5"
                    style={{
                      backgroundColor: isDark ? 'rgba(16,217,168,0.15)' : 'rgba(16,185,129,0.12)',
                      color: t.mint,
                    }}
                  >
                    <Receipt className="w-4 h-4" />
                  </div>

                  <div>
                    <div className="text-sm font-bold" style={{ color: t.textHi }}>
                      {fmt(Number(r.amount_paid || 0))}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: t.textMid }}>
                      Learner: <span className="font-semibold text-emerald-400">{nameBy.get(r.student_id) || 'Student'}</span>
                    </div>
                    <div className="text-[11px] mt-0.5 capitalize flex items-center gap-2" style={{ color: t.textLow }}>
                      <span>Channel: {(r.payment_method || 'School Office Cash').replace(/_/g, ' ')}</span>
                      {r.transaction_ref && <span>• Ref: #{r.transaction_ref}</span>}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 self-end sm:self-center">
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                    style={{
                      backgroundColor: isDark ? 'rgba(16,217,168,0.15)' : 'rgba(16,185,129,0.12)',
                      color: t.mint,
                    }}
                  >
                    CONFIRMED & VERIFIED
                  </span>
                  <div className="text-[11px] mt-1" style={{ color: t.textLow }}>
                    {r.payment_date
                      ? new Date(r.payment_date + 'T12:00:00').toLocaleDateString('en-UG', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
