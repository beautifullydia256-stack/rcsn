/**
 * O-Level / A-Level built-in reports: preview uses the same HTML as PDF (`renderTemplateHTML`).
 */
import { useEffect, useMemo, useState } from 'react';
import { renderTemplateHTML } from '../../services/templateHTMLGenerator';
import { resolveSchoolAndStudentPhotosForReportData } from '../../lib/reportImageDataUrl';
import { buildSecondaryShapedStudent } from '../../reports/secondary/buildSecondaryShapedStudent';
import { getSecondaryPlaceholderReportData } from '../../reports/secondary/secondaryTemplatePlaceholderData';
import type { SecondaryTemplateKey } from '../../templates/secondary';

function normalizeTemplateKey(raw: string): string {
  return typeof raw === 'string' && /^template[1-6]$/.test(raw) ? raw : 'template1';
}

export type SecondaryBuiltInHtmlPreviewProps = {
  student: Record<string, unknown>;
  examSet: Record<string, unknown>;
  school: Record<string, unknown>;
  /** e.g. template1 — same key sent to /api/pdf/generate */
  templateKey: string;
  /** Demo rows and [Placeholder] labels — same HTML path as production. */
  usePlaceholderData?: boolean;
  /** Shorter iframe for grid previews (placeholder gallery). */
  compact?: boolean;
};

export function SecondaryBuiltInHtmlPreview({
  student,
  examSet,
  school,
  templateKey,
  usePlaceholderData = false,
  compact = false,
}: SecondaryBuiltInHtmlPreviewProps) {
  const [html, setHtml] = useState('');
  const [error, setError] = useState<string | null>(null);

  const key = normalizeTemplateKey(templateKey);

  const reportData = useMemo(() => {
    if (!usePlaceholderData) {
      return {
        school,
        examSet,
        students: [student],
      };
    }
    const stub = getSecondaryPlaceholderReportData(key as SecondaryTemplateKey) as {
      school: Record<string, unknown>;
      examSet: Record<string, unknown>;
      students: Record<string, unknown>[];
      alevel?: unknown;
    };
    const merged = {
      school: { ...stub.school, ...school },
      examSet: { ...stub.examSet, ...examSet },
      students: stub.students,
      ...(stub.alevel != null ? { alevel: stub.alevel } : {}),
    };
    const shaped = buildSecondaryShapedStudent(merged);
    return { ...merged, students: [shaped] };
  }, [usePlaceholderData, school, examSet, student, key]);

  const photoPayloadStudent = useMemo(() => {
    if (!usePlaceholderData) return student;
    return reportData.students[0] as Record<string, unknown>;
  }, [usePlaceholderData, student, reportData.students]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        if (cancelled) return;
        const { logo: logoB64, photo: photoB64 } = await resolveSchoolAndStudentPhotosForReportData({
          school: reportData.school as Record<string, unknown>,
          students: [photoPayloadStudent],
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
  }, [reportData, key, photoPayloadStudent]);

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
        minHeight: compact ? '320mm' : '297mm',
        // A4 height in non-compact mode so preview matches primary Lower Section card proportions.
        height: compact ? 'min(70vh, 520px)' : '297mm',
      }}
    />
  );
}
