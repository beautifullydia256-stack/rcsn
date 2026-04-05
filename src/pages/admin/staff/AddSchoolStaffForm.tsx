import { useState, type FormEvent } from 'react';
import { adminCardClass } from '@/components/layout/AdminPageWrapper';
import { STAFF_ROSTER_ROLES } from '@/lib/staffRosterRoles';
import { supabase } from '@/lib/supabase';

/** Calendar date in the user's timezone (matches record added date). */
function localDateYYYYMMDD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const PAY_OPTIONS = [
  { value: '', label: '—' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'termly', label: 'Per term' },
  { value: 'annual', label: 'Annual' },
  { value: 'custom', label: 'Custom / other' },
];

/** Dashboard login later vs other staff on file only. */
type StaffRecordIntent = 'login' | 'support';

export type AddSchoolStaffFormProps = {
  schoolId: string;
  onCompleted?: () => void;
  onCancel?: () => void;
};

export function AddSchoolStaffForm({ schoolId, onCompleted, onCancel }: AddSchoolStaffFormProps) {
  const [recordIntent, setRecordIntent] = useState<StaffRecordIntent | null>(null);
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
  const [salaryAmount, setSalaryAmount] = useState('');
  const [payFrequency, setPayFrequency] = useState('');
  const [staffRole, setStaffRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const resetFields = () => {
    setRecordIntent(null);
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
    setSalaryAmount('');
    setPayFrequency('');
    setStaffRole('');
    setFormError(null);
  };

  const fieldBase =
    'w-full min-h-[48px] rounded-xl border border-slate-300 px-3 py-2.5 text-base shadow-sm ' +
    'bg-white text-slate-900 placeholder:text-slate-400 ' +
    'dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 ' +
    'focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/35';
  const inputClass = fieldBase;
  const labelClass = 'mb-1.5 block text-sm font-medium ac-text-primary';
  const textareaClass = `${fieldBase} min-h-[72px] py-2.5 resize-y`;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (recordIntent == null) {
      setFormError('Choose dashboard login (invite later) or Other staff.');
      return;
    }
    const name = fullName.trim();
    if (!name) {
      setFormError('Full name is required.');
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
        hire_date: localDateYYYYMMDD(),
        salary_amount: salaryAmount ? Number(salaryAmount) : null,
        pay_frequency: payFrequency || null,
      });
      if (error) throw error;
      resetFields();
      onCompleted?.();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl w-full space-y-6">
      <p className="text-sm ac-text-secondary leading-relaxed">
        Adds a non-teaching role to <span className="font-mono text-xs">other_staff_members</span>. Teachers are added from
        the Teachers page and still show in the staff roster.
      </p>

      <form onSubmit={handleSubmit} className={`${adminCardClass} space-y-4`}>
        {formError ? (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-800 dark:text-rose-100 whitespace-pre-wrap">
            {formError}
          </div>
        ) : null}

        <div>
          <span className={labelClass}>Will they use a dashboard login?</span>
          <p className="mb-3 text-xs text-[var(--ac-text-muted)] leading-relaxed">
            <strong className="ac-text-primary">Yes</strong> sets a role you can invite later. <strong className="ac-text-primary">Other staff</strong>{' '}
            keeps them on file without login (e.g. drivers).
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setRecordIntent('login');
                setFormError(null);
              }}
              className={
                recordIntent === 'login'
                  ? 'min-h-[44px] rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700'
                  : 'ac-glass-btn-secondary min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-medium ac-text-primary'
              }
            >
              Yes — dashboard login (invite later)
            </button>
            <button
              type="button"
              onClick={() => {
                setRecordIntent('support');
                setStaffRole('');
                setDepartment('');
                setFormError(null);
              }}
              className={
                recordIntent === 'support'
                  ? 'min-h-[44px] rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700'
                  : 'ac-glass-btn-secondary min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-medium ac-text-primary'
              }
            >
              Other staff
            </button>
          </div>
        </div>

        {recordIntent != null ? (
          <>
            {recordIntent === 'login' ? (
              <div>
                <label className={labelClass}>Dashboard role</label>
                <p className="mb-2 text-xs text-[var(--ac-text-muted)]">
                  Stored in <span className="font-mono text-[11px]">staff_role</span> on{' '}
                  <span className="font-mono text-[11px]">other_staff_members</span>.
                </p>
                <select
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value)}
                  className={inputClass}
                  required
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
              <div className="rounded-xl border border-white/20 bg-white/5 dark:bg-white/5 px-4 py-3 text-sm ac-text-secondary">
                <strong className="ac-text-primary">Other staff (on file)</strong>
                <p className="mt-1 text-xs">
                  <span className="font-mono text-[11px]">staff_role</span> stays empty. Optionally describe what they do
                  below.
                </p>
              </div>
            )}

            <div className="border-t border-white/20 pt-4 dark:border-white/10">
              <span className={`${labelClass} mb-3 block`}>Identity &amp; details</span>

              <div className="space-y-4">
                <div>
                  <label className={labelClass}>
                    Full name <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={inputClass}
                    placeholder="Full name"
                    required
                  />
                </div>

                {recordIntent === 'login' ? (
                  <>
                    <div>
                      <label className={labelClass}>Job title</label>
                      <input
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        className={inputClass}
                        placeholder="e.g. Senior accountant"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Department / unit</label>
                      <input
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className={inputClass}
                        placeholder="e.g. Finance office"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className={labelClass}>What they do (optional)</label>
                    <input
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      className={inputClass}
                      placeholder="e.g. Driver, Security — one short line"
                    />
                  </div>
                )}

                <div>
                  <label className={labelClass}>Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder={recordIntent === 'login' ? 'Needed before invitation' : 'Optional'}
                  />
                </div>
                <div>
                  <label className={labelClass}>National ID</label>
                  <input value={nationalId} onChange={(e) => setNationalId(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Address</label>
                  <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Emergency name</label>
                  <input value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Emergency phone</label>
                  <input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} className={inputClass} />
                </div>
                <p className="text-xs text-[var(--ac-text-muted)] leading-relaxed">
                  <strong className="ac-text-primary">Hire date</strong> is set automatically to today when you save.
                </p>
                <div>
                  <label className={labelClass}>Salary (reference)</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={salaryAmount}
                    onChange={(e) => setSalaryAmount(e.target.value)}
                    className={inputClass}
                    placeholder="Planning only"
                  />
                </div>
                <div>
                  <label className={labelClass}>Pay cycle</label>
                  <select value={payFrequency} onChange={(e) => setPayFrequency(e.target.value)} className={inputClass}>
                    {PAY_OPTIONS.map((o) => (
                      <option key={o.value || 'empty'} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={textareaClass}
                    rows={2}
                    placeholder="Bank details, contract, uniforms…"
                  />
                </div>
              </div>
            </div>
          </>
        ) : null}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="min-h-[48px] rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save record'}
          </button>
          <button
            type="button"
            onClick={() => {
              resetFields();
              onCancel?.();
            }}
            className="ac-glass-btn-secondary min-h-[48px] rounded-xl px-5 py-3 text-sm font-medium ac-text-primary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
