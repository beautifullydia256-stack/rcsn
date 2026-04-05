import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, UserPlus } from 'lucide-react';
import NativeModal from '@/components/NativeModal';
import PwParentsDirectoryShell from '@/components/admin/PwParentsDirectoryShell';
import PwDirectoryUserCard from '@/components/admin/PwDirectoryUserCard';
import { pwDirGrad, pwDirInitials, pwRoleToChipTone } from '@/components/admin/pwDirectoryUtils';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { STAFF_ROSTER_ROLES } from '@/lib/staffRosterRoles';
import { AddSchoolStaffForm } from '@/pages/admin/staff/AddSchoolStaffForm';

const STALE_MS = 60 * 1000;

const PAY_OPTIONS = [
  { value: '', label: '—' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'termly', label: 'Per term' },
  { value: 'annual', label: 'Annual' },
  { value: 'custom', label: 'Custom / other' },
];

type OtherStaffRow = {
  id: string;
  full_name: string;
  job_title: string | null;
  department: string | null;
  national_id: string | null;
  phone: string | null;
  email: string | null;
  staff_role: string | null;
  linked_user_id: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  notes: string | null;
  hire_date: string | null;
  salary_amount: number | null;
  pay_frequency: string | null;
  photo_url: string | null;
  created_at: string;
};

async function fetchOtherStaffRows(schoolId: string): Promise<OtherStaffRow[]> {
  const { data, error } = await supabase
    .from('other_staff_members')
    .select(
      'id, full_name, job_title, department, national_id, phone, email, staff_role, linked_user_id, address, emergency_contact_name, emergency_contact_phone, notes, hire_date, salary_amount, pay_frequency, photo_url, created_at'
    )
    .eq('school_id', schoolId)
    .order('full_name');
  if (error) throw error;
  return (data || []) as OtherStaffRow[];
}

/** @deprecated Prefer fetchSchoolRoster — kept for callers that only need other_staff_members. */
export async function fetchOtherStaff(schoolId: string): Promise<OtherStaffRow[]> {
  return fetchOtherStaffRows(schoolId);
}

export type SchoolRosterRow = {
  rowKey: string;
  kind: 'teacher' | 'other_staff';
  id: string;
  full_name: string;
  job_title: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  staff_role: string | null;
  linked_user_id: string | null;
  pay_frequency: string | null;
  salary_amount: number | null;
  /** Profile photo (teachers & other staff when set). */
  photo_url: string | null;
};

/**
 * School-wide roster (parents excluded): `teachers` plus `other_staff_members`, with login from `users.linked_teacher_id` / `linked_user_id`.
 */
export async function fetchSchoolRoster(schoolId: string): Promise<SchoolRosterRow[]> {
  const [teachersRes, otherRows, usersRes] = await Promise.all([
    supabase
      .from('teachers')
      .select('teacher_id, name, phone, email, salary, pay_frequency, photo_url, created_at')
      .eq('school_id', schoolId)
      .order('name'),
    fetchOtherStaffRows(schoolId),
    supabase
      .from('users')
      .select('user_id, linked_teacher_id')
      .eq('school_id', schoolId)
      .eq('role', 'teacher')
      .not('linked_teacher_id', 'is', null),
  ]);

  if (teachersRes.error) throw teachersRes.error;
  if (usersRes.error) throw usersRes.error;

  const teacherToUser = new Map<string, string>();
  for (const u of usersRes.data || []) {
    const tid = u.linked_teacher_id as string | null;
    if (tid) teacherToUser.set(tid, u.user_id as string);
  }

  const teacherEntries: SchoolRosterRow[] = (teachersRes.data || []).map((t) => ({
    rowKey: `teacher:${t.teacher_id}`,
    kind: 'teacher',
    id: t.teacher_id as string,
    full_name: String(t.name || ''),
    job_title: null,
    department: null,
    email: t.email != null ? String(t.email) : null,
    phone: t.phone != null ? String(t.phone) : null,
    staff_role: null,
    linked_user_id: teacherToUser.get(t.teacher_id as string) ?? null,
    pay_frequency: t.pay_frequency != null ? String(t.pay_frequency) : null,
    salary_amount: t.salary != null ? Number(t.salary) : null,
    photo_url: t.photo_url != null ? String(t.photo_url) : null,
  }));

  const otherEntries: SchoolRosterRow[] = otherRows.map((r) => ({
    rowKey: `other:${r.id}`,
    kind: 'other_staff',
    id: r.id,
    full_name: r.full_name,
    job_title: r.job_title,
    department: r.department,
    email: r.email,
    phone: r.phone,
    staff_role: r.staff_role,
    linked_user_id: r.linked_user_id,
    pay_frequency: r.pay_frequency,
    salary_amount: r.salary_amount,
    photo_url: r.photo_url,
  }));

  return [...teacherEntries, ...otherEntries].sort((a, b) =>
    a.full_name.localeCompare(b.full_name, undefined, { sensitivity: 'base' })
  );
}

type LoginFilter = 'all' | 'linked' | 'unlinked';

export default function StaffPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const addModalOpen = searchParams.get('add') === '1';

  const closeAddModal = () => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.delete('add');
        return p;
      },
      { replace: true }
    );
  };

  const queryClient = useQueryClient();
  const authUser = useAuthStore((s) => s.user);
  const schoolIdFromStore = useAuthStore((s) => s.schoolId);
  const setSchoolIdStore = useAuthStore((s) => s.setSchoolId);

  const [schoolId, setSchoolId] = useState<string | null>(() => schoolIdFromStore ?? null);
  /** Wait for auth store + DB before treating missing school as real. */
  const [schoolResolved, setSchoolResolved] = useState(false);

  const [loginFilter, setLoginFilter] = useState<LoginFilter>('all');
  const [q, setQ] = useState('');

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
      if (sid) setSchoolIdStore(sid);
      setSchoolResolved(true);
    };
    void run();
  }, [authUser?.id, schoolIdFromStore, setSchoolIdStore]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['admin', 'school-roster', schoolId],
    queryFn: () => fetchSchoolRoster(schoolId!),
    enabled: !!schoolId,
    staleTime: STALE_MS,
  });

  const dashLabel = (role: string | null) =>
    STAFF_ROSTER_ROLES.find((x) => x.value === role)?.label || (role ? role.replace(/_/g, ' ') : null);

  const kpiLinked = useMemo(() => rows.filter((r) => r.linked_user_id).length, [rows]);
  const kpiUnlinked = useMemo(() => rows.filter((r) => !r.linked_user_id).length, [rows]);

  const filteredRows = useMemo(() => {
    let list = rows;
    if (loginFilter === 'linked') list = list.filter((r) => !!r.linked_user_id);
    if (loginFilter === 'unlinked') list = list.filter((r) => !r.linked_user_id);
    const s = q.trim().toLowerCase();
    if (s) {
      list = list.filter((r) => {
        const roleStr =
          r.kind === 'teacher'
            ? 'teacher teaching'
            : [
                r.staff_role || '',
                dashLabel(r.staff_role) || '',
                r.job_title || '',
                r.department || '',
              ].join(' ');
        return (
          r.full_name.toLowerCase().includes(s) ||
          roleStr.toLowerCase().includes(s) ||
          (r.email || '').toLowerCase().includes(s) ||
          (r.phone || '').toLowerCase().includes(s)
        );
      });
    }
    return list;
  }, [rows, loginFilter, q]);

  const invalidateRoster = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'school-roster', schoolId] });
    await queryClient.invalidateQueries({ queryKey: ['admin', 'other-staff', schoolId] });
    if (authUser?.id) {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'teachers', authUser.id] });
    }
  };

  const handleDeleteOther = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from other staff records?`)) return;
    const { error } = await supabase.from('other_staff_members').delete().eq('id', id);
    if (error) {
      alert(error.message);
      return;
    }
    await invalidateRoster();
  };

  const handleDeleteTeacher = async (teacherId: string, name: string) => {
    if (!confirm(`Delete teacher "${name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('teachers').delete().eq('teacher_id', teacherId);
    if (error) {
      alert(error.message);
      return;
    }
    await invalidateRoster();
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
    <>
    <PwParentsDirectoryShell>
      <div className="par-header par-fu">
        <div>
          <div className="par-eyebrow">Management</div>
          <h1 className="par-title">Staff</h1>
          <p className="par-sub">
            Unified roster for your school: <strong>teachers</strong> (from <code style={{ fontSize: 12 }}>teachers</code>)
            and <strong>non-teaching staff</strong> (from <code style={{ fontSize: 12 }}>other_staff_members</code>).
            Parents and students are not listed here. A login shows as &quot;Linked&quot; when their{' '}
            <code style={{ fontSize: 12 }}>users</code> row is connected (
            <code style={{ fontSize: 12 }}>linked_teacher_id</code> or <code style={{ fontSize: 12 }}>linked_user_id</code>
            ). Open a teacher&apos;s <strong>profile</strong> to edit full teaching details or send an invite — it is the same
            database row. Non-teaching rows use <strong>Send invitations</strong> and expenses may use{' '}
            <code style={{ fontSize: 12 }}>linked_other_staff_id</code>.
          </p>
        </div>
        <div className="par-actions">
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/staff?add=1')}
            className="par-btn par-btn-violet inline-flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
            Add school staff
          </button>
          <Link to="/dashboard/admin/accounts/invite" className="par-btn par-btn-violet">
            📨 Send invitations
          </Link>
          <Link to="/dashboard/admin/accounts" className="par-btn par-btn-ghost">
            All users
          </Link>
        </div>
      </div>

      <div className="par-kpi-strip par-fu par-d1">
        <div className="par-kpi cv">
          <div className="par-kpi-ic cv">👥</div>
          <div>
            <div className="par-kpi-label">On file</div>
            <div className="par-kpi-val cv">{rows.length}</div>
            <div className="par-kpi-sub">Teachers + other staff</div>
          </div>
        </div>
        <div className="par-kpi cg">
          <div className="par-kpi-ic cg">✓</div>
          <div>
            <div className="par-kpi-label">With login</div>
            <div className="par-kpi-val cg">{kpiLinked}</div>
            <div className="par-kpi-sub">Linked accounts</div>
          </div>
        </div>
        <div className="par-kpi ca">
          <div className="par-kpi-ic ca">○</div>
          <div>
            <div className="par-kpi-label">No login yet</div>
            <div className="par-kpi-val ca">{kpiUnlinked}</div>
            <div className="par-kpi-sub">Invite when ready</div>
          </div>
        </div>
      </div>

      <div className="par-toolbar par-fu par-d3">
        <div className="par-search" style={{ flex: '1 1 260px', maxWidth: '520px' }}>
          <span style={{ opacity: 0.75 }} aria-hidden>
            🔍
          </span>
          <input type="search" placeholder="Search name, job, email, role…" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
        </div>
      </div>

      <div className="par-fu par-d3" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
        <button
          type="button"
          className={loginFilter === 'all' ? 'par-btn par-btn-sm par-btn-violet' : 'par-btn par-btn-sm par-btn-ghost'}
          onClick={() => setLoginFilter('all')}
        >
          All ({rows.length})
        </button>
        <button
          type="button"
          className={loginFilter === 'unlinked' ? 'par-btn par-btn-sm par-btn-violet' : 'par-btn par-btn-sm par-btn-ghost'}
          onClick={() => setLoginFilter('unlinked')}
        >
          No login ({kpiUnlinked})
        </button>
        <button
          type="button"
          className={loginFilter === 'linked' ? 'par-btn par-btn-sm par-btn-violet' : 'par-btn par-btn-sm par-btn-ghost'}
          onClick={() => setLoginFilter('linked')}
        >
          Linked ({kpiLinked})
        </button>
      </div>

      {isLoading ? (
        <div className="par-empty par-fu par-d4">
          <div className="par-empty-title">Loading staff…</div>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="par-empty par-fu par-d4">
          <div className="par-empty-title">{rows.length === 0 ? 'No staff on file yet' : 'No matches'}</div>
          <div className="par-empty-sub">
            {rows.length === 0
              ? 'Teachers appear from the Teachers directory. Use Add school staff for non-teaching roles, or add teachers from the Teachers page.'
              : 'Try clearing search or showing All.'}
          </div>
        </div>
      ) : (
        <div className="par-card-grid par-fu par-d4">
          {filteredRows.map((r, i) => {
            const isTeacher = r.kind === 'teacher';
            const roleLabel = isTeacher ? 'Teacher' : dashLabel(r.staff_role) || 'Non-teaching';
            const subtitle = isTeacher
              ? 'Teaching staff'
              : r.job_title || r.department || (r.staff_role ? roleLabel : 'Other staff');
            const payLbl = PAY_OPTIONS.find((p) => p.value === (r.pay_frequency || ''))?.label;
            const cornerTone = isTeacher ? pwRoleToChipTone('teacher') : r.staff_role ? pwRoleToChipTone(r.staff_role) : 'muted';
            const profilePath = isTeacher
              ? `/dashboard/admin/teachers/${r.id}`
              : `/dashboard/admin/staff/member/${r.id}`;
            return (
              <PwDirectoryUserCard
                key={r.rowKey}
                name={r.full_name}
                subtitle={subtitle}
                cornerTone={cornerTone}
                cornerLabel={roleLabel}
                initials={pwDirInitials(r.full_name)}
                avatarBackground={pwDirGrad(i)}
                avatarUrl={r.photo_url}
                statusDotActive={!!r.linked_user_id}
                onCardClick={() => navigate(profilePath)}
                rows={[
                  {
                    label: 'Email',
                    value: r.email ? (
                      <a href={`mailto:${r.email}`} className="par-contact-link email" onClick={(e) => e.stopPropagation()}>
                        {r.email}
                      </a>
                    ) : (
                      <span style={{ color: 'var(--t3)', fontStyle: 'italic' }}>—</span>
                    ),
                  },
                  {
                    label: 'Phone',
                    value: r.phone ? (
                      <a href={`tel:${r.phone}`} className="par-contact-link phone" onClick={(e) => e.stopPropagation()}>
                        {r.phone}
                      </a>
                    ) : (
                      '—'
                    ),
                  },
                  {
                    label: 'Login',
                    value: r.linked_user_id ? (
                      <span className="par-chip green" style={{ fontSize: 11 }}>
                        Linked
                      </span>
                    ) : (
                      <span className="par-chip muted" style={{ fontSize: 11 }}>
                        No login
                      </span>
                    ),
                  },
                  {
                    label: 'Salary ref.',
                    value: r.salary_amount != null ? Number(r.salary_amount).toLocaleString() : '—',
                  },
                  {
                    label: 'Pay',
                    value: payLbl && payLbl !== '—' ? payLbl : '—',
                  },
                ]}
                footer={
                  isTeacher ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', width: '100%' }}>
                      <Link
                        to={profilePath}
                        className="par-crd-btn par-crd-primary"
                        style={{ flex: '1 1 auto' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        View profile
                      </Link>
                      <button
                        type="button"
                        className="par-crd-btn par-crd-ghost"
                        style={{ color: 'var(--rose)', flex: '0 0 auto' }}
                        onClick={() => void handleDeleteTeacher(r.id, r.full_name)}
                        title="Delete teacher"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', width: '100%' }}>
                      <Link
                        to={profilePath}
                        className="par-crd-btn par-crd-primary"
                        style={{ flex: '1 1 auto' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        View profile
                      </Link>
                      <button
                        type="button"
                        className="par-crd-btn par-crd-ghost"
                        style={{ color: 'var(--rose)', flex: '0 0 auto' }}
                        onClick={() => void handleDeleteOther(r.id, r.full_name)}
                        title="Remove record"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  )
                }
              />
            );
          })}
        </div>
      )}
    </PwParentsDirectoryShell>

    <NativeModal isOpen={addModalOpen} onClose={closeAddModal} title="Add school staff" size="lg">
      <AddSchoolStaffForm
        schoolId={schoolId}
        onCompleted={() => {
          closeAddModal();
          void invalidateRoster();
        }}
        onCancel={closeAddModal}
      />
    </NativeModal>
    </>
  );
}
