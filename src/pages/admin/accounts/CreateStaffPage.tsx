import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, ChevronDown, Mail, KeyRound } from 'lucide-react';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';

const STAFF_ROLES = [
  { value: 'head_teacher', label: 'Head Teacher' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'librarian', label: 'Librarian' },
  { value: 'lab_technician', label: 'Lab technician' },
  { value: 'clinician', label: 'School clinician' },
] as const;

/** Sync with `lib/passwordPolicy.js` */
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;
const ONE_TIME_LENGTH = 8;

function generateOneTimePassword(length = ONE_TIME_LENGTH): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const n = Math.min(Math.max(length, MIN_PASSWORD_LENGTH), MAX_PASSWORD_LENGTH);
  let s = '';
  for (let i = 0; i < n; i += 1) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

type CreateMode = 'invite' | 'password';

export default function CreateStaffPage() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<string>(STAFF_ROLES[0].value);
  const [department, setDepartment] = useState('');
  const [createMode, setCreateMode] = useState<CreateMode>('invite');
  const [passwordOption, setPasswordOption] = useState<'auto' | 'manual'>('auto');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target as Node)) {
        setRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGeneratePassword = () => {
    const pwd = generateOneTimePassword();
    setPassword(pwd);
    setConfirmPassword(pwd);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setCreatedPassword(null);

    const name = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!name || !email?.trim()) {
      setError('Full name and email are required.');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    let finalPassword: string | undefined;
    if (createMode === 'invite') {
      finalPassword = undefined;
    } else if (passwordOption === 'auto') {
      finalPassword = generateOneTimePassword();
      setCreatedPassword(finalPassword);
      setShowPassword(true);
    } else {
      if (!password || password.length < MIN_PASSWORD_LENGTH) {
        setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
        return;
      }
      if (password.length > MAX_PASSWORD_LENGTH) {
        setError(`Password must be at most ${MAX_PASSWORD_LENGTH} characters.`);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      finalPassword = password;
    }

    setSaving(true);
    try {
      const apiBase = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
      const url = apiBase ? `${apiBase}/api/admin/create-user-account` : '/api/admin/create-user-account';
      const body =
        createMode === 'invite'
          ? {
              email: email.trim(),
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              role,
              phone: phone.trim() || undefined,
              department: department.trim() || undefined,
              position: undefined,
              sendEmailInvite: true,
            }
          : {
              email: email.trim(),
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              role,
              phone: phone.trim() || undefined,
              department: department.trim() || undefined,
              position: undefined,
              password: finalPassword,
              sendEmailInvite: false,
            };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');
      let result: { error?: string; message?: string } = {};
      if (isJson) {
        try {
          result = await response.json();
        } catch {
          setError('Invalid response from server. Please try again.');
          return;
        }
      } else {
        const text = await response.text();
        setError(
          response.ok
            ? 'Invalid response from server. Please try again.'
            : `Server error (${response.status}). ${text?.slice(0, 100) || 'Please try again.'}`
        );
        return;
      }

      if (!response.ok) throw new Error(result.error || 'Failed to create user');

      setSuccess(
        result.message ||
          (createMode === 'invite'
            ? 'Invitation sent. They will get an email to set their own password.'
            : 'Account created. They can sign in with the password below or the email we sent.')
      );
      if (createMode === 'password' && passwordOption === 'auto' && finalPassword) {
        setCreatedPassword(finalPassword);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create staff.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-[var(--ac-border)] bg-white/50 dark:bg-white/5 px-3 py-2 ac-text-primary placeholder-[var(--ac-text-muted)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50';
  const labelClass = 'mb-1 block text-sm font-medium ac-text-secondary';

  return (
    <AdminPageWrapper
      title="Add staff member"
      subtitle="Send an email invitation (recommended) or create an account with a one-time password."
    >
      <div className="space-y-6">
        <form onSubmit={handleSubmit} className={`${adminCardClass} space-y-6`}>
          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 p-3 text-sm text-emerald-800 dark:text-emerald-300">
              {success}
              {createdPassword && (
                <p className="mt-2 font-mono text-xs bg-white/50 dark:bg-black/20 p-2 rounded">
                  One-time password (save or share securely): <strong>{createdPassword}</strong>
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--ac-border)]">
            <button
              type="button"
              onClick={() => setCreateMode('invite')}
              className={`flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                createMode === 'invite'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'ac-text-secondary hover:bg-white/10'
              }`}
            >
              <Mail className="w-4 h-4 shrink-0" />
              Invite by email
            </button>
            <button
              type="button"
              onClick={() => setCreateMode('password')}
              className={`flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                createMode === 'password'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'ac-text-secondary hover:bg-white/10'
              }`}
            >
              <KeyRound className="w-4 h-4 shrink-0" />
              Password now
            </button>
          </div>
          <p className="text-sm ac-text-secondary -mt-2">
            {createMode === 'invite'
              ? 'They choose their own password from the link in the email — nothing for you to type.'
              : 'Creates the account immediately and emails a one-time password (or use manual entry below).'}
          </p>

          <div>
            <h3 className="text-lg font-medium ac-text-primary mb-4">Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  First name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Jane"
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>
                  Last name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Doe"
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. jane@school.com"
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Phone number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Optional"
                  className={inputClass}
                />
              </div>
              <div ref={roleDropdownRef} className="relative">
                <label className={labelClass}>
                  Role <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setRoleDropdownOpen((o) => !o)}
                  className={`${inputClass} flex items-center justify-between w-full text-left`}
                  aria-haspopup="listbox"
                  aria-expanded={roleDropdownOpen}
                >
                  <span>{STAFF_ROLES.find((r) => r.value === role)?.label ?? role}</span>
                  <ChevronDown className={`h-4 w-4 opacity-70 transition-transform ${roleDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {roleDropdownOpen && (
                  <div
                    className="absolute left-0 right-0 top-full z-50 mt-1 ac-glass-card border border-[var(--ac-border)] rounded-lg shadow-lg py-1 max-h-48 overflow-y-auto"
                    role="listbox"
                  >
                    {STAFF_ROLES.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        role="option"
                        aria-selected={role === r.value}
                        onClick={() => {
                          setRole(r.value);
                          setRoleDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm ac-text-primary hover:bg-white/10 focus:bg-white/10 focus:outline-none ${role === r.value ? 'bg-white/10' : ''}`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Department (optional)</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Mathematics"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {createMode === 'password' && (
            <div>
              <h3 className="text-lg font-medium ac-text-primary mb-4">Password</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-2 ac-text-secondary">
                  <input
                    type="radio"
                    name="passwordOption"
                    checked={passwordOption === 'auto'}
                    onChange={() => setPasswordOption('auto')}
                    className="rounded border-[var(--ac-border)]"
                  />
                  Auto-generate one-time password (emailed to them)
                </label>
                <label className="flex items-center gap-2 ac-text-secondary">
                  <input
                    type="radio"
                    name="passwordOption"
                    checked={passwordOption === 'manual'}
                    onChange={() => setPasswordOption('manual')}
                    className="rounded border-[var(--ac-border)]"
                  />
                  I will set the password
                </label>
                {passwordOption === 'manual' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className={labelClass}>Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={inputClass}
                          minLength={MIN_PASSWORD_LENGTH}
                          maxLength={MAX_PASSWORD_LENGTH}
                          placeholder={`${MIN_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH} characters`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs ac-text-muted hover:ac-text-secondary"
                        >
                          {showPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Confirm password</label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={inputClass}
                        placeholder="Same as above"
                      />
                    </div>
                  </div>
                )}
                {passwordOption === 'auto' && (
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-sm ac-text-muted hover:ac-text-secondary underline"
                  >
                    Preview a generated password
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <UserPlus className="w-5 h-5" />
              {saving
                ? 'Working…'
                : createMode === 'invite'
                  ? 'Send invitation'
                  : 'Create account'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/admin/accounts')}
              className="ac-glass-btn-secondary rounded-lg px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </AdminPageWrapper>
  );
}
