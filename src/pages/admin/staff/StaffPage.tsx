import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import PwParentsDirectoryShell from '@/components/admin/PwParentsDirectoryShell';
import PwDirectoryUserCard from '@/components/admin/PwDirectoryUserCard';
import { pwDirGrad, pwDirInitials, pwRoleToChipTone } from '@/components/admin/pwDirectoryUtils';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { STAFF_ROSTER_ROLES } from '@/lib/staffRosterRoles';
import { isValidRealEmail } from '@/lib/realEmail';

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
  created_at: string;
};

async function fetchOtherStaffRows(schoolId: string): Promise<OtherStaffRow[]> {
  const { data, error } = await supabase
    .from('other_staff_members')
    .select(
      'id, full_name, job_title, department, national_id, phone, email, staff_role, linked_user_id, address, emergency_contact_name, emergency_contact_phone, notes, hire_date, salary_amount, pay_frequency, created_at'
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
};

/**
 * School-wide roster (parents excluded): `teachers` plus `other_staff_members`, with login from `users.linked_teacher_id` / `linked_user_id`.
 */
export async function fetchSchoolRoster(schoolId: string): Promise<SchoolRosterRow[]> {
  const [teachersRes, otherRows, usersRes] = await Promise.all([
    supabase
      .from('teachers')
      .select('teacher_id, name, phone, email, salary, pay_frequency, created_at')
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
  }));

  return [...teacherEntries, ...otherEntries].sort((a, b) =>
    a.full_name.localeCompare(b.full_name, undefined, { sensitivity: 'base' })
  );
}

type LoginFilter = 'all' | 'linked' | 'unlinked';

/** Will they receive a dashboard login or stay on file only? */
type StaffRecordIntent = 'login' | 'support';

/** Teaching vs non-teaching — both use real tables (`teachers` vs `other_staff_members`). */
type RosterKind = 'teacher' | 'non_teaching';

const fieldStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--s2)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--rs)',
  color: 'var(--t1)',
  fontFamily: "'Geist',sans-serif",
  fontSize: 13,
  padding: '10px 12px',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: '0.8px',
  textTransform: 'uppercase',
  color: 'var(--t3)',
  marginBottom: 6,
  display: 'block',
};

export default function StaffPage() {
  const queryClient = useQueryClient();
  const authUser = useAuthStore((s) => s.user);
  const schoolIdFromStore = useAuthStore((s) => s.schoolId);
  const setSchoolIdStore = useAuthStore((s) => s.setSchoolId);

  const [schoolId, setSchoolId] = useState<string | null>(() => schoolIdFromStore ?? null);
  /** Wait for auth store + DB before treating missing school as real. */
  const [schoolResolved, setSchoolResolved] = useState(false);

  const [loginFilter, setLoginFilter] = useState<LoginFilter>('all');
  const [q, setQ] = useState('');

  const [recordIntent, setRecordIntent] = useState<StaffRecordIntent | null>(null);
  const [rosterKind, setRosterKind] = useState<RosterKind | null>(null);
  const [fullName, setFullName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [salaryAmount, setSalaryAmount] = useState('');
  const [payFrequency, setPayFrequency] = useState('');
  const [staffRole, setStaffRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  const resetForm = () => {
    setRecordIntent(null);
    setRosterKind(null);
    setFullName('');
    setJobTitle('');
    setDepartment('');
    setNationalId('');
    setPhone('');
    setEmail('');
    setAddress('');
    setEmergencyName('');
    setEmergencyPhone('');
    setNotes('');
    setHireDate('');
    setSalaryAmount('');
    setPayFrequency('');
    setStaffRole('');
    setFormError(null);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (recordIntent == null) {
      setFormError('Start by choosing how this person is recorded: dashboard login or on-file only.');
      return;
    }
    if (rosterKind == null) {
      setFormError('Choose whether they are teaching staff or non-teaching staff.');
      return;
    }
    const name = fullName.trim();
    if (!name) {
      setFormError('Full name is required.');
      return;
    }
    if (!schoolId) {
      setFormError('No school linked to your account.');
      return;
    }

    if (rosterKind === 'teacher') {
      const em = email.trim();
      if (!isValidRealEmail(em)) {
        setFormError('Enter a valid email for this teacher (same record as the Teachers page; used for invitations).');
        return;
      }
      setSaving(true);
      try {
        const { error } = await supabase.from('teachers').insert({
          school_id: schoolId,
          name,
          email: em,
          phone: phone.trim() || null,
          address: address.trim() || null,
          national_id: nationalId.trim() || null,
          salary: salaryAmount ? Number(salaryAmount) : null,
          pay_frequency: payFrequency || null,
          ...(hireDate ? { date_of_hire: hireDate } : {}),
        });
        if (error) throw error;
        resetForm();
        await invalidateRoster();
      } catch (err: unknown) {
        setFormError(err instanceof Error ? err.message : 'Could not save teacher.');
      } finally {
        setSaving(false);
      }
      return;
    }

    if (recordIntent === 'login' && !staffRole.trim()) {
      setFormError('Choose a dashboard role (e.g. Accountant).');
      return;
    }

    const isDashboard = recordIntent === 'login';
    const jobOut = jobTitle.trim() || null;
    const deptOut = isDashboard ? department.trim() || null : null;
    const roleOut = isDashboard ? staffRole.trim() || null : null;
    setSaving(true);
    try {
      const { error } = await supabase.from('other_staff_members').insert({
        school_id: schoolId,
        full_name: name,
        job_title: jobOut,
        department: deptOut,
        national_id: nationalId.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        staff_role: roleOut,
        address: address.trim() || null,
        emergency_contact_name: emergencyName.trim() || null,
        emergency_contact_phone: emergencyPhone.trim() || null,
        notes: notes.trim() || null,
        hire_date: hireDate || null,
        salary_amount: salaryAmount ? Number(salaryAmount) : null,
        pay_frequency: payFrequency || null,
      });
      if (error) throw error;
      resetForm();
      await invalidateRoster();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
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
          <Link to="/dashboard/admin/teachers?add=1" className="par-btn par-btn-ghost">
            ＋ Add teacher (full form)
          </Link>
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

      <div className="par-pcard par-fu par-d2" style={{ cursor: 'default' }}>
        <div className="par-pcard-top">
          <div className="par-pcard-name">Add to roster</div>
          <div className="par-pcard-rel">
            Step 1: login vs on-file. Step 2: teaching vs non-teaching. Teachers save to the same table as the Teachers
            directory; accountants, drivers, etc. save to other staff. Job title and department apply to non-teaching
            dashboard roles only.
          </div>
        </div>
        <div className="par-pcard-body">
          <form onSubmit={handleAdd} className="space-y-4">
            {formError ? (
              <div
                className="par-chip rose"
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px' }}
              >
                {formError}
              </div>
            ) : null}

            <div style={{ marginBottom: 8 }}>
              <label style={{ ...labelStyle, marginBottom: 10 }}>1 — Will they use a dashboard login?</label>
              <p style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 10, lineHeight: 1.45 }}>
                Choose first. <strong>Yes</strong> means you plan to invite them to the app when ready. <strong>No</strong> is
                for people who stay on file only (e.g. some drivers). This does not change which database table they use —
                teaching vs non-teaching is the next step.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <button
                  type="button"
                  className={recordIntent === 'login' ? 'par-btn par-btn-violet' : 'par-btn par-btn-ghost'}
                  onClick={() => {
                    setRecordIntent('login');
                    setRosterKind(null);
                    setFormError(null);
                  }}
                >
                  Yes — dashboard login (invite later)
                </button>
                <button
                  type="button"
                  className={recordIntent === 'support' ? 'par-btn par-btn-violet' : 'par-btn par-btn-ghost'}
                  onClick={() => {
                    setRecordIntent('support');
                    setRosterKind(null);
                    setStaffRole('');
                    setDepartment('');
                    setFormError(null);
                  }}
                >
                  No — on file only (no login)
                </button>
              </div>
            </div>

            {recordIntent != null ? (
              <>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ ...labelStyle, marginBottom: 10 }}>2 — Teaching or non-teaching?</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    <button
                      type="button"
                      className={rosterKind === 'teacher' ? 'par-btn par-btn-violet' : 'par-btn par-btn-ghost'}
                      onClick={() => {
                        setRosterKind('teacher');
                        setStaffRole('');
                        setDepartment('');
                        setJobTitle('');
                        setFormError(null);
                      }}
                    >
                      Teaching staff
                    </button>
                    <button
                      type="button"
                      className={rosterKind === 'non_teaching' ? 'par-btn par-btn-violet' : 'par-btn par-btn-ghost'}
                      onClick={() => {
                        setRosterKind('non_teaching');
                        setFormError(null);
                      }}
                    >
                      Non-teaching staff
                    </button>
                  </div>
                </div>

                {rosterKind === 'teacher' ? (
                  <div
                    className="par-chip muted"
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 14px', marginBottom: 4 }}
                  >
                    <strong style={{ color: 'var(--t2)' }}>Teacher record</strong>
                    <span style={{ display: 'block', marginTop: 6, fontSize: 12.5, color: 'var(--t3)', fontWeight: 500 }}>
                      Saves to <code style={{ fontSize: 11 }}>teachers</code>. Open their profile for classes, subjects,
                      documents, and invitations — everything stays on that row.
                    </span>
                  </div>
                ) : null}

                {rosterKind === 'non_teaching' ? (
                  recordIntent === 'login' ? (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>Dashboard role</label>
                      <p style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 6 }}>
                        Stored in                         <code style={{ fontSize: 11 }}>staff_role</code> on{' '}
                        <code style={{ fontSize: 11 }}>other_staff_members</code>.
                      </p>
                      <select
                        style={{ ...fieldStyle, cursor: 'pointer' }}
                        value={staffRole}
                        onChange={(e) => setStaffRole(e.target.value)}
                        required={recordIntent === 'login' && rosterKind === 'non_teaching'}
                      >
                        <option value="">— Select role —</option>
                        {STAFF_ROSTER_ROLES.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div
                      className="par-chip muted"
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 14px', marginBottom: 4 }}
                    >
                      <strong style={{ color: 'var(--t2)' }}>On-file only (non-teaching)</strong>
                      <span style={{ display: 'block', marginTop: 6, fontSize: 12.5, color: 'var(--t3)', fontWeight: 500 }}>
                        <code style={{ fontSize: 11 }}>staff_role</code> stays empty. Optionally describe what they do below.
                      </span>
                    </div>
                  )
                ) : null}

                {rosterKind != null ? (
                  <div
                    style={{
                      borderTop: '1px solid var(--border)',
                      paddingTop: 16,
                      marginTop: 4,
                    }}
                  >
                    <label style={{ ...labelStyle, marginBottom: 10 }}>3 — Identity &amp; details</label>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                        gap: 14,
                      }}
                    >
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={labelStyle}>
                          Full name <span style={{ color: 'var(--rose)' }}>*</span>
                        </label>
              <input style={fieldStyle} value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Full name" />
                      </div>

                      {rosterKind === 'non_teaching' && recordIntent === 'login' ? (
                        <>
                          <div>
                            <label style={labelStyle}>Job title</label>
                            <p style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 6 }}>Their day-to-day title at school.</p>
                            <input style={fieldStyle} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Senior accountant" />
                          </div>
                          <div>
                            <label style={labelStyle}>Department / unit</label>
                            <p style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 6 }}>Office or unit.</p>
                            <input style={fieldStyle} value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Finance office" />
                          </div>
                        </>
                      ) : null}

                      {rosterKind === 'non_teaching' && recordIntent === 'support' ? (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={labelStyle}>What they do (optional)</label>
                          <input
                            style={fieldStyle}
                            value={jobTitle}
                            onChange={(e) => setJobTitle(e.target.value)}
                            placeholder="e.g. Driver, Security — one short line"
                          />
                        </div>
                      ) : null}

                      <div>
                        <label style={labelStyle}>Phone</label>
                        <input style={fieldStyle} value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
                      </div>
                      <div>
                        <label style={labelStyle}>Email{rosterKind === 'teacher' ? ' *' : ''}</label>
                        <input
                          style={fieldStyle}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          type="email"
                          placeholder={
                            rosterKind === 'teacher'
                              ? 'Required — record & invitations'
                              : recordIntent === 'login'
                                ? 'Use before invitation'
                                : 'Optional'
                          }
                          required={rosterKind === 'teacher'}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>National ID</label>
                        <input style={fieldStyle} value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={labelStyle}>Address</label>
                        <input style={fieldStyle} value={address} onChange={(e) => setAddress(e.target.value)} />
                      </div>
                      <div>
                        <label style={labelStyle}>Emergency name</label>
                        <input style={fieldStyle} value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} />
                      </div>
                      <div>
                        <label style={labelStyle}>Emergency phone</label>
                        <input style={fieldStyle} value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} />
                      </div>
                      <div>
                        <label style={labelStyle}>Hire date</label>
                        <input style={fieldStyle} type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
                      </div>
                      <div>
                        <label style={labelStyle}>Salary (reference)</label>
                        <input style={fieldStyle} type="number" min={0} step={1000} value={salaryAmount} onChange={(e) => setSalaryAmount(e.target.value)} placeholder="Planning only" />
                      </div>
                      <div>
                        <label style={labelStyle}>Pay cycle</label>
                        <select style={{ ...fieldStyle, cursor: 'pointer' }} value={payFrequency} onChange={(e) => setPayFrequency(e.target.value)}>
                          {PAY_OPTIONS.map((o) => (
                            <option key={o.value || 'empty'} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={labelStyle}>Notes</label>
                        <textarea style={{ ...fieldStyle, minHeight: 72, resize: 'vertical' }} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Bank details, contract, uniforms…" />
                      </div>
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
            <div className="par-pcard-foot" style={{ borderTop: 'none', paddingTop: 0, paddingLeft: 0, paddingRight: 0 }}>
              <button type="submit" disabled={saving} className="par-crd-btn par-crd-primary">
                {saving ? 'Saving…' : 'Save record'}
              </button>
              <button type="button" onClick={resetForm} className="par-crd-btn par-crd-ghost">
                Clear
              </button>
            </div>
          </form>
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
              ? 'Teachers appear here automatically from the Teachers directory. Add non-teaching staff above, or add teachers via Teaching staff / Teachers.'
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
            return (
              <PwDirectoryUserCard
                key={r.rowKey}
                name={r.full_name}
                subtitle={subtitle}
                cornerTone={cornerTone}
                cornerLabel={roleLabel}
                initials={pwDirInitials(r.full_name)}
                avatarBackground={pwDirGrad(i)}
                statusDotActive={!!r.linked_user_id}
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
                      <Link to={`/dashboard/admin/teachers/${r.id}`} className="par-crd-btn par-crd-primary" style={{ flex: '1 1 auto' }}>
                        Profile
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
                  )
                }
              />
            );
          })}
        </div>
      )}
    </PwParentsDirectoryShell>
  );
}
