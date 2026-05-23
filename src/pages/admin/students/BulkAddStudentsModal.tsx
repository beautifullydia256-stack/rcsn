import { useState, useRef, useEffect, useCallback } from 'react';
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
  const classOptions = schoolType === 'Secondary' ? SECONDARY_CLASSES : NURSERY_PRIMARY_CLASSES;

  const [selectedClass, setSelectedClass] = useState('');
  const [name, setName] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    if (classOptions.length && !selectedClass) setSelectedClass(classOptions[0]);
  }, [classOptions.length]);

  useEffect(() => {
    if (isOpen) setTimeout(() => nameRef.current?.focus(), 80);
  }, [isOpen]);

  const updateEntry = useCallback((id: string, patch: Partial<Entry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) { setInputError('Enter a student name.'); return; }
    if (!selectedClass) { setInputError('Select a class first.'); return; }
    if (!schoolId) { setInputError('School not loaded yet. Please wait.'); return; }

    const id = `${Date.now()}-${Math.random()}`;

    // Immediately clear the field and add a "saving" row — user can type the next name right away
    setInputError(null);
    setName('');
    nameRef.current?.focus();
    setEntries((prev) => [{ id, name: trimmed, status: 'saving' }, ...prev]);

    // DB insert runs in the background
    supabase
      .from('students')
      .insert({
        school_id: schoolId,
        name: trimmed,
        current_class: selectedClass,
        status: 'active',
        admission_date: new Date().toISOString().split('T')[0],
      })
      .select('student_id, admission_number')
      .single()
      .then(({ data: inserted, error: insErr }) => {
        if (insErr) {
          updateEntry(id, { status: 'error', errorMsg: insErr.message });
        } else {
          updateEntry(id, { status: 'done', admission_number: inserted?.admission_number ?? null });
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
              onChange={(e) => { setName(e.target.value); setInputError(null); }}
              onKeyDown={handleKey}
              placeholder="Type full name…"
              className="flex-1 bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!name.trim() || !schoolId}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Add
            </button>
          </div>
          {inputError && <p className="mt-1 text-xs text-red-400">{inputError}</p>}
        </div>

        {/* Live list */}
        {entries.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {doneCount} saved{savingCount > 0 ? ` · ${savingCount} saving…` : ''}
              </span>
              <span className="text-xs text-slate-500">{selectedClass}</span>
            </div>
            <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-700 divide-y divide-slate-800">
              {entries.map((e) => (
                <div key={e.id} className="flex items-center justify-between px-3 py-2 gap-3">
                  <span className="text-sm text-slate-100 truncate">{e.name}</span>
                  {e.status === 'saving' && (
                    <span className="text-xs text-slate-400 shrink-0 animate-pulse">saving…</span>
                  )}
                  {e.status === 'done' && (
                    <span className="text-xs text-green-400 font-mono shrink-0">
                      {e.admission_number ?? '✓'}
                    </span>
                  )}
                  {e.status === 'error' && (
                    <span className="text-xs text-red-400 shrink-0" title={e.errorMsg}>✗ failed</span>
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
            className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </NativeModal>
  );
}
