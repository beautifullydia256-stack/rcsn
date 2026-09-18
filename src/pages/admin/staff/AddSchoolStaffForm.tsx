import { useState, useEffect, type FormEvent } from 'react';
import { adminCardClass } from '@/components/layout/AdminPageWrapper';
import { STAFF_ROSTER_ROLES } from '@/lib/staffRosterRoles';
import { supabase } from '@/lib/supabase';
import { registerApiUrl } from '@/lib/registerApiOrigin';

function localDateYYYYMMDD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

const ALL_ASSIGNABLE_ROLES = [
  { value: 'admin', label: 'School Admin' },
  { value: 'head_teacher', label: 'Head Teacher' },
  { value: 'deputy_head_teacher', label: 'Deputy Head Teacher' },
  { value: 'dos', label: 'Director of Studies (DOS)' },
  { value: 'deputy_dos', label: 'Deputy Director of Studies' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'secretary', label: 'Secretary' },
  { value: 'librarian', label: 'Librarian' },
  { value: 'lab_technician', label: 'Lab Technician' },
  { value: 'clinician', label: 'School Clinician' },
  { value: 'parent', label: 'Parent' },
];

type StaffRecordIntent = 'login' | 'support' | 'existing';

type ExistingUserResult = {
  user_id: string;
  name: string;
  email: string;
  role: string;
  extra_roles?: string[];
  phone?: string;
};

export type AddSchoolStaffFormProps = {
  schoolId: string;
  onCompleted?: () => void;
  onCancel?: () => void;
};

export function AddSchoolStaffForm({ schoolId, onCompleted, onCancel }: AddSchoolStaffFormProps) {
  const [recordIntent, setRecordIntent] = useState<StaffRecordIntent | null>(null);

  // — New staff fields —
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

  // — Assign roles to existing user —
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<ExistingUserResult[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ExistingUserResult | null>(null);
  const [editPrimaryRole, setEditPrimaryRole] = useState('');
  const [editExtraRoles, setEditExtraRoles] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Search existing users
  useEffect(() => {
    if (recordIntent !== 'existing' || userSearchQuery.trim().length < 2) {
      setUserSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setUserSearchLoading(true);
      try {
        const q = userSearchQuery.trim();
        const { data } = await supabase
          .from('users')
          .select('user_id, name, email, role, extra_roles, phone')
          .eq('school_id', schoolId)
          .neq('role', 'student')
          .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
          .limit(8);
        setUserSearchResults((data ?? []) as ExistingUserResult[]);
      } catch {
        setUserSearchResults([]);
      } finally {
        setUserSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [userSearchQuery, schoolId, recordIntent]);

  const selectExistingUser = (u: ExistingUserResult) => {
    setSelectedUser(u);
    setEditPrimaryRole(u.role || '');
    const extras = Array.isArray(u.extra_roles) ? u.extra_roles.filter(r => r && r !== u.role) : [];
    setEditExtraRoles(extras);
    setUserSearchQuery('');
    setUserSearchResults([]);
  };

  const toggleExtraRole = (role: string) => {
    setEditExtraRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const resetFields = () => {
    setRecordIntent(null);
    setFullName(''); setJobTitle(''); setDepartment(''); setNationalId('');
    setPhone(''); setEmail(''); setAddress(''); setEmergencyName('');
    setEmergencyPhone(''); setNotes(''); setSalaryAmount(''); setPayFrequency('');
    setStaffRole(''); setUserSearchQuery(''); setUserSearchResults([]);
    setSelectedUser(null); setEditPrimaryRole(''); setEditExtraRoles([]);
    setFormError(null);
  };

  const handleSaveExistingUserRoles = async () => {
    if (!selectedUser || !editPrimaryRole) {
      setFormError('Select a user and choose a primary role.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const extras = editExtraRoles.filter(r => r !== editPrimaryRole);
      const newAllRoles = [editPrimaryRole, ...extras];
      const oldAllRoles = [selectedUser.role, ...(selectedUser.extra_roles?.filter(r => r !== selectedUser.role) ?? [])];
      const { error } = await supabase
        .from('users')
        .update({ role: editPrimaryRole, extra_roles: extras })
        .eq('user_id', selectedUser.user_id);
      if (error) throw error;

      // Send email notification (fire and forget)
      const addedRoles = newAllRoles.filter(r => !oldAllRoles.includes(r));
      const removedRoles = oldAllRoles.filter(r => !newAllRoles.includes(r));
      if ((addedRoles.length > 0 || removedRoles.length > 0) && selectedUser.email) {
        void fetch(registerApiUrl('/api/admin/notify-role-change'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: selectedUser.email,
            name: selectedUser.name,
            schoolId,
            addedRoles,
            removedRoles,
          }),
        }).catch(() => { /* best-effort */ });
      }

      resetFields();
      onCompleted?.();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Could not save roles.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitNewStaff = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (recordIntent == null) {
      setFormError('Choose an option above.');
      return;
    }
    if (recordIntent === 'existing') {
      await handleSaveExistingUserRoles();
      return;
    }
    const name = fullName.trim();
    if (!name) { setFormError('Full name is required.'); return; }
    if (recordIntent === 'login' && !staffRole.trim()) {
      setFormError('Choose a dashboard role (e.g. Accountant).');
      return;
    }
    const isDashboard = recordIntent === 'login';
    setSaving(true);
    try {
      const { error } = await supabase.from('other_staff_members').insert({
        school_id: schoolId,
        full_name: name,
        job_title: jobTitle.trim() || null,
        department: isDashboard ? department.trim() || null : null,
        national_id: nationalId.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        staff_role: isDashboard ? staffRole.trim() || null : null,
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

  const fieldBase =
    'w-full min-h-[48px] rounded-xl border border-slate-300 px-3 py-2.5 text-base shadow-sm ' +
    'bg-white text-slate-900 placeholder:text-slate-400 ' +
    'dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 ' +
    'focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/35';
  const inputClass = fieldBase;
  const labelClass = 'mb-1.5 block text-sm font-medium ac-text-primary';
  const textareaClass = `${fieldBase} min-h-[72px] py-2.5 resize-y`;

  return (
    <div className="max-w-xl w-full space-y-6">
      <p className="text-sm ac-text-secondary leading-relaxed">
        Add a new staff member, or assign extra roles to someone already in the system.
      </p>

      <form onSubmit={handleSubmitNewStaff} className={`${adminCardClass} space-y-4`}>
        {formError && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-800 dark:text-rose-100 whitespace-pre-wrap">
            {formError}
          </div>
        )}

        {/* ── Mode picker ── */}
        <div>
          <span className={labelClass}>What would you like to do?</span>
          <div className="flex flex-wrap gap-2 mt-2">
            <button
              type="button"
              onClick={() => { setRecordIntent('login'); setFormError(null); setSelectedUser(null); }}
              className={recordIntent === 'login'
                ? 'min-h-[44px] rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm'
                : 'ac-glass-btn-secondary min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-medium ac-text-primary'}
            >
              Add new staff (login later)
            </button>
            <button
              type="button"
              onClick={() => { setRecordIntent('support'); setStaffRole(''); setDepartment(''); setFormError(null); setSelectedUser(null); }}
              className={recordIntent === 'support'
                ? 'min-h-[44px] rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm'
                : 'ac-glass-btn-secondary min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-medium ac-text-primary'}
            >
              Other staff (on file only)
            </button>
            <button
              type="button"
              onClick={() => { setRecordIntent('existing'); setFormError(null); }}
              className={recordIntent === 'existing'
                ? 'min-h-[44px] rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm'
                : 'ac-glass-btn-secondary min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-medium ac-text-primary'}
            >
              Assign roles to existing user
            </button>
          </div>
        </div>

        {/* ── EXISTING USER: search + role assignment ── */}
        {recordIntent === 'existing' && (
          <div className="space-y-4 border-t border-white/20 pt-4 dark:border-white/10">
            <div>
              <p className="text-sm font-semibold ac-text-primary mb-1">Find person already in the system</p>
              <p className="text-xs text-[var(--ac-text-muted)] mb-3">
                Search by name or email. You can then assign them a new primary role and up to 3 additional roles — they will see a role picker when they log in.
              </p>

              {selectedUser ? (
                <div className="flex items-start gap-3 rounded-xl bg-violet-500/10 border border-violet-500/25 px-3 py-3">
                  <span className="text-violet-400 text-base mt-0.5">✓</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold ac-text-primary">{selectedUser.name}</div>
                    <div className="text-xs text-[var(--ac-text-muted)] mt-0.5">
                      {selectedUser.email} · current role: <span className="capitalize font-medium">{selectedUser.role}</span>
                      {Array.isArray(selectedUser.extra_roles) && selectedUser.extra_roles.length > 0 && (
                        <span className="ml-1">+ {selectedUser.extra_roles.join(', ')}</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedUser(null); setEditPrimaryRole(''); setEditExtraRoles([]); }}
                    className="text-violet-400/60 hover:text-violet-300 text-lg font-bold leading-none"
                    aria-label="Clear selection"
                  >×</button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    className={inputClass + ' pr-10'}
                    placeholder="Type name or email to search…"
                    value={userSearchQuery}
                    onChange={e => setUserSearchQuery(e.target.value)}
                    autoComplete="off"
                  />
                  {userSearchLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                  )}
                  {userSearchResults.length > 0 && (
                    <div className="mt-1 rounded-xl border border-[var(--ac-border)] bg-slate-900 shadow-xl overflow-hidden z-10 relative">
                      {userSearchResults.map(u => (
                        <button
                          key={u.user_id}
                          type="button"
                          onClick={() => selectExistingUser(u)}
                          className="w-full text-left px-4 py-3 hover:bg-violet-500/10 transition-colors border-b border-white/5 last:border-b-0"
                        >
                          <div className="text-sm font-medium text-slate-100">{u.name}</div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {u.email} · <span className="capitalize">{u.role}</span>
                            {Array.isArray(u.extra_roles) && u.extra_roles.length > 0 && (
                              <span className="ml-1 text-violet-400">+{u.extra_roles.length} more</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {userSearchQuery.trim().length >= 2 && !userSearchLoading && userSearchResults.length === 0 && (
                    <p className="mt-2 text-xs text-[var(--ac-text-muted)]">No users found. Try a different name or email.</p>
                  )}
                </div>
              )}
            </div>

            {selectedUser && (
              <>
                {/* Primary role */}
                <div>
                  <label className={labelClass}>Primary role</label>
                  <select
                    value={editPrimaryRole}
                    onChange={e => {
                      const next = e.target.value;
                      setEditPrimaryRole(next);
                      setEditExtraRoles(prev => prev.filter(r => r !== next));
                    }}
                    className={inputClass}
                  >
                    <option value="">— Select primary role —</option>
                    {ALL_ASSIGNABLE_ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                {/* Extra roles */}
                <div>
                  <label className={labelClass}>Additional roles (optional — up to 3)</label>
                  <p className="text-xs text-[var(--ac-text-muted)] mb-3">
                    The person sees a role picker at login when they have more than one role.
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {ALL_ASSIGNABLE_ROLES.filter(r => r.value !== editPrimaryRole).map(r => (
                      <label key={r.value} className="flex items-center gap-2 cursor-pointer text-sm ac-text-primary">
                        <input
                          type="checkbox"
                          checked={editExtraRoles.includes(r.value)}
                          disabled={!editExtraRoles.includes(r.value) && editExtraRoles.length >= 3}
                          onChange={() => toggleExtraRole(r.value)}
                          className="accent-violet-500 w-4 h-4"
                        />
                        {r.label}
                      </label>
                    ))}
                  </div>
                  {editExtraRoles.length >= 3 && (
                    <p className="mt-2 text-xs text-amber-500">Maximum of 3 additional roles selected.</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── NEW STAFF: login or support ── */}
        {(recordIntent === 'login' || recordIntent === 'support') && (
          <>
            {recordIntent === 'login' ? (
              <div>
                <label className={labelClass}>Dashboard role</label>
                <select
                  value={staffRole}
                  onChange={e => setStaffRole(e.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="">— Select role —</option>
                  {STAFF_ROSTER_ROLES.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="rounded-xl border border-white/20 bg-white/5 dark:bg-white/5 px-4 py-3 text-sm ac-text-secondary">
                <strong className="ac-text-primary">Other staff (on file)</strong>
                <p className="mt-1 text-xs">No dashboard login — optionally describe what they do below.</p>
              </div>
            )}

            <div className="border-t border-white/20 pt-4 dark:border-white/10">
              <span className={`${labelClass} mb-3 block`}>Identity &amp; details</span>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Full name <span className="text-red-500">*</span></label>
                  <input value={fullName} onChange={e => setFullName(e.target.value)} className={inputClass} placeholder="Full name" required />
                </div>
                {recordIntent === 'login' ? (
                  <>
                    <div>
                      <label className={labelClass}>Job title</label>
                      <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} className={inputClass} placeholder="e.g. Senior accountant" />
                    </div>
                    <div>
                      <label className={labelClass}>Department / unit</label>
                      <input value={department} onChange={e => setDepartment(e.target.value)} className={inputClass} placeholder="e.g. Finance office" />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className={labelClass}>What they do (optional)</label>
                    <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} className={inputClass} placeholder="e.g. Driver, Security" />
                  </div>
                )}
                <div>
                  <label className={labelClass}>Phone</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass}
                    placeholder={recordIntent === 'login' ? 'Needed before invitation' : 'Optional'} />
                </div>
                <div>
                  <label className={labelClass}>National ID</label>
                  <input value={nationalId} onChange={e => setNationalId(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Address</label>
                  <input value={address} onChange={e => setAddress(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Emergency name</label>
                  <input value={emergencyName} onChange={e => setEmergencyName(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Emergency phone</label>
                  <input value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} className={inputClass} />
                </div>
                <p className="text-xs text-[var(--ac-text-muted)]">
                  <strong className="ac-text-primary">Hire date</strong> is set automatically to today when you save.
                </p>
                <div>
                  <label className={labelClass}>Salary (reference)</label>
                  <input type="number" min={0} step={1000} value={salaryAmount} onChange={e => setSalaryAmount(e.target.value)} className={inputClass} placeholder="Planning only" />
                </div>
                <div>
                  <label className={labelClass}>Pay cycle</label>
                  <select value={payFrequency} onChange={e => setPayFrequency(e.target.value)} className={inputClass}>
                    {PAY_OPTIONS.map(o => <option key={o.value || 'empty'} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Notes</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} className={textareaClass} rows={2} placeholder="Bank details, contract, uniforms…" />
                </div>
              </div>
            </div>
          </>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || (recordIntent === 'existing' && !selectedUser)}
            className="min-h-[48px] rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : recordIntent === 'existing' ? 'Save roles' : 'Save record'}
          </button>
          <button
            type="button"
            onClick={() => { resetFields(); onCancel?.(); }}
            className="ac-glass-btn-secondary min-h-[48px] rounded-xl px-5 py-3 text-sm font-medium ac-text-primary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
