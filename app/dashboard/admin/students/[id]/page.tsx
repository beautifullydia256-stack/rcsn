"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { motion } from "framer-motion";
import ImageUpload from "@/src/components/ImageUpload";
import { CompressionResult } from "@/src/lib/imageCompression";
import { isALevelClass, isOLevelClass, isSenior34Class } from "@/src/components/reports/templates/helpers";
import {
  isGeneralPaperSubject,
  UACE_MAX_ELECTIVE_SUBSIDIARIES,
  UACE_MAX_PRINCIPALS,
} from "@/lib/uaceProgrammeRules";

const UACE_GENERAL_PAPER_NAME = "General Paper";

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const [student, setStudent] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetPassword, setResetPassword] = useState(false);
  const [creatingLogin, setCreatingLogin] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [hasExistingLogin, setHasExistingLogin] = useState(false);
  const [existingLoginEmail, setExistingLoginEmail] = useState('');

  const [form, setForm] = useState<any>({});
  const [loginForm, setLoginForm] = useState({
    username: '',
    email: '',
    password: '',
    newPassword: ''
  });
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(null);
  const [expectedFeeFromStructure, setExpectedFeeFromStructure] = useState<number | null>(null);
  const [syncingFees, setSyncingFees] = useState(false);

  const [uacePrincipalOptions, setUacePrincipalOptions] = useState<string[]>([]);
  const [uaceSubsidiaryOptions, setUaceSubsidiaryOptions] = useState<string[]>([]);
  const [uacePrincipalsPicked, setUacePrincipalsPicked] = useState<string[]>([]);
  const [uaceSubsPicked, setUaceSubsPicked] = useState<string[]>([]);
  const [uaceSubjectsLoading, setUaceSubjectsLoading] = useState(false);
  const [uaceSubjectsSaving, setUaceSubjectsSaving] = useState(false);
  const [uaceSubjectsError, setUaceSubjectsError] = useState<string | null>(null);

  const studentIsAlevel = isALevelClass(String((form?.current_class ?? student?.current_class) ?? ""));
  const studentIsOlevel = isOLevelClass(String((form?.current_class ?? student?.current_class) ?? ""));

  const [oLevelClassRows, setOLevelClassRows] = useState<{ subject: string; uce_offering_type: string | null }[]>([]);
  const [oLevelSubsPicked, setOLevelSubsPicked] = useState<string[]>([]);
  const [oLevelLoading, setOLevelLoading] = useState(false);
  const [oLevelSaving, setOLevelSaving] = useState(false);
  const [oLevelError, setOLevelError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!studentId) return;
      const { data } = await supabase
        .from("students")
        .select("*, school_id, student_email, guardian_email")
        .eq("student_id", studentId)
        .single();
      setStudent(data);
      setForm(data || {});
      
      // Set default login form values
      if (data?.admission_number) {
        setLoginForm(prev => ({
          ...prev,
          username: data.admission_number,
          email: data.student_email || '' // Use actual student email if available
        }));
      }

      // Check if student already has a login
      await checkExistingLogin(data?.student_id, data?.admission_number);

      // Load current profile photo
      await loadCurrentPhoto(data?.student_id, data?.school_id);

      // Load class fee from fee structure if available
      if (data?.school_id && data?.current_class) {
        try {
          const { data: feeRow } = await supabase
            .from('school_fee_structure')
            .select('tuition_amount')
            .eq('school_id', data.school_id)
            .eq('class_name', data.current_class)
            .single();
          if (feeRow?.tuition_amount != null) {
            setExpectedFeeFromStructure(Number(feeRow.tuition_amount));
          }
        } catch {}
      }
    };
    run();
  }, [studentId]);

  useEffect(() => {
    if (!studentIsAlevel || !student?.school_id || !student?.student_id) {
      setUacePrincipalOptions([]);
      setUaceSubsidiaryOptions([]);
      setUacePrincipalsPicked([]);
      setUaceSubsPicked([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setUaceSubjectsLoading(true);
      setUaceSubjectsError(null);
      try {
        const [{ data: p }, { data: s }] = await Promise.all([
          supabase.from("uace_subject_catalog").select("subject_name").eq("subject_type", "principal").order("sort_order"),
          supabase.from("uace_subject_catalog").select("subject_name").eq("subject_type", "subsidiary").order("sort_order"),
        ]);
        if (cancelled) return;
        setUacePrincipalOptions((p ?? []).map((r: { subject_name: string }) => r.subject_name));
        setUaceSubsidiaryOptions(
          (s ?? [])
            .map((r: { subject_name: string }) => r.subject_name)
            .filter((n: string) => !isGeneralPaperSubject(n)),
        );

        const { data: rows, error } = await supabase
          .from("student_alevel_subjects")
          .select("subject_name, subject_role")
          .eq("student_id", student.student_id);
        if (error) throw error;
        if (cancelled) return;
        const pr = (rows ?? [])
          .filter((r: { subject_role: string }) => r.subject_role === "principal")
          .map((r: { subject_name: string }) => r.subject_name);
        const su = (rows ?? [])
          .filter((r: { subject_role: string }) => r.subject_role === "subsidiary")
          .map((r: { subject_name: string }) => r.subject_name);
        setUacePrincipalsPicked(pr);
        setUaceSubsPicked(su.filter((n: string) => !isGeneralPaperSubject(n)));
      } catch (e: unknown) {
        if (!cancelled) setUaceSubjectsError(e instanceof Error ? e.message : "Failed to load UACE subjects");
      } finally {
        if (!cancelled) setUaceSubjectsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentIsAlevel, student?.school_id, student?.student_id, form?.current_class]);

  useEffect(() => {
    if (!studentIsOlevel || !student?.school_id || !student?.student_id) {
      setOLevelClassRows([]);
      setOLevelSubsPicked([]);
      return;
    }
    const cls = String(form?.current_class ?? student?.current_class ?? "").trim();
    if (!cls) return;
    let cancelled = false;
    (async () => {
      setOLevelLoading(true);
      setOLevelError(null);
      try {
        let csRows: { subject: string; uce_offering_type: string | null; class_name?: string }[] | null = null;
        const { data: exactRows, error: csErr } = await supabase
          .from("class_subjects")
          .select("subject, uce_offering_type, class_name")
          .eq("school_id", student.school_id)
          .eq("class_name", cls)
          .order("subject");
        if (csErr) throw csErr;
        if (exactRows && exactRows.length > 0) {
          csRows = exactRows;
        } else {
          const { data: schoolRows, error: schoolErr } = await supabase
            .from("class_subjects")
            .select("subject, uce_offering_type, class_name")
            .eq("school_id", student.school_id)
            .order("subject");
          if (schoolErr) throw schoolErr;
          const norm = (v: string) => v.trim().replace(/\s+/g, " ").toLowerCase();
          const want = norm(cls);
          csRows =
            (schoolRows ?? []).filter((r) => norm(String(r.class_name ?? "")) === want) ?? [];
        }
        if (cancelled) return;
        setOLevelClassRows((csRows ?? []) as { subject: string; uce_offering_type: string | null }[]);

        const { data: stRows, error: stErr } = await supabase
          .from("student_olevel_subjects")
          .select("subject_name")
          .eq("student_id", student.student_id);
        if (stErr) throw stErr;
        if (cancelled) return;
        const subOffered = new Set(
          (csRows ?? [])
            .filter((r: { uce_offering_type: string | null }) => r.uce_offering_type === "subsidiary")
            .map((r: { subject: string }) => r.subject),
        );
        const loaded = (stRows ?? []).map((r: { subject_name: string }) => r.subject_name);
        setOLevelSubsPicked(loaded.filter((s) => subOffered.has(s)));
      } catch (e: unknown) {
        if (!cancelled) setOLevelError(e instanceof Error ? e.message : "Failed to load UCE learner subjects");
      } finally {
        if (!cancelled) setOLevelLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentIsOlevel, student?.school_id, student?.student_id, form?.current_class]);

  const toggleOlevelSub = (name: string) => {
    const cls = String(form?.current_class ?? student?.current_class ?? "").trim();
    setOLevelSubsPicked((prev) => {
      if (prev.includes(name)) return prev.filter((x) => x !== name);
      if (isSenior34Class(cls) && prev.length >= 3) return prev;
      return [...prev, name];
    });
  };

  const saveOlevelCombination = async () => {
    if (!student) return;
    const cls = String(form?.current_class ?? student?.current_class ?? "").trim();
    const compulsory = oLevelClassRows.filter((r) => r.uce_offering_type === "compulsory").map((r) => r.subject);
    const subOffered = new Set(
      oLevelClassRows.filter((r) => r.uce_offering_type === "subsidiary").map((r) => r.subject),
    );
    const subPick = oLevelSubsPicked.filter((s) => subOffered.has(s));
    if (isSenior34Class(cls)) {
      if (subPick.length > 3) {
        alert("Senior 3–4: at most 3 subsidiary subjects.");
        return;
      }
      if (compulsory.length + subPick.length > 10) {
        alert("Senior 3–4: at most 10 subjects in total (compulsory + subsidiary).");
        return;
      }
    }
    const all = [...compulsory, ...subPick];
    setOLevelSaving(true);
    setOLevelError(null);
    try {
      const { error } = await supabase.rpc("save_student_olevel_subjects", {
        p_student_id: student.student_id,
        p_subject_names: all,
      });
      if (error) throw error;
      alert("UCE (O-Level) subjects saved.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setOLevelError(msg);
      alert(msg);
    } finally {
      setOLevelSaving(false);
    }
  };

  const toggleUacePrincipal = (name: string) => {
    setUacePrincipalsPicked((prev) => {
      if (prev.includes(name)) return prev.filter((x) => x !== name);
      if (prev.length >= UACE_MAX_PRINCIPALS) return prev;
      return [...prev, name];
    });
  };

  const toggleUaceSub = (name: string) => {
    if (isGeneralPaperSubject(name)) return;
    setUaceSubsPicked((prev) => {
      if (prev.includes(name)) return prev.filter((x) => x !== name);
      if (prev.length >= UACE_MAX_ELECTIVE_SUBSIDIARIES) return prev;
      return [...prev, name];
    });
  };

  const saveUaceCombination = async () => {
    if (!student) return;
    if (uacePrincipalsPicked.length > UACE_MAX_PRINCIPALS) {
      alert(`At most ${UACE_MAX_PRINCIPALS} principal subjects.`);
      return;
    }
    const elective = uaceSubsPicked.filter((n) => !isGeneralPaperSubject(n));
    if (elective.length > UACE_MAX_ELECTIVE_SUBSIDIARIES) {
      alert(`At most ${UACE_MAX_ELECTIVE_SUBSIDIARIES} elective subsidiary (General Paper is automatic).`);
      return;
    }
    const subsidiaryNames = [UACE_GENERAL_PAPER_NAME, ...elective];
    if (uacePrincipalsPicked.length + subsidiaryNames.length > 5) {
      alert("At most 5 UACE subjects in total.");
      return;
    }
    const seen = new Set<string>();
    for (const x of [...uacePrincipalsPicked, ...subsidiaryNames]) {
      if (seen.has(x)) {
        alert(`Duplicate subject: ${x}`);
        return;
      }
      seen.add(x);
    }
    setUaceSubjectsSaving(true);
    setUaceSubjectsError(null);
    try {
      const { error: delErr } = await supabase.from("student_alevel_subjects").delete().eq("student_id", student.student_id);
      if (delErr) throw delErr;
      const inserts = [
        ...uacePrincipalsPicked.map((subject_name) => ({
          school_id: student.school_id,
          student_id: student.student_id,
          subject_name,
          subject_role: "principal" as const,
        })),
        ...subsidiaryNames.map((subject_name) => ({
          school_id: student.school_id,
          student_id: student.student_id,
          subject_name,
          subject_role: "subsidiary" as const,
        })),
      ];
      if (inserts.length > 0) {
        const { error: insErr } = await supabase.from("student_alevel_subjects").insert(inserts);
        if (insErr) throw insErr;
      }
      alert("UACE combination saved.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setUaceSubjectsError(msg);
      alert(msg);
    } finally {
      setUaceSubjectsSaving(false);
    }
  };

  const checkExistingLogin = async (studentId: string, admissionNumber: string) => {
    try {
      const response = await fetch('/api/admin/check-student-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_id: studentId,
          admission_number: admissionNumber
        })
      });

      if (response.ok) {
        const data = await response.json();
        setHasExistingLogin(data.hasLogin);
        setExistingLoginEmail(data.email || '');
      }
    } catch (error) {
      console.warn('Failed to check existing login:', error);
    }
  };

  const loadCurrentPhoto = async (studentId: string, schoolId: string) => {
    try {
      const { data: photoData } = await supabase
        .from('student_photos')
        .select('photo_url')
        .eq('student_id', studentId)
        .eq('is_primary', true)
        .single();

      if (photoData?.photo_url) {
        setCurrentPhotoUrl(photoData.photo_url);
      }
    } catch (error) {
      console.warn('No existing photo found:', error);
    }
  };

  const save = async () => {
    if (!student) return;
    setSaving(true);
    try {
      const payload = { ...form };
      delete payload.admission_number; // read-only
      delete payload.student_id;
      if ('schoolpay_payment_code' in payload) {
        const t = String(payload.schoolpay_payment_code ?? '').trim();
        payload.schoolpay_payment_code = t === '' ? null : t;
      }
      const { error } = await supabase
        .from("students")
        .update(payload)
        .eq("student_id", student.student_id);
      if (error) throw error;

      // Upload new profile photo if provided
      if (profilePhoto && student.student_id) {
        try {
          // Convert photo to base64 for storage
          const reader = new FileReader();
          reader.onload = async (e) => {
            const base64String = e.target?.result as string;
            
            if (base64String) {
              // First delete any existing photo for this student
              await supabase
                .from('student_photos')
                .delete()
                .eq('student_id', student.student_id)
                .eq('is_primary', true);
              
              // Then insert the new photo record
              const { error: photoRecordError } = await supabase.from('student_photos').insert({
                student_id: student.student_id,
                school_id: student.school_id,
                photo_url: base64String,
                photo_filename: profilePhoto.name,
                photo_size: profilePhoto.size,
                photo_type: profilePhoto.type,
                is_primary: true
              });

              if (photoRecordError) {
                console.error('Photo record error:', photoRecordError);
                alert(`Photo upload failed: ${photoRecordError.message}. Student data was saved successfully.`);
              } else {
                setCurrentPhotoUrl(base64String);
                // Photo uploaded successfully - no need for extra notification
              }
            }
          };
          reader.readAsDataURL(profilePhoto);
        } catch (photoError) {
          console.error('Photo processing error:', photoError);
          alert(`Photo processing failed: ${photoError instanceof Error ? photoError.message : 'Unknown error'}. Student data was saved successfully.`);
        }
      }

      setStudent({ ...student, ...form });
      setEditing(false);
      setProfilePhoto(null);
      setCompressionResult(null);
      setUploadError(null);
      alert("Student updated.");
    } catch (e: any) {
      alert(`Failed to update: ${e?.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  const createStudentLogin = async () => {
    if (!student) return;
    if (!loginForm.username || !loginForm.email || !loginForm.password) {
      alert("Please fill in all login fields.");
      return;
    }
    
    setCreatingLogin(true);
    try {
      const response = await fetch('/api/admin/create-student-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admission_number: loginForm.username,
          student_id: student.student_id,
          email: loginForm.email,
          password: loginForm.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create login');
      }

      alert(data.message || 'Student login created successfully!');
      setLoginForm(prev => ({ ...prev, password: '' }));
      setHasExistingLogin(true);
      setExistingLoginEmail(loginForm.email);
    } catch (e: any) {
      alert(`Failed to create login: ${e?.message || e}`);
    } finally {
      setCreatingLogin(false);
    }
  };

  const resetStudentPassword = async () => {
    if (!student) return;
    if (!loginForm.newPassword) {
      alert("Please enter a new password.");
      return;
    }
    
    setResetPassword(true);
    try {
      const response = await fetch('/api/admin/reset-student-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admission_number: student.admission_number,
          new_password: loginForm.newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      alert(data.message || 'Password reset successfully!');
      setLoginForm(prev => ({ ...prev, newPassword: '' }));
      setShowForgotPassword(false);
    } catch (e: any) {
      alert(`Failed to reset password: ${e?.message || e}`);
    } finally {
      setResetPassword(false);
    }
  };

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>
    );
  }

  const field = (label: string, key: string, type: string = "text", readOnly: boolean = false) => (
    <div>
      <label className="block text-sm text-white/80 mb-1">{label}</label>
      <input
        type={type}
        readOnly={!editing || readOnly}
        className={`w-full rounded-lg border border-white/10 px-3 py-2 ${!editing || readOnly ? 'bg-white/10 text-white' : 'bg-white text-black'}`}
        value={form?.[key] ?? ''}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-white text-xl font-semibold">Student Details</h1>
          <div className="flex gap-2">
            {!editing ? (
              <button className="px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white" onClick={() => setEditing(true)}>Edit</button>
            ) : (
              <>
                <button className="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white disabled:opacity-50" disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Save Changes'}</button>
                <button className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20" onClick={() => { setEditing(false); setForm(student); }}>Cancel</button>
              </>
            )}
            <button className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20" onClick={() => router.push('/dashboard/admin')}>Back</button>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="text-white/90 font-medium col-span-full">Personal</div>
            {field('Admission Number','admission_number','text', true)}
            {field('SchoolPay payment code','schoolpay_payment_code','text', false)}
            {field('First Name','first_name')}
            {field('Middle Name','middle_name')}
            {field('Last Name','last_name')}
            {field('Gender','gender')}
            {field('Date of Birth','date_of_birth','date')}
            {field('Nationality','nationality')}
            {field('Religion','religion')}

            <div className="text-white/90 font-medium col-span-full mt-2">Profile Photo</div>
            <div className="col-span-full">
              {currentPhotoUrl && !editing && (
                <div className="mb-4">
                  <img
                    src={currentPhotoUrl}
                    alt="Current profile photo"
                    className="w-32 h-32 object-cover rounded-lg border-2 border-white/20"
                  />
                </div>
              )}
              {editing && (
                <ImageUpload
                  onImageSelect={(file, result) => {
                    setProfilePhoto(file);
                    setCompressionResult(result);
                    setUploadError(null);
                  }}
                  onError={(error) => {
                    setUploadError(error);
                    setProfilePhoto(null);
                    setCompressionResult(null);
                  }}
                  maxSizeKB={500}
                  maxWidth={600}
                  maxHeight={600}
                  placeholder="Upload new passport photo"
                  className="text-white"
                />
              )}
              {uploadError && (
                <div className="mt-2 text-red-300 text-sm">{uploadError}</div>
              )}
            </div>

            <div className="text-white/90 font-medium col-span-full mt-2">Contact</div>
            {field('Address','address')}
            {field('City / District / Village','city')}
            {field('Country','country')}
            {field('Student Phone','student_phone')}
            {field('Student Email','student_email')}

            <div className="text-white/90 font-medium col-span-full mt-2">Parent / Guardian</div>
            {field('Full Name','guardian_name')}
            {field('Relationship','guardian_relationship')}
            {field('Phone Number','guardian_phone')}
            {field('Email','guardian_email')}
            {field('Occupation','guardian_occupation')}
            {field('Address','guardian_address')}

            <div className="text-white/90 font-medium col-span-full mt-2">Academic</div>
            {field('Class / Grade','current_class')}
            {field('Stream / Section','stream')}
            {field('Previous School','previous_school')}
            {field('Admission Date','admission_date','date')}

            {studentIsOlevel && (
              <>
                <div className="text-white/90 font-medium col-span-full mt-2">UCE learner subjects (Senior 1–4)</div>
                <div className="col-span-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/90">
                  <p className="text-white/70 mb-2">
                    All <strong>compulsory</strong> subjects for this class are included automatically. Tick{" "}
                    <strong>subsidiary</strong> subjects this learner takes.
                    {isSenior34Class(String(form?.current_class ?? student?.current_class ?? "")) ? (
                      <> Senior 3–4: at most <strong>3</strong> subsidiaries and <strong>10</strong> subjects total.</>
                    ) : (
                      <> Senior 1–2: any number of subsidiaries offered on the class list.</>
                    )}
                  </p>
                  {oLevelError && (
                    <div className="mb-2 rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-red-200">{oLevelError}</div>
                  )}
                  {oLevelLoading ? (
                    <div className="text-white/60">Loading class subjects…</div>
                  ) : oLevelClassRows.length === 0 ? (
                    <div className="text-amber-200/90 text-xs">No class subjects found for this class name. Check Admin → Subjects per class.</div>
                  ) : (
                    <>
                      <div className="mb-3">
                        <div className="text-white font-medium text-xs uppercase tracking-wide mb-1">Compulsory (always included)</div>
                        <ul className="list-disc pl-5 text-white/85 text-xs space-y-0.5">
                          {oLevelClassRows
                            .filter((r) => r.uce_offering_type === "compulsory")
                            .map((r) => (
                              <li key={r.subject}>{r.subject}</li>
                            ))}
                        </ul>
                      </div>
                      <div className="mb-3">
                        <div className="text-white font-medium text-xs uppercase tracking-wide mb-1">
                          Subsidiary (optional)
                          {isSenior34Class(String(form?.current_class ?? student?.current_class ?? "")) ? (
                            <span className="text-white/60 font-normal"> — {oLevelSubsPicked.length}/3</span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {oLevelClassRows
                            .filter((r) => r.uce_offering_type === "subsidiary")
                            .map((r) => (
                              <label key={r.subject} className="flex items-center gap-2 cursor-pointer text-xs">
                                <input
                                  type="checkbox"
                                  checked={oLevelSubsPicked.includes(r.subject)}
                                  onChange={() => toggleOlevelSub(r.subject)}
                                  className="rounded border-white/20"
                                />
                                <span>{r.subject}</span>
                              </label>
                            ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={oLevelSaving}
                        onClick={saveOlevelCombination}
                        className="rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 px-3 py-2 text-white text-sm"
                      >
                        {oLevelSaving ? "Saving…" : "Save UCE (O-Level) subjects"}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}

            {studentIsAlevel && (
              <>
                <div className="text-white/90 font-medium col-span-full mt-2">UACE combination (Senior 5–6)</div>
                <div className="col-span-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/90">
                  <p className="text-white/70 mb-2">
                    <strong>General Paper</strong> is automatic for every A-Level learner. Choose up to{" "}
                    <strong>{UACE_MAX_PRINCIPALS} principals</strong> and <strong>{UACE_MAX_ELECTIVE_SUBSIDIARIES} elective subsidiary</strong>{" "}
                    (five subjects total). Teachers only see learners who take each subject when entering A-Level results.
                  </p>
                  {uaceSubjectsError && (
                    <div className="mb-2 rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-red-200">{uaceSubjectsError}</div>
                  )}
                  {uaceSubjectsLoading ? (
                    <div className="text-white/60">Loading UACE catalog…</div>
                  ) : (
                    <>
                      <div className="mb-3">
                        <div className="text-white font-medium text-xs uppercase tracking-wide mb-1">
                          Principal ({uacePrincipalsPicked.length}/{UACE_MAX_PRINCIPALS})
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                          {uacePrincipalOptions.map((name) => (
                            <label key={name} className="flex items-center gap-2 cursor-pointer text-xs">
                              <input
                                type="checkbox"
                                checked={uacePrincipalsPicked.includes(name)}
                                onChange={() => toggleUacePrincipal(name)}
                                className="rounded border-white/20"
                              />
                              <span>{name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="mb-3">
                        <div className="text-white font-medium text-xs uppercase tracking-wide mb-1">
                          General Paper <span className="text-white/50 font-normal">(automatic)</span>
                        </div>
                        <label className="flex items-center gap-2 text-xs text-white/70 cursor-default mb-3">
                          <input type="checkbox" checked readOnly disabled className="rounded border-white/20" />
                          <span>{UACE_GENERAL_PAPER_NAME}</span>
                        </label>
                        <div className="text-white font-medium text-xs uppercase tracking-wide mb-1">
                          Elective subsidiary ({uaceSubsPicked.length}/{UACE_MAX_ELECTIVE_SUBSIDIARIES})
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {uaceSubsidiaryOptions.map((name) => (
                            <label key={name} className="flex items-center gap-2 cursor-pointer text-xs">
                              <input
                                type="checkbox"
                                checked={uaceSubsPicked.includes(name)}
                                onChange={() => toggleUaceSub(name)}
                                className="rounded border-white/20"
                              />
                              <span>{name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={uaceSubjectsSaving}
                        onClick={saveUaceCombination}
                        className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-3 py-2 text-white text-sm"
                      >
                        {uaceSubjectsSaving ? "Saving…" : "Save UACE combination"}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}

            <div className="text-white/90 font-medium col-span-full mt-2">Fees & Finance</div>
            {field('Enrollment / Registration Fee','enrollment_fee')}
            {field('Admission Fee Status','payment_status')}
            {/* Tuition with auto-detect from fee structure */}
            <div>
              <label className="block text-sm text-white/80 mb-1">Tuition/Fee Amount Due</label>
              <input
                type="number"
                readOnly={!editing}
                className={`w-full rounded-lg border border-white/10 px-3 py-2 ${!editing ? 'bg-white/10 text-white' : 'bg-white text-black'}`}
                value={form?.expected_fee_amount ?? ''}
                onChange={(e) => setForm({ ...form, expected_fee_amount: e.target.value })}
                placeholder={expectedFeeFromStructure != null ? `UGX ${expectedFeeFromStructure.toLocaleString()}` : ''}
              />
              {(!form?.expected_fee_amount || Number(form?.expected_fee_amount) === 0) && expectedFeeFromStructure != null && (
                <div className="mt-2 text-xs text-white/70 flex items-center gap-2">
                  <span>Detected class fee:</span>
                  <span className="px-2 py-0.5 rounded bg-green-600/20 text-green-300">UGX {expectedFeeFromStructure.toLocaleString()}</span>
                  <button
                    disabled={syncingFees}
                    onClick={async () => {
                      if (!student) return;
                      setSyncingFees(true);
                      try {
                        // Update student's expected fee
                        await supabase
                          .from('students')
                          .update({ expected_fee_amount: expectedFeeFromStructure })
                          .eq('student_id', student.student_id);

                        setForm((prev: any) => ({ ...prev, expected_fee_amount: expectedFeeFromStructure }));

                        // Trigger global sync to ensure balances are created/updated
                        await fetch('/api/admin/sync-student-balances', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ schoolId: student.school_id })
                        });

                        alert('Tuition applied from fee structure and balances synced.');
                      } catch (e) {
                        alert('Failed to apply tuition.');
                      } finally {
                        setSyncingFees(false);
                      }
                    }}
                    className="px-2 py-1 rounded bg-green-600 hover:bg-green-500 text-white"
                  >
                    {syncingFees ? 'Applying…' : 'Apply to Student'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4">
          <div className="text-white/90 font-medium mb-4">
            {hasExistingLogin ? 'Student Login Management' : 'Create Login for Student'}
          </div>
          
          {hasExistingLogin && (
            <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
              <div className="text-green-300 text-sm font-medium">✓ Login Account Exists</div>
              <div className="text-green-200 text-xs mt-1">Email: {existingLoginEmail}</div>
      </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-white/80 mb-1">Username (Admission Number)</label>
              <input
                type="text"
                className="w-full rounded-lg border border-white/10 px-3 py-2 bg-white/10 text-white"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                placeholder="KPS-2025-MK-010"
              />
    </div>
            
            <div>
              <label className="block text-sm text-white/80 mb-1">Student Email</label>
              <input
                type="email"
                className="w-full rounded-lg border border-white/10 px-3 py-2 bg-white/10 text-white"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                placeholder="student@example.com"
              />
            </div>
            
            <div>
              <label className="block text-sm text-white/80 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full rounded-lg border border-white/10 px-3 py-2 pr-10 bg-white/10 text-white"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
          </div>
        </div>

          <div className="flex gap-3 mb-4">
            {!hasExistingLogin && (
              <button 
                className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 disabled:opacity-50" 
                onClick={createStudentLogin}
                disabled={creatingLogin}
              >
                {creatingLogin ? 'Creating...' : 'Create Login'}
              </button>
            )}
            
            <button 
              className="rounded-lg bg-orange-600 hover:bg-orange-500 text-white px-4 py-2" 
              onClick={() => setShowForgotPassword(!showForgotPassword)}
            >
              {showForgotPassword ? 'Cancel' : 'Reset Password'}
            </button>
          </div>
          
          {showForgotPassword && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              className="border-t border-white/10 pt-4"
            >
              <div className="text-white/90 font-medium mb-2">Reset Password</div>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-sm text-white/80 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      className="w-full rounded-lg border border-white/10 px-3 py-2 pr-10 bg-white/10 text-white"
                      value={loginForm.newPassword}
                      onChange={(e) => setLoginForm({ ...loginForm, newPassword: e.target.value })}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>
                <button 
                  className="rounded-lg bg-green-600 hover:bg-green-500 text-white px-4 py-2 disabled:opacity-50" 
                  onClick={resetStudentPassword}
                  disabled={resetPassword}
                >
                  {resetPassword ? 'Resetting...' : 'Reset Password'}
                </button>
          </div>
        </motion.div>
          )}
          
          <div className="text-xs text-white/70 mt-2">
            Username will be the admission number. Email should be the student's actual email address. Students can change their password after logging in.
          </div>
        </motion.div>
      </div>
    </div>
  );
}

