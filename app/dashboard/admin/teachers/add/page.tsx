"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

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
  const [nationality, setNationality] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [religion, setReligion] = useState("");
  // Contact
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("");
  const [country, setCountry] = useState("");
  // Emergency contact (optional, UI-only for now)
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyRelationship, setEmergencyRelationship] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  // Professional
  const [subjects, setSubjects] = useState<string[]>([]); // Stored as labeled subjects per class, e.g., "Mathematics 1", "Mathematics N"
  const [classesAssigned, setClassesAssigned] = useState<string[]>([]);
  const [subjectsByClass, setSubjectsByClass] = useState<Record<string, string[]>>({});
  const [salary, setSalary] = useState("");
  const [employmentType, setEmploymentType] = useState<"Full-time" | "Part-time" | "Contract">("Full-time");
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
      opts.push('Baby Class','Middle Class','Top Class');
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
    if (c === 'Baby Class') return 'B';
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
  const todayLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" }).format(new Date());
    } catch {
      return new Date().toLocaleDateString();
    }
  }, []);

  const resetForm = () => {
    setFirstName(""); setMiddleName(""); setLastName(""); setGender(""); setDob(""); setNationalId("");
    setNationality(""); setMaritalStatus(""); setReligion("");
    setEmail(""); setPhone(""); setAltPhone(""); setWhatsapp(""); setAddress(""); setDistrict(""); setCountry("");
    setEmergencyName(""); setEmergencyRelationship(""); setEmergencyPhone("");
    setSubjects([]); setClassesAssigned([]); setSubjectsByClass({});
    setSalary("");
    setEmploymentType("Full-time");
    setError(null); setSuccess(null);
  };

  const save = async () => {
    setError(null); setSuccess(null);
    if (!schoolId) { setError("Missing school context"); return; }
    if (!firstName || !lastName) { setError("Please enter first and last name"); return; }
    
    // Optional validation for phone if provided
    if (phone && !validatePhone(phone)) { setError("Enter a valid phone with country code"); return; }
    
    // Ensure classes align with school type
    const allowed = new Set(classOptions);
    const filteredClasses = classesAssigned.filter(c => allowed.has(c));

    setSaving(true);
    const emailToSave = email.trim() || null;
    const { data, error: insertError } = await supabase.from("teachers").insert({
      school_id: schoolId,
      name: fullName,
      email: emailToSave,
      phone: phone || null,
      address: address || null,
      gender: gender || null,
      dob: dob || null,
      national_id: nationalId || null,
      subjects: subjects.length ? subjects : null,
      classes: filteredClasses.length ? filteredClasses : null,
      salary: salary ? parseFloat(salary) : null,
      // employee_id and date_of_hire default via DB
    }).select("teacher_id, employee_id").single();

    setSaving(false);
    if (insertError) { setError(insertError.message); return; }
    
    // Auto-generate email only if none was provided
    if (!emailToSave && data?.teacher_id && schoolId) {
      try {
        const { data: generatedEmail } = await supabase.rpc('generate_unique_school_email', {
          p_first_name: firstName,
          p_last_name: lastName,
          p_school_id: schoolId
        });
        if (generatedEmail) {
          await supabase
            .from('teachers')
            .update({ email: generatedEmail })
            .eq('teacher_id', data.teacher_id);
        }
      } catch (emailError) {
        console.warn('Could not generate teacher email:', emailError);
      }
    }
    
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

    setSuccess(`Teacher added successfully! Employee ID: ${data?.employee_id || 'Generated'}. ${emailToSave ? 'Email set.' : 'Email auto-generated.'} You can add more information in the teacher profile. 🎉`);
    if (data?.teacher_id) {
      setTimeout(() => router.push(`/dashboard/admin/teachers/${data.teacher_id}`), 600);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background-tertiary)] px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-[13px] px-3.5 py-1.5 border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-secondary)]"
              onClick={() => router.push('/dashboard/admin/teachers')}
            >
              ← Back
            </button>
            <h1 className="text-[22px] font-medium text-[var(--color-text-primary)]">Add Teacher</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-[13px] px-3.5 py-1.5 border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-secondary)]"
              onClick={resetForm}
            >
              Reset
            </button>
            <button
              type="button"
              className="text-[13px] px-3.5 py-1.5 border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-secondary)]"
              onClick={() => router.push('/dashboard/admin/teachers')}
            >
              Cancel
            </button>
            <button
              type="button"
              className="text-[13px] px-4 py-1.5 rounded-[var(--border-radius-md)] bg-[#1a56db] hover:bg-[#1649c0] text-white font-medium disabled:opacity-50"
              disabled={saving}
              onClick={save}
            >
              {saving ? "Saving..." : "Save Teacher"}
            </button>
          </div>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-700 px-3 py-2">{error}</div>}
        {success && <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 text-green-700 px-3 py-2">{success}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5 items-start">
          {/* Sidebar */}
          <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] p-5 flex flex-col items-center gap-3">
            <button
              type="button"
              className="w-[100px] h-[100px] rounded-full border-2 border-dashed border-[var(--color-border-secondary)] bg-[var(--color-background-secondary)] flex flex-col items-center justify-center hover:border-[#1a56db] transition-colors"
              onClick={() => setError("Photo upload is not enabled yet.")}
              aria-label="Upload teacher photo"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-[var(--color-text-tertiary)]">
                <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <span className="text-[11px] text-[var(--color-text-tertiary)] mt-1 text-center">Upload photo</span>
            </button>
            <div className="text-[14px] font-medium text-[var(--color-text-primary)]">{fullName || "Full Name"}</div>
            <div className="text-[12px] text-[var(--color-text-secondary)]">Teacher</div>
            <span className="text-[11px] px-2.5 py-[3px] rounded-full bg-[var(--color-background-success)] text-[var(--color-text-success)] font-medium">Active</span>

            <div className="w-full border-t border-[var(--color-border-tertiary)] pt-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[var(--color-text-secondary)]">Teacher ID</span>
                <span className="text-[12px] text-[var(--color-text-primary)] font-medium">Auto-generated</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[var(--color-text-secondary)]">Date added</span>
                <span className="text-[12px] text-[var(--color-text-primary)] font-medium">{todayLabel}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] text-[var(--color-text-secondary)]">Employment</span>
                <select
                  className="text-[12px] px-2 py-1 border border-[var(--color-border-secondary)] rounded-md bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value as any)}
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                </select>
              </div>
            </div>
          </div>

          {/* Main column */}
          <div className="flex flex-col gap-4">
            {/* Personal Information */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--color-border-tertiary)] flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-[#e6f1fb] flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#185fa5" strokeWidth="2">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                </div>
                <h2 className="text-[14px] font-medium text-[var(--color-text-primary)]">Personal Information</h2>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">First name <span className="text-red-500">*</span></label>
                    <input className="text-[13px] px-2.5 py-[7px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] outline-none focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/15" placeholder="e.g. Sarah" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">Middle name</label>
                    <input className="text-[13px] px-2.5 py-[7px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] outline-none focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/15" placeholder="Optional" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">Last name <span className="text-red-500">*</span></label>
                    <input className="text-[13px] px-2.5 py-[7px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] outline-none focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/15" placeholder="e.g. Namyalo" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">Gender</label>
                    <select className="text-[13px] px-2.5 py-[7px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] outline-none focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/15" value={gender} onChange={(e) => setGender(e.target.value as any)}>
                      <option value="">Select gender</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">Date of birth</label>
                    <input type="date" className="text-[13px] px-2.5 py-[7px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] outline-none focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/15" value={dob} onChange={(e) => setDob(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">Nationality</label>
                    <input className="text-[13px] px-2.5 py-[7px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] outline-none focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/15" placeholder="e.g. Ugandan" value={nationality} onChange={(e) => setNationality(e.target.value)} />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">National ID / Passport No.</label>
                    <input className="text-[13px] px-2.5 py-[7px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] outline-none focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/15" placeholder="e.g. CM90012345VB" value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">Marital status</label>
                    <select className="text-[13px] px-2.5 py-[7px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] outline-none focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/15" value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)}>
                      <option value="">Select</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">Religion</label>
                    <select className="text-[13px] px-2.5 py-[7px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] outline-none focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/15" value={religion} onChange={(e) => setReligion(e.target.value)}>
                      <option value="">Select</option>
                      <option value="Christian">Christian</option>
                      <option value="Muslim">Muslim</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Contact Information */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--color-border-tertiary)] flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-[#eaf3de] flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b6d11" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.86 9.11 19.79 19.79 0 01.78 1.18 2 2 0 012.78 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.09 8.6A16 16 0 0015.4 16.91l.96-.96a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                  </svg>
                </div>
                <h2 className="text-[14px] font-medium text-[var(--color-text-primary)]">Contact Information</h2>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">Email address</label>
                    <input type="email" className="text-[13px] px-2.5 py-[7px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] outline-none focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/15" placeholder="Auto-generated if left blank" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <span className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">Auto-generated as firstname+lastname@school.sch</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">Phone number</label>
                    <input type="tel" className="text-[13px] px-2.5 py-[7px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] outline-none focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/15" placeholder="+256 700 000 000" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">Alternative phone</label>
                    <input type="tel" className="text-[13px] px-2.5 py-[7px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] outline-none focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/15" placeholder="+256 700 000 000" value={altPhone} onChange={(e) => setAltPhone(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">WhatsApp number</label>
                    <input type="tel" className="text-[13px] px-2.5 py-[7px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] outline-none focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/15" placeholder="Same as phone or different" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">Residential address</label>
                    <input className="text-[13px] px-2.5 py-[7px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] outline-none focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/15" placeholder="Street, estate or village" value={address} onChange={(e) => setAddress(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">District / City</label>
                    <input className="text-[13px] px-2.5 py-[7px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] outline-none focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/15" placeholder="e.g. Kampala" value={district} onChange={(e) => setDistrict(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">Country</label>
                    <input className="text-[13px] px-2.5 py-[7px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] outline-none focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/15" placeholder="e.g. Uganda" value={country} onChange={(e) => setCountry(e.target.value)} />
                  </div>
                </div>

                <div className="h-px bg-[var(--color-border-tertiary)] my-4" />
                <div className="text-[13px] font-medium text-[var(--color-text-primary)] mb-2">Emergency Contact</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">Contact name</label>
                    <input className="text-[13px] px-2.5 py-[7px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] outline-none focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/15" placeholder="Full name" value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">Relationship</label>
                    <select className="text-[13px] px-2.5 py-[7px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] outline-none focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/15" value={emergencyRelationship} onChange={(e) => setEmergencyRelationship(e.target.value)}>
                      <option value="">Select</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Parent">Parent</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Friend">Friend</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">Phone</label>
                    <input type="tel" className="text-[13px] px-2.5 py-[7px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] outline-none focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/15" placeholder="+256 700 000 000" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Professional Information */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--color-border-tertiary)] flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-[#faeeda] flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#854f0b" strokeWidth="2">
                    <rect x="2" y="7" width="20" height="14" rx="2" />
                    <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
                  </svg>
                </div>
                <h2 className="text-[14px] font-medium text-[var(--color-text-primary)]">Professional Information</h2>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">Staff / Employee ID</label>
                    <input className="text-[13px] px-2.5 py-[7px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] opacity-80" value="Auto-generated" readOnly />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">Designation / Title</label>
                    <select className="text-[13px] px-2.5 py-[7px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] outline-none focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/15">
                      <option value="">Select</option>
                      <option value="Class Teacher">Class Teacher</option>
                      <option value="Subject Teacher">Subject Teacher</option>
                      <option value="Head of Department">Head of Department</option>
                      <option value="Deputy Head Teacher">Deputy Head Teacher</option>
                      <option value="Head Teacher">Head Teacher</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">Date of joining</label>
                    <input type="date" className="text-[13px] px-2.5 py-[7px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] outline-none focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/15" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">Highest qualification</label>
                    <select className="text-[13px] px-2.5 py-[7px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] outline-none focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/15">
                      <option value="">Select</option>
                      <option value="Certificate">Certificate</option>
                      <option value="Diploma">Diploma</option>
                      <option value="Bachelor's Degree">Bachelor's Degree</option>
                      <option value="Master's Degree">Master's Degree</option>
                      <option value="PhD">PhD</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">Years of experience</label>
                    <input type="number" min={0} className="text-[13px] px-2.5 py-[7px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] outline-none focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/15" placeholder="e.g. 5" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">Monthly salary (UGX)</label>
                    <input type="number" min={0} className="text-[13px] px-2.5 py-[7px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] outline-none focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/15" placeholder="e.g. 800000" value={salary} onChange={(e) => setSalary(e.target.value)} />
                  </div>
                </div>

                <div className="h-px bg-[var(--color-border-tertiary)] my-4" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-[13px] font-medium text-[var(--color-text-primary)] mb-2">Classes Assigned</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {classOptions.map(c => (
                        <label key={c} className="flex items-center gap-2 text-[13px] text-[var(--color-text-primary)] cursor-pointer">
                          <input type="checkbox" className="accent-[#1a56db] w-[14px] h-[14px]" checked={classesAssigned.includes(c)} onChange={(e)=> setClassesAssigned(prev => e.target.checked ? [...prev, c] : prev.filter(x=>x!==c))} />
                          <span>{c}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-[var(--color-text-primary)] mb-2">Subjects to Teach</div>
                    {classesAssigned.length === 0 ? (
                      <div className="text-[13px] text-[var(--color-text-secondary)]">Select at least one class to see available subjects.</div>
                    ) : dynamicSubjectOptions.length === 0 ? (
                      <div className="text-[13px] text-[var(--color-text-secondary)]">No subjects configured for selected classes yet.</div>
                    ) : (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {dynamicSubjectOptions.map(o => {
                          const selected = subjects.includes(o.value);
                          return (
                            <button
                              key={o.value}
                              type="button"
                              className={[
                                "text-[12px] px-2.5 py-1 border rounded-full",
                                selected
                                  ? "bg-[#e6f1fb] border-[#185fa5] text-[#185fa5]"
                                  : "bg-[var(--color-background-secondary)] border-[var(--color-border-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-secondary)]/80",
                              ].join(" ")}
                              onClick={() => setSubjects(prev => prev.includes(o.value) ? prev.filter(x=>x!==o.value) : [...prev, o.value])}
                            >
                              {o.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <span className="text-[11px] text-[var(--color-text-tertiary)] mt-2 block">Click to select subjects</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Footer */}
            <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] overflow-hidden">
              <div className="px-5 py-4 border-t border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)] flex items-center gap-2">
                <span className="text-[12px] text-[var(--color-text-tertiary)]">Fields marked <span className="text-red-500">*</span> are required</span>
                <div className="flex-1" />
                <button
                  type="button"
                  className="text-[13px] px-3.5 py-1.5 border border-red-300 rounded-[var(--border-radius-md)] bg-red-50 text-red-600 hover:bg-red-100"
                  onClick={() => router.push('/dashboard/admin/teachers')}
                >
                  Discard
                </button>
                <button
                  type="button"
                  className="text-[13px] px-3.5 py-1.5 border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-secondary)]"
                  onClick={resetForm}
                >
                  Reset form
                </button>
                <button
                  type="button"
                  className="text-[13px] px-4 py-1.5 rounded-[var(--border-radius-md)] bg-[#1a56db] hover:bg-[#1649c0] text-white font-medium disabled:opacity-50"
                  disabled={saving}
                  onClick={save}
                >
                  Save Teacher →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



