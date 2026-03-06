import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import { ArrowLeft } from 'lucide-react';

const STALE_TIME_MS = 5 * 60 * 1000;

async function fetchSchoolAndStudents(userId: string) {
  const { data: u } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (!u?.school_id) return { schoolId: null as string | null, students: [] as { student_id: string; name: string; current_class: string }[] };

  const { data: students } = await supabase
    .from('students')
    .select('student_id, name, current_class')
    .eq('school_id', u.school_id)
    .eq('status', 'active')
    .order('name');

  return {
    schoolId: u.school_id,
    students: (students || []) as { student_id: string; name: string; current_class: string }[],
  };
}

export default function AddParentPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'add-parent', 'school', user?.id ?? ''],
    queryFn: () => fetchSchoolAndStudents(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
  });

  const schoolId = data?.schoolId ?? null;
  const students = data?.students ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
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

      navigate('/dashboard/admin/parents');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add parent.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500';
  const labelClass = 'mb-1 block text-sm font-medium text-gray-700';

  if (isLoading && !data) {
    return (
      <AdminPageWrapper title="Add Parent">
        <div className="flex items-center justify-center py-12 text-gray-500">Loading...</div>
      </AdminPageWrapper>
    );
  }

  if (!schoolId) {
    return (
      <AdminPageWrapper title="Add Parent">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          You are not linked to a school. Please contact support.
        </div>
      </AdminPageWrapper>
    );
  }

  return (
    <AdminPageWrapper title="Add Parent">
      <div className="max-w-xl w-full space-y-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/parents')}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Parents
          </button>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label className={labelClass}>Student <span className="text-red-500">*</span></label>
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
            <label className={labelClass}>Parent / Guardian name <span className="text-red-500">*</span></label>
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

          <p className="text-xs text-gray-500">
            At least one of email or phone is required. A parent account (login) will be created or linked so they can access the parent portal.
          </p>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? 'Adding…' : 'Add Parent'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/admin/parents')}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </AdminPageWrapper>
  );
}
