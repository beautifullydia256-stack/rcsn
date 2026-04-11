/**
 * Read-only reference for Senior 5–6 (UACE) default % → grade bands on exam entry.
 * Matches docs/UACE_ALEVEL_GRADING_LOGIC.md and server functions uace_default_grade_from_percent.
 */
export function UaceExamBandsReminder() {
  const rows: { range: string; grade: string; points: string }[] = [
    { range: "80–100%", grade: "A", points: "6" },
    { range: "70–79%", grade: "B", points: "5" },
    { range: "60–69%", grade: "C", points: "4" },
    { range: "50–59%", grade: "D", points: "3" },
    { range: "45–49%", grade: "E", points: "2" },
    { range: "40–44%", grade: "O", points: "1" },
    { range: "Below 40%", grade: "F", points: "0" },
  ];

  return (
    <div className="mb-4 rounded-lg border border-violet-500/25 bg-violet-950/20 px-3 py-3 text-sm text-white/90">
      <p className="font-medium text-violet-200">Default UACE-style bands (typical UNEB ranges)</p>
      <p className="mt-1 text-xs text-white/65">
        Marks out of 100 are converted to a letter grade using these bands. UNEB may adjust boundaries by year; this is the default for all schools until custom ranges are supported.
      </p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[280px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-white/15 text-white/55">
              <th className="py-1 pr-3 font-medium">Final %</th>
              <th className="py-1 pr-3 font-medium">Grade</th>
              <th className="py-1 font-medium">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.grade} className="border-b border-white/10 border-opacity-50">
                <td className="py-1 pr-3">{r.range}</td>
                <td className="py-1 pr-3 font-semibold">{r.grade}</td>
                <td className="py-1">{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-amber-100/90">
        Coming later: schools will be able to edit percentage ranges for A-Level grading to match their policy.
      </p>
    </div>
  );
}
