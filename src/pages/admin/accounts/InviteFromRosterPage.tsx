import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Search, UserCheck, Users } from 'lucide-react';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/components/Toast';
import { isValidEmailFormat } from '@/lib/emailValidator';

const STALE_MS = 60 * 1000;

type TeacherRow = {
  teacher_id: string;
  name: string;
  email: string | null;
  school_id: string;
};

type OtherStaffRow = {
  id: string;
  full_name: string;
  email: string | null;
  staff_role: string | null;
  linked_user_id: string | null;
};

type UserEmailRow = { email: string | null; role: string };

export async function fetchInviteContext(schoolId: string) {
  const [teachersRes, staffRes, usersRes] = await Promise.all([
    supabase.from('teachers').select('teacher_id, name, email, school_id').eq('school_id', schoolId).order('name'),
    supabase
      .from('other_staff_members')
      .select('id, full_name, email, staff_role, linked_user_id')
      .eq('school_id', schoolId)
      .order('full_name'),
    supabase.from('users').select('email, role').eq('school_id', schoolId),
  ]);
  if (teachersRes.error) throw teachersRes.error;
  if (staffRes.error) throw staffRes.error;
  if (usersRes.error) throw usersRes.error;
  return {
    teachers: (teachersRes.data || []) as TeacherRow[],
    otherStaff: (staffRes.data || []) as OtherStaffRow[],
    users: (usersRes.data || []) as UserEmailRow[],
  };
}

function teacherHasLogin(t: TeacherRow, users: UserEmailRow[]): boolean {
  const e = t.email?.trim().toLowerCase();
  if (!e) return false;
  return users.some((u) => u.role === 'teacher' && (u.email?.trim().toLowerCase() === e));
}

export default function InviteFromRosterPage() {
  const authUser = useAuthStore((s) => s.user);
  const schoolIdFromStore = useAuthStore((s) => s.schoolId);
  const toast = useToast();
  const queryClient = useQueryClient();
  const [schoolId, setSchoolId] = useState<string | null>(() => schoolIdFromStore ?? null);
  /** False until we've tried store + DB for school_id (avoids flashing "No school linked" during hydration). */
  const [schoolResolved, setSchoolResolved] = useState(false);
  const [tab, setTab] = useState<'staff' | 'teachers'>('staff');
  const [q, setQ] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherRow | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<OtherStaffRow | null>(null);
  const [emailDraft, setEmailDraft] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (schoolIdFromStore) {
      setSchoolId(schoolIdFromStore);
      setSchoolResolved(true);
      return;
    }
    const run = async () => {
      if (!authUser?.id) {
        setSchoolResolved(true);
        return;
      }
      const { data } = await supabase.from('users').select('school_id').eq('user_id', authUser.id).single();
      const sid = (data?.school_id as string | undefined) ?? null;
      setSchoolId(sid);
      if (sid) useAuthStore.getState().setSchoolId(sid);
      setSchoolResolved(true);
    };
    void run();
  }, [authUser?.id, schoolIdFromStore]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'invite-roster', schoolId],
    queryFn: () => fetchInviteContext(schoolId!),
    enabled: !!schoolId,
    staleTime: STALE_MS,
  });

  const teachers = data?.teachers ?? [];
  const otherStaff = data?.otherStaff ?? [];
  const schoolUserRows = data?.users ?? [];

  const teachersNeedingInvite = useMemo(() => {
    return teachers.filter((t) => !teacherHasLogin(t, schoolUserRows));
  }, [teachers, schoolUserRows]);

  const staffNeedingInvite = useMemo(() => {
    return otherStaff.filter((o) => !o.linked_user_id);
  }, [otherStaff]);

  useEffect(() => {
    if (selectedTeacher) {
      setEmailDraft(selectedTeacher.email?.trim() || '');
    } else if (selectedStaff) {
      setEmailDraft(selectedStaff.email?.trim() || '');
    } else {
      setEmailDraft('');
    }
  }, [selectedTeacher, selectedStaff]);

  const filteredTeachers = useMemo(() => {
    const list = tab === 'teachers' ? teachersNeedingInvite : [];
    if (!q.trim()) return list;
    const s = q.toLowerCase();
    return list.filter((t) => t.name.toLowerCase().includes(s) || (t.email || '').toLowerCase().includes(s));
  }, [teachersNeedingInvite, tab, q]);

  const filteredStaff = useMemo(() => {
    const list = tab === 'staff' ? staffNeedingInvite : [];
    if (!q.trim()) return list;
    const s = q.toLowerCase();
    return list.filter(
      (o) =>
        o.full_name.toLowerCase().includes(s) ||
        (o.email || '').toLowerCase().includes(s) ||
        (o.staff_role || '').toLowerCase().includes(s)
    );
  }, [staffNeedingInvite, tab, q]);

  const sendInvite = async () => {
    const email = emailDraft.trim();
    if (!isValidEmailFormat(email)) {
      toast.error('Enter a valid email address.');
      return;
    }
    setSending(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        toast.error('Your session expired. Please sign in again.');
        return;
      }
      const apiBase = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
      const url = apiBase ? `${apiBase}/api/admin/create-user-account` : '/api/admin/create-user-account';
      const body: Record<string, unknown> = {
        sendEmailInvite: true,
        email,
      };
      if (selectedTeacher) {
        body.teacherId = selectedTeacher.teacher_id;
      } else if (selectedStaff) {
        body.otherStaffId = selectedStaff.id;
        if (!selectedStaff.staff_role) {
          toast.error('Set Staff role on the Staff page before inviting.');
          setSending(false);
          return;
        }
        try {
          await supabase.from('other_staff_members').update({ email }).eq('id', selectedStaff.id);
        } catch {
          /* non-fatal */
        }
      } else {
        toast.error('Select a person first.');
        setSending(false);
        return;
      }

      if (selectedTeacher) {
        try {
          await supabase.from('teachers').update({ email }).eq('teacher_id', selectedTeacher.teacher_id);
        } catch {
          /* non-fatal */
        }
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((json as { error?: string }).error || 'Invitation failed.');
        return;
      }
      toast.success((json as { message?: string }).message || 'Invitation sent.');
      setSelectedTeacher(null);
      setSelectedStaff(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'invite-roster', schoolId] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'other-staff', schoolId] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'accounts', authUser?.id ?? ''] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Request failed.');
    } finally {
      setSending(false);
    }
  };

  if (!schoolResolved) {
    return (
      <AdminPageWrapper>
        <div
          className={`${adminCardClass} invite-flow mx-auto max-w-4xl px-4 py-10 text-center font-['Instrument_Sans',system-ui,sans-serif] text-sm text-[var(--ac-text-secondary)]`}
        >
          <div className="mx-auto h-8 w-8 animate-pulse rounded-full bg-emerald-500/20" aria-hidden />
          <p className="mt-4">Loading your school context…</p>
        </div>
      </AdminPageWrapper>
    );
  }

  if (!schoolId) {
    return (
      <AdminPageWrapper>
        <div className="invite-flow mx-auto max-w-4xl px-3 font-['Instrument_Sans',system-ui,sans-serif] sm:px-4">
          <div className="rounded-2xl border border-amber-400/35 bg-amber-50/90 p-5 text-[15px] leading-relaxed text-amber-950 shadow-sm dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-50">
            <p className="font-semibold text-amber-900 dark:text-amber-100">No school linked</p>
            <p className="mt-2 text-sm opacity-90">
              If you are an admin, ask support to set your user&apos;s{' '}
              <code className="rounded bg-black/5 px-1.5 py-0.5 text-xs dark:bg-white/10">school_id</code>.
            </p>
          </div>
        </div>
      </AdminPageWrapper>
    );
  }

  return (
    <AdminPageWrapper>
      <div className="invite-flow mx-auto w-full max-w-4xl space-y-6 px-3 pb-10 font-['Instrument_Sans',system-ui,sans-serif] sm:px-4">
        <header className="pt-1 sm:pt-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-xl">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
                <Users className="h-6 w-6" strokeWidth={1.75} aria-hidden />
              </div>
              <h1 className="font-['Cabinet_Grotesk',system-ui,sans-serif] text-2xl font-bold tracking-tight text-[var(--ac-text-primary)] sm:text-3xl">
                Send invitations
              </h1>
              <p className="mt-3 text-pretty text-[15px] leading-relaxed text-[var(--ac-text-secondary)] sm:text-base">
                Only people already on your roster can get a login. They receive a professional email with a one-time
                password and a sign-in link; then they set their own password before accessing the dashboard.
              </p>
            </div>
          </div>
        </header>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            to="/dashboard/admin/staff"
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--ac-border)] bg-white/50 px-4 py-2.5 text-sm font-semibold text-[var(--ac-text-primary)] shadow-sm backdrop-blur-sm transition hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10 sm:flex-initial sm:justify-start"
          >
            <Users className="h-4 w-4 shrink-0 opacity-80" />
            Staff roster
          </Link>
          <Link
            to="/dashboard/admin/teachers?add=1"
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--ac-border)] bg-white/50 px-4 py-2.5 text-sm font-semibold text-[var(--ac-text-primary)] shadow-sm backdrop-blur-sm transition hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10 sm:flex-initial sm:justify-start"
          >
            Add teacher
          </Link>
          <Link
            to="/dashboard/admin/accounts"
            className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--ac-text-secondary)] transition hover:text-[var(--ac-text-primary)] sm:ml-auto sm:justify-center"
          >
            All users →
          </Link>
        </div>

        <div className={`${adminCardClass} space-y-5 p-4 shadow-[var(--ac-shadow-strong)] sm:space-y-6 sm:p-6`}>
          <div className="grid w-full grid-cols-2 gap-1 rounded-xl bg-[var(--ac-sidebar-active-bg)] p-1 sm:inline-grid sm:max-w-md sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setTab('staff');
                setSelectedTeacher(null);
                setSelectedStaff(null);
              }}
              className={`min-h-11 rounded-lg px-3 py-2.5 text-center text-sm font-semibold transition sm:px-4 ${
                tab === 'staff'
                  ? 'bg-white text-emerald-700 shadow-sm dark:bg-slate-800 dark:text-emerald-400'
                  : 'text-[var(--ac-text-secondary)] hover:text-[var(--ac-text-primary)]'
              }`}
            >
              Staff &amp; other roles
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('teachers');
                setSelectedTeacher(null);
                setSelectedStaff(null);
              }}
              className={`min-h-11 rounded-lg px-3 py-2.5 text-center text-sm font-semibold transition sm:px-4 ${
                tab === 'teachers'
                  ? 'bg-white text-emerald-700 shadow-sm dark:bg-slate-800 dark:text-emerald-400'
                  : 'text-[var(--ac-text-secondary)] hover:text-[var(--ac-text-primary)]'
              }`}
            >
              Teachers
            </button>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-[1.125rem] w-[1.125rem] -translate-y-1/2 text-[var(--ac-text-muted)]" />
            <input
              type="search"
              placeholder="Search name, email, or role…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="ac-input min-h-12 w-full rounded-xl py-3 pl-11 pr-4 text-base outline-none transition focus:ring-2 focus:ring-emerald-500/35 sm:text-[15px]"
              enterKeyHint="search"
            />
          </div>

          {isLoading ? (
            <p className="py-10 text-center text-sm text-[var(--ac-text-muted)]">Loading roster…</p>
          ) : tab === 'staff' ? (
            <ul className="divide-y divide-[var(--ac-border)] overflow-hidden rounded-xl border border-[var(--ac-border)]">
              {filteredStaff.length === 0 ? (
                <li className="px-4 py-10 text-center text-sm leading-relaxed text-[var(--ac-text-muted)]">
                  No one to invite yet. Add people under Staff and set their dashboard role.
                </li>
              ) : (
                filteredStaff.map((o) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStaff(o);
                        setSelectedTeacher(null);
                      }}
                      className={`flex w-full flex-col gap-2 px-4 py-4 text-left transition hover:bg-white/[0.04] sm:flex-row sm:items-center sm:gap-4 ${
                        selectedStaff?.id === o.id ? 'bg-emerald-500/[0.08] ring-1 ring-inset ring-emerald-500/25' : ''
                      }`}
                    >
                      <span className="min-w-0 flex-1 text-base font-semibold text-[var(--ac-text-primary)] sm:text-[15px]">
                        {o.full_name}
                      </span>
                      <span className="inline-flex w-fit shrink-0 rounded-full bg-black/[0.06] px-2.5 py-0.5 text-xs font-medium capitalize text-[var(--ac-text-secondary)] dark:bg-white/10">
                        {o.staff_role?.replace(/_/g, ' ') || '—'}
                      </span>
                      <span className="min-w-0 text-sm text-[var(--ac-text-secondary)] sm:max-w-[220px] sm:truncate sm:text-right">
                        {o.email || <span className="italic text-[var(--ac-text-muted)]">No email yet</span>}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : (
            <ul className="divide-y divide-[var(--ac-border)] overflow-hidden rounded-xl border border-[var(--ac-border)]">
              {filteredTeachers.length === 0 ? (
                <li className="px-4 py-10 text-center text-sm leading-relaxed text-[var(--ac-text-muted)]">
                  {teachersNeedingInvite.length === 0
                    ? 'All teachers with emails may already have a login — or add teachers to the roster first.'
                    : 'No matches for your search.'}
                </li>
              ) : (
                filteredTeachers.map((t) => (
                  <li key={t.teacher_id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTeacher(t);
                        setSelectedStaff(null);
                      }}
                      className={`flex w-full flex-col gap-2 px-4 py-4 text-left transition hover:bg-white/[0.04] sm:flex-row sm:items-center sm:gap-4 ${
                        selectedTeacher?.teacher_id === t.teacher_id
                          ? 'bg-emerald-500/[0.08] ring-1 ring-inset ring-emerald-500/25'
                          : ''
                      }`}
                    >
                      <span className="min-w-0 flex-1 text-base font-semibold text-[var(--ac-text-primary)] sm:text-[15px]">
                        {t.name}
                      </span>
                      <span className="inline-flex w-fit shrink-0 rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-300">
                        Teacher
                      </span>
                      <span className="min-w-0 text-sm text-[var(--ac-text-secondary)] sm:max-w-[220px] sm:truncate sm:text-right">
                        {t.email || <span className="italic text-[var(--ac-text-muted)]">No email yet</span>}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}

          {(selectedTeacher || selectedStaff) && (
            <div className="sticky bottom-3 z-10 space-y-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/[0.08] to-teal-500/[0.06] p-4 shadow-lg shadow-black/5 backdrop-blur-md dark:shadow-black/30 sm:static sm:rounded-xl sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/25">
                  <Mail className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-[var(--ac-text-primary)]">
                    {selectedTeacher?.name || selectedStaff?.full_name}
                  </p>
                  <p className="mt-1 text-[13px] leading-snug text-[var(--ac-text-secondary)]">
                    We&apos;ll email their one-time password and save this address on their profile.
                  </p>
                </div>
              </div>
              <input
                type="email"
                inputMode="email"
                className="ac-input min-h-12 w-full rounded-xl px-4 py-3 text-base outline-none transition focus:ring-2 focus:ring-emerald-500/40 sm:text-[15px]"
                placeholder="name@school.com"
                value={emailDraft}
                onChange={(e) => setEmailDraft(e.target.value)}
                autoComplete="email"
              />
              <button
                type="button"
                disabled={sending}
                onClick={() => void sendInvite()}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 text-base font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:from-emerald-500 hover:to-teal-500 disabled:pointer-events-none disabled:opacity-50"
              >
                <UserCheck className="h-5 w-5 shrink-0 opacity-95" aria-hidden />
                {sending ? 'Sending…' : 'Send invitation email'}
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminPageWrapper>
  );
}
