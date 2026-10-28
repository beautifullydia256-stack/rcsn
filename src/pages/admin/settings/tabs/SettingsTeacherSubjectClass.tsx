import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { GovRollingBox } from '@/components/ui/GovLoadingIndicator';
import { supabase } from '@/lib/supabase';
import SectionHeader from './SectionHeader';
import { useAcademicVocabulary } from '@/hooks/useAcademicVocabulary';
import TertiaryCohortPicker from '@/components/tertiary/TertiaryCohortPicker';
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
  const { isTertiary, v } = useAcademicVocabulary();
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
    <div className="space-y-6">
      <SectionHeader
        embedded={embedded}
        title={isTertiary ? 'FACULTY COURSE ALLOCATION MATRIX' : 'TEACHER SUBJECT & CLASS ALLOCATION'}
        badge="FACULTY DEPLOYMENT"
      />

      {/* Assignment Setup Card */}
      <div className="gov-card p-5 space-y-4">
        <div className="border-b border-[#E2E8F0] pb-2 mb-2 flex items-center justify-between">
          <span className="text-xs font-mono uppercase font-bold text-[#111111] tracking-wider">
            ALLOCATE TUTOR TO COHORT & COURSE UNITS
          </span>
        </div>

        <div className={`grid grid-cols-1 gap-4 ${isTertiary ? 'md:grid-cols-5' : 'md:grid-cols-4'} items-end`}>
          <div>
            <label className="mb-1 block text-xs font-mono uppercase font-bold text-[#555555]">
              {v.selectTeacher}
            </label>
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="gov-select w-full"
            >
              <option value="">{v.selectTeacher}...</option>
              {teachers.map((t) => (
                <option key={t.teacher_id} value={t.teacher_id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {isTertiary ? (
            <div className="md:col-span-2">
              <TertiaryCohortPicker
                selectedCohort={selectedClass}
                onChange={(cohortKey) => {
                  setSelectedClass(cohortKey);
                  setSelectedStream('');
                  setSelectedSubjects([]);
                }}
                layout="grid"
                showLabels
                programmeLabel="PROGRAMME"
                semesterLabel="YEAR & SEMESTER"
              />
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-mono uppercase font-bold text-[#555555]">
                {v.selectClass}
              </label>
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedStream('');
                  setSelectedSubjects([]);
                }}
                className="gov-select w-full"
              >
                <option value="">{v.selectClass}...</option>
                {classOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedClass && streamsByClass[selectedClass] && streamsByClass[selectedClass].length >= 2 && (
            <div>
              <label className="mb-1 block text-xs font-mono uppercase font-bold text-[#555555]">
                STREAM / SET
              </label>
              <select
                value={selectedStream}
                onChange={(e) => setSelectedStream(e.target.value)}
                className="gov-select w-full"
              >
                <option value="">{isTertiary ? 'All sets' : 'All streams'}</option>
                {streamsByClass[selectedClass].map((sn) => (
                  <option key={sn} value={sn}>{sn}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <button
              type="button"
              disabled={
                !selectedTeacher || !selectedClass || selectedSubjects.length === 0 || saving
              }
              onClick={assign}
              className="gov-btn gov-btn-sm gov-btn-primary w-full h-[38px]"
            >
              {saving ? 'ASSIGNING...' : 'CONFIRM ALLOCATION'}
            </button>
          </div>
        </div>

        {/* Course Unit Chips */}
        <div>
          <label className="mb-1.5 block text-xs font-mono uppercase font-bold text-[#555555]">
            SELECT COURSE UNITS / PAPERS
          </label>
          <div className="min-h-[48px] rounded border border-[#CCCCCC] bg-[#FDFDFD] p-3">
            {selectedClass ? (
              <div className="flex flex-wrap gap-2">
                {classSubjects.length === 0 ? (
                  <span className="text-xs font-mono text-[#888888]">
                    {isTertiary ? 'NO COURSE UNITS RECORDED FOR THIS COHORT' : 'NO SUBJECTS IN THIS CLASS YET'}
                  </span>
                ) : (
                  classSubjects.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`gov-btn gov-btn-sm font-mono text-xs ${
                        selectedSubjects.includes(s)
                          ? 'gov-btn-primary'
                          : 'border-[#CCCCCC] bg-white text-[#222222]'
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
              <span className="text-xs font-mono text-[#888888]">
                {isTertiary ? 'SELECT A PROGRAMME AND SEMESTER TO VIEW REGISTERED COURSE UNITS' : 'SELECT A CLASS TO VIEW SUBJECTS'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Control bar search */}
      <div className="gov-control-bar">
        <div className="gov-control-bar-left">
          <div className="relative min-w-0 w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#888888]" aria-hidden />
            <input
              type="search"
              value={assignmentsQuery}
              onChange={(e) => setAssignmentsQuery(e.target.value)}
              placeholder={isTertiary ? 'SEARCH FACULTY, COHORT, COURSE UNIT...' : 'SEARCH TEACHER, CLASS, SUBJECT...'}
              className="gov-input w-full pl-9 text-xs uppercase"
              disabled={loading || assignments.length === 0}
            />
          </div>
        </div>
        <div className="gov-control-bar-right">
          <span className="text-xs font-mono text-[#555555]">
            TOTAL ALLOCATIONS: <span className="font-bold text-[#111111]">{assignments.length}</span>
          </span>
        </div>
      </div>

      {/* Current assignments list */}
      <div>
        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <GovRollingBox size="md" />
          </div>
        ) : assignments.length === 0 ? (
          <div className="px-4 py-12 text-center text-xs font-mono text-[#888888] gov-card">NO ALLOCATIONS RECORDED YET.</div>
        ) : groupedTeachers.length === 0 ? (
          <div className="px-4 py-12 text-center text-xs font-mono text-[#888888] gov-card">NO MATCHES FOUND FOR QUERY.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {groupedTeachers.map((card) => (
              <div
                key={card.teacherId}
                className="gov-card p-0 overflow-hidden flex flex-col justify-between"
              >
                <div className="border-b border-[#E2E8F0] bg-[#FDFDFD] px-4 py-3 flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase font-bold text-[#666666] tracking-wider block">FACULTY MEMBER</span>
                    <h3 className="text-sm font-mono font-bold text-[#111111] uppercase mt-0.5">{card.teacherName}</h3>
                  </div>
                  {card.classTeacherOf.length > 0 && (
                    <div className="flex flex-wrap gap-1 items-center">
                      {card.classTeacherOf.map((c) => (
                        <span
                          key={c}
                          className="gov-tag gov-tag-approved text-[10px] font-mono uppercase"
                        >
                          COHORT TUTOR: {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-4 flex-1">
                  {card.byClass.map(({ className, rows }) => (
                    <div key={`${card.teacherId}-${className}`} className="border-b border-[#EEEEEE] pb-3 last:border-b-0 last:pb-0">
                      <div className="text-xs font-mono font-bold text-[#111111] uppercase tracking-wide mb-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-[#111111] rounded-full inline-block" />
                        <span>{className}</span>
                      </div>
                      <div className="space-y-1.5">
                        {rows.map((a) => {
                          const role = assignmentRoleLabel(a.assignment_role);
                          return (
                            <div
                              key={a.id}
                              className="flex items-center justify-between gap-3 border border-[#E2E8F0] bg-[#FAFAFA] p-2.5 rounded"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-mono font-bold text-[#111111] uppercase truncate">{a.subject}</div>
                                <div className="mt-1 flex items-center gap-2">
                                  <span className="text-[10px] font-mono uppercase text-[#666666]">
                                    [{role}]
                                  </span>
                                  {(a as { stream_name?: string | null }).stream_name && (
                                    <span className="text-[10px] font-mono uppercase font-bold bg-[#EAEAEA] px-1.5 py-0.2 border border-[#CCCCCC] rounded">
                                      {(a as { stream_name?: string | null }).stream_name}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                className="gov-btn gov-btn-sm text-red-600 border-[#CCCCCC] hover:bg-red-50"
                                onClick={() => remove(a.id)}
                              >
                                REMOVE
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-xs font-mono text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
