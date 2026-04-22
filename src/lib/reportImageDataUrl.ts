/**
 * Inline school logo and student photo as data URLs so preview iframe and Puppeteer PDF
 * use the same bytes (exact visual parity).
 */

const FETCH_TIMEOUT_MS = process.env.VERCEL === '1' ? 8000 : 12000;

/** PDF embed: logo / student photo — smaller raster, same layout CSS. */
export const PDF_REPORT_EMBED_MAX_EDGE_PX = 480;
const PDF_REPORT_EMBED_QUALITY_START = 0.52;
const PDF_REPORT_EMBED_QUALITY_MIN = 0.42;
const PDF_REPORT_EMBED_MAX_SIZE_KB = 55;

/** Nursery holistic skill art — stricter than logo/photo (~15 tiles per PDF); pre-resize for ~300–500KB PDF targets. */
export const PDF_SKILL_ART_EMBED_MAX_EDGE_PX = 110;
const PDF_SKILL_ART_QUALITY_START = 0.34;
const PDF_SKILL_ART_QUALITY_MIN = 0.22;
const PDF_SKILL_ART_MAX_SIZE_KB = 12;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function dataUrlEncodedSizeKB(dataUrl: string): number {
  const i = dataUrl.indexOf(',');
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  return (b64.length * 0.75) / 1024;
}

function sniffMimeFromRawBase64(b64: string): string {
  const clean = b64.replace(/\s/g, '');
  try {
    const slice = clean.slice(0, 24);
    const bin = atob(slice);
    const a = bin.charCodeAt(0);
    const b = bin.charCodeAt(1);
    const c = bin.charCodeAt(2);
    const d = bin.charCodeAt(3);
    if (a === 0xff && b === 0xd8 && c === 0xff) return 'image/jpeg';
    if (a === 0x89 && b === 0x50 && c === 0x4e && d === 0x47) return 'image/png';
    if (a === 0x47 && b === 0x49 && c === 0x46 && d === 0x38) return 'image/gif';
    if (a === 0x52 && b === 0x49 && c === 0x46 && d === 0x46) return 'image/webp';
  } catch {
    /* ignore */
  }
  return 'image/jpeg';
}

/**
 * Some rows store raw base64 without a `data:` prefix. Without this, `fetch()` fails
 * (desktop and web). Normalizes to a proper data URL before fetch/canvas handling.
 */
export function normalizeReportImageSourceForFetch(raw: string): string {
  const t = String(raw ?? '').trim();
  if (!t) return t;
  if (
    t.startsWith('data:') ||
    /^https?:\/\//i.test(t) ||
    t.startsWith('blob:') ||
    t.startsWith('file:') ||
    t.startsWith('//')
  ) {
    return t;
  }
  const compact = t.replace(/\s/g, '');
  if (/^[A-Za-z0-9+/]+=*$/.test(compact) && compact.length >= 80) {
    return `data:${sniffMimeFromRawBase64(compact)};base64,${compact}`;
  }
  return t;
}

/**
 * Safe `img src` for PDF HTML when the value may be a full `data:` URL (from
 * `resolveSchoolAndStudentPhotosForReportData`) or raw base64 without prefix.
 * Do not double-wrap with `data:image/png;base64,...`.
 */
export function dataUrlForPdfImgSrc(value: string | null | undefined): string | null {
  const v = typeof value === 'string' ? value.trim() : '';
  if (!v) return null;
  if (v.startsWith('data:')) return v;
  return `data:${sniffMimeFromRawBase64(v)};base64,${v}`;
}

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (/^https?:\/\//i.test(dataUrl)) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode image for PDF embed'));
    img.src = dataUrl;
  });
}

function scaleToMaxEdge(width: number, height: number, maxEdge: number): { w: number; h: number } {
  const longest = Math.max(width, height, 1);
  const scale = Math.min(1, maxEdge / longest);
  return {
    w: Math.max(1, Math.round(width * scale)),
    h: Math.max(1, Math.round(height * scale)),
  };
}

async function dataUrlToJpegDataUrlWithOptions(
  dataUrl: string,
  options: {
    maxEdge: number;
    qualityStart: number;
    qualityMin: number;
    maxSizeKB: number;
    /** PNG/WebP cutouts: fill transparent pixels with white before JPEG (avoids black fringes). */
    compositeOnWhite?: boolean;
  }
): Promise<string> {
  if (typeof document === 'undefined') return dataUrl;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;

  const img = await loadImageFromDataUrl(dataUrl);
  const { w, h } = scaleToMaxEdge(img.naturalWidth || img.width, img.naturalHeight || img.height, options.maxEdge);
  canvas.width = w;
  canvas.height = h;
  if (options.compositeOnWhite) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(img, 0, 0, w, h);

  let quality = options.qualityStart;
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const out = canvas.toDataURL('image/jpeg', quality);
    const kb = dataUrlEncodedSizeKB(out);
    if (kb <= options.maxSizeKB || quality <= options.qualityMin + 0.001) {
      return out;
    }
    quality = Math.max(options.qualityMin, quality * 0.88);
    attempts++;
  }
  return canvas.toDataURL('image/jpeg', options.qualityMin);
}

/**
 * Browser-only: re-encode a data URL to a smaller JPEG for PDF embedding (layout unchanged).
 */
export async function reencodeDataUrlForReportPdf(dataUrl: string): Promise<string> {
  if (typeof document === 'undefined' || !dataUrl.startsWith('data:')) return dataUrl;
  try {
    return await dataUrlToJpegDataUrlWithOptions(dataUrl, {
      maxEdge: PDF_REPORT_EMBED_MAX_EDGE_PX,
      qualityStart: PDF_REPORT_EMBED_QUALITY_START,
      qualityMin: PDF_REPORT_EMBED_QUALITY_MIN,
      maxSizeKB: PDF_REPORT_EMBED_MAX_SIZE_KB,
    });
  } catch {
    return dataUrl;
  }
}

/**
 * Browser-only: aggressive JPEG for pre-primary skill illustrations (~15 per PDF).
 */
export async function reencodePrePrimarySkillDataUrlForPdf(dataUrl: string): Promise<string> {
  if (typeof document === 'undefined' || !dataUrl.startsWith('data:')) return dataUrl;
  try {
    return await dataUrlToJpegDataUrlWithOptions(dataUrl, {
      maxEdge: PDF_SKILL_ART_EMBED_MAX_EDGE_PX,
      qualityStart: PDF_SKILL_ART_QUALITY_START,
      qualityMin: PDF_SKILL_ART_QUALITY_MIN,
      maxSizeKB: PDF_SKILL_ART_MAX_SIZE_KB,
      compositeOnWhite: true,
    });
  } catch {
    return dataUrl;
  }
}

/**
 * Fetch a remote image to a data URL only — no PDF embed re-encode.
 * Use for assets (e.g. skill art) that receive a dedicated compression pass afterward.
 */
export async function fetchImageUrlToDataUrlForReport(url: string): Promise<string | null> {
  const u = normalizeReportImageSourceForFetch(String(url || ''));
  if (!u) return null;
  if (u.startsWith('data:')) return u;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(u, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PwezaCore/1.0)' },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0) return null;
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    return `data:${contentType};base64,${arrayBufferToBase64(buf)}`;
  } catch {
    return null;
  }
}

export async function imageUrlToDataUrlForReport(url: string): Promise<string | null> {
  const u = normalizeReportImageSourceForFetch(String(url || ''));
  if (!u) return null;
  if (u.startsWith('data:')) {
    if (typeof document !== 'undefined') {
      return reencodeDataUrlForReportPdf(u);
    }
    return u;
  }
  const dataUrl = await fetchImageUrlToDataUrlForReport(u);
  if (typeof document !== 'undefined' && dataUrl) {
    return reencodeDataUrlForReportPdf(dataUrl);
  }
  return dataUrl;
}

export async function resolveSchoolAndStudentPhotosForReportData(reportData: {
  school?: Record<string, unknown>;
  students?: unknown[];
}): Promise<{ logo: string | null; photo: string | null }> {
  const school = reportData.school || {};
  const student =
    Array.isArray(reportData.students) && reportData.students.length > 0
      ? (reportData.students[0] as Record<string, unknown>)
      : undefined;
  const logoUrl = String(school.logo_url ?? school.logo ?? '').trim();
  const photoUrl = String(
    student?.profile_photo ?? student?.photo_url ?? student?.student_photo_url ?? ''
  ).trim();
  const [logo, photo] = await Promise.all([
    logoUrl ? imageUrlToDataUrlForReport(logoUrl) : Promise.resolve(null),
    photoUrl ? imageUrlToDataUrlForReport(photoUrl) : Promise.resolve(null),
  ]);
  return { logo, photo };
}
