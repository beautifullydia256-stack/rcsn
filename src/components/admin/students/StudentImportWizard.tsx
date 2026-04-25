import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
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
  schoolType: 'Nursery/Primary' | 'Secondary' | null;
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
  const [defaultBoardingType, setDefaultBoardingType] = useState<'Day Scholar' | 'Boarding'>('Day Scholar');
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

  const classOptions = schoolType === 'Secondary' ? SECONDARY_CLASSES : NURSERY_PRIMARY_CLASSES;

  const reset = useCallback(() => {
    setStep('mode');
    setImportMode('specific_class');
    setSpecificClass('');
    setDefaultClassFullSchool('');
    setDefaultBoardingType('Day Scholar');
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
            boarding_type: defaultBoardingType,
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
        const syncResponse = await fetch('/api/admin/sync-student-balances', {
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
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label="Import students"
    >
      <div className="ac-glass-card max-h-[min(90vh,900px)] w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--ac-border)] flex flex-col">
        <div className="flex items-center justify-between border-b border-[var(--ac-border)] px-4 py-3">
          <h2 className="text-lg font-semibold ac-text-primary">Import students</h2>
          <button
            type="button"
            onClick={() => {
              reset();
              onClose();
            }}
            className="text-sm ac-text-muted hover:ac-text-primary"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-6 space-y-4 text-sm ac-text-secondary">
          {step === 'mode' && (
            <div className="space-y-4">
              <p>Choose how to apply classes for this file.</p>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="imode"
                  checked={importMode === 'specific_class'}
                  onChange={() => setImportMode('specific_class')}
                />
                <span>
                  <strong>Specific class</strong> — every imported row is placed in the class you select (file class
                  column is ignored).
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="imode"
                  checked={importMode === 'full_school'}
                  onChange={() => setImportMode('full_school')}
                />
                <span>
                  <strong>Entire school (from file)</strong> — use a <em>Class</em> column when present, otherwise a
                  default class below.
                </span>
              </label>
              {importMode === 'specific_class' && (
                <div>
                  <label className="block text-sm font-medium ac-text-primary mb-1">Class for all students</label>
                  <select
                    className="ac-input w-full rounded-lg px-3 py-2"
                    value={specificClass}
                    onChange={(e) => setSpecificClass(e.target.value)}
                  >
                    <option value="">Select class</option>
                    {classOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {importMode === 'full_school' && (
                <div>
                  <label className="block text-sm font-medium ac-text-primary mb-1">Default class (if row has no class)</label>
                  <select
                    className="ac-input w-full rounded-lg px-3 py-2"
                    value={defaultClassFullSchool}
                    onChange={(e) => setDefaultClassFullSchool(e.target.value)}
                  >
                    <option value="">— Required if file has no class column —</option>
                    {classOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium ac-text-primary mb-1">Boarding type for all students</label>
                <select
                  className="ac-input w-full rounded-lg px-3 py-2"
                  value={defaultBoardingType}
                  onChange={(e) => setDefaultBoardingType(e.target.value as 'Day Scholar' | 'Boarding')}
                >
                  <option value="Day Scholar">Day Scholar</option>
                  <option value="Boarding">Boarding</option>
                </select>
                <p className="text-xs ac-text-muted mt-1">
                  This determines which fee structure applies: Day Scholar gets tuition fees, Boarding gets boarding fees
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep('file')}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-white font-medium hover:bg-emerald-500"
              >
                Next: choose file
              </button>
            </div>
          )}

          {step === 'file' && (
            <div className="space-y-3">
              <p>CSV or Excel (.xlsx). First row should be column headers. Student name is required in data rows.</p>
              <input
                type="file"
                accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => void handlePickFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm"
              />
              {parseError && <p className="text-rose-600 dark:text-rose-300 text-sm">{parseError}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep('mode')} className="ac-glass-btn-secondary rounded-lg px-3 py-2">
                  Back
                </button>
              </div>
            </div>
          )}

          {step === 'map' && (
            <div className="space-y-3">
              <p className="ac-text-primary font-medium">Map columns</p>
              {importMode === 'full_school' && !classColumnPresent && (
                <p className="text-amber-700 dark:text-amber-300 text-sm">
                  No column mapped to Class. Rows without a class will use:{' '}
                  <strong>{defaultClassFullSchool || '(pick default class in previous step)'}</strong>
                </p>
              )}
              <div className="overflow-x-auto max-h-48 border border-[var(--ac-border)] rounded-lg">
                <table className="min-w-full text-xs">
                  <tbody>
                    {headers.map((h) => (
                      <tr key={h} className="border-b border-[var(--ac-border)]">
                        <td className="p-2 font-mono ac-text-primary">{h || '(empty header)'}</td>
                        <td className="p-2">
                          <select
                            className="ac-input w-full min-h-0 py-1 text-xs"
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
              <p>Preview (first rows)</p>
              <div className="overflow-x-auto max-h-40 border border-[var(--ac-border)] rounded-lg text-xs">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      {headers.map((h) => (
                        <th key={h} className="p-1 text-left border-b border-[var(--ac-border)]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((c, ci) => (
                          <td key={ci} className="p-1 border-b border-[var(--ac-border)] max-w-[120px] truncate">
                            {c}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {runError && <p className="text-rose-600 text-sm">{runError}</p>}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setStep('file')} className="ac-glass-btn-secondary rounded-lg px-3 py-2">
                  Back
                </button>
                <button
                  type="button"
                  disabled={!canRun() || running}
                  onClick={runImport}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-white font-medium disabled:opacity-50"
                >
                  {running ? 'Importing…' : 'Run import'}
                </button>
              </div>
            </div>
          )}

          {step === 'done' && resultBatchId && (
            <div className="space-y-4">
              <p className="ac-text-primary font-semibold">Import complete</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Students added: {addedCount}</li>
                <li>Row errors: {rowErrorCount}</li>
                <li>
                  Batch ID: <code className="text-xs break-all ac-text-primary">{resultBatchId}</code>
                </li>
              </ul>
              {rowErrors.length > 0 && (
                <div className="max-h-32 overflow-y-auto text-xs border border-amber-500/40 rounded p-2">
                  {rowErrors.map((e) => (
                    <div key={e.rowIndex}>
                      Row {e.rowIndex}: {e.message}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={undoing}
                  onClick={handleUndoThisImport}
                  className="rounded-lg border-2 border-rose-500/60 bg-rose-500/10 px-4 py-2 font-semibold text-rose-800 dark:text-rose-200"
                >
                  {undoing ? 'Undoing…' : 'Undo this import'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    onClose();
                  }}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-white"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
