import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Coins,
  Building2,
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  CreditCard,
  Calculator,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  Sliders,
  Check,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { registerApiUrl } from '@/lib/registerApiOrigin';
import { isTertiarySchool, useSchoolType } from '@/hooks/useSchoolType';
import { useUIStore } from '@/store/uiStore';
import { getTokens, SORA, INTER, fmtUGX } from '@/styles/posThemeTokens';
import NativeModal from '@/components/NativeModal';
import SchoolPayIntegrationCard from '../components/SchoolPayIntegrationCard';

const STALE_TIME_MS = 5 * 60 * 1000;

export type CustomFeeItem = {
  id: string;
  name: string;
  amount: string;
};

export type SemesterFeeBreakdown = {
  baseTuition: string;
  hostelFee: string;
  clinicalFee: string;
  facilitationFee: string;
  guildFee: string;
  idCardFee: string;
  uniformFee: string;
  customItems: CustomFeeItem[];
};

export type CourseMeta = {
  code: string;
  name: string;
  fullName: string;
  duration: string;
  semesters: Array<{ code: string; label: string; short: string }>;
};

export const TERTIARY_COURSES: CourseMeta[] = [
  {
    code: 'CN',
    name: 'Certificate in Nursing',
    fullName: 'Certificate in Nursing (CN)',
    duration: '2.5 Years (5 Semesters)',
    semesters: [
      { code: 'Y1S1', label: 'Year 1 Semester 1', short: 'Y1 S1' },
      { code: 'Y1S2', label: 'Year 1 Semester 2', short: 'Y1 S2' },
      { code: 'Y2S1', label: 'Year 2 Semester 1', short: 'Y2 S1' },
      { code: 'Y2S2', label: 'Year 2 Semester 2', short: 'Y2 S2' },
      { code: 'Y3S1', label: 'Year 3 Semester 1', short: 'Y3 S1' },
    ],
  },
  {
    code: 'DN',
    name: 'Diploma in Nursing',
    fullName: 'Diploma in Nursing (DN)',
    duration: '3.0 Years (6 Semesters)',
    semesters: [
      { code: 'Y1S1', label: 'Year 1 Semester 1', short: 'Y1 S1' },
      { code: 'Y1S2', label: 'Year 1 Semester 2', short: 'Y1 S2' },
      { code: 'Y2S1', label: 'Year 2 Semester 1', short: 'Y2 S1' },
      { code: 'Y2S2', label: 'Year 2 Semester 2', short: 'Y2 S2' },
      { code: 'Y3S1', label: 'Year 3 Semester 1', short: 'Y3 S1' },
      { code: 'Y3S2', label: 'Year 3 Semester 2', short: 'Y3 S2' },
    ],
  },
  {
    code: 'CM',
    name: 'Certificate in Midwifery',
    fullName: 'Certificate in Midwifery (CM)',
    duration: '2.5 Years (5 Semesters)',
    semesters: [
      { code: 'Y1S1', label: 'Year 1 Semester 1', short: 'Y1 S1' },
      { code: 'Y1S2', label: 'Year 1 Semester 2', short: 'Y1 S2' },
      { code: 'Y2S1', label: 'Year 2 Semester 1', short: 'Y2 S1' },
      { code: 'Y2S2', label: 'Year 2 Semester 2', short: 'Y2 S2' },
      { code: 'Y3S1', label: 'Year 3 Semester 1', short: 'Y3 S1' },
    ],
  },
  {
    code: 'DM',
    name: 'Diploma in Midwifery',
    fullName: 'Diploma in Midwifery (DM)',
    duration: '3.0 Years (6 Semesters)',
    semesters: [
      { code: 'Y1S1', label: 'Year 1 Semester 1', short: 'Y1 S1' },
      { code: 'Y1S2', label: 'Year 1 Semester 2', short: 'Y1 S2' },
      { code: 'Y2S1', label: 'Year 2 Semester 1', short: 'Y2 S1' },
      { code: 'Y2S2', label: 'Year 2 Semester 2', short: 'Y2 S2' },
      { code: 'Y3S1', label: 'Year 3 Semester 1', short: 'Y3 S1' },
      { code: 'Y3S2', label: 'Year 3 Semester 2', short: 'Y3 S2' },
    ],
  },
];

function createEmptyBreakdown(): SemesterFeeBreakdown {
  return {
    baseTuition: '',
    hostelFee: '',
    clinicalFee: '',
    facilitationFee: '',
    guildFee: '',
    idCardFee: '',
    uniformFee: '',
    customItems: [],
  };
}

function initDefaultTertiaryState(): Record<string, Record<string, SemesterFeeBreakdown>> {
  const result: Record<string, Record<string, SemesterFeeBreakdown>> = {};
  TERTIARY_COURSES.forEach((course) => {
    result[course.code] = {};
    course.semesters.forEach((sem) => {
      result[course.code][sem.code] = createEmptyBreakdown();
    });
  });
  return result;
}

export function computeSemesterTotals(bd: SemesterFeeBreakdown) {
  const base = Number(bd.baseTuition.replace(/,/g, '')) || 0;
  const hostel = Number(bd.hostelFee.replace(/,/g, '')) || 0;
  const clinical = Number(bd.clinicalFee.replace(/,/g, '')) || 0;
  const facilitation = Number(bd.facilitationFee.replace(/,/g, '')) || 0;
  const guild = Number(bd.guildFee.replace(/,/g, '')) || 0;
  const idCard = Number(bd.idCardFee.replace(/,/g, '')) || 0;
  const uniform = Number(bd.uniformFee.replace(/,/g, '')) || 0;
  const customSum = bd.customItems.reduce(
    (sum, it) => sum + (Number(it.amount.replace(/,/g, '')) || 0),
    0
  );

  const leviesTotal = clinical + facilitation + guild + idCard + uniform + customSum;
  const dayTotal = base + leviesTotal;
  const boardingTotal = dayTotal + hostel;

  return {
    base,
    hostel,
    clinical,
    facilitation,
    guild,
    idCard,
    uniform,
    customSum,
    leviesTotal,
    dayTotal,
    boardingTotal,
  };
}

type FeeStructureRawRow = {
  id?: string;
  class_name: string;
  tuition_amount?: number;
  boarding_tuition_amount?: number;
};

async function fetchFinancialSettings(schoolId: string): Promise<{
  feeStructure: Record<string, string>;
  tertiaryBreakdowns: Record<string, Record<string, SemesterFeeBreakdown>>;
  admissionFee: string;
}> {
  const { data, error: fetchError } = await supabase
    .from('school_fee_structure')
    .select('*')
    .eq('school_id', schoolId);
  if (fetchError) throw fetchError;

  const feeMap: Record<string, string> = {};
  let admFee = '';
  const breakdowns = initDefaultTertiaryState();
  const rows = (data || []) as FeeStructureRawRow[];

  rows.forEach((fee) => {
    const amount = Number(fee.tuition_amount || 0);
    const boardingAmount = Number(fee.boarding_tuition_amount || 0);
    const name = fee.class_name;

    if (name === 'ADMISSION') {
      admFee = amount > 0 ? String(amount) : '';
      return;
    }

    feeMap[name] = amount > 0 ? String(amount) : '';
    feeMap[`${name}_boarding_tuition`] = boardingAmount > 0 ? String(boardingAmount) : '';

    // Per-semester itemized: ITEM:CN:Y1S1:Base Tuition
    if (name.startsWith('ITEM:')) {
      const parts = name.split(':');
      if (parts.length >= 4) {
        const courseCode = parts[1].toUpperCase();
        const semCode = parts[2].toUpperCase();
        const itemName = parts.slice(3).join(':').trim();
        if (breakdowns[courseCode]?.[semCode]) {
          const target = breakdowns[courseCode][semCode];
          if (itemName === 'Base Tuition') target.baseTuition = amount > 0 ? String(amount) : '';
          else if (itemName === 'Hostel Accommodation') target.hostelFee = amount > 0 ? String(amount) : '';
          else if (itemName === 'Clinical Practical') target.clinicalFee = amount > 0 ? String(amount) : '';
          else if (itemName === 'Facilitation Fee') target.facilitationFee = amount > 0 ? String(amount) : '';
          else if (itemName === 'Guild Fee') target.guildFee = amount > 0 ? String(amount) : '';
          else if (itemName === 'Student ID Card') target.idCardFee = amount > 0 ? String(amount) : '';
          else if (itemName === 'Uniform') target.uniformFee = amount > 0 ? String(amount) : '';
          else {
            target.customItems.push({
              id: `${courseCode}-${semCode}-${itemName}-${Math.random()}`,
              name: itemName,
              amount: amount > 0 ? String(amount) : '',
            });
          }
        }
        return;
      }
      // Legacy single-course itemized: ITEM:CN:Base Tuition
      if (parts.length === 3) {
        const courseCode = parts[1].toUpperCase();
        const itemName = parts[2].trim();
        if (breakdowns[courseCode]) {
          Object.keys(breakdowns[courseCode]).forEach((sc) => {
            const target = breakdowns[courseCode][sc];
            if (itemName === 'Base Tuition' && !target.baseTuition) target.baseTuition = amount > 0 ? String(amount) : '';
            else if (itemName === 'Hostel Accommodation' && !target.hostelFee) target.hostelFee = amount > 0 ? String(amount) : '';
            else if (itemName === 'Clinical Practical' && !target.clinicalFee) target.clinicalFee = amount > 0 ? String(amount) : '';
            else if (itemName === 'Facilitation Fee' && !target.facilitationFee) target.facilitationFee = amount > 0 ? String(amount) : '';
            else if (itemName === 'Guild Fee' && !target.guildFee) target.guildFee = amount > 0 ? String(amount) : '';
            else if (itemName === 'Student ID Card' && !target.idCardFee) target.idCardFee = amount > 0 ? String(amount) : '';
            else if (itemName === 'Uniform' && !target.uniformFee) target.uniformFee = amount > 0 ? String(amount) : '';
          });
        }
        return;
      }
    }

    // Totals row: CN – Year 1 Semester 1
    if (name.includes(' – ')) {
      const [cCode, semLabel] = name.split(' – ').map((s) => s.trim());
      const course = TERTIARY_COURSES.find((c) => c.code === cCode);
      if (course) {
        const sem = course.semesters.find((s) => s.label === semLabel || s.code === semLabel);
        if (sem && breakdowns[cCode]?.[sem.code]) {
          const target = breakdowns[cCode][sem.code];
          if (!target.baseTuition && amount > 0) {
            target.baseTuition = String(amount);
          }
          if (!target.hostelFee && boardingAmount > amount) {
            target.hostelFee = String(boardingAmount - amount);
          }
        }
      }
    }
  });

  return { feeStructure: feeMap, tertiaryBreakdowns: breakdowns, admissionFee: admFee };
}

export default function SettingsFinancial({
  schoolId,
  classes: classList,
  embedded: _embedded,
  schoolType: propSchoolType,
}: {
  schoolId: string | null;
  classes: string[];
  embedded?: boolean;
  schoolType?: string | null;
}) {
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);
  const queryClient = useQueryClient();
  const { data: queriedSchoolType } = useSchoolType();
  const effectiveSchoolType = propSchoolType || queriedSchoolType;
  const isTertiary = isTertiarySchool(effectiveSchoolType);

  // Navigation State
  const [activeCourseCode, setActiveCourseCode] = useState<string | null>(null);
  const [activeSemesterCode, setActiveSemesterCode] = useState<string>('Y1S1');
  const [expandedCourseAccordion, setExpandedCourseAccordion] = useState<string | null>(null);
  const [showSchoolPayModal, setShowSchoolPayModal] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Form State
  const [feeStructure, setFeeStructure] = useState<Record<string, string>>({});
  const [admissionFee, setAdmissionFee] = useState('');
  const [tertiaryBreakdowns, setTertiaryBreakdowns] = useState(initDefaultTertiaryState());
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // SchoolPay Status Query
  const { data: schoolPayStatus, refetch: refetchSchoolPay } = useQuery({
    queryKey: ['admin', 'schoolpay-status', schoolId],
    queryFn: async () => {
      if (!schoolId) return { connected: false, enabled: false };
      try {
        const res = await fetch(
          registerApiUrl(`/api/integrations/schoolpay/settings?schoolId=${encodeURIComponent(schoolId)}`),
          { credentials: 'include' }
        );
        if (!res.ok) return { connected: false, enabled: false };
        const j = (await res.json()) as { enabled?: boolean; schoolpaySchoolCode?: string; hasApiPassword?: boolean };
        const connected = !!(j.enabled && j.schoolpaySchoolCode?.trim() && j.hasApiPassword);
        return { connected, enabled: !!j.enabled };
      } catch {
        return { connected: false, enabled: false };
      }
    },
    enabled: !!schoolId,
    staleTime: 60 * 1000,
  });

  // Financial Settings Query
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'settings', 'financial', schoolId ?? ''],
    queryFn: () => fetchFinancialSettings(schoolId!),
    enabled: !!schoolId,
    staleTime: STALE_TIME_MS,
  });

  useEffect(() => {
    if (data) {
      setFeeStructure(data.feeStructure);
      setTertiaryBreakdowns(data.tertiaryBreakdowns);
      setAdmissionFee(data.admissionFee);
    }
  }, [data]);

  // Handle active semester change when course changes
  const activeCourse = useMemo(() => {
    return TERTIARY_COURSES.find((c) => c.code === activeCourseCode) || null;
  }, [activeCourseCode]);

  useEffect(() => {
    if (activeCourse && !activeCourse.semesters.some((s) => s.code === activeSemesterCode)) {
      setActiveSemesterCode(activeCourse.semesters[0]?.code || 'Y1S1');
    }
  }, [activeCourse, activeSemesterCode]);

  // Update tertiary field
  const updateTertiaryField = (
    courseCode: string,
    semCode: string,
    field: keyof Omit<SemesterFeeBreakdown, 'customItems'>,
    value: string
  ) => {
    setTertiaryBreakdowns((prev) => ({
      ...prev,
      [courseCode]: {
        ...prev[courseCode],
        [semCode]: {
          ...prev[courseCode][semCode],
          [field]: value,
        },
      },
    }));
  };

  // Add custom fee item
  const addCustomItem = (courseCode: string, semCode: string) => {
    const newItem: CustomFeeItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: '',
      amount: '',
    };
    setTertiaryBreakdowns((prev) => ({
      ...prev,
      [courseCode]: {
        ...prev[courseCode],
        [semCode]: {
          ...prev[courseCode][semCode],
          customItems: [...prev[courseCode][semCode].customItems, newItem],
        },
      },
    }));
  };

  // Update custom fee item
  const updateCustomItem = (
    courseCode: string,
    semCode: string,
    itemId: string,
    patch: Partial<CustomFeeItem>
  ) => {
    setTertiaryBreakdowns((prev) => ({
      ...prev,
      [courseCode]: {
        ...prev[courseCode],
        [semCode]: {
          ...prev[courseCode][semCode],
          customItems: prev[courseCode][semCode].customItems.map((it) =>
            it.id === itemId ? { ...it, ...patch } : it
          ),
        },
      },
    }));
  };

  // Remove custom fee item
  const removeCustomItem = (courseCode: string, semCode: string, itemId: string) => {
    setTertiaryBreakdowns((prev) => ({
      ...prev,
      [courseCode]: {
        ...prev[courseCode],
        [semCode]: {
          ...prev[courseCode][semCode],
          customItems: prev[courseCode][semCode].customItems.filter((it) => it.id !== itemId),
        },
      },
    }));
  };

  // Quick copy from previous semester
  const copyFromPreviousSemester = useCallback((courseCode: string, currentSemIdx: number) => {
    const course = TERTIARY_COURSES.find((c) => c.code === courseCode);
    if (!course || currentSemIdx <= 0) return;
    const prevSem = course.semesters[currentSemIdx - 1];
    const currSem = course.semesters[currentSemIdx];
    const prevData = tertiaryBreakdowns[courseCode]?.[prevSem.code];
    if (!prevData) return;

    setTertiaryBreakdowns((prev) => ({
      ...prev,
      [courseCode]: {
        ...prev[courseCode],
        [currSem.code]: {
          ...prevData,
          customItems: prevData.customItems.map((ci) => ({
            ...ci,
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          })),
        },
      },
    }));

    setCopyFeedback(`Copied structure from ${prevSem.label}`);
    setTimeout(() => setCopyFeedback(null), 3000);
  }, [tertiaryBreakdowns]);

  // Save Tertiary Course Fee Structure
  const saveTertiaryCourse = async (courseCode: string) => {
    if (!schoolId) return;
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const course = TERTIARY_COURSES.find((c) => c.code === courseCode);
      if (!course) return;

      const feeRecords: Array<{
        school_id: string;
        class_name: string;
        tuition_amount: number;
        boarding_tuition_amount: number;
      }> = [];

      let y1s1Day = 0;
      let y1s1Boarding = 0;

      // 1. Semester Totals & Itemized Rows
      course.semesters.forEach((sem) => {
        const bd = tertiaryBreakdowns[courseCode]?.[sem.code] || createEmptyBreakdown();
        const totals = computeSemesterTotals(bd);

        if (sem.code === 'Y1S1') {
          y1s1Day = totals.dayTotal;
          y1s1Boarding = totals.boardingTotal;
        }

        // Semester Class Name (e.g. "CN – Year 1 Semester 1")
        feeRecords.push({
          school_id: schoolId,
          class_name: `${course.code} – ${sem.label}`,
          tuition_amount: totals.dayTotal,
          boarding_tuition_amount: totals.boardingTotal,
        });

        // Itemized breakdown per semester
        feeRecords.push(
          {
            school_id: schoolId,
            class_name: `ITEM:${course.code}:${sem.code}:Base Tuition`,
            tuition_amount: totals.base,
            boarding_tuition_amount: 0,
          },
          {
            school_id: schoolId,
            class_name: `ITEM:${course.code}:${sem.code}:Hostel Accommodation`,
            tuition_amount: totals.hostel,
            boarding_tuition_amount: totals.hostel,
          },
          {
            school_id: schoolId,
            class_name: `ITEM:${course.code}:${sem.code}:Clinical Practical`,
            tuition_amount: totals.clinical,
            boarding_tuition_amount: 0,
          },
          {
            school_id: schoolId,
            class_name: `ITEM:${course.code}:${sem.code}:Facilitation Fee`,
            tuition_amount: totals.facilitation,
            boarding_tuition_amount: 0,
          },
          {
            school_id: schoolId,
            class_name: `ITEM:${course.code}:${sem.code}:Guild Fee`,
            tuition_amount: totals.guild,
            boarding_tuition_amount: 0,
          },
          {
            school_id: schoolId,
            class_name: `ITEM:${course.code}:${sem.code}:Student ID Card`,
            tuition_amount: totals.idCard,
            boarding_tuition_amount: 0,
          },
          {
            school_id: schoolId,
            class_name: `ITEM:${course.code}:${sem.code}:Uniform`,
            tuition_amount: totals.uniform,
            boarding_tuition_amount: 0,
          }
        );

        bd.customItems.forEach((ci) => {
          if (ci.name.trim()) {
            feeRecords.push({
              school_id: schoolId,
              class_name: `ITEM:${course.code}:${sem.code}:${ci.name.trim()}`,
              tuition_amount: Number(ci.amount.replace(/,/g, '')) || 0,
              boarding_tuition_amount: 0,
            });
          }
        });
      });

      // 2. Root Course rows for backward compatibility
      feeRecords.push(
        {
          school_id: schoolId,
          class_name: course.code,
          tuition_amount: y1s1Day,
          boarding_tuition_amount: y1s1Boarding,
        },
        {
          school_id: schoolId,
          class_name: course.fullName,
          tuition_amount: y1s1Day,
          boarding_tuition_amount: y1s1Boarding,
        }
      );

      // 3. Admission Fee record
      if (admissionFee.trim()) {
        feeRecords.push({
          school_id: schoolId,
          class_name: 'ADMISSION',
          tuition_amount: Number(admissionFee.replace(/,/g, '')) || 0,
          boarding_tuition_amount: 0,
        });
      }

      // 4. Upsert into Supabase
      const { error: upsertErr } = await supabase
        .from('school_fee_structure')
        .upsert(feeRecords, { onConflict: 'school_id,class_name' });
      if (upsertErr) throw upsertErr;

      // 5. Background sync student balances
      try {
        await fetch(registerApiUrl('/api/admin/sync-student-balances'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schoolId }),
        });
      } catch {
        // non-blocking
      }

      setSuccess(`Fee structure for ${course.name} saved successfully.`);
      setTimeout(() => setSuccess(null), 4000);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'financial', schoolId] });
      await queryClient.invalidateQueries({ queryKey: ['accountant'] });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save fee structure');
    } finally {
      setSaving(false);
    }
  };

  // Save Primary/Secondary Class Fees
  const savePrimarySecondaryFees = async () => {
    if (!schoolId) return;
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const records = classList.map((cls) => ({
        school_id: schoolId,
        class_name: cls,
        tuition_amount: Number(feeStructure[cls] || 0),
        boarding_tuition_amount: Number(feeStructure[`${cls}_boarding_tuition`] || 0),
      }));

      if (admissionFee.trim()) {
        records.push({
          school_id: schoolId,
          class_name: 'ADMISSION',
          tuition_amount: Number(admissionFee.replace(/,/g, '')) || 0,
          boarding_tuition_amount: 0,
        });
      }

      const { error: upsertErr } = await supabase
        .from('school_fee_structure')
        .upsert(records, { onConflict: 'school_id,class_name' });
      if (upsertErr) throw upsertErr;

      setSuccess('Class fees saved successfully.');
      setTimeout(() => setSuccess(null), 4000);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'financial', schoolId] });
      await queryClient.invalidateQueries({ queryKey: ['accountant'] });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save fees');
    } finally {
      setSaving(false);
    }
  };

  // Sync balances manually
  const syncStudentBalances = async () => {
    if (!schoolId) return;
    setSyncing(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(registerApiUrl('/api/admin/sync-student-balances'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId }),
      });
      const result = await response.json();
      if (response.ok) {
        setSuccess(`Balances synced for ${result.updated || 0} student(s).`);
        setTimeout(() => setSuccess(null), 4000);
      } else {
        setError(result.error || 'Failed to sync student balances');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error during balance sync');
    } finally {
      setSyncing(false);
    }
  };

  // Save one-off admission fee
  const saveAdmissionFeeOnly = async () => {
    if (!schoolId) return;
    setSaving(true);
    try {
      const { error: upsertErr } = await supabase.from('school_fee_structure').upsert(
        [
          {
            school_id: schoolId,
            class_name: 'ADMISSION',
            tuition_amount: Number(admissionFee.replace(/,/g, '')) || 0,
            boarding_tuition_amount: 0,
          },
        ],
        { onConflict: 'school_id,class_name' }
      );
      if (upsertErr) throw upsertErr;
      setSuccess('Admission fee updated.');
      setTimeout(() => setSuccess(null), 3000);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'financial', schoolId] });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update admission fee');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '32px 0', display: 'flex', alignItems: 'center', gap: '12px', color: t.textMid }}>
        <RefreshCw size={18} className="animate-spin" style={{ color: t.mint }} />
        <span style={{ fontFamily: INTER, fontSize: '14px' }}>Loading financial settings...</span>
      </div>
    );
  }

  // Active semester breakdown and totals for Course Detail view
  const currentSemesterBreakdown =
    activeCourse && activeCourseCode
      ? tertiaryBreakdowns[activeCourseCode]?.[activeSemesterCode] || createEmptyBreakdown()
      : createEmptyBreakdown();

  const currentSemesterTotals = computeSemesterTotals(currentSemesterBreakdown);
  const currentSemesterIndex =
    activeCourse?.semesters.findIndex((s) => s.code === activeSemesterCode) ?? 0;

  return (
    <div style={{ fontFamily: INTER, color: t.textHi, paddingBottom: '48px' }}>
      {/* Alert Notifications */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: '10px',
            background: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
            border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.25)' : '#FCA5A5'}`,
            color: isDark ? '#FCA5A5' : '#B91C1C',
            marginBottom: '16px',
            fontSize: '13px',
          }}
        >
          <AlertTriangle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: '10px',
            background: isDark ? 'rgba(61, 232, 160, 0.12)' : '#F0FDF4',
            border: `1px solid ${isDark ? 'rgba(61, 232, 160, 0.25)' : '#86EFAC'}`,
            color: isDark ? '#3DE8A0' : '#15803D',
            marginBottom: '16px',
            fontSize: '13px',
          }}
        >
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Top Section: Compact SchoolPay Status Card & Admission Fee Card */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        {/* Compact SchoolPay Status Card */}
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
            borderRadius: '14px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: t.mintDim,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: t.mint,
              }}
            >
              <CreditCard size={20} />
            </div>
            <div>
              <div style={{ fontFamily: SORA, fontSize: '14px', fontWeight: 600, color: t.textHi }}>
                SchoolPay Gateway
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: schoolPayStatus?.connected ? t.mint : t.gold,
                    display: 'inline-block',
                    boxShadow: schoolPayStatus?.connected ? `0 0 8px ${t.mint}` : 'none',
                  }}
                />
                <span style={{ fontSize: '12px', color: t.textMid }}>
                  {schoolPayStatus?.connected
                    ? 'Connected & Active'
                    : schoolPayStatus?.enabled
                      ? 'Enabled (Pending credentials)'
                      : 'Not Configured'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowSchoolPayModal(true)}
            style={{
              background: t.fieldBg,
              border: `1px solid ${t.stroke}`,
              borderRadius: '9px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 600,
              color: t.textHi,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            <Sliders size={13} style={{ color: t.mint }} />
            <span>Configure</span>
          </button>
        </div>

        {/* Admission Fee Card */}
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
            borderRadius: '14px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: t.blueDim,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: t.blue,
              }}
            >
              <GraduationCap size={20} />
            </div>
            <div>
              <div style={{ fontFamily: SORA, fontSize: '14px', fontWeight: 600, color: t.textHi }}>
                Admission / Registration Fee
              </div>
              <div style={{ fontSize: '12px', color: t.textMid, marginTop: '2px' }}>
                One-off charge on Year 1 enrollment
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: t.textLow }}>UGX</span>
            <input
              type="number"
              min={0}
              value={admissionFee}
              onChange={(e) => setAdmissionFee(e.target.value)}
              onBlur={saveAdmissionFeeOnly}
              placeholder="e.g. 50000"
              style={{
                width: '120px',
                padding: '7px 10px',
                background: t.fieldBg,
                border: `1px solid ${t.stroke}`,
                borderRadius: '8px',
                color: t.textHi,
                fontSize: '13px',
                fontFamily: SORA,
                textAlign: 'right',
                outline: 'none',
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isTertiary ? (
        activeCourseCode === null ? (
          /* =========================================================================
             LEVEL 1: COURSES OVERVIEW SCREEN
             ========================================================================= */
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontFamily: SORA, fontSize: '17px', fontWeight: 700, margin: 0, color: t.textHi }}>
                  Programmes & Fee Structures
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: t.textMid }}>
                  Select any course to view or configure semester tuition and itemized levy schedules.
                </p>
              </div>

              <button
                type="button"
                onClick={syncStudentBalances}
                disabled={syncing}
                style={{
                  background: t.fieldBg,
                  border: `1px solid ${t.stroke}`,
                  borderRadius: '10px',
                  padding: '9px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: t.textHi,
                  cursor: syncing ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: syncing ? 0.6 : 1,
                }}
              >
                <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} style={{ color: t.mint }} />
                <span>{syncing ? 'Syncing...' : 'Sync All Balances'}</span>
              </button>
            </div>

            {/* Course Cards Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
                gap: '16px',
              }}
            >
              {TERTIARY_COURSES.map((course) => {
                const courseSemData = tertiaryBreakdowns[course.code] || {};
                const configuredSemesters = course.semesters.filter((sem) => {
                  const bd = courseSemData[sem.code];
                  if (!bd) return false;
                  return computeSemesterTotals(bd).dayTotal > 0;
                });
                const isFullyConfigured = configuredSemesters.length === course.semesters.length;
                const isPartiallyConfigured = configuredSemesters.length > 0 && !isFullyConfigured;
                const isExpanded = expandedCourseAccordion === course.code;

                return (
                  <div
                    key={course.code}
                    style={{
                      background: t.panel,
                      border: `1px solid ${t.stroke}`,
                      borderRadius: '16px',
                      padding: '22px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    }}
                  >
                    <div>
                      {/* Course Header */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '12px',
                              background: t.mintDim,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: t.mint,
                              fontWeight: 800,
                              fontFamily: SORA,
                              fontSize: '15px',
                            }}
                          >
                            {course.code}
                          </div>
                          <div>
                            <div style={{ fontFamily: SORA, fontSize: '15px', fontWeight: 700, color: t.textHi }}>
                              {course.name}
                            </div>
                            <div style={{ fontSize: '12px', color: t.textMid, marginTop: '2px' }}>
                              {course.duration}
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '4px 10px',
                            borderRadius: '20px',
                            background: isFullyConfigured
                              ? t.mintDim
                              : isPartiallyConfigured
                                ? t.goldDim
                                : t.fieldBg,
                            color: isFullyConfigured
                              ? t.mint
                              : isPartiallyConfigured
                                ? t.gold
                                : t.textLow,
                            border: `1px solid ${
                              isFullyConfigured
                                ? t.mintRing
                                : isPartiallyConfigured
                                  ? 'rgba(245,192,68,0.25)'
                                  : t.stroke
                            }`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isFullyConfigured
                            ? `Configured (${course.semesters.length}/${course.semesters.length})`
                            : isPartiallyConfigured
                              ? `Configured (${configuredSemesters.length}/${course.semesters.length})`
                              : 'Not Configured'}
                        </span>
                      </div>

                      {/* Semester Summary Pills */}
                      <div style={{ marginTop: '18px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: t.textLow, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                          Semester Fee Schedule
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {course.semesters.map((sem) => {
                            const semBd = courseSemData[sem.code] || createEmptyBreakdown();
                            const totals = computeSemesterTotals(semBd);
                            const hasFees = totals.dayTotal > 0;

                            return (
                              <div
                                key={sem.code}
                                style={{
                                  background: t.fieldBg,
                                  border: `1px solid ${t.stroke}`,
                                  borderRadius: '8px',
                                  padding: '7px 11px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '2px',
                                  minWidth: '105px',
                                }}
                              >
                                <span style={{ fontSize: '11px', fontWeight: 700, color: t.textMid }}>
                                  {sem.short}
                                </span>
                                <span style={{ fontFamily: SORA, fontSize: '12px', fontWeight: 700, color: hasFees ? t.textHi : t.textLow }}>
                                  {hasFees ? `UGX ${fmtUGX(totals.dayTotal)}` : 'Not set'}
                                </span>
                                {hasFees && totals.hostel > 0 && (
                                  <span style={{ fontSize: '10px', color: t.mint }}>
                                    Board: UGX {fmtUGX(totals.boardingTotal)}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Expandable Breakdown Accordion */}
                      {isExpanded && (
                        <div
                          style={{
                            marginTop: '16px',
                            padding: '14px',
                            background: t.fieldBg,
                            borderRadius: '10px',
                            border: `1px solid ${t.stroke}`,
                          }}
                        >
                          <div style={{ fontSize: '11px', fontWeight: 700, color: t.textMid, textTransform: 'uppercase', marginBottom: '10px' }}>
                            Itemized Functional Fees Breakdown
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto' }}>
                            {course.semesters.map((sem) => {
                              const semBd = courseSemData[sem.code] || createEmptyBreakdown();
                              const totals = computeSemesterTotals(semBd);
                              if (totals.dayTotal === 0) return null;

                              return (
                                <div key={sem.code} style={{ fontSize: '11px', borderBottom: `1px solid ${t.divider}`, paddingBottom: '8px' }}>
                                  <div style={{ fontWeight: 700, color: t.textHi, marginBottom: '4px' }}>
                                    {sem.label}: Day UGX {fmtUGX(totals.dayTotal)} | Boarding UGX {fmtUGX(totals.boardingTotal)}
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '4px', color: t.textMid }}>
                                    <div>Tuition: UGX {fmtUGX(totals.base)}</div>
                                    <div>Hostel: UGX {fmtUGX(totals.hostel)}</div>
                                    <div>Clinical: UGX {fmtUGX(totals.clinical)}</div>
                                    <div>Facilitation: UGX {fmtUGX(totals.facilitation)}</div>
                                    <div>Guild: UGX {fmtUGX(totals.guild)}</div>
                                    <div>ID & Uniform: UGX {fmtUGX(totals.idCard + totals.uniform)}</div>
                                    {totals.customSum > 0 && <div>Custom Items: UGX {fmtUGX(totals.customSum)}</div>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: `1px solid ${t.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCourseAccordion(isExpanded ? null : course.code)
                        }
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: t.textMid,
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 0',
                        }}
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        <span>{isExpanded ? 'Hide Breakdown' : 'View Breakdown'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveCourseCode(course.code);
                          setActiveSemesterCode('Y1S1');
                        }}
                        style={{
                          background: isFullyConfigured ? t.fieldBg : `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
                          color: isFullyConfigured ? t.textHi : t.ctaText,
                          border: isFullyConfigured ? `1px solid ${t.stroke}` : 'none',
                          borderRadius: '10px',
                          padding: '9px 18px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>{isFullyConfigured ? 'Edit Fee Structure' : 'Set Fee Structure'}</span>
                        <span>&rarr;</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* =========================================================================
             LEVEL 2: COURSE DETAIL & PER-SEMESTER BUILDER
             ========================================================================= */
          activeCourse && (
            <div>
              {/* Back to courses navigation header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <button
                  type="button"
                  onClick={() => setActiveCourseCode(null)}
                  style={{
                    background: t.fieldBg,
                    border: `1px solid ${t.stroke}`,
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: t.textHi,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <ArrowLeft size={16} />
                  <span>Back to All Courses</span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => saveTertiaryCourse(activeCourse.code)}
                    disabled={saving}
                    style={{
                      background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
                      color: t.ctaText,
                      border: 'none',
                      borderRadius: '10px',
                      padding: '9px 20px',
                      fontFamily: SORA,
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: saving ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      opacity: saving ? 0.7 : 1,
                    }}
                  >
                    {saving && <RefreshCw size={14} className="animate-spin" />}
                    <span>{saving ? 'Saving...' : `Save ${activeCourse.code} Fees`}</span>
                  </button>
                </div>
              </div>

              {/* Course Title Banner */}
              <div
                style={{
                  background: t.panel,
                  border: `1px solid ${t.stroke}`,
                  borderRadius: '16px',
                  padding: '20px 24px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      background: t.mintDim,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: t.mint,
                      fontFamily: SORA,
                      fontSize: '18px',
                      fontWeight: 800,
                    }}
                  >
                    {activeCourse.code}
                  </div>
                  <div>
                    <h2 style={{ fontFamily: SORA, fontSize: '18px', fontWeight: 700, margin: 0, color: t.textHi }}>
                      {activeCourse.fullName}
                    </h2>
                    <div style={{ fontSize: '13px', color: t.textMid, marginTop: '3px' }}>
                      {activeCourse.duration} &bull; {activeCourse.semesters.length} Semesters Total
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: t.textLow, textTransform: 'uppercase', fontWeight: 600 }}>
                    Active Editing
                  </div>
                  <div style={{ fontFamily: SORA, fontSize: '14px', fontWeight: 700, color: t.mint }}>
                    {activeCourse.semesters.find((s) => s.code === activeSemesterCode)?.label}
                  </div>
                </div>
              </div>

              {/* Semester Selector Tabs */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  overflowX: 'auto',
                  paddingBottom: '8px',
                  marginBottom: '20px',
                }}
              >
                {activeCourse.semesters.map((sem, idx) => {
                  const isActive = activeSemesterCode === sem.code;
                  const semBd = tertiaryBreakdowns[activeCourse.code]?.[sem.code] || createEmptyBreakdown();
                  const totals = computeSemesterTotals(semBd);
                  const isSet = totals.dayTotal > 0;

                  return (
                    <button
                      key={sem.code}
                      type="button"
                      onClick={() => setActiveSemesterCode(sem.code)}
                      style={{
                        background: isActive ? t.panel : t.fieldBg,
                        border: `1px solid ${isActive ? t.mint : t.stroke}`,
                        borderRadius: '12px',
                        padding: '10px 16px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: '2px',
                        minWidth: '140px',
                        textAlign: 'left',
                        boxShadow: isActive ? `0 0 12px ${t.mintDim}` : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: isActive ? t.mint : t.textHi }}>
                          {sem.short}
                        </span>
                        {isSet && (
                          <Check size={12} style={{ color: t.mint }} />
                        )}
                      </div>
                      <span style={{ fontFamily: SORA, fontSize: '12px', fontWeight: 600, color: isSet ? t.textHi : t.textLow }}>
                        {isSet ? `UGX ${fmtUGX(totals.dayTotal)}` : 'Not set'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active Semester Form & Live Computed Totals */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                {/* Left Column: Core Inputs & Levies */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Semester Actions Bar */}
                  <div
                    style={{
                      background: t.panel,
                      border: `1px solid ${t.stroke}`,
                      borderRadius: '14px',
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <span style={{ fontFamily: SORA, fontSize: '14px', fontWeight: 700, color: t.textHi }}>
                        {activeCourse.semesters.find((s) => s.code === activeSemesterCode)?.label}
                      </span>
                      {copyFeedback && (
                        <div style={{ fontSize: '11px', color: t.mint, fontWeight: 600, marginTop: '2px' }}>
                          {copyFeedback}
                        </div>
                      )}
                    </div>

                    {currentSemesterIndex > 0 && (
                      <button
                        type="button"
                        onClick={() => copyFromPreviousSemester(activeCourse.code, currentSemesterIndex)}
                        style={{
                          background: t.mintDim,
                          border: `1px solid ${t.mintRing}`,
                          borderRadius: '8px',
                          padding: '7px 12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: t.mint,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Copy size={13} />
                        <span>Same as Previous Semester</span>
                      </button>
                    )}
                  </div>

                  {/* Base Tuition & Hostel Section */}
                  <div
                    style={{
                      background: t.panel,
                      border: `1px solid ${t.stroke}`,
                      borderRadius: '14px',
                      padding: '18px 20px',
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      {/* Base Tuition (Day Scholar) */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                          <Coins size={15} style={{ color: t.gold }} />
                          <label style={{ fontSize: '12px', fontWeight: 700, color: t.textHi }}>
                            Base Tuition Fee
                          </label>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: t.textLow }}>UGX</span>
                          <input
                            type="number"
                            min={0}
                            value={currentSemesterBreakdown.baseTuition}
                            onChange={(e) =>
                              updateTertiaryField(
                                activeCourse.code,
                                activeSemesterCode,
                                'baseTuition',
                                e.target.value
                              )
                            }
                            placeholder="e.g. 1200000"
                            style={{
                              width: '100%',
                              padding: '9px 12px',
                              background: t.fieldBg,
                              border: `1px solid ${t.stroke}`,
                              borderRadius: '8px',
                              color: t.textHi,
                              fontSize: '14px',
                              fontFamily: SORA,
                              fontWeight: 600,
                              outline: 'none',
                            }}
                          />
                        </div>
                        <div style={{ fontSize: '11px', color: t.textLow, marginTop: '5px' }}>
                          Day scholar academic fee
                        </div>
                      </div>

                      {/* Hostel Fee (Boarding) */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                          <Building2 size={15} style={{ color: t.mint }} />
                          <label style={{ fontSize: '12px', fontWeight: 700, color: t.textHi }}>
                            Hostel / Boarding Fee
                          </label>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: t.textLow }}>UGX</span>
                          <input
                            type="number"
                            min={0}
                            value={currentSemesterBreakdown.hostelFee}
                            onChange={(e) =>
                              updateTertiaryField(
                                activeCourse.code,
                                activeSemesterCode,
                                'hostelFee',
                                e.target.value
                              )
                            }
                            placeholder="e.g. 500000"
                            style={{
                              width: '100%',
                              padding: '9px 12px',
                              background: t.fieldBg,
                              border: `1px solid ${t.stroke}`,
                              borderRadius: '8px',
                              color: t.textHi,
                              fontSize: '14px',
                              fontFamily: SORA,
                              fontWeight: 600,
                              outline: 'none',
                            }}
                          />
                        </div>
                        <div style={{ fontSize: '11px', color: t.textLow, marginTop: '5px' }}>
                          Added for resident trainees
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Standard Levies Grid */}
                  <div
                    style={{
                      background: t.panel,
                      border: `1px solid ${t.stroke}`,
                      borderRadius: '14px',
                      padding: '18px 20px',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 700, color: t.textHi, marginBottom: '14px' }}>
                      Standard Functional Fees
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                      {/* Clinical Practical */}
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: t.textMid, display: 'block', marginBottom: '4px' }}>
                          Clinical / Hospital Placement
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={currentSemesterBreakdown.clinicalFee}
                          onChange={(e) =>
                            updateTertiaryField(
                              activeCourse.code,
                              activeSemesterCode,
                              'clinicalFee',
                              e.target.value
                            )
                          }
                          placeholder="e.g. 150000"
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            background: t.fieldBg,
                            border: `1px solid ${t.stroke}`,
                            borderRadius: '8px',
                            color: t.textHi,
                            fontSize: '13px',
                            fontFamily: SORA,
                            outline: 'none',
                          }}
                        />
                      </div>

                      {/* Examination & Facilitation */}
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: t.textMid, display: 'block', marginBottom: '4px' }}>
                          Exam & Facilitation
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={currentSemesterBreakdown.facilitationFee}
                          onChange={(e) =>
                            updateTertiaryField(
                              activeCourse.code,
                              activeSemesterCode,
                              'facilitationFee',
                              e.target.value
                            )
                          }
                          placeholder="e.g. 100000"
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            background: t.fieldBg,
                            border: `1px solid ${t.stroke}`,
                            borderRadius: '8px',
                            color: t.textHi,
                            fontSize: '13px',
                            fontFamily: SORA,
                            outline: 'none',
                          }}
                        />
                      </div>

                      {/* Guild Fee */}
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: t.textMid, display: 'block', marginBottom: '4px' }}>
                          Guild Subscription
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={currentSemesterBreakdown.guildFee}
                          onChange={(e) =>
                            updateTertiaryField(
                              activeCourse.code,
                              activeSemesterCode,
                              'guildFee',
                              e.target.value
                            )
                          }
                          placeholder="e.g. 30000"
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            background: t.fieldBg,
                            border: `1px solid ${t.stroke}`,
                            borderRadius: '8px',
                            color: t.textHi,
                            fontSize: '13px',
                            fontFamily: SORA,
                            outline: 'none',
                          }}
                        />
                      </div>

                      {/* Student ID Card */}
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: t.textMid, display: 'block', marginBottom: '4px' }}>
                          Identity Card Fee
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={currentSemesterBreakdown.idCardFee}
                          onChange={(e) =>
                            updateTertiaryField(
                              activeCourse.code,
                              activeSemesterCode,
                              'idCardFee',
                              e.target.value
                            )
                          }
                          placeholder="e.g. 20000"
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            background: t.fieldBg,
                            border: `1px solid ${t.stroke}`,
                            borderRadius: '8px',
                            color: t.textHi,
                            fontSize: '13px',
                            fontFamily: SORA,
                            outline: 'none',
                          }}
                        />
                      </div>

                      {/* Uniform Fee */}
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: t.textMid, display: 'block', marginBottom: '4px' }}>
                          Uniform & Epaulettes
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={currentSemesterBreakdown.uniformFee}
                          onChange={(e) =>
                            updateTertiaryField(
                              activeCourse.code,
                              activeSemesterCode,
                              'uniformFee',
                              e.target.value
                            )
                          }
                          placeholder="e.g. 150000"
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            background: t.fieldBg,
                            border: `1px solid ${t.stroke}`,
                            borderRadius: '8px',
                            color: t.textHi,
                            fontSize: '13px',
                            fontFamily: SORA,
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Custom Fee Items */}
                  <div
                    style={{
                      background: t.panel,
                      border: `1px solid ${t.stroke}`,
                      borderRadius: '14px',
                      padding: '18px 20px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: t.textHi }}>
                        Custom Functional Fees
                      </span>
                      <button
                        type="button"
                        onClick={() => addCustomItem(activeCourse.code, activeSemesterCode)}
                        style={{
                          background: t.fieldBg,
                          border: `1px solid ${t.stroke}`,
                          borderRadius: '8px',
                          padding: '5px 10px',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: t.mint,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Plus size={12} />
                        <span>Add Item</span>
                      </button>
                    </div>

                    {currentSemesterBreakdown.customItems.length === 0 ? (
                      <div style={{ fontSize: '12px', color: t.textLow, padding: '8px 0' }}>
                        No custom items for this semester. Click &ldquo;Add Item&rdquo; if needed.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {currentSemesterBreakdown.customItems.map((ci) => (
                          <div key={ci.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="text"
                              value={ci.name}
                              onChange={(e) =>
                                updateCustomItem(
                                  activeCourse.code,
                                  activeSemesterCode,
                                  ci.id,
                                  { name: e.target.value }
                                )
                              }
                              placeholder="Fee title (e.g. Lab Fee)"
                              style={{
                                flex: 1,
                                padding: '7px 10px',
                                background: t.fieldBg,
                                border: `1px solid ${t.stroke}`,
                                borderRadius: '8px',
                                color: t.textHi,
                                fontSize: '12px',
                                outline: 'none',
                              }}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '11px', color: t.textLow }}>UGX</span>
                              <input
                                type="number"
                                min={0}
                                value={ci.amount}
                                onChange={(e) =>
                                  updateCustomItem(
                                    activeCourse.code,
                                    activeSemesterCode,
                                    ci.id,
                                    { amount: e.target.value }
                                  )
                                }
                                placeholder="Amount"
                                style={{
                                  width: '90px',
                                  padding: '7px 10px',
                                  background: t.fieldBg,
                                  border: `1px solid ${t.stroke}`,
                                  borderRadius: '8px',
                                  color: t.textHi,
                                  fontSize: '12px',
                                  fontFamily: SORA,
                                  textAlign: 'right',
                                  outline: 'none',
                                }}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeCustomItem(activeCourse.code, activeSemesterCode, ci.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: t.red,
                                cursor: 'pointer',
                                padding: '4px',
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Live Computed Totals & Summary Table */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Live Auto-Calculated Totals Card */}
                  <div
                    style={{
                      background: t.panel,
                      border: `1px solid ${t.mintRing}`,
                      borderRadius: '16px',
                      padding: '22px',
                      boxShadow: `0 4px 20px ${t.mintDim}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calculator size={18} style={{ color: t.mint }} />
                        <span style={{ fontFamily: SORA, fontSize: '14px', fontWeight: 700, color: t.textHi }}>
                          Computed Semester Totals
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: t.mint, fontWeight: 600 }}>
                        {activeCourse.semesters.find((s) => s.code === activeSemesterCode)?.short}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                      {/* Day Scholar Total */}
                      <div
                        style={{
                          background: t.fieldBg,
                          border: `1px solid ${t.stroke}`,
                          borderRadius: '12px',
                          padding: '14px 16px',
                        }}
                      >
                        <div style={{ fontSize: '11px', fontWeight: 700, color: t.textMid, textTransform: 'uppercase' }}>
                          Day Scholar Fee
                        </div>
                        <div style={{ fontFamily: SORA, fontSize: '22px', fontWeight: 800, color: t.textHi, marginTop: '4px' }}>
                          UGX {fmtUGX(currentSemesterTotals.dayTotal)}
                        </div>
                        <div style={{ fontSize: '11px', color: t.textLow, marginTop: '4px' }}>
                          Base Tuition (UGX {fmtUGX(currentSemesterTotals.base)}) + Functional Fees (UGX{' '}
                          {fmtUGX(currentSemesterTotals.leviesTotal)})
                        </div>
                      </div>

                      {/* Boarding Total */}
                      <div
                        style={{
                          background: t.fieldBg,
                          border: `1px solid ${t.mintRing}`,
                          borderRadius: '12px',
                          padding: '14px 16px',
                        }}
                      >
                        <div style={{ fontSize: '11px', fontWeight: 700, color: t.mint, textTransform: 'uppercase' }}>
                          Boarding / Resident Fee
                        </div>
                        <div style={{ fontFamily: SORA, fontSize: '22px', fontWeight: 800, color: t.mint, marginTop: '4px' }}>
                          UGX {fmtUGX(currentSemesterTotals.boardingTotal)}
                        </div>
                        <div style={{ fontSize: '11px', color: t.textLow, marginTop: '4px' }}>
                          Day Total + Hostel Accommodation (UGX {fmtUGX(currentSemesterTotals.hostel)})
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Course Semester Overview Schedule Table */}
                  <div
                    style={{
                      background: t.panel,
                      border: `1px solid ${t.stroke}`,
                      borderRadius: '16px',
                      padding: '18px 20px',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 700, color: t.textHi, marginBottom: '12px' }}>
                      All Semesters Schedule for {activeCourse.code}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {activeCourse.semesters.map((sem) => {
                        const semBd = tertiaryBreakdowns[activeCourse.code]?.[sem.code] || createEmptyBreakdown();
                        const totals = computeSemesterTotals(semBd);
                        const isCurrent = sem.code === activeSemesterCode;
                        const isSet = totals.dayTotal > 0;

                        return (
                          <div
                            key={sem.code}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              background: isCurrent ? t.mintDim : t.fieldBg,
                              border: `1px solid ${isCurrent ? t.mintRing : t.stroke}`,
                              fontSize: '12px',
                            }}
                          >
                            <span style={{ fontWeight: 600, color: isCurrent ? t.mint : t.textHi }}>
                              {sem.label}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                              <span style={{ fontFamily: SORA, fontWeight: 700, color: isSet ? t.textHi : t.textLow }}>
                                {isSet ? `UGX ${fmtUGX(totals.dayTotal)}` : '—'}
                              </span>
                              {!isCurrent && (
                                <button
                                  type="button"
                                  onClick={() => setActiveSemesterCode(sem.code)}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: t.mint,
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    padding: '2px 4px',
                                  }}
                                >
                                  Edit
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Sticky Action Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '16px 20px',
                  background: t.panel,
                  border: `1px solid ${t.stroke}`,
                  borderRadius: '14px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveCourseCode(null)}
                  style={{
                    background: t.fieldBg,
                    border: `1px solid ${t.stroke}`,
                    borderRadius: '10px',
                    padding: '10px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: t.textHi,
                    cursor: 'pointer',
                  }}
                >
                  &larr; Back to Courses Overview
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={syncStudentBalances}
                    disabled={syncing}
                    style={{
                      background: t.fieldBg,
                      border: `1px solid ${t.stroke}`,
                      borderRadius: '10px',
                      padding: '10px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: t.textHi,
                      cursor: syncing ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} style={{ color: t.mint }} />
                    <span>{syncing ? 'Syncing...' : 'Sync Balances'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => saveTertiaryCourse(activeCourse.code)}
                    disabled={saving}
                    style={{
                      background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
                      color: t.ctaText,
                      border: 'none',
                      borderRadius: '10px',
                      padding: '10px 24px',
                      fontFamily: SORA,
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: saving ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      opacity: saving ? 0.7 : 1,
                    }}
                  >
                    {saving && <RefreshCw size={14} className="animate-spin" />}
                    <span>{saving ? 'Saving...' : `Save Fee Structure for ${activeCourse.code}`}</span>
                  </button>
                </div>
              </div>
            </div>
          )
        )
      ) : (
        /* =========================================================================
           PRIMARY / SECONDARY SCHOOL CLASS FEES
           ========================================================================= */
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontFamily: SORA, fontSize: '17px', fontWeight: 700, margin: 0, color: t.textHi }}>
                Class Fee Structures
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: t.textMid }}>
                Configure day tuition and boarding amounts per term for each class.
              </p>
            </div>

            <button
              type="button"
              onClick={savePrimarySecondaryFees}
              disabled={saving}
              style={{
                background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
                color: t.ctaText,
                border: 'none',
                borderRadius: '10px',
                padding: '9px 20px',
                fontFamily: SORA,
                fontSize: '13px',
                fontWeight: 700,
                cursor: saving ? 'default' : 'pointer',
              }}
            >
              {saving ? 'Saving...' : 'Save Class Fees'}
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
            }}
          >
            {classList.map((cls) => {
              const dayTuition = feeStructure[cls] || '';
              const boardingTuition = feeStructure[`${cls}_boarding_tuition`] || '';

              return (
                <div
                  key={cls}
                  style={{
                    background: t.panel,
                    border: `1px solid ${t.stroke}`,
                    borderRadius: '14px',
                    padding: '18px 20px',
                  }}
                >
                  <div style={{ fontFamily: SORA, fontSize: '15px', fontWeight: 700, color: t.textHi, marginBottom: '14px' }}>
                    {cls}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: t.textMid, display: 'block', marginBottom: '4px' }}>
                        Day Tuition (Per Term)
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: t.textLow }}>UGX</span>
                        <input
                          type="number"
                          min={0}
                          value={dayTuition}
                          onChange={(e) =>
                            setFeeStructure((prev) => ({ ...prev, [cls]: e.target.value }))
                          }
                          placeholder="e.g. 150000"
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            background: t.fieldBg,
                            border: `1px solid ${t.stroke}`,
                            borderRadius: '8px',
                            color: t.textHi,
                            fontSize: '13px',
                            fontFamily: SORA,
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: t.mint, display: 'block', marginBottom: '4px' }}>
                        Boarding Fee (Per Term)
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: t.textLow }}>UGX</span>
                        <input
                          type="number"
                          min={0}
                          value={boardingTuition}
                          onChange={(e) =>
                            setFeeStructure((prev) => ({
                              ...prev,
                              [`${cls}_boarding_tuition`]: e.target.value,
                            }))
                          }
                          placeholder="e.g. 300000"
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            background: t.fieldBg,
                            border: `1px solid ${t.stroke}`,
                            borderRadius: '8px',
                            color: t.textHi,
                            fontSize: '13px',
                            fontFamily: SORA,
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SchoolPay Configuration Modal */}
      <NativeModal
        isOpen={showSchoolPayModal}
        onClose={() => {
          setShowSchoolPayModal(false);
          void refetchSchoolPay();
        }}
        title="SchoolPay Configuration"
        size="xl"
      >
        <div style={{ padding: '4px 0' }}>
          <SchoolPayIntegrationCard schoolId={schoolId} />
        </div>
      </NativeModal>
    </div>
  );
}
