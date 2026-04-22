import { isElectronDesktop } from '@/lib/desktopPdf';

/** User-facing message when POST /api/pdf/generate (or similar) fails. */
export function pdfApiHttpErrorMessage(
  status: number,
  options: { serverErrorText?: string; treatAsPayloadTooLarge?: boolean } = {}
): string {
  if (options.treatAsPayloadTooLarge || status === 413) {
    return 'PDF request was too large (413). Try again; if it persists, download one student at a time or contact support.';
  }
  const t = options.serverErrorText?.trim();
  if (t) return t;
  if (status === 500) {
    return isElectronDesktop()
      ? 'PDF could not be generated in the desktop app. Try again. If it keeps failing, use the latest installer or contact support.'
      : 'PDF generation failed (500). Check Vercel → Deployments → Functions → Logs for the error.';
  }
  return `Failed to generate PDF (${status})`;
}
