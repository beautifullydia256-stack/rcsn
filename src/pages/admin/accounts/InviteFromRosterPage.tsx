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
            Same directory cards as Parents. Choose someone on your roster, confirm their email, and we send a one-time
            password plus sign-in link.
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

      <div className="par-view-toggle par-fu par-d1" style={{ marginBottom: 18 }}>
        <button
          type="button"
          className={`par-vbtn ${tab === 'staff' ? 'active' : ''}`}
          onClick={() => {
            setTab('staff');
            setSelectedTeacher(null);
            setSelectedStaff(null);
          }}
        >
          Staff &amp; other roles
        </button>
        <button
          type="button"
          className={`par-vbtn ${tab === 'teachers' ? 'active' : ''}`}
          onClick={() => {
            setTab('teachers');
            setSelectedTeacher(null);
            setSelectedStaff(null);
          }}
        >
          Teachers
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
      ) : tab === 'staff' ? (
        filteredStaff.length === 0 ? (
          <div className="par-empty par-fu par-d2">
            <div className="par-empty-sub">No one to invite yet. Add people under Staff and set their dashboard role.</div>
          </div>
        ) : (
          <div className="par-card-grid par-fu par-d2">
            {filteredStaff.map((o, i) => (
              <PwDirectoryUserCard
                key={o.id}
                name={o.full_name}
                subtitle={(o.staff_role || 'Staff').replace(/_/g, ' ')}
                cornerTone="teal"
                cornerLabel={(o.staff_role || 'Staff').replace(/_/g, ' ') || 'Staff'}
                initials={pwDirInitials(o.full_name)}
                avatarBackground={pwDirGrad(i)}
                statusDotActive={!o.linked_user_id}
                rows={[
                  {
                    label: 'Email',
                    value: o.email ? (
                      <span style={{ color: 'var(--blue)', fontSize: 12.5 }}>{o.email}</span>
                    ) : (
                      <span style={{ color: 'var(--t3)', fontStyle: 'italic' }}>No email yet</span>
                    ),
                  },
                ]}
                onCardClick={() => {
                  setSelectedStaff(o);
                  setSelectedTeacher(null);
                }}
                selected={selectedStaff?.id === o.id}
              />
            ))}
          </div>
        )
      ) : filteredTeachers.length === 0 ? (
        <div className="par-empty par-fu par-d2">
          <div className="par-empty-sub">
            {teachersNeedingInvite.length === 0
              ? 'All teachers may already have a login — or add teachers to the roster first.'
              : 'No matches for your search.'}
          </div>
        </div>
      ) : (
        <div className="par-card-grid par-fu par-d2">
          {filteredTeachers.map((t, i) => (
            <PwDirectoryUserCard
              key={t.teacher_id}
              name={t.name}
              subtitle="Teacher"
              cornerTone="violet"
              cornerLabel="Teacher"
              initials={pwDirInitials(t.name)}
              avatarBackground={pwDirGrad(i)}
              statusDotActive
              rows={[
                {
                  label: 'Email',
                  value: t.email ? (
                    <span style={{ color: 'var(--blue)', fontSize: 12.5 }}>{t.email}</span>
                  ) : (
                    <span style={{ color: 'var(--t3)', fontStyle: 'italic' }}>No email yet</span>
                  ),
                },
              ]}
              onCardClick={() => {
                setSelectedTeacher(t);
                setSelectedStaff(null);
              }}
              selected={selectedTeacher?.teacher_id === t.teacher_id}
            />
          ))}
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
