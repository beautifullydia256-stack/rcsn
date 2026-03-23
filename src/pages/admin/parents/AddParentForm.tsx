import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';
import { ArrowLeft } from 'lucide-react';
import {
  addParentSchoolQueryKey,
  addParentSchoolStaleOptions,
  fetchAddParentSchoolContext,
} from './addParentSchoolQuery';

export type AddParentFormProps = {
  mode: 'page' | 'modal';
  onCompleted?: () => void;
  onCancel?: () => void;
};

export function AddParentForm({ mode, onCompleted, onCancel }: AddParentFormProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isPending } = useQuery({
    queryKey: addParentSchoolQueryKey(user?.id ?? ''),
    queryFn: () => fetchAddParentSchoolContext(user!.id),
    enabled: !!user?.id,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    ...addParentSchoolStaleOptions,
  });

  const schoolId = data?.schoolId ?? null;
  const students = data?.students ?? [];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimName = name.trim();
    if (!trimName) {
      setError('Parent name is required.');
      return;
    }
    if (!studentId) {
      setError('Please select a student.');
      return;
    }
    if (!schoolId) {
      setError('You are not linked to a school.');
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setError('At least one of email or phone is required.');
      return;
    }

    setSubmitting(true);
    try {
      const apiBase = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
      const url = apiBase ? `${apiBase}/api/admin/ensure-parent-link` : '/api/admin/ensure-parent-link';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          student_id: studentId,
          school_id: schoolId,
          name: trimName,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
      });

      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(result.error || res.statusText || 'Failed to add parent');
      }

      if (mode === 'modal') {
        setStudentId('');
        setName('');
        setEmail('');
        setPhone('');
        onCompleted?.();
      } else {
        navigate('/dashboard/admin/parents');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add parent.');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldBase =
    'w-full min-h-[48px] rounded-xl border border-slate-300 px-3 py-2.5 text-base shadow-sm ' +
    'bg-white text-slate-900 placeholder:text-slate-400 ' +
    'dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 ' +
    'focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/35';
  const inputClass = fieldBase;
  const labelClass = 'mb-1.5 block text-sm font-medium ac-text-primary';

  const goBack = () => {
    if (mode === 'modal') onCancel?.();
    else navigate('/dashboard/admin/parents');
  };

  if (isPending && data === undefined) {
    const spinner = (
      <div className="flex items-center justify-center py-12 ac-text-muted">Loading…</div>
    );
    if (mode === 'modal') return spinner;
    return <AdminPageWrapper title="Add Parent">{spinner}</AdminPageWrapper>;
  }

  if (!schoolId) {
    const msg = (
      <div className={`${adminCardClass} border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100`}>
        You are not linked to a school. Please contact support.
      </div>
    );
    if (mode === 'modal') return msg;
    return <AdminPageWrapper title="Add Parent">{msg}</AdminPageWrapper>;
  }

  const formBody = (
    <div className="max-w-xl w-full space-y-6">
      {mode === 'page' && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goBack}
            className="ac-glass-btn-secondary inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium ac-text-primary"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Back to Parents
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className={`${adminCardClass} space-y-4 p-6`}>
        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-800 dark:text-rose-100 whitespace-pre-wrap">
            {error}
          </div>
        )}

        <div>
          <label className={labelClass}>
            Student <span className="text-red-500">*</span>
          </label>
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className={inputClass}
            required
          >
            <option value="">Select student</option>
            {students.map((s) => (
              <option key={s.student_id} value={s.student_id}>
                {s.name} ({s.current_class})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>
            Parent / Guardian name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="e.g. Jane Doe"
            required
          />
        </div>

        <div>
          <label className={labelClass}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="e.g. parent@example.com"
          />
        </div>

        <div>
          <label className={labelClass}>Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
            placeholder="e.g. 0700123456"
          />
        </div>

        <p className="text-xs text-[var(--ac-text-muted)]">
          At least one of email or phone is required. A parent account (login) will be created or linked so they can access the parent portal.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="min-h-[48px] rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? 'Adding…' : 'Add parent'}
          </button>
          <button
            type="button"
            onClick={goBack}
            className="ac-glass-btn-secondary min-h-[48px] rounded-xl px-5 py-3 text-sm font-medium ac-text-primary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );

  if (mode === 'page') {
    return <AdminPageWrapper title="Add Parent">{formBody}</AdminPageWrapper>;
  }
  return formBody;
}
