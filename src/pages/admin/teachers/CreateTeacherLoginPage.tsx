import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { isValidEmailFormat } from '@/lib/emailValidator';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';

export default function CreateTeacherLoginPage() {
  const navigate = useNavigate();
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
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
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
          password,
          teacher_id: teacher.teacher_id,
          name: teacher.name,
          school_id: schoolId,
        }),
      });
      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');
      const data = isJson ? await response.json().catch(() => ({})) : {};
      if (!response.ok) {
        setError((data as { error?: string })?.error || `Request failed (${response.status})`);
        return;
      }
      if (!(data as { success?: boolean }).success) {
        setError((data as { error?: string })?.error || 'Failed to create login');
        return;
      }
      setSuccess('Teacher login created! They will receive an email with their password.');
      setTimeout(() => navigate(`/dashboard/admin/teachers/${teacherId}`), 800);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPageWrapper title="Create Teacher Login">
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
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              className="ac-input w-full rounded-lg px-3 py-2 pr-10"
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              name="new-password"
              autoComplete="new-password"
              data-lpignore="true"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 ac-text-secondary hover:ac-text-primary"
              onClick={() => setShowPassword((p) => !p)}
              aria-label="Toggle password visibility"
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-green-600 hover:bg-green-500 px-4 py-2 text-white font-medium disabled:opacity-50"
          disabled={saving}
        >
          {saving ? 'Creating...' : 'Create Login'}
        </button>
      </form>
    </AdminPageWrapper>
  );
}
