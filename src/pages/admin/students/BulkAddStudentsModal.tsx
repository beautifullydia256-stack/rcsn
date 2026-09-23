import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import NativeModal from '@/components/NativeModal';
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
const INTAKE_YEARS = Array.from({ length: 11 }, (_, i) => CURRENT_YEAR - i);

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

    const studentPayload: Record<string, unknown> = {
      school_id: schoolId,
      name: trimmed,
      current_class: finalClass,
      stream: finalStream,
      status: finalStatus,
      admission_date: finalAdmissionDate,
      expected_fee_amount: isTertiary && isGrad ? 0 : null,
    };
    if (regNo) {
      studentPayload.admission_number = regNo;
    }

    // DB insert runs in the background
    supabase
      .from('students')
      .insert(studentPayload)
      .select('student_id, admission_number')
      .single()
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
      <div className="space-y-4">
        {/* Cohort / Class Selector */}
        {isTertiary ? (
          <div className="space-y-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Course / Award */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Course / Award
                </label>
                <select
                  value={tertiaryCourseCode}
                  onChange={(e) => setTertiaryCourseCode(e.target.value as 'CN' | 'DN' | 'CM' | 'DM')}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {TERTIARY_AWARDS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Intake Year */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Intake Year
                </label>
                <select
                  value={tertiaryIntakeYear}
                  onChange={(e) => setTertiaryIntakeYear(Number(e.target.value))}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {INTAKE_YEARS.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr} Intake
                    </option>
                  ))}
                </select>
              </div>

              {/* Intake Session */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Intake Session
                </label>
                <select
                  value={tertiaryIntakeBatch}
                  onChange={(e) => setTertiaryIntakeBatch(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="March Intake">March Intake (Set {yrSuffix})</option>
                  <option value="August Intake">August Intake (Set {yrSuffix})</option>
                </select>
              </div>

              {/* Academic Stage & Standing (with auto-inference) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Academic Stage & Standing
                </label>
                <select
                  value={tertiaryStageCode}
                  onChange={(e) => setTertiaryStageCode(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {stageOptions.map((st) => (
                    <option key={st.code} value={st.code}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Smart Cohort Summary Card */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-800/40 text-xs">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <span className="font-semibold text-slate-900 dark:text-slate-100">{derivedTertiaryClass}</span>
                <span className="text-slate-400 dark:text-slate-500">•</span>
                <span className="text-slate-600 dark:text-slate-400">{autoStream}</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full font-medium text-[11px] ${
                  isGrad
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-teal-500/15 text-teal-700 dark:text-teal-400 border border-teal-500/30'
                }`}
              >
                {isGrad ? 'Graduated / Alumni' : 'Active Student'}
              </span>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {classOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Name input + Add button */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
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
              className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!name.trim() || !schoolId}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
            >
              Add
            </button>
          </div>
          {inputError && (
            <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{inputError}</span>
            </p>
          )}
        </div>

        {/* Live list */}
        {entries.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                {doneCount} saved{savingCount > 0 ? ` · ${savingCount} saving...` : ''}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{activeClassLabel}</span>
            </div>
            <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {entries.map((e) => (
                <div key={e.id} className="flex items-center justify-between px-3 py-2 gap-3">
                  <span className="text-sm text-slate-800 dark:text-slate-100 truncate">{e.name}</span>
                  {e.status === 'saving' && (
                    <span className="text-xs text-slate-400 shrink-0 animate-pulse">saving...</span>
                  )}
                  {e.status === 'done' && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono shrink-0 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>{e.admission_number ?? 'Saved'}</span>
                    </span>
                  )}
                  {e.status === 'error' && (
                    <span className="text-xs text-red-500 shrink-0" title={e.errorMsg}>
                      Failed
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </NativeModal>
  );
}
