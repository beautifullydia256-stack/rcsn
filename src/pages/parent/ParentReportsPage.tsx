import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import ParentPageScaffold, { parentPortal } from '@/components/parent/ParentPageScaffold';
import { useParentPortal } from '@/context/ParentPortalContext';
import { displayStudentName } from '@/lib/parentPortalUtils';

const SIGNED_URL_TTL_SEC = 3600;

type Exam = { id: string; name: string | null };
type PubRow = {
  id: string;
  student_id: string;
  term: number;
  year: number;
  exam_set_id: string;
  published_at: string;
  storage_object_path: string;
};

type DisplayRow = {
  id: string;
  studentId: string;
  studentName: string;
  term: number;
  year: number;
  examLabel: string;
  publishedAt: string;
  /** Short-lived signed URL to the single-student PDF in `published-reports` (never a class ZIP). */
  pdfUrl: string | null;
};

export default function ParentReportsPage() {
  const { ready, children } = useParentPortal();
  const studentIds = children.map((c) => c.student_id);
  const [rows, setRows] = useState<DisplayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ready || studentIds.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: published, error } = await supabase
      .from('published_student_reports')
      .select('id, student_id, term, year, exam_set_id, published_at, storage_object_path')
      .in('student_id', studentIds)
      .order('published_at', { ascending: false });

    if (error) {
      setRows([]);
      setLoading(false);
      return;
    }
    if (!published?.length) {
      setRows([]);
      setLoading(false);
      return;
    }

    const list = published as PubRow[];
    const examIds = [...new Set(list.map((r) => r.exam_set_id))];
    let examMap = new Map<string, string>();
    if (examIds.length) {
      const { data: exams } = await supabase.from('exam_sets').select('id, name').in('id', examIds);
      examMap = new Map((exams as Exam[] | null | undefined)?.map((e) => [e.id, e.name || '']) || []);
    }

    const nameById = new Map(children.map((c) => [c.student_id, displayStudentName(c)]));
    const out: DisplayRow[] = [];

    for (const r of list) {
      const { data: signed, error: signErr } = await supabase.storage
        .from('published-reports')
        .createSignedUrl(r.storage_object_path, SIGNED_URL_TTL_SEC);
      if (signErr) {
        out.push({
          id: r.id,
          studentId: r.student_id,
          studentName: nameById.get(r.student_id) || 'Student',
          term: r.term,
          year: r.year,
          examLabel: examMap.get(r.exam_set_id) || 'School report',
          publishedAt: r.published_at,
          pdfUrl: null,
        });
        continue;
      }
      out.push({
        id: r.id,
        studentId: r.student_id,
        studentName: nameById.get(r.student_id) || 'Student',
        term: r.term,
        year: r.year,
        examLabel: examMap.get(r.exam_set_id) || 'School report',
        publishedAt: r.published_at,
        pdfUrl: signed?.signedUrl ?? null,
      });
    }

    setRows(out);
    setLoading(false);
  }, [ready, studentIds.join('|'), children]);

  useEffect(() => {
    void load();
  }, [load]);

  const download = (url: string, label: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.download = `${label.replace(/\s+/g, '-').slice(0, 80)}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <ParentPageScaffold
      title="Report cards"
      description="When your school publishes report cards for online review, they appear here — one PDF per child per exam. You only see your own children’s files."
    >
      {loading ? (
        <div className={`${parentPortal.cardMuted} text-[#b0bdd8] text-sm`}>Loading reports…</div>
      ) : rows.length === 0 ? (
        <div className={`${parentPortal.cardMuted} text-[#b0bdd8] text-sm`}>
          No published reports yet. When the school uses &quot;Upload for parents&quot; on the report generator for your
          child&apos;s class, the PDF will appear here.
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {rows.map((r) => (
            <li key={r.id} className={parentPortal.card}>
              <p className="text-xs font-bold uppercase tracking-wider text-[#ff6b6b]">
                Term {r.term || '—'} · {r.year || '—'}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-[#e8eeff]">{r.studentName}</h2>
              <p className="text-sm text-[#b0bdd8] mt-1">{r.examLabel}</p>
              <p className="text-xs text-[#5c6578] mt-2">
                Published{' '}
                {new Date(r.publishedAt).toLocaleDateString('en-UG', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {r.pdfUrl ? (
                  <>
                    <button
                      type="button"
                      className={parentPortal.btnPrimary}
                      onClick={() => setPreviewUrl(r.pdfUrl)}
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      className={parentPortal.btnGhost}
                      onClick={() =>
                        download(
                          r.pdfUrl!,
                          `Report-${r.studentName}-Term${r.term}-${r.year}`
                        )
                      }
                    >
                      Download
                    </button>
                  </>
                ) : (
                  <span className="text-sm text-[#b0bdd8]">
                    Could not open this PDF. Try again or contact the school.
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {previewUrl ? (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6 bg-black/75"
          role="dialog"
          aria-modal="true"
          aria-label="Report preview"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="relative w-full max-w-4xl h-[min(88vh,900px)] rounded-2xl border border-white/10 bg-[#0b0e18] shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 shrink-0">
              <span className="text-sm font-medium text-[#e8eeff]">Preview</span>
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-sm text-[#ff6b6b] hover:bg-white/5"
                onClick={() => setPreviewUrl(null)}
              >
                Close
              </button>
            </div>
            <iframe title="Report PDF" src={previewUrl} className="flex-1 w-full border-0 bg-[#161b2b]" />
          </div>
        </div>
      ) : null}
    </ParentPageScaffold>
  );
}
