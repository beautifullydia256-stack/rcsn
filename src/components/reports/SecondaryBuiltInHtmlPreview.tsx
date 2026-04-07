/**
 * O-Level / A-Level built-in reports: preview uses the same HTML as PDF (`renderTemplateHTML`).
 */
import { useEffect, useMemo, useState } from 'react';
import { renderTemplateHTML } from '../../services/templateHTMLGenerator';
import { resolveSchoolAndStudentPhotosForReportData } from '../../lib/reportImageDataUrl';

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
        if (cancelled) return;
        const { logo: logoB64, photo: photoB64 } = await resolveSchoolAndStudentPhotosForReportData({
          school: school as Record<string, unknown>,
          students: [student],
        });
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
      <div className="rounded-lg border border-red-300/60 bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-500/10 dark:text-red-100">
        {error}
      </div>
    );
  }

  if (!html) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
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
