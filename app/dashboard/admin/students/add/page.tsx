"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import ImageUpload from "@/src/components/ImageUpload";
import { createMissedExamRecordsForNewStudent } from "@/src/lib/examResultsUtils";
import { CompressionResult } from "@/src/lib/imageCompression";
import { isValidRealEmail } from "@/src/lib/realEmail";

export default function AddStudentPage() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolType, setSchoolType] = useState<'Nursery/Primary' | 'Secondary' | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Student Personal Information
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [nationality, setNationality] = useState("");
  const [religion, setReligion] = useState("");

  const [city, setCity] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [studentEmail, setStudentEmail] = useState("");

  // Academic Information
  const [klass, setKlass] = useState("");
  const [stream, setStream] = useState("");
  const [previousSchool, setPreviousSchool] = useState("");
  const [admissionDate, setAdmissionDate] = useState("");
  const [generatedAdmNo, setGeneratedAdmNo] = useState<string | null>(null);
  const [boardingType, setBoardingType] = useState("Day Scholar");

  // Fees & Finance
  const [enrollmentFee, setEnrollmentFee] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("Pending");
  const [expectedFee, setExpectedFee] = useState("");
  const [initialPayment, setInitialPayment] = useState("");
  
  // Fee Structure (from Financial Settings)
  const [feeStructure, setFeeStructure] = useState<Record<string, number>>({});
  const [admissionFeeAmount, setAdmissionFeeAmount] = useState<number>(0);

  // Medical
  const [medicalCondition, setMedicalCondition] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Helper function to get the correct dashboard URL based on user role
  const getDashboardUrl = () => {
    switch (userRole) {
      case 'accountant':
        return '/dashboard/accountant';
      case 'admin':
        return '/dashboard/admin';
      case 'owner':
        return '/dashboard/owner';
      default:
        return '/dashboard/admin'; // fallback
    }
  };

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      const { data } = await supabase.from("users").select("school_id, role").eq("user_id", user.id).single();
      if (!data?.school_id) return router.push("/login");
      setSchoolId(data.school_id);
      setUserRole(data.role);
      const { data: sch } = await supabase.from("schools").select("type").eq("school_id", data.school_id).single();
      setSchoolType((sch?.type as any) || null);
      // default admission date to today
      setAdmissionDate(new Date().toISOString().slice(0,10));
    };
    run();
  }, [router]);

  // Load fee structure from Financial Settings
  useEffect(() => {
    const loadFeeStructure = async () => {
      if (!schoolId) return;
      
      try {
        const { data, error } = await supabase
          .from('school_fee_structure')
          .select('*')
          .eq('school_id', schoolId);

        if (error) {
          console.error('Error loading fee structure:', error);
          return;
        }

        // Convert to fee map with both day and boarding fees
        const dayFeeMap: Record<string, number> = {};
        const boardingFeeMap: Record<string, number> = {};
        let admFee = 0;

        (data || []).forEach((fee: any) => {
          if (fee.class_name === 'ADMISSION') {
            admFee = Number(fee.tuition_amount || 0);
          } else {
            dayFeeMap[fee.class_name] = Number(fee.tuition_amount || 0);
            boardingFeeMap[fee.class_name] = Number(fee.boarding_tuition_amount || 0);
          }
        });

        setFeeStructure(dayFeeMap);
        setAdmissionFeeAmount(admFee);
        
        // Store boarding fees separately for later use
        (window as any).boardingFeeStructure = boardingFeeMap;
        
        // Auto-fill admission fee if not already set
        if (admFee > 0 && !enrollmentFee) {
          setEnrollmentFee(admFee.toString());
        }
      } catch (err) {
        console.error('Error loading fees:', err);
      }
    };

    loadFeeStructure();
  }, [schoolId]);

  // Auto-fill tuition fee when class or boarding type is selected
  useEffect(() => {
    if (klass) {
      let classFee = 0;
      
      if (boardingType === 'Boarding') {
        // Use boarding fees
        const boardingFees = (window as any).boardingFeeStructure;
        if (boardingFees && boardingFees[klass]) {
          classFee = boardingFees[klass];
        }
      } else {
        // Use day scholar fees
        if (feeStructure[klass]) {
          classFee = feeStructure[klass];
        }
      }
      
      if (classFee > 0) {
        setExpectedFee(classFee.toString());
        // Auto-filled tuition fee
      } else {
        setExpectedFee('');
        // No fee configured
      }
    }
  }, [klass, boardingType, feeStructure]);

  const save = async (): Promise<boolean> => {
    if (!schoolId || !firstName || !lastName || !klass || !admissionDate) return false;
    
    // Prevent multiple submissions
    if (saving) {
      alert('Please wait, student is being added...');
      return false;
    }
    
    // Validate DOB not in the future
    if (dob) {
      const dobDate = new Date(dob);
      const today = new Date();
      if (dobDate > today) {
        alert('Date of Birth cannot be in the future.');
        return false;
      }
    }
    // Validate payment numbers
    const expectedNum = expectedFee ? Number(expectedFee) : 0;
    const initialNum = initialPayment ? Number(initialPayment) : 0;
    if (initialNum < 0 || expectedNum < 0) {
      alert('Amounts cannot be negative.');
      return false;
    }
    if (initialNum > expectedNum && expectedNum > 0) {
      alert('Initial payment cannot exceed Tuition/Fee Amount Due.');
      return false;
    }
    const trimStudentEmail = studentEmail.trim();
    if (trimStudentEmail && !isValidRealEmail(trimStudentEmail)) {
      alert('If you enter a student email, use a valid address.');
      return false;
    }
    setSaving(true);
    try {
      // Check for duplicate student before creating
      const { data: existingStudents } = await supabase
        .from('students')
        .select('student_id, admission_number, name')
        .eq('school_id', schoolId)
        .eq('first_name', firstName)
        .eq('last_name', lastName)
        .eq('current_class', klass)
        .eq('admission_date', admissionDate)
        .eq('status', 'active');
      
      if (existingStudents && existingStudents.length > 0) {
        alert(`Student already exists with Admission Number: ${existingStudents[0].admission_number}`);
        setSaving(false);
        return false;
      }
      

      const student_email = trimStudentEmail || null;

      // Compose full name for legacy name column
      const name = [firstName, middleName, lastName].filter(Boolean).join(' ');

      const { data: insertedStudent, error: insertErr } = await supabase.from("students").insert({
        school_id: schoolId,
        name,
        current_class: klass,
        status: 'active',
        // new fields
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        gender: gender || null,
        date_of_birth: dob || null,
        nationality: nationality || null,
        religion: religion || null,
        address: null,
        city: city || null,
        country: null,
        student_phone: studentPhone || null,
        student_email,
        guardian_name: null,
        guardian_relationship: null,
        guardian_phone: null,
        guardian_email: null,
        guardian_occupation: null,
        guardian_address: null,
        medical_condition: medicalCondition || null,
        stream: stream || null,
        previous_school: previousSchool || null,
        admission_date: admissionDate,
        boarding_type: boardingType,
        enrollment_fee: enrollmentFee ? Number(enrollmentFee) : null,
        payment_status: paymentStatus,
        expected_fee_amount: expectedFee ? Number(expectedFee) : null,
      }).select('student_id, admission_number').single();
      if (insertErr) throw insertErr;

      const admission_number = insertedStudent?.admission_number ?? '';
      setGeneratedAdmNo(admission_number || null);

      // Record initial tuition payment if provided
      if (initialNum > 0 && insertedStudent?.student_id) {
        await supabase.from('payments').insert({
          student_id: insertedStudent.student_id,
          school_id: schoolId,
          amount: initialNum,
          payment_method: 'Cash',
          description: 'Initial tuition payment',
          status: 'Approved'
        });
      }

      // Create "missed exam" records for new student if class already has exam results
      if (insertedStudent?.student_id) {
        const result = await createMissedExamRecordsForNewStudent(
          schoolId,
          insertedStudent.student_id,
          klass
        );

        if (result.success && result.recordsCreated > 0) {
          // Created missed exam records
        } else if (result.error) {
          // Failed to create missed exam records - don't fail the entire operation
        }
      }

      // Upload profile photo if provided
      if (profilePhoto && insertedStudent?.student_id) {
        try {
          // Convert photo to base64 for storage (same approach as student detail page)
          const base64String = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const result = e.target?.result as string;
              if (result) {
                resolve(result);
              } else {
                reject(new Error('Failed to convert file to base64'));
              }
            };
            reader.onerror = () => reject(new Error('FileReader error'));
            reader.readAsDataURL(profilePhoto);
          });

            // Save photo record to database
          const { error: photoRecordError } = await supabase.from('student_photos').insert({
              student_id: insertedStudent.student_id,
              school_id: schoolId,
            photo_url: base64String,
              photo_filename: profilePhoto.name,
              photo_size: profilePhoto.size,
              photo_type: profilePhoto.type || 'image/jpeg',
              is_primary: true
            });

          if (photoRecordError) {
            console.error('Photo record error:', photoRecordError);
            // Don't fail the entire operation for photo upload
          }
        } catch (photoError) {
          console.error('Photo processing error:', photoError);
          // Don't fail the entire operation for photo upload
        }
      }

      alert(
        `Student added successfully. Admission No: ${admission_number}\nLink parents from Add parent when ready. To create login: Student Details → Create Login.`
      );
      // reset minimal fields for add-another flow
      setFirstName(""); setMiddleName(""); setLastName(""); setGender(""); setDob("");
      setNationality(""); setReligion(""); setCity("");
      setStudentPhone(""); setStudentEmail("");
      setKlass(""); setStream(""); setPreviousSchool(""); setAdmissionDate(""); setBoardingType("Day Scholar");
      setEnrollmentFee(""); setPaymentStatus("Pending"); setExpectedFee(""); setInitialPayment("");
      setProfilePhoto(null); setCompressionResult(null); setUploadError(null);
      setGeneratedAdmNo(null);
    } catch (e: any) {
      console.error(e);
      alert(`Failed to add student: ${e?.message || e}`);
      return false;
    } finally {
      setSaving(false);
    }
    return true;
  };

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-white text-xl font-semibold">Add Student</h1>
          <button className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20" onClick={() => router.push(getDashboardUrl())}>Back to Dashboard</button>
        </div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="text-white/90 font-medium col-span-full">Student Personal Information</div>
            <input className="rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <input className="rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Middle Name (optional)" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
            <input className="rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            <select className="rounded-lg border border-white/10 bg-white text-black px-3 py-2" value={gender} onChange={(e)=>setGender(e.target.value)}>
              <option value="">Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            <input type="date" className="rounded-lg border border-white/10 bg-white/10 text-white px-3 py-2" placeholder="Date of Birth" value={dob} onChange={(e)=>setDob(e.target.value)} max={new Date().toISOString().slice(0,10)} />
            <input className="rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Nationality" value={nationality} onChange={(e)=>setNationality(e.target.value)} />
            <input className="rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Religion (optional)" value={religion} onChange={(e)=>setReligion(e.target.value)} />
            <input className="rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2 col-span-full md:col-span-2" placeholder="City / District" value={city} onChange={(e)=>setCity(e.target.value)} />
            
            <div className="text-white/90 font-medium col-span-full mt-2">Profile Photo (Passport Size)</div>
            <div className="col-span-full">
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
                placeholder="Upload student passport photo"
                className="text-white"
              />
              {uploadError && (
                <div className="mt-2 text-red-300 text-sm">{uploadError}</div>
              )}
            </div>

            <div className="text-white/90 font-medium col-span-full mt-2">Email & phone (portal / login)</div>
            <p className="col-span-full text-white/60 text-xs">Optional. Use when you invite the student to the portal.</p>
            <input className="rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Student email (optional)" value={studentEmail} onChange={(e)=>setStudentEmail(e.target.value)} type="email" />
            <input className="rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Student phone (optional)" value={studentPhone} onChange={(e)=>setStudentPhone(e.target.value)} />

            <div className="text-white/90 font-medium col-span-full mt-2">Academic Information</div>
            <select className="w-full rounded-lg border border-white/10 bg-white text-black px-3 py-2" value={klass} onChange={(e) => setKlass(e.target.value)}>
              <option value="">Select Class</option>
              {schoolType === 'Nursery/Primary' && (
                <>
                  <option value="Baby Class">Baby Class</option>
                  <option value="Middle Class">Middle Class</option>
                  <option value="Top Class">Top Class</option>
                  {Array.from({ length: 7 }).map((_, i) => (
                    <option key={`P-${i}`} value={`Primary ${i + 1}`}>{`Primary ${i + 1}`}</option>
                  ))}
                </>
              )}
              {schoolType === 'Secondary' && (
                <>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <option key={`S-${i}`} value={`Senior ${i + 1}`}>{`Senior ${i + 1}`}</option>
                  ))}
                </>
              )}
            </select>
            <select className="rounded-lg border border-white/10 bg-white text-black px-3 py-2" value={boardingType} onChange={(e)=>setBoardingType(e.target.value)}>
              <option value="Day Scholar">Day Scholar</option>
              <option value="Boarding">Boarding</option>
            </select>
            <input className="rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Stream / Section (optional)" value={stream} onChange={(e)=>setStream(e.target.value)} />
            <input className="rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Previous School (if transfer)" value={previousSchool} onChange={(e)=>setPreviousSchool(e.target.value)} />
            <input type="date" readOnly className="rounded-lg border border-white/10 bg-white/10 text-white px-3 py-2" placeholder="Admission Date" value={admissionDate} />

            <div className="text-white/90 font-medium col-span-full mt-2">Medical</div>
            <textarea
              className="rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2 col-span-full"
              placeholder="Medical condition / allergies / special notes (optional)"
              rows={3}
              value={medicalCondition}
              onChange={(e)=>setMedicalCondition(e.target.value)}
            />

            <div className="text-white/90 font-medium col-span-full mt-2">
              Fees & Finance
              {admissionFeeAmount > 0 && (
                <span className="ml-2 text-xs text-green-400 font-normal">✓ Auto-filled from Financial Settings</span>
              )}
            </div>
            <div className="relative">
              <input 
                className="rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2 w-full" 
                placeholder="Enrollment / Registration Fee" 
                value={enrollmentFee} 
                onChange={(e)=>setEnrollmentFee(e.target.value)} 
              />
              {admissionFeeAmount > 0 && enrollmentFee === admissionFeeAmount.toString() && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400 text-xs">
                  ✓
                </div>
              )}
            </div>
            <select className="rounded-lg border border-white/10 bg-white text-black px-3 py-2" value={paymentStatus} onChange={(e)=>setPaymentStatus(e.target.value)}>
              <option value="Paid">Admission Fee: Paid</option>
              <option value="Pending">Admission Fee: Pending</option>
            </select>
            <div className="relative">
              <input 
                className="rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2 w-full" 
                placeholder={`${boardingType} Tuition/Fee Amount Due`} 
                value={expectedFee} 
                onChange={(e)=>setExpectedFee(e.target.value)} 
              />
              {klass && expectedFee && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400 text-xs">
                  ✓ Auto-filled
                </div>
              )}
            </div>
            <input className="rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Initial Payment (optional)" value={initialPayment} onChange={(e)=>setInitialPayment(e.target.value)} />
            {generatedAdmNo && (
              <input readOnly className="rounded-lg border border-emerald-300/30 bg-emerald-500/10 text-white px-3 py-2" value={generatedAdmNo} />
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <button 
              className="px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white disabled:opacity-50 disabled:cursor-not-allowed" 
              disabled={saving} 
              onClick={save}
            >
              {saving ? "Saving..." : "Save & Add Another"}
            </button>
            <button 
              className="px-3 py-2 rounded-lg bg-green-500 hover:bg-green-400 text-white disabled:opacity-50 disabled:cursor-not-allowed" 
              disabled={saving}
              onClick={async ()=>{ 
                const ok = await save(); 
                try {
                  // Best-effort sync of balances so accountant KPI updates immediately
                  const { data: { user } } = await supabase.auth.getUser();
                  if (ok && user) {
                    const { data: userRow } = await supabase
                      .from('users')
                      .select('school_id')
                      .eq('user_id', user.id)
                      .single();
                    if (userRow?.school_id) {
                      await fetch('/api/admin/sync-student-balances', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ schoolId: userRow.school_id })
                      });
                    }
                  }
                } catch {}
                if (ok) router.push(getDashboardUrl()); 
              }}
            >
              {saving ? "Saving..." : "Save & Return"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}



