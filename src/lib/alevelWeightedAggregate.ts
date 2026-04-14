/**
 * Final A-Level subject % from per-paper marks (each paper out of max, default 100)
 * and school-configured weights that sum to 100%.
 */
export function computeWeightedAlevelSubjectPercent(
  papers: { weightPercent: number; mark: number; maxMark?: number }[],
): number {
  let sum = 0;
  for (const p of papers) {
    const max = p.maxMark ?? 100;
    if (max <= 0) continue;
    const pct = (p.mark / max) * 100;
    sum += (pct * p.weightPercent) / 100;
  }
  return sum;
}
