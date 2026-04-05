import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import PwParentsDirectoryShell from '@/components/admin/PwParentsDirectoryShell';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { STAFF_ROSTER_ROLES } from '@/lib/staffRosterRoles';

const PAY_OPTIONS = [
  { value: '', label: '—' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'termly', label: 'Per term' },
  { value: 'annual', label: 'Annual' },
  { value: 'custom', label: 'Custom / other' },
];

type OtherStaffRecord = {
  id: string;
  school_id: string;
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
  updated_at: string | null;
};

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

export default function OtherStaffProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { member_id: memberIdParam } = useParams<{ member_id: string }>();
  const memberId = memberIdParam || '';

  const authUser = useAuthStore((s) => s.user);
  const schoolIdFromStore = useAuthStore((s) => s.schoolId);
  const setSchoolIdStore = useAuthStore((s) => s.setSchoolId);

  const [schoolId, setSchoolId] = useState<string | null>(() => schoolIdFromStore ?? null);
  const [schoolResolved, setSchoolResolved] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  const [fullName, setFullName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [staffRole, setStaffRole] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [salaryAmount, setSalaryAmount] = useState('');
  const [payFrequency, setPayFrequency] = useState('');

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

  const { data: row, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'other-staff-member', memberId, schoolId],
    queryFn: async (): Promise<OtherStaffRecord> => {
      const { data, error: qErr } = await supabase.from('other_staff_members').select('*').eq('id', memberId).maybeSingle();
      if (qErr) throw qErr;
      if (!data) throw new Error('Record not found.');
      const record = data as OtherStaffRecord;
      if (schoolId && record.school_id !== schoolId) throw new Error('This person belongs to another school.');
      return record;
    },
    enabled: !!memberId && !!schoolId && schoolResolved,
  });

  useEffect(() => {
    if (!row) return;
    setFullName(row.full_name || '');
    setJobTitle(row.job_title || '');
    setDepartment(row.department || '');
    setStaffRole(row.staff_role || '');
    setPhone(row.phone || '');
    setEmail(row.email || '');
    setNationalId(row.national_id || '');
    setAddress(row.address || '');
    setEmergencyName(row.emergency_contact_name || '');
    setEmergencyPhone(row.emergency_contact_phone || '');
    setNotes(row.notes || '');
    setHireDate(row.hire_date ? String(row.hire_date).slice(0, 10) : '');
    setSalaryAmount(row.salary_amount != null ? String(row.salary_amount) : '');
    setPayFrequency(row.pay_frequency || '');
  }, [row]);

  const formatTs = (iso: string | null | undefined) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return iso;
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveOk(false);
    const name = fullName.trim();
    if (!name || !memberId || !schoolId) {
      setSaveError('Full name is required.');
      return;
    }
    setSaving(true);
    try {
      const { error: uErr } = await supabase
        .from('other_staff_members')
        .update({
          full_name: name,
          job_title: jobTitle.trim() || null,
          department: department.trim() || null,
          staff_role: staffRole.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          national_id: nationalId.trim() || null,
          address: address.trim() || null,
          emergency_contact_name: emergencyName.trim() || null,
          emergency_contact_phone: emergencyPhone.trim() || null,
          notes: notes.trim() || null,
          hire_date: hireDate || null,
          salary_amount: salaryAmount ? Number(salaryAmount) : null,
          pay_frequency: payFrequency || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', memberId)
        .eq('school_id', schoolId);
      if (uErr) throw uErr;
      setSaveOk(true);
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['admin', 'school-roster', schoolId] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'other-staff', schoolId] });
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!row || !confirm(`Remove "${row.full_name}" from other staff? This cannot be undone.`)) return;
    const { error: dErr } = await supabase.from('other_staff_members').delete().eq('id', memberId).eq('school_id', schoolId!);
    if (dErr) {
      alert(dErr.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['admin', 'school-roster', schoolId] });
    await queryClient.invalidateQueries({ queryKey: ['admin', 'other-staff', schoolId] });
    navigate('/dashboard/admin/staff');
  };

  if (!schoolResolved) {
    return (
      <PwParentsDirectoryShell>
        <div className="par-empty">
          <div className="par-empty-title">Loading…</div>
        </div>
      </PwParentsDirectoryShell>
    );
  }

  if (!schoolId) {
    return (
      <PwParentsDirectoryShell>
        <div className="par-empty">
          <div className="par-empty-title">No school linked</div>
        </div>
      </PwParentsDirectoryShell>
    );
  }

  if (isLoading) {
    return (
      <PwParentsDirectoryShell>
        <div className="par-empty">
          <div className="par-empty-title">Loading profile…</div>
        </div>
      </PwParentsDirectoryShell>
    );
  }

  if (error || !row) {
    return (
      <PwParentsDirectoryShell>
        <div className="par-header par-fu">
          <div>
            <Link to="/dashboard/admin/staff" className="par-btn par-btn-ghost par-fu" style={{ marginBottom: 12, display: 'inline-flex' }}>
              ← Back to Staff
            </Link>
            <h1 className="par-title">Profile</h1>
            <p className="par-sub">{error instanceof Error ? error.message : 'Could not load this record.'}</p>
          </div>
        </div>
      </PwParentsDirectoryShell>
    );
  }

  return (
    <PwParentsDirectoryShell>
      <div className="par-header par-fu">
        <div>
          <button type="button" className="par-btn par-btn-ghost" style={{ marginBottom: 12 }} onClick={() => navigate('/dashboard/admin/staff')}>
            <ArrowLeft className="inline h-4 w-4 mr-1 align-text-bottom" aria-hidden />
            Back to Staff
          </button>
          <div className="par-eyebrow">Non-teaching staff</div>
          <h1 className="par-title">{row.full_name}</h1>
          <p className="par-sub">
            Everything below is stored in <code style={{ fontSize: 12 }}>other_staff_members</code>. Edit and save to confirm or
            update details. Record ID: <code style={{ fontSize: 11 }}>{row.id}</code>
          </p>
        </div>
        <div className="par-actions">
          <Link to="/dashboard/admin/accounts/invite" className="par-btn par-btn-violet">
            Send invitations
          </Link>
        </div>
      </div>

      <div className="par-pcard par-fu par-d2" style={{ cursor: 'default', marginBottom: 16 }}>
        <div className="par-pcard-top">
          <div className="par-pcard-name">System</div>
          <div className="par-pcard-rel">
            Created {formatTs(row.created_at)}
            {row.updated_at ? ` · Updated ${formatTs(row.updated_at)}` : null}
          </div>
        </div>
        <div className="par-pcard-body">
          <div className="par-pcard-row">
            <span className="par-pcard-label">Dashboard login</span>
            <span className="par-pcard-val">
              {row.linked_user_id ? (
                <span className="par-chip green" style={{ fontSize: 11 }}>
                  Linked
                </span>
              ) : (
                <span className="par-chip muted" style={{ fontSize: 11 }}>
                  No login yet
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="par-pcard par-fu par-d2" style={{ cursor: 'default' }}>
        <div className="par-pcard-top">
          <div className="par-pcard-name">Saved details</div>
          <div className="par-pcard-rel">All fields below are read from the database; save writes back to the same row.</div>
        </div>
        <div className="par-pcard-body" style={{ display: 'block', paddingTop: 8 }}>
          {saveError ? (
            <div className="par-chip rose" style={{ display: 'block', marginBottom: 14, padding: '10px 12px', width: '100%', textAlign: 'left' }}>
              {saveError}
            </div>
          ) : null}
          {saveOk ? (
            <div className="par-chip green" style={{ display: 'block', marginBottom: 14, padding: '10px 12px', width: '100%', textAlign: 'left' }}>
              Saved successfully.
            </div>
          ) : null}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>
                Full name <span style={{ color: 'var(--rose)' }}>*</span>
              </label>
              <input style={fieldStyle} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>

            <div>
              <label style={labelStyle}>Dashboard role</label>
              <select style={{ ...fieldStyle, cursor: 'pointer' }} value={staffRole} onChange={(e) => setStaffRole(e.target.value)}>
                <option value="">— None (on-file style) —</option>
                {STAFF_ROSTER_ROLES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Job title</label>
              <input style={fieldStyle} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Department / unit</label>
              <input style={fieldStyle} value={department} onChange={(e) => setDepartment(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input style={fieldStyle} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input style={fieldStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
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
              <input style={fieldStyle} type="number" min={0} step={1000} value={salaryAmount} onChange={(e) => setSalaryAmount(e.target.value)} />
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
              <textarea style={{ ...fieldStyle, minHeight: 88, resize: 'vertical' }} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <div className="par-pcard-foot" style={{ borderTop: '1px solid var(--border)', marginTop: 20, paddingTop: 16, paddingLeft: 0, paddingRight: 0 }}>
            <button type="submit" disabled={saving} className="par-crd-btn par-crd-primary">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" className="par-crd-btn par-crd-ghost" onClick={() => void refetch()} disabled={saving}>
              Reload from server
            </button>
            <button type="button" className="par-crd-btn par-crd-ghost" style={{ color: 'var(--rose)', marginLeft: 'auto' }} onClick={() => void handleDelete()}>
              Remove from roster
            </button>
          </div>
        </div>
      </form>
    </PwParentsDirectoryShell>
  );
}
