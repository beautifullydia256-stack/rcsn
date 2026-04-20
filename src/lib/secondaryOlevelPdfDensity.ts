/**
 * Class-aware PDF density for O-Level secondary (S1/S2 many subjects vs S3/S4 fewer).
 * Used only for template-local HTML/CSS — not for business logic.
 */

export type OlevelPdfDensityBand = 's1s2' | 's3s4';

/**
 * Map class name to band. Senior 1–2 → tighter layouts; Senior 3–4 → slightly roomier.
 * Unknown / unparseable classes default to s3s4 (safer than over-tightening).
 */
export function olevelPdfDensityBandFromClassName(className: string | null | undefined): OlevelPdfDensityBand {
  const t = String(className ?? '')
    .trim()
    .toLowerCase();
  const m =
    t.match(/(?:^|[\s,])(?:senior|s)\s*[.]?\s*([1-4])(?:\b|$)/i) ||
    t.match(/\bs\.?\s*([1-4])\b/i);
  const n = m ? parseInt(m[1], 10) : NaN;
  if (n === 1 || n === 2) return 's1s2';
  if (n === 3 || n === 4) return 's3s4';
  return 's3s4';
}

/** When class string is ambiguous, use row count as a hint (e.g. custom labels). */
export function olevelPdfDensityBandResolved(
  className: string | null | undefined,
  subjectRowCount: number
): OlevelPdfDensityBand {
  const fromClass = olevelPdfDensityBandFromClassName(className);
  if (fromClass === 's1s2') return 's1s2';
  if (subjectRowCount >= 12) return 's1s2';
  return 's3s4';
}
