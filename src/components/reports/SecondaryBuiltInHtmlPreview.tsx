/**
 * O-Level / A-Level built-in reports: preview uses the same HTML as PDF (`renderTemplateHTML`).
 */
import { useEffect, useMemo, useState } from 'react';
import { renderTemplateHTML } from '../../services/templateHTMLGenerator';

async function urlToDataUrl(url: string): Promise<string | null> {
  const u = String(url || '').trim();
  if (!u) return null;
  if (u.startsWith('data:')) return u;
  try {
    const res = await fetch(u);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(typeof r.result === 'string' ? r.result : null);
      r.onerror = () => reject(new Error('read failed'));
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function normalizeTemplateKey(raw: string): string {
  return typeof raw === 'string' && /^template[1-6]$/.test(raw) ? raw : 'template1';
}

export type SecondaryBuiltInHtmlPreviewProps = {
  student: Record<string, unknown>;
  examSet: Record<string, unknown>;
  school: Record<string, unknown>;
  /** e.g. template1 — same key sent to /api/pdf/generate */
  templateKey: string;
};

export function SecondaryBuiltInHtmlPreview({
  student,
  examSet,
  school,
  templateKey,
}: SecondaryBuiltInHtmlPreviewProps) {
  const [html, setHtml] = useState('');
  const [error, setError] = useState<string | null>(null);

  const key = normalizeTemplateKey(templateKey);

  const reportData = useMemo(
    () => ({
      school,
      examSet,
      students: [student],
    }),
    [school, examSet, student, key]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        const s = school as { logo_url?: string; logo?: string };
        const st = student as { profile_photo?: string; photo_url?: string; student_photo_url?: string };
        const logoUrl = s?.logo_url || s?.logo || '';
        const photoUrl = st?.profile_photo || st?.photo_url || st?.student_photo_url || '';
        const [logoB64, photoB64] = await Promise.all([
          logoUrl ? urlToDataUrl(String(logoUrl)) : Promise.resolve(null),
          photoUrl ? urlToDataUrl(String(photoUrl)) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        const doc = renderTemplateHTML(reportData, key, logoB64, photoB64);
        if (!cancelled) setHtml(doc);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Preview failed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reportData, key]);

  if (error) {
    return (
      <div className="rounded-lg border border-red-300/60 bg-red-500/10 px-4 py-3 text-sm text-red-100">
        {error}
      </div>
    );
  }

  if (!html) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-white/70">
        Loading preview…
      </div>
    );
  }

  return (
    <iframe
      title="Secondary report preview"
      srcDoc={html}
      sandbox="allow-same-origin"
      className="mx-auto block max-w-full border-0 bg-white shadow-lg"
      style={{
        width: '210mm',
        minHeight: '297mm',
        height: '85vh',
      }}
    />
  );
}
