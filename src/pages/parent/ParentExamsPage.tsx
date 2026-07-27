import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import ParentPageScaffold, { parentPortal } from '@/components/parent/ParentPageScaffold';
import { useParentPortal } from '@/context/ParentPortalContext';
import { displayStudentName } from '@/lib/parentPortalUtils';

export default function ParentExamsPage() {
  const { schoolId, ready, children, activeStudentId } = useParentPortal();
  const child = children.find((c) => c.student_id === activeStudentId) || children[0] || null;
  const className = child?.current_class ? String(child.current_class) : '';
  const [rows, setRows] = useState<
    { id: string; name: string | null; term: number | null; year: number | null }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !schoolId || !className) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('exam_sets')
        .select('id, name, term, year, target_classes, is_active')
        .eq('school_id', schoolId)
        .order('year', { ascending: false })
        .order('term', { ascending: false })
        .limit(40);
      if (cancelled) return;
      const raw = (data || []) as {
        id: string;
        name?: string;
        term?: number;
        year?: number;
        target_classes?: string[] | null;
        is_active?: boolean;
      }[];
      const filtered = raw.filter((e) => {
        if (e.is_active !== true) return false;
        const tc = e.target_classes;
        if (!tc?.length) return true;
        return tc.includes(className);
      });
      setRows(
        filtered.map((e) => ({
          id: e.id,
          name: e.name ?? null,
          term: e.term ?? null,
          year: e.year ?? null,
        }))
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, schoolId, className]);

  return (
    <ParentPageScaffold
      title="Exams and results"
      description={
        child && className
          ? `Exam periods that apply to ${displayStudentName(child)} (${className}). Published scores also appear on Performance.`
          : 'Link a student to see relevant exams.'
      }
    >
      {!className ? null : loading ? (
        <div className={`${parentPortal.cardMuted} text-[#b0bdd8] text-sm`}>Loading…</div>
      ) : rows.length === 0 ? (
        <div className={`${parentPortal.cardMuted} text-[#b0bdd8] text-sm`}>No exam periods listed yet.</div>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((e) => (
            <li key={e.id} className={parentPortal.card}>
              <p className="font-semibold text-[#e8eeff]">{e.name || 'Exam'}</p>
              <p className="text-sm text-[#b0bdd8] mt-1">
                Term {e.term ?? '—'} · {e.year ?? '—'} · {className}
              </p>
            </li>
          ))}
        </ul>
      )}
    </ParentPageScaffold>
  );
}
