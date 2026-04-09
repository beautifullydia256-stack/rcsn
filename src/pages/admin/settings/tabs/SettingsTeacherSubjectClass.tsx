import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import SectionHeader from './SectionHeader';
import { settingsInsetSurface, settingsPrimaryActionClass } from './settingsTabStyles';

function assignmentRoleLabel(role: string | null | undefined): string {
  if (role === 'co_teacher') return 'Co-teacher';
  return 'Subject teacher';
}

const STALE_TIME_MS = 5 * 60 * 1000;

async function fetchTeacherSubjectClassData(userId: string): Promise<{
  schoolId: string;
  teachers: { teacher_id: string; name: string }[];
  assignments: {
    id: string;
    teacher_id: string;
    class_name: string;
    subject: string;
    assignment_role?: string | null;
  }[];
}> {
  const { data: u } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (!u?.school_id) return { schoolId: '', teachers: [], assignments: [] };
  const [tchsRes, assignRes] = await Promise.all([
    supabase.from('teachers').select('teacher_id,name').eq('school_id', u.school_id).order('name'),
    supabase
      .from('teacher_class_subjects')
      .select('id, teacher_id, class_name, subject, assignment_role')
      .eq('school_id', u.school_id)
      .order('created_at', { ascending: false }),
  ]);
  return {
    schoolId: u.school_id,
    teachers: tchsRes.data || [],
    assignments: assignRes.data || [],
  };
}

async function fetchClassSubjects(schoolId: string, selectedClass: string): Promise<string[]> {
  const { data } = await supabase
    .from('class_subjects')
    .select('subject')
    .eq('school_id', schoolId)
    .eq('class_name', selectedClass)
    .order('subject');
  return (data || []).map((r: { subject: string }) => r.subject);
}

export default function SettingsTeacherSubjectClass({
  classOptions,
  embedded,
}: {
  classOptions: string[];
  embedded?: boolean;
}) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignmentsQuery, setAssignmentsQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'settings', 'teacherSubjectClass', user?.id ?? ''],
    queryFn: () => fetchTeacherSubjectClassData(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
  });

  const schoolId = data?.schoolId ?? null;
  const teachers = data?.teachers ?? [];
  const [assignments, setAssignments] = useState<
    {
      id: string;
      teacher_id: string;
      class_name: string;
      subject: string;
      assignment_role?: string | null;
    }[]
  >([]);

  useEffect(() => {
    if (data?.assignments) setAssignments(data.assignments);
  }, [data?.assignments]);

  const { data: classSubjects = [] } = useQuery({
    queryKey: ['admin', 'settings', 'classSubjects', schoolId, selectedClass],
    queryFn: () => fetchClassSubjects(schoolId!, selectedClass),
    enabled: !!schoolId && !!selectedClass,
    staleTime: STALE_TIME_MS,
  });

  const loading = isLoading;

  const teacherNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const t of teachers) m[t.teacher_id] = t.name || '';
    return m;
  }, [teachers]);

  const filteredAssignments = useMemo(() => {
    const t = assignmentsQuery.trim().toLowerCase();
    if (!t) return assignments;
    return assignments.filter((a) => {
      const teacherName = teacherNameById[a.teacher_id] || '';
      return (
        teacherName.toLowerCase().includes(t) ||
        (a.class_name || '').toLowerCase().includes(t) ||
        (a.subject || '').toLowerCase().includes(t) ||
        assignmentRoleLabel(a.assignment_role).toLowerCase().includes(t)
      );
    });
  }, [assignments, assignmentsQuery, teacherNameById]);

  const assign = async () => {
    setError(null);
    if (!schoolId || !selectedTeacher || !selectedClass || selectedSubjects.length === 0) return;
    setSaving(true);
    const thisTeacherName =
      teachers.find((t) => t.teacher_id === selectedTeacher)?.name || 'This teacher';

    const payload: {
      school_id: string;
      teacher_id: string;
      class_name: string;
      subject: string;
      assignment_role: 'subject_teacher' | 'co_teacher';
    }[] = [];

    for (const s of selectedSubjects) {
      const { data: primary } = await supabase
        .from('teacher_class_subjects')
        .select('teacher_id')
        .eq('school_id', schoolId)
        .eq('class_name', selectedClass)
        .eq('subject', s)
        .eq('assignment_role', 'subject_teacher')
        .maybeSingle();

      const pid = (primary as { teacher_id?: string } | null)?.teacher_id;
      if (pid && pid === selectedTeacher) {
        window.alert(`Already assigned as subject teacher: ${s}`);
        continue;
      }
      if (pid && pid !== selectedTeacher) {
        const otherName = teachers.find((t) => t.teacher_id === pid)?.name || 'Another teacher';
        const ok = window.confirm(
          `${selectedClass} — ${s} already has a subject teacher (${otherName}).\n\nAdd ${thisTeacherName} as a co-teacher?`
        );
        if (!ok) continue;
        payload.push({
          school_id: schoolId,
          teacher_id: selectedTeacher,
          class_name: selectedClass,
          subject: s,
          assignment_role: 'co_teacher',
        });
      } else {
        payload.push({
          school_id: schoolId,
          teacher_id: selectedTeacher,
          class_name: selectedClass,
          subject: s,
          assignment_role: 'subject_teacher',
        });
      }
    }

    if (payload.length === 0) {
      setSaving(false);
      return;
    }

    const optimistic = payload.map((p) => ({
      id: `tmp-${Math.random()}`,
      ...p,
    }));
    setAssignments((prev) => [...optimistic, ...prev]);
    const { error: insertError } = await supabase.from('teacher_class_subjects').insert(payload);
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      setAssignments((prev) => prev.filter((a) => !String(a.id).startsWith('tmp-')));
      return;
    }
    setSelectedSubjects([]);
    await queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'teacherSubjectClass', user?.id] });
  };

  const remove = async (id: string) => {
    const prev = assignments;
    setAssignments(prev.filter((a) => a.id !== id));
    const { error: err } = await supabase
      .from('teacher_class_subjects')
      .delete()
      .eq('id', id);
    if (err) {
      setError(err.message);
      setAssignments(prev);
    } else {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'teacherSubjectClass', user?.id] });
    }
  };

  return (
    <div>
      <SectionHeader
        embedded={embedded}
        title="Teacher ↔ Subject ↔ Class Assignments"
        desc="Each class+subject has one subject teacher; additional staff can be co-teachers. Class teachers are set under Classes."
      />
      <div className={`${settingsInsetSurface} mb-4 p-4 sm:p-5`}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <select
          value={selectedTeacher}
          onChange={(e) => setSelectedTeacher(e.target.value)}
          className="ac-input min-h-[44px] w-full"
        >
          <option value="">Select Teacher</option>
          {teachers.map((t) => (
            <option key={t.teacher_id} value={t.teacher_id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="ac-input min-h-[44px] w-full"
        >
          <option value="">Select Class</option>
          {classOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="min-h-[44px] rounded-lg border border-[var(--pw-border)] bg-[var(--pw-s2)] px-3 py-2 ac-text-primary">
          {selectedClass ? (
            <div className="flex flex-wrap gap-2">
              {classSubjects.length === 0 ? (
                <span className="text-sm ac-text-muted">No subjects in this class yet</span>
              ) : (
                classSubjects.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`rounded-lg border px-3 py-1.5 text-sm min-h-[36px] ${
                      selectedSubjects.includes(s)
                        ? 'border-blue-400 bg-blue-600/80 text-white'
                        : 'border-[var(--pw-border)] bg-[var(--pw-s3)] ac-text-secondary hover:brightness-110'
                    }`}
                    onClick={() =>
                      setSelectedSubjects((prev) =>
                        prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                      )
                    }
                  >
                    {s}
                  </button>
                ))
              )}
            </div>
          ) : (
            <span className="text-sm ac-text-muted">Select a class to view subjects</span>
          )}
        </div>
        <button
          type="button"
          disabled={
            !selectedTeacher || !selectedClass || selectedSubjects.length === 0 || saving
          }
          onClick={assign}
          className={settingsPrimaryActionClass}
        >
          {saving ? 'Assigning...' : 'Assign'}
        </button>
      </div>
      </div>

      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm font-medium ac-text-secondary">Current assignments</div>
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ac-text-muted" aria-hidden />
          <input
            type="search"
            value={assignmentsQuery}
            onChange={(e) => setAssignmentsQuery(e.target.value)}
            placeholder="Search teacher, class, subject…"
            className="ac-glass-card ac-input min-h-0 w-full rounded-xl border py-2 pl-9 pr-3 text-sm placeholder:ac-text-muted"
            disabled={loading || assignments.length === 0}
          />
        </div>
      </div>

      <div className="ac-glass-card overflow-hidden rounded-xl border border-[var(--ac-border)]">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 p-3 sm:gap-4 sm:p-4 md:[grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={`sk-${i}`}
                className="flex min-h-[160px] flex-col rounded-xl border border-[var(--ac-border)] p-3 sm:p-4"
              >
                <div className="mb-3 h-3 w-20 rounded ac-skeleton-block animate-pulse" />
                <div className="mb-2 h-4 w-full rounded ac-skeleton-block animate-pulse" />
                <div className="mt-auto space-y-2">
                  <div className="h-3 w-full rounded ac-skeleton-block animate-pulse" />
                  <div className="h-3 w-4/5 rounded ac-skeleton-block animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : assignments.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm ac-text-muted">No assignments yet.</div>
        ) : filteredAssignments.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm ac-text-muted">No matches for your search.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-3 sm:gap-4 sm:p-5 md:[grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
            {filteredAssignments.map((a) => {
              const teacherName = teacherNameById[a.teacher_id] || a.teacher_id;
              const role = assignmentRoleLabel(a.assignment_role);
              return (
                <article
                  key={a.id}
                  className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--ac-border)] bg-white/[0.03] shadow-sm transition-shadow hover:shadow-md dark:bg-white/[0.04]"
                >
                  <div className="border-b border-[var(--ac-border)] px-3 py-3 sm:px-4">
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wider ac-text-muted">Teacher</p>
                    <p className="text-[15px] font-semibold leading-snug tracking-tight ac-text-primary line-clamp-2">
                      {teacherName}
                    </p>
                  </div>
                  <div className="flex flex-1 flex-col gap-2.5 px-3 py-3 text-sm sm:px-4 sm:py-4">
                    <div className="grid grid-cols-1 gap-0.5">
                      <span className="text-[10px] font-medium uppercase tracking-wider ac-text-muted">Class</span>
                      <span className="font-medium ac-text-secondary break-words">{a.class_name || '—'}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-0.5">
                      <span className="text-[10px] font-medium uppercase tracking-wider ac-text-muted">Subject</span>
                      <span className="font-medium ac-text-secondary break-words">{a.subject || '—'}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-0.5">
                      <span className="text-[10px] font-medium uppercase tracking-wider ac-text-muted">Role</span>
                      <span
                        className={
                          a.assignment_role === 'co_teacher'
                            ? 'inline-flex w-fit max-w-full rounded-md border border-amber-400/35 bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-200'
                            : 'inline-flex w-fit max-w-full rounded-md border border-emerald-400/35 bg-emerald-600/15 px-2 py-0.5 text-xs font-semibold text-emerald-200'
                        }
                      >
                        {role}
                      </span>
                    </div>
                  </div>
                  <div className="mt-auto border-t border-[var(--ac-border)] px-3 py-2.5 sm:px-4">
                    <button
                      type="button"
                      className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-rose-600/90 px-3 text-sm font-semibold text-white hover:bg-rose-500 active:bg-rose-700"
                      onClick={() => remove(a.id)}
                    >
                      Remove assignment
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
      {error && (
        <div className="mt-3 rounded-lg border border-red-400/40 bg-red-950/50 px-3 py-2 text-sm text-red-100">
          {error}
        </div>
      )}
    </div>
  );
}
