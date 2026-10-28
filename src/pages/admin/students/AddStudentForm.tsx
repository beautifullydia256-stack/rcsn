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
  Users,
  CheckCircle,
  XCircle,
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
}: {
  id?: string;
  value: string | number;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  'aria-label'?: string;
  isModal?: boolean;
  direction?: 'down' | 'up';
}) {
  return (
    <div className="relative w-full">
      <select
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        aria-label={ariaLabel}
        className={
          className ||
          'w-full bg-transparent border-0 border-b border-slate-300 hover:border-slate-400 focus:border-b-2 focus:border-emerald-600 text-slate-900 text-xs py-1.5 px-0.5 rounded-none focus:outline-none cursor-pointer appearance-none pr-7 font-medium transition-colors'
        }
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
        aria-hidden
      />
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  badge,
  children,
}: {
  id?: string;
  title: string;
  icon?: ComponentType<{ className?: string }>;
  badge?: ReactNode;
  isOpen?: boolean;
  onToggle?: (key: string) => void;
  isModal?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="bg-white border border-[#CCCCCC] p-4 sm:p-5">
      <div className="flex items-center justify-between pb-2 mb-3.5 border-b border-[#CCCCCC]">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-[#111111] shrink-0" aria-hidden />}
          <h2 className="text-[12px] font-bold text-[#111111] uppercase tracking-wider font-mono">
            {title}
          </h2>
        </div>
        {badge && <div>{badge}</div>}
      </div>
      <div className="space-y-3">
        {children}
      </div>
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

const govLabel = 'block text-[11px] font-mono font-bold text-[#444444] uppercase tracking-wider mb-1';

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
  const [nationalityChoice, setNationalityChoice] = useState('Ugandan');
  const [nationalityCustomText, setNationalityCustomText] = useState('');
  const [religion, setReligion] = useState('');
  const [city, setCity] = useState('');

  const [studentPhone, setStudentPhone] = useState('');
  const [studentEmail, setStudentEmail] = useState('');

  // Guardian & Sponsor
  const [guardianName, setGuardianName] = useState('');
  const [guardianRelationship, setGuardianRelationship] = useState('Mother');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [guardianOccupation, setGuardianOccupation] = useState('');
  const [guardianAddress, setGuardianAddress] = useState('');

  // Academic
  const [currentClass, setCurrentClass] = useState('');
  const [stream, setStream] = useState('');
  const [previousSchool, setPreviousSchool] = useState('');
  const [admissionDate, setAdmissionDate] = useState(() => new Date().toISOString().slice(0, 10));
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
  const [successBanner, setSuccessBanner] = useState<{ name: string; cohort: string; id: string } | null>(null);
  const toast = useToast();

  // Collapsible sections: multiple can be open; default to all open for paper document view
  const [openSections, setOpenSections] = useState<string[]>([
    'personal',
    'academic',
    'fees',
    'contact',
    'medical',
    'photo',
  ]);

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

  const baseFee = useMemo(() => {
    return resolveFeeForClass({
      currentClass,
      isTertiary,
      tertiaryStageCode,
      tertiaryCourseCode,
      stageOptions,
      boardingType,
      feeByClass,
      boardingByClass,
    });
  }, [
    currentClass,
    isTertiary,
    tertiaryStageCode,
    tertiaryCourseCode,
    stageOptions,
    boardingType,
    feeByClass,
    boardingByClass,
  ]);

  const expectedFeeAmount = useMemo(() => {
    if (baseFee <= 0) return expectedFee ? Number(expectedFee) : 0;
    const pct = Math.min(100, Math.max(0, Number(discountPercent) || 0));
    return Math.round(baseFee * (1 - pct / 100));
  }, [baseFee, discountPercent, expectedFee]);

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
        guardian_name: guardianName.trim() || null,
        guardian_relationship: guardianRelationship.trim() || null,
        guardian_phone: guardianPhone.trim() || null,
        guardian_email: guardianEmail.trim() || null,
        guardian_occupation: guardianOccupation.trim() || null,
        guardian_address: guardianAddress.trim() || null,
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

      setSuccessBanner({ name, cohort: currentClass, id: studentId });
      toast.success(
        isTertiary ? 'Trainee registered successfully.' : 'Student registered successfully.'
      );
      setTimeout(() => {
        onCompleted?.();
      }, 1500);
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

  /** Elegant Modern Document Aesthetic: subtle ink baseline, slate typography, institutional emerald accent */
  const paperLineInput =
    'w-full bg-transparent border-0 border-b border-slate-300 hover:border-slate-400 focus:border-b-2 focus:border-emerald-600 px-0.5 py-1.5 text-xs text-slate-900 font-medium placeholder:text-slate-400 rounded-none focus:outline-none transition-colors shadow-none';
  const paperLineSelect =
    'w-full bg-transparent border-0 border-b border-slate-300 hover:border-slate-400 focus:border-b-2 focus:border-emerald-600 px-0.5 py-1.5 text-xs text-slate-900 font-medium rounded-none focus:outline-none cursor-pointer appearance-none pr-7 transition-colors shadow-none';
  const paperLineDate =
    'w-full bg-transparent border-0 border-b border-slate-300 hover:border-slate-400 focus:border-b-2 focus:border-emerald-600 px-0.5 py-1.5 text-xs text-slate-900 font-mono rounded-none focus:outline-none transition-colors shadow-none';
  const paperLabel =
    'block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1';
  const paperHint =
    'mt-1 text-[10px] text-slate-400 font-mono';
  const selectBoxClass = paperLineSelect;

  const modalInputClass = paperLineInput;
  const inputClass = paperLineInput;
  const selectFieldClass = paperLineSelect;
  const dateFieldClass = paperLineDate;
  const labelClass = paperLabel;
  const hintClass = paperHint;

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
    return <div className="w-full p-8">{spinner}</div>;
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
    return <div className="w-full p-8">{msg}</div>;
  }

  const formBody = (
    <>
      {/* ── RIGHT-SIDE STATUS FEEDBACK CARD ── */}
      {successBanner && (
        <div className="fixed top-6 right-6 z-50 w-80 sm:w-96 bg-white border border-emerald-500 p-4 shadow-xl rounded-lg text-slate-900 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-mono font-bold text-emerald-700 uppercase">
                Trainee Registered Successfully
              </div>
              <div className="text-sm font-bold text-slate-900 mt-1 truncate">
                {successBanner.name}
              </div>
              <div className="text-xs text-slate-500 font-mono mt-0.5 truncate">
                Cohort: {successBanner.cohort}
              </div>
              <div className="text-[10px] text-slate-400 mt-2 font-mono">
                Returning to Student Registry...
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed top-6 right-6 z-50 w-80 sm:w-96 bg-white border border-rose-500 p-4 shadow-xl rounded-lg text-slate-900 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-mono font-bold text-rose-700 uppercase">
                Registration Failed
              </div>
              <div className="text-xs text-slate-800 mt-1 break-words">
                {error}
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="mt-2.5 px-3 py-1 bg-slate-900 text-white text-[11px] font-mono font-semibold rounded"
              >
                Dismiss &amp; Correct Fields
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`w-full ${mode === 'page' ? 'max-w-7xl mx-auto' : ''} space-y-4`}>
        {mode === 'page' && (
          /* ── TOP HEADER (CLEAN & MATCHING STUDENT MANAGEMENT REGISTRY) ── */
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 mb-2 border-b border-[#CCCCCC]">
            <div className="flex items-center gap-3">
              <h1 className="text-[17px] font-bold tracking-tight text-[#111111] uppercase font-sans m-0">
                The Student Register
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="gov-btn gov-btn-sm"
              >
                <span>Cancel / Back</span>
              </button>
              <button
                type="submit"
                form="add-student-form"
                disabled={submitting}
                className="gov-btn gov-btn-sm gov-btn-primary"
              >
                <span>{submitting ? 'Registering…' : (isTertiary ? 'Submit Trainee Registration' : 'Submit Student Registration')}</span>
              </button>
            </div>
          </div>
        )}

        <form id="add-student-form" onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 border border-rose-400 bg-rose-50 text-xs text-rose-800 font-mono font-medium whitespace-pre-wrap">
              {error}
            </div>
          )}

          {/* ── 2-COLUMN MAIN LEDGER LAYOUT (BALANCED 50/50 SPLIT) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {/* ── LEFT COLUMN: PERSONAL BIODATA, GUARDIAN & PASSPORT PHOTO ── */}
            <div className="space-y-4">
              {/* 1. Personal & Demographic Information */}
              <Section title="Personal & Demographic Information" icon={UserCircle2}>
                {/* Row 1: Names (Tight 3-col grid) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={govLabel}>First Name <span className="text-rose-600">*</span></label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="gov-input"
                      placeholder="e.g. Sarah"
                      required
                      autoComplete="given-name"
                    />
                  </div>
                  <div>
                    <label className={govLabel}>Middle Name</label>
                    <input
                      type="text"
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                      className="gov-input"
                      placeholder="Optional"
                      autoComplete="additional-name"
                    />
                  </div>
                  <div>
                    <label className={govLabel}>Last Name / Surname <span className="text-rose-600">*</span></label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="gov-input"
                      placeholder="e.g. Namubiru"
                      required
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                {/* Row 2: Demographics (Gender, DOB, Nationality, Religion) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div>
                    <label className={govLabel}>Gender <span className="text-rose-600">*</span></label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="gov-select"
                      required
                    >
                      <option value="">Select</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                    </select>
                  </div>
                  <div>
                    <label className={govLabel} htmlFor="add-student-dob">Date of Birth <span className="text-rose-600">*</span></label>
                    <input
                      id="add-student-dob"
                      type="date"
                      value={dob}
                      min={dobMin}
                      max={dobMax}
                      onChange={(e) => setDob(e.target.value)}
                      className="gov-input"
                      required
                    />
                  </div>
                  <div>
                    <label className={govLabel}>Nationality</label>
                    <select
                      value={nationalityChoice}
                      onChange={(e) => {
                        const v = e.target.value;
                        setNationalityChoice(v);
                        if (v !== NATIONALITY_CUSTOM) setNationalityCustomText('');
                      }}
                      className="gov-select"
                    >
                      <option value="Ugandan">Ugandan</option>
                      {EAC_NATIONALITIES.filter((n) => n !== 'Ugandan').map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                      <option value={NATIONALITY_CUSTOM}>Other</option>
                    </select>
                    {nationalityChoice === NATIONALITY_CUSTOM && (
                      <input
                        type="text"
                        value={nationalityCustomText}
                        onChange={(e) => setNationalityCustomText(e.target.value)}
                        className="gov-input mt-1.5"
                        placeholder="Type nationality"
                        autoComplete="off"
                      />
                    )}
                  </div>
                  <div>
                    <label className={govLabel}>Religion</label>
                    <input
                      type="text"
                      value={religion}
                      onChange={(e) => setReligion(e.target.value)}
                      className="gov-input"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                {/* Row 3: City/District, Phone, Email */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className={govLabel}>City / District</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="gov-input"
                      placeholder="e.g. Rakai / Masaka"
                    />
                  </div>
                  <div>
                    <label className={govLabel}>Student Phone</label>
                    <input
                      type="tel"
                      value={studentPhone}
                      onChange={(e) => setStudentPhone(e.target.value)}
                      className="gov-input"
                      placeholder="e.g. 0770123456"
                      autoComplete="tel"
                    />
                  </div>
                  <div>
                    <label className={govLabel}>Institutional Email</label>
                    <input
                      type="email"
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      className="gov-input"
                      placeholder="e.g. trainee@rcsn.ac.ug"
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Row 4: Medical & Emergency Notes */}
                <div className="pt-1">
                  <label className={govLabel}>Medical / Health Notes</label>
                  <input
                    type="text"
                    value={medicalCondition}
                    onChange={(e) => setMedicalCondition(e.target.value)}
                    className="gov-input"
                    placeholder="Record allergies, conditions, or medical alerts (Optional)"
                  />
                </div>
              </Section>

              {/* 2. Parent & Guardian Details */}
              <Section title="Parent, Guardian & Sponsor Details" icon={Users}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className={govLabel}>Guardian Full Name</label>
                    <input
                      type="text"
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      className="gov-input"
                      placeholder="e.g. Florence Nalubega"
                    />
                  </div>
                  <div>
                    <label className={govLabel}>Relationship</label>
                    <select
                      value={guardianRelationship}
                      onChange={(e) => setGuardianRelationship(e.target.value)}
                      className="gov-select"
                    >
                      <option value="Mother">Mother</option>
                      <option value="Father">Father</option>
                      <option value="Guardian">Guardian</option>
                      <option value="Sponsor">Sponsor</option>
                      <option value="Aunt">Aunt</option>
                      <option value="Uncle">Uncle</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className={govLabel}>Guardian Phone</label>
                    <input
                      type="tel"
                      value={guardianPhone}
                      onChange={(e) => setGuardianPhone(e.target.value)}
                      className="gov-input"
                      placeholder="e.g. 0772123456"
                    />
                  </div>
                  <div>
                    <label className={govLabel}>Occupation</label>
                    <input
                      type="text"
                      value={guardianOccupation}
                      onChange={(e) => setGuardianOccupation(e.target.value)}
                      className="gov-input"
                      placeholder="e.g. Health Worker / Farmer"
                    />
                  </div>
                  <div>
                    <label className={govLabel}>Residential Location</label>
                    <input
                      type="text"
                      value={guardianAddress}
                      onChange={(e) => setGuardianAddress(e.target.value)}
                      className="gov-input"
                      placeholder="e.g. Kalisizo, Rakai"
                    />
                  </div>
                </div>
              </Section>

              {/* 3. Trainee Passport Photo */}
              <Section title="Trainee Passport Photo" icon={Camera}>
                <p className="mb-2 text-[11px] text-[#666666] font-mono">
                  Upload an official passport-size photograph (JPEG or PNG, max 100KB).
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
                  placeholder="Upload trainee passport photo"
                />
                {uploadError && <p className="mt-1 text-xs text-rose-600 font-mono">{uploadError}</p>}
              </Section>
            </div>

            {/* ── RIGHT COLUMN: ACADEMIC PLACEMENT & FINANCIAL SCHEDULE ── */}
            <div className="space-y-4">
              {/* 4. Academic Placement */}
              <Section
                title="Academic Placement"
                icon={GraduationCap}
                badge={
                  <span className="text-[10px] font-mono font-bold bg-[#EAEAEA] text-[#222222] px-2 py-0.5 border border-[#CCCCCC]">
                    UNMEB U028
                  </span>
                }
              >
                {isTertiary ? (
                  <>
                    <div>
                      <label className={govLabel}>Nursing / Midwifery Award <span className="text-rose-600">*</span></label>
                      <select
                        value={tertiaryCourseCode}
                        onChange={(e) => setTertiaryCourseCode(e.target.value as any)}
                        className="gov-select font-bold"
                        required
                      >
                        <option value="CN">Certificate in Nursing (CN) — 2.5 Yrs</option>
                        <option value="DN">Diploma in Nursing (DN) — 3.0 Yrs</option>
                        <option value="CM">Certificate in Midwifery (CM) — 2.5 Yrs</option>
                        <option value="DM">Diploma in Midwifery (DM) — 3.0 Yrs</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className={govLabel}>Intake Year <span className="text-rose-600">*</span></label>
                        <select
                          value={tertiaryIntakeYear}
                          onChange={(e) => setTertiaryIntakeYear(Number(e.target.value))}
                          className="gov-select"
                          required
                        >
                          {TERTIARY_INTAKE_YEARS.map((yr) => (
                            <option key={yr} value={yr}>{yr} Intake</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={govLabel}>Intake Session</label>
                        <select
                          value={tertiaryIntakeBatch}
                          onChange={(e) => setTertiaryIntakeBatch(e.target.value)}
                          className="gov-select"
                        >
                          <option value="March Intake">March Intake (Set {String(tertiaryIntakeYear).slice(-2)})</option>
                          <option value="August Intake">August Intake (Set {String(tertiaryIntakeYear).slice(-2)})</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className={govLabel}>Academic Stage <span className="text-rose-600">*</span></label>
                        <select
                          value={tertiaryStageCode}
                          onChange={(e) => setTertiaryStageCode(e.target.value)}
                          className="gov-select"
                          required
                        >
                          {stageOptions.map((st) => (
                            <option key={st.code} value={st.code}>{st.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={govLabel}>Accommodation</label>
                        <select
                          value={boardingType}
                          onChange={(e) => setBoardingType(e.target.value)}
                          className="gov-select"
                        >
                          <option value="Non-Resident">Day Scholar (Non-Resident)</option>
                          <option value="Resident">Resident (Hostel Accommodation)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className={govLabel}>Admission Date <span className="text-rose-600">*</span></label>
                        <input
                          type="date"
                          value={admissionDate}
                          onChange={(e) => setAdmissionDate(e.target.value)}
                          className="gov-input"
                          required
                          max={todayIso}
                        />
                      </div>
                      <div>
                        <label className={govLabel}>College Reg No.</label>
                        <input
                          type="text"
                          value={collegeRegNo}
                          onChange={(e) => setCollegeRegNo(e.target.value)}
                          className="gov-input font-bold"
                          placeholder="e.g. CN/2026/001"
                        />
                      </div>
                    </div>

                    <div className="p-2.5 bg-[#F9F9FB] border border-[#CCCCCC] flex items-center justify-between font-mono text-[11px] mt-1">
                      <span className="text-[#555555]">ASSIGNED COHORT:</span>
                      <span className="font-bold text-[#111111]">{currentClass || '—'}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={govLabel}>Class <span className="text-rose-600">*</span></label>
                        <select
                          value={currentClass}
                          onChange={(e) => setCurrentClass(e.target.value)}
                          className="gov-select"
                          required
                        >
                          {classOptions.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={govLabel}>Accommodation</label>
                        <select
                          value={boardingType}
                          onChange={(e) => setBoardingType(e.target.value)}
                          className="gov-select"
                        >
                          <option value="Non-Resident">Non-Resident</option>
                          <option value="Resident">Resident</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className={govLabel}>Admission Date <span className="text-rose-600">*</span></label>
                        <input
                          type="date"
                          value={admissionDate}
                          onChange={(e) => setAdmissionDate(e.target.value)}
                          className="gov-input"
                          required
                          max={todayIso}
                        />
                      </div>
                      <div>
                        <label className={govLabel}>Stream / Section</label>
                        <input
                          type="text"
                          value={stream}
                          onChange={(e) => setStream(e.target.value)}
                          className="gov-input"
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                  </>
                )}
              </Section>

              {/* 4. Fees & Financial Schedule */}
              <Section
                title="Fees & Financial Schedule"
                icon={Banknote}
                badge={
                  <span className="text-[10px] font-mono font-bold text-[#111111]">
                    CENTENARY A/C: 3100035767
                  </span>
                }
              >
                {/* Overview Banner */}
                <div className="p-3 bg-[#F4F4F6] border border-[#CCCCCC]">
                  <div className="flex items-baseline justify-between text-xs font-mono">
                    <span className="text-[10px] uppercase text-[#555555] font-bold">Standard Term Tuition:</span>
                    <span className="font-bold text-[#111111]">
                      UGX {Math.round(baseFee || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between text-xs font-mono mt-1.5 pt-1.5 border-t border-[#DDDDDD]">
                    <span className="text-[10px] uppercase text-[#111111] font-bold">Net Invoiced:</span>
                    <span className="font-bold text-[#065f46] text-sm">
                      UGX {Math.round(expectedFeeAmount ?? baseFee ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className={govLabel}>Initial Deposit (UGX)</label>
                    <input
                      type="number"
                      min={0}
                      value={initialPayment}
                      onChange={(e) => setInitialPayment(e.target.value)}
                      className="gov-input font-bold"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className={govLabel}>Bursary / Discount</label>
                    <select
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(Number(e.target.value))}
                      className="gov-select font-mono"
                    >
                      <option value="0">0% (Standard Fee)</option>
                      <option value="10">10% Discount</option>
                      <option value="25">25% Discount</option>
                      <option value="50">50% Half Bursary</option>
                      <option value="100">100% Full Bursary</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className={govLabel}>SchoolPay Code</label>
                    <input
                      type="text"
                      value={schoolpayPaymentCode}
                      onChange={(e) => setSchoolpayPaymentCode(e.target.value)}
                      className="gov-input"
                      placeholder="e.g. 10000512"
                    />
                  </div>
                  <div>
                    <label className={govLabel}>Payment Status</label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value)}
                      className="gov-select"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Partial">Partial</option>
                      <option value="Paid">Paid</option>
                    </select>
                  </div>
                </div>
              </Section>
            </div>
          </div>

          {/* ── BOTTOM ACTION BAR ── */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#CCCCCC] mt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="gov-btn gov-btn-sm"
            >
              <span>Cancel / Back</span>
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="gov-btn gov-btn-sm gov-btn-primary"
            >
              <span>{submitting ? 'Registering…' : (isTertiary ? 'Submit Trainee Registration' : 'Submit Student Registration')}</span>
            </button>
          </div>
        </form>
      </div>
    </>
  );

  if (mode === 'page') {
    return (
      <div className="-m-[20px] max-lg:-m-[14px] bg-[#F4F4F6] min-h-screen p-4 sm:p-6 lg:p-8">
        {formBody}
      </div>
    );
  }
  return formBody;
}
