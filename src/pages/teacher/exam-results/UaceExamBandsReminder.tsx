/**
 * Read-only reference for Senior 5–6 (UACE) default % → grade bands.
 * Matches docs/UACE_ALEVEL_GRADING_LOGIC.md and server functions uace_default_grade_from_percent.
 *
 * `variant="exam"` — dark/violet panel for teacher exam entry screens.
 * `variant="grading"` — matches Grading System page (ac-* theme).
 */
export function UaceExamBandsReminder({ variant = "exam" }: { variant?: "exam" | "grading" }) {
  const rows: { range: string; grade: string; points: string }[] = [
    { range: "80–100%", grade: "A", points: "6" },
    { range: "70–79%", grade: "B", points: "5" },
    { range: "60–69%", grade: "C", points: "4" },
    { range: "50–59%", grade: "D", points: "3" },
    { range: "45–49%", grade: "E", points: "2" },
    { range: "40–44%", grade: "O", points: "1" },
    { range: "Below 40%", grade: "F", points: "0" },
  ];

  const isGrading = variant === "grading";
  const boxClass = isGrading
    ? "rounded-lg border border-[var(--ac-border)] bg-[var(--ac-card-bg)] px-3 py-3 text-sm ac-text-primary"
    : "mb-4 rounded-lg border border-violet-500/25 bg-violet-950/20 px-3 py-3 text-sm text-white/90";
  const titleClass = isGrading ? "font-medium text-blue-400" : "font-medium text-violet-200";
  const bodyClass = isGrading ? "mt-1 text-xs ac-text-muted" : "mt-1 text-xs text-white/65";
  const thRowClass = isGrading
    ? "border-b border-[var(--ac-border)] ac-text-muted"
    : "border-b border-white/15 text-white/55";
  const trClass = isGrading ? "border-b border-[var(--ac-border)] last:border-0" : "border-b border-white/10 border-opacity-50";
  const footClass = isGrading ? "mt-2 text-xs text-amber-700 dark:text-amber-200/90" : "mt-2 text-xs text-amber-100/90";

  return (
    <div className={boxClass}>
      <p className={titleClass}>Default UACE-style bands (typical UNEB ranges)</p>
      <p className={bodyClass}>
        Marks out of 100 are converted to a letter grade using these bands. UNEB may adjust boundaries by year; this is the default for all schools until custom ranges are supported.
      </p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[280px] border-collapse text-left text-xs">
          <thead>
            <tr className={thRowClass}>
              <th className="py-1 pr-3 font-medium">Final %</th>
              <th className="py-1 pr-3 font-medium">Grade</th>
              <th className="py-1 font-medium">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.grade} className={trClass}>
                <td className="py-1 pr-3">{r.range}</td>
                <td className="py-1 pr-3 font-semibold">{r.grade}</td>
                <td className="py-1">{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={footClass}>
        Coming later: schools will be able to edit percentage ranges for A-Level grading to match their policy.
      </p>
    </div>
  );
}
