/** Combined PDF: one learner per sheet (same as api/pdf/generate). */
export const PDF_MULTI_STUDENT_SHEET_HEAD = `
<style id="pdf-multi-student-sheets">
  .pdf-student-sheet {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .pdf-student-sheet:not(:last-child) {
    page-break-after: always;
    break-after: page;
  }
</style>`;

export function extractBodyContent(fullHtml: string): string {
  const match = fullHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match ? match[1].trim() : fullHtml;
}

export function extractHeadContent(fullHtml: string): string {
  const match = fullHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  return match ? match[1].trim() : '';
}
