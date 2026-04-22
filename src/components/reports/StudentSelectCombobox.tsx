import { useEffect, useMemo, useState } from 'react';
import { studentRowMatchesSearch } from '../../lib/studentSearchFilter';

export type StudentSelectRow = {
  student_id: string;
  name?: string | null;
  admission_number?: string | null;
};

function formatStudentLabel(s: StudentSelectRow): string {
  const name = (s.name ?? '').trim();
  const tail = (s.admission_number ?? s.student_id ?? '').trim();
  if (!tail) return name;
  return name ? `${name} - ${tail}` : tail;
}

const LIST_CAP = 50;

type StudentSelectComboboxProps = {
  students: StudentSelectRow[];
  value: string;
  onChange: (studentId: string) => void;
  disabled?: boolean;
};

export function StudentSelectCombobox({ students, value, onChange, disabled }: StudentSelectComboboxProps) {
  const [inputText, setInputText] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!value) return;
    const s = students.find((x) => x.student_id === value);
    if (s) setInputText(formatStudentLabel(s));
  }, [value, students]);

  const filteredSorted = useMemo(() => {
    const q = inputText.trim();
    const base = !q ? students : students.filter((s) => studentRowMatchesSearch(s, inputText));
    return [...base].sort((a, b) =>
      String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, { sensitivity: 'base' })
    );
  }, [students, inputText]);

  const visibleRows = filteredSorted.slice(0, LIST_CAP);
  const hasMore = filteredSorted.length > LIST_CAP;

  const committedLabel = useMemo(() => {
    if (!value) return '';
    const s = students.find((x) => x.student_id === value);
    return s ? formatStudentLabel(s) : '';
  }, [value, students]);

  return (
    <div className="relative">
      <input
        type="text"
        value={inputText}
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.value;
          setInputText(next);
          setOpen(true);
          if (value && committedLabel !== next.trim() && committedLabel !== next) {
            onChange('');
          }
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search by name or admission number"
        className="ac-input w-full rounded-lg px-3 py-2 min-h-0 pr-9"
        aria-autocomplete="list"
        aria-expanded={open}
        autoComplete="off"
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 ac-text-muted hover:ac-text-secondary disabled:opacity-40"
        aria-label={open ? 'Close student list' : 'Open student list'}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && !disabled && students.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-[var(--ac-border)] ac-glass-card shadow-lg">
          {visibleRows.length === 0 ? (
            <div className="px-3 py-2 text-sm ac-text-muted">No matching students</div>
          ) : (
            <>
              {visibleRows.map((s) => (
                <button
                  key={s.student_id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(s.student_id);
                    setInputText(formatStudentLabel(s));
                    setOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10 ac-text-primary"
                >
                  <span className="font-medium">{s.name ?? '—'}</span>
                  {(s.admission_number || s.student_id) && (
                    <span className="ac-text-muted"> — {s.admission_number ?? s.student_id}</span>
                  )}
                </button>
              ))}
              {hasMore && (
                <div className="px-3 py-2 text-xs ac-text-muted border-t border-[var(--ac-border)]">
                  Showing first {LIST_CAP} results. Keep typing to narrow down.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
