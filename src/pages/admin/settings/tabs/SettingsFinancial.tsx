import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Coins,
  Building2,
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  XCircle,
  RefreshCw,
  Plus,
  Trash2,
  Info,
  Stethoscope,
  ShieldCheck,
  CreditCard,
  Shirt,
  Sparkles,
  Calculator,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { registerApiUrl } from '@/lib/registerApiOrigin';
import { isTertiarySchool, useSchoolType } from '@/hooks/useSchoolType';
import SectionHeader from './SectionHeader';
import SchoolPayIntegrationCard from '../components/SchoolPayIntegrationCard';
import { settingsInsetSurface, settingsPrimaryActionClass, settingsSecondaryActionClass } from './settingsTabStyles';

const STALE_TIME_MS = 5 * 60 * 1000;

export type CustomFeeItem = {
  id: string;
  name: string;
  amount: string;
  compulsory: boolean;
};

export type CourseFeeBreakdown = {
  baseTuition: string;
  hostelFee: string;
  clinicalFee: string;
  facilitationFee: string;
  guildFee: string;
  idCardFee: string;
  uniformFee: string;
  customItems: CustomFeeItem[];
};

const TERTIARY_COURSES_META = [
  {
    code: 'CN',
    name: 'Certificate in Nursing (CN)',
    fullName: 'Certificate in Nursing',
    duration: '2.5 Years (5 Semesters)',
    semesters: ['Y1S1', 'Y1S2', 'Y2S1', 'Y2S2', 'Y3S1'],
  },
  {
    code: 'DN',
    name: 'Diploma in Nursing (DN)',
    fullName: 'Diploma in Nursing',
    duration: '3.0 Years (6 Semesters)',
    semesters: ['Y1S1', 'Y1S2', 'Y2S1', 'Y2S2', 'Y3S1', 'Y3S2'],
  },
  {
    code: 'CM',
    name: 'Certificate in Midwifery (CM)',
    fullName: 'Certificate in Midwifery',
    duration: '2.5 Years (5 Semesters)',
    semesters: ['Y1S1', 'Y1S2', 'Y2S1', 'Y2S2', 'Y3S1'],
  },
  {
    code: 'DM',
    name: 'Diploma in Midwifery (DM)',
    fullName: 'Diploma in Midwifery',
    duration: '3.0 Years (6 Semesters)',
    semesters: ['Y1S1', 'Y1S2', 'Y2S1', 'Y2S2', 'Y3S1', 'Y3S2'],
  },
];

const DEFAULT_COURSE_BREAKDOWN: CourseFeeBreakdown = {
  baseTuition: '',
  hostelFee: '',
  clinicalFee: '',
  facilitationFee: '',
  guildFee: '',
  idCardFee: '',
  uniformFee: '',
  customItems: [],
};

type FeeStatus = {
  status?: string;
  message?: string;
  description?: string;
  configured_classes?: number;
  total_classes?: number;
  action?: string;
} | null;

type FeeStructureRawRow = {
  id?: string;
  class_name: string;
  tuition_amount?: number;
  boarding_tuition_amount?: number;
};

async function fetchFinancialSettings(schoolId: string): Promise<{
  feeStructure: Record<string, string>;
  tertiaryBreakdowns: Record<string, CourseFeeBreakdown>;
  admissionFee: string;
  feeStatus: FeeStatus;
}> {
  const { data, error: fetchError } = await supabase
    .from('school_fee_structure')
    .select('*')
    .eq('school_id', schoolId);
  if (fetchError) throw fetchError;

  const feeMap: Record<string, string> = {};
  let admFee = '';
  const breakdowns: Record<string, CourseFeeBreakdown> = {
    CN: { ...DEFAULT_COURSE_BREAKDOWN, customItems: [] },
    DN: { ...DEFAULT_COURSE_BREAKDOWN, customItems: [] },
    CM: { ...DEFAULT_COURSE_BREAKDOWN, customItems: [] },
    DM: { ...DEFAULT_COURSE_BREAKDOWN, customItems: [] },
  };

  const rows = (data || []) as FeeStructureRawRow[];

  rows.forEach((fee) => {
    const amount = Number(fee.tuition_amount || 0);
    const boardingAmount = Number(fee.boarding_tuition_amount || 0);
    const name = fee.class_name;

    if (name === 'ADMISSION') {
      admFee = amount > 0 ? amount.toString() : '';
      return;
    }

    // Standard map
    feeMap[name] = amount > 0 ? amount.toString() : '';
    feeMap[`${name}_boarding_tuition`] = boardingAmount > 0 ? String(boardingAmount) : '';

    // Itemized tertiary fee breakdown (ITEM:CN:ItemName)
    if (name.startsWith('ITEM:')) {
      const parts = name.split(':');
      if (parts.length >= 3) {
        const courseCode = parts[1].toUpperCase();
        const itemName = parts.slice(2).join(':').trim();
        if (breakdowns[courseCode]) {
          const bd = breakdowns[courseCode];
          if (itemName === 'Base Tuition') {
            bd.baseTuition = amount > 0 ? String(amount) : '';
          } else if (itemName === 'Hostel Accommodation') {
            bd.hostelFee = amount > 0 ? String(amount) : '';
          } else if (itemName === 'Clinical Practical') {
            bd.clinicalFee = amount > 0 ? String(amount) : '';
          } else if (itemName === 'Facilitation Fee') {
            bd.facilitationFee = amount > 0 ? String(amount) : '';
          } else if (itemName === 'Guild Fee') {
            bd.guildFee = amount > 0 ? String(amount) : '';
          } else if (itemName === 'Student ID Card') {
            bd.idCardFee = amount > 0 ? String(amount) : '';
          } else if (itemName === 'Uniform') {
            bd.uniformFee = amount > 0 ? String(amount) : '';
          } else {
            // Custom fee item
            bd.customItems.push({
              id: `${courseCode}-${itemName}-${Date.now()}-${Math.random()}`,
              name: itemName,
              amount: amount > 0 ? String(amount) : '',
              compulsory: true,
            });
          }
        }
      }
    }
  });

  // Fallback for tertiary programmes if itemized rows don't exist yet
  TERTIARY_COURSES_META.forEach(({ code }) => {
    const bd = breakdowns[code];
    if (!bd.baseTuition && feeMap[code]) {
      bd.baseTuition = feeMap[code];
    }
    if (!bd.hostelFee && feeMap[`${code}_boarding_tuition`]) {
      const diff = Number(feeMap[`${code}_boarding_tuition`] || 0) - Number(feeMap[code] || 0);
      if (diff > 0) bd.hostelFee = String(diff);
    }
  });

  let feeStatus: FeeStatus = null;
  try {
    const { data: statusData } = await supabase.rpc('get_fee_structure_status', { p_school_id: schoolId });
    feeStatus = statusData as FeeStatus;
  } catch {
    // RPC may not exist
  }

  return { feeStructure: feeMap, tertiaryBreakdowns: breakdowns, admissionFee: admFee, feeStatus };
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
  const queryClient = useQueryClient();
  const { data: queriedSchoolType } = useSchoolType();
  const effectiveSchoolType = propSchoolType || queriedSchoolType;
  const isTertiary = isTertiarySchool(effectiveSchoolType);

  const [feeStructure, setFeeStructure] = useState<Record<string, string>>({});
  const [admissionFee, setAdmissionFee] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [feeStatus, setFeeStatus] = useState<FeeStatus>(null);

  // Tertiary breakdown state
  const [tertiaryBreakdowns, setTertiaryBreakdowns] = useState<Record<string, CourseFeeBreakdown>>({
    CN: { ...DEFAULT_COURSE_BREAKDOWN, customItems: [] },
    DN: { ...DEFAULT_COURSE_BREAKDOWN, customItems: [] },
    CM: { ...DEFAULT_COURSE_BREAKDOWN, customItems: [] },
    DM: { ...DEFAULT_COURSE_BREAKDOWN, customItems: [] },
  });
  const [activeCourseTab, setActiveCourseTab] = useState<'CN' | 'DN' | 'CM' | 'DM'>('CN');

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
      setFeeStatus(data.feeStatus);
    }
  }, [data]);

  // Update tertiary field
  const updateTertiaryField = (
    courseCode: string,
    field: keyof Omit<CourseFeeBreakdown, 'customItems'>,
    value: string
  ) => {
    setTertiaryBreakdowns((prev) => ({
      ...prev,
      [courseCode]: {
        ...prev[courseCode],
        [field]: value,
      },
    }));
  };

  // Add custom fee item
  const addCustomItem = (courseCode: string) => {
    const newItem: CustomFeeItem = {
      id: `${Date.now()}-${Math.random()}`,
      name: '',
      amount: '',
      compulsory: true,
    };
    setTertiaryBreakdowns((prev) => ({
      ...prev,
      [courseCode]: {
        ...prev[courseCode],
        customItems: [...prev[courseCode].customItems, newItem],
      },
    }));
  };

  // Update custom fee item
  const updateCustomItem = (
    courseCode: string,
    itemId: string,
    patch: Partial<CustomFeeItem>
  ) => {
    setTertiaryBreakdowns((prev) => ({
      ...prev,
      [courseCode]: {
        ...prev[courseCode],
        customItems: prev[courseCode].customItems.map((it) =>
          it.id === itemId ? { ...it, ...patch } : it
        ),
      },
    }));
  };

  // Remove custom fee item
  const removeCustomItem = (courseCode: string, itemId: string) => {
    setTertiaryBreakdowns((prev) => ({
      ...prev,
      [courseCode]: {
        ...prev[courseCode],
        customItems: prev[courseCode].customItems.filter((it) => it.id !== itemId),
      },
    }));
  };

  // Calculate live totals for the active course
  const activeBreakdown = tertiaryBreakdowns[activeCourseTab] || DEFAULT_COURSE_BREAKDOWN;
  const activeCalculations = useMemo(() => {
    const base = Number(activeBreakdown.baseTuition.replace(/,/g, '')) || 0;
    const hostel = Number(activeBreakdown.hostelFee.replace(/,/g, '')) || 0;
    const clinical = Number(activeBreakdown.clinicalFee.replace(/,/g, '')) || 0;
    const facilitation = Number(activeBreakdown.facilitationFee.replace(/,/g, '')) || 0;
    const guild = Number(activeBreakdown.guildFee.replace(/,/g, '')) || 0;
    const idCard = Number(activeBreakdown.idCardFee.replace(/,/g, '')) || 0;
    const uniform = Number(activeBreakdown.uniformFee.replace(/,/g, '')) || 0;
    const customSum = activeBreakdown.customItems.reduce(
      (sum, it) => sum + (Number(it.amount.replace(/,/g, '')) || 0),
      0
    );

    const leviesTotal = clinical + facilitation + guild + idCard + uniform + customSum;
    const dayTotal = base + leviesTotal;
    const boardingTotal = dayTotal + hostel;

    return {
      base,
      hostel,
      leviesTotal,
      dayTotal,
      boardingTotal,
      customSum,
    };
  }, [activeBreakdown]);

  const saveFeeStructure = async () => {
    if (!schoolId) return;
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const feeRecords: Array<{
        school_id: string;
        class_name: string;
        tuition_amount: number;
        boarding_tuition_amount: number;
      }> = [];

      if (isTertiary) {
        // Build tertiary records
        TERTIARY_COURSES_META.forEach((course) => {
          const bd = tertiaryBreakdowns[course.code] || DEFAULT_COURSE_BREAKDOWN;
          const base = Number(bd.baseTuition.replace(/,/g, '')) || 0;
          const hostel = Number(bd.hostelFee.replace(/,/g, '')) || 0;
          const clinical = Number(bd.clinicalFee.replace(/,/g, '')) || 0;
          const facilitation = Number(bd.facilitationFee.replace(/,/g, '')) || 0;
          const guild = Number(bd.guildFee.replace(/,/g, '')) || 0;
          const idCard = Number(bd.idCardFee.replace(/,/g, '')) || 0;
          const uniform = Number(bd.uniformFee.replace(/,/g, '')) || 0;
          const customTotal = bd.customItems.reduce(
            (sum, it) => sum + (Number(it.amount.replace(/,/g, '')) || 0),
            0
          );

          const leviesTotal = clinical + facilitation + guild + idCard + uniform + customTotal;
          const dayTotal = base + leviesTotal;
          const boardingTotal = dayTotal + hostel;

          // 1. Course Code record (e.g. 'CN')
          feeRecords.push({
            school_id: schoolId,
            class_name: course.code,
            tuition_amount: dayTotal,
            boarding_tuition_amount: boardingTotal,
          });

          // 2. Full Name record (e.g. 'Certificate in Nursing (CN)')
          feeRecords.push({
            school_id: schoolId,
            class_name: course.name,
            tuition_amount: dayTotal,
            boarding_tuition_amount: boardingTotal,
          });

          // 3. Semester stages (e.g. 'CN – Year 1 Semester 1')
          const semesterLabels: Record<string, string> = {
            Y1S1: 'Year 1 Semester 1',
            Y1S2: 'Year 1 Semester 2',
            Y2S1: 'Year 2 Semester 1',
            Y2S2: 'Year 2 Semester 2',
            Y3S1: 'Year 3 Semester 1',
            Y3S2: 'Year 3 Semester 2',
          };

          course.semesters.forEach((semCode) => {
            const semLabel = semesterLabels[semCode] || semCode;
            feeRecords.push({
              school_id: schoolId,
              class_name: `${course.code} – ${semLabel}`,
              tuition_amount: dayTotal,
              boarding_tuition_amount: boardingTotal,
            });
          });

          // 4. Itemized component rows for audit and billing breakdown
          feeRecords.push(
            {
              school_id: schoolId,
              class_name: `ITEM:${course.code}:Base Tuition`,
              tuition_amount: base,
              boarding_tuition_amount: 0,
            },
            {
              school_id: schoolId,
              class_name: `ITEM:${course.code}:Hostel Accommodation`,
              tuition_amount: hostel,
              boarding_tuition_amount: hostel,
            },
            {
              school_id: schoolId,
              class_name: `ITEM:${course.code}:Clinical Practical`,
              tuition_amount: clinical,
              boarding_tuition_amount: 0,
            },
            {
              school_id: schoolId,
              class_name: `ITEM:${course.code}:Facilitation Fee`,
              tuition_amount: facilitation,
              boarding_tuition_amount: 0,
            },
            {
              school_id: schoolId,
              class_name: `ITEM:${course.code}:Guild Fee`,
              tuition_amount: guild,
              boarding_tuition_amount: 0,
            },
            {
              school_id: schoolId,
              class_name: `ITEM:${course.code}:Student ID Card`,
              tuition_amount: idCard,
              boarding_tuition_amount: 0,
            },
            {
              school_id: schoolId,
              class_name: `ITEM:${course.code}:Uniform`,
              tuition_amount: uniform,
              boarding_tuition_amount: 0,
            }
          );

          // Custom items
          bd.customItems.forEach((ci) => {
            const trimmedName = ci.name.trim();
            if (trimmedName) {
              feeRecords.push({
                school_id: schoolId,
                class_name: `ITEM:${course.code}:${trimmedName}`,
                tuition_amount: Number(ci.amount.replace(/,/g, '')) || 0,
                boarding_tuition_amount: 0,
              });
            }
          });
        });
      } else {
        // Primary / Secondary standard classes
        classList.forEach((className) => {
          feeRecords.push({
            school_id: schoolId,
            class_name: className,
            tuition_amount: parseInt(feeStructure[className] || '0', 10) || 0,
            boarding_tuition_amount:
              parseInt(feeStructure[`${className}_boarding_tuition`] || '0', 10) || 0,
          });
        });
      }

      // One-time Admission Fee
      feeRecords.push({
        school_id: schoolId,
        class_name: 'ADMISSION',
        tuition_amount: parseInt(admissionFee || '0', 10) || 0,
        boarding_tuition_amount: 0,
      });

      const { error: upsertError } = await supabase
        .from('school_fee_structure')
        .upsert(feeRecords, { onConflict: 'school_id,class_name' });

      if (upsertError) throw upsertError;

      try {
        const { data: statusData } = await supabase.rpc('get_fee_structure_status', {
          p_school_id: schoolId,
        });
        setFeeStatus(statusData as typeof feeStatus);
      } catch {
        // ignore
      }

      try {
        const syncResponse = await fetch(registerApiUrl('/api/admin/sync-student-balances'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schoolId }),
        });
        const syncResult = await syncResponse.json();
        if (syncResponse.ok) {
          const invN =
            (syncResult.invoicesCreated || 0) + (syncResult.invoicesUpdated || 0) > 0
              ? ` Invoices aligned: ${syncResult.invoicesCreated || 0} created, ${syncResult.invoicesUpdated || 0} updated.`
              : '';
          setSuccess(
            `Fee structure saved! ${syncResult.updated || 0} student(s) updated with new fees.${invN}`
          );
        } else {
          setSuccess('Fee structure saved successfully! (Balance sync running in background)');
        }
      } catch {
        setSuccess('Fee structure saved successfully!');
      }

      setTimeout(() => setSuccess(null), 5000);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'financial', schoolId] });
      await queryClient.invalidateQueries({ queryKey: ['accountant'] });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save fee structure');
    } finally {
      setSaving(false);
    }
  };

  const updateClassFee = (className: string, value: string) => {
    setFeeStructure((prev) => ({ ...prev, [className]: value }));
  };

  const displayFeeStatus = feeStatus ?? data?.feeStatus;

  if (isLoading) {
    return (
      <div>
        <SectionHeader
          embedded={embedded}
          title="Financial Settings"
          desc="Configure tuition fees and itemized structures for automated student billing."
        />
        <div className="flex items-center gap-2 py-8 text-sm ac-text-muted">
          <RefreshCw size={18} className="animate-spin text-emerald-500" />
          <span>Loading fee structure...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        embedded={embedded}
        title="Financial Settings"
        desc={
          isTertiary
            ? 'Configure per-semester course tuition, hostel accommodation, and itemized levies (clinical, guild, facilitation, uniform). Fees auto-populate when enrolling students.'
            : 'Configure tuition fees per class and admission/registration fees. These will auto-populate when adding students.'
        }
      />

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-950/40 p-3 text-sm text-red-100">
          <AlertTriangle size={16} className="shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-950/40 p-3 text-sm text-emerald-100">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      {displayFeeStatus && (
        <div
          className={`mb-5 rounded-lg border p-4 ${
            displayFeeStatus.status === 'fully_configured'
              ? 'border-emerald-500/40 bg-emerald-950/30'
              : displayFeeStatus.status === 'partially_configured'
                ? 'border-amber-500/40 bg-amber-950/30'
                : displayFeeStatus.status === 'not_configured'
                  ? 'border-orange-500/40 bg-orange-950/30'
                  : 'border-red-500/40 bg-red-950/30'
          }`}
        >
          <div className="mb-1 flex items-center gap-2">
            {displayFeeStatus.status === 'fully_configured' ? (
              <CheckCircle2 size={18} className="text-emerald-400" />
            ) : displayFeeStatus.status === 'partially_configured' ? (
              <AlertTriangle size={18} className="text-amber-400" />
            ) : displayFeeStatus.status === 'not_configured' ? (
              <Wrench size={18} className="text-orange-400" />
            ) : (
              <XCircle size={18} className="text-red-400" />
            )}
            <h3
              className={`text-sm font-semibold ${
                displayFeeStatus.status === 'fully_configured'
                  ? 'text-emerald-200'
                  : displayFeeStatus.status === 'partially_configured'
                    ? 'text-amber-100'
                    : displayFeeStatus.status === 'not_configured'
                      ? 'text-orange-100'
                      : 'text-red-100'
              }`}
            >
              {displayFeeStatus.message}
            </h3>
          </div>
          <p className="mb-2 text-xs ac-text-secondary">{displayFeeStatus.description}</p>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs ac-text-muted">
            <span>
              Configured: {displayFeeStatus.configured_classes || 0}/{displayFeeStatus.total_classes || 0} classes
            </span>
            <span>{displayFeeStatus.action}</span>
          </div>
        </div>
      )}

      {/* Admission / Registration Fee Section */}
      <div className={`mb-6 ${settingsInsetSurface} p-4 sm:p-5`}>
        <div className="mb-2 flex items-center gap-2">
          <GraduationCap size={18} className="text-purple-400" />
          <h3 className="font-semibold text-purple-300">Admission / Registration Fee (One-Off)</h3>
        </div>
        <p className="mb-3 text-xs ac-text-secondary">
          Charged once upon initial admission into Year 1 Semester 1 or first intake session.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <label className="text-xs font-medium ac-text-secondary shrink-0">Amount (UGX):</label>
          <input
            type="number"
            min={0}
            value={admissionFee || ''}
            onChange={(e) => setAdmissionFee(e.target.value)}
            className="ac-input w-full max-w-xs min-h-[42px] font-mono text-sm"
            placeholder="e.g. 50000"
          />
        </div>
      </div>

      {isTertiary ? (
        /* Tertiary Itemized Course & Semester Fee Builder */
        <div className="mb-6 space-y-6">
          {/* Course Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--pw-border)] pb-3">
            {TERTIARY_COURSES_META.map((course) => {
              const active = activeCourseTab === course.code;
              return (
                <button
                  key={course.code}
                  type="button"
                  onClick={() => setActiveCourseTab(course.code as 'CN' | 'DN' | 'CM' | 'DM')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition-colors ${
                    active
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'border border-[var(--pw-border)] bg-[var(--pw-s2)] ac-text-secondary hover:bg-[var(--pw-s3)]'
                  }`}
                >
                  <Stethoscope size={15} />
                  <span>{course.code}</span>
                  <span className="hidden sm:inline font-normal opacity-90">— {course.fullName}</span>
                </button>
              );
            })}
          </div>

          {/* Active Course Form */}
          {(() => {
            const courseMeta = TERTIARY_COURSES_META.find((c) => c.code === activeCourseTab)!;
            const bd = activeBreakdown;

            return (
              <div className="space-y-6">
                {/* Course Header Banner */}
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-base font-bold text-emerald-300">{courseMeta.name}</h4>
                      <p className="text-xs ac-text-secondary">
                        Duration: {courseMeta.duration} • Applicable across {courseMeta.semesters.length} semesters
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
                      Standard Semester Rate
                    </span>
                  </div>
                </div>

                {/* Core Tuition & Accommodation Inputs */}
                <div className={`grid gap-4 md:grid-cols-2 ${settingsInsetSurface} p-4 sm:p-5`}>
                  {/* Base Tuition */}
                  <div className="rounded-lg border border-[var(--pw-border)] bg-[var(--pw-s2)] p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Coins size={16} className="text-amber-400" />
                        <label className="text-xs font-bold ac-text-primary uppercase tracking-wider">
                          Base Tuition Fee (Day Scholar)
                        </label>
                      </div>
                      <span className="text-[11px] text-emerald-400 font-semibold">Per Semester</span>
                    </div>
                    <p className="mb-3 text-xs ac-text-secondary">
                      Academic tuition fee payable by day scholars and boarding students alike.
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold ac-text-muted">UGX</span>
                      <input
                        type="number"
                        min={0}
                        value={bd.baseTuition}
                        onChange={(e) => updateTertiaryField(activeCourseTab, 'baseTuition', e.target.value)}
                        placeholder="e.g. 1200000"
                        className="ac-input min-h-[44px] flex-1 font-mono font-bold text-sm"
                      />
                    </div>
                  </div>

                  {/* Accommodation / Hostel Fee */}
                  <div className="rounded-lg border border-teal-500/30 bg-[var(--pw-s2)] p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-teal-400" />
                        <label className="text-xs font-bold ac-text-primary uppercase tracking-wider">
                          Hostel / Accommodation Fee
                        </label>
                      </div>
                      <span className="text-[11px] text-teal-300 font-semibold">Boarding Only</span>
                    </div>
                    <p className="mb-3 text-xs ac-text-secondary">
                      Added exclusively for resident / boarding students residing in college hostels.
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold ac-text-muted">UGX</span>
                      <input
                        type="number"
                        min={0}
                        value={bd.hostelFee}
                        onChange={(e) => updateTertiaryField(activeCourseTab, 'hostelFee', e.target.value)}
                        placeholder="e.g. 500000"
                        className="ac-input min-h-[44px] flex-1 font-mono font-bold text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Standard Tertiary Levies */}
                <div className={`${settingsInsetSurface} p-4 sm:p-5`}>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold ac-text-primary flex items-center gap-2">
                        <ShieldCheck size={16} className="text-blue-400" />
                        <span>Standard Levies & Institutional Fees</span>
                      </h4>
                      <p className="text-xs ac-text-secondary">
                        Mandatory items automatically factored into the total semester fee for this course.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Clinical / Practical Placement Fee */}
                    <div className="rounded-lg border border-[var(--pw-border)] bg-[var(--pw-s2)] p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <label className="text-xs font-medium ac-text-primary flex items-center gap-1.5">
                          <Stethoscope size={13} className="text-emerald-400" />
                          <span>Clinical / Hospital Placement</span>
                        </label>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs ac-text-muted">UGX</span>
                        <input
                          type="number"
                          min={0}
                          value={bd.clinicalFee}
                          onChange={(e) => updateTertiaryField(activeCourseTab, 'clinicalFee', e.target.value)}
                          placeholder="e.g. 150000"
                          className="ac-input min-h-[38px] flex-1 text-xs font-mono"
                        />
                      </div>
                    </div>

                    {/* Examination & Facilitation Fee */}
                    <div className="rounded-lg border border-[var(--pw-border)] bg-[var(--pw-s2)] p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <label className="text-xs font-medium ac-text-primary flex items-center gap-1.5">
                          <Calculator size={13} className="text-purple-400" />
                          <span>Exam & Facilitation</span>
                        </label>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs ac-text-muted">UGX</span>
                        <input
                          type="number"
                          min={0}
                          value={bd.facilitationFee}
                          onChange={(e) => updateTertiaryField(activeCourseTab, 'facilitationFee', e.target.value)}
                          placeholder="e.g. 100000"
                          className="ac-input min-h-[38px] flex-1 text-xs font-mono"
                        />
                      </div>
                    </div>

                    {/* Guild Fee */}
                    <div className="rounded-lg border border-[var(--pw-border)] bg-[var(--pw-s2)] p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <label className="text-xs font-medium ac-text-primary flex items-center gap-1.5">
                          <ShieldCheck size={13} className="text-amber-400" />
                          <span>Guild Subscription Fee</span>
                        </label>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs ac-text-muted">UGX</span>
                        <input
                          type="number"
                          min={0}
                          value={bd.guildFee}
                          onChange={(e) => updateTertiaryField(activeCourseTab, 'guildFee', e.target.value)}
                          placeholder="e.g. 30000"
                          className="ac-input min-h-[38px] flex-1 text-xs font-mono"
                        />
                      </div>
                    </div>

                    {/* Student ID Card */}
                    <div className="rounded-lg border border-[var(--pw-border)] bg-[var(--pw-s2)] p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <label className="text-xs font-medium ac-text-primary flex items-center gap-1.5">
                          <CreditCard size={13} className="text-cyan-400" />
                          <span>Student Identity Card</span>
                        </label>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs ac-text-muted">UGX</span>
                        <input
                          type="number"
                          min={0}
                          value={bd.idCardFee}
                          onChange={(e) => updateTertiaryField(activeCourseTab, 'idCardFee', e.target.value)}
                          placeholder="e.g. 20000"
                          className="ac-input min-h-[38px] flex-1 text-xs font-mono"
                        />
                      </div>
                    </div>

                    {/* Uniform Fee */}
                    <div className="rounded-lg border border-[var(--pw-border)] bg-[var(--pw-s2)] p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <label className="text-xs font-medium ac-text-primary flex items-center gap-1.5">
                          <Shirt size={13} className="text-pink-400" />
                          <span>Uniform & Epaulettes</span>
                        </label>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs ac-text-muted">UGX</span>
                        <input
                          type="number"
                          min={0}
                          value={bd.uniformFee}
                          onChange={(e) => updateTertiaryField(activeCourseTab, 'uniformFee', e.target.value)}
                          placeholder="e.g. 150000"
                          className="ac-input min-h-[38px] flex-1 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Custom Fee Items */}
                <div className={`${settingsInsetSurface} p-4 sm:p-5`}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold ac-text-primary flex items-center gap-2">
                        <Sparkles size={16} className="text-indigo-400" />
                        <span>Additional / Custom Fee Items</span>
                      </h4>
                      <p className="text-xs ac-text-secondary">
                        Add any specific institution items such as Computer Lab, Library, or Special Practicals.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => addCustomItem(activeCourseTab)}
                      className="flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-950/40 px-3 py-1.5 text-xs font-bold text-indigo-300 hover:bg-indigo-900/50"
                    >
                      <Plus size={14} />
                      <span>Add Custom Fee Item</span>
                    </button>
                  </div>

                  {bd.customItems.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[var(--pw-border)] p-4 text-center text-xs ac-text-muted">
                      No custom fee items added for {courseMeta.code}. Click &ldquo;Add Custom Fee Item&rdquo; to add one.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {bd.customItems.map((ci) => (
                        <div
                          key={ci.id}
                          className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--pw-border)] bg-[var(--pw-s2)] p-2.5"
                        >
                          <input
                            type="text"
                            value={ci.name}
                            onChange={(e) =>
                              updateCustomItem(activeCourseTab, ci.id, { name: e.target.value })
                            }
                            placeholder="Fee item title (e.g. Computer Lab Fee)"
                            className="ac-input min-h-[38px] flex-1 min-w-[160px] text-xs"
                          />
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs ac-text-muted">UGX</span>
                            <input
                              type="number"
                              min={0}
                              value={ci.amount}
                              onChange={(e) =>
                                updateCustomItem(activeCourseTab, ci.id, { amount: e.target.value })
                              }
                              placeholder="Amount"
                              className="ac-input min-h-[38px] w-28 text-xs font-mono"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCustomItem(activeCourseTab, ci.id)}
                            title="Remove fee item"
                            className="rounded p-2 text-red-400 hover:bg-red-950/50 hover:text-red-300"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Live Auto-Calculated Totals Card */}
                <div className="rounded-xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 to-teal-950/30 p-5 shadow-lg">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                      <Calculator size={18} />
                      <span>Live Computed Semester Totals for {courseMeta.code}</span>
                    </h4>
                    <span className="text-xs font-mono text-emerald-400/80">Auto-calculated</span>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Day Scholar Total */}
                    <div className="rounded-lg border border-emerald-500/30 bg-black/30 p-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        Total Day Scholar Fee
                      </span>
                      <div className="mt-1 font-mono text-2xl font-extrabold text-white">
                        UGX {activeCalculations.dayTotal.toLocaleString()}
                      </div>
                      <p className="mt-2 text-[11px] text-white/70">
                        Base Tuition (UGX {activeCalculations.base.toLocaleString()}) + Active Levies (UGX{' '}
                        {activeCalculations.leviesTotal.toLocaleString()})
                      </p>
                    </div>

                    {/* Boarding / Resident Total */}
                    <div className="rounded-lg border border-teal-500/30 bg-black/30 p-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
                        Total Boarding / Resident Fee
                      </span>
                      <div className="mt-1 font-mono text-2xl font-extrabold text-white">
                        UGX {activeCalculations.boardingTotal.toLocaleString()}
                      </div>
                      <p className="mt-2 text-[11px] text-white/70">
                        Day Scholar Total + Hostel Accommodation (UGX{' '}
                        {activeCalculations.hostel.toLocaleString()})
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        /* Primary / Secondary Class-by-Class View */
        <div className="space-y-6 mb-6">
          <div className={`${settingsInsetSurface} p-4 sm:p-5`}>
            <div className="mb-2 flex items-center gap-2">
              <Coins size={18} className="text-amber-400" />
              <h3 className="font-semibold ac-text-primary">Day Tuition Fees Per Class (Per Term)</h3>
            </div>
            <p className="mb-4 text-xs ac-text-secondary">
              Set the tuition amount <strong>per term</strong> for each class.
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {classList.map((className) => (
                <div
                  key={className}
                  className="rounded-lg border border-[var(--pw-border)] bg-[var(--pw-s2)] p-4"
                >
                  <label className="mb-2 block text-xs font-bold ac-text-primary">{className}</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold ac-text-muted">UGX</span>
                    <input
                      type="number"
                      min={0}
                      value={feeStructure[className] || ''}
                      onChange={(e) => updateClassFee(className, e.target.value)}
                      className="ac-input min-h-[44px] flex-1 font-mono text-sm"
                      placeholder="e.g. 100000"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] ac-text-muted font-mono">
                    {feeStructure[className] && parseInt(feeStructure[className], 10) > 0
                      ? `~UGX ${(parseInt(feeStructure[className], 10) * 3).toLocaleString()} / year (3 terms)`
                      : 'Fee not configured'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className={`${settingsInsetSurface} p-4 sm:p-5`}>
            <div className="mb-2 flex items-center gap-2">
              <Building2 size={18} className="text-teal-400" />
              <h3 className="font-semibold ac-text-primary">Boarding Fees Per Class (Per Term)</h3>
            </div>
            <p className="mb-4 text-xs ac-text-secondary">
              Set total boarding tuition <strong>per term</strong> for each class.
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {classList.map((className) => (
                <div
                  key={className}
                  className="rounded-lg border border-teal-500/30 bg-[var(--pw-s2)] p-4"
                >
                  <label className="mb-2 block text-xs font-bold text-teal-300">
                    {className} — Boarding
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold ac-text-muted">UGX</span>
                    <input
                      type="number"
                      min={0}
                      value={feeStructure[`${className}_boarding_tuition`] || ''}
                      onChange={(e) => updateClassFee(`${className}_boarding_tuition`, e.target.value)}
                      className="ac-input min-h-[44px] flex-1 font-mono text-sm"
                      placeholder="e.g. 150000"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] ac-text-muted font-mono">
                    {(() => {
                      const tuition = parseInt(
                        feeStructure[`${className}_boarding_tuition`] || '0',
                        10
                      );
                      return tuition > 0
                        ? `UGX ${tuition.toLocaleString()} / term (~UGX ${(tuition * 3).toLocaleString()} / year)`
                        : 'Boarding fees not configured';
                    })()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SchoolPay Integration Card */}
      <SchoolPayIntegrationCard schoolId={schoolId} />

      {/* Action Buttons */}
      <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={async () => {
            if (!schoolId) return;
            if (!confirm('Manually sync balances for all students based on current fee structure?'))
              return;
            setSaving(true);
            try {
              const response = await fetch(registerApiUrl('/api/admin/sync-student-balances'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ schoolId }),
              });
              const result = await response.json();
              if (response.ok) {
                setSuccess(`Synced ${result.updated || 0} student(s) with current fees!`);
                setTimeout(() => setSuccess(null), 5000);
              } else {
                setError(result.error || 'Failed to sync balances');
              }
            } catch (err: unknown) {
              setError(err instanceof Error ? err.message : 'Failed to sync balances');
            } finally {
              setSaving(false);
            }
          }}
          disabled={saving}
          className={`${settingsSecondaryActionClass} flex items-center justify-center gap-2`}
        >
          <RefreshCw size={15} className={saving ? 'animate-spin' : ''} />
          <span>Sync Student Balances</span>
        </button>

        <button
          type="button"
          onClick={saveFeeStructure}
          disabled={saving}
          className={`${settingsPrimaryActionClass} flex items-center justify-center gap-2`}
        >
          {saving && <RefreshCw size={15} className="animate-spin" />}
          <span>{saving ? 'Saving Fee Structure...' : 'Save Fee Structure'}</span>
        </button>
      </div>

      {/* Guidance Info Box */}
      <div className={`mt-6 ${settingsInsetSurface} p-4 sm:p-5`}>
        <div className="mb-2 flex items-center gap-2">
          <Info size={16} className="text-blue-400" />
          <h4 className="text-xs font-bold text-blue-300 uppercase tracking-wider">
            How Fee Calculation Works
          </h4>
        </div>
        <ul className="space-y-1.5 text-xs ac-text-muted">
          <li>
            • <strong>Student Admission:</strong> Selecting a course or class automatically applies the computed fee to the student.
          </li>
          <li>
            • <strong>Boarding vs Day Scholar:</strong> Boarding students are charged the Day Scholar total plus Hostel Accommodation.
          </li>
          <li>
            • <strong>Audit Trail:</strong> Invoices generated for past or current cohorts retain their original amounts even if structures are updated.
          </li>
          <li>
            • <strong>Discounts & Bursaries:</strong> Individual student discounts are deducted from the expected fee upon admission.
          </li>
        </ul>
      </div>
    </div>
  );
}
