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
import '@/styles/government-system.css';

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
      title="BATCH TRAINEE IMPORT REGISTRY"
      subtitle="EXCEL / CSV PARSER"
      icon={FileSpreadsheet}
      size="lg"
      variant="government"
    >
      <div className="space-y-4 text-xs font-sans flex flex-col">
        {step === 'mode' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setImportMode('specific_class')}
                className={`p-3 rounded-lg border text-center transition-all ${
                  importMode === 'specific_class'
                    ? 'border-[#111111] bg-[#F4F4F5] font-bold text-[#111111]'
                    : 'border-[#CCCCCC] bg-white text-[#444444] hover:bg-[#F9FAFB]'
                }`}
              >
                <span className="block text-xs uppercase font-mono font-bold">SPECIFIC COHORT</span>
              </button>

              <button
                type="button"
                onClick={() => setImportMode('full_school')}
                className={`p-3 rounded-lg border text-center transition-all ${
                  importMode === 'full_school'
                    ? 'border-[#111111] bg-[#F4F4F5] font-bold text-[#111111]'
                    : 'border-[#CCCCCC] bg-white text-[#444444] hover:bg-[#F9FAFB]'
                }`}
              >
                <span className="block text-xs uppercase font-mono font-bold">ENTIRE INSTITUTION</span>
              </button>
            </div>

            {importMode === 'specific_class' && (
              <div className="pt-1">
                <label className="block text-[11px] font-mono font-bold uppercase text-[#555555] mb-1">
                  TARGET CLASS COHORT FOR ALL TRAINEES *
                </label>
                <select
                  value={specificClass}
                  onChange={(e) => setSpecificClass(e.target.value)}
                  className="gov-select w-full"
                >
                  <option value="">Select class cohort...</option>
                  {classOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}

            {importMode === 'full_school' && (
              <div className="pt-1">
                <label className="block text-[11px] font-mono font-bold uppercase text-[#555555] mb-1">
                  DEFAULT FALLBACK COHORT *
                </label>
                <select
                  value={defaultClassFullSchool}
                  onChange={(e) => setDefaultClassFullSchool(e.target.value)}
                  className="gov-select w-full"
                >
                  <option value="">Select default fallback class...</option>
                  {classOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="pt-3 border-t border-[#CCCCCC] flex justify-end">
              <button
                type="button"
                onClick={() => setStep('file')}
                className="gov-btn gov-btn-sm gov-btn-primary"
              >
                <span>NEXT: SELECT SPREADSHEET</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>
          </div>
        )}

        {step === 'file' && (
          <div className="space-y-4">
            <div className="p-8 rounded-lg border border-dashed border-[#CCCCCC] bg-[#FAFAFA] flex flex-col items-center justify-center text-center space-y-2">
              <FileSpreadsheet className="w-8 h-8 text-[#555555] mb-1" />
              <input
                type="file"
                accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => void handlePickFile(e.target.files?.[0] ?? null)}
                className="block text-xs text-[#555555] file:mr-3 file:py-1 file:px-3 file:rounded file:border file:border-[#CCCCCC] file:bg-white file:text-[#111111] file:text-xs file:font-mono file:font-bold hover:file:bg-[#F3F4F6] cursor-pointer"
              />
            </div>

            {parseError && (
              <div className="p-3 bg-[#FEF2F2] border border-[#EF4444] text-[#B91C1C] rounded text-xs font-mono">
                {parseError}
              </div>
            )}

            <div className="pt-3 border-t border-[#CCCCCC] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep('mode')}
                className="gov-btn gov-btn-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                <span>BACK</span>
              </button>
            </div>
          </div>
        )}

        {step === 'map' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold uppercase text-[#111111] text-[11px]">
                MAP SPREADSHEET HEADERS TO REGISTRY FIELDS
              </span>
              {importMode === 'full_school' && !classColumnPresent && (
                <span className="text-[#B45309] text-[10px] font-mono font-bold bg-[#FEF3C7] px-2 py-0.5 rounded border border-[#FCD34D]">
                  NO COHORT COLUMN — USING FALLBACK
                </span>
              )}
            </div>

            <div className="gov-table-container max-h-48 overflow-y-auto">
              <table className="gov-table w-full text-xs">
                <thead>
                  <tr>
                    <th className="p-2 text-left font-mono uppercase text-[10px] text-[#555555] border-r border-[#CCCCCC]">
                      SPREADSHEET HEADER
                    </th>
                    <th className="p-2 text-left font-mono uppercase text-[10px] text-[#555555]">
                      REGISTRY FIELD
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {headers.map((h) => (
                    <tr key={h} className="border-b border-[#E5E5E5]">
                      <td className="p-2 text-[#111111] font-mono font-semibold border-r border-[#CCCCCC]">
                        {h || '(EMPTY HEADER)'}
                      </td>
                      <td className="p-2">
                        <select
                          className="gov-select w-full text-xs py-1"
                          value={columnMap[h] || 'ignore'}
                          onChange={(e) =>
                            setColumnMap((m) => ({ ...m, [h]: e.target.value as ImportColumnRole }))
                          }
                        >
                          {IMPORT_COLUMN_ROLES.map((o) => (
                            <option key={o.value} value={o.value}>
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

            <div className="font-mono font-bold uppercase text-[#111111] text-[11px]">
              DATA PREVIEW (FIRST ROWS)
            </div>
            <div className="gov-table-container max-h-36 overflow-x-auto text-xs">
              <table className="gov-table w-full">
                <thead>
                  <tr>
                    {headers.map((h) => (
                      <th key={h} className="p-2 text-left font-mono uppercase text-[10px] border-r border-[#CCCCCC]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, ri) => (
                    <tr key={ri} className="border-b border-[#E5E5E5]">
                      {row.map((c, ci) => (
                        <td key={ci} className="p-2 text-[#333333] max-w-[140px] truncate border-r border-[#CCCCCC] font-mono text-[11px]">
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {runError && (
              <div className="p-3 bg-[#FEF2F2] border border-[#EF4444] text-[#B91C1C] rounded text-xs font-mono">
                {runError}
              </div>
            )}

            <div className="pt-3 border-t border-[#CCCCCC] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep('file')}
                className="gov-btn gov-btn-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                <span>BACK</span>
              </button>
              <button
                type="button"
                disabled={!canRun() || running}
                onClick={runImport}
                className="gov-btn gov-btn-sm gov-btn-primary"
              >
                <span>{running ? 'IMPORTING TRAINEES…' : 'EXECUTE BATCH IMPORT'}</span>
              </button>
            </div>
          </div>
        )}

        {step === 'done' && resultBatchId && (
          <div className="space-y-4">
            <div className="p-4 bg-white border border-[#CCCCCC] rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-[#15803D] font-mono font-bold text-xs uppercase">
                <CheckCircle2 className="w-4 h-4 text-[#15803D]" />
                <span>IMPORT BATCH COMMITTED SUCCESSFULLY</span>
              </div>
              <ul className="pl-4 list-disc text-[#333333] text-xs font-mono space-y-1">
                <li>TOTAL TRAINEES ENROLLED: <strong className="text-[#111111]">{addedCount}</strong></li>
                <li>SKIPPED ROWS / ERRORS: <strong className="text-[#111111]">{rowErrorCount}</strong></li>
                <li>
                  AUDIT BATCH TOKEN: <code className="text-[10px] text-[#111111] font-mono bg-[#EAEAEA] px-1.5 py-0.5 rounded border border-[#CCCCCC] break-all">{resultBatchId}</code>
                </li>
              </ul>
            </div>

            {rowErrors.length > 0 && (
              <div className="max-h-32 overflow-y-auto text-xs border border-[#FCD34D] rounded-lg p-3 bg-[#FEF3C7] text-[#B45309] font-mono space-y-1">
                {rowErrors.map((e) => (
                  <div key={e.rowIndex}>
                    ROW {e.rowIndex}: {e.message}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-[#CCCCCC] flex items-center justify-between">
              <button
                type="button"
                disabled={undoing}
                onClick={handleUndoThisImport}
                className="gov-btn gov-btn-sm"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1 text-[#B91C1C]" />
                <span className="text-[#B91C1C]">{undoing ? 'ROLLING BACK…' : 'ROLLBACK BATCH'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  reset();
                  onClose();
                }}
                className="gov-btn gov-btn-sm gov-btn-primary"
              >
                <span>DONE</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </NativeModal>
  );
}
