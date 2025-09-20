"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { isValidEmailFormat } from "@/src/lib/emailValidator";

export default function AddTeacherPage() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  // Personal
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<"Male" | "Female" | "Other" | "">("");
  const [dob, setDob] = useState<string>("");
  const [nationalId, setNationalId] = useState("");
  // Contact
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  // Professional
  const [subjects, setSubjects] = useState<string[]>([]); // Stored as labeled subjects per class, e.g., "Mathematics 1", "Mathematics N"
  const [classesAssigned, setClassesAssigned] = useState<string[]>([]);
  const [subjectsByClass, setSubjectsByClass] = useState<Record<string, string[]>>({});
  const [salary, setSalary] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [schoolType, setSchoolType] = useState<'Nursery/Primary' | 'Secondary' | null>(null);

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      const { data } = await supabase.from("users").select("school_id").eq("user_id", user.id).single();
      if (!data?.school_id) return router.push("/login");
      setSchoolId(data.school_id);
      const { data: sch } = await supabase.from('schools').select('type').eq('school_id', data.school_id).single();
      setSchoolType((sch?.type as any) || null);
    };
    run();
  }, [router]);

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

  // Load subjects for classes from class_subjects when classes or school change
  useEffect(() => {
    const load = async () => {
      if (!schoolId || classesAssigned.length === 0) return;
      const { data } = await supabase
        .from('class_subjects')
        .select('class_name, subject')
        .eq('school_id', schoolId)
        .in('class_name', classesAssigned);
      const map: Record<string, string[]> = {};
      (data || []).forEach(r => {
        if (!map[r.class_name]) map[r.class_name] = [];
        map[r.class_name].push(r.subject);
      });
      setSubjectsByClass(map);
    };
    load();
  }, [schoolId, classesAssigned]);

  // Build labeled subject options from selected classes and class_subjects table
  const classSuffix = (c: string) => {
    if (c === 'Nursery') return 'N';
    if (c === 'Middle Class') return 'M';
    if (c === 'Top Class') return 'T';
    const p = c.match(/^Primary\s+(\d)$/);
    if (p) return p[1];
    const s = c.match(/^Senior\s+(\d)$/);
    if (s) return s[1];
    return '';
  };

  const dynamicSubjectOptions = useMemo(() => {
    const opts: { label: string; value: string }[] = [];
    classesAssigned.forEach(c => {
      const subs = subjectsByClass[c] || [];
      const suf = classSuffix(c);
      subs.forEach(sub => {
        const label = suf ? `${sub} ${suf}` : sub;
        opts.push({ label, value: label });
      });
    });
    // Deduplicate by value while preserving order
    const seen = new Set<string>();
    return opts.filter(o => (seen.has(o.value) ? false : (seen.add(o.value), true)));
  }, [classesAssigned, subjectsByClass]);

  const validatePhone = (value: string) => {
    // Basic E.164 format + international prefixes; allow leading + and 7-15 digits
    return /^\+?[1-9]\d{6,14}$/.test(value.replace(/\s|-/g, ""));
  };

  const fullName = useMemo(() => [firstName, middleName, lastName].filter(Boolean).join(" "), [firstName, middleName, lastName]);

  const resetForm = () => {
    setFirstName(""); setMiddleName(""); setLastName(""); setGender(""); setDob(""); setNationalId("");
    setPhone(""); setEmail(""); setAddress("");
    setSubjects([]); setClassesAssigned([]); setSubjectsByClass({}); setSalary("");
    setError(null); setSuccess(null);
  };

  const save = async () => {
    setError(null); setSuccess(null);
    if (!schoolId) { setError("Missing school context"); return; }
    if (!firstName || !lastName) { setError("Please enter first and last name"); return; }
    if (!gender) { setError("Please select gender"); return; }
    if (!dob) { setError("Please select date of birth"); return; }
    if (!validatePhone(phone)) { setError("Enter a valid phone with country code"); return; }
    if (!isValidEmailFormat(email)) { setError("Enter a valid email address"); return; }
    // Ensure classes align with school type
    const allowed = new Set(classOptions);
    const filteredClasses = classesAssigned.filter(c => allowed.has(c));

    setSaving(true);
    const { data, error: insertError } = await supabase.from("teachers").insert({
      school_id: schoolId,
      name: fullName,
      email,
      phone,
      address,
      gender: gender || null,
      dob: dob || null,
      national_id: nationalId || null,
      salary: salary ? Number(salary) : null,
      subjects: subjects.length ? subjects : null,
      classes: filteredClasses.length ? filteredClasses : null,
      // employee_id and date_of_hire default via DB
    }).select("teacher_id, employee_id").single();

    setSaving(false);
    if (insertError) { setError(insertError.message); return; }
    // Also persist class/subject assignments into teacher_class_subjects
    try {
      if (data?.teacher_id && filteredClasses.length > 0) {
        // Build per-class subjects from selected subject labels with suffix
        const payload: { school_id: string; teacher_id: string; class_name: string; subject: string }[] = [];
        for (const cls of filteredClasses) {
          const suf = classSuffix(cls);
          const matchSuffix = suf ? ` ${suf}` : '';
          const baseSubjectsForClass = dynamicSubjectOptions
            .filter(o => o.value.endsWith(matchSuffix))
            .filter(o => subjects.includes(o.value))
            .map(o => o.label.replace(matchSuffix, ''));
          // If dynamic options are empty (no configured subjects), skip
          for (const sub of baseSubjectsForClass) {
            payload.push({ school_id: schoolId, teacher_id: data.teacher_id, class_name: cls, subject: sub });
          }
        }
        if (payload.length > 0) {
          await supabase.from('teacher_class_subjects').insert(payload);
        }
      }
    } catch (e: any) {
      console.warn('Failed to create teacher assignments:', e?.message || e);
    }

    setSuccess("Teacher added successfully 🎉");
    if (data?.teacher_id) {
      setTimeout(() => router.push(`/dashboard/admin/teachers/${data.teacher_id}`), 600);
    }
  };

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-white text-xl font-semibold">Add Teacher</h1>
          <div className="flex gap-2">
            <button className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20" onClick={() => router.push('/dashboard/admin/teachers')}>Back to Teacher List</button>
          <button className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20" onClick={() => router.push('/dashboard/admin')}>Back to Dashboard</button>
        </div>
        </div>
        {error && <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-3 py-2">{error}</div>}
        {success && <div className="mb-3 rounded-lg border border-green-500/30 bg-green-500/10 text-green-200 px-3 py-2">{success}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4">
            <div className="text-white font-medium mb-3">Personal Information</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input className="rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="First name" value={firstName} onChange={(e)=>setFirstName(e.target.value)} />
              <input className="rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Middle name (optional)" value={middleName} onChange={(e)=>setMiddleName(e.target.value)} />
              <input className="rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Last name" value={lastName} onChange={(e)=>setLastName(e.target.value)} />
              <select className="rounded-lg border border-white/10 bg-white/10 text-white px-3 py-2" value={gender} onChange={(e)=>setGender(e.target.value as any)}>
                <option className="bg-slate-900" value="">Gender</option>
                <option className="bg-slate-900" value="Male">Male</option>
                <option className="bg-slate-900" value="Female">Female</option>
                <option className="bg-slate-900" value="Other">Other</option>
              </select>
              <input type="date" className="rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" value={dob} onChange={(e)=>setDob(e.target.value)} />
              <input className="rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="National ID / Passport No." value={nationalId} onChange={(e)=>setNationalId(e.target.value)} />
          </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4">
            <div className="text-white font-medium mb-3">Contact Information</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input className="rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Phone (+256..., +1...)" value={phone} onChange={(e)=>setPhone(e.target.value)} />
              <input className="rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
              <input className="sm:col-span-2 rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Residential Address" value={address} onChange={(e)=>setAddress(e.target.value)} />
          </div>
        </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4">
            <div className="text-white font-medium mb-3">Professional Information</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <div className="text-white/80 text-sm mb-1">Salary (per month)</div>
                <input type="number" min="0" step="0.01" className="w-full rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="e.g., 500.00" value={salary} onChange={(e)=>setSalary(e.target.value)} />
              </div>
              <div>
                <div className="text-white/80 text-sm mb-1">Classes Assigned</div>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-white/10 p-2">
                  <div className="grid grid-cols-2 gap-2">
                    {classOptions.map(c => (
                      <label key={c} className="flex items-center gap-2 text-white/90 text-sm">
                        <input type="checkbox" className="accent-blue-500" checked={classesAssigned.includes(c)} onChange={(e)=> setClassesAssigned(prev => e.target.checked ? [...prev, c] : prev.filter(x=>x!==c))} />
                        <span>{c}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-white/80 text-sm mb-1">Subjects to Teach</div>
                {classesAssigned.length === 0 ? (
                  <div className="text-white/70 text-sm">Select at least one class to see available subjects.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {dynamicSubjectOptions.length === 0 ? (
                      <div className="text-white/70 text-sm">No subjects configured for selected classes yet.</div>
                    ) : (
                      dynamicSubjectOptions.map(o => (
                        <button key={o.value} type="button" className={`px-3 py-1 rounded-lg border ${subjects.includes(o.value) ? 'bg-blue-600/80 border-blue-400 text-white' : 'bg-white/10 border-white/10 text-white/90 hover:bg-white/15'}`} onClick={() => setSubjects(prev => prev.includes(o.value) ? prev.filter(x=>x!==o.value) : [...prev, o.value])}>{o.label}</button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="text-white/70 text-xs mt-2">Employee ID and Date of Hire will be set automatically.</div>
          </motion.div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <button className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-transform hover:scale-[1.02] text-white disabled:opacity-50" disabled={saving} onClick={save}>{saving?"Saving...":"Save Teacher"}</button>
          <button className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white" onClick={resetForm}>Reset Form</button>
          <button className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white" onClick={() => router.push('/dashboard/admin/teachers')}>Cancel</button>
        </div>
      </div>
    </div>
  );
}



