"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function AddStudentPage() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolType, setSchoolType] = useState<'Nursery/Primary' | 'Secondary' | null>(null);

  // Student Personal Information
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [nationality, setNationality] = useState("");
  const [religion, setReligion] = useState("");

  // Contact & Address
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [studentEmail, setStudentEmail] = useState("");

  // Parent/Guardian
  const [guardianName, setGuardianName] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianOccupation, setGuardianOccupation] = useState("");
  const [guardianAddress, setGuardianAddress] = useState("");

  // Academic Information
  const [klass, setKlass] = useState("");
  const [stream, setStream] = useState("");
  const [previousSchool, setPreviousSchool] = useState("");
  const [admissionDate, setAdmissionDate] = useState("");
  const [generatedAdmNo, setGeneratedAdmNo] = useState<string | null>(null);

  // Fees & Finance
  const [enrollmentFee, setEnrollmentFee] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("Pending");
  const [expectedFee, setExpectedFee] = useState("");
  const [initialPayment, setInitialPayment] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      const { data } = await supabase.from("users").select("school_id").eq("user_id", user.id).single();
      if (!data?.school_id) return router.push("/login");
      setSchoolId(data.school_id);
      const { data: sch } = await supabase.from("schools").select("type").eq("school_id", data.school_id).single();
      setSchoolType((sch?.type as any) || null);
      // default admission date to today
      setAdmissionDate(new Date().toISOString().slice(0,10));
    };
    run();
  }, [router]);

  const save = async (): Promise<boolean> => {
    if (!schoolId || !firstName || !lastName || !klass || !admissionDate) return;
    
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
        return;
      }
    }
    // Validate payment numbers
    const expectedNum = expectedFee ? Number(expectedFee) : 0;
    const initialNum = initialPayment ? Number(initialPayment) : 0;
    if (initialNum < 0 || expectedNum < 0) {
      alert('Amounts cannot be negative.');
      return;
    }
    if (initialNum > expectedNum && expectedNum > 0) {
      alert('Initial payment cannot exceed Tuition/Fee Amount Due.');
      return;
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
      

      // Generate admission number via RPC for atomicity
      const { data: admData, error: admErr } = await supabase.rpc('generate_admission_number', {
        p_school_id: schoolId,
        p_first_name: firstName,
        p_middle_name: middleName || null,
        p_last_name: lastName,
        p_admission_date: admissionDate
      });
      if (admErr) throw admErr;
      const admission_number = admData as string;
      setGeneratedAdmNo(admission_number);

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
        address,
        city,
        country,
        student_phone: studentPhone || null,
        student_email: studentEmail || null,
        guardian_name: guardianName,
        guardian_relationship: guardianRelationship,
        guardian_phone: guardianPhone,
        guardian_email: guardianEmail || null,
        guardian_occupation: guardianOccupation || null,
        guardian_address: guardianAddress || null,
        admission_number,
        stream: stream || null,
        previous_school: previousSchool || null,
        admission_date: admissionDate,
        enrollment_fee: enrollmentFee ? Number(enrollmentFee) : null,
        payment_status: paymentStatus,
        expected_fee_amount: expectedFee ? Number(expectedFee) : null,
      }).select('student_id').single();
      if (insertErr) throw insertErr;

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

      // Login creation is now manual - admin must create login through Student Details page

      alert(`Student added successfully. Admission No: ${admission_number}\nTo create login: Go to Student Details page and use "Create Login" button.`);
      // reset minimal fields for add-another flow
      setFirstName(""); setMiddleName(""); setLastName(""); setGender(""); setDob("");
      setNationality(""); setReligion("");
      setAddress(""); setCity(""); setCountry(""); setStudentPhone(""); setStudentEmail("");
      setGuardianName(""); setGuardianRelationship(""); setGuardianPhone(""); setGuardianEmail(""); setGuardianOccupation(""); setGuardianAddress("");
      setKlass(""); setStream(""); setPreviousSchool(""); setAdmissionDate("");
      setEnrollmentFee(""); setPaymentStatus("Pending"); setExpectedFee(""); setInitialPayment("");
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
          <button className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20" onClick={() => router.push('/dashboard/admin')}>Back to Dashboard</button>
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
            

            <div className="text-white/90 font-medium col-span-full mt-2">Contact & Address</div>
            <input className="rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Home Address" value={address} onChange={(e)=>setAddress(e.target.value)} />
            <input className="rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="City / District / Village" value={city} onChange={(e)=>setCity(e.target.value)} />
            <input className="rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Country" value={country} onChange={(e)=>setCountry(e.target.value)} />
            <input className="rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Student Phone (optional)" value={studentPhone} onChange={(e)=>setStudentPhone(e.target.value)} />
            <input className="rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Student Email (optional)" value={studentEmail} onChange={(e)=>setStudentEmail(e.target.value)} />

            <div className="text-white/90 font-medium col-span-full mt-2">Parent / Guardian Information</div>
            <input className="rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Full Name" value={guardianName} onChange={(e)=>setGuardianName(e.target.value)} />
            <select className="rounded-lg border border-white/10 bg-white text-black px-3 py-2" value={guardianRelationship} onChange={(e)=>setGuardianRelationship(e.target.value)}>
              <option value="">Relationship</option>
              <option value="Father">Father</option>
              <option value="Mother">Mother</option>
              <option value="Guardian">Guardian</option>
            </select>
            <input className="rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Phone Number" value={guardianPhone} onChange={(e)=>setGuardianPhone(e.target.value)} />
            <input className="rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Email (optional)" value={guardianEmail} onChange={(e)=>setGuardianEmail(e.target.value)} />
            <input className="rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Occupation (optional)" value={guardianOccupation} onChange={(e)=>setGuardianOccupation(e.target.value)} />
            <input className="rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Address (if different)" value={guardianAddress} onChange={(e)=>setGuardianAddress(e.target.value)} />

            <div className="text-white/90 font-medium col-span-full mt-2">Academic Information</div>
            <select className="w-full rounded-lg border border-white/10 bg-white text-black px-3 py-2" value={klass} onChange={(e) => setKlass(e.target.value)}>
              <option value="">Select Class</option>
              {schoolType === 'Nursery/Primary' && (
                <>
                  <option value="Nursery">Nursery</option>
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
            <input className="rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Stream / Section (optional)" value={stream} onChange={(e)=>setStream(e.target.value)} />
            <input className="rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Previous School (if transfer)" value={previousSchool} onChange={(e)=>setPreviousSchool(e.target.value)} />
            <input type="date" readOnly className="rounded-lg border border-white/10 bg-white/10 text-white px-3 py-2" placeholder="Admission Date" value={admissionDate} />

            <div className="text-white/90 font-medium col-span-full mt-2">Fees & Finance</div>
            <input className="rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Enrollment / Registration Fee" value={enrollmentFee} onChange={(e)=>setEnrollmentFee(e.target.value)} />
            <select className="rounded-lg border border-white/10 bg-white text-black px-3 py-2" value={paymentStatus} onChange={(e)=>setPaymentStatus(e.target.value)}>
              <option value="Paid">Admission Fee: Paid</option>
              <option value="Pending">Admission Fee: Pending</option>
            </select>
            <input className="rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Tuition/Fee Amount Due" value={expectedFee} onChange={(e)=>setExpectedFee(e.target.value)} />
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
                if (ok) router.push('/dashboard/admin'); 
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



