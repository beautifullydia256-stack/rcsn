import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { registerApiUrl } from '@/lib/registerApiOrigin';
import { createMissedExamRecordsForNewStudent } from '@/lib/examResultsUtils';
import { useAuthStore } from '@/store/authStore';
import {
  defaultColumnMappings,
  getCell,
  IMPORT_COLUMN_ROLES,
  parseImportFile,
  splitNameParts,
  type ImportColumnRole,
  type RowError,
} from '@/lib/studentImportParse';
import { formatStudentSaveError } from '@/lib/supabaseError';
import { isTertiarySchool } from '@/hooks/useSchoolType';
import { TERTIARY_COURSES } from '@/pages/admin/students/AddStudentForm';
import { FileSpreadsheet, CheckCircle2, RotateCcw, ArrowRight, ArrowLeft } from 'lucide-react';
import NativeModal from '@/components/NativeModal';
import LiquidGlassSelect from '@/components/ui/LiquidGlassSelect';

const NURSERY_PRIMARY_CLASSES = [
  'Baby Class',
  'Middle Class',
  'Top Class',
  ...Array.from({ length: 7 }, (_, i) => `Primary ${i + 1}`),
];
const SECONDARY_CLASSES = Array.from({ length: 6 }, (_, i) => `Senior ${i + 1}`);
const MAX_ROWS = 2000;

type ImportMode = 'full_school' | 'specific_class';

type Step = 'mode' | 'file' | 'map' | 'done';

export type StudentImportWizardProps = {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  schoolType: 'Nursery/Primary' | 'Secondary' | string | null;
  onFinished: () => void;
};

export function StudentImportWizard({
  isOpen,
  onClose,
  schoolId,
  schoolType,
  onFinished,
}: StudentImportWizardProps) {
  const user = useAuthStore((s) => s.user);
  const [step, setStep] = useState<Step>('mode');
  const [importMode, setImportMode] = useState<ImportMode>('specific_class');
  const [specificClass, setSpecificClass] = useState('');
  const [defaultClassFullSchool, setDefaultClassFullSchool] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, ImportColumnRole>>({});
  const [runError, setRunError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [resultBatchId, setResultBatchId] = useState<string | null>(null);
  const [addedCount, setAddedCount] = useState(0);
  const [rowErrorCount, setRowErrorCount] = useState(0);
  const [rowErrors, setRowErrors] = useState<RowError[]>([]);
  const [undoing, setUndoing] = useState(false);

  const isTertiary = isTertiarySchool(schoolType);
  const classOptions = isTertiary
    ? TERTIARY_COURSES
    : schoolType === 'Secondary'
      ? SECONDARY_CLASSES
      : NURSERY_PRIMARY_CLASSES;

  const reset = useCallback(() => {
    setStep('mode');
    setImportMode('specific_class');
    setSpecificClass('');
    setDefaultClassFullSchool('');
    setFile(null);
    setParseError(null);
    setHeaders([]);
    setDataRows([]);
    setPreviewRows([]);
    setColumnMap({});
    setRunError(null);
    setResultBatchId(null);
    setAddedCount(0);
    setRowErrorCount(0);
    setRowErrors([]);
  }, []);

  if (!isOpen) return null;

  const handlePickFile = async (f: File | null) => {
    setFile(f);
    setParseError(null);
    if (!f) {
      setHeaders([]);
      setDataRows([]);
      setPreviewRows([]);
      return;
    }
    try {
      const parsed = await parseImportFile(f);
      if (!parsed.headers.length) {
        setParseError('No columns found in the file.');
        return;
      }
      if (parsed.rows.length > MAX_ROWS) {
        setParseError(`This file has more than ${MAX_ROWS} data rows. Split into smaller files.`);
        return;
      }
      setHeaders(parsed.headers);
      setDataRows(parsed.rows);
      setPreviewRows(parsed.previewRows);
      setColumnMap(defaultColumnMappings(parsed.headers));
      setStep('map');
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Could not read file');
    }
  };

  const nameColumnPresent = Object.values(columnMap).some((r) => r === 'name');
  const classColumnPresent = Object.values(columnMap).some((r) => r === 'class');

  const canRun = () => {
    if (!nameColumnPresent) return false;
    if (importMode === 'specific_class' && !specificClass) return false;
    if (importMode === 'full_school' && !classColumnPresent && !defaultClassFullSchool) return false;
    return dataRows.length > 0;
  };

  const runImport = async () => {
    if (!user?.id || !file) return;
    if (!canRun()) {
      setRunError('Map Student name, choose a class (or default class in full-school mode), and ensure there are rows.');
      return;
    }
    setRunError(null);
    setRunning(true);
    const errors: RowError[] = [];
    let success = 0;
    const today = new Date().toISOString().slice(0, 10);

    const classForRow = (row: string[]): { ok: true; c: string } | { ok: false; err: string } => {
      if (importMode === 'specific_class') {
        if (!specificClass) return { ok: false, err: 'No class selected' };
        return { ok: true, c: specificClass };
      }
      const fromCol = getCell(row, headers, columnMap, 'class');
      if (fromCol) return { ok: true, c: fromCol };
      if (defaultClassFullSchool) return { ok: true, c: defaultClassFullSchool };
      return { ok: false, err: 'Row has no class and no default class is set' };
    };

    const batchFileName = file.name;
    const modeIns = importMode;
    const classNameBatch =
      importMode === 'specific_class'
        ? specificClass
        : classColumnPresent
          ? '(from file or default)'
          : defaultClassFullSchool;

    try {
      const { data: batchRow, error: batchErr } = await supabase
        .from('student_import_batches')
        .insert({
          school_id: schoolId,
          created_by: user.id,
          file_name: batchFileName,
          mode: modeIns,
          class_name: classNameBatch,
          students_added_count: 0,
          row_error_count: 0,
        })
        .select('id')
        .single();
      if (batchErr) throw new Error(batchErr.message);
      const batchId = batchRow?.id;
      if (!batchId) throw new Error('No batch id');

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i]!;
        const nameRaw = getCell(row, headers, columnMap, 'name');
        if (!nameRaw.trim()) {
          errors.push({ rowIndex: i + 2, message: 'Empty name' });
          continue;
        }
        const cls = classForRow(row);
        if (!cls.ok) {
          errors.push({ rowIndex: i + 2, message: cls.err });
          continue;
        }
        const { name, first, last } = splitNameParts(nameRaw);
        const gName = getCell(row, headers, columnMap, 'guardian_name') || null;
        const gPhone = getCell(row, headers, columnMap, 'guardian_phone') || null;

        const { data: ins, error: insErr } = await supabase
          .from('students')
          .insert({
            school_id: schoolId,
            import_batch_id: batchId,
            name,
            current_class: cls.c,
            status: 'active',
            first_name: first,
            last_name: last,
            middle_name: null,
            admission_date: today,
            boarding_type: 'Day Scholar', // Default to Day Scholar, can be updated later
            payment_status: 'Pending',
            expected_fee_amount: null,
            guardian_name: gName,
            guardian_phone: gPhone,
            gender: null,
            date_of_birth: null,
            nationality: null,
            religion: null,
            address: null,
            city: null,
            country: null,
            student_phone: null,
            student_email: null,
            guardian_email: null,
            guardian_relationship: null,
            guardian_occupation: null,
            guardian_address: null,
            medical_condition: null,
            stream: null,
            previous_school: null,
            enrollment_fee: null,
          })
          .select('student_id')
          .single();

        if (insErr || !ins?.student_id) {
          errors.push({ rowIndex: i + 2, message: formatStudentSaveError(insErr || new Error('insert')) });
          continue;
        }
        try {
          await createMissedExamRecordsForNewStudent(schoolId, ins.student_id, cls.c);
        } catch {
          // non-fatal
        }
        success += 1;
      }

      const errSample = errors.slice(0, 50);
      await supabase
        .from('student_import_batches')
        .update({
          students_added_count: success,
          row_error_count: errors.length,
          errors_sample: errSample.length ? (JSON.parse(JSON.stringify(errSample)) as unknown) : null,
        })
        .eq('id', batchId);

      setResultBatchId(batchId);
      setAddedCount(success);
      setRowErrorCount(errors.length);
      setRowErrors(errSample);
      
      // Automatically sync student balances to assign fees
      try {
        const syncResponse = await fetch(registerApiUrl('/api/admin/sync-student-balances'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schoolId }),
        });
        
        if (syncResponse.ok) {
          console.log('Student balances synced successfully after import');
        } else {
          console.warn('Failed to sync student balances after import');
        }
      } catch (syncError) {
        console.warn('Error syncing student balances after import:', syncError);
      }
      
      setStep('done');
      onFinished();
    } catch (e) {
      setRunError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setRunning(false);
    }
  };

  const handleUndoThisImport = async () => {
    if (!resultBatchId) return;
    setUndoing(true);
    setRunError(null);
    try {
      const { error } = await supabase.rpc('undo_student_import_batch', { p_batch_id: resultBatchId });
      if (error) throw new Error(error.message);
      onFinished();
      reset();
      onClose();
    } catch (e) {
      setRunError(e instanceof Error ? e.message : 'Undo failed');
    } finally {
      setUndoing(false);
    }
  };

  return (
    <NativeModal
      isOpen={isOpen}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Import Students from Spreadsheet"
      subtitle="Upload CSV or Excel file to batch enroll trainees into cohorts"
      icon={FileSpreadsheet}
      size="xl"
    >
      <div className="p-6 space-y-5 text-xs text-white flex flex-col max-h-[75vh] overflow-y-auto no-scrollbar">
        {step === 'mode' && (
          <div className="space-y-4">
            <p className="text-white/70">
              Choose how student cohorts are assigned for this import batch.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                onClick={() => setImportMode('specific_class')}
                className={`p-4 rounded-2xl border text-left flex items-start gap-3 cursor-pointer transition-all ${
                  importMode === 'specific_class'
                    ? 'border-emerald-400/80 bg-emerald-500/20 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                    : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                <input
                  type="radio"
                  name="imode"
                  checked={importMode === 'specific_class'}
                  onChange={() => setImportMode('specific_class')}
                  className="mt-0.5"
                />
                <div>
                  <strong className="block text-white text-xs mb-0.5">Specific Class Cohort</strong>
                  <span className="text-[11px] text-white/60 leading-relaxed block">
                    Every imported row is assigned directly to the selected cohort (class column in file is ignored).
                  </span>
                </div>
              </label>

              <label
                onClick={() => setImportMode('full_school')}
                className={`p-4 rounded-2xl border text-left flex items-start gap-3 cursor-pointer transition-all ${
                  importMode === 'full_school'
                    ? 'border-emerald-400/80 bg-emerald-500/20 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                    : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                <input
                  type="radio"
                  name="imode"
                  checked={importMode === 'full_school'}
                  onChange={() => setImportMode('full_school')}
                  className="mt-0.5"
                />
                <div>
                  <strong className="block text-white text-xs mb-0.5">Entire School (From File)</strong>
                  <span className="text-[11px] text-white/60 leading-relaxed block">
                    Uses the Class column in each row, falling back to a default cohort if the row is blank.
                  </span>
                </div>
              </label>
            </div>

            {importMode === 'specific_class' && (
              <div className="relative z-[30] focus-within:z-[50]">
                <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                  Target Class Cohort for All Students *
                </label>
                <LiquidGlassSelect
                  value={specificClass}
                  onChange={(val) => setSpecificClass(val)}
                  options={classOptions.map((c) => ({ value: c, label: c }))}
                  placeholder="Select class cohort..."
                />
              </div>
            )}

            {importMode === 'full_school' && (
              <div className="relative z-[30] focus-within:z-[50]">
                <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                  Default Fallback Class Cohort *
                </label>
                <LiquidGlassSelect
                  value={defaultClassFullSchool}
                  onChange={(val) => setDefaultClassFullSchool(val)}
                  options={classOptions.map((c) => ({ value: c, label: c }))}
                  placeholder="Select default fallback class..."
                />
              </div>
            )}

            <div className="pt-3 border-t border-white/15 flex justify-end">
              <button
                type="button"
                onClick={() => setStep('file')}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:brightness-110 border border-emerald-300/60 shadow-[0_4px_16px_rgba(16,185,129,0.35)] transition-all active:scale-[0.98]"
              >
                <span>Next: Choose File</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 'file' && (
          <div className="space-y-4">
            <p className="text-white/70">
              Select a CSV or Excel (.xlsx) file. The first row should contain headers. Full student name is required.
            </p>

            <div className="p-6 rounded-2xl border border-dashed border-white/30 bg-black/25 flex flex-col items-center justify-center text-center space-y-2">
              <FileSpreadsheet className="w-10 h-10 text-emerald-400/80 mb-1" />
              <input
                type="file"
                accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => void handlePickFile(e.target.files?.[0] ?? null)}
                className="block text-xs text-white/80 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border file:border-white/20 file:bg-white/10 file:text-white file:text-xs file:font-bold hover:file:bg-white/20 cursor-pointer"
              />
            </div>

            {parseError && (
              <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs">
                {parseError}
              </div>
            )}

            <div className="pt-3 border-t border-white/15 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep('mode')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white/80 font-semibold transition-all backdrop-blur-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            </div>
          </div>
        )}

        {step === 'map' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-bold uppercase tracking-wider text-white/70 text-[11px]">
                Map Spreadsheet Columns
              </p>
              {importMode === 'full_school' && !classColumnPresent && (
                <span className="text-amber-400 text-[11px] font-semibold">
                  No column mapped to Class. Using default fallback.
                </span>
              )}
            </div>

            <div className="overflow-x-auto max-h-48 border border-white/15 rounded-xl bg-black/20 no-scrollbar">
              <table className="min-w-full text-xs">
                <tbody>
                  {headers.map((h) => (
                    <tr key={h} className="border-b border-white/10 hover:bg-white/5">
                      <td className="p-2.5 font-mono text-white/90 font-medium">{h || '(empty header)'}</td>
                      <td className="p-2.5">
                        <select
                          className="w-full px-3 py-1.5 rounded-lg border border-white/20 bg-black/35 text-white text-xs outline-none focus:border-emerald-400"
                          value={columnMap[h] || 'ignore'}
                          onChange={(e) =>
                            setColumnMap((m) => ({ ...m, [h]: e.target.value as ImportColumnRole }))
                          }
                        >
                          {IMPORT_COLUMN_ROLES.map((o) => (
                            <option key={o.value} value={o.value} className="bg-slate-900 text-white">
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="font-bold uppercase tracking-wider text-white/70 text-[11px]">
              Data Preview (First Rows)
            </p>
            <div className="overflow-x-auto max-h-36 border border-white/15 rounded-xl bg-black/20 text-xs no-scrollbar">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-white/60 text-[10px] uppercase font-bold tracking-wider">
                    {headers.map((h) => (
                      <th key={h} className="p-2 text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {previewRows.map((row, ri) => (
                    <tr key={ri} className="hover:bg-white/5">
                      {row.map((c, ci) => (
                        <td key={ci} className="p-2 text-white/80 max-w-[140px] truncate">
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {runError && (
              <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs">
                {runError}
              </div>
            )}

            <div className="pt-3 border-t border-white/15 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep('file')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white/80 font-semibold transition-all backdrop-blur-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                disabled={!canRun() || running}
                onClick={runImport}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:brightness-110 border border-emerald-300/60 shadow-[0_4px_16px_rgba(16,185,129,0.35)] transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {running ? 'Importing Students...' : 'Execute Batch Import'}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && resultBatchId && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 space-y-2">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Import Batch Successful</span>
              </div>
              <ul className="pl-6 list-disc text-white/80 text-xs space-y-1">
                <li>Total Students Enrolled: <strong className="text-white">{addedCount}</strong></li>
                <li>Skipped Rows / Errors: <strong className="text-white">{rowErrorCount}</strong></li>
                <li>
                  Batch Audit Code: <code className="text-[11px] text-emerald-300 font-mono break-all">{resultBatchId}</code>
                </li>
              </ul>
            </div>

            {rowErrors.length > 0 && (
              <div className="max-h-32 overflow-y-auto text-xs border border-amber-400/30 rounded-xl p-3 bg-amber-500/10 text-amber-200 space-y-1 no-scrollbar">
                {rowErrors.map((e) => (
                  <div key={e.rowIndex}>
                    Row {e.rowIndex}: {e.message}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-white/15 flex items-center justify-between">
              <button
                type="button"
                disabled={undoing}
                onClick={handleUndoThisImport}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-500/40 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 font-bold text-xs transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{undoing ? 'Rolling Back...' : 'Rollback / Undo Import'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  reset();
                  onClose();
                }}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:brightness-110 border border-emerald-300/60 shadow-[0_4px_16px_rgba(16,185,129,0.35)] transition-all active:scale-[0.98]"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </NativeModal>
  );
}
