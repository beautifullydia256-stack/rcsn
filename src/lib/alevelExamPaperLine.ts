/**
 * Match an exam_results row to the A-Level "line" the teacher is editing (paper_code vs paper_number).
 * Aligns with DB generated exam_paper_key = coalesce(trim(paper_code), trim(paper_number), '').
 */
export function matchesAlevelExamPaperLine(
  row: { paper_code?: string | null; paper_number?: string | null },
  selectedPaperCode: string,
  topicFilter: string
): boolean {
  const pc = (row.paper_code ?? '').toString().trim();
  const pn = (row.paper_number ?? '').toString().trim();
  const selCode = (selectedPaperCode ?? '').trim();
  const selTopic = (topicFilter ?? '').trim();
  if (selCode) return pc === selCode;
  if (selTopic) return pn === selTopic && !pc;
  return !pc && !pn;
}
