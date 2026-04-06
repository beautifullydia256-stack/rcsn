import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import ParentPageScaffold, { parentPortal } from '@/components/parent/ParentPageScaffold';
import { useParentPortal } from '@/context/ParentPortalContext';
import { displayStudentName } from '@/lib/parentPortalUtils';

export default function ParentProfilePage() {
  const { userId, parentNameFull, ready, children } = useParentPortal();
  const [email, setEmail] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !userId) return;
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.from('users').select('email, phone').eq('user_id', userId).maybeSingle();
      if (cancelled) return;
      const row = u as { email?: string; phone?: string } | null;
      setEmail(row?.email ?? null);
      setPhone(row?.phone ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, userId]);

  return (
    <ParentPageScaffold
      title="My profile"
      description="How the school recognises you on the parent portal. Contact the office to update official records."
    >
      <div className={parentPortal.card}>
        <div className={parentPortal.label}>Name</div>
        <p className="mt-1 text-lg text-[#e8eeff] font-medium">{parentNameFull || '—'}</p>
        <div className={`${parentPortal.label} mt-6`}>Email</div>
        <p className="mt-1 text-sm text-[#b8c0d8]">{email || '—'}</p>
        <div className={`${parentPortal.label} mt-6`}>Phone</div>
        <p className="mt-1 text-sm text-[#b8c0d8]">{phone || '—'}</p>
      </div>

      <div className={`${parentPortal.card} mt-6`}>
        <div className={parentPortal.label}>Linked children</div>
        {children.length === 0 ? (
          <p className="mt-2 text-sm text-[#b0bdd8]">No learners linked to this account yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {children.map((c) => (
              <li key={c.student_id} className="text-sm text-[#e8eeff]">
                {displayStudentName(c)}
                {c.current_class ? (
                  <span className="text-[#b0bdd8]"> · {c.current_class}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </ParentPageScaffold>
  );
}
