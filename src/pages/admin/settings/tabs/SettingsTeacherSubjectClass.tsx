import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import SectionHeader from './SectionHeader';

export default function SettingsTeacherSubjectClass({
  classOptions,
}: {
  classOptions: string[];
}) {
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<{ teacher_id: string; name: string }[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [classSubjects, setClassSubjects] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<
    { id: string; teacher_id: string; class_name: string; subject: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      setError(null);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: u } = await supabase
        .from('users')
        .select('school_id')
        .eq('user_id', user.id)
        .single();
      if (!u?.school_id) return;
      setSchoolId(u.school_id);
      const { data: tchs } = await supabase
        .from('teachers')
        .select('teacher_id,name')
        .eq('school_id', u.school_id)
        .order('name');
      setTeachers(tchs || []);
    };
    init();
  }, []);

  useEffect(() => {
    const loadSubjects = async () => {
      if (!schoolId || !selectedClass) {
        setClassSubjects([]);
        return;
      }
      const { data } = await supabase
        .from('class_subjects')
        .select('subject')
        .eq('school_id', schoolId)
        .eq('class_name', selectedClass)
        .order('subject');
      setClassSubjects((data || []).map((r: { subject: string }) => r.subject));
    };
    loadSubjects();
  }, [schoolId, selectedClass]);

  useEffect(() => {
    const loadAssignments = async () => {
      if (!schoolId) {
        setAssignments([]);
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from('teacher_class_subjects')
        .select('id, teacher_id, class_name, subject')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      setAssignments(data || []);
      setLoading(false);
    };
    loadAssignments();
  }, [schoolId]);

  const assign = async () => {
    setError(null);
    if (!schoolId || !selectedTeacher || !selectedClass || selectedSubjects.length === 0) return;
    setSaving(true);
    const payload = selectedSubjects.map((s) => ({
      school_id: schoolId,
      teacher_id: selectedTeacher,
      class_name: selectedClass,
      subject: s,
    }));
    const optimistic = payload.map((p) => ({
      id: `tmp-${Math.random()}`,
      ...p,
    }));
    setAssignments((prev) => [...optimistic, ...prev]);
    const { error: insertError } = await supabase
      .from('teacher_class_subjects')
      .insert(payload);
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      setAssignments((prev) => prev.filter((a) => !String(a.id).startsWith('tmp-')));
      return;
    }
    const { data } = await supabase
      .from('teacher_class_subjects')
      .select('id, teacher_id, class_name, subject')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
    setAssignments(data || []);
    setSelectedSubjects([]);
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
    }
  };

  return (
    <div>
      <SectionHeader
        title="Teacher ↔ Subject ↔ Class Assignments"
        desc="Assign teachers to subjects for specific classes. One teacher can handle multiple subjects/classes and one subject can have multiple teachers."
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <select
          value={selectedTeacher}
          onChange={(e) => setSelectedTeacher(e.target.value)}
          className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
        >
          <option value="" className="bg-slate-900">
            Select Teacher
          </option>
          {teachers.map((t) => (
            <option key={t.teacher_id} value={t.teacher_id} className="bg-slate-900">
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Class</option>
          {classOptions.map((c) => (
            <option key={c} value={c} className="bg-slate-900">
              {c}
            </option>
          ))}
        </select>
        <div className="min-h-[44px] rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white">
          {selectedClass ? (
            <div className="flex flex-wrap gap-2">
              {classSubjects.length === 0 ? (
                <span className="text-sm text-white/70">No subjects in this class yet</span>
              ) : (
                classSubjects.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`rounded-lg border px-3 py-1 text-sm ${
                      selectedSubjects.includes(s)
                        ? 'border-blue-400 bg-blue-600/80 text-white'
                        : 'border-white/20 bg-white/10 text-white/90 hover:bg-white/15'
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
            <span className="text-sm text-white/70">Select a class to view subjects</span>
          )}
        </div>
        <button
          type="button"
          disabled={
            !selectedTeacher || !selectedClass || selectedSubjects.length === 0 || saving
          }
          onClick={assign}
          className="rounded-lg bg-green-600 px-3 py-2 hover:bg-green-500 disabled:opacity-50"
        >
          {saving ? 'Assigning...' : 'Assign'}
        </button>
      </div>

      <div className="mt-4 text-sm text-white/80">Current assignments</div>
      <div className="mt-2 overflow-x-auto rounded-xl border border-white/20 bg-white/10 shadow-lg shadow-black/20 backdrop-blur-md">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="px-4 py-2 text-white/80">Teacher</th>
              <th className="px-4 py-2 text-white/80">Class</th>
              <th className="px-4 py-2 text-white/80">Subject</th>
              <th className="px-4 py-2 text-white/80">Actions</th>
            </tr>
          </thead>
          <tbody className="[&>tr:nth-child(even)]:bg-white/5">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-white/80">
                  Loading...
                </td>
              </tr>
            ) : assignments.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-white/80">
                  No assignments yet.
                </td>
              </tr>
            ) : (
              assignments.map((a) => (
                <tr key={a.id} className="border-t border-white/10">
                  <td className="px-4 py-2 text-white">
                    {teachers.find((t) => t.teacher_id === a.teacher_id)?.name || a.teacher_id}
                  </td>
                  <td className="px-4 py-2 text-white/90">{a.class_name}</td>
                  <td className="px-4 py-2 text-white/90">{a.subject}</td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      className="rounded bg-red-500 px-2 py-1 text-xs text-white hover:scale-105 hover:bg-red-400 transition-transform"
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
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
