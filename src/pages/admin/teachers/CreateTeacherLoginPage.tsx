import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { isValidEmailFormat } from '@/lib/emailValidator';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';
import { useToast } from '@/components/Toast';
import { Mail } from 'lucide-react';

export default function CreateTeacherLoginPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { teacher_id: teacherIdParam } = useParams<{ teacher_id: string }>();
  const teacherId = Array.isArray(teacherIdParam) ? teacherIdParam[0] : teacherIdParam || '';

  const [teacherName, setTeacherName] = useState('');
  const [email, setEmail] = useState('');
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: t } = await supabase.from('teachers').select('name, email, school_id').eq('teacher_id', teacherId).single();
      setTeacherName(t?.name ? String(t.name) : '');
      setEmail(t?.email ? String(t.email) : '');
      setSchoolId((t?.school_id as string) || null);
    };
    if (teacherId) void load();
  }, [teacherId]);

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!teacherId || !schoolId) {
      setError('Missing teacher or school context');
      return;
    }
    const addr = email.trim();
    if (!isValidEmailFormat(addr)) {
      setError('Enter a valid email address.');
      return;
    }
    setSaving(true);
    try {
      try {
        await supabase.from('teachers').update({ email: addr }).eq('teacher_id', teacherId);
      } catch {
        /* non-fatal */
      }
      const apiBase = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
      const url = apiBase ? `${apiBase}/api/admin/create-user-account` : '/api/admin/create-user-account';
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sendEmailInvite: true,
          email: addr,
          teacherId,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg = (data as { error?: string })?.error || `Request failed (${response.status})`;
        setError(msg);
        toast.error(msg);
        return;
      }
      toast.success((data as { message?: string }).message || 'Invitation sent.');
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
      title="Invite teacher"
      subtitle="We send an email invitation only — they set their own password. The email is saved on their teacher record."
    >
      <div className="flex items-center justify-end gap-2 mb-4">
        <button
          type="button"
          className="ac-glass-btn-secondary rounded-xl px-3 py-2 text-sm"
          onClick={() => navigate(`/dashboard/admin/teachers/${teacherId}`)}
        >
          Back
        </button>
      </div>
      {error && <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-3 py-2">{error}</div>}
      <form className={`${adminCardClass} space-y-4`} autoComplete="off" onSubmit={(e) => void sendInvite(e)}>
        <p className="text-sm ac-text-secondary">
          <span className="font-medium ac-text-primary">{teacherName || 'Teacher'}</span>
        </p>
        <div>
          <label className="block ac-text-secondary text-sm mb-1">Email for invitation</label>
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
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-white font-medium disabled:opacity-50 w-full sm:w-auto"
          disabled={saving}
        >
          <Mail className="h-4 w-4" />
          {saving ? 'Sending…' : 'Send invitation'}
        </button>
        <p className="text-xs ac-text-muted">
          For bulk invites from the roster, use User Management → Send invitations.
        </p>
      </form>
    </AdminPageWrapper>
  );
}
