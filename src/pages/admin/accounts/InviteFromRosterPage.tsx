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
  const toast = useToast();
  const queryClient = useQueryClient();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [tab, setTab] = useState<'staff' | 'teachers'>('staff');
  const [q, setQ] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherRow | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<OtherStaffRow | null>(null);
  const [emailDraft, setEmailDraft] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!authUser?.id) return;
      const { data } = await supabase.from('users').select('school_id').eq('user_id', authUser.id).single();
      setSchoolId(data?.school_id ?? null);
    };
    run();
  }, [authUser?.id]);

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
        headers: { 'Content-Type': 'application/json' },
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

  if (!schoolId) {
    return (
      <AdminPageWrapper title="Send invitations">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">No school linked.</div>
      </AdminPageWrapper>
    );
  }

  return (
    <AdminPageWrapper
      title="Send invitations"
      subtitle="Only people already on your roster can get a login. Add non-teacher roles under Staff, teachers under Teachers — then invite them here. We only send email invitations (they set their own password)."
    >
      <div className="max-w-4xl space-y-6">
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            to="/dashboard/admin/staff"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--ac-border)] bg-white/5 px-4 py-2 font-medium ac-text-primary hover:bg-white/10"
          >
            <Users className="h-4 w-4" />
            Staff (other roles)
          </Link>
          <Link
            to="/dashboard/admin/teachers?add=1"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--ac-border)] bg-white/5 px-4 py-2 font-medium ac-text-primary hover:bg-white/10"
          >
            Add teacher
          </Link>
          <Link to="/dashboard/admin/accounts" className="inline-flex items-center gap-2 rounded-xl px-4 py-2 ac-text-secondary hover:ac-text-primary">
            All users →
          </Link>
        </div>

        <div className={`${adminCardClass} space-y-4`}>
          <div className="flex flex-wrap gap-2 border-b border-[var(--ac-border)] pb-3">
            <button
              type="button"
              onClick={() => {
                setTab('staff');
                setSelectedTeacher(null);
                setSelectedStaff(null);
              }}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === 'staff' ? 'bg-emerald-600 text-white' : 'ac-text-secondary'}`}
            >
              Staff team (other dashboards)
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('teachers');
                setSelectedTeacher(null);
                setSelectedStaff(null);
              }}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === 'teachers' ? 'bg-emerald-600 text-white' : 'ac-text-secondary'}`}
            >
              Teachers
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ac-text-muted" />
            <input
              type="search"
              placeholder="Search by name or email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="ac-input w-full rounded-xl py-2 pl-10 pr-3 text-sm"
            />
          </div>

          {isLoading ? (
            <p className="ac-text-muted py-8 text-sm">Loading roster…</p>
          ) : tab === 'staff' ? (
            <ul className="divide-y divide-[var(--ac-border)] rounded-xl border border-[var(--ac-border)] overflow-hidden">
              {filteredStaff.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm ac-text-muted">
                  No one to invite. Add people under Staff first and set their dashboard role.
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
                      className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-white/5 ${
                        selectedStaff?.id === o.id ? 'bg-emerald-500/10' : ''
                      }`}
                    >
                      <span className="font-medium ac-text-primary">{o.full_name}</span>
                      <span className="text-xs ac-text-muted capitalize">{o.staff_role?.replace(/_/g, ' ') || '—'}</span>
                      <span className="truncate text-xs ac-text-secondary max-w-[200px]">{o.email || 'No email yet'}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : (
            <ul className="divide-y divide-[var(--ac-border)] rounded-xl border border-[var(--ac-border)] overflow-hidden">
              {filteredTeachers.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm ac-text-muted">
                  {teachersNeedingInvite.length === 0
                    ? 'All teachers with emails already have a login, or add teachers first.'
                    : 'No matches.'}
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
                      className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-white/5 ${
                        selectedTeacher?.teacher_id === t.teacher_id ? 'bg-emerald-500/10' : ''
                      }`}
                    >
                      <span className="font-medium ac-text-primary">{t.name}</span>
                      <span className="text-xs text-sky-600 dark:text-sky-400">Teacher</span>
                      <span className="truncate text-xs ac-text-secondary max-w-[200px]">{t.email || 'No email yet'}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}

          {(selectedTeacher || selectedStaff) && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Mail className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium ac-text-primary">
                    {selectedTeacher?.name || selectedStaff?.full_name}
                  </p>
                  <p className="text-xs ac-text-secondary mt-1">
                    Invitation email (saved to their profile when you send)
                  </p>
                </div>
              </div>
              <input
                type="email"
                className="ac-input w-full rounded-xl px-3 py-2 text-sm"
                placeholder="name@school.com"
                value={emailDraft}
                onChange={(e) => setEmailDraft(e.target.value)}
              />
              <button
                type="button"
                disabled={sending}
                onClick={() => void sendInvite()}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <UserCheck className="h-4 w-4" />
                {sending ? 'Sending…' : 'Send invitation'}
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminPageWrapper>
  );
}
