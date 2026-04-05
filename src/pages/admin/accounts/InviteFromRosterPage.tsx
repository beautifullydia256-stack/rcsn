import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, UserCheck } from 'lucide-react';
import PwParentsDirectoryShell from '@/components/admin/PwParentsDirectoryShell';
import PwDirectoryUserCard from '@/components/admin/PwDirectoryUserCard';
import { pwDirGrad, pwDirInitials } from '@/components/admin/pwDirectoryUtils';
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

type InviteFilter = 'all' | 'teachers' | 'other_staff';

type InviteRosterEntry =
  | { kind: 'teacher'; teacher: TeacherRow }
  | { kind: 'staff'; staff: OtherStaffRow };

export default function InviteFromRosterPage() {
  const authUser = useAuthStore((s) => s.user);
  const schoolIdFromStore = useAuthStore((s) => s.schoolId);
  const toast = useToast();
  const queryClient = useQueryClient();
  const [schoolId, setSchoolId] = useState<string | null>(() => schoolIdFromStore ?? null);
  /** False until we've tried store + DB for school_id (avoids flashing "No school linked" during hydration). */
  const [schoolResolved, setSchoolResolved] = useState(false);
  const [inviteFilter, setInviteFilter] = useState<InviteFilter>('all');
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

  /** Everyone who can still receive an invite (teachers without matching login + other staff unlinked). */
  const rosterEntries = useMemo((): InviteRosterEntry[] => {
    const teacherEntries: InviteRosterEntry[] = teachersNeedingInvite.map((t) => ({ kind: 'teacher', teacher: t }));
    const staffEntries: InviteRosterEntry[] = staffNeedingInvite.map((s) => ({ kind: 'staff', staff: s }));
    const merged = [...staffEntries, ...teacherEntries];
    merged.sort((a, b) => {
      const na = a.kind === 'teacher' ? a.teacher.name : a.staff.full_name;
      const nb = b.kind === 'teacher' ? b.teacher.name : b.staff.full_name;
      return na.localeCompare(nb, undefined, { sensitivity: 'base' });
    });
    return merged;
  }, [teachersNeedingInvite, staffNeedingInvite]);

  const filteredEntries = useMemo(() => {
    let list = rosterEntries;
    if (inviteFilter === 'teachers') list = list.filter((e) => e.kind === 'teacher');
    if (inviteFilter === 'other_staff') list = list.filter((e) => e.kind === 'staff');
    if (!q.trim()) return list;
    const s = q.toLowerCase();
    return list.filter((e) => {
      if (e.kind === 'teacher') {
        const t = e.teacher;
        return t.name.toLowerCase().includes(s) || (t.email || '').toLowerCase().includes(s) || 'teacher'.includes(s);
      }
      const o = e.staff;
      return (
        o.full_name.toLowerCase().includes(s) ||
        (o.email || '').toLowerCase().includes(s) ||
        (o.staff_role || '').toLowerCase().includes(s)
      );
    });
  }, [rosterEntries, inviteFilter, q]);

  useEffect(() => {
    if (selectedTeacher) {
      setEmailDraft(selectedTeacher.email?.trim() || '');
    } else if (selectedStaff) {
      setEmailDraft(selectedStaff.email?.trim() || '');
    } else {
      setEmailDraft('');
    }
  }, [selectedTeacher, selectedStaff]);

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
      await queryClient.invalidateQueries({ queryKey: ['admin', 'school-roster', schoolId] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'accounts', authUser?.id ?? ''] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Request failed.');
    } finally {
      setSending(false);
    }
  };

  if (!schoolResolved) {
    return (
      <PwParentsDirectoryShell>
        <div className="par-empty">
          <div className="par-empty-title">Loading your school context…</div>
        </div>
      </PwParentsDirectoryShell>
    );
  }

  if (!schoolId) {
    return (
      <PwParentsDirectoryShell>
        <div className="par-empty">
          <div className="par-empty-title">No school linked</div>
          <div className="par-empty-sub">
            Ask support to set your user&apos;s <code style={{ fontSize: 12 }}>school_id</code>.
          </div>
        </div>
      </PwParentsDirectoryShell>
    );
  }

  return (
    <PwParentsDirectoryShell>
      <div className="par-header par-fu">
        <div>
          <div className="par-eyebrow">User management</div>
          <h1 className="par-title">Send invitations</h1>
          <p className="par-sub">
            All teachers and other staff who still need a login are listed together. Each card shows their type; use the
            filters if you want to narrow the list.
          </p>
        </div>
        <div className="par-actions">
          <Link to="/dashboard/admin/staff" className="par-btn par-btn-ghost">
            Staff roster
          </Link>
          <Link to="/dashboard/admin/teachers?add=1" className="par-btn par-btn-ghost">
            Add teacher
          </Link>
          <Link to="/dashboard/admin/accounts" className="par-btn par-btn-violet">
            All users →
          </Link>
        </div>
      </div>

      <div className="par-fu par-d1" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
        <button
          type="button"
          className={inviteFilter === 'all' ? 'par-btn par-btn-sm par-btn-violet' : 'par-btn par-btn-sm par-btn-ghost'}
          onClick={() => {
            setInviteFilter('all');
            setSelectedTeacher(null);
            setSelectedStaff(null);
          }}
        >
          All ({rosterEntries.length})
        </button>
        <button
          type="button"
          className={inviteFilter === 'teachers' ? 'par-btn par-btn-sm par-btn-violet' : 'par-btn par-btn-sm par-btn-ghost'}
          onClick={() => {
            setInviteFilter('teachers');
            setSelectedTeacher(null);
            setSelectedStaff(null);
          }}
        >
          Teachers ({teachersNeedingInvite.length})
        </button>
        <button
          type="button"
          className={inviteFilter === 'other_staff' ? 'par-btn par-btn-sm par-btn-violet' : 'par-btn par-btn-sm par-btn-ghost'}
          onClick={() => {
            setInviteFilter('other_staff');
            setSelectedTeacher(null);
            setSelectedStaff(null);
          }}
        >
          Other staff ({staffNeedingInvite.length})
        </button>
      </div>

      <div className="par-toolbar par-fu par-d1">
        <div className="par-search" style={{ flex: '1 1 260px', maxWidth: '520px' }}>
          <span style={{ opacity: 0.75 }} aria-hidden>
            🔍
          </span>
          <input
            type="search"
            placeholder="Search name, email, role…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="par-empty par-fu par-d2">
          <div className="par-empty-title">Loading roster…</div>
        </div>
      ) : rosterEntries.length === 0 ? (
        <div className="par-empty par-fu par-d2">
          <div className="par-empty-sub">
            Everyone on your teacher and staff rosters may already have a login. Add people under Teachers or Staff if you
            need more.
          </div>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="par-empty par-fu par-d2">
          <div className="par-empty-sub">No one matches this filter or search. Try &quot;All&quot; or clear the search box.</div>
        </div>
      ) : (
        <div className="par-card-grid par-fu par-d2">
          {filteredEntries.map((entry, i) =>
            entry.kind === 'staff' ? (
              <PwDirectoryUserCard
                key={`staff:${entry.staff.id}`}
                name={entry.staff.full_name}
                subtitle={(entry.staff.staff_role || 'Staff').replace(/_/g, ' ')}
                cornerTone="teal"
                cornerLabel={(entry.staff.staff_role || 'Staff').replace(/_/g, ' ') || 'Staff'}
                initials={pwDirInitials(entry.staff.full_name)}
                avatarBackground={pwDirGrad(i)}
                statusDotActive={!entry.staff.linked_user_id}
                rows={[
                  {
                    label: 'Email',
                    value: entry.staff.email ? (
                      <span style={{ color: 'var(--blue)', fontSize: 12.5 }}>{entry.staff.email}</span>
                    ) : (
                      <span style={{ color: 'var(--t3)', fontStyle: 'italic' }}>No email yet</span>
                    ),
                  },
                ]}
                onCardClick={() => {
                  setSelectedStaff(entry.staff);
                  setSelectedTeacher(null);
                }}
                selected={selectedStaff?.id === entry.staff.id}
              />
            ) : (
              <PwDirectoryUserCard
                key={`teacher:${entry.teacher.teacher_id}`}
                name={entry.teacher.name}
                subtitle="Teacher"
                cornerTone="violet"
                cornerLabel="Teacher"
                initials={pwDirInitials(entry.teacher.name)}
                avatarBackground={pwDirGrad(i)}
                statusDotActive
                rows={[
                  {
                    label: 'Email',
                    value: entry.teacher.email ? (
                      <span style={{ color: 'var(--blue)', fontSize: 12.5 }}>{entry.teacher.email}</span>
                    ) : (
                      <span style={{ color: 'var(--t3)', fontStyle: 'italic' }}>No email yet</span>
                    ),
                  },
                ]}
                onCardClick={() => {
                  setSelectedTeacher(entry.teacher);
                  setSelectedStaff(null);
                }}
                selected={selectedTeacher?.teacher_id === entry.teacher.teacher_id}
              />
            )
          )}
        </div>
      )}

      {selectedTeacher || selectedStaff ? (
        <div className="par-pcard par-fu par-d3" style={{ cursor: 'default', marginTop: 24 }} onClick={(e) => e.stopPropagation()}>
          <div className="par-pcard-top">
            <div className="par-pcard-av" style={{ background: 'linear-gradient(135deg,#27e09f,#3d7eff)' }}>
              <Mail className="h-5 w-5 text-white" aria-hidden />
            </div>
            <div className="par-pcard-name">Send invitation email</div>
            <div className="par-pcard-rel">
              {selectedTeacher?.name || selectedStaff?.full_name} · We&apos;ll save this address on their profile
            </div>
          </div>
          <div className="par-pcard-body">
            <div className="par-pcard-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <span className="par-pcard-label">Email</span>
              <div className="par-search" style={{ maxWidth: 'none', marginTop: 8 }}>
                <span style={{ opacity: 0.75 }} aria-hidden>
                  ✉
                </span>
                <input
                  type="email"
                  inputMode="email"
                  placeholder="name@school.com"
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>
          </div>
          <div className="par-pcard-foot">
            <button
              type="button"
              className="par-crd-btn par-crd-primary"
              disabled={sending}
              onClick={() => void sendInvite()}
            >
              <UserCheck className="h-4 w-4" aria-hidden />
              {sending ? 'Sending…' : 'Send invitation email'}
            </button>
          </div>
        </div>
      ) : null}
    </PwParentsDirectoryShell>
  );
}
