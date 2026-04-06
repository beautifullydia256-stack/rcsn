import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import ParentPageScaffold, { parentPortal } from '@/components/parent/ParentPageScaffold';
import { useParentPortal } from '@/context/ParentPortalContext';
import { displayStudentName } from '@/lib/parentPortalUtils';

type Row = {
  subject: string | null;
  marks_obtained: number | null;
  total_marks: number | null;
  grade: string | null;
};

export default function ParentPerformancePage() {
  const { schoolId, ready, children, activeStudentId } = useParentPortal();
  const child = children.find((c) => c.student_id === activeStudentId) || children[0] || null;
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !schoolId || !child) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('exam_results')
        .select('subject, marks_obtained, total_marks, grade')
        .eq('school_id', schoolId)
        .eq('student_id', child.student_id)
        .order('subject');
      if (!cancelled) {
        setRows((data as Row[]) || []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, schoolId, child]);

  return (
    <ParentPageScaffold
      title="Performance"
      description={
        child
          ? `Published marks for ${displayStudentName(child)} (read-only).`
          : 'Link a student to see performance.'
      }
    >
      {!child ? null : loading ? (
        <div className={`${parentPortal.cardMuted} text-[#b0bdd8] text-sm`}>Loading…</div>
      ) : rows.length === 0 ? (
        <div className={`${parentPortal.cardMuted} text-[#b0bdd8] text-sm`}>No results published yet.</div>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {rows.map((r) => {
            const tot = Number(r.total_marks || 0);
            const mo = Number(r.marks_obtained || 0);
            const pc = tot > 0 ? Math.round((mo / tot) * 100) : null;
            const bar =
              pc == null ? 'bg-zinc-600' : pc >= 70 ? 'bg-emerald-500' : pc >= 50 ? 'bg-amber-400' : 'bg-rose-500';
            return (
              <div key={`${r.subject}-${tot}-${mo}`} className={parentPortal.card}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold text-[#e8eeff]">{r.subject || 'Subject'}</span>
                  <span className="text-sm text-[#ff6b6b] font-medium">
                    {r.grade || (pc != null ? `${pc}%` : '—')} · {mo}/{tot || '—'}
                  </span>
                </div>
                {pc != null ? (
                  <div className="mt-3 h-2 rounded-full bg-[#161b2b] overflow-hidden">
                    <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(100, pc)}%` }} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </ParentPageScaffold>
  );
}
