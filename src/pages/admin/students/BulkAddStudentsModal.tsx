import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import NativeModal from '@/components/NativeModal';
import { addStudentSchoolQueryKey, fetchAddStudentSchoolContext } from './addStudentSchoolQuery';

const NURSERY_PRIMARY_CLASSES = [
  'Baby Class', 'Middle Class', 'Top Class',
  ...Array.from({ length: 7 }, (_, i) => `Primary ${i + 1}`),
];
const SECONDARY_CLASSES = Array.from({ length: 6 }, (_, i) => `Senior ${i + 1}`);

interface Added {
  name: string;
  admission_number: string | null;
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
  const classOptions = schoolType === 'Secondary' ? SECONDARY_CLASSES : NURSERY_PRIMARY_CLASSES;

  const [selectedClass, setSelectedClass] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<Added[]>([]);

  // Set default class once options are available
  useEffect(() => {
    if (classOptions.length && !selectedClass) setSelectedClass(classOptions[0]);
  }, [classOptions.length]);

  // Auto-focus name input when modal opens or class changes
  useEffect(() => {
    if (isOpen) setTimeout(() => nameRef.current?.focus(), 80);
  }, [isOpen, selectedClass]);

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setError('Enter a student name.'); return; }
    if (!selectedClass) { setError('Select a class first.'); return; }
    if (!schoolId) { setError('School not loaded yet. Please wait.'); return; }

    setError(null);
    setSaving(true);
    try {
      const { data: inserted, error: insErr } = await supabase
        .from('students')
        .insert({
          school_id: schoolId,
          name: trimmed,
          current_class: selectedClass,
          status: 'active',
          admission_date: new Date().toISOString().split('T')[0],
        })
        .select('student_id, admission_number')
        .single();

      if (insErr) { setError(insErr.message); return; }

      setAdded((prev) => [
        { name: trimmed, admission_number: inserted?.admission_number ?? null },
        ...prev,
      ]);
      setName('');
      nameRef.current?.focus();
    } finally {
      setSaving(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
  };

  const handleClose = () => {
    setName('');
    setError(null);
    setAdded([]);
    onClose();
  };

  return (
    <NativeModal isOpen={isOpen} onClose={handleClose} title="Bulk Add Students" size="lg">
      <div className="space-y-4">

        {/* Class selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Class</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Name input + Add button */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Student Name — press Enter or click Add
          </label>
          <div className="flex gap-2">
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              onKeyDown={handleKey}
              placeholder="Type full name…"
              disabled={saving}
              className="flex-1 bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving || !name.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {saving ? '…' : 'Add'}
            </button>
          </div>
          {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        </div>

        {/* Added list */}
        {added.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Added this session ({added.length})
              </span>
              <span className="text-xs text-slate-500">in {selectedClass}</span>
            </div>
            <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-700 divide-y divide-slate-800">
              {added.map((s, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm text-slate-100">{s.name}</span>
                  <span className="text-xs text-green-400 font-mono">
                    {s.admission_number ?? '✓ saved'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </NativeModal>
  );
}
