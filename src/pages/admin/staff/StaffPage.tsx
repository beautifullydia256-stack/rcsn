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

export async function fetchOtherStaff(schoolId: string): Promise<OtherStaffRow[]> {
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

type LoginFilter = 'all' | 'linked' | 'unlinked';

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
    queryKey: ['admin', 'other-staff', schoolId],
    queryFn: () => fetchOtherStaff(schoolId!),
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
        return (
          r.full_name.toLowerCase().includes(s) ||
          (r.job_title || '').toLowerCase().includes(s) ||
          (r.department || '').toLowerCase().includes(s) ||
          (r.email || '').toLowerCase().includes(s) ||
          (r.staff_role || '').toLowerCase().includes(s) ||
          (dashLabel(r.staff_role) || '').toLowerCase().includes(s)
        );
      });
    }
    return list;
  }, [rows, loginFilter, q]);

  const resetForm = () => {
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
    const name = fullName.trim();
    if (!name) {
      setFormError('Full name is required.');
      return;
    }
    if (!schoolId) {
      setFormError('No school linked to your account.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('other_staff_members').insert({
        school_id: schoolId,
        full_name: name,
        job_title: jobTitle.trim() || null,
        department: department.trim() || null,
        national_id: nationalId.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        staff_role: staffRole.trim() || null,
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
      await queryClient.invalidateQueries({ queryKey: ['admin', 'other-staff', schoolId] });
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from other staff records?`)) return;
    const { error } = await supabase.from('other_staff_members').delete().eq('id', id);
    if (error) {
      alert(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['admin', 'other-staff', schoolId] });
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
            Non-teachers on file (drivers, accountants, clinicians, etc.). Set a dashboard role if they may get a login.
            Teachers live under Teachers.
          </p>
        </div>
        <div className="par-actions">
          <Link to="/dashboard/admin/teachers?add=1" className="par-btn par-btn-ghost">
            ＋ Add teacher
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
            <div className="par-kpi-sub">Other staff records</div>
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
          <div className="par-pcard-rel">Save KYC-style details; optional payroll hints (not automatic payroll).</div>
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
              <div>
                <label style={labelStyle}>Job title</label>
                <input style={fieldStyle} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Driver" />
              </div>
              <div>
                <label style={labelStyle}>Department</label>
                <input style={fieldStyle} value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Transport" />
              </div>
              <div>
                <label style={labelStyle}>National ID</label>
                <input style={fieldStyle} value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input style={fieldStyle} value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input style={fieldStyle} value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Optional; needed before invite" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Dashboard role (for login)</label>
                <p style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 6 }}>If they may receive an invitation. Not for teachers.</p>
                <select style={{ ...fieldStyle, cursor: 'pointer' }} value={staffRole} onChange={(e) => setStaffRole(e.target.value)}>
                  <option value="">— None / support only —</option>
                  {STAFF_ROSTER_ROLES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
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
          <div className="par-empty-title">{rows.length === 0 ? 'No staff records yet' : 'No matches'}</div>
          <div className="par-empty-sub">
            {rows.length === 0
              ? 'Use the form above to add someone, or adjust search / filters.'
              : 'Try clearing search or showing All.'}
          </div>
        </div>
      ) : (
        <div className="par-card-grid par-fu par-d4">
          {filteredRows.map((r, i) => {
            const roleLabel = dashLabel(r.staff_role) || 'Support staff';
            const subtitle = r.job_title || r.department || 'Other staff';
            const payLbl = PAY_OPTIONS.find((p) => p.value === (r.pay_frequency || ''))?.label;
            return (
              <PwDirectoryUserCard
                key={r.id}
                name={r.full_name}
                subtitle={subtitle}
                cornerTone={r.staff_role ? pwRoleToChipTone(r.staff_role) : 'muted'}
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
                  <button
                    type="button"
                    className="par-crd-btn par-crd-ghost"
                    style={{ color: 'var(--rose)', flex: '0 0 auto' }}
                    onClick={() => void handleDelete(r.id, r.full_name)}
                    title="Remove record"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                }
              />
            );
          })}
        </div>
      )}
    </PwParentsDirectoryShell>
  );
}
