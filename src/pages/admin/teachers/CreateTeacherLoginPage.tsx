import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { isValidEmailFormat } from '@/lib/emailValidator';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';
import { useToast } from '@/components/Toast';
import { Sparkles } from 'lucide-react';

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

export default function CreateTeacherLoginPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { teacher_id: teacherIdParam } = useParams<{ teacher_id: string }>();
  const teacherId = Array.isArray(teacherIdParam) ? teacherIdParam[0] : teacherIdParam || '';

  const [teacher, setTeacher] = useState<Record<string, unknown> | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate('/login');
      const { data: t } = await supabase.from('teachers').select('*').eq('teacher_id', teacherId).single();
      setTeacher((t || null) as Record<string, unknown> | null);
      setEmail(t?.email ? String(t.email) : '');
      setPassword('');
      setSchoolId((t?.school_id as string) || null);
    };
    if (teacherId) load();
  }, [teacherId, navigate]);

  const fillGeneratedPassword = () => {
    const pwd = generateOneTimePassword();
    setPassword(pwd);
    setShowPassword(true);
  };

  const createLogin = async () => {
    setError(null);
    setSuccess(null);
    if (!teacher || !schoolId) {
      setError('Missing teacher or school context');
      return;
    }
    if (!isValidEmailFormat(email)) {
      setError('Enter a valid email');
      return;
    }
    let pwd = password.trim();
    if (!pwd) {
      pwd = generateOneTimePassword();
      setPassword(pwd);
      setShowPassword(true);
    }
    if (pwd.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (pwd.length > MAX_PASSWORD_LENGTH) {
      setError(`Password must be at most ${MAX_PASSWORD_LENGTH} characters`);
      return;
    }
    setSaving(true);
    try {
      const apiBase = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
      const url = apiBase ? `${apiBase}/api/admin/create-teacher-login` : '/api/admin/create-teacher-login';
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email,
          password: pwd,
          teacher_id: teacher.teacher_id,
          name: teacher.name,
          school_id: schoolId,
        }),
      });
      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');
      const data = isJson ? await response.json().catch(() => ({})) : {};
      if (!response.ok) {
        const msg = (data as { error?: string })?.error || `Request failed (${response.status})`;
        setError(msg);
        toast.error(msg);
        return;
      }
      if (!(data as { success?: boolean }).success) {
        const msg = (data as { error?: string })?.error || 'Failed to create login';
        setError(msg);
        toast.error(msg);
        return;
      }
      setSuccess('Teacher login created. They will receive an email with their temporary password.');
      toast.success('Teacher login created.');
      setTimeout(() => navigate(`/dashboard/admin/teachers/${teacherId}`), 1200);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Network error. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPageWrapper
      title="Create teacher login"
      subtitle="Confirm email, then one click — we generate a secure password if the field is empty."
    >
      <div className="flex items-center justify-end gap-2 mb-4">
        <button type="button" className="ac-glass-btn-secondary rounded-xl px-3 py-2 text-sm" onClick={() => navigate(`/dashboard/admin/teachers/${teacherId}`)}>Back</button>
      </div>
      {error && <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-3 py-2">{error}</div>}
      {success && <div className="mb-3 rounded-lg border border-green-500/30 bg-green-500/10 text-green-200 px-3 py-2">{success}</div>}
      <form className={`${adminCardClass} space-y-4`} autoComplete="off" onSubmit={(e) => { e.preventDefault(); void createLogin(); }}>
        <div>
          <label className="block ac-text-secondary text-sm mb-1">Teacher email</label>
          <input
            type="email"
            className="ac-input w-full rounded-lg px-3 py-2"
            placeholder="teacher@school.sch"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            name="teacher_email"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            data-lpignore="true"
          />
        </div>
        <div>
          <label className="block ac-text-secondary text-sm mb-1">Temporary password</label>
          <p className="text-xs ac-text-muted mb-2">Leave blank to auto-generate a secure password on create — fastest path.</p>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              className="ac-input w-full rounded-lg px-3 py-2 pr-14"
              placeholder={`Optional — min ${MIN_PASSWORD_LENGTH} chars if you type your own`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              name="new-password"
              autoComplete="new-password"
              data-lpignore="true"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 ac-text-secondary hover:ac-text-primary text-sm"
              onClick={() => setShowPassword((p) => !p)}
              aria-label="Toggle password visibility"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <button
            type="button"
            onClick={fillGeneratedPassword}
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:text-emerald-300"
          >
            <Sparkles className="w-4 h-4" />
            Generate password (optional)
          </button>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-green-600 hover:bg-green-500 px-4 py-2 text-white font-medium disabled:opacity-50 w-full sm:w-auto"
          disabled={saving}
        >
          {saving ? 'Creating…' : 'Create login & email password'}
        </button>
      </form>
    </AdminPageWrapper>
  );
}
