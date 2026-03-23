import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, UserPlus, Trash2, Briefcase } from 'lucide-react';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';
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

export default function StaffPage() {
  const queryClient = useQueryClient();
  const authUser = useAuthStore((s) => s.user);
  const [schoolId, setSchoolId] = useState<string | null>(null);

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
    const load = async () => {
      if (!authUser?.id) return;
      const { data } = await supabase.from('users').select('school_id').eq('user_id', authUser.id).single();
      setSchoolId(data?.school_id ?? null);
    };
    load();
  }, [authUser?.id]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['admin', 'other-staff', schoolId],
    queryFn: () => fetchOtherStaff(schoolId!),
    enabled: !!schoolId,
    staleTime: STALE_MS,
  });

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

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';
  const labelClass = 'mb-1 block text-sm font-medium text-gray-700';

  if (!schoolId) {
    return (
      <AdminPageWrapper title="Staff">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">You need a school context to manage staff.</div>
      </AdminPageWrapper>
    );
  }

  return (
    <AdminPageWrapper
      title="Staff"
      subtitle="Add non-teachers here (accountant, lab tech, clinician, etc.). Set a dashboard role if they may get a login. Teachers belong under Teachers. Invitations are sent from User Management → Send invitations."
    >
      <div className="max-w-5xl w-full space-y-8">
        <div className="flex flex-wrap gap-3">
          <Link
            to="/dashboard/admin/teachers?add=1"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50"
          >
            <UserPlus className="h-4 w-4" />
            Add teacher
          </Link>
          <Link
            to="/dashboard/admin/accounts/invite"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
          >
            <Briefcase className="h-4 w-4" />
            Send invitations
          </Link>
          <Link
            to="/dashboard/admin/accounts"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50"
          >
            All users
          </Link>
        </div>

        <section className={`${adminCardClass} space-y-4`}>
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-emerald-100 p-2 text-emerald-800">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Other staff (on file)</h2>
              <p className="text-sm text-gray-600 mt-1">
                Drivers, security, cooks, assistants, etc. Store KYC-style details and payroll hints. Most will not need a
                login. When the accountant records salary under Expenses, they can link the payment to a person once that
                UI is enabled (database supports <code className="text-xs bg-gray-100 px-1 rounded">linked_other_staff_id</code> on expenses).
              </p>
            </div>
          </div>

          <form onSubmit={handleAdd} className="space-y-4 border-t border-gray-100 pt-4">
            {formError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{formError}</div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className={labelClass}>
                  Full name <span className="text-red-500">*</span>
                </label>
                <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="e.g. Mary Nakato" />
              </div>
              <div>
                <label className={labelClass}>Job title</label>
                <input className={inputClass} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Driver" />
              </div>
              <div>
                <label className={labelClass}>Department / unit</label>
                <input className={inputClass} value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Transport" />
              </div>
              <div>
                <label className={labelClass}>National ID</label>
                <input className={inputClass} value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Optional on file; required before invite" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Dashboard role (for login)</label>
                <p className="text-xs text-gray-500 mb-1">Pick a role if this person may receive an invitation. Not for teachers.</p>
                <select className={inputClass} value={staffRole} onChange={(e) => setStaffRole(e.target.value)}>
                  <option value="">— None / support only —</option>
                  {STAFF_ROSTER_ROLES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Address</label>
                <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Emergency contact name</label>
                <input className={inputClass} value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Emergency contact phone</label>
                <input className={inputClass} value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Hire date</label>
                <input className={inputClass} type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Salary amount (reference)</label>
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  step="1000"
                  value={salaryAmount}
                  onChange={(e) => setSalaryAmount(e.target.value)}
                  placeholder="For planning; not automatic payroll"
                />
              </div>
              <div>
                <label className={labelClass}>How often paid</label>
                <select className={inputClass} value={payFrequency} onChange={(e) => setPayFrequency(e.target.value)}>
                  {PAY_OPTIONS.map((o) => (
                    <option key={o.value || 'empty'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Notes</label>
                <textarea className={inputClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Bank details, contract end, uniforms issued…" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Save record
              </button>
              <button type="button" onClick={resetForm} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                Clear
              </button>
            </div>
          </form>
        </section>

        <section className={`${adminCardClass}`}>
          <h3 className="text-base font-semibold text-gray-900 mb-3">People on file</h3>
          {isLoading ? (
            <p className="text-gray-500 text-sm">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-gray-500 text-sm">No other staff records yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Job</th>
                    <th className="px-3 py-2 font-medium">Dashboard</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Login</th>
                    <th className="px-3 py-2 font-medium">Phone</th>
                    <th className="px-3 py-2 font-medium">Salary ref.</th>
                    <th className="px-3 py-2 font-medium">Pay cycle</th>
                    <th className="px-3 py-2 font-medium w-24" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const dashLabel = STAFF_ROSTER_ROLES.find((x) => x.value === r.staff_role)?.label;
                    return (
                    <tr key={r.id} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-medium text-gray-900">{r.full_name}</td>
                      <td className="px-3 py-2 text-gray-700">{r.job_title || r.department || '—'}</td>
                      <td className="px-3 py-2 text-gray-700 text-xs capitalize">{dashLabel || (r.staff_role ? r.staff_role.replace(/_/g, ' ') : '—')}</td>
                      <td className="px-3 py-2 text-gray-600 text-xs max-w-[180px] truncate" title={r.email || undefined}>{r.email || '—'}</td>
                      <td className="px-3 py-2">
                        {r.linked_user_id ? (
                          <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Linked</span>
                        ) : (
                          <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">No login</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-600">{r.phone || '—'}</td>
                      <td className="px-3 py-2 text-gray-700">
                        {r.salary_amount != null ? Number(r.salary_amount).toLocaleString() : '—'}
                      </td>
                      <td className="px-3 py-2 text-gray-600 capitalize">{r.pay_frequency || '—'}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => handleDelete(r.id, r.full_name)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Remove record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AdminPageWrapper>
  );
}
