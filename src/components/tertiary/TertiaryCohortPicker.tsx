import React, { useMemo } from 'react';
import {
  TERTIARY_PROGRAMMES,
  getProgrammeByCode,
  buildCohortKey,
  parseCohortKey,
} from '@/lib/tertiaryCurriculum';

type Props = {
  selectedCohort: string; // e.g. "CN – Year 1 Semester 1"
  onChange: (cohortKey: string) => void;
  disabled?: boolean;
  className?: string;
  selectClassName?: string;
  programmeLabel?: string;
  semesterLabel?: string;
  layout?: 'grid' | 'flex' | 'stacked';
  showLabels?: boolean;
};

export default function TertiaryCohortPicker({
  selectedCohort,
  onChange,
  disabled = false,
  className = '',
  selectClassName = 'ac-input min-h-[44px] w-full',
  programmeLabel = 'Select Programme',
  semesterLabel = 'Select Year & Semester',
  layout = 'grid',
  showLabels = false,
}: Props) {
  // Parse incoming cohort key
  const parsed = useMemo(() => parseCohortKey(selectedCohort), [selectedCohort]);

  const currentProgCode = parsed.courseCode || '';
  const currentSemesterLabel = parsed.semesterLabel || '';

  const activeProg = useMemo(
    () => getProgrammeByCode(currentProgCode),
    [currentProgCode]
  );

  const availableSemesters = activeProg ? activeProg.semesters : [];

  const handleProgrammeChange = (progCode: string) => {
    if (!progCode) {
      onChange('');
      return;
    }
    const newProg = getProgrammeByCode(progCode);
    if (!newProg) {
      onChange('');
      return;
    }

    // Check if the currently chosen semester is valid for the new programme
    const isSemValid = newProg.semesters.some(
      (s) => s.label.toLowerCase() === currentSemesterLabel.toLowerCase()
    );

    const nextSem = isSemValid
      ? currentSemesterLabel
      : newProg.semesters[0]?.label || 'Year 1 Semester 1';

    onChange(buildCohortKey(newProg.code, nextSem));
  };

  const handleSemesterChange = (newSemLabel: string) => {
    if (!newSemLabel) {
      // If semester is cleared, keep just the programme or clear
      onChange(currentProgCode);
      return;
    }
    const code = currentProgCode || TERTIARY_PROGRAMMES[0].code;
    onChange(buildCohortKey(code, newSemLabel));
  };

  return (
    <div
      className={
        layout === 'grid'
          ? `grid grid-cols-1 gap-2 sm:grid-cols-2 ${className}`
          : layout === 'flex'
            ? `flex flex-wrap items-center gap-2 ${className}`
            : `space-y-2 ${className}`
      }
    >
      {/* 1. Programme / Course Selector */}
      <div className="w-full">
        {showLabels && (
          <label className="mb-1 block text-xs font-semibold ac-text-secondary">
            {programmeLabel}
          </label>
        )}
        <select
          value={currentProgCode}
          onChange={(e) => handleProgrammeChange(e.target.value)}
          disabled={disabled}
          className={selectClassName}
          aria-label={programmeLabel}
        >
          <option value="">{programmeLabel}</option>
          {TERTIARY_PROGRAMMES.map((prog) => (
            <option key={prog.code} value={prog.code}>
              {prog.name} ({prog.code})
            </option>
          ))}
        </select>
      </div>

      {/* 2. Year & Semester Selector */}
      <div className="w-full">
        {showLabels && (
          <label className="mb-1 block text-xs font-semibold ac-text-secondary">
            {semesterLabel}
          </label>
        )}
        <select
          value={currentSemesterLabel}
          onChange={(e) => handleSemesterChange(e.target.value)}
          disabled={disabled || !currentProgCode}
          className={selectClassName}
          aria-label={semesterLabel}
        >
          <option value="">
            {!currentProgCode ? 'Choose programme first' : semesterLabel}
          </option>
          {availableSemesters.map((sem) => (
            <option key={sem.code} value={sem.label}>
              {sem.label} ({sem.short})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
