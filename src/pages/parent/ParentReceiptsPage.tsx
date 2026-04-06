import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import ParentPageScaffold, { parentPortal } from '@/components/parent/ParentPageScaffold';
import { useParentPortal } from '@/context/ParentPortalContext';
import { displayStudentName } from '@/lib/parentPortalUtils';

function fmt(n: number) {
  return `UGX ${Math.round(n || 0).toLocaleString()}`;
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

  return (
    <ParentPageScaffold
      title="Receipts"
      description="Recorded payments for your linked children. Official receipts may also be sent by the school."
    >
      {loading ? (
        <div className={`${parentPortal.cardMuted} text-[#b0bdd8] text-sm`}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className={`${parentPortal.cardMuted} text-[#b0bdd8] text-sm`}>No payment records found yet.</div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((r) => (
            <li key={r.payment_id} className={parentPortal.card}>
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-semibold text-[#e8eeff]">{fmt(Number(r.amount_paid || 0))}</span>
                <span className="text-xs text-[#b0bdd8]">
                  {r.payment_date
                    ? new Date(r.payment_date + 'T12:00:00').toLocaleDateString('en-UG', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                </span>
              </div>
              <p className="text-sm text-[#b8c0d8] mt-2">{nameBy.get(r.student_id) || 'Student'}</p>
              <p className="text-xs text-[#b0bdd8] mt-1 capitalize">
                {(r.payment_method || '—').replace(/_/g, ' ')}
                {r.transaction_ref ? ` · Ref ${r.transaction_ref}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </ParentPageScaffold>
  );
}
