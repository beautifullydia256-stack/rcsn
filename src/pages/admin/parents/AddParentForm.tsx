import { useState, type FormEvent, useMemo, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';
import { ArrowLeft, Search, X } from 'lucide-react';
import LiquidGlassSelect from '@/components/ui/LiquidGlassSelect';
import {
  addParentSchoolQueryKey,
  addParentSchoolStaleOptions,
  fetchAddParentSchoolContext,
  type AddParentSchoolStudent,
} from './addParentSchoolQuery';
import { ensureParentLinkForStudent } from '@/lib/ensureParentLink';
import { isValidEmailFormat } from '@/lib/emailValidator';

const RELATIONSHIP_OPTIONS = [
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
    if (addr && !isValidEmailFormat(addr)) {
      setError('Enter a valid email address, or leave email empty to save the guardian without portal access for now.');
      return;
    }

    setSubmitting(true);
    try {
      const linkRes = await ensureParentLinkForStudent({
        student_id: studentId,
        school_id: schoolId,
        name: trimName,
        ...(addr ? { email: addr } : {}),
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

  // "Link existing user" search
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<{ user_id: string; name: string; email: string; role: string; phone?: string }[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [linkedFromUser, setLinkedFromUser] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    if (!schoolId || userSearchQuery.trim().length < 2) {
      setUserSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setUserSearchLoading(true);
      try {
        const q = userSearchQuery.trim();
        const { data: results } = await supabase
          .from('users')
          .select('user_id, name, email, role, phone')
          .eq('school_id', schoolId)
          .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
          .neq('role', 'parent')
          .limit(6);
        setUserSearchResults(results || []);
      } catch {
        setUserSearchResults([]);
      } finally {
        setUserSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [userSearchQuery, schoolId]);

  const fillFromExistingUser = (u: { user_id: string; name: string; email: string; role: string; phone?: string }) => {
    setName(u.name || '');
    setEmail(u.email || '');
    if (u.phone) setPhone(u.phone);
    setLinkedFromUser({ name: u.name, role: u.role });
    setUserSearchQuery('');
    setUserSearchResults([]);
  };

  const inputClass =
    'w-full min-h-[46px] rounded-xl border border-white/20 px-3.5 py-2.5 text-sm shadow-inner ' +
    'bg-black/25 text-white placeholder-white/40 backdrop-blur-sm ' +
    'focus:border-emerald-400 focus:bg-black/35 focus:outline-none focus:ring-1 focus:ring-emerald-400/50 transition-all';
  const labelClass = 'mb-1.5 block text-[11px] font-bold text-white/70 uppercase tracking-wider';

  const goBack = () => {
    if (mode === 'modal') onCancel?.();
    else navigate('/dashboard/admin/parents');
  };

  if (isPending && data === undefined) {
    const spinner = (
      <div className="flex items-center justify-center py-12 text-sm text-white/60">Loading...</div>
    );
    if (mode === 'modal') return spinner;
    return <AdminPageWrapper title="Add Parent">{spinner}</AdminPageWrapper>;
  }

  if (!schoolId) {
    const msg = (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
        You are not linked to a school. Please contact support.
      </div>
    );
    if (mode === 'modal') return msg;
    return <AdminPageWrapper title="Add Parent">{msg}</AdminPageWrapper>;
  }

  const formBody = (
    <div className="w-full space-y-5">
      {mode === 'page' && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goBack}
            className="px-4 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white/90 text-sm font-medium backdrop-blur-sm transition-all inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Back to Parents
          </button>
        </div>
      )}

      {/* Link existing user */}
      <div className="rounded-2xl border border-white/20 bg-white/5 p-4 relative z-40 backdrop-blur-md space-y-2">
        <p className="text-sm font-semibold text-white">Is this person already in the system?</p>
        <p className="text-xs text-white/60">
          Search by name or email to find an existing staff account and auto-fill their details.
        </p>
        {linkedFromUser ? (
          <div className="flex items-center gap-3 rounded-xl bg-emerald-500/15 border border-emerald-400/30 px-3.5 py-2.5">
            <span className="text-emerald-300 text-sm font-bold">OK</span>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-emerald-300">Filled from: </span>
              <span className="text-sm text-emerald-200">{linkedFromUser.name}</span>
              <span className="ml-2 text-xs text-emerald-400/70 capitalize">({linkedFromUser.role})</span>
            </div>
            <button
              type="button"
              onClick={() => setLinkedFromUser(null)}
              className="text-emerald-300/70 hover:text-white text-sm font-bold"
              aria-label="Clear link"
            >×</button>
          </div>
        ) : (
          <div>
            <div className="relative">
              <input
                className={inputClass + ' pr-10'}
                placeholder="Search name or email..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                autoComplete="off"
              />
              {userSearchLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
              )}
            </div>
            {userSearchResults.length > 0 && (
              <div className="mt-1 rounded-2xl border border-white/20 bg-slate-950/90 shadow-2xl backdrop-blur-xl overflow-hidden relative z-50">
                {userSearchResults.map((u) => (
                  <button
                    key={u.user_id}
                    type="button"
                    onClick={() => fillFromExistingUser(u)}
                    className="w-full text-left px-4 py-3 hover:bg-emerald-500/15 transition-colors border-b border-white/10 last:border-b-0"
                  >
                    <div className="text-sm font-medium text-white">{u.name}</div>
                    <div className="text-xs text-white/60 mt-0.5">{u.email} · <span className="capitalize text-emerald-300">{u.role}</span></div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200 whitespace-pre-wrap">
            {error}
          </div>
        )}

        <div ref={pickerRef} className="relative z-30">
          <label className={labelClass} id="add-par-student-label">
            Student <span className="text-amber-400">*</span>
          </label>
          <p className="mb-2 text-xs text-white/50">
            Search by name, class, or admission number. Students can have more than one parent; anyone already linked still appears here.
          </p>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
              aria-hidden
            />
            <input
              type="text"
              className={`${inputClass} pl-10 pr-10`}
              placeholder="Type to search students..."
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
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-white/50 hover:text-white"
                onClick={clearStudent}
                aria-label="Clear student"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {pickerOpen && (
            <ul
              className="absolute z-40 mt-1 max-h-60 w-full overflow-auto rounded-2xl border border-white/20 bg-slate-950/95 py-1 shadow-2xl backdrop-blur-xl no-scrollbar"
              role="listbox"
            >
              {filteredStudents.length === 0 ? (
                <li className="px-3.5 py-2.5 text-xs text-white/50">No matching students.</li>
              ) : (
                filteredStudents.map((s) => (
                  <li key={s.student_id} role="option">
                    <button
                      type="button"
                      className="flex w-full flex-col items-start gap-0.5 px-3.5 py-2.5 text-left text-sm hover:bg-emerald-500/15 transition-colors border-b border-white/5 last:border-b-0"
                      onMouseDown={(ev) => {
                        ev.preventDefault();
                        pickStudent(s);
                      }}
                    >
                      <span className="font-medium text-white">{s.name}</span>
                      <span className="text-xs text-white/60">
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

        <div className="relative z-20">
          <label className={labelClass}>
            Relationship to student <span className="text-amber-400">*</span>
          </label>
          <LiquidGlassSelect
            value={relationship}
            onChange={(val) => setRelationship(val)}
            options={RELATIONSHIP_OPTIONS}
            placeholder="Select relationship"
          />
          <p className="mt-1 text-xs text-white/50">
            You can add more detail later on the parent&apos;s profile.
          </p>
        </div>

        <div>
          <label className={labelClass}>
            Parent / Guardian name <span className="text-amber-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="Parent or guardian name"
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
            placeholder="Optional — add later, then use Invite to portal"
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

        <p className="text-xs text-white/50">
          If you include an email, we create or link their portal login immediately. If you leave email
          empty, we only save the guardian on the student — add an email on their profile later, then use{' '}
          <span className="font-medium text-white/70">Invite to portal</span> to send the welcome message and one-time password.
        </p>

        <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-white/15">
          <button
            type="button"
            onClick={goBack}
            className="px-5 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white/90 text-sm font-medium backdrop-blur-sm transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || (isFetching && !data)}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-semibold shadow-lg shadow-emerald-950/40 border border-emerald-400/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? 'Adding...' : 'Add parent'}
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
