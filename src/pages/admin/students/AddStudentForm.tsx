import { useState, useEffect, useMemo, useRef, Children, isValidElement, type ChangeEvent, type ComponentType, type ReactNode } from 'react';
import LiquidGlassSelect, { type GlassSelectOption } from '@/components/ui/LiquidGlassSelect';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addStudentSchoolQueryKey,
  addStudentSchoolStaleOptions,
  fetchAddStudentSchoolContext,
} from '@/pages/admin/students/addStudentSchoolQuery';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { enqueue, offlineDb } from '@/lib/offlineDb';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';
import {
  ArrowLeft,
  Award,
  Banknote,
  CalendarDays,
  Camera,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Heart,
  MapPin,
  UserCircle2,
} from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import { createMissedExamRecordsForNewStudent } from '@/lib/examResultsUtils';
import { useToast } from '@/components/Toast';
import { isValidRealEmail } from '@/lib/realEmail';
import { formatStudentSaveError } from '@/lib/supabaseError';
import { adminQueryKeys } from '@/pages/admin/api/adminQueryKeys';
import { isTertiarySchool } from '@/hooks/useSchoolType';
import { computeTertiaryProgress } from '@/features/tertiary/services/tertiaryProgress';
import { inferTertiaryAcademicStage } from '@/features/tertiary/services/tertiaryStageInference';

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

const CURRENT_YEAR = new Date().getFullYear();
const TERTIARY_INTAKE_YEARS = Array.from({ length: CURRENT_YEAR - 2000 + 1 }, (_, i) => CURRENT_YEAR - i);

const TERTIARY_AWARDS = [
  { code: 'CN', name: 'Certificate in Nursing (CN) — 2.5 Yrs' },
  { code: 'DN', name: 'Diploma in Nursing (DN) — 3.0 Yrs' },
  { code: 'CM', name: 'Certificate in Midwifery (CM) — 2.5 Yrs' },
  { code: 'DM', name: 'Diploma in Midwifery (DM) — 3.0 Yrs' },
];

export const TERTIARY_COURSES = [
  'Certificate in Nursing (CN)',
  'Diploma in Nursing (DN)',
  'Certificate in Midwifery (CM)',
  'Diploma in Midwifery (DM)',
  'CN – Year 1 Semester 1',
  'CN – Year 1 Semester 2',
  'CN – Year 2 Semester 1',
  'CN – Year 2 Semester 2',
  'CN – Year 3 Semester 1',
  'DN – Year 1 Semester 1',
  'DN – Year 1 Semester 2',
  'DN – Year 2 Semester 1',
  'DN – Year 2 Semester 2',
  'DN – Year 3 Semester 1',
  'DN – Year 3 Semester 2',
  'CM – Year 1 Semester 1',
  'CM – Year 1 Semester 2',
  'CM – Year 2 Semester 1',
  'CM – Year 2 Semester 2',
  'CM – Year 3 Semester 1',
  'DM – Year 1 Semester 1',
  'DM – Year 1 Semester 2',
  'DM – Year 2 Semester 1',
  'DM – Year 2 Semester 2',
  'DM – Year 3 Semester 1',
  'DM – Year 3 Semester 2',
];

function extractOptionLabel(children: ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) {
    return children.map((c) => (typeof c === 'string' || typeof c === 'number' ? String(c) : '')).join('');
  }
  return '';
}

/** Native `<select>` with visible chevron; in modal mode renders custom Apple LiquidGlassSelect. */
function SelectField({
  id,
  value,
  onChange,
  children,
  className,
  disabled,
  required,
  'aria-label': ariaLabel,
  isModal,
  direction = 'down',
}: {
  id?: string;
  value: string | number;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  children: ReactNode;
  className: string;
  disabled?: boolean;
  required?: boolean;
  'aria-label'?: string;
  isModal?: boolean;
  direction?: 'down' | 'up';
}) {
  const isFrosted = Boolean(isModal || className.includes('border-white'));

  if (isFrosted) {
    const rawOptions: GlassSelectOption[] = [];
    let placeholder: string | undefined = undefined;

    Children.toArray(children).forEach((child) => {
      if (isValidElement(child) && child.props) {
        const p = child.props as { value?: string | number; children?: ReactNode };
        const optVal = String(p.value ?? '');
        const optLabel = extractOptionLabel(p.children) || optVal;
        if (optVal === '' && !placeholder) {
          placeholder = optLabel;
        } else {
          rawOptions.push({ value: optVal, label: optLabel });
        }
      }
    });

    return (
      <LiquidGlassSelect
        value={String(value)}
        onChange={(val) => {
          onChange({ target: { value: val } } as unknown as ChangeEvent<HTMLSelectElement>);
        }}
        options={rawOptions}
        placeholder={placeholder}
        direction={direction}
        disabled={disabled}
      />
    );
  }

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

const SECTION_Z_INDEX: Record<string, string> = {
  personal: 'z-[35]',
  academic: 'z-[30]',
  fees: 'z-[25]',
  contact: 'z-[20]',
  medical: 'z-[15]',
  photo: 'z-[10]',
};

function Section({
  id,
  title,
  icon: Icon,
  isOpen,
  onToggle,
  isModal,
  children,
}: {
  id: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  isOpen: boolean;
  onToggle: (key: string) => void;
  isModal?: boolean;
  children: ReactNode;
}) {
  const zClass = isModal ? (SECTION_Z_INDEX[id] || 'z-10') : '';

  return (
    <div
      className={
        isModal
          ? `rounded-2xl border border-white/20 bg-black/25 backdrop-blur-sm text-white transition-all shadow-[inset_0_1px_2px_rgba(255,255,255,0.08)] relative ${zClass} focus-within:z-[50]`
          : `${adminCardClass} !p-0 overflow-hidden`
      }
    >
      <button
        type="button"
        onClick={() => onToggle(id)}
        className={
          isModal
            ? 'flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/10 active:bg-white/15 sm:px-5'
            : 'flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-emerald-500/5 dark:hover:bg-white/5 sm:px-5'
        }
      >
        <span className="flex min-w-0 items-center gap-3">
          <span
            className={
              isModal
                ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 border border-white/25 text-emerald-300 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]'
                : 'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400'
            }
          >
            <Icon className={isModal ? 'h-4 w-4' : 'h-5 w-5'} aria-hidden />
          </span>
          <span className={isModal ? 'text-sm font-bold text-white tracking-tight drop-shadow-sm' : 'text-base font-semibold ac-text-primary'}>
            {title}
          </span>
        </span>
        {isOpen ? (
          <ChevronDown className={isModal ? 'h-4 w-4 shrink-0 text-white/70' : 'h-5 w-5 shrink-0 text-[var(--ac-text-muted)]'} />
        ) : (
          <ChevronRight className={isModal ? 'h-4 w-4 shrink-0 text-white/70' : 'h-5 w-5 shrink-0 text-[var(--ac-text-muted)]'} />
        )}
      </button>
      {isOpen && (
        <div
          className={
            isModal
              ? 'space-y-4 border-t border-white/15 px-4 py-4 sm:px-5 text-white'
              : 'space-y-4 border-t border-[var(--ac-border)] px-4 py-5 sm:px-5'
          }
        >
          {children}
        </div>
      )}
    </div>
  );
}

function resolveFeeForClass({
  currentClass,
  isTertiary,
  tertiaryStageCode,
  tertiaryCourseCode,
  stageOptions,
  boardingType,
  feeByClass,
  boardingByClass,
}: {
  currentClass: string;
  isTertiary: boolean;
  tertiaryStageCode: string;
  tertiaryCourseCode: string;
  stageOptions: { code: string; label: string }[];
  boardingType: string;
  feeByClass: Record<string, number>;
  boardingByClass: Record<string, number>;
}): number {
  if (isTertiary && tertiaryStageCode === 'GRADUATED') {
    return 0;
  }
  const rawType = (boardingType || '').toLowerCase();
  const isResident = rawType.includes('board') || rawType === 'resident';
  const feeSource = isResident ? boardingByClass : feeByClass;
  if (!currentClass) return 0;

  // 1. Direct class match
  if (feeSource[currentClass] != null && feeSource[currentClass] > 0) {
    return feeSource[currentClass];
  }

  if (isTertiary) {
    const match = stageOptions.find((o) => o.code === tertiaryStageCode);
    const stageName = match ? match.label.split(' (')[0] : tertiaryStageCode;

    // 2. Course + Stage (e.g. 'CN – Year 1 Semester 1')
    const courseStageKey = `${tertiaryCourseCode} – ${stageName}`;
    if (feeSource[courseStageKey] != null && feeSource[courseStageKey] > 0) {
      return feeSource[courseStageKey];
    }

    // 3. Course code alone (e.g. 'CN')
    if (feeSource[tertiaryCourseCode] != null && feeSource[tertiaryCourseCode] > 0) {
      return feeSource[tertiaryCourseCode];
    }

    // 4. Course with full name (e.g. 'Certificate in Nursing (CN)')
    const fullNameEntry = Object.keys(feeSource).find(
      (k) => k.includes(`(${tertiaryCourseCode})`) && feeSource[k] > 0
    );
    if (fullNameEntry) {
      return feeSource[fullNameEntry];
    }
  }

  return 0;
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
  const [dob, setDob] = useState('');
  const [nationalityChoice, setNationalityChoice] = useState('');
  const [nationalityCustomText, setNationalityCustomText] = useState('');
  const [religion, setReligion] = useState('');
  const [city, setCity] = useState('');

  const [studentPhone, setStudentPhone] = useState('');
  const [studentEmail, setStudentEmail] = useState('');

  // Academic
  const [currentClass, setCurrentClass] = useState('');
  const [stream, setStream] = useState('');
  const [previousSchool, setPreviousSchool] = useState('');
  const [admissionDate, setAdmissionDate] = useState('');
  /** Tertiary identifiers */
  const [collegeRegNo, setCollegeRegNo] = useState('');
  const [uhpabIndexNo, setUhpabIndexNo] = useState('');
  const [nsinNo, setNsinNo] = useState('');
  /** Tertiary Smart Guided Academic Selector */
  const [tertiaryCourseCode, setTertiaryCourseCode] = useState<'CN' | 'CM' | 'DN' | 'DM'>('CN');
  const [tertiaryIntakeYear, setTertiaryIntakeYear] = useState<number>(() => new Date().getFullYear());
  const [tertiaryIntakeBatch, setTertiaryIntakeBatch] = useState<string>('March Intake');
  const [tertiaryStageCode, setTertiaryStageCode] = useState<string>('Y1S1');
  /** SchoolPay: must match the learner’s code on SchoolPay; used by sync/webhook to attribute fees to this student. */
  const [schoolpayPaymentCode, setSchoolpayPaymentCode] = useState('');
  const [boardingType, setBoardingType] = useState<string>('Non-Resident');

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
  const isTertiary = isTertiarySchool(schoolType);
  const classOptions = isTertiary
    ? TERTIARY_COURSES
    : schoolType === 'Secondary'
      ? SECONDARY_CLASSES
      : NURSERY_PRIMARY_CLASSES;

  const isDiploma = tertiaryCourseCode === 'DN' || tertiaryCourseCode === 'DM';
  const stageOptions = useMemo(() => {
    const list: { code: string; label: string }[] = [
      { code: 'Y1S1', label: 'Year 1 Semester 1 (Fresh Intake)' },
      { code: 'Y1S2', label: 'Year 1 Semester 2' },
      { code: 'Y2S1', label: 'Year 2 Semester 1' },
      { code: 'Y2S2', label: 'Year 2 Semester 2' },
      { code: 'Y3S1', label: isDiploma ? 'Year 3 Semester 1' : 'Year 3 Semester 1 (Certificate Final)' },
    ];
    if (isDiploma) {
      list.push({ code: 'Y3S2', label: 'Year 3 Semester 2 (Diploma Final)' });
    }
    list.push({ code: 'GRADUATED', label: 'Graduated / Completed All Semesters' });
    return list;
  }, [isDiploma]);

  const lastIntakeKeyRef = useRef<string>('');

  useEffect(() => {
    if (!isTertiary) return;
    const currentKey = `${tertiaryCourseCode}-${tertiaryIntakeYear}-${tertiaryIntakeBatch}`;
    if (lastIntakeKeyRef.current !== currentKey) {
      lastIntakeKeyRef.current = currentKey;
      const inferred = inferTertiaryAcademicStage(tertiaryCourseCode, tertiaryIntakeYear, tertiaryIntakeBatch);
      setTertiaryStageCode(inferred.stageCode);
      setAdmissionDate(inferred.suggestedAdmissionDate);
    }
  }, [isTertiary, tertiaryCourseCode, tertiaryIntakeYear, tertiaryIntakeBatch]);

  useEffect(() => {
    if (!isDiploma && tertiaryStageCode === 'Y3S2') {
      setTertiaryStageCode('Y3S1');
    }
  }, [isDiploma, tertiaryStageCode]);

  useEffect(() => {
    if (!isTertiary) return;
    const yrSuffix = String(tertiaryIntakeYear).slice(-2);
    const setNum = `Set ${yrSuffix}`;
    const autoStream = `${tertiaryIntakeBatch} (${setNum})`;
    setStream(autoStream);

    const isGrad = tertiaryStageCode === 'GRADUATED';
    if (isGrad) {
      setCurrentClass(`${tertiaryCourseCode}${yrSuffix} – Completed / Graduated`);
    } else {
      const match = stageOptions.find((o) => o.code === tertiaryStageCode);
      const stageName = match ? match.label.split(' (')[0] : tertiaryStageCode;
      setCurrentClass(`${tertiaryCourseCode}${yrSuffix} – ${stageName}`);
    }

    const randomSeq = String(Math.floor(100 + Math.random() * 900));
    setCollegeRegNo((prev) => {
      if (!prev || /^(CN|DN|CM|DM)\/\d{4}\/\d{3}$/.test(prev)) {
        return `${tertiaryCourseCode}/${tertiaryIntakeYear}/${randomSeq}`;
      }
      return prev;
    });
  }, [isTertiary, tertiaryCourseCode, tertiaryIntakeYear, tertiaryIntakeBatch, tertiaryStageCode, stageOptions]);

  const tertiaryProgressInfo = useMemo(() => {
    if (!isTertiary) return null;
    return computeTertiaryProgress(currentClass);
  }, [isTertiary, currentClass]);

  const expectedGraduationDate = useMemo(() => {
    if (!isTertiary) return '';
    const isDip = tertiaryCourseCode === 'DN' || tertiaryCourseCode === 'DM';
    const isMarch = tertiaryIntakeBatch.toLowerCase().includes('march');
    if (isDip) {
      const gradYear = tertiaryIntakeYear + 3;
      return isMarch ? `June ${gradYear}` : `December ${gradYear}`;
    } else {
      const gradYear = isMarch ? tertiaryIntakeYear + 2 : tertiaryIntakeYear + 3;
      return isMarch ? `September ${gradYear}` : `February ${gradYear}`;
    }
  }, [isTertiary, tertiaryCourseCode, tertiaryIntakeYear, tertiaryIntakeBatch]);

  useEffect(() => {
    if (!isTertiary && classOptions.length && !currentClass) setCurrentClass(classOptions[0]);
  }, [isTertiary, classOptions.length, currentClass]);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (!admissionDate) setAdmissionDate(today);
  }, []);

  useEffect(() => {
    if (isTertiary && tertiaryStageCode === 'GRADUATED') {
      setEnrollmentFee('');
      return;
    }
    if (admissionFee > 0 && !enrollmentFee) {
      if (!isTertiary || tertiaryStageCode === 'Y1S1') {
        setEnrollmentFee(String(admissionFee));
      }
    }
  }, [admissionFee, isTertiary, tertiaryStageCode, enrollmentFee]);

  // Auto-fill expected fee from class, tertiary programme, boarding type & discount
  useEffect(() => {
    if (!currentClass) return;
    if (isTertiary && tertiaryStageCode === 'GRADUATED') {
      setExpectedFee('0');
      return;
    }
    const fee = resolveFeeForClass({
      currentClass,
      isTertiary,
      tertiaryStageCode,
      tertiaryCourseCode,
      stageOptions,
      boardingType,
      feeByClass,
      boardingByClass,
    });
    if (fee > 0) {
      const pct = Math.min(100, Math.max(0, Number(discountPercent) || 0));
      const discounted = pct > 0 ? Math.round(fee * (1 - pct / 100)) : fee;
      setExpectedFee(String(discounted));
    } else if (isTertiary && tertiaryStageCode === 'GRADUATED') {
      setExpectedFee('0');
    } else {
      setExpectedFee('');
    }
  }, [
    currentClass,
    isTertiary,
    tertiaryStageCode,
    tertiaryCourseCode,
    stageOptions,
    boardingType,
    feeByClass,
    boardingByClass,
    discountPercent,
  ]);

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
    setSubmitting(true);

    // Offline: save to IndexedDB and queue for sync
    if (!navigator.onLine) {
      if (!schoolId) { setError('School not loaded.'); setSubmitting(false); return; }
      try {
        const resolvedNat = nationalityChoice === 'Other' ? nationalityCustomText.trim() : nationalityChoice.trim();
        const nm = [trimFirst, middleName.trim(), trimLast].filter(Boolean).join(' ');
        const pct = Math.min(100, Math.max(0, Number(discountPercent) || 0));
        const baseFee = resolveFeeForClass({
          currentClass,
          isTertiary,
          tertiaryStageCode,
          tertiaryCourseCode,
          stageOptions,
          boardingType,
          feeByClass,
          boardingByClass,
        });
        const expFee = baseFee > 0 ? Math.round(baseFee * (1 - pct / 100)) : expectedFee ? Number(expectedFee) : null;
        const tempId = crypto.randomUUID();
        const isGrad = isTertiary && tertiaryStageCode === 'GRADUATED';
        const resolvedStatus = isGrad ? 'graduated' : 'active';
        const resolvedPaymentStatus = isGrad ? 'Completed' : paymentStatus;
        const resolvedExpectedFee = isGrad ? 0 : expFee;

        const row = {
          school_id: schoolId as string,
          name: nm,
          first_name: trimFirst,
          middle_name: middleName.trim() || null,
          last_name: trimLast,
          current_class: currentClass,
          status: resolvedStatus,
          gender: gender || null,
          date_of_birth: dob || null,
          nationality: resolvedNat || null,
          religion: religion || null,
          city: city || null,
          student_phone: studentPhone || null,
          student_email: studentEmail.trim() || null,
          medical_condition: medicalCondition || null,
          stream: stream || null,
          previous_school: previousSchool || null,
          admission_date: admissionDate,
          boarding_type: boardingType,
          enrollment_fee: isGrad ? null : (enrollmentFee ? Number(enrollmentFee) : null),
          payment_status: resolvedPaymentStatus,
          expected_fee_amount: resolvedExpectedFee,
          fee_discount_percent: pct > 0 ? pct : null,
          schoolpay_payment_code: schoolpayPaymentCode.trim() || null,
          admission_number: isTertiary && collegeRegNo.trim() ? collegeRegNo.trim() : null,
          _temp_id: tempId,
        };
        // Add to local cache so the student appears in the list immediately
        await offlineDb.students.put({
          student_id: tempId,
          school_id: schoolId as string,
          student_name: nm,
          class_name: currentClass,
          admission_number: isTertiary && collegeRegNo.trim() ? collegeRegNo.trim() : null,
          status: resolvedStatus,
          gender: gender || null,
          photo_url: null,
          parent_name: null,
          parent_phone: null,
        });
        await enqueue({
          action: { type: 'new_student', table: 'students', rows: [row] },
          schoolId: schoolId as string,
          createdAt: Date.now(),
        });
        toast.success(isGrad ? 'Graduated student saved offline.' : 'Student saved offline — will sync when connected.');
        if (mode === 'modal') { onCompleted?.(); } else { onCancel?.(); }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save offline.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      const resolvedNationality =
        nationalityChoice === NATIONALITY_CUSTOM
          ? nationalityCustomText.trim()
          : nationalityChoice.trim();

      const student_email = trimStudentEmail || null;

      const name = [trimFirst, middleName.trim(), trimLast].filter(Boolean).join(' ');
      const percent = Math.min(100, Math.max(0, Number(discountPercent) || 0));
      const baseFee = resolveFeeForClass({
        currentClass,
        isTertiary,
        tertiaryStageCode,
        tertiaryCourseCode,
        stageOptions,
        boardingType,
        feeByClass,
        boardingByClass,
      });
      const expectedFeeAmount =
        baseFee > 0 ? Math.round(baseFee * (1 - percent / 100)) : expectedFee ? Number(expectedFee) : null;

      const isGrad = isTertiary && tertiaryStageCode === 'GRADUATED';
      const resolvedStatus = isGrad ? 'graduated' : 'active';
      const resolvedPaymentStatus = isGrad ? 'Completed' : paymentStatus;
      const resolvedExpectedFee = isGrad ? 0 : (expectedFeeAmount ?? (expectedFee ? Number(expectedFee) : null));

      const studentPayload: Record<string, unknown> = {
        school_id: schoolId,
        name,
        current_class: currentClass,
        status: resolvedStatus,
        first_name: trimFirst,
        middle_name: middleName.trim() || null,
        last_name: trimLast,
        gender: gender || null,
        date_of_birth: dob || null,
        nationality: resolvedNationality || null,
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
        enrollment_fee: isGrad ? null : (enrollmentFee ? Number(enrollmentFee) : null),
        payment_status: resolvedPaymentStatus,
        expected_fee_amount: resolvedExpectedFee,
        fee_discount_percent: percent > 0 ? percent : undefined,
        schoolpay_payment_code: schoolpayPaymentCode.trim() ? schoolpayPaymentCode.trim() : null,
      };

      if (isTertiary && collegeRegNo.trim()) {
        studentPayload.admission_number = collegeRegNo.trim();
      }

      if (isTertiary && currentClass && schoolId) {
        // Ensure fee structure exists for this specific cohort class (e.g. CN26 – Year 1 Semester 1)
        // so database registration validation trigger accepts the student immediately.
        const baseFeeDay = resolveFeeForClass({
          currentClass,
          isTertiary,
          tertiaryStageCode,
          tertiaryCourseCode,
          stageOptions,
          boardingType: 'Day',
          feeByClass,
          boardingByClass,
        });
        const baseFeeBoarding = resolveFeeForClass({
          currentClass,
          isTertiary,
          tertiaryStageCode,
          tertiaryCourseCode,
          stageOptions,
          boardingType: 'Resident',
          feeByClass,
          boardingByClass,
        });

        if (baseFeeDay > 0 || baseFeeBoarding > 0) {
          try {
            await supabase.from('school_fee_structure').upsert(
              {
                school_id: schoolId,
                class_name: currentClass,
                tuition_amount: baseFeeDay,
                boarding_tuition_amount: baseFeeBoarding || baseFeeDay,
              },
              { onConflict: 'school_id,class_name' }
            );
          } catch {
            // Non-blocking fallback
          }
        }
      }

      const { data: inserted, error: insertError } = await supabase
        .from('students')
        .insert(studentPayload)
        .select('student_id, admission_number')
        .single();

      if (insertError) {
        setError(formatStudentSaveError(insertError));
        return;
      }
      const studentId = inserted?.student_id;
      if (!studentId) throw new Error('Student created but no ID returned.');

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

      if (!isGrad) {
        await createMissedExamRecordsForNewStudent(schoolId!, studentId, currentClass);
      }

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
            photo_type: profilePhoto.type || 'image/jpeg',
            is_primary: true,
          });
        } catch (photoErr) {
          console.error('Photo upload failed:', photoErr);
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['admin', 'students-design', user!.id] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'students', user?.id] });

      toast.success(
        'Student saved. Link parents from Add parent when ready; invite portal users from User Management when ready.'
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

  const isModal = mode === 'modal';

  /** Solid light/dark backgrounds so native selects & date pickers stay readable (not white-on-white in dark UI). */
  const fieldBase =
    'w-full min-h-[48px] rounded-xl border border-slate-300 px-3 py-2.5 text-base shadow-sm ' +
    'bg-white text-slate-900 placeholder:text-slate-400 ' +
    'dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 ' +
    'focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/35';

  const modalInputClass =
    'w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/20 hover:border-white/35 focus:border-white/70 focus:bg-black/35 backdrop-blur-sm text-white placeholder-white/50 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition';

  const inputClass = isModal ? modalInputClass : fieldBase;

  const selectFieldClass = isModal
    ? 'w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/40 hover:border-white/35 focus:border-white/70 focus:bg-black/50 backdrop-blur-sm text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition cursor-pointer appearance-none pr-10 [color-scheme:dark]'
    : `${fieldBase} cursor-pointer appearance-none pr-10 [color-scheme:light] dark:[color-scheme:dark]`;

  const dateFieldClass = isModal
    ? 'w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/35 backdrop-blur-sm text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition [color-scheme:dark]'
    : `${fieldBase} [color-scheme:light] dark:[color-scheme:dark]`;

  const labelClass = isModal
    ? 'mb-1 block text-[11px] font-bold text-white/90 uppercase tracking-wider drop-shadow-sm'
    : 'mb-1.5 block text-sm font-medium ac-text-primary';

  const hintClass = isModal
    ? 'mt-1 text-[11px] text-white/70'
    : 'mt-1 text-xs text-[var(--ac-text-muted)]';

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
      <div
        className={
          isModal
            ? 'p-4 rounded-2xl border border-amber-500/30 bg-amber-500/15 text-xs text-amber-200'
            : `${adminCardClass} border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100`
        }
      >
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
              className={
                isModal
                  ? 'p-3 rounded-2xl border border-rose-500/40 bg-rose-500/15 text-xs text-rose-200 whitespace-pre-wrap'
                  : `${adminCardClass} border-rose-500/40 bg-rose-500/10 text-sm text-rose-800 dark:text-rose-100 whitespace-pre-wrap`
              }
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
            isModal={isModal}
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
              <div>
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
          </Section>

          <Section
            id="academic"
            title="Academic information"
            icon={GraduationCap}
            isOpen={openSections.includes('academic')}
            onToggle={toggleSection}
            isModal={isModal}
          >
            {isTertiary ? (
              <div className="space-y-3.5">
                <div className={isModal ? "space-y-3 p-3.5 bg-black/25 rounded-2xl border border-white/20 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)]" : "space-y-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60"}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Course / Award */}
                    <div>
                      <label className={labelClass}>
                        Course / Award <span className="text-rose-500">*</span>
                      </label>
                      <SelectField
                        value={tertiaryCourseCode}
                        onChange={(e) => setTertiaryCourseCode(e.target.value as 'CN' | 'CM' | 'DN' | 'DM')}
                        className={selectFieldClass}
                        required
                      >
                        {TERTIARY_AWARDS.map((c) => (
                          <option key={c.code} value={c.code} className="bg-slate-900 text-white">
                            {c.name}
                          </option>
                        ))}
                      </SelectField>
                    </div>

                    {/* Intake Year */}
                    <div>
                      <label className={labelClass}>
                        Intake Year <span className="text-rose-500">*</span>
                      </label>
                      <SelectField
                        value={tertiaryIntakeYear}
                        onChange={(e) => setTertiaryIntakeYear(Number(e.target.value))}
                        className={selectFieldClass}
                        required
                      >
                        {TERTIARY_INTAKE_YEARS.map((yr) => (
                          <option key={yr} value={yr} className="bg-slate-900 text-white">
                            {yr} Intake
                          </option>
                        ))}
                      </SelectField>
                    </div>

                    {/* Intake Session */}
                    <div>
                      <label className={labelClass}>
                        Intake Session
                      </label>
                      <SelectField
                        value={tertiaryIntakeBatch}
                        onChange={(e) => setTertiaryIntakeBatch(e.target.value)}
                        className={selectFieldClass}
                      >
                        <option value="March Intake" className="bg-slate-900 text-white">March Intake (Set {String(tertiaryIntakeYear).slice(-2)})</option>
                        <option value="August Intake" className="bg-slate-900 text-white">August Intake (Set {String(tertiaryIntakeYear).slice(-2)})</option>
                      </SelectField>
                    </div>

                    {/* Academic Stage & Standing (with auto-inference) */}
                    <div>
                      <label className={labelClass}>
                        Academic Stage & Standing <span className="text-rose-500">*</span>
                      </label>
                      <SelectField
                        value={tertiaryStageCode}
                        onChange={(e) => setTertiaryStageCode(e.target.value)}
                        className={selectFieldClass}
                        required
                      >
                        {stageOptions.map((st) => (
                          <option key={st.code} value={st.code} className="bg-slate-900 text-white">
                            {st.label}
                          </option>
                        ))}
                      </SelectField>
                    </div>
                  </div>

                  {/* Smart Cohort Summary Card */}
                  <div className={isModal ? "flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-xs text-white" : "flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-800/40 text-xs"}>
                    <div className="flex items-center gap-2">
                      <GraduationCap className={isModal ? "w-4 h-4 text-emerald-300 shrink-0" : "w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0"} />
                      <span className={isModal ? "font-bold text-white" : "font-semibold text-slate-900 dark:text-slate-100"}>{currentClass}</span>
                      <span className={isModal ? "text-white/40" : "text-slate-400 dark:text-slate-500"}>•</span>
                      <span className={isModal ? "text-white/80" : "text-slate-600 dark:text-slate-400"}>{stream}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full font-medium text-[11px] ${
                        tertiaryStageCode === 'GRADUATED'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                          : isModal
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                            : 'bg-teal-500/15 text-teal-700 dark:text-teal-400 border border-teal-500/30'
                      }`}
                    >
                      {tertiaryStageCode === 'GRADUATED' ? 'Graduated / Alumni' : 'Active Student'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Residency / Accommodation</label>
                    <SelectField
                      value={boardingType}
                      onChange={(e) => setBoardingType(e.target.value)}
                      className={selectFieldClass}
                    >
                      <option value="Non-Resident">Non-Resident</option>
                      <option value="Resident">Resident (Hostel Accommodation)</option>
                    </SelectField>
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
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Previous school (if transfer)</label>
                    <input
                      type="text"
                      value={previousSchool}
                      onChange={(e) => setPreviousSchool(e.target.value)}
                      className={inputClass}
                      placeholder="e.g. O-Level School or previous Nursing College"
                    />
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
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>College Registration No.</label>
                    <input
                      type="text"
                      value={collegeRegNo}
                      onChange={(e) => setCollegeRegNo(e.target.value)}
                      className={inputClass}
                      placeholder="e.g. CN/2024/001"
                    />
                    <p className="mt-1 text-[11px] ac-text-secondary">Standard [Course]/[Year]/[Sequence] format</p>
                  </div>
                  <div>
                    <label className={labelClass}>UHPAB Index Number</label>
                    <input
                      type="text"
                      value={uhpabIndexNo}
                      onChange={(e) => setUhpabIndexNo(e.target.value)}
                      className={inputClass}
                      placeholder="e.g. U025/004"
                    />
                    <p className="mt-1 text-[11px] ac-text-secondary">UHPAB (formerly UNMEB) national board index</p>
                  </div>
                  <div>
                    <label className={labelClass}>NSIN Number</label>
                    <input
                      type="text"
                      value={nsinNo}
                      onChange={(e) => setNsinNo(e.target.value)}
                      className={inputClass}
                      placeholder="e.g. JAN24/U025/CN/004"
                    />
                    <p className="mt-1 text-[11px] ac-text-secondary">Nursing & Midwifery Council index</p>
                  </div>
                </div>
              </div>
            ) : (
              /* Non-tertiary schools (Primary / Secondary) */
              <>
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
                    <label className={labelClass}>Residency / Accommodation</label>
                    <SelectField
                      value={boardingType}
                      onChange={(e) => setBoardingType(e.target.value)}
                      className={selectFieldClass}
                    >
                      <option value="Non-Resident">Non-Resident</option>
                      <option value="Resident">Resident</option>
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
              </>
            )}
          </Section>

          <Section id="fees" title="Fees & finance" icon={Banknote} isOpen={openSections.includes('fees')} onToggle={toggleSection} isModal={isModal}>
            <p className={isModal ? "mb-2 text-[11px] text-white/70" : "mb-2 text-xs ac-text-secondary"}>
              Tuition is auto-filled from Financial Settings when class and boarding type are set. You can add a discount/bursary and optional initial payment.
            </p>
            <div className={isModal ? "mb-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-white" : "mb-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3"}>
              <label className={labelClass}>Student payment code (SchoolPay)</label>
              <p className={isModal ? "mb-1.5 text-[11px] leading-relaxed text-white/70" : "mb-1.5 text-[11px] leading-relaxed ac-text-secondary"}>
                Same code as on SchoolPay for this child. PwezaCore uses it to match tuition when SchoolPay syncs or sends webhooks—often the same as admission number if the school set it up that way.
              </p>
              <input
                type="text"
                className={inputClass}
                value={schoolpayPaymentCode}
                onChange={(e) => setSchoolpayPaymentCode(e.target.value)}
                placeholder="e.g. from SchoolPay Find Student / bursar"
                autoComplete="off"
              />
            </div>
            <div className={isModal ? "rounded-xl border border-white/20 bg-black/25 p-4 text-white" : "rounded-xl border border-[var(--ac-border)] bg-white/50 p-4 dark:bg-white/5"}>
              <label className={labelClass}>Discount / Bursary</label>
              <div className="flex flex-wrap gap-2">
                {[0, 10, 25, 50, 75, 100].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setDiscountPercent(p)}
                    className={
                      discountPercent === p
                        ? "min-h-[40px] rounded-xl px-3 py-2 text-xs font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 shadow-sm transition-all"
                        : isModal
                          ? "min-h-[40px] rounded-xl px-3 py-2 text-xs font-medium border border-white/20 bg-white/10 text-white/80 hover:text-white hover:bg-white/15 transition-all"
                          : "min-h-[40px] rounded-xl px-3 py-2 text-xs font-medium transition-colors border border-[var(--ac-border)] bg-white/80 ac-text-primary hover:bg-emerald-500/10 dark:bg-white/5"
                    }
                  >
                    {p === 0 ? 'None' : p === 100 ? '100%' : `${p}%`}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className={isModal ? "text-[11px] text-white/70" : "text-xs ac-text-secondary"}>Custom %:</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                  className={isModal ? "w-20 rounded-xl border border-white/20 bg-black/30 px-2.5 py-1.5 text-xs text-white" : "w-20 rounded border border-[var(--ac-border)] bg-white/90 px-2 py-1.5 text-sm dark:bg-white/5"}
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

          <Section id="contact" title="Contact & address" icon={MapPin} isOpen={openSections.includes('contact')} onToggle={toggleSection} isModal={isModal}>
            <p className={hintClass}>
              Optional for now. Use these when you invite the student to the portal (login).
            </p>
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

          <Section id="medical" title="Medical" icon={Heart} isOpen={openSections.includes('medical')} onToggle={toggleSection} isModal={isModal}>
            <label className={labelClass}>Medical condition / allergies / notes</label>
            <textarea
              value={medicalCondition}
              onChange={(e) => setMedicalCondition(e.target.value)}
              className={`${inputClass} min-h-[120px] resize-y`}
              rows={3}
              placeholder="Optional"
            />
          </Section>

          <Section id="photo" title="Student photo (passport)" icon={Camera} isOpen={openSections.includes('photo')} onToggle={toggleSection} isModal={isModal}>
            <p className={isModal ? "mb-2 text-[11px] text-white/70" : "mb-2 text-xs ac-text-secondary"}>
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
              placeholder="Upload student passport photo"
            />
            {uploadError && <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{uploadError}</p>}
          </Section>

          <div
            className={
              isModal
                ? 'mt-6 border-t border-white/15 pt-4 relative z-0'
                : 'fixed bottom-0 left-0 right-0 z-30 border-t border-white/20 dark:border-white/15 bg-white/70 dark:bg-slate-950/60 px-4 py-3 backdrop-blur-2xl backdrop-saturate-[180%] shadow-[0_-8px_32px_rgba(0,0,0,0.25),inset_0_1.5px_2px_rgba(255,255,255,0.4)] sm:static sm:z-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none sm:shadow-none'
            }
          >
            <div className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className={
                  isModal
                    ? 'px-4 py-2.5 rounded-xl text-xs font-bold text-white/80 hover:text-white bg-white/10 hover:bg-white/15 border border-white/20 backdrop-blur-md transition-all active:scale-[0.98]'
                    : 'ac-glass-btn-secondary order-2 min-h-[48px] rounded-xl px-5 py-3 text-sm font-medium ac-text-primary sm:order-1'
                }
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={
                  isModal
                    ? 'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:brightness-110 border border-emerald-300/60 shadow-[0_4px_16px_rgba(16,185,129,0.35)] transition-all active:scale-[0.98] disabled:opacity-50'
                    : 'order-1 min-h-[48px] rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-50 sm:order-2 sm:min-w-[min(100%,200px)]'
                }
              >
                {submitting ? 'Adding…' : (isTertiary ? 'Add Trainee' : 'Add Student')}
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
