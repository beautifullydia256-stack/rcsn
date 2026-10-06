import { useState } from 'react';
import { Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { downloadStudentsXlsx, type StudentExportRow } from '@/lib/studentExportXlsx';
import { isTertiarySchool } from '@/hooks/useSchoolType';
import { TERTIARY_COURSES } from '@/pages/admin/students/AddStudentForm';
import NativeModal from '@/components/NativeModal';
import LiquidGlassSelect from '@/components/ui/LiquidGlassSelect';

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
    >
      <div className="p-6 space-y-4 text-xs text-white">
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block">
            Export Scope
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`p-3 rounded-xl border text-left transition-all ${
                scope === 'all'
                  ? 'border-emerald-400/80 bg-emerald-500/20 text-white font-semibold'
                  : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              All Active Students
            </button>
            <button
              type="button"
              onClick={() => setScope('class')}
              className={`p-3 rounded-xl border text-left transition-all ${
                scope === 'class'
                  ? 'border-emerald-400/80 bg-emerald-500/20 text-white font-semibold'
                  : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              Specific Cohort Class
            </button>
          </div>
        </div>

        {scope === 'class' && (
          <div className="relative z-[30] focus-within:z-[50]">
            <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
              Select Cohort / Class *
            </label>
            <LiquidGlassSelect
              value={klass}
              onChange={(val) => setKlass(val)}
              options={classOptions.map((c) => ({ value: c, label: c }))}
              placeholder="Choose target class..."
            />
          </div>
        )}

        {error && <p className="text-xs text-rose-400">{error}</p>}

        <div className="pt-3 border-t border-white/15 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white/80 hover:text-white font-semibold transition-all backdrop-blur-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || (scope === 'class' && !klass)}
            onClick={runExport}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:brightness-110 border border-emerald-300/60 shadow-[0_4px_16px_rgba(16,185,129,0.35)] transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Exporting...' : 'Download Excel'}
          </button>
        </div>
      </div>
    </NativeModal>
  );
}
