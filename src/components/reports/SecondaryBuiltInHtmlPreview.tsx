/**
 * O-Level / A-Level built-in reports: preview uses the same HTML as PDF (`renderTemplateHTML`).
 * Iframe is width: 100% inside the doc surface (like primary React previews). O-Level template1–3
 * use a fixed A4-height frame; A-Level template4 follows content height.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  /**
   * Top-level `report_data` fields that are not on `students[0]` but required by HTML templates
   * (e.g. `uace_percent_bands`, `grade_remarks_alevel`, `alevel` stats from Edge / enricher).
   */
  extraTemplateFields?: Record<string, unknown>;
};

export function SecondaryBuiltInHtmlPreview({
  student,
  examSet,
  school,
  templateKey,
  usePlaceholderData = false,
  compact = false,
  extraTemplateFields,
}: SecondaryBuiltInHtmlPreviewProps) {
  const [html, setHtml] = useState('');
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const key = normalizeTemplateKey(templateKey);

  const reportData = useMemo(() => {
    if (!usePlaceholderData) {
      return {
        school,
        examSet,
        students: [student],
        ...(extraTemplateFields && Object.keys(extraTemplateFields).length > 0 ? extraTemplateFields : {}),
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
  }, [usePlaceholderData, school, examSet, student, key, extraTemplateFields]);

  const photoPayloadStudent = useMemo(() => {
    if (!usePlaceholderData) return student;
    return reportData.students[0] as Record<string, unknown>;
  }, [usePlaceholderData, student, reportData.students]);

  const syncIframeHeight = useCallback(() => {
    if (compact) return;
    const frame = iframeRef.current;
    const doc = frame?.contentDocument;
    const body = doc?.body;
    const root = doc?.documentElement;
    if (!frame || !body || !root) return;
    /** O-Level Standard / Basic / Progressive: fixed A4 viewport so preview matches one sheet. */
    if (key === 'template1' || key === 'template2' || key === 'template3') {
      frame.style.height = '297mm';
      frame.style.maxHeight = '297mm';
      frame.style.minHeight = '297mm';
      return;
    }
    const next = Math.max(body.scrollHeight, root.scrollHeight);
    frame.style.height = `${next}px`;
  }, [compact, key]);

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

  useEffect(() => {
    if (!html || compact) return;
    const t = window.setTimeout(syncIframeHeight, 0);
    return () => clearTimeout(t);
  }, [html, compact, syncIframeHeight]);

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

  const a4Frame = key === 'template1' || key === 'template2' || key === 'template3';

  return (
    <div className={`w-full ${a4Frame ? 'mx-auto max-w-[210mm]' : ''}`}>
      <iframe
        ref={iframeRef}
        title="Secondary report preview"
        srcDoc={html}
        sandbox="allow-same-origin"
        className="mx-auto block max-h-none w-full max-w-full border-0 bg-white shadow-lg print:h-auto print:min-h-0"
        style={
          compact
            ? {
                width: '100%',
                minHeight: '320mm',
                height: 'min(70vh, 520px)',
              }
            : a4Frame
              ? {
                  width: '100%',
                  height: '297mm',
                  maxHeight: '297mm',
                  minHeight: '297mm',
                  display: 'block',
                }
              : {
                  width: '100%',
                  minHeight: '297mm',
                  height: '297mm',
                  display: 'block',
                }
        }
        onLoad={syncIframeHeight}
      />
    </div>
  );
}
