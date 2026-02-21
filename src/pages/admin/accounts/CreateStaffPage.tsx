import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus } from 'lucide-react';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';

const STAFF_ROLES = [
  { value: 'head_teacher', label: 'Head Teacher' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'librarian', label: 'Librarian' },
] as const;

function generatePassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < length; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export default function CreateStaffPage() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<string>(STAFF_ROLES[0].value);
  const [department, setDepartment] = useState('');
  const [passwordOption, setPasswordOption] = useState<'auto' | 'manual'>('auto');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [statusActive, setStatusActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  const handleGeneratePassword = () => {
    const pwd = generatePassword();
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
    let finalPassword = password;
    if (passwordOption === 'auto') {
      finalPassword = generatePassword();
      setCreatedPassword(finalPassword);
      setShowPassword(true);
    } else {
      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/create-user-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role,
          phone: phone.trim() || undefined,
          department: department.trim() || undefined,
          position: undefined,
          password: finalPassword,
          sendEmailInvite: false,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to create user');

      setSuccess(result.message || 'User created successfully.');
      if (passwordOption === 'auto' && finalPassword) {
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
      title="Create Staff"
      subtitle="Add Head Teacher, Accountant, Teacher, or Librarian. They will log in with their email."
    >
      <div className="space-y-6">
        <div>
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/accounts')}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--ac-border)] ac-glass-btn-secondary px-3 py-2 text-sm font-medium ac-text-secondary hover:opacity-90"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to User Management
          </button>
        </div>

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
                  Generated password (show once): <strong>{createdPassword}</strong>
                </p>
              )}
            </div>
          )}

          <div>
            <h3 className="text-lg font-medium ac-text-primary mb-4">Personal information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Full name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={`${firstName} ${lastName}`.trim() || undefined}
                  onChange={(e) => {
                    const parts = e.target.value.trim().split(/\s+/);
                    setFirstName(parts[0] ?? '');
                    setLastName(parts.slice(1).join(' ') ?? '');
                  }}
                  placeholder="e.g. Jane Doe"
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Email <span className="text-red-500">*</span></label>
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
              <div>
                <label className={labelClass}>Role <span className="text-red-500">*</span></label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className={inputClass}
                  required
                >
                  {STAFF_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Department (optional, mainly for teachers)</label>
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
                Auto-generate password
              </label>
              <label className="flex items-center gap-2 ac-text-secondary">
                <input
                  type="radio"
                  name="passwordOption"
                  checked={passwordOption === 'manual'}
                  onChange={() => setPasswordOption('manual')}
                  className="rounded border-[var(--ac-border)]"
                />
                Set password manually
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
                        minLength={6}
                        placeholder="Min 6 characters"
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
                  Generate a password now (preview)
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 ac-text-secondary">
              <input
                type="checkbox"
                checked={statusActive}
                onChange={(e) => setStatusActive(e.target.checked)}
                className="rounded border-[var(--ac-border)]"
              />
              Active (user can log in)
            </label>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <UserPlus className="w-5 h-5" />
              {saving ? 'Creating…' : 'Create staff'}
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
