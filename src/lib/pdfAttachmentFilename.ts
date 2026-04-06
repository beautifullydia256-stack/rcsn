/**
 * Reads filename from Content-Disposition on PDF responses (matches Vercel /api/pdf/generate).
 */
export function pdfDownloadFilenameFromResponse(response: Response, fallback: string): string {
  const cd = response.headers.get('Content-Disposition');
  if (!cd) return fallback;
  const star = /filename\*=UTF-8''([^;\s]+)/i.exec(cd);
  if (star?.[1]) {
    try {
      const dec = decodeURIComponent(star[1].trim().replace(/^"+|"+$/g, ''));
      if (dec) return dec;
    } catch {
      /* ignore */
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(cd);
  if (quoted?.[1]) return quoted[1].trim();
  const plain = /filename=([^;\s]+)/i.exec(cd);
  if (plain?.[1]) return plain[1].trim().replace(/^"+|"+$/g, '');
  return fallback;
}
