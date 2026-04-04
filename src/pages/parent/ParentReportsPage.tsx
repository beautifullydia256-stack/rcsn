import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import ParentPageScaffold, { parentPortal } from '@/components/parent/ParentPageScaffold';
import { useParentPortal } from '@/context/ParentPortalContext';
import { displayStudentName } from '@/lib/parentPortalUtils';

type Snap = { id: string; term: number; year: number; exam_set_id: string | null };
type Exam = { id: string; name: string | null };
type Rep = {
  id: string;
  student_id: string;
  pdf_url: string | null;
  generated_at: string | null;
  snapshot_id: string;
};

export default function ParentReportsPage() {
  const { ready, children } = useParentPortal();
  const studentIds = children.map((c) => c.student_id);
  const [rows, setRows] = useState<
    {
      id: string;
      studentId: string;
      studentName: string;
      term: number;
      year: number;
      examLabel: string;
      pdfUrl: string | null;
      generatedAt: string | null;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ready || studentIds.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data: reps, error } = await supabase
      .from('generated_reports')
      .select('id, student_id, pdf_url, generated_at, snapshot_id')
      .in('student_id', studentIds)
      .order('generated_at', { ascending: false });

    if (error || !reps?.length) {
      setRows([]);
      setLoading(false);
      return;
    }

    const list = reps as Rep[];
    const snapIds = [...new Set(list.map((r) => r.snapshot_id))];
    const { data: snaps } = await supabase
      .from('report_snapshots')
      .select('id, term, year, exam_set_id')
      .in('id', snapIds);

    const snapMap = new Map((snaps as Snap[] | null)?.map((s) => [s.id, s]) || []);
    const examIds = [...new Set((snaps as Snap[] || []).map((s) => s.exam_set_id).filter(Boolean))] as string[];
    let examMap = new Map<string, string>();
    if (examIds.length) {
      const { data: exams } = await supabase.from('exam_sets').select('id, name').in('id', examIds);
      examMap = new Map((exams as Exam[] || []).map((e) => [e.id, e.name || '']));
    }

    const nameById = new Map(children.map((c) => [c.student_id, displayStudentName(c)]));
    setRows(
      list.map((r) => {
        const sn = snapMap.get(r.snapshot_id);
        const term = sn?.term ?? 0;
        const year = sn?.year ?? 0;
        const ex = sn?.exam_set_id ? examMap.get(sn.exam_set_id) : null;
        return {
          id: r.id,
          studentId: r.student_id,
          studentName: nameById.get(r.student_id) || 'Student',
          term,
          year,
          examLabel: ex || 'School report',
          pdfUrl: r.pdf_url,
          generatedAt: r.generated_at,
        };
      })
    );
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
      description="Published reports for your children. Each card shows the term and learner — open a preview or download the PDF."
    >
      {loading ? (
        <div className={`${parentPortal.cardMuted} text-[#7c89b0] text-sm`}>Loading reports…</div>
      ) : rows.length === 0 ? (
        <div className={`${parentPortal.cardMuted} text-[#7c89b0] text-sm`}>
          No saved reports yet. When the school generates report cards for your child, they will appear here.
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {rows.map((r) => (
            <li key={r.id} className={parentPortal.card}>
              <p className="text-xs font-bold uppercase tracking-wider text-[#ff6b6b]">
                Term {r.term || '—'} · {r.year || '—'}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-[#e8eeff]">{r.studentName}</h2>
              <p className="text-sm text-[#7c89b0] mt-1">{r.examLabel}</p>
              {r.generatedAt ? (
                <p className="text-xs text-[#5c6578] mt-2">
                  Issued{' '}
                  {new Date(r.generatedAt).toLocaleDateString('en-UG', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-3">
                {r.pdfUrl ? (
                  <>
                    <button type="button" className={parentPortal.btnPrimary} onClick={() => setPreviewUrl(r.pdfUrl)}>
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
                  <span className="text-sm text-[#7c89b0]">PDF not attached — contact the school.</span>
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
