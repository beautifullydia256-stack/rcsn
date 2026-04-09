"use client";
/* Production dashboard uses the Vite SPA (vercel.json → framework: vite). Canonical UI: src/pages/admin/settings/SettingsPage.tsx */

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/src/lib/supabase";
import { downloadTimetablePdf } from "@/lib/timetablePdf";
import { useRouter } from "next/navigation";
import LocationSettingsWidget from "../components/LocationSettingsWidget";
import SettingsUaceClassSubjectPapers from "@/src/components/admin/SettingsUaceClassSubjectPapers";
import { canRemoveClassSubjectRow, classSubjectBadge, type ClassSubjectRow } from "@/lib/classSubjectRowGuards";
import { isOLevelClass } from "@/src/components/reports/templates/helpers";
import { REPORT_HEADER_DEFAULTS } from "@/lib/reportHeaderBrandingDefaults";

type TabKey = "subjects" | "assignments" | "finance" | "requirements" | "timetable" | "terms" | "exams" | "branding";

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
      opts.push('Baby Class', 'Middle Class', 'Top Class');
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
          <TabButton k="requirements" label="School Requirements" />
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
          {tab === "subjects" && (
            <>
              <SubjectsPerClass classOptions={classOptions} schoolId={schoolId} />
              {schoolType === "Secondary" && (
                <SettingsUaceClassSubjectPapers variant="next" classOptions={classOptions} schoolId={schoolId} />
              )}
            </>
          )}
          {tab === "assignments" && <TeacherSubjectClass classOptions={classOptions} />}
          {tab === "finance" && <FinancialSettings schoolId={schoolId} classes={classOptions} />}
          {tab === "requirements" && <SchoolRequirements schoolId={schoolId} />}
          {tab === "timetable" && <TimetableDesigner classOptions={classOptions} schoolId={schoolId} />}
          {tab === "terms" && <TermSettings schoolId={schoolId} />}
          {tab === "exams" && <ExamSets classOptions={classOptions} schoolId={schoolId} schoolType={schoolType} />}
          {tab === "branding" && <SchoolBranding schoolId={schoolId} />}
        </motion.div>

        {/* School Location Settings */}
        <LocationSettingsWidget />

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

const subjectsCardShell =
  "rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 overflow-hidden";

function SubjectsPerClassTableRows({
  rows,
  selectedClass,
  onRemove,
}: {
  rows: ClassSubjectRow[];
  selectedClass: string;
  onRemove: (row: ClassSubjectRow) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="px-3 py-8 text-center text-sm text-white/70 sm:px-4">No subjects in this list yet.</div>
    );
  }
  return (
    <>
      <ul className="divide-y divide-white/10 sm:hidden">
        {rows.map((row) => {
          const badge = classSubjectBadge(row);
          const rem = canRemoveClassSubjectRow(selectedClass, row);
          return (
            <li key={row.subject} className="px-3 py-3.5">
              <div className="text-[15px] font-semibold leading-snug text-white break-words">{row.subject}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {badge ? (
                  <span className="rounded-md border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/60">
                    {badge}
                  </span>
                ) : null}
                {!rem && (
                  <span className="text-xs text-white/50" title="Cannot remove this slot">
                    locked
                  </span>
                )}
              </div>
              {rem ? (
                <button
                  type="button"
                  onClick={() => onRemove(row)}
                  className="mt-3 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-rose-600/90 px-4 text-sm font-semibold text-white hover:bg-rose-500 active:bg-rose-700"
                >
                  Remove
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className="hidden overflow-x-auto sm:block">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left">
              <th className="px-4 py-2 text-white/80">Subject</th>
              <th className="px-4 py-2 text-white/80">Notes</th>
              <th className="px-4 py-2 text-white/80 w-[6.5rem]">Actions</th>
            </tr>
          </thead>
          <tbody className="[&>tr:nth-child(even)]:bg-white/5">
            {rows.map((row) => {
              const badge = classSubjectBadge(row);
              const rem = canRemoveClassSubjectRow(selectedClass, row);
              return (
                <tr key={row.subject} className="border-t border-white/10">
                  <td className="max-w-[12rem] px-4 py-2.5 font-medium text-white break-words md:max-w-none">
                    {row.subject}
                  </td>
                  <td className="px-4 py-2.5 text-white/85">
                    {badge ? <span className="text-[10px] uppercase tracking-wide text-white/50">{badge}</span> : null}
                    {!rem && (
                      <span className="ml-2 text-xs text-white/50" title="Cannot remove this slot">
                        locked
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {rem ? (
                      <button
                        type="button"
                        onClick={() => onRemove(row)}
                        className="min-h-[40px] min-w-[5.5rem] rounded-lg bg-rose-600/90 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500"
                      >
                        Remove
                      </button>
                    ) : (
                      <span className="text-xs text-white/50">—</span>
                    )}
                  </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </>
  );
}

function OLevelSubjectsSplitCards({
  selectedClass,
  subjectRows,
  onRemove,
}: {
  selectedClass: string;
  subjectRows: ClassSubjectRow[];
  onRemove: (row: ClassSubjectRow) => void;
}) {
  const compulsory = subjectRows.filter((r) => r.uce_offering_type === "compulsory");
  const subsidiary = subjectRows.filter((r) => r.uce_offering_type === "subsidiary");
  const other = subjectRows.filter(
    (r) => r.uce_offering_type !== "compulsory" && r.uce_offering_type !== "subsidiary",
  );

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
        <div className={subjectsCardShell}>
          <div className="border-b border-white/10 px-3 py-3 sm:px-4 sm:py-3">
            <div className="text-[15px] font-semibold leading-snug text-white">Compulsory subjects</div>
            <div className="mt-1 text-xs leading-relaxed text-white/65">UCE core for this class — learners must include all of these.</div>
          </div>
          <SubjectsPerClassTableRows rows={compulsory} selectedClass={selectedClass} onRemove={onRemove} />
        </div>
        <div className={subjectsCardShell}>
          <div className="border-b border-white/10 px-3 py-3 sm:px-4 sm:py-3">
            <div className="text-[15px] font-semibold leading-snug text-white">Subsidiary subjects</div>
            <div className="mt-1 text-xs leading-relaxed text-white/65">Optional pool — learners choose from this list.</div>
          </div>
          <SubjectsPerClassTableRows rows={subsidiary} selectedClass={selectedClass} onRemove={onRemove} />
        </div>
      </div>
      {other.length > 0 && (
        <div className={subjectsCardShell}>
          <div className="border-b border-white/10 px-3 py-3 sm:px-4 sm:py-3">
            <div className="text-[15px] font-semibold leading-snug text-white">Unclassified</div>
            <div className="mt-1 text-xs leading-relaxed text-white/65">
              No compulsory/subsidiary tag — remove and re-add using the checkbox above.
            </div>
          </div>
          <SubjectsPerClassTableRows rows={other} selectedClass={selectedClass} onRemove={onRemove} />
        </div>
      )}
    </div>
  );
}

function SubjectsPerClass({ classOptions, schoolId }: { classOptions: string[]; schoolId: string | null }) {
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [subjectRows, setSubjectRows] = useState<ClassSubjectRow[]>([]);
  const [newSubject, setNewSubject] = useState("");
  const [addAsCompulsory, setAddAsCompulsory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setError(null);
      if (!schoolId || !selectedClass) { setSubjectRows([]); return; }
      setLoading(true);
      const { data, error: qErr } = await supabase
        .from('class_subjects')
        .select('subject, uce_offering_type, is_non_removable_default')
        .eq('school_id', schoolId)
        .eq('class_name', selectedClass)
        .order('subject');
      if (qErr) setError(qErr.message);
      setSubjectRows((data || []) as ClassSubjectRow[]);
      setLoading(false);
    };
    load();
  }, [schoolId, selectedClass]);

  const addSubject = async () => {
    setError(null);
    if (!schoolId || !selectedClass) return;
    const s = newSubject.trim();
    if (!s) return;
    if (!subjectRows.some((r) => r.subject === s)) {
      setSubjectRows((prev) => [...prev, { subject: s, uce_offering_type: null, is_non_removable_default: false }]);
    }
    setSaving(true);
    const payload: Record<string, unknown> = { school_id: schoolId, class_name: selectedClass, subject: s };
    if (isOLevelClass(selectedClass)) {
      payload.uce_offering_type = addAsCompulsory ? 'compulsory' : 'subsidiary';
      payload.is_non_removable_default = false;
    }
    const { error: insertError } = await supabase.from('class_subjects').insert(payload);
    setSaving(false);
    if (insertError) {
      setError(insertError.message || 'Failed to add subject');
      const { data } = await supabase
        .from('class_subjects')
        .select('subject, uce_offering_type, is_non_removable_default')
        .eq('school_id', schoolId)
        .eq('class_name', selectedClass)
        .order('subject');
      setSubjectRows((data || []) as ClassSubjectRow[]);
      return;
    }
    setNewSubject("");
  };

  const removeSubject = async (row: ClassSubjectRow) => {
    setError(null);
    if (!schoolId || !selectedClass) return;
    if (!canRemoveClassSubjectRow(selectedClass, row)) return;
    setSubjectRows((prev) => prev.filter((r) => r.subject !== row.subject));
    const { error: delErr } = await supabase
      .from('class_subjects')
      .delete()
      .eq('school_id', schoolId)
      .eq('class_name', selectedClass)
      .eq('subject', row.subject);
    if (delErr) {
      setError(delErr.message || 'Failed to remove subject');
      const { data } = await supabase
        .from('class_subjects')
        .select('subject, uce_offering_type, is_non_removable_default')
        .eq('school_id', schoolId)
        .eq('class_name', selectedClass)
        .order('subject');
      setSubjectRows((data || []) as ClassSubjectRow[]);
    }
  };

  return (
    <div>
      <SectionHeader
        title="Subjects per Class"
        desc="Senior 1–4: nationwide default compulsory subjects cannot be removed; add more compulsory or unlimited subsidiary. Senior 5–6: UACE subsidiaries stay fixed."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        <select value={selectedClass} onChange={(e)=>setSelectedClass(e.target.value)} className="min-h-[48px] w-full rounded-xl border border-white/10 bg-white px-3 py-2 text-black outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Select Class</option>
          {classOptions.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input value={newSubject} onChange={(e)=>setNewSubject(e.target.value)} placeholder="Add subject (e.g., Mathematics)" className="min-h-[48px] w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white placeholder:text-white/60 outline-none focus:ring-2 focus:ring-blue-500" />
        <button disabled={!selectedClass || saving} onClick={addSubject} className="min-h-[48px] w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 sm:col-span-2 lg:col-span-1">{saving? 'Saving...' : 'Add Subject'}</button>
        {isOLevelClass(selectedClass) && (
          <label className="flex min-h-[48px] cursor-pointer items-start gap-3 text-sm leading-snug text-white/80 sm:col-span-2 lg:col-span-3">
            <input type="checkbox" checked={addAsCompulsory} onChange={(e) => setAddAsCompulsory(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 rounded border-white/30" aria-label="Add as compulsory UCE subject" />
            <span>Add as compulsory UCE (otherwise subsidiary) — default nationwide compulsories are locked.</span>
          </label>
        )}
      </div>
      <div className="mt-4">
        {error && <div className="mb-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-3 py-2 text-sm">{error}</div>}
        {loading ? (
          <div className="text-white/80 text-sm">Loading subjects...</div>
        ) : !selectedClass ? (
          <div className="text-white/80 text-sm">Select a class to view its subjects.</div>
        ) : subjectRows.length === 0 ? (
          <div className="text-white/80 text-sm">No subjects yet for {selectedClass}. Add one above.</div>
        ) : isOLevelClass(selectedClass) ? (
          <OLevelSubjectsSplitCards selectedClass={selectedClass} subjectRows={subjectRows} onRemove={removeSubject} />
        ) : (
          <div className={subjectsCardShell}>
            <div className="border-b border-white/10 px-3 py-3 sm:px-4 sm:py-3">
              <div className="text-[15px] font-semibold leading-snug text-white">Subjects for this class</div>
              <div className="mt-1 text-xs leading-relaxed text-white/65">{selectedClass}</div>
            </div>
            <SubjectsPerClassTableRows rows={subjectRows} selectedClass={selectedClass} onRemove={removeSubject} />
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
  const [feeStructure, setFeeStructure] = useState<Record<string, string>>({});
  const [admissionFee, setAdmissionFee] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [feeStatus, setFeeStatus] = useState<any>(null);

  useEffect(() => {
    const loadFees = async () => {
      if (!schoolId) return;
      setLoading(true);
      try {
        // Load fee structure data
        const { data, error: fetchError } = await supabase
          .from('school_fee_structure')
          .select('*')
          .eq('school_id', schoolId);

        if (fetchError) throw fetchError;

        // Convert array to object for easier access
        const feeMap: Record<string, string> = {};
        let admFee = '';

        (data || []).forEach((fee: any) => {
          const amount = Number(fee.tuition_amount || 0);
          if (fee.class_name === 'ADMISSION') {
            admFee = amount > 0 ? amount.toString() : '';
          } else {
            feeMap[fee.class_name] = amount > 0 ? amount.toString() : '';
            // Load boarding fees
            feeMap[`${fee.class_name}_boarding_tuition`] = Number(fee.boarding_tuition_amount || 0) > 0 ? fee.boarding_tuition_amount.toString() : '';
          }
        });

        setFeeStructure(feeMap);
        setAdmissionFee(admFee);

        // Load fee structure status
        const { data: statusData, error: statusError } = await supabase
          .rpc('get_fee_structure_status', { p_school_id: schoolId });

        if (statusError) {
          console.warn('Could not load fee status:', statusError);
        } else {
          setFeeStatus(statusData);
        }
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
        tuition_amount: parseInt(feeStructure[className]) || 0,
        boarding_tuition_amount: parseInt(feeStructure[`${className}_boarding_tuition`]) || 0
      }));

      // Add admission fee as special record
      feeRecords.push({
        school_id: schoolId,
        class_name: 'ADMISSION',
        tuition_amount: parseInt(admissionFee) || 0
      });

      // Upsert all records
      const { error: upsertError } = await supabase
        .from('school_fee_structure')
        .upsert(feeRecords, { onConflict: 'school_id,class_name' });

      if (upsertError) throw upsertError;

      // Refresh fee status after saving
      try {
        const { data: statusData } = await supabase
          .rpc('get_fee_structure_status', { p_school_id: schoolId });
        setFeeStatus(statusData);
      } catch (statusError) {
        console.warn('Could not refresh fee status:', statusError);
      }

      // Automatically sync student balances after saving fee structure
      try {
        const syncResponse = await fetch('/api/admin/sync-student-balances', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schoolId })
        });

        const syncResult = await syncResponse.json();
        
        if (syncResponse.ok) {
          const invN =
            (syncResult.invoicesCreated || 0) + (syncResult.invoicesUpdated || 0) > 0
              ? ` Invoices: ${syncResult.invoicesCreated || 0} created, ${syncResult.invoicesUpdated || 0} updated.`
              : '';
          setSuccess(
            `Fee structure saved! ${syncResult.updated || 0} student(s) updated with new fees.${invN}`
          );
        } else {
          setSuccess('Fee structure saved successfully! (Balance sync will run in background)');
        }
      } catch (syncError) {
        // Even if sync fails, fee structure was saved
        setSuccess('Fee structure saved successfully!');
        console.error('Balance sync error:', syncError);
      }

      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error('Error saving fees:', err);
      setError(err.message || 'Failed to save fee structure');
    } finally {
      setSaving(false);
    }
  };

  const updateClassFee = (className: string, value: string) => {
    setFeeStructure(prev => ({ ...prev, [className]: value }));
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

      {/* Fee Structure Status */}
      {feeStatus && (
        <div className={`mb-4 p-4 rounded-lg border ${
          feeStatus.status === 'fully_configured' ? 'bg-green-600/10 border-green-500/30' :
          feeStatus.status === 'partially_configured' ? 'bg-yellow-600/10 border-yellow-500/30' :
          feeStatus.status === 'not_configured' ? 'bg-orange-600/10 border-orange-500/30' :
          'bg-red-600/10 border-red-500/30'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className={`font-medium text-sm ${
              feeStatus.status === 'fully_configured' ? 'text-green-300' :
              feeStatus.status === 'partially_configured' ? 'text-yellow-300' :
              feeStatus.status === 'not_configured' ? 'text-orange-300' :
              'text-red-300'
            }`}>
              {feeStatus.status === 'fully_configured' ? '✅' : 
               feeStatus.status === 'partially_configured' ? '⚠️' :
               feeStatus.status === 'not_configured' ? '🔧' : '❌'} 
              {feeStatus.message}
            </h3>
          </div>
          <p className="text-white/70 text-sm mb-2">{feeStatus.description}</p>
          <div className="flex items-center justify-between text-xs text-white/60">
            <span>Classes: {feeStatus.configured_classes || 0}/{feeStatus.total_classes || 0} configured</span>
            <span className="text-white/50">{feeStatus.action}</span>
          </div>
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
            onChange={(e) => setAdmissionFee(e.target.value)}
            className="w-48 px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white"
            placeholder="e.g., 50000"
          />
        </div>
      </div>

      {/* Tuition Fees Per Class */}
      <div className="mb-6">
        <h3 className="text-white font-medium mb-3">💰 Day Tuition Fees Per Class (Per Term)</h3>
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
                  onChange={(e) => updateClassFee(className, e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white"
                  placeholder="e.g., 100000"
                />
              </div>
              <p className="mt-1 text-xs text-white/50">
                {feeStructure[className] && parseInt(feeStructure[className]) > 0 ? 
                  `~UGX ${(parseInt(feeStructure[className]) * 3).toLocaleString()} per Year` : 
                  'Fee not configured - students cannot be registered for this class until fee is set'
                }
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Boarding Fees Per Class */}
      <div className="mb-6">
        <h3 className="text-white font-medium mb-3">🏠 Boarding Fees Per Class (Per Term)</h3>
        <p className="text-white/60 text-sm mb-4">
          Set the boarding fees <strong>per term</strong> for each class. This includes accommodation, meals, and additional boarding tuition. The yearly total will be calculated automatically (3 terms).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((className) => (
            <div key={className} className="p-4 rounded-lg bg-blue-600/10 border border-blue-500/30">
              <label className="block text-blue-300 text-sm font-medium mb-3">
                {className} - Boarding
              </label>
              
              {/* Boarding Tuition */}
              <div className="mb-2">
                <label className="block text-white/70 text-xs mb-1">Boarding Tuition (UGX)</label>
                <input
                  type="number"
                  min="0"
                  value={feeStructure[`${className}_boarding_tuition`] || ''}
                  onChange={(e) => updateClassFee(`${className}_boarding_tuition`, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white text-sm"
                  placeholder="e.g., 150000"
                />
              </div>

              {/* Total Display */}
              <div className="mt-2 p-2 rounded bg-white/5">
                <p className="text-xs text-white/60">
                  {(() => {
                    const tuition = parseInt(feeStructure[`${className}_boarding_tuition`] || '0');
                    return tuition > 0 ? 
                      `Total: UGX ${tuition.toLocaleString()}/term (~UGX ${(tuition * 3).toLocaleString()}/year)` : 
                      'Boarding fees not configured';
                  })()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <button
          onClick={async () => {
            if (!schoolId) return;
            const confirmed = confirm('Manually sync balances for all students based on current fee structure?');
            if (!confirmed) return;
            
            setSaving(true);
            try {
              const response = await fetch('/api/admin/sync-student-balances', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ schoolId })
              });
              const result = await response.json();
              if (response.ok) {
                setSuccess(`Synced ${result.updated || 0} student(s) with current fees!`);
                setTimeout(() => setSuccess(null), 5000);
              } else {
                setError(result.error || 'Failed to sync balances');
              }
            } catch (err: any) {
              setError(err.message || 'Failed to sync balances');
            } finally {
              setSaving(false);
            }
          }}
          disabled={saving}
          className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🔄 Sync Student Balances
        </button>
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

      {/* Auto-Sync Info */}
      <div className="mt-4 p-4 rounded-lg bg-green-600/10 border border-green-500/30">
        <h4 className="text-green-300 font-medium text-sm mb-2">✨ Automatic Balance Updates</h4>
        <p className="text-white/60 text-xs mb-2">
          When you click <strong>"Save Fee Structure"</strong>, the system automatically:
        </p>
        <ul className="text-white/60 text-xs space-y-1">
          <li>• Updates expected fees for ALL existing students</li>
          <li>• Recalculates outstanding balances</li>
          <li>• Works for students added before OR after fee setup</li>
          <li>• Creates balance records for current term</li>
        </ul>
        <p className="text-white/50 text-xs mt-2 italic">
          💡 Use the "🔄 Sync Student Balances" button to manually update balances anytime.
        </p>
      </div>
    </div>
  );
}

function TimetableDesigner({ classOptions, schoolId }: { classOptions: string[]; schoolId: string | null }) {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [timetablePeriods, setTimetablePeriods] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState('');
  const [pdfScope, setPdfScope] = useState<'whole_school' | 'single_class'>('whole_school');
  const [pdfClass, setPdfClass] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!schoolId) return;

      const { data: schRow } = await supabase
        .from('schools')
        .select('name')
        .eq('school_id', schoolId)
        .single();
      setSchoolName((schRow as { name?: string } | null)?.name || '');

      // Load teachers
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('teacher_id, name')
        .eq('school_id', schoolId)
        .order('name');
      
      setTeachers(teacherData || []);

      // Load subjects for selected class
      if (selectedClass) {
        const { data: subjectData } = await supabase
          .from('class_subjects')
          .select('subject')
          .eq('school_id', schoolId)
          .eq('class_name', selectedClass);
        
        if (subjectData) {
          setSubjects(subjectData.map((s: any) => s.subject));
        }
      }

      // Load existing timetable periods
      const { data: periodsData } = await supabase
        .from('timetable_periods')
        .select(`
          id,
          class_name,
          day_of_week,
          subject,
          teacher_id,
          start_time,
          end_time,
          teachers!inner(name)
        `)
        .eq('school_id', schoolId)
        .order('class_name, day_of_week, start_time');
      
      if (periodsData) {
        const formattedPeriods = periodsData.map((period: any) => ({
          id: period.id,
          school_id: schoolId,
          class_name: period.class_name,
          day_of_week: period.day_of_week,
          subject: period.subject,
          teacher_id: period.teacher_id,
          start_time: period.start_time,
          end_time: period.end_time,
          teacher_name: period.teachers?.name || 'Unknown'
        }));
        setTimetablePeriods(formattedPeriods);
      }
    };

    loadData();
  }, [schoolId, selectedClass]);

  const handleAddPeriod = async () => {
    if (!schoolId || !selectedClass || !selectedDay || !selectedSubject || !selectedTeacher || !startTime || !endTime) {
      setError('Please fill in all fields before adding a period.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Check for time conflicts
      const hasConflict = timetablePeriods.some(period => 
        period.class_name === selectedClass &&
        period.day_of_week === selectedDay &&
        ((startTime >= period.start_time && startTime < period.end_time) ||
         (endTime > period.start_time && endTime <= period.end_time) ||
         (startTime <= period.start_time && endTime >= period.end_time))
      );

      if (hasConflict) {
        setError('Time conflict detected. Please choose a different time slot.');
        setSaving(false);
        return;
      }

      // Save to database first
      const { data: insertedPeriod, error: insertError } = await supabase
        .from('timetable_periods')
        .insert({
          school_id: schoolId,
          class_name: selectedClass,
          day_of_week: selectedDay,
          subject: selectedSubject,
          teacher_id: selectedTeacher,
          start_time: startTime,
          end_time: endTime
        })
        .select(`
          id,
          class_name,
          day_of_week,
          subject,
          teacher_id,
          start_time,
          end_time,
          teachers!inner(name)
        `)
        .single();
      
      if (insertError) throw insertError;

      // Add period to local state with database ID
      const newPeriod = {
        id: insertedPeriod.id,
        school_id: schoolId,
        class_name: insertedPeriod.class_name,
        day_of_week: insertedPeriod.day_of_week,
        subject: insertedPeriod.subject,
        teacher_id: insertedPeriod.teacher_id,
        start_time: insertedPeriod.start_time,
        end_time: insertedPeriod.end_time,
        teacher_name: insertedPeriod.teachers?.name || 'Unknown'
      };

      setTimetablePeriods(prev => [...prev, newPeriod]);

      // Clear form
      setSelectedDay('');
      setSelectedSubject('');
      setSelectedTeacher('');
      setStartTime('');
      setEndTime('');

    } catch (err) {
      console.error('Error adding period:', err);
      setError('Failed to add period. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePeriod = async (periodId: number) => {
    try {
      // Remove from database
      const { error } = await supabase
        .from('timetable_periods')
        .delete()
        .eq('id', periodId);
      
      if (error) throw error;

      // Remove from local state
      setTimetablePeriods(prev => prev.filter(p => p.id !== periodId));
    } catch (err) {
      console.error('Error removing period:', err);
      setError('Failed to remove period. Please try again.');
    }
  };

  const handleDownloadPDF = () => {
    setError(null);
    if (!schoolId) {
      setError('School not loaded yet. Refresh and try again.');
      return;
    }
    if (timetablePeriods.length === 0) {
      setError('Add timetable periods before exporting a PDF.');
      return;
    }
    if (pdfScope === 'single_class') {
      if (!pdfClass) {
        setError('Choose which class to include in the PDF.');
        return;
      }
      const has = timetablePeriods.some((p: { class_name: string }) => p.class_name === pdfClass);
      if (!has) {
        setError('No periods exist for that class yet.');
        return;
      }
    }
    try {
      const filtered =
        pdfScope === 'single_class'
          ? timetablePeriods.filter((p: { class_name: string }) => p.class_name === pdfClass)
          : timetablePeriods;
      downloadTimetablePdf({
        schoolName: schoolName || 'School',
        periods: filtered.map((p: any) => ({
          class_name: p.class_name,
          day_of_week: p.day_of_week,
          subject: p.subject,
          start_time: p.start_time,
          end_time: p.end_time,
          teacher_name: p.teacher_name,
        })),
        scope: pdfScope === 'whole_school' ? 'whole_school' : 'single_class',
        singleClassName: pdfScope === 'single_class' ? pdfClass : undefined,
        classOrder: classOptions,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate PDF.');
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-start sm:justify-between">
        <SectionHeader
          title="Timetable Designer"
          desc="Design the school timetable: set periods per day, assign classes, subjects and teachers."
        />
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <label className="flex items-center gap-2 text-sm text-white/80">
              <span className="shrink-0">PDF scope</span>
              <select
                className="rounded-lg border border-white/10 bg-white text-black px-3 py-2 min-h-[44px] min-w-[10rem]"
                value={pdfScope}
                onChange={(e) => {
                  const v = e.target.value === 'single_class' ? 'single_class' : 'whole_school';
                  setPdfScope(v);
                  if (v === 'whole_school') setPdfClass('');
                }}
              >
                <option value="whole_school">Whole school (all classes)</option>
                <option value="single_class">Single class</option>
              </select>
            </label>
            {pdfScope === 'single_class' && (
              <label className="flex items-center gap-2 text-sm text-white/80">
                <span className="shrink-0">Class</span>
                <select
                  className="rounded-lg border border-white/10 bg-white text-black px-3 py-2 min-h-[44px] min-w-[10rem]"
                  value={pdfClass}
                  onChange={(e) => setPdfClass(e.target.value)}
                >
                  <option value="">Select class</option>
                  {classOptions.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
        <button
          onClick={handleDownloadPDF}
          className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium flex items-center gap-2 min-h-[44px]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download PDF
        </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <select 
          className="rounded-lg border border-white/10 bg-white text-black px-3 py-2"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
        >
          <option value="">Select Class</option>
          {classOptions.map((cls) => (
            <option key={cls} value={cls}>{cls}</option>
          ))}
        </select>
        <select 
          className="rounded-lg border border-white/10 bg-white text-black px-3 py-2"
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value)}
        >
          <option value="">Weekday</option>
          <option value="Monday">Monday</option>
          <option value="Tuesday">Tuesday</option>
          <option value="Wednesday">Wednesday</option>
          <option value="Thursday">Thursday</option>
          <option value="Friday">Friday</option>
        </select>
        <input 
          type="time" 
          className="rounded-lg border border-white/10 bg-white text-black px-3 py-2"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          placeholder="Start Time"
        />
        <input 
          type="time" 
          className="rounded-lg border border-white/10 bg-white text-black px-3 py-2"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          placeholder="End Time"
        />
        <select 
          className="rounded-lg border border-white/10 bg-white text-black px-3 py-2 md:col-span-2"
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          disabled={!selectedClass}
        >
          <option value="">Select Subject</option>
          {subjects.map((subj) => (
            <option key={subj} value={subj}>{subj}</option>
          ))}
        </select>
        <select 
          className="rounded-lg border border-white/10 bg-white text-black px-3 py-2 md:col-span-2"
          value={selectedTeacher}
          onChange={(e) => setSelectedTeacher(e.target.value)}
        >
          <option value="">Select Teacher</option>
          {teachers.map((teacher) => (
            <option key={teacher.teacher_id} value={teacher.teacher_id}>{teacher.name}</option>
          ))}
        </select>
        <button 
          onClick={handleAddPeriod}
          disabled={saving}
          className="rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 px-3 py-2 text-white"
        >
          {saving ? 'Adding...' : 'Add Period'}
        </button>
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-600/10 border border-red-500/30 text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Timetable Grid */}
      {timetablePeriods.length > 0 && (
        <div className="mt-6">
          <h3 className="text-white font-medium mb-4">Current Timetable Periods</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {timetablePeriods.map((period) => (
              <div key={period.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-white font-medium">{period.class_name}</h4>
                  <button
                    onClick={() => handleRemovePeriod(period.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                </div>
                <div className="space-y-1 text-sm text-white/80">
                  <div><strong>Day:</strong> {period.day_of_week}</div>
                  <div><strong>Time:</strong> {period.start_time} - {period.end_time}</div>
                  <div><strong>Subject:</strong> {period.subject}</div>
                  <div><strong>Teacher:</strong> {period.teacher_name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {timetablePeriods.length === 0 && (
        <div className="mt-4 text-white/60 text-sm text-center py-8">
          No periods added yet. Fill in the form above and click "Add Period" to create your timetable.
        </div>
      )}
      
      {/* PDF Preview Info */}
      <div className="mt-6 p-4 rounded-lg bg-blue-600/10 border border-blue-500/30">
        <h4 className="text-blue-300 font-medium text-sm mb-2">📄 PDF Export</h4>
        <p className="text-white/60 text-xs">
          Whole-school export adds one landscape page per class. Single-class export is one page.
          Days are columns and period times are rows (typical wall-timetable layout).
        </p>
      </div>
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
  const [nextTermBeginsDate, setNextTermBeginsDate] = useState<string>("");
  const [savingNextTermDate, setSavingNextTermDate] = useState(false);
  const [nextTermDateSuccess, setNextTermDateSuccess] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!schoolId) return;
      const { data } = await supabase.from('school_terms').select('*').eq('school_id', schoolId).order('year', { ascending: false }).order('term', { ascending: true });
      setRows(data || []);
      // Detect current term by date window
      const todayStr = new Date().toISOString().slice(0,10);
      const current = (data || []).find((r:any)=> r.start_date <= todayStr && r.end_date >= todayStr) || null;
      if (current) setCurrentTerm({ year: current.year, term: current.term, start_date: current.start_date, end_date: current.end_date });
      
      // Load next term begins date
      const { data: schoolData } = await supabase.from('schools').select('next_term_begins_date').eq('school_id', schoolId).single();
      if (schoolData?.next_term_begins_date) {
        setNextTermBeginsDate(schoolData.next_term_begins_date);
      }
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

  const saveNextTermBeginsDate = async () => {
    if (!schoolId || !nextTermBeginsDate) {
      setError('Please select a date before saving.');
      return;
    }
    
    setSavingNextTermDate(true);
    setError(null);
    setNextTermDateSuccess(null);
    
    const { data, error } = await supabase
      .from('schools')
      .update({ next_term_begins_date: nextTermBeginsDate })
      .eq('school_id', schoolId)
      .select('next_term_begins_date')
      .single();
    
    setSavingNextTermDate(false);
    if (error) {
      setError(`Failed to save: ${error.message}`);
      setNextTermDateSuccess(null);
    } else {
      setError(null);
      setNextTermDateSuccess('Next term begins date saved successfully!');
      // Reload the date to confirm it was saved
      if (data?.next_term_begins_date) {
        setNextTermBeginsDate(data.next_term_begins_date);
      }
      // Clear success message after 3 seconds
      setTimeout(() => setNextTermDateSuccess(null), 3000);
    }
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
            {(() => {
              if (rows.length === 0) {
                return <tr><td colSpan={4} className="px-4 py-3 text-white/70">No terms set yet.</td></tr>;
              }
              
              // Find current term and next term
              const todayStr = new Date().toISOString().slice(0,10);
              const currentTermRow = rows.find((r: any) => {
                return r.start_date ? 
                  (r.start_date <= todayStr && r.end_date >= todayStr) :
                  (r.end_date >= todayStr);
              });
              
              let nextTermRow = null;
              if (currentTermRow) {
                let nextTerm = currentTermRow.term + 1;
                let nextYear = currentTermRow.year;
                if (nextTerm > 3) {
                  nextTerm = 1;
                  nextYear = currentTermRow.year + 1;
                }
                nextTermRow = rows.find((r: any) => r.year === nextYear && r.term === nextTerm);
              }
              
              const displayRows = [currentTermRow, nextTermRow].filter(Boolean);
              
              if (displayRows.length === 0) {
                return <tr><td colSpan={4} className="px-4 py-3 text-white/70">No current or next term found.</td></tr>;
              }
              
              return displayRows.map(r => {
                const isCurrentTerm = r === currentTermRow;
                
                return (
                  <tr key={r.id} className="border-t border-white/10">
                    <td className="px-4 py-2 text-white">{r.year}</td>
                    <td className="px-4 py-2 text-white/90">
                      {isCurrentTerm ? (
                        <span className="px-2 py-1 bg-green-600/20 text-green-300 rounded text-xs">Current</span>
                      ) : (
                        <span className="px-2 py-1 bg-blue-600/20 text-blue-300 rounded text-xs">Next</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-white/90">{r.start_date ? new Date(r.start_date).toLocaleDateString() : 'TBD'}</td>
                    <td className="px-4 py-2 text-white/90">{new Date(r.end_date).toLocaleDateString()}</td>
                  </tr>
                );
              });
            })()}
          </tbody>
        </table>
      </div>
      
      {/* Next Term Begins Date */}
      <div className="mt-6 p-4 rounded-lg bg-green-600/10 border border-green-500/30">
        <h3 className="text-green-300 font-medium mb-3">📅 Next Term Begins Date</h3>
        <p className="text-white/60 text-sm mb-3">Set the date when the next term begins. This will appear on student report cards.</p>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={nextTermBeginsDate}
            onChange={(e) => setNextTermBeginsDate(e.target.value)}
            className="rounded-lg border border-white/20 bg-white/10 text-white px-3 py-2"
          />
          <button
            onClick={saveNextTermBeginsDate}
            disabled={!schoolId || !nextTermBeginsDate || savingNextTermDate}
            className="rounded-lg bg-green-600 hover:bg-green-500 px-4 py-2 text-white disabled:opacity-50"
          >
            {savingNextTermDate ? 'Saving...' : 'Save Date'}
          </button>
        </div>
        {nextTermDateSuccess && (
          <div className="mt-3 rounded-lg border border-green-500/30 bg-green-500/10 text-green-200 px-3 py-2 text-sm">
            {nextTermDateSuccess}
          </div>
        )}
        {error && nextTermBeginsDate && (
          <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-3 py-2 text-sm">
            {error}
          </div>
        )}
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
      .order('sort_order', { ascending: true })
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
        .order('sort_order', { ascending: true })
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
      .order('sort_order', { ascending: true })
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
  const H = REPORT_HEADER_DEFAULTS;
  const [logo, setLogo] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [motto, setMotto] = useState('');
  const [address, setAddress] = useState('');
  const [pobox, setPobox] = useState('');
  const [website, setWebsite] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Header color states (defaults: black / neutral — same as SettingsBranding tab)
  const [schoolNameColor, setSchoolNameColor] = useState<string>(H.schoolName);
  const [subtitleColor, setSubtitleColor] = useState<string>(H.subtitle);
  const [addressColor, setAddressColor] = useState<string>(H.address);
  const [contactColor, setContactColor] = useState<string>(H.contact);
  const [mottoColor, setMottoColor] = useState<string>(H.motto);
  const [dividerColor, setDividerColor] = useState<string>(H.divider);
  const [chipTextColor, setChipTextColor] = useState<string>(H.chipText);
  const [chipBgColor, setChipBgColor] = useState<string>(H.chipBackground);
  const [chipBorderColor, setChipBorderColor] = useState<string>(H.chipBorder);
  const [metaLineColor, setMetaLineColor] = useState<string>(H.metaLine);
  const [contactSeparatorColor, setContactSeparatorColor] = useState<string>(H.contactSeparator);

  useEffect(() => {
    const loadBranding = async () => {
      if (!schoolId) return;

      try {
        // First try with all columns including subtitle, address, pobox, and colors
        let { data, error } = await supabase
          .from('schools')
          .select('name, logo_url, motto, subtitle, address, pobox, location, website, contact_email, contact_phone, header_school_name_color, header_subtitle_color, header_address_color, header_contact_color, header_motto_color, header_divider_color, header_chip_text_color, header_chip_background_color, header_chip_border_color, header_meta_line_color, header_contact_separator_color')
          .eq('school_id', schoolId)
          .single();

        // If error occurs (e.g., column doesn't exist), try without new columns
        if (error) {
          console.warn('Error loading with new columns, trying fallback:', error);
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('schools')
            .select('name, logo_url, motto, subtitle, address, pobox, location, website, contact_email, contact_phone')
            .eq('school_id', schoolId)
            .single();
          
          if (fallbackError) {
            console.error('Error loading branding data:', fallbackError);
            return;
          }
          data = fallbackData;
        }

        if (data) {
          const d = data as Record<string, unknown>;
          const hasHeaderColorColumns = typeof d.header_school_name_color !== 'undefined';
          setSchoolName((data.name as string) || '');
          setLogo((data.logo_url as string) || null);
          setMotto((data.motto as string) || '');
          setSubtitle((data.subtitle as string) || '');
          setAddress((data.address as string) || (data.location as string) || '');
          setPobox((data.pobox as string) || '');
          setWebsite((data.website as string) || '');
          setContactEmail((data.contact_email as string) || '');
          setContactPhone((data.contact_phone as string) || '');
          
          if (hasHeaderColorColumns) {
            setSchoolNameColor((d.header_school_name_color as string) || H.schoolName);
            setSubtitleColor((d.header_subtitle_color as string) || H.subtitle);
            setAddressColor((d.header_address_color as string) || H.address);
            setContactColor((d.header_contact_color as string) || H.contact);
            setMottoColor((d.header_motto_color as string) || H.motto);
            setDividerColor((d.header_divider_color as string) || H.divider);
            setChipTextColor((d.header_chip_text_color as string) || H.chipText);
            setChipBgColor((d.header_chip_background_color as string) || H.chipBackground);
            setChipBorderColor((d.header_chip_border_color as string) || H.chipBorder);
            setMetaLineColor((d.header_meta_line_color as string) || H.metaLine);
            setContactSeparatorColor((d.header_contact_separator_color as string) || H.contactSeparator);
          } else {
            setSchoolNameColor(H.schoolName);
            setSubtitleColor(H.subtitle);
            setAddressColor(H.address);
            setContactColor(H.contact);
            setMottoColor(H.motto);
            setDividerColor(H.divider);
            setChipTextColor(H.chipText);
            setChipBgColor(H.chipBackground);
            setChipBorderColor(H.chipBorder);
            setMetaLineColor(H.metaLine);
            setContactSeparatorColor(H.contactSeparator);
          }
        }
      } catch (err) {
        console.error('Error loading branding:', err);
      }
    };

    loadBranding();
  }, [schoolId]);

  const handleBadgeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !schoolId) return;

    const file = e.target.files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, etc.)');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size must be less than 2MB');
      return;
    }

    setUploading(true);

    try {
      // Create unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${schoolId}-badge-${Date.now()}.${fileExt}`;
      const filePath = `school-badges/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('school-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        alert(`Failed to upload badge: ${uploadError.message}\n\nPlease ensure the 'school-assets' storage bucket exists in Supabase.`);
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('school-assets')
        .getPublicUrl(filePath);

      // Update schools table with new logo URL
      const { error: updateError } = await supabase
        .from('schools')
        .update({ logo_url: publicUrl })
        .eq('school_id', schoolId);

      if (updateError) {
        console.error('Update error:', updateError);
        alert('Failed to save badge URL. Please try again.');
        return;
      }

      setLogo(publicUrl);
      alert('School badge uploaded successfully!');
      
      // Reload branding data to ensure UI is updated
      const { data: updatedData } = await supabase
        .from('schools')
        .select('name, logo_url, motto, subtitle, address, location, website, contact_email, contact_phone')
        .eq('school_id', schoolId)
        .single();
      
      if (updatedData) {
        setLogo(updatedData.logo_url || null);
        setMotto(updatedData.motto || '');
        setSubtitle(updatedData.subtitle || '');
        setAddress(updatedData.address || updatedData.location || '');
        setPobox(updatedData.pobox || '');
        setWebsite(updatedData.website || '');
        setContactEmail(updatedData.contact_email || '');
        setContactPhone(updatedData.contact_phone || '');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveBranding = async () => {
    if (!schoolId) return;

    setSaving(true);

    try {
      // Build update object - only include fields that have values or are being cleared
      const updateData: any = {
        motto,
        website,
        contact_email: contactEmail,
        contact_phone: contactPhone
      };

      // Only include subtitle, address, pobox, and colors if they exist (to avoid errors if columns don't exist yet)
      // We'll try to update them, but if they fail, we'll continue with other fields
      try {
        updateData.subtitle = subtitle;
        updateData.address = address;
        updateData.pobox = pobox;
        updateData.header_school_name_color = schoolNameColor;
        updateData.header_subtitle_color = subtitleColor;
        updateData.header_address_color = addressColor;
        updateData.header_contact_color = contactColor;
        updateData.header_motto_color = mottoColor;
        updateData.header_divider_color = dividerColor;
        updateData.header_chip_text_color = chipTextColor;
        updateData.header_chip_background_color = chipBgColor;
        updateData.header_chip_border_color = chipBorderColor;
        updateData.header_meta_line_color = metaLineColor;
        updateData.header_contact_separator_color = contactSeparatorColor;
      } catch (e) {
        // Columns might not exist yet - that's okay, we'll update them later
        console.warn('Some columns may not exist yet:', e);
      }

      const { error } = await supabase
        .from('schools')
        .update(updateData)
        .eq('school_id', schoolId);

      if (error) {
        console.error('Save error:', error);
        // If error is about missing columns, try without them
        if (error.message.includes('column') && (error.message.includes('subtitle') || error.message.includes('address') || error.message.includes('pobox'))) {
          const { error: retryError } = await supabase
            .from('schools')
            .update({
              motto,
              website,
              contact_email: contactEmail,
              contact_phone: contactPhone
            })
            .eq('school_id', schoolId);
          
          if (retryError) {
            alert(`Failed to save branding details: ${retryError.message}`);
            return;
          }
          alert('Branding details saved successfully! (Note: Subtitle/Address columns need to be added to database)');
        } else {
          alert(`Failed to save branding details: ${error.message}`);
        }
        return;
      }

      alert('Branding details saved successfully!');
    } catch (error: any) {
      console.error('Error:', error);
      alert(`An error occurred: ${error.message || 'Please try again.'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="School Branding"
        desc="Upload your school badge and customize branding information."
      />

      {/* School Badge Section */}
      <div className="p-6 rounded-xl bg-white/5 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">School Badge / Logo</h3>
        
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Current Badge Preview */}
          <div className="flex-shrink-0">
            <div className="w-40 h-40 rounded-lg border-2 border-white/20 bg-white/5 flex items-center justify-center overflow-hidden">
              {logo ? (
                <img src={logo} alt="School Badge" className="w-full h-full object-contain p-2" />
              ) : (
                <div className="text-center text-white/40 text-sm p-4">
                  <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  No badge uploaded
                </div>
              )}
            </div>
            <p className="text-xs text-white/50 mt-2 text-center">Current Badge</p>
          </div>

          {/* Upload Controls */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-white/80 mb-2">
              Upload New Badge
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleBadgeUpload}
              disabled={uploading}
              className="block w-full text-sm text-white/80
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-600 file:text-white
                hover:file:bg-blue-500
                file:cursor-pointer
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-white/50 mt-2">
              Recommended: PNG or JPG, max 2MB, square ratio (e.g., 500x500px)
            </p>
            {uploading && (
              <div className="mt-3 text-sm text-blue-400 flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading badge...
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 p-4 rounded-lg bg-blue-600/10 border border-blue-500/30">
          <h4 className="text-blue-300 font-medium text-sm mb-2">📌 Where Your Badge Appears</h4>
          <ul className="text-white/60 text-xs space-y-1">
            <li>• Student report cards (all templates)</li>
            <li>• Headed paper and official documents</li>
            <li>• Exam result sheets</li>
            <li>• Fee receipts and invoices</li>
            <li>• School timetables (when exported as PDF)</li>
          </ul>
        </div>
      </div>

      {/* School Details Section */}
      <div className="p-6 rounded-xl bg-white/5 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">School Information</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">School Name</label>
            <input
              type="text"
              value={schoolName}
              disabled
              className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white/50 cursor-not-allowed"
            />
            <p className="text-xs text-white/40 mt-1">Contact support to change school name</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">School Subtitle</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="e.g., Premier Academy Ltd"
              className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder-white/30"
            />
            <p className="text-xs text-white/40 mt-1">Displayed below school name in report headers</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">School Motto</label>
            <input
              type="text"
              value={motto}
              onChange={(e) => setMotto(e.target.value)}
              placeholder="e.g., Excellence in Education"
              className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder-white/30"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g., Saddler Way, Naguru"
                className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder-white/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">P.O.Box</label>
              <input
                type="text"
                value={pobox}
                onChange={(e) => setPobox(e.target.value)}
                placeholder="e.g., P.O.Box 3673, Kampala Uganda"
                className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder-white/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Website</label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://www.yourschool.com"
              className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder-white/30"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Contact Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="info@yourschool.com"
                className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder-white/30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Contact Phone</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+256 XXX XXX XXX"
                className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder-white/30"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleSaveBranding}
              disabled={saving}
              className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Details'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Header Colors Section */}
      <div className="p-6 rounded-xl bg-white/5 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Report Header Colors</h3>
        <p className="text-sm text-white/60 mb-4">
          Control school name, details, divider, report-title chip, contact separator, and exam line on every report.
          Defaults use black for main header text; adjust as you like.
        </p>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'School Name Color', value: schoolNameColor, set: setSchoolNameColor },
              { label: 'Subtitle Color', value: subtitleColor, set: setSubtitleColor },
              { label: 'Address Color', value: addressColor, set: setAddressColor },
              { label: 'Contact Info Color', value: contactColor, set: setContactColor },
              { label: 'Email | Phone Separator', value: contactSeparatorColor, set: setContactSeparatorColor },
              { label: 'Motto Color', value: mottoColor, set: setMottoColor },
              { label: 'Divider Line Color', value: dividerColor, set: setDividerColor },
              { label: 'Report Title Chip — Text', value: chipTextColor, set: setChipTextColor },
              { label: 'Report Title Chip — Background', value: chipBgColor, set: setChipBgColor },
              { label: 'Report Title Chip — Border', value: chipBorderColor, set: setChipBorderColor },
              { label: 'Subtitle Under Chip (exam / year line)', value: metaLineColor, set: setMetaLineColor },
            ].map(({ label, value, set }) => (
              <div key={label}>
                <label className="block text-sm font-medium text-white/80 mb-2">{label}</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    className="w-16 h-10 rounded-lg border border-white/10 bg-white/5 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    placeholder={H.schoolName}
                    className="flex-1 px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder-white/30"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 rounded-lg bg-blue-600/10 border border-blue-500/30">
            <h4 className="text-blue-300 font-medium text-sm mb-2">💡 Color Preview</h4>
            <div className="text-white/60 text-xs space-y-2">
              {[
                ['School Name', schoolNameColor],
                ['Subtitle', subtitleColor],
                ['Address', addressColor],
                ['Contact', contactColor],
                ['Contact separator', contactSeparatorColor],
                ['Motto', mottoColor],
                ['Divider', dividerColor],
                ['Chip text', chipTextColor],
                ['Chip background', chipBgColor],
                ['Chip border', chipBorderColor],
                ['Exam / year line', metaLineColor],
              ].map(([name, c]) => (
                <div key={String(name)} className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded border border-white/20 shrink-0" style={{ backgroundColor: c as string }} />
                  <span>{name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleSaveBranding}
              disabled={saving}
              className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Colors'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SchoolRequirements({ schoolId }: { schoolId: string | null }) {
  const [requirements, setRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "cost" | "status" | "boarding_type" | "class_name" | "created_at">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [classOptions, setClassOptions] = useState<string[]>([]);
  
  // Form state for adding/editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [requirementName, setRequirementName] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");
  const [boardingType, setBoardingType] = useState<"Day Scholar" | "Boarding">("Day Scholar");
  const [className, setClassName] = useState("");

  useEffect(() => {
    loadRequirements();
    loadClasses();
  }, [schoolId]);

  const loadClasses = async () => {
    if (!schoolId) return;
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('class_name')
        .eq('school_id', schoolId)
        .order('class_name');
      
      if (error) throw error;
      setClassOptions((data || []).map(c => c.class_name));
    } catch (err) {
      console.error('Error loading classes:', err);
    }
  };

  const loadRequirements = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('school_requirements')
        .select('*')
        .eq('school_id', schoolId)
        .order('requirement_name');

      if (fetchError) throw fetchError;
      setRequirements(data || []);
    } catch (err) {
      console.error('Error loading requirements:', err);
      setError('Failed to load school requirements');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!schoolId || !requirementName.trim()) {
      setError('Requirement name is required');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const requirementData = {
        school_id: schoolId,
        requirement_name: requirementName.trim(),
        description: description.trim() || null,
        cost: parseFloat(cost) || 0,
        status: status,
        boarding_type: boardingType,
        class_name: className || null
      };

      if (editingId) {
        // Update existing requirement
        const { error: updateError } = await supabase
          .from('school_requirements')
          .update(requirementData)
          .eq('id', editingId);

        if (updateError) throw updateError;
        setSuccess('Requirement updated successfully!');
      } else {
        // Add new requirement
        const { error: insertError } = await supabase
          .from('school_requirements')
          .insert(requirementData);

        if (insertError) throw insertError;
        setSuccess('Requirement added successfully!');
      }

      // Reset form
      setEditingId(null);
      setRequirementName("");
      setDescription("");
      setCost("");
      setStatus("Active");
      setBoardingType("Day Scholar");
      setClassName("");
      
      // Reload requirements
      await loadRequirements();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving requirement:', err);
      setError(err.message || 'Failed to save requirement');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (requirement: any) => {
    setEditingId(requirement.id);
    setRequirementName(requirement.requirement_name);
    setDescription(requirement.description || "");
    setCost(requirement.cost.toString());
    setStatus(requirement.status);
    setBoardingType(requirement.boarding_type || "Day Scholar");
    setClassName(requirement.class_name || "");
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this requirement?')) return;

    try {
      const { error } = await supabase
        .from('school_requirements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setSuccess('Requirement deleted successfully!');
      await loadRequirements();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deleting requirement:', err);
      setError(err.message || 'Failed to delete requirement');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setRequirementName("");
    setDescription("");
    setCost("");
    setStatus("Active");
    setBoardingType("Day Scholar");
    setClassName("");
  };

  const filteredAndSortedRequirements = useMemo(() => {
    let filtered = requirements.filter(req => 
      req.requirement_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.description && req.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (req.boarding_type && req.boarding_type.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (req.class_name && req.class_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case "name":
          aVal = a.requirement_name.toLowerCase();
          bVal = b.requirement_name.toLowerCase();
          break;
        case "cost":
          aVal = parseFloat(a.cost);
          bVal = parseFloat(b.cost);
          break;
        case "status":
          aVal = a.status;
          bVal = b.status;
          break;
        case "boarding_type":
          aVal = (a.boarding_type || 'Day Scholar').toLowerCase();
          bVal = (b.boarding_type || 'Day Scholar').toLowerCase();
          break;
        case "class_name":
          aVal = (a.class_name || 'All Classes').toLowerCase();
          bVal = (b.class_name || 'All Classes').toLowerCase();
          break;
        case "created_at":
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }

      if (sortOrder === "asc") {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    return filtered;
  }, [requirements, searchTerm, sortBy, sortOrder]);

  if (loading) {
    return (
      <div>
        <SectionHeader
          title="School Requirements"
          desc="Manage mandatory school materials, uniforms, books, and other requirements with their costs."
        />
        <div className="text-white/60">Loading requirements...</div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title="School Requirements"
        desc="Manage mandatory school materials, uniforms, books, and other requirements with their costs."
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

      {/* Add/Edit Form */}
      <div className="mb-6 p-4 rounded-lg bg-blue-600/10 border border-blue-500/30">
        <h3 className="text-blue-300 font-medium mb-3">
          {editingId ? '✏️ Edit Requirement' : '➕ Add New Requirement'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-white/80 text-sm mb-1">Requirement Name *</label>
            <input
              type="text"
              value={requirementName}
              onChange={(e) => setRequirementName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white"
              placeholder="e.g., School Uniform, Exercise Books"
            />
          </div>
          
          <div>
            <label className="block text-white/80 text-sm mb-1">Cost (UGX) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white"
              placeholder="e.g., 50000"
            />
          </div>
          
          <div>
            <label className="block text-white/80 text-sm mb-1">Boarding Type *</label>
            <select
              value={boardingType}
              onChange={(e) => setBoardingType(e.target.value as "Day Scholar" | "Boarding" | "Both")}
              className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white text-black"
            >
              <option value="Day Scholar">Day Scholar</option>
              <option value="Boarding">Boarding</option>
              <option value="Both">Both</option>
            </select>
          </div>
          
          <div>
            <label className="block text-white/80 text-sm mb-1">Class (Optional)</label>
            <select
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white text-black"
            >
              <option value="">All Classes</option>
              {classOptions.map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-white/80 text-sm mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "Active" | "Inactive")}
              className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white text-black"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          
          <div>
            <label className="block text-white/80 text-sm mb-1">Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white"
              placeholder="Brief description of the requirement"
            />
          </div>
        </div>
        
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleSave}
            disabled={saving || !requirementName.trim()}
            className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white disabled:opacity-50"
          >
            {saving ? 'Saving...' : (editingId ? 'Update' : 'Add')}
          </button>
          
          {editingId && (
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 text-white"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Search and Sort Controls */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search requirements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/50"
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-lg border border-white/20 bg-white text-black"
          >
            <option value="name">Sort by Name</option>
            <option value="cost">Sort by Cost</option>
            <option value="boarding_type">Sort by Boarding Type</option>
            <option value="class_name">Sort by Class</option>
            <option value="status">Sort by Status</option>
            <option value="created_at">Sort by Date</option>
          </select>
          
          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white hover:bg-white/15"
          >
            {sortOrder === "asc" ? "↑" : "↓"}
          </button>
        </div>
      </div>

      {/* Requirements Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5">
            <tr className="text-left">
              <th className="px-4 py-3 text-white/80">Requirement Name</th>
              <th className="px-4 py-3 text-white/80">Boarding Type</th>
              <th className="px-4 py-3 text-white/80">Class</th>
              <th className="px-4 py-3 text-white/80">Description</th>
              <th className="px-4 py-3 text-white/80">Cost (UGX)</th>
              <th className="px-4 py-3 text-white/80">Status</th>
              <th className="px-4 py-3 text-white/80">Actions</th>
            </tr>
          </thead>
          <tbody className="[&>tr:nth-child(even)]:bg-white/5">
            {filteredAndSortedRequirements.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-white/70">
                  {searchTerm ? 'No requirements found matching your search.' : 'No requirements added yet.'}
                </td>
              </tr>
            ) : (
              filteredAndSortedRequirements.map((req) => (
                <tr key={req.id} className="border-t border-white/10">
                  <td className="px-4 py-3 text-white font-medium">{req.requirement_name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      req.boarding_type === 'Boarding' 
                        ? 'bg-blue-500/20 text-blue-300' 
                        : 'bg-green-500/20 text-green-300'
                    }`}>
                      {req.boarding_type || 'Day Scholar'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/80">{req.class_name || 'All Classes'}</td>
                  <td className="px-4 py-3 text-white/80">{req.description || '-'}</td>
                  <td className="px-4 py-3 text-white">
                    {new Intl.NumberFormat('en-UG', { 
                      style: 'currency', 
                      currency: 'UGX',
                      minimumFractionDigits: 0 
                    }).format(req.cost)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      req.status === 'Active' 
                        ? 'bg-green-500/20 text-green-300' 
                        : 'bg-red-500/20 text-red-300'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(req)}
                        className="px-2 py-1 text-xs rounded bg-blue-500 hover:bg-blue-400 text-white"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(req.id)}
                        className="px-2 py-1 text-xs rounded bg-red-500 hover:bg-red-400 text-white"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      {requirements.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="text-white/80 text-sm">
            <strong>Total Requirements:</strong> {requirements.length} | 
            <strong> Active:</strong> {requirements.filter(r => r.status === 'Active').length} | 
            <strong> Total Value:</strong> {new Intl.NumberFormat('en-UG', { 
              style: 'currency', 
              currency: 'UGX',
              minimumFractionDigits: 0 
            }).format(requirements.reduce((sum, req) => sum + parseFloat(req.cost), 0))}
          </div>
        </div>
      )}
    </div>
  );
}



