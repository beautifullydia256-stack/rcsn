import { useEffect, useMemo, useState } from 'react';
import { Search, ChevronDown, User, Check } from 'lucide-react';
import { studentRowMatchesSearch } from '../../lib/studentSearchFilter';
import { useUIStore } from '../../store/uiStore';

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
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const [inputText, setInputText] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!value) {
      setInputText('');
      return;
    }
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
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          borderRadius: 10,
          border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#cbd5e1'}`,
          background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
          boxShadow: isDark ? 'none' : '0 1px 2px rgba(0,0,0,0.04)',
          opacity: disabled ? 0.6 : 1,
          transition: 'all 0.15s ease',
        }}
      >
        <div style={{ paddingLeft: 12, color: isDark ? '#94a3b8' : '#64748b', display: 'flex', alignItems: 'center' }}>
          <Search size={15} />
        </div>
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
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={disabled ? 'Select a class above first...' : 'Search pupil name or admission number...'}
          style={{
            width: '100%',
            height: 42,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: 13,
            padding: '0 12px 0 8px',
            color: isDark ? '#f8fafc' : '#0f172a',
            cursor: disabled ? 'not-allowed' : 'text',
          }}
          aria-autocomplete="list"
          aria-expanded={open}
          autoComplete="off"
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          style={{
            padding: '0 10px',
            background: 'transparent',
            border: 'none',
            color: isDark ? '#94a3b8' : '#64748b',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label={open ? 'Close student list' : 'Open student list'}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setOpen((o) => !o)}
        >
          <ChevronDown size={15} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        </button>
      </div>

      {open && !disabled && students.length > 0 && (
        <div
          style={{
            position: 'absolute',
            zIndex: 40,
            marginTop: 4,
            maxHeight: 240,
            width: '100%',
            overflowY: 'auto',
            borderRadius: 12,
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.14)' : '#e2e8f0'}`,
            background: isDark ? '#0f172a' : '#ffffff',
            boxShadow: isDark
              ? '0 12px 30px rgba(0,0,0,0.5)'
              : '0 10px 25px -4px rgba(15,23,42,0.1), 0 4px 10px -2px rgba(15,23,42,0.06)',
            padding: 4,
          }}
        >
          {visibleRows.length === 0 ? (
            <div style={{ padding: '10px 14px', fontSize: 13, color: isDark ? '#94a3b8' : '#64748b' }}>
              No matching students in this class
            </div>
          ) : (
            <>
              {visibleRows.map((s) => {
                const isSelected = s.student_id === value;
                return (
                  <button
                    key={s.student_id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(s.student_id);
                      setInputText(formatStudentLabel(s));
                      setOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderRadius: 8,
                      border: 'none',
                      background: isSelected
                        ? (isDark ? 'rgba(61,232,160,0.12)' : 'rgba(5,150,105,0.08)')
                        : 'transparent',
                      color: isSelected
                        ? (isDark ? '#3de8a0' : '#059669')
                        : (isDark ? '#f1f5f9' : '#1e293b'),
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: 13,
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 6,
                          background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isDark ? '#cbd5e1' : '#475569',
                          flexShrink: 0,
                        }}
                      >
                        <User size={13} />
                      </div>
                      <div>
                        <span style={{ fontWeight: isSelected ? 700 : 500 }}>{s.name ?? '—'}</span>
                        {(s.admission_number || s.student_id) && (
                          <span style={{ fontSize: 11.5, color: isDark ? '#94a3b8' : '#64748b', marginLeft: 6 }}>
                            ({s.admission_number ?? s.student_id})
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check size={15} />}
                  </button>
                );
              })}
              {hasMore && (
                <div
                  style={{
                    padding: '8px 12px',
                    fontSize: 11,
                    color: isDark ? '#94a3b8' : '#64748b',
                    borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9'}`,
                  }}
                >
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

