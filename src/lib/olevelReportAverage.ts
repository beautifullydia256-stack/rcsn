/**
 * O-Level report mean %: sum over every expected subject (missing = 0), divide by expected count.
 * Keep algorithm aligned with `supabase/functions/_shared/reportDataBuilder.ts`.
 */

function normalizeReportSubjectKey(name: string): string {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function numOrUndef(v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** One percentage per expected subject (mean of topic lines); missing subjects contribute 0. */
export function computeOlevelMeanPercentOverExpectedFromResultRows(
  results: Record<string, unknown>[],
  expectedOrdered: string[],
): number | null {
  if (!expectedOrdered.length) return null;
  const byKey = new Map<string, Record<string, unknown>[]>();
  for (const r of results) {
    const k = normalizeReportSubjectKey(String(r.subject ?? ''));
    if (!k) continue;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k)!.push(r);
  }
  let sum = 0;
  for (const subj of expectedOrdered) {
    const k = normalizeReportSubjectKey(subj);
    const rows = byKey.get(k) ?? [];
    const vals: number[] = [];
    for (const r of rows) {
      if (r.result_missing_placeholder === true || r.result_missing_placeholder === 'true') continue;
      const fs = numOrUndef(r.final_score);
      if (fs != null) {
        vals.push(fs);
        continue;
      }
      const m = numOrUndef(r.marks_obtained);
      const t = Number(r.total_marks ?? 100) || 100;
      if (m != null && t > 0) vals.push((m / t) * 100);
    }
    sum += vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }
  return sum / expectedOrdered.length;
}
