import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { downloadStudentsXlsx, type StudentExportRow } from '@/lib/studentExportXlsx';

const NURSERY_PRIMARY_CLASSES = [
  'Baby Class',
  'Middle Class',
  'Top Class',
  ...Array.from({ length: 7 }, (_, i) => `Primary ${i + 1}`),
];
const SECONDARY_CLASSES = Array.from({ length: 6 }, (_, i) => `Senior ${i + 1}`);

type ExportScope = 'all' | 'class';

export type StudentExportDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  schoolType: 'Nursery/Primary' | 'Secondary' | null;
};

export function StudentExportDialog({ isOpen, onClose, schoolId, schoolType }: StudentExportDialogProps) {
  const [scope, setScope] = useState<ExportScope>('all');
  const [klass, setKlass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const classOptions = schoolType === 'Secondary' ? SECONDARY_CLASSES : NURSERY_PRIMARY_CLASSES;

  if (!isOpen) return null;

  const runExport = async () => {
    setError(null);
    setLoading(true);
    try {
      let q = supabase
        .from('students')
        .select('student_id, name, admission_number, current_class, status, guardian_name, guardian_email, guardian_phone')
        .eq('school_id', schoolId)
        .order('name', { ascending: true });
      if (scope === 'class' && klass) {
        q = q.eq('current_class', klass);
      }
      const { data, error: e } = await q;
      if (e) throw new Error(e.message);
      const rows: StudentExportRow[] = (data || []).map((r: any) => ({
        student_id: r.student_id,
        name: r.name,
        admission_number: r.admission_number,
        current_class: r.current_class,
        status: r.status,
        guardian_name: r.guardian_name,
        guardian_email: r.guardian_email,
        guardian_phone: r.guardian_phone,
      }));
      const label =
        scope === 'class' && klass ? `students_${klass.replace(/\s+/g, '_')}` : 'students_all';
      downloadStudentsXlsx(rows, label);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
    >
      <div className="ac-glass-card w-full max-w-md rounded-2xl border border-[var(--ac-border)] p-6">
        <h2 className="text-lg font-semibold ac-text-primary mb-4">Export students</h2>
        <div className="space-y-3 text-sm ac-text-secondary mb-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="exs"
              checked={scope === 'all'}
              onChange={() => setScope('all')}
            />
            All students
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="exs"
              checked={scope === 'class'}
              onChange={() => setScope('class')}
            />
            One class
          </label>
          {scope === 'class' && (
            <select
              className="ac-input w-full rounded-lg px-3 py-2"
              value={klass}
              onChange={(e) => setKlass(e.target.value)}
            >
              <option value="">Select class</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>
        {error && <p className="text-sm text-rose-600 mb-2">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="ac-glass-btn-secondary rounded-lg px-3 py-2 text-sm">
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || (scope === 'class' && !klass)}
            onClick={runExport}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white font-medium disabled:opacity-50"
          >
            {loading ? 'Exporting…' : 'Download Excel'}
          </button>
        </div>
      </div>
    </div>
  );
}
