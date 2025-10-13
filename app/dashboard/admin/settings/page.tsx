"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";

type TabKey = "subjects" | "assignments" | "finance" | "timetable" | "terms" | "exams" | "branding";

export default function AdminSystemSettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("subjects");
  const [schoolType, setSchoolType] = useState<'Nursery/Primary' | 'Secondary' | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: u } = await supabase.from('users').select('school_id').eq('user_id', user.id).single();
      if (!u?.school_id) return;
      setSchoolId(u.school_id);
      const { data: sch } = await supabase.from('schools').select('type').eq('school_id', u.school_id).single();
      setSchoolType((sch?.type as any) || null);
    };
    run();
  }, []);

  // Ensure browser back goes to the dashboard instead of login or previous page
  useEffect(() => {
    const handlePopState = () => {
      router.replace('/dashboard/admin');
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [router]);

  const classOptions = useMemo(() => {
    const opts: string[] = [];
    if (schoolType === 'Nursery/Primary') {
      opts.push('Nursery', 'Middle Class', 'Top Class');
      for (let i = 1; i <= 7; i++) opts.push(`Primary ${i}`);
    } else if (schoolType === 'Secondary') {
      for (let i = 1; i <= 6; i++) opts.push(`Senior ${i}`);
    }
    return opts;
  }, [schoolType]);

  const TabButton = ({ k, label }: { k: TabKey; label: string }) => (
    <button
      className={`px-4 py-2 rounded-lg text-sm transition-colors ${
        tab === k
          ? "bg-white/20 text-white border border-white/20"
          : "bg-white/10 text-white/80 border border-white/10 hover:bg-white/15"
      }`}
      onClick={() => setTab(k)}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-white text-xl font-semibold">System Settings</h1>
          <button
            onClick={() => router.push('/dashboard/admin')}
            className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <TabButton k="subjects" label="Subjects per Class" />
          <TabButton k="assignments" label="Teacher ↔ Subject ↔ Class" />
          <TabButton k="finance" label="Financial Settings" />
          <TabButton k="timetable" label="Timetable Designer" />
          <TabButton k="terms" label="Term Settings" />
          <TabButton k="exams" label="Exam Sets" />
          <TabButton k="branding" label="School Branding" />
        </div>

        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4 text-white"
        >
          {tab === "subjects" && <SubjectsPerClass classOptions={classOptions} schoolId={schoolId} />}
          {tab === "assignments" && <TeacherSubjectClass classOptions={classOptions} />}
          {tab === "finance" && <FinancialSettings schoolId={schoolId} classes={classOptions} />}
          {tab === "timetable" && <TimetableDesigner />}
          {tab === "terms" && <TermSettings schoolId={schoolId} />}
          {tab === "exams" && <ExamSets classOptions={classOptions} schoolId={schoolId} schoolType={schoolType} />}
          {tab === "branding" && <SchoolBranding schoolId={schoolId} />}
        </motion.div>

        {/* All Classes quick links */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4 text-white"
        >
          <div className="mb-2 text-white font-medium">Classes</div>
          {classOptions.length === 0 ? (
            <div className="text-white/70 text-sm">Classes will appear here after your school type is set.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {classOptions.map((c) => (
                <a
                  key={c}
                  href={`/dashboard/admin/settings/classes/${encodeURIComponent(c)}`}
                  className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 hover:bg-white/15 text-white text-sm"
                >
                  {c}
                </a>
              ))}
            </div>
          )}
        </motion.div>

        {/* Quick Management Links */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4 text-white"
        >
          <div className="mb-2 text-white font-medium">Quick Management</div>
          <div className="flex flex-wrap gap-2">
            <a href="/dashboard/admin/exam-sets" className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 hover:bg-white/15 text-white text-sm">Exam Sets</a>
            <a href="/dashboard/admin/old-students" className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 hover:bg-white/15 text-white text-sm">Old Students</a>
            <a href="/dashboard/admin/finance-records" className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 hover:bg-white/15 text-white text-sm">Finance Records</a>
            <a href="/dashboard/admin/attendance-records" className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 hover:bg-white/15 text-white text-sm">Attendance Records</a>
            <a href="/dashboard/admin/report-records" className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 hover:bg-white/15 text-white text-sm">Report Records</a>
          </div>
        </motion.div>

        {/* Term Rollover */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4 text-white"
        >
          <div className="mb-2 text-white font-medium">End-of-Term Rollover</div>
          <div className="text-white/80 text-sm mb-3">
            Promote classes, graduate candidates ({schoolType === 'Nursery/Primary' ? 'P7' : 'S4/S6'}) to Old Students, and remove their logins.
          </div>
          <button
            className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white disabled:opacity-50"
            disabled={!schoolId}
            onClick={async ()=>{
              if (!schoolId) return;
              if (!confirm('Are you sure you want to run end-of-term rollover? This will graduate candidates and promote other students.')) return;
              const resp = await fetch('/api/admin/term-rollover', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ school_id: schoolId }) });
              const j = await resp.json();
              if (!resp.ok) alert(j.error || 'Rollover failed'); else alert(`Rollover complete. Graduated: ${j.graduated}, Promoted: ${j.promoted}`);
            }}
          >Run Rollover</button>
        </motion.div>
      </div>
    </div>
  );
}

function SectionHeader({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-4">
      <div className="text-white font-medium">{title}</div>
      {desc && <div className="text-white/70 text-sm">{desc}</div>}
    </div>
  );
}

function SubjectsPerClass({ classOptions, schoolId }: { classOptions: string[]; schoolId: string | null }) {
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [newSubject, setNewSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setError(null);
      if (!schoolId || !selectedClass) { setSubjects([]); return; }
      setLoading(true);
      const { data, error } = await supabase
        .from('class_subjects')
        .select('subject')
        .eq('school_id', schoolId)
        .eq('class_name', selectedClass)
        .order('subject');
      if (error) setError(error.message);
      setSubjects((data || []).map((r: any) => r.subject));
      setLoading(false);
    };
    load();
  }, [schoolId, selectedClass]);

  const addSubject = async () => {
    setError(null);
    if (!schoolId || !selectedClass) return;
    const s = newSubject.trim();
    if (!s) return;
    // optimistic
    if (!subjects.includes(s)) setSubjects(prev => [...prev, s]);
    setSaving(true);
    const { error: insertError } = await supabase.from('class_subjects').insert({ school_id: schoolId, class_name: selectedClass, subject: s });
    setSaving(false);
    if (insertError) {
      setError(insertError.message || 'Failed to add subject');
      // rollback optimistic if failed
      setSubjects(prev => prev.filter(x => x !== s));
      return;
    }
    setNewSubject("");
  };

  const removeSubject = async (s: string) => {
    setError(null);
    if (!schoolId || !selectedClass) return;
    // optimistic
    setSubjects(prev => prev.filter(x => x !== s));
    const { error } = await supabase
      .from('class_subjects')
      .delete()
      .eq('school_id', schoolId)
      .eq('class_name', selectedClass)
      .eq('subject', s);
    if (error) {
      setError(error.message || 'Failed to remove subject');
      // reload to recover
      const { data } = await supabase
        .from('class_subjects')
        .select('subject')
        .eq('school_id', schoolId)
        .eq('class_name', selectedClass)
        .order('subject');
      setSubjects((data || []).map((r: any) => r.subject));
    }
  };

  return (
    <div>
      <SectionHeader
        title="Subjects per Class"
        desc="Manage the list of subjects taught in each class/grade."
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <select value={selectedClass} onChange={(e)=>setSelectedClass(e.target.value)} className="w-full md:w-64 rounded-xl border border-white/10 bg-white text-black px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Select Class</option>
          {classOptions.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input value={newSubject} onChange={(e)=>setNewSubject(e.target.value)} placeholder="Add subject (e.g., Mathematics)" className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 placeholder:text-white/60" />
        <button disabled={!selectedClass || saving} onClick={addSubject} className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-2">{saving? 'Saving...' : 'Add Subject'}</button>
      </div>
      <div className="mt-4">
        {error && <div className="mb-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-3 py-2 text-sm">{error}</div>}
        {loading ? (
          <div className="text-white/80 text-sm">Loading subjects...</div>
        ) : !selectedClass ? (
          <div className="text-white/80 text-sm">Select a class to view its subjects.</div>
        ) : subjects.length === 0 ? (
          <div className="text-white/80 text-sm">No subjects yet for {selectedClass}. Add one above.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {subjects.map(s => (
              <span key={s} className="px-3 py-1 rounded-lg bg-white/10 border border-white/10 text-sm text-white flex items-center gap-2">
                {s}
                <button onClick={()=>removeSubject(s)} className="text-red-300 hover:text-red-200">×</button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TeacherSubjectClass({ classOptions }: { classOptions: string[] }) {
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [classSubjects, setClassSubjects] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: u } = await supabase.from('users').select('school_id').eq('user_id', user.id).single();
      if (!u?.school_id) return;
      setSchoolId(u.school_id);
      const { data: tchs } = await supabase.from('teachers').select('teacher_id,name').eq('school_id', u.school_id).order('name');
      setTeachers(tchs || []);
    };
    init();
  }, []);

  useEffect(() => {
    const loadSubjects = async () => {
      if (!schoolId || !selectedClass) { setClassSubjects([]); return; }
      const { data } = await supabase.from('class_subjects').select('subject').eq('school_id', schoolId).eq('class_name', selectedClass).order('subject');
      setClassSubjects((data || []).map(r => r.subject));
    };
    loadSubjects();
  }, [schoolId, selectedClass]);

  useEffect(() => {
    const loadAssignments = async () => {
      if (!schoolId) { setAssignments([]); return; }
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
    const payload = selectedSubjects.map(s => ({ school_id: schoolId, teacher_id: selectedTeacher, class_name: selectedClass, subject: s }));
    // optimistic
    const optimistic = payload.map(p => ({ id: `tmp-${Math.random()}`, ...p }));
    setAssignments(prev => [...optimistic, ...prev]);
    const { error } = await supabase.from('teacher_class_subjects').insert(payload);
    setSaving(false);
    if (error) {
      setError(error.message);
      // rollback optimistic
      setAssignments(prev => prev.filter(a => !String(a.id).startsWith('tmp-')));
      return;
    }
    // reload to get real IDs
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
    setAssignments(prev.filter(a => a.id !== id));
    const { error } = await supabase.from('teacher_class_subjects').delete().eq('id', id);
    if (error) {
      setError(error.message);
      setAssignments(prev);
    }
  };

  return (
    <div>
      <SectionHeader
        title="Teacher ↔ Subject ↔ Class Assignments"
        desc="Assign teachers to subjects for specific classes. One teacher can handle multiple subjects/classes and one subject can have multiple teachers."
      />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <select value={selectedTeacher} onChange={(e)=>setSelectedTeacher(e.target.value)} className="rounded-lg border border-white/10 bg-white/10 text-white px-3 py-2">
          <option className="bg-slate-900" value="">Select Teacher</option>
          {teachers.map(t => (
            <option className="bg-slate-900" key={t.teacher_id} value={t.teacher_id}>{t.name}</option>
          ))}
        </select>
        <select value={selectedClass} onChange={(e)=>setSelectedClass(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white text-black px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Select Class</option>
          {classOptions.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 min-h-[44px] text-white">
          {selectedClass ? (
            <div className="flex flex-wrap gap-2">
              {classSubjects.length === 0 ? (
                <span className="text-white/70 text-sm">No subjects in this class yet</span>
              ) : (
                classSubjects.map(s => (
                  <button key={s} type="button" className={`px-3 py-1 rounded-lg border ${selectedSubjects.includes(s) ? 'bg-blue-600/80 border-blue-400 text-white' : 'bg-white/10 border-white/10 text-white/90 hover:bg-white/15'}`} onClick={() => setSelectedSubjects(prev => prev.includes(s) ? prev.filter(x=>x!==s) : [...prev, s])}>{s}</button>
                ))
              )}
            </div>
          ) : (
            <span className="text-white/70 text-sm">Select a class to view subjects</span>
          )}
        </div>
        <button disabled={!selectedTeacher || !selectedClass || selectedSubjects.length===0 || saving} onClick={assign} className="rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 px-3 py-2">{saving ? 'Assigning...' : 'Assign'}</button>
      </div>

      <div className="mt-4 text-white/80 text-sm">Current assignments</div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-2 rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 overflow-x-auto">
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
              <tr><td colSpan={4} className="px-4 py-6 text-center text-white/80">Loading...</td></tr>
            ) : assignments.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-white/80">No assignments yet.</td></tr>
            ) : (
              assignments.map(a => (
                <tr key={a.id} className="border-t border-white/10">
                  <td className="px-4 py-2 text-white">{teachers.find(t => t.teacher_id === a.teacher_id)?.name || a.teacher_id}</td>
                  <td className="px-4 py-2 text-white/90">{a.class_name}</td>
                  <td className="px-4 py-2 text-white/90">{a.subject}</td>
                  <td className="px-4 py-2">
                    <button className="px-2 py-1 text-xs rounded bg-red-500 hover:bg-red-400 transition-transform hover:scale-105 text-white" onClick={() => remove(a.id)}>Remove</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </motion.div>
      {error && <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-3 py-2 text-sm">{error}</div>}
    </div>
  );
}

function FinancialSettings({ schoolId, classes }: { schoolId: string | null; classes: string[] }) {
  const [feeStructure, setFeeStructure] = useState<Record<string, number>>({});
  const [admissionFee, setAdmissionFee] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadFees = async () => {
      if (!schoolId) return;
      setLoading(true);
      try {
        const { data, error: fetchError } = await supabase
          .from('school_fee_structure')
          .select('*')
          .eq('school_id', schoolId);

        if (fetchError) throw fetchError;

        // Convert array to object for easier access
        const feeMap: Record<string, number> = {};
        let admFee = 0;

        (data || []).forEach((fee: any) => {
          if (fee.class_name === 'ADMISSION') {
            admFee = Number(fee.tuition_amount || 0);
          } else {
            feeMap[fee.class_name] = Number(fee.tuition_amount || 0);
          }
        });

        setFeeStructure(feeMap);
        setAdmissionFee(admFee);
      } catch (err) {
        console.error('Error loading fees:', err);
        setError('Failed to load fee structure');
      } finally {
        setLoading(false);
      }
    };

    loadFees();
  }, [schoolId]);

  const saveFeeStructure = async () => {
    if (!schoolId) return;
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      // Prepare fee records
      const feeRecords = classes.map(className => ({
        school_id: schoolId,
        class_name: className,
        tuition_amount: feeStructure[className] || 0
      }));

      // Add admission fee as special record
      feeRecords.push({
        school_id: schoolId,
        class_name: 'ADMISSION',
        tuition_amount: admissionFee
      });

      // Upsert all records
      const { error: upsertError } = await supabase
        .from('school_fee_structure')
        .upsert(feeRecords, { onConflict: 'school_id,class_name' });

      if (upsertError) throw upsertError;

      setSuccess('Fee structure saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving fees:', err);
      setError(err.message || 'Failed to save fee structure');
    } finally {
      setSaving(false);
    }
  };

  const updateClassFee = (className: string, amount: number) => {
    setFeeStructure(prev => ({ ...prev, [className]: amount }));
  };

  if (loading) {
    return (
      <div>
        <SectionHeader
          title="Financial Settings"
          desc="Configure tuition fees per class and admission/registration fees."
        />
        <div className="text-white/60">Loading fee structure...</div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title="Financial Settings"
        desc="Configure tuition fees per class and admission/registration fees. These will auto-populate when adding students."
      />

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-600/20 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 rounded-lg bg-green-600/20 border border-green-500/30 text-green-300 text-sm">
          {success}
        </div>
      )}

      {/* Admission Fee */}
      <div className="mb-6 p-4 rounded-lg bg-purple-600/10 border border-purple-500/30">
        <h3 className="text-purple-300 font-medium mb-3">🎓 Admission/Registration Fee</h3>
        <p className="text-white/60 text-sm mb-3">This one-time fee is charged when a new student is admitted to the school.</p>
        <div className="flex items-center gap-3">
          <label className="text-white/80 text-sm">Amount (UGX):</label>
          <input
            type="number"
            min="0"
            value={admissionFee || ''}
            onChange={(e) => setAdmissionFee(parseInt(e.target.value) || 0)}
            className="w-48 px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white"
            placeholder="e.g., 50000"
          />
        </div>
      </div>

      {/* Tuition Fees Per Class */}
      <div className="mb-6">
        <h3 className="text-white font-medium mb-3">💰 Tuition Fees Per Class (Per Term)</h3>
        <p className="text-white/60 text-sm mb-4">
          Set the tuition amount <strong>per term</strong> for each class. The yearly total will be calculated automatically (3 terms). When adding a student, the fee will automatically populate based on their class.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((className) => (
            <div key={className} className="p-4 rounded-lg bg-white/5 border border-white/10">
              <label className="block text-white/80 text-sm font-medium mb-2">
                {className}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-white/60 text-sm">UGX</span>
                <input
                  type="number"
                  min="0"
                  value={feeStructure[className] || ''}
                  onChange={(e) => updateClassFee(className, parseInt(e.target.value) || 0)}
                  className="flex-1 px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white"
                  placeholder="e.g., 100000"
                />
              </div>
              <p className="mt-1 text-xs text-white/50">
                {feeStructure[className] && feeStructure[className] > 0 ? `~UGX ${(feeStructure[className] * 3).toLocaleString()} per Year` : 'Not set'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <button
          onClick={saveFeeStructure}
          disabled={saving}
          className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Fee Structure'}
        </button>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 rounded-lg bg-blue-600/10 border border-blue-500/30">
        <h4 className="text-blue-300 font-medium text-sm mb-2">ℹ️ How This Works</h4>
        <ul className="text-white/60 text-xs space-y-1">
          <li>• Set tuition fees for each class (<strong>per term amount</strong>)</li>
          <li>• System calculates yearly total (term amount × 3 terms)</li>
          <li>• When adding a student, select their class</li>
          <li>• The per-term fee amount will automatically populate</li>
          <li>• Admission fee is one-time (charged when student joins)</li>
          <li>• You can still edit fees manually when adding individual students</li>
        </ul>
      </div>
    </div>
  );
}

function TimetableDesigner() {
  return (
    <div>
      <SectionHeader
        title="Timetable Designer"
        desc="Design the school timetable: set periods per day, assign classes, subjects and teachers."
      />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <select className="rounded-lg border border-white/10 bg-white/10 px-3 py-2">
          <option>Select Class</option>
        </select>
        <select className="rounded-lg border border-white/10 bg-white/10 px-3 py-2">
          <option>Weekday</option>
          <option>Monday</option>
          <option>Tuesday</option>
          <option>Wednesday</option>
          <option>Thursday</option>
          <option>Friday</option>
        </select>
        <input type="time" className="rounded-lg border border-white/10 bg-white/10 px-3 py-2" />
        <input type="time" className="rounded-lg border border-white/10 bg-white/10 px-3 py-2" />
        <select className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 md:col-span-2">
          <option>Select Subject</option>
        </select>
        <select className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 md:col-span-2">
          <option>Select Teacher</option>
        </select>
        <button className="rounded-lg bg-purple-600 hover:bg-purple-500 px-3 py-2">Add Period</button>
      </div>
      <div className="mt-4 text-white/80 text-sm">A visual grid view of the timetable will appear here with edit/remove controls.</div>
    </div>
  );
}

function TermSettings({ schoolId }: { schoolId: string | null }) {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [term, setTerm] = useState<number>(1);
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");
  const [rows, setRows] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'current' | 'next'>('current');
  const [currentTerm, setCurrentTerm] = useState<{year:number; term:number; start_date:string; end_date:string} | null>(null);
  const [suggested, setSuggested] = useState<{year:number; term:number}>({ year: new Date().getFullYear(), term: 1 });
  const [showTermInfo, setShowTermInfo] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!schoolId) return;
      const { data } = await supabase.from('school_terms').select('*').eq('school_id', schoolId).order('year', { ascending: false }).order('term', { ascending: true });
      setRows(data || []);
      // Detect current term by date window
      const todayStr = new Date().toISOString().slice(0,10);
      const current = (data || []).find((r:any)=> r.start_date <= todayStr && r.end_date >= todayStr) || null;
      if (current) setCurrentTerm({ year: current.year, term: current.term, start_date: current.start_date, end_date: current.end_date });
    };
    load();
  }, [schoolId]);

  // Auto-suggest term/year based on mode, currentTerm and today's month
  useEffect(() => {
    const now = new Date();
    const month = now.getMonth() + 1; // 1..12
    if (mode === 'current') {
      // Guess current term by month windows: 1=Jan–Apr, 2=May–Jul, 3=Aug–Dec
      const guessTerm = month <= 4 ? 1 : month <= 7 ? 2 : 3;
      const guessYear = now.getFullYear();
      setSuggested({ year: guessYear, term: guessTerm });
      setYear(guessYear);
      setTerm(guessTerm);
    } else {
      // Next term based on currentTerm if present, else month heuristic
      if (currentTerm) {
        let nextTerm = currentTerm.term + 1;
        let nextYear = currentTerm.year;
        if (nextTerm > 3) { nextTerm = 1; nextYear = currentTerm.year + 1; }
        setSuggested({ year: nextYear, term: nextTerm });
        setYear(nextYear);
        setTerm(nextTerm);
      } else {
        const guessTerm = month <= 4 ? 2 : month <= 7 ? 3 : 1;
        const guessYear = month <= 7 ? now.getFullYear() : now.getFullYear() + 1;
        setSuggested({ year: guessYear, term: guessTerm });
        setYear(guessYear);
        setTerm(guessTerm);
      }
    }
  }, [mode, currentTerm]);

  const save = async () => {
    setError(null);
    if (!schoolId || !end) return;
    
    // For current term, start date is optional
    if (mode === 'current' && !start) {
      // Allow saving current term with just end date
      const e = new Date(end);
      const today = new Date();
      
      // Year must be 4 digits and reasonable range
      if (!/^\d{4}$/.test(String(year)) || year < 2020 || year > 2099) {
        setError('Year must be a 4-digit value between 2020 and 2099.');
        return;
      }
      
      // Current term cannot end in the past
      if (e < new Date(today.toDateString())) {
        setError('Current term cannot end in the past.');
        return;
      }
      
      // Save with null start date for current term
      setSaving(true);
      const { error: upErr } = await supabase.from('school_terms').upsert({ 
        school_id: schoolId, 
        year, 
        term, 
        start_date: null, 
        end_date: end 
      }, { onConflict: 'school_id,year,term' });
      setSaving(false);
      if (upErr) { setError(upErr.message); return; }
      const { data } = await supabase.from('school_terms').select('*').eq('school_id', schoolId).order('year', { ascending: false }).order('term', { ascending: true });
      setRows(data || []);
      return;
    }
    
    // For next term or when start date is provided, require both dates
    if (!start) {
      setError('Start date is required for next term or when setting both dates.');
      return;
    }
    
    const s = new Date(start);
    const e = new Date(end);
    const today = new Date();
    // Cannot start in the past (before today)
    if (s < new Date(today.toDateString())) { setError('Term cannot start in the past.'); return; }
    // Max 5 months
    const maxEnd = new Date(s);
    maxEnd.setMonth(maxEnd.getMonth() + 5);
    if (e > maxEnd) { setError('Term cannot exceed 5 months.'); return; }
    if (e <= s) { setError('End date must be after start date.'); return; }

    // Year must be 4 digits and reasonable range
    if (!/^\d{4}$/.test(String(year)) || year < 2020 || year > 2099) {
      setError('Year must be a 4-digit value between 2020 and 2099.');
      return;
    }

    // Additional constraints for current term start window
    if (mode === 'current') {
      const oneMonthAgo = new Date(new Date(today.toDateString()));
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const fourMonthsAhead = new Date(new Date(today.toDateString()));
      fourMonthsAhead.setMonth(fourMonthsAhead.getMonth() + 4);
      if (s < oneMonthAgo) { setError('Current term start cannot be more than one month in the past.'); return; }
      if (s > fourMonthsAhead) { setError('Current term start cannot be more than four months in the future.'); return; }
      
      // Current term cannot end in the past
      if (e < new Date(today.toDateString())) {
        setError('Current term cannot end in the past.');
        return;
      }
    }

    // Month-based constraints (1-indexed months)
    const startMonth = s.getMonth() + 1;
    if (term === 1) {
      // First term cannot be selected after 5 months have passed (must start in Jan–May)
      if (startMonth > 5) { setError('Term 1 must start no later than May.'); return; }
    } else if (term === 2) {
      // Second term not before end of April (must start in May or later)
      if (startMonth < 5) { setError('Term 2 cannot start before May.'); return; }
    } else if (term === 3) {
      // Third term not before end of July (must start in August or later)
      if (startMonth < 8) { setError('Term 3 cannot start before August.'); return; }
    }

    // Mode sequencing: if scheduling next term, enforce proper order
    if (mode === 'next') {
      if (!currentTerm) { setError('No current term detected; set the current term first.'); return; }
      // Determine expected next term/year
      let expectedTerm = currentTerm.term + 1;
      let expectedYear = currentTerm.year;
      if (expectedTerm > 3) { expectedTerm = 1; expectedYear = currentTerm.year + 1; }
      if (term !== expectedTerm || year !== expectedYear) {
        setError(`Next term must be Term ${expectedTerm} of ${expectedYear}.`);
        return;
      }
      // Next term must start after current term ends
      if (s <= new Date(currentTerm.end_date)) {
        setError('Next term must start after the current term ends.');
        return;
      }
    } else {
      // Editing current term: ensure start is today or future (no past starts), already checked above
      // If there is an existing currentTerm and we are overwriting, allow if same year/term
      if (currentTerm && (currentTerm.year !== year || currentTerm.term !== term)) {
        // Warn via error: they should use Next Term mode
        setError('You appear to be changing to a different term. Use "Edit Next Term" to schedule the next term.');
        return;
      }
    }

    setSaving(true);
    const { error: upErr } = await supabase.from('school_terms').upsert({ school_id: schoolId, year, term, start_date: start, end_date: end }, { onConflict: 'school_id,year,term' });
    setSaving(false);
    if (upErr) { setError(upErr.message); return; }
    const { data } = await supabase.from('school_terms').select('*').eq('school_id', schoolId).order('year', { ascending: false }).order('term', { ascending: true });
    setRows(data || []);
  };

  return (
    <div>
      <SectionHeader title="Term Settings" desc="Configure the current school term. Three terms per year (1, 2, 3)." />
      
      {/* Uganda Term Structure Info */}
      <div className="mb-4 p-4 rounded-lg bg-blue-600/10 border border-blue-500/30">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-blue-300 font-medium text-sm">📅 Uganda Academic Calendar</h4>
          <button 
            onClick={() => setShowTermInfo(!showTermInfo)}
            className="text-blue-300 text-xs hover:text-blue-200"
          >
            {showTermInfo ? 'Hide' : 'Show'} Details
          </button>
        </div>
        {showTermInfo && (
          <div className="text-white/70 text-xs space-y-2 mt-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 p-2 rounded">
                <div className="font-medium text-white mb-1">Term I</div>
                <div>February - May</div>
                <div className="text-white/50">Duration: ~3 months</div>
                <div className="text-white/50">Break: 3-4 weeks (May)</div>
              </div>
              <div className="bg-white/5 p-2 rounded">
                <div className="font-medium text-white mb-1">Term II</div>
                <div>June - August</div>
                <div className="text-white/50">Duration: ~2.5 months</div>
                <div className="text-white/50">Break: 3-4 weeks (August)</div>
              </div>
              <div className="bg-white/5 p-2 rounded">
                <div className="font-medium text-white mb-1">Term III</div>
                <div>September - December</div>
                <div className="text-white/50">Duration: ~3 months</div>
                <div className="text-white/50">Break: ~2 months (Dec-Jan)</div>
              </div>
            </div>
            <p className="text-white/50 italic mt-2">ℹ️ These are standard Uganda term dates. You can customize dates for your school below.</p>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 mb-3">
        <label className="flex items-center gap-2 text-white/80 text-sm">
          <input type="radio" className="accent-blue-500" checked={mode==='current'} onChange={()=>setMode('current')} /> Edit Current Term
        </label>
        <label className="flex items-center gap-2 text-white/80 text-sm">
          <input type="radio" className="accent-blue-500" checked={mode==='next'} onChange={()=>setMode('next')} /> Edit Next Term
        </label>
        {currentTerm && (
          <span className="text-white/60 text-sm">
            Current: Term {currentTerm.term}, {currentTerm.year} 
            ({currentTerm.start_date ? new Date(currentTerm.start_date).toLocaleDateString() : 'Start TBD'} - {new Date(currentTerm.end_date).toLocaleDateString()})
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <input type="number" min={2020} max={2099} className="rounded-lg border border-white/10 bg-white text-black px-3 py-2" value={year} onChange={(e)=>setYear(parseInt((e.target.value||'').slice(0,4) || `${new Date().getFullYear()}`))} />
        <select className="rounded-lg border border-white/10 bg-white text-black px-3 py-2" value={term} onChange={(e)=>setTerm(parseInt(e.target.value))}>
          <option value={1} disabled={mode==='current' ? false : currentTerm ? ((currentTerm.term % 3)+1) !== 1 || (currentTerm.term===3 && year!==currentTerm.year+1) : false}>Term 1</option>
          <option value={2} disabled={mode==='current' ? false : currentTerm ? ((currentTerm.term % 3)+1) !== 2 || (currentTerm.term===3 && year!==currentTerm.year+1) : false}>Term 2</option>
          <option value={3} disabled={mode==='current' ? false : currentTerm ? ((currentTerm.term % 3)+1) !== 3 || (currentTerm.term===3 && year!==currentTerm.year+1) : false}>Term 3</option>
        </select>
        <input type="date" className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white" value={start} onChange={(e)=>setStart(e.target.value)} />
        <input type="date" className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white" value={end} onChange={(e)=>setEnd(e.target.value)} />
        <button disabled={!schoolId || saving} onClick={save} className="rounded-lg bg-green-600 hover:bg-green-500 px-3 py-2 disabled:opacity-50">{saving ? 'Saving...' : 'Save Term'}</button>
      </div>
      {error && <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-3 py-2 text-sm">{error}</div>}
      <div className="mt-4 text-white/80 text-sm">Configured terms</div>
      <div className="mt-2 overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5">
            <tr className="text-left">
              <th className="px-4 py-2 text-white/80">Year</th>
              <th className="px-4 py-2 text-white/80">Term</th>
              <th className="px-4 py-2 text-white/80">Start</th>
              <th className="px-4 py-2 text-white/80">End</th>
            </tr>
          </thead>
          <tbody className="[&>tr:nth-child(even)]:bg-white/5">
            {rows.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-3 text-white/70">No terms set yet.</td></tr>
            ) : rows.map(r => {
              // Check if this is the current term
              const todayStr = new Date().toISOString().slice(0,10);
              const isCurrentTerm = r.start_date ? 
                (r.start_date <= todayStr && r.end_date >= todayStr) :
                (r.end_date >= todayStr); // If no start date, consider it current if end date is in future
              
              return (
                <tr key={r.id} className="border-t border-white/10">
                  <td className="px-4 py-2 text-white">{r.year}</td>
                  <td className="px-4 py-2 text-white/90">
                    {isCurrentTerm ? (
                      <span className="px-2 py-1 bg-green-600/20 text-green-300 rounded text-xs">Ongoing</span>
                    ) : (
                      `Term ${r.term}`
                    )}
                  </td>
                  <td className="px-4 py-2 text-white/90">{r.start_date ? new Date(r.start_date).toLocaleDateString() : 'TBD'}</td>
                  <td className="px-4 py-2 text-white/90">{new Date(r.end_date).toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExamSets({ classOptions, schoolId, schoolType }: { classOptions: string[]; schoolId: string | null; schoolType: 'Nursery/Primary' | 'Secondary' | null }) {
  const [examSets, setExamSets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTerm, setCurrentTerm] = useState<{year: number; term: number} | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [term, setTerm] = useState<number>(1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [targetClasses, setTargetClasses] = useState<string[]>([]);
  const [allClasses, setAllClasses] = useState(false);

  const autoCopyExamSetsFromPreviousYear = async (currentYear: number, currentExamSets: any[]) => {
    if (!schoolId) return;
    
    // Check if there are any exam sets for the current year
    const hasCurrentYearExamSets = currentExamSets.some(es => es.year === currentYear);
    
    if (hasCurrentYearExamSets) {
      // Already have exam sets for current year, no need to copy
      return;
    }
    
    // Get exam sets from previous year
    const { data: previousYearExamSets, error } = await supabase
      .from('exam_sets')
      .select('*')
      .eq('school_id', schoolId)
      .eq('year', currentYear - 1)
      .order('term', { ascending: true });
    
    if (error || !previousYearExamSets || previousYearExamSets.length === 0) {
      // No previous year exam sets to copy
      return;
    }
    
    // Copy each exam set to current year
    const newExamSets = previousYearExamSets.map(es => ({
      school_id: schoolId,
      name: es.name,
      description: es.description,
      term: es.term,
      year: currentYear,
      target_classes: es.target_classes,
      is_active: false, // Start as inactive
      active_for_input: false // Start as not active for input
    }));
    
    const { error: insertError } = await supabase
      .from('exam_sets')
      .insert(newExamSets);
    
    if (insertError) {
      console.error('Failed to auto-copy exam sets:', insertError);
      return;
    }
    
    // Reload exam sets to show the newly copied ones
    const { data: updatedData } = await supabase
      .from('exam_sets')
      .select('*')
      .eq('school_id', schoolId)
      .order('year', { ascending: false })
      .order('term', { ascending: true })
      .order('name');
    
    setExamSets(updatedData || []);
  };

  useEffect(() => {
    const loadExamSets = async () => {
      if (!schoolId) return;
      setLoading(true);
      
      // Load exam sets
      const { data, error } = await supabase
        .from('exam_sets')
        .select('*')
        .eq('school_id', schoolId) // Application-level school filtering
        .order('year', { ascending: false })
        .order('term', { ascending: true })
        .order('name');
      if (error) setError(error.message);
      setExamSets(data || []);
      
      // Load current term
      const { data: termsData, error: termsError } = await supabase
        .from('school_terms')
        .select('*')
        .eq('school_id', schoolId)
        .order('year', { ascending: false })
        .order('term', { ascending: true });
      
      if (!termsError && termsData) {
        // Detect current term by date window
        const todayStr = new Date().toISOString().slice(0,10);
        const current = termsData.find((r: any) => 
          r.start_date ? 
            (r.start_date <= todayStr && r.end_date >= todayStr) : 
            (r.end_date >= todayStr) // If no start date, consider it current if end date is in future
        );
        if (current) {
          setCurrentTerm({ year: current.year, term: current.term });
          
          // Auto-copy exam sets from previous year if none exist for current year
          await autoCopyExamSetsFromPreviousYear(current.year, data || []);
        }
      }
      
      setLoading(false);
    };
    loadExamSets();
  }, [schoolId]);

  const saveExamSet = async () => {
    setError(null);
    if (!schoolId || !name.trim()) return;
    
    setSaving(true);
    const payload = {
      school_id: schoolId,
      name: name.trim(),
      description: description.trim() || null,
      term,
      year,
      target_classes: allClasses ? [] : targetClasses, // Empty array means all classes
      is_active: true
    };

    const { error: insertError } = await supabase
      .from('exam_sets')
      .insert(payload);

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    // Reset form
    setName("");
    setDescription("");
    setTerm(1);
    setYear(new Date().getFullYear());
    setTargetClasses([]);
    setAllClasses(false);

    // Reload exam sets
    const { data } = await supabase
      .from('exam_sets')
      .select('*')
      .eq('school_id', schoolId) // Application-level school filtering
      .order('year', { ascending: false })
      .order('term', { ascending: true })
      .order('name');
    setExamSets(data || []);
  };

  const toggleClass = (className: string) => {
    if (targetClasses.includes(className)) {
      setTargetClasses(prev => prev.filter(c => c !== className));
    } else {
      setTargetClasses(prev => [...prev, className]);
    }
  };

  const deleteExamSet = async (id: string) => {
    // Find the exam set to check its term and year
    const examSet = examSets.find(es => es.id === id);
    if (!examSet) return;
    
    // Check if this exam set is for a previous term
    if (currentTerm) {
      const isPreviousTerm = examSet.year < currentTerm.year || 
        (examSet.year === currentTerm.year && examSet.term < currentTerm.term);
      
      if (isPreviousTerm) {
        setError('Cannot delete exam sets for previous terms.');
        return;
      }
    }
    
    if (!confirm('Are you sure you want to delete this exam set?')) return;
    
    const { error } = await supabase
      .from('exam_sets')
      .delete()
      .eq('id', id);
    
    if (error) {
      setError(error.message);
      return;
    }

    setExamSets(prev => prev.filter(es => es.id !== id));
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    // Find the exam set to check its term and year
    const examSet = examSets.find(es => es.id === id);
    if (!examSet) return;
    
    // Check if this exam set is for a previous term
    if (currentTerm) {
      const isPreviousTerm = examSet.year < currentTerm.year || 
        (examSet.year === currentTerm.year && examSet.term < currentTerm.term);
      
      if (isPreviousTerm) {
        setError('Cannot modify exam sets for previous terms.');
        return;
      }
    }
    
    const { error } = await supabase
      .from('exam_sets')
      .update({ is_active: !currentActive })
      .eq('id', id);
    
    if (error) {
      setError(error.message);
      return;
    }

    setExamSets(prev => prev.map(es => 
      es.id === id ? { ...es, is_active: !currentActive } : es
    ));
  };

  const toggleActiveForInput = async (id: string, currentActiveForInput: boolean) => {
    // Find the exam set to check its term and year
    const examSet = examSets.find(es => es.id === id);
    if (!examSet) return;
    
    // Check if this exam set is for a previous term
    if (currentTerm) {
      const isPreviousTerm = examSet.year < currentTerm.year || 
        (examSet.year === currentTerm.year && examSet.term < currentTerm.term);
      
      if (isPreviousTerm) {
        setError('Cannot modify exam sets for previous terms.');
        return;
      }
    }
    
    // If trying to turn off, check if any results exist
    if (currentActiveForInput) {
      const { data: results, error: resultsError } = await supabase
        .from('exam_results')
        .select('id')
        .eq('exam_set_id', id)
        .limit(1);
      
      if (resultsError) {
        setError('Failed to check existing results');
        return;
      }
      
      if (results && results.length > 0) {
        setError('Cannot turn off exam set. Teachers have already input results for this exam set.');
        return;
      }
    }

    const { error } = await supabase
      .from('exam_sets')
      .update({ active_for_input: !currentActiveForInput })
      .eq('id', id);
    
    if (error) {
      setError(error.message);
      return;
    }

    setExamSets(prev => prev.map(es => 
      es.id === id ? { ...es, active_for_input: !currentActiveForInput } : es
    ));
  };

  return (
    <div>
      <SectionHeader
        title="Exam Sets Management"
        desc={`Create different exam sets for your school (e.g., Beginning of Term, Mid Term, End of Term). Each set can be assigned to specific classes or all classes. Showing exam sets for ${currentTerm?.year || 'current year'}.`}
      />
      
      {/* Create new exam set form */}
      <div className="mb-6 p-4 rounded-lg bg-white/5 border border-white/10">
        <h3 className="text-white font-medium mb-3">Create New Exam Set</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Exam Set Name (e.g., Beginning of Term)"
            className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 placeholder:text-white/60 text-white"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 placeholder:text-white/60 text-white"
          />
          <select
            value={term}
            onChange={(e) => setTerm(parseInt(e.target.value))}
            className="rounded-lg border border-white/10 bg-white text-black px-3 py-2"
          >
            <option value={1}>Term 1</option>
            <option value={2}>Term 2</option>
            <option value={3}>Term 3</option>
          </select>
          <input
            type="number"
            min={2020}
            max={2099}
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="rounded-lg border border-white/10 bg-white text-black px-3 py-2"
          />
        </div>
        
        {/* Class selection */}
        <div className="mt-3">
          <label className="flex items-center gap-2 text-white/80 text-sm mb-2">
            <input
              type="checkbox"
              checked={allClasses}
              onChange={(e) => {
                setAllClasses(e.target.checked);
                if (e.target.checked) setTargetClasses([]);
              }}
              className="accent-blue-500"
            />
            Apply to all classes
          </label>
          
          {!allClasses && (
            <div className="flex flex-wrap gap-2">
              {classOptions.map(className => (
                <button
                  key={className}
                  type="button"
                  onClick={() => toggleClass(className)}
                  className={`px-3 py-1 rounded-lg border text-sm transition-colors ${
                    targetClasses.includes(className)
                      ? 'bg-blue-600/80 border-blue-400 text-white'
                      : 'bg-white/10 border-white/10 text-white/90 hover:bg-white/15'
                  }`}
                >
                  {className}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <button
          disabled={!schoolId || !name.trim() || saving || (!allClasses && targetClasses.length === 0)}
          onClick={saveExamSet}
          className="mt-3 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white"
        >
          {saving ? 'Creating...' : 'Create Exam Set'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {/* Exam sets list */}
      <div className="text-white/80 text-sm mb-3">Current Exam Sets ({currentTerm?.year || 'Current Year'})</div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 overflow-x-auto"
      >
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="px-4 py-2 text-white/80">Name</th>
              <th className="px-4 py-2 text-white/80">Description</th>
              <th className="px-4 py-2 text-white/80">Term</th>
              <th className="px-4 py-2 text-white/80">Year</th>
              <th className="px-4 py-2 text-white/80">Classes</th>
              <th className="px-4 py-2 text-white/80">Status</th>
              <th className="px-4 py-2 text-white/80">Active for Input</th>
              <th className="px-4 py-2 text-white/80">Actions</th>
            </tr>
          </thead>
          <tbody className="[&>tr:nth-child(even)]:bg-white/5">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-white/80">
                  Loading...
                </td>
              </tr>
            ) : examSets.filter(es => currentTerm ? es.year === currentTerm.year : true).length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-white/80">
                  No exam sets created for {currentTerm?.year || 'this year'} yet.
                </td>
              </tr>
            ) : (
              examSets
                .filter(es => currentTerm ? es.year === currentTerm.year : true)
                .map(es => (
                <tr key={es.id} className="border-t border-white/10">
                  <td className="px-4 py-2 text-white font-medium">{es.name}</td>
                  <td className="px-4 py-2 text-white/90">{es.description || '-'}</td>
                  <td className="px-4 py-2 text-white/90">Term {es.term}</td>
                  <td className="px-4 py-2 text-white/90">{es.year}</td>
                  <td className="px-4 py-2 text-white/90">
                    {es.target_classes.length === 0 ? (
                      <span className="text-green-300">All Classes</span>
                    ) : (
                      <span className="text-blue-300">
                        {es.target_classes.length} class{es.target_classes.length !== 1 ? 'es' : ''}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => toggleActive(es.id, es.is_active)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        es.is_active
                          ? 'bg-green-600 hover:bg-green-500 text-white'
                          : 'bg-gray-600 hover:bg-gray-500 text-white'
                      }`}
                    >
                      {es.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => toggleActiveForInput(es.id, es.active_for_input)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        es.active_for_input
                          ? 'bg-blue-600 hover:bg-blue-500 text-white'
                          : 'bg-gray-600 hover:bg-gray-500 text-white'
                      }`}
                    >
                      {es.active_for_input ? 'ON' : 'OFF'}
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => deleteExamSet(es.id)}
                      className="px-2 py-1 text-xs rounded bg-red-500 hover:bg-red-400 transition-transform hover:scale-105 text-white"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}

function SchoolBranding({ schoolId }: { schoolId: string | null }) {
  return (
    <div>
      <SectionHeader
        title="School Branding"
        desc="Customize your school's visual identity: logo, colors, and branding elements."
      />
      <div className="text-white/80 text-sm">
        School branding customization will be available here. This feature is under development.
      </div>
    </div>
  );
}



