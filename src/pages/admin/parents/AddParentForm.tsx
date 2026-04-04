import { useState, type FormEvent, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';
import { ArrowLeft, Search, X } from 'lucide-react';
import {
  addParentSchoolQueryKey,
  addParentSchoolStaleOptions,
  fetchAddParentSchoolContext,
  type AddParentSchoolStudent,
} from './addParentSchoolQuery';
import { ensureParentLinkForStudent } from '@/lib/ensureParentLink';

const RELATIONSHIP_OPTIONS = [
  { value: '', label: 'Select relationship…' },
  { value: 'Father', label: 'Father' },
  { value: 'Mother', label: 'Mother' },
  { value: 'Guardian', label: 'Guardian' },
  { value: 'Other', label: 'Other' },
];

export type AddParentFormProps = {
  mode: 'page' | 'modal';
  onCompleted?: () => void;
  onCancel?: () => void;
};

function normalize(s: string) {
  return s.trim().toLowerCase();
}

export function AddParentForm({ mode, onCompleted, onCancel }: AddParentFormProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [studentId, setStudentId] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [relationship, setRelationship] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const userId = user?.id ?? '';
  const { data, isPending, isFetching } = useQuery({
    queryKey: addParentSchoolQueryKey(userId),
    queryFn: () => fetchAddParentSchoolContext(user!.id),
    enabled: !!user?.id,
    // No placeholderData: avoid submitting another user's school_id after account switch.
    refetchOnWindowFocus: false,
    ...addParentSchoolStaleOptions,
  });

  const schoolId = data?.schoolId ?? null;
  const students = data?.students ?? [];

  const selectedStudent = useMemo(
    () => students.find((s) => s.student_id === studentId) ?? null,
    [students, studentId]
  );

  const filteredStudents = useMemo(() => {
    const q = normalize(studentQuery);
    let list: AddParentSchoolStudent[] = students;
    if (q) {
      list = students.filter((s) => {
        const hay = `${s.name} ${s.current_class} ${s.admission_number}`.toLowerCase();
        return hay.includes(q);
      });
    }
    return list.slice(0, 20);
  }, [students, studentQuery]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onDoc = (e: MouseEvent) => {
      const el = pickerRef.current;
      if (el && !el.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [pickerOpen]);

  const clearStudent = () => {
    setStudentId('');
    setStudentQuery('');
    setPickerOpen(false);
  };

  const pickStudent = (s: AddParentSchoolStudent) => {
    setStudentId(s.student_id);
    const adm = s.admission_number ? ` · ${s.admission_number}` : '';
    setStudentQuery(`${s.name} (${s.current_class})${adm}`);
    setPickerOpen(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimName = name.trim();
    if (!trimName) {
      setError('Parent name is required.');
      return;
    }
    if (!studentId) {
      setError('Please search and select a student.');
      return;
    }
    if (!relationship.trim()) {
      setError('Please select how this person is related to the student (e.g. Father, Mother).');
      return;
    }
    if (isFetching) {
      setError('Still loading your school. Please wait a moment and try again.');
      return;
    }
    if (!schoolId) {
      setError('You are not linked to a school.');
      return;
    }
    const addr = email.trim();
    if (!addr) {
      setError('Email is required so the parent can sign in to the portal.');
      return;
    }

    setSubmitting(true);
    try {
      const linkRes = await ensureParentLinkForStudent({
        student_id: studentId,
        school_id: schoolId,
        name: trimName,
        email: addr,
        phone: phone.trim() || undefined,
        relationship: relationship.trim(),
      });
      if (!linkRes.ok) {
        throw new Error(linkRes.error || 'Failed to add parent');
      }

      if (mode === 'modal') {
        clearStudent();
        setRelationship('');
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

        <div ref={pickerRef} className="relative">
          <label className={labelClass} id="add-par-student-label">
            Student <span className="text-red-500">*</span>
          </label>
          <p className="mb-2 text-xs text-[var(--ac-text-muted)]">
            Search by name, class, or admission number. Students can have more than one parent (e.g. father and mother);
            anyone already linked still appears here.
          </p>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="text"
              className={`${inputClass} pl-10 pr-10`}
              placeholder="Type to search students…"
              value={studentQuery}
              onChange={(e) => {
                const v = e.target.value;
                setStudentQuery(v);
                if (studentId && selectedStudent) {
                  const adm = selectedStudent.admission_number ? ` · ${selectedStudent.admission_number}` : '';
                  const expected = `${selectedStudent.name} (${selectedStudent.current_class})${adm}`;
                  if (v !== expected) {
                    setStudentId('');
                  }
                }
                setPickerOpen(true);
              }}
              onFocus={() => setPickerOpen(true)}
              aria-labelledby="add-par-student-label"
              autoComplete="off"
            />
            {(studentId || studentQuery) && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={clearStudent}
                aria-label="Clear student"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {pickerOpen && (
            <ul
              className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-900"
              role="listbox"
            >
              {filteredStudents.length === 0 ? (
                <li className="px-3 py-2 text-sm text-slate-500">No matching students.</li>
              ) : (
                filteredStudents.map((s) => (
                  <li key={s.student_id} role="option">
                    <button
                      type="button"
                      className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                      onMouseDown={(ev) => {
                        ev.preventDefault();
                        pickStudent(s);
                      }}
                    >
                      <span className="font-medium text-slate-900 dark:text-slate-100">{s.name}</span>
                      <span className="text-xs text-slate-500">
                        {s.current_class}
                        {s.admission_number ? ` · Adm ${s.admission_number}` : ''}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        <div>
          <label className={labelClass}>
            Relationship to student <span className="text-red-500">*</span>
          </label>
          <select
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            className={inputClass}
            required
          >
            {RELATIONSHIP_OPTIONS.map((o) => (
              <option key={o.label} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-[var(--ac-text-muted)]">
            You can add more detail later on the parent&apos;s profile.
          </p>
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
          <label className={labelClass}>
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="e.g. parent@example.com"
            required
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
          A real email is required so we can create or link their parent portal login. Phone is optional but useful for
          your records.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting || (isFetching && !data)}
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
