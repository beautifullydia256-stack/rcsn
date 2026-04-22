/**
 * Public print route for Baby Class Heritage PDFs: Puppeteer opens this URL with sessionId + token;
 * we fetch staged JSON once (no huge POST to /api/pdf/generate).
 */
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
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

/** Wait until the report card has real layout (React has painted ReportPreviewFromData). */
async function waitForReportSurfacePaint(root: HTMLElement | null): Promise<boolean> {
  const deadline = Date.now() + 25000;
  let surfaceOk = false;
  while (Date.now() < deadline) {
    const surface =
      root?.querySelector('#report-preview-doc-surface') ?? document.getElementById('report-preview-doc-surface');
    const h = surface?.getBoundingClientRect().height ?? 0;
    const textLen = (surface?.textContent || '').replace(/\s+/g, ' ').trim().length;
    if (surface && h > 100 && textLen > 40) {
      surfaceOk = true;
      break;
    }
    await new Promise<void>((r) => setTimeout(r, 120));
  }

  if (!surfaceOk) {
    return false;
  }

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
  await new Promise<void>((r) => setTimeout(r, 200));
  return true;
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

    let cancelled = false;

    void (async () => {
      try {
        const { data: row, error } = await supabase
          .from('pdf_render_sessions')
          .select('payload')
          .eq('id', sessionId)
          .eq('read_token', token)
          .maybeSingle();

        if (cancelled) return;

        if (!error && row?.payload) {
          const data = row.payload as HeritagePayloadV1;
          if (data?.version === 1 && Array.isArray(data.reportRows)) {
            setPayload(data);
            setPhase('ready');
            return;
          }
        }

        const base = pdfApiBase();
        if (!base) {
          throw new Error(error?.message || 'Could not load print session (sign in and try again).');
        }

        const url = `${base.replace(/\/$/, '')}/api/pdf/render-session?sessionId=${encodeURIComponent(sessionId)}&token=${encodeURIComponent(token)}`;
        const r = await fetch(url);
        if (!r.ok) {
          const t = await r.text();
          throw new Error(t || r.statusText);
        }
        const data = (await r.json()) as HeritagePayloadV1;
        if (!data || data.version !== 1 || !Array.isArray(data.reportRows)) {
          throw new Error('Invalid session payload');
        }
        if (!cancelled) {
          setPayload(data);
          setPhase('ready');
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setPhase('error');
          setErrMsg(e instanceof Error ? e.message : 'Failed to load session');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (phase !== 'ready' || !payload) return;
    let cancelled = false;
    const root = document.getElementById('heritage-pdf-root');
    void (async () => {
      const ok = await waitForReportSurfacePaint(root);
      if (!cancelled && ok) {
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
        className="report-preview-doc-surface mx-auto bg-white text-slate-900 print:border-0 print:shadow-none"
        style={{
          width: '210mm',
          maxWidth: '100%',
          boxSizing: 'border-box',
          padding: '10mm',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {payload.reportRows.map((report, idx) => (
          <div
            key={idx}
            className={payload.reportRows.length > 1 ? 'report-student-card pdf-student-sheet' : 'report-student-card'}
            style={{
              flex: '0 0 auto',
              boxSizing: 'border-box',
              minHeight: '297mm',
            }}
          >
            <ReportPreviewFromData
              reportData={report.report_data}
              templateKey={payload.templateKey}
              prePrimaryReportMode={mode}
              prePrimaryHolisticRuntimeConfig={payload.prePrimaryHolisticRuntimeConfig ?? null}
              teacherSkillRemarksByStrandSkill={payload.teacherSkillRemarksByStrandSkill ?? null}
              compactPrePrimaryPdf
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
