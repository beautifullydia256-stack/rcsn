import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';

export default function TeacherProfilePage() {
  const navigate = useNavigate();
  const { teacher_id: teacherIdParam } = useParams<{ teacher_id: string }>();
  const teacherId = Array.isArray(teacherIdParam) ? teacherIdParam[0] : teacherIdParam || '';

  const [row, setRow] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [schoolType, setSchoolType] = useState<'Nursery/Primary' | 'Secondary' | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [availableSubjectsByClass, setAvailableSubjectsByClass] = useState<Record<string, Set<string>>>({});
  const [assignedLinks, setAssignedLinks] = useState<{ id: string; class_name: string; subject: string }[]>([]);
  const [assignClass, setAssignClass] = useState('');
  const [assignSubjects, setAssignSubjects] = useState<string[]>([]);
  const [savingAssign, setSavingAssign] = useState(false);
  const [appointing, setAppointing] = useState(false);
  const [classTeacherOf, setClassTeacherOf] = useState<string | null>(null);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [allClasses, setAllClasses] = useState<string[]>([]);
  const [showAppointModal, setShowAppointModal] = useState(false);
  const [selectedClassToAppoint, setSelectedClassToAppoint] = useState('');

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate('/login');
      const { data: teacher } = await supabase.from('teachers').select('*').eq('teacher_id', teacherId).single();
      setRow(teacher || null);

      if (teacher?.school_id) {
        setSchoolId(teacher.school_id as string);
        const { data: sch } = await supabase.from('schools').select('type').eq('school_id', teacher.school_id).single();
        setSchoolType((sch?.type as 'Nursery/Primary' | 'Secondary') || null);
        const { data: cs } = await supabase.from('class_subjects').select('class_name, subject').eq('school_id', teacher.school_id);
        const map: Record<string, Set<string>> = {};
        (cs || []).forEach((r: { class_name: string; subject: string }) => {
          if (!map[r.class_name]) map[r.class_name] = new Set();
          map[r.class_name].add(r.subject);
        });
        setAvailableSubjectsByClass(map);
        const { data: tsub } = await supabase
          .from('teacher_class_subjects')
          .select('id, class_name, subject')
          .eq('school_id', teacher.school_id)
          .eq('teacher_id', teacher.teacher_id)
          .order('class_name');
        setAssignedLinks((tsub || []) as { id: string; class_name: string; subject: string }[]);

        const currentYear = new Date().getFullYear();
        const currentTerm = 3;
        const { data: ctForTeacher } = await supabase
          .from('class_teachers')
          .select('class_name')
          .eq('school_id', teacher.school_id)
          .eq('teacher_id', teacher.teacher_id)
          .eq('year', currentYear)
          .eq('term', currentTerm)
          .limit(1)
          .maybeSingle();
        setClassTeacherOf(ctForTeacher?.class_name || null);

        const { data: students } = await supabase.from('students').select('current_class').eq('school_id', teacher.school_id);
        const uniqueClasses = Array.from(
          new Set<string>(
            (students || [])
              .map((s: { current_class?: string }) => s.current_class)
              .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
          )
        ).sort();
        setAllClasses(uniqueClasses);
        const { data: classTeachers } = await supabase
          .from('class_teachers')
          .select('class_name')
          .eq('school_id', teacher.school_id)
          .eq('year', currentYear)
          .eq('term', currentTerm);
        const classesWithTeachers = new Set((classTeachers || []).map((ct: { class_name: string }) => ct.class_name));
        setAvailableClasses(uniqueClasses.filter((c) => !classesWithTeachers.has(c)));
      }
      setLoading(false);
    };
    if (teacherId) run();
  }, [teacherId, navigate]);

  const name = (row?.name as string) || '';
  const subjects = ((row?.subjects as string[] | null) || []) as string[];
  const classesAssigned = ((row?.classes as string[] | null) || []) as string[];

  const classOptions = useMemo(() => {
    const opts: string[] = [];
    if (schoolType === 'Nursery/Primary') {
      opts.push('Baby Class', 'Middle Class', 'Top Class');
      for (let i = 1; i <= 7; i++) opts.push(`Primary ${i}`);
    } else if (schoolType === 'Secondary') {
      for (let i = 1; i <= 6; i++) opts.push(`Senior ${i}`);
    }
    return opts;
  }, [schoolType]);

  const filteredClasses = useMemo(() => classesAssigned.filter((c) => classOptions.includes(c)), [classesAssigned, classOptions]);
  const filteredSubjects = useMemo(() => {
    if (assignedLinks.length > 0) return Array.from(new Set(assignedLinks.map((a) => a.subject)));
    const allowed = new Set<string>();
    filteredClasses.forEach((c) => {
      const set = availableSubjectsByClass[c];
      if (set) set.forEach((s) => allowed.add(s));
    });
    return subjects.filter((s) => allowed.has(s));
  }, [subjects, filteredClasses, availableSubjectsByClass, assignedLinks]);

  const classOptionsFromType = useMemo(() => {
    const opts: string[] = [];
    if (schoolType === 'Nursery/Primary') {
      opts.push('Baby Class', 'Middle Class', 'Top Class');
      for (let i = 1; i <= 7; i++) opts.push(`Primary ${i}`);
    } else if (schoolType === 'Secondary') {
      for (let i = 1; i <= 6; i++) opts.push(`Senior ${i}`);
    }
    return opts;
  }, [schoolType]);

  const toggleAssignSubject = (s: string) => {
    setAssignSubjects((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const assignToClass = async () => {
    if (!row?.school_id || !assignClass || assignSubjects.length === 0) return;
    setSavingAssign(true);
    const payload = assignSubjects.map((s) => ({ school_id: row.school_id, teacher_id: row.teacher_id, class_name: assignClass, subject: s }));
    const optimistic = payload.map((p) => ({ id: `tmp-${Math.random()}`, ...p }));
    setAssignedLinks((prev) => [...optimistic, ...prev]);
    const { error } = await supabase.from('teacher_class_subjects').insert(payload);
    setSavingAssign(false);
    if (error) {
      setAssignedLinks((prev) => prev.filter((l) => !(String(l.id).startsWith('tmp-') && l.class_name === assignClass)));
      alert(error.message);
      return;
    }
    const { data: fresh } = await supabase
      .from('teacher_class_subjects')
      .select('id, class_name, subject')
      .eq('school_id', row.school_id)
      .eq('teacher_id', row.teacher_id)
      .order('class_name');
    setAssignedLinks((fresh || []) as { id: string; class_name: string; subject: string }[]);
    setAssignSubjects([]);
  };

  const removeAssignment = async (id: string) => {
    const prev = assignedLinks;
    setAssignedLinks(prev.filter((a) => a.id !== id));
    const { error } = await supabase.from('teacher_class_subjects').delete().eq('id', id);
    if (error) {
      alert(error.message);
      setAssignedLinks(prev);
    }
  };

  const apiBase = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL ? import.meta.env.VITE_API_URL : '';
  const appointAsClassTeacher = async () => {
    if (!row?.teacher_id || !selectedClassToAppoint || !schoolId) return;
    setAppointing(true);
    try {
      const res = await fetch(`${apiBase}/api/class-teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_name: selectedClassToAppoint, teacher_id: row.teacher_id }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Failed to appoint class teacher');
      setClassTeacherOf(selectedClassToAppoint);
      setAvailableClasses((prev) => prev.filter((c) => c !== selectedClassToAppoint));
      setShowAppointModal(false);
      setSelectedClassToAppoint('');
      alert(`Successfully appointed as class teacher for ${selectedClassToAppoint}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setAppointing(false);
    }
  };

  const unappointAsClassTeacher = async () => {
    if (!row?.teacher_id || !classTeacherOf || !schoolId) return;
    if (!confirm(`Are you sure you want to un-appoint this teacher from ${classTeacherOf}?`)) return;
    setAppointing(true);
    try {
      const res = await fetch(`${apiBase}/api/class-teachers`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_name: classTeacherOf, teacher_id: row.teacher_id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body?.message || body?.error) as string || 'Failed to un-appoint');
      setClassTeacherOf(null);
      setAvailableClasses((prev) => [...prev, classTeacherOf].sort());
      alert(`Successfully un-appointed from ${classTeacherOf}`);
    } catch (e: unknown) {
      alert(`Failed: ${e instanceof Error ? e.message : e}`);
    } finally {
      setAppointing(false);
    }
  };

  return (
    <AdminPageWrapper title={name || 'Teacher Profile'} subtitle={classTeacherOf ? `Class Teacher · ${classTeacherOf}` : undefined}>
      <div className="flex items-center justify-end gap-2 mb-4">
        <button type="button" className="ac-glass-btn-secondary rounded-xl px-3 py-2 text-sm font-medium ac-text-primary" onClick={() => navigate('/dashboard/admin/teachers')}>
          Back to Teacher List
        </button>
        <button type="button" className="rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-2 text-white text-sm" onClick={() => navigate(`/dashboard/admin/teachers/${teacherId}/edit`)}>
          Edit
        </button>
        <button type="button" className="rounded-lg bg-green-600 hover:bg-green-500 px-3 py-2 text-white text-sm" onClick={() => navigate(`/dashboard/admin/teachers/${teacherId}/create-login`)}>
          Create Login
        </button>
        <button
          type="button"
          className="rounded-lg bg-amber-600 hover:bg-amber-500 px-3 py-2 text-white text-sm"
          onClick={async () => {
            if (!row) return;
            const resp = await fetch(`${apiBase}/api/admin/reset-teacher-password`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ teacher_id: row.teacher_id }),
            });
            if (!resp.ok) {
              const j = await resp.json();
              alert(`Failed: ${(j as { error?: string }).error}`);
            } else {
              alert('Password reset successfully.');
            }
          }}
        >
          Reset Password
        </button>
        {classTeacherOf ? (
          <button type="button" className="rounded-lg bg-red-600 hover:bg-red-500 px-3 py-2 text-white text-sm disabled:opacity-50" onClick={unappointAsClassTeacher} disabled={appointing}>
            {appointing ? 'Un-appointing...' : `Un-appoint from ${classTeacherOf}`}
          </button>
        ) : (
          <button
            type="button"
            className="rounded-lg bg-yellow-600 hover:bg-yellow-500 px-3 py-2 text-white text-sm disabled:opacity-50"
            onClick={() => setShowAppointModal(true)}
            disabled={availableClasses.length === 0}
          >
            Appoint as Class Teacher
          </button>
        )}
      </div>

      {loading ? (
        <div className="ac-text-secondary">Loading...</div>
      ) : !row ? (
        <div className="ac-text-secondary">Teacher not found.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className={`${adminCardClass}`}>
            <div className="ac-text-primary font-medium mb-2">Personal Info</div>
            <div className="ac-text-secondary text-sm space-y-1">
              <div>Full Name: {String(row.name || '-')}</div>
              <div>Gender: {String(row.gender || '-')}</div>
              <div>Date of Birth: {row.dob ? new Date(row.dob as string).toLocaleDateString() : '-'}</div>
              <div>National ID: {String(row.national_id || '-')}</div>
            </div>
          </div>

          <div className={`${adminCardClass} lg:col-span-3`}>
            <div className="ac-text-primary font-medium mb-3">Class & Subject Assignments</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                className="ac-input rounded-lg px-3 py-2 w-full"
                value={assignClass}
                onChange={(e) => {
                  setAssignClass(e.target.value);
                  setAssignSubjects([]);
                }}
              >
                <option value="">Select Class</option>
                {classOptionsFromType.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <div className="md:col-span-2">
                <div className="ac-text-secondary text-sm mb-1">Subjects</div>
                {!assignClass ? (
                  <div className="ac-text-secondary text-sm">Select a class to view available subjects</div>
                ) : Array.from(availableSubjectsByClass[assignClass] || []).length === 0 ? (
                  <div className="ac-text-secondary text-sm">No subjects configured for this class.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {Array.from(availableSubjectsByClass[assignClass] || []).map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`px-3 py-1 rounded-lg border text-sm ${assignSubjects.includes(s) ? 'bg-blue-600/80 border-blue-400 text-white' : 'border-[var(--ac-border)] ac-text-primary hover:bg-white/10'}`}
                        onClick={() => toggleAssignSubject(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-3">
              <button
                type="button"
                className="rounded-lg bg-green-600 hover:bg-green-500 px-3 py-2 text-white text-sm disabled:opacity-50"
                disabled={!assignClass || assignSubjects.length === 0 || savingAssign}
                onClick={assignToClass}
              >
                {savingAssign ? 'Assigning...' : 'Assign to Teacher'}
              </button>
            </div>
            <div className="mt-4 ac-text-secondary text-sm">Current assignments</div>
            <div className="mt-2 overflow-x-auto rounded-lg border border-[var(--ac-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-white/5">
                  <tr className="text-left">
                    <th className="px-4 py-2 ac-text-muted">Class</th>
                    <th className="px-4 py-2 ac-text-muted">Subject</th>
                    <th className="px-4 py-2 ac-text-muted">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedLinks.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-3 ac-text-secondary">No assignments yet.</td></tr>
                  ) : (
                    assignedLinks.map((a) => (
                      <tr key={a.id} className="border-t border-[var(--ac-border)]">
                        <td className="px-4 py-2 ac-text-primary">{a.class_name}</td>
                        <td className="px-4 py-2 ac-text-secondary">{a.subject}</td>
                        <td className="px-4 py-2">
                          <button type="button" className="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600" onClick={() => removeAssignment(a.id)}>Remove</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className={`${adminCardClass}`}>
            <div className="ac-text-primary font-medium mb-2">Contact Info</div>
            <div className="ac-text-secondary text-sm space-y-1">
              <div>Phone: {String(row.phone || '-')}</div>
              <div>Email: {String(row.email || '-')}</div>
              <div>Address: {String(row.address || '-')}</div>
            </div>
          </div>
          <div className={`${adminCardClass}`}>
            <div className="ac-text-primary font-medium mb-2">Professional Info</div>
            <div className="ac-text-secondary text-sm space-y-1">
              <div>Employee ID: {String(row.employee_id || '-')}</div>
              <div>Date of Hire: {row.date_of_hire ? new Date(row.date_of_hire as string).toLocaleDateString() : '-'}</div>
              <div>Salary: {row.salary != null ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(row.salary)) : '-'}</div>
              <div>Subjects: {filteredSubjects.length ? filteredSubjects.join(', ') : '-'}</div>
              <div>Classes Assigned: {filteredClasses.length ? filteredClasses.join(', ') : '-'}</div>
            </div>
          </div>
        </div>
      )}

      {showAppointModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAppointModal(false)}>
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 border border-[var(--ac-border)]" onClick={(e) => e.stopPropagation()}>
            <h3 className="ac-text-primary text-xl font-semibold mb-4">Appoint as Class Teacher</h3>
            {availableClasses.length === 0 ? (
              <div className="ac-text-secondary mb-4">No classes available.</div>
            ) : (
              <>
                <p className="ac-text-secondary text-sm mb-4">Select a class to appoint <strong className="ac-text-primary">{name}</strong> as its class teacher.</p>
                <label className="block ac-text-secondary text-sm mb-2">Available Classes</label>
                <select
                  className="ac-input w-full rounded-lg px-3 py-2 mb-4"
                  value={selectedClassToAppoint}
                  onChange={(e) => setSelectedClassToAppoint(e.target.value)}
                >
                  <option value="">Select a class...</option>
                  {availableClasses.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </>
            )}
            <div className="flex gap-3">
              <button type="button" className="flex-1 ac-glass-btn-secondary rounded-lg px-4 py-2" onClick={() => { setShowAppointModal(false); setSelectedClassToAppoint(''); }}>Cancel</button>
              <button type="button" className="flex-1 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 disabled:opacity-50" onClick={appointAsClassTeacher} disabled={!selectedClassToAppoint || appointing}>
                {appointing ? 'Appointing...' : 'Appoint'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPageWrapper>
  );
}
