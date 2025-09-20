"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { motion } from "framer-motion";

export default function TeacherProfilePage() {
  const router = useRouter();
  const params = useParams();
  const teacherId = Array.isArray(params?.teacher_id) ? params?.teacher_id[0] : (params?.teacher_id as string);

  const [row, setRow] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [schoolType, setSchoolType] = useState<'Nursery/Primary' | 'Secondary' | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [availableSubjectsByClass, setAvailableSubjectsByClass] = useState<Record<string, Set<string>>>({});
  const [assignedLinks, setAssignedLinks] = useState<{ id: string; class_name: string; subject: string }[]>([]);
  const [assignClass, setAssignClass] = useState<string>("");
  const [assignSubjects, setAssignSubjects] = useState<string[]>([]);
  const [savingAssign, setSavingAssign] = useState(false);

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      // get teacher
      const { data: teacher } = await supabase
        .from('teachers')
        .select('*')
        .eq('teacher_id', teacherId)
        .single();
      setRow(teacher || null);
      // get school for type and id
      if (teacher?.school_id) {
        setSchoolId(teacher.school_id);
        const { data: sch } = await supabase.from('schools').select('type').eq('school_id', teacher.school_id).single();
        setSchoolType((sch?.type as any) || null);
        // load class subjects for this school
        const { data: cs } = await supabase.from('class_subjects').select('class_name, subject').eq('school_id', teacher.school_id);
        const map: Record<string, Set<string>> = {};
        (cs || []).forEach(r => {
          if (!map[r.class_name]) map[r.class_name] = new Set();
          map[r.class_name].add(r.subject);
        });
        setAvailableSubjectsByClass(map);
        // load assigned links for this teacher from teacher_class_subjects
        const { data: tsub } = await supabase
          .from('teacher_class_subjects')
          .select('id, class_name, subject')
          .eq('school_id', teacher.school_id)
          .eq('teacher_id', teacher.teacher_id)
          .order('class_name');
        setAssignedLinks((tsub || []) as any);
      }
      setLoading(false);
    };
    if (teacherId) run();
  }, [teacherId, router]);

  const name = row?.name || '';
  const subjects = (row?.subjects as string[] | null) || [];
  const classesAssigned = (row?.classes as string[] | null) || [];

  const classOptions = useMemo(() => {
    const opts: string[] = [];
    if (schoolType === 'Nursery/Primary') {
      opts.push('Nursery','Middle Class','Top Class');
      for (let i = 1; i <= 7; i++) opts.push(`Primary ${i}`);
    } else if (schoolType === 'Secondary') {
      for (let i = 1; i <= 6; i++) opts.push(`Senior ${i}`);
    }
    return opts;
  }, [schoolType]);

  const filteredClasses = useMemo(() => {
    const allowed = new Set(classOptions);
    return classesAssigned.filter(c => allowed.has(c));
  }, [classesAssigned, classOptions]);

  const filteredSubjects = useMemo(() => {
    // Prefer assignments table; fallback to teacher.subjects if empty
    if (assignedLinks.length > 0) return Array.from(new Set(assignedLinks.map(a => a.subject)));
    const allowedSubjects = new Set<string>();
    filteredClasses.forEach(c => {
      const set = availableSubjectsByClass[c];
      if (set) set.forEach(s => allowedSubjects.add(s));
    });
    return subjects.filter(s => allowedSubjects.has(s));
  }, [subjects, filteredClasses, availableSubjectsByClass, assignedLinks]);

  // All classes based on school type (even if subjects not yet configured)
  const classOptionsFromType = useMemo(() => {
    const opts: string[] = [];
    if (schoolType === 'Nursery/Primary') {
      opts.push('Nursery','Middle Class','Top Class');
      for (let i = 1; i <= 7; i++) opts.push(`Primary ${i}`);
    } else if (schoolType === 'Secondary') {
      for (let i = 1; i <= 6; i++) opts.push(`Senior ${i}`);
    }
    return opts;
  }, [schoolType]);

  const toggleAssignSubject = (s: string) => {
    setAssignSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const assignToClass = async () => {
    if (!row?.school_id || !assignClass || assignSubjects.length === 0) return;
    setSavingAssign(true);
    const payload = assignSubjects.map(s => ({ school_id: row.school_id, teacher_id: row.teacher_id, class_name: assignClass, subject: s }));
    // optimistic
    const optimistic = payload.map(p => ({ id: `tmp-${Math.random()}`, ...p }));
    setAssignedLinks(prev => [...optimistic, ...prev]);
    const { error } = await supabase.from('teacher_class_subjects').insert(payload);
    setSavingAssign(false);
    if (error) {
      // rollback
      setAssignedLinks(prev => prev.filter(l => !(String(l.id).startsWith('tmp-') && l.class_name === assignClass)));
      alert(error.message);
      return;
    }
    // reload to get real ids
    const { data: fresh } = await supabase
      .from('teacher_class_subjects')
      .select('id, class_name, subject')
      .eq('school_id', row.school_id)
      .eq('teacher_id', row.teacher_id)
      .order('class_name');
    setAssignedLinks((fresh || []) as any);
    setAssignSubjects([]);
  };

  const removeAssignment = async (id: string) => {
    const prev = assignedLinks;
    setAssignedLinks(prev.filter(a => a.id !== id));
    const { error } = await supabase.from('teacher_class_subjects').delete().eq('id', id);
    if (error) {
      alert(error.message);
      setAssignedLinks(prev);
    }
  };

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white text-xl">👤</div>
            <h1 className="text-white text-2xl font-semibold">{name || 'Teacher Profile'}</h1>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20" onClick={()=>router.push('/dashboard/admin/teachers')}>Back to Teacher List</button>
            <button className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white" onClick={()=>router.push(`/dashboard/admin/teachers/${teacherId}/edit`)}>Edit</button>
            <button className="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white" onClick={()=>router.push(`/dashboard/admin/teachers/${teacherId}/create-login`)}>Create Login</button>
            <button className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white" onClick={async ()=>{
              if (!row) return;
              const resp = await fetch('/api/admin/reset-teacher-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teacher_id: row.teacher_id }) });
              if (!resp.ok) {
                const j = await resp.json();
                alert(`Failed to reset password: ${j.error}`);
              } else {
                alert('Password reset successfully.');
              }
            }}>Reset Password</button>
          </div>
        </div>

        {loading ? (
          <div className="text-white/80">Loading...</div>
        ) : !row ? (
          <div className="text-white/80">Teacher not found.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4">
              <div className="text-white font-medium mb-2">Personal Info</div>
              <div className="text-white/90 text-sm space-y-1">
                <div><span className="text-white/60">Full Name:</span> {row.name || '-'}</div>
                <div><span className="text-white/60">Gender:</span> {row.gender || '-'}</div>
                <div><span className="text-white/60">Date of Birth:</span> {row.dob ? new Date(row.dob).toLocaleDateString() : '-'}</div>
                <div><span className="text-white/60">National ID:</span> {row.national_id || '-'}</div>
              </div>
            </motion.div>

            {/* Class & Subject Assignments */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-3 rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4">
              <div className="text-white font-medium mb-3">Class & Subject Assignments</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select className="rounded-lg border border-white/10 bg-white text-black px-3 py-2" value={assignClass} onChange={(e)=>{ setAssignClass(e.target.value); setAssignSubjects([]); }}>
                  <option value="">Select Class</option>
                  {classOptionsFromType.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="md:col-span-2">
                  <div className="text-white/80 text-sm mb-1">Subjects</div>
                  {!assignClass ? (
                    <div className="text-white/70 text-sm">Select a class to view available subjects</div>
                  ) : (
                    Array.from(availableSubjectsByClass[assignClass] || []).length === 0 ? (
                      <div className="text-white/70 text-sm">No subjects configured for this class. Add them in System Settings → Subjects per Class.</div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {Array.from(availableSubjectsByClass[assignClass] || []).map(s => (
                          <button key={s} type="button" className={`px-3 py-1 rounded-lg border ${assignSubjects.includes(s) ? 'bg-blue-600/80 border-blue-400 text-white' : 'bg-white/10 border-white/10 text-white/90 hover:bg-white/15'}`} onClick={()=>toggleAssignSubject(s)}>{s}</button>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </div>
              <div className="mt-3">
                <button disabled={!assignClass || assignSubjects.length===0 || savingAssign} className="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white disabled:opacity-50" onClick={assignToClass}>{savingAssign ? 'Assigning...' : 'Assign to Teacher'}</button>
              </div>

              <div className="mt-4 text-white/80 text-sm">Current assignments</div>
              <div className="mt-2 overflow-x-auto rounded-lg border border-white/10">
                <table className="min-w-full text-sm">
                  <thead className="bg-white/5">
                    <tr className="text-left">
                      <th className="px-4 py-2 text-white/80">Class</th>
                      <th className="px-4 py-2 text-white/80">Subject</th>
                      <th className="px-4 py-2 text-white/80">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="[&>tr:nth-child(even)]:bg-white/5">
                    {assignedLinks.length === 0 ? (
                      <tr><td className="px-4 py-3 text-white/70" colSpan={3}>No assignments yet.</td></tr>
                    ) : assignedLinks.map(a => (
                      <tr key={a.id} className="border-t border-white/10">
                        <td className="px-4 py-2 text-white">{a.class_name}</td>
                        <td className="px-4 py-2 text-white/90">{a.subject}</td>
                        <td className="px-4 py-2">
                          <button className="px-2 py-1 text-xs rounded bg-red-500 hover:bg-red-400 text-white" onClick={()=>removeAssignment(a.id)}>Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4">
              <div className="text-white font-medium mb-2">Contact Info</div>
              <div className="text-white/90 text-sm space-y-1">
                <div><span className="text-white/60">Phone:</span> {row.phone || '-'}</div>
                <div><span className="text-white/60">Email:</span> {row.email || '-'}</div>
                <div><span className="text-white/60">Address:</span> {row.address || '-'}</div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4">
              <div className="text-white font-medium mb-2">Professional Info</div>
              <div className="text-white/90 text-sm space-y-1">
                <div><span className="text-white/60">Employee ID:</span> {row.employee_id || '-'}</div>
                <div><span className="text-white/60">Date of Hire:</span> {row.date_of_hire ? new Date(row.date_of_hire).toLocaleDateString() : '-'}</div>
                <div><span className="text-white/60">Salary:</span> {row.salary != null ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(row.salary)) : '-'}</div>
                <div><span className="text-white/60">Subjects:</span> {filteredSubjects.length ? filteredSubjects.join(', ') : '-'}</div>
                <div><span className="text-white/60">Classes Assigned:</span> {filteredClasses.length ? filteredClasses.join(', ') : '-'}</div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}


