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
    <NativeModal
      isOpen={isOpen}
      onClose={handleClose}
      title={isTertiary ? 'Bulk Trainee Enrolment' : 'Bulk Student Enrolment'}
      subtitle="Rapid single-line registration directly into academic cohorts"
      icon={GraduationCap}
      size="lg"
      variant="government"
    >
      <div className="space-y-4 text-slate-900 font-sans">
        {/* Cohort / Class Selector */}
        {isTertiary ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Course / Award */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Course / Award
                </label>
                <select
                  value={tertiaryCourseCode}
                  onChange={(e) => setTertiaryCourseCode(e.target.value as 'CN' | 'DN' | 'CM' | 'DM')}
                  className="w-full px-3 py-2 text-xs font-sans bg-white border border-slate-300 rounded-lg focus:border-slate-800 focus:outline-none transition-colors"
                >
                  {TERTIARY_AWARDS.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Intake Year */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Intake Year
                </label>
                <select
                  value={String(tertiaryIntakeYear)}
                  onChange={(e) => setTertiaryIntakeYear(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-sans bg-white border border-slate-300 rounded-lg focus:border-slate-800 focus:outline-none transition-colors"
                >
                  {INTAKE_YEARS.map((yr) => (
                    <option key={yr} value={String(yr)}>{yr} Intake</option>
                  ))}
                </select>
              </div>

              {/* Intake Session */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Intake Session
                </label>
                <select
                  value={tertiaryIntakeBatch}
                  onChange={(e) => setTertiaryIntakeBatch(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-sans bg-white border border-slate-300 rounded-lg focus:border-slate-800 focus:outline-none transition-colors"
                >
                  <option value="March Intake">March Intake (Set {yrSuffix})</option>
                  <option value="August Intake">August Intake (Set {yrSuffix})</option>
                </select>
              </div>

              {/* Academic Stage & Standing */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Academic Stage & Standing
                </label>
                <select
                  value={tertiaryStageCode}
                  onChange={(e) => setTertiaryStageCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-sans bg-white border border-slate-300 rounded-lg focus:border-slate-800 focus:outline-none transition-colors"
                >
                  {stageOptions.map((st) => (
                    <option key={st.code} value={st.code}>{st.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Smooth Cohort Confirmation Banner */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-slate-700 shrink-0" />
                <span className="font-semibold text-slate-900">{derivedTertiaryClass}</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600">{autoStream}</span>
              </div>
              <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-slate-200/80 text-slate-800">
                {isGrad ? 'Alumni / Completed' : 'Active Student'}
              </span>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Class / Level
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 text-xs font-sans bg-white border border-slate-300 rounded-lg focus:border-slate-800 focus:outline-none"
            >
              {classOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        {/* Rapid Name Input Box */}
        <div className="pt-1">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
              className="flex-1 px-3 py-2 text-xs font-sans bg-white border border-slate-300 rounded-lg placeholder-slate-400 focus:border-slate-800 focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!name.trim() || !schoolId}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-40 shrink-0 shadow-sm"
            >
              <span>+ Add Student</span>
            </button>
          </div>
          {inputError && (
            <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-sans">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{inputError}</span>
            </p>
          )}
        </div>

        {/* Batch Enrollment Ledger Table */}
        {entries.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="font-semibold text-[11px] uppercase tracking-wider">
                {doneCount} Enrolled {savingCount > 0 ? ` · ${savingCount} saving…` : ''}
              </span>
              <span className="font-medium text-slate-800">{activeClassLabel}</span>
            </div>
            <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl bg-white">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                    <th className="py-2.5 px-3 w-10 text-center border-r border-slate-200">#</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Trainee Name</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Assigned ID</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map((e, idx) => (
                    <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2 px-3 text-center border-r border-slate-200 text-slate-400 font-mono text-[11px]">
                        {entries.length - idx}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-900 border-r border-slate-200">
                        {e.name}
                      </td>
                      <td className="py-2 px-3 text-slate-600 border-r border-slate-200 font-mono text-[11px]">
                        {e.admission_number || (e.status === 'saving' ? 'Generating…' : '—')}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {e.status === 'saving' && (
                          <span className="text-[11px] text-slate-400 animate-pulse font-medium">Saving…</span>
                        )}
                        {e.status === 'done' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <Check className="w-3 h-3" /> Saved
                          </span>
                        )}
                        {e.status === 'error' && (
                          <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full" title={e.errorMsg}>
                            Failed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <span className="text-xs text-slate-500 font-sans">
            {doneCount > 0 ? `${doneCount} trainee(s) added to database` : 'Ready to record trainees'}
          </span>
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </NativeModal>
  );
}
