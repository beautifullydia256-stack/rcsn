import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { Check } from 'lucide-react';
import { adminCardClass } from '@/components/layout/AdminPageWrapper';
import { STAFF_ROSTER_ROLES } from '@/lib/staffRosterRoles';
import { supabase } from '@/lib/supabase';
import { registerApiUrl } from '@/lib/registerApiOrigin';
import { useSchoolType } from '@/hooks/useSchoolType';
import { getStaffRosterRoles, getAllAssignableRoles } from '@/lib/roleTerminology';
import LiquidGlassSelect from '@/components/ui/LiquidGlassSelect';

function localDateYYYYMMDD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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
  const { schoolType, isTertiary } = useSchoolType();
  const staffRosterRoles = useMemo(() => getStaffRosterRoles(schoolType), [schoolType]);
  const assignableRoles = useMemo(() => getAllAssignableRoles(schoolType), [schoolType]);
  const payOptions = useMemo(() => [
    { value: '', label: '—' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'biweekly', label: 'Bi-weekly' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'daily', label: 'Daily (Casual / Day wage)' },
    { value: 'termly', label: isTertiary ? 'Per semester' : 'Per term' },
    { value: 'annual', label: 'Annual' },
    { value: 'custom', label: 'Custom / other' },
  ], [isTertiary]);

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

  const inputClass =
    'w-full min-h-[46px] rounded-xl border border-white/20 px-3.5 py-2.5 text-sm shadow-inner ' +
    'bg-black/25 text-white placeholder-white/40 backdrop-blur-sm ' +
    'focus:border-emerald-400 focus:bg-black/35 focus:outline-none focus:ring-1 focus:ring-emerald-400/50 transition-all';
  const labelClass = 'mb-1.5 block text-[11px] font-bold text-white/70 uppercase tracking-wider';
  const textareaClass = `${inputClass} min-h-[72px] resize-y`;

  return (
    <div className="w-full space-y-5">
      <p className="text-xs text-white/60 leading-relaxed">
        Add a new staff member, or assign extra roles to someone already in the system.
      </p>

      <form onSubmit={handleSubmitNewStaff} className="space-y-4">
        {formError && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200 whitespace-pre-wrap">
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
                ? 'min-h-[40px] rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-lg border border-emerald-400/30'
                : 'min-h-[40px] rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 px-4 py-2 text-xs font-medium text-white/80 backdrop-blur-sm transition-all'}
            >
              Add new staff (login later)
            </button>
            <button
              type="button"
              onClick={() => { setRecordIntent('support'); setStaffRole(''); setDepartment(''); setFormError(null); setSelectedUser(null); }}
              className={recordIntent === 'support'
                ? 'min-h-[40px] rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-lg border border-emerald-400/30'
                : 'min-h-[40px] rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 px-4 py-2 text-xs font-medium text-white/80 backdrop-blur-sm transition-all'}
            >
              Other staff (on file only)
            </button>
            <button
              type="button"
              onClick={() => { setRecordIntent('existing'); setFormError(null); }}
              className={recordIntent === 'existing'
                ? 'min-h-[40px] rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-lg border border-violet-400/30'
                : 'min-h-[40px] rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 px-4 py-2 text-xs font-medium text-white/80 backdrop-blur-sm transition-all'}
            >
              Assign roles to existing user
            </button>
          </div>
        </div>

        {/* ── EXISTING USER: search + role assignment ── */}
        {recordIntent === 'existing' && (
          <div className="space-y-4 border-t border-white/15 pt-4">
            <div>
              <p className="text-sm font-semibold text-white mb-1">Find person already in the system</p>
              <p className="text-xs text-white/60 mb-3">
                Search by name or email. You can then assign them a new primary role and up to 3 additional roles — they will see a role picker when they log in.
              </p>

              {selectedUser ? (
                <div className="flex items-start gap-3 rounded-xl bg-violet-500/15 border border-violet-400/30 px-3.5 py-3">
                  <Check className="w-4 h-4 text-violet-300 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white">{selectedUser.name}</div>
                    <div className="text-xs text-white/60 mt-0.5">
                      {selectedUser.email} · current role: <span className="capitalize font-medium text-violet-200">{selectedUser.role}</span>
                      {Array.isArray(selectedUser.extra_roles) && selectedUser.extra_roles.length > 0 && (
                        <span className="ml-1 text-violet-300">+ {selectedUser.extra_roles.join(', ')}</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedUser(null); setEditPrimaryRole(''); setEditExtraRoles([]); }}
                    className="text-violet-300/70 hover:text-white text-lg font-bold leading-none"
                    aria-label="Clear selection"
                  >×</button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    className={inputClass + ' pr-10'}
                    placeholder="Type name or email to search..."
                    value={userSearchQuery}
                    onChange={e => setUserSearchQuery(e.target.value)}
                    autoComplete="off"
                  />
                  {userSearchLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                  )}
                  {userSearchResults.length > 0 && (
                    <div className="mt-1 rounded-2xl border border-white/20 bg-slate-950/90 shadow-2xl backdrop-blur-xl overflow-hidden z-20 relative">
                      {userSearchResults.map(u => (
                        <button
                          key={u.user_id}
                          type="button"
                          onClick={() => selectExistingUser(u)}
                          className="w-full text-left px-4 py-3 hover:bg-violet-500/20 transition-colors border-b border-white/10 last:border-b-0"
                        >
                          <div className="text-sm font-medium text-white">{u.name}</div>
                          <div className="text-xs text-white/60 mt-0.5">
                            {u.email} · <span className="capitalize text-violet-300">{u.role}</span>
                            {Array.isArray(u.extra_roles) && u.extra_roles.length > 0 && (
                              <span className="ml-1 text-violet-400">+{u.extra_roles.length} more</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {userSearchQuery.trim().length >= 2 && !userSearchLoading && userSearchResults.length === 0 && (
                    <p className="mt-2 text-xs text-white/60">No users found. Try a different name or email.</p>
                  )}
                </div>
              )}
            </div>

            {selectedUser && (
              <>
                {/* Primary role */}
                <div className="relative z-30">
                  <label className={labelClass}>Primary role</label>
                  <LiquidGlassSelect
                    value={editPrimaryRole}
                    onChange={val => {
                      setEditPrimaryRole(val);
                      setEditExtraRoles(prev => prev.filter(r => r !== val));
                    }}
                    options={assignableRoles.map(r => ({ value: r.value, label: r.label }))}
                    placeholder="— Select primary role —"
                  />
                </div>

                {/* Extra roles */}
                <div>
                  <label className={labelClass}>Additional roles (optional — up to 3)</label>
                  <p className="text-xs text-white/60 mb-3">
                    The person sees a role picker at login when they have more than one role.
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {assignableRoles.filter(r => r.value !== editPrimaryRole).map(r => (
                      <label key={r.value} className="flex items-center gap-2 cursor-pointer text-sm text-white/90">
                        <input
                          type="checkbox"
                          checked={editExtraRoles.includes(r.value)}
                          disabled={!editExtraRoles.includes(r.value) && editExtraRoles.length >= 3}
                          onChange={() => toggleExtraRole(r.value)}
                          className="accent-violet-500 w-4 h-4 rounded"
                        />
                        {r.label}
                      </label>
                    ))}
                  </div>
                  {editExtraRoles.length >= 3 && (
                    <p className="mt-2 text-xs text-amber-400">Maximum of 3 additional roles selected.</p>
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
              <div className="relative z-30">
                <label className={labelClass}>Dashboard role <span className="text-amber-400">*</span></label>
                <LiquidGlassSelect
                  value={staffRole}
                  onChange={val => setStaffRole(val)}
                  options={staffRosterRoles.map(o => ({ value: o.value, label: o.label }))}
                  placeholder="— Select role —"
                />
              </div>
            ) : (
              <div className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-xs text-white/70">
                <strong className="text-white">Other staff (on file)</strong>
                <p className="mt-1 text-white/60">No dashboard login — optionally describe what they do below.</p>
              </div>
            )}

            <div className="border-t border-white/15 pt-4">
              <span className={`${labelClass} mb-3 block`}>Identity &amp; details</span>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Full name <span className="text-amber-400">*</span></label>
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
                <p className="text-xs text-white/50">
                  <strong className="text-white/80">Hire date</strong> is set automatically to today when you save.
                </p>
                <div>
                  <label className={labelClass}>Salary (reference)</label>
                  <input type="number" min={0} step={1000} value={salaryAmount} onChange={e => setSalaryAmount(e.target.value)} className={inputClass} placeholder="Planning only" />
                </div>
                <div className="relative z-20">
                  <label className={labelClass}>Pay cycle</label>
                  <LiquidGlassSelect
                    value={payFrequency}
                    onChange={val => setPayFrequency(val)}
                    options={payOptions.map(o => ({ value: o.value, label: o.label }))}
                    placeholder="Select pay cycle"
                  />
                </div>
                <div>
                  <label className={labelClass}>Notes</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} className={textareaClass} rows={2} placeholder="Bank details, contract, uniforms..." />
                </div>
              </div>
            </div>
          </>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-white/15">
          <button
            type="button"
            onClick={() => { resetFields(); onCancel?.(); }}
            className="px-5 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white/90 text-sm font-medium backdrop-blur-sm transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || (recordIntent === 'existing' && !selectedUser)}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-semibold shadow-lg shadow-emerald-950/40 border border-emerald-400/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? 'Saving...' : recordIntent === 'existing' ? 'Save roles' : 'Save record'}
          </button>
        </div>
      </form>
    </div>
  );
}
