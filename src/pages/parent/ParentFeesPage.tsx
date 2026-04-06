import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { loadStudentBalanceAggAllTerms } from '@/lib/adminFinanceTerm';
import ParentPageScaffold, { parentPortal } from '@/components/parent/ParentPageScaffold';
import { useParentPortal } from '@/context/ParentPortalContext';
import { displayStudentName } from '@/lib/parentPortalUtils';

function fmt(n: number) {
  return `UGX ${Math.round(n || 0).toLocaleString()}`;
}

export default function ParentFeesPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const method = params.get('method');
  const { schoolId, ready, children, activeStudentId, setActiveStudentId } = useParentPortal();
  const childParam = params.get('child');
  const child =
    children.find((c) => c.student_id === (childParam || activeStudentId)) || children[0] || null;

  useEffect(() => {
    if (childParam && children.some((c) => c.student_id === childParam) && childParam !== activeStudentId) {
      setActiveStudentId(childParam);
    }
  }, [childParam, children, activeStudentId, setActiveStudentId]);

  const [totalFees, setTotalFees] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !schoolId || !child) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const [agg, payRes] = await Promise.all([
        loadStudentBalanceAggAllTerms(supabase, schoolId, child.student_id),
        supabase
          .from('student_payments')
          .select('amount_paid')
          .eq('school_id', schoolId)
          .eq('student_id', child.student_id)
          .is('reversed_at', null),
      ]);
      if (cancelled) return;
      const bal = Math.max(0, Number(agg.balance || 0));
      const paid = (payRes.data || []).reduce((s, p) => s + Math.max(0, Number((p as { amount_paid?: number }).amount_paid || 0)), 0);
      setBalance(bal);
      setTotalPaid(paid);
      setTotalFees(paid + bal);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, schoolId, child?.student_id]);

  const pct = totalFees > 0 ? Math.round((totalPaid / totalFees) * 100) : 0; // totalFees = paid + outstanding (matches school total)
  const sidQ = child?.student_id || '';

  return (
    <ParentPageScaffold
      title="Fees and payments"
      description={
        child
          ? `${displayStudentName(child)} — summary only. Use the buttons below for payment options.`
          : 'Link a student to view fees.'
      }
    >
      {method ? (
        <div className={`${parentPortal.card} mb-6 border-amber-500/20`}>
          <p className="text-sm text-[#e8eeff]">
            You opened the{' '}
            <span className="text-[#ffb547] font-medium">{method.replace(/_/g, ' ')}</span> path. Payments are
            usually completed through the school office or approved channels; this portal shows your balance.
          </p>
        </div>
      ) : null}

      {children.length > 1 ? (
        <div className="mb-6 flex flex-wrap gap-2">
          {children.map((c) => (
            <button
              key={c.student_id}
              type="button"
              onClick={() => navigate(`/dashboard/parent/fees?child=${c.student_id}`)}
              className={
                'rounded-full px-4 py-2 text-xs font-semibold transition-colors ' +
                (c.student_id === child?.student_id
                  ? 'bg-[#ff6b6b]/20 text-[#ff6b6b]'
                  : 'bg-[#161b2b] text-[#b0bdd8] border border-white/10')
              }
            >
              {displayStudentName(c)}
            </button>
          ))}
        </div>
      ) : null}

      {!child ? null : loading ? (
        <div className={`${parentPortal.cardMuted} text-[#b0bdd8] text-sm`}>Loading…</div>
      ) : (
        <>
          <div className={`${parentPortal.card} mb-6`}>
            <div className={parentPortal.label}>Outstanding balance</div>
            <p className={`${parentPortal.statVal} mt-2 ${balance > 0 ? 'text-[#ff6b6b]' : 'text-emerald-400'}`}>
              {balance > 0 ? fmt(balance) : 'Cleared'}
            </p>
            <div className="mt-4 h-2 rounded-full bg-[#161b2b] overflow-hidden">
              <div className="h-full rounded-full bg-[#ff6b6b]/90" style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
            <p className="mt-2 text-xs text-[#b0bdd8]">{pct}% paid · Total {fmt(totalFees)}</p>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            <button
              type="button"
              className={parentPortal.btnPrimary}
              onClick={() => navigate(`/dashboard/parent/fees${sidQ ? `?child=${sidQ}` : ''}`)}
            >
              Refresh summary
            </button>
            <button
              type="button"
              className={parentPortal.btnGhost}
              onClick={() =>
                navigate(
                  `/dashboard/parent/fees${sidQ ? `?child=${sidQ}&method=mobile_money` : '?method=mobile_money'}`
                )
              }
            >
              Mobile money info
            </button>
            <button
              type="button"
              className={parentPortal.btnGhost}
              onClick={() =>
                navigate(
                  `/dashboard/parent/fees${
                    sidQ ? `?child=${sidQ}&method=bank_transfer` : '?method=bank_transfer'
                  }`
                )
              }
            >
              Bank transfer info
            </button>
          </div>
        </>
      )}
    </ParentPageScaffold>
  );
}
