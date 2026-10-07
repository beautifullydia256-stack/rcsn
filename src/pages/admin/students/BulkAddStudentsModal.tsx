import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import NativeModal from '@/components/NativeModal';
import LiquidGlassSelect from '@/components/ui/LiquidGlassSelect';
import { addStudentSchoolQueryKey, fetchAddStudentSchoolContext } from './addStudentSchoolQuery';
import { isTertiarySchool } from '@/hooks/useSchoolType';
import { inferTertiaryAcademicStage } from '@/features/tertiary/services/tertiaryStageInference';
import { GraduationCap, Check, AlertCircle } from 'lucide-react';

const NURSERY_PRIMARY_CLASSES = [
  'Baby Class', 'Middle Class', 'Top Class',
  ...Array.from({ length: 7 }, (_, i) => `Primary ${i + 1}`),
];
const SECONDARY_CLASSES = Array.from({ length: 6 }, (_, i) => `Senior ${i + 1}`);

const TERTIARY_AWARDS = [
  { code: 'CN', name: 'Certificate in Nursing (CN) — 2.5 Yrs' },
  { code: 'DN', name: 'Diploma in Nursing (DN) — 3.0 Yrs' },
  { code: 'CM', name: 'Certificate in Midwifery (CM) — 2.5 Yrs' },
  { code: 'DM', name: 'Diploma in Midwifery (DM) — 3.0 Yrs' },
];

const CURRENT_YEAR = new Date().getFullYear();
const INTAKE_YEARS = Array.from({ length: CURRENT_YEAR - 2000 + 1 }, (_, i) => CURRENT_YEAR - i);

type EntryStatus = 'saving' | 'done' | 'error';

interface Entry {
  id: string;
  name: string;
  status: EntryStatus;
  admission_number?: string | null;
  errorMsg?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function BulkAddStudentsModal({ isOpen, onClose }: Props) {
  const user = useAuthStore((s) => s.user);
  const nameRef = useRef<HTMLInputElement>(null);

  const { data } = useQuery({
    queryKey: addStudentSchoolQueryKey(user?.id ?? ''),
    queryFn: () => fetchAddStudentSchoolContext(user!.id),
    enabled: !!user?.id && isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const schoolId = data?.schoolId ?? null;
  const schoolType = data?.schoolType ?? null;
  const feeByClass = data?.feeStructure?.feeByClass ?? {};
  const isTertiary = isTertiarySchool(schoolType);
  const classOptions = isTertiary
    ? []
    : schoolType === 'Secondary'
      ? SECONDARY_CLASSES
      : NURSERY_PRIMARY_CLASSES;

  // Primary / Secondary class state
  const [selectedClass, setSelectedClass] = useState('');

  // Tertiary cohort state
  const [tertiaryCourseCode, setTertiaryCourseCode] = useState<'CN' | 'DN' | 'CM' | 'DM'>('CN');
  const [tertiaryIntakeYear, setTertiaryIntakeYear] = useState<number>(CURRENT_YEAR);
  const [tertiaryIntakeBatch, setTertiaryIntakeBatch] = useState<string>('March Intake');
  const [tertiaryStageCode, setTertiaryStageCode] = useState<string>('Y1S1');
  const [admissionDate, setAdmissionDate] = useState<string>('');

  const [name, setName] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);

  // Tertiary stage options based on course type (Certificate vs Diploma)
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

  // Auto-infer academic stage & admission date when course, intake year, or intake session changes
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

  // Certificate only has 5 semesters (up to Y3S1); switch off Y3S2 if switched to Certificate
  useEffect(() => {
    if (!isDiploma && tertiaryStageCode === 'Y3S2') {
      setTertiaryStageCode('Y3S1');
    }
  }, [isDiploma, tertiaryStageCode]);

  // Derived tertiary cohort class name & stream
  const yrSuffix = String(tertiaryIntakeYear).slice(-2);
  const autoStream = `${tertiaryIntakeBatch} (Set ${yrSuffix})`;
  const isGrad = tertiaryStageCode === 'GRADUATED';
  const derivedTertiaryClass = useMemo(() => {
    if (isGrad) {
      return `${tertiaryCourseCode}${yrSuffix} – Completed / Graduated`;
    }
    const match = stageOptions.find((o) => o.code === tertiaryStageCode);
    const stageName = match ? match.label.split(' (')[0] : tertiaryStageCode;
    return `${tertiaryCourseCode}${yrSuffix} – ${stageName}`;
  }, [isGrad, tertiaryCourseCode, yrSuffix, stageOptions, tertiaryStageCode]);

  useEffect(() => {
    if (!isTertiary && classOptions.length && !selectedClass) {
      setSelectedClass(classOptions[0]);
    }
  }, [isTertiary, classOptions.length, selectedClass]);

  useEffect(() => {
    if (isOpen) setTimeout(() => nameRef.current?.focus(), 80);
  }, [isOpen]);

  const updateEntry = useCallback((id: string, patch: Partial<Entry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) { setInputError('Enter a student name.'); return; }
    if (!isTertiary && !selectedClass) { setInputError('Select a class first.'); return; }
    if (!schoolId) { setInputError('School not loaded yet. Please wait.'); return; }

    const id = `${Date.now()}-${Math.random()}`;

    // Immediately clear the field and add a "saving" row — user can type the next name right away
    setInputError(null);
    setName('');
    nameRef.current?.focus();
    setEntries((prev) => [{ id, name: trimmed, status: 'saving' }, ...prev]);

    const randomSeq = String(Math.floor(100 + Math.random() * 900));
    const regNo = isTertiary ? `${tertiaryCourseCode}/${tertiaryIntakeYear}/${randomSeq}` : undefined;
    const finalClass = isTertiary ? derivedTertiaryClass : selectedClass;
    const finalStream = isTertiary ? autoStream : null;
    const finalStatus = isTertiary && isGrad ? 'graduated' : 'active';
    const finalAdmissionDate = isTertiary && admissionDate
      ? admissionDate
      : new Date().toISOString().split('T')[0];

    let computedExpectedFee: number | null = null;
    if (isTertiary && isGrad) {
      computedExpectedFee = 0;
    } else {
      const match = stageOptions.find((o) => o.code === tertiaryStageCode);
      const stageName = match ? match.label.split(' (')[0] : tertiaryStageCode;
      const targetClass = isTertiary ? `${tertiaryCourseCode} – ${stageName}` : (selectedClass || '');
      if (targetClass && feeByClass[targetClass] != null && feeByClass[targetClass] > 0) {
        computedExpectedFee = feeByClass[targetClass];
      } else if (isTertiary && feeByClass[tertiaryCourseCode] != null && feeByClass[tertiaryCourseCode] > 0) {
        computedExpectedFee = feeByClass[tertiaryCourseCode];
      }
    }

    const studentPayload: Record<string, unknown> = {
      school_id: schoolId,
      name: trimmed,
      current_class: finalClass,
      stream: finalStream,
      status: finalStatus,
      admission_date: finalAdmissionDate,
      expected_fee_amount: computedExpectedFee,
    };
    if (regNo) {
      studentPayload.admission_number = regNo;
    }

    // DB insert runs in the background
    const executeInsert = async () => {
      if (isTertiary && finalClass && schoolId && computedExpectedFee != null && computedExpectedFee > 0) {
        try {
          await supabase.from('school_fee_structure').upsert(
            {
              school_id: schoolId,
              class_name: finalClass,
              tuition_amount: computedExpectedFee,
              boarding_tuition_amount: computedExpectedFee,
            },
            { onConflict: 'school_id,class_name' }
          );
        } catch {
          // Non-blocking
        }
      }

      return supabase
        .from('students')
        .insert(studentPayload)
        .select('student_id, admission_number')
        .single();
    };

    executeInsert()
      .then(({ data: inserted, error: insErr }) => {
        if (insErr) {
          updateEntry(id, { status: 'error', errorMsg: insErr.message });
        } else {
          updateEntry(id, {
            status: 'done',
            admission_number: inserted?.admission_number ?? regNo ?? null,
          });
        }
      });
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
  };

  const handleClose = () => {
    setName('');
    setInputError(null);
    setEntries([]);
    onClose();
  };

  const doneCount = entries.filter((e) => e.status === 'done').length;
  const savingCount = entries.filter((e) => e.status === 'saving').length;
  const activeClassLabel = isTertiary ? derivedTertiaryClass : selectedClass;

  return (
    <NativeModal isOpen={isOpen} onClose={handleClose} title="Bulk Add Students" size="lg">
      <div className="space-y-4 text-white">
        {/* Cohort / Class Selector */}
        {isTertiary ? (
          <div className="space-y-3 p-4 bg-black/25 rounded-2xl border border-white/20 backdrop-blur-sm shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-30">
              {/* Course / Award */}
              <div>
                <label className="block text-[11px] font-bold text-white/90 uppercase tracking-wider mb-1.5">
                  Course / Award
                </label>
                <LiquidGlassSelect
                  value={tertiaryCourseCode}
                  onChange={(val) => setTertiaryCourseCode(val as 'CN' | 'DN' | 'CM' | 'DM')}
                  options={TERTIARY_AWARDS.map((c) => ({ value: c.code, label: c.name }))}
                />
              </div>

              {/* Intake Year */}
              <div>
                <label className="block text-[11px] font-bold text-white/90 uppercase tracking-wider mb-1.5">
                  Intake Year
                </label>
                <LiquidGlassSelect
                  value={String(tertiaryIntakeYear)}
                  onChange={(val) => setTertiaryIntakeYear(Number(val))}
                  options={INTAKE_YEARS.map((yr) => ({ value: String(yr), label: `${yr} Intake` }))}
                />
              </div>

              {/* Intake Session */}
              <div>
                <label className="block text-[11px] font-bold text-white/90 uppercase tracking-wider mb-1.5">
                  Intake Session
                </label>
                <LiquidGlassSelect
                  value={tertiaryIntakeBatch}
                  onChange={(val) => setTertiaryIntakeBatch(val)}
                  options={[
                    { value: "March Intake", label: `March Intake (Set ${yrSuffix})` },
                    { value: "August Intake", label: `August Intake (Set ${yrSuffix})` },
                  ]}
                />
              </div>

              {/* Academic Stage & Standing */}
              <div>
                <label className="block text-[11px] font-bold text-white/90 uppercase tracking-wider mb-1.5">
                  Academic Stage & Standing
                </label>
                <LiquidGlassSelect
                  value={tertiaryStageCode}
                  onChange={(val) => setTertiaryStageCode(val)}
                  options={stageOptions.map((st) => ({ value: st.code, label: st.label }))}
                />
              </div>
            </div>

            {/* Smart Cohort Summary Card */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-xs text-white">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-emerald-300 shrink-0" />
                <span className="font-bold text-white">{derivedTertiaryClass}</span>
                <span className="text-white/40">•</span>
                <span className="text-white/80">{autoStream}</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full font-medium text-[11px] ${
                  isGrad
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                    : 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/40'
                }`}
              >
                {isGrad ? 'Graduated / Alumni' : 'Active Student'}
              </span>
            </div>
          </div>
        ) : (
          <div className="relative z-30">
            <label className="block text-[11px] font-bold text-white/90 uppercase tracking-wider mb-1.5">
              Class
            </label>
            <LiquidGlassSelect
              value={selectedClass}
              onChange={(val) => setSelectedClass(val)}
              options={classOptions.map((c) => ({ value: c, label: c }))}
            />
          </div>
        )}

        {/* Name input + Add button */}
        <div className="relative z-10">
          <label className="block text-[11px] font-bold text-white/90 uppercase tracking-wider mb-1.5">
            Student Name — press Enter or click Add
          </label>
          <div className="flex gap-2">
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setInputError(null); }}
              onKeyDown={handleKey}
              placeholder="Type student full name..."
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 text-white placeholder-white/40 focus:border-emerald-400/80 focus:bg-black/35 backdrop-blur-sm text-xs transition-all shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] outline-none"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!name.trim() || !schoolId}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:brightness-110 border border-emerald-300/60 shadow-[0_4px_16px_rgba(16,185,129,0.35)] transition-all active:scale-[0.98] disabled:opacity-40"
            >
              Add
            </button>
          </div>
          {inputError && (
            <p className="mt-1 text-xs text-rose-300 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{inputError}</span>
            </p>
          )}
        </div>

        {/* Live list */}
        {entries.length > 0 && (
          <div className="relative z-0">
            <div className="flex items-center justify-between mb-1.5 text-xs text-white/70">
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                {doneCount} saved{savingCount > 0 ? ` · ${savingCount} saving...` : ''}
              </span>
              <span>{activeClassLabel}</span>
            </div>
            <div className="max-h-60 overflow-y-auto rounded-2xl border border-white/20 divide-y divide-white/10 bg-black/35 backdrop-blur-sm no-scrollbar">
              {entries.map((e) => (
                <div key={e.id} className="flex items-center justify-between px-3.5 py-2.5 gap-3">
                  <span className="text-xs font-medium text-white truncate">{e.name}</span>
                  {e.status === 'saving' && (
                    <span className="text-xs text-white/50 shrink-0 animate-pulse">saving...</span>
                  )}
                  {e.status === 'done' && (
                    <span className="text-xs text-emerald-300 font-mono shrink-0 flex items-center gap-1 font-bold">
                      <Check className="w-3.5 h-3.5" />
                      <span>{e.admission_number ?? 'Saved'}</span>
                    </span>
                  )}
                  {e.status === 'error' && (
                    <span className="text-xs text-rose-300 shrink-0 font-bold" title={e.errorMsg}>
                      Failed
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-white/15 relative z-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white/90 hover:text-white bg-white/10 hover:bg-white/15 border border-white/20 backdrop-blur-md transition-all active:scale-[0.98]"
          >
            Done
          </button>
        </div>
      </div>
    </NativeModal>
  );
}
