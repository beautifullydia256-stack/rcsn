import { getSecondaryExamEntryTrack } from '@/components/reports/templates/helpers';

type SchoolType = 'Nursery/Primary' | 'Secondary' | null | undefined;

/**
 * Shown on secondary exam entry when class name maps to O-Level (S1–4) vs A-Level (S5–6).
 * Data entry uses the same mark sheet for now; this makes the two tracks explicit in the UI.
 */
export function SecondaryExamEntryTrackBanner({
  className,
  schoolType,
}: {
  className: string;
  schoolType: SchoolType;
}) {
  if (schoolType !== 'Secondary' || !className.trim()) return null;
  const track = getSecondaryExamEntryTrack(className);
  if (track === 'alevel') {
    return (
      <div
        role="status"
        className="rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-sm ac-text-primary"
      >
        <span className="font-semibold text-violet-800 dark:text-violet-200">A-Level Format</span>
        <span className="ac-text-muted">
          {' '}
          (Senior 5–6) — Marks out of 100, secondary A–E grades. Same layout as the legacy exam entry screen.
        </span>
      </div>
    );
  }
  return (
    <div
      role="status"
      className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-sm ac-text-primary"
    >
      <span className="font-semibold text-sky-800 dark:text-sky-200">O-Level Format</span>
      <span className="ac-text-muted">
        {' '}
        (Senior 1–4) — Activity, formative and exam scores (100%). Same layout as the legacy exam entry screen.
      </span>
    </div>
  );
}
