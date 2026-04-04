import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { ParentStudentRow } from '@/lib/parentPortalUtils';

export type ParentPortalContextValue = {
  ready: boolean;
  schoolId: string | null;
  userId: string | null;
  parentNameFull: string;
  parentInitialsStr: string;
  children: ParentStudentRow[];
  activeStudentId: string | null;
  setActiveStudentId: (id: string | null) => void;
  unreadInbox: number;
  refreshUnread: () => Promise<void>;
};

const ParentPortalContext = createContext<ParentPortalContextValue | null>(null);

function initialsFromFull(name: string) {
  return (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function ParentPortalProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [parentNameFull, setParentNameFull] = useState('');
  const [childrenList, setChildrenList] = useState<ParentStudentRow[]>([]);
  const [activeStudentId, setActiveStudentIdState] = useState<string | null>(null);
  const [unreadInbox, setUnreadInbox] = useState(0);

  const setActiveStudentId = useCallback((id: string | null) => {
    setActiveStudentIdState(id);
  }, []);

  const refreshUnread = useCallback(async () => {
    const uid = userId;
    if (!uid) return;
    const { count, error } = await supabase
      .from('user_in_app_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', uid)
      .is('read_at', null);
    if (!error && count != null) setUnreadInbox(count);
  }, [userId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user || cancelled) {
        if (!cancelled) setReady(true);
        return;
      }

      const { data: userRow } = await supabase
        .from('users')
        .select('school_id, name, email')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      const sid = (userRow as { school_id?: string } | null)?.school_id ?? null;
      const nameFull =
        String((userRow as { name?: string })?.name || '').trim() ||
        String(user.email || '').split('@')[0] ||
        'Parent';

      setUserId(user.id);
      setSchoolId(sid);
      setParentNameFull(nameFull);

      let parentLinkRows: { student_id: string }[] = [];
      if (sid) {
        const { data: byId } = await supabase
          .from('parents')
          .select('student_id')
          .eq('school_id', sid)
          .eq('parent_id', user.id);
        parentLinkRows = (byId as { student_id: string }[]) || [];
        if (!parentLinkRows.length && user.email) {
          const { data: byEmail } = await supabase
            .from('parents')
            .select('student_id')
            .eq('school_id', sid)
            .ilike('email', user.email.trim());
          parentLinkRows = (byEmail as { student_id: string }[]) || [];
        }
      }

      if (cancelled) return;
      const studentIds = [...new Set(parentLinkRows.map((r) => r.student_id).filter(Boolean))];
      let studs: ParentStudentRow[] = [];
      if (sid && studentIds.length) {
        const { data } = await supabase
          .from('students')
          .select('student_id, name, first_name, middle_name, last_name, current_class, admission_number')
          .eq('school_id', sid)
          .in('student_id', studentIds);
        studs = (data as ParentStudentRow[]) || [];
      }

      if (cancelled) return;
      setChildrenList(studs);
      setActiveStudentIdState((prev) => {
        if (prev && studs.some((c) => c.student_id === prev)) return prev;
        return studs[0]?.student_id ?? null;
      });

      const { count } = await supabase
        .from('user_in_app_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null);

      if (!cancelled && count != null) setUnreadInbox(count);
      if (!cancelled) setReady(true);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<ParentPortalContextValue>(
    () => ({
      ready,
      schoolId,
      userId,
      parentNameFull,
      parentInitialsStr: initialsFromFull(parentNameFull),
      children: childrenList,
      activeStudentId,
      setActiveStudentId,
      unreadInbox,
      refreshUnread,
    }),
    [ready, schoolId, userId, parentNameFull, childrenList, activeStudentId, setActiveStudentId, unreadInbox, refreshUnread]
  );

  return <ParentPortalContext.Provider value={value}>{children}</ParentPortalContext.Provider>;
}

export function useParentPortal() {
  const ctx = useContext(ParentPortalContext);
  if (!ctx) throw new Error('useParentPortal must be used under ParentPortalProvider');
  return ctx;
}
