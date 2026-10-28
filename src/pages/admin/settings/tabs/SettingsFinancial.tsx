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
import { GovPageLoader } from '@/components/ui/GovLoadingIndicator';
import NativeModal from '@/components/NativeModal';
import SchoolPayIntegrationCard from '../components/SchoolPayIntegrationCard';
import SectionHeader from './SectionHeader';
import {
  RCSN_OFFICIAL_BANK_ACCOUNT,
  RCSN_DEFAULT_FUNCTIONAL_ITEMS,
} from '@/lib/rcsnBankDetails';

const STALE_TIME_MS = 5 * 60 * 1000;

export type CustomFeeItem = {
  id: string;
  name: string;
  amount: string;
};

export type SemesterFeeBreakdown = {
  baseTuition: string;
  hostelFee?: string;
  clinicalFee?: string;
  facilitationFee?: string;
  guildFee?: string;
  idCardFee?: string;
  uniformFee?: string;
  customItems?: CustomFeeItem[];
  functionalItems: CustomFeeItem[];
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

export function createDefaultFunctionalItems(): CustomFeeItem[] {
  return RCSN_DEFAULT_FUNCTIONAL_ITEMS.map((name, idx) => ({
    id: `rcsn-${idx}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    name,
    amount: '',
  }));
}

function createEmptyBreakdown(): SemesterFeeBreakdown {
  return {
    baseTuition: '',
    hostelFee: '',
    functionalItems: createDefaultFunctionalItems(),
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
  const base = Number((bd.baseTuition || '').replace(/,/g, '')) || 0;
  let hostel = Number((bd.hostelFee || '').replace(/,/g, '')) || 0;
  let nonHostelFunctional = 0;

  const items = bd.functionalItems && bd.functionalItems.length > 0
    ? bd.functionalItems
    : [
        { id: '1', name: 'Clinical placement', amount: bd.clinicalFee || '' },
        { id: '2', name: 'Facilitation Fee', amount: bd.facilitationFee || '' },
        { id: '3', name: 'UNASNM + Guild fee', amount: bd.guildFee || '' },
        { id: '4', name: 'Identity card/tag', amount: bd.idCardFee || '' },
        { id: '5', name: 'School Uniforms (2)', amount: bd.uniformFee || '' },
        ...(bd.customItems || []),
      ];

  items.forEach((it) => {
    const amt = Number((it.amount || '').replace(/,/g, '')) || 0;
    if (it.name.toLowerCase().includes('hostel')) {
      hostel += amt;
    } else {
      nonHostelFunctional += amt;
    }
  });

  const leviesTotal = nonHostelFunctional;
  const dayTotal = base + nonHostelFunctional;
  const boardingTotal = dayTotal + hostel;

  return {
    base,
    hostel,
    nonHostelFunctional,
    leviesTotal,
    dayTotal,
    boardingTotal,
    clinical: 0,
    facilitation: 0,
    guild: 0,
    idCard: 0,
    uniform: 0,
    customSum: 0,
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
          if (itemName === 'Base Tuition') {
            target.baseTuition = amount > 0 ? String(amount) : '';
          } else if (itemName === 'Hostel Accommodation' || itemName.toLowerCase().includes('hostel')) {
            target.hostelFee = (boardingAmount || amount) > 0 ? String(boardingAmount || amount) : '';
          } else {
            const existing = (target.functionalItems || []).find(
              (it) => it.name.trim().toLowerCase() === itemName.toLowerCase()
            );
            if (existing) {
              existing.amount = amount > 0 ? String(amount) : '';
            } else {
              target.functionalItems.push({
                id: `${courseCode}-${semCode}-${itemName}-${Math.random()}`,
                name: itemName,
                amount: amount > 0 ? String(amount) : '',
              });
            }
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
            if (itemName === 'Base Tuition' && !target.baseTuition) {
              target.baseTuition = amount > 0 ? String(amount) : '';
            } else {
              const existing = (target.functionalItems || []).find(
                (it) => it.name.trim().toLowerCase() === itemName.toLowerCase()
              );
              if (existing && !existing.amount) {
                existing.amount = amount > 0 ? String(amount) : '';
              }
            }
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
  embedded,
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

  // Update functional fee item (name or amount)
  const updateFunctionalItem = (
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
          functionalItems: (prev[courseCode][semCode].functionalItems || []).map((it) =>
            it.id === itemId ? { ...it, ...patch } : it
          ),
        },
      },
    }));
  };

  // Add new functional fee item
  const addFunctionalItem = (courseCode: string, semCode: string) => {
    const newItem: CustomFeeItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: '',
      amount: '',
    };
    setTertiaryBreakdowns((prev) => ({
      ...prev,
      [courseCode]: {
        ...prev[courseCode],
        [semCode]: {
          ...prev[courseCode][semCode],
          functionalItems: [...(prev[courseCode][semCode].functionalItems || []), newItem],
        },
      },
    }));
  };

  // Remove functional fee item from semester
  const removeFunctionalItem = (courseCode: string, semCode: string, itemId: string) => {
    setTertiaryBreakdowns((prev) => ({
      ...prev,
      [courseCode]: {
        ...prev[courseCode],
        [semCode]: {
          ...prev[courseCode][semCode],
          functionalItems: (prev[courseCode][semCode].functionalItems || []).filter(
            (it) => it.id !== itemId
          ),
        },
      },
    }));
  };

  // Reset to default circular items
  const resetDefaultFunctionalItems = (courseCode: string, semCode: string) => {
    setTertiaryBreakdowns((prev) => ({
      ...prev,
      [courseCode]: {
        ...prev[courseCode],
        [semCode]: {
          ...prev[courseCode][semCode],
          functionalItems: createDefaultFunctionalItems(),
        },
      },
    }));
  };

  // Backward-compat aliases
  const addCustomItem = addFunctionalItem;
  const updateCustomItem = updateFunctionalItem;
  const removeCustomItem = removeFunctionalItem;

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
          baseTuition: prevData.baseTuition,
          hostelFee: prevData.hostelFee,
          functionalItems: (prevData.functionalItems || []).map((ci) => ({
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
      // 1. Clean previous ITEM rows for this course before writing new ones
      await supabase
        .from('school_fee_structure')
        .delete()
        .eq('school_id', schoolId)
        .like('class_name', `ITEM:${course.code}:%`);

      // 2. Semester Totals & Itemized Rows
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

        // Also generate active cohort set aliases (e.g. "CN26 – Year 1 Semester 1", "CN25 – Year 1 Semester 1", etc.)
        // so database registration trigger and class fee sync find matching rows directly for all active sets
        const currentYear = new Date().getFullYear();
        for (let y = currentYear - 6; y <= currentYear + 4; y++) {
          const yrCode = String(y).slice(-2);
          feeRecords.push({
            school_id: schoolId,
            class_name: `${course.code}${yrCode} – ${sem.label}`,
            tuition_amount: totals.dayTotal,
            boarding_tuition_amount: totals.boardingTotal,
          });
        }

        // Tuition row
        feeRecords.push({
          school_id: schoolId,
          class_name: `ITEM:${course.code}:${sem.code}:Base Tuition`,
          tuition_amount: totals.base,
          boarding_tuition_amount: 0,
        });

        // Hostel Accommodation row (resident)
        if (totals.hostel > 0) {
          feeRecords.push({
            school_id: schoolId,
            class_name: `ITEM:${course.code}:${sem.code}:Hostel Accommodation`,
            tuition_amount: totals.hostel,
            boarding_tuition_amount: totals.hostel,
          });
        }

        // Dynamic functional items
        (bd.functionalItems || []).forEach((it) => {
          const trimmed = it.name.trim();
          if (trimmed) {
            const amt = Number(it.amount.replace(/,/g, '')) || 0;
            feeRecords.push({
              school_id: schoolId,
              class_name: `ITEM:${course.code}:${sem.code}:${trimmed}`,
              tuition_amount: amt,
              boarding_tuition_amount: trimmed.toLowerCase().includes('hostel') ? amt : 0,
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
    return <GovPageLoader message="LOADING INSTITUTIONAL FINANCIAL CONFIGURATION..." minHeight="min-h-[30vh]" />;
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
    <div className="space-y-6">
      <SectionHeader
        embedded={embedded}
        title="FEES & FINANCIAL LEDGER REGISTRY"
        badge="TREASURY CONFIGURATION"
      />

      {/* Alert Notifications */}
      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-xs font-mono text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded border border-emerald-300 bg-emerald-50 p-3 text-xs font-mono text-emerald-800">
          {success}
        </div>
      )}

      {/* Top Section: SchoolPay Status Card & Admission Fee Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* SchoolPay Gateway Card */}
        <div className="gov-card p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded border border-[#CCCCCC] bg-[#F5F5F5] flex items-center justify-center text-[#111111]">
              <CreditCard size={18} />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-[#111111] uppercase tracking-wide">
                SCHOOLPAY PAYMENT GATEWAY
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className={`w-2 h-2 rounded-full inline-block ${
                    schoolPayStatus?.connected
                      ? 'bg-emerald-600'
                      : schoolPayStatus?.enabled
                      ? 'bg-amber-500'
                      : 'bg-neutral-400'
                  }`}
                />
                <span className="text-[11px] font-mono text-[#666666] uppercase">
                  {schoolPayStatus?.connected
                    ? 'CONNECTED & ACTIVE'
                    : schoolPayStatus?.enabled
                    ? 'ENABLED (PENDING CREDENTIALS)'
                    : 'NOT CONFIGURED'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowSchoolPayModal(true)}
            className="gov-btn gov-btn-sm"
          >
            <Sliders size={13} />
            <span>CONFIGURE</span>
          </button>
        </div>

        {/* Admission Fee Card */}
        <div className="gov-card p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded border border-[#CCCCCC] bg-[#F5F5F5] flex items-center justify-center text-[#111111]">
              <GraduationCap size={18} />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-[#111111] uppercase tracking-wide">
                ADMISSION / REGISTRATION FEE
              </div>
              <div className="text-[11px] font-mono text-[#666666] uppercase mt-0.5">
                ONE-OFF CHARGE ON YEAR 1 ENROLLMENT
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[#666666]">UGX</span>
            <input
              type="number"
              min={0}
              value={admissionFee}
              onChange={(e) => setAdmissionFee(e.target.value)}
              onBlur={saveAdmissionFeeOnly}
              placeholder="e.g. 50000"
              className="gov-input font-mono text-xs w-28 text-right font-bold"
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
          <div className="space-y-4">
            {/* Control Bar */}
            <div className="gov-control-bar">
              <div className="gov-control-bar-left">
                <span className="text-xs font-mono uppercase font-bold text-[#111111] tracking-wider">
                  PROGRAMMES & ACCREDITED FEE SCHEDULES
                </span>
              </div>
              <div className="gov-control-bar-right">
                <button
                  type="button"
                  onClick={syncStudentBalances}
                  disabled={syncing}
                  className="gov-btn gov-btn-sm inline-flex items-center gap-1.5"
                >
                  <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                  <span>{syncing ? 'SYNCING LEDGERS...' : 'SYNC ALL BALANCES'}</span>
                </button>
              </div>
            </div>

            {/* RCSN Official Centenary Bank Account Banner */}
            <div className="gov-card p-4 bg-[#F9F9F9] border border-[#CCCCCC] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded border border-[#CCCCCC] bg-white flex items-center justify-center text-[#111111]">
                  <Building2 size={18} />
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase font-bold text-[#666666] tracking-wider">
                    OFFICIAL TUITION DEPOSIT ACCOUNT · {RCSN_OFFICIAL_BANK_ACCOUNT.bankName.toUpperCase()}
                  </div>
                  <div className="text-sm font-mono font-bold text-[#111111] uppercase mt-0.5">
                    {RCSN_OFFICIAL_BANK_ACCOUNT.accountName} — A/C {RCSN_OFFICIAL_BANK_ACCOUNT.accountNumber}
                  </div>
                  <div className="text-[11px] font-mono text-[#666666] mt-0.5">
                    BRANCH: {RCSN_OFFICIAL_BANK_ACCOUNT.branch.toUpperCase()} · MINIMUM 1ST INSTALLMENT: UGX 1,000,000 + 2,300/= BANK CHARGE
                  </div>
                </div>
              </div>
              <div className="gov-tag gov-tag-approved text-[10px] font-mono uppercase">
                VERIFIED TREASURY ACCOUNT
              </div>
            </div>

            {/* Course Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    className="gov-card p-5 flex flex-col justify-between space-y-4"
                  >
                    <div>
                      {/* Course Header */}
                      <div className="flex items-start justify-between gap-3 border-b border-[#E2E8F0] pb-3">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-mono font-bold bg-[#111111] text-white rounded">
                            {course.code}
                          </span>
                          <div>
                            <div className="text-sm font-mono font-bold text-[#111111] uppercase">
                              {course.name}
                            </div>
                            <div className="text-xs font-mono text-[#666666]">
                              {course.duration}
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`gov-tag ${
                            isFullyConfigured
                              ? 'gov-tag-approved'
                              : isPartiallyConfigured
                              ? 'gov-tag-warned'
                              : 'bg-[#EAEAEA] text-[#666666] border border-[#CCCCCC]'
                          } text-[10px] font-mono uppercase`}
                        >
                          {isFullyConfigured
                            ? `CONFIGURED (${course.semesters.length}/${course.semesters.length})`
                            : isPartiallyConfigured
                            ? `PARTIAL (${configuredSemesters.length}/${course.semesters.length})`
                            : 'NOT SET'}
                        </span>
                      </div>

                      {/* Semester Summary Pills */}
                      <div className="mt-3">
                        <div className="text-[10px] font-mono font-bold text-[#666666] uppercase tracking-wider mb-2">
                          SEMESTER FEE SCHEDULE (NON-RESIDENT / RESIDENT)
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {course.semesters.map((sem) => {
                            const semBd = courseSemData[sem.code] || createEmptyBreakdown();
                            const totals = computeSemesterTotals(semBd);
                            const hasFees = totals.dayTotal > 0;

                            return (
                              <div
                                key={sem.code}
                                className="border border-[#E2E8F0] bg-[#FAFAFA] rounded p-2 text-xs font-mono"
                              >
                                <span className="font-bold text-[#111111] block">
                                  {sem.short}
                                </span>
                                <span className="text-[#333333] block mt-0.5">
                                  {hasFees ? `UGX ${fmtUGX(totals.dayTotal)}` : 'NOT SET'}
                                </span>
                                {hasFees && totals.hostel > 0 && (
                                  <span className="text-[10px] text-[#666666] block">
                                    RES: UGX {fmtUGX(totals.boardingTotal)}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Expandable Breakdown Accordion */}
                      {isExpanded && (
                        <div className="mt-3 border border-[#E2E8F0] rounded p-3 bg-[#FDFDFD] space-y-2">
                          <div className="text-[10px] font-mono font-bold text-[#666666] uppercase">
                            ITEMIZED FUNCTIONAL LEVIES BREAKDOWN
                          </div>
                          <div className="space-y-2 max-h-56 overflow-y-auto">
                            {course.semesters.map((sem) => {
                              const semBd = courseSemData[sem.code] || createEmptyBreakdown();
                              const totals = computeSemesterTotals(semBd);
                              if (totals.dayTotal === 0) return null;

                              return (
                                <div key={sem.code} className="text-xs font-mono border-b border-[#EEEEEE] pb-2 last:border-b-0">
                                  <div className="font-bold text-[#111111]">
                                    {sem.label}: DAY UGX {fmtUGX(totals.dayTotal)} | RES UGX {fmtUGX(totals.boardingTotal)}
                                  </div>
                                  <div className="grid grid-cols-2 gap-1 text-[11px] text-[#555555] mt-1">
                                    <div>TUITION: UGX {fmtUGX(totals.base)}</div>
                                    <div>HOSTEL: UGX {fmtUGX(totals.hostel)}</div>
                                    <div>CLINICAL: UGX {fmtUGX(totals.clinical)}</div>
                                    <div>FACILITATION: UGX {fmtUGX(totals.facilitation)}</div>
                                    <div>GUILD: UGX {fmtUGX(totals.guild)}</div>
                                    <div>ID & UNIFORM: UGX {fmtUGX(totals.idCard + totals.uniform)}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="border-t border-[#E2E8F0] pt-3 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCourseAccordion(isExpanded ? null : course.code)
                        }
                        className="gov-btn gov-btn-sm"
                      >
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        <span>{isExpanded ? 'HIDE BREAKDOWN' : 'VIEW BREAKDOWN'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveCourseCode(course.code);
                          setActiveSemesterCode('Y1S1');
                        }}
                        className="gov-btn gov-btn-sm gov-btn-primary"
                      >
                        <span>{isFullyConfigured ? 'EDIT FEE SCHEDULE' : 'CONFIGURE SCHEDULE'}</span>
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
            <div className="space-y-5">
              {/* Top Navigation Row */}
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setActiveCourseCode(null)}
                  className="gov-btn gov-btn-sm inline-flex items-center gap-1.5"
                >
                  <ArrowLeft size={14} />
                  <span>ALL PROGRAMMES</span>
                </button>

                <button
                  type="button"
                  onClick={() => saveTertiaryCourse(activeCourse.code)}
                  disabled={saving}
                  className="gov-btn gov-btn-sm gov-btn-primary inline-flex items-center gap-1.5"
                >
                  {saving && <RefreshCw size={13} className="animate-spin" />}
                  <span>{saving ? 'SAVING...' : `SAVE ${activeCourse.code} FEES`}</span>
                </button>
              </div>

              {/* Course Title Banner */}
              <div className="gov-card p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-mono font-bold bg-[#111111] text-white rounded">
                    {activeCourse.code}
                  </span>
                  <div>
                    <h2 className="text-sm font-mono font-bold text-[#111111] uppercase">
                      {activeCourse.fullName}
                    </h2>
                    <div className="text-xs font-mono text-[#666666] mt-0.5">
                      {activeCourse.duration} · {activeCourse.semesters.length} TOTAL SEMESTERS
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono uppercase text-[#888888] block">ACTIVE SEMESTER</span>
                  <span className="text-xs font-mono font-bold text-[#111111] uppercase">
                    {activeCourse.semesters.find((s) => s.code === activeSemesterCode)?.label}
                  </span>
                </div>
              </div>

              {/* Semester Selector Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {activeCourse.semesters.map((sem) => {
                  const isActive = activeSemesterCode === sem.code;
                  const semBd = tertiaryBreakdowns[activeCourse.code]?.[sem.code] || createEmptyBreakdown();
                  const totals = computeSemesterTotals(semBd);
                  const isSet = totals.dayTotal > 0;

                  return (
                    <button
                      key={sem.code}
                      type="button"
                      onClick={() => setActiveSemesterCode(sem.code)}
                      className={`gov-btn gov-btn-sm text-left flex flex-col items-start min-w-[120px] ${
                        isActive ? 'gov-btn-primary' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-mono text-xs font-bold">{sem.short}</span>
                        {isSet && <Check size={12} className={isActive ? 'text-white' : 'text-black'} />}
                      </div>
                      <span className={`text-[10px] font-mono mt-0.5 ${isActive ? 'text-white/80' : 'text-[#666666]'}`}>
                        {isSet ? `UGX ${fmtUGX(totals.dayTotal)}` : 'NOT SET'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active Semester Form & Live Computed Totals */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Left 2 Columns: Core Inputs & Levies */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Semester Actions Bar */}
                  <div className="gov-card p-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono font-bold text-[#111111] uppercase">
                        {activeCourse.semesters.find((s) => s.code === activeSemesterCode)?.label}
                      </span>
                      {copyFeedback && (
                        <div className="text-[11px] font-mono text-emerald-700 font-bold mt-0.5">
                          {copyFeedback}
                        </div>
                      )}
                    </div>

                    {currentSemesterIndex > 0 && (
                      <button
                        type="button"
                        onClick={() => copyFromPreviousSemester(activeCourse.code, currentSemesterIndex)}
                        className="gov-btn gov-btn-sm font-mono inline-flex items-center gap-1.5"
                      >
                        <Copy size={13} />
                        <span>SAME AS PREVIOUS SEMESTER</span>
                      </button>
                    )}
                  </div>

                  {/* Base Tuition & Hostel Section */}
                  <div className="gov-card p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Tuition Fee */}
                      <div>
                        <label className="mb-1 block text-xs font-mono uppercase font-bold text-[#555555]">
                          BASE TUITION FEE *
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-[#666666]">UGX</span>
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
                            className="gov-input w-full font-mono text-xs font-bold"
                          />
                        </div>
                        <div className="text-[11px] font-mono text-[#888888] mt-1">
                          APPLICABLE TO ALL TRAINEES ENROLLED IN THIS SEMESTER
                        </div>
                      </div>

                      {/* Hostel Accommodation Fee */}
                      <div>
                        <label className="mb-1 block text-xs font-mono uppercase font-bold text-[#555555]">
                          HOSTEL ACCOMMODATION FEE (RESIDENT)
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-[#666666]">UGX</span>
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
                            className="gov-input w-full font-mono text-xs font-bold"
                          />
                        </div>
                        <div className="text-[11px] font-mono text-[#888888] mt-1">
                          ACCOMMODATION LEVY FOR BOARDING RESIDENTS
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Unified Dynamic Functional Fees Manager */}
                  <div className="gov-card p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                      <div>
                        <span className="text-xs font-mono uppercase font-bold text-[#111111] tracking-wider">
                          FUNCTIONAL FEES & OPERATIONAL LEVIES
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => resetDefaultFunctionalItems(activeCourse.code, activeSemesterCode)}
                          className="gov-btn gov-btn-sm font-mono text-xs"
                        >
                          RESTORE CIRCULAR DEFAULTS
                        </button>
                        <button
                          type="button"
                          onClick={() => addFunctionalItem(activeCourse.code, activeSemesterCode)}
                          className="gov-btn gov-btn-sm gov-btn-primary font-mono text-xs inline-flex items-center gap-1"
                        >
                          <Plus size={13} />
                          <span>+ ADD ITEM</span>
                        </button>
                      </div>
                    </div>

                    {/* Table / List of items */}
                    {(currentSemesterBreakdown.functionalItems || []).length === 0 ? (
                      <div className="text-xs font-mono text-[#888888] py-8 text-center">
                        NO FUNCTIONAL FEES CONFIGURED. CLICK &ldquo;RESTORE CIRCULAR DEFAULTS&rdquo; OR &ldquo;+ ADD ITEM&rdquo;.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                        {(currentSemesterBreakdown.functionalItems || []).map((it, idx) => (
                          <div
                            key={it.id}
                            className="flex items-center gap-2 border border-[#E2E8F0] bg-[#FAFAFA] p-2 rounded"
                          >
                            <span className="text-xs font-mono font-bold text-[#666666] w-6 text-center">
                              {idx + 1}.
                            </span>
                            <input
                              type="text"
                              value={it.name}
                              onChange={(e) =>
                                updateFunctionalItem(
                                  activeCourse.code,
                                  activeSemesterCode,
                                  it.id,
                                  { name: e.target.value }
                                )
                              }
                              placeholder="Fee name (e.g. Clinical placement)"
                              className="gov-input flex-1 font-mono text-xs uppercase"
                            />
                            {it.name.toLowerCase().includes('hostel') && (
                              <span className="gov-tag gov-tag-approved text-[10px] font-mono">
                                RESIDENT
                              </span>
                            )}
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-mono text-[#666666]">UGX</span>
                              <input
                                type="number"
                                min={0}
                                value={it.amount}
                                onChange={(e) =>
                                  updateFunctionalItem(
                                    activeCourse.code,
                                    activeSemesterCode,
                                    it.id,
                                    { amount: e.target.value }
                                  )
                                }
                                placeholder="0"
                                className="gov-input font-mono text-xs w-28 text-right font-bold"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFunctionalItem(activeCourse.code, activeSemesterCode, it.id)}
                              className="gov-btn gov-btn-sm text-red-600 border-[#CCCCCC] hover:bg-red-50 p-1"
                              title="Delete fee item"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Live Computed Totals & Summary Schedule */}
                <div className="space-y-4">
                  {/* Computed Totals Card */}
                  <div className="gov-card p-5 space-y-4 border-2 border-black">
                    <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                      <span className="text-xs font-mono uppercase font-bold text-[#111111] tracking-wider">
                        COMPUTED SEMESTER TOTALS
                      </span>
                      <span className="text-xs font-mono font-bold text-[#111111]">
                        {activeCourse.semesters.find((s) => s.code === activeSemesterCode)?.short}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {/* Non-Resident Total */}
                      <div className="border border-[#CCCCCC] bg-[#FAFAFA] p-3 rounded">
                        <span className="text-[10px] font-mono font-bold text-[#666666] uppercase block">
                          NON-RESIDENT (DAY) TOTAL
                        </span>
                        <div className="text-xl font-mono font-bold text-[#111111] mt-1">
                          UGX {fmtUGX(currentSemesterTotals.dayTotal)}
                        </div>
                        <div className="text-[10px] font-mono text-[#666666] mt-1">
                          TUITION ({fmtUGX(currentSemesterTotals.base)}) + FUNCTIONAL ({fmtUGX(currentSemesterTotals.leviesTotal)})
                        </div>
                      </div>

                      {/* Resident Total */}
                      <div className="border border-[#CCCCCC] bg-[#F5F5F5] p-3 rounded">
                        <span className="text-[10px] font-mono font-bold text-[#111111] uppercase block">
                          RESIDENT (HOSTEL INCLUDED) TOTAL
                        </span>
                        <div className="text-xl font-mono font-bold text-[#111111] mt-1">
                          UGX {fmtUGX(currentSemesterTotals.boardingTotal)}
                        </div>
                        <div className="text-[10px] font-mono text-[#666666] mt-1">
                          NON-RESIDENT + HOSTEL ({fmtUGX(currentSemesterTotals.hostel)})
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* All Semesters Schedule Overview Card */}
                  <div className="gov-card p-0 overflow-hidden">
                    <div className="border-b border-[#E2E8F0] bg-[#FDFDFD] px-4 py-3">
                      <span className="text-xs font-mono uppercase font-bold text-[#111111]">
                        SCHEDULE FOR {activeCourse.code}
                      </span>
                    </div>

                    <div className="gov-table-container">
                      <table className="gov-table">
                        <thead>
                          <tr>
                            <th className="font-mono">SEMESTER</th>
                            <th className="font-mono text-right">NON-RESIDENT</th>
                            <th className="font-mono text-right w-16">ACTION</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeCourse.semesters.map((sem) => {
                            const semBd = tertiaryBreakdowns[activeCourse.code]?.[sem.code] || createEmptyBreakdown();
                            const totals = computeSemesterTotals(semBd);
                            const isCurrent = sem.code === activeSemesterCode;
                            const isSet = totals.dayTotal > 0;

                            return (
                              <tr key={sem.code} className={isCurrent ? 'bg-[#FAFAFA]' : ''}>
                                <td className="font-mono text-xs font-bold text-[#111111]">
                                  {sem.label}
                                </td>
                                <td className="text-right font-mono text-xs font-bold text-[#111111]">
                                  {isSet ? `UGX ${fmtUGX(totals.dayTotal)}` : '—'}
                                </td>
                                <td className="text-right">
                                  {!isCurrent ? (
                                    <button
                                      type="button"
                                      onClick={() => setActiveSemesterCode(sem.code)}
                                      className="gov-btn gov-btn-sm text-[11px]"
                                    >
                                      EDIT
                                    </button>
                                  ) : (
                                    <span className="text-[10px] font-mono text-[#888888]">[ACTIVE]</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Action Bar */}
              <div className="gov-card p-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setActiveCourseCode(null)}
                  className="gov-btn gov-btn-sm"
                >
                  &larr; BACK TO OVERVIEW
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={syncStudentBalances}
                    disabled={syncing}
                    className="gov-btn gov-btn-sm inline-flex items-center gap-1.5"
                  >
                    <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                    <span>{syncing ? 'SYNCING...' : 'SYNC BALANCES'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => saveTertiaryCourse(activeCourse.code)}
                    disabled={saving}
                    className="gov-btn gov-btn-sm gov-btn-primary inline-flex items-center gap-1.5"
                  >
                    {saving && <RefreshCw size={13} className="animate-spin" />}
                    <span>{saving ? 'SAVING...' : `SAVE ${activeCourse.code} STRUCTURE`}</span>
                  </button>
                </div>
              </div>
            </div>
          )
        )
      ) : (
        /* =========================================================================
           PRIMARY / SECONDARY FALLBACK
           ========================================================================= */
        <div className="space-y-4">
          <div className="gov-control-bar">
            <div className="gov-control-bar-left">
              <span className="text-xs font-mono uppercase font-bold text-[#111111]">CLASS FEE STRUCTURES</span>
            </div>
            <div className="gov-control-bar-right">
              <button
                type="button"
                onClick={savePrimarySecondaryFees}
                disabled={saving}
                className="gov-btn gov-btn-sm gov-btn-primary"
              >
                {saving ? 'SAVING...' : 'SAVE CLASS FEES'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {classList.map((cls) => {
              const dayTuition = feeStructure[cls] || '';
              const boardingTuition = feeStructure[`${cls}_boarding_tuition`] || '';

              return (
                <div key={cls} className="gov-card p-4 space-y-3">
                  <div className="text-xs font-mono font-bold text-[#111111] uppercase border-b border-[#E2E8F0] pb-2">
                    {cls}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-mono uppercase text-[#666666]">
                      DAY TUITION (PER TERM)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[#666666]">UGX</span>
                      <input
                        type="number"
                        min={0}
                        value={dayTuition}
                        onChange={(e) =>
                          setFeeStructure((prev) => ({ ...prev, [cls]: e.target.value }))
                        }
                        placeholder="e.g. 150000"
                        className="gov-input w-full font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-mono uppercase text-[#666666]">
                      BOARDING FEE (PER TERM)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[#666666]">UGX</span>
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
                        className="gov-input w-full font-mono text-xs"
                      />
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
        title="SCHOOLPAY PAYMENT GATEWAY SPECIFICATION"
        size="xl"
      >
        <div className="p-2">
          <SchoolPayIntegrationCard schoolId={schoolId} />
        </div>
      </NativeModal>
    </div>
  );
}
