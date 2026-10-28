import { useState } from 'react';
import { Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { downloadStudentsXlsx, type StudentExportRow } from '@/lib/studentExportXlsx';
import { isTertiarySchool } from '@/hooks/useSchoolType';
import { TERTIARY_COURSES } from '@/pages/admin/students/AddStudentForm';
import NativeModal from '@/components/NativeModal';

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
  schoolType: 'Nursery/Primary' | 'Secondary' | string | null;
};

export function StudentExportDialog({ isOpen, onClose, schoolId, schoolType }: StudentExportDialogProps) {
  const [scope, setScope] = useState<ExportScope>('all');
  const [klass, setKlass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTertiary = isTertiarySchool(schoolType);
  const classOptions = isTertiary
    ? TERTIARY_COURSES
    : schoolType === 'Secondary'
      ? SECONDARY_CLASSES
      : NURSERY_PRIMARY_CLASSES;

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
    <NativeModal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Students Directory"
      subtitle="Download student roster with contacts and admission codes as an Excel file (.xlsx)"
      icon={Download}
      size="sm"
      variant="government"
    >
      <div className="space-y-4 text-xs text-slate-900 font-sans">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 block">
            Export Scope
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`p-3 rounded-xl border text-left transition-all ${
                scope === 'all'
                  ? 'border-slate-900 bg-slate-50/80 ring-1 ring-slate-900 text-slate-900 font-semibold'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <span className="block text-xs font-semibold">All Active Students</span>
              <span className="text-[11px] text-slate-500">Full school registry</span>
            </button>
            <button
              type="button"
              onClick={() => setScope('class')}
              className={`p-3 rounded-xl border text-left transition-all ${
                scope === 'class'
                  ? 'border-slate-900 bg-slate-50/80 ring-1 ring-slate-900 text-slate-900 font-semibold'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <span className="block text-xs font-semibold">Specific Cohort</span>
              <span className="text-[11px] text-slate-500">Filter by class stage</span>
            </button>
          </div>
        </div>

        {scope === 'class' && (
          <div className="pt-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Cohort / Class *
            </label>
            <select
              value={klass}
              onChange={(e) => setKlass(e.target.value)}
              className="w-full px-3 py-2 text-xs font-sans bg-white border border-slate-300 rounded-lg focus:border-slate-800 focus:outline-none transition-colors"
            >
              <option value="">Choose target class cohort...</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-lg">
            {error}
          </p>
        )}

        <div className="pt-3 border-t border-slate-200 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors shadow-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || (scope === 'class' && !klass)}
            onClick={runExport}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
          >
            <span>{loading ? 'Exporting...' : 'Download Excel (.xlsx)'}</span>
          </button>
        </div>
      </div>
    </NativeModal>
  );
}
