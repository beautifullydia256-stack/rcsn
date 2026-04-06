import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import ParentPageScaffold, { parentPortal } from '@/components/parent/ParentPageScaffold';
import { useParentPortal } from '@/context/ParentPortalContext';

type Row = { id: string; title: string | null; message: string | null; created_at: string | null };

export default function ParentNoticesPage() {
  const { schoolId, ready } = useParentPortal();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !schoolId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('notifications')
        .select('id, title, message, created_at')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(80);
      if (!cancelled) {
        setRows((data as Row[]) || []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, schoolId]);

  return (
    <ParentPageScaffold
      title="School notices"
      description="Official updates from your school."
    >
      {loading ? (
        <div className={`${parentPortal.cardMuted} text-[#b0bdd8] text-sm`}>Loading notices…</div>
      ) : rows.length === 0 ? (
        <div className={`${parentPortal.cardMuted} text-[#b0bdd8] text-sm`}>No notices right now.</div>
      ) : (
        <ul className="flex flex-col gap-3 sm:gap-4">
          {rows.map((n) => (
            <li key={n.id} className={parentPortal.card}>
              <div className={parentPortal.label}>Posted</div>
              <p className="mt-1 text-xs text-[#b0bdd8]">
                {n.created_at
                  ? new Date(n.created_at).toLocaleDateString('en-UG', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : '—'}
              </p>
              <h2 className="mt-3 text-lg font-semibold text-[#e8eeff]">{n.title || 'Notice'}</h2>
              {n.message ? (
                <p className="mt-2 text-sm text-[#b8c0d8] leading-relaxed whitespace-pre-wrap">{n.message}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </ParentPageScaffold>
  );
}
