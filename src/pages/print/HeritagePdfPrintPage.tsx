/**
 * Public print route for Baby Class Heritage PDFs: Puppeteer opens this URL with sessionId + token;
 * we fetch staged JSON once (no huge POST to /api/pdf/generate).
 */
import { useEffect, useState } from 'react';
import { ReportPreviewFromData } from '../../components/reports/ReportPreviewFromData';
import type { PrePrimaryHolisticRuntimeConfig } from '../../lib/prePrimaryHolisticDb';
import type { PrePrimaryHolisticGradeEnum } from '../../templates/primary/prePrimaryHolisticRatings';

type HeritagePayloadV1 = {
  version: 1;
  reportRows: Array<{ report_data: Record<string, unknown> }>;
  templateKey: string;
  prePrimaryReportMode?: 'colour' | 'detailed';
  prePrimaryHolisticRuntimeConfig?: PrePrimaryHolisticRuntimeConfig | null;
  teacherSkillRemarksByStrandSkill?: Record<string, Partial<Record<PrePrimaryHolisticGradeEnum, string>>> | null;
};

function pdfApiBase(): string {
  return import.meta.env.VITE_PDF_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3001' : '');
}

async function waitForPrintReady(root: HTMLElement | null): Promise<void> {
  await document.fonts.ready.catch(() => {});
  if (root) {
    const imgs = Array.from(root.querySelectorAll('img'));
    await Promise.all(
      imgs.map(
        (img) =>
          img.complete && img.naturalWidth > 0
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                const done = () => resolve();
                img.addEventListener('load', done, { once: true });
                img.addEventListener('error', done, { once: true });
              })
      )
    );
  }
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  await new Promise<void>((r) => setTimeout(r, 80));
}

export default function HeritagePdfPrintPage() {
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [payload, setPayload] = useState<HeritagePayloadV1 | null>(null);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    document.documentElement.removeAttribute('data-pdf-ready');
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('sessionId') ?? '';
    const token = params.get('token') ?? '';
    if (!sessionId || !token) {
      setPhase('error');
      setErrMsg('Missing sessionId or token');
      return;
    }

    const base = pdfApiBase();
    const url = `${base}/api/pdf/render-session?sessionId=${encodeURIComponent(sessionId)}&token=${encodeURIComponent(token)}`;

    fetch(url)
      .then(async (r) => {
        if (!r.ok) {
          const t = await r.text();
          throw new Error(t || r.statusText);
        }
        return r.json() as Promise<HeritagePayloadV1>;
      })
      .then((data) => {
        if (!data || data.version !== 1 || !Array.isArray(data.reportRows)) {
          throw new Error('Invalid session payload');
        }
        setPayload(data);
        setPhase('ready');
      })
      .catch((e: unknown) => {
        setPhase('error');
        setErrMsg(e instanceof Error ? e.message : 'Failed to load session');
      });
  }, []);

  useEffect(() => {
    if (phase !== 'ready' || !payload) return;
    let cancelled = false;
    const root = document.getElementById('heritage-pdf-root');
    void (async () => {
      await waitForPrintReady(root);
      if (!cancelled) {
        document.documentElement.setAttribute('data-pdf-ready', '1');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, payload]);

  if (phase === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-slate-700">
        <p className="text-sm">Loading report…</p>
      </div>
    );
  }

  if (phase === 'error' || !payload) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-6 text-center text-slate-800">
        <p className="text-sm">{errMsg || 'Could not load this print session.'}</p>
      </div>
    );
  }

  const mode = payload.prePrimaryReportMode ?? 'colour';

  return (
    <div
      id="heritage-pdf-root"
      className="min-h-screen bg-white text-slate-900 print:bg-white"
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      <div
        id="report-preview-doc-surface"
        className="report-preview-doc-surface mx-auto space-y-8 bg-white p-4 text-slate-900 print:border-0 print:shadow-none"
        style={{ width: '210mm', maxWidth: '100%' }}
      >
        {payload.reportRows.map((report, idx) => (
          <div
            key={idx}
            className={payload.reportRows.length > 1 ? 'report-student-card pdf-student-sheet' : 'report-student-card'}
          >
            <ReportPreviewFromData
              reportData={report.report_data}
              templateKey={payload.templateKey}
              prePrimaryReportMode={mode}
              prePrimaryHolisticRuntimeConfig={payload.prePrimaryHolisticRuntimeConfig ?? null}
              teacherSkillRemarksByStrandSkill={payload.teacherSkillRemarksByStrandSkill ?? null}
            />
          </div>
        ))}
      </div>
      <style>{`
        @page { size: A4; margin: 0; }
        .pdf-student-sheet { page-break-after: always; break-after: page; }
        .pdf-student-sheet:last-child { page-break-after: auto; break-after: auto; }
      `}</style>
    </div>
  );
}
