import { useState, useEffect, useMemo, type ChangeEvent, type ComponentType, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addStudentSchoolQueryKey,
  addStudentSchoolStaleOptions,
  fetchAddStudentSchoolContext,
} from '@/pages/admin/students/addStudentSchoolQuery';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  Camera,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Heart,
  MapPin,
  UserCircle2,
  Users,
} from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import { createMissedExamRecordsForNewStudent } from '@/lib/examResultsUtils';
import { useToast } from '@/components/Toast';
import { ensureParentLinkForStudent } from '@/lib/ensureParentLink';
import { isValidRealEmail } from '@/lib/realEmail';
import { formatStudentSaveError } from '@/lib/supabaseError';
import { adminQueryKeys } from '@/pages/admin/api/adminQueryKeys';

/** East Africa–focused list; “Other” enables manual entry. */
const EAC_COUNTRIES = [
  'Uganda',
  'Kenya',
  'Tanzania',
  'Rwanda',
  'Burundi',
  'South Sudan',
  'Ethiopia',
  'Somalia',
  'Eritrea',
  'Djibouti',
  'Democratic Republic of the Congo',
  'Malawi',
  'Zambia',
] as const;

const COUNTRY_CUSTOM = '__custom__';

/** Nationality labels aligned with East African / regional countries; custom text if not listed. */
const NATIONALITY_CUSTOM = '__nat_custom__';
const EAC_NATIONALITIES = [
  'Ugandan',
  'Kenyan',
  'Tanzanian',
  'Rwandan',
  'Burundian',
  'South Sudanese',
  'Ethiopian',
  'Somali',
  'Eritrean',
  'Djiboutian',
  'Congolese (DRC)',
  'Malawian',
  'Zambian',
] as const;

const NURSERY_PRIMARY_CLASSES = [
  'Baby Class',
  'Middle Class',
  'Top Class',
  ...Array.from({ length: 7 }, (_, i) => `Primary ${i + 1}`),
];

const SECONDARY_CLASSES = Array.from({ length: 6 }, (_, i) => `Senior ${i + 1}`);

/** Native `<select>` with visible chevron; avoids unreadable OS dropdown styling in dark mode when paired with `selectFieldClass`. */
function SelectField({
  id,
  value,
  onChange,
  children,
  className,
  disabled,
  required,
  'aria-label': ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  children: ReactNode;
  className: string;
  disabled?: boolean;
  required?: boolean;
  'aria-label'?: string;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        aria-label={ariaLabel}
        className={className}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400"
        aria-hidden
      />
    </div>
  );
}

function Section({
  id,
  title,
  icon: Icon,
  isOpen,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  isOpen: boolean;
  onToggle: (key: string) => void;
  children: ReactNode;
}) {
  return (
    <div className={`${adminCardClass} !p-0 overflow-hidden`}>
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-emerald-500/5 dark:hover:bg-white/5 sm:px-5"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-base font-semibold ac-text-primary">{title}</span>
        </span>
        {isOpen ? (
          <ChevronDown className="h-5 w-5 shrink-0 text-[var(--ac-text-muted)]" />
        ) : (
          <ChevronRight className="h-5 w-5 shrink-0 text-[var(--ac-text-muted)]" />
        )}
      </button>
      {isOpen && (
        <div className="space-y-4 border-t border-[var(--ac-border)] px-4 py-5 sm:px-5">{children}</div>
      )}
    </div>
  );
}

export type AddStudentFormProps = {
  mode: 'page' | 'modal';
  onCompleted?: () => void;
  onCancel?: () => void;
};

export function AddStudentForm({ mode, onCompleted, onCancel }: AddStudentFormProps) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  // Personal
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('');
  /** Date of birth — browser calendar picker (`input type="date"`). */
  const [dob, setDob] = useState('');
  const [nationalityChoice, setNationalityChoice] = useState('');
  const [nationalityCustomText, setNationalityCustomText] = useState('');
  const [religion, setReligion] = useState('');

  // Contact & Address
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [countryChoice, setCountryChoice] = useState('');
  const [countryCustomText, setCountryCustomText] = useState('');
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

  const { dobMin, dobMax } = useMemo(() => {
    const t = new Date();
    const maxD = new Date(t);
    maxD.setFullYear(maxD.getFullYear() - 3);
    const minD = new Date(t);
    minD.setFullYear(minD.getFullYear() - 40);
    return { dobMin: minD.toISOString().slice(0, 10), dobMax: maxD.toISOString().slice(0, 10) };
  }, []);

  const { data, isPending } = useQuery({
    queryKey: addStudentSchoolQueryKey(user?.id ?? ''),
    queryFn: () => fetchAddStudentSchoolContext(user!.id),
    enabled: !!user?.id,
    ...addStudentSchoolStaleOptions,
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
    if (trimStudentEmail && !isValidRealEmail(trimStudentEmail)) {
      setError('If you enter a student email, use a valid address (not a placeholder).');
      return;
    }
    const trimGuardianEmail = guardianEmail.trim();
    if (trimGuardianEmail && !isValidRealEmail(trimGuardianEmail)) {
      setError('If you enter a parent/guardian email, use a valid address.');
      return;
    }
    setSubmitting(true);
    try {
      const resolvedCountry =
        countryChoice === COUNTRY_CUSTOM ? countryCustomText.trim() : countryChoice.trim();
      const resolvedNationality =
        nationalityChoice === NATIONALITY_CUSTOM
          ? nationalityCustomText.trim()
          : nationalityChoice.trim();

      // Admission number: DB trigger assigns in the same transaction as INSERT (avoids
      // duplicate numbers when RPC + INSERT were separate transactions).

      const student_email = trimStudentEmail || null;

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
          nationality: resolvedNationality || null,
          religion: religion || null,
          address: studentAddress,
          city: city || null,
          country: resolvedCountry || null,
          student_phone: studentPhone || null,
          student_email,
          guardian_name: guardianName || null,
          guardian_relationship: guardianRelationship || null,
          guardian_phone: guardianPhone || null,
          guardian_email: trimGuardianEmail || null,
          guardian_occupation: guardianOccupation || null,
          guardian_address: guardianAddress || null,
          medical_condition: medicalCondition || null,
          stream: stream || null,
          previous_school: previousSchool || null,
          admission_date: admissionDate,
          boarding_type: boardingType,
          enrollment_fee: enrollmentFee ? Number(enrollmentFee) : null,
          payment_status: paymentStatus,
          expected_fee_amount: expectedFeeAmount ?? (expectedFee ? Number(expectedFee) : null),
          fee_discount_percent: percent > 0 ? percent : undefined,
        })
        .select('student_id, admission_number')
        .single();

      if (insertError) {
        setError(formatStudentSaveError(insertError));
        return;
      }
      const admission_number = inserted?.admission_number ?? '';
      setGeneratedAdmNo(admission_number || null);
      const studentId = inserted?.student_id;
      if (!studentId) throw new Error('Student created but no ID returned.');

      if (guardianName.trim() && schoolId) {
        const linkRes = await ensureParentLinkForStudent({
          student_id: studentId,
          school_id: schoolId,
          name: guardianName.trim(),
          email: trimGuardianEmail || undefined,
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

      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.studentsDesign(user!.id) });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'students', user?.id] });
      toast.success(
        'Student saved. Add emails later if needed — invite portal users from User Management when ready.'
      );
      onCompleted?.();
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

  /** Solid light/dark backgrounds so native selects & date pickers stay readable (not white-on-white in dark UI). */
  const fieldBase =
    'w-full min-h-[48px] rounded-xl border border-slate-300 px-3 py-2.5 text-base shadow-sm ' +
    'bg-white text-slate-900 placeholder:text-slate-400 ' +
    'dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 ' +
    'focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/35';

  const inputClass = fieldBase;

  const selectFieldClass =
    `${fieldBase} cursor-pointer appearance-none pr-10 [color-scheme:light] dark:[color-scheme:dark]`;

  const dateFieldClass = `${fieldBase} [color-scheme:light] dark:[color-scheme:dark]`;

  const labelClass = 'mb-1.5 block text-sm font-medium ac-text-primary';
  const hintClass = 'mt-1 text-xs text-[var(--ac-text-muted)]';

  const todayIso = new Date().toISOString().slice(0, 10);

  const handleCancel = () => {
    onCancel?.();
  };

  if (isPending && !data) {
    const spinner = (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--ac-border)] border-t-emerald-500" />
      </div>
    );
    if (mode === 'modal') return spinner;
    return <AdminPageWrapper title="Add student">{spinner}</AdminPageWrapper>;
  }

  if (!schoolId) {
    const msg = (
      <div className={`${adminCardClass} border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100`}>
        You are not linked to a school. Please contact support.
      </div>
    );
    if (mode === 'modal') return msg;
    return <AdminPageWrapper title="Add student">{msg}</AdminPageWrapper>;
  }

  const formBody = (
    <>
      <div className={`mx-auto w-full max-w-3xl space-y-6 ${mode === 'page' ? 'pb-28 sm:pb-8' : 'pb-4'}`}>
        {mode === 'page' && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="ac-glass-btn-secondary inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium ac-text-primary"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              Back to Students
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="add-student-form space-y-5">
          <style>{`
            .dark .add-student-form input[type='date']::-webkit-calendar-picker-indicator {
              filter: invert(1);
              opacity: 0.8;
            }
          `}</style>
          {error && (
            <div
              className={`${adminCardClass} border-rose-500/40 bg-rose-500/10 text-sm text-rose-800 dark:text-rose-100 whitespace-pre-wrap`}
            >
              {error}
            </div>
          )}

          <Section
            id="personal"
            title="Personal information"
            icon={UserCircle2}
            isOpen={openSections.includes('personal')}
            onToggle={toggleSection}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass}>
                  First name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. John"
                  required
                  autoComplete="given-name"
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
                  autoComplete="additional-name"
                />
              </div>
              <div>
                <label className={labelClass}>
                  Last name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Doe"
                  required
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Gender</label>
                <SelectField value={gender} onChange={(e) => setGender(e.target.value)} className={selectFieldClass}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </SelectField>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="add-student-dob">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                    Date of birth
                  </span>
                </label>
                <input
                  id="add-student-dob"
                  type="date"
                  value={dob}
                  min={dobMin}
                  max={dobMax}
                  onChange={(e) => setDob(e.target.value)}
                  className={`${dateFieldClass} mt-1`}
                  aria-label="Date of birth"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Nationality</label>
                <SelectField
                  value={nationalityChoice}
                  onChange={(e) => {
                    const v = e.target.value;
                    setNationalityChoice(v);
                    if (v !== NATIONALITY_CUSTOM) setNationalityCustomText('');
                  }}
                  className={selectFieldClass}
                >
                  <option value="">Select nationality</option>
                  {EAC_NATIONALITIES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                  <option value={NATIONALITY_CUSTOM}>Other — type manually</option>
                </SelectField>
                {nationalityChoice === NATIONALITY_CUSTOM && (
                  <input
                    type="text"
                    value={nationalityCustomText}
                    onChange={(e) => setNationalityCustomText(e.target.value)}
                    className={`${inputClass} mt-2`}
                    placeholder="Type nationality"
                    autoComplete="off"
                  />
                )}
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

          <Section id="contact" title="Contact & address" icon={MapPin} isOpen={openSections.includes('contact')} onToggle={toggleSection}>
            <div>
              <label className={labelClass}>Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={inputClass}
                placeholder="Home address (or leave blank to use guardian address)"
              />
              <p className={hintClass}>Student address defaults to guardian address if left blank.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                <SelectField
                  value={countryChoice}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCountryChoice(v);
                    if (v !== COUNTRY_CUSTOM) setCountryCustomText('');
                  }}
                  className={selectFieldClass}
                >
                  <option value="">Select country</option>
                  {EAC_COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value={COUNTRY_CUSTOM}>Other — type manually</option>
                </SelectField>
                {countryChoice === COUNTRY_CUSTOM && (
                  <input
                    type="text"
                    value={countryCustomText}
                    onChange={(e) => setCountryCustomText(e.target.value)}
                    className={`${inputClass} mt-2`}
                    placeholder="Type country name"
                    autoComplete="country-name"
                  />
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Student email</label>
                <input
                  type="email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  className={inputClass}
                  placeholder="Optional"
                  autoComplete="email"
                  inputMode="email"
                />
              </div>
              <div>
                <label className={labelClass}>Student phone</label>
                <input
                  type="tel"
                  value={studentPhone}
                  onChange={(e) => setStudentPhone(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. 0700123456"
                  autoComplete="tel"
                  inputMode="tel"
                />
              </div>
            </div>
          </Section>

          <Section id="guardian" title="Parent / Guardian" icon={Users} isOpen={openSections.includes('guardian')} onToggle={toggleSection}>
            <div>
              <label className={labelClass}>Full name</label>
              <input
                type="text"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                className={inputClass}
                placeholder="Student name"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Relationship</label>
                <SelectField
                  value={guardianRelationship}
                  onChange={(e) => setGuardianRelationship(e.target.value)}
                  className={selectFieldClass}
                >
                  <option value="">Select</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                </SelectField>
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
              <label className={labelClass}>Parent / guardian email</label>
              <input
                type="email"
                value={guardianEmail}
                onChange={(e) => setGuardianEmail(e.target.value)}
                className={inputClass}
                placeholder="Optional"
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

          <Section
            id="academic"
            title="Academic information"
            icon={GraduationCap}
            isOpen={openSections.includes('academic')}
            onToggle={toggleSection}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Class <span className="text-rose-500">*</span>
                </label>
                <SelectField
                  value={currentClass}
                  onChange={(e) => setCurrentClass(e.target.value)}
                  className={selectFieldClass}
                  required
                  aria-label="Class"
                >
                  {classOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </SelectField>
              </div>
              <div>
                <label className={labelClass}>Boarding type</label>
                <SelectField
                  value={boardingType}
                  onChange={(e) => setBoardingType(e.target.value as 'Day Scholar' | 'Boarding')}
                  className={selectFieldClass}
                >
                  <option value="Day Scholar">Day Scholar</option>
                  <option value="Boarding">Boarding</option>
                </SelectField>
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
              <label className={labelClass}>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  Admission date <span className="text-rose-500">*</span>
                </span>
              </label>
              <input
                type="date"
                value={admissionDate}
                onChange={(e) => setAdmissionDate(e.target.value)}
                className={dateFieldClass}
                required
                min="2000-01-01"
                max={todayIso}
              />
            </div>
            <div className="rounded-xl border border-[var(--ac-border)] bg-emerald-500/5 p-4 dark:bg-emerald-500/10">
              <p className="text-sm font-medium ac-text-primary">Admission number</p>
              <p className="mt-1 text-xs leading-relaxed ac-text-secondary">
                Auto-generated when you save (same database transaction as the insert, so concurrent enrollments cannot collide).
                Format: <strong className="ac-text-primary">SCHOOL-YEAR-MONTH-NUMBER</strong> (e.g. KPS-2026-02-001). The function{' '}
                <code className="rounded bg-black/5 px-1 py-0.5 text-[11px] dark:bg-white/10">generate_admission_number</code> uses school abbreviation,
                admission date, and the next sequence for that school/month.
              </p>
              {generatedAdmNo && (
                <p className="mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">Generated: {generatedAdmNo}</p>
              )}
            </div>
          </Section>

          <Section id="fees" title="Fees & finance" icon={Banknote} isOpen={openSections.includes('fees')} onToggle={toggleSection}>
            <p className="mb-2 text-xs ac-text-secondary">
              Tuition is auto-filled from Financial Settings when class and boarding type are set. You can add a discount/bursary and optional initial payment.
            </p>
            <div className="rounded-xl border border-[var(--ac-border)] bg-white/50 p-4 dark:bg-white/5">
              <label className={labelClass}>Discount / Bursary</label>
              <div className="flex flex-wrap gap-2">
                {[0, 10, 25, 50, 75, 100].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setDiscountPercent(p)}
                    className={`min-h-[40px] rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                      discountPercent === p
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'border border-[var(--ac-border)] bg-white/80 ac-text-primary hover:bg-emerald-500/10 dark:bg-white/5'
                    }`}
                  >
                    {p === 0 ? 'None' : p === 100 ? '100%' : `${p}%`}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="text-xs ac-text-secondary">Custom %:</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                  className="w-20 rounded border border-[var(--ac-border)] bg-white/90 px-2 py-1.5 text-sm dark:bg-white/5"
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
                <SelectField value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className={selectFieldClass}>
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                </SelectField>
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

          <Section id="medical" title="Medical" icon={Heart} isOpen={openSections.includes('medical')} onToggle={toggleSection}>
            <label className={labelClass}>Medical condition / allergies / notes</label>
            <textarea
              value={medicalCondition}
              onChange={(e) => setMedicalCondition(e.target.value)}
              className={`${inputClass} min-h-[120px] resize-y`}
              rows={3}
              placeholder="Optional"
            />
          </Section>

          <Section id="photo" title="Student photo (passport)" icon={Camera} isOpen={openSections.includes('photo')} onToggle={toggleSection}>
            <p className="mb-2 text-xs ac-text-secondary">
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
            {uploadError && <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{uploadError}</p>}
          </Section>

          <div
            className={
              mode === 'modal'
                ? 'mt-6 border-t border-[var(--ac-border)] pt-4'
                : 'fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--ac-border)] bg-[var(--ac-page-bg)]/95 px-4 py-3 backdrop-blur-md sm:static sm:z-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none'
            }
          >
            <div className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="ac-glass-btn-secondary order-2 min-h-[48px] rounded-xl px-5 py-3 text-sm font-medium ac-text-primary sm:order-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="order-1 min-h-[48px] rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-50 sm:order-2 sm:min-w-[min(100%,200px)]"
              >
                {submitting ? 'Adding…' : 'Add student'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );

  if (mode === 'page') {
    return <AdminPageWrapper title="Add student">{formBody}</AdminPageWrapper>;
  }
  return formBody;
}
