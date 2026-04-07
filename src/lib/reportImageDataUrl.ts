/**
 * Inline school logo and student photo as data URLs so preview iframe and Puppeteer PDF
 * use the same bytes (exact visual parity).
 */

const FETCH_TIMEOUT_MS = process.env.VERCEL === '1' ? 8000 : 12000;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export async function imageUrlToDataUrlForReport(url: string): Promise<string | null> {
  const u = String(url || '').trim();
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
