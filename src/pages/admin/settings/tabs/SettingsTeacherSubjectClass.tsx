import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import SectionHeader from './SectionHeader';
import { settingsInsetSurface, settingsPrimaryActionClass } from './settingsTabStyles';
import {
  assignmentRoleLabel,
  buildClassTeacherMap,
  filterAssignmentsBySearch,
  groupIntoTeacherCards,
} from '@/lib/teacherAssignmentCardGrouping';

const STALE_TIME_MS = 5 * 60 * 1000;

async function fetchTeacherSubjectClassData(schoolId: string): Promise<{
  teachers: { teacher_id: string; name: string }[];
  assignments: {
    id: string;
    teacher_id: string;
    class_name: string;
    subject: string;
    assignment_role?: string | null;
    stream_name?: string | null;
  }[];
  classTeachers: { teacher_id: string; class_name: string | null }[];
  streamsByClass: Record<string, string[]>;
}> {
  const [tchsRes, assignRes, ctRes, streamsRes] = await Promise.all([
    supabase.from('teachers').select('teacher_id,name').eq('school_id', schoolId).order('name'),
    supabase
      .from('teacher_class_subjects')
      .select('id, teacher_id, class_name, subject, assignment_role, stream_name')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false }),
    supabase.from('class_teachers').select('teacher_id, class_name').eq('school_id', schoolId),
    supabase.from('class_streams').select('class_name, stream_name').eq('school_id', schoolId).order('sort_order').order('stream_name'),
  ]);
  const streamsByClass: Record<string, string[]> = {};
  for (const s of (streamsRes.data ?? []) as { class_name: string; stream_name: string }[]) {
    if (!streamsByClass[s.class_name]) streamsByClass[s.class_name] = [];
    streamsByClass[s.class_name].push(s.stream_name);
  }
  return {
    teachers: tchsRes.data || [],
    assignments: assignRes.data || [],
    classTeachers: ctRes.data || [],
    streamsByClass,
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
  schoolId,
}: {
  classOptions: string[];
  embedded?: boolean;
  schoolId: string | null;
}) {
  const queryClient = useQueryClient();
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStream, setSelectedStream] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignmentsQuery, setAssignmentsQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'settings', 'teacherSubjectClass', schoolId ?? ''],
    queryFn: () => fetchTeacherSubjectClassData(schoolId!),
    enabled: !!schoolId,
    staleTime: STALE_TIME_MS,
  });
  const teachers = data?.teachers ?? [];
  const classTeacherMap = useMemo(() => buildClassTeacherMap(data?.classTeachers ?? []), [data?.classTeachers]);
  const streamsByClass = data?.streamsByClass ?? {};
  const [assignments, setAssignments] = useState<
    {
      id: string;
      teacher_id: string;
      class_name: string;
      subject: string;
      assignment_role?: string | null;
      stream_name?: string | null;
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

  const filteredAssignments = useMemo(
    () => filterAssignmentsBySearch(assignments, assignmentsQuery, teacherNameById, classTeacherMap),
    [assignments, assignmentsQuery, teacherNameById, classTeacherMap],
  );

  const groupedTeachers = useMemo(
    () => groupIntoTeacherCards(filteredAssignments, teacherNameById, classTeacherMap),
    [filteredAssignments, teacherNameById, classTeacherMap],
  );

  const assign = async () => {
    setError(null);
    if (!schoolId || !selectedTeacher || !selectedClass || selectedSubjects.length === 0) return;
    setSaving(true);
    const thisTeacherName =
      teachers.find((t) => t.teacher_id === selectedTeacher)?.name || 'This teacher';
    const streamName = selectedStream || null;

    const payload: {
      school_id: string;
      teacher_id: string;
      class_name: string;
      subject: string;
      assignment_role: 'subject_teacher' | 'co_teacher';
      stream_name: string | null;
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
          stream_name: streamName,
        });
      } else {
        payload.push({
          school_id: schoolId,
          teacher_id: selectedTeacher,
          class_name: selectedClass,
          subject: s,
          assignment_role: 'subject_teacher',
          stream_name: streamName,
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
    await queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'teacherSubjectClass', schoolId] });
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
      await queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'teacherSubjectClass', schoolId] });
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
          onChange={(e) => { setSelectedClass(e.target.value); setSelectedStream(''); }}
          className="ac-input min-h-[44px] w-full"
        >
          <option value="">Select Class</option>
          {classOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {selectedClass && streamsByClass[selectedClass] && streamsByClass[selectedClass].length >= 2 && (
          <select
            value={selectedStream}
            onChange={(e) => setSelectedStream(e.target.value)}
            className="ac-input min-h-[44px] w-full"
          >
            <option value="">All streams (no restriction)</option>
            {streamsByClass[selectedClass].map((sn) => (
              <option key={sn} value={sn}>{sn}</option>
            ))}
          </select>
        )}
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
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 p-3 sm:p-5 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`sk-${i}`}
                className="flex min-h-[180px] flex-col rounded-2xl border border-[var(--ac-border)] p-4"
              >
                <div className="mb-3 h-4 w-32 rounded ac-skeleton-block animate-pulse" />
                <div className="mb-2 h-3 w-24 rounded ac-skeleton-block animate-pulse" />
                <div className="mt-4 space-y-3">
                  <div className="h-16 w-full rounded-lg ac-skeleton-block animate-pulse" />
                  <div className="h-16 w-full rounded-lg ac-skeleton-block animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : assignments.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm ac-text-muted">No assignments yet.</div>
        ) : groupedTeachers.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm ac-text-muted">No matches for your search.</div>
        ) : (
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 p-3 sm:gap-5 sm:p-5 md:grid-cols-2">
            {groupedTeachers.map((card) => (
              <article
                key={card.teacherId}
                className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--ac-border)] bg-white/[0.03] shadow-md shadow-black/5 transition-shadow hover:shadow-lg dark:bg-white/[0.04]"
              >
                <header className="border-b border-[var(--ac-border)] bg-[var(--pw-s2)]/50 px-4 py-4 dark:bg-white/[0.03]">
                  <p className="text-[10px] font-semibold uppercase tracking-wider ac-text-muted">Teacher</p>
                  <h3 className="mt-1 text-lg font-bold leading-snug tracking-tight ac-text-primary">{card.teacherName}</h3>
                  {card.classTeacherOf.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider ac-text-muted">Class teacher</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {card.classTeacherOf.map((c) => (
                          <span
                            key={c}
                            className="inline-flex rounded-full border border-sky-400/40 bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-800 dark:text-sky-200"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </header>
                <div className="flex flex-1 flex-col gap-6 p-4">
                  {card.byClass.map(({ className, rows }) => (
                    <section key={`${card.teacherId}-${className}`}>
                      <h4 className="mb-3 border-l-2 border-emerald-500/70 pl-3 text-sm font-bold uppercase tracking-wide ac-text-primary">
                        {className}
                      </h4>
                      <ul className="space-y-2">
                        {rows.map((a) => {
                          const role = assignmentRoleLabel(a.assignment_role);
                          return (
                            <li
                              key={a.id}
                              className="rounded-xl border border-[var(--ac-border)] bg-white/[0.02] p-3 dark:bg-white/[0.02]"
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                <div className="min-w-0 flex-1">
                                  <p className="text-[15px] font-semibold leading-snug ac-text-primary">{a.subject}</p>
                                  <div className="mt-1 flex flex-wrap items-center gap-2">
                                    <span
                                      className={
                                        a.assignment_role === 'co_teacher'
                                          ? 'text-xs font-medium text-amber-700 dark:text-amber-300'
                                          : 'text-xs font-medium text-emerald-700 dark:text-emerald-300'
                                      }
                                    >
                                      {role}
                                    </span>
                                    {(a as { stream_name?: string | null }).stream_name && (
                                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold uppercase text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                                        {(a as { stream_name?: string | null }).stream_name}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="shrink-0 rounded-xl bg-rose-600/90 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 active:bg-rose-700 sm:min-w-[7rem]"
                                  onClick={() => remove(a.id)}
                                >
                                  Remove
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}
                </div>
              </article>
            ))}
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
