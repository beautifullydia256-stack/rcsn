import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import SectionHeader from './SectionHeader';
import { settingsInsetSurface, settingsPrimaryActionClass } from './settingsTabStyles';

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

      <div className="mb-2 text-sm font-medium ac-text-secondary">Current assignments</div>
      <div className={`overflow-x-auto ${settingsInsetSurface}`}>
        <table className="min-w-full text-sm md:min-w-0">
          <thead>
            <tr className="border-b border-[var(--pw-border)] bg-[var(--pw-s3)] text-left">
              <th className="px-4 py-2 ac-text-muted">Teacher</th>
              <th className="px-4 py-2 ac-text-muted">Class</th>
              <th className="px-4 py-2 ac-text-muted">Subject</th>
              <th className="px-4 py-2 ac-text-muted">Role</th>
              <th className="px-4 py-2 ac-text-muted">Actions</th>
            </tr>
          </thead>
          <tbody className="[&>tr:nth-child(even)]:bg-[var(--pw-s3)]/40">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center ac-text-secondary">
                  Loading...
                </td>
              </tr>
            ) : assignments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center ac-text-secondary">
                  No assignments yet.
                </td>
              </tr>
            ) : (
              assignments.map((a) => (
                <tr key={a.id} className="border-t border-[var(--pw-border)]">
                  <td className="px-4 py-2 ac-text-primary">
                    {teachers.find((t) => t.teacher_id === a.teacher_id)?.name || a.teacher_id}
                  </td>
                  <td className="px-4 py-2 ac-text-secondary">{a.class_name}</td>
                  <td className="px-4 py-2 ac-text-secondary">{a.subject}</td>
                  <td className="px-4 py-2 ac-text-secondary">
                    {a.assignment_role === 'co_teacher' ? 'Co-teacher' : 'Subject teacher'}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      className="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-400"
                      onClick={() => remove(a.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {error && (
        <div className="mt-3 rounded-lg border border-red-400/40 bg-red-950/50 px-3 py-2 text-sm text-red-100">
          {error}
        </div>
      )}
    </div>
  );
}
