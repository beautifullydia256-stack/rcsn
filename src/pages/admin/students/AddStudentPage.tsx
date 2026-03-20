import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import { createMissedExamRecordsForNewStudent } from '@/lib/examResultsUtils';
import { useToast } from '@/components/Toast';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSION_KEYS } from '@/lib/permissions';
import { ensureParentLinkForStudent } from '@/lib/ensureParentLink';
import { isValidRealEmail } from '@/lib/realEmail';
import { formatStudentSaveError } from '@/lib/supabaseError';

const STALE_TIME_MS = 5 * 60 * 1000;

const NURSERY_PRIMARY_CLASSES = [
  'Baby Class',
  'Middle Class',
  'Top Class',
  ...Array.from({ length: 7 }, (_, i) => `Primary ${i + 1}`),
];

const SECONDARY_CLASSES = Array.from({ length: 6 }, (_, i) => `Senior ${i + 1}`);

function Section({
  id,
  title,
  isOpen,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  isOpen: boolean;
  onToggle: (key: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 text-left text-sm font-medium text-gray-700 hover:bg-gray-100"
      >
        {title}
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {isOpen && <div className="p-4 space-y-3 bg-white">{children}</div>}
    </div>
  );
}

type FeeStructure = {
  feeByClass: Record<string, number>;
  boardingByClass: Record<string, number>;
  admissionFee: number;
};

async function fetchSchoolAndFees(userId: string) {
  const { data: u } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (!u?.school_id)
    return {
      schoolId: null as string | null,
      schoolType: null as 'Nursery/Primary' | 'Secondary' | null,
      feeStructure: { feeByClass: {}, boardingByClass: {}, admissionFee: 0 } as FeeStructure,
    };

  const [schoolRes, feeRes] = await Promise.all([
    supabase.from('schools').select('type').eq('school_id', u.school_id).single(),
    supabase.from('school_fee_structure').select('class_name, tuition_amount, boarding_tuition_amount').eq('school_id', u.school_id),
  ]);
  const schoolType = (schoolRes.data?.type as 'Nursery/Primary' | 'Secondary') || null;
  const feeByClass: Record<string, number> = {};
  const boardingByClass: Record<string, number> = {};
  let admissionFee = 0;
  (feeRes.data || []).forEach((row: { class_name: string; tuition_amount?: number; boarding_tuition_amount?: number }) => {
    if (row.class_name === 'ADMISSION') {
      admissionFee = Number(row.tuition_amount || 0) || 0;
    } else if (row.class_name) {
      feeByClass[row.class_name] = Number(row.tuition_amount || 0) || 0;
      boardingByClass[row.class_name] = Number(row.boarding_tuition_amount || 0) || 0;
    }
  });
  return {
    schoolId: u.school_id,
    schoolType,
    feeStructure: { feeByClass, boardingByClass, admissionFee },
  };
}

export default function AddStudentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canEnrol = usePermission(PERMISSION_KEYS.studentsManage);

  useEffect(() => {
    if (!canEnrol) {
      navigate('/dashboard', { replace: true });
    }
  }, [canEnrol, navigate]);

  // Personal
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [nationality, setNationality] = useState('');
  const [religion, setReligion] = useState('');

  // Contact & Address
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [studentEmail, setStudentEmail] = useState('');

  // Guardian
  const [guardianName, setGuardianName] = useState('');
  const [guardianRelationship, setGuardianRelationship] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [guardianOccupation, setGuardianOccupation] = useState('');
  const [guardianAddress, setGuardianAddress] = useState('');

  // Academic
  const [currentClass, setCurrentClass] = useState('');
  const [stream, setStream] = useState('');
  const [previousSchool, setPreviousSchool] = useState('');
  const [admissionDate, setAdmissionDate] = useState('');
  const [boardingType, setBoardingType] = useState<'Day Scholar' | 'Boarding'>('Day Scholar');
  const [generatedAdmNo, setGeneratedAdmNo] = useState<string | null>(null);

  // Fees & discount (existing behaviour)
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [enrollmentFee, setEnrollmentFee] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('Pending');
  const [expectedFee, setExpectedFee] = useState('');
  const [initialPayment, setInitialPayment] = useState('');

  // Medical
  const [medicalCondition, setMedicalCondition] = useState('');

  // Photo (same handling as old system: compress then store base64 in student_photos)
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  // Collapsible sections: multiple can be open; user closes when they want
  const [openSections, setOpenSections] = useState<string[]>(['personal']);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'add-student', 'school', user?.id ?? ''],
    queryFn: () => fetchSchoolAndFees(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
  });

  const schoolId = data?.schoolId ?? null;
  const schoolType = data?.schoolType ?? null;
  const { feeByClass, boardingByClass, admissionFee } = data?.feeStructure ?? {
    feeByClass: {},
    boardingByClass: {},
    admissionFee: 0,
  };
  const classOptions = schoolType === 'Secondary' ? SECONDARY_CLASSES : NURSERY_PRIMARY_CLASSES;

  useEffect(() => {
    if (classOptions.length && !currentClass) setCurrentClass(classOptions[0]);
  }, [classOptions.length, currentClass]);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (!admissionDate) setAdmissionDate(today);
  }, []);

  useEffect(() => {
    if (admissionFee > 0 && !enrollmentFee) setEnrollmentFee(String(admissionFee));
  }, [admissionFee]);

  // Auto-fill expected fee from class + boarding type
  useEffect(() => {
    if (!currentClass) return;
    const fee =
      boardingType === 'Boarding' ? boardingByClass[currentClass] ?? 0 : feeByClass[currentClass] ?? 0;
    if (fee > 0) setExpectedFee(String(fee));
    else setExpectedFee('');
  }, [currentClass, boardingType, feeByClass, boardingByClass]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimFirst = firstName.trim();
    const trimLast = lastName.trim();
    if (!trimFirst || !trimLast) {
      setError('First name and last name are required.');
      return;
    }
    if (!currentClass) {
      setError('Please select a class.');
      return;
    }
    if (!admissionDate) {
      setError('Admission date is required.');
      return;
    }
    if (dob) {
      const dobDate = new Date(dob);
      if (dobDate > new Date()) {
        setError('Date of birth cannot be in the future.');
        return;
      }
    }
    const expectedNum = expectedFee ? Number(expectedFee) : 0;
    const initialNum = initialPayment ? Number(initialPayment) : 0;
    if (initialNum < 0 || expectedNum < 0) {
      setError('Amounts cannot be negative.');
      return;
    }
    if (expectedNum > 0 && initialNum > expectedNum) {
      setError('Initial payment cannot exceed tuition/fee amount due.');
      return;
    }
    const trimStudentEmail = studentEmail.trim();
    if (!trimStudentEmail || !isValidRealEmail(trimStudentEmail)) {
      setError('Enter a valid real email address for the student (no placeholder or system-generated addresses).');
      return;
    }
    if (guardianName.trim()) {
      const ge = guardianEmail.trim();
      if (!ge || !isValidRealEmail(ge)) {
        setError('When a parent/guardian name is provided, enter a valid real email for that parent.');
        return;
      }
    }
    setSubmitting(true);
    try {
      // Admission number is always auto-generated (generate_admission_number RPC)
      const { data: admData, error: admErr } = await supabase.rpc('generate_admission_number', {
        p_school_id: schoolId,
        p_first_name: trimFirst,
        p_middle_name: middleName.trim() || null,
        p_last_name: trimLast,
        p_admission_date: admissionDate,
      });
      if (admErr) throw admErr;
      const admission_number = admData as string;
      setGeneratedAdmNo(admission_number);

      const student_email = studentEmail.trim();

      const name = [trimFirst, middleName.trim(), trimLast].filter(Boolean).join(' ');
      const percent = Math.min(100, Math.max(0, Number(discountPercent) || 0));
      const baseFee = boardingType === 'Boarding' ? boardingByClass[currentClass] ?? 0 : feeByClass[currentClass] ?? 0;
      const expectedFeeAmount =
        baseFee > 0 ? Math.round(baseFee * (1 - percent / 100)) : expectedFee ? Number(expectedFee) : null;

      // Student address = guardian address unless a different student address is given
      const studentAddress = (address && address.trim()) ? address.trim() : (guardianAddress && guardianAddress.trim()) ? guardianAddress.trim() : null;

      const { data: inserted, error: insertError } = await supabase
        .from('students')
        .insert({
          school_id: schoolId,
          name,
          current_class: currentClass,
          status: 'active',
          first_name: trimFirst,
          middle_name: middleName.trim() || null,
          last_name: trimLast,
          gender: gender || null,
          date_of_birth: dob || null,
          nationality: nationality || null,
          religion: religion || null,
          address: studentAddress,
          city: city || null,
          country: country || null,
          student_phone: studentPhone || null,
          student_email,
          guardian_name: guardianName || null,
          guardian_relationship: guardianRelationship || null,
          guardian_phone: guardianPhone || null,
          guardian_email: guardianEmail.trim() || null,
          guardian_occupation: guardianOccupation || null,
          guardian_address: guardianAddress || null,
          medical_condition: medicalCondition || null,
          admission_number: admission_number || undefined,
          stream: stream || null,
          previous_school: previousSchool || null,
          admission_date: admissionDate,
          boarding_type: boardingType,
          enrollment_fee: enrollmentFee ? Number(enrollmentFee) : null,
          payment_status: paymentStatus,
          expected_fee_amount: expectedFeeAmount ?? (expectedFee ? Number(expectedFee) : null),
          fee_discount_percent: percent > 0 ? percent : undefined,
        })
        .select('student_id')
        .single();

      if (insertError) {
        setError(formatStudentSaveError(insertError));
        return;
      }
      const studentId = inserted?.student_id;
      if (!studentId) throw new Error('Student created but no ID returned.');

      if (guardianName.trim() && schoolId) {
        const linkRes = await ensureParentLinkForStudent({
          student_id: studentId,
          school_id: schoolId,
          name: guardianName.trim(),
          email: guardianEmail.trim() || undefined,
          phone: guardianPhone.trim() || undefined,
          relationship: guardianRelationship.trim() || undefined,
        });
        if (!linkRes.ok) {
          toast.warning(
            `Student saved, but linking the parent failed: ${linkRes.error || 'Unknown error'}. Guardian details are stored on the student; you can fix the link from Parents or support.`
          );
        }
      }

      if (initialNum > 0) {
        await supabase.from('payments').insert({
          student_id: studentId,
          school_id: schoolId,
          amount: initialNum,
          payment_method: 'Cash',
          description: 'Initial tuition payment',
          status: 'Approved',
        });
      }

      await createMissedExamRecordsForNewStudent(schoolId!, studentId, currentClass);

      if (profilePhoto) {
        try {
          const base64String = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const result = e.target?.result as string;
              if (result) resolve(result);
              else reject(new Error('Failed to convert file to base64'));
            };
            reader.onerror = () => reject(new Error('FileReader error'));
            reader.readAsDataURL(profilePhoto);
          });
          await supabase.from('student_photos').insert({
            student_id: studentId,
            school_id: schoolId,
            photo_url: base64String,
            photo_filename: profilePhoto.name,
            photo_size: profilePhoto.size,
            photo_type: profilePhoto.type,
            is_primary: true,
          });
        } catch (photoErr) {
          console.error('Photo upload failed:', photoErr);
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['admin', 'students', user?.id] });
      toast.success('Student saved. Send a portal invitation from User Management when you are ready.');
      navigate('/dashboard/admin/students');
    } catch (err: unknown) {
      setError(formatStudentSaveError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSection = (key: string) => {
    setOpenSections((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500';
  const labelClass = 'mb-1 block text-sm font-medium text-gray-700';

  if (isLoading && !data) {
    return (
      <AdminPageWrapper title="Add Student">
        <div className="flex items-center justify-center py-12 text-gray-500">Loading...</div>
      </AdminPageWrapper>
    );
  }

  if (!schoolId) {
    return (
      <AdminPageWrapper title="Add Student">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          You are not linked to a school. Please contact support.
        </div>
      </AdminPageWrapper>
    );
  }

  return (
    <AdminPageWrapper title="Add Student">
      <div className="max-w-5xl w-full space-y-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/students')}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Students
          </button>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 whitespace-pre-wrap">
              {error}
            </div>
          )}

          <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
            Portal logins are not created here. Enter a real email for the student (and parents below). After saving, use{' '}
            <Link
              to="/dashboard/admin/accounts"
              className="font-medium text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
            >
              User Management
            </Link>{' '}
            to send invitations — they only set a password when they accept.
          </p>

          <Section id="personal" title="Personal information" isOpen={openSections.includes('personal')} onToggle={toggleSection}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>First name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. John"
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Middle name</label>
                <input
                  type="text"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  className={inputClass}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className={labelClass}>Last name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Doe"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Gender</label>
                <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputClass}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Date of birth</label>
                <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Nationality</label>
                <input
                  type="text"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Ugandan"
                />
              </div>
              <div>
                <label className={labelClass}>Religion</label>
                <input
                  type="text"
                  value={religion}
                  onChange={(e) => setReligion(e.target.value)}
                  className={inputClass}
                  placeholder="Optional"
                />
              </div>
            </div>
          </Section>

          <Section id="contact" title="Contact & address" isOpen={openSections.includes('contact')} onToggle={toggleSection}>
            <div>
              <label className={labelClass}>Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={inputClass}
                placeholder="Home address (or leave blank to use guardian address)"
              />
              <p className="mt-1 text-xs text-gray-500">Student address defaults to guardian address if left blank.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>City / District</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Kampala"
                />
              </div>
              <div>
                <label className={labelClass}>Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Uganda"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>
                  Student email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  className={inputClass}
                  placeholder="real address used for invitations"
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <label className={labelClass}>Student phone</label>
                <input
                  type="text"
                  value={studentPhone}
                  onChange={(e) => setStudentPhone(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. 0700123456"
                />
              </div>
            </div>
          </Section>

          <Section id="guardian" title="Parent / Guardian" isOpen={openSections.includes('guardian')} onToggle={toggleSection}>
            <div>
              <label className={labelClass}>Full name</label>
              <input
                type="text"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                className={inputClass}
                placeholder="e.g. Jane Doe"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Relationship</label>
                <select
                  value={guardianRelationship}
                  onChange={(e) => setGuardianRelationship(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input
                  type="text"
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. 0700123456"
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>
                Email {guardianName.trim() ? <span className="text-red-500">*</span> : <span className="text-gray-400 font-normal">(required if guardian name is filled)</span>}
              </label>
              <input
                type="email"
                value={guardianEmail}
                onChange={(e) => setGuardianEmail(e.target.value)}
                className={inputClass}
                placeholder="e.g. guardian@example.com"
              />
            </div>
            <div>
              <label className={labelClass}>Occupation</label>
              <input
                type="text"
                value={guardianOccupation}
                onChange={(e) => setGuardianOccupation(e.target.value)}
                className={inputClass}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className={labelClass}>Guardian address (if different)</label>
              <input
                type="text"
                value={guardianAddress}
                onChange={(e) => setGuardianAddress(e.target.value)}
                className={inputClass}
                placeholder="Optional"
              />
            </div>
          </Section>

          <Section id="academic" title="Academic information" isOpen={openSections.includes('academic')} onToggle={toggleSection}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Class <span className="text-red-500">*</span></label>
                <select
                  value={currentClass}
                  onChange={(e) => setCurrentClass(e.target.value)}
                  className={inputClass}
                  required
                >
                  {classOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Boarding type</label>
                <select
                  value={boardingType}
                  onChange={(e) => setBoardingType(e.target.value as 'Day Scholar' | 'Boarding')}
                  className={inputClass}
                >
                  <option value="Day Scholar">Day Scholar</option>
                  <option value="Boarding">Boarding</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Stream / Section</label>
                <input
                  type="text"
                  value={stream}
                  onChange={(e) => setStream(e.target.value)}
                  className={inputClass}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className={labelClass}>Previous school</label>
                <input
                  type="text"
                  value={previousSchool}
                  onChange={(e) => setPreviousSchool(e.target.value)}
                  className={inputClass}
                  placeholder="If transfer"
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Admission date <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={admissionDate}
                onChange={(e) => setAdmissionDate(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-sm font-medium text-gray-700">Admission number</p>
              <p className="mt-1 text-xs text-gray-600">
                Auto-generated when you save. Format: <strong>SCHOOL-YEAR-MONTH-NUMBER</strong> (e.g. KPS-2026-02-001).
                The database function <code className="bg-gray-200 px-1 rounded">generate_admission_number</code> uses
                school abbreviation, admission date, and the next sequence for that school/month.
              </p>
              {generatedAdmNo && (
                <p className="mt-2 text-sm text-green-700 font-medium">Generated: {generatedAdmNo}</p>
              )}
            </div>
          </Section>

          <Section id="fees" title="Fees & finance" isOpen={openSections.includes('fees')} onToggle={toggleSection}>
            <p className="text-xs text-gray-500 mb-2">
              Tuition is auto-filled from Financial Settings when class and boarding type are set. You can add a discount/bursary and optional initial payment.
            </p>
            <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3">
              <label className={labelClass}>Discount / Bursary</label>
              <div className="flex flex-wrap gap-2">
                {[0, 10, 25, 50, 75, 100].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setDiscountPercent(p)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                      discountPercent === p ? 'bg-green-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {p === 0 ? 'None' : p === 100 ? '100%' : `${p}%`}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <label className="text-xs text-gray-600">Custom %:</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                  className="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Enrollment / Registration fee</label>
                <input
                  type="number"
                  min={0}
                  value={enrollmentFee}
                  onChange={(e) => setEnrollmentFee(e.target.value)}
                  className={inputClass}
                  placeholder={admissionFee > 0 ? String(admissionFee) : ''}
                />
              </div>
              <div>
                <label className={labelClass}>Admission fee status</label>
                <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className={inputClass}>
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Tuition / Fee amount due</label>
                <input
                  type="number"
                  min={0}
                  value={expectedFee}
                  onChange={(e) => setExpectedFee(e.target.value)}
                  className={inputClass}
                  placeholder="Auto from fee structure"
                />
              </div>
              <div>
                <label className={labelClass}>Initial payment (optional)</label>
                <input
                  type="number"
                  min={0}
                  value={initialPayment}
                  onChange={(e) => setInitialPayment(e.target.value)}
                  className={inputClass}
                  placeholder="0"
                />
              </div>
            </div>
          </Section>

          <Section id="medical" title="Medical" isOpen={openSections.includes('medical')} onToggle={toggleSection}>
            <label className={labelClass}>Medical condition / allergies / notes</label>
            <textarea
              value={medicalCondition}
              onChange={(e) => setMedicalCondition(e.target.value)}
              className={inputClass}
              rows={3}
              placeholder="Optional"
            />
          </Section>

          <Section id="photo" title="Student photo (passport)" isOpen={openSections.includes('photo')} onToggle={toggleSection}>
            <p className="text-xs text-gray-500 mb-2">
              Upload a passport-style photo. It will be compressed and stored like the old system (used in reports and profile).
            </p>
            <ImageUpload
              onImageSelect={(file) => {
                setProfilePhoto(file);
                setUploadError(null);
              }}
              onError={(err) => {
                setUploadError(err);
                setProfilePhoto(null);
              }}
              maxSizeKB={500}
              maxWidth={600}
              maxHeight={600}
              placeholder="Upload student passport photo"
            />
            {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}
          </Section>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? 'Adding…' : 'Add Student'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/admin/students')}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </AdminPageWrapper>
  );
}
